// Visual + DOM golden run. Usage: node visual.cjs <baseURL> <outDir> [--hash-only] [--workers=4] [--fixture=demo]
const L = require('./lib.cjs');
const { states } = require('./states.cjs');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2];
const OUT = process.argv[3];
const opt = (name, def) => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? a.split('=')[1] : def; };
const HASH_ONLY = process.argv.includes('--hash-only');   // keep DOM snapshots, skip PNG files
const DOM_ONLY = process.argv.includes('--dom-only');     // no screenshots at all (fast)
const WORKERS = Number(opt('workers', 4));
const ONLY_SKINS = opt('skins', ''), ONLY_WIDTHS = opt('widths', ''), ONLY_MODES = opt('modes', ''), NO_VARIANTS = process.argv.includes('--no-variants');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, `fixtures/${opt('fixture', 'demo')}.json`), 'utf8'));

const VARIANT_STATES = ['tab-recent', 'tab-shadchanim-all', 'tab-shidduchim-inprogress', 'shadchan-miriam-details', 'person-leah-profile', 'shidduch-david_noa-overview', 'sheet-settings'];
const combos = [];
for (const mode of ['single', 'shadchan']) for (const skin of L.SKINS) for (const width of Object.keys(L.WIDTHS)) combos.push({ mode, skin, width, settings: {}, tag: '' });
const variants = [['appearance-2', { appearance: '2' }], ['appearance-3', { appearance: '3' }], ['density-compact', { density: 'compact' }], ['icons-small', { iconSize: 'small' }], ['icons-large', { iconSize: 'large' }], ['layout-phone', { layout: 'phone' }]];
for (const [tag, settings] of variants) for (const width of Object.keys(L.WIDTHS)) {
  if (tag === 'layout-phone' && width === 'phone') continue;
  combos.push({ mode: 'shadchan', skin: 'classic', width, settings, tag, only: VARIANT_STATES });
}

{
  const keep = combos.filter(c => (!ONLY_SKINS || (!c.tag && ONLY_SKINS.split(',').includes(c.skin))) && (!ONLY_WIDTHS || ONLY_WIDTHS.split(',').includes(c.width)) && (!ONLY_MODES || ONLY_MODES.split(',').includes(c.mode)) && !(NO_VARIANTS && c.tag));
  combos.length = 0; combos.push(...keep);
}

async function runCombo(browser, c, manifest) {
  const { ctx, page } = await L.newPage(browser, BASE, L.WIDTHS[c.width]);
  const seeded = JSON.parse(JSON.stringify(fixture));
  Object.assign(seeded.settings, { mode: c.mode, skin: c.skin }, c.settings);
  await L.seedApp(page, seeded);
  const before = JSON.stringify(await L.idbRead(page));
  const dirKey = c.tag ? `variants/${c.tag}/${c.width}` : `${c.mode}/${c.skin}/${c.width}`;
  for (const st of states(c.mode)) {
    if (c.only && !c.only.includes(st.id)) continue;
    const key = `${dirKey}/${st.id}`;
    const rec = { errors: [], writes: [] };
    const errCount = page.__errors.length;
    try {
      await L.openApp(page);
      for (const [op, arg] of st.steps) {
        if (op === 'tap') await L.tap(page, arg);
        else if (op === 'close') await L.closeSheets(page);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await L.settle(page);
      const html = await L.snapshotDom(page);
      rec.html = L.sha(html);
      const png = DOM_ONLY ? null : await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
      if (png) rec.png = L.sha(png);
      rec.size = (await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).join('x');
      L.mkdirp(path.join(OUT, 'html', dirKey)); fs.writeFileSync(path.join(OUT, 'html', key + '.html'), html);
      if (png && !HASH_ONLY) { L.mkdirp(path.join(OUT, 'png', dirKey)); fs.writeFileSync(path.join(OUT, 'png', key + '.png'), png); }
      if (png && st.id === 'shadchan-miriam-details') {
        const row = await page.$('.warm-contact-row');
        const icons = await row.screenshot({ animations: 'disabled' });
        rec.iconsPng = L.sha(icons);
        if (!HASH_ONLY) { L.mkdirp(path.join(OUT, 'icons')); fs.writeFileSync(path.join(OUT, 'icons', dirKey.replace(/\//g, '_') + '.png'), icons); }
      }
      rec.writes = await page.evaluate(() => window.__idbWrites);
    } catch (e) { rec.errors.push('HARNESS: ' + e.message.split('\n')[0]); }
    rec.errors.push(...page.__errors.slice(errCount));
    manifest[key] = rec;
  }
  const after = JSON.stringify(await L.idbRead(page));
  manifest[`${dirKey}/__storage_unchanged`] = { ok: before === after };
  await ctx.close();
}

(async () => {
  L.mkdirp(OUT);
  const browser = await L.launch();
  const manifest = {};
  const t0 = Date.now();
  let i = 0;
  async function worker() { while (i < combos.length) { const c = combos[i++]; await runCombo(browser, c, manifest); process.stdout.write('.'); } }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map(k => [k, manifest[k]]));
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(sorted, null, 1));
  const items = Object.entries(sorted).filter(([k]) => !k.endsWith('__storage_unchanged'));
  const withErr = items.filter(([, v]) => v.errors.length), withWrites = items.filter(([, v]) => v.writes && v.writes.length);
  const storage = Object.entries(sorted).filter(([k]) => k.endsWith('__storage_unchanged'));
  console.log(`\n${items.length} states in ${Math.round((Date.now() - t0) / 1000)}s; errors in ${withErr.length}; IDB writes in ${withWrites.length}; storage unchanged in ${storage.filter(([, v]) => v.ok).length}/${storage.length} combos`);
  for (const [k, v] of withErr.slice(0, 30)) console.log('ERR', k, v.errors.join(' | ').slice(0, 300));
  for (const [k, v] of withWrites.slice(0, 10)) console.log('WRITE', k, v.writes);
})().catch(e => { console.error(e); process.exit(1); });
