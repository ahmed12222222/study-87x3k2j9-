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

function normalizeStudyVaultData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const state = {
    updatedAt: Number(raw.updatedAt) || Date.now(),
    instructors: Array.isArray(raw.instructors) && raw.instructors.length > 0 ? [...raw.instructors] : [
      "حيدر عبد الائمه",
      "حمزه الجابري",
      "مؤيد سليم",
      "مصطفى الحافظ",
      "حسين الهاشمي"
    ],
    studyLog: Array.isArray(raw.studyLog) ? [...raw.studyLog] : [],
    subjects: []
  };

  if (Array.isArray(raw.subjects)) {
    state.subjects = raw.subjects.map(s => {
      if (!s || typeof s !== 'object') return null;

      const normProgress = {};
      if (s.lectureProgress) {
        if (Array.isArray(s.lectureProgress)) {
          s.lectureProgress.forEach((val, idx) => {
            if (val != null && idx > 0) normProgress[String(idx)] = Number(val) || 0;
          });
        } else if (typeof s.lectureProgress === 'object') {
          Object.keys(s.lectureProgress).forEach(k => {
            normProgress[String(k)] = Number(s.lectureProgress[k]) || 0;
          });
        }
      }

      const normCompletedLectures = {};
      if (s.completedLectures && typeof s.completedLectures === 'object' && !Array.isArray(s.completedLectures)) {
        Object.keys(s.completedLectures).forEach(k => {
          if (Array.isArray(s.completedLectures[k])) {
            normCompletedLectures[String(k)] = s.completedLectures[k].map(Number).filter(n => n > 0).sort((a,b) => a - b);
          }
        });
      }
      Object.keys(normProgress).forEach(k => {
        if (!normCompletedLectures[k] && normProgress[k] > 0) {
          normCompletedLectures[k] = Array.from({length: normProgress[k]}, (_, i) => i + 1);
        }
      });
      Object.keys(normCompletedLectures).forEach(k => {
        normProgress[k] = normCompletedLectures[k].length;
      });

      const normChapterLectures = {};
      if (s.chapterLectures) {
        if (Array.isArray(s.chapterLectures)) {
          s.chapterLectures.forEach((val, idx) => {
            if (val != null && idx > 0) normChapterLectures[String(idx)] = Number(val) || 0;
          });
        } else if (typeof s.chapterLectures === 'object') {
          Object.keys(s.chapterLectures).forEach(k => {
            normChapterLectures[String(k)] = Number(s.chapterLectures[k]) || 0;
          });
        }
      }

      const normMaterials = Array.isArray(s.materials)
        ? s.materials.filter(m => m && typeof m === 'object').map(m => ({
            id: m.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
            type: m.type || 'note',
            name: m.name || 'ملزمة',
            totalPages: Number(m.totalPages) || 0,
            currentPage: Number(m.currentPage) || 0
          }))
        : [];

      return {
        id: s.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
        name: s.name || 'مادة',
        chaptersCount: Number(s.chaptersCount) || 8,
        lecPerCh: Number(s.lecPerCh) || 8,
        color: s.color || '#7b5ef8',
        instructor: s.instructor || '',
        currentChapter: Number(s.currentChapter) || 1,
        completedLectures: normCompletedLectures,
        lectureProgress: normProgress,
        chapterLectures: normChapterLectures,
        materials: normMaterials,
        notes: s.notes || '',
        weeklyGoal: Number(s.weeklyGoal) || 0,
        weeklyGoalType: s.weeklyGoalType || 'lectures',
        weeklyMaterialId: s.weeklyMaterialId || (normMaterials[0] ? normMaterials[0].id : ''),
        weeklyTargetPage: Number(s.weeklyTargetPage) || 0
      };
    }).filter(Boolean);
  }
  return state;
}

function getStudyVaultState() {
  try {
    const raw = localStorage.getItem(SV_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        const norm = normalizeStudyVaultData(parsed);
        if (norm) return norm;
      }
    }
  } catch (e) {
    console.error('Error loading StudyVault state:', e);
  }
  const fallback = normalizeStudyVaultData(USER_STUDYVAULT_DATA) || USER_STUDYVAULT_DATA;
  try {
    localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(fallback));
  } catch {}
  return JSON.parse(JSON.stringify(fallback));
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

