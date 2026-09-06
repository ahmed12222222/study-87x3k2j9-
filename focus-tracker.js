// ============================================================
// 🔥 Focus Tracker — نسخة الموقع المستقل (GitHub Pages)
// نفس نظام الرتب والديون والإجازات من نسخة Obsidian الأصلية،
// بس مصدر البيانات هسة localStorage بدل Dataview.
// ============================================================

const STORAGE_KEY = 'focusTrackerData_v1';

const MAX_WEEK  = 700;
const MAX_DAY   = 100;
const MAX_MONTH = 3000;

const WIZARY_DATE = moment('2027-06-01');

const RANKS = [
    { min:740, icon:'👑', label:'UNREAL - أسطورة الساج',  color:'#FFD700',
      msg:'المعالج مالتك كاسر حدود الفيزياء! أنت مو طالب سادس، أنت ماكينة فرم وزاريات. الوزاري هسة كاعد يرجف من اسمك وعرش الساج مالتك يهتز من الهيبة والسيطرة!' },
    { min:670, icon:'🏆', label:'CHAMPION - البطل',        color:'#FF6B00',
      msg:'دتكتسح الساحة اكتساح! القمة محجوزة باسمك وما يلوقلك غير الـ 100% بالوزاري. لا تخفف سرعة، دوس بعد واقفل اللعبة!' },
    { min:600, icon:'🚀', label:'ELITE - النخبة',          color:'#00BFFF',
      msg:'خوش أداء بس بعدك ما صرت الأسطورة. أنت بالمنطقة الآمنة بس لا تأمن غدر الأسئلة الوزارية، شد حزامك واطفر للرتبة اللي فوك المية!' },
    { min:520, icon:'💎', label:'DIAMOND - الماسي',        color:'#88DDFF',
      msg:'إنذار أول! دتلعب بالوقت الضائع واكو ريحة تسخيت بالسيستم. هذا مو أداء واحد يريد معدل يكسر الظهر، اصحى ونظف جدولك!' },
    { min:440, icon:'⚙️', label:'PLATINUM - البلاتيني',   color:'#E5E4E2',
      msg:'المعالج مالتك ديعلّس واللالاويز تارسة يومك. وين طموحك؟ دتضيع تعب السنة كلها برخص قدام الشاشة، كف كف هالسوالف وتحرك!' },
    { min:360, icon:'✨', label:'GOLD - الذهبي',           color:'#FFC300',
      msg:"هذا أداء مال واحد كاعد بـ 'كوفي شوب' مو كاعد يقاتل على مستقبله! صاير مثل جماعة 'يا رب بس العبور'. استرجل واعدل وضعك هسة!" },
    { min:300, icon:'🛡️', label:'SILVER - الفضي',         color:'#C0C0C0',
      msg:'خط أحمر وخطير! السيستم مالتك منهار وجاي تبوّت (Bot) رسمي. عوف الموبايل والتسخيت وارجع للكتاب هسة قبل لا يفوت الفوت وتندم الكسرة!' },
    { min:0,   icon:'🗑️', label:'BRONZE - بوت تسخيت',    color:'#CD7F32',
      msg:'فشل ذريع وطاح حظ الجدول! صاير بوت تسخيت من الدرجة الأولى وخسرت هيبتك قدام عرش الساج. إذا تظل هيج عوف الملازم واكعد بالبيت أحسن.. كوم عرق واشحن العداد هسة!' },
];

const MONTH_RANKS = [
    { min:2960, icon:'👑', label:'UNREAL',    color:'#FFD700' },
    { min:2680, icon:'🏆', label:'CHAMPION',  color:'#FF6B00' },
    { min:2400, icon:'🚀', label:'ELITE',     color:'#00BFFF' },
    { min:2080, icon:'💎', label:'DIAMOND',   color:'#88DDFF' },
    { min:1760, icon:'⚙️', label:'PLATINUM', color:'#E5E4E2' },
    { min:1440, icon:'✨', label:'GOLD',      color:'#FFC300' },
    { min:1200, icon:'🛡️', label:'SILVER',   color:'#C0C0C0' },
    { min:0,    icon:'🗑️', label:'BRONZE',   color:'#CD7F32' },
];

const DAYS_AR = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// الرتب الفعلية المستخدمة فعلياً بالحساب — نسخة من RANKS/MONTH_RANKS ممكن تنعدّل عليها عتبات (min) بس،
// عشان الأيقونات/الألوان/رسائل التحفيز تضل زي ما هي دايماً مهما بدّل المستخدم الأرقام
let currentRanks = RANKS.slice();
let currentMonthRanks = MONTH_RANKS.slice();

function applyRankOverrides() {
    const wOverrides = (appData && Array.isArray(appData.rankThresholds)) ? appData.rankThresholds : null;
    const mOverrides = (appData && Array.isArray(appData.monthRankThresholds)) ? appData.monthRankThresholds : null;
    currentRanks = RANKS.map((r, i) => ({
        ...r,
        min: (wOverrides && typeof wOverrides[i] === 'number' && isFinite(wOverrides[i])) ? wOverrides[i] : r.min,
    }));
    currentMonthRanks = MONTH_RANKS.map((r, i) => ({
        ...r,
        min: (mOverrides && typeof mOverrides[i] === 'number' && isFinite(mOverrides[i])) ? mOverrides[i] : r.min,
    }));
}

function getWeekRank(pts)  { return currentRanks.find(r => pts >= r.min); }
function getMonthRank(pts) { return currentMonthRanks.find(r => pts >= r.min); }
function pColor(pct) {
    if (pct >= 90) return '#00ff88';
    if (pct >= 65) return '#FFD700';
    if (pct >= 40) return '#FF8C00';
    return '#ff5555';
}

function hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    const r = parseInt(h.length===3 ? h[0]+h[0] : h.substring(0,2), 16);
    const g = parseInt(h.length===3 ? h[1]+h[1] : h.substring(2,4), 16);
    const b = parseInt(h.length===3 ? h[2]+h[2] : h.substring(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function getRowTierStyle(label, color) {
    let glow = 0, bgOp = 0, fsize = 0.85;
    if (label.includes('MACHINE'))       { glow = 15; bgOp = 0.15; fsize = 0.95; }
    else if (label.includes('UNREAL'))   { glow = 10; bgOp = 0.12; fsize = 0.92; }
    else if (label.includes('CHAMPION')) { glow = 7;  bgOp = 0.08; fsize = 0.89; }
    else if (label.includes('ELITE'))    { glow = 5;  bgOp = 0.05; fsize = 0.87; }
    else if (label.includes('DIAMOND'))  { glow = 4;  bgOp = 0.04; fsize = 0.86; }
    else if (label.includes('PLATINUM')) { glow = 3;  bgOp = 0.03; fsize = 0.85; }
    else if (label.includes('GOLD'))     { glow = 3;  bgOp = 0.03; fsize = 0.85; }

    const rowBg = bgOp > 0 ? ` style="background:linear-gradient(90deg,${hexToRgba(color,bgOp)},${hexToRgba(color,bgOp*0.12)});"` : '';
    const badgeCss = glow > 0
        ? `padding:5px 10px;text-align:center;font-size:${fsize}em;font-weight:bold;color:${color};text-shadow:0 0 ${glow}px ${hexToRgba(color,0.7)};`
        : `padding:5px 10px;text-align:center;font-size:${fsize}em;font-weight:bold;color:${color};`;
    return { rowBg, badgeCss };
}

function buildEmbers(count, colors) {
    let out = '';
    for (let i = 0; i < count; i++) {
        const left  = (Math.random()*94+3).toFixed(1);
        const delay = (Math.random()*3.5).toFixed(2);
        const dur   = (2.2+Math.random()*2.2).toFixed(2);
        const dx    = (Math.random()*36-18).toFixed(0);
        const size  = (2.5+Math.random()*3).toFixed(1);
        const c     = colors[i % colors.length];
        out += `<span style="position:absolute;left:${left}%;bottom:4px;width:${size}px;height:${size}px;border-radius:50%;background:${c};box-shadow:0 0 6px ${c};--dx:${dx}px;animation:emberRise ${dur}s ease-in ${delay}s infinite;"></span>`;
    }
    return out;
}

function getVisualTier(idx, isMachine) {
    if (isMachine) return 'matrix-machine';
    if (idx === 0) return 'dragon-ultra';
    if (idx === 1) return 'dragon';
    if (idx >= 2 && idx <= 5) return 'neon';
    return 'default';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toast(message) {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('ftToast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'ftToast';
    el.className = 'ft-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2200);
}

// ----- تلوين البونسات: يتدرج بشكل متصل مع نسبة التقدم (سماوي → بنفسجي → فوشي → ذهبي) -----
function hexToRgb(hex) {
    const h = hex.replace('#','');
    return {
        r: parseInt(h.length===3 ? h[0]+h[0] : h.substring(0,2), 16),
        g: parseInt(h.length===3 ? h[1]+h[1] : h.substring(2,4), 16),
        b: parseInt(h.length===3 ? h[2]+h[2] : h.substring(4,6), 16),
    };
}
function lerpNum(a, b, t) { return a + (b - a) * t; }
function lerpColorHex(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(lerpNum(a.r, b.r, t));
    const g = Math.round(lerpNum(a.g, b.g, t));
    const bl = Math.round(lerpNum(a.b, b.b, t));
    return `rgb(${r},${g},${bl})`;
}
const BONUS_COLOR_STOPS = ['#5a4a2a', '#B8860B', '#FFC300', '#FFD700'];
function bonusColorForRatio(ratio) {
    if (ratio <= 0) return '#666666';
    const segments = BONUS_COLOR_STOPS.length - 1;
    const scaled = Math.min(ratio, 1) * segments;
    const idx = Math.min(Math.floor(scaled), segments - 1);
    const localT = scaled - idx;
    return lerpColorHex(BONUS_COLOR_STOPS[idx], BONUS_COLOR_STOPS[idx + 1], localT);
}

function buildBonusSparks(count, color) {
    let out = '';
    for (let i = 0; i < count; i++) {
        const left  = (Math.random()*90+5).toFixed(1);
        const delay = (Math.random()*3).toFixed(2);
        const dur   = (2+Math.random()*2).toFixed(2);
        const dx    = (Math.random()*30-15).toFixed(0);
        const size  = (2+Math.random()*2.5).toFixed(1);
        out += `<span style="position:absolute;left:${left}%;bottom:2px;width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 5px ${color};--dx:${dx}px;animation:emberRise ${dur}s ease-in ${delay}s infinite;"></span>`;
    }
    return out;
}

// صف مربعات ملتصقة، وحد لكل مرحلة — يلبس لمن توصله. العنوان جوا كل مربع هو اللي المستخدم كتبه بنفسه
function buildBonusPips(currentStage, stages, color) {
    let out = '';
    stages.forEach((label, idx) => {
        const stageNum = idx + 1;
        const filled = stageNum <= currentStage;
        const isCurrent = stageNum === currentStage && currentStage > 0;
        out += `<span class="bonus-pip${filled ? ' filled' : ''}${isCurrent ? ' current' : ''}"${filled ? ` style="--pip-color:${color};"` : ''}>${escapeHtml(String(label))}</span>`;
    });
    return out;
}

// ============================================================
// ① طبقة البيانات (localStorage بدل Dataview)
// ============================================================

// يهاجر بونس محفوظ بالشكل القديم (totalStages رقم) للشكل الجديد (stages نصوص) — دفاعي بس، ما يأثر إذا البيانات أصلاً جديدة
function migrateBonus(b) {
    if (Array.isArray(b.stages)) return b;
    const count = Math.max(1, Math.round(Number(b.totalStages) || 1));
    return {
        ...b,
        stages: Array.from({ length: count }, (_, i) => `1.${i + 1}`),
    };
}

function loadData() {
    if (typeof localStorage === 'undefined') return { entries: [], restDays: [], bonuses: [], rankThresholds: null, monthRankThresholds: null, updatedAt: null };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { entries: [], restDays: [], bonuses: [], rankThresholds: null, monthRankThresholds: null, updatedAt: null };
        const parsed = JSON.parse(raw);
        return {
            entries: Array.isArray(parsed.entries) ? parsed.entries : [],
            restDays: Array.isArray(parsed.restDays) ? parsed.restDays : [],
            bonuses: (Array.isArray(parsed.bonuses) ? parsed.bonuses : []).map(migrateBonus),
            rankThresholds: Array.isArray(parsed.rankThresholds) ? parsed.rankThresholds : null,
            monthRankThresholds: Array.isArray(parsed.monthRankThresholds) ? parsed.monthRankThresholds : null,
            updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
        };
    } catch (e) {
        console.error('فشل تحميل البيانات المحفوظة:', e);
        return { entries: [], restDays: [], bonuses: [], rankThresholds: null, monthRankThresholds: null, updatedAt: null };
    }
}

// ============================================================
// طبقة المزامنة السحابية (Firebase) — اختيارية تماماً وبمعزل كامل
// عن بيانات إنجاز: نفس مشروع Firebase، بس مسار "focusTracker" منفصل
// كلياً عن مسار "injaz"، فأي خطأ بجهة ما يقدر يوصل للثانية إطلاقاً.
// الموقع يشتغل ١٠٠٪ من localStorage حتى لو Firebase ما اتصل أو فشل.
// ============================================================
const FOCUS_TRACKER_FIREBASE_PATH = 'focusTracker';
let firebaseSyncReady = false;
let firebasePushTimer = null;

function setSyncStatus(text, isOk) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'sync-status' + (isOk === true ? ' ok' : isOk === false ? ' err' : '');
}

function scheduleFirebasePush() {
    if (!firebaseSyncReady || typeof window === 'undefined' || !window.FirebaseSync) return;
    clearTimeout(firebasePushTimer);
    setSyncStatus('⏳ يرفع نسخة للسحابة...', null);
    firebasePushTimer = setTimeout(() => {
        window.FirebaseSync.write(FOCUS_TRACKER_FIREBASE_PATH, appData)
            .then(() => setSyncStatus('☁️ محفوظ بالسحابة ✓', true))
            .catch(err => {
                console.error('فشل رفع بيانات Focus Tracker لـ Firebase:', err);
                setSyncStatus('⚠️ تعذّر الرفع للسحابة — البيانات محفوظة بجهازك بس', false);
            });
    }, 3000);
}

async function initFirebaseSync() {
    if (typeof window === 'undefined' || !window.FirebaseSync || !window.INJAZ_FIREBASE_CONFIG) {
        setSyncStatus('📴 بلا اتصال سحابي — محفوظ بجهازك بس', null);
        return;
    }
    try {
        setSyncStatus('⏳ يتصل بالسحابة...', null);
        const ok = window.FirebaseSync.init(window.INJAZ_FIREBASE_CONFIG);
        if (!ok) { setSyncStatus('⚠️ فشل الاتصال — محفوظ بجهازك بس', false); return; }
        await window.FirebaseSync.signInAnon();
        const remote = await window.FirebaseSync.readOnce(FOCUS_TRACKER_FIREBASE_PATH);
        firebaseSyncReady = true;

        const remoteUpdatedAt = (remote && typeof remote === 'object') ? (Number(remote.updatedAt) || 0) : 0;
        const localUpdatedAt = Number(appData.updatedAt) || 0;

        if (remoteUpdatedAt > localUpdatedAt) {
            appData = {
                entries: Array.isArray(remote.entries) ? remote.entries : [],
                restDays: Array.isArray(remote.restDays) ? remote.restDays : [],
                bonuses: (Array.isArray(remote.bonuses) ? remote.bonuses : []).map(migrateBonus),
                rankThresholds: Array.isArray(remote.rankThresholds) ? remote.rankThresholds : null,
                monthRankThresholds: Array.isArray(remote.monthRankThresholds) ? remote.monthRankThresholds : null,
                updatedAt: remoteUpdatedAt,
            };
            if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
            applyRankOverrides();
            refreshAll();
            setSyncStatus('☁️ جلبت آخر نسخة محفوظة بالسحابة ✓', true);
            toast('تم تحديث البيانات من آخر نسخة سحابية');
        } else {
            setSyncStatus('☁️ متصل — نسختك الحالية هي الأحدث', true);
            scheduleFirebasePush();
        }
    } catch (err) {
        console.error('فشل الاتصال بـ Firebase (Focus Tracker يشتغل محلياً بس):', err);
        setSyncStatus('⚠️ تعذّر الاتصال بالسحابة — محفوظ بجهازك بس', false);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('firebase-bridge-ready', initFirebaseSync);
    setTimeout(() => { if (!firebaseSyncReady) setSyncStatus('📴 بلا اتصال سحابي — محفوظ بجهازك بس', null); }, 4000);
}

// كل حفظة تختم بوقتها (updatedAt) — هذا هو المرجع لمعرفة أي نسخة أحدث لمن نقارن بالسحابة،
// وكل حفظة برضو تجدول رفعة لـ Firebase (لو متوفر) بعد فترة قصيرة، بدون ما توقف الواجهة بانتظارها.
function saveData(data) {
    data.updatedAt = Date.now();
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    scheduleFirebasePush();
}


// ============================================================
// ② طبقة الحساب — منطق بحت، بدون DOM، قابل للاختبار مباشرة
//    (نفس حسابات نسخة Obsidian الأصلية بالضبط)
// ============================================================

function computeState(appData, now) {
    now = now || moment();

    const startOfWeek     = moment(now).startOf('week');
    const startOfDay      = moment(now).startOf('day');
    const startOfMonth    = moment(now).startOf('month');
    const startOfLastWeek = moment(now).subtract(1,'week').startOf('week');
    const endOfLastWeek   = moment(now).subtract(1,'week').endOf('week');

    const daysToWizary = Math.max(WIZARY_DATE.diff(now, 'days'), 0);

    let weekTotal = 0, dayTotal = 0, monthTotal = 0, lastWeekTotal = 0, counted = 0;
    let dayMap = {}, subjectMap = {}, weeklyData = {}, monthlyData = {};
    let missedPointsTarget = 0;

    // ----- جلب البيانات -----
    for (const r of appData.restDays) {
        const restDate = moment(r.date);
        if (restDate.isValid()) {
            const dateKey = restDate.format('YYYY-MM-DD');
            dayMap[dateKey] = (dayMap[dateKey] || 0) + 0.1;
        }
    }

    // مضاعف نقاط اليوم (شوف getActiveMultiplier) — يتحسب من appData الممرر لنفس الدالة، مو من appData العام،
    // عشان computeState يضل قابل للاختبار بمعزل. يطبّق حياً على نقاط اليوم بس، وما يلمس تاريخ الأيام الماضية إطلاقاً.
    const activeMultiplier = getActiveMultiplier(appData);

    for (const e of appData.entries) {
        const rawPoints = Number(e.points) || 0;
        if (!rawPoints) continue;

        const taskDate = moment(e.date);
        if (!taskDate.isValid()) continue;

        const isToday = taskDate.isSame(now, 'day');
        const points = isToday ? rawPoints * activeMultiplier : rawPoints;

        if (e.subject) {
            const s = String(e.subject).trim();
            if (s) subjectMap[s] = (subjectMap[s] || 0) + points;
        }

        const dateKey  = taskDate.format('YYYY-MM-DD');
        const weekKey  = moment(taskDate).startOf('week').format('YYYY-MM-DD');
        const monthKey = taskDate.format('YYYY-MM');

        dayMap[dateKey]       = (dayMap[dateKey]       || 0) + points;
        weeklyData[weekKey]   = (weeklyData[weekKey]   || 0) + points;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + points;
        counted++;

        if (taskDate.isSameOrAfter(startOfMonth))                               monthTotal    += points;
        if (taskDate.isSameOrAfter(startOfWeek))                                weekTotal     += points;
        if (taskDate.isSameOrAfter(startOfDay))                                 dayTotal      += points;
        if (taskDate.isSameOrAfter(startOfLastWeek) &&
            taskDate.isSameOrBefore(endOfLastWeek))                             lastWeekTotal += points;
    }

    // ----- نظام الديون -----
    const daysElapsedInWeek = Math.max(now.diff(startOfWeek,'days'), 0);
    for (let i = 0; i < daysElapsedInWeek; i++) {
        const d = moment(startOfWeek).add(i, 'days');
        const dateKey = d.format('YYYY-MM-DD');
        const pointsThatDay = Math.floor(dayMap[dateKey] || 0);

        if ((dayMap[dateKey] || 0) === 0.1) continue;

        if (pointsThatDay < MAX_DAY) {
            missedPointsTarget += (MAX_DAY - pointsThatDay);
        }
    }
    const dynamicDailyTarget = MAX_DAY + missedPointsTarget;

    // ----- سلسلة الأيام المتتالية -----
    let streak = 0, sd = moment(now).startOf('day');
    if (dayMap[sd.format('YYYY-MM-DD')]) { streak = 1; sd.subtract(1,'day'); }
    else sd.subtract(1,'day');
    while (dayMap[sd.format('YYYY-MM-DD')]) { streak++; sd.subtract(1,'day'); }

    // ----- أفضل يوم -----
    let bestDay = '', bestPts = 0;
    for (let i = 0; i < 7; i++) {
        const d = moment(now).startOf('week').add(i,'days');
        const v = Math.floor(dayMap[d.format('YYYY-MM-DD')] || 0);
        if (v > bestPts) { bestPts = v; bestDay = DAYS_AR[d.day()]; }
    }

    // ----- أعمدة الأسبوع -----
    const weekBars = Array.from({length:7}, (_,i) => {
        const d = moment(now).startOf('week').add(i,'days');
        const rawVal = dayMap[d.format('YYYY-MM-DD')] || 0;
        const isRest = rawVal === 0.1;
        const pts = isRest ? 0 : rawVal;
        return { label: DAYS_AR[d.day()].substring(0,3), pts: pts, isToday: d.isSame(now,'day'), isRest: isRest };
    });
    const maxBarPts = Math.max(...weekBars.map(b=>b.pts), 1);

    const daysElapsed   = Math.max(now.diff(startOfWeek,'days')+1, 1);
    const dailyAvg      = Math.round(weekTotal / daysElapsed);
    const projectedWeek = dailyAvg * 7;
    const weekDiff      = weekTotal - lastWeekTotal;
    const weekPct       = Math.min(weekTotal  / MAX_WEEK  * 100, 100);
    const dayPct        = Math.min(dayTotal   / dynamicDailyTarget   * 100, 100);
    const monthPct      = Math.min(monthTotal / MAX_MONTH * 100, 100);
    const isLateEmpty   = now.hour() >= 16 && dayTotal === 0;
    const maxSubPts     = Math.max(...Object.values(subjectMap), 1);

    // ----- الرتب -----
    let isTheMachine = weekTotal >= (MAX_WEEK * 1.5);
    let rank    = getWeekRank(weekTotal);
    let rankIdx = currentRanks.findIndex(r => weekTotal >= r.min);

    if (isTheMachine) {
        rank = { min:1050, icon:'👁️', label:'THE MACHINE - المعالج البشري', color:'#00FF41',
                 msg:'أنت لم تعد طالباً... لقد اندمجت مع المنهج وأصبحت جزءاً من النظام. الأسئلة الوزارية تنحني أمام عرش الساج.' };
        rankIdx = -1;
    }

    const nextRankInfo = rankIdx > 0 ? currentRanks[rankIdx - 1] : null;
    const ptsToNext    = nextRankInfo ? nextRankInfo.min - weekTotal : 0;

    const currentMonthKey = startOfMonth.format('YYYY-MM');

    return {
        now, daysToWizary,
        weekTotal, dayTotal, monthTotal, lastWeekTotal, counted,
        dayMap, subjectMap, weeklyData, monthlyData,
        missedPointsTarget, dynamicDailyTarget,
        streak, bestDay, bestPts, weekBars, maxBarPts,
        dailyAvg, projectedWeek, weekDiff, weekPct, dayPct, monthPct,
        isLateEmpty, maxSubPts,
        isTheMachine, rank, rankIdx, nextRankInfo, ptsToNext,
        currentMonthKey, activeMultiplier,
    };
}

// ============================================================
// ③ طبقة العرض — تبني نفس HTML بالضبط من حالة محسوبة
// ============================================================

function buildDashboardHtml(state) {
    const {
        now, daysToWizary, weekTotal, dayTotal, monthTotal, lastWeekTotal, counted,
        subjectMap, weeklyData, monthlyData, missedPointsTarget, dynamicDailyTarget,
        streak, bestDay, bestPts, weekBars, maxBarPts, dailyAvg, projectedWeek,
        weekDiff, weekPct, dayPct, monthPct, isLateEmpty, maxSubPts,
        isTheMachine, rank, rankIdx, nextRankInfo, ptsToNext, currentMonthKey, activeMultiplier,
    } = state;

    const visualTierResult = getVisualTier(rankIdx, isTheMachine);

    const nextRankBlockResult = isTheMachine
        ? '<span style="color:#00FF41; letter-spacing: 2px;">SYSTEM OVERRIDE: NO LIMITS</span>'
        : weekTotal >= MAX_WEEK
          ? '🎉 وصلت الهدف الأسبوعي!'
          : nextRankInfo
            ? `باقي <strong style="color:${nextRankInfo.color};">${ptsToNext}</strong> نقطة للوصول إلى ${nextRankInfo.icon} ${nextRankInfo.label}
               <div class="next-rank-bar"><div style="height:100%;width:${Math.max(100-(ptsToNext/nextRankInfo.min*100),5)}%;background:${nextRankInfo.color};border-radius:10px;opacity:0.6;"></div></div>`
            : '';

    let rnkExtraClass = '', rnkStyle = `border-color:${rank.color};background:rgba(255,255,255,0.02);`, rnkDecor = '', rnkTextClass = '';

    if (visualTierResult === 'matrix-machine') {
        rnkExtraClass = 'rnk-matrix';
        rnkStyle      = `border-color:#00FF41; color:#00FF41;`;
        rnkDecor      = `<div class="matrix-glitch"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>`;
        rnkTextClass  = 'matrix-text';
    } else if (visualTierResult === 'neon') {
        rnkExtraClass = 'rnk-neon';
        rnkStyle      = `border-color:${rank.color};color:${rank.color};`;
        rnkDecor      = `<div class="scan-sweep"></div><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>`;
        rnkTextClass  = 'neon-text';
    } else if (visualTierResult === 'dragon') {
        rnkExtraClass = 'rnk-dragon';
        rnkStyle      = `border-color:${rank.color};color:${rank.color};`;
        rnkDecor      = `<div class="embers">${buildEmbers(9, ['#ff6a00','#ff2200','#ff8c00'])}</div><div class="dragon-emoji">🐉</div>`;
        rnkTextClass  = 'fire-text';
    } else if (visualTierResult === 'dragon-ultra') {
        rnkExtraClass = 'rnk-dragon rnk-dragon-ultra';
        rnkStyle      = `border-color:${rank.color};color:${rank.color};`;
        rnkDecor      = `<div class="embers">${buildEmbers(17, ['#FFD700','#ff6a00','#ff2200','#ff8c00'])}</div><div class="dragon-emoji dragon-emoji-ultra">🐉</div><div class="aura-ring"></div>`;
        rnkTextClass  = 'fire-text';
    }

    const rankCardHTML = `
    <div class="rnk ${rnkExtraClass}" style="${rnkStyle}">
        ${rnkDecor}
        <div class="rnk-inner">
            <div style="font-size:1.35em;color:${rank.color};" class="${rnkTextClass}">${rank.icon} [${rank.label}]</div>
            <div style="margin-top:10px;font-size:0.88em;font-weight:normal;color:#ddd;line-height:1.7;">${rank.msg}</div>
            <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07);font-size:0.78em;color:#666;">
                ${nextRankBlockResult}
            </div>
        </div>
    </div>`;

    const ftbExtraClass = isTheMachine ? 'ftb-machine'
                        : visualTierResult === 'dragon' ? 'ftb-champion'
                        : visualTierResult === 'dragon-ultra' ? 'ftb-unreal'
                        : '';

    const debtWarning = missedPointsTarget > 0
        ? `<span style="font-size:0.75em; color:#ff4444; margin-right:8px;">(تسخيت الأيام السابقة: +${missedPointsTarget} نقطة كدين)</span>`
        : '';

    const multiplierBadge = activeMultiplier > 1
        ? `<span style="font-size:0.75em; color:#FFD700; margin-right:8px;">⚡ بونس نشط ×${activeMultiplier}</span>`
        : '';

    const barChart = weekBars.map(b => {
        let h = Math.max(Math.round(b.pts / maxBarPts * 55), b.pts > 0 ? 4 : 0);
        let barColor = b.isToday ? 'linear-gradient(180deg,#FFD700,#FF6B00)' : 'rgba(255,255,255,0.18)';
        let ptsLabel = b.pts || '';

        if (b.isRest) {
            h = 15;
            barColor = 'rgba(0, 191, 255, 0.3)';
            ptsLabel = '☕';
        }

        return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:3px;">
            <div style="font-size:0.63em;color:${b.isToday?'#FFD700':'#777'};height:14px;line-height:14px;">${ptsLabel}</div>
            <div style="height:55px;display:flex;align-items:flex-end;">
                <div style="width:22px;height:${h}px;background:${barColor};border-radius:3px 3px 0 0;"></div>
            </div>
            <div style="font-size:0.6em;color:${b.isToday?'#FFD700':'#555'};${b.isToday?'border-bottom:2px solid #FFD700;padding-bottom:2px;':''}">${b.label}</div>
        </div>`;
    }).join('');

    const subjectRows = Object.entries(subjectMap).sort((a,b)=>b[1]-a[1]).map(([sub,pts]) => {
        const pct = Math.min(pts / maxSubPts * 100, 100);
        return `<tr>
            <td style="padding:6px 10px;text-align:right;">${escapeHtml(sub)}</td>
            <td style="padding:6px 10px;text-align:center;color:#FFD700;font-weight:bold;">${Math.floor(pts)}</td>
            <td style="padding:6px 14px;">
                <div style="background:rgba(255,255,255,0.1);border-radius:20px;height:9px;overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#8E2DE2,#4A00E0);width:${pct}%;height:100%;border-radius:20px;"></div>
                </div>
            </td>
        </tr>`;
    }).join('');

    const pastWeeksRows = Object.entries(weeklyData)
        .sort((a,b) => b[0].localeCompare(a[0]))
        .slice(0, 10)
        .map(([key, pts]) => {
            const wStart = moment(key);
            const wEnd   = moment(key).endOf('week');
            const r      = pts >= (MAX_WEEK * 1.5) ? {label:'THE MACHINE', color:'#00FF41', icon:'👁️'} : getWeekRank(pts);
            const pct    = Math.min(pts / MAX_WEEK * 100, 100);
            const { rowBg, badgeCss } = getRowTierStyle(r.label, r.color);
            return `<tr${rowBg}>
                <td style="padding:6px 10px;text-align:right;color:#aaa;font-size:0.82em;">${wStart.format('DD/MM')} — ${wEnd.format('DD/MM/YY')}</td>
                <td style="padding:5px 8px;text-align:center;color:#FFD700;font-weight:bold;">${Math.floor(pts)}</td>
                <td style="padding:5px 8px;text-align:center;color:${pColor(pct)};font-size:0.82em;">${pct.toFixed(0)}%</td>
                <td style="${badgeCss}">${r.icon} ${r.label}</td>
            </tr>`;
        }).join('');

    const pastMonthsRows = Object.entries(monthlyData)
        .filter(([k]) => k !== currentMonthKey)
        .sort((a,b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .map(([key, pts]) => {
            const [yr, mo] = key.split('-');
            const r   = getMonthRank(pts);
            const pct = Math.min(pts / MAX_MONTH * 100, 100);
            const { rowBg, badgeCss } = getRowTierStyle(r.label, r.color);
            return `<tr${rowBg}>
                <td style="padding:6px 10px;text-align:right;color:#aaa;">${MONTHS_AR[parseInt(mo)-1]} ${yr}</td>
                <td style="padding:5px 8px;text-align:center;color:#FFD700;font-weight:bold;">${Math.floor(pts)}</td>
                <td style="padding:5px 8px;text-align:center;color:${pColor(pct)};font-size:0.82em;">${pct.toFixed(0)}%</td>
                <td style="${badgeCss}">${r.icon} ${r.label}</td>
            </tr>`;
        }).join('');

    return `
<div class="ftb ${ftbExtraClass}">
  <div class="ftt">🎯 Focus Tracker — لوحة التحكم</div>

  <div class="wizary-countdown">
     ⏳ باقي ${daysToWizary} يوم على الوزاري (دفعة 2027)... كل ثانية محسوبة! ⏳
  </div>

  ${isLateEmpty ? `<div class="wrn">⚠️ الساعة ${now.format('HH:mm')} — لا نقطة واحدة اليوم! شتسوي هالكيبورد بيدك؟ اشتغل!</div>` : ''}

  <div class="g3">
    <div class="card"><div class="cv" style="color:${pColor(dayPct)};">${Math.floor(dayTotal)}</div><div class="cl">⚡ اليوم</div></div>
    <div class="card"><div class="cv" style="color:${pColor(weekPct)};">${Math.floor(weekTotal)}</div><div class="cl">🏆 الأسبوع</div></div>
    <div class="card"><div class="cv" style="color:#aa88ff;">${Math.floor(monthTotal)}</div><div class="cl">📅 الشهر</div></div>
  </div>

  <div class="sec">
    <div class="prow"><span>⚡ اليوم: ${Math.floor(dayTotal)} / ${dynamicDailyTarget} ${debtWarning}${multiplierBadge}</span><span style="color:${pColor(dayPct)};font-weight:bold;">${dayPct.toFixed(1)}%</span></div>
    <div class="trk"><div style="height:100%;width:${dayPct}%;background:linear-gradient(90deg,#00B4DB,#0083B0);border-radius:20px;"></div></div>

    <div class="prow"><span>🏆 الأسبوع: ${Math.floor(weekTotal)} / ${MAX_WEEK}</span><span style="color:${pColor(weekPct)};font-weight:bold;">${weekPct.toFixed(1)}%</span></div>
    <div class="trk"><div style="height:100%;width:${weekPct}%;background:linear-gradient(90deg,#FF6B00,#FFD700);border-radius:20px;"></div></div>

    <div class="prow"><span>📅 الشهر: ${Math.floor(monthTotal)} / ${MAX_MONTH}</span><span style="color:#aa88ff;font-weight:bold;">${monthPct.toFixed(1)}%</span></div>
    <div class="trk" style="margin-bottom:0;"><div style="height:100%;width:${monthPct}%;background:linear-gradient(90deg,#8E2DE2,#4A00E0);border-radius:20px;"></div></div>
  </div>

  <div class="sec">
    <div style="font-size:0.78em;color:#888;margin-bottom:8px;font-weight:bold;">📆 توزيع الأسبوع (☕ = إجازة استراتيجية)</div>
    <div style="display:flex;gap:4px;">${barChart}</div>
  </div>

  <div class="g2">
    <div class="card"><div class="cv" style="color:#ff6b6b;">🔥 ${streak}</div><div class="cl">أيام متتالية</div></div>
    <div class="card"><div class="cv" style="color:${weekDiff>=0?'#00ff88':'#ff5555'};">${weekDiff>=0?'+':''}${Math.floor(weekDiff)}</div><div class="cl">مقارنة الأسبوع الماضي (${Math.floor(lastWeekTotal)})</div></div>
    <div class="card"><div class="cv" style="color:#00BFFF;">📊 ${dailyAvg}</div><div class="cl">معدل يومي</div></div>
    <div class="card"><div class="cv" style="color:#FFD700;">🎯 ${projectedWeek}</div><div class="cl">التوقع بنهاية الأسبوع</div></div>
  </div>

  ${bestPts > 0 ? `<div class="sec" style="text-align:center;font-size:0.85em;">🌟 <strong style="color:#FFD700;">أفضل يوم هذا الأسبوع:</strong> ${bestDay} — ${bestPts} نقطة</div>` : ''}

  ${rankCardHTML}

  ${Object.keys(subjectMap).length > 0 ? `<div class="sec"><details><summary>📚 النقاط حسب المادة</summary><div style="margin-top:10px;"><table class="htbl"><tr><th>المادة</th><th>النقاط</th><th>التقدم</th></tr>${subjectRows}</table></div></details></div>` : ''}
  ${pastWeeksRows.length > 0 ? `<div class="sec"><details><summary>📅 سجل الأسابيع السابقة</summary><div style="margin-top:10px;overflow-x:auto;"><table class="htbl"><tr><th>الفترة</th><th>النقاط</th><th>%</th><th>التقييم</th></tr>${pastWeeksRows}</table></div></details></div>` : ''}
  ${pastMonthsRows.length > 0 ? `<div class="sec"><details><summary>🗓️ سجل الأشهر السابقة</summary><div style="margin-top:10px;overflow-x:auto;"><table class="htbl"><tr><th>الشهر</th><th>النقاط</th><th>%</th><th>التقييم</th></tr>${pastMonthsRows}</table></div></details></div>` : ''}

  ${counted === 0 ? `<div class="sec" style="color:#ff8800;text-align:center;font-size:0.82em;">⚠️ ما عندك نقاط مسجلة لحد هسة.<br>سجّل أول نقاطك من النموذج فوك ⬆️، أو ضيف يوم إجازة استراتيجية.</div>` : ''}

  <div class="ftr">✅ ${counted} إدخال محسوب • ${now.format('dddd DD/MM/YYYY')} • ${now.format('HH:mm')}</div>
</div>
`;
}

// ============================================================
// ④ إدارة البيانات (إضافة / حذف / تصدير / استيراد)
// ============================================================

let appData = loadData();
applyRankOverrides();

function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function addEntry(points, subject, dateStr) {
    appData.entries.push({
        id: uid('e'),
        points: Math.max(0, Math.round(Number(points) || 0)),
        subject: subject ? String(subject).trim() : '',
        date: dateStr,
    });
    saveData(appData);
    refreshAll();
}

function deleteEntry(id) {
    appData.entries = appData.entries.filter(e => e.id !== id);
    saveData(appData);
    refreshAll();
}

function addRestDay(dateStr) {
    if (appData.restDays.some(r => r.date === dateStr)) return;
    appData.restDays.push({ id: uid('r'), date: dateStr });
    saveData(appData);
    refreshAll();
}

function deleteRestDay(id) {
    appData.restDays = appData.restDays.filter(r => r.id !== id);
    saveData(appData);
    refreshAll();
}

// ----- البونسات: كل بونس اسمه ومراحله (بعناوينها) تنسوي بكيف المستخدم بالكامل، والترقية خطوة-خطوة مو تجميع -----
// stages: مصفوفة نصوص، كل وحدة عنوان مرحلة يكتبه المستخدم بنفسه (مثلاً '1.1', '1.5', 'نهائي' — أي نص).
// affectsPoints: إذا true، هذا البونس يدخل بحساب مضاعف نقاط اليوم (شوف getActiveMultiplier)، ويرجع يتصفر تلقائياً كل يوم جديد.
function createBonus(name, stages, affectsPoints) {
    const trimmedName = String(name || '').trim();
    const cleanStages = (Array.isArray(stages) ? stages : [])
        .map(s => String(s || '').trim())
        .filter(Boolean);
    if (!trimmedName || cleanStages.length === 0) return false;
    const bonus = {
        id: uid('bo'),
        name: trimmedName,
        stages: cleanStages,
        currentStage: 0,
        affectsPoints: !!affectsPoints,
    };
    if (bonus.affectsPoints) bonus.lastActiveDay = moment().format('YYYY-MM-DD');
    appData.bonuses.push(bonus);
    saveData(appData);
    refreshAll();
    return true;
}

function levelUpBonus(id) {
    const b = appData.bonuses.find(x => x.id === id);
    if (!b) return;
    if (b.currentStage < b.stages.length) b.currentStage++;
    if (b.affectsPoints) b.lastActiveDay = moment().format('YYYY-MM-DD');
    saveData(appData);
    refreshAll();
}

function levelDownBonus(id) {
    const b = appData.bonuses.find(x => x.id === id);
    if (!b) return;
    if (b.currentStage > 0) b.currentStage--;
    if (b.affectsPoints) b.lastActiveDay = moment().format('YYYY-MM-DD');
    saveData(appData);
    refreshAll();
}

function addStageToBonus(id, label) {
    const b = appData.bonuses.find(x => x.id === id);
    const clean = String(label || '').trim();
    if (!b || !clean) return false;
    b.stages.push(clean);
    saveData(appData);
    refreshAll();
    return true;
}

function removeStageFromBonus(id, stageIdx) {
    const b = appData.bonuses.find(x => x.id === id);
    if (!b || stageIdx < 0 || stageIdx >= b.stages.length) return;
    b.stages.splice(stageIdx, 1);
    b.currentStage = Math.min(b.currentStage, b.stages.length);
    saveData(appData);
    refreshAll();
}

// يرجّع بونسات "تأثر بالنقاط" لصفر تلقائياً أول ما ينفتح الموقع بيوم جديد — عشان تنكسب من جديد كل يوم
function checkDailyBonusReset() {
    const today = moment().format('YYYY-MM-DD');
    let changed = false;
    (appData.bonuses || []).forEach(b => {
        if (!b.affectsPoints) return;
        if (b.lastActiveDay !== today) {
            if (b.currentStage !== 0) changed = true;
            b.currentStage = 0;
            b.lastActiveDay = today;
        }
    });
    if (changed) saveData(appData);
}

// مضاعف بونس وحد: الرقم يجيك من عنوان المرحلة الحالية نفسها اللي المستخدم كتبه (يعني هو يحدد الرقم بنفسه بالكامل).
// ما وصل أي مرحلة بعد = بلا تأثير (×1). إذا عنوان المرحلة مو رقم صالح، برضو ×1 (بدل ما ينكسر الحساب).
function bonusStageMultiplier(b) {
    if (!b.affectsPoints || b.currentStage <= 0) return 1;
    const label = b.stages[b.currentStage - 1];
    const parsed = parseFloat(label);
    if (!isFinite(parsed)) return 1;
    return Math.round(parsed * 100) / 100; // نقربها لمنزلتين عشان ما تصير كسور عائمة غريبة
}

// مضاعف نقاط اليوم: كل بونس مفعّل عليه "يأثر بالنقاط" يساهم برقمه الحالي (bonusStageMultiplier)،
// وكل هذي الأرقام تنضرب مع بعض. القيمة الافتراضية (بدون أي بونس مفعّل أو كلهن بالصفر) = ×1.
function getActiveMultiplier(data) {
    const src = data || appData;
    const scoring = (src.bonuses || []).filter(b => b.affectsPoints);
    if (scoring.length === 0) return 1;
    return scoring.reduce((mult, b) => mult * bonusStageMultiplier(b), 1);
}

function deleteBonus(id) {
    appData.bonuses = appData.bonuses.filter(b => b.id !== id);
    saveData(appData);
    refreshAll();
}

function clearAllData() {
    if (typeof confirm !== 'undefined' && !confirm('متأكد تريد تمسح كل البيانات؟ هذا الإجراء ما ينرجع.')) return;
    appData = { entries: [], restDays: [], bonuses: [], rankThresholds: null, monthRankThresholds: null };
    saveData(appData);
    applyRankOverrides();
    refreshAll();
}

function exportData() {
    const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-tracker-backup-${moment().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            appData = {
                entries: Array.isArray(parsed.entries) ? parsed.entries : [],
                restDays: Array.isArray(parsed.restDays) ? parsed.restDays : [],
                bonuses: (Array.isArray(parsed.bonuses) ? parsed.bonuses : []).map(migrateBonus),
                rankThresholds: Array.isArray(parsed.rankThresholds) ? parsed.rankThresholds : null,
                monthRankThresholds: Array.isArray(parsed.monthRankThresholds) ? parsed.monthRankThresholds : null,
            };
            saveData(appData);
            applyRankOverrides();
            refreshAll();
            alert('تم استيراد النسخة الاحتياطية بنجاح.');
        } catch (err) {
            alert('فشل استيراد الملف. تأكد إنه ملف نسخة احتياطية صحيح (JSON).');
        }
    };
    reader.readAsText(file);
}

// ============================================================
// ⑤ الربط مع الصفحة (DOM) — ما يشتغل إلا داخل المتصفح
// ============================================================

function render() {
    if (typeof document === 'undefined') return;
    const state = computeState(appData, moment());
    const dashboardEl = document.getElementById('dashboard');
    if (dashboardEl) dashboardEl.innerHTML = buildDashboardHtml(state);
}

function renderLog() {
    if (typeof document === 'undefined') return;
    const logListEl = document.getElementById('logList');
    if (!logListEl) return;

    const combined = [
        ...appData.entries.map(e => ({ kind: 'entry', ...e })),
        ...appData.restDays.map(r => ({ kind: 'rest', ...r })),
    ].sort((a, b) => b.date.localeCompare(a.date) || 0);

    if (combined.length === 0) {
        logListEl.innerHTML = `<div class="log-empty">لا يوجد إدخالات بعد.</div>`;
        return;
    }

    logListEl.innerHTML = combined.map(item => {
        const dateDisplay = moment(item.date).isValid() ? moment(item.date).format('DD/MM/YYYY') : item.date;
        if (item.kind === 'rest') {
            return `<div class="log-row">
                <span class="log-date"><bdi dir="ltr">${escapeHtml(dateDisplay)}</bdi></span>
                <span class="log-mid">☕ إجازة استراتيجية</span>
                <button type="button" class="log-del" data-kind="rest" data-id="${item.id}" title="حذف">✕</button>
            </div>`;
        }
        const subjectDisplay = item.subject ? escapeHtml(item.subject) : '—';
        return `<div class="log-row">
            <span class="log-date"><bdi dir="ltr">${escapeHtml(dateDisplay)}</bdi></span>
            <span class="log-mid">${subjectDisplay} — <bdi dir="ltr">${Math.floor(item.points)}</bdi> نقطة</span>
            <button type="button" class="log-del" data-kind="entry" data-id="${item.id}" title="حذف">✕</button>
        </div>`;
    }).join('');

    logListEl.querySelectorAll('.log-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const { kind, id } = btn.dataset;
            if (kind === 'entry') deleteEntry(id);
            else deleteRestDay(id);
        });
    });
}

function refreshSubjectDatalist() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('subjectList');
    if (!listEl) return;
    const subjects = new Set(appData.entries.map(e => e.subject).filter(Boolean));
    listEl.innerHTML = Array.from(subjects).map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
}

function renderBonuses() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('bonusList');
    if (!listEl) return;

    if (!appData.bonuses || appData.bonuses.length === 0) {
        listEl.innerHTML = `<div class="log-empty">ما عندك بونسات بعد. اضغط "بونس جديد" وسوي أول واحد.</div>`;
        return;
    }

    listEl.innerHTML = appData.bonuses.map(b => {
        const total    = b.stages.length;
        const ratio    = total > 0 ? b.currentStage / total : 0;
        const color    = bonusColorForRatio(ratio);
        const glow     = (2 + ratio * 16).toFixed(1);
        const pulseDur = (3 - ratio * 1.6).toFixed(2);
        const sparks   = Math.round(ratio * 7);
        const isMaxed  = total > 0 && b.currentStage >= total;

        const stageEditRows = b.stages.map((label, idx) => `
            <div class="stage-edit-row">
                <span>${escapeHtml(label)}</span>
                <button type="button" class="stage-remove-btn" data-id="${b.id}" data-idx="${idx}" title="حذف هذي المرحلة">✕</button>
            </div>`).join('');

        return `<div class="bonus-card ${isMaxed ? 'bonus-maxed' : ''}" style="--bonus-color:${color};--bonus-glow:${glow}px;--bonus-pulse-dur:${pulseDur}s;">
            <div class="bonus-sparks">${buildBonusSparks(sparks, color)}</div>
            <div class="bonus-card-inner">
                ${isMaxed ? `<div class="bonus-complete-badge">🎉 مكتمل</div>` : ''}
                <div class="bonus-name">${escapeHtml(b.name)} ${b.affectsPoints ? `<span class="bonus-mult-badge" title="يأثر بنقاط اليوم، يتصفر كل يوم">⚡×${bonusStageMultiplier(b)}</span>` : ''}</div>
                <div class="bonus-stage-label">المرحلة <bdi dir="ltr">${b.currentStage}</bdi> من <bdi dir="ltr">${total}</bdi></div>
                <div class="bonus-pip-row">${buildBonusPips(b.currentStage, b.stages, color)}</div>
                <div class="bonus-controls">
                    <div class="bonus-stepper">
                        <button type="button" class="bonus-btn bonus-down" data-id="${b.id}" aria-label="تنزيل مرحلة" title="تنزيل مرحلة" ${b.currentStage<=0?'disabled':''}>−</button>
                        <button type="button" class="bonus-btn bonus-up" data-id="${b.id}" aria-label="ترقية مرحلة" title="ترقية مرحلة" ${b.currentStage>=total?'disabled':''}>+</button>
                    </div>
                    <button type="button" class="bonus-del" data-id="${b.id}" aria-label="حذف البونس" title="حذف البونس">✕ حذف البونس</button>
                </div>
                <details class="stage-editor">
                    <summary>✏️ تعديل المراحل</summary>
                    <div class="stage-edit-list">${stageEditRows || '<span class="form-hint">ما بقت مراحل — ضيف وحدة أقل.</span>'}</div>
                    <div class="qa-row" style="margin-top:8px;">
                        <input type="text" class="stage-add-input" placeholder="عنوان مرحلة جديدة، مثلاً 1.5">
                        <button type="button" class="qa-btn qa-btn-secondary stage-add-btn" data-id="${b.id}">➕ إضافة</button>
                    </div>
                </details>
            </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.bonus-up').forEach(btn => btn.addEventListener('click', () => levelUpBonus(btn.dataset.id)));
    listEl.querySelectorAll('.bonus-down').forEach(btn => btn.addEventListener('click', () => levelDownBonus(btn.dataset.id)));
    listEl.querySelectorAll('.bonus-del').forEach(btn => btn.addEventListener('click', () => {
        if (typeof confirm === 'undefined' || confirm('حذف هذا البونس؟')) deleteBonus(btn.dataset.id);
    }));
    listEl.querySelectorAll('.stage-remove-btn').forEach(btn => btn.addEventListener('click', () => {
        removeStageFromBonus(btn.dataset.id, Number(btn.dataset.idx));
    }));
    listEl.querySelectorAll('.stage-add-btn').forEach(btn => btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('.stage-add-input');
        if (input && addStageToBonus(btn.dataset.id, input.value)) input.value = '';
    }));
}

// عرض بصفحة Focus Tracker الرئيسية — تضغط على البونس نفسه يرقّيه مرحلة مباشرة (بدون فتح الإعدادات)،
// وفيه زر تنزيل صغير للتراجع عن غلطة. التعديل الهيكلي (اسم/مراحل/حذف) يضل حصراً بالإعدادات.
function renderReadonlyBonuses() {
    if (typeof document === 'undefined') return;
    const boxEl = document.getElementById('bonusReadonlyBox');
    if (!boxEl) return;

    if (!appData.bonuses || appData.bonuses.length === 0) {
        boxEl.innerHTML = '';
        boxEl.style.display = 'none';
        return;
    }
    boxEl.style.display = '';

    boxEl.innerHTML = `
    <div class="sec bonus-ro-sec">
        <div style="font-size:0.78em;color:#888;margin-bottom:10px;font-weight:bold;">🏅 البونسات — دوس عليه يرقّيه مرحلة</div>
        <div class="bonus-ro-list">
        ${appData.bonuses.map(b => {
            const total   = b.stages.length;
            const ratio   = total > 0 ? b.currentStage / total : 0;
            const color   = bonusColorForRatio(ratio);
            const glow    = (2 + ratio * 14).toFixed(1);
            const isMaxed = total > 0 && b.currentStage >= total;
            const canDown = b.currentStage > 0;
            return `<div class="bonus-ro-item ${isMaxed ? 'bonus-maxed' : ''}" style="--bonus-color:${color};--bonus-glow:${glow}px;">
                <button type="button" class="bonus-ro-tap" data-id="${b.id}" ${b.currentStage>=total?'disabled':''} aria-label="رقّي ${escapeHtml(b.name)} مرحلة">
                    <div class="bonus-ro-name" style="color:${color};">${escapeHtml(b.name)} ${isMaxed ? '🎉' : ''} ${b.affectsPoints ? `<span class="bonus-mult-badge" title="يأثر بنقاط اليوم، يتصفر كل يوم">⚡×${bonusStageMultiplier(b)}</span>` : ''}</div>
                    <div class="bonus-pip-row">${buildBonusPips(b.currentStage, b.stages, color)}</div>
                </button>
                ${canDown ? `<button type="button" class="bonus-ro-undo" data-id="${b.id}" title="تراجع مرحلة">↺</button>` : ''}
            </div>`;
        }).join('')}
        </div>
    </div>`;

    boxEl.querySelectorAll('.bonus-ro-tap').forEach(btn => btn.addEventListener('click', () => levelUpBonus(btn.dataset.id)));
    boxEl.querySelectorAll('.bonus-ro-undo').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        levelDownBonus(btn.dataset.id);
    }));
}

