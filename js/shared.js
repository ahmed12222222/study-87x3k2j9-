/* ============================================================
   إنجاز — الطبقة المشتركة (تُستخدم من لوحة التحكم ولوحة المشاهدين)
   تخزين محلي + مزامنة Firebase اختيارية + أدوات تنسيق وحركة
   ============================================================ */

const STORAGE_KEY = 'injaz_data_v1';           // البيانات القابلة للمزامنة (تُنشر على data.json)
const LOCAL_CONFIG_KEY = 'injaz_local_config_v1'; // أسرار هذا الجهاز فقط: مفتاح حفظ Firebase وقفل الدخول — لا تُنشر أبداً
const VIEWER_CACHE_KEY = 'injaz_viewer_cache_v1'; // آخر نسخة نجحت لوحة المشاهدين بجلبها، لعرضها عند انقطاع الشبكة

const AR_WEEKDAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const TIMELINE_START_HOUR = 0;
const TIMELINE_END_HOUR = 24;

/* -------------------- أدوات عامة -------------------- */
function pad2(n){ return String(n).padStart(2,'0'); }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

// علامات عزل اتجاه يونيكود غير مرئية — نحيط بيها كل رقم لحاله عشان خوارزمية RTL ما تلخبط ترتيب رقمين متجاورين
// (مشكلة معروفة: "٣ س ١٢ د" ممكن تنعرض بصرياً "١٢ س ٣ د" إذا رقم جاي بعد حرف عربي مباشرة بدون عزل)
const LRI = '\u2066', PDI = '\u2069';
function isolateNum(n){ return `${LRI}${n}${PDI}`; }

