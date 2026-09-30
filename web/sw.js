// Service Worker: hält Portal und Labor offline verfügbar (Cache-first, Version f3c37546a4)
const CACHE = 'dquest-f3c37546a4';
const FILES = ["./","./index.html","./impressum.html","./datenschutz.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./data/dq.json","./data/dq_live.json","./labor/","./labor/index.html","./labor/manifest.webmanifest"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/z/')) return;
  e.respondWith(caches.match(e.request, { ignoreSearch:true }).then(r => r || fetch(e.request).then(res => {
    if(res.ok){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match(url.pathname.startsWith('/labor/') ? './labor/index.html' : './index.html'))));
});
