importScripts('./version.js');
const CACHE=CACHE_NAME;
const CORE=['./training_engine.js?v=992','./training_v992.js?v=992','./styles_training.css?v=992','./','./index.html','./styles.css?v=992','./styles_upgrade.css?v=992','./version.js?v=992','./data.js?v=992','./app.js?v=992','./v9_features.js?v=992','./exercise_library.js?v=992','./v10_upgrade.js?v=992','./fitactive_v94.js?v=992','./watch_bridge.js?v=992','./health_v98.js?v=992','./manifest.webmanifest?v=992','./personal_v99.js?v=992','./styles_personal.css?v=992','./icon-192.png','./icon-512.png'];
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
