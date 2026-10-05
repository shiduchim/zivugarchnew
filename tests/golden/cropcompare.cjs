// Pixel-compare two runs' screenshots inside the overlapping area (top-left aligned).
// Usage: node cropcompare.cjs <runA> <runB> [filter]. Used to prove that a width-only change
// (e.g. removing horizontal overflow) leaves every visible pixel unchanged.
const L = require('./lib.cjs'); const fs = require('fs'); const path = require('path');
const [A, B, F] = process.argv.slice(2);
(async () => {
  const mb = JSON.parse(fs.readFileSync(path.join(B, 'compare.json'))); const keys = mb.png.filter(k => !F || k.includes(F));
  const b = await L.launch(); const page = await (await b.newContext()).newPage(); await page.setContent('<canvas></canvas>');
  const out = { identicalInOverlap: [], different: [] };
  for (const k of keys) {
    const pa = path.join(A, 'png', k + '.png'), pb = path.join(B, 'png', k + '.png');
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) { out.different.push(k + ' (missing png)'); continue; }
    const r = await page.evaluate(async ([x, y]) => {
      const load = s => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([load(x), load(y)]); const W = Math.min(ia.width, ib.width), H = Math.min(ia.height, ib.height);
      const px = im => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
      const p = px(ia), q = px(ib); let n = 0; for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) n++;
      return { n, a: ia.width + 'x' + ia.height, b: ib.width + 'x' + ib.height };
    }, [fs.readFileSync(pa).toString('base64'), fs.readFileSync(pb).toString('base64')]);
    (r.n ? out.different : out.identicalInOverlap).push(`${k} ${r.a}->${r.b}${r.n ? ' diff=' + r.n : ''}`);
  }
  await b.close();
  console.log(`identical inside the screen: ${out.identicalInOverlap.length}; different: ${out.different.length}`);
  for (const d of out.different.slice(0, 20)) console.log('  DIFF', d);
  fs.writeFileSync(path.join(B, 'cropcompare.json'), JSON.stringify(out, null, 1));
})();
