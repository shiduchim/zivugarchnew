const CACHE='zivugmatch-v21';
const CORE=['./','./index.html','./style.css?v=21','./appearance.css?v=21','./desktop.css?v=21','./easy.css?v=21','./skins.css?v=21','./skins-extra.css?v=21','./skins-bold.css?v=21','./cartoon-profile.css?v=21','./app-1.js?v=21','./app-2.js?v=21','./app-3.js?v=21','./app-4.js?v=21','./app-ui.js?v=21','./nav-order.js?v=21','./app-easy.js?v=21','./app-5.js?v=21','./app-next.js?v=21','./theme-final.js?v=21','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
