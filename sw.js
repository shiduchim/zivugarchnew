const CACHE='zivugmatch-v26';
const CORE=['./','./index.html','./style.css?v=26','./appearance.css?v=26','./desktop.css?v=26','./easy.css?v=26','./skins.css?v=26','./skins-extra.css?v=26','./skins-bold.css?v=26','./skins-bright.css?v=26','./glass-neutral.css?v=26','./cartoon-profile.css?v=26','./neon-final.css?v=26','./app-1.js?v=26','./app-2.js?v=26','./app-3.js?v=26','./app-4.js?v=26','./app-ui.js?v=26','./nav-order.js?v=26','./app-easy.js?v=26','./app-5.js?v=26','./app-next.js?v=26','./theme-final.js?v=26','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
