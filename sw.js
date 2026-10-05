const CACHE='zivugmatch-v19';
const CORE=['./','./index.html','./style.css?v=19','./appearance.css?v=19','./desktop.css?v=19','./easy.css?v=19','./skins.css?v=19','./skins-extra.css?v=19','./skins-bold.css?v=19','./app-1.js?v=19','./app-2.js?v=19','./app-3.js?v=19','./app-4.js?v=19','./app-ui.js?v=19','./nav-order.js?v=19','./app-easy.js?v=19','./app-5.js?v=19','./app-next.js?v=19','./theme-final.js?v=19','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
