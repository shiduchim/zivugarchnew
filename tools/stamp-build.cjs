// Stamp a deployed Test copy with its build ID (the commit), so every Test deploy gets new file addresses,
// its own service-worker cache, and a build.txt the running app compares itself with.
// Usage: node tools/stamp-build.cjs <site-dir> <git-sha>
// It changes only the copy in <site-dir>, never the repository. Any surprise fails the deploy.
const fs = require('fs');
const path = require('path');
const [dir, build] = process.argv.slice(2);
const fail = msg => { console.error('stamp-build: ' + msg); process.exit(1); };
if (!dir || !/^[0-9a-f]{7,40}$/.test(build || '')) fail('usage: node tools/stamp-build.cjs <site-dir> <git-sha>');
const file = name => path.join(dir, name);

let html = fs.readFileSync(file('index.html'), 'utf8');
const assetRe = /((?:href|src)="(?!https?:)[^"?]+\.(?:css|js))\?v=[^"]*"/g;
const htmlAssets = (html.match(assetRe) || []).length;
if (!htmlAssets) fail('index.html has no ?v= stamped CSS/JS');
html = html.replace(assetRe, `$1?v=${build}"`);
const withMeta = html.replace(/<meta name="zm-build" content="[^"]*"/, `<meta name="zm-build" content="${build}"`);
if (withMeta === html) fail('index.html has no <meta name="zm-build">');
html = withMeta;

let sw = fs.readFileSync(file('sw.js'), 'utf8');
const withBuild = sw.replace(/const BUILD='[^']*';/, `const BUILD='${build}';`);
if (withBuild === sw) fail("sw.js has no const BUILD='…';");
sw = withBuild.replace(/(\.(?:css|js))\?v=[^']*'/g, `$1?v=${build}'`);

// The worker must precache exactly what the page loads, with the same stamp.
const loaded = [...html.matchAll(/(?:href|src)="((?!https?:)[^"]+\.(?:css|js)\?v=[^"]+)"/g)].map(m => './' + m[1]);
const core = (sw.match(/const CORE=\[([^\]]*)\];/) || [])[1];
if (!core) fail('sw.js has no CORE list');
const missing = loaded.filter(a => !core.includes(`'${a}'`));
if (missing.length) fail('sw.js CORE does not list: ' + missing.join(', '));

fs.writeFileSync(file('index.html'), html);
fs.writeFileSync(file('sw.js'), sw);
fs.writeFileSync(file('build.txt'), build + '\n');
console.log(`stamp-build: ${dir} is build ${build} (${htmlAssets} files)`);
