/* ============================================================
   إنجاز — لوحة التحكم
   ============================================================ */

let DATA = loadData();
let tickInterval = null;
let syncState = 'off'; // off | pending | ok | err
let lastSyncError = '';
let currentModalSession = null;
let currentPeriod = 'day'; // 'day' | 'week' | 'month'
let currentDayKey = todayKey(); // اليوم المعروض حالياً بوضع "اليوم" — يتغير بأزرار التنقل، يخليك تضيف/تعدّل على أيام فاتتك
let currentDayModalKey = null;

const CATS = {
  study: {
    key: 'study', label: 'دراستي', arrayKey: 'study', icon: 'book',
    startLabel: 'ابدأ القراءة', endLabel: 'إنهاء الجلسة',
    emptyLabel: 'لسه ما بديت القراءة اليوم — اضغط «ابدأ القراءة» لأول جلسة',
    addedToast: 'تم حفظ جلسة القراءة ✓',
  },
  break: {
    key: 'break', label: 'استراحاتي', arrayKey: 'breaks', icon: 'coffee',
    startLabel: 'ابدأ الاستراحة', endLabel: 'إنهاء الاستراحة',
    emptyLabel: 'ما اكو استراحات مسجلة اليوم بعد',
    addedToast: 'تم حفظ الاستراحة ✓',
  },
  sleep: {
    key: 'sleep', label: 'نومي', arrayKey: 'sleep', icon: 'bed',
    startLabel: 'ابدأ النوم', endLabel: 'صحيت 🌅',
    emptyLabel: 'ما اكو ساعات نوم مسجلة اليوم بعد',
    addedToast: 'تم تسجيل نومك ✓',
  },
};
const CAT_ORDER = ['study', 'break', 'sleep'];

/* -------------------- الحفظ والمزامنة -------------------- */
function persist(){
  saveData(DATA);
  scheduleSyncPush();
  syncCompletedDaysToFocusTracker();
}

/* ============================================================
   مزامنة نقاط اليوم المنتهية مع Focus Tracker تلقائياً بعد 12 بالليل
   مع تطبيق مضاعف البونسات إن وجد لليوم، لضمان عدم ضياع أي نقاط
   ============================================================ */
function syncCompletedDaysToFocusTracker() {
  try {
    const ftRaw = localStorage.getItem('focusTrackerData_v1');
    if (!ftRaw) return;
    let ftData = JSON.parse(ftRaw);
    if (!ftData || !Array.isArray(ftData.entries)) return;

    const today = todayKey();
    const settings = DATA.settings || {};
    let modified = false;

    if (!ftData.dailyBonusHistory) ftData.dailyBonusHistory = {};

    // فحص الأيام المنتهية السابقة فقط (dateStr < todayKey())
    const pastDays = Object.keys(DATA.days || {}).filter(d => d < today && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();

    pastDays.forEach(dateStr => {
      const dayObj = DATA.days[dateStr];
      if (!dayObj) return;
      const stats = computeStats(dayObj, settings);
      const basePoints = stats.points || 0;
      if (basePoints <= 0) return;

      let multiplier = ftData.dailyBonusHistory[dateStr] || 1;
      // إذا لم يكن مسجلاً في التاريخ، نفحص البونسات النشطة لذلك اليوم
      if (multiplier === 1 && Array.isArray(ftData.bonuses)) {
        const active = ftData.bonuses.filter(b => b.affectsPoints && b.lastActiveDay === dateStr && b.currentStage > 0);
        if (active.length > 0) {
          let totalExtra = 0;
          for (const b of active) {
            if (Array.isArray(b.stages) && b.currentStage > 0) {
              const p = parseFloat(b.stages[b.currentStage - 1]);
              if (isFinite(p) && p > 0) {
                totalExtra += (p >= 1 ? (p - 1) : p);
              }
            }
          }
          multiplier = Math.round((1 + totalExtra) * 100) / 100;
          ftData.dailyBonusHistory[dateStr] = multiplier;
        }
      }

      const finalPoints = Math.round(basePoints * multiplier);
      const existing = ftData.entries.find(e => e.date === dateStr && e.subject === 'إنجاز');
      if (existing) {
        if (existing.points !== finalPoints) {
          existing.points = finalPoints;
          if (multiplier > 1) existing.bonusMult = multiplier;
          modified = true;
        }
      } else {
        ftData.entries.push({
          id: 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
          points: finalPoints,
          subject: 'إنجاز',
          date: dateStr,
          bonusMult: multiplier > 1 ? multiplier : undefined
        });
        modified = true;
      }
    });

    if (modified) {
      ftData.updatedAt = Date.now();
      localStorage.setItem('focusTrackerData_v1', JSON.stringify(ftData));
      if (window.FirebaseSync && window.INJAZ_FIREBASE_CONFIG) {
        window.FirebaseSync.write('focusTracker', ftData).catch(() => {});
      }
      window.dispatchEvent(new Event('focus-tracker-data-changed'));
    }
  } catch (e) {
    console.warn('Auto-sync to Focus Tracker notice:', e);
  }
}

// نفس الحفظ، بس بدون فترة انتظار — نستخدمها لحظة بدء/إيقاف العداد تحديداً حتى تنعرض عند العائلة فوراً وهي تعد
async function persistImmediate(){
  saveData(DATA);
  const cfg = getEffectiveFirebaseConfig();
  if(!cfg) return;
  syncState = 'pending';
  renderSyncStatusUI();
  try{
    await pushRemoteData(cfg, DATA);
    syncState = 'ok';
    lastSyncError = '';
  }catch(e){
    console.error('sync error:', e);
    syncState = 'err';
    lastSyncError = e.message || String(e);
  }
  renderSyncStatusUI();
}

const scheduleSyncPush = debounce(async function(){
  const cfg = getEffectiveFirebaseConfig();
  if(!cfg) return;
  syncState = 'pending';
  renderSyncStatusUI();
  try{
    await pushRemoteData(cfg, DATA);
    syncState = 'ok';
    lastSyncError = '';
  }catch(e){
    console.error('sync error:', e);
    syncState = 'err';
    lastSyncError = e.message || String(e);
  }
  renderSyncStatusUI();
}, 3500);

async function syncNow(){
  const cfg = getEffectiveFirebaseConfig();
  if(!cfg){ toast('ما لكينا إعدادات Firebase بالملف — شوف خطوات الإعداد بالـ README', 'error'); return; }
  syncState = 'pending';
  renderSyncStatusUI();
  try{
    await pushRemoteData(cfg, DATA);
    syncState = 'ok';
    lastSyncError = '';
    toast('تم النشر لأهلك بنجاح ✓', 'success');
  }catch(e){
    console.error(e);
    syncState = 'err';
    lastSyncError = e.message || String(e);
    toast('فشلت المزامنة — افتح تبويب «المشاركة» وشوف تفاصيل الخطأ تحت', 'error');
  }
  renderSyncStatusUI();
}

async function testFirebaseConnection(){
  const cfg = getEffectiveFirebaseConfig();
  const resultEl = document.getElementById('gh-test-result');
  resultEl.style.display = 'flex';
  resultEl.className = 'form-hint gh-test-box';
  resultEl.innerHTML = `${ICONS.refresh}<span>جاري الفحص...</span>`;
  const result = await checkRepoAccess(cfg);
  resultEl.className = `form-hint gh-test-box ${result.ok ? (result.warn ? 'warn' : 'ok') : 'bad'}`;
  resultEl.innerHTML = `${ICONS[result.ok ? (result.warn ? 'alertCircle' : 'checkCircle') : 'alertCircle']}<span>${escapeHtml(result.message)}</span>`;
}

function showUpdateAvailableBanner(remoteData){
  const existing = document.getElementById('remote-update-banner');
  if(existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'remote-update-banner';
  banner.className = 'update-banner';
  banner.innerHTML = `
    <span class="update-banner-icon">${ICONS.info}</span>
    <span class="update-banner-text">لكيت نسخة أحدث من بياناتك محفوظة (غالباً من جهاز ثاني)</span>
    <button type="button" class="btn btn-primary btn-sm" id="update-banner-load">تحميل من السحابة</button>
    <button type="button" class="btn btn-ghost btn-sm" id="update-banner-dismiss">تجاهل</button>
  `;
  document.body.appendChild(banner);
  document.getElementById('update-banner-load').onclick = () => {
    try{
      DATA = mergeWithDefaults(remoteData);
      saveData(DATA);
      applyTheme(DATA.settings);
      renderAll();
      renderBrandName();
      renderGoalTiersInputs();
      toast('تم تحميل أحدث نسخة ✓', 'success');
      banner.remove();
    }catch(err){
      console.error('update-banner-load:', err);
      toast('صار خطأ وأنت تحمّل النسخة الجديدة — الرجا تحدّث الصفحة وحاول مرة ثانية', 'error');
    }
  };
  document.getElementById('update-banner-dismiss').onclick = () => banner.remove();
}

async function checkRemoteOnLoad(){
  const cfg = getEffectiveFirebaseConfig();
  if(!cfg){ renderSyncStatusUI(); return; }
  try{
    const remote = await fetchRemoteDataFresh(cfg);
    const remoteIsNewer = remote && remote.updatedAt && (!DATA.updatedAt || new Date(remote.updatedAt) > new Date(DATA.updatedAt));
    if(remoteIsNewer) showUpdateAvailableBanner(remote);
    syncState = 'ok';
    lastSyncError = '';
  }catch(e){
    console.log('checkRemoteOnLoad:', e.message);
    if(e.message !== 'NOT_FOUND'){
      syncState = 'err';
      lastSyncError = e.message || String(e);
    }
  }
  renderSyncStatusUI();
}

function mergeWithDefaults(obj){
  const base = defaultData();
  return {
    ...base, ...obj,
    settings: migrateGoalTiers({ ...base.settings, ...(obj.settings||{}), customTheme: { ...base.settings.customTheme, ...((obj.settings||{}).customTheme||{}) } }, obj.settings),
    days: obj.days || {},
    review: { subjects: (obj.review && obj.review.subjects) || [], items: (obj.review && obj.review.items) || [] },
  };
}

function renderSyncStatusUI(){
  const cfg = getEffectiveFirebaseConfig();
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-label');
  const mini = document.getElementById('sync-dot-mini');
  const errDetail = document.getElementById('sync-error-detail');
  let cls = 'off', text = 'المزامنة غير مفعّلة — البيانات بجهازك بس';
  if(cfg){
    if(syncState === 'pending'){ cls='pending'; text='جاري الحفظ على Firebase...'; }
    else if(syncState === 'ok'){ cls='ok'; text = `متزامن مع أهلك ✓ — آخر تحديث ${formatRelativeTime(DATA.updatedAt)}`; }
    else if(syncState === 'err'){ cls='err'; text='صار خطأ بالمزامنة — التفاصيل تحت 👇'; }
    else { cls='off'; text='لسه ما انحفظ على Firebase'; }
  }
  if(dot){ dot.className = `sync-dot ${cls}`; }
  if(label){ label.textContent = text; }
  if(mini){ mini.className = `sync-dot-mini ${cls}`; mini.title = text; }
  if(errDetail){
    if(cls === 'err' && lastSyncError){
      errDetail.style.display = 'flex';
      errDetail.innerHTML = `${ICONS.alertCircle}<span>تفاصيل الخطأ: ${escapeHtml(lastSyncError)}</span>`;
    } else {
      errDetail.style.display = 'none';
    }
  }
}

/* -------------------- الساعة والتاريخ -------------------- */
function renderHeaderClock(){
  const now = new Date();
  const clockEl = document.getElementById('live-clock');
  if(clockEl) clockEl.textContent = formatTime(now);
  const dateEl = document.getElementById('today-date');
  if(dateEl) dateEl.textContent = formatDateArabic(now);
  renderDayEndCountdown(now);
}

// وقت نهاية اليوم مخزّن كدقائق بعد نص الليل (0 = نص الليل العادي، 120 = الساعة 2 فجراً وهيج)
function getDayEndCountdownMs(now){
  const cutoffMin = DATA.settings.dayEndMinutes || 0;
  now = now || new Date();
  let cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, cutoffMin, 0, 0);
  if(cutoff <= now) cutoff = new Date(cutoff.getTime() + 24*60*60*1000);
  return cutoff - now;
}

function renderDayEndCountdown(now){
  const el = document.getElementById('dayend-countdown');
  if(!el) return;
  const ms = getDayEndCountdownMs(now);
  const totalMin = Math.max(0, Math.round(ms / 60000));
  el.innerHTML = `متبقي ${formatDuration(totalMin)} لنهاية يومك`;
}

function renderBrandName(){
  const el = document.getElementById('brand-role-name');
  if(el) el.textContent = DATA.settings.studentName || 'المذاكِر المجتهد';
}

/* -------------------- التبديل بين اليوم والأسبوع والشهر -------------------- */
function getScopedView(){
  if(currentPeriod === 'week') return buildWeekView(DATA.days, DATA.settings);
  if(currentPeriod === 'month') return buildMonthView(DATA.days, DATA.settings);
  const day = ensureDay(DATA, currentDayKey);
  return { study: day.study, breaks: day.breaks, sleep: day.sleep, achievements: day.achievements, stats: computeStats(day, DATA.settings) };
}

function setPeriod(period){
  currentPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === period));
  const isDay = period === 'day';
  document.querySelectorAll('.timer-box, .manual-toggle, .manual-form, .joker-card').forEach(el => { el.style.display = isDay ? '' : 'none'; });
  const achieveForm = document.getElementById('achieve-form');
  if(achieveForm) achieveForm.style.display = isDay ? '' : 'none';

  const dayTrack = document.getElementById('timeline-track');
  const weekBars = document.getElementById('week-bars');
  const monthGrid = document.getElementById('month-grid-wrap');
  if(dayTrack) dayTrack.style.display = period === 'day' ? '' : 'none';
  if(weekBars) weekBars.style.display = period === 'week' ? '' : 'none';
  if(monthGrid) monthGrid.style.display = period === 'month' ? '' : 'none';

  const timelineSub = document.getElementById('timeline-sub');
  if(timelineSub){
    const subs = { day: 'شكل يومك بلمحة وحدة — من 12 بالليل ل12 بالليل', week: 'مجموع أيام هالأسبوع (الأحد للسبت) بلمحة وحدة', month: 'خريطة حرارية لهالشهر — كل مربع يوم، وكل ما غمق اللون قريت أكثر' };
    timelineSub.textContent = subs[period];
  }
  renderDayNav();
  renderAll();
}

/* -------------------- التنقل بين الأيام (لإضافة/تعديل أيام فاتتك) -------------------- */
function shiftDay(delta){
  const d = new Date(currentDayKey + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const newKey = todayKey(d);
  if(newKey > todayKey()) return; // ما نخلي تنقل لأيام المستقبل
  currentDayKey = newKey;
  renderDayNav();
  renderAll();
}

function jumpToToday(){
  currentDayKey = todayKey();
  renderDayNav();
  renderAll();
}

function renderDayNav(){
  const nav = document.getElementById('day-nav');
  if(!nav) return;
  nav.style.display = currentPeriod === 'day' ? '' : 'none';
  const isToday = currentDayKey === todayKey();
  const label = document.getElementById('day-nav-label');
  if(label) label.textContent = isToday ? 'اليوم' : formatDateArabic(new Date(currentDayKey + 'T00:00:00'));
  const todayBtn = document.getElementById('day-nav-today-btn');
  if(todayBtn) todayBtn.style.display = isToday ? 'none' : 'inline-flex';
  const nextBtn = document.getElementById('day-nav-next-btn');
  if(nextBtn) nextBtn.disabled = isToday;
  const pastNotice = document.getElementById('day-nav-past-notice');
  if(pastNotice) pastNotice.style.display = isToday ? 'none' : 'flex';
}

/* -------------------- الإحصائيات وشريط اليوم -------------------- */
function renderStats(){
  const stats = getScopedView().stats;
  animateCountUp(document.getElementById('stat-study'), stats.studyMinutes, { formatter: formatDuration });
  animateCountUp(document.getElementById('stat-break'), stats.breakMinutes, { formatter: formatDuration });
  animateCountUp(document.getElementById('stat-sleep'), stats.sleepMinutes, { formatter: formatDuration });
  animateCountUp(document.getElementById('stat-percent'), stats.percentage, { suffix: '%' });
  animateCountUp(document.getElementById('stat-points'), stats.points);

  const goalFill = document.getElementById('goal-fill');
  const goalLabel = document.getElementById('goal-label');
  if(goalFill) goalFill.style.width = stats.goalPercentage + '%';
  if(goalLabel){
    const periodWord = { day: 'اليوم', week: 'هالأسبوع', month: 'هالشهر' }[currentPeriod];
    goalLabel.textContent = stats.allTiersDone
      ? `${formatDuration(stats.studyMinutes)} — خلّصت كل أهداف ${periodWord} 🔥`
      : `${formatDuration(stats.studyMinutes)} من هدف ${formatDuration(stats.goalMinutes)} ${periodWord}`;
  }
  applyGoalLevelVisuals(stats);

  // 1. تطبيق تحذيرات الاستراحة (4 ساعات أصفر، 7 ساعات أحمر)
  applyBreakWarnings(stats.breakMinutes);

  // 2. تطبيق تلوين وتقييم النوم (7س أبيض عادي، 8س أخضر جيد، 9س أصفر، 10س أحمر، 11س تحذير أقوى)
  applySleepRatings(stats.sleepMinutes);

  // 3. تطبيق تحذير نسبة الاستراحة إلى الدراسة (إذا الاستراحة >= 50% من الدراسة)
  applyRatioWarning(stats.breakMinutes, stats.studyMinutes);
}

/* -------------------- تحذيرات وتلوين الاستراحة والنوم والنسبة -------------------- */
function applyBreakWarnings(breakMinutes){
  const card = document.getElementById('card-stat-break');
  const badge = document.getElementById('badge-stat-break');
  const trackerCard = document.querySelector('.tracker-card[data-cat="break"]');

  const status = getBreakWarningStatus(breakMinutes);
  if(card){
    card.classList.remove('break-warning-yellow', 'break-warning-red');
    if(status.cardClass) card.classList.add(status.cardClass);
  }
  if(badge){
    badge.className = 'stat-status-badge';
    if(status.active){
      badge.textContent = status.text;
      badge.classList.add(status.badgeClass);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if(trackerCard){
    trackerCard.classList.remove('break-warning-yellow', 'break-warning-red');
    if(status.cardClass) trackerCard.classList.add(status.cardClass);
  }
}

function applySleepRatings(sleepMinutes){
  const card = document.getElementById('card-stat-sleep');
  const badge = document.getElementById('badge-stat-sleep');
  const trackerCard = document.querySelector('.tracker-card[data-cat="sleep"]');

  const status = getSleepRatingStatus(sleepMinutes);
  if(card){
    card.classList.remove('sleep-level-7', 'sleep-level-8', 'sleep-level-9', 'sleep-level-10', 'sleep-level-11');
    if(status.cardClass) card.classList.add(status.cardClass);
  }
  if(badge){
    badge.className = 'stat-status-badge';
    if(status.active && status.text){
      badge.textContent = status.text;
      badge.classList.add(status.badgeClass);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if(trackerCard){
    trackerCard.classList.remove('sleep-level-7', 'sleep-level-8', 'sleep-level-9', 'sleep-level-10', 'sleep-level-11');
    if(status.cardClass) trackerCard.classList.add(status.cardClass);
  }
}

let ratioWarningDismissed = false;
function dismissRatioWarningForNow(){
  ratioWarningDismissed = true;
  const banner = document.getElementById('ratio-warning-card');
  if(banner) banner.style.display = 'none';
}

function applyRatioWarning(breakMinutes, studyMinutes){
  const banner = document.getElementById('ratio-warning-card');
  if(!banner) return;
  if(ratioWarningDismissed){
    banner.style.display = 'none';
    return;
  }
  const ratioStatus = getBreakToStudyRatioStatus(breakMinutes, studyMinutes);
  if(ratioStatus && ratioStatus.active){
    banner.className = `ratio-warning-card reveal severity-${ratioStatus.severity}`;
    banner.innerHTML = renderRatioWarningHTML(ratioStatus, false);
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function renderTimeline(){
  if(currentPeriod === 'week'){
    const el = document.getElementById('week-bars');
    if(el) el.innerHTML = renderWeekBarsHTML(getScopedView());
  } else if(currentPeriod === 'month'){
    const el = document.getElementById('month-grid-wrap');
    if(el) el.innerHTML = renderMonthGridHTML(getScopedView());
  } else {
    const el = document.getElementById('timeline-track');
    if(el) el.innerHTML = renderTimelineHTML(ensureDay(DATA, currentDayKey), DATA.activeTimer, currentDayKey, DATA);
  }
}

/* -------------------- المؤقّت (طريقة الزر) -------------------- */
let tickCount = 0;
let trackedMidnightDayKey = todayKey();

function startTickInterval(){
  if(tickInterval) return;
  tickInterval = setInterval(updateRunningTimerDisplay, 1000);
  updateRunningTimerDisplay();
}
function stopTickInterval(){
  if(tickInterval){ clearInterval(tickInterval); tickInterval = null; }
}
let activeBreak2HourAlertFired = false;

function updateRunningTimerDisplay(){
  if(!DATA.activeTimer) return;

  // فحص انتقال منتصف الليل أثناء تشغيل المتصفح حتى لا ينقطع العداد
  const realToday = todayKey();
  if(trackedMidnightDayKey !== realToday){
    const wasOnToday = (currentDayKey === trackedMidnightDayKey);
    trackedMidnightDayKey = realToday;
    if(wasOnToday){
      currentDayKey = realToday;
      renderDayNav();
    }
    renderAll();
  }

  const elapsed = getActiveElapsedSeconds(DATA.activeTimer);
  const el = document.getElementById(`timerdisplay-${DATA.activeTimer.category}`);
  if(el) el.textContent = formatStopwatch(elapsed);
  if(DATA.activeTimer.category !== 'sleep'){
    const jokerEl = document.getElementById('joker-timer-display');
    if(jokerEl) jokerEl.textContent = formatStopwatch(elapsed);
  }

  // تنبيه مكالمة الساعتين عند بلوغ الاستراحة المستمرة ساعتين كاملتين (7200 ثانية)
  if(DATA.activeTimer.category === 'break'){
    if(elapsed >= 7200 && !activeBreak2HourAlertFired){
      activeBreak2HourAlertFired = true;
      show2HourPhoneCallAlert('مرّت ساعتان كاملتان (120 دقيقة) من استراحتك الحالية المستمرة! الهدف ينتظرك واليوم ينقضي، حان وقت إنهاء الاستراحة والبدء بالدراسة فوراً.');
    }
  }

  tickCount++;
  if(tickCount % 20 === 0) renderTimeline(); // نوسّع القطعة الحية بخط اليوم كل ٢٠ ثانية تقريباً بدل كل ثانية توفيراً للأداء
}

function startTimer(catKey){
  if(DATA.activeTimer){ toast('فيه عداد شغال حالياً، خلّص منه أول', 'error'); return; }
  activeBreak2HourAlertFired = false;
  DATA.activeTimer = { category: catKey, start: new Date().toISOString() };
  persistImmediate();
  renderAll();
  startTickInterval();
}

function stopTimer(catKey){
  if(!DATA.activeTimer || DATA.activeTimer.category !== catKey) return;
  activeBreak2HourAlertFired = false;
  const cat = CATS[catKey];
  const start = DATA.activeTimer.start;
  const end = new Date().toISOString();
  const startDay = todayKey(new Date(start));
  const endDay = todayKey(new Date(end));
  const minutes = Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000));

  // إذا امتد العداد عبر منتصف الليل (مثل النوم من ليلة البارحة للصباح):
  // يُحفظ في يوم البدء (اليوم الذي بدأ فيه النوم) كما في الإضافة اليدوية تماماً
  const targetDayKey = startDay;
  const day = ensureDay(DATA, targetDayKey);
  const prevMinutes = day[cat.arrayKey].reduce((s,x)=>s+x.minutes, 0);
  const session = { id: uid(), start, end, minutes, details: '', source: 'timer' };
  day[cat.arrayKey].push(session);
  DATA.activeTimer = null;
  persistImmediate();
  stopTickInterval();
  renderAll();

  if(startDay !== endDay){
    const msg = catKey === 'sleep'
      ? `صح النوم! تم حفظ نومك (${formatDuration(minutes)}) في سجل ليلة ${formatDayLabel(startDay)} 🌙`
      : `${cat.addedToast} (${formatDuration(minutes)} — امتدت عبر منتصف الليل)`;
    toast(msg, 'success');
  } else {
    toast(cat.addedToast, 'success');
  }

  if(catKey === 'study' && targetDayKey === todayKey()) checkGoalCelebration(prevMinutes, prevMinutes + minutes);
  openDetailsModal(catKey, session.id, targetDayKey);
}

function cancelTimer(catKey){
  if(!DATA.activeTimer || DATA.activeTimer.category !== catKey) return;
  if(!confirm('تريد تلغي هذا العداد بدون ما تحفظ الجلسة؟')) return;
  activeBreak2HourAlertFired = false;
  DATA.activeTimer = null;
  persistImmediate();
  stopTickInterval();
  renderAll();
  toast('تم الإلغاء بدون حفظ', 'info');
}

/* -------------------- الزر الجوكر: دراسة⇄استراحة بلمسة وحدة، وينتهي بتسجيل نوم -------------------- */
// يقفل الجلسة الشغالة حالياً ويحفظها — بدون فتح نافذة تفاصيل ولا وقف تيك-إنترفال، لأننا غالباً راح نبدأ جلسة ثانية فوراً بعدها
function closeoutActiveSegment(){
  if(!DATA.activeTimer) return;
  const catKey = DATA.activeTimer.category;
  const cat = CATS[catKey];
  const start = DATA.activeTimer.start;
  const end = new Date().toISOString();
  const startDay = todayKey(new Date(start));
  const targetDayKey = startDay;
  const day = ensureDay(DATA, targetDayKey);
  const prevMinutes = day[cat.arrayKey].reduce((s,x)=>s+x.minutes, 0);
  const minutes = Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000));
  day[cat.arrayKey].push({ id: uid(), start, end, minutes, details: '', source: 'joker' });
  if(catKey === 'study' && targetDayKey === todayKey()) checkGoalCelebration(prevMinutes, prevMinutes + minutes);
}

function jokerStart(){
  if(DATA.activeTimer){ toast('فيه عداد شغال حالياً، خلّص منه أول', 'error'); return; }
  activeBreak2HourAlertFired = false;
  DATA.activeTimer = { category: 'study', start: new Date().toISOString() };
  persistImmediate();
  renderAll();
  startTickInterval();
}

// يبدّل بين دراسة واستراحة: يقفل الجلسة الحالية ويبدأ الثانية بنفس اللحظة بالضبط — صفر فجوة وقت بينهم
function jokerToggle(){
  if(!DATA.activeTimer || DATA.activeTimer.category === 'sleep') return;
  activeBreak2HourAlertFired = false;
  const nextCat = DATA.activeTimer.category === 'study' ? 'break' : 'study';
  closeoutActiveSegment();
  DATA.activeTimer = { category: nextCat, start: new Date().toISOString() };
  persistImmediate();
  renderAll();
}

function jokerEndToSleep(){
  if(!DATA.activeTimer || DATA.activeTimer.category === 'sleep') return;
  closeoutActiveSegment();
  DATA.activeTimer = { category: 'sleep', start: new Date().toISOString() };
  persistImmediate();
  renderAll();
  toast('بدأ تسجيل نومك — تصبح على خير 🌙', 'success');
}

function renderJoker(){
  const card = document.getElementById('joker-card');
  if(!card) return;
  const displayEl = document.getElementById('joker-timer-display');
  const captionEl = document.getElementById('joker-caption');
  const actionsEl = document.getElementById('joker-actions');
  const isToday = currentDayKey === todayKey();
  const at = DATA.activeTimer;

  // إذا كان هناك عداد نشط، نعرض حالته فوراً حتى لو كنا بمنتصف الليل أو تاريخ سابق
  if(at){
    if(at.category === 'sleep'){
      card.dataset.state = 'sleeping';
      if(displayEl) displayEl.textContent = formatStopwatch(getActiveElapsedSeconds(at));
      if(captionEl) captionEl.textContent = 'نايم الحين 😴 — تقدر تضغط «صحيت» هنا أو من كرت نومي بالأسفل';
      if(actionsEl) actionsEl.innerHTML = `<button type="button" class="btn btn-danger joker-btn" onclick="stopTimer('sleep')">${ICONS.stop}<span>صحيت من النوم ☀️</span></button>`;
      return;
    } else if(at.category === 'study'){
      card.dataset.state = 'studying';
      if(displayEl) displayEl.textContent = formatStopwatch(getActiveElapsedSeconds(at));
      if(captionEl) captionEl.textContent = 'تدرس الحين 📖';
      if(actionsEl) actionsEl.innerHTML = `
        <button type="button" class="btn btn-secondary joker-btn" onclick="jokerToggle()">${ICONS.coffee}<span>خذ استراحة</span></button>
        <button type="button" class="btn btn-danger joker-btn" onclick="jokerEndToSleep()">${ICONS.bed}<span>إنهاء ونام</span></button>
      `;
      return;
    } else {
      card.dataset.state = 'resting';
      if(displayEl) displayEl.textContent = formatStopwatch(getActiveElapsedSeconds(at));
      if(captionEl) captionEl.textContent = 'تستريح الحين ☕';
      if(actionsEl) actionsEl.innerHTML = `
        <button type="button" class="btn btn-primary joker-btn" onclick="jokerToggle()">${ICONS.book}<span>ارجع للدراسة</span></button>
        <button type="button" class="btn btn-danger joker-btn" onclick="jokerEndToSleep()">${ICONS.bed}<span>إنهاء ونام</span></button>
      `;
      return;
    }
  }

  if(!isToday){
    card.dataset.state = 'idle';
    if(displayEl) displayEl.textContent = '—:—:—';
    if(captionEl) captionEl.textContent = 'الزر الجوكر يشتغل بس لليوم الحالي';
    if(actionsEl) actionsEl.innerHTML = `<button type="button" class="btn btn-secondary joker-btn" disabled>${ICONS.clock}<span>متوفر لليوم بس</span></button>`;
    return;
  }

  card.dataset.state = 'idle';
  if(displayEl) displayEl.textContent = '00:00:00';
  if(captionEl) captionEl.textContent = 'زر وحد لدراسة واستراحة متبادلة — تبدّلون بلمسة، وتنتهون بتسجيل نوم';
  if(actionsEl) actionsEl.innerHTML = `<button type="button" class="btn btn-primary joker-btn" onclick="jokerStart()">${ICONS.play}<span>ابدأ</span></button>`;
}

function checkGoalCelebration(prevMinutes, newMinutes){
  const tiers = normalizeGoalTiers(DATA.settings);
  const messages = [
    'عاشت الإيد! وصلت هدفك اليومي 🎉',
    'ما شاء الله! صعدت مستوى — الهدف الثاني خلص 🔥',
    'خرافي! خلّصت كل أهدافك اليوم بكل المستويات 🔥🏆',
  ];
  tiers.forEach((t, i) => {
    if(prevMinutes < t && newMinutes >= t){
      confettiBurst();
      toast(messages[Math.min(i, messages.length-1)], 'success');
    }
  });
}

/* -------------------- الإضافة اليدوية -------------------- */
function toggleManualForm(catKey){
  const form = document.getElementById(`manualform-${catKey}`);
  const btn = document.getElementById(`manualtoggle-${catKey}`);
  if(!form || !btn) return;
  const willOpen = !form.classList.contains('open');
  form.classList.toggle('open', willOpen);
  btn.classList.toggle('open', willOpen);
  // عند الفتح: التفعيل الافتراضي يكون على طريقة الساعة (من - إلى)
  if(willOpen && !form.dataset.modeInitialized){
    setManualMode(catKey, 'clock');
    form.dataset.modeInitialized = 'true';
  }
}

function setManualMode(catKey, mode){
  const clockTab = document.getElementById(`tab-clock-${catKey}`);
  const numericTab = document.getElementById(`tab-numeric-${catKey}`) || document.getElementById(`tab-duration-${catKey}`);
  const clockForm = document.getElementById(`clockform-${catKey}`);
  const numericForm = document.getElementById(`numericform-${catKey}`) || document.getElementById(`durationform-${catKey}`);

  const isNumeric = (mode === 'numeric' || mode === 'duration');
  if(clockTab) clockTab.classList.toggle('active', !isNumeric);
  if(numericTab) numericTab.classList.toggle('active', isNumeric);
  if(clockForm) clockForm.style.display = isNumeric ? 'none' : 'grid';
  if(numericForm) numericForm.style.display = isNumeric ? 'flex' : 'none';

  if(isNumeric){
    const hInput = document.getElementById(`numstart-h-${catKey}`);
    if(hInput) setTimeout(() => hInput.focus(), 60);
    updateNumericDurationPreview(catKey);
  } else {
    const startInput = document.getElementById(`manualstart-${catKey}`);
    if(startInput) setTimeout(() => startInput.focus(), 60);
  }
}

/**
 * جلب تفاصيل نهاية آخر نشاط مسجل في اليوم (دراسة، استراحة، أو نوم)
 */
function getLastActivityInfo(targetDateKey){
  const dKey = targetDateKey || currentDayKey || todayKey();
  let latestSession = null;
  let latestEndTime = null;
  let latestCatLabel = '';

  const day = DATA.days && DATA.days[dKey];
  if(day){
    CAT_ORDER.forEach(catKey => {
      const arr = day[CATS[catKey].arrayKey] || [];
      arr.forEach(s => {
        if(s.end){
          const t = new Date(s.end).getTime();
          if(!latestEndTime || t > latestEndTime){
            latestEndTime = t;
            latestSession = s;
            latestCatLabel = CATS[catKey].label;
          }
        }
      });
    });
  }

  // إذا لم نجد في هذا اليوم وكان اليوم الحالي، نبحث في اليوم السابق كاحتياط
  if(!latestSession){
    const prevDate = new Date(dKey + 'T12:00:00');
    prevDate.setDate(prevDate.getDate() - 1);
    const prevKey = todayKey(prevDate);
    const prevDay = DATA.days && DATA.days[prevKey];
    if(prevDay){
      CAT_ORDER.forEach(catKey => {
        const arr = prevDay[CATS[catKey].arrayKey] || [];
        arr.forEach(s => {
          if(s.end){
            const t = new Date(s.end).getTime();
            if(!latestEndTime || t > latestEndTime){
              latestEndTime = t;
              latestSession = s;
              latestCatLabel = CATS[catKey].label;
            }
          }
        });
      });
    }
  }

  if(!latestSession || !latestSession.end) return null;
  const endDate = new Date(latestSession.end);
  const hours = endDate.getHours();
  const minutes = endDate.getMinutes();
  const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const period = hours >= 12 ? 'م' : 'ص';
  const h12 = hours % 12 || 12;
  const display = `${h12}:${String(minutes).padStart(2, '0')} ${period}`;

  return {
    time24,
    hours,
    minutes,
    h12,
    period,
    label: latestCatLabel,
    display,
    iso: latestSession.end
  };
}

/**
 * زر: "🔄 من آخر نشاط" — يملأ وقت البداية تلقائياً من نهاية آخر نشاط قام به المستخدم
 */
function fillFromLastActivity(catKey){
  const last = getLastActivityInfo(currentDayKey);
  if(!last){
    toast('ماكو نشاط مسجل سابقاً لجلب وقته', 'info');
    return;
  }

  // 1. ملء في الوضع الافتراضي (الساعة)
  const clockInput = document.getElementById(`manualstart-${catKey}`);
  if(clockInput) clockInput.value = last.time24;

  // 2. ملء في وضع الأرقام (ساعات ودقائق)
  const numStartH = document.getElementById(`numstart-h-${catKey}`);
  const numStartM = document.getElementById(`numstart-m-${catKey}`);
  const numStartPeriod = document.getElementById(`numstart-p-${catKey}`);
  if(numStartH){
    numStartH.value = last.h12;
    if(numStartM) numStartM.value = String(last.minutes).padStart(2, '0');
    if(numStartPeriod) numStartPeriod.value = last.period;
    updateNumericDurationPreview(catKey);
  }

  toast(`تم ضبط البداية من نهاية ${last.label}: ${last.display} ✓`, 'success');
}

/**
 * زر: "⏱️ الآن" — يملأ وقت النهاية بالوقت الحالي فوراً
 */
function fillCurrentTime(catKey){
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const period = hours >= 12 ? 'م' : 'ص';
  const h12 = hours % 12 || 12;

  // 1. ملء في الوضع الافتراضي
  const clockInput = document.getElementById(`manualend-${catKey}`);
  if(clockInput) clockInput.value = time24;

  // 2. ملء في وضع الأرقام
  const numEndH = document.getElementById(`numend-h-${catKey}`);
  const numEndM = document.getElementById(`numend-m-${catKey}`);
  const numEndPeriod = document.getElementById(`numend-p-${catKey}`);
  if(numEndH){
    numEndH.value = h12;
    if(numEndM) numEndM.value = String(minutes).padStart(2, '0');
    if(numEndPeriod) numEndPeriod.value = period;
    updateNumericDurationPreview(catKey);
  }

  toast(`تم ضبط النهاية على الوقت الحالي: ${h12}:${String(minutes).padStart(2, '0')} ${period} ✓`, 'info');
}

/**
 * حساب ومعاينة المدة لحظياً عند كتابة الأرقام
 */
function updateNumericDurationPreview(catKey){
  const startHInput = document.getElementById(`numstart-h-${catKey}`);
  const startMInput = document.getElementById(`numstart-m-${catKey}`);
  const startPInput = document.getElementById(`numstart-p-${catKey}`);
  const endHInput = document.getElementById(`numend-h-${catKey}`);
  const endMInput = document.getElementById(`numend-m-${catKey}`);
  const endPInput = document.getElementById(`numend-p-${catKey}`);
  const badgeEl = document.getElementById(`numcalc-${catKey}`);
  const textEl = document.getElementById(`numcalctext-${catKey}`);
  if(!textEl) return;

  const rawSh = startHInput ? parseInt(startHInput.value, 10) : NaN;
  const rawEh = endHInput ? parseInt(endHInput.value, 10) : NaN;

  if(isNaN(rawSh) || isNaN(rawEh)){
    textEl.textContent = 'اكتب ساعات ودقائق البداية والنهاية';
    if(badgeEl) badgeEl.classList.remove('active');
    return;
  }

  const sm = startMInput ? (parseInt(startMInput.value, 10) || 0) : 0;
  const em = endMInput ? (parseInt(endMInput.value, 10) || 0) : 0;
  const sp = startPInput ? startPInput.value : 'م';
  const ep = endPInput ? endPInput.value : 'م';

  let sh = rawSh >= 12 && rawSh <= 23 ? rawSh : ((rawSh % 12) + (sp === 'م' ? 12 : 0));
  let eh = rawEh >= 12 && rawEh <= 23 ? rawEh : ((rawEh % 12) + (ep === 'م' ? 12 : 0));

  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  let diff = endMins - startMins;
  let crossed = false;
  if(diff <= 0){
    diff += 24 * 60;
    crossed = true;
  }

  textEl.textContent = `⏱️ المدة المحسوبة: ${formatDuration(diff)} (${diff} دقيقة)${crossed ? ' — تمتد لليوم التالي 🌙' : ''}`;
  if(badgeEl) badgeEl.classList.add('active');
}

function submitManualEntry(catKey){
  const cat = CATS[catKey];
  const startInput = document.getElementById(`manualstart-${catKey}`);
  const endInput = document.getElementById(`manualend-${catKey}`);
  if(!startInput || !endInput || !startInput.value || !endInput.value){ toast('حدد وقت البداية والنهاية', 'error'); return; }
  const base = new Date(currentDayKey + 'T00:00:00');
  const [sh, sm] = startInput.value.split(':').map(Number);
  const [eh, em] = endInput.value.split(':').map(Number);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0);
  let end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0);
  let crossedMidnight = false;
  if(end <= start){ end = new Date(end.getTime() + 24*60*60*1000); crossedMidnight = true; }

  const day = ensureDay(DATA, currentDayKey);
  const prevMinutes = day[cat.arrayKey].reduce((s,x)=>s+x.minutes, 0);
  const minutes = Math.round((end - start) / 60000);
  const session = { id: uid(), start: start.toISOString(), end: end.toISOString(), minutes, details: '', source: 'manual' };
  day[cat.arrayKey].push(session);
  persist();
  renderAll();
  startInput.value = ''; endInput.value = '';
  toggleManualForm(catKey);
  toast(crossedMidnight ? `${cat.addedToast} (تمتد لليوم الجاي 🌙)` : cat.addedToast, 'success');
  if(catKey === 'study' && currentDayKey === todayKey()) checkGoalCelebration(prevMinutes, prevMinutes + minutes);
}

function submitNumericTimeEntry(catKey){
  const cat = CATS[catKey];
  const startHInput = document.getElementById(`numstart-h-${catKey}`);
  const startMInput = document.getElementById(`numstart-m-${catKey}`);
  const startPInput = document.getElementById(`numstart-p-${catKey}`);
  const endHInput = document.getElementById(`numend-h-${catKey}`);
  const endMInput = document.getElementById(`numend-m-${catKey}`);
  const endPInput = document.getElementById(`numend-p-${catKey}`);

  const rawSh = startHInput ? parseInt(startHInput.value, 10) : NaN;
  const rawEh = endHInput ? parseInt(endHInput.value, 10) : NaN;

  if(isNaN(rawSh)){
    toast('اكتب ساعة البداية (مثلاً: 2 أو 02)', 'error');
    if(startHInput) startHInput.focus();
    return;
  }
  if(isNaN(rawEh)){
    toast('اكتب ساعة النهاية (مثلاً: 8 أو 08)', 'error');
    if(endHInput) endHInput.focus();
    return;
  }

  const sm = startMInput ? (parseInt(startMInput.value, 10) || 0) : 0;
  const em = endMInput ? (parseInt(endMInput.value, 10) || 0) : 0;
  const sp = startPInput ? startPInput.value : 'م';
  const ep = endPInput ? endPInput.value : 'م';

  // معالجة 12 ساعة أو 24 ساعة بذكاء تام
  let sh = rawSh >= 12 && rawSh <= 23 ? rawSh : ((rawSh % 12) + (sp === 'م' ? 12 : 0));
  let eh = rawEh >= 12 && rawEh <= 23 ? rawEh : ((rawEh % 12) + (ep === 'م' ? 12 : 0));

  const base = new Date(currentDayKey + 'T00:00:00');
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0);
  let end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0);
  let crossedMidnight = false;
  if(end <= start){
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    crossedMidnight = true;
  }

  const minutes = Math.round((end - start) / 60000);
  if(minutes <= 0){
    toast('وقت البداية والنهاية متطابقان، يرجى التأكد من الوقت', 'error');
    return;
  }

  const day = ensureDay(DATA, currentDayKey);
  const prevMinutes = day[cat.arrayKey].reduce((s,x)=>s+x.minutes, 0);
  const session = {
    id: uid(),
    start: start.toISOString(),
    end: end.toISOString(),
    minutes,
    details: '',
    source: 'manual-numeric'
  };
  day[cat.arrayKey].push(session);
  persist();
  renderAll();

  if(startHInput) startHInput.value = '';
  if(startMInput) startMInput.value = '';
  if(endHInput) endHInput.value = '';
  if(endMInput) endMInput.value = '';
  toggleManualForm(catKey);

  toast(crossedMidnight ? `${cat.addedToast} (${formatDuration(minutes)} تمتد لليوم التالي 🌙)` : `${cat.addedToast} (${formatDuration(minutes)}) ✓`, 'success');
  if(catKey === 'study' && currentDayKey === todayKey()){
    checkGoalCelebration(prevMinutes, prevMinutes + minutes);
  }
}