// جلب احتياطي مباشر عبر HTTPS REST عند تعذر الـ SDK
async function fetchStudyVaultViaRest() {
  const cfg = window.INJAZ_FIREBASE_CONFIG;
  const dbUrl = (cfg && cfg.databaseURL) || 'https://injaz-78e0d-default-rtdb.europe-west1.firebasedatabase.app';
  const resp = await fetch(`${dbUrl}/${SV_FIREBASE_PATH}.json?nocache=${Date.now()}`, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store'
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return await resp.json();
}

// مزامنة مبدئية مع Firebase عند بدء التشغيل
async function initStudyVaultFirebaseSync() {
  if (typeof window === 'undefined') return;
  const cfg = window.INJAZ_FIREBASE_CONFIG;
  if (!cfg || !cfg.databaseURL) return;

  let executed = false;
  const tryConnect = async () => {
    if (executed) return;
    executed = true;

    try {
      let remote = null;
      if (window.FirebaseSync && typeof window.FirebaseSync.readOnce === 'function') {
        try {
          window.FirebaseSync.init(cfg);
          if (typeof window.FirebaseSync.signInAnon === 'function') {
            await window.FirebaseSync.signInAnon().catch(() => {});
          }
          remote = await window.FirebaseSync.readOnce(SV_FIREBASE_PATH);
        } catch (sdkErr) {
          console.warn('FirebaseSync SDK read in bridge warning:', sdkErr);
        }
      }

      // إذا لم يتم الجلب عبر الـ SDK نحاول عبر REST المباشر
      if (!remote) {
        try {
          remote = await fetchStudyVaultViaRest();
        } catch (restErr) {
          console.warn('REST bridge fetch note:', restErr);
        }
      }

      if (remote && Array.isArray(remote.subjects) && remote.subjects.length > 0) {
        const norm = normalizeStudyVaultData(remote);
        if (norm) {
          const local = getStudyVaultState();
          if ((norm.updatedAt || 0) > (local.updatedAt || 0)) {
            localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(norm));
            window.dispatchEvent(new Event('storage'));
            renderSvWeeklyGoalsWidget();
          }
        }
      }

      // استماع للتحديثات الحية إذا كان SDK متوفراً
      if (window.FirebaseSync && typeof window.FirebaseSync.listen === 'function') {
        window.FirebaseSync.listen(SV_FIREBASE_PATH, (remoteData) => {
          if (remoteData && Array.isArray(remoteData.subjects)) {
            const norm = normalizeStudyVaultData(remoteData);
            if (norm) {
              const cur = getStudyVaultState();
              if ((norm.updatedAt || 0) > (cur.updatedAt || 0)) {
                localStorage.setItem(SV_STORAGE_KEY, JSON.stringify(norm));
                window.dispatchEvent(new Event('storage'));
                renderSvWeeklyGoalsWidget();
              }
            }
          }
        });
      }
    } catch (e) {
      console.warn('StudyVault Firebase sync initialization note:', e);
    }
  };

  if (window.FirebaseSync) {
    tryConnect();
  } else {
    window.addEventListener('firebase-bridge-ready', tryConnect, { once: true });
    setTimeout(() => {
      tryConnect();
    }, 1500);
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

// فحص هل المحاضرة مكتملة في StudyVault
function svIsLectureCompleted(sub, chapterNum, lectureNum) {
  if (!sub) return false;
  const ch = Number(chapterNum);
  const lec = Number(lectureNum);
  if (sub.completedLectures && Array.isArray(sub.completedLectures[ch])) {
    return sub.completedLectures[ch].includes(lec);
  }
  return lec <= Number((sub.lectureProgress && sub.lectureProgress[ch]) || 0);
}

// علامة صح في StudyVault عند إكمال المحاضرة بإنجازات اليوم (تدعم القفز الفردي بدون إكمال السابق)
function svMarkLectureDone(subjectId, chapterNum, lectureNum) {
  const state = getStudyVaultState();
  const sub = state.subjects.find(s => s.id === subjectId || s.name === subjectId);
  if (!sub) return;

  const ch = Number(chapterNum);
  const lec = Number(lectureNum);
  if (!sub.completedLectures) sub.completedLectures = {};
  if (!Array.isArray(sub.completedLectures[ch])) {
    const prevCount = (sub.lectureProgress && sub.lectureProgress[ch]) || 0;
    sub.completedLectures[ch] = prevCount > 0 ? Array.from({length: prevCount}, (_, i) => i + 1) : [];
  }

  if (!sub.completedLectures[ch].includes(lec)) {
    sub.completedLectures[ch].push(lec);
    sub.completedLectures[ch].sort((a, b) => a - b);
  }
  if (!sub.lectureProgress) sub.lectureProgress = {};
  sub.lectureProgress[ch] = sub.completedLectures[ch].length;

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

  if (sub.completedLectures && Array.isArray(sub.completedLectures[ch])) {
    sub.completedLectures[ch] = sub.completedLectures[ch].filter(x => x !== lec);
  }
  if (!sub.lectureProgress) sub.lectureProgress = {};
  sub.lectureProgress[ch] = (sub.completedLectures && sub.completedLectures[ch]) ? sub.completedLectures[ch].length : 0;

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
let svPickerBasket = []; // سلة التحديد المتعدد لإضافة عدة أهداف ومحاضرات دفعة واحدة

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
  renderSvPickerBasket();
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

  if (!svPickerSelectedSubjectId || !state.subjects.some(s => s.id === svPickerSelectedSubjectId)) {
    svPickerSelectedSubjectId = state.subjects[0].id;
    svPickerSelectedChapter = state.subjects[0].currentChapter || 1;
  }

  renderSvPickerModalContent();
  renderSvPickerBasket();

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

  if (!svPickerSelectedSubjectId || !subjects.some(s => s.id === svPickerSelectedSubjectId)) {
    svPickerSelectedSubjectId = subjects[0] ? subjects[0].id : null;
  }

  // 1. شريط المواد مع إبراز عدد العناصر المحددة لكل مادة
  subChipsContainer.innerHTML = subjects.map(s => {
    const isSel = s.id === svPickerSelectedSubjectId;
    const col = s.color || '#38d9f5';
    const subBasketCount = svPickerBasket.filter(b => b.subjectId === s.id).length;
    return `
      <button type="button" class="sv-picker-chip ${isSel ? 'selected' : ''}" 
        style="${isSel ? `background:${col}22;border-color:${col};color:${col};font-weight:800;` : ''}"
        onclick="svPickerSelectSubject('${s.id}')">
        <span class="sv-picker-dot" style="background:${col}"></span>
        <span>${typeof escapeHtml === 'function' ? escapeHtml(s.name) : s.name}</span>
        ${subBasketCount > 0 ? `<span style="background:${col};color:#000;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:900;">${subBasketCount}</span>` : ''}
      </button>
    `;
  }).join('');

  const currentSub = subjects.find(s => s.id === svPickerSelectedSubjectId) || subjects[0];
  if (!currentSub) return;

  // 2. الفصول
  const chaptersCount = Number(currentSub.chaptersCount) || 6;
  if (!svPickerSelectedChapter || svPickerSelectedChapter < 1 || svPickerSelectedChapter > chaptersCount) {
    svPickerSelectedChapter = currentSub.currentChapter || 1;
  }

  const chHtml = [];
  for (let c = 1; c <= chaptersCount; c++) {
    const isSel = c === svPickerSelectedChapter;
    const doneList = (currentSub.completedLectures && Array.isArray(currentSub.completedLectures[c]))
      ? currentSub.completedLectures[c]
      : (currentSub.lectureProgress && currentSub.lectureProgress[c]
          ? Array.from({length: currentSub.lectureProgress[c]}, (_, i) => i + 1)
          : []);
    const lecDone = doneList.length;
    const totalLec = (currentSub.chapterLectures && currentSub.chapterLectures[c]) || currentSub.lecPerCh || 8;
    const col = currentSub.color || '#38d9f5';
    const chBasketCount = svPickerBasket.filter(b => b.type === 'lecture' && b.subjectId === currentSub.id && Number(b.chapter) === c).length;

    chHtml.push(`
      <button type="button" class="sv-picker-chip ${isSel ? 'selected' : ''}"
        style="${isSel ? `background:${col}22;border-color:${col};color:${col};font-weight:800;` : ''}"
        onclick="svPickerSelectChapter(${c})">
        <span>فصل ${c}</span>
        ${lecDone > 0 ? `<small style="font-size:10px;opacity:0.8">(${lecDone}/${totalLec})</small>` : ''}
        ${chBasketCount > 0 ? `<span style="background:${col};color:#000;border-radius:10px;padding:0 5px;font-size:10px;font-weight:900;">+${chBasketCount}</span>` : ''}
      </button>
    `);
  }
  if (chChipsContainer) chChipsContainer.innerHTML = chHtml.join('');

  // 3. المحاضرات مع دعم التحديد المتعدد والتفريد
  const totalLec = Number((currentSub.chapterLectures && currentSub.chapterLectures[svPickerSelectedChapter]) || currentSub.lecPerCh || 8);
  const doneList = (currentSub.completedLectures && Array.isArray(currentSub.completedLectures[svPickerSelectedChapter]))
    ? currentSub.completedLectures[svPickerSelectedChapter]
    : (currentSub.lectureProgress && currentSub.lectureProgress[svPickerSelectedChapter]
        ? Array.from({length: currentSub.lectureProgress[svPickerSelectedChapter]}, (_, i) => i + 1)
        : []);

  if (svPickerSelectedLecture == null || svPickerSelectedLecture < 1) {
    svPickerSelectedLecture = 1;
  }
  if (svPickerSelectedLecture > totalLec) {
    svPickerSelectedLecture = totalLec;
  }

  const lecHtml = [];
  const col = currentSub.color || '#38d9f5';
  for (let l = 1; l <= totalLec; l++) {
    const inBasket = svPickerBasket.some(b => b.type === 'lecture' && b.subjectId === currentSub.id && Number(b.chapter) === Number(svPickerSelectedChapter) && Number(b.lecture) === l);
    const isVaultDone = doneList.includes(l);
    const isCur = l === svPickerSelectedLecture;

    lecHtml.push(`
      <button type="button" class="sv-picker-lec-btn ${inBasket ? 'in-basket selected' : ''} ${isVaultDone ? 'past' : ''}"
        style="${inBasket ? `background:${col};border-color:${col};color:#000;font-weight:900;box-shadow:0 0 10px ${col}88;` : (isCur ? `border-color:${col};` : '')}"
        onclick="svPickerToggleLecture('${currentSub.id}', ${svPickerSelectedChapter}, ${l})"
        title="محاضرة ${l} ${isVaultDone ? '(منجزة في StudyVault)' : ''}">
        <span>${l}</span>
        ${inBasket ? '<span class="sv-lec-check" style="position:absolute;top:2px;right:3px;font-size:10px;font-weight:900;color:#000;">✓</span>' : (isVaultDone ? '<span class="sv-lec-check" style="position:absolute;top:2px;right:3px;font-size:9px;color:var(--success);font-weight:900;" title="منجزة سابقا">✓</span>' : '')}
      </button>
    `);
  }
  if (lecGridContainer) lecGridContainer.innerHTML = lecHtml.join('');

  // 4. الملازم والصفحات
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
        const matBasketCount = svPickerBasket.filter(b => b.type === 'material_pages' && b.materialId === m.id).length;
        return `
          <button type="button" class="sv-picker-chip ${isSel ? 'selected' : ''}"
            style="${isSel ? `background:${col}22;border-color:${col};color:${col}` : ''}"
            onclick="svPickerSelectMaterial('${m.id}')">
            <span>${m.type === 'book' ? '📕' : '📓'} ${typeof escapeHtml === 'function' ? escapeHtml(m.name) : m.name}</span>
            <small style="font-size:10px;opacity:0.8">(${m.currentPage || 0}/${m.totalPages || 0})</small>
            ${matBasketCount > 0 ? `<span style="background:${col};color:#000;border-radius:10px;padding:0 5px;font-size:10px;font-weight:900;">+${matBasketCount}</span>` : ''}
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
  renderSvPickerBasket();
}

function svPickerSelectSubject(id) {
  svPickerSelectedSubjectId = id;
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === id);
  svPickerSelectedChapter = (sub && sub.currentChapter) || 1;
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
  renderSvPickerModalContent();
}

function svPickerSelectLecture(l) {
  svPickerSelectedLecture = l;
  svPickerToggleLecture(svPickerSelectedSubjectId, svPickerSelectedChapter, l);
}

function svPickerToggleLecture(subId, ch, l) {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === subId);
  if (!sub) return;

  svPickerSelectedLecture = l;
  const existingIdx = svPickerBasket.findIndex(b => b.type === 'lecture' && b.subjectId === sub.id && Number(b.chapter) === Number(ch) && Number(b.lecture) === Number(l));

  if (existingIdx !== -1) {
    svPickerBasket.splice(existingIdx, 1);
  } else {
    svPickerBasket.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + l,
      type: 'lecture',
      subjectId: sub.id,
      subjectName: sub.name,
      chapter: Number(ch),
      lecture: Number(l),
      color: sub.color || '#38d9f5',
      text: `${sub.name} — الفصل ${ch}: محاضرة ${l}`
    });
  }

  renderSvPickerModalContent();
  renderSvPickerBasket();
  updateSvPickerPreview();
}

