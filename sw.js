const CACHE='zivugmatch-v36';
const CORE=['./','./index.html','./style.css?v=36','./appearance.css?v=36','./desktop.css?v=36','./easy.css?v=36','./skins.css?v=36','./skins-extra.css?v=36','./skins-bold.css?v=36','./skins-bright.css?v=36','./glass-neutral.css?v=36','./cartoon-profile.css?v=36','./neon-final.css?v=36','./cartoon-fit.css?v=36','./high-contrast-final.css?v=36','./app-1.js?v=36','./app-2.js?v=36','./app-3.js?v=36','./app-4.js?v=36','./app-ui.js?v=36','./nav-order.js?v=36','./app-easy.js?v=36','./app-5.js?v=36','./app-next.js?v=36','./theme-final.js?v=36','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});