// إتاحة الدوال على window للاستدعاء من أزرار HTML
window.setManualMode = setManualMode;
window.fillFromLastActivity = fillFromLastActivity;
window.fillCurrentTime = fillCurrentTime;
window.updateNumericDurationPreview = updateNumericDurationPreview;
window.submitManualEntry = submitManualEntry;
window.submitNumericTimeEntry = submitNumericTimeEntry;
window.toggleManualForm = toggleManualForm;

/* -------------------- قوائم الجلسات -------------------- */
function renderTrackerSection(catKey){
  const cat = CATS[catKey];
  const isDay = currentPeriod === 'day';
  const periodWord = { day: 'اليوم', week: 'هالأسبوع', month: 'هالشهر' }[currentPeriod];
  const sessions = getScopedView()[cat.arrayKey];
  const totalMin = sessions.reduce((s,x)=>s+x.minutes, 0);

  const totalEl = document.getElementById(`total-${catKey}`);
  let totalHtml = `<b class="num-inline">${formatDuration(totalMin)}</b> ${periodWord}`;
  if(catKey === 'break'){
    const brkSt = getBreakWarningStatus(totalMin);
    if(brkSt.active) totalHtml += ` <span class="stat-status-badge ${brkSt.badgeClass}">${brkSt.text}</span>`;
  } else if(catKey === 'sleep'){
    const slpSt = getSleepRatingStatus(totalMin);
    if(slpSt.active && slpSt.text) totalHtml += ` <span class="stat-status-badge ${slpSt.badgeClass}">${slpSt.text}</span>`;
    if(isDay && totalMin === 0 && DATA.days){
      const prevDate = new Date(currentDayKey + 'T12:00:00');
      prevDate.setDate(prevDate.getDate() - 1);
      const prevKey = todayKey(prevDate);
      const prevDay = DATA.days[prevKey];
      const overnight = (prevDay && prevDay.sleep || []).find(s => s && s.end && new Date(s.end).getTime() > new Date(currentDayKey + 'T00:00:00').getTime());
      if(overnight){
        totalHtml += ` <div style="font-size:0.75rem;margin-top:4px;color:var(--text-muted);font-weight:normal;">🌙 نوم ليلة البارحة: <b>${formatDuration(overnight.minutes)}</b> (مسجل في <a href="javascript:void(0)" onclick="currentDayKey='${prevKey}';renderDayNav();renderAll();" style="color:var(--primary);text-decoration:underline;">ليلة ${formatDayLabel(prevKey)}</a>)</div>`;
      }
    }
  }
  if(totalEl) totalEl.innerHTML = totalHtml;

  if(isDay){
    const isToday = currentDayKey === todayKey();
    const isRunning = DATA.activeTimer && DATA.activeTimer.category === catKey;
    const timerBox = document.getElementById(`timerbox-${catKey}`);
    const timerDisplay = document.getElementById(`timerdisplay-${catKey}`);
    const timerCaption = document.getElementById(`timercaption-${catKey}`);
    const controlsEl = document.getElementById(`timercontrols-${catKey}`);

    if(timerBox) timerBox.classList.toggle('running', !!isRunning);
    if(timerDisplay) timerDisplay.classList.toggle('running', !!isRunning);

    if(isRunning){
      const startT = DATA.activeTimer.start;
      const startDay = todayKey(new Date(startT));
      const isCrossDay = (startDay !== todayKey());
      if(timerDisplay) timerDisplay.textContent = formatStopwatch(getActiveElapsedSeconds(DATA.activeTimer));
      if(timerCaption){
        if(isCrossDay){
          timerCaption.textContent = `بدأ ${formatDayLabel(startDay)} الساعة ${formatTime(startT)} — مستمر لليوم (تقدر توقفه بأي وقت)`;
        } else {
          timerCaption.textContent = `بدأت الساعة ${formatTime(startT)} — حسب ساعة جهازك`;
        }
      }
      if(controlsEl) controlsEl.innerHTML = `
        <button class="btn btn-danger timer-btn" onclick="stopTimer('${catKey}')">${ICONS.stop}<span>${cat.endLabel}</span></button>
        <button class="btn btn-ghost btn-sm" onclick="cancelTimer('${catKey}')">إلغاء بدون حفظ</button>
      `;
    } else if(!isToday){
      if(timerDisplay) timerDisplay.textContent = '—:—:—';
      if(timerCaption) timerCaption.textContent = 'العداد الحي يشتغل بس لليوم — استخدم «إضافة يدوية» تحت لتسجيل وقت بهذا اليوم';
      if(controlsEl) controlsEl.innerHTML = `<button class="btn btn-secondary timer-btn" disabled>${ICONS.clock}<span>متوفر لليوم بس</span></button>`;
    } else {
      if(timerDisplay) timerDisplay.textContent = '00:00:00';
      if(timerCaption) timerCaption.textContent = DATA.activeTimer ? 'يوجد عداد آخر شغال حالياً' : 'اضغط ابدأ وراح يحسب الوقت أوتوماتيكياً';
      if(controlsEl) controlsEl.innerHTML = `
        <button class="btn btn-primary timer-btn" onclick="startTimer('${catKey}')" ${DATA.activeTimer ? 'disabled' : ''}>${ICONS.play}<span>${cat.startLabel}</span></button>
      `;
    }
  }

  const listEl = document.getElementById(`sessionlist-${catKey}`);
  if(!listEl) return;
  if(sessions.length === 0){
    listEl.innerHTML = `<div class="empty-state">${ICONS[cat.icon]}<div>${isDay ? cat.emptyLabel : `ما اكو جلسات مسجلة ${periodWord}`}</div></div>`;
  } else {
    const ordered = isDay ? sessions.slice().reverse() : sessions.slice().sort((a,b)=> new Date(b.start) - new Date(a.start));
    listEl.innerHTML = ordered.map(s => `
      <li class="session-item" data-cat="${catKey}">
        <span class="session-dot"></span>
        ${!isDay ? `<span class="day-tag">${formatDayLabel(s.dayKey)}</span>` : ''}
        <span class="session-time num-inline">${formatTimeRange(s.start, s.end)}</span>
        <span class="session-dur num-inline">${formatDuration(s.minutes)}</span>
        ${s.details ? `<span class="session-note-flag" title="فيها ملاحظة"></span>` : ''}
        <span class="session-spacer"></span>
        <span class="session-actions">
          <button class="icon-btn" title="التفاصيل" onclick="openDetailsModal('${catKey}','${s.id}','${s.dayKey || currentDayKey}')">${ICONS.edit}</button>
          <button class="icon-btn danger" title="حذف" onclick="deleteSession('${catKey}','${s.id}','${s.dayKey || currentDayKey}')">${ICONS.trash}</button>
        </span>
      </li>
    `).join('');
  }
}

