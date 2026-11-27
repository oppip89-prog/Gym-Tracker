importScripts('./version.js');
const CACHE=CACHE_NAME;
const CORE=['./','./index.html','./styles.css?v=991','./styles_upgrade.css?v=991','./version.js?v=991','./data.js?v=991','./app.js?v=991','./v9_features.js?v=991','./exercise_library.js?v=991','./v10_upgrade.js?v=991','./fitactive_v94.js?v=991','./watch_bridge.js?v=991','./health_v98.js?v=991','./manifest.webmanifest?v=991','./personal_v99.js?v=991','./styles_personal.css?v=991','./icon-192.png','./icon-512.png'];
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
