const CACHE='zivugmatch-v30';
const CORE=['./','./index.html','./style.css?v=30','./appearance.css?v=30','./desktop.css?v=30','./easy.css?v=30','./skins.css?v=30','./skins-extra.css?v=30','./skins-bold.css?v=30','./skins-bright.css?v=30','./glass-neutral.css?v=30','./cartoon-profile.css?v=30','./neon-final.css?v=30','./cartoon-fit.css?v=30','./app-1.js?v=30','./app-2.js?v=30','./app-3.js?v=30','./app-4.js?v=30','./app-ui.js?v=30','./nav-order.js?v=30','./app-easy.js?v=30','./app-5.js?v=30','./app-next.js?v=30','./theme-final.js?v=30','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});