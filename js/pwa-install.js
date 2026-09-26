/**
 * إنجاز — وحدة تثبيت التطبيق PWA (Progressive Web App)
 * يدعم التثبيت المباشر على Chrome, Android, Edge, ومحاكاة التوجيه السهل لـ iOS Safari
 * ويعالج فتح المعاينة من داخل إطار iframe
 */
(function() {
  'use strict';

  let deferredPrompt = window.__pwaPrompt || null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator && window.navigator.standalone === true);
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) && !window.MSStream;
  const isInIframe = window.self !== window.top;

  if (isStandalone) {
    return;
  }

  // التقاط حدث beforeinstallprompt مبكراً
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.__pwaPrompt = e;
    updatePwaUI();
  });

  window.addEventListener('pwa-prompt-captured', () => {
    if (window.__pwaPrompt) {
      deferredPrompt = window.__pwaPrompt;
      updatePwaUI();
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.__pwaPrompt = null;
    hidePwaUI();
    showToast('🎉 تم تثبيت تطبيق إنجاز بنجاح على جهازك!');
  });

  // تسجيل Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA: SW registration notice:', err);
      });
    });
  }

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
      if (toast) toast.style.opacity = '0';
    }, 4000);
  }

  function handleInstallClick() {
    // 1. إذا كان التطبيق داخل إطار المعاينة iFrame
    if (isInIframe) {
      openIframeModal();
      return;
    }

    // 2. إذا كان حدث التثبيت التلقائي متاحاً ومستعداً
    const promptEvent = deferredPrompt || window.__pwaPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        promptEvent.userChoice.then((choiceResult) => {
          if (choiceResult && choiceResult.outcome === 'accepted') {
            deferredPrompt = null;
            window.__pwaPrompt = null;
            hidePwaUI();
          }
        }).catch((err) => {
          console.warn('Install prompt error:', err);
          openAndroidGuideModal();
        });
        return;
      } catch (e) {
        console.warn('Prompt invocation error:', e);
      }
    }

    // 3. أجهزة iOS
    if (isIOS) {
      openIOSModal();
      return;
    }

    // 4. أجهزة أندرويد والمتصفحات الأخرى
    openAndroidGuideModal();
  }

  function openIframeModal() {
    const directUrl = window.location.href;
    createOrUpdateModal({
      title: 'تثبيت التطبيق على هاتفك 📲',
      content: `
        <div style="font-size:0.9rem; color:var(--text); line-height:1.6;">
          <p style="margin-bottom:12px;">
            أنت الآن تتصفح الموقع داخل <strong>نافذة المعاينة المدمجة</strong> في AI Studio. تمنع المتصفحات أمنياً تثبيت أي تطبيق PWA من داخل نوافذ المعاينة (iFrames).
          </p>
          <div class="pwa-guide-steps">
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">1</span>
              <div class="pwa-guide-step-desc">
                افتح الرابط مباشرة في متصفحك (Google Chrome على أندرويد أو Safari على آيفون).
              </div>
            </div>
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">2</span>
              <div class="pwa-guide-step-desc">
                بمجرد فتح الرابط في المتصفح الخارجي، يمكنك تثبيته فوراً كتطبيق كامل بشاشته المستقلة.
              </div>
            </div>
          </div>
          <div style="margin-top:14px; display:flex; flex-direction:column; gap:8px;">
            <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>فتح الموقع في صفحة مستقلة</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <button type="button" class="btn btn-secondary" id="pwa-copy-link-btn" style="display:flex; align-items:center; justify-content:center; gap:8px;">
              <span>نسخ رابط الموقع</span>
            </button>
          </div>
        </div>
      `,
      primaryBtnText: 'إغلاق',
      onPrimary: closeModal
    });

    const copyBtn = document.getElementById('pwa-copy-link-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(directUrl).then(() => {
          copyBtn.textContent = '✅ تم نسخ الرابط بنجاح!';
          setTimeout(() => {
            copyBtn.textContent = 'نسخ رابط الموقع';
          }, 3000);
        }).catch(() => {
          showToast('رابط الموقع: ' + directUrl);
        });
      };
    }
  }

  function openAndroidGuideModal() {
    createOrUpdateModal({
      title: 'طريقة تثبيت تطبيق «إنجاز» على أندرويد',
      content: `
        <div style="font-size:0.9rem; color:var(--text); line-height:1.6;">
          <p style="margin-bottom:12px;">
            لتشغيل الموقع كتطبيق مستقل بشاشة كاملة وبدون شريط المتصفح:
          </p>
          <div class="pwa-guide-steps">
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">1</span>
              <div class="pwa-guide-step-desc">
                في متصفح <strong>Google Chrome</strong>، اضغط على زر القائمة (أيقونة الثلاث نقاط <strong>⋮</strong> أعلى يسار أو يمين الشاشة).
              </div>
            </div>
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">2</span>
              <div class="pwa-guide-step-desc">
                اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> (Add to Home screen) أو <strong>«تثبيت التطبيق»</strong>.
              </div>
            </div>
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">3</span>
              <div class="pwa-guide-step-desc">
                اضغط على <strong>«إضافة» (Add)</strong>، وستجد أيقونة تطبيق «إنجاز» ظهرت فوراً بين تطبيقات هاتفك!
              </div>
            </div>
          </div>
          <div style="background:rgba(255,193,7,0.1); border:1px solid rgba(255,193,7,0.3); border-radius:8px; padding:10px; margin-top:12px; font-size:0.82rem; color:var(--text-muted);">
            💡 <strong>ملاحظة للمطورين:</strong> إذا ظهرت رسالة <em>"This app can't be installed"</em> عند الضغط على "تثبيت"، فاختر خيار <strong>«إضافة إلى الشاشة الرئيسية»</strong> في قائمة Chrome؛ فهو يعمل فورياً بنفس مزايا التطبيق المستقل (Standalone).
          </div>
        </div>
      `,
      primaryBtnText: 'فهمت ذلك',
      onPrimary: closeModal
    });
  }

  function openIOSModal() {
    createOrUpdateModal({
      title: 'تثبيت إنجاز على الآيفون والآيباد 📱',
      content: `
        <div style="font-size:0.9rem; color:var(--text); line-height:1.6;">
          <p style="margin-bottom:12px;">
            يمكنك تشغيل «إنجاز» كتطبيق كامل بدون شريط متصفح بخطوات بسيطة عبر متصفح سفاري (Safari):
          </p>
          <div class="pwa-guide-steps">
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">1</span>
              <div class="pwa-guide-step-desc">
                اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري (أيقونة المربع بسهم للأعلى).
              </div>
            </div>
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">2</span>
              <div class="pwa-guide-step-desc">
                انزل للأسفل في القائمة واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> (Add to Home Screen ⊞).
              </div>
            </div>
            <div class="pwa-guide-step">
              <span class="pwa-guide-step-num">3</span>
              <div class="pwa-guide-step-desc">
                اضغط على <strong>«إضافة» (Add)</strong> في أعلى الزاوية. سيظهر التطبيق فوراً على شاشتك الرئيسية!
              </div>
            </div>
          </div>
        </div>
      `,
      primaryBtnText: 'فهمت ذلك',
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
      modalOverlay.style.zIndex = '999999';
      modalOverlay.innerHTML = `
        <div class="modal" style="max-width:440px; margin:auto;">
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
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'inline-flex';
  }

  function hidePwaUI() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'none';
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
  }

  function mountPwaButtons() {
    // 1. زر شريط الرأس
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
      topbarActions.insertBefore(installBtn, topbarActions.firstChild);
    }

    // 2. بانر التثبيت السفلي
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
            <h4>تطبيق «إنجاز» لهاتفك</h4>
            <p>تثبيت التطبيق بشاشة كاملة وبدون شريط متصفح وبسرعة فائقة.</p>
          </div>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" class="btn btn-primary btn-sm" id="pwa-banner-install-btn">تثبيت الآن</button>
          <button type="button" class="icon-btn" id="pwa-banner-close-btn" title="إغلاق" aria-label="إغلاق">✕</button>
        </div>
      `;
      document.body.appendChild(banner);

      document.getElementById('pwa-banner-install-btn').onclick = handleInstallClick;
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

  window.PWAInstaller = {
    install: handleInstallClick,
    isStandalone: () => isStandalone
  };
})();
