// js/studyvault-bridge.js — ربط StudyVault مع إنجازات اليوم والأهداف الأسبوعية وقاعدة بيانات Firebase

const SV_STORAGE_KEY = 'sv_state_v3';
const SV_FIREBASE_PATH = 'studyvault_data';

// البيانات الخاصة بالمستخدم (فيزياء، كيمياء، أحياء، إنجليزي، إسلامية، رياضيات، عربي)
const USER_STUDYVAULT_DATA = {
  subjects: [
    {
      id: "mrsvzax0nabq",
      name: "فيزياء",
      chaptersCount: 9,
      lecPerCh: 20,
      color: "#f5605a",
      instructor: "مؤيد سليم",
      weeklyGoal: 4,
      currentChapter: 1,
      lectureProgress: { "1": 13 },
      chapterLectures: { "1": 32 },
      materials: [
        { id: "ms7l5yrx4nlx", type: "note", name: "جزء اول", totalPages: 221, currentPage: 16 }
      ],
      notes: ""
    },
    {
      id: "mrsvzax0lwca",
      name: "كيمياء",
      chaptersCount: 8,
      lecPerCh: 20,
      color: "#38d9f5",
      instructor: "حسين الهاشمي",
      weeklyGoal: 5,
      currentChapter: 1,
      lectureProgress: { "1": 13 },
      chapterLectures: {
        "1": 36, "2": 35, "3": 31, "4": 33, "5": 32, "6": 31, "7": 32, "8": 30, "9": 33
      },
      materials: [],
      notes: ""
    },
    {
      id: "mrswlthavqcf",
      name: "احياء",
      chaptersCount: 5,
      lecPerCh: 20,
      color: "#a0f54e",
      instructor: "مصطفى الحافظ",
      weeklyGoal: 6,
      currentChapter: 1,
      lectureProgress: { "1": 14 },
      chapterLectures: {},
      materials: [
        { id: "mruho0wmzxev", type: "note", name: "احياء جزء اول", totalPages: 167, currentPage: 26 }
      ],
      notes: ""
    },
    {
      id: "mrswm04j7iyj",
      name: "انكليزي",
      chaptersCount: 8,
      lecPerCh: 8,
      color: "#7b5ef8",
      instructor: "",
      weeklyGoal: 4,
      currentChapter: 1,
      lectureProgress: {},
      chapterLectures: {},
      materials: [],
      notes: ""
    },
    {
      id: "mrswm5bu5zz5",
      name: "اسلاميه",
      chaptersCount: 8,
      lecPerCh: 8,
      color: "#5e9cf8",
      instructor: "",
      weeklyGoal: 3,
      currentChapter: 1,
      lectureProgress: {},
      chapterLectures: {},
      materials: [],
      notes: ""
    },
    {
      id: "mrswo7pn3hnr",
      name: "رياضيات",
      chaptersCount: 6,
      lecPerCh: 20,
      color: "#f578c8",
      instructor: "حيدر عبد الائمه",
      weeklyGoal: 5,
      currentChapter: 1,
      lectureProgress: {},
      chapterLectures: {},
      materials: [],
      notes: ""
    },
    {
      id: "mrswocrnfyor",
      name: "عربي",
      chaptersCount: 8,
      lecPerCh: 8,
      color: "#a0f54e",
      instructor: "حمزه الجابري",
      weeklyGoal: 4,
      currentChapter: 1,
      lectureProgress: {},
      chapterLectures: {},
      materials: [],
      notes: ""
    }
  ],
  instructors: [
    "حيدر عبد الائمه",
    "حمزه الجابري",
    "مؤيد سليم",
    "مصطفى الحافظ",
    "حسين الهاشمي"
  ],
  updatedAt: 1789068205607,
  studyLog: [
    { id: "mspn1ss1w68q12", date: "2026-08-12", subjectId: "mrswlthavqcf", chapterNum: 1, lectureNum: 12 },
    { id: "mspn1ss1iwwj13", date: "2026-08-12", subjectId: "mrswlthavqcf", chapterNum: 1, lectureNum: 13 },
    { id: "mspn1ss1zn8v14", date: "2026-08-12", subjectId: "mrswlthavqcf", chapterNum: 1, lectureNum: 14 },
    { id: "mspn2csr1ck510", date: "2026-08-12", subjectId: "mrsvzax0nabq", chapterNum: 1, lectureNum: 10 },
    { id: "mspn2csrl6y111", date: "2026-08-12", subjectId: "mrsvzax0nabq", chapterNum: 1, lectureNum: 11 },
    { id: "mspn2csrf8j412", date: "2026-08-12", subjectId: "mrsvzax0nabq", chapterNum: 1, lectureNum: 12 },
    { id: "mspn2csrisqf13", date: "2026-08-12", subjectId: "mrsvzax0nabq", chapterNum: 1, lectureNum: 13 },
    { id: "mspn2csrfdeo14", date: "2026-08-12", subjectId: "mrsvzax0nabq", chapterNum: 1, lectureNum: 14 }
  ]
};

