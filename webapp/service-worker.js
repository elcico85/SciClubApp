const CACHE_NAME = 'sciclub-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './vendor/idb-keyval.min.js',
  './vendor/zxing.min.js',
  './vendor/qrcode.min.js',
  './src/util.js',
  './src/store.js',
  './src/api.js',
  './src/sync.js',
  './src/scanner.js',
  './src/screens/setup.js',
  './src/screens/pin.js',
  './src/screens/home.js',
  './src/screens/result.js',
  './src/screens/newSubscription.js',
  './src/screens/cardGenerated.js',
  './src/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

// Cache-first solo per l'app shell dello stesso dominio. Le chiamate all'Apps Script
// (altra origine) non vengono mai intercettate: se offline falliscono naturalmente e
// la logica di sync in src/sync.js gestisce il fallback.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
