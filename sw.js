const CACHE_NAME = 'train-game-v1';
const ASSETS = [
  './index.html',
  './train_script.js',
  './train_style.css',
  './D1.jpg', './D2.jpg', './D3.jpg', './D4.jpg', './D5.jpg', './D6.jpg',
  './dd1.jpg', './dd2.jpg', './dd3.jpg', './dd4.jpg', './dd5.jpg', './dd6.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