function getStudyVaultState() {
  try {
    const raw = localStorage.getItem(SV_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        if (!parsed.studyLog) parsed.studyLog = [];
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading StudyVault state:', e);
  }
  // إذا لم توجد بيانات مخزنة، نعتمد بيانات المستخدم مباشرة
  try {
    localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(USER_STUDYVAULT_DATA));
  } catch {}
  return JSON.parse(JSON.stringify(USER_STUDYVAULT_DATA));
}

let fbSvPushTimer = null;
function saveStudyVaultState(state) {
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving StudyVault state:', e);
  }

  // مزامنة فورية مع Firebase السحابي إذا كان مهيأ
  if (typeof window !== 'undefined' && window.FirebaseSync && window.INJAZ_FIREBASE_CONFIG) {
    clearTimeout(fbSvPushTimer);
    fbSvPushTimer = setTimeout(() => {
      window.FirebaseSync.write(SV_FIREBASE_PATH, state)
        .then(() => console.log('StudyVault data synced to Firebase successfully'))
        .catch(err => console.warn('Firebase StudyVault write error:', err));
    }, 1000);
  }
}

// مزامنة مبدئية مع Firebase عند بدء التشغيل
async function initStudyVaultFirebaseSync() {
  if (typeof window === 'undefined') return;
  const cfg = window.INJAZ_FIREBASE_CONFIG;
  if (!cfg || !cfg.databaseURL) return;

  const tryConnect = async () => {
    if (!window.FirebaseSync) return;
    try {
      window.FirebaseSync.init(cfg);
      if (typeof window.FirebaseSync.signInAnon === 'function') {
        await window.FirebaseSync.signInAnon().catch(() => {});
      }
      // فحص البيانات بالسحابة
      const remote = await window.FirebaseSync.readOnce(SV_FIREBASE_PATH);
      if (remote && Array.isArray(remote.subjects) && remote.subjects.length > 0) {
        const local = getStudyVaultState();
        if ((remote.updatedAt || 0) > (local.updatedAt || 0)) {
          localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(remote));
          window.dispatchEvent(new Event('storage'));
          renderSvWeeklyGoalsWidget();
        }
      } else {
        // إذا كان Firebase فارغاً، نرفع بيانات المستخدم الحالية له فوراً
        const local = getStudyVaultState();
        await window.FirebaseSync.write(SV_FIREBASE_PATH, local);
      }

      // استماع للتحديثات الحية
      window.FirebaseSync.listen(SV_FIREBASE_PATH, (remoteData) => {
        if (remoteData && Array.isArray(remoteData.subjects)) {
          const cur = getStudyVaultState();
          if ((remoteData.updatedAt || 0) > (cur.updatedAt || 0)) {
            localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(remoteData));
            window.dispatchEvent(new Event('storage'));
            renderSvWeeklyGoalsWidget();
          }
        }
      });
    } catch (e) {
      console.warn('StudyVault Firebase sync initialization note:', e);
    }
  };

  if (window.FirebaseSync) {
    tryConnect();
  } else {
    window.addEventListener('firebase-bridge-ready', tryConnect, { once: true });
  }
}

initStudyVaultFirebaseSync();

function svDateStr(d) {
  const pad = n => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function svTodayStr() {
  if (typeof currentDayKey === 'string' && currentDayKey.length === 10) {
    return currentDayKey;
  }
  return svDateStr(new Date());
}

function svStartOfWeek(d) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  nd.setDate(nd.getDate() - nd.getDay()); // Sunday start
  return nd;
}

function svEndOfWeek(d) {
  const s = svStartOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

// علامة صح في StudyVault عند إكمال المحاضرة بإنجازات اليوم
function svMarkLectureDone(subjectId, chapterNum, lectureNum) {
  const state = getStudyVaultState();
  const sub = state.subjects.find(s => s.id === subjectId || s.name === subjectId);
  if (!sub) return;

  const ch = Number(chapterNum);
  const lec = Number(lectureNum);
  if (!sub.lectureProgress) sub.lectureProgress = {};

  if ((sub.lectureProgress[ch] || 0) < lec) {
    sub.lectureProgress[ch] = lec;
  }

  const today = svTodayStr();
  const exists = state.studyLog.some(en =>
    en.date === today && en.subjectId === sub.id && Number(en.chapterNum) === ch && Number(en.lectureNum) === lec
  );
  if (!exists) {
    state.studyLog.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + lec,
      date: today,
      subjectId: sub.id,
      chapterNum: ch,
      lectureNum: lec
    });
  }

  saveStudyVaultState(state);
  renderSvWeeklyGoalsWidget();
}

