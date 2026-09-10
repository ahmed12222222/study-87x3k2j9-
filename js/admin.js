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
    const activeTimer = (currentDayKey === todayKey()) ? DATA.activeTimer : null;
    if(el) el.innerHTML = renderTimelineHTML(ensureDay(DATA, currentDayKey), activeTimer);
  }
}

/* -------------------- المؤقّت (طريقة الزر) -------------------- */
let tickCount = 0;
function startTickInterval(){
  if(tickInterval) return;
  tickInterval = setInterval(updateRunningTimerDisplay, 1000);
  updateRunningTimerDisplay();
}
function stopTickInterval(){
  if(tickInterval){ clearInterval(tickInterval); tickInterval = null; }
}
function updateRunningTimerDisplay(){
  if(!DATA.activeTimer) return;
  const el = document.getElementById(`timerdisplay-${DATA.activeTimer.category}`);
  if(el) el.textContent = formatStopwatch(getActiveElapsedSeconds(DATA.activeTimer));
  if(DATA.activeTimer.category !== 'sleep'){
    const jokerEl = document.getElementById('joker-timer-display');
    if(jokerEl) jokerEl.textContent = formatStopwatch(getActiveElapsedSeconds(DATA.activeTimer));
  }
  tickCount++;
  if(tickCount % 20 === 0) renderTimeline(); // نوسّع القطعة الحية بخط اليوم كل ٢٠ ثانية تقريباً بدل كل ثانية توفيراً للأداء
}

function startTimer(catKey){
  if(DATA.activeTimer){ toast('فيه عداد شغال حالياً، خلّص منه أول', 'error'); return; }
  DATA.activeTimer = { category: catKey, start: new Date().toISOString() };
  persistImmediate();
  renderAll();
  startTickInterval();
}

function stopTimer(catKey){
  if(!DATA.activeTimer || DATA.activeTimer.category !== catKey) return;
  const cat = CATS[catKey];
  const day = ensureDay(DATA);
  const prevMinutes = day[cat.arrayKey].reduce((s,x)=>s+x.minutes, 0);
  const start = DATA.activeTimer.start;
  const end = new Date().toISOString();
  const minutes = Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000));
  const session = { id: uid(), start, end, minutes, details: '', source: 'timer' };
  day[cat.arrayKey].push(session);
  DATA.activeTimer = null;
  persistImmediate();
  stopTickInterval();
  renderAll();
  toast(cat.addedToast, 'success');
  if(catKey === 'study') checkGoalCelebration(prevMinutes, prevMinutes + minutes);
  openDetailsModal(catKey, session.id);
}

function cancelTimer(catKey){
  if(!DATA.activeTimer || DATA.activeTimer.category !== catKey) return;
  if(!confirm('تريد تلغي هذا العداد بدون ما تحفظ الجلسة؟')) return;
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
  const day = ensureDay(DATA);
  const prevMinutes = day[cat.arrayKey].reduce((s,x)=>s+x.minutes, 0);
  const start = DATA.activeTimer.start;
  const end = new Date().toISOString();
  const minutes = Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000));
  day[cat.arrayKey].push({ id: uid(), start, end, minutes, details: '', source: 'joker' });
  if(catKey === 'study') checkGoalCelebration(prevMinutes, prevMinutes + minutes);
}

function jokerStart(){
  if(DATA.activeTimer){ toast('فيه عداد شغال حالياً، خلّص منه أول', 'error'); return; }
  DATA.activeTimer = { category: 'study', start: new Date().toISOString() };
  persistImmediate();
  renderAll();
  startTickInterval();
}

