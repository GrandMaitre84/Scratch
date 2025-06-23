// sw.js

// 1) Incrémentez cette version à chaque mise à jour
const CACHE_NAME = 'scratch-cache-v4';

const ASSETS = [
  '/', 
  '/index.html',
  '/style.css',
  '/script.js',
  '/sw.js',
  '/manifest.json',
  '/images/icon-180.png',
  '/images/card1.png',
  '/images/card2.png',
  '/images/card3.png',
  '/images/card4.png',
  '/images/badge1.png',
  '/images/badge4.png'
];

// 2) Installation : on met tout en cache + skipWaiting pour prise en main immédiate
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 3) Activation : on supprime les anciens caches + clients.claim pour contrôler immédiatement
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 4) Fetch : navigation en "network-first", autres assets en "cache-first"
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    // pour les navigations (index.html), on préfère le réseau
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // on met à jour le cache avec la nouvelle index.html
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() =>
          // en cas de coupure réseau, on sert la version cache
          caches.match(event.request)
        )
    );
    return;
  }
  // pour tout le reste : cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
