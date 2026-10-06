// The Stable / Test channels with real service workers, the way GitHub Pages serves them.
// Usage: node tests/golden/test-channel.cjs
// It builds a local site like the deploy workflow does (Stable at /zivugmatch/, Test at /zivugmatch/test/
// stamped by tools/stamp-build.cjs), serves it with GitHub Pages' "keep for 10 minutes" header, and checks:
// a new Test deploy shows on the next return to the app; with a sheet open it waits behind "Load";
// a lagging site never causes a reload loop; Test opens offline; Stable never caches /test/.
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SITE = fs.mkdtempSync(path.join(os.tmpdir(), 'zm-channel-'));
const STABLE = path.join(SITE, 'zivugmatch'), TEST = path.join(STABLE, 'test');
const skip = src => !/[\\/](\.git|tests|docs|tools|node_modules)([\\/]|$)/.test(path.relative(ROOT, src) ? '/' + path.relative(ROOT, src) : '');

function copyTree(to) { fs.rmSync(to, { recursive: true, force: true }); fs.cpSync(ROOT, to, { recursive: true, filter: src => src === ROOT || skip(src) }); }
// One deploy: Stable as it is, Test stamped with its build (plus an optional marker in v1.css).
function deploy(build, marker = '') {
  const keepStable = fs.existsSync(path.join(STABLE, 'index.html'));
  if (!keepStable) copyTree(STABLE);
  copyTree(TEST);
  if (marker) fs.appendFileSync(path.join(TEST, 'v1.css'), `\nhtml{--zm-test-marker:"${marker}"}\n`);
  execFileSync('node', [path.join(ROOT, 'tools', 'stamp-build.cjs'), TEST, build], { stdio: 'pipe' });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(SITE, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    f = path.join(f, 'index.html');
  }
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
  res.end(fs.readFileSync(f));
});