// يبدّل بين دراسة واستراحة: يقفل الجلسة الحالية ويبدأ الثانية بنفس اللحظة بالضبط — صفر فجوة وقت بينهم
function jokerToggle(){
  if(!DATA.activeTimer || DATA.activeTimer.category === 'sleep') return;
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

  if(!isToday){
    card.dataset.state = 'idle';
    if(displayEl) displayEl.textContent = '—:—:—';
    if(captionEl) captionEl.textContent = 'الزر الجوكر يشتغل بس لليوم الحالي';
    if(actionsEl) actionsEl.innerHTML = `<button type="button" class="btn btn-secondary joker-btn" disabled>${ICONS.clock}<span>متوفر لليوم بس</span></button>`;
    return;
  }

  const at = DATA.activeTimer;
  if(!at){
    card.dataset.state = 'idle';
    if(displayEl) displayEl.textContent = '00:00:00';
    if(captionEl) captionEl.textContent = 'زر وحد لدراسة واستراحة متبادلة — تبدّلون بلمسة، وتنتهون بتسجيل نوم';
    if(actionsEl) actionsEl.innerHTML = `<button type="button" class="btn btn-primary joker-btn" onclick="jokerStart()">${ICONS.play}<span>ابدأ</span></button>`;
  } else if(at.category === 'sleep'){
    card.dataset.state = 'sleeping';
    if(captionEl) captionEl.textContent = 'نايم الحين 😴 — اضغط «صحيت» بكرت نومي تحت لما تصحى';
    if(actionsEl) actionsEl.innerHTML = '';
  } else if(at.category === 'study'){
    card.dataset.state = 'studying';
    if(displayEl) displayEl.textContent = formatStopwatch(getActiveElapsedSeconds(at));
    if(captionEl) captionEl.textContent = 'تدرس الحين 📖';
    if(actionsEl) actionsEl.innerHTML = `
      <button type="button" class="btn btn-secondary joker-btn" onclick="jokerToggle()">${ICONS.coffee}<span>خذ استراحة</span></button>
      <button type="button" class="btn btn-danger joker-btn" onclick="jokerEndToSleep()">${ICONS.bed}<span>إنهاء ونام</span></button>
    `;
  } else {
    card.dataset.state = 'resting';
    if(displayEl) displayEl.textContent = formatStopwatch(getActiveElapsedSeconds(at));
    if(captionEl) captionEl.textContent = 'تستريح الحين ☕';
    if(actionsEl) actionsEl.innerHTML = `
      <button type="button" class="btn btn-primary joker-btn" onclick="jokerToggle()">${ICONS.book}<span>ارجع للدراسة</span></button>
      <button type="button" class="btn btn-danger joker-btn" onclick="jokerEndToSleep()">${ICONS.bed}<span>إنهاء ونام</span></button>
    `;
  }
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
  const willOpen = !form.classList.contains('open');
  form.classList.toggle('open', willOpen);
  btn.classList.toggle('open', willOpen);
}

function submitManualEntry(catKey){
  const cat = CATS[catKey];
  const startInput = document.getElementById(`manualstart-${catKey}`);
  const endInput = document.getElementById(`manualend-${catKey}`);
  if(!startInput.value || !endInput.value){ toast('حدد وقت البداية والنهاية', 'error'); return; }
  const base = new Date(currentDayKey + 'T00:00:00');
  const [sh, sm] = startInput.value.split(':').map(Number);
  const [eh, em] = endInput.value.split(':').map(Number);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0);
  let end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0);
  let crossedMidnight = false;
  if(end <= start){ end = new Date(end.getTime() + 24*60*60*1000); crossedMidnight = true; } // مثلاً نوم من الليل للصبح — نفهمها تلقائياً باليوم الثاني بدل ما نرفضها

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

