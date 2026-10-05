// Compare two runs. Usage: node compare.cjs <runA> <runB> [functionalA] [functionalB]
// Exit code 0 only when every state's DOM and pixels match and functional results are identical.
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const COMMON = process.argv.includes('--common'); // compare only states present in both runs (targeted runs)
const [A, B, FA, FB] = args;
const ma = JSON.parse(fs.readFileSync(path.join(A, 'manifest.json'))), mb = JSON.parse(fs.readFileSync(path.join(B, 'manifest.json')));
const keys = (COMMON ? Object.keys(mb).filter(k => k in ma) : [...new Set([...Object.keys(ma), ...Object.keys(mb)])]).sort();
const out = { missing: [], html: [], png: [], icons: [], errors: [], writes: [], storage: [] };
for (const k of keys) {
  const a = ma[k], b = mb[k];
  if (!a || !b) { out.missing.push(k); continue; }
  if (k.endsWith('__storage_unchanged')) { if (!a.ok || !b.ok) out.storage.push(k); continue; }
  // Compare the saved DOM with <script> tags and whitespace-only lines removed (adding, removing or
  // cache-busting a script is not a UI change; screenshots still catch any visible spacing change).
  const norm = run => { const f = path.join(run, 'html', k + '.html'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\n?<script[^>]*>\n?<\/script>/g, '').split('\n').map(l => l.trim()).filter(l => l !== '').join('\n') : null; };
  const ha = norm(A), hb = norm(B);
  if (ha === null || hb === null ? a.html !== b.html : ha !== hb) out.html.push(k);
  if (a.png && b.png && a.png !== b.png) out.png.push(k);
  if (a.iconsPng && b.iconsPng && a.iconsPng !== b.iconsPng) out.icons.push(k);
  if (JSON.stringify(a.errors) !== JSON.stringify(b.errors)) out.errors.push(k);
  if ((b.writes || []).length) out.writes.push(k);
}
let fun = null;
if (FA && FB) {
  const fa = JSON.parse(fs.readFileSync(path.join(FA, 'functional.json'))), fb = JSON.parse(fs.readFileSync(path.join(FB, 'functional.json')));
  fun = fa.map(x => { const y = fb.find(z => z.id === x.id); return { id: x.id, a: x.status, b: y?.status, sameDetails: JSON.stringify(x.details) === JSON.stringify(y?.details) }; })
    .filter(r => r.a !== r.b || !r.sameDetails);
}
const total = keys.filter(k => !k.endsWith('__storage_unchanged')).length;
console.log(`states compared: ${total}`);
for (const [k, v] of Object.entries(out)) console.log(`${k.padEnd(8)} differ: ${v.length}${v.length ? '  e.g. ' + v.slice(0, 6).join(', ') : ''}`);
if (fun) console.log(`functional differences: ${fun.length}`, fun.length ? JSON.stringify(fun) : '');
fs.writeFileSync(path.join(B, 'compare.json'), JSON.stringify({ A, B, total, ...out, functional: fun }, null, 1));
process.exit(Object.values(out).some(v => v.length) || (fun && fun.length) ? 1 : 0);
