const CACHE='zivugmatch-v23';
const CORE=['./','./index.html','./style.css?v=23','./appearance.css?v=23','./desktop.css?v=23','./easy.css?v=23','./skins.css?v=23','./skins-extra.css?v=23','./skins-bold.css?v=23','./cartoon-profile.css?v=23','./skins-bright.css?v=23','./glass-neutral.css?v=23','./app-1.js?v=23','./app-2.js?v=23','./app-3.js?v=23','./app-4.js?v=23','./app-ui.js?v=23','./nav-order.js?v=23','./app-easy.js?v=23','./app-5.js?v=23','./app-next.js?v=23','./theme-final.js?v=23','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
