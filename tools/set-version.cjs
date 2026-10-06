// Set the release version everywhere it must match, so index.html and sw.js never drift apart.
// Usage: node tools/set-version.cjs 1.0.0
// - every local CSS/JS in index.html gets ?v=<version>
// - sw.js caches exactly the files index.html loads (plus the page, manifest and icon), under zivugmatch-<version>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+([-.][\w.]+)?$/.test(version || '')) { console.error('Usage: node tools/set-version.cjs 1.0.0'); process.exit(1); }
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/((?:href|src)="(?!https?:)[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"/g, `$1?v=${version}"`);
fs.writeFileSync(indexPath, html);
const assets = [...html.matchAll(/(?:href|src)="((?!https?:)[^"]+\.(?:css|js)\?v=[^"]+)"/g)].map(m => './' + m[1]);
for (const a of assets) { const file = path.join(root, a.slice(2).split('?')[0]); if (!fs.existsSync(file)) { console.error('Missing file: ' + file); process.exit(1); } }
const core = ['./', './index.html', './manifest.webmanifest', './icon.svg', ...assets];
const swPath = path.join(root, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE='[^']*';/, `const CACHE='zivugmatch-${version}';`).replace(/const CORE=\[[^\]]*\];/, `const CORE=${JSON.stringify(core).replace(/"/g, "'")};`);
fs.writeFileSync(swPath, sw);
console.log(`version ${version}: ${assets.length} assets in index.html and sw.js`);
