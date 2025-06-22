// sw.js
// Service worker vide qui renvoie simplement les fichiers du cache
self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // on laisse passer toutes les requêtes, le navigateur gère le cache
});
