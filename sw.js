const CACHE='zivugmatch-v28';
const CORE=['./','./index.html','./style.css?v=28','./appearance.css?v=28','./desktop.css?v=28','./easy.css?v=28','./skins.css?v=28','./skins-extra.css?v=28','./skins-bold.css?v=28','./skins-bright.css?v=28','./glass-neutral.css?v=28','./cartoon-profile.css?v=28','./neon-final.css?v=28','./cartoon-fit.css?v=28','./app-1.js?v=28','./app-2.js?v=28','./app-3.js?v=28','./app-4.js?v=28','./app-ui.js?v=28','./nav-order.js?v=28','./app-easy.js?v=28','./app-5.js?v=28','./app-next.js?v=28','./theme-final.js?v=28','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