function deleteSession(catKey, sessionId, dayKey){
  if(!confirm('تحذف هذي الجلسة؟')) return;
  const cat = CATS[catKey];
  const day = ensureDay(DATA, dayKey || currentDayKey);
  day[cat.arrayKey] = day[cat.arrayKey].filter(s => s.id !== sessionId);
  persist();
  renderAll();
  toast('تم الحذف', 'info');
}

/* -------------------- لوحة تفاصيل الجلسة -------------------- */
function toTimeInputValue(dateLike){
  const d = new Date(dateLike);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function openDetailsModal(catKey, sessionId, dayKey){
  dayKey = dayKey || currentDayKey;
  const cat = CATS[catKey];
  const day = ensureDay(DATA, dayKey);
  const session = day[cat.arrayKey].find(s => s.id === sessionId);
  if(!session) return;
  currentModalSession = { catKey, sessionId, dayKey };
  document.getElementById('modal-details-title').textContent = `تفاصيل ${cat.label}`;
  document.getElementById('modal-details-start').value = toTimeInputValue(session.start);
  document.getElementById('modal-details-end').value = toTimeInputValue(session.end);
  document.getElementById('modal-details-notes').value = session.details || '';
  document.getElementById('modal-details-duration').textContent = formatDuration(session.minutes);

  const dayInfoEl = document.getElementById('modal-details-day-info');
  if(dayInfoEl){
    const sStartDay = todayKey(new Date(session.start));
    const sEndDay = session.end ? todayKey(new Date(session.end)) : sStartDay;
    const isMultiDay = sStartDay !== sEndDay;
    const altDayKey = (dayKey === sStartDay && isMultiDay) ? sEndDay : (dayKey === sEndDay && isMultiDay) ? sStartDay : null;
    let html = `<span>📅 مسجلة في: <b>${formatDayLabel(dayKey)}</b>${isMultiDay ? ' (تمتد لليوم التالي 🌙)' : ''}</span>`;
    if(altDayKey){
      html += `<button type="button" class="btn btn-secondary btn-sm" onclick="moveCurrentSessionToDay('${altDayKey}')" style="font-size:0.78rem;padding:4px 8px;">نقل إلى ${formatDayLabel(altDayKey)}</button>`;
    }
    dayInfoEl.innerHTML = html;
    dayInfoEl.style.display = 'flex';
  }

  showModal('modal-details');
  setTimeout(() => document.getElementById('modal-details-notes').focus(), 250);
}

function moveCurrentSessionToDay(targetKey){
  if(!currentModalSession) return;
  const { catKey, sessionId, dayKey } = currentModalSession;
  if(dayKey === targetKey) return;
  const cat = CATS[catKey];
  const oldDay = ensureDay(DATA, dayKey);
  const sIndex = oldDay[cat.arrayKey].findIndex(s => s.id === sessionId);
  if(sIndex === -1) return;
  const [session] = oldDay[cat.arrayKey].splice(sIndex, 1);
  const newDay = ensureDay(DATA, targetKey);
  newDay[cat.arrayKey].push(session);
  currentModalSession.dayKey = targetKey;
  persist();
  renderAll();
  openDetailsModal(catKey, sessionId, targetKey);
  toast(`تم نقل الجلسة إلى سجل ${formatDayLabel(targetKey)} ✓`, 'success');
}
window.moveCurrentSessionToDay = moveCurrentSessionToDay;

function saveDetailsModal(){
  if(!currentModalSession) return;
  const { catKey, sessionId, dayKey } = currentModalSession;
  const cat = CATS[catKey];
  const day = ensureDay(DATA, dayKey || currentDayKey);
  const session = day[cat.arrayKey].find(s => s.id === sessionId);
  if(!session) return;

  const startVal = document.getElementById('modal-details-start').value;
  const endVal = document.getElementById('modal-details-end').value;
  const notes = document.getElementById('modal-details-notes').value;

  if(startVal && endVal){
    const base = new Date(session.start);
    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = endVal.split(':').map(Number);
    const newStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0);
    let newEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0);
    if(newEnd <= newStart) newEnd = new Date(newEnd.getTime() + 24*60*60*1000); // يمتد لليوم الجاي (مثلاً نوم بالليل)
    session.start = newStart.toISOString();
    session.end = newEnd.toISOString();
    session.minutes = Math.round((newEnd - newStart) / 60000);
  }
  session.details = notes.trim();
  persist();
  renderAll();
  closeModal('modal-details');
  toast('تم الحفظ ✓', 'success');
}

function deleteSessionFromModal(){
  if(!currentModalSession) return;
  const { catKey, sessionId, dayKey } = currentModalSession;
  closeModal('modal-details');
  deleteSession(catKey, sessionId, dayKey);
}

/* -------------------- لوحة تفاصيل اليوم الكاملة (من الأسبوع/الشهر) -------------------- */
function openDayDetailModal(dayKey){
  currentDayModalKey = dayKey;
  const day = DATA.days[dayKey] || { study: [], breaks: [], sleep: [], achievements: [] };
  const stats = computeStats(day, DATA.settings);
  const brkSt = getBreakWarningStatus(stats.breakMinutes);
  const slpSt = getSleepRatingStatus(stats.sleepMinutes);

  document.getElementById('modal-day-title').textContent = formatDayLabel(dayKey);

  const statsHtml = `
    <div class="day-modal-stats">
      <div class="day-modal-stat"><span class="num-inline">${formatDuration(stats.studyMinutes)}</span><span>قراءة</span></div>
      <div class="day-modal-stat ${brkSt.active ? brkSt.cardClass : ''}"><span class="num-inline" style="${brkSt.active ? `color:${brkSt.color};font-weight:bold;` : ''}">${formatDuration(stats.breakMinutes)}</span><span>استراحة ${brkSt.active ? `(${brkSt.text})` : ''}</span></div>
      <div class="day-modal-stat ${slpSt.active && slpSt.cardClass ? slpSt.cardClass : ''}"><span class="num-inline" style="${slpSt.active && slpSt.color ? `color:${slpSt.color};font-weight:bold;` : ''}">${formatDuration(stats.sleepMinutes)}</span><span>نوم ${slpSt.active && slpSt.text ? `(${slpSt.text})` : ''}</span></div>
      <div class="day-modal-stat"><span class="num">${stats.percentage}%</span><span>إنجاز</span></div>
      <div class="day-modal-stat"><span class="num">${stats.points}</span><span>نقطة</span></div>
    </div>`;

  const sectionsHtml = CAT_ORDER.map(catKey => {
    const cat = CATS[catKey];
    const sessions = (day[cat.arrayKey] || []).slice().sort((a,b) => new Date(a.start) - new Date(b.start));
    return `
      <div class="day-modal-section">
        <div class="day-modal-section-title">${ICONS[cat.icon]}<span>${cat.label}</span></div>
        ${sessions.length === 0 ? `<div class="empty-state-mini">ما اكو</div>` : `<ul class="session-list">${sessions.map(s => `
          <li class="session-item" data-cat="${catKey}">
            <span class="session-dot"></span>
            <span class="session-time num-inline">${formatTimeRange(s.start, s.end)}</span>
            <span class="session-dur num-inline">${formatDuration(s.minutes)}</span>
            ${s.details ? `<span class="session-note-flag"></span>` : ''}
            <span class="session-spacer"></span>
            <span class="session-actions">
              <button class="icon-btn" title="التفاصيل" onclick="openDetailsModal('${catKey}','${s.id}','${dayKey}')">${ICONS.edit}</button>
              <button class="icon-btn danger" title="حذف" onclick="deleteSession('${catKey}','${s.id}','${dayKey}')">${ICONS.trash}</button>
            </span>
          </li>`).join('')}</ul>`}
      </div>`;
  }).join('');

  const achievements = day.achievements || [];
  const achieveHtml = `
    <div class="day-modal-section">
      <div class="day-modal-section-title">${ICONS.trophy}<span>الإنجازات</span></div>
      ${achievements.length === 0 ? `<div class="empty-state-mini">ما اكو</div>` : `<ul class="achieve-list">${achievements.map(a => `
        <li class="achieve-item ${a.done ? 'done' : ''}">
          <button class="achieve-check ${a.done ? 'done' : ''}" onclick="toggleAchievement('${a.id}','${dayKey}')">${ICONS.check}</button>
          <span class="achieve-text">${escapeHtml(a.text)}</span>
          <button class="icon-btn danger" onclick="deleteAchievement('${a.id}','${dayKey}')">${ICONS.trash}</button>
        </li>`).join('')}</ul>`}
    </div>`;

  document.getElementById('modal-day-body').innerHTML = statsHtml + sectionsHtml + achieveHtml;
  showModal('modal-day');
}

function closeDayModal(){
  currentDayModalKey = null;
  closeModal('modal-day');
}

/* -------------------- الإنجازات -------------------- */
function addAchievement(){
  const input = document.getElementById('achieve-input');
  const text = input.value.trim();
  if(!text) return;
  const day = ensureDay(DATA, currentDayKey);
  day.achievements.push({ id: uid(), text, done: false, createdAt: new Date().toISOString() });
  persist();
  renderAchievements();
  renderStats();
  input.value = '';
  input.focus();
}

