/**
 * إنجاز — وحدة التثبيت الأصيل PWA وتنبيهات النظام
 * مخصصة حصرياً للمشرف/الأدمن (لوحة التحكم) مع حجب أزرار التثبيت عن صفحات المتابعين والأهل
 * متوافقة مع جميع المتصفحات، استضافة GitHub Pages، وبيئات التشغيل المختلفة
 */
(function() {
  'use strict';

  let deferredPrompt = null;
  let isInstalled = false;
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isAndroid = /android/.test(navigator.userAgent.toLowerCase());

  // التحقق مما إذا كانت الصفحة الحالية هي صفحة الأدمن فقط
  function isAdminPage() {
    const path = window.location.pathname.toLowerCase();
    const href = window.location.href.toLowerCase();
    return path.endsWith('admin.html') || href.includes('admin.html');
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
    // إذا لم نكن في صفحة الأدمن، أو إذا كان التطبيق مثبتاً بالفعل كـ PWA
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
  }

  // معالجة حدث التثبيت عند النقر على زر تثبيت الأدمن
  window.triggerPWAInstall = async function() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          isInstalled = true;
          updateInstallUI();
          showPWAFeedback('جاري تثبيت تطبيق الأدمن على هاتفك...', 'success');
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

  // إظهار نافذة إرشادية أنيقة ومخصصة للوحة تحكم الأدمن
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
          <div class="pwa-step-text">اضغط <strong>إضافة</strong> ليظهر تطبيق لوحة تحكم الأدمن بأيقونته الرسمية فوراً وباسم <strong>إنجاز تحكم</strong>.</div>
        </div>
      `;
    } else {
      instructionsHtml = `
        <div class="pwa-step-item">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-text">اضغط على زر <strong>القائمة (⋮)</strong> أعلى متصفح كروم.</div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-text">اختر <strong>"تثبيت التطبيق"</strong> (Install App) أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-text">سيتثبت تطبيق الأدمن بشعاره الكامل ليفتح لوحة التحكم مباشرة من سطح المكتب.</div>
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
              <p class="pwa-modal-sub">تطبيق مستقل مخصص للمشرف فقط، بدون أشرطة متصفح مع فتح لوحة الإدارة فوراً</p>
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

    // إظهار بطاقة تثبيت خفيفة حصرياً داخل صفحة الأدمن إذا لم يُثبت بعد ولم يغلقها المستخدم مؤخراً
    if (isAdminPage()) {
      try {
        const dismissed = sessionStorage.getItem('injaz_admin_install_dismissed');
        if (!dismissed && !isInstalled) {
          showFloatingInstallPrompt();
        }
      } catch (_) {}
    }
  });

  // حدث اكتمال التثبيت
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
    updateInstallUI();
    const floating = document.getElementById('pwa-floating-bar');
    if (floating) floating.remove();
    showPWAFeedback('تم تثبيت تطبيق لوحة تحكم الأدمن بنجاح! 🎉', 'success');
  });

  // بطاقة تثبيت سريعة عائمة أسفل الشاشة — تظهر فقط في صفحة الأدمن
  function showFloatingInstallPrompt() {
    if (!isAdminPage()) return;
    if (document.getElementById('pwa-floating-bar') || isInstalled) return;

    const bar = document.createElement('div');
    bar.id = 'pwa-floating-bar';
    bar.className = 'pwa-floating-bar';
    bar.innerHTML = `
      <div class="pwa-bar-content">
        <img src="icon-192.png" class="pwa-bar-icon" alt="إنجاز تحكم" onerror="this.src='favicon-32.png'">
        <div class="pwa-bar-text">
          <strong>تثبيت تطبيق الأدمن 📱</strong>
          <span>لوحة التحكم والإدارة المستقلة على شاشة هاتفك</span>
        </div>
      </div>
      <div class="pwa-bar-actions">
        <button type="button" class="pwa-bar-btn-install" onclick="window.triggerPWAInstall()">تثبيت الأدمن</button>
        <button type="button" class="pwa-bar-btn-close" onclick="dismissInstallPrompt()">&times;</button>
      </div>
    `;
    document.body.appendChild(bar);
  }

  window.dismissInstallPrompt = function() {
    const el = document.getElementById('pwa-floating-bar');
    if (el) el.remove();
    try {
      sessionStorage.setItem('injaz_admin_install_dismissed', 'true');
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
        background: linear-gradient(135deg, rgba(234, 179, 8, 0.22), rgba(245, 158, 11, 0.35));
        color: #fef08a;
        border: 1px solid rgba(234, 179, 8, 0.55);
        padding: 5px 14px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 0 12px rgba(234, 179, 8, 0.2);
      }
      .pwa-install-trigger:hover {
        background: linear-gradient(135deg, rgba(234, 179, 8, 0.35), rgba(245, 158, 11, 0.5));
        border-color: #fef08a;
        transform: translateY(-1px);
        box-shadow: 0 0 18px rgba(234, 179, 8, 0.35);
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
        border: 1px solid rgba(234, 179, 8, 0.45);
        border-radius: 16px;
        box-shadow: 0 12px 36px rgba(0,0,0,0.55), 0 0 20px rgba(234, 179, 8, 0.2);
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
        border-radius: 9px;
        flex-shrink: 0;
        border: 1px solid rgba(234, 179, 8, 0.3);
      }
      .pwa-bar-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .pwa-bar-text strong {
        color: #fef08a;
        font-size: 0.84rem;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pwa-bar-text span {
        color: #94a3b8;
        font-size: 0.72rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pwa-bar-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .pwa-bar-btn-install {
        background: linear-gradient(135deg, #eab308, #ca8a04);
        color: #0b0f19;
        border: none;
        padding: 6px 14px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 0.78rem;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .pwa-bar-btn-install:active {
        transform: scale(0.96);
      }
      .pwa-bar-btn-close {
        background: transparent;
        color: #64748b;
        border: none;
        font-size: 1.25rem;
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
        background: #11131c;
        border: 1px solid rgba(234, 179, 8, 0.35);
        border-radius: 20px;
        max-width: 420px;
        width: 100%;
        padding: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(234, 179, 8, 0.15);
      }
      .pwa-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }
      .pwa-app-badge {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pwa-modal-logo {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        border: 1px solid rgba(234, 179, 8, 0.4);
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
        font-size: 1.5rem;
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
        gap: 12px;
        margin-bottom: 20px;
      }
      .pwa-step-item {
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
      .pwa-step-text {
        color: #e2e8f0;
        font-size: 0.82rem;
        line-height: 1.45;
      }
      .pwa-step-text strong {
        color: #fef08a;
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
