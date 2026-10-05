const CACHE='zivugmatch-v34';
const CORE=['./','./index.html','./style.css?v=34','./appearance.css?v=34','./desktop.css?v=34','./easy.css?v=34','./skins.css?v=34','./skins-extra.css?v=34','./skins-bold.css?v=34','./skins-bright.css?v=34','./glass-neutral.css?v=34','./cartoon-profile.css?v=34','./neon-final.css?v=34','./cartoon-fit.css?v=34','./high-contrast-final.css?v=34','./app-1.js?v=34','./app-2.js?v=34','./app-3.js?v=34','./app-4.js?v=34','./app-ui.js?v=34','./nav-order.js?v=34','./app-easy.js?v=34','./app-5.js?v=34','./app-next.js?v=34','./theme-final.js?v=34','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});