function toggleAchievement(id, dayKey){
  dayKey = dayKey || currentDayKey;
  const day = ensureDay(DATA, dayKey);
  const a = day.achievements.find(x => x.id === id);
  if(!a) return;
  a.done = !a.done;

  // مزامنة مع StudyVault — إذا كان الإنجاز مرتبط بمحاضرة أو صفحات ملزمة
  if (a.studyVaultRef) {
    if (a.studyVaultRef.type === 'material_pages') {
      if (typeof svMarkMaterialPageDone === 'function') {
        if (a.done) {
          svMarkMaterialPageDone(a.studyVaultRef.subjectId, a.studyVaultRef.materialId, a.studyVaultRef.targetPage, a.studyVaultRef.fromPage);
          toast(`✓ تم تحديث الملزمة في StudyVault إلى ص ${a.studyVaultRef.targetPage}`, 'success');
        } else if (typeof svUnmarkMaterialPageDone === 'function') {
          svUnmarkMaterialPageDone(a.studyVaultRef.subjectId, a.studyVaultRef.materialId, a.studyVaultRef.targetPage, a.studyVaultRef.prevPage);
        }
      }
    } else if (typeof svMarkLectureDone === 'function') {
      if (a.done) {
        svMarkLectureDone(a.studyVaultRef.subjectId, a.studyVaultRef.chapter, a.studyVaultRef.lecture);
        toast(`✓ تم تعليم المحاضرة كمنجزة في StudyVault`, 'success');
      } else if (typeof svUnmarkLectureDone === 'function') {
        svUnmarkLectureDone(a.studyVaultRef.subjectId, a.studyVaultRef.chapter, a.studyVaultRef.lecture);
      }
    }
  }

  persist();
  renderAchievements();
  renderStats();
  if (typeof renderSvWeeklyGoalsWidget === 'function') renderSvWeeklyGoalsWidget();

  const stats = computeStats(day, DATA.settings);
  if(a.done && stats.totalCount > 0 && stats.doneCount === stats.totalCount){
    confettiBurst();
    toast('ما شاء الله! خلّصت كل إنجازات اليوم 🎉', 'success');
  }
}

function deleteAchievement(id, dayKey){
  dayKey = dayKey || currentDayKey;
  const day = ensureDay(DATA, dayKey);
  day.achievements = day.achievements.filter(x => x.id !== id);
  persist();
  renderAchievements();
  renderStats();
}

function renderAchievements(){
  const isDay = currentPeriod === 'day';
  const periodWord = { day: 'اليوم', week: 'هالأسبوع', month: 'هالشهر' }[currentPeriod];
  const view = getScopedView();
  const achievements = view.achievements;
  const listEl = document.getElementById('achieve-list');

  if(achievements.length === 0){
    listEl.innerHTML = `<div class="empty-state">${ICONS.trophy}<div>${isDay ? 'شنو تريد تنجز اليوم؟ ضيف أول هدف وابدأ 💪' : `ما اكو أهداف مسجلة ${periodWord}`}</div></div>`;
  } else {
    listEl.innerHTML = achievements.map(a => `
      <li class="achieve-item ${a.done ? 'done' : ''}">
        <button class="achieve-check ${a.done ? 'done' : ''}" onclick="toggleAchievement('${a.id}','${a.dayKey || currentDayKey}')" title="تم الإنجاز؟">${ICONS.check}</button>
        ${!isDay ? `<span class="day-tag">${formatDayLabel(a.dayKey)}</span>` : ''}
        ${a.studyVaultRef ? `<span class="sv-item-tag" style="color:${a.studyVaultRef.color || 'var(--primary)'};border-color:${a.studyVaultRef.color || 'var(--primary)'}">${a.studyVaultRef.type === 'material_pages' ? '📖 ' + escapeHtml(a.studyVaultRef.subjectName || '') + ' | ' + escapeHtml(a.studyVaultRef.materialName || 'ملزمة') : '📚 ' + escapeHtml(a.studyVaultRef.subjectName || 'StudyVault')}</span>` : ''}
        <span class="achieve-text">${escapeHtml(a.text)}</span>
        <button class="icon-btn danger" title="حذف" onclick="deleteAchievement('${a.id}','${a.dayKey || currentDayKey}')">${ICONS.trash}</button>
      </li>
    `).join('');
  }
  const stats = view.stats;
  const fillEl = document.getElementById('progress-fill');
  if(fillEl) fillEl.style.width = stats.percentage + '%';
  animateCountUp(document.getElementById('progress-percent-num'), stats.percentage, { suffix: '%' });
  const hintEl = document.getElementById('progress-hint');
  if(hintEl) hintEl.textContent = stats.totalCount > 0 ? `أنجزت ${stats.doneCount} من ${stats.totalCount}` : (isDay ? 'ضيف أهدافك اليوم عشان نحسب النسبة' : `ما اكو أهداف ${periodWord}`);
  if (typeof renderSvWeeklyGoalsWidget === 'function') renderSvWeeklyGoalsWidget();
  animateCountUp(document.getElementById('points-value'), stats.points);
  updateAdminIndexAchieveButton();
}

function updateAdminIndexAchieveButton(){
  const btn = document.getElementById('btn-toggle-index-achieve');
  const txt = document.getElementById('btn-toggle-index-achieve-text');
  const icon = document.getElementById('btn-toggle-index-achieve-icon');
  if(!btn) return;
  const isHidden = !!(DATA.settings && DATA.settings.hideViewerAchievements);
  if(isHidden){
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    btn.style.color = '#ef4444';
    btn.style.background = 'rgba(239, 68, 68, 0.12)';
    if(txt) txt.textContent = 'بالاندكس: مخفية 🔒';
    if(icon) icon.innerHTML = (window.ICONS && window.ICONS.eyeOff) ? window.ICONS.eyeOff : '🔒';
    btn.title = 'قسم الإنجازات مخفي حالياً عن زوار صفحة الاندكس — اضغط لإظهاره للزوار';
  } else {
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.borderColor = 'rgba(34, 197, 94, 0.5)';
    btn.style.color = '#22c55e';
    btn.style.background = 'rgba(34, 197, 94, 0.12)';
    if(txt) txt.textContent = 'بالاندكس: معروضة 👁️';
    if(icon) icon.innerHTML = (window.ICONS && window.ICONS.eye) ? window.ICONS.eye : '👁️';
    btn.title = 'قسم الإنجازات معروض حالياً لزوار صفحة الاندكس — اضغط لإخفائه عن الزوار';
  }
}

function toggleIndexAchievementsVisibility(){
  if(!DATA.settings) DATA.settings = {};
  DATA.settings.hideViewerAchievements = !DATA.settings.hideViewerAchievements;
  const isHidden = DATA.settings.hideViewerAchievements;

  const chk = document.getElementById('setting-hide-viewer-achieve');
  if(chk) chk.checked = isHidden;

  persist();
  updateAdminIndexAchieveButton();
  toast(isHidden ? 'تم إخفاء قسم الإنجازات في الاندكس (مخفي عن الزوار) 🔒' : 'تم إظهار قسم الإنجازات في الاندكس للزوار 👁️', 'ok');
}

/* -------------------- الإعدادات: المظهر -------------------- */
function selectTheme(themeName){
  DATA.settings.theme = themeName;
  applyTheme(DATA.settings);
  persist();
  renderSettingsAppearance();
}

function renderSettingsAppearance(){
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.theme === DATA.settings.theme);
  });
  const customBox = document.getElementById('custom-theme-box');
  if(customBox) customBox.style.display = DATA.settings.theme === 'custom' ? 'flex' : 'none';
  const primaryInput = document.getElementById('custom-primary');
  const secondaryInput = document.getElementById('custom-secondary');
  if(primaryInput) primaryInput.value = DATA.settings.customTheme.primary;
  if(secondaryInput) secondaryInput.value = DATA.settings.customTheme.secondary;
  document.querySelectorAll('.mode-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === DATA.settings.customTheme.mode);
  });
}

function updateCustomColor(field, value){
  DATA.settings.customTheme[field] = value;
  if(DATA.settings.theme === 'custom') applyTheme(DATA.settings);
  persist();
}

function setCustomMode(mode){
  DATA.settings.customTheme.mode = mode;
  if(DATA.settings.theme === 'custom') applyTheme(DATA.settings);
  persist();
  renderSettingsAppearance();
}

/* -------------------- الإعدادات: الأهداف والنقاط (أهداف متدرجة) -------------------- */
let goalTiersDraft = []; // مصفوفة أرقام (ساعات) قيد التعديل بنافذة الإعدادات، قبل الضغط على حفظ

function renderGoalTiersInputs(){
  goalTiersDraft = normalizeGoalTiers(DATA.settings).map(m => +(m/60).toFixed(2));
  renderGoalTiersList();
}

function renderGoalTiersList(){
  const wrap = document.getElementById('goal-tiers-list');
  if(!wrap) return;
  wrap.innerHTML = goalTiersDraft.map((hours, i) => `
    <div class="goal-tier-row">
      <span class="goal-tier-badge">${i+1}</span>
      <input type="number" step="0.5" min="0.5" class="form-input" value="${hours}" oninput="updateGoalTierDraft(${i}, this.value)" aria-label="الهدف ${i+1} بالساعات">
      <span class="goal-tier-unit">ساعة</span>
      ${goalTiersDraft.length > 1 ? `<button type="button" class="icon-btn danger" title="حذف هذا الهدف" onclick="removeGoalTierInput(${i})"><span data-icon="x"></span></button>` : ''}
    </div>
  `).join('');
  hydrateIcons(wrap);
}

function updateGoalTierDraft(index, value){
  const n = parseFloat(value);
  goalTiersDraft[index] = isNaN(n) ? goalTiersDraft[index] : n;
}

function addGoalTierInput(){
  if(goalTiersDraft.length >= 8){ toast('وصلت لأقصى عدد أهداف ممكن (8)', 'info'); return; }
  const last = goalTiersDraft.length ? goalTiersDraft[goalTiersDraft.length-1] : 6;
  goalTiersDraft.push(+(last + 2).toFixed(2));
  renderGoalTiersList();
}

function removeGoalTierInput(index){
  if(goalTiersDraft.length <= 1) return;
  goalTiersDraft.splice(index, 1);
  renderGoalTiersList();
}

function saveGoalsSettings(){
  const ppm = parseFloat(document.getElementById('input-points-min').value);
  const ppa = parseFloat(document.getElementById('input-points-achieve').value);
  const name = document.getElementById('input-student-name').value.trim();

  const cleanMinutes = goalTiersDraft
    .map(h => Math.max(15, Math.round((isNaN(h) ? 0 : h) * 60)))
    .filter(m => m > 0);
  const uniqueSorted = Array.from(new Set(cleanMinutes)).sort((a,b) => a-b);
  DATA.settings.goalTiers = uniqueSorted.length ? uniqueSorted : [360];
  DATA.settings.dailyGoalMinutes = DATA.settings.goalTiers[0];

  DATA.settings.pointsPerMinute = isNaN(ppm) ? 1 : ppm;
  DATA.settings.pointsPerAchievement = isNaN(ppa) ? 20 : ppa;
  if(name) DATA.settings.studentName = name;

  const dayEndVal = document.getElementById('input-dayend-time').value;
  if(dayEndVal){
    const [dh, dm] = dayEndVal.split(':').map(Number);
    DATA.settings.dayEndMinutes = ((dh * 60 + dm) % (24*60) + 24*60) % (24*60);
  }

  const hideViewerAchieveChk = document.getElementById('setting-hide-viewer-achieve');
  if(hideViewerAchieveChk) DATA.settings.hideViewerAchievements = hideViewerAchieveChk.checked;

  persist();
  renderAll();
  renderBrandName();
  renderGoalTiersInputs();
  renderHeaderClock();
  toast('تم حفظ الإعدادات ✓', 'success');
}

/* -------------------- الإعدادات: المشاركة عبر Firebase -------------------- */
function renderSyncSettingsUI(){
  const cfg = getEffectiveFirebaseConfig();
  const noticeEl = document.getElementById('gh-detect-notice');
  if(noticeEl) noticeEl.style.display = cfg ? 'none' : 'flex';
  const linkEl = document.getElementById('viewer-link-text');
  if(linkEl) linkEl.textContent = getViewerUrl();
}

async function loadFromCloudNow(){
  const cfg = getEffectiveFirebaseConfig();
  if(!cfg){ toast('ما لكينا إعدادات Firebase بالملف — شوف تبويب المشاركة', 'error'); return; }
  try{
    const remote = await fetchRemoteDataFresh(cfg);
    if(!remote){ toast('ما اكو بيانات محفوظة على السحابة بعد', 'info'); return; }
    if(!confirm('تحميل آخر نسخة محفوظة بالسحابة؟ راح تستبدل بيانات هذا الجهاز الحالية.')) return;
    DATA = mergeWithDefaults(remote);
    saveData(DATA);
    applyTheme(DATA.settings);
    renderAll();
    renderBrandName();
    renderSettingsAppearance();
    toast('تم تحميل البيانات من السحابة ✓', 'success');
  }catch(e){
    console.error(e);
    const msg = String(e && e.message || e);
    if(msg === 'NOT_FOUND'){ toast('ما اكو بيانات محفوظة على السحابة بعد', 'info'); }
    else if(msg === 'BRIDGE_NOT_READY'){ toast('مكتبة Firebase ما حمّلت بعد — انتظر ثانيتين وحاول مرة ثانية', 'error'); }
    else if(msg === 'INIT_FAILED'){ toast('إعدادات Firebase بالملف غير صحيحة الصيغة', 'error'); }
    else { toast(`فشل التحميل: ${msg}`, 'error'); }
  }
}

async function copyViewerLink(){
  const url = getViewerUrl();
  const ok = await copyToClipboard(url);
  toast(ok ? 'تم نسخ رابط المشاهدة ✓' : url, ok ? 'success' : 'info');
}

/* -------------------- الإعدادات: متقدم (قفل + بيانات) -------------------- */
function saveAdminPin(){
  const val = document.getElementById('input-admin-pin').value.trim();
  const local = loadLocalConfig();
  local.adminPin = val || null;
  saveLocalConfig(local);
  toast(val ? 'تم تفعيل قفل الدخول ✓' : 'تم إلغاء قفل الدخول', 'success');
}

