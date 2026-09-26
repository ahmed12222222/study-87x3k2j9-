/**
 * إنجاز — وحدة تثبيت التطبيق PWA (Progressive Web App)
 * يدعم التثبيت المباشر على Chrome, Android, Edge, ومحاكاة التوجيه السهل لـ iOS Safari
 * ويعالج فتح المعاينة من داخل إطار iframe
 */
(function() {
  'use strict';

  let deferredPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator && window.navigator.standalone === true);
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.MSStream;
  const isInIframe = window.self !== window.top;

  // إذا كان التطبيق مثبتاً ويعمل كـ Standalone فلا حاجة لأزرار التثبيت
  if (isStandalone) {
    return;
  }

  // تسجيل Service Worker لضمان استيفاء معايير PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA: SW registration notice:', err);
      });
    });
  }

  // التقاط حدث beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPWAInstallPrompt = e;
    updatePwaUI();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hidePwaUI();
    showToast('🎉 تم تثبيت تطبيق إنجاز بنجاح على جهازك!');
  });

  function showToast(msg) {
    let toast = document.getElementById('pwa-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwa-toast';
      toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:10px 20px;border-radius:30px;font-weight:700;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.3);font-size:0.9rem;transition:all 0.3s ease;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => {
      toast.style.opacity = '0';
    }, 4000);
  }

  function handleInstallClick() {
    // 1. إذا كان التطبيق داخل إطار iframe (مثل معاينة AI Studio)
    if (isInIframe) {
      openIframeModal();
      return;
    }

    // 2. إذا كان الحدث الأصلي متاحاً في المتصفح (Chrome, Edge, Samsung Internet)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          deferredPrompt = null;
          hidePwaUI();
        }
      });
      return;
    }

    // 3. إذا كان جهاز iOS (iPhone / iPad)
    if (isIOS) {
      openIOSModal();
      return;
    }

    // 4. متصفحات أندرويد/حاسوب بدون إشعار فوري
    openGenericModal();
  }

  function openIframeModal() {
    createOrUpdateModal({
      title: 'تثبيت التطبيق على جهازك',
      content: `
        <p style="margin-bottom:12px; font-size:0.92rem; color:var(--text);">
          أنت الآن تتصفح الموقع داخل نافذة المعاينة المدمجة. لا تسمح المتصفحات بتثبيت التطبيقات من داخل الإطارات (iFrames).
        </p>
        <div class="pwa-guide-steps">
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">1</span>
            <div class="pwa-guide-step-desc">
              اضغط على زر <strong>«فتح في نافذة مستقلة»</strong> بالأسفل لفتح الموقع في متصفحك مباشرة.
            </div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">2</span>
            <div class="pwa-guide-step-desc">
              عند فتح الموقع في المتصفح ستظهر لك رسالة <strong>«تثبيت التطبيق»</strong> أو يمكنك تثبيته مباشرة من القائمة ليظهر كأيقونة على شاشتك.
            </div>
          </div>
        </div>
      `,
      primaryBtnText: 'فتح الرابط في متصفح خارجي',
      onPrimary: () => {
        window.open(window.location.href, '_blank');
        closeModal();
      }
    });
  }

  function openIOSModal() {
    createOrUpdateModal({
      title: 'تثبيت إنجاز على الآيفون والآيباد 📱',
      content: `
        <p style="margin-bottom:14px; font-size:0.92rem; color:var(--text);">
          يمكنك تشغيل «إنجاز» كتطبيق كامل بدون شريط متصفح بخطوات بسيطة عبر سفاري (Safari):
        </p>
        <div class="pwa-guide-steps">
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">1</span>
            <div class="pwa-guide-step-desc">
              اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري (أيقونة المربع بسهم للأعلى في الأسفل أو الأعلى).
            </div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">2</span>
            <div class="pwa-guide-step-desc">
              انزل للأسفل بالقائمة واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> (Add to Home Screen ⊞).
            </div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">3</span>
            <div class="pwa-guide-step-desc">
              اضغط على <strong>«إضافة» (Add)</strong> في أعلى اليمين. سيظهر التطبيق فوراً على شاشتك الرئيسية!
            </div>
          </div>
        </div>
      `,
      primaryBtnText: 'فهمت ذلك',
      onPrimary: closeModal
    });
  }

  function openGenericModal() {
    createOrUpdateModal({
      title: 'تثبيت تطبيق إنجاز',
      content: `
        <p style="margin-bottom:14px; font-size:0.92rem; color:var(--text);">
          يمكنك إضافة هذا الموقع كتطبيق سريع على هاتفك أو حاسوبك بسهولة:
        </p>
        <div class="pwa-guide-steps">
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">1</span>
            <div class="pwa-guide-step-desc">
              افتح قائمة خيارات المتصفح (أيقونة الثلاث نقاط <strong>⋮</strong> أو أيقونة التثبيت في شريط العنوان).
            </div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">2</span>
            <div class="pwa-guide-step-desc">
              اختر <strong>«تثبيت التطبيق» (Install App)</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
            </div>
          </div>
          <div class="pwa-guide-step">
            <span class="pwa-guide-step-num">3</span>
            <div class="pwa-guide-step-desc">
              أكّد التثبيت ليعمل التطبيق بدون إنترنت وبشاشة كاملة سريعة!
            </div>
          </div>
        </div>
      `,
      primaryBtnText: 'تم',
      onPrimary: closeModal
    });
  }

  function createOrUpdateModal(config) {
    let modalOverlay = document.getElementById('pwa-guide-modal');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'pwa-guide-modal';
      modalOverlay.className = 'modal-overlay open';
      modalOverlay.setAttribute('role', 'dialog');
      modalOverlay.setAttribute('aria-modal', 'true');
      modalOverlay.innerHTML = `
        <div class="modal" style="max-width:440px;">
          <div class="modal-head">
            <h3 class="modal-title" id="pwa-modal-title"></h3>
            <button type="button" class="icon-btn" id="pwa-modal-close" aria-label="إغلاق">✕</button>
          </div>
          <div class="modal-body" id="pwa-modal-content"></div>
          <div class="modal-foot">
            <button type="button" class="btn btn-primary" id="pwa-modal-primary-btn" style="flex:1;"></button>
            <button type="button" class="btn btn-secondary" id="pwa-modal-secondary-btn">إغلاق</button>
          </div>
        </div>
      `;
      document.body.appendChild(modalOverlay);

      document.getElementById('pwa-modal-close').onclick = closeModal;
      document.getElementById('pwa-modal-secondary-btn').onclick = closeModal;
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    document.getElementById('pwa-modal-title').textContent = config.title;
    document.getElementById('pwa-modal-content').innerHTML = config.content;
    const primBtn = document.getElementById('pwa-modal-primary-btn');
    primBtn.textContent = config.primaryBtnText;
    primBtn.onclick = config.onPrimary;

    modalOverlay.style.display = 'flex';
  }

  function closeModal() {
    const modalOverlay = document.getElementById('pwa-guide-modal');
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  }

  function updatePwaUI() {
    let btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.style.display = 'inline-flex';
    }
  }

  function hidePwaUI() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  }

  function mountPwaButtons() {
    // 1. زر شريط الرأس في صفحات index و admin
    const topbarActions = document.querySelector('.topbar-actions');
    if (topbarActions && !document.getElementById('pwa-install-btn')) {
      const installBtn = document.createElement('button');
      installBtn.type = 'button';
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-btn';
      installBtn.title = 'تثبيت التطبيق على جهازك';
      installBtn.setAttribute('aria-label', 'تثبيت التطبيق على جهازك');
      installBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>تثبيت التطبيق</span>
      `;
      installBtn.onclick = handleInstallClick;
      // نضعه في أول شريط الأكشن ليكون واضحاً
      topbarActions.insertBefore(installBtn, topbarActions.firstChild);
    }

    // 2. إذا لم يسبق إغلاق البانر في هذه الجلسة، نظهر بانر خفيف أسفل الشاشة
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (!dismissed && !document.getElementById('pwa-install-banner')) {
      const banner = document.createElement('div');
      banner.id = 'pwa-install-banner';
      banner.className = 'pwa-banner';
      banner.innerHTML = `
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <div class="pwa-banner-text">
            <h4>تطبيق «إنجاز» لجهازك</h4>
            <p>نزّل التطبيق على هاتفك أو حاسوبك واستخدمه بدون متصفح وبسرعة فائقة.</p>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" class="btn btn-primary btn-sm" id="pwa-banner-install-btn">تثبيت الآن</button>
          <button type="button" class="icon-btn" id="pwa-banner-close-btn" title="إغلاق" aria-label="إغلاق">✕</button>
        </div>
      `;
      document.body.appendChild(banner);

      document.getElementById('pwa-banner-install-btn').onclick = () => {
        handleInstallClick();
      };
      document.getElementById('pwa-banner-close-btn').onclick = () => {
        banner.style.display = 'none';
        sessionStorage.setItem('pwa_banner_dismissed', '1');
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPwaButtons);
  } else {
    mountPwaButtons();
  }

  // تصدير دوال عامة إذا لزم
  window.PWAInstaller = {
    install: handleInstallClick,
    isStandalone: () => isStandalone
  };
})();