/* -------------------- قوائم الجلسات -------------------- */
function renderTrackerSection(catKey){
  const cat = CATS[catKey];
  const isDay = currentPeriod === 'day';
  const periodWord = { day: 'اليوم', week: 'هالأسبوع', month: 'هالشهر' }[currentPeriod];
  const sessions = getScopedView()[cat.arrayKey];
  const totalMin = sessions.reduce((s,x)=>s+x.minutes, 0);

  const totalEl = document.getElementById(`total-${catKey}`);
  if(totalEl) totalEl.innerHTML = `<b class="num-inline">${formatDuration(totalMin)}</b> ${periodWord}`;

  if(isDay){
    const isToday = currentDayKey === todayKey();
    const isRunning = DATA.activeTimer && DATA.activeTimer.category === catKey;
    const timerBox = document.getElementById(`timerbox-${catKey}`);
    const timerDisplay = document.getElementById(`timerdisplay-${catKey}`);
    const timerCaption = document.getElementById(`timercaption-${catKey}`);
    const controlsEl = document.getElementById(`timercontrols-${catKey}`);

    if(timerBox) timerBox.classList.toggle('running', !!isRunning);
    if(timerDisplay) timerDisplay.classList.toggle('running', !!isRunning);

    if(!isToday){
      if(timerDisplay) timerDisplay.textContent = '—:—:—';
      if(timerCaption) timerCaption.textContent = 'العداد الحي يشتغل بس لليوم — استخدم «إضافة يدوية» تحت لتسجيل وقت بهذا اليوم';
      if(controlsEl) controlsEl.innerHTML = `<button class="btn btn-secondary timer-btn" disabled>${ICONS.clock}<span>متوفر لليوم بس</span></button>`;
    } else if(isRunning){
      if(timerDisplay) timerDisplay.textContent = formatStopwatch(getActiveElapsedSeconds(DATA.activeTimer));
      if(timerCaption) timerCaption.textContent = `بدأت الساعة ${formatTime(DATA.activeTimer.start)} — حسب ساعة جهازك`;
      if(controlsEl) controlsEl.innerHTML = `
        <button class="btn btn-danger timer-btn" onclick="stopTimer('${catKey}')">${ICONS.stop}<span>${cat.endLabel}</span></button>
        <button class="btn btn-ghost btn-sm" onclick="cancelTimer('${catKey}')">إلغاء بدون حفظ</button>
      `;
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
  showModal('modal-details');
  setTimeout(() => document.getElementById('modal-details-notes').focus(), 250);
}

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

  document.getElementById('modal-day-title').textContent = formatDayLabel(dayKey);

  const statsHtml = `
    <div class="day-modal-stats">
      <div class="day-modal-stat"><span class="num-inline">${formatDuration(stats.studyMinutes)}</span><span>قراءة</span></div>
      <div class="day-modal-stat"><span class="num-inline">${formatDuration(stats.breakMinutes)}</span><span>استراحة</span></div>
      <div class="day-modal-stat"><span class="num-inline">${formatDuration(stats.sleepMinutes)}</span><span>نوم</span></div>
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
  persist();
  renderAchievements();
  renderStats();
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
  animateCountUp(document.getElementById('points-value'), stats.points);
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
  setInterval(() => fetchTodayVisits(false), 25000);

  document.getElementById('achieve-form').addEventListener('submit', (e) => { e.preventDefault(); addAchievement(); });
  document.getElementById('manualform-study').addEventListener('submit', (e) => { e.preventDefault(); submitManualEntry('study'); });
  document.getElementById('manualform-break').addEventListener('submit', (e) => { e.preventDefault(); submitManualEntry('break'); });
  document.getElementById('manualform-sleep').addEventListener('submit', (e) => { e.preventDefault(); submitManualEntry('sleep'); });

  function closeAnyModal(id){ if(id === 'modal-day') closeDayModal(); else closeModal(id); }
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if(e.target === ov) closeAnyModal(ov.id); });
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ document.querySelectorAll('.modal-overlay.show').forEach(ov => closeAnyModal(ov.id)); }
  });

  // متصفحات الموبايل أحياناً تجمّد الصفحة بالخلفية لفترة (توفير بطارية) — لما ترجع نشطة، نحدّث كل شي ونتأكد العداد
  // مزبوط ومضبوط، حتى لو انعطلت المؤقّتات لفترة وإحنا بعيدين عن الصفحة
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      renderAll();
      renderHeaderClock();
      if(DATA.activeTimer) startTickInterval();
      fetchTodayVisits(false);
    }
  });
}

/* -------------------- إشعار وتتبع زوار الموقع اليوم -------------------- */
let lastKnownVisitsCount = -1;
let lastVisitsData = null;

async function fetchTodayVisits(isFirstLoad = false) {
  try {
    const res = await fetch('/api/visits/today');
    if (!res.ok) return;
    const data = await res.json();
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

  let plain = `📊 *تقرير إنجاز ودراسة: ${studentName}*\n`;
  plain += `🗓️ الفترة: ${periodTitle}\n`;
  plain += `━━━━━━━━━━━━━━━━━━━━━\n`;
  plain += `📚 وقت الدراسة: ${formatDuration(totalStudy)}\n`;
  plain += `☕ وقت الاستراحة: ${formatDuration(totalBreak)}\n`;
  plain += `🛏️ وقت النوم: ${formatDuration(totalSleep)}\n`;
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
      <div style="font-size:0.82em;background:rgba(255,255,255,0.03);border:1px solid var(--border);padding:8px 10px;border-radius:8px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <b>${formatDuration(s.minutes)}</b>
            ${timeRange ? `<span style="color:var(--text-dim);font-size:0.9em;margin-right:6px;">(${timeRange})</span>` : ''}
          </div>
          ${s.date ? `<span style="color:var(--text-dim);font-size:0.75em;">${formatDateArabic(s.date).split(' ')[0]}</span>` : ''}
        </div>
        ${det ? `<div style="color:${color};font-size:0.85em;border-right:2px solid ${color};padding-right:8px;margin-right:2px;">${det}</div>` : ''}
      </div>
    `;
  };

  body.innerHTML = `
    <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px;">
      <button type="button" class="btn ${isDay ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setReportScope('day')">تقرير اليوم</button>
      <button type="button" class="btn ${!isDay ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setReportScope('week')">تقرير الأسبوع</button>
    </div>

    <div class="card" style="background:var(--card-bg, rgba(255,255,255,0.04));border:1px solid var(--border);padding:14px;border-radius:12px;margin-bottom:14px;">
      <div style="font-size:1.15em;font-weight:700;color:var(--text);margin-bottom:4px;">👤 ${escapeHtml(studentName)}</div>
      <div style="font-size:0.85em;color:var(--text-dim);">🗓️ ${periodTitle}</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
      <div class="stat-card" style="padding:10px;">
        <div class="stat-label">📚 دراسة</div>
        <div class="stat-value" style="font-size:1.25em;color:var(--primary);">${formatDuration(totalStudy)}</div>
      </div>
      <div class="stat-card" style="padding:10px;">
        <div class="stat-label">☕ استراحة</div>
        <div class="stat-value" style="font-size:1.25em;color:var(--secondary);">${formatDuration(totalBreak)}</div>
      </div>
      <div class="stat-card" style="padding:10px;">
        <div class="stat-label">🛏️ نوم</div>
        <div class="stat-value" style="font-size:1.25em;color:var(--success);">${formatDuration(totalSleep)}</div>
      </div>
      <div class="stat-card" style="padding:10px;">
        <div class="stat-label">⭐ نقاط</div>
        <div class="stat-value" style="font-size:1.25em;color:var(--warning);">${totalPoints}</div>
      </div>
    </div>

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

    <div style="display:flex;flex-direction:column;gap:16px;">
      ${studySessions.length > 0 ? `
        <div>
          <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--primary);">📝 جلسات الدراسة (${studySessions.length})</div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
            ${studySessions.map(s => renderSessionHtml(s, 'var(--primary)')).join('')}
          </div>
        </div>
      ` : ''}

      ${breakSessions.length > 0 ? `
        <div>
          <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--secondary);">☕ جلسات الاستراحة (${breakSessions.length})</div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
            ${breakSessions.map(s => renderSessionHtml(s, 'var(--secondary)')).join('')}
          </div>
        </div>
      ` : ''}

      ${sleepSessions.length > 0 ? `
        <div>
          <div style="font-size:0.9em;font-weight:bold;margin-bottom:8px;color:var(--success);">🛏️ جلسات النوم (${sleepSessions.length})</div>
          <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:4px;">
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
