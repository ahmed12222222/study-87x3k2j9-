// sw.js — Service Worker لتشغيل تطبيق "إنجاز" بصورة مستقلة PWA
const CACHE_NAME = 'injaz-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/focus-tracker.html',
  '/review.html',
  '/studyvault.html',
  '/css/style.css',
  '/css/themes.css',
  '/css/focus-tracker-badge.css',
  '/css/focus-tracker.css',
  '/js/icons.js',
  '/js/shared.js',
  '/js/viewer.js',
  '/js/admin.js',
  '/js/pwa-install.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('Failed to cache asset:', url, err);
          })
        )
      );
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

  // لا نكاش طلبات الـ API أو اتصالات فايربيس المباشرة
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firestore') || url.hostname.includes('firebase')) {
    return;
  }

  // للأصول الثابتة: Network first with Cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
