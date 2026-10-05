const CACHE='zivugmatch-v24';
const CORE=['./','./index.html','./style.css?v=24','./appearance.css?v=24','./desktop.css?v=24','./easy.css?v=24','./skins.css?v=24','./skins-extra.css?v=24','./skins-bold.css?v=24','./cartoon-profile.css?v=24','./skins-bright.css?v=24','./glass-neutral.css?v=24','./app-1.js?v=24','./app-2.js?v=24','./app-3.js?v=24','./app-4.js?v=24','./app-ui.js?v=24','./nav-order.js?v=24','./app-easy.js?v=24','./app-5.js?v=24','./app-next.js?v=24','./theme-final.js?v=24','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
