// Usage: node searchcmp.cjs <baselineURL> <candidateURL>
// Compare #app DOM after typing searches, between two builds.
const L = require('./lib.cjs'); const fs = require('fs');
const fx = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'fixtures/demo.json')));
const cases = [['shadchan', 'shadchanim', 'all', 'sa'], ['shadchan', 'shadchanim', 'them', 'r'], ['shadchan', 'shadchanim', 'sources', 'x'], ['single', 'girls', null, 'le'], ['shadchan', 'girls', 'all', 'a'], ['shadchan', 'guys', null, 'd'], ['single', 'shidduchim', null, 'leah'], ['single', 'recent', null, 'miriam'], ['single', 'recent', null, 'zzz']];
(async () => { const b = await L.launch(); let diffs = 0;
  for (const [mode, scr, seg, q] of cases) { const out = [];
    for (const url of process.argv.slice(2, 4)) { const { ctx, page } = await L.newPage(b, url, L.WIDTHS.phone); const f = JSON.parse(JSON.stringify(fx)); f.settings.mode = mode; await L.idbWrite(page, f); await L.openApp(page);
      await L.tap(page, `button[data-screen="${scr}"]`); if (seg) await L.tap(page, `button[data-seg-scope="${scr}"][data-seg="${seg}"]`);
      await page.fill('[data-role="search"]', q); await page.waitForTimeout(200); await L.settle(page);
      out.push(await page.$eval('#app', a => a.innerHTML.replace(/\s+/g, ' '))); await ctx.close(); }
    const same = out[0] === out[1]; if (!same) diffs++; console.log(same ? 'same' : 'DIFF', mode, scr, seg || '', JSON.stringify(q)); }
  await b.close(); console.log('search differences:', diffs); })();
