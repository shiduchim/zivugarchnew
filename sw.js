const CACHE='zivugmatch-v18';
const CORE=['./','./index.html','./style.css?v=18','./appearance.css?v=18','./desktop.css?v=18','./easy.css?v=18','./skins.css?v=18','./skins-extra.css?v=18','./skins-bold.css?v=18','./app-1.js?v=18','./app-2.js?v=18','./app-3.js?v=18','./app-4.js?v=18','./app-ui.js?v=18','./nav-order.js?v=18','./app-easy.js?v=18','./app-5.js?v=18','./app-next.js?v=18','./theme-final.js?v=18','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
