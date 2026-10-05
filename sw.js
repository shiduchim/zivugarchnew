const CACHE='zivugmatch-v29';
const CORE=['./','./index.html','./style.css?v=29','./appearance.css?v=29','./desktop.css?v=29','./easy.css?v=29','./skins.css?v=29','./skins-extra.css?v=29','./skins-bold.css?v=29','./skins-bright.css?v=29','./glass-neutral.css?v=29','./cartoon-profile.css?v=29','./neon-final.css?v=29','./cartoon-fit.css?v=29','./app-1.js?v=29','./app-2.js?v=29','./app-3.js?v=29','./app-4.js?v=29','./app-ui.js?v=29','./nav-order.js?v=29','./app-easy.js?v=29','./app-5.js?v=29','./app-next.js?v=29','./theme-final.js?v=29','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