const results = [];
const check = (name, ok, details) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + JSON.stringify(details)}`); };
const build = page => page.evaluate(() => typeof APP_BUILD === 'undefined' ? null : APP_BUILD);
const marker = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--zm-test-marker').trim().replace(/"/g, ''));
async function ready(page, scopePart) {
  await page.waitForFunction(() => typeof APP_BUILD !== 'undefined' && document.querySelector('#app main'));
  for (let i = 0; i < 6; i++) {
    const ctl = await page.evaluate(async () => { await navigator.serviceWorker.ready; return navigator.serviceWorker.controller?.scriptURL || ''; });
    if (ctl.includes(scopePart)) return true;
    await page.reload(); await page.waitForFunction(() => typeof APP_BUILD !== 'undefined' && document.querySelector('#app main'));
  }
  return false;
}
// "Coming back to the app": the same event Android sends when a PWA returns to the front.
const backToFront = page => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/zivugmatch/`;
  deploy('aaaaaaa');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: 'allow', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));

  // Stable first, then Test: each gets its own worker, and Stable's cache never holds a /test/ file.
  await page.goto(base); const stableOk = await ready(page, '/zivugmatch/sw.js');
  await page.goto(base + 'test/'); const testOk = await ready(page, '/zivugmatch/test/sw.js');
  const caches1 = await page.evaluate(async () => Object.fromEntries(await Promise.all((await caches.keys()).map(async k => [k, (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname)]))));
  const stableHoldsTest = (caches1['zivugmatch-stable-1.0.0'] || []).some(p => p.includes('/test/'));
  check('Stable and Test each run their own service worker; Stable never caches /test/ files', stableOk && testOk && !stableHoldsTest && 'zivugmatch-test-aaaaaaa' in caches1, { stableOk, testOk, caches: Object.keys(caches1), stableHoldsTest });
  await page.evaluate(() => settingsSheet());
  const settings = await page.$eval('#overlay', o => o.textContent);
  await page.evaluate(() => closeSheet());
  check('Settings shows "TEST · aaaaaaa"', /TEST · aaaaaaa/.test(settings), { settings: settings.slice(-120) });

  // A new deploy: coming back to the app reloads into it (past the 10-minute browser cache).
  deploy('bbbbbbb', 'bbbbbbb');
  const t0 = Date.now();
  await Promise.all([page.waitForEvent('load'), backToFront(page)]);
  await page.waitForFunction(() => typeof APP_BUILD !== 'undefined' && document.querySelector('#app main'));
  const ms = Date.now() - t0;
  check(`A new Test deploy shows on return to the app (${ms} ms), with its new CSS`, (await build(page)) === 'bbbbbbb' && (await marker(page)) === 'bbbbbbb', { build: await build(page), marker: await marker(page) });

  // With a sheet open, nothing is interrupted: "New test version · Load" waits.
  await page.evaluate(() => settingsSheet());
  deploy('ccccccc', 'ccccccc');
  let reloaded = false; const onLoad = () => { reloaded = true; }; page.on('load', onLoad);
  await backToFront(page); await page.waitForTimeout(1500);
  const pill = await page.$eval('#testUpdate', b => b.textContent).catch(() => '');
  const sheetStill = await page.$('#overlay .sheet');
  page.off('load', onLoad);
  check('With a sheet open it does not reload; "New test version · Load" appears', !reloaded && /New test version · Load/.test(pill) && !!sheetStill && (await build(page)) === 'bbbbbbb', { reloaded, pill, sheetStill: !!sheetStill });
  await Promise.all([page.waitForEvent('load'), page.click('#testUpdate')]);
  await page.waitForFunction(() => typeof APP_BUILD !== 'undefined' && document.querySelector('#app main'));
  check('Tapping Load opens the new build', (await build(page)) === 'ccccccc' && (await marker(page)) === 'ccccccc', { build: await build(page) });

  // The site lagging behind build.txt (old page still served) reloads once, then waits: no loop.
  fs.writeFileSync(path.join(TEST, 'build.txt'), 'ddddddd\n');
  let loads = 0; const count = () => { loads++; }; page.on('load', count);
  await backToFront(page); await page.waitForTimeout(3000);
  page.off('load', count);
  const pill2 = await page.$('#testUpdate');
  check('A lagging site causes one reload at most, then waits behind Load', loads <= 1 && (await build(page)) === 'ccccccc' && !!pill2, { loads, pill: !!pill2 });

  // Offline, Test opens from its last copy.
  deploy('ccccccc', 'ccccccc');
  await ctx.setOffline(true);
  await page.reload(); await page.waitForFunction(() => typeof APP_BUILD !== 'undefined' && document.querySelector('#app main'));
  const offlineBuild = await build(page);
  await ctx.setOffline(false);
  check('Offline, Test opens its last cached build', offlineBuild === 'ccccccc', { offlineBuild });

  // Stable is untouched: no TEST label, its cache still holds no /test/ file, and the old Test caches are gone.
  await page.goto(base); await page.waitForFunction(() => typeof APP_BUILD !== 'undefined' && document.querySelector('#app main'));
  await page.evaluate(() => settingsSheet());
  const stableSettings = await page.$eval('#overlay', o => o.textContent);
  const caches2 = await page.evaluate(async () => Object.fromEntries(await Promise.all((await caches.keys()).map(async k => [k, (await (await caches.open(k)).keys()).map(r => new URL(r.url).pathname)]))));
  const testCaches = Object.keys(caches2).filter(k => k.startsWith('zivugmatch-test-'));
  check('Stable shows no TEST label and never checks builds; one Test cache remains', !/TEST/.test(stableSettings) && (await build(page)) === 'dev' && !(caches2['zivugmatch-stable-1.0.0'] || []).some(p => p.includes('/test/')) && testCaches.length === 1, { testCaches, stableBuild: await build(page) });
  check('No page errors', !errors.length, { errors });

  await browser.close(); server.close(); fs.rmSync(SITE, { recursive: true, force: true });
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} channel checks pass`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
