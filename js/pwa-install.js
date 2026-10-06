/**
 * إنجاز — وحدة الخدمة والتخزين المؤقت PWA
 * إزالة أي إعلانات أو بانرات تثبيت نهائياً بناءً على طلب المستخدم
 */
(function() {
  'use strict';

  function cleanupInstallBanners() {
    // إزالة جميع عناصر البانر والترويج وأزرار التثبيت من الـ DOM
    const selectors = [
      '#pwa-install-banner',
      '#pwa-install-btn',
      '#pwa-guide-modal',
      '.pwa-banner',
      '.pwa-install-btn',
      '[id*="pwa-install"]',
      '[id*="pwa-guide"]',
      '[class*="pwa-banner"]'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });

    try {
      localStorage.removeItem('pwa-banner-dismissed');
      localStorage.removeItem('pwa-install-prompted');
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupInstallBanners);
  } else {
    cleanupInstallBanners();
  }

  // إعادة الفحص بعد تحميل الصفحة للتأكد من عدم ظهور أي عنصر معلق
  window.addEventListener('load', cleanupInstallBanners);

  // تسجيل Service Worker بهدوء فقط للتخزين المؤقت دون أي واجهة مستخدم
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration notice:', err);
      });
    });
  }
})();
