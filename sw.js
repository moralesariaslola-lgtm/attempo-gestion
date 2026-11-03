const CACHE='attempo-shell-20261103-7';
const ASSETS=['./','./index.html','./config.js','./app.js?v=20261103-7','./vendor/supabase.min.js','./manifest.webmanifest','./logo-attempo.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))));});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('attempo-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(!ASSETS.some(p=>new URL(p,self.registration.scope).pathname===url.pathname))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));});

self.addEventListener('push',event=>{
 let value={};try{value=event.data?.json()||{};}catch{}
 const allowed=['inicio','encuestas','tareas','sesiones','equipo','notificaciones'];
 const path=allowed.includes(value.path)?value.path:'inicio';
 event.waitUntil(self.registration.showNotification(String(value.title||'ATTEMPO').slice(0,100),{body:String(value.body||'Tienes novedades en ATTEMPO.').slice(0,240),icon:new URL('./icon-192.png',self.registration.scope).href,badge:new URL('./icon-192.png',self.registration.scope).href,tag:String(value.tag||'attempo').slice(0,100),data:{path}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const allowed=['inicio','encuestas','tareas','sesiones','equipo','notificaciones'];
 const path=allowed.includes(event.notification.data?.path)?event.notification.data.path:'inicio';
 const target=new URL('./#'+path,self.registration.scope).href;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const win of windows){if(win.url.startsWith(self.registration.scope)){const updated=await win.navigate(target);(updated||win).postMessage({type:'ATTEMPO_REFRESH'});return (updated||win).focus();}}return self.clients.openWindow(target);})());
});

self.addEventListener('message',event=>{if(event.data?.type==='ATTEMPO_SKIP_WAITING')event.waitUntil(self.skipWaiting());});
