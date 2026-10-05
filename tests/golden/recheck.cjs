// Re-check screenshots that differed in compare.cjs. Usage: node recheck.cjs <baselineURL> <candidateURL> <runDir-with-compare.json>
// Each differing state is captured several times on both builds. It passes only if the candidate produces an
// image that is byte-identical to one the baseline itself produces (rendering wobble), never by pixel tolerance.
const L = require('./lib.cjs');
const { states } = require('./states.cjs');
const fs = require('fs');
const path = require('path');
const [BASE, CAND, RUN] = process.argv.slice(2);
const cmp = JSON.parse(fs.readFileSync(path.join(RUN, 'compare.json')));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/demo.json')));
const VARIANTS = { 'appearance-2': { appearance: '2' }, 'appearance-3': { appearance: '3' }, 'density-compact': { density: 'compact' }, 'icons-small': { iconSize: 'small' }, 'icons-large': { iconSize: 'large' }, 'layout-phone': { layout: 'phone' } };

async function captures(browser, base, key, n) {
  const parts = key.split('/');
  const [mode, skin, width, settings] = parts[0] === 'variants' ? ['shadchan', 'classic', parts[2], VARIANTS[parts[1]]] : [parts[0], parts[1], parts[2], {}];
  const st = states(mode).find(s => s.id === parts[parts.length - 1]);
  const { ctx, page } = await L.newPage(browser, base, L.WIDTHS[width]);
  const fx = JSON.parse(JSON.stringify(fixture)); Object.assign(fx.settings, { mode, skin }, settings); await L.idbWrite(page, fx);
  const out = new Set();
  for (let i = 0; i < n + 2; i++) {
    await L.openApp(page);
    for (const [op, arg] of st.steps) { if (op === 'tap') await L.tap(page, arg); else await L.closeSheets(page); }
    await page.evaluate(() => window.scrollTo(0, 0)); await L.settle(page);
    const h = L.sha(await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' }));
    if (i >= 2) out.add(h); // the first two captures warm up the context, as in the full run
  }
  await ctx.close();
  return out;
}

(async () => {
  const browser = await L.launch();
  const res = [];
  for (const key of [...new Set([...cmp.png, ...cmp.icons])]) {
    const a = await captures(browser, BASE, key, 5), b = await captures(browser, CAND, key, 5);
    const shared = [...b].filter(h => a.has(h));
    res.push({ key, baseline: [...a], candidate: [...b], verdict: shared.length ? 'wobble (identical image reproduced)' : 'REAL DIFFERENCE' });
    console.log(shared.length ? 'ok  ' : 'DIFF', key, [...a].join(','), '|', [...b].join(','));
  }
  await browser.close();
  fs.writeFileSync(path.join(RUN, 'recheck.json'), JSON.stringify(res, null, 1));
  const real = res.filter(r => r.verdict === 'REAL DIFFERENCE').length;
  console.log(`rechecked ${res.length}; real differences: ${real}`);
  process.exit(real ? 1 : 0);
})();