function todayKey(d){
  d = d || new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function arCount(n, singular, plural){ return `${isolateNum(n)} ${n === 1 ? singular : plural}`; }

function formatTime(dateLike){
  const d = new Date(dateLike);
  let h = d.getHours();
  const m = d.getMinutes();
  const suffix = h < 12 ? 'ص' : 'م';
  h = h % 12; if(h === 0) h = 12;
  return `${isolateNum(`${h}:${pad2(m)}`)} ${suffix}`;
}

function formatStopwatch(totalSeconds){
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(totalSeconds/3600);
  const m = Math.floor((totalSeconds%3600)/60);
  const s = totalSeconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function formatDuration(totalMinutes){
  totalMinutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(totalMinutes/60);
  const m = totalMinutes % 60;
  if(h === 0) return `${isolateNum(m)} د`;
  if(m === 0) return `${isolateNum(h)} س`;
  return `${isolateNum(h)} س ${isolateNum(m)} د`;
}

// يبني نص واضح "من HH:MM إلى HH:MM" بدل شرطة بس بينهم، ويضيف "(اليوم الثاني)" تلقائياً إذا الجلسة عدّت نص الليل
function formatTimeRange(startLike, endLike){
  const start = new Date(startLike), end = new Date(endLike);
  const crossesMidnight = start.toDateString() !== end.toDateString();
  return `من ${formatTime(start)} إلى ${formatTime(end)}${crossesMidnight ? ' <span class="session-nextday">(اليوم الثاني)</span>' : ''}`;
}

/**
 * تقسيم الجلسة التي تمتد عبر منتصف الليل (الساعة 12 ليلاً) إلى جلستين منفصلتين بدقة:
 * - جزء اليوم الأول: من وقت البداية حتى منتصف الليل (23:59:59.999 / 24:00)
 * - جزء اليوم الثاني: من منتصف الليل (00:00) حتى وقت الانتهاء
 * إذا لم تعبر الجلسة منتصف الليل، تُرجع جلسة واحدة بنفس البيانات.
 */
function splitCrossMidnightSession(session){
  if(!session || !session.start || !session.end) return [{ dayKey: (session && session.dayKey) || todayKey(), session: session || {} }];
  const sStart = new Date(session.start);
  const sEnd = new Date(session.end);
  const startDay = todayKey(sStart);
  const endDay = todayKey(sEnd);

  if(startDay === endDay || sEnd <= sStart){
    return [{ dayKey: startDay, session: { ...session } }];
  }

  // حساب نقطة منتصف الليل (بداية اليوم التالي عند 00:00:00)
  const midnight = new Date(sStart.getFullYear(), sStart.getMonth(), sStart.getDate() + 1, 0, 0, 0, 0);
  const minBefore = Math.max(1, Math.round((midnight.getTime() - sStart.getTime()) / 60000));
  const minAfter = Math.max(1, Math.round((sEnd.getTime() - midnight.getTime()) / 60000));

  const part1 = {
    ...session,
    id: session.id ? `${session.id}_p1` : uid(),
    start: session.start,
    end: midnight.toISOString(),
    minutes: minBefore,
    splitPairId: session.id || uid(),
    splitPart: 'before_midnight'
  };

  const part2 = {
    ...session,
    id: session.id ? `${session.id}_p2` : uid(),
    start: midnight.toISOString(),
    end: session.end,
    minutes: minAfter,
    splitPairId: session.id || uid(),
    splitPart: 'after_midnight'
  };

  return [
    { dayKey: startDay, session: part1, durationMin: minBefore },
    { dayKey: endDay, session: part2, durationMin: minAfter }
  ];
}

function formatDateArabic(d){
  d = new Date(d);
  return `${AR_WEEKDAYS[d.getDay()]}، ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRelativeTime(isoString){
  if(!isoString) return '—';
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const sec = Math.floor(diff/1000);
  if(sec < 45) return 'الآن';
  const min = Math.floor(sec/60);
  if(min < 60) return `قبل ${arCount(min,'دقيقة','دقائق')}`;
  const hr = Math.floor(min/60);
  if(hr < 24) return `قبل ${arCount(hr,'ساعة','ساعات')}`;
  const day = Math.floor(hr/24);
  return `قبل ${arCount(day,'يوم','أيام')}`;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function debounce(fn, wait){
  let t;
  return function(...args){
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

async function copyToClipboard(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(e){
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try{ ok = document.execCommand('copy'); }catch(e2){ ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

/* -------------------- نموذج البيانات -------------------- */
function defaultData(){
  return {
    version: 1,
    settings: {
      studentName: 'المذاكِر المجتهد',
      theme: 'night',
      customTheme: { primary: '#7c3aed', secondary: '#ff8a4c', mode: 'light' },
      dailyGoalMinutes: 360,
      goalTiers: [360, 480, 600], // أهداف متدرجة لليوم (بالدقائق) — مستخدم جديد افتراضياً: 6 س / 8 س / 10 س
      pointsPerMinute: 1,
      pointsPerAchievement: 20,
    },
    activeTimer: null,
    days: {},
    review: { subjects: [], items: [] },
    updatedAt: null, // null = بيانات افتراضية لسه ما انحفظت — يخلي فحص "نسخة أحدث بالسحابة" يشتغل صح بأول فتح لجهاز جديد
  };
}

// ترقية تلقائية للبيانات القديمة: قبل هذا التحديث كان اكو هدف واحد بس (dailyGoalMinutes).
// إذا مصدر البيانات الأصلي ما فيه goalTiers أبداً، نبنيها من هدفهم القديم بالضبط (مو الافتراضي الجديد) حتى ما نغيّر هدفهم بدون ما يدرون.
function migrateGoalTiers(settings, rawSettings){
  if(!(rawSettings && Array.isArray(rawSettings.goalTiers) && rawSettings.goalTiers.length)){
    settings.goalTiers = [ (rawSettings && rawSettings.dailyGoalMinutes) || settings.dailyGoalMinutes || 360 ];
  }
  return settings;
}

// قراءة آمنة لمصفوفة الأهداف المتدرجة بأي وقت — تصفّي القيم الفاسدة وترتبها تصاعدياً، وتضمن عنصر وحد على الأقل
function normalizeGoalTiers(settings){
  let tiers = Array.isArray(settings && settings.goalTiers) ? settings.goalTiers.filter(n => typeof n === 'number' && isFinite(n) && n > 0) : [];
  if(tiers.length === 0) tiers = [ (settings && settings.dailyGoalMinutes) || 360 ];
  return tiers.slice().sort((a,b) => a-b);
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultData();
    const parsed = JSON.parse(raw);
    const base = defaultData();
    return {
      ...base, ...parsed,
      settings: migrateGoalTiers({ ...base.settings, ...(parsed.settings || {}), customTheme: { ...base.settings.customTheme, ...((parsed.settings||{}).customTheme || {}) } }, parsed.settings),
      days: parsed.days || {},
      review: { subjects: (parsed.review && parsed.review.subjects) || [], items: (parsed.review && parsed.review.items) || [] },
    };
  }catch(e){ console.error('loadData:', e); return defaultData(); }
}

function saveData(data){
  data.updatedAt = new Date().toISOString();
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch(e){ console.error('saveData:', e); }
  return data;
}

function ensureDay(data, key){
  key = key || todayKey();
  if(!data.days[key]) data.days[key] = { study: [], breaks: [], sleep: [], achievements: [] };
  else {
    // ترقيع دفاعي: Firebase يحذف المصفوفات الفارغة تلقائياً وقت الحفظ (سلوك معروف بقاعدة بياناته) —
    // فيوم فيه صفر جلسات بفئة معينة يرجع من السحابة بدون هذا الحقل أصلاً، مو بمصفوفة فارغة []. لازم نعيد بنائه هنا قبل لا أي كود ثاني يحاول يستعمله.
    const day = data.days[key];
    if(!Array.isArray(day.study)) day.study = [];
    if(!Array.isArray(day.breaks)) day.breaks = [];
    if(!Array.isArray(day.sleep)) day.sleep = [];
    if(!Array.isArray(day.achievements)) day.achievements = [];
  }
  return data.days[key];
}

function computeStats(dayObj, settings){
  const study = (dayObj && dayObj.study) || [];
  const breaks = (dayObj && dayObj.breaks) || [];
  const sleep = (dayObj && dayObj.sleep) || [];
  const achievements = (dayObj && dayObj.achievements) || [];
  const studyMinutes = study.reduce((s,x)=>s+(x.minutes||0), 0);
  const breakMinutes = breaks.reduce((s,x)=>s+(x.minutes||0), 0);
  const sleepMinutes = sleep.reduce((s,x)=>s+(x.minutes||0), 0);
  const doneCount = achievements.filter(a=>a.done).length;
  const totalCount = achievements.length;
  const percentage = totalCount > 0 ? Math.round((doneCount/totalCount)*100) : 0;
  const points = Math.round(studyMinutes * (settings.pointsPerMinute ?? 1)) + doneCount * (settings.pointsPerAchievement ?? 20);
  const tiers = normalizeGoalTiers(settings);
  const tierLevel = tiers.filter(t => studyMinutes >= t).length;
  const allTiersDone = tierLevel >= tiers.length;
  const goalMinutes = allTiersDone ? tiers[tiers.length-1] : tiers[tierLevel];
  const goalPercentage = Math.min(100, Math.round((studyMinutes/goalMinutes)*100));
  return { studyMinutes, breakMinutes, sleepMinutes, doneCount, totalCount, percentage, points, goalMinutes, goalPercentage, tiers, tierLevel, allTiersDone };
}

/* -------------------- قواعد تحذير الاستراحة وتصنيف النوم ونسبة الدراسة -------------------- */
/**
 * تحذير الاستراحة:
 * 4 ساعات فأكثر (>= 240 دقيقة) = لون أصفر
 * 7 ساعات فأكثر (>= 420 دقيقة) = لون أحمر
 * مع صياغة مخصصة لصفحة الأهل (index.html) مثل "ابنكم استراح..."
 */
function getBreakWarningStatus(breakMinutes, isViewer = false, studentName = ''){
  breakMinutes = Number(breakMinutes) || 0;
  const nameLabel = studentName || 'ابنكم';

  if(breakMinutes >= 420){
    return {
      active: true,
      level: 'red',
      text: isViewer ? `7+ س (${nameLabel} استراح طويلاً 🚨)` : '7+ س (تحذير أحمر 🚨)',
      badgeClass: 'stat-badge-red',
      cardClass: 'break-warning-red',
      color: '#f87171',
      hoursLabel: '7+ ساعات'
    };
  }
  if(breakMinutes >= 240){
    return {
      active: true,
      level: 'yellow',
      text: isViewer ? `4+ س (${nameLabel} بالاستراحة ⚠️)` : '4+ س (تحذير أصفر ⚠️)',
      badgeClass: 'stat-badge-yellow',
      cardClass: 'break-warning-yellow',
      color: '#facc15',
      hoursLabel: '4+ ساعات'
    };
  }
  return { active: false, level: 'normal', text: '', badgeClass: '', cardClass: '', color: '', hoursLabel: '' };
}

/**
 * تلوين وتصنيف النوم بدقة كما طلب المستخدم:
 * 7 ساعات = أبيض عادي
 * 8 ساعات = أخضر جيد
 * 9 ساعات = أصفر أسوأ من العادي
 * 10 ساعات = أحمر تحذير
 * 11 ساعة فأكثر = تحذير أقوى
 * مع تكييف الرسائل لصفحة الأهل إذا كان isViewer = true
 */
function getSleepRatingStatus(sleepMinutes, isViewer = false, studentName = ''){
  sleepMinutes = Number(sleepMinutes) || 0;
  if(sleepMinutes <= 0) return { active: false, level: 'none', text: '', badgeClass: '', cardClass: '', color: '' };

  const nameLabel = studentName || 'ابنكم';
  const hours = sleepMinutes / 60;
  if(hours >= 11){
    return {
      active: true,
      level: 'darkred',
      text: isViewer ? `11+ س (تنبيه للأهل: ${nameLabel} أفرط بالنوم 🛑)` : '11+ س (تحذير أشد: نوم مفرط جداً 🛑)',
      badgeClass: 'stat-badge-darkred',
      cardClass: 'sleep-level-11',
      color: '#ff6b6b'
    };
  }
  if(hours >= 10){
    return {
      active: true,
      level: 'red',
      text: isViewer ? `10 س (أحمر: تحذير للأهل - ${nameLabel} نام كثيراً 🚨)` : '10 س (أحمر - تحذير: نوم مفرط 🚨)',
      badgeClass: 'stat-badge-red',
      cardClass: 'sleep-level-10',
      color: '#f87171'
    };
  }
  if(hours >= 9){
    return {
      active: true,
      level: 'yellow',
      text: isViewer ? `9 س (أصفر: ${nameLabel} نام أكثر من المعتاد ⚠️)` : '9 س (أصفر - أسوأ من العادي ⚠️)',
      badgeClass: 'stat-badge-yellow',
      cardClass: 'sleep-level-9',
      color: '#facc15'
    };
  }
  if(hours >= 8){
    return {
      active: true,
      level: 'green',
      text: isViewer ? `8 س (أخضر: نوم ${nameLabel} مثالي ✨)` : '8 س (أخضر - جيد ومثالي ✨)',
      badgeClass: 'stat-badge-green',
      cardClass: 'sleep-level-8',
      color: '#4ade80'
    };
  }
  if(hours >= 7){
    return {
      active: true,
      level: 'white',
      text: isViewer ? `7 س (أبيض: نوم ${nameLabel} طبيعي)` : '7 س (أبيض - عادي وطبيعي)',
      badgeClass: 'stat-badge-white',
      cardClass: 'sleep-level-7',
      color: '#ffffff'
    };
  }
  return {
    active: true,
    level: 'short',
    text: isViewer ? `${formatDuration(sleepMinutes)} (نوم ${nameLabel} قليل)` : `${formatDuration(sleepMinutes)} (أقل من 7 س)`,
    badgeClass: 'stat-badge-white',
    cardClass: '',
    color: '#cbd5e1'
  };
}

/**
 * تحذير نسبة الاستراحة إلى الدراسة:
 * إذا كانت النسبة بين الاستراحة والدراسة من 50% وأكثر (الاستراحة أكثر أو تقارب الدراسة)
 * تكييف النص لصفحة الأهل (isViewer = true) بصيغة "ابنكم/ولدكم"
 */
function getBreakToStudyRatioStatus(breakMinutes, studyMinutes, isViewer = false, studentName = ''){
  breakMinutes = Number(breakMinutes) || 0;
  studyMinutes = Number(studyMinutes) || 0;

  if(breakMinutes < 25) return { active: false };

  let ratio = 0;
  if(studyMinutes > 0){
    ratio = Math.round((breakMinutes / studyMinutes) * 100);
  } else {
    ratio = 100;
  }

  if(ratio < 50) return { active: false, ratio };

  const totalMin = Math.max(1, studyMinutes + breakMinutes);
  const studyPct = Math.round((studyMinutes / totalMin) * 100);
  const breakPct = 100 - studyPct;
  const nameLabel = studentName || 'ابنكم';
  const sonLabel = studentName || 'ولدكم';

  let severity = 'yellow';
  let title = '';
  let desc = '';
  let badgeText = '';

  if(isViewer){
    if(ratio >= 100){
      severity = 'red';
      title = `🛑 إنذار عاجل للأهل: ${sonLabel} استراح اليوم أكثر مما درس!`;
      desc = `إنذار للأهل الكرام: وقت استراحة ${sonLabel} (${formatDuration(breakMinutes)}) <b>تجاوز وقت دراسته (${formatDuration(studyMinutes)}) بالكامل</b> بنسبة <b>${ratio}%</b>! لقد قضى معظم وقته بالراحة ولم ينجز كفاية اليوم، يرجى حثه ومتابعته لمواصلة دراسته فوراً.`;
      badgeText = 'إنذار للأهل: الاستراحة غلبت الدراسة';
    } else if(ratio >= 70){
      severity = 'orange';
      title = `🚨 تحذير للأهل: استراحة ${nameLabel} أصبحت طويلة جداً اليوم!`;
      desc = `تنبيه للأهل الكرام: وقت استراحة ${nameLabel} وصل إلى <b>${ratio}%</b> من وقت دراسته (${formatDuration(breakMinutes)} استراحة مقابل ${formatDuration(studyMinutes)} دراسة)! كفّة الاستراحة تقارب دراسته، حبذا لو تذكروه وتطمئنون عليه بلطف.`;
      badgeText = `تحذير للأهل: ${ratio}%`;
    } else {
      severity = 'yellow';
      title = `⚠️ تنبيه للأهل: وقت استراحة ${nameLabel} وصل لنصف وقت دراسته!`;
      desc = `أهلاً بكم.. ${nameLabel} قضى في الاستراحة ما يعادل <b>${ratio}%</b> من وقت دراسته اليوم (${formatDuration(breakMinutes)} استراحة مقابل ${formatDuration(studyMinutes)} دراسة). يمكنكم تشجيعه بلطف للعودة لكتبه.`;
      badgeText = `تنبيه للأهل: ${ratio}%`;
    }
  } else {
    if(ratio >= 100){
      severity = 'red';
      title = '🛑 إنذار أحمر: الاستراحة تجاوزت وقت الدراسة بالكامل!';
      desc = `وقت الاستراحة (${formatDuration(breakMinutes)}) أصبح <b>أكثر من وقت الدراسة (${formatDuration(studyMinutes)})</b> بنسبة <b>${ratio}%</b>! قضيت وقتاً بالراحة أكثر من العلم اليوم، حان وقت إيقاف الاستراحة فوراً.`;
      badgeText = `${ratio}% (الاستراحة أكثر!)`;
    } else if(ratio >= 70){
      severity = 'orange';
      title = '🚨 تحذير جاد: كفّة الاستراحة أصبحت ثقيلة جداً اليوم!';
      desc = `استراحتك وصلت إلى <b>${ratio}%</b> من وقت دراستك! اقتربت من أن تبتلع يومك، انهض الآن واستأنف الدراسة لتعديل الكفّة.`;
      badgeText = `${ratio}% من الدراسة`;
    } else {
      severity = 'yellow';
      title = '⚠️ مؤشر التوازن: استراحتك تعادل نصف وقت دراستك!';
      desc = `وقت استراحتك بلغ <b>${ratio}%</b> مقارنة بوقت دراستك (${formatDuration(breakMinutes)} استراحة مقابل ${formatDuration(studyMinutes)} دراسة). انتبه لتوزيع وقتك.`;
      badgeText = `${ratio}% من الدراسة`;
    }
  }

  return {
    active: true,
    ratio,
    severity,
    title,
    desc,
    badgeText,
    breakMinutes,
    studyMinutes,
    studyPct,
    breakPct,
    isViewer
  };
}

/**
 * توليد HTML لبطاقة تحذير النسبة
 */
function renderRatioWarningHTML(ratioStatus, isViewer = false){
  if(!ratioStatus || !ratioStatus.active) return '';
  return `
    <div class="ratio-warning-head">
      <div class="ratio-warning-title">
        <span>${ratioStatus.severity === 'red' ? '🛑' : (ratioStatus.severity === 'orange' ? '🚨' : '⚠️')}</span>
        <span>${escapeHtml(ratioStatus.title)}</span>
      </div>
      <span class="ratio-warning-badge stat-badge-${ratioStatus.severity === 'red' ? 'red' : 'yellow'}">
        ${escapeHtml(ratioStatus.badgeText)}
      </span>
    </div>
    <div class="ratio-warning-sub">${ratioStatus.desc}</div>
    <div class="ratio-bar-wrapper">
      <div class="ratio-bar-track">
        <div class="ratio-bar-seg-study" style="width:${ratioStatus.studyPct}%;" title="دراسة: ${formatDuration(ratioStatus.studyMinutes)}"></div>
        <div class="ratio-bar-seg-break" style="width:${ratioStatus.breakPct}%;" title="استراحة: ${formatDuration(ratioStatus.breakMinutes)}"></div>
      </div>
      <div class="ratio-bar-labels">
        <span>📚 دراسة: <b>${formatDuration(ratioStatus.studyMinutes)}</b> (${ratioStatus.studyPct}%)</span>
        <span>☕ استراحة: <b>${formatDuration(ratioStatus.breakMinutes)}</b> (${ratioStatus.breakPct}%)</span>
      </div>
    </div>
    ${isViewer ? `
      <div class="ratio-family-note">
        💡 <b>ملاحظة للأهل:</b> تشجيعكم اللطيف وتذكيركم له بهدفه الدراسي يصنع فرقاً كبيراً اليوم.
      </div>
    ` : `
      <div class="ratio-actions-row">
        <button type="button" class="btn btn-primary btn-sm" onclick="startTimer('study')">
          <span data-icon="play"></span>
          <span>ابدأ جلسة دراسة الآن لقلب الميزان 🔥</span>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="dismissRatioWarningForNow()">
          <span>إخفاء مؤقت</span>
        </button>
      </div>
    `}
  `;
}

function getActiveElapsedSeconds(activeTimer){
  if(!activeTimer) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(activeTimer.start).getTime())/1000));
}

/* -------------------- تجميع بيانات الأسبوع -------------------- */
function getWeekDateKeys(anchorDate){
  const d = new Date(anchorDate || new Date());
  d.setHours(0,0,0,0);
  const dow = d.getDay(); // 0 = الأحد
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dow);
  const keys = [];
  for(let i = 0; i < 7; i++){
    const dt = new Date(sunday);
    dt.setDate(sunday.getDate() + i);
    keys.push(todayKey(dt));
  }
  return keys;
}

function formatDayLabel(dayKey){
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${AR_WEEKDAYS[dt.getDay()]} ${dt.getDate()} ${AR_MONTHS[dt.getMonth()]}`;
}

function buildWeekView(daysObj, settings){
  const weekKeys = getWeekDateKeys();
  const perDay = [];
  let study = [], breaks = [], sleep = [], achievements = [];
  weekKeys.forEach(key => {
    const day = daysObj[key] || { study: [], breaks: [], sleep: [], achievements: [] };
    const dayStats = computeStats(day, settings);
    perDay.push({ key, stats: dayStats });
    study = study.concat((day.study || []).map(s => ({ ...s, dayKey: key })));
    breaks = breaks.concat((day.breaks || []).map(s => ({ ...s, dayKey: key })));
    sleep = sleep.concat((day.sleep || []).map(s => ({ ...s, dayKey: key })));
    achievements = achievements.concat((day.achievements || []).map(a => ({ ...a, dayKey: key })));
  });
  const studyMinutes = perDay.reduce((s, d) => s + d.stats.studyMinutes, 0);
  const breakMinutes = perDay.reduce((s, d) => s + d.stats.breakMinutes, 0);
  const sleepMinutes = perDay.reduce((s, d) => s + d.stats.sleepMinutes, 0);
  const doneCount = achievements.filter(a => a.done).length;
  const totalCount = achievements.length;
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const points = perDay.reduce((s, d) => s + d.stats.points, 0);
  const tiers = normalizeGoalTiers(settings).map(t => t * 7);
  const tierLevel = tiers.filter(t => studyMinutes >= t).length;
  const allTiersDone = tierLevel >= tiers.length;
  const goalMinutes = allTiersDone ? tiers[tiers.length-1] : tiers[tierLevel];
  const goalPercentage = Math.min(100, Math.round((studyMinutes / goalMinutes) * 100));
  return {
    weekKeys, perDay, study, breaks, sleep, achievements,
    stats: { studyMinutes, breakMinutes, sleepMinutes, doneCount, totalCount, percentage, points, goalMinutes, goalPercentage, tiers, tierLevel, allTiersDone },
  };
}

function renderWeekBarsHTML(weekView){
  const dayShort = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const maxMinutes = Math.max(1, ...weekView.perDay.map(d => d.stats.studyMinutes + d.stats.breakMinutes + d.stats.sleepMinutes));
  const today = todayKey();
  return weekView.perDay.map((d, i) => {
    const total = d.stats.studyMinutes + d.stats.breakMinutes + d.stats.sleepMinutes;
    const studyPct = (d.stats.studyMinutes / maxMinutes) * 100;
    const breakPct = (d.stats.breakMinutes / maxMinutes) * 100;
    const sleepPct = (d.stats.sleepMinutes / maxMinutes) * 100;
    return `
      <div class="week-row ${d.key === today ? 'today' : ''}" onclick="openDayDetailModal('${d.key}')" tabindex="0">
        <span class="week-day-label">${dayShort[i]}</span>
        <div class="week-bar-track">
          <div class="week-bar-seg study" style="width:${studyPct}%"></div>
          <div class="week-bar-seg brk" style="width:${breakPct}%"></div>
          <div class="week-bar-seg sleep" style="width:${sleepPct}%"></div>
        </div>
        <span class="week-day-total num-inline">${total > 0 ? formatDuration(total) : '—'}</span>
      </div>
    `;
  }).join('');
}

/* -------------------- تجميع بيانات الشهر (خريطة حرارية) -------------------- */
function getMonthDateKeys(anchorDate){
  const d = new Date(anchorDate || new Date());
  const year = d.getFullYear(), month = d.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const keys = [];
  for(let day = 1; day <= daysInMonth; day++) keys.push(todayKey(new Date(year, month, day)));
  return keys;
}

function buildMonthView(daysObj, settings){
  const monthKeys = getMonthDateKeys();
  const perDay = [];
  let study = [], breaks = [], sleep = [], achievements = [];
  monthKeys.forEach(key => {
    const day = daysObj[key] || { study: [], breaks: [], sleep: [], achievements: [] };
    const dayStats = computeStats(day, settings);
    perDay.push({ key, stats: dayStats });
    study = study.concat((day.study || []).map(s => ({ ...s, dayKey: key })));
    breaks = breaks.concat((day.breaks || []).map(s => ({ ...s, dayKey: key })));
    sleep = sleep.concat((day.sleep || []).map(s => ({ ...s, dayKey: key })));
    achievements = achievements.concat((day.achievements || []).map(a => ({ ...a, dayKey: key })));
  });
  const studyMinutes = perDay.reduce((s, d) => s + d.stats.studyMinutes, 0);
  const breakMinutes = perDay.reduce((s, d) => s + d.stats.breakMinutes, 0);
  const sleepMinutes = perDay.reduce((s, d) => s + d.stats.sleepMinutes, 0);
  const doneCount = achievements.filter(a => a.done).length;
  const totalCount = achievements.length;
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const points = perDay.reduce((s, d) => s + d.stats.points, 0);
  const tiers = normalizeGoalTiers(settings).map(t => t * monthKeys.length);
  const tierLevel = tiers.filter(t => studyMinutes >= t).length;
  const allTiersDone = tierLevel >= tiers.length;
  const goalMinutes = allTiersDone ? tiers[tiers.length-1] : tiers[tierLevel];
  const goalPercentage = Math.min(100, Math.round((studyMinutes / goalMinutes) * 100));
  return {
    monthKeys, perDay, study, breaks, sleep, achievements,
    stats: { studyMinutes, breakMinutes, sleepMinutes, doneCount, totalCount, percentage, points, goalMinutes, goalPercentage, tiers, tierLevel, allTiersDone },
  };
}

function renderMonthGridHTML(monthView){
  const now = new Date();
  const startOffset = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const maxMinutes = Math.max(1, ...monthView.perDay.map(d => d.stats.studyMinutes));
  const todayStr = todayKey();
  const dayInitials = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  let cells = '';
  for(let i = 0; i < startOffset; i++) cells += `<div class="month-cell empty"></div>`;
  monthView.perDay.forEach((d, idx) => {
    const dayNum = idx + 1;
    const level = d.stats.studyMinutes <= 0 ? 0 : Math.min(4, Math.ceil((d.stats.studyMinutes / maxMinutes) * 4));
    const isToday = d.key === todayStr;
    const title = `${formatDayLabelShort(d.key)} — ${d.stats.studyMinutes > 0 ? formatDuration(d.stats.studyMinutes) + ' قراءة' : 'بلا قراءة'}`;
    cells += `<div class="month-cell level-${level} ${isToday ? 'today' : ''}" title="${title}"><span>${dayNum}</span></div>`;
  });

  return `
    <div class="month-weekday-row">${dayInitials.map(n => `<span>${n[0]}</span>`).join('')}</div>
    <div class="month-grid">${cells}</div>
    <div class="month-legend">
      <span>أقل</span>
      <span class="month-cell level-0 mini"></span><span class="month-cell level-1 mini"></span><span class="month-cell level-2 mini"></span><span class="month-cell level-3 mini"></span><span class="month-cell level-4 mini"></span>
      <span>أكثر</span>
    </div>
  `;
}

function formatDayLabelShort(dayKey){
  const [y, m, d] = dayKey.split('-').map(Number);
  return `${d} ${AR_MONTHS[m - 1]}`;
}

/* -------------------- نموذج بيانات المراجعات والامتحانات -------------------- */
const REVIEW_PALETTE = ['#3d5af1','#e8927a','#4f7a5c','#f0b860','#6f90f7','#e14c5f','#1f9d63','#b6803f','#7c3aed','#0aa4c0'];

function ensureReview(data){
  if(!data.review) data.review = { subjects: [], items: [] };
  if(!data.review.subjects) data.review.subjects = [];
  if(!data.review.items) data.review.items = [];
  return data.review;
}

function getNextPaletteColor(subjects){
  return REVIEW_PALETTE[(subjects || []).length % REVIEW_PALETTE.length];
}

function isReviewDueOn(item, dateObj){
  if(!item.schedule) return false; // موضوع امتحان بس، بدون جدول مراجعة متكرر — أبداً ما يطلع بقائمة "مراجعات اليوم"
  const compareDate = new Date(dateObj); compareDate.setHours(0,0,0,0);
  let start = null;
  if(item.startDate){
    start = new Date(item.startDate + 'T00:00:00');
    if(compareDate < start) return false;
  }
  if(item.scheduleWeeks && start){
    const weeksElapsed = Math.floor((compareDate - start) / (7*86400000));
    if(weeksElapsed >= item.scheduleWeeks) return false; // خلصت مدة المراجعة المحددة
  }
  const sched = item.schedule;
  if(sched.type === 'week') return (sched.daysOfWeek || []).includes(dateObj.getDay());
  if(sched.type === 'every'){
    if(!start) return true;
    const diffDays = Math.round((compareDate - start) / 86400000);
    const n = sched.everyN || 1;
    return diffDays >= 0 && diffDays % n === 0;
  }
  return true; // 'daily'
}

function daysUntil(dateStr){
  if(!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function formatScheduleSummary(schedule, scheduleWeeks){
  if(!schedule) return 'امتحان بس (بدون مراجعة متكررة)';
  const dayNames = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  let base;
  if(schedule.type === 'week'){
    const days = (schedule.daysOfWeek || []).slice().sort().map(d => dayNames[d]);
    base = days.length ? days.join('، ') : 'ما اكو أيام محددة';
  } else if(schedule.type === 'every'){
    base = `كل ${schedule.everyN || 1} ${(schedule.everyN||1) === 1 ? 'يوم' : 'أيام'}`;
  } else {
    const times = schedule.timesPerDay || 1;
    base = times > 1 ? `يومياً (${times} مرات)` : 'يومياً';
  }
  return scheduleWeeks ? `${base} — لمدة ${arCount(scheduleWeeks, 'أسبوع', 'أسابيع')}` : base;
}

/* -------------------- إعدادات الجهاز المحلية (لا تُنشر) -------------------- */
const FIREBASE_DATA_PATH = 'injaz'; // المسار داخل قاعدة بيانات Firebase الخاصة بيك

function loadLocalConfig(){
  try{
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if(!raw) return { adminPin: null };
    return { adminPin: null, ...JSON.parse(raw) };
  }catch(e){ return { adminPin: null }; }
}
function saveLocalConfig(cfg){
  try{ localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(cfg)); }catch(e){}
  return cfg;
}

function getEffectiveFirebaseConfig(){
  // إعدادات Firebase تُقرأ من متغيّر مضمّن بنفس ملف HTML (يشتغل تلقائياً للوحة التحكم ولوحة المتابعة معاً،
  // لأن كلا الملفين يحتاجان نفس الإعداد بالضبط حتى يوصلون لنفس قاعدة البيانات)
  if(window.INJAZ_FIREBASE_CONFIG && window.INJAZ_FIREBASE_CONFIG.databaseURL) return window.INJAZ_FIREBASE_CONFIG;
  return null;
}

function getViewerUrl(){
  return window.location.href.replace(/admin\.html.*$/, 'index.html');
}

/* -------------------- مزامنة Firebase (قراءة عامة للجميع، كتابة بتسجيل دخول مجهول للوحة التحكم فقط) -------------------- */

// ننتظر جاهزية جسر Firebase (وحدة ES module منفصلة) قبل أي استخدام — عادة جاهز فوراً، بس هذا يحمي من أي تأخير بالتحميل
function waitForFirebaseBridge(timeoutMs){
  timeoutMs = timeoutMs || 4000;
  if(window.FirebaseSync) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onReady = () => { clearTimeout(timer); resolve(true); };
    window.addEventListener('firebase-bridge-ready', onReady, { once: true });
    const timer = setTimeout(() => { window.removeEventListener('firebase-bridge-ready', onReady); resolve(!!window.FirebaseSync); }, timeoutMs);
  });
}

// تهيئة بسيطة — تكفي لأي عملية قراءة (لوحة المتابعة تستخدم هذي بس، بلا أي تسجيل دخول)
async function ensureFirebaseInitialized(cfg){
  const ready = await waitForFirebaseBridge();
  if(!ready || !window.FirebaseSync) throw new Error('BRIDGE_NOT_READY');
  const ok = window.FirebaseSync.init(cfg);
  if(!ok) throw new Error('INIT_FAILED');
}

// تهيئة + تسجيل دخول مجهول — تستخدمها لوحة التحكم فقط قبل أي عملية كتابة، حتى تحقق قواعد الأمان شرط auth != null
async function ensureFirebaseAdminReady(cfg){
  await ensureFirebaseInitialized(cfg);
  await window.FirebaseSync.signInAnon();
}

async function fetchRemoteDataFresh(cfg){
  await ensureFirebaseInitialized(cfg);
  const val = await window.FirebaseSync.readOnce(FIREBASE_DATA_PATH);
  if(val == null) throw new Error('NOT_FOUND');
  return val;
}

// نفس القراءة الفورية — Firebase ما عنده تأخير تخزين مؤقت زي CDN، فتصلح للاستطلاع الدوري وللتحديث اليدوي بلا فرق
async function fetchRemoteDataCdn(cfg){ return fetchRemoteDataFresh(cfg); }

async function pushRemoteData(cfg, dataObj){
  if(!cfg || !cfg.databaseURL) throw new Error('NO_CONFIG');
  await ensureFirebaseAdminReady(cfg);
  await window.FirebaseSync.write(FIREBASE_DATA_PATH, dataObj);
}

// استماع حي فوري لأي تحديث (تُستخدم بلوحة المتابعة بدل الاستطلاع الدوري — تحديث لحظي حقيقي عبر Firebase، بلا تسجيل دخول)
async function listenRemoteData(cfg, onData, onError){
  try{
    await ensureFirebaseInitialized(cfg);
    window.FirebaseSync.listen(FIREBASE_DATA_PATH, (val) => onData(val), onError);
  }catch(e){ if(onError) onError(e); }
}

/* -------------------- فحص الاتصال بـ Firebase (للتشخيص) -------------------- */
async function checkRepoAccess(cfg){
  if(!cfg || !cfg.databaseURL || !cfg.apiKey){
    return { ok: false, message: 'ما لكينا إعدادات Firebase بملف الصفحة — تأكد إنك عدّلت سطر INJAZ_FIREBASE_CONFIG بآخر admin.html و index.html ورفعتهم على GitHub.' };
  }
  try{
    await ensureFirebaseAdminReady(cfg);
    await window.FirebaseSync.readOnce(FIREBASE_DATA_PATH);
    return { ok: true, message: 'الاتصال ناجح بقاعدة بياناتك على Firebase، وتسجيل الدخول والكتابة يشتغلون ✓' };
  }catch(e){
    const msg = String(e && (e.code || e.message) || e);
    if(msg.includes('PERMISSION_DENIED') || msg.includes('permission_denied') || msg.includes('permission-denied')){
      return { ok: false, message: 'الاتصال نجح بس القراءة أو الكتابة مرفوضة — تأكد من قواعد الأمان (Rules) وإن تسجيل الدخول المجهول (Anonymous) مفعّل بمشروعك. راجع خطوات الـ README.' };
    }
    if(msg.includes('auth/configuration-not-found') || msg.includes('admin-restricted-operation')){
      return { ok: false, message: 'تسجيل الدخول المجهول (Anonymous) مو مفعّل بمشروعك بـ Firebase — فعّله من Authentication → Sign-in method → Anonymous.' };
    }
    if(msg === 'INIT_FAILED'){
      return { ok: false, message: 'إعدادات Firebase الملصقة بالملف غير صحيحة — تأكد إنك نسخت الكود كامل من صفحة إعدادات مشروعك بـ Firebase بدون نقصان.' };
    }
    if(msg === 'BRIDGE_NOT_READY'){
      return { ok: false, message: 'تعذر تحميل مكتبة Firebase — تأكد من اتصال الإنترنت وحاول تحدّث الصفحة.' };
    }
    return { ok: false, message: 'تعذر الاتصال — تأكد من رابط قاعدة البيانات (databaseURL) وباقي الإعدادات، ومن اتصال الإنترنت.' };
  }
}

/* -------------------- حقن الأيقونات بالعناصر الثابتة -------------------- */
function hydrateIcons(scope){
  (scope || document).querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = ICONS[el.dataset.icon] || '';
  });
}

