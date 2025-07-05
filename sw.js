// sw.js
const CACHE_NAME = 'scratchmouse-v5';  // incrémente à chaque déploiement
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  // liste ici toutes tes images et icônes :
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/icons/user.png',
  '/icons/card.png',
  // … toutes tes cartes .webp et badges .png …
];

// 1) Install : pré-cache et passe directement à la nouvelle version
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

// 2) Activate : supprime les anciens caches, revendique tous les clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(oldKey => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

// 3) Fetch : stratégie "Cache First"
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request))
  );
});
