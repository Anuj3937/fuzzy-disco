// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

// Must include a fetch handler for installability
self.addEventListener('fetch', () => {});
