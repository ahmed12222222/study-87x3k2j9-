// js/pwa.js — إدارة تثبيت تطبيق "إنجاز" (PWA Installation Manager)

(function () {
  'use strict';

  let deferredPrompt = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // تسجيل Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped or failed:', err);
      });
    });
  }

  // التقاط حدث التثبيت من المتصفح
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButtons();
    if (typeof toast === 'function') {
      toast('تم تثبيت تطبيق إنجاز على جهازك بنجاح! 🚀', 'success');
    }
  });

  function showInstallButtons() {
    if (isStandalone) return;
    const btns = document.querySelectorAll('.pwa-install-btn');
    btns.forEach((btn) => {
      btn.style.display = 'inline-flex';
    });
  }

  function hideInstallButtons() {
    const btns = document.querySelectorAll('.pwa-install-btn');
    btns.forEach((btn) => {
      btn.style.display = 'none';
    });
  }

  window.promptPWAInstall = async function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        deferredPrompt = null;
        hideInstallButtons();
      }
    } else if (isIOS) {
      // إرشاد مستخدمي الآيفون (سفاري لا يدعم قبل التثبيت برمجياً وإنما عبر زر المشاركة)
      openIOSInstallModal();
    } else {
      openGeneralInstallModal();
    }
  };

  function openIOSInstallModal() {
    let modal = document.getElementById('modal-ios-install');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-ios-install';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width:380px; text-align:center;">
          <div class="modal-head" style="justify-content:center;">
            <div class="brand-mark" style="width:48px; height:48px; border-radius:12px; margin-bottom:6px;">
              <img src="/public/icon-192.png" alt="شعار إنجاز" style="width:100%; height:100%; border-radius:12px; object-fit:cover;">
            </div>
          </div>
          <div class="modal-body" style="padding:16px 20px 24px;">
            <h3 style="font-size:1.15rem; margin-bottom:8px; color:var(--text);">تثبيت تطبيق إنجاز على الآيفون 📲</h3>
            <p style="font-size:0.88rem; color:var(--text-muted); line-height:1.6; margin-bottom:18px;">
              لتثبيت إنجاز كتطبيق شاشة رئيسية بدون شريط المتصفح:
            </p>
            <div style="background:var(--bg-elevated-2); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:right; font-size:0.86rem; color:var(--text); display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:1.2rem;">1️⃣</span>
                <span>اضغط على زر <b>المشاركة (Share)</b> <svg style="display:inline-block; vertical-align:middle; width:18px; height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> أسفل شاشة سفاري.</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:1.2rem;">2️⃣</span>
                <span>اختر <b>إضافة إلى الشاشة الرئيسية</b> (Add to Home Screen ➕).</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:1.2rem;">3️⃣</span>
                <span>اضغط <b>إضافة (Add)</b> وسيظهر تطبيق إنجاز فوراً على شاشتك!</span>
              </div>
            </div>
            <button type="button" class="btn btn-primary" onclick="document.getElementById('modal-ios-install').classList.remove('show')" style="width:100%; margin-top:18px; justify-content:center;">حسناً، فهمت</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
      });
    }
    modal.classList.add('show');
  }

  function openGeneralInstallModal() {
    if (typeof toast === 'function') {
      toast('يمكنك تثبيت الموقع كتطبيق من خيارات المتصفح (⋮) ثم "تثبيت التطبيق" 📲', 'info');
    }
  }

  // فحص ما إذا كان الجهاز على آيفون وغير مثبت لإظهار الزر
  window.addEventListener('DOMContentLoaded', () => {
    if (isIOS && !isStandalone) {
      showInstallButtons();
    }
  });

})();
