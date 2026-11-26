importScripts('./version.js');
const CACHE=CACHE_NAME;
const CORE=['./','./index.html','./styles.css?v=980','./styles_upgrade.css?v=980','./version.js?v=980','./data.js?v=980','./history_seed.js?v=980','./app.js?v=980','./v9_features.js?v=980','./exercise_library.js?v=980','./v10_upgrade.js?v=980','./fitactive_v94.js?v=980','./watch_bridge.js?v=980','./health_v98.js?v=980','./manifest.webmanifest?v=980','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return resp;}).catch(()=>caches.match('./index.html',{ignoreSearch:true})));return;
  }
  event.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>{
    const fresh=fetch(req).then(resp=>{if(resp&&resp.ok){const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return resp;}).catch(()=>hit);
    return hit||fresh;
  }));
});