/* -------------------- مستويات الهدف المتدرجة (دوائر + تطوّر شكل الموقع) -------------------- */
function renderGoalTierDots(stats){
  const el = document.getElementById('goal-tier-dots');
  if(!el) return;
  const tiers = (stats && stats.tiers) || [];
  if(tiers.length <= 1){ el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'flex';
  el.innerHTML = tiers.map((t, i) => `<span class="goal-tier-dot ${i < stats.tierLevel ? 'reached' : ''}" title="الهدف ${i+1}: ${formatDuration(t)}"></span>`).join('');
}

function applyGoalLevelVisuals(stats){
  if(!stats) return;
  const level = Math.min(3, stats.tierLevel || 0);
  document.body.dataset.goalLevel = String(level);
  renderGoalTierDots(stats);
  const badge = document.getElementById('goal-level-badge');
  if(!badge) return;
  if(level >= 1){
    badge.style.display = 'inline-flex';
    badge.className = `goal-level-badge lv${level}`;
    badge.innerHTML = `${ICONS.flame}<span>${stats.allTiersDone ? 'كل الأهداف!' : `مستوى ${level}`}</span>`;
  } else {
    badge.style.display = 'none';
    badge.className = 'goal-level-badge';
  }
}

/* -------------------- تطبيق النمط البصري -------------------- */
function applyTheme(settings){
  const root = document.documentElement;
  const theme = settings.theme || 'night';
  root.setAttribute('data-theme', theme);
  if(theme === 'custom' && settings.customTheme){
    root.style.setProperty('--primary', settings.customTheme.primary || '#7c3aed');
    root.style.setProperty('--secondary', settings.customTheme.secondary || '#ff8a4c');
    root.setAttribute('data-custom-mode', settings.customTheme.mode || 'light');
  }else{
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.removeAttribute('data-custom-mode');
  }
}

/* -------------------- تنبيهات Toast -------------------- */
function ensureToastContainer(){
  let c = document.querySelector('.toast-container');
  if(!c){ c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  return c;
}
function toast(message, type){
  type = type || 'info';
  const c = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const iconName = type === 'success' ? 'checkCircle' : type === 'error' ? 'alertCircle' : 'info';
  el.innerHTML = `${ICONS[iconName]}<span>${escapeHtml(message)}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 240);
  }, 3200);
}

/* -------------------- احتفال الإنجاز -------------------- */
function confettiBurst(){
  const vars = ['--primary','--secondary','--success','--warning'];
  const colors = vars.map(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim()).filter(Boolean);
  const count = 70;
  for(let i=0;i<count;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.background = colors[Math.floor(Math.random()*colors.length)] || '#f0b860';
    el.style.left = (Math.random()*100) + 'vw';
    el.style.animationDuration = (2.3 + Math.random()*1.7) + 's';
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    el.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
}

/* -------------------- عدّاد أرقام متحرك -------------------- */
function animateCountUp(el, toValue, opts){
  if(!el) return;
  opts = opts || {};
  const duration = opts.duration || 900;
  const suffix = opts.suffix || '';
  const formatter = opts.formatter || ((v) => v + suffix);
  const fromValue = opts.from != null ? opts.from : 0;
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now-start)/duration);
    const eased = 1 - Math.pow(1-p, 3);
    const val = Math.round(fromValue + (toValue-fromValue)*eased);
    el.textContent = formatter(val);
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* -------------------- الخط الزمني (العنصر المميز) -------------------- */
function renderTimelineHTML(dayObj, activeTimer, targetDayKey, allData){
  const targetKey = targetDayKey || (dayObj && dayObj.dayKey) || todayKey();
  const dayStart = new Date(targetKey + 'T00:00:00').getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000; // 24 ساعة بالمللي ثانية
  const totalSpan = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;

  function pct(dateLike){
    const d = new Date(dateLike);
    const minutesFromStart = (d.getHours()*60 + d.getMinutes()) - TIMELINE_START_HOUR*60;
    return Math.min(100, Math.max(0, (minutesFromStart/totalSpan)*100));
  }

  const hourMarks = [];
  for(let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h += 3){
    hourMarks.push(`<div class="timeline-hour"><span>${h === 24 ? '00' : pad2(h)}</span></div>`);
  }

  // تجميع الجلسات مع جلب أي جلسة ممتدة من اليوم السابق (مثل النوم من ليلة البارحة للصباح)
  const study = [...((dayObj && dayObj.study) || [])];
  const breaks = [...((dayObj && dayObj.breaks) || [])];
  const sleep = [...((dayObj && dayObj.sleep) || [])];

  if(allData && allData.days){
    const prevDate = new Date(dayStart - 12 * 3600 * 1000);
    const prevKey = todayKey(prevDate);
    const prevDay = allData.days[prevKey];
    if(prevDay){
      const checkAndAddOverflow = (srcArr, targetArr) => {
        (srcArr || []).forEach(s => {
          if(s && s.end && new Date(s.end).getTime() > dayStart){
            // نتأكد ألا نكرر الجلسة إذا كانت مسجلة بالفعل
            if(!targetArr.some(x => x.id === s.id)){
              targetArr.push(s);
            }
          }
        });
      };
      checkAndAddOverflow(prevDay.study, study);
      checkAndAddOverflow(prevDay.breaks, breaks);
      checkAndAddOverflow(prevDay.sleep, sleep);
    }
  }

  function getSpan(s){
    if(!s || !s.start) return null;
    const sStart = new Date(s.start).getTime();
    let sEnd = s.end ? new Date(s.end).getTime() : (sStart + (s.minutes || 0) * 60000);
    if(isNaN(sStart) || isNaN(sEnd) || sEnd <= sStart) return null;

    // فحص التداخل مع هذا اليوم المحدد (من 00:00 إلى 24:00)
    const overlapStart = Math.max(sStart, dayStart);
    const overlapEnd = Math.min(sEnd, dayEnd);
    if(overlapEnd <= overlapStart) return null;

    const startMin = (overlapStart - dayStart) / 60000;
    const endMin = (overlapEnd - dayStart) / 60000;
    const left = Math.min(100, Math.max(0, (startMin / 1440) * 100));
    const right = Math.min(100, Math.max(0, (endMin / 1440) * 100));
    const width = Math.max(right - left, 0.6);

    let label = `من ${formatTime(s.start)} إلى ${formatTime(s.end)} · ${formatDuration(s.minutes)}`;
    let extraClass = '';
    if(sStart < dayStart){
      label = `امتداد من ليلة البارحة: من منتصف الليل حتى ${formatTime(s.end)} (إجمالي: ${formatDuration(s.minutes)})`;
      extraClass = ' continuation-prev';
    } else if(sEnd > dayEnd){
      label = `من ${formatTime(s.start)} ويمتد لبعد منتصف الليل (حتى ${formatTime(s.end)}) · إجمالي: ${formatDuration(s.minutes)}`;
      extraClass = ' continuation-next';
    }
    return { left, width, label, extraClass };
  }

  function segHtml(sessions, catClass){
    return sessions.map(s => {
      const span = getSpan(s);
      if(!span) return '';
      return `<div class="timeline-segment ${catClass}${span.extraClass}" style="inset-inline-start:${span.left}%; width:${span.width}%;" tabindex="0">
        <div class="timeline-tooltip">${escapeHtml(span.label)}</div>
      </div>`;
    }).join('');
  }

  // قطعة "حيّة" للعداد الشغال حالياً — تحسب التداخل بدقة حتى لو بدأ قبل منتصف الليل واستمر لليوم التالي
  let liveSegHtml = '';
  if(activeTimer && activeTimer.start){
    const tStart = new Date(activeTimer.start).getTime();
    const tEnd = Date.now();
    const overlapStart = Math.max(tStart, dayStart);
    const overlapEnd = Math.min(tEnd, dayEnd);
    if(overlapEnd > overlapStart){
      const catClass = { study: 'study', break: 'brk', sleep: 'sleep' }[activeTimer.category] || activeTimer.category;
      const startMin = (overlapStart - dayStart) / 60000;
      const endMin = (overlapEnd - dayStart) / 60000;
      const left = Math.min(100, Math.max(0, (startMin / 1440) * 100));
      const right = Math.min(100, Math.max(0, (endMin / 1440) * 100));
      const width = Math.max(right - left, 0.6);
      let label = `شغال من ${formatTime(activeTimer.start)} — لهسه`;
      if(tStart < dayStart){
        label = `شغال من منتصف الليل حتى الآن (بدأ ${formatTime(activeTimer.start)} البارحة)`;
      }
      liveSegHtml = `<div class="timeline-segment ${catClass} live" style="inset-inline-start:${left}%; width:${width}%;" tabindex="0">
        <div class="timeline-tooltip">${escapeHtml(label)}</div>
      </div>`;
    }
  }

  const isToday = targetKey === todayKey();
  const now = new Date();
  const nowPct = pct(now);
  const isEmpty = study.length === 0 && breaks.length === 0 && sleep.length === 0 && !liveSegHtml;

  return `
    <div class="timeline-hours">${hourMarks.join('')}</div>
    ${segHtml(study, 'study')}
    ${segHtml(breaks, 'brk')}
    ${segHtml(sleep, 'sleep')}
    ${liveSegHtml}
    ${isToday ? `<div class="timeline-now" style="inset-inline-start:${nowPct}%"><div class="timeline-now-dot"></div></div>` : ''}
    ${isEmpty ? `<div class="timeline-empty">لسه ما اكو نشاط مسجل اليوم</div>` : ''}
  `;
}
