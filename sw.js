importScripts('./version.js');
const CACHE=CACHE_NAME;
const CORE=['./','./index.html','./styles.css','./version.js','./data.js','./history_seed.js','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return resp;}).catch(()=>caches.match('./index.html')));return;
  }
  event.respondWith(caches.match(req).then(hit=>{
    const fresh=fetch(req).then(resp=>{if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return resp;}).catch(()=>hit);
    return hit||fresh;
  }));
});
