/* ============================================================
   Focus Tracker — شارة الرتبة + تأثيرات الصفحة (قراءة فقط)
   تنحط بـ admin.html و index.html. تقرأ بس من مسار focusTracker بقاعدة
   بيانات Firebase (قراءة عامة، بدون تسجيل دخول — زي لوحة المشاهدة بالضبط).
   ما تكتب ولا تعدل أي شي بالبيانات، وما تلمس أي HTML موجود عندك —
   بس تضيف: (١) لون/توهج داخل الشارة نفسها، (٢) توهج على شريط .topbar،
   (٣) عند CHAMPION أو THE MACHINE بس: طبقة تأثير فوق كامل الصفحة (نار / تشويش).

   الاستخدام: بعد ما تحمّل js/firebase-bridge.js وتعرّف window.INJAZ_FIREBASE_CONFIG
   (نفس الموجودين أصلاً بصفحاتك)، ضيف بعدهم:
     <script src="js/focus-tracker-badge.js"></script>
   وحط بأي مكان تريد الشارة تطلع فيه:
     <span id="اسم-اللي-تختاره" data-ft-badge></span>
   ============================================================ */
(function () {
    const FIREBASE_PATH = 'focusTracker';

    const RANKS = [
        { min:740, icon:'👑', label:'UNREAL',   color:'#FFD700' },
        { min:670, icon:'🏆', label:'CHAMPION', color:'#FF6B00' },
        { min:600, icon:'🚀', label:'ELITE',    color:'#00BFFF' },
        { min:520, icon:'💎', label:'DIAMOND',  color:'#88DDFF' },
        { min:440, icon:'⚙️', label:'PLATINUM',color:'#E5E4E2' },
        { min:360, icon:'✨', label:'GOLD',     color:'#FFC300' },
        { min:300, icon:'🛡️', label:'SILVER',  color:'#C0C0C0' },
        { min:0,   icon:'🗑️', label:'BRONZE',  color:'#CD7F32' },
    ];
    const MACHINE_RANK = { min:900, icon:'👁️', label:'THE MACHINE', color:'#00FF41' };

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
        const scoring = (bonuses || []).filter(b => b.affectsPoints);
        if (scoring.length === 0) return 1;
        return scoring.reduce((mult, b) => {
            if (b.currentStage <= 0 || !Array.isArray(b.stages)) return mult;
            const parsed = parseFloat(b.stages[b.currentStage - 1]);
            return mult * (isFinite(parsed) ? Math.round(parsed * 100) / 100 : 1);
        }, 1);
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

    // idx: 0=UNREAL ... 7=BRONZE، isMachine=true يتخطى الكل. يرجّع أيضاً اسم "طبقة" موحّد
    // نستخدمه بثلاثتهم: الشارة، الشريط، وغطاء الصفحة.
    function getRankInfo(weekTotal, thresholds) {
        if (weekTotal >= MACHINE_RANK.min) return { rank: MACHINE_RANK, idx: -1, isMachine: true, tier: 'machine' };
        const ranks = effectiveRanks(thresholds);
        const idx = ranks.findIndex(r => weekTotal >= r.min);
        let tier = 'plain';
        if (idx === 0) tier = 'unreal';
        else if (idx === 1) tier = 'champion';
        else if (idx >= 2 && idx <= 5) tier = 'neon';
        return { rank: ranks[idx], idx, isMachine: false, tier };
    }

    function renderBadge(el, rankInfo) {
        const { rank, tier } = rankInfo;
        el.innerHTML = `<span class="ftbadge ftbadge-${tier}" style="--ftbadge-color:${rank.color};" title="Focus Tracker — ${rank.label}">${rank.icon}</span>`;
    }

    function applyTopbarEffect(tier) {
        const bar = document.querySelector('.topbar');
        if (!bar) return;
        ['ft-topbar-neon', 'ft-topbar-champion', 'ft-topbar-unreal', 'ft-topbar-machine'].forEach(c => bar.classList.remove(c));
        if (tier === 'neon') bar.classList.add('ft-topbar-neon');
        else if (tier === 'champion') bar.classList.add('ft-topbar-champion');
        else if (tier === 'unreal') bar.classList.add('ft-topbar-unreal');
        else if (tier === 'machine') bar.classList.add('ft-topbar-machine');
    }

    function buildEmbers(count) {
        let out = '';
        for (let i = 0; i < count; i++) {
            const left = (Math.random() * 100).toFixed(1);
            const delay = (Math.random() * 5).toFixed(2);
            const dur = (4 + Math.random() * 3).toFixed(2);
            const dx = (Math.random() * 60 - 30).toFixed(0);
            const size = (2 + Math.random() * 3).toFixed(1);
            const c = Math.random() > .5 ? '#ff6a00' : '#ffb000';
            out += `<span class="ft-ember" style="left:${left}%;width:${size}px;height:${size}px;background:${c};box-shadow:0 0 6px ${c};--ft-dx:${dx}px;animation-duration:${dur}s;animation-delay:${delay}s;"></span>`;
        }
        return out;
    }

    function applyPageOverlay(tier) {
        let overlay = document.getElementById('ftPageOverlay');
        if (tier !== 'champion' && tier !== 'machine') {
            if (overlay) overlay.classList.remove('ft-show');
            return;
        }
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ftPageOverlay';
            document.body.appendChild(overlay);
        }
        overlay.className = ''; // نصفر الأصناف القديمة
        overlay.classList.add(tier === 'champion' ? 'ft-champion' : 'ft-machine');
        overlay.innerHTML = tier === 'champion' ? `<div class="ft-embers">${buildEmbers(18)}</div>` : '';
        requestAnimationFrame(() => overlay.classList.add('ft-show'));
    }

    async function initOne(el) {
        try {
            if (!window.FirebaseSync || !window.INJAZ_FIREBASE_CONFIG) return;
            window.FirebaseSync.init(window.INJAZ_FIREBASE_CONFIG);
            const data = await window.FirebaseSync.readOnce(FIREBASE_PATH);
            if (!data) return;
            const weekTotal = computeWeekTotal(data);
            const rankInfo = getRankInfo(weekTotal, data.rankThresholds);
            renderBadge(el, rankInfo);
            applyTopbarEffect(rankInfo.tier);
            applyPageOverlay(rankInfo.tier);
        } catch (err) {
            console.error('فشل جلب شارة Focus Tracker:', err);
        }
    }

    function initAll() {
        document.querySelectorAll('[data-ft-badge]').forEach(initOne);
    }

    if (window.FirebaseSync) initAll();
    window.addEventListener('firebase-bridge-ready', initAll);

    window.FocusTrackerBadge = { refresh: initAll };
})();
