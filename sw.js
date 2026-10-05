const CACHE='zivugmatch-v39';
const CORE=['./','./index.html','./style.css?v=39','./appearance.css?v=39','./desktop.css?v=39','./easy.css?v=39','./desktop-alpha-align.css?v=39','./skins.css?v=39','./skins-extra.css?v=39','./skins-bold.css?v=39','./skins-bright.css?v=39','./glass-neutral.css?v=39','./cartoon-profile.css?v=39','./neon-final.css?v=39','./cartoon-fit.css?v=39','./status-visuals.css?v=39','./high-contrast-final.css?v=39','./app-1.js?v=39','./app-2.js?v=39','./app-3.js?v=39','./app-4.js?v=39','./app-ui.js?v=39','./nav-order.js?v=39','./app-easy.js?v=39','./app-5.js?v=39','./app-next.js?v=39','./theme-final.js?v=39','./clarity-final.js?v=39','./status-visuals.js?v=39','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});