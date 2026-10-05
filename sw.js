const CACHE='zivugmatch-v31';
const CORE=['./','./index.html','./style.css?v=31','./appearance.css?v=31','./desktop.css?v=31','./easy.css?v=31','./skins.css?v=31','./skins-extra.css?v=31','./skins-bold.css?v=31','./skins-bright.css?v=31','./glass-neutral.css?v=31','./cartoon-profile.css?v=31','./neon-final.css?v=31','./cartoon-fit.css?v=31','./app-1.js?v=31','./app-2.js?v=31','./app-3.js?v=31','./app-4.js?v=31','./app-ui.js?v=31','./nav-order.js?v=31','./app-easy.js?v=31','./app-5.js?v=31','./app-next.js?v=31','./theme-final.js?v=31','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});