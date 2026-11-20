const CACHE_NAME = 'movieplayer-pwa-v2';
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only handle local GET requests, let dynamic APIs & embeds run live
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }
  // Pages: network first so new deploys show up; fall back to cache when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Static assets: cache first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
