const CACHE='zivugmatch-v32';
const CORE=['./','./index.html','./style.css?v=32','./appearance.css?v=32','./desktop.css?v=32','./easy.css?v=32','./skins.css?v=32','./skins-extra.css?v=32','./skins-bold.css?v=32','./skins-bright.css?v=32','./glass-neutral.css?v=32','./cartoon-profile.css?v=32','./neon-final.css?v=32','./neon-sections.css?v=32','./cartoon-fit.css?v=32','./high-contrast-final.css?v=32','./app-1.js?v=32','./app-2.js?v=32','./app-3.js?v=32','./app-4.js?v=32','./app-ui.js?v=32','./nav-order.js?v=32','./app-easy.js?v=32','./app-5.js?v=32','./app-next.js?v=32','./theme-final.js?v=32','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});