const L = require('./lib.cjs'); const fs = require('fs');
const BASE = process.argv[2] || 'http://127.0.0.1:8801/';
(async () => {
  const browser = await L.launch(); const out = [];
  for (let run = 0; run < 2; run++) {
    const { ctx, page } = await L.newPage(browser, BASE);
    await L.idbWrite(page, null);
    const t0 = Date.now(); await L.openApp(page); const ms = Date.now() - t0;
    const state = await L.idbRead(page);
    const writes = await page.evaluate(() => window.__idbWrites);
    out.push({ state, ms, writes, errors: page.__errors });
    await ctx.close();
  }
  await browser.close();
  const a = JSON.stringify(out[0].state), b = JSON.stringify(out[1].state);
  console.log('first-launch load ms', out.map(o => o.ms), 'writes', out.map(o => o.writes), 'errors', out.map(o => o.errors));
  console.log('deterministic seed:', a === b, 'bytes', a.length);
  L.mkdirp('fixtures'); fs.writeFileSync('fixtures/demo.json', JSON.stringify(out[0].state, null, 1));
  // Long-history variant for sticky-header scrolling (made-up notes only).
  const long = JSON.parse(a);
  for (let i = 1; i <= 30; i++) long.entries.push({ id: `e_long_${String(i).padStart(2, '0')}`, at: new Date(L.FIXED_TIME.getTime() - (i * 26 + 3) * 3600000).toISOString(), type: 'note', channel: 'App', direction: 'none', personIds: ['p_miriam'], aboutType: 'person', aboutId: 'p_miriam', text: `Made-up test note ${i} about general availability and follow-up timing.`, result: '' });
  fs.writeFileSync('fixtures/demo-long.json', JSON.stringify(long, null, 1));
  const s = out[0].state; console.log(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v])));
  console.log('settings', s.settings, 'meta', s.meta);
})().catch(e => { console.error(e); process.exit(1); });
