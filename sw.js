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
  '/animations/intro.json',    // ← ajoute ton animation Lottie ici
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
  );
  self.skipWaiting();
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
    )
  );
  self.clients.claim();
});

// 4) Fetch : navigation en "network-first", autres assets en "cache-first"
self.addEventListener('fetch', event => {
  const req = event.request;

  // Si c'est une navigation (chargement de page)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(response => {
          // Met à jour le cache avec la nouvelle index.html
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return response;
        })
        .catch(() =>
          // En cas d’échec réseau, on sert la version cache
          caches.match(req)
        )
    );
    return;
  }

  // Pour tous les autres fichiers : cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(response => {
        // On met en cache pour la prochaine fois
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      });
    })
  );
});
