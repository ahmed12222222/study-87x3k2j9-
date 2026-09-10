/* ============================================================
   Focus Tracker — نظام شعارات وأيقونات الرتب (3D Gaming Badges / Crests)
   يدعم 5 أشكال وتصاميم متميزة لكل رتبة (إجمالي 45 تصميماً أصلياً)
   يمكن للمستخدم اختيار أي شكل يفضله لكل رتبة مع حفظ الاختيار وتطبيقه فوراً.
   - رتبة الدايموند الشكل 1 مطابق تماماً للصورة الأصلية بالسكرين شوت.
   ============================================================ */

(function () {
  const STORAGE_KEY = 'focusTrackerRankStyles_v1';

  const TIERS = [
    { key: 'bronze',   label: 'BRONZE',      arName: 'برونز',       color: '#CD7F32' },
    { key: 'silver',   label: 'SILVER',      arName: 'سيلفر',       color: '#C0C0C0' },
    { key: 'gold',     label: 'GOLD',        arName: 'ذهب',         color: '#FFD700' },
    { key: 'platinum', label: 'PLATINUM',    arName: 'بلاتينيوم',   color: '#E5E4E2' },
    { key: 'diamond',  label: 'DIAMOND',     arName: 'دايموند',     color: '#00E5FF' },
    { key: 'elite',    label: 'ELITE',       arName: 'إيليت',       color: '#00BFFF' },
    { key: 'champion', label: 'CHAMPION',    arName: 'تشامبيون',    color: '#FF6B00' },
    { key: 'unreal',   label: 'UNREAL',      arName: 'أنريل',       color: '#FFD700' },
    { key: 'machine',  label: 'THE MACHINE', arName: 'ذا مشين',     color: '#00FF41' },
  ];

  function normalizeTier(t) {
    if (!t) return 'bronze';
    const s = String(t).trim().toLowerCase();
    if (s.includes('machine')) return 'machine';
    if (s.includes('unreal')) return 'unreal';
    if (s.includes('champion')) return 'champion';
    if (s.includes('elite')) return 'elite';
    if (s.includes('diamond')) return 'diamond';
    if (s.includes('plat')) return 'platinum';
    if (s.includes('gold')) return 'gold';
    if (s.includes('silver')) return 'silver';
    if (s.includes('bronze')) return 'bronze';
    return s;
  }

  function getStoredStyles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveStoredStyles(map) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function getSelectedVariant(tierInput) {
    const key = normalizeTier(tierInput);
    const styles = getStoredStyles();
    const val = parseInt(styles[key], 10);
    return (val >= 1 && val <= 5) ? val : 1;
  }

  function setSelectedVariant(tierInput, variantNum) {
    const key = normalizeTier(tierInput);
    const num = Math.max(1, Math.min(5, parseInt(variantNum, 10) || 1));
    const styles = getStoredStyles();
    styles[key] = num;
    saveStoredStyles(styles);

    // مزامنة سحابية إذا توفرت
    try {
      if (window.FirebaseSync && window.INJAZ_FIREBASE_CONFIG) {
        window.FirebaseSync.update('focusTracker/rankStyles', styles).catch(() => {});
      }
    } catch (e) {}

    // إشعار الموقع للتحديث الفوري
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rank-style-changed', { detail: { tier: key, variant: num } }));
      if (window.FocusTrackerBadge && typeof window.FocusTrackerBadge.refresh === 'function') {
        window.FocusTrackerBadge.refresh();
      }
    }
    return num;
  }

  /* ============================================================
     مكتبة تصاميم الـ SVG (45 تصميماً — 5 لكل رتبة)
     كل تصميم بمقاس viewBox="0 0 100 100" مع تدرجات لونية وتفاصيل ثلاثية الأبعاد
     ============================================================ */

  const VARIANTS = {
    // ------------------ 1. BRONZE (برونز) ------------------
    bronze: [
      {
        id: 1,
        name: 'درع المحارب المطروق',
        desc: 'درع دائري برونزي سميك مطروق مع مسامير وألواح متقاطعة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-bronze">
            <defs>
              <radialGradient id="b1_core" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="#3d1d06"/><stop offset="70%" stop-color="#1e0c02"/><stop offset="100%" stop-color="#0a0400"/></radialGradient>
              <linearGradient id="b1_rim" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFBE94"/><stop offset="35%" stop-color="#CD7F32"/><stop offset="70%" stop-color="#8C4E1A"/><stop offset="100%" stop-color="#472305"/></linearGradient>
              <linearGradient id="b1_plate" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFA875"/><stop offset="50%" stop-color="#CD7F32"/><stop offset="100%" stop-color="#6E380D"/></linearGradient>
            </defs>
            <circle cx="50" cy="50" r="42" fill="url(#b1_core)" stroke="url(#b1_rim)" stroke-width="3.5"/>
            <circle cx="50" cy="50" r="34" stroke="#8C4E1A" stroke-width="1.8" stroke-dasharray="7 4" opacity="0.85"/>
            <circle cx="50" cy="14" r="3" fill="#FFA875"/><circle cx="50" cy="86" r="3" fill="#FFA875"/><circle cx="14" cy="50" r="3" fill="#FFA875"/><circle cx="86" cy="50" r="3" fill="#FFA875"/>
            <polygon points="50,22 62,38 50,44 38,38" fill="url(#b1_plate)" stroke="#FFA875" stroke-width="1"/>
            <polygon points="50,78 62,62 50,56 38,62" fill="url(#b1_plate)" stroke="#FFA875" stroke-width="1"/>
            <polygon points="22,50 38,38 44,50 38,62" fill="url(#b1_plate)" stroke="#FFA875" stroke-width="1"/>
            <polygon points="78,50 62,38 56,50 62,62" fill="url(#b1_plate)" stroke="#FFA875" stroke-width="1"/>
            <polygon points="50,34 66,50 50,66 34,50" fill="url(#b1_rim)" stroke="#FFA875" stroke-width="1.5"/>
            <circle cx="50" cy="50" r="6" fill="#FFA875"/><circle cx="50" cy="50" r="2.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'خوذة المصارع الإسبارطي',
        desc: 'درع مدبب مستوحى من دروع المقاتلين الإسبارطيين مع خط وسطي فولاذي',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-bronze">
            <defs>
              <linearGradient id="b2_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFBE94"/><stop offset="50%" stop-color="#CD7F32"/><stop offset="100%" stop-color="#472305"/></linearGradient>
              <linearGradient id="b2_core" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#2a1203"/><stop offset="100%" stop-color="#120601"/></linearGradient>
            </defs>
            <!-- Shield Body -->
            <polygon points="50,12 84,28 76,72 50,92 24,72 16,28" fill="url(#b2_core)" stroke="url(#b2_grad)" stroke-width="3"/>
            <polygon points="50,22 74,34 68,68 50,82 32,68 26,34" fill="none" stroke="#CD7F32" stroke-width="1.5" opacity="0.6"/>
            <!-- Spartan V-Emblem -->
            <path d="M50 26 L66 64 L50 54 L34 64 Z" fill="url(#b2_grad)" stroke="#FFBE94" stroke-width="1.2"/>
            <line x1="50" y1="12" x2="50" y2="92" stroke="#FFBE94" stroke-width="2"/>
            <circle cx="50" cy="40" r="4" fill="#FFBE94"/>
          </svg>`
      },
      {
        id: 3,
        name: 'فأس المعركة والقرص البرونزي',
        desc: 'رأس فأس مزدوج خلف قرص حديدي مثبّت مع لمعان نحاسي',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-bronze">
            <defs>
              <linearGradient id="b3_axe" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFA875"/><stop offset="60%" stop-color="#8C4E1A"/><stop offset="100%" stop-color="#3d1d06"/></linearGradient>
            </defs>
            <!-- Crossed axe blades behind -->
            <path d="M22 22 L38 38 L26 50 L10 34 Z" fill="url(#b3_axe)" stroke="#FFA875" stroke-width="1"/>
            <path d="M78 22 L62 38 L74 50 L90 34 Z" fill="url(#b3_axe)" stroke="#FFA875" stroke-width="1"/>
            <path d="M22 78 L38 62 L26 50 L10 66 Z" fill="url(#b3_axe)" stroke="#FFA875" stroke-width="1"/>
            <path d="M78 78 L62 62 L74 50 L90 66 Z" fill="url(#b3_axe)" stroke="#FFA875" stroke-width="1"/>
            <!-- Octagon Plate -->
            <polygon points="36,18 64,18 82,36 82,64 64,82 36,82 18,64 18,36" fill="#240f03" stroke="#CD7F32" stroke-width="3"/>
            <!-- Inner Boss -->
            <circle cx="50" cy="50" r="18" fill="url(#b3_axe)" stroke="#FFBE94" stroke-width="2"/>
            <polygon points="50,38 58,50 50,62 42,50" fill="#FFA875"/>
          </svg>`
      },
      {
        id: 4,
        name: 'درع السندان القزمي',
        desc: 'درع صلب عريض مع سندان مطروق وشقوق نحاسية مضيئة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-bronze">
            <defs>
              <linearGradient id="b4_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFBE94"/><stop offset="50%" stop-color="#CD7F32"/><stop offset="100%" stop-color="#3d1d06"/></linearGradient>
            </defs>
            <polygon points="18,22 82,22 86,58 50,88 14,58" fill="#1c0a02" stroke="url(#b4_grad)" stroke-width="3.2"/>
            <!-- Anvil Silhouette -->
            <polygon points="28,34 72,34 66,44 58,44 60,62 70,68 30,68 40,62 42,44 34,44" fill="url(#b4_grad)" stroke="#FFBE94" stroke-width="1"/>
            <circle cx="50" cy="53" r="4" fill="#FFA875"/>
          </svg>`
      },
      {
        id: 5,
        name: 'نجمة البرونز الثمانية',
        desc: 'بوصلة حربية ثمانية الأضلاع بأطراف حادة ونواة برونزية مشعة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-bronze">
            <defs>
              <radialGradient id="b5_glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FFA875"/><stop offset="70%" stop-color="#8C4E1A"/><stop offset="100%" stop-color="#240f03"/></radialGradient>
            </defs>
            <!-- 8-Point Star -->
            <polygon points="50,10 58,36 84,26 68,48 90,50 68,52 84,74 58,64 50,90 42,64 16,74 32,52 10,50 32,48 16,26 42,36" fill="url(#b5_glow)" stroke="#FFA875" stroke-width="1.8"/>
            <circle cx="50" cy="50" r="14" fill="#1c0a02" stroke="#CD7F32" stroke-width="2"/>
            <circle cx="50" cy="50" r="6" fill="#FFA875"/>
          </svg>`
      }
    ],

    // ------------------ 2. SILVER (سيلفر) ------------------
    silver: [
      {
        id: 1,
        name: 'أجنحة الفارس الفضي',
        desc: 'درع قوطي مع أجنحة فولاذية حادة ونصل السيف المصقول',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-silver">
            <defs>
              <radialGradient id="s1_core" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#242b35"/><stop offset="70%" stop-color="#13171d"/><stop offset="100%" stop-color="#080a0d"/></radialGradient>
              <linearGradient id="s1_chrm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="35%" stop-color="#E1E7ED"/><stop offset="70%" stop-color="#9CAAB8"/><stop offset="100%" stop-color="#556270"/></linearGradient>
            </defs>
            <path d="M12 36 C10 24, 20 18, 32 16 L28 32 L16 48 Z" fill="url(#s1_chrm)"/>
            <path d="M88 36 C90 24, 80 18, 68 16 L72 32 L84 48 Z" fill="url(#s1_chrm)"/>
            <polygon points="26,18 74,18 78,52 50,92 22,52" fill="url(#s1_core)" stroke="url(#s1_chrm)" stroke-width="2.6"/>
            <polygon points="50,22 55,56 50,74 45,56" fill="url(#s1_chrm)"/>
            <circle cx="50" cy="40" r="3.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'درع الفارس النبيل',
        desc: 'درع الكايت الطويل مع صليب فضي نقي وحواف كروم مصقولة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-silver">
            <defs>
              <linearGradient id="s2_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#B0BEC5"/><stop offset="100%" stop-color="#37474F"/></linearGradient>
            </defs>
            <!-- Elongated Kite Shield -->
            <path d="M50 10 C76 10, 84 26, 80 54 C76 74, 50 94, 50 94 C50 94, 24 74, 20 54 C16 26, 24 10, 50 10 Z" fill="#141920" stroke="url(#s2_grad)" stroke-width="3"/>
            <!-- Inner Cross -->
            <polygon points="46,18 54,18 54,42 74,42 74,50 54,50 54,82 46,82 46,50 26,50 26,42 46,42" fill="url(#s2_grad)"/>
            <circle cx="50" cy="46" r="4" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 3,
        name: 'صقر الفضة والصلب',
        desc: 'أجنحة صقر فضي ممتدة تحيط بقلب مثلثي مشع بنقاء الفولاذ',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-silver">
            <defs>
              <linearGradient id="s3_wing" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="60%" stop-color="#90A4AE"/><stop offset="100%" stop-color="#37474F"/></linearGradient>
            </defs>
            <!-- Swept Wings -->
            <path d="M50 30 L82 14 L76 46 L60 52 L50 62 L40 52 L24 46 L18 14 Z" fill="url(#s3_wing)" stroke="#FFFFFF" stroke-width="1.2"/>
            <polygon points="50,44 68,76 50,92 32,76" fill="#131920" stroke="url(#s3_wing)" stroke-width="2.5"/>
            <polygon points="50,56 60,74 50,84 40,74" fill="url(#s3_wing)"/>
            <circle cx="50" cy="68" r="3" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 4,
        name: 'السيفان الفضيان المتقاطعان',
        desc: 'نصلان حادان متقاطعان خلف مشبك فولاذي دائري مصقول',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-silver">
            <defs>
              <linearGradient id="s4_blade" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#CFD8DC"/><stop offset="100%" stop-color="#455A64"/></linearGradient>
            </defs>
            <!-- Crossed blades -->
            <line x1="18" y1="18" x2="82" y2="82" stroke="url(#s4_blade)" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="82" y1="18" x2="18" y2="82" stroke="url(#s4_blade)" stroke-width="4.5" stroke-linecap="round"/>
            <!-- Center Shield -->
            <polygon points="50,24 74,40 66,74 50,86 34,74 26,40" fill="#151b22" stroke="url(#s4_blade)" stroke-width="2.8"/>
            <polygon points="50,34 62,44 58,66 50,74 42,66 38,44" fill="url(#s4_blade)"/>
            <circle cx="50" cy="54" r="3.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 5,
        name: 'نجم الأرجنت الكرومي',
        desc: 'نجمة سداسية حادة ذات زوايا هندسية وانعكاسات كرومية باهرة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-silver">
            <defs>
              <linearGradient id="s5_star" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#B0BEC5"/><stop offset="100%" stop-color="#263238"/></linearGradient>
            </defs>
            <polygon points="50,12 60,34 84,34 68,52 76,76 50,62 24,76 32,52 16,34 40,34" fill="url(#s5_star)" stroke="#FFFFFF" stroke-width="1.8"/>
            <polygon points="50,26 56,40 70,40 60,50 64,64 50,56 36,64 40,50 30,40 44,40" fill="#141a21" stroke="#ECEFF1" stroke-width="1"/>
            <circle cx="50" cy="50" r="4.5" fill="#FFFFFF"/>
          </svg>`
      }
    ],

    // ------------------ 3. GOLD (ذهب) ------------------
    gold: [
      {
        id: 1,
        name: 'صقر النصر والتاج الإمبراطوري',
        desc: 'أجنحة نسر إمبراطوري ذهبي ممتدة يعلوها تاج خماسي ونجمة براقة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-gold">
            <defs>
              <radialGradient id="g1_core" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#3d2c00"/><stop offset="70%" stop-color="#1f1600"/><stop offset="100%" stop-color="#0a0700"/></radialGradient>
              <linearGradient id="g1_gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF3A8"/><stop offset="30%" stop-color="#FFD700"/><stop offset="70%" stop-color="#D49A00"/><stop offset="100%" stop-color="#735100"/></linearGradient>
            </defs>
            <!-- Crown -->
            <polygon points="28,24 36,12 50,22 64,12 72,24 50,30" fill="url(#g1_gold)" stroke="#FFF3A8" stroke-width="1.2"/>
            <!-- Wings -->
            <path d="M10 40 C14 28, 30 24, 44 26 L36 46 L20 58 Z" fill="url(#g1_gold)"/>
            <path d="M90 40 C86 28, 70 24, 56 26 L64 46 L80 58 Z" fill="url(#g1_gold)"/>
            <!-- Shield Body -->
            <polygon points="30,30 70,30 76,64 50,92 24,64" fill="url(#g1_core)" stroke="url(#g1_gold)" stroke-width="3"/>
            <!-- Chevron & Star -->
            <polygon points="50,42 64,56 50,68 36,56" fill="url(#g1_gold)"/>
            <polygon points="50,48 54,58 64,58 56,64 60,74 50,68 40,74 44,64 36,58 46,58" fill="#FFF3A8"/>
            <circle cx="50" cy="62" r="3" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'شمس الذهب المشعة',
        desc: 'قرص شمسي ذهبي 24K محاط بألسنة شعاعية متلألئة وأحجار كريمة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-gold">
            <defs>
              <linearGradient id="g2_sol" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFDE7"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient>
            </defs>
            <!-- Sun Rays -->
            <circle cx="50" cy="50" r="38" fill="none" stroke="url(#g2_sol)" stroke-width="2.5" stroke-dasharray="6 6"/>
            <!-- 12-point Sunburst -->
            <polygon points="50,14 54,34 68,20 62,38 82,32 68,46 86,50 68,54 82,68 62,62 68,80 54,66 50,86 46,66 32,80 38,62 18,68 32,54 14,50 32,46 18,32 38,38 32,20 46,34" fill="url(#g2_sol)"/>
            <circle cx="50" cy="50" r="18" fill="#291b00" stroke="#FFF3A8" stroke-width="2.5"/>
            <polygon points="50,38 54,46 62,50 54,54 50,62 46,54 38,50 46,46" fill="#FFFDE7"/>
          </svg>`
      },
      {
        id: 3,
        name: 'أسد الإمبراطور الملكي',
        desc: 'رمز رأس الأسد الذهبي المحاط بهالة إكليل الغار الملكي',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-gold">
            <defs>
              <linearGradient id="g3_lion" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="50%" stop-color="#FFD54F"/><stop offset="100%" stop-color="#B78103"/></linearGradient>
            </defs>
            <polygon points="20,16 80,16 86,58 50,92 14,58" fill="#241701" stroke="url(#g3_lion)" stroke-width="3"/>
            <!-- Lion Head Stylized Facets -->
            <polygon points="50,26 62,38 58,54 50,66 42,54 38,38" fill="url(#g3_lion)" stroke="#FFF9C4" stroke-width="1.2"/>
            <polygon points="38,38 28,48 38,58 42,54" fill="url(#g3_lion)"/>
            <polygon points="62,38 72,48 62,58 58,54" fill="url(#g3_lion)"/>
            <polygon points="50,66 56,76 44,76" fill="#FFF9C4"/>
            <circle cx="45" cy="46" r="2" fill="#FFFFFF"/><circle cx="55" cy="46" r="2" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 4,
        name: 'درع التنين الذهبي',
        desc: 'حراشف التنين الذهبي المصمت مع قرنين جانبيين وجوهرة في المركز',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-gold">
            <defs>
              <linearGradient id="g4_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF59D"/><stop offset="50%" stop-color="#FBC02D"/><stop offset="100%" stop-color="#7F5F00"/></linearGradient>
            </defs>
            <!-- Horns -->
            <path d="M26 30 C16 16, 12 8, 30 14 L34 28 Z" fill="url(#g4_grad)"/>
            <path d="M74 30 C84 16, 88 8, 70 14 L66 28 Z" fill="url(#g4_grad)"/>
            <!-- Shield Body -->
            <polygon points="26,24 74,24 82,56 50,90 18,56" fill="#211500" stroke="url(#g4_grad)" stroke-width="3"/>
            <!-- Scaled Plates -->
            <polygon points="50,30 68,44 50,56 32,44" fill="url(#g4_grad)"/>
            <polygon points="50,52 66,66 50,78 34,66" fill="url(#g4_grad)"/>
            <circle cx="50" cy="54" r="4.5" fill="#FFF9C4"/>
          </svg>`
      },
      {
        id: 5,
        name: 'أجنحة الكاروبيم الذهبية',
        desc: 'أربعة أجنحة ذهبية متداخلة تعانق ماسة ذهبية براقة بنور إلهي',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-gold">
            <defs>
              <linearGradient id="g5_wings" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#FFD700"/><stop offset="100%" stop-color="#8C6200"/></linearGradient>
            </defs>
            <path d="M50 20 C70 8, 92 20, 84 48 L64 54 Z" fill="url(#g5_wings)"/>
            <path d="M50 20 C30 8, 8 20, 16 48 L36 54 Z" fill="url(#g5_wings)"/>
            <path d="M50 80 C74 78, 86 62, 78 52 L60 56 Z" fill="url(#g5_wings)"/>
            <path d="M50 80 C26 78, 14 62, 22 52 L40 56 Z" fill="url(#g5_wings)"/>
            <!-- Center Diamond -->
            <polygon points="50,32 66,50 50,68 34,50" fill="#FFFDE7" stroke="#FFD700" stroke-width="2"/>
            <circle cx="50" cy="50" r="5" fill="#FFFFFF"/>
          </svg>`
      }
    ],

    // ------------------ 4. PLATINUM (بلاتينيوم) ------------------
    platinum: [
      {
        id: 1,
        name: 'نجم الإيريديوم الكرومي',
        desc: 'نجم رباعي حاد ذو حواف هندسية ثلاثية الأبعاد ونواة بلاتينية ناصعة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-platinum">
            <defs>
              <radialGradient id="p1_core" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#24333b"/><stop offset="70%" stop-color="#111c21"/><stop offset="100%" stop-color="#070c0f"/></radialGradient>
              <linearGradient id="p1_plat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#E5F3F7"/><stop offset="75%" stop-color="#8CB3C2"/><stop offset="100%" stop-color="#3D5C68"/></linearGradient>
            </defs>
            <polygon points="34,14 66,14 86,34 86,66 66,86 34,86 14,66 14,34" fill="url(#p1_core)" stroke="url(#p1_plat)" stroke-width="2.8"/>
            <polygon points="50,16 57,39 80,30 63,48 84,50 63,52 80,70 57,61 50,84 43,61 20,70 37,52 16,50 37,48 20,30 43,39" fill="url(#p1_plat)"/>
            <circle cx="50" cy="50" r="6" fill="#00E5FF"/><circle cx="50" cy="50" r="2.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'الدرع السداسي النقي',
        desc: 'درع طيران بلاتيني سداسي مع فتحات تهوية بصرية وزرقة ثلجية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-platinum">
            <defs>
              <linearGradient id="p2_hex" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#B0BEC5"/><stop offset="100%" stop-color="#37474F"/></linearGradient>
            </defs>
            <polygon points="50,10 88,32 88,68 50,90 12,68 12,32" fill="#0c171e" stroke="url(#p2_hex)" stroke-width="3"/>
            <polygon points="50,22 78,38 78,62 50,78 22,62 22,38" fill="#15242d" stroke="#FFFFFF" stroke-width="1.2"/>
            <polygon points="50,32 68,44 68,56 50,68 32,56 32,44" fill="url(#p2_hex)"/>
            <circle cx="50" cy="50" r="5" fill="#B2EBF2"/>
          </svg>`
      },
      {
        id: 3,
        name: 'الصقر البلاتيني الميكانيكي',
        desc: 'صقر هجومي متطور بأجنحة كرومية متراكبة ونواة مفاعل بلاتينية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-platinum">
            <defs>
              <linearGradient id="p3_grad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="60%" stop-color="#90A4AE"/><stop offset="100%" stop-color="#263238"/></linearGradient>
            </defs>
            <path d="M50 24 L86 16 L74 46 L82 66 L50 88 L18 66 L26 46 L14 16 Z" fill="url(#p3_grad)" stroke="#FFFFFF" stroke-width="1.5"/>
            <polygon points="50,36 68,64 50,78 32,64" fill="#0e181f" stroke="#80DEEA" stroke-width="1.5"/>
            <circle cx="50" cy="56" r="4.5" fill="#E0F7FA"/>
          </svg>`
      },
      {
        id: 4,
        name: 'منشور البلاتين الهندسي',
        desc: 'منشور ماسي بلاتيني متعدد الأوجه ذو حواف انعكاسية حادة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-platinum">
            <defs>
              <linearGradient id="p4_prism" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#CFD8DC"/><stop offset="100%" stop-color="#455A64"/></linearGradient>
            </defs>
            <polygon points="50,10 82,34 50,90 18,34" fill="#101920" stroke="url(#p4_prism)" stroke-width="2.8"/>
            <polygon points="50,10 50,90 82,34" fill="url(#p4_prism)" opacity="0.6"/>
            <polygon points="50,10 50,90 18,34" fill="url(#p4_prism)" opacity="0.85"/>
            <line x1="18" y1="34" x2="82" y2="34" stroke="#FFFFFF" stroke-width="2"/>
            <circle cx="50" cy="40" r="4" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 5,
        name: 'حلقة التيتانيوم المزدوجة',
        desc: 'حلقات مدارية بلاتينية متحدة المركز تحتضن نواة ليزرية زرقاء',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-platinum">
            <circle cx="50" cy="50" r="40" fill="#0c151c" stroke="#CFD8DC" stroke-width="3"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="8 4"/>
            <polygon points="50,22 56,44 78,50 56,56 50,78 44,56 22,50 44,44" fill="#ECEFF1" stroke="#00E5FF" stroke-width="1"/>
            <circle cx="50" cy="50" r="5" fill="#FFFFFF"/>
          </svg>`
      }
    ],

    // ------------------ 5. DIAMOND (دايموند) ------------------
    diamond: [
      {
        id: 1,
        name: 'الدرع الكريستالي السداسي (الأصلي)',
        desc: 'التصميم الكريستالي السداسي المطابق تماماً للصورة المعروضة بالسكرين شوت',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-diamond">
            <defs>
              <radialGradient id="d1_core" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#08304a"/><stop offset="70%" stop-color="#031624"/><stop offset="100%" stop-color="#010910"/></radialGradient>
              <linearGradient id="d1_rim" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="25%" stop-color="#00E5FF"/><stop offset="60%" stop-color="#0091EA"/><stop offset="100%" stop-color="#004670"/></linearGradient>
              <linearGradient id="d1_chev" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#80D8FF"/><stop offset="100%" stop-color="#00B0FF"/></linearGradient>
            </defs>
            <polygon points="50,8 86,28 86,72 50,92 14,72 14,28" fill="url(#d1_core)" stroke="url(#d1_rim)" stroke-width="3"/>
            <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="none" stroke="#00E5FF" stroke-width="1.2" opacity="0.6"/>
            <!-- Sparkle at apex -->
            <circle cx="50" cy="8" r="3.2" fill="#FFFFFF"/>
            <!-- Lower Chevron -->
            <polygon points="50,50 68,64 64,70 50,59 36,70 32,64" fill="url(#d1_chev)"/>
            <!-- Upper Chevron -->
            <polygon points="50,34 68,48 64,54 50,43 36,54 32,48" fill="url(#d1_chev)"/>
            <!-- Center Diamond Pip -->
            <polygon points="50,45 54,51 50,57 46,51" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'جوهرة البريل الماسية',
        desc: 'ماسة بيريليوم نقية متعددة الأوجه بانعكاسات نيون سماوية مبهرة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-diamond">
            <defs>
              <linearGradient id="d2_gem" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#80D8FF"/><stop offset="100%" stop-color="#0091EA"/></linearGradient>
            </defs>
            <!-- Faceted Brilliant -->
            <polygon points="30,16 70,16 88,38 50,90 12,38" fill="#041b29" stroke="url(#d2_gem)" stroke-width="2.8"/>
            <polygon points="30,16 70,16 62,38 38,38" fill="url(#d2_gem)" opacity="0.85"/>
            <polygon points="38,38 62,38 50,90" fill="url(#d2_gem)" opacity="0.5"/>
            <polygon points="12,38 38,38 50,90" fill="url(#d2_gem)" opacity="0.7"/>
            <polygon points="88,38 62,38 50,90" fill="url(#d2_gem)" opacity="0.9"/>
            <circle cx="50" cy="38" r="3.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 3,
        name: 'أجنحة الفالكييري الكريستالية',
        desc: 'أجنحة ملائكية كريستالية زرقاء تحتضن سهم الصعود الماسي',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-diamond">
            <defs>
              <linearGradient id="d3_wing" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#E0F7FA"/><stop offset="50%" stop-color="#00E5FF"/><stop offset="100%" stop-color="#006064"/></linearGradient>
            </defs>
            <path d="M50 28 L84 14 L76 44 L64 56 L50 66 L36 56 L24 44 L16 14 Z" fill="url(#d3_wing)" stroke="#FFFFFF" stroke-width="1.2"/>
            <polygon points="50,14 62,40 50,60 38,40" fill="#FFFFFF" stroke="#00E5FF" stroke-width="1.5"/>
            <polygon points="50,44 64,68 50,88 36,68" fill="#042033" stroke="url(#d3_wing)" stroke-width="2.5"/>
            <circle cx="50" cy="66" r="4" fill="#00E5FF"/>
          </svg>`
      },
      {
        id: 4,
        name: 'شظايا الجليد الماسي',
        desc: 'بلورات جليدية ماسية حادة متكدسة تتلاقى في قمة متوهجة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-diamond">
            <defs>
              <linearGradient id="d4_ice" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="50%" stop-color="#40C4FF"/><stop offset="100%" stop-color="#01579B"/></linearGradient>
            </defs>
            <polygon points="50,10 60,40 50,56 40,40" fill="url(#d4_ice)"/>
            <polygon points="50,26 72,50 50,74 28,50" fill="#061c2b" stroke="url(#d4_ice)" stroke-width="2.5"/>
            <polygon points="50,44 68,66 50,88 32,66" fill="url(#d4_ice)"/>
            <circle cx="50" cy="50" r="4.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 5,
        name: 'المصفوفة الماسية المعلقة',
        desc: 'إطارات ماسية متحدة المركز ومتقاطعة ثلاثية الأبعاد بقلب نيون',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-diamond">
            <polygon points="50,12 86,50 50,88 14,50" fill="#051926" stroke="#00E5FF" stroke-width="3"/>
            <polygon points="50,24 74,50 50,76 26,50" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>
            <polygon points="50,34 64,50 50,66 36,50" fill="#00E5FF"/>
            <circle cx="50" cy="50" r="3.5" fill="#FFFFFF"/>
          </svg>`
      }
    ],

    // ------------------ 6. ELITE (إيليت) ------------------
    elite: [
      {
        id: 1,
        name: 'مقاتلة البلازما الأيروديناميكية',
        desc: 'أجنحة مقاتلة فضائية نفاثة مع نفاثات بلازما زرقاء ومؤشرات سرعة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-elite">
            <defs>
              <radialGradient id="e1_core" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="#022a4d"/><stop offset="70%" stop-color="#011529"/><stop offset="100%" stop-color="#000914"/></radialGradient>
              <linearGradient id="e1_cyan" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#E0FBFF"/><stop offset="30%" stop-color="#00D0FF"/><stop offset="70%" stop-color="#0066CC"/><stop offset="100%" stop-color="#003366"/></linearGradient>
            </defs>
            <!-- Jet Wings -->
            <path d="M50 10 L88 38 L76 56 L64 52 L50 68 L36 52 L24 56 L12 38 Z" fill="url(#e1_cyan)" stroke="#E0FBFF" stroke-width="1.5"/>
            <!-- Center Pod -->
            <polygon points="50,18 64,48 50,88 36,48" fill="url(#e1_core)" stroke="url(#e1_cyan)" stroke-width="2.5"/>
            <polygon points="50,32 58,52 50,70 42,52" fill="#00D0FF"/>
            <circle cx="50" cy="46" r="3.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'درع فالكون التكتيكي',
        desc: 'درع سهمي متقدم للعمليات الخاصة مع زعانف توجيه مزدوجة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-elite">
            <defs>
              <linearGradient id="e2_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#80D8FF"/><stop offset="50%" stop-color="#00B0FF"/><stop offset="100%" stop-color="#004d80"/></linearGradient>
            </defs>
            <polygon points="50,12 84,28 72,70 50,90 28,70 16,28" fill="#041624" stroke="url(#e2_grad)" stroke-width="3"/>
            <!-- Double Chevron Cutouts -->
            <path d="M50 26 L70 46 L62 52 L50 42 L38 52 L30 46 Z" fill="url(#e2_grad)"/>
            <path d="M50 46 L70 66 L62 72 L50 62 L38 72 L30 66 Z" fill="url(#e2_grad)"/>
            <circle cx="50" cy="32" r="3" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 3,
        name: 'سهم النبض السيبراني',
        desc: 'رأس سهم فائق السرعة ثلاثي الطبقات مع خطوط طاقة بلازما سريعة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-elite">
            <polygon points="50,8 86,64 68,64 50,42 32,64 14,64" fill="#00D0FF" stroke="#E0FBFF" stroke-width="1.8"/>
            <polygon points="50,34 78,82 64,82 50,64 36,82 22,82" fill="#0077b6" stroke="#00D0FF" stroke-width="1.5"/>
            <circle cx="50" cy="24" r="3.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 4,
        name: 'مفاعل البلازما الكمي',
        desc: 'حلقة توربينية بلازمية ثلاثية الزعانف مع حزمة ضوء زرقاء مركزية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-elite">
            <circle cx="50" cy="50" r="38" fill="#031628" stroke="#00D0FF" stroke-width="3"/>
            <circle cx="50" cy="50" r="28" fill="none" stroke="#80D8FF" stroke-width="1.8" stroke-dasharray="10 6"/>
            <!-- Tri-foil -->
            <polygon points="50,18 58,44 42,44" fill="#00D0FF"/>
            <polygon points="76,64 52,54 62,40" fill="#00D0FF"/>
            <polygon points="24,64 38,40 48,54" fill="#00D0FF"/>
            <circle cx="50" cy="50" r="8" fill="#E0FBFF"/>
          </svg>`
      },
      {
        id: 5,
        name: 'الصقر الهجومي الأسرع من الصوت',
        desc: 'أجنحة مقاتلة مائلة للأمام مع هوائيات مسح ليزرية ودفع نفاث مزدوج',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-elite">
            <path d="M50 16 L88 32 L78 68 L60 56 L50 86 L40 56 L22 68 L12 32 Z" fill="#041a2e" stroke="#00D0FF" stroke-width="2.8"/>
            <polygon points="50,28 66,48 50,66 34,48" fill="#00D0FF"/>
            <circle cx="50" cy="46" r="4" fill="#FFFFFF"/>
          </svg>`
      }
    ],

    // ------------------ 7. CHAMPION (تشامبيون) ------------------
    champion: [
      {
        id: 1,
        name: 'قرون تنين الحمم المنصهرة',
        desc: 'قرنان منحنيان لتنين بركاني مع ألسنة لهب وحمم منصهرة متوهجة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-champion">
            <defs>
              <radialGradient id="c1_core" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#4d1000"/><stop offset="70%" stop-color="#240700"/><stop offset="100%" stop-color="#0d0200"/></radialGradient>
              <linearGradient id="c1_fire" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFF275"/><stop offset="35%" stop-color="#FF6B00"/><stop offset="75%" stop-color="#D41400"/><stop offset="100%" stop-color="#590000"/></linearGradient>
            </defs>
            <!-- Dragon Horns -->
            <path d="M28 28 C14 12, 6 4, 30 10 L36 26 Z" fill="url(#c1_fire)"/>
            <path d="M72 28 C86 12, 94 4, 70 10 L64 26 Z" fill="url(#c1_fire)"/>
            <!-- Body -->
            <polygon points="26,24 74,24 82,60 50,92 18,60" fill="url(#c1_core)" stroke="url(#c1_fire)" stroke-width="3"/>
            <!-- Flame Center -->
            <path d="M50 36 C58 48, 64 56, 62 68 C60 76, 52 82, 50 82 C48 82, 40 76, 38 68 C36 56, 42 48, 50 36 Z" fill="url(#c1_fire)"/>
            <circle cx="50" cy="62" r="4.5" fill="#FFF275"/>
          </svg>`
      },
      {
        id: 2,
        name: 'فينيكس اللهب المتجدد',
        desc: 'طائر الفينيق الأسطوري ينهض من رماد الحمم بأجنحة نارية متقدة',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-champion">
            <defs>
              <linearGradient id="c2_flame" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFF77"/><stop offset="40%" stop-color="#FF6A00"/><stop offset="100%" stop-color="#B71C1C"/></linearGradient>
            </defs>
            <!-- Phoenix Wings -->
            <path d="M50 24 L86 14 L74 44 L82 66 L50 86 L18 66 L26 44 L14 14 Z" fill="url(#c2_flame)" stroke="#FFFF77" stroke-width="1.2"/>
            <polygon points="50,14 58,34 50,44 42,34" fill="#FFFF77"/>
            <circle cx="50" cy="54" r="7" fill="#FF3D00"/><circle cx="50" cy="54" r="3" fill="#FFFF77"/>
          </svg>`
      },
      {
        id: 3,
        name: 'درع الحمم البركانية المتصدع',
        desc: 'درع أوبسيديان بركاني ثقيل تتفجر من شقوقه صهارة الحمم البرتقالية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-champion">
            <polygon points="20,18 80,18 86,56 50,90 14,56" fill="#1f0700" stroke="#FF6B00" stroke-width="3.2"/>
            <!-- Lava Fissures -->
            <path d="M50 18 L46 36 L54 50 L48 68 L50 90" stroke="#FFD54F" stroke-width="2.5" fill="none"/>
            <path d="M46 36 L28 46" stroke="#FF6B00" stroke-width="2" fill="none"/>
            <path d="M54 50 L72 58" stroke="#FF6B00" stroke-width="2" fill="none"/>
            <circle cx="50" cy="50" r="5" fill="#FFD54F"/>
          </svg>`
      },
      {
        id: 4,
        name: 'جمجمة التنين الحارق',
        desc: 'درع قناع التنين الناري مع عيون جمرية متقدة وزعانف لهب',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-champion">
            <polygon points="26,16 74,16 84,46 72,78 50,92 28,78 16,46" fill="#240801" stroke="#FF5722" stroke-width="2.8"/>
            <polygon points="50,26 64,44 58,62 50,74 42,62 36,44" fill="#FF5722"/>
            <circle cx="44" cy="46" r="2.5" fill="#FFF59D"/><circle cx="56" cy="46" r="2.5" fill="#FFF59D"/>
          </svg>`
      },
      {
        id: 5,
        name: 'تاج اللهب الجهنمي',
        desc: 'تاج خماسي الألسنة من الحمم الملتهبة يحتضن شعلة النصر الأبدية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-champion">
            <polygon points="18,36 30,16 50,30 70,16 82,36 74,80 50,90 26,80" fill="#260902" stroke="#FF6B00" stroke-width="3"/>
            <polygon points="34,42 50,26 66,42 50,76" fill="#FF3D00"/>
            <circle cx="50" cy="52" r="4.5" fill="#FFF176"/>
          </svg>`
      }
    ],

    // ------------------ 8. UNREAL (أنريل) ------------------
    unreal: [
      {
        id: 1,
        name: 'العرش والتاج الملكي الأسطوري',
        desc: 'تاج إمبراطوري ذهبي مهيب خماسي الرؤوس يحتضن جوهرة جمشت بنفسجية ملكية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-unreal">
            <defs>
              <radialGradient id="u1_core" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#2d1547"/><stop offset="70%" stop-color="#140824"/><stop offset="100%" stop-color="#05010a"/></radialGradient>
              <linearGradient id="u1_gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF8D6"/><stop offset="35%" stop-color="#FFD700"/><stop offset="70%" stop-color="#CC9900"/><stop offset="100%" stop-color="#664D00"/></linearGradient>
            </defs>
            <!-- Wings -->
            <path d="M12 40 C14 22, 32 16, 46 22 L38 46 L20 60 Z" fill="url(#u1_gold)"/>
            <path d="M88 40 C86 22, 68 16, 54 22 L62 46 L80 60 Z" fill="url(#u1_gold)"/>
            <!-- Body -->
            <polygon points="28,26 72,26 78,64 50,92 22,64" fill="url(#u1_core)" stroke="url(#u1_gold)" stroke-width="3"/>
            <!-- Crown -->
            <polygon points="34,22 40,12 50,18 60,12 66,22 50,26" fill="url(#u1_gold)"/>
            <!-- Amethyst Gem -->
            <polygon points="50,42 64,56 50,72 36,56" fill="#A855F7" stroke="#FFD700" stroke-width="1.8"/>
            <circle cx="50" cy="56" r="4.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'أجنحة النجم الكوني الأسطوري',
        desc: 'أجنحة ذهبية ملكية عريضة تحيط بنجم كوني ذي هالة بنفسجية كونية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-unreal">
            <defs>
              <linearGradient id="u2_grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFF9C4"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#7B1FA2"/></linearGradient>
            </defs>
            <path d="M50 26 L88 16 L76 48 L84 70 L50 88 L16 70 L24 48 L12 16 Z" fill="url(#u2_grad)" stroke="#FFF9C4" stroke-width="1.5"/>
            <polygon points="50,32 58,48 74,50 60,62 64,78 50,68 36,78 40,62 26,50 42,48" fill="#FFD700"/>
            <circle cx="50" cy="56" r="4" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 3,
        name: 'صولجان السيادة الأبدي',
        desc: 'صولجان ملكي ذهبي مع جواهر جمشت إمبراطورية وتيجان شرفية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-unreal">
            <polygon points="26,18 74,18 82,54 50,90 18,54" fill="#190924" stroke="#FFD700" stroke-width="3"/>
            <line x1="50" y1="12" x2="50" y2="90" stroke="#FFD700" stroke-width="3"/>
            <polygon points="50,20 62,34 50,48 38,34" fill="#C084FC" stroke="#FFD700" stroke-width="1.5"/>
            <circle cx="50" cy="34" r="3.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 4,
        name: 'عين المجرة الذهبية',
        desc: 'دوامة مجرية ذهبية أسطورية تحتضن نجماً ساطعاً في قلب الكون',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-unreal">
            <circle cx="50" cy="50" r="38" fill="#150624" stroke="#FFD700" stroke-width="3"/>
            <circle cx="50" cy="50" r="28" fill="none" stroke="#C084FC" stroke-width="1.8" stroke-dasharray="10 5"/>
            <polygon points="50,18 56,44 82,50 56,56 50,82 44,56 18,50 44,44" fill="#FFD700"/>
            <circle cx="50" cy="50" r="6" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 5,
        name: 'درع الخلود الملكي',
        desc: 'درع إمبراطوري فاخر مطعم بالأوبسيديان والذهب الخالص ورداء الملوك',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-unreal">
            <polygon points="50,10 86,30 78,74 50,92 22,74 14,30" fill="#1b082b" stroke="#FFD700" stroke-width="3"/>
            <polygon points="50,24 70,40 64,68 50,78 36,68 30,40" fill="#7E22CE" stroke="#FFF59D" stroke-width="1.2"/>
            <circle cx="50" cy="50" r="5.5" fill="#FFD700"/>
          </svg>`
      }
    ],

    // ------------------ 9. THE MACHINE (ذا مشين) ------------------
    machine: [
      {
        id: 1,
        name: 'مصفوفة السايبرنتك ورادار HUD',
        desc: 'درع تكتيكي عسكري مع علامات تصويب قناص وحلقات رادار وعين ذكاء اصطناعي',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-machine">
            <defs>
              <radialGradient id="m1_core" cx="50%" cy="50%" r="55%"><stop offset="0%" stop-color="#023812"/><stop offset="70%" stop-color="#011a08"/><stop offset="100%" stop-color="#000d04"/></radialGradient>
            </defs>
            <polygon points="34,14 66,14 86,34 86,66 66,86 34,86 14,66 14,34" fill="url(#m1_core)" stroke="#00FF41" stroke-width="3"/>
            <circle cx="50" cy="50" r="28" stroke="#00FF41" stroke-width="1.2" stroke-dasharray="6 4"/>
            <circle cx="50" cy="50" r="18" stroke="#00FF41" stroke-width="1.8"/>
            <line x1="50" y1="18" x2="50" y2="82" stroke="#00FF41" stroke-width="1.2"/>
            <line x1="18" y1="50" x2="82" y2="50" stroke="#00FF41" stroke-width="1.2"/>
            <circle cx="50" cy="50" r="6" fill="#00FF41"/><circle cx="50" cy="50" r="2.5" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 2,
        name: 'عين الذكاء الاصطناعي الفائق',
        desc: 'عدسة بصرية سايبرنتيكية خضراء متوهجة مع شبكة مسح ليزري',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-machine">
            <!-- Outer Eye Frame -->
            <path d="M14 50 C26 26, 74 26, 86 50 C74 74, 26 74, 14 50 Z" fill="#011406" stroke="#00FF41" stroke-width="3"/>
            <circle cx="50" cy="50" r="18" fill="#03290e" stroke="#00FF41" stroke-width="2"/>
            <circle cx="50" cy="50" r="8" fill="#00FF41"/>
            <line x1="14" y1="50" x2="86" y2="50" stroke="#00FF41" stroke-width="1" stroke-dasharray="3 3"/>
          </svg>`
      },
      {
        id: 3,
        name: 'المفاعل النووي السيبراني',
        desc: 'مفاعل هجين سداسي ثقيل بأنابيب طاقة خضراء ونواة بلازما',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-machine">
            <polygon points="50,12 86,32 86,68 50,88 14,68 14,32" fill="#021707" stroke="#00FF41" stroke-width="3"/>
            <!-- Hazardous Core -->
            <polygon points="50,26 72,38 72,62 50,74 28,62 28,38" fill="#053b13" stroke="#00FF41" stroke-width="1.5"/>
            <circle cx="50" cy="50" r="9" fill="#00FF41"/><circle cx="50" cy="50" r="4" fill="#FFFFFF"/>
          </svg>`
      },
      {
        id: 4,
        name: 'درع السايبربانك العسكري',
        desc: 'ألواح دروع تكتيكية مضلعة مع قراءات تيليمتري ورؤية ليلية',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-machine">
            <polygon points="20,18 80,18 88,54 50,92 12,54" fill="#011706" stroke="#00FF41" stroke-width="3"/>
            <polygon points="30,30 70,30 64,54 50,68 36,54" fill="#043810" stroke="#00FF41" stroke-width="1.2"/>
            <line x1="50" y1="18" x2="50" y2="92" stroke="#00FF41" stroke-width="1.8"/>
            <circle cx="50" cy="46" r="4.5" fill="#00FF41"/>
          </svg>`
      },
      {
        id: 5,
        name: 'مصفوفة الشريحة الكمية',
        desc: 'رقاقة معالجة نانوية فائقة مع مسارات دوائر رقمية ووميض بيانات',
        svg: (s = 64) => `
          <svg width="${s}" height="${s}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="rank-svg rank-svg-machine">
            <rect x="22" y="22" width="56" height="56" rx="6" fill="#021a08" stroke="#00FF41" stroke-width="3"/>
            <!-- Pins -->
            <line x1="34" y1="12" x2="34" y2="22" stroke="#00FF41" stroke-width="2.5"/>
            <line x1="50" y1="12" x2="50" y2="22" stroke="#00FF41" stroke-width="2.5"/>
            <line x1="66" y1="12" x2="66" y2="22" stroke="#00FF41" stroke-width="2.5"/>
            <line x1="34" y1="78" x2="34" y2="88" stroke="#00FF41" stroke-width="2.5"/>
            <line x1="50" y1="78" x2="50" y2="88" stroke="#00FF41" stroke-width="2.5"/>
            <line x1="66" y1="78" x2="66" y2="88" stroke="#00FF41" stroke-width="2.5"/>
            <circle cx="50" cy="50" r="12" fill="#00FF41"/><circle cx="50" cy="50" r="5" fill="#FFFFFF"/>
          </svg>`
      }
    ]
  };

  /* ============================================================
     واجهة الاستدعاء العامة (RankSvgs API)
     ============================================================ */

  function getSvg(tierInput, size = 64, variantOverride) {
    const key = normalizeTier(tierInput);
    const list = VARIANTS[key] || VARIANTS.bronze;
    const vNum = (typeof variantOverride === 'number') ? variantOverride : getSelectedVariant(key);
    const entry = list.find(v => v.id === vNum) || list[0];
    return entry.svg(size);
  }

  function getVariant(tierInput, variantNum, size = 64) {
    return getSvg(tierInput, size, variantNum);
  }

  function getAllVariants(tierInput) {
    const key = normalizeTier(tierInput);
    return VARIANTS[key] || [];
  }

  function getDecor(tierInput) {
    const key = normalizeTier(tierInput);
    if (key === 'machine') {
      return `<div class="fx-error-glitch-layer" aria-hidden="true">
        <div class="fx-glitch-slice s1"></div>
        <div class="fx-glitch-slice s2"></div>
        <div class="fx-glitch-slice s3"></div>
        <div class="fx-glitch-scanline"></div>
        <span class="fx-error-tag">ERR//SYS</span>
      </div>`;
    }
    if (key === 'unreal') {
      return `<div class="fx-unreal-fire-layer" aria-hidden="true">
        <div class="fx-crest-fire-aura unreal"></div>
        <svg class="fx-crest-flames fx-crest-flames-unreal" viewBox="-20 -25 140 145" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="uf_gold_grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#cc7700" stop-opacity="0.1"/>
              <stop offset="25%" stop-color="#ff9900"/>
              <stop offset="55%" stop-color="#ffd700"/>
              <stop offset="85%" stop-color="#ffff00"/>
              <stop offset="100%" stop-color="#ffffff"/>
            </linearGradient>
            <linearGradient id="uf_inner_grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#ff9900"/>
              <stop offset="60%" stop-color="#ffff55"/>
              <stop offset="100%" stop-color="#ffffff"/>
            </linearGradient>
          </defs>
          <path class="flame-lick flame-lick-top" d="M50 25 C40 10, 38 -8, 50 -24 C60 -6, 58 10, 50 25 Z" fill="url(#uf_gold_grad)"/>
          <path class="flame-lick flame-lick-top-inner" d="M50 22 C44 12, 43 0, 50 -12 C56 1, 54 12, 50 22 Z" fill="url(#uf_inner_grad)"/>
          <path class="flame-lick flame-lick-left-horn" d="M28 28 C15 15, 0 -8, -12 -18 C-2 -1, 14 16, 28 28 Z" fill="url(#uf_gold_grad)"/>
          <path class="flame-lick flame-lick-left-inner" d="M26 26 C16 16, 6 -1, -3 -9 C3 2, 16 16, 26 26 Z" fill="url(#uf_inner_grad)"/>
          <path class="flame-lick flame-lick-right-horn" d="M72 28 C85 15, 100 -8, 112 -18 C102 -1, 86 16, 72 28 Z" fill="url(#uf_gold_grad)"/>
          <path class="flame-lick flame-lick-right-inner" d="M74 26 C84 16, 94 -1, 103 -9 C97 2, 84 16, 74 26 Z" fill="url(#uf_inner_grad)"/>
          <path class="flame-lick flame-lick-left-flank" d="M18 55 C5 40, -8 24, -14 8 C-3 20, 10 36, 18 55 Z" fill="url(#uf_gold_grad)"/>
          <path class="flame-lick flame-lick-right-flank" d="M82 55 C95 40, 108 24, 114 8 C103 20, 90 36, 82 55 Z" fill="url(#uf_gold_grad)"/>
          <path class="flame-lick flame-lick-base-left" d="M35 75 C16 65, 6 48, 2 32 C13 46, 26 60, 35 75 Z" fill="url(#uf_gold_grad)"/>
          <path class="flame-lick flame-lick-base-right" d="M65 75 C84 65, 94 48, 98 32 C87 46, 74 60, 65 75 Z" fill="url(#uf_gold_grad)"/>
        </svg>
        <div class="fx-spark-ember gold e1"></div>
        <div class="fx-spark-ember gold e2"></div>
        <div class="fx-spark-ember gold e3"></div>
        <div class="fx-spark-ember gold e4"></div>
      </div>`;
    }
    if (key === 'champion') {
      return `<div class="fx-champion-fire-layer" aria-hidden="true">
        <div class="fx-crest-fire-aura champion"></div>
        <svg class="fx-crest-flames fx-crest-flames-champion" viewBox="-20 -25 140 145" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cf_red_grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#590000" stop-opacity="0.15"/>
              <stop offset="25%" stop-color="#c41400"/>
              <stop offset="60%" stop-color="#ff3c00"/>
              <stop offset="85%" stop-color="#ff9100"/>
              <stop offset="100%" stop-color="#fff275"/>
            </linearGradient>
            <linearGradient id="cf_inner_grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#ff1100"/>
              <stop offset="70%" stop-color="#ff7b00"/>
              <stop offset="100%" stop-color="#ffffaa"/>
            </linearGradient>
          </defs>
          <path class="flame-lick flame-lick-top" d="M50 25 C42 12, 40 -5, 50 -20 C57 -3, 56 12, 50 25 Z" fill="url(#cf_red_grad)"/>
          <path class="flame-lick flame-lick-top-inner" d="M50 22 C46 14, 45 2, 50 -8 C54 3, 53 14, 50 22 Z" fill="url(#cf_inner_grad)"/>
          <path class="flame-lick flame-lick-left-horn" d="M28 28 C15 15, 2 -5, -8 -15 C2 2, 16 18, 28 28 Z" fill="url(#cf_red_grad)"/>
          <path class="flame-lick flame-lick-left-inner" d="M26 26 C17 17, 8 2, 0 -6 C6 3, 18 16, 26 26 Z" fill="url(#cf_inner_grad)"/>
          <path class="flame-lick flame-lick-right-horn" d="M72 28 C85 15, 98 -5, 108 -15 C98 2, 84 18, 72 28 Z" fill="url(#cf_red_grad)"/>
          <path class="flame-lick flame-lick-right-inner" d="M74 26 C83 17, 92 2, 100 -6 C94 3, 82 16, 74 26 Z" fill="url(#cf_inner_grad)"/>
          <path class="flame-lick flame-lick-left-flank" d="M18 55 C6 42, -5 26, -10 10 C0 22, 12 38, 18 55 Z" fill="url(#cf_red_grad)"/>
          <path class="flame-lick flame-lick-right-flank" d="M82 55 C94 42, 105 26, 110 10 C100 22, 88 38, 82 55 Z" fill="url(#cf_red_grad)"/>
          <path class="flame-lick flame-lick-base-left" d="M35 75 C18 65, 8 50, 4 35 C15 48, 28 62, 35 75 Z" fill="url(#cf_red_grad)"/>
          <path class="flame-lick flame-lick-base-right" d="M65 75 C82 65, 92 50, 96 35 C85 48, 72 62, 65 75 Z" fill="url(#cf_red_grad)"/>
        </svg>
        <div class="fx-spark-ember red e1"></div>
        <div class="fx-spark-ember red e2"></div>
        <div class="fx-spark-ember red e3"></div>
        <div class="fx-spark-ember red e4"></div>
      </div>`;
    }
    if (key === 'elite') {
      return `<div class="fx-elite-plasma-layer" aria-hidden="true">
        <div class="fx-plasma-ring r1"></div>
        <div class="fx-plasma-ring r2"></div>
      </div>`;
    }
    if (key === 'diamond') {
      return `<div class="fx-diamond-shimmer-layer" aria-hidden="true">
        <div class="fx-crystal-sheen"></div>
        <div class="fx-diamond-sparkle sp1">✦</div>
        <div class="fx-diamond-sparkle sp2">✦</div>
        <div class="fx-diamond-sparkle sp3">✦</div>
      </div>`;
    }
    if (key === 'platinum') {
      return `<div class="fx-platinum-shimmer-layer" aria-hidden="true">
        <div class="fx-silver-sheen"></div>
      </div>`;
    }
    return '';
  }

  window.RankSvgs = {
    get: getSvg,
    getVariant,
    getAllVariants,
    getSelectedVariant,
    setSelectedVariant,
    getDecor,
    TIERS,
    VARIANTS
  };
})();
