const CACHE='zivugmatch-v35';
const CORE=['./','./index.html','./style.css?v=35','./appearance.css?v=35','./desktop.css?v=35','./easy.css?v=35','./skins.css?v=35','./skins-extra.css?v=35','./skins-bold.css?v=35','./skins-bright.css?v=35','./glass-neutral.css?v=35','./cartoon-profile.css?v=35','./neon-final.css?v=35','./cartoon-fit.css?v=35','./high-contrast-final.css?v=35','./app-1.js?v=35','./app-2.js?v=35','./app-3.js?v=35','./app-4.js?v=35','./app-ui.js?v=35','./nav-order.js?v=35','./app-easy.js?v=35','./app-5.js?v=35','./app-next.js?v=35','./theme-final.js?v=35','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});