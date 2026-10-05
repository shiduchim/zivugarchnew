const CACHE='zivugmatch-v33';
const CORE=['./','./index.html','./style.css?v=33','./appearance.css?v=33','./desktop.css?v=33','./easy.css?v=33','./skins.css?v=33','./skins-extra.css?v=33','./skins-bold.css?v=33','./skins-bright.css?v=33','./glass-neutral.css?v=33','./cartoon-profile.css?v=33','./neon-final.css?v=33','./neon-sections.css?v=33','./cartoon-fit.css?v=33','./high-contrast-final.css?v=33','./app-1.js?v=33','./app-2.js?v=33','./app-3.js?v=33','./app-4.js?v=33','./app-ui.js?v=33','./nav-order.js?v=33','./app-easy.js?v=33','./app-5.js?v=33','./app-next.js?v=33','./theme-final.js?v=33','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});