function svPickerSelectRangeHelper(fromL, toL) {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) return;
  const ch = Number(svPickerSelectedChapter);
  const total = Number((sub.chapterLectures && sub.chapterLectures[ch]) || sub.lecPerCh || 8);

  const start = Math.max(1, fromL);
  const end = Math.min(total, toL);

  for (let l = start; l <= end; l++) {
    const exists = svPickerBasket.some(b => b.type === 'lecture' && b.subjectId === sub.id && Number(b.chapter) === ch && Number(b.lecture) === l);
    if (!exists) {
      svPickerBasket.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + l,
        type: 'lecture',
        subjectId: sub.id,
        subjectName: sub.name,
        chapter: ch,
        lecture: l,
        color: sub.color || '#38d9f5',
        text: `${sub.name} — الفصل ${ch}: محاضرة ${l}`
      });
    }
  }
  renderSvPickerModalContent();
  renderSvPickerBasket();
  updateSvPickerPreview();
  if (typeof toast === 'function') toast(`تمت إضافة المحاضرات (${start} إلى ${end}) للسلة ✓`, 'ok');
}

function svPickerPromptCustomRange() {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) return;
  const ch = svPickerSelectedChapter;
  const total = Number((sub.chapterLectures && sub.chapterLectures[ch]) || sub.lecPerCh || 8);

  const fromVal = prompt(`تحديد مجال محاضرات الفصل ${ch}\nإجمالي محاضرات الفصل: ${total}\n\nابدأ من محاضرة رقم:`, '1');
  if (fromVal === null) return;
  const toVal = prompt(`إلى محاضرة رقم:`, '4');
  if (toVal === null) return;

  const f = parseInt(fromVal) || 1;
  const t = parseInt(toVal) || f;
  svPickerSelectRangeHelper(Math.min(f, t), Math.max(f, t));
}