// محرر عتبات الرتب — بس الأرقام (min) قابلة للتعديل، الأيقونة واللون والرسالة التحفيزية ثابتين دايماً
function renderRankEditor() {
    if (typeof document === 'undefined') return;
    const wEl = document.getElementById('rankEditorWeek');
    const mEl = document.getElementById('rankEditorMonth');
    if (!wEl || !mEl) return;

    wEl.innerHTML = currentRanks.map((r, i) => `
        <div class="rank-edit-row">
            <span class="rank-edit-icon" style="color:${r.color};">${r.icon} ${r.label}</span>
            <input type="number" class="rank-edit-input" min="0" step="1" value="${r.min}" data-idx="${i}" data-scope="week">
        </div>`).join('');

    mEl.innerHTML = currentMonthRanks.map((r, i) => `
        <div class="rank-edit-row">
            <span class="rank-edit-icon" style="color:${r.color};">${r.icon} ${r.label}</span>
            <input type="number" class="rank-edit-input" min="0" step="1" value="${r.min}" data-idx="${i}" data-scope="month">
        </div>`).join('');
}

function saveRankThresholds() {
    if (typeof document === 'undefined') return;
    const weekVals = Array.from(document.querySelectorAll('.rank-edit-input[data-scope="week"]'))
        .sort((a,b) => Number(a.dataset.idx) - Number(b.dataset.idx))
        .map(inp => Math.max(0, Math.round(Number(inp.value) || 0)));
    const monthVals = Array.from(document.querySelectorAll('.rank-edit-input[data-scope="month"]'))
        .sort((a,b) => Number(a.dataset.idx) - Number(b.dataset.idx))
        .map(inp => Math.max(0, Math.round(Number(inp.value) || 0)));
    appData.rankThresholds = weekVals;
    appData.monthRankThresholds = monthVals;
    saveData(appData);
    applyRankOverrides();
    renderRankEditor();
    render();
    if (typeof toast === 'function') toast('تم حفظ عتبات الرتب ✓');
}

