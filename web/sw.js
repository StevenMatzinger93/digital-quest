// Service Worker: hält Portal und Labor offline verfügbar (Cache-first, Version 01acc658a5)
const CACHE = 'dquest-01acc658a5';
const FILES = ["./","./index.html","./impressum.html","./datenschutz.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./data/dq.json","./data/dq_live.json","./labor/","./labor/index.html","./labor/manifest.webmanifest"];
// Antworten, die der Browser nach einer Weiterleitung geholt hat (z. B. impressum.html → /impressum), dürfen nicht als „redirected“
// gespeichert werden – sonst verweigert der Browser sie später für eine Seitennavigation („nicht verfügbar“). Darum frisch verpacken.
const fresh = res => res.redirected ? res.blob().then(b => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers })) : Promise.resolve(res);
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fetch(f).then(fresh).then(r => { if(r.ok) return c.put(f, r); }).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/z/')) return;
  e.respondWith(caches.match(e.request, { ignoreSearch:true }).then(r => r || fetch(e.request).then(res => {
    if(res.ok){ fresh(res.clone()).then(cp => caches.open(CACHE).then(c => c.put(e.request, cp))); }
    return res;
  }).catch(() => caches.match(url.pathname.startsWith('/labor/') ? './labor/index.html' : './index.html'))));
});
