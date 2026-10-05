const CACHE='zivugmatch-v40';
const CORE=['./','./index.html','./style.css?v=40','./appearance.css?v=40','./desktop.css?v=40','./easy.css?v=40','./desktop-alpha-align.css?v=40','./skins.css?v=40','./skins-extra.css?v=40','./skins-bold.css?v=40','./skins-bright.css?v=40','./glass-neutral.css?v=40','./cartoon-profile.css?v=40','./neon-final.css?v=40','./cartoon-fit.css?v=40','./status-visuals.css?v=40','./shidduch-flow-final.css?v=40','./high-contrast-final.css?v=40','./app-1.js?v=40','./app-2.js?v=40','./app-3.js?v=40','./app-4.js?v=40','./app-ui.js?v=40','./nav-order.js?v=40','./app-easy.js?v=40','./app-5.js?v=40','./app-next.js?v=40','./theme-final.js?v=40','./clarity-final.js?v=40','./status-visuals.js?v=40','./shidduch-flow-final.js?v=40','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});