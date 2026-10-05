const CACHE='zivugmatch-v25';
const CORE=['./','./index.html','./style.css?v=25','./appearance.css?v=25','./desktop.css?v=25','./easy.css?v=25','./skins.css?v=25','./skins-extra.css?v=25','./skins-bold.css?v=25','./cartoon-profile.css?v=25','./skins-bright.css?v=25','./glass-neutral.css?v=25','./app-1.js?v=25','./app-2.js?v=25','./app-3.js?v=25','./app-4.js?v=25','./app-ui.js?v=25','./nav-order.js?v=25','./app-easy.js?v=25','./app-5.js?v=25','./app-next.js?v=25','./theme-final.js?v=25','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('./index.html'))));
});
