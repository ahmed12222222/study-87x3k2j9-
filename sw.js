// sw.js — Service Worker لتشغيل تطبيق "إنجاز" بصورة مستقلة PWA وإدارة إشعارات النظام
const CACHE_NAME = 'injaz-pwa-v9';

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
  '/js/firebase-bridge.js',
  '/js/studyvault-bridge.js',
  '/js/pwa-install.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-maskable-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/favicon.ico',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('PWA Cache notice for:', url, err);
          })
        )
      );
    })
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
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls & Firebase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});

/* -------------------------------------------------------------
   إدارة إشعارات النظام (System Notifications) على الهاتف وخارج المتصفح
------------------------------------------------------------- */

// خريطة المؤقتات المجدولة في خلفية الـ Service Worker
const backgroundReminders = new Map();

self.addEventListener('message', (event) => {
  if (!event.data) return;

  // 1. إطلاق إشعار فوري عبر ServiceWorkerRegistration
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const finalOptions = Object.assign({
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      vibrate: [250, 100, 250, 100, 250],
      data: { url: '/admin.html' }
    }, options);

    event.waitUntil(self.registration.showNotification(title || 'إنجاز', finalOptions));
  }

  // 2. جدولة إشعار في الخلفية عند مغادرة الصفحة أو توقف الدراسة
  else if (event.data.type === 'SCHEDULE_INACTIVITY_REMINDER') {
    const { id, delayMs, title, options } = event.data;
    if (backgroundReminders.has(id)) {
      clearTimeout(backgroundReminders.get(id));
      backgroundReminders.delete(id);
    }

    if (delayMs > 0) {
      const timer = setTimeout(() => {
        const finalOptions = Object.assign({
          icon: '/icon-192.png',
          badge: '/favicon-32.png',
          vibrate: [300, 120, 300, 120, 300],
          data: { url: '/admin.html' }
        }, options);

        self.registration.showNotification(title || 'إنجاز - تذكير الانقطاع', finalOptions);
        backgroundReminders.delete(id);
      }, delayMs);

      backgroundReminders.set(id, timer);
    }
  }

  // 3. مسح جميع التذكيرات المجدولة فور بدء الدراسة
  else if (event.data.type === 'CLEAR_INACTIVITY_REMINDERS') {
    backgroundReminders.forEach((timer) => clearTimeout(timer));
    backgroundReminders.clear();
  }
});

// التعامل مع النقر على الإشعار من شريط إشعارات الهاتف أو قفل الشاشة
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا كان هناك تبويب مفتوح للتطبيق بالفعل، نفعله ونركز عليه
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (!client.url.includes(targetUrl) && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // إذا لم يكن مفتوحاً، نفتح نافذة جديدة للتطبيق
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// استقبال إشعارات Push في حال توفرها
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'إنجاز', body: event.data.text() };
    }
  }

  const title = data.title || 'إنجاز - تنبيه دراسي';
  const options = {
    body: data.body || 'لا تنسَ متابعة جلساتك وإكمال أهدافك اليوم!',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32.png',
    vibrate: data.vibrate || [250, 100, 250, 100, 250],
    tag: data.tag || 'injaz-push-alert',
    renotify: true,
    data: { url: data.url || '/admin.html' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