function svPickerSelectAllChapterLectures() {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) return;
  const ch = svPickerSelectedChapter;
  const total = Number((sub.chapterLectures && sub.chapterLectures[ch]) || sub.lecPerCh || 8);
  svPickerSelectRangeHelper(1, total);
}

function svPickerClearChapterLectures() {
  const subId = svPickerSelectedSubjectId;
  const ch = Number(svPickerSelectedChapter);
  svPickerBasket = svPickerBasket.filter(b => !(b.type === 'lecture' && b.subjectId === subId && Number(b.chapter) === ch));
  renderSvPickerModalContent();
  renderSvPickerBasket();
  updateSvPickerPreview();
  if (typeof toast === 'function') toast('تم إلغاء تحديد محاضرات هذا الفصل من السلة', 'bad');
}

function svPickerAddCurrentMaterialToBasket() {
  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) return;
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

  const exists = svPickerBasket.some(b => b.type === 'material_pages' && b.materialId === mat.id && b.targetPage === targetPage && b.fromPage === fromPage);
  if (!exists) {
    svPickerBasket.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: 'material_pages',
      subjectId: sub.id,
      subjectName: sub.name,
      materialId: mat.id,
      materialName: mat.name,
      targetPage: targetPage,
      fromPage: fromPage,
      prevPage: curP,
      color: sub.color || '#38d9f5',
      text: text
    });
    if (typeof toast === 'function') toast(`أضيفت الملزمة إلى سلة الأهداف (${mat.name}: ص ${targetPage}) ✓`, 'ok');
  } else {
    if (typeof toast === 'function') toast('هذا الهدف مضاف بالفعل في السلة', 'info');
  }

  renderSvPickerBasket();
  updateSvPickerPreview();
}

