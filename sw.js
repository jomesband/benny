const CACHE_VERSION = 'peso-benny-' + new Date().getTime();
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Para index.html: sempre ir à rede primeiro, depois cache como fallback
  if (event.request.url.includes('index.html') || 
      event.request.url.endsWith('/') ||
      event.request.url.endsWith('')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION)
            .then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((response) => response || caches.match('/index.html'));
        })
    );
  } else {
    // Para outros ficheiros: cache first, depois rede
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }
              const responseToCache = response.clone();
              caches.open(CACHE_VERSION)
                .then((cache) => cache.put(event.request, responseToCache));
              return response;
            })
            .catch(() => {
              return caches.match('/index.html');
            });
        })
    );
  }
});
