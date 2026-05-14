self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.url.includes('supabase.co') || 
      e.request.url.includes('netlify') ||
      e.request.url.includes('mapbox')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