function svPickerRemoveBasketItem(id) {
  svPickerBasket = svPickerBasket.filter(b => b.id !== id);
  renderSvPickerModalContent();
  renderSvPickerBasket();
  updateSvPickerPreview();
}

function svPickerClearBasket() {
  svPickerBasket = [];
  renderSvPickerModalContent();
  renderSvPickerBasket();
  updateSvPickerPreview();
  if (typeof toast === 'function') toast('تم تفريغ سلة الأهداف', 'bad');
}

function renderSvPickerBasket() {
  const basketCountEl = document.getElementById('sv-basket-count');
  const basketItemsEl = document.getElementById('sv-basket-items');
  const confirmBtnText = document.getElementById('btn-sv-picker-confirm-text');

  if (basketCountEl) basketCountEl.textContent = svPickerBasket.length;

  if (basketItemsEl) {
    if (svPickerBasket.length === 0) {
      basketItemsEl.innerHTML = `<span style="font-size:0.78rem;color:var(--text-muted);">انقر على المحاضرات أو أضف ملزمة لتجميع أهداف الجلسة معاً هنا.</span>`;
    } else {
      basketItemsEl.innerHTML = svPickerBasket.map(item => `
        <div class="sv-basket-chip" style="display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:16px;background:${item.color}20;border:1px solid ${item.color}88;color:${item.color};font-size:0.78rem;font-weight:700;">
          <span>${typeof escapeHtml === 'function' ? escapeHtml(item.text) : item.text}</span>
          <button type="button" onclick="svPickerRemoveBasketItem('${item.id}')" style="background:none;border:none;color:${item.color};cursor:pointer;font-weight:900;font-size:0.85rem;padding:0 2px;" title="إزالة">✕</button>
        </div>
      `).join('');
    }
  }

  if (confirmBtnText) {
    if (svPickerBasket.length > 0) {
      confirmBtnText.textContent = `إضافة ${svPickerBasket.length} أهداف دفعة واحدة للإنجازات 🚀`;
    } else {
      confirmBtnText.textContent = 'إضافة لإنجازات اليوم';
    }
  }
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

  if (svPickerBasket.length > 0) {
    previewText.innerHTML = `
      <span style="opacity:0.9">جاهز لإضافة:</span>
      <b style="color:var(--primary);margin-inline-start:6px;">${svPickerBasket.length} أهداف محددة في السلة</b>
    `;
    return;
  }

  const state = getStudyVaultState();
  const sub = (state.subjects || []).find(s => s.id === svPickerSelectedSubjectId);
  if (!sub) {
    previewText.textContent = '--';
    return;
  }
  const col = sub.color || 'var(--primary)';

  if (svPickerMode === 'lectures') {
    previewText.innerHTML = `
      <span style="opacity:0.8">المحاضرة المحددة:</span>
      <b style="color:${col};margin-inline-start:6px;">${escapeHtml(sub.name)} — الفصل ${svPickerSelectedChapter}: محاضرة ${svPickerSelectedLecture || 1}</b>
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

// الزر الموحّد لتأكيد الإضافة لإنجازات اليوم (يدعم الدفعة والسلة والسحب الفردي)
function confirmAddSvItemToAchievements() {
  if (svPickerBasket.length > 0) {
    if (typeof DATA !== 'undefined' && typeof currentDayKey === 'string') {
      const day = ensureDay(DATA, currentDayKey);
      let count = 0;
      svPickerBasket.forEach(item => {
        if (!day.achievements.some(a => a.text === item.text)) {
          day.achievements.push({
            id: uid(),
            text: item.text,
            done: false,
            createdAt: new Date().toISOString(),
            studyVaultRef: item.type === 'material_pages' ? {
              type: 'material_pages',
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              materialId: item.materialId,
              materialName: item.materialName,
              targetPage: item.targetPage,
              fromPage: item.fromPage,
              prevPage: item.prevPage,
              color: item.color
            } : {
              type: 'lecture',
              subjectId: item.subjectId,
              subjectName: item.subjectName,
              chapter: item.chapter,
              lecture: item.lecture,
              color: item.color
            }
          });
          count++;
        }
      });
      persist();
      renderAchievements();
      renderStats();
      if (typeof toast === 'function') toast(`تمت إضافة ${count} أهداف بنجاح دفعة واحدة إلى إنجازات اليوم! 👏`, 'ok');
    }
    svPickerBasket = [];
    renderSvPickerBasket();
    closeStudyVaultPicker();
    return;
  }

  // إضافة فردية إذا كانت السلة فارغة
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
