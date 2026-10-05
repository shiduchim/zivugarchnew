const CACHE='zivugmatch-v27';
const CORE=['./','./index.html','./style.css?v=27','./appearance.css?v=27','./desktop.css?v=27','./easy.css?v=27','./skins.css?v=27','./skins-extra.css?v=27','./skins-bold.css?v=27','./skins-bright.css?v=27','./glass-neutral.css?v=27','./cartoon-profile.css?v=27','./neon-final.css?v=27','./cartoon-fit.css?v=27','./app-1.js?v=27','./app-2.js?v=27','./app-3.js?v=27','./app-4.js?v=27','./app-ui.js?v=27','./nav-order.js?v=27','./app-easy.js?v=27','./app-5.js?v=27','./app-next.js?v=27','./theme-final.js?v=27','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
