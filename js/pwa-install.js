/**
 * إنجاز — وحدة التثبيت الأصيل PWA وتنبيهات النظام
 * مخصصة حصرياً للمشرف/الأدمن (لوحة التحكم) مع حجب أزرار وبانرات التثبيت عن صفحات المتابعين والأهل
 * متوافقة مع متصفح Chrome على أندرويد، Safari على iOS، وبيئات الاستضافة المختلفة
 */
(function() {
  'use strict';

  let deferredPrompt = window.__pwaDeferredPrompt || null;
  let isInstalled = false;
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isAndroid = /android/.test(navigator.userAgent.toLowerCase());

  // الاستماع لأي حدث قبل التثبيت تم التقاطه مسبقاً في ترويسة الصفحة
  window.__onPwaPromptReady = function(e) {
    deferredPrompt = e;
    updateInstallUI();
  };

  // التحقق مما إذا كانت الصفحة الحالية هي صفحة الأدمن فقط
  function isAdminPage() {
    const path = window.location.pathname.toLowerCase();
    const href = window.location.href.toLowerCase();
    return path.endsWith('admin.html') || href.includes('admin.html') || path.endsWith('/admin') || href.includes('/admin');
  }

  // التحقق من تشغيل التطبيق حالياً كتطبيق مستقل (Standalone PWA)
  function checkStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  isInstalled = checkStandalone();

  // إنشاء أو تحديث عناصر واجهة التثبيت (تظهر فقط وحصرياً في صفحة الأدمن)
  function updateInstallUI() {
    // إذا لم نكن في صفحة الأدمن، أو إذا كان التطبيق مفتوحاً حالياً كتطبيق مستقل
    if (!isAdminPage() || isInstalled) {
      document.querySelectorAll('.pwa-install-trigger').forEach(el => el.style.display = 'none');
      const floating = document.getElementById('pwa-floating-bar');
      if (floating) floating.remove();
      return;
    }

    // إظهار أزرار التثبيت المدمجة في لوحة تحكم الأدمن
    document.querySelectorAll('.pwa-install-trigger').forEach(el => {
      el.style.display = 'inline-flex';
    });

    // إظهار البانر العائم في صفحة الأدمن
    showFloatingInstallPrompt();
  }

  // معالجة حدث التثبيت عند النقر على زر تثبيت الأدمن
  window.triggerPWAInstall = async function(isRetry = false) {
    // اهتزاز لمسي للتأكيد الفوري على الضغط
    try {
      if (navigator.vibrate) navigator.vibrate(35);
    } catch (_) {}

    // فحص ما إذا كان معالج التثبيت جاهزاً
    const promptEvent = deferredPrompt || window.__pwaDeferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          isInstalled = true;
          updateInstallUI();
          showPWAFeedback('جاري تثبيت تطبيق الأدمن على هاتفك بنجاح...', 'success');
        }
        deferredPrompt = null;
        window.__pwaDeferredPrompt = null;
        return;
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
      }
    }

    // إذا لم يتوفر معالج التثبيت التلقائي (بسبب وجود تطبيق سابق، أو متصفح داخل تطبيق كواتساب، أو سفاري)
    showInstallGuideModal();
  };

  // إظهار نافذة إرشادية واضحة ومباشرة تشرح سبب عدم استجابة التثبيت وحله
  function showInstallGuideModal() {
    const existing = document.getElementById('pwa-guide-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pwa-guide-modal';
    modal.className = 'pwa-modal-backdrop';

    let stepsHtml = '';
    if (isIOS) {
      stepsHtml = `
        <div class="pwa-step-card">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-body">
            <strong>زر المشاركة:</strong>
            اضغط على زر المشاركة (Share <span style="font-size:1.1em">⎋</span>) في شريط متصفح سفاري بالأسفل.
          </div>
        </div>
        <div class="pwa-step-card">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-body">
            <strong>إضافة إلى الشاشة الرئيسية:</strong>
            مرر لأسفل القائمة واختر <span>"إضافة إلى الشاشة الرئيسية"</span> (Add to Home Screen).
          </div>
        </div>
        <div class="pwa-step-card">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-body">
            <strong>تأكيد الإضافة:</strong>
            اضغط <span>"إضافة"</span> وسيظهر تطبيق لوحة تحكم الأدمن بشعاره المستقل على سطح مكتبك فوراً.
          </div>
        </div>
      `;
    } else {
      stepsHtml = `
        <div class="pwa-alert-notice">
          <div class="pwa-notice-icon">⚠️</div>
          <div>
            <strong>تنبيه هام (إذا كان التطبيق مثبتاً لديك سابقاً):</strong>
            <p>إذا قمت بتنزيل النسخة السابقة (صفحة المتابعة الإندكس) على هاتفك، فإن متصفح كروم يعتبر الموقع مثبتاً بالفعل ولن يفتح نافذة التثبيت حتى تقوم بـ <strong>إلغاء تثبيت التطبيق القديم</strong> من شاشة الهاتف أولاً، ثم العودة والضغط على تثبيت الأدمن!</p>
          </div>
        </div>

        <div class="pwa-step-card">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-body">
            <strong>قائمة خيارات كروم (⋮):</strong>
            اضغط على النقاط الثلاث <strong>(⋮)</strong> في أعلى الزاوية بمتصفح كروم.
          </div>
        </div>
        <div class="pwa-step-card">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-body">
            <strong>اختر تثبيت التطبيق:</strong>
            اختر <span>"تثبيت التطبيق"</span> (Install App) أو <span>"الإضافة إلى الشاشة الرئيسية"</span>.
          </div>
        </div>
        <div class="pwa-step-card">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-body">
            <strong>إذا فتحت الرابط من داخل واتساب:</strong>
            اضغط الثلاث نقاط واختر <span>"فتح في المتصفح / Chrome"</span> لأن متصفحات المحادثات تمنع التثبيت.
          </div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="pwa-modal-box">
        <div class="pwa-modal-header">
          <div class="pwa-app-badge">
            <img src="icon-192.png" alt="شعار إنجاز" class="pwa-modal-logo" onerror="this.src='favicon-32.png'">
            <div>
              <h3 class="pwa-modal-title">تثبيت تطبيق الأدمن (لوحة التحكم) 📱</h3>
              <p class="pwa-modal-sub">تطبيق مستقل للمشرف فقط يفتح لوحة التحكم فوراً وبشعار رسمي</p>
            </div>
          </div>
          <button type="button" class="pwa-close-btn" onclick="document.getElementById('pwa-guide-modal').remove()">&times;</button>
        </div>

        <div class="pwa-modal-steps">
          ${stepsHtml}
        </div>

        <div class="pwa-modal-footer">
          <button type="button" class="pwa-btn-retry" onclick="retryInstall()">🔄 محاولة التثبيت مرة أخرى</button>
          <button type="button" class="pwa-btn-primary" onclick="document.getElementById('pwa-guide-modal').remove()">فهمت ذلك، شكراً</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  window.retryInstall = function() {
    const modal = document.getElementById('pwa-guide-modal');
    if (modal) modal.remove();
    setTimeout(() => {
      window.triggerPWAInstall();
    }, 250);
  };

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
    window.__pwaDeferredPrompt = e;
    updateInstallUI();
  });

  // حدث اكتمال التثبيت
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
    window.__pwaDeferredPrompt = null;
    updateInstallUI();
    const floating = document.getElementById('pwa-floating-bar');
    if (floating) floating.remove();
    showPWAFeedback('تم تثبيت تطبيق لوحة تحكم الأدمن بنجاح! 🎉', 'success');
  });

  // بطاقة تثبيت سريعة عائمة أسفل الشاشة — تظهر فقط في صفحة الأدمن
  function showFloatingInstallPrompt() {
    if (!isAdminPage()) return;
    if (document.getElementById('pwa-floating-bar') || isInstalled) return;

    try {
      const dismissed = sessionStorage.getItem('injaz_admin_bar_dismissed');
      if (dismissed) return;
    } catch (_) {}

    const bar = document.createElement('div');
    bar.id = 'pwa-floating-bar';
    bar.className = 'pwa-floating-bar';
    bar.innerHTML = `
      <div class="pwa-bar-content" onclick="window.triggerPWAInstall()">
        <img src="icon-192.png" class="pwa-bar-icon" alt="إنجاز تحكم" onerror="this.src='favicon-32.png'">
        <div class="pwa-bar-text">
          <strong>تثبيت تطبيق الأدمن 📱</strong>
          <span>لوحة التحكم المستقلة على شاشة هاتفك</span>
        </div>
      </div>
      <div class="pwa-bar-actions">
        <button type="button" class="pwa-bar-btn-install" onclick="window.triggerPWAInstall()">تثبيت الآن</button>
        <button type="button" class="pwa-bar-btn-close" onclick="dismissInstallPrompt(event)">&times;</button>
      </div>
    `;
    document.body.appendChild(bar);
  }

  window.dismissInstallPrompt = function(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const el = document.getElementById('pwa-floating-bar');
    if (el) el.remove();
    try {
      sessionStorage.setItem('injaz_admin_bar_dismissed', 'true');
    } catch (_) {}
  };

  // حقن تنسيقات واجهة التثبيت تلقائياً
  function injectStyles() {
    if (document.getElementById('pwa-install-styles')) return;
    const style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = `
      .pwa-install-trigger {
        display: none;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(245, 158, 11, 0.4));
        color: #fef08a;
        border: 1px solid rgba(234, 179, 8, 0.65);
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 0 14px rgba(234, 179, 8, 0.25);
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      .pwa-install-trigger:hover {
        background: linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(245, 158, 11, 0.55));
        border-color: #fef08a;
        transform: translateY(-1px);
        box-shadow: 0 0 18px rgba(234, 179, 8, 0.4);
      }
      .pwa-install-trigger:active {
        transform: scale(0.96);
      }
      .pwa-floating-bar {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 24px);
        max-width: 440px;
        background: rgba(18, 20, 29, 0.97);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(234, 179, 8, 0.5);
        border-radius: 18px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.65), 0 0 25px rgba(234, 179, 8, 0.25);
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
        cursor: pointer;
        flex: 1;
      }
      .pwa-bar-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        flex-shrink: 0;
        border: 1px solid rgba(234, 179, 8, 0.4);
      }
      .pwa-bar-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .pwa-bar-text strong {
        color: #fef08a;
        font-size: 0.86rem;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pwa-bar-text span {
        color: #94a3b8;
        font-size: 0.74rem;
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
        padding: 7px 16px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 0.82rem;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .pwa-bar-btn-install:active {
        transform: scale(0.95);
      }
      .pwa-bar-btn-close {
        background: transparent;
        color: #64748b;
        border: none;
        font-size: 1.35rem;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .pwa-bar-btn-close:hover {
        color: #cbd5e1;
      }
      .pwa-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
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
        background: #11131c;
        border: 1px solid rgba(234, 179, 8, 0.4);
        border-radius: 22px;
        max-width: 440px;
        width: 100%;
        padding: 22px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(234, 179, 8, 0.2);
        max-height: 90vh;
        overflow-y: auto;
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
        border: 1px solid rgba(234, 179, 8, 0.45);
      }
      .pwa-modal-title {
        color: #f8fafc;
        font-size: 1.05rem;
        font-weight: 800;
        margin: 0 0 3px 0;
      }
      .pwa-modal-sub {
        color: #94a3b8;
        font-size: 0.78rem;
        margin: 0;
        line-height: 1.35;
      }
      .pwa-close-btn {
        background: transparent;
        color: #64748b;
        border: none;
        font-size: 1.6rem;
        line-height: 1;
        cursor: pointer;
        padding: 0 4px;
      }
      .pwa-close-btn:hover {
        color: #f1f5f9;
      }
      .pwa-modal-steps {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
      }
      .pwa-alert-notice {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        background: rgba(234, 179, 8, 0.1);
        border: 1px solid rgba(234, 179, 8, 0.35);
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 0.8rem;
        color: #fef08a;
        line-height: 1.45;
      }
      .pwa-alert-notice p {
        margin: 4px 0 0 0;
        color: #e2e8f0;
        font-size: 0.76rem;
      }
      .pwa-notice-icon {
        font-size: 1.25rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .pwa-step-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 10px 14px;
      }
      .pwa-step-num {
        background: #eab308;
        color: #0b0f19;
        font-weight: 900;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        flex-shrink: 0;
      }
      .pwa-step-body {
        color: #cbd5e1;
        font-size: 0.82rem;
        line-height: 1.45;
      }
      .pwa-step-body strong {
        color: #fef08a;
        display: block;
        margin-bottom: 2px;
      }
      .pwa-step-body span {
        color: #fef08a;
        font-weight: 700;
      }
      .pwa-modal-footer {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .pwa-btn-primary {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 9px 16px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        flex: 1;
      }
      .pwa-btn-retry {
        background: linear-gradient(135deg, #eab308, #ca8a04);
        color: #0b0f19;
        border: none;
        padding: 9px 18px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 0.85rem;
        cursor: pointer;
        flex: 1.3;
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
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[PWA] SW Register notice:', err);
        });
    } catch (e) {
      console.warn('[PWA] SW init error:', e);
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
