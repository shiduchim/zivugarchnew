// Golden-baseline harness for ZivugMatch. Read-only: it only loads the app in headless Chromium.
// Determinism: fixed clock, fixed timezone/locale, seeded Math.random, service worker blocked,
// fresh IndexedDB per browser context.
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FIXED_TIME = new Date('2026-10-05T12:00:00+03:00');
const SKINS = ['classic', 'game', 'dark', 'glass', 'boys', 'girls', 'kids', 'contrast', 'neon', 'ocean', 'sunset'];
const WIDTHS = { phone: { width: 412, height: 915, mobile: true }, desktop: { width: 1280, height: 900, mobile: false } };
const DB = { name: 'ZivugMatchDB', store: 'kv', key: 'state' };

// Seeded PRNG + IndexedDB write counter. Installed before any app script runs.
const INIT_SCRIPT = `(() => {
  let s = 0x2f6b1d3a;
  Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__idbWrites = [];
  for (const m of ['put', 'add', 'delete', 'clear']) {
    const orig = IDBObjectStore.prototype[m];
    IDBObjectStore.prototype[m] = function (...a) { window.__idbWrites.push(m + ':' + (m === 'put' ? a[1] : a[0])); return orig.apply(this, a); };
  }
  window.__pageErrors = [];
  window.addEventListener('error', e => window.__pageErrors.push(String(e.message)));
  window.addEventListener('unhandledrejection', e => window.__pageErrors.push('rejection: ' + String(e.reason && e.reason.message || e.reason)));
})();`;

async function launch() {
  return chromium.launch({ args: ['--font-render-hinting=none', '--disable-skia-runtime-opts', '--force-color-profile=srgb', '--num-raster-threads=1', '--disable-partial-raster', '--disable-gpu-rasterization', '--disable-threaded-animation', '--disable-threaded-scrolling'] });
}

async function newPage(browser, base, viewport = WIDTHS.phone) {
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height }, isMobile: !!viewport.mobile, hasTouch: !!viewport.mobile, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'Asia/Jerusalem',
    serviceWorkers: 'block', reducedMotion: 'reduce', colorScheme: 'light',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(FIXED_TIME);
  await page.addInitScript(INIT_SCRIPT);
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.__errors.push('console: ' + m.text()); });
  // A blank same-origin page used to seed/read IndexedDB without running the app.
  await ctx.route(base + '__blank', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>blank</title>' }));
  page.__base = base;
  return { ctx, page };
}

async function idbWrite(page, value) {
  await page.goto(page.__base + '__blank');
  await page.evaluate(async ({ DB, value }) => {
    await new Promise((res, rej) => {
      const req = indexedDB.open(DB.name, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB.store)) req.result.createObjectStore(DB.store); };
      req.onsuccess = () => { const db = req.result; const tx = db.transaction(DB.store, 'readwrite');
        if (value === null) tx.objectStore(DB.store).delete(DB.key); else tx.objectStore(DB.store).put(value, DB.key);
        tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); };
      req.onerror = () => rej(req.error);
    });
  }, { DB, value });
}

async function idbRead(page) {
  return page.evaluate(async (DB) => new Promise((res, rej) => {
    const req = indexedDB.open(DB.name, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB.store)) req.result.createObjectStore(DB.store); };
    req.onsuccess = () => { const db = req.result; const r = db.transaction(DB.store, 'readonly').objectStore(DB.store).get(DB.key);
      r.onsuccess = () => { db.close(); res(r.result === undefined ? null : JSON.parse(JSON.stringify(r.result))); }; r.onerror = () => rej(r.error); };
    req.onerror = () => rej(req.error);
  }), DB);
}

async function frames(page, n = 3) {
  await page.evaluate(n => new Promise(r => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
}

// Load the app and wait until #app stops changing.
async function openApp(page) {
  await page.goto(page.__base + 'index.html', { waitUntil: 'load' });
  await page.waitForSelector('#app nav, #app main', { timeout: 15000 });
  await settle(page);
}

async function settle(page) {
  let last = '', stable = 0;
  for (let i = 0; i < 60 && stable < 3; i++) {
    await frames(page, 1);
    const cur = await page.evaluate(() => document.getElementById('app').innerHTML.length + ':' + document.getElementById('overlay').innerHTML.length);
    stable = cur === last ? stable + 1 : 0; last = cur;
  }
  await page.waitForTimeout(30);
  await frames(page, 2);
}

// Click like a tap on the first matching element (DOM click: no scroll side effects).
async function tap(page, selector) {
  const ok = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }, selector);
  if (!ok) throw new Error('Not found: ' + selector);
  await settle(page);
}

async function closeSheets(page) {
  await page.evaluate(() => { const b = document.querySelector('#overlay [data-act="close-sheet"]'); if (b) b.click(); });
  await settle(page);
}

function sha(buf) { return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

async function snapshotDom(page) {
  return page.evaluate(() => {
    const h = document.documentElement;
    const attrs = [...h.attributes].map(a => `${a.name}="${a.value}"`).sort().join(' ');
    const meta = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    const body = document.body.cloneNode(true); body.querySelectorAll('script').forEach(s => s.remove());
    return `<!-- html ${attrs} | theme-color ${meta} | scrollY ${Math.round(scrollY)} -->\n` + body.innerHTML.replace(/></g, '>\n<');
  });
}

module.exports = { launch, newPage, idbWrite, idbRead, openApp, settle, tap, closeSheets, frames, sha, mkdirp, snapshotDom, SKINS, WIDTHS, FIXED_TIME, DB };
