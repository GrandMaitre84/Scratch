const CACHE_NAME = 'scratchmouse-v26';  // incrémente à chaque déploiement
const ASSETS = [
  '/index.html',
  '/style.css?v=0.3.4',
  '/script.js?v=0.3.4',
  '/manifest.json',
  // icônes PWA
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/icons/user.png',
  '/icons/card.png',
  '/icons/trophy.png',
  '/icons/check.png',
  '/icons/gamepad.png',
  // cartes en WebP
  '/images/card1.webp',
  '/images/card2.webp',
  '/images/card3.webp',
  '/images/card4.webp',
  '/images/card5.webp',
  '/images/card6.webp',
  '/images/card7.webp',
  '/images/card8.webp',
  '/images/card9.webp',
  '/images/card10.webp',
  '/images/card11.webp',
  '/images/card12.webp',
  '/images/card13.webp',
  '/images/card14.webp',
  '/images/card15.webp',
  '/images/card16.webp',
  '/images/card17.webp',
  '/images/card18.webp',
  '/images/card19.webp',
  '/images/card20.webp',
  '/images/card21.webp',
  '/images/card22.webp',
  '/images/card23.webp',
  '/images/card24.webp',
  '/images/card25.webp',
  '/images/card26.webp',
  '/images/card27.webp',
  '/images/card28.webp',
  '/images/card29.webp',
  '/images/card30.webp',
  '/images/card31.webp',
  '/images/card32.webp',
  '/images/card33.webp',
  '/images/card34.webp',
  '/images/card35.webp',
  '/images/card36.webp',
  '/images/card37.webp',
  '/images/card38.webp',
  '/images/card39.webp',
  '/images/card40.webp',
  '/images/card41.webp',
  '/images/card42.webp',
  '/images/card43.webp',
  '/images/card44.webp',
  '/images/card45.webp',
  '/images/card46.webp',
  '/images/card47.webp',
  '/images/card48.webp',
  // badges en PNG
  '/images/badge1.png',
  '/images/badge4.png',
  '/images/badge5.png',
  '/images/badge6.png',
  '/images/badge11.png',
  '/images/badge12.png',
  '/images/badge17.png',
  '/images/badge21.png',
  '/images/badge22.png',
  '/images/badge23.png',
  '/images/badge28.png',
  '/images/badge32.png',
  '/images/badge34.png',
  '/images/badge35.png',
  '/images/badge48.png',
];

// 1) Install : pré-cache et passe directement à la nouvelle version
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        await cache.addAll(ASSETS);
      } catch (err) {
        console.warn('[SW] Échec lors du precache :', err);
      }
    })
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
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(resp =>
        resp || fetch(event.request)
      )
    )
  );
});
