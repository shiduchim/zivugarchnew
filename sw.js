const CACHE='zivugmatch-v38';
const CORE=['./','./index.html','./style.css?v=38','./appearance.css?v=38','./desktop.css?v=38','./easy.css?v=38','./desktop-alpha-align.css?v=38','./skins.css?v=38','./skins-extra.css?v=38','./skins-bold.css?v=38','./skins-bright.css?v=38','./glass-neutral.css?v=38','./cartoon-profile.css?v=38','./neon-final.css?v=38','./cartoon-fit.css?v=38','./status-visuals.css?v=38','./high-contrast-final.css?v=38','./app-1.js?v=38','./app-2.js?v=38','./app-3.js?v=38','./app-4.js?v=38','./app-ui.js?v=38','./nav-order.js?v=38','./app-easy.js?v=38','./app-5.js?v=38','./app-next.js?v=38','./theme-final.js?v=38','./clarity-final.js?v=38','./status-visuals.js?v=38','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});