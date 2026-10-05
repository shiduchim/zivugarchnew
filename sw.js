const CACHE='zivugmatch-v37';
const CORE=['./','./index.html','./style.css?v=37','./appearance.css?v=37','./desktop.css?v=37','./easy.css?v=37','./desktop-alpha-align.css?v=37','./skins.css?v=37','./skins-extra.css?v=37','./skins-bold.css?v=37','./skins-bright.css?v=37','./glass-neutral.css?v=37','./cartoon-profile.css?v=37','./neon-final.css?v=37','./cartoon-fit.css?v=37','./high-contrast-final.css?v=37','./app-1.js?v=37','./app-2.js?v=37','./app-3.js?v=37','./app-4.js?v=37','./app-ui.js?v=37','./nav-order.js?v=37','./app-easy.js?v=37','./app-5.js?v=37','./app-next.js?v=37','./theme-final.js?v=37','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});