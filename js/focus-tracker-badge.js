/* ============================================================
   Focus Tracker — شارة الرتبة ونظام التأثيرات البصرية المتكامل
   (Circle, Bar, Site)
   يدعم القراءة الفورية من localStorage ومزامنة Firebase،
   ويطبق النظام البصري التام:
   - برونز / سيلفر: عادي
   - ذهبي: إطار فقط
   - بلاتيني: لون الدائرة كامل + إطار متوهج
   - دايموند: لون الدائرة وتأثيرات كريستال بريزم للدائرة كاملة
   - إيليت: الشريط العلوي كامل مع بلازما نيون
   - تشامبيون: الشريط كامل مع حمم ولهب + نار خفيفة فوق خلفية الموقع
   - أنريل: استبدال الموقع كامل بذهب وأوبسيديان ملكي (إلغاء ألوان الـ CSS القديمة)
   - ذا مشين: استبدال الموقع بمصفوفة سايبرنتك ومطر ماتريكس وواجهة تكتيكية أقوى بمراحل
   ============================================================ */

(function () {
    const FIREBASE_PATH = 'focusTracker';
    const LOCAL_STORAGE_KEY = 'focusTrackerData_v1';

    const RANKS = [
        { min: 740, icon: '👑', label: 'UNREAL',   color: '#FFD700', tier: 'unreal' },
        { min: 670, icon: '🏆', label: 'CHAMPION', color: '#FF6B00', tier: 'champion' },
        { min: 600, icon: '🚀', label: 'ELITE',    color: '#00BFFF', tier: 'elite' },
        { min: 520, icon: '💎', label: 'DIAMOND',  color: '#88DDFF', tier: 'diamond' },
        { min: 440, icon: '⚙️', label: 'PLATINUM', color: '#E5E4E2', tier: 'platinum' },
        { min: 360, icon: '✨', label: 'GOLD',     color: '#FFC300', tier: 'gold' },
        { min: 300, icon: '🛡️', label: 'SILVER',   color: '#C0C0C0', tier: 'silver' },
        { min: 0,   icon: '🗑️', label: 'BRONZE',   color: '#CD7F32', tier: 'bronze' },
    ];
    const MACHINE_RANK = { min: 900, icon: '👁️', label: 'THE MACHINE', color: '#00FF41', tier: 'machine' };

    function startOfWeek(d) {
        const dt = new Date(d);
        dt.setHours(0, 0, 0, 0);
        dt.setDate(dt.getDate() - dt.getDay());
        return dt;
    }
    function isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function parseDate(str) {
        const d = new Date(str + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
    }

    function effectiveRanks(thresholds) {
        if (!Array.isArray(thresholds)) return RANKS;
        return RANKS.map((r, i) => ({ ...r, min: (typeof thresholds[i] === 'number') ? thresholds[i] : r.min }));
    }

    function todaysMultiplier(bonuses) {
        const active = (bonuses || []).filter(b => b.affectsPoints && b.currentStage > 0);
        if (active.length === 0) return 1;
        let totalExtra = 0;
        for (const b of active) {
            if (!Array.isArray(b.stages) || b.currentStage <= 0) continue;
            const parsed = parseFloat(b.stages[b.currentStage - 1]);
            if (isFinite(parsed) && parsed > 0) {
                const rounded = Math.round(parsed * 100) / 100;
                const extra = rounded >= 1 ? (rounded - 1) : rounded;
                totalExtra += extra;
            }
        }
        const finalMult = 1 + totalExtra;
        return Math.round(finalMult * 100) / 100;
    }

    function computeWeekTotal(data) {
        if (!data || !Array.isArray(data.entries)) return 0;
        const now = new Date();
        const weekStart = startOfWeek(now);
        const mult = todaysMultiplier(data.bonuses);
        let total = 0;
        data.entries.forEach(e => {
            const raw = Number(e.points) || 0;
            if (!raw) return;
            const d = parseDate(e.date);
            if (!d || d < weekStart) return;
            total += isSameDay(d, now) ? raw * mult : raw;
        });
        return total;
    }

    function getRankInfo(weekTotal, thresholds) {
        if (weekTotal >= MACHINE_RANK.min) {
            return { rank: MACHINE_RANK, idx: -1, isMachine: true, tier: 'machine' };
        }
        const ranks = effectiveRanks(thresholds);
        const idx = ranks.findIndex(r => weekTotal >= r.min);
        const effectiveIdx = idx >= 0 ? idx : 7;
        const rank = ranks[effectiveIdx];
        return { rank, idx: effectiveIdx, isMachine: false, tier: rank.tier };
    }

    function renderBadge(el, rankInfo) {
        if (!el) return;
        const { rank, tier } = rankInfo;
        const svgIcon = (window.RankSvgs && window.RankSvgs.get) ? window.RankSvgs.get(rank.label, 26) : (rank.icon || '');
        const titleText = `Focus Tracker — ${rank.label} (الأسبوع)`;

        const allTiers = ['ftbadge-bronze', 'ftbadge-silver', 'ftbadge-gold', 'ftbadge-platinum', 'ftbadge-diamond', 'ftbadge-elite', 'ftbadge-champion', 'ftbadge-unreal', 'ftbadge-machine'];
        const allFx = ['fx-bronze', 'fx-silver', 'fx-gold', 'fx-platinum', 'fx-diamond', 'fx-elite', 'fx-champion', 'fx-unreal', 'fx-machine'];
        allTiers.forEach(c => el.classList.remove(c));
        allFx.forEach(c => el.classList.remove(c));

        const isNoLink = el.getAttribute('data-no-link') === 'true' || el.classList.contains('ft-badge-static');

        if (isNoLink) {
            el.classList.add('ftbadge', `ftbadge-${tier}`, `fx-${tier}`);
            el.style.setProperty('--ftbadge-color', rank.color || '#CD7F32');
            el.style.cursor = 'default';
            el.title = titleText;
            el.setAttribute('aria-label', titleText);
            if (el.tagName === 'A') {
                el.removeAttribute('href');
                el.onclick = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
            }
            el.innerHTML = svgIcon;
        } else if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.classList.contains('btn-icon') || el.classList.contains('ft-badge-btn')) {
            el.classList.add('ftbadge', `ftbadge-${tier}`, `fx-${tier}`);
            el.style.setProperty('--ftbadge-color', rank.color || '#CD7F32');
            el.title = titleText;
            el.setAttribute('aria-label', titleText);
            el.innerHTML = svgIcon;
        } else {
            el.innerHTML = `<a href="focus-tracker.html" class="btn-icon ft-badge-btn ftbadge ftbadge-${tier} fx-${tier}" style="--ftbadge-color:${rank.color};" title="${titleText}" aria-label="${titleText}">${svgIcon}</a>`;
        }
    }

    function applyTopbarEffect(tier) {
        const bar = document.querySelector('.topbar');
        if (!bar) return;
        ['ft-topbar-elite', 'ft-topbar-champion', 'ft-topbar-unreal', 'ft-topbar-machine'].forEach(c => bar.classList.remove(c));
        if (tier === 'elite') bar.classList.add('ft-topbar-elite');
        else if (tier === 'champion') bar.classList.add('ft-topbar-champion');
        else if (tier === 'unreal') bar.classList.add('ft-topbar-unreal');
        else if (tier === 'machine') bar.classList.add('ft-topbar-machine');
    }

    function buildEmbers(count, colors) {
        let out = '';
        for (let i = 0; i < count; i++) {
            const left = (Math.random() * 100).toFixed(1);
            const delay = (Math.random() * 5).toFixed(2);
            const dur = (4 + Math.random() * 3).toFixed(2);
            const dx = (Math.random() * 60 - 30).toFixed(0);
            const size = (2 + Math.random() * 3).toFixed(1);
            const c = colors[Math.floor(Math.random() * colors.length)];
            out += `<span class="ft-ember" style="left:${left}%;width:${size}px;height:${size}px;background:${c};box-shadow:0 0 8px ${c};--ft-dx:${dx}px;animation-duration:${dur}s;animation-delay:${delay}s;"></span>`;
        }
        return out;
    }

    let matrixInterval = null;
    function startMatrixRain() {
        let canvas = document.getElementById('ftMatrixCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'ftMatrixCanvas';
            document.body.appendChild(canvas);
        }
        const ctx = canvas.getContext('2d');
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.removeEventListener('resize', resize);
        window.addEventListener('resize', resize);

        const chars = '0123456789ABCDEF010101XYZΩ∑π∆µ';
        const fontSize = 14;
        const columns = Math.max(10, Math.floor(canvas.width / fontSize));
        const drops = new Array(columns).fill(1);

        if (matrixInterval) clearInterval(matrixInterval);
        matrixInterval = setInterval(() => {
            ctx.fillStyle = 'rgba(1, 8, 3, 0.08)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00FF41';
            ctx.font = fontSize + 'px monospace';
            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }, 45);
    }

    function stopMatrixRain() {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        const canvas = document.getElementById('ftMatrixCanvas');
        if (canvas) canvas.remove();
    }

    function applySiteEffect(tier) {
        // إدارة خصائص الموقع والـ CSS Overrides
        document.documentElement.setAttribute('data-ft-site-tier', tier);
        document.body.classList.remove('ft-site-unreal', 'ft-site-machine', 'ft-site-champion');
        if (tier === 'unreal' || tier === 'machine' || tier === 'champion') {
            document.body.classList.add('ft-site-' + tier);
        }

        // مطر الماتريكس
        if (tier === 'machine') {
            startMatrixRain();
        } else {
            stopMatrixRain();
        }

        // غطاء الصفحة
        let overlay = document.getElementById('ftPageOverlay');
        if (tier !== 'champion' && tier !== 'unreal' && tier !== 'machine') {
            if (overlay) overlay.classList.remove('ft-show');
            return;
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ftPageOverlay';
            document.body.appendChild(overlay);
        }
        overlay.className = '';
        overlay.classList.add('ft-' + tier);
        if (tier === 'champion') {
            overlay.innerHTML = `<div class="ft-embers">${buildEmbers(14, ['#ff6a00', '#ffb000', '#ff3300'])}</div>`;
        } else if (tier === 'unreal') {
            overlay.innerHTML = `<div class="ft-aura"></div><div class="ft-embers">${buildEmbers(28, ['#FFD700', '#ffaa00', '#fff4c2'])}</div>`;
        } else {
            overlay.innerHTML = '';
        }
        requestAnimationFrame(() => overlay.classList.add('ft-show'));
    }

    function getLocalData() {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function renderWithData(data) {
        if (!data) return;
        const weekTotal = computeWeekTotal(data);
        const rankInfo = getRankInfo(weekTotal, data.rankThresholds);
        document.querySelectorAll('[data-ft-badge]').forEach(el => renderBadge(el, rankInfo));
        applyTopbarEffect(rankInfo.tier);
        applySiteEffect(rankInfo.tier);
    }

    async function initAll() {
        // ١. تحميل فوري من التخزين المحلي حتى ما يتأخر المظهر
        const local = getLocalData();
        if (local) renderWithData(local);

        // ٢. مزامنة مع فايربيس في حال توفرها
        try {
            if (!window.FirebaseSync || !window.INJAZ_FIREBASE_CONFIG) return;
            window.FirebaseSync.init(window.INJAZ_FIREBASE_CONFIG);
            const remote = await window.FirebaseSync.readOnce(FIREBASE_PATH);
            if (remote) renderWithData(remote);
        } catch (err) {
            console.warn('Focus Tracker Sync Info:', err && err.message);
        }
    }

    // تشغيل عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    window.addEventListener('firebase-bridge-ready', initAll);
    window.addEventListener('rank-style-changed', initAll);
    window.FocusTrackerBadge = {
        refresh: initAll,
        previewTier: (t) => {
            applyTopbarEffect(t);
            applySiteEffect(t);
        },
        computeWeekTotal,
        getRankInfo,
    };
})();