function exportFullSystemBackup() {
  const svData = (() => {
    try {
      const raw = localStorage.getItem('sv_state_v3');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const ftSessions = (() => {
    try {
      const raw = localStorage.getItem('ft_sessions_v1');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const ftBadges = (() => {
    try {
      const raw = localStorage.getItem('ft_badges_v1');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const ftRankOverride = localStorage.getItem('ft_rank_override_v1') || null;

  const fullBackup = {
    backupType: 'injaz_full_system_v1',
    exportedAt: new Date().toISOString(),
    injaz: DATA,
    studyvault: svData,
    focusTracker: {
      sessions: ftSessions,
      badges: ftBadges,
      rankOverride: ftRankOverride
    }
  };

  const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `injaz-complete-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('تم تنزيل نسخة احتياطية شاملة لكل شيء ✓', 'success');
}

function importFullSystemBackupFile(fileInput) {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== 'object') throw new Error('الملف فارغ أو غير صالح');

      let restoredCount = 0;

      // 1. Injaz data
      if (parsed.injaz) {
        DATA = mergeWithDefaults(parsed.injaz);
        saveData(DATA);
        applyTheme(DATA.settings);
        renderAll();
        renderBrandName();
        renderSettingsAppearance();
        restoredCount++;
      } else if (parsed.days || parsed.sessions || parsed.settings) {
        DATA = mergeWithDefaults(parsed);
        saveData(DATA);
        applyTheme(DATA.settings);
        renderAll();
        renderBrandName();
        renderSettingsAppearance();
        restoredCount++;
      }

      // 2. StudyVault data
      if (parsed.studyvault && typeof parsed.studyvault === 'object') {
        localStorage.setItem('sv_state_v3', JSON.stringify(parsed.studyvault));
        if (window.FirebaseSync && typeof window.FirebaseSync.write === 'function') {
          window.FirebaseSync.write('studyvault_data', parsed.studyvault).catch(() => {});
        }
        restoredCount++;
      }

      // 3. FocusTracker data
      if (parsed.focusTracker) {
        if (parsed.focusTracker.sessions) {
          localStorage.setItem('ft_sessions_v1', JSON.stringify(parsed.focusTracker.sessions));
        }
        if (parsed.focusTracker.badges) {
          localStorage.setItem('ft_badges_v1', JSON.stringify(parsed.focusTracker.badges));
        }
        if (parsed.focusTracker.rankOverride) {
          localStorage.setItem('ft_rank_override_v1', parsed.focusTracker.rankOverride);
        }
        restoredCount++;
      }

      if (restoredCount === 0) {
        throw new Error('لم يتم العثور على بيانات صالحة في الملف');
      }

      toast('تم استرجاع النسخة الاحتياطية الشاملة بنجاح ✓', 'success');
    } catch (err) {
      toast('فشل الاستيراد: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

function exportData(){
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `injaz-backup-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('تم تحميل نسخة احتياطية', 'success');
}

function importDataFile(fileInput){
  const file = fileInput.files && fileInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const parsed = JSON.parse(e.target.result);
      if(!parsed || typeof parsed !== 'object') throw new Error('bad format');
      DATA = mergeWithDefaults(parsed);
      saveData(DATA);
      applyTheme(DATA.settings);
      renderAll();
      renderBrandName();
      renderSettingsAppearance();
      toast('تم استيراد البيانات بنجاح ✓', 'success');
    }catch(err){
      toast('الملف غير صالح، تأكد إنه نسخة احتياطية صحيحة', 'error');
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

function resetAllData(){
  if(!confirm('متأكد تريد تصفير كل البيانات؟ هذا الإجراء ما ينرجع.')) return;
  DATA = defaultData();
  saveData(DATA);
  applyTheme(DATA.settings);
  renderAll();
  renderBrandName();
  closeModal('modal-settings');
  toast('تم تصفير البيانات', 'info');
}

/* -------------------- قفل الدخول (PIN) -------------------- */
function checkPinLock(){
  const local = loadLocalConfig();
  const overlay = document.getElementById('lock-overlay');
  if(!local.adminPin){ overlay.style.display = 'none'; return; }
  if(sessionStorage.getItem('injaz_unlocked') === '1'){ overlay.style.display = 'none'; return; }
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('lock-pin-input').focus(), 200);
}

function submitPinUnlock(){
  const local = loadLocalConfig();
  const val = document.getElementById('lock-pin-input').value;
  if(val && val === local.adminPin){
    sessionStorage.setItem('injaz_unlocked', '1');
    document.getElementById('lock-overlay').style.display = 'none';
  } else {
    toast('الرمز غير صحيح', 'error');
    document.getElementById('lock-pin-input').value = '';
  }
}

/* -------------------- اللوحات المنبثقة -------------------- */
function showModal(id){
  document.getElementById(id).classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal(id){
  document.getElementById(id).classList.remove('show');
  document.body.style.overflow = '';
}

function openSettings(tab){
  renderSettingsAppearance();
  renderSyncSettingsUI();
  renderGoalTiersInputs();
  const dayEndInput = document.getElementById('input-dayend-time');
  if(dayEndInput){
    const mins = DATA.settings.dayEndMinutes || 0;
    dayEndInput.value = `${pad2(Math.floor(mins/60))}:${pad2(mins%60)}`;
  }
  document.getElementById('input-points-min').value = DATA.settings.pointsPerMinute;
  document.getElementById('input-points-achieve').value = DATA.settings.pointsPerAchievement;
  document.getElementById('input-student-name').value = DATA.settings.studentName;
  const hideViewerAchieveChk = document.getElementById('setting-hide-viewer-achieve');
  if(hideViewerAchieveChk) hideViewerAchieveChk.checked = !!DATA.settings.hideViewerAchievements;
  const local = loadLocalConfig();
  document.getElementById('input-admin-pin').value = local.adminPin || '';
  switchSettingsTab(tab || 'appearance');
  showModal('modal-settings');
}

function renderAdminRankStylesGallery() {
  const gallery = document.getElementById('adminRankStylesGallery');
  if (!gallery || !window.RankSvgs || !window.RankSvgs.TIERS) return;

  const tiers = window.RankSvgs.TIERS;
  gallery.innerHTML = tiers.map(tier => {
    const selected = window.RankSvgs.getSelectedVariant(tier.key);
    const variants = window.RankSvgs.getAllVariants(tier.key);

    const variantsHtml = variants.map(v => {
      const isSel = (v.id === selected);
      const svgStr = v.svg(52);
      const fxClass = ['platinum','diamond','elite','champion','unreal','machine'].includes(tier.key) ? `fx-${tier.key}` : '';
      const fxDecor = (window.RankSvgs && window.RankSvgs.getDecor) ? window.RankSvgs.getDecor(tier.key) : '';
      return `
      <div class="variant-card ${isSel ? 'active' : ''}" data-tier="${tier.key}" data-variant="${v.id}" style="--tier-color:${tier.color};">
        ${isSel ? '<span class="variant-active-badge">✓ مفعّل</span>' : ''}
        <div class="variant-preview ${fxClass}">${fxDecor}${svgStr}</div>
        <div class="variant-title">${escapeHtml(v.name)}</div>
        <div class="variant-desc">${escapeHtml(v.desc)}</div>
      </div>`;
    }).join('');

    return `
    <div class="tier-style-card" style="border-right: 3px solid ${tier.color};">
      <div class="tier-style-head">
        <div class="tier-style-title" style="color:${tier.color};">
          <span>${tier.arName} (${tier.label})</span>
        </div>
        <span class="tier-style-badge">التصميم المختار: شكل ${selected}</span>
      </div>
      <div class="tier-variants-grid">
        ${variantsHtml}
      </div>
    </div>`;
  }).join('');

  gallery.querySelectorAll('.variant-card').forEach(card => {
    card.addEventListener('click', () => {
      const tierKey = card.dataset.tier;
      const vId = parseInt(card.dataset.variant, 10);
      window.RankSvgs.setSelectedVariant(tierKey, vId);
      renderAdminRankStylesGallery();
      if (window.FocusTrackerBadge && window.FocusTrackerBadge.refresh) {
        window.FocusTrackerBadge.refresh();
      }
      toast(`تم تفعيل شكل ${vId} لرتبة ${tierKey} بنجاح ✓`);
    });
  });
}

function switchSettingsTab(tab){
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.settings-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${tab}`));
  if (tab === 'rank-styles') {
    renderAdminRankStylesGallery();
  }
}

/* -------------------- الرسم الشامل -------------------- */
function renderAll(){
  renderStats();
  renderTimeline();
  renderJoker();
  renderTrackerSection('study');
  renderTrackerSection('break');
  renderTrackerSection('sleep');
  renderAchievements();
  renderSyncStatusUI();
  if(currentDayModalKey) openDayDetailModal(currentDayModalKey);
}

/* ============================================================
   نظام إشعارات وتنبيهات الانقطاع والاستراحة التصاعدية
   - 30 دقيقة: تذكير لطيف لاستعادة النشاط ☕
   - 60 دقيقة: تنبيه أشد غير متهاون للعودة للكتاب ⚠️
   - 90 دقيقة: تنبيه مشدد وجاد لكسر التسويف 🚨
   - 120 دقيقة (ساعتان): تحذير شديد وقاطع لحفظ اليوم 🛑
   - وكل 30 دقيقة بعد ذلك: تنبيه تصاعدي صارم
   ============================================================ */
let notifSoundEnabled = localStorage.getItem('injaz_notif_sound') !== 'false';
let notifInAppEnabled = localStorage.getItem('injaz_notif_inapp') !== 'false';
let inactivityMilestonesTriggered = {};
let lastStudyActivityTimestamp = Date.now();
let inactivityHeartbeatInterval = null;

let phoneCallAudioCtx = null;
let phoneCallTimeouts = [];
let phoneCallIsRinging = false;

/**
 * محاكي رنين مكالمة هاتفية عاجلة للتحذير من استراحة الساعتين
 * "اريد استراحه ساعتين مو بس انذار اريد يطلع صوت وياه شلون المكالمه تحذير قوي يعني بس الصوت مو عالي"
 * نغمتان كلاسيكيتان متوافقتان (440Hz + 480Hz) مثل رنين الهاتف الأرضي/المحمول
 * بصوت مريح وهادئ الحجم (gain: 0.08) غير مؤذٍ للأذن، لكنه واضح ومستمر ومتكرر
 */
function playPhoneCallRingtone(){
  try {
    stopPhoneCallRingtone(false);
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;

    phoneCallAudioCtx = new AudioCtx();
    phoneCallIsRinging = true;

    const masterGain = phoneCallAudioCtx.createGain();
    masterGain.gain.setValueAtTime(1, phoneCallAudioCtx.currentTime);
    masterGain.connect(phoneCallAudioCtx.destination);

    // جدول رنات المكالمة: رنة مزدوجة (ترررن - ترررن) ثم فترة صمت وهكذا
    const ringPattern = [
      { start: 0.1,  dur: 0.75 },
      { start: 1.1,  dur: 0.75 },
      { start: 4.0,  dur: 0.75 },
      { start: 5.0,  dur: 0.75 },
      { start: 7.9,  dur: 0.75 },
      { start: 8.9,  dur: 0.75 },
      { start: 11.8, dur: 0.75 },
      { start: 12.8, dur: 0.75 }
    ];

    const ctxNow = phoneCallAudioCtx.currentTime;

    ringPattern.forEach(item => {
      const t = ctxNow + item.start;
      const dur = item.dur;

      const osc1 = phoneCallAudioCtx.createOscillator();
      const gain1 = phoneCallAudioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, t);

      const osc2 = phoneCallAudioCtx.createOscillator();
      const gain2 = phoneCallAudioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, t);

      [gain1, gain2].forEach(g => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.04);
        g.gain.setValueAtTime(0.08, t + dur - 0.04);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        g.connect(masterGain);
      });

      osc1.connect(gain1);
      osc2.connect(gain2);

      osc1.start(t);
      osc1.stop(t + dur);
      osc2.start(t);
      osc2.stop(t + dur);
    });

    const autoStopTimeout = setTimeout(() => {
      phoneCallIsRinging = false;
    }, 15000);
    phoneCallTimeouts.push(autoStopTimeout);

  } catch(e) {}
}

function stopPhoneCallRingtone(hideModal = true){
  phoneCallIsRinging = false;
  phoneCallTimeouts.forEach(id => clearTimeout(id));
  phoneCallTimeouts = [];

  if(phoneCallAudioCtx){
    try {
      phoneCallAudioCtx.close();
    } catch(e) {}
    phoneCallAudioCtx = null;
  }

  if(hideModal){
    const modal = document.getElementById('phone-call-alert-modal');
    if(modal){
      modal.classList.remove('show');
      modal.style.display = 'none';
    }
  }
}

function show2HourPhoneCallAlert(reasonText){
  const modal = document.getElementById('phone-call-alert-modal');
  const msgEl = document.getElementById('phone-call-alert-msg');
  if(msgEl && reasonText) msgEl.textContent = reasonText;
  if(modal){
    modal.classList.add('show');
    modal.style.display = 'flex';
  }
  if(notifSoundEnabled){
    playPhoneCallRingtone();
  }
}

function respondTo2HourCall(){
  stopPhoneCallRingtone(true);
  if(DATA.activeTimer && DATA.activeTimer.category === 'break'){
    closeoutActiveSegment();
    DATA.activeTimer = { category: 'study', start: new Date().toISOString() };
    persistImmediate();
    renderAll();
    startTickInterval();
    toast('عاشت إيدك! أنهينا الاستراحة وبدأنا جلسة دراسة جديدة الآن 📚🔥', 'success');
  } else if(!DATA.activeTimer){
    startTimer('study');
    toast('عاشت إيدك! بدأنا جلسة دراسة جديدة الآن 📚🔥', 'success');
  } else {
    toast('تم إيقاف الرنين، استمر في همتك 📚', 'info');
  }
}

function testPhoneCallSound(){
  show2HourPhoneCallAlert('هذه تجربة لرنين مكالمة تنبيه الساعتين 📞 — صوت رنين واضح وهادئ الحجم كما طلبت!');
}

function playAlertBeep(level){
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if(level === 'reminder'){
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if(level === 'warning'){
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880, now + 0.2); // A5
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc.start(now);
      osc.stop(now + 0.65);
    } else if(level === 'high'){
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      osc.frequency.setValueAtTime(880, now + 0.4); // A5
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.start(now);
      osc.stop(now + 0.85);
    } else { // severe
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(440, now + 0.18);
      osc.frequency.setValueAtTime(880, now + 0.36);
      osc.frequency.setValueAtTime(440, now + 0.54);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc.start(now);
      osc.stop(now + 0.95);
    }
  } catch(e) {}
}

function showInAppInactivityToast(title, body, level, milestoneMins){
  const existing = document.getElementById('inactivity-live-toast');
  if(existing) existing.remove();

  const iconMap = {
    reminder: '☕',
    warning: '⚠️',
    high: '🚨',
    severe: '🛑'
  };

  const toastEl = document.createElement('div');
  toastEl.id = 'inactivity-live-toast';
  toastEl.className = `inactivity-toast level-${level}`;
  toastEl.innerHTML = `
    <span class="inactivity-toast-icon">${iconMap[level] || '⏰'}</span>
    <div class="inactivity-toast-content">
      <div class="inactivity-toast-title">${escapeHtml(title)}</div>
      <div class="inactivity-toast-body">${escapeHtml(body)}</div>
      <div class="inactivity-toast-actions">
        <button type="button" class="btn btn-primary btn-sm" onclick="startTimer('study'); document.getElementById('inactivity-live-toast')?.remove();">
          <span>ابدأ الدراسة الآن</span>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('inactivity-live-toast')?.remove();">
          <span>حسناً</span>
        </button>
      </div>
    </div>
    <button type="button" class="inactivity-toast-close" onclick="this.closest('.inactivity-toast').remove();" aria-label="إغلاق">
      ✕
    </button>
  `;
  document.body.appendChild(toastEl);

  const dur = level === 'reminder' ? 25000 : 50000;
  setTimeout(() => {
    if(toastEl && toastEl.parentNode) toastEl.remove();
  }, dur);
}

function triggerInactivityNotification(title, body, level, milestoneMins){
  if(milestoneMins === 120){
    show2HourPhoneCallAlert(body);
  } else {
    if(notifSoundEnabled){
      playAlertBeep(level);
    }
    if(notifInAppEnabled){
      showInAppInactivityToast(title, body, level, milestoneMins);
    }
  }
  if('Notification' in window && Notification.permission === 'granted'){
    try {
      const notif = new Notification(title, {
        body: body,
        icon: 'favicon-32.png',
        badge: 'favicon-32.png',
        tag: 'injaz-inactivity-' + milestoneMins,
        requireInteraction: (level === 'severe' || level === 'high' || milestoneMins === 120)
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch(e) {}
  }
}

function checkInactivityAlerts(){
  // 1. إذا كان يدرس حالياً -> تصفير الانقطاع فوراً
  if(DATA.activeTimer && DATA.activeTimer.category === 'study'){
    lastStudyActivityTimestamp = Date.now();
    inactivityMilestonesTriggered = {};
    const notifDot = document.getElementById('notif-badge-dot');
    if(notifDot) notifDot.classList.remove('alerting');
    const toastEl = document.getElementById('inactivity-live-toast');
    if(toastEl) toastEl.remove();
    return;
  }

  // 2. حساب دقائق الانقطاع
  let inactivityMinutes = 0;
  if(DATA.activeTimer && DATA.activeTimer.category === 'break'){
    inactivityMinutes = Math.floor(getActiveElapsedSeconds(DATA.activeTimer) / 60);
  } else {
    const day = ensureDay(DATA, todayKey());
    const studyList = (day.study || []).slice().filter(s => s.end).sort((a,b) => new Date(b.end) - new Date(a.end));
    if(studyList.length > 0){
      const lastEnd = new Date(studyList[0].end).getTime();
      inactivityMinutes = Math.max(0, Math.floor((Date.now() - lastEnd) / 60000));
    } else {
      inactivityMinutes = Math.max(0, Math.floor((Date.now() - lastStudyActivityTimestamp) / 60000));
    }
  }

  // 3. تحديث شارة الجرس في التوب بار
  const notifDot = document.getElementById('notif-badge-dot');
  if(notifDot){
    if(inactivityMinutes >= 30){
      notifDot.style.display = 'block';
      if(inactivityMinutes >= 60) notifDot.classList.add('alerting');
      else notifDot.classList.remove('alerting');
    } else {
      notifDot.style.display = 'none';
      notifDot.classList.remove('alerting');
    }
  }

  // 4. فحص العتبات التصاعدية
  if(inactivityMinutes >= 30){
    const currentMilestone = Math.floor(inactivityMinutes / 30) * 30;
    const now = Date.now();
    const lastTime = inactivityMilestonesTriggered[currentMilestone] || 0;

    // تشغيل التنبيه إذا لم ينطلق لهذه العتبة خلال آخر 20 دقيقة
    if(now - lastTime > 20 * 60 * 1000){
      inactivityMilestonesTriggered[currentMilestone] = now;

      let level = 'reminder';
      let title = '';
      let body = '';

      if(currentMilestone === 30){
        level = 'reminder';
        title = '☕ تذكير: مرّت نصف ساعة استراحة';
        body = 'صارلك 30 دقيقة ما تقره. استراحة كافية لتجديد النشاط، هل نعود لمواصلة الدراسة؟ 📚';
      } else if(currentMilestone === 60){
        level = 'warning';
        title = '⚠️ تنبيه: مرّت ساعة كاملة بدون دراسة!';
        body = 'صارلك 60 دقيقة منقطع عن المذاكرة! لا تدع الوقت يمر دون إنجاز، حان وقت استئناف الجلسة الآن 📚';
      } else if(currentMilestone === 90){
        level = 'high';
        title = '🚨 تحذير جاد: مضت ساعة ونصف من الانقطاع!';
        body = 'مضت 90 دقيقة كاملة بلا دراسة! حافظ على عزمك وادخل جلسة التركيز الآن قبل فوات اليوم!';
      } else if(currentMilestone === 120){
        level = 'severe';
        title = '📞 مكالمة تنبيه: ساعتان كاملتان استراحة بلا دراسة!';
        body = 'صارلك ساعتين ما تقره (120 دقيقة)! رنين مكالمة تنبيهية قوية لحفظ وقتك — افتح الكتاب وابدأ فوراً! 📚';
      } else {
        level = 'severe';
        const hours = Math.floor(currentMilestone / 60);
        title = `🛑 تحذير قاطع: مضت ${hours} ساعات بلا دراسة!`;
        body = `انقطاعك وصل إلى ${formatDuration(currentMilestone)}! هدفك اليومي في خطر، تدارك الوقت الآن!`;
      }

      triggerInactivityNotification(title, body, level, currentMilestone);
    }
  }
}

function initInactivityMonitoring(){
  if(inactivityHeartbeatInterval) clearInterval(inactivityHeartbeatInterval);
  inactivityHeartbeatInterval = setInterval(checkInactivityAlerts, 5000);
  checkInactivityAlerts();
}

function openNotificationModal(){
  updateNotifPermUI();
  showModal('modal-notifications');
}

function updateNotifPermUI(){
  const statusTitle = document.getElementById('notif-perm-status-title');
  const statusDesc = document.getElementById('notif-perm-status-desc');
  const permIcon = document.getElementById('notif-perm-icon');
  const btnReq = document.getElementById('btn-request-notif-perm');
  const btnLabel = document.getElementById('btn-request-notif-label');
  const soundCheckbox = document.getElementById('setting-notif-sound');
  const inappCheckbox = document.getElementById('setting-notif-inapp');

  if(soundCheckbox) soundCheckbox.checked = notifSoundEnabled;
  if(inappCheckbox) inappCheckbox.checked = notifInAppEnabled;

  if(!('Notification' in window)){
    if(statusTitle) statusTitle.textContent = 'إشعارات المتصفح غير مدعومة';
    if(statusDesc) statusDesc.textContent = 'المتصفح لا يدعم Web Notifications، ستعمل التنبيهات الصوتية وعبر الشاشة.';
    if(permIcon) permIcon.textContent = 'ℹ️';
    if(btnReq) btnReq.style.display = 'none';
    return;
  }

  const perm = Notification.permission;
  if(perm === 'granted'){
    if(statusTitle) statusTitle.textContent = 'إشعارات المتصفح: مفعّلة بنجاح ✓';
    if(statusDesc) statusDesc.textContent = 'تصلك تنبيهات حية فورية على سطح المكتب أو شاشة الهاتف عند الانقطاع.';
    if(permIcon) permIcon.textContent = '✅';
    if(btnReq){
      btnReq.className = 'btn btn-secondary btn-sm';
      if(btnLabel) btnLabel.textContent = 'الإشعارات تعمل بنجاح ✓';
    }
  } else if(perm === 'denied'){
    if(statusTitle) statusTitle.textContent = 'إشعارات المتصفح: محظورة في المتصفح';
    if(statusDesc) statusDesc.textContent = 'تم حظر الإذن سابقاً. لتفعيلها: اضغط على أيقونة القفل بجانب شريط العنوان وفعل الإشعارات.';
    if(permIcon) permIcon.textContent = '🚫';
    if(btnReq){
      btnReq.className = 'btn btn-danger btn-sm';
      if(btnLabel) btnLabel.textContent = 'محظورة في إعدادات المتصفح';
    }
  } else {
    if(statusTitle) statusTitle.textContent = 'إشعارات المتصفح: بانتظار الإذن';
    if(statusDesc) statusDesc.textContent = 'اضغط تفعيل لمنح المتصفح الإذن بإرسال تنبيهات التذكير عند الانقطاع.';
    if(permIcon) permIcon.textContent = '🔔';
    if(btnReq){
      btnReq.className = 'btn btn-primary btn-sm';
      if(btnLabel) btnLabel.textContent = 'تفعيل إشعارات المتصفح';
      btnReq.style.display = 'inline-flex';
    }
  }
}

async function requestNotificationPermission(){
  if(!('Notification' in window)){
    toast('المتصفح لا يدعم إشعارات النظام، التنبيهات الصوتية والشاشة مفعّلة', 'info');
    return;
  }
  try {
    const res = await Notification.requestPermission();
    updateNotifPermUI();
    if(res === 'granted'){
      toast('تم تفعيل إشعارات المتصفح بنجاح! سيتم تنبيهك عند الانقطاع ✓', 'success');
      testInactivityNotification();
    } else if(res === 'denied'){
      toast('تم رفض إذن الإشعارات من إعدادات المتصفح', 'error');
    }
  } catch(e){
    toast('تعذر طلب إذن الإشعارات', 'error');
  }
}

function testInactivityNotification(){
  triggerInactivityNotification(
    '🔔 تجربة إشعار الانقطاع',
    'هذا إشعار تجريبي لاختبار الصوت والتنبيهات. سيعمل التنبيه تلقائياً بعد نصف ساعة وساعة وساعتين من الانقطاع!',
    'warning',
    60
  );
  toast('تم إرسال إشعار تجريبي بنجاح! تفحص شاشتك والصوت ✓', 'success');
}

function toggleNotifSound(enabled){
  notifSoundEnabled = !!enabled;
  localStorage.setItem('injaz_notif_sound', notifSoundEnabled ? 'true' : 'false');
  if(notifSoundEnabled) playAlertBeep('reminder');
  toast(notifSoundEnabled ? 'تم تفعيل الصوت التنبيهي ✓' : 'تم كتم الصوت التنبيهي', 'info');
}

function toggleNotifInApp(enabled){
  notifInAppEnabled = !!enabled;
  localStorage.setItem('injaz_notif_inapp', notifInAppEnabled ? 'true' : 'false');
  toast(notifInAppEnabled ? 'تم تفعيل التنبيهات على الشاشة ✓' : 'تم تعطيل تنبيهات الشاشة', 'info');
}

// إتاحة الدوال على window
window.openNotificationModal = openNotificationModal;
window.requestNotificationPermission = requestNotificationPermission;
window.testInactivityNotification = testInactivityNotification;
window.toggleNotifSound = toggleNotifSound;
window.toggleNotifInApp = toggleNotifInApp;
window.dismissRatioWarningForNow = dismissRatioWarningForNow;

/* -------------------- الإقلاع -------------------- */
function init(){
  hydrateIcons();
  applyTheme(DATA.settings);
  renderBrandName();
  checkPinLock();
  renderAll();
  renderHeaderClock();
  setInterval(renderHeaderClock, 1000);
  setInterval(renderTimeline, 60000);
  if(DATA.activeTimer) startTickInterval();
  checkRemoteOnLoad();
  fetchTodayVisits(true);
  setInterval(() => fetchTodayVisits(false), 7000);
  initInactivityMonitoring();
  updateNotifPermUI();

  document.getElementById('achieve-form')?.addEventListener('submit', (e) => { e.preventDefault(); addAchievement(); });
  document.getElementById('clockform-study')?.addEventListener('submit', (e) => { e.preventDefault(); submitManualEntry('study'); });
  document.getElementById('clockform-break')?.addEventListener('submit', (e) => { e.preventDefault(); submitManualEntry('break'); });
  document.getElementById('clockform-sleep')?.addEventListener('submit', (e) => { e.preventDefault(); submitManualEntry('sleep'); });
  document.getElementById('numericform-study')?.addEventListener('submit', (e) => { e.preventDefault(); submitNumericTimeEntry('study'); });
  document.getElementById('numericform-break')?.addEventListener('submit', (e) => { e.preventDefault(); submitNumericTimeEntry('break'); });
  document.getElementById('numericform-sleep')?.addEventListener('submit', (e) => { e.preventDefault(); submitNumericTimeEntry('sleep'); });
  document.getElementById('durationform-study')?.addEventListener('submit', (e) => { e.preventDefault(); submitNumericTimeEntry('study'); });
  document.getElementById('durationform-break')?.addEventListener('submit', (e) => { e.preventDefault(); submitNumericTimeEntry('break'); });
  document.getElementById('durationform-sleep')?.addEventListener('submit', (e) => { e.preventDefault(); submitNumericTimeEntry('sleep'); });

  function closeAnyModal(id){ if(id === 'modal-day') closeDayModal(); else closeModal(id); }
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if(e.target === ov) closeAnyModal(ov.id); });
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ document.querySelectorAll('.modal-overlay.show').forEach(ov => closeAnyModal(ov.id)); }
  });

  syncCompletedDaysToFocusTracker();
  setInterval(syncCompletedDaysToFocusTracker, 60000);

  // متصفحات الموبايل أحياناً تجمّد الصفحة بالخلفية لفترة (توفير بطارية) — لما ترجع نشطة، نحدّث كل شي ونتأكد العداد
  // مزبوط ومضبوط، حتى لو انعطلت المؤقّتات لفترة وإحنا بعيدين عن الصفحة
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      renderAll();
      renderHeaderClock();
      if(DATA.activeTimer) startTickInterval();
      fetchTodayVisits(false);
      syncCompletedDaysToFocusTracker();
    }
  });
}

/* -------------------- إشعار وتتبع زوار الموقع اليوم -------------------- */
let lastKnownVisitsCount = -1;
let lastVisitsData = null;

async function fetchTodayVisits(isFirstLoad = false) {
  try {
    let serverData = null;
    try {
      const res = await fetch('/api/visits/today');
      if (res.ok) {
        serverData = await res.json();
      }
    } catch {}

    // فحص Firebase أيضاً سواء على GitHub Pages أو مع الخادم المحلي
    let fbData = null;
    const cfg = getEffectiveFirebaseConfig();
    if (cfg && cfg.databaseURL) {
      try {
        await ensureFirebaseInitialized(cfg);
        if (window.FirebaseSync && typeof window.FirebaseSync.readOnce === 'function') {
          const fbVisits = await window.FirebaseSync.readOnce(`site_visits/${todayKey()}`).catch(() => null);
          if (fbVisits && typeof fbVisits === 'object') {
            const entries = Object.values(fbVisits);
            fbData = {
              count: entries.length,
              lastVisitTime: entries[entries.length - 1]?.time || null,
              history: entries
            };
          }
        }
      } catch {}
    }

    let data = null;
    if (serverData && fbData) {
      const maxCount = Math.max(Number(serverData.count || 0), Number(fbData.count || 0));
      data = {
        count: maxCount,
        lastVisitTime: fbData.lastVisitTime || serverData.lastVisitTime || null,
        history: (fbData.history && fbData.history.length > 0) ? fbData.history : (serverData.history || [])
      };
    } else {
      data = serverData || fbData;
    }

    if (!data) return;
    lastVisitsData = data;
    const count = Number(data.count || 0);
    const pill = document.getElementById('visitors-pill');
    const txt = document.getElementById('visitors-count-text');
    const dot = pill ? pill.querySelector('.visitor-pulse-dot') : null;

    if (txt) {
      if (count === 0) {
        txt.textContent = 'الزوار اليوم: 0';
        if (dot) dot.classList.remove('active');
        if (pill) pill.title = 'لم يدخل أي زائر للموقع اليوم بعد';
      } else if (count === 1) {
        txt.textContent = 'دخل شخص اليوم (1)';
        if (dot) dot.classList.add('active');
        if (pill) pill.title = 'دخل شخص للموقع اليوم — اضغط للتفاصيل';
      } else {
        txt.textContent = `دخل ${count} زوار اليوم`;
        if (dot) dot.classList.add('active');
        if (pill) pill.title = `سُجّل دخول ${count} زوار للموقع اليوم — اضغط للتفاصيل`;
      }
    }

    if (!isFirstLoad && lastKnownVisitsCount >= 0 && count > lastKnownVisitsCount) {
      const diff = count - lastKnownVisitsCount;
      toast(diff === 1 ? '👀 دخل شخص الآن لتصفح الموقع!' : `👀 دخل ${diff} زوار جدد للموقع!`, 'info');
    }
    lastKnownVisitsCount = count;
  } catch(e) {
    // Network or server offline, ignore
  }
}

function showVisitorsNotice() {
  if (!lastVisitsData || !lastVisitsData.count || lastVisitsData.count === 0) {
    toast('لم يسجل دخول أي شخص للموقع اليوم بعد.', 'info');
    return;
  }
  const count = lastVisitsData.count;
  const timeStr = lastVisitsData.lastVisitTime ? `آخر دخول سُجّل كان في: ${lastVisitsData.lastVisitTime}` : '';
  toast(`👥 زوار الموقع اليوم (بدون أسماء):\nسُجّل دخول ${count} ${count === 1 ? 'شخص' : 'أشخاص'} للموقع.\n${timeStr}`, 'success');
}

/* -------------------- تقرير الإنجاز والدراسة -------------------- */
let currentReportScope = 'day';
let currentGeneratedReportText = '';

function openReportModal(scope) {
  if (scope) currentReportScope = scope;
  renderReportModal();
  showModal('modal-report');
}

function setReportScope(scope) {
  currentReportScope = scope;
  renderReportModal();
}

function getDaysForWeek(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - ((dayOfWeek + 1) % 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    days.push(todayKey(cur));
  }
  return days;
}

function renderReportModal() {
  const body = document.getElementById('modal-report-body');
  if (!body) return;

  const isDay = currentReportScope === 'day';
  const studentName = (DATA.settings && DATA.settings.studentName) || 'المذاكِر المجتهد';

  let totalStudy = 0, totalBreak = 0, totalSleep = 0, totalPoints = 0;
  let doneAchieves = [], pendingAchieves = [], studySessions = [], breakSessions = [], sleepSessions = [];
  let periodTitle = '';

  const targetKey = currentDayKey || todayKey();

  if (isDay) {
    const dObj = DATA.days[targetKey] || { study:[], breaks:[], sleep:[], achievements:[] };
    const st = computeStats(dObj, DATA.settings);
    totalStudy = st.studyMinutes;
    totalBreak = st.breakMinutes;
    totalSleep = st.sleepMinutes;
    totalPoints = st.points;
    doneAchieves = (dObj.achievements || []).filter(a => a.done);
    pendingAchieves = (dObj.achievements || []).filter(a => !a.done);
    studySessions = dObj.study || [];
    breakSessions = dObj.breaks || [];
    sleepSessions = dObj.sleep || [];
    periodTitle = formatDateArabic(targetKey);
  } else {
    const weekKeys = getDaysForWeek(targetKey);
    weekKeys.forEach(k => {
      const dObj = DATA.days[k];
      if (!dObj) return;
      const st = computeStats(dObj, DATA.settings);
      totalStudy += st.studyMinutes;
      totalBreak += st.breakMinutes;
      totalSleep += st.sleepMinutes;
      totalPoints += st.points;
      (dObj.achievements || []).forEach(a => {
        if (a.done) doneAchieves.push({ ...a, date: k });
        else pendingAchieves.push({ ...a, date: k });
      });
      (dObj.study || []).forEach(s => studySessions.push({ ...s, date: k }));
      (dObj.breaks || []).forEach(s => breakSessions.push({ ...s, date: k }));
      (dObj.sleep || []).forEach(s => sleepSessions.push({ ...s, date: k }));
    });
    periodTitle = `الأسبوع (${formatDateArabic(weekKeys[0])} — ${formatDateArabic(weekKeys[6])})`;
  }

  const formatSessionText = (s) => {
    const startStr = s.start ? formatTime(s.start) : '';
    const endStr = s.end ? formatTime(s.end) : '';
    const timeRange = (startStr && endStr) ? `من ${startStr} إلى ${endStr}` : '';
    const det = s.details ? ` (${s.details})` : '';
    return `• ${formatDuration(s.minutes)} ${timeRange}${det}`;
  };

  const brkStatus = getBreakWarningStatus(totalBreak);
  const sleepStatus = getSleepRatingStatus(totalSleep);
  const ratioStatus = getBreakToStudyRatioStatus(totalBreak, totalStudy);

  let plain = `📊 *تقرير إنجاز ودراسة: ${studentName}*\n`;
  plain += `🗓️ الفترة: ${periodTitle}\n`;
  plain += `━━━━━━━━━━━━━━━━━━━━━\n`;
  plain += `📚 وقت الدراسة: ${formatDuration(totalStudy)}\n`;
  plain += `☕ وقت الاستراحة: ${formatDuration(totalBreak)}${brkStatus.active ? ` (${brkStatus.text})` : ''}\n`;
  plain += `🛏️ وقت النوم: ${formatDuration(totalSleep)}${sleepStatus.active && sleepStatus.text ? ` (${sleepStatus.text})` : ''}\n`;
  if (ratioStatus && ratioStatus.active) {
    plain += `⚠️ مؤشر التوازن: استراحتك تعادل ${ratioStatus.ratio}% من دراستك!\n`;
  }
  plain += `⭐ مجموع النقاط: ${totalPoints} نقطة\n`;
  plain += `🎯 المهام المنجزة: ${doneAchieves.length} من ${doneAchieves.length + pendingAchieves.length}\n`;

  if (doneAchieves.length > 0) {
    plain += `\n✅ *أبرز الإنجازات:*\n`;
    doneAchieves.slice(0, 10).forEach(a => {
      plain += `• ${a.text}\n`;
    });
  }

  if (studySessions.length > 0) {
    plain += `\n📝 *جلسات الدراسة:*\n`;
    studySessions.slice(0, 8).forEach(s => plain += formatSessionText(s) + '\n');
  }
  if (breakSessions.length > 0) {
    plain += `\n☕ *جلسات الاستراحة:*\n`;
    breakSessions.slice(0, 8).forEach(s => plain += formatSessionText(s) + '\n');
  }
  if (sleepSessions.length > 0) {
    plain += `\n🛏️ *جلسات النوم:*\n`;
    sleepSessions.slice(0, 8).forEach(s => plain += formatSessionText(s) + '\n');
  }

  plain += `\n✨ تم التوليد بواسطة منصة إنجاز`;
  currentGeneratedReportText = plain;

  const renderSessionHtml = (s, color) => {
    const startStr = s.start ? formatTime(s.start) : '';
    const endStr = s.end ? formatTime(s.end) : '';
    const timeRange = (startStr && endStr) ? `من ${startStr} إلى ${endStr}` : (startStr ? `بدأت: ${startStr}` : '');
    const det = s.details ? escapeHtml(s.details) : '';
    return `
      <div class="report-session-row">
        <div class="report-session-info">
          <div>
            <b>${formatDuration(s.minutes)}</b>
            ${timeRange ? `<span class="report-session-time" style="margin-right:6px;">(${timeRange})</span>` : ''}
          </div>
          ${s.date ? `<span class="report-session-time" style="font-size:0.75em;">${formatDateArabic(s.date).split(' ')[0]}</span>` : ''}
        </div>
        ${det ? `<div class="report-session-detail" style="border-inline-start:3px solid ${color};">${det}</div>` : ''}
      </div>
    `;
  };

  body.innerHTML = `
    <div class="report-scope-toggle">
      <button type="button" class="btn ${isDay ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setReportScope('day')">تقرير اليوم</button>
      <button type="button" class="btn ${!isDay ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setReportScope('week')">تقرير الأسبوع</button>
    </div>

    <div class="report-header-card">
      <div style="font-size:1.05rem;font-weight:700;color:var(--text);">👤 ${escapeHtml(studentName)}</div>
      <div style="font-size:0.82rem;color:var(--text-muted);font-weight:600;">🗓️ ${periodTitle}</div>
    </div>

    <div class="report-stats-grid">
      <div class="report-stat-card">
        <div class="stat-label">📚 دراسة</div>
        <div class="stat-value" style="color:var(--primary);">${formatDuration(totalStudy)}</div>
      </div>
      <div class="report-stat-card ${brkStatus.active ? brkStatus.cardClass : ''}">
        <div class="stat-label">☕ استراحة ${brkStatus.active ? `<span class="stat-status-badge ${brkStatus.badgeClass}">${brkStatus.text}</span>` : ''}</div>
        <div class="stat-value" style="color:${brkStatus.active ? brkStatus.color : 'var(--secondary)'};">${formatDuration(totalBreak)}</div>
      </div>
      <div class="report-stat-card ${sleepStatus.active && sleepStatus.cardClass ? sleepStatus.cardClass : ''}">
        <div class="stat-label">🛏️ نوم ${sleepStatus.active && sleepStatus.text ? `<span class="stat-status-badge ${sleepStatus.badgeClass}">${sleepStatus.text}</span>` : ''}</div>
        <div class="stat-value" style="color:${sleepStatus.active && sleepStatus.color ? sleepStatus.color : 'var(--success)'};">${formatDuration(totalSleep)}</div>
      </div>
      <div class="report-stat-card">
        <div class="stat-label">⭐ نقاط</div>
        <div class="stat-value" style="color:var(--warning);">${totalPoints}</div>
      </div>
    </div>

    ${ratioStatus && ratioStatus.active ? `
      <div class="ratio-warning-card severity-${ratioStatus.severity}" style="margin-bottom:14px;padding:12px 14px;">
        <div class="ratio-warning-head">
          <div class="ratio-warning-title" style="font-size:0.92rem;">
            <span>${ratioStatus.severity === 'red' ? '🛑' : (ratioStatus.severity === 'orange' ? '🚨' : '⚠️')}</span>
            <span>${escapeHtml(ratioStatus.title)}</span>
          </div>
          <span class="ratio-warning-badge stat-badge-${ratioStatus.severity === 'red' ? 'red' : 'yellow'}" style="font-size:0.75rem;">
            ${escapeHtml(ratioStatus.badgeText)}
          </span>
        </div>
        <div class="ratio-warning-sub" style="font-size:0.82rem;">${ratioStatus.desc}</div>
        <div class="ratio-bar-wrapper">
          <div class="ratio-bar-track" style="height:10px;">
            <div class="ratio-bar-seg-study" style="width:${ratioStatus.studyPct}%;"></div>
            <div class="ratio-bar-seg-break" style="width:${ratioStatus.breakPct}%;"></div>
          </div>
        </div>
      </div>
    ` : ''}

    ${doneAchieves.length > 0 ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--success);">✅ المهام المنجزة (${doneAchieves.length})</div>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
          ${doneAchieves.map(a => `
            <li style="display:flex;align-items:center;gap:8px;font-size:0.85em;background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.15);padding:6px 10px;border-radius:8px;">
              <span style="color:var(--success);">✓</span>
              <span>${escapeHtml(a.text)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '<div style="font-size:0.85em;color:var(--text-dim);margin-bottom:12px;">لا توجد مهام منجزة في هذه الفترة بعد.</div>'}

    <div style="display:flex;flex-direction:column;gap:14px;">
      ${studySessions.length > 0 ? `
        <div>
          <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--primary);">📝 جلسات الدراسة (${studySessions.length})</div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;">
            ${studySessions.map(s => renderSessionHtml(s, 'var(--primary)')).join('')}
          </div>
        </div>
      ` : ''}

      ${breakSessions.length > 0 ? `
        <div>
          <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--secondary);">☕ جلسات الاستراحة (${breakSessions.length})</div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;">
            ${breakSessions.map(s => renderSessionHtml(s, 'var(--secondary)')).join('')}
          </div>
        </div>
      ` : ''}

      ${sleepSessions.length > 0 ? `
        <div>
          <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--success);">🛏️ جلسات النوم (${sleepSessions.length})</div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;">
            ${sleepSessions.map(s => renderSessionHtml(s, 'var(--success)')).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

async function copyReportText() {
  if (!currentGeneratedReportText) return;
  const ok = await copyToClipboard(currentGeneratedReportText);
  if (ok) toast('تم نسخ التقرير بنجاح! جاهز للصق والمشاركة ✓', 'success');
  else toast('تعذّر النسخ تلقائياً', 'error');
}

function shareReportWhatsApp() {
  if (!currentGeneratedReportText) return;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(currentGeneratedReportText)}`;
  window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', init);

// === FULL BACKUP FUNCTIONS ===
function exportFullBackup() {
  const fullBackup = {
    appVersion: "1.6",
    timestamp: new Date().toISOString(),
    data: {
      injaz: JSON.parse(localStorage.getItem('injaz_data_v1') || 'null'),
      focusTracker: JSON.parse(localStorage.getItem('focusTrackerData_v1') || 'null'),
      studyVault: JSON.parse(localStorage.getItem('sv_state_v3') || 'null')
    }
  };
  
  const str = JSON.stringify(fullBackup, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `injaz-full-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importFullBackupFile(input) {
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if(!parsed.data) throw new Error('Invalid Backup Format');
      
      if(parsed.data.injaz) localStorage.setItem('injaz_data_v1', JSON.stringify(parsed.data.injaz));
      if(parsed.data.focusTracker) localStorage.setItem('focusTrackerData_v1', JSON.stringify(parsed.data.focusTracker));
      if(parsed.data.studyVault) localStorage.setItem('sv_state_v3', JSON.stringify(parsed.data.studyVault));
      
      // Reload main DATA object
      if (typeof defaultData === 'function') {
         DATA = parsed.data.injaz || defaultData();
         applyTheme(DATA.settings);
         renderAll();
         renderBrandName();
      }
      
      closeModal('modal-settings');
      toast('تم استيراد النسخة الشاملة بنجاح ✓', 'success');
      
      // Trigger storage event so other scripts know about the update
      window.dispatchEvent(new Event('storage'));
      
    } catch(err) {
      toast('ملف النسخة الشاملة غير صالح', 'error');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function copyFullBackupToClipboard() {
  const fullBackup = {
    appVersion: "1.6",
    timestamp: new Date().toISOString(),
    data: {
      injaz: JSON.parse(localStorage.getItem('injaz_data_v1') || 'null'),
      focusTracker: JSON.parse(localStorage.getItem('focusTrackerData_v1') || 'null'),
      studyVault: JSON.parse(localStorage.getItem('sv_state_v3') || 'null')
    }
  };
  
  const str = JSON.stringify(fullBackup);
  navigator.clipboard.writeText(str).then(() => {
    toast('تم نسخ كود النسخة الشاملة!', 'success');
  }).catch(() => {
    toast('تعذر النسخ، جرب تنزيل الملف', 'error');
  });
}