// إلغاء الصح إذا تراجع المستخدم عن إكمال المحاضرة
function svUnmarkLectureDone(subjectId, chapterNum, lectureNum) {
  const state = getStudyVaultState();
  const sub = state.subjects.find(s => s.id === subjectId || s.name === subjectId);
  if (!sub) return;

  const ch = Number(chapterNum);
  const lec = Number(lectureNum);
  const today = svTodayStr();

  // إزالة التسجيلة من سجل اليوم
  state.studyLog = state.studyLog.filter(en =>
    !(en.date === today && en.subjectId === sub.id && Number(en.chapterNum) === ch && Number(en.lectureNum) === lec)
  );

  if (sub.lectureProgress && sub.lectureProgress[ch] === lec) {
    sub.lectureProgress[ch] = Math.max(0, lec - 1);
  }

  saveStudyVaultState(state);
  renderSvWeeklyGoalsWidget();
}

// علامة صح عند إنجاز صفحات ملزمة
function svMarkMaterialPageDone(subjectId, materialId, targetPage, fromPage) {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === subjectId || s.name === subjectId);
  if (!sub) return;

  const materials = sub.materials || [];
  const mat = materials.find(m => m.id === materialId) || materials[0];
  if (mat) {
    const prev = Number(mat.currentPage || 0);
    const target = Number(targetPage);
    if (target > prev) {
      mat.currentPage = target;
    }
  }

  const today = svTodayStr();
  const pCount = Math.max(1, Number(targetPage) - Number(fromPage || 0));
  state.studyLog.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: today,
    subjectId: sub.id,
    materialId: materialId,
    materialName: mat ? mat.name : 'ملزمة',
    type: 'material_pages',
    pagesDone: pCount,
    targetPage: Number(targetPage)
  });

  saveStudyVaultState(state);
  renderSvWeeklyGoalsWidget();
}

// إلغاء الصح لصفحات ملزمة
function svUnmarkMaterialPageDone(subjectId, materialId, targetPage, prevPage) {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === subjectId || s.name === subjectId);
  if (!sub) return;

  const materials = sub.materials || [];
  const mat = materials.find(m => m.id === materialId) || materials[0];
  if (mat && prevPage != null) {
    mat.currentPage = Number(prevPage);
  }

  const today = svTodayStr();
  const idx = state.studyLog.findIndex(en =>
    en.date === today && en.subjectId === sub.id && en.materialId === materialId && en.type === 'material_pages'
  );
  if (idx !== -1) {
    state.studyLog.splice(idx, 1);
  }

  saveStudyVaultState(state);
  renderSvWeeklyGoalsWidget();
}

// حساب الأهداف الأسبوعية (محاضرات أو صفحات)
function getSvWeeklyGoalsData() {
  const state = getStudyVaultState();
  const subjects = state.subjects || [];
  const now = new Date();
  const start = svDateStr(svStartOfWeek(now));
  const end = svDateStr(svEndOfWeek(now));

  const goalSubs = subjects.filter(s => {
    const isPageGoal = s.weeklyGoalType === 'pages' && Number(s.weeklyTargetPage) > 0;
    const isLecGoal = (!s.weeklyGoalType || s.weeklyGoalType === 'lectures') && Number(s.weeklyGoal) > 0;
    return isPageGoal || isLecGoal;
  });

  return goalSubs.map(s => {
    if (s.weeklyGoalType === 'pages' && Number(s.weeklyTargetPage) > 0) {
      const materials = s.materials || [];
      const mat = materials.find(m => m.id === s.weeklyMaterialId) || materials[0] || { name: 'الملزمة', currentPage: 0, totalPages: s.weeklyTargetPage };
      const curPage = Number(mat.currentPage || 0);
      const targetPage = Number(s.weeklyTargetPage);
      const pct = Math.min(100, Math.max(0, Math.round((curPage / targetPage) * 100)));
      return {
        id: s.id,
        name: s.name,
        color: s.color || '#3ef5aa',
        goalType: 'pages',
        materialName: mat.name,
        materialId: mat.id,
        curPage,
        targetPage,
        done: curPage,
        goal: targetPage,
        pct,
        isReached: curPage >= targetPage,
        label: `ملزمة ${mat.name}: ص ${curPage} من ${targetPage}`
      };
    } else {
      const done = (state.studyLog || []).filter(en =>
        en.subjectId === s.id && en.date >= start && en.date <= end && (!en.type || en.type === 'lecture')
      ).length;
      const goal = Number(s.weeklyGoal || 0);
      const pct = Math.min(100, Math.round((done / (goal || 1)) * 100));
      return {
        id: s.id,
        name: s.name,
        color: s.color || '#3ef5aa',
        goalType: 'lectures',
        done,
        goal,
        pct,
        isReached: done >= goal,
        label: `${done} من ${goal} محاضرة`
      };
    }
  });
}