function resetRankThresholds() {
    if (typeof confirm !== 'undefined' && !confirm('ترجيع عتبات الرتب كلها للافتراضي؟')) return;
    appData.rankThresholds = null;
    appData.monthRankThresholds = null;
    saveData(appData);
    applyRankOverrides();
    renderRankEditor();
    render();
}

function refreshAll() {
    checkDailyBonusReset();
    refreshSubjectDatalist();
    render();
    renderLog();
    renderBonuses();
    renderReadonlyBonuses();
    renderRankEditor();
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const qaDate = document.getElementById('qaDate');
        const today = moment().format('YYYY-MM-DD');
        if (qaDate) { qaDate.value = today; qaDate.max = today; }

        const entryForm = document.getElementById('entryForm');
        if (entryForm) {
            entryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const rawPoints = parseInt(document.getElementById('qaPoints').value, 10);
                const subjectVal = document.getElementById('qaSubject').value;
                const dateVal = document.getElementById('qaDate').value;
                if (!rawPoints || !dateVal) return;
                // تنسجل دايماً بالقيمة الخام كما هي — المضاعف يطبّق حياً على نقاط اليوم بلوحة التحكم نفسها، مو هنا
                addEntry(rawPoints, subjectVal, dateVal);
                document.getElementById('qaPoints').value = '';
                document.getElementById('qaSubject').value = '';
                document.getElementById('qaPoints').focus();
            });
        }

        const restDayBtn = document.getElementById('restDayBtn');
        if (restDayBtn) {
            restDayBtn.addEventListener('click', () => {
                const dateVal = document.getElementById('qaDate').value;
                if (!dateVal) return;
                addRestDay(dateVal);
            });
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', exportData);

        const importInput = document.getElementById('importInput');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) importDataFromFile(e.target.files[0]);
                e.target.value = '';
            });
        }

        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllData);

        // ----- نافذة الإعدادات والتحكم (كل التعديل يصير هنا بس، بعيد عن الواجهة الرئيسية) -----
        const settingsOverlay = document.getElementById('settingsModalOverlay');
        const settingsTrigger = document.getElementById('settingsTriggerBtn');
        const settingsClose = document.getElementById('settingsCloseBtn');
        function openSettingsModal() { if (settingsOverlay) settingsOverlay.classList.add('open'); }
        function closeSettingsModal() { if (settingsOverlay) settingsOverlay.classList.remove('open'); }
        if (settingsTrigger) settingsTrigger.addEventListener('click', openSettingsModal);
        if (settingsClose) settingsClose.addEventListener('click', closeSettingsModal);
        if (settingsOverlay) {
            settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettingsModal(); });
        }

        document.querySelectorAll('.settings-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                const tab = tabBtn.dataset.tab;
                document.querySelectorAll('.settings-tab').forEach(b => b.classList.toggle('active', b === tabBtn));
                document.querySelectorAll('.settings-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
            });
        });

        const saveRanksBtn = document.getElementById('saveRanksBtn');
        if (saveRanksBtn) saveRanksBtn.addEventListener('click', saveRankThresholds);
        const resetRanksBtn = document.getElementById('resetRanksBtn');
        if (resetRanksBtn) resetRanksBtn.addEventListener('click', resetRankThresholds);

        const newBonusBtn = document.getElementById('newBonusBtn');
        const bonusNewForm = document.getElementById('bonusNewForm');
        let pendingNewBonusStages = [];

        function renderPendingStages() {
            const el = document.getElementById('newBonusStagesList');
            if (!el) return;
            if (pendingNewBonusStages.length === 0) {
                el.innerHTML = '<span class="form-hint">ضيف مرحلة وحدة على الأقل (اسمها براحتك، مثلاً 1.1 أو نهائي).</span>';
                return;
            }
            el.innerHTML = pendingNewBonusStages.map((label, idx) =>
                `<span class="stage-chip">${escapeHtml(label)}<button type="button" class="stage-chip-remove" data-idx="${idx}" aria-label="حذف">✕</button></span>`
            ).join('');
            el.querySelectorAll('.stage-chip-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    pendingNewBonusStages.splice(Number(btn.dataset.idx), 1);
                    renderPendingStages();
                });
            });
        }

        if (newBonusBtn && bonusNewForm) {
            newBonusBtn.addEventListener('click', () => {
                const showing = bonusNewForm.style.display !== 'none';
                bonusNewForm.style.display = showing ? 'none' : 'block';
                if (!showing) { renderPendingStages(); document.getElementById('bonusNameInput').focus(); }
            });
        }

        const addStageBtn = document.getElementById('addStageBtn');
        if (addStageBtn) {
            addStageBtn.addEventListener('click', () => {
                const input = document.getElementById('newStageLabelInput');
                const val = String(input.value || '').trim();
                if (!val) { input.focus(); return; }
                pendingNewBonusStages.push(val);
                input.value = '';
                input.focus();
                renderPendingStages();
            });
        }

        const bonusCreateBtn = document.getElementById('bonusCreateBtn');
        if (bonusCreateBtn) {
            bonusCreateBtn.addEventListener('click', () => {
                const nameEl = document.getElementById('bonusNameInput');
                const affectsEl = document.getElementById('bonusAffectsPoints');
                const ok = createBonus(nameEl.value, pendingNewBonusStages, affectsEl && affectsEl.checked);
                if (ok) {
                    nameEl.value = '';
                    pendingNewBonusStages = [];
                    renderPendingStages();
                    if (affectsEl) affectsEl.checked = false;
                    bonusNewForm.style.display = 'none';
                } else if (pendingNewBonusStages.length === 0) {
                    document.getElementById('newStageLabelInput').focus();
                } else {
                    nameEl.focus();
                }
            });
        }

        refreshAll();
        setInterval(refreshAll, 60000);
    });
}

// تصدير للاختبار في Node (ما يأثر على المتصفح إطلاقاً)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        computeState, buildDashboardHtml, RANKS, MONTH_RANKS,
        getWeekRank, getMonthRank, MAX_DAY, MAX_WEEK, MAX_MONTH,
        bonusColorForRatio, lerpColorHex, hexToRgb, buildBonusPips,
        createBonus, levelUpBonus, levelDownBonus, deleteBonus, getActiveMultiplier, bonusStageMultiplier,
        addStageToBonus, removeStageFromBonus, checkDailyBonusReset,
        applyRankOverrides, getCurrentRanks: () => currentRanks, getCurrentMonthRanks: () => currentMonthRanks,
        getAppData: () => appData, setAppData: (d) => { appData = d; }, initFirebaseSync,
        migrateBonus,
    };
}
