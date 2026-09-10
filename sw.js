const CACHE='wildoku-beta-0.7.8';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // Frische Dateien fuer die neue Version laden, aber NICHT automatisch aktivieren.
    for(const path of APP_SHELL){
      const req=new Request(path,{cache:'reload'});
      const res=await fetch(req);
      if(!res.ok) throw new Error('Cache install failed: '+path);
      await cache.put(path,res.clone());
    }
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('wildoku-beta-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin&&url.pathname.endsWith('/version.json')){event.respondWith(fetch(req,{cache:'no-store'}));return;}
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh&&fresh.ok){const c=await caches.open(CACHE);await c.put('./index.html',fresh.clone());return fresh;}
      }catch(_){ }
      const c=await caches.open(CACHE);return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
    })());return;
  }
  if(url.origin===self.location.origin){event.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(req);if(hit)return hit;try{const fresh=await fetch(req);if(fresh&&fresh.ok)await c.put(req,fresh.clone());return fresh}catch(_){return new Response('',{status:504})}})())}
});