// رسم صندوق أهدافي الأسبوعية جوه إنجازات اليوم
function renderSvWeeklyGoalsWidget() {
  const container = document.getElementById('sv-weekly-goals-container');
  if (!container) return;

  const goals = getSvWeeklyGoalsData();
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="sv-weekly-box">
        <div class="sv-weekly-head">
          <div class="sv-weekly-title">
            <span class="sv-target-icon">🎯</span>
            <span>أهدافي الأسبوعية</span>
          </div>
          <a href="studyvault.html" class="sv-link-badge">StudyVault ↗</a>
        </div>
        <div class="sv-empty-hint">ما محدد أهداف أسبوعية بعد — تكدر تحدد هدف محاضرات أو صفحات ملزمة لكل مادة من StudyVault.</div>
      </div>
    `;
    return;
  }

  const itemsHtml = goals.map(g => `
    <div class="sv-goal-row">
      <div class="sv-goal-top">
        <div class="sv-goal-title-wrap">
          <span class="sv-goal-dot" style="background:${g.color};box-shadow:0 0 8px ${g.color}66"></span>
          <span class="sv-goal-name">${escapeHtml(g.name)} ${g.goalType === 'pages' ? `<small style="font-size:0.75rem;color:var(--text-muted);font-weight:normal;">(📖 ${escapeHtml(g.materialName)})</small>` : ''}</span>
        </div>
        <div class="sv-goal-score-wrap">
          ${g.isReached ? '<span class="sv-reached-badge">✓ تم الهدف</span>' : ''}
          <span class="sv-goal-ratio" dir="ltr">${g.goalType === 'pages' ? `ص <b>${g.done}</b> / ${g.goal}` : `<b>${g.done}</b> / ${g.goal}`}</span>
        </div>
      </div>
      <div class="sv-goal-bar-track">
        <div class="sv-goal-bar-fill" style="width:${g.pct}%;background:${g.color}"></div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="sv-weekly-box">
      <div class="sv-weekly-head">
        <div class="sv-weekly-title">
          <span class="sv-target-icon">🎯</span>
          <span>أهدافي الأسبوعية</span>
        </div>
        <a href="studyvault.html" class="sv-link-badge" title="فتح متتبع الدراسة">StudyVault ↗</a>
      </div>
      <div class="sv-goals-grid">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// MODAL: اختيار هدف من StudyVault (محاضرات أو صفحات)
// ══════════════════════════════════════════════
let svPickerMode = 'lectures'; // 'lectures' | 'pages'
let svPickerSelectedSubjectId = null;
let svPickerSelectedChapter = 1;
let svPickerSelectedLecture = null;
let svPickerSelectedMaterialId = null;
let svPickerPagesSubMode = 'target'; // 'target' | 'range'
let svPickerTargetPage = 0;
let svPickerFromPage = 1;
let svPickerToPage = 1;

function switchSvPickerMode(mode) {
  svPickerMode = mode;
  const tabLec = document.getElementById('sv-tab-lectures');
  const tabPages = document.getElementById('sv-tab-pages');
  const secLec = document.getElementById('sv-picker-lectures-section');
  const secPages = document.getElementById('sv-picker-pages-section');

  if (tabLec && tabPages) {
    if (mode === 'lectures') {
      tabLec.style.background = 'var(--primary)';
      tabLec.style.color = '#000';
      tabPages.style.background = 'transparent';
      tabPages.style.color = 'var(--text)';
      if (secLec) secLec.style.display = 'block';
      if (secPages) secPages.style.display = 'none';
    } else {
      tabPages.style.background = 'var(--primary)';
      tabPages.style.color = '#000';
      tabLec.style.background = 'transparent';
      tabLec.style.color = 'var(--text)';
      if (secLec) secLec.style.display = 'none';
      if (secPages) secPages.style.display = 'block';
    }
  }
  renderSvPickerModalContent();
}

function setSvPagesSubMode(subMode) {
  svPickerPagesSubMode = subMode;
  const btnTarget = document.getElementById('sv-mode-target');
  const btnRange = document.getElementById('sv-mode-range');
  const boxTarget = document.getElementById('sv-box-target-mode');
  const boxRange = document.getElementById('sv-box-range-mode');

  if (btnTarget && btnRange) {
    if (subMode === 'target') {
      btnTarget.style.background = 'var(--primary)';
      btnTarget.style.color = '#000';
      btnTarget.style.border = 'none';
      btnRange.style.background = 'transparent';
      btnRange.style.color = 'var(--text)';
      btnRange.style.border = '1px solid var(--border)';
      if (boxTarget) boxTarget.style.display = 'block';
      if (boxRange) boxRange.style.display = 'none';
    } else {
      btnRange.style.background = 'var(--primary)';
      btnRange.style.color = '#000';
      btnRange.style.border = 'none';
      btnTarget.style.background = 'transparent';
      btnTarget.style.color = 'var(--text)';
      btnTarget.style.border = '1px solid var(--border)';
      if (boxTarget) boxTarget.style.display = 'none';
      if (boxRange) boxRange.style.display = 'block';
    }
  }
  updateSvPickerPreview();
}

function openStudyVaultPicker() {
  const state = getStudyVaultState();
  if (!state.subjects || state.subjects.length === 0) {
    if (typeof toast === 'function') toast('لا توجد مواد في StudyVault بعد، افتح StudyVault أولاً', 'info');
    return;
  }

  // إذا ماكو مادة محددة، نحدد الأولى
  if (!svPickerSelectedSubjectId || !state.subjects.some(s => s.id === svPickerSelectedSubjectId)) {
    svPickerSelectedSubjectId = state.subjects[0].id;
    svPickerSelectedChapter = state.subjects[0].currentChapter || 1;
  }

  renderSvPickerModalContent();

  if (typeof showModal === 'function') {
    showModal('modal-sv-picker');
  } else {
    const modal = document.getElementById('modal-sv-picker');
    if (modal) {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  if (typeof hydrateIcons === 'function') {
    const modal = document.getElementById('modal-sv-picker');
    if (modal) hydrateIcons(modal);
  }
}

function closeStudyVaultPicker() {
  if (typeof closeModal === 'function') {
    closeModal('modal-sv-picker');
  } else {
    const modal = document.getElementById('modal-sv-picker');
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }
}

function renderSvPickerModalContent() {
  const state = getStudyVaultState();
  const subChipsContainer = document.getElementById('sv-picker-subjects');
  const chChipsContainer = document.getElementById('sv-picker-chapters');
  const lecGridContainer = document.getElementById('sv-picker-lectures');
  const matChipsContainer = document.getElementById('sv-picker-materials');

  if (!subChipsContainer) return;

  const subjects = Array.isArray(state.subjects) && state.subjects.length > 0 
    ? state.subjects 
    : (USER_STUDYVAULT_DATA && USER_STUDYVAULT_DATA.subjects) || [];

  // إذا كانت المادة المحددة غير موجودة، نختار الأولى
  if (!svPickerSelectedSubjectId || !subjects.some(s => s.id === svPickerSelectedSubjectId)) {
    svPickerSelectedSubjectId = subjects[0] ? subjects[0].id : null;
  }

  // 1. المواد
  subChipsContainer.innerHTML = subjects.map(s => {
    const isSel = s.id === svPickerSelectedSubjectId;
    const col = s.color || '#38d9f5';
    return `
      <button type="button" class="sv-picker-chip ${isSel ? 'selected' : ''}" 
        style="${isSel ? `background:${col}22;border-color:${col};color:${col}` : ''}"
        onclick="svPickerSelectSubject('${s.id}')">
        <span class="sv-picker-dot" style="background:${col}"></span>
        <span>${typeof escapeHtml === 'function' ? escapeHtml(s.name) : s.name}</span>
      </button>
    `;
  }).join('');

  const currentSub = subjects.find(s => s.id === svPickerSelectedSubjectId) || subjects[0];
  if (!currentSub) return;

  // 2. الفصول (لوضع المحاضرات)
  const chaptersCount = Number(currentSub.chaptersCount) || 6;
  if (!svPickerSelectedChapter || svPickerSelectedChapter < 1 || svPickerSelectedChapter > chaptersCount) {
    svPickerSelectedChapter = currentSub.currentChapter || 1;
  }

  const chHtml = [];
  for (let c = 1; c <= chaptersCount; c++) {
    const isSel = c === svPickerSelectedChapter;
    const lecDone = (currentSub.lectureProgress && currentSub.lectureProgress[c]) || 0;
    const totalLec = (currentSub.chapterLectures && currentSub.chapterLectures[c]) || currentSub.lecPerCh || 8;
    const col = currentSub.color || '#38d9f5';
    chHtml.push(`
      <button type="button" class="sv-picker-chip ${isSel ? 'selected' : ''}"
        style="${isSel ? `background:${col}22;border-color:${col};color:${col}` : ''}"
        onclick="svPickerSelectChapter(${c})">
        <span>فصل ${c}</span>
        ${lecDone > 0 ? `<small style="font-size:10px;opacity:0.8">(${lecDone}/${totalLec})</small>` : ''}
      </button>
    `);
  }
  if (chChipsContainer) chChipsContainer.innerHTML = chHtml.join('');

  // 3. المحاضرات
  const totalLec = Number((currentSub.chapterLectures && currentSub.chapterLectures[svPickerSelectedChapter]) || currentSub.lecPerCh || 8);
  const currentReached = Number((currentSub.lectureProgress && currentSub.lectureProgress[svPickerSelectedChapter]) || 0);
  const recommendedLec = currentReached + 1 <= totalLec ? currentReached + 1 : totalLec;

  if (svPickerSelectedLecture == null || svPickerSelectedLecture < 1) {
    svPickerSelectedLecture = recommendedLec;
  }
  if (svPickerSelectedLecture > totalLec) {
    svPickerSelectedLecture = totalLec;
  }

  const lecHtml = [];
  const col = currentSub.color || '#38d9f5';
  for (let l = 1; l <= totalLec; l++) {
    const isSel = l === svPickerSelectedLecture;
    const isPast = l <= currentReached;
    lecHtml.push(`
      <button type="button" class="sv-picker-lec-btn ${isSel ? 'selected' : ''} ${isPast ? 'past' : ''}"
        style="${isSel ? `background:${col};border-color:${col};color:#000;font-weight:900` : ''}"
        onclick="svPickerSelectLecture(${l})">
        <span>${l}</span>
        ${isPast && !isSel ? '<span class="sv-lec-check">✓</span>' : ''}
      </button>
    `);
  }
  if (lecGridContainer) lecGridContainer.innerHTML = lecHtml.join('');

  // 4. الملازم والصفحات (لوضع الملازم)
  const materials = currentSub.materials || [];
  if (!svPickerSelectedMaterialId || !materials.some(m => m.id === svPickerSelectedMaterialId)) {
    svPickerSelectedMaterialId = materials.length > 0 ? materials[0].id : null;
  }

  if (matChipsContainer) {
    if (materials.length === 0) {
      matChipsContainer.innerHTML = `
        <div style="font-size:0.8rem;color:var(--text-muted);padding:8px 0;">
          ما اكو ملازم أو كتب مضافة لمادة ${escapeHtml(currentSub.name)} بعد. اضغط فوق لإضافة ملزمة.
        </div>
      `;
    } else {
      matChipsContainer.innerHTML = materials.map(m => {
        const isSel = m.id === svPickerSelectedMaterialId;
        return `
          <button type="button" class="sv-picker-chip ${isSel ? 'selected' : ''}"
            style="${isSel ? `background:${col}22;border-color:${col};color:${col}` : ''}"
            onclick="svPickerSelectMaterial('${m.id}')">
            <span>${m.type === 'book' ? '📕' : '📓'} ${typeof escapeHtml === 'function' ? escapeHtml(m.name) : m.name}</span>
            <small style="font-size:10px;opacity:0.8">(${m.currentPage || 0}/${m.totalPages || 0})</small>
          </button>
        `;
      }).join('');
    }
  }

  const curMat = materials.find(m => m.id === svPickerSelectedMaterialId) || materials[0];
  const curBadge = document.getElementById('sv-picker-cur-page-badge');
  const targetInput = document.getElementById('sv-picker-target-page-input');
  const fromInput = document.getElementById('sv-picker-from-page-input');
  const toInput = document.getElementById('sv-picker-to-page-input');

  if (curMat) {
    const curP = Number(curMat.currentPage || 0);
    const totalP = Number(curMat.totalPages || 100);
    if (curBadge) curBadge.textContent = `صفحة ${curP} من ${totalP}`;

    if (svPickerTargetPage <= 0 || svPickerTargetPage <= curP) {
      svPickerTargetPage = Math.min(totalP, curP + 10);
    }
    if (targetInput) {
      targetInput.max = totalP;
      targetInput.value = svPickerTargetPage;
    }

    if (fromInput && (!fromInput.value || Number(fromInput.value) <= 0)) {
      fromInput.value = curP + 1;
      svPickerFromPage = curP + 1;
    }
    if (toInput && (!toInput.value || Number(toInput.value) <= 0)) {
      toInput.value = Math.min(totalP, curP + 10);
      svPickerToPage = Math.min(totalP, curP + 10);
    }
  } else {
    if (curBadge) curBadge.textContent = 'لا توجد ملازم';
  }

  updateSvPickerPreview();
}

function svPickerSelectSubject(id) {
  svPickerSelectedSubjectId = id;
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === id);
  svPickerSelectedChapter = (sub && sub.currentChapter) || 1;
  const totalLec = Number((sub && sub.chapterLectures && sub.chapterLectures[svPickerSelectedChapter]) || (sub && sub.lecPerCh) || 8);
  const currentReached = Number((sub && sub.lectureProgress && sub.lectureProgress[svPickerSelectedChapter]) || 0);
  svPickerSelectedLecture = currentReached + 1 <= totalLec ? currentReached + 1 : totalLec;

  const mats = (sub && sub.materials) || [];
  svPickerSelectedMaterialId = mats.length > 0 ? mats[0].id : null;
  if (mats.length > 0) {
    const curP = Number(mats[0].currentPage || 0);
    const totalP = Number(mats[0].totalPages || 100);
    svPickerTargetPage = Math.min(totalP, curP + 10);
    svPickerFromPage = curP + 1;
    svPickerToPage = svPickerTargetPage;
  }

  renderSvPickerModalContent();
}

function svPickerSelectChapter(c) {
  svPickerSelectedChapter = c;
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  const totalLec = Number((sub && sub.chapterLectures && sub.chapterLectures[c]) || (sub && sub.lecPerCh) || 8);
  const currentReached = Number((sub && sub.lectureProgress && sub.lectureProgress[c]) || 0);
  svPickerSelectedLecture = currentReached + 1 <= totalLec ? currentReached + 1 : totalLec;
  renderSvPickerModalContent();
}

function svPickerSelectLecture(l) {
  svPickerSelectedLecture = l;
  renderSvPickerModalContent();
}

function svPickerSelectMaterial(mId) {
  svPickerSelectedMaterialId = mId;
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  const mat = (sub && sub.materials || []).find(m => m.id === mId);
  if (mat) {
    const curP = Number(mat.currentPage || 0);
    const totalP = Number(mat.totalPages || 100);
    svPickerTargetPage = Math.min(totalP, curP + 10);
    svPickerFromPage = curP + 1;
    svPickerToPage = svPickerTargetPage;
    const targetInput = document.getElementById('sv-picker-target-page-input');
    if (targetInput) {
      targetInput.value = svPickerTargetPage;
      targetInput.max = totalP;
    }
    const fromInput = document.getElementById('sv-picker-from-page-input');
    if (fromInput) fromInput.value = svPickerFromPage;
    const toInput = document.getElementById('sv-picker-to-page-input');
    if (toInput) toInput.value = svPickerToPage;
  }
  renderSvPickerModalContent();
}

function onSvTargetPageInputChange(val) {
  svPickerTargetPage = Math.max(1, parseInt(val) || 1);
  updateSvPickerPreview();
}

function onSvRangeInputChange() {
  const fromInput = document.getElementById('sv-picker-from-page-input');
  const toInput = document.getElementById('sv-picker-to-page-input');
  if (fromInput) svPickerFromPage = Math.max(1, parseInt(fromInput.value) || 1);
  if (toInput) svPickerToPage = Math.max(1, parseInt(toInput.value) || 1);
  updateSvPickerPreview();
}

function svPickerAddQuickPages(delta) {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  const mat = (sub && sub.materials || []).find(m => m.id === svPickerSelectedMaterialId);
  const curP = Number(mat ? mat.currentPage : 0);
  const totalP = Number(mat ? mat.totalPages : 999);

  let base = svPickerTargetPage > curP ? svPickerTargetPage : curP;
  svPickerTargetPage = Math.min(totalP, base + delta);
  const targetInput = document.getElementById('sv-picker-target-page-input');
  if (targetInput) targetInput.value = svPickerTargetPage;
  updateSvPickerPreview();
}

function updateSvPickerPreview() {
  const previewText = document.getElementById('sv-picker-preview');
  if (!previewText) return;

  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) {
    previewText.textContent = '--';
    return;
  }
  const col = sub.color || 'var(--primary)';

  if (svPickerMode === 'lectures') {
    previewText.innerHTML = `
      <span style="opacity:0.8">المحاضرة المختارة:</span>
      <b style="color:${col};margin-inline-start:6px;">${escapeHtml(sub.name)} — الفصل ${svPickerSelectedChapter}: محاضرة ${svPickerSelectedLecture}</b>
    `;
  } else {
    const materials = sub.materials || [];
    const mat = materials.find(m => m.id === svPickerSelectedMaterialId) || materials[0];
    if (!mat) {
      previewText.innerHTML = `<span style="color:var(--text-muted)">لا توجد ملزمة محددة لهذه المادة</span>`;
      return;
    }
    const curP = Number(mat.currentPage || 0);

    if (svPickerPagesSubMode === 'target') {
      const diff = Math.max(0, svPickerTargetPage - curP);
      const diffEl = document.getElementById('sv-picker-target-page-diff');
      if (diffEl) diffEl.textContent = `(+${diff} ص)`;
      previewText.innerHTML = `
        <span style="opacity:0.8">هدف الملزمة المختار:</span>
        <b style="color:${col};margin-inline-start:6px;">${escapeHtml(sub.name)} — ملزمة ${escapeHtml(mat.name)}: لحد ص ${svPickerTargetPage} ${diff > 0 ? `<small style="font-weight:normal;opacity:0.85">(${diff} صفحة جديدة)</small>` : ''}</b>
      `;
    } else {
      const count = Math.max(1, svPickerToPage - svPickerFromPage + 1);
      const rangeEl = document.getElementById('sv-picker-range-count');
      if (rangeEl) rangeEl.textContent = `المجموع: ${count} صفحة (${svPickerFromPage} إلى ${svPickerToPage})`;
      previewText.innerHTML = `
        <span style="opacity:0.8">هدف الملزمة المختار:</span>
        <b style="color:${col};margin-inline-start:6px;">${escapeHtml(sub.name)} — ملزمة ${escapeHtml(mat.name)}: ص ${svPickerFromPage} - ${svPickerToPage} <small style="font-weight:normal;opacity:0.85">(${count} صفحة)</small></b>
      `;
    }
  }
}

// إضافة سريعة لملزمة جديدة من داخل المودال إذا ماكو
function svPickerQuickAddMaterialPrompt() {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) return;

  const matName = prompt(`أدخل اسم الملزمة أو الكتاب لمادة (${sub.name}):`, 'ملزمة الجزء الأول');
  if (!matName || !matName.trim()) return;

  const totalStr = prompt('كم إجمالي عدد صفحات الملزمة؟', '120');
  const totalPages = parseInt(totalStr) || 100;

  if (!sub.materials) sub.materials = [];
  const newMat = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: matName.trim(),
    totalPages: totalPages,
    currentPage: 0,
    type: 'notes'
  };
  sub.materials.push(newMat);
  saveStudyVaultState(state);

  svPickerSelectedMaterialId = newMat.id;
  renderSvPickerModalContent();
  if (typeof toast === 'function') toast(`تمت إضافة الملزمة (${newMat.name}) بنجاح ✓`, 'ok');
}

// الزر الموحّد لتأكيد الإضافة لإنجازات اليوم
function confirmAddSvItemToAchievements() {
  if (svPickerMode === 'pages') {
    confirmAddSvMaterialToAchievements();
  } else {
    confirmAddSvLectureToAchievements();
  }
}

function confirmAddSvMaterialToAchievements() {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) {
    if (typeof toast === 'function') toast('يرجى اختيار المادة أولاً', 'error');
    return;
  }
  const materials = sub.materials || [];
  const mat = materials.find(m => m.id === svPickerSelectedMaterialId) || materials[0];
  if (!mat) {
    if (typeof toast === 'function') toast('يرجى إضافة ملزمة للمادة أولاً', 'error');
    return;
  }

  const curP = Number(mat.currentPage || 0);
  let text = '';
  let targetPage = svPickerTargetPage;
  let fromPage = curP;

  if (svPickerPagesSubMode === 'target') {
    targetPage = Number(document.getElementById('sv-picker-target-page-input')?.value || svPickerTargetPage);
    if (targetPage <= 0) targetPage = curP + 5;
    const diff = Math.max(0, targetPage - curP);
    text = `${sub.name} — ملزمة ${mat.name}: لحد ص ${targetPage}${diff > 0 ? ` (${diff} ص)` : ''}`;
  } else {
    fromPage = Number(document.getElementById('sv-picker-from-page-input')?.value || svPickerFromPage);
    targetPage = Number(document.getElementById('sv-picker-to-page-input')?.value || svPickerToPage);
    const count = Math.max(1, targetPage - fromPage + 1);
    text = `${sub.name} — ملزمة ${mat.name}: ص ${fromPage} - ${targetPage} (${count} ص)`;
  }

  if (typeof DATA !== 'undefined' && typeof currentDayKey === 'string') {
    const day = ensureDay(DATA, currentDayKey);
    day.achievements.push({
      id: uid(),
      text: text,
      done: false,
      createdAt: new Date().toISOString(),
      studyVaultRef: {
        type: 'material_pages',
        subjectId: sub.id,
        subjectName: sub.name,
        materialId: mat.id,
        materialName: mat.name,
        targetPage: targetPage,
        fromPage: fromPage,
        prevPage: curP,
        color: sub.color
      }
    });
    persist();
    renderAchievements();
    renderStats();
    if (typeof toast === 'function') toast(`أضيف هدف الملزمة لإنجازات اليوم: ${text}`, 'ok');
  } else {
    const input = document.getElementById('achieve-input');
    if (input) input.value = text;
  }

  closeStudyVaultPicker();
}

function confirmAddSvLectureToAchievements() {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) {
    if (typeof toast === 'function') toast('يرجى اختيار المادة أولاً', 'error');
    return;
  }
  if (svPickerSelectedLecture == null) {
    if (typeof toast === 'function') toast('يرجى اختيار رقم المحاضرة', 'error');
    return;
  }

  const ch = svPickerSelectedChapter;
  const lec = svPickerSelectedLecture;
  const text = `${sub.name} — الفصل ${ch}: محاضرة ${lec}`;

  // إضافة الإنجاز إلى اليوم الحالي في لوحة التحكم
  if (typeof DATA !== 'undefined' && typeof currentDayKey === 'string') {
    const day = ensureDay(DATA, currentDayKey);
    day.achievements.push({
      id: uid(),
      text: text,
      done: false,
      createdAt: new Date().toISOString(),
      studyVaultRef: {
        type: 'lecture',
        subjectId: sub.id,
        subjectName: sub.name,
        chapter: ch,
        lecture: lec,
        color: sub.color
      }
    });
    persist();
    renderAchievements();
    renderStats();
    if (typeof toast === 'function') toast(`أضيفت المحاضرة لهدف اليوم: ${text}`, 'ok');
  } else {
    // إذا استخدمت من مكان آخر، نملأ حقل الإدخال
    const input = document.getElementById('achieve-input');
    if (input) input.value = text;
  }

  closeStudyVaultPicker();
}

// استماع للتحديثات عبر التبويبات
window.addEventListener('storage', (e) => {
  if (!e.key || e.key === SV_STORAGE_KEY) {
    renderSvWeeklyGoalsWidget();
  }
});

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  renderSvWeeklyGoalsWidget();
});
