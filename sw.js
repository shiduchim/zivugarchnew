const CACHE='zivugmatch-v22';
const CORE=['./','./index.html','./style.css?v=22','./appearance.css?v=22','./desktop.css?v=22','./easy.css?v=22','./skins.css?v=22','./skins-extra.css?v=22','./skins-bold.css?v=22','./cartoon-profile.css?v=22','./skins-bright.css?v=22','./app-1.js?v=22','./app-2.js?v=22','./app-3.js?v=22','./app-4.js?v=22','./app-ui.js?v=22','./nav-order.js?v=22','./app-easy.js?v=22','./app-5.js?v=22','./app-next.js?v=22','./theme-final.js?v=22','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
