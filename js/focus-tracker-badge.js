/* ============================================================
   Focus Tracker — شارة الرتبة (قراءة فقط)
   تنحط بـ admin.html و index.html. تقرأ بس من مسار focusTracker بقاعدة
   بيانات Firebase (قراءة عامة، بدون تسجيل دخول — زي لوحة المشاهدة بالضبط)
   وتبني شارة صغيرة تتلون وتتوهج حسب الرتبة الحالية. ما تكتب ولا تعدل أي شي.

   الاستخدام: بعد ما تحمّل js/firebase-bridge.js وتعرّف window.INJAZ_FIREBASE_CONFIG
   (نفس الموجودين أصلاً بصفحاتك)، ضيف بعدهم:
     <script src="js/focus-tracker-badge.js"></script>
   وحط بأي مكان تريد الشارة تطلع فيه:
     <span id="اسم-اللي-تختاره" data-ft-badge></span>
   الشارة تلقى نفسها تلقائياً وتملأ نفسها أول ما يجهز الاتصال.
   ============================================================ */
(function () {
    const FIREBASE_PATH = 'focusTracker';
    const MAX_WEEK = 700;

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
    const MACHINE_RANK = { min:1050, icon:'👁️', label:'THE MACHINE', color:'#00FF41' };

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

    // نفس صيغة bonusStageMultiplier بالضبط: رقم المرحلة الحالية نفسه هو المضاعف
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

    function getRankInfo(weekTotal, thresholds) {
        if (weekTotal >= MAX_WEEK * 1.5) return { rank: MACHINE_RANK, idx: -1, isMachine: true };
        const ranks = effectiveRanks(thresholds);
        const idx = ranks.findIndex(r => weekTotal >= r.min);
        return { rank: ranks[idx], idx, isMachine: false };
    }

    function tierClass(idx, isMachine) {
        if (isMachine) return 'ftbadge-machine';
        if (idx === 0) return 'ftbadge-unreal';
        if (idx === 1) return 'ftbadge-champion';
        if (idx >= 2 && idx <= 5) return 'ftbadge-neon';
        return 'ftbadge-plain';
    }

    function injectStyles() {
        if (document.getElementById('ftbadge-styles')) return;
        const style = document.createElement('style');
        style.id = 'ftbadge-styles';
        style.textContent = `
.ftbadge{display:inline-flex;align-items:center;justify-content:center;width:1.6em;height:1.6em;border-radius:50%;font-size:1.1em;line-height:1;transition:box-shadow .4s ease,transform .3s ease;}
.ftbadge-plain{filter:grayscale(.15);}
.ftbadge-neon{box-shadow:0 0 8px var(--ftbadge-color,#0BF);animation:ftbadgePulse 2.6s ease-in-out infinite;}
.ftbadge-champion{box-shadow:0 0 12px var(--ftbadge-color,#FF6B00);animation:ftbadgePulse 1.8s ease-in-out infinite;}
.ftbadge-unreal{box-shadow:0 0 16px var(--ftbadge-color,#FFD700);animation:ftbadgePulse 1.4s ease-in-out infinite;}
.ftbadge-machine{box-shadow:0 0 18px var(--ftbadge-color,#00FF41);animation:ftbadgePulseFast 0.9s ease-in-out infinite;}
@keyframes ftbadgePulse{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}
@keyframes ftbadgePulseFast{0%,100%{transform:scale(1);}50%{transform:scale(1.14);}}
@media (prefers-reduced-motion: reduce){.ftbadge{animation:none !important;}}
`;
        document.head.appendChild(style);
    }

    function renderInto(el, rankInfo) {
        const { rank, idx, isMachine } = rankInfo;
        const cls = tierClass(idx, isMachine);
        el.innerHTML = `<span class="ftbadge ${cls}" style="--ftbadge-color:${rank.color};" title="Focus Tracker — ${rank.label}">${rank.icon}</span>`;
    }

    async function initOne(el) {
        try {
            if (!window.FirebaseSync || !window.INJAZ_FIREBASE_CONFIG) return;
            window.FirebaseSync.init(window.INJAZ_FIREBASE_CONFIG);
            // قراءة عامة بدون تسجيل دخول — نفس منطق لوحة المشاهدة بإنجاز بالضبط
            const data = await window.FirebaseSync.readOnce(FIREBASE_PATH);
            if (!data) return; // ما اكو بيانات بعد (لسه ما فتحت focus-tracker.html من جهاز متزامن) — نخلي الشارة فاضية بدل ما نخطئ برقم
            injectStyles();
            const weekTotal = computeWeekTotal(data);
            const rankInfo = getRankInfo(weekTotal, data.rankThresholds);
            renderInto(el, rankInfo);
        } catch (err) {
            console.error('فشل جلب شارة Focus Tracker:', err);
        }
    }

    function initAll() {
        document.querySelectorAll('[data-ft-badge]').forEach(initOne);
    }

    // يشتغل الحين إذا firebase-bridge خلص أصلاً (نادر)، وإلا ينتظر الحدث
    if (window.FirebaseSync) initAll();
    window.addEventListener('firebase-bridge-ready', initAll);

    window.FocusTrackerBadge = { refresh: initAll };
})();
