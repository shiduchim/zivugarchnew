// ZivugMatch service worker. One file serves both channels of the same site:
// - Stable (/zivugmatch/): cache-first, so the everyday app opens at once and works offline. It never
//   answers for /test/.
// - Test (/zivugmatch/test/): network-first, past the browser's cache, so each deploy shows on the next
//   open; the last copy is used only when there is no connection.
// The deploy workflow stamps the Test copy (tools/stamp-build.cjs): BUILD below and ?v= on every file
// become the commit, so every Test deploy gets new file addresses and its own cache.
const VERSION='1.0.0';
const BUILD='dev';
const SCOPE_PATH=new URL(self.registration.scope).pathname;
const IS_TEST=SCOPE_PATH.split('/').includes('test');
const TEST_PATH=IS_TEST?SCOPE_PATH:SCOPE_PATH+'test/';
const CACHE_PREFIX=IS_TEST?'zivugmatch-test-':'zivugmatch-stable-';
const CACHE=CACHE_PREFIX+(IS_TEST?BUILD:VERSION);
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg','./style.css?v=1.0.0','./appearance.css?v=1.0.0','./desktop.css?v=1.0.0','./easy.css?v=1.0.0','./skins.css?v=1.0.0','./skins-extra.css?v=1.0.0','./skins-bold.css?v=1.0.0','./skins-bright.css?v=1.0.0','./glass-neutral.css?v=1.0.0','./cartoon-profile.css?v=1.0.0','./neon-final.css?v=1.0.0','./shidduch-flow-final.css?v=1.0.0','./stage-bar-fix.css?v=1.0.0','./shidduch-detail-clean.css?v=1.0.0','./high-contrast-final.css?v=1.0.0','./workflow-home-final.css?v=1.0.0','./ui-polish.css?v=1.0.0','./profile-header.css?v=1.0.0','./v1.css?v=1.0.0','./app-1.js?v=1.0.0','./identity.js?v=1.0.0','./storage.js?v=1.0.0','./migrate.js?v=1.0.0','./model.js?v=1.0.0','./ledger.js?v=1.0.0','./profiles.js?v=1.0.0','./offers.js?v=1.0.0','./rounds.js?v=1.0.0','./items.js?v=1.0.0','./sources.js?v=1.0.0','./links.js?v=1.0.0','./files.js?v=1.0.0','./folders.js?v=1.0.0','./intake.js?v=1.0.0','./app-3.js?v=1.0.0','./app-4.js?v=1.0.0','./app-ui.js?v=1.0.0','./app-5.js?v=1.0.0','./app-next.js?v=1.0.0','./theme-final.js?v=1.0.0','./clarity-final.js?v=1.0.0','./shidduch-flow-final.js?v=1.0.0','./stage-bar-fix.js?v=1.0.0','./shidduch-detail-clean.js?v=1.0.0','./workflow-home-final.js?v=1.0.0','./ui-polish.js?v=1.0.0','./recent.js?v=1.0.0','./sticky-headers.js?v=1.0.0'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(IS_TEST?CORE.map(u=>new Request(u,{cache:'reload'})):CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith(CACHE_PREFIX)&&k!==CACHE)||k==='zivugmatch-1.0.0'||k.startsWith('zivugmatch-v58')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Test: always ask the network first (never the browser's cache); keep a copy for when offline.
async function networkFirst(req){
  const cache=await caches.open(CACHE);
  try{
    let r=await fetch(req.url,{cache:'no-store',credentials:'same-origin'});
    if(r.redirected)r=new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers}); // a page may not be answered with a redirect
    if(r.ok&&r.type==='basic')cache.put(req,r.clone());
    return r;
  }catch(err){
    return (await cache.match(req))||(req.mode==='navigate'?(await cache.match('./index.html'))||(await cache.match('./')):undefined)||Response.error();
  }
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(IS_TEST){
    if(url.origin!==self.location.origin||url.pathname===TEST_PATH+'build.txt')return; // build.txt always comes straight from the network
    e.respondWith(networkFirst(e.request));
    return;
  }
  // Stable never intercepts or caches Test: those go to the network, and to Test's own worker.
  if(url.origin===self.location.origin&&url.pathname.startsWith(TEST_PATH))return;
  // Only successful same-origin answers are cached, so an error page can never be served from the cache.
  e.respondWith(caches.open(CACHE).then(cache=>cache.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&r.type==='basic'){const copy=r.clone();cache.put(e.request,copy);}return r;}).catch(()=>cache.match('./index.html')))));
});
