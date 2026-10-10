/**
 * إنجاز — وحدة التثبيت الأصيل PWA وتنبيهات النظام
 * متوافقة مع جميع المتصفحات، استضافة GitHub Pages، وبيئات التشغيل المختلفة
 */
(function() {
  'use strict';

  let deferredPrompt = null;
  let isInstalled = false;
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isAndroid = /android/.test(navigator.userAgent.toLowerCase());

  // التحقق من تشغيل التطبيق حالياً كتطبيق مستقل (Standalone PWA)
  function checkStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  isInstalled = checkStandalone();

  // إنشاء أو تحديث عناصر واجهة التثبيت
  function updateInstallUI() {
    if (isInstalled) {
      // إخفاء أي أزرار أو بانرات تثبيت إذا كان التطبيق مثبتاً ويعمل كـ PWA
      document.querySelectorAll('.pwa-install-trigger').forEach(el => el.style.display = 'none');
      const banner = document.getElementById('pwa-install-toast');
      if (banner) banner.remove();
      return;
    }

    // إظهار أزرار التثبيت المدمجة في الواجهة
    document.querySelectorAll('.pwa-install-trigger').forEach(el => {
      el.style.display = 'inline-flex';
    });
  }

  // معالجة حدث التثبيت عند النقر
  window.triggerPWAInstall = async function() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          isInstalled = true;
          updateInstallUI();
          showPWAFeedback('جاري تثبيت تطبيق إنجاز على هاتفك...', 'success');
        }
        deferredPrompt = null;
        return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // إذا لم يتوفر معالج التثبيت التلقائي (iOS أو بعض إصدارات أندرويد كروم)
    showInstallGuideModal();
  };

  // إظهار نافذة إرشادية أنيقة وواضحة جداً للمستخدم
  function showInstallGuideModal() {
    const existing = document.getElementById('pwa-guide-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pwa-guide-modal';
    modal.className = 'pwa-modal-backdrop';
    
    let instructionsHtml = '';
    if (isIOS) {
      instructionsHtml = `
        <div class="pwa-step-item">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-text">اضغط على زر <strong>المشاركة</strong> (Share <span style="font-size:1.1em">⎋</span>) في شريط سفاري.</div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-text">مرر لأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> (Add to Home Screen).</div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-text">اضغط <strong>إضافة</strong> ليظهر تطبيق إنجاز بأيقونته الرسمية الذهبية فوراً.</div>
        </div>
      `;
    } else {
      instructionsHtml = `
        <div class="pwa-step-item">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-text">اضغط على زر <strong>القائمة (⋮)</strong> أعلى يمين أو يسار متصفح كروم.</div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-text">اختر <strong>"تثبيت التطبيق"</strong> (Install App) أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-text">سيتثبت التطبيق فوراً بشعاره الرسمي الكامل دون أي نقص.</div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="pwa-modal-box">
        <div class="pwa-modal-header">
          <div class="pwa-app-badge">
            <img src="icon-192.png" alt="شعار إنجاز" class="pwa-modal-logo" onerror="this.src='favicon-32.png'">
            <div>
              <h3 class="pwa-modal-title">تثبيت تطبيق إنجاز</h3>
              <p class="pwa-modal-sub">تطبيق مستقل سريع، بدون أشرطة متصفح، مع إشعارات فورية</p>
            </div>
          </div>
          <button type="button" class="pwa-close-btn" onclick="document.getElementById('pwa-guide-modal').remove()">&times;</button>
        </div>
        <div class="pwa-modal-steps">
          ${instructionsHtml}
        </div>
        <div class="pwa-modal-footer">
          <button type="button" class="pwa-btn-primary" onclick="document.getElementById('pwa-guide-modal').remove()">فهمت ذلك</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function showPWAFeedback(text, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `pwa-feedback-toast ${type}`;
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // الاستماع لحدث جاهزية تثبيت التطبيق في متصفح كروم
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallUI();

    // إظهار بطاقة تثبيت خفيفة إذا لم يثبت بعد ولم يغلقها المستخدم مؤخراً
    try {
      const dismissed = sessionStorage.getItem('injaz_install_toast_dismissed');
      if (!dismissed && !isInstalled) {
        showFloatingInstallPrompt();
      }
    } catch (_) {}
  });

  // حدث اكتمال التثبيت
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
    updateInstallUI();
    const floating = document.getElementById('pwa-floating-bar');
    if (floating) floating.remove();
    showPWAFeedback('تم تثبيت تطبيق إنجاز بنجاح! تجده الآن في شاشة هاتفك الرئيسية 🎉', 'success');
  });

  // بطاقة تثبيت سريعة عائمة أسفل الشاشة
  function showFloatingInstallPrompt() {
    if (document.getElementById('pwa-floating-bar') || isInstalled) return;

    const bar = document.createElement('div');
    bar.id = 'pwa-floating-bar';
    bar.className = 'pwa-floating-bar';
    bar.innerHTML = `
      <div class="pwa-bar-content">
        <img src="icon-192.png" class="pwa-bar-icon" alt="إنجاز" onerror="this.src='favicon-32.png'">
        <div class="pwa-bar-text">
          <strong>تثبيت إنجاز على هاتفك</strong>
          <span>لوصول أسرع وإشعارات دراسية مستمرة</span>
        </div>
      </div>
      <div class="pwa-bar-actions">
        <button type="button" class="pwa-bar-btn-install" onclick="window.triggerPWAInstall()">تثبيت</button>
        <button type="button" class="pwa-bar-btn-close" onclick="dismissInstallPrompt()">&times;</button>
      </div>
    `;
    document.body.appendChild(bar);
  }

  window.dismissInstallPrompt = function() {
    const el = document.getElementById('pwa-floating-bar');
    if (el) el.remove();
    try {
      sessionStorage.setItem('injaz_install_toast_dismissed', 'true');
    } catch (_) {}
  };

  // حقن تنسيقات واجهة التثبيت تلقائياً
  function injectStyles() {
    if (document.getElementById('pwa-install-styles')) return;
    const style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = `
      .pwa-install-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(234, 179, 8, 0.18), rgba(245, 158, 11, 0.28));
        color: #fef08a;
        border: 1px solid rgba(234, 179, 8, 0.45);
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .pwa-install-trigger:hover {
        background: linear-gradient(135deg, rgba(234, 179, 8, 0.3), rgba(245, 158, 11, 0.45));
        border-color: #fef08a;
        transform: translateY(-1px);
      }
      .pwa-floating-bar {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 440px;
        background: rgba(18, 20, 29, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(234, 179, 8, 0.35);
        border-radius: 16px;
        box-shadow: 0 12px 36px rgba(0,0,0,0.55), 0 0 20px rgba(234, 179, 8, 0.15);
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        z-index: 99999;
        direction: rtl;
        animation: pwaSlideUp 0.3s ease-out;
      }
      @keyframes pwaSlideUp {
        from { transform: translate(-50%, 40px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .pwa-bar-content {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .pwa-bar-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        flex-shrink: 0;
      }
      .pwa-bar-text {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
        min-width: 0;
      }
      .pwa-bar-text strong {
        font-size: 0.85rem;
        color: #f8fafc;
      }
      .pwa-bar-text span {
        font-size: 0.72rem;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pwa-bar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .pwa-bar-btn-install {
        background: linear-gradient(135deg, #eab308, #ca8a04);
        color: #0b0f19;
        border: none;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .pwa-bar-btn-install:active {
        transform: scale(0.95);
      }
      .pwa-bar-btn-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.4rem;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
      }
      .pwa-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        z-index: 100000;
        direction: rtl;
        animation: pwaFadeIn 0.2s ease-out;
      }
      @keyframes pwaFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .pwa-modal-box {
        background: #141724;
        border: 1px solid rgba(234, 179, 8, 0.35);
        border-radius: 20px;
        max-width: 380px;
        width: 100%;
        padding: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.7);
      }
      .pwa-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
      }
      .pwa-app-badge {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pwa-modal-logo {
        width: 48px;
        height: 48px;
        border-radius: 12px;
      }
      .pwa-modal-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: #f8fafc;
      }
      .pwa-modal-sub {
        margin: 3px 0 0;
        font-size: 0.74rem;
        color: #94a3b8;
        line-height: 1.3;
      }
      .pwa-close-btn {
        background: none;
        border: none;
        color: #64748b;
        font-size: 1.5rem;
        cursor: pointer;
      }
      .pwa-modal-steps {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(0,0,0,0.25);
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 16px;
      }
      .pwa-step-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      .pwa-step-num {
        width: 22px;
        height: 22px;
        background: #eab308;
        color: #0b0f19;
        font-weight: 800;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        flex-shrink: 0;
      }
      .pwa-step-text {
        font-size: 0.82rem;
        color: #cbd5e1;
        line-height: 1.4;
      }
      .pwa-modal-footer {
        display: flex;
        justify-content: flex-end;
      }
      .pwa-btn-primary {
        background: linear-gradient(135deg, #eab308, #ca8a04);
        color: #0b0f19;
        border: none;
        padding: 8px 18px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 0.85rem;
        cursor: pointer;
        width: 100%;
      }
      .pwa-feedback-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 10px 18px;
        font-size: 0.85rem;
        z-index: 100000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.4);
        animation: pwaFadeIn 0.2s ease-out;
        direction: rtl;
      }
      .pwa-feedback-toast.success {
        border-color: #22c55e;
        color: #86efac;
      }
    `;
    document.head.appendChild(style);
  }

  // تهيئة تسجيل Service Worker بصورة نسبية ذكية
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const swUrl = new URL('sw.js', window.location.href).href;
      navigator.serviceWorker.register(swUrl, { scope: './' })
        .then((reg) => {
          // تحديث دوري للـ Service Worker إذا وجد إصدار جديد
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('PWA SW Register error:', err);
        });
    } catch (e) {
      console.warn('SW init error:', e);
    }
  }

  // بدء العمل
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectStyles();
      updateInstallUI();
      initServiceWorker();
    });
  } else {
    injectStyles();
    updateInstallUI();
    initServiceWorker();
  }

  window.addEventListener('load', () => {
    updateInstallUI();
  });
})();
