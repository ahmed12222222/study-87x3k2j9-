/* ============================================================
   إنجاز — صفحة المراجعات والامتحانات
   ============================================================ */

let DATA = loadData();

function persist(){
  saveData(DATA);
  scheduleSyncPush();
}

const scheduleSyncPush = debounce(async function(){
  const cfg = getEffectiveFirebaseConfig();
  if(!cfg) return;
  try{ await pushRemoteData(cfg, DATA); }
  catch(e){ console.error('sync error:', e); }
}, 3500);

function showModal(id){ document.getElementById(id).classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeModal(id){ document.getElementById(id).classList.remove('show'); document.body.style.overflow = ''; }

function renderBrandName(){
  const el = document.getElementById('brand-role-name');
  if(el) el.textContent = DATA.settings.studentName || 'المذاكِر المجتهد';
}

function renderHeaderClock(){
  const now = new Date();
  const clockEl = document.getElementById('live-clock');
  if(clockEl) clockEl.textContent = formatTime(now);
  const dateEl = document.getElementById('today-date');
  if(dateEl) dateEl.textContent = formatDateArabic(now);
}

/* -------------------- المواد الدراسية -------------------- */
function getSubjectById(id){
  return ensureReview(DATA).subjects.find(s => s.id === id);
}

function addSubject(){
  const input = document.getElementById('subject-name-input');
  const name = input.value.trim();
  if(!name) return;
  const review = ensureReview(DATA);
  if(review.subjects.some(s => s.name === name)){ toast('هذي المادة مضافة أصلاً', 'error'); return; }
  review.subjects.push({ id: uid(), name, color: getNextPaletteColor(review.subjects) });
  persist();
  renderSubjects();
  renderSubjectPicker();
  input.value = '';
  input.focus();
}

function deleteSubject(id){
  if(!confirm('حذف هذي المادة؟ المواضيع المرتبطة بيها تضل موجودة بس بدون هذا التصنيف.')) return;
  const review = ensureReview(DATA);
  review.subjects = review.subjects.filter(s => s.id !== id);
  review.items.forEach(item => { item.subjectIds = (item.subjectIds || []).filter(sid => sid !== id); });
  persist();
  renderAll();
}

function renderSubjects(){
  const review = ensureReview(DATA);
  const listEl = document.getElementById('subjects-list');
  if(!listEl) return;
  if(review.subjects.length === 0){
    listEl.innerHTML = `<div class="empty-state-mini">ضيف أول مادة عشان تكدر تربط المواضيع بيها</div>`;
  } else {
    listEl.innerHTML = review.subjects.map(s => `
      <span class="subject-chip" style="--chip-color:${s.color}">
        <span class="subject-chip-dot"></span>${escapeHtml(s.name)}
        <button type="button" class="subject-chip-x" onclick="deleteSubject('${s.id}')" aria-label="حذف">${ICONS.x}</button>
      </span>
    `).join('');
  }
}

function renderSubjectPicker(){
  const review = ensureReview(DATA);
  const wrap = document.getElementById('review-subjects-picker');
  if(!wrap) return;
  if(review.subjects.length === 0){
    wrap.innerHTML = `<span class="form-hint">ضيف مادة أول من فوق عشان تربط بيها المواضيع</span>`;
  } else {
    wrap.innerHTML = review.subjects.map(s => `
      <label class="subject-pick-item" style="--chip-color:${s.color}">
        <input type="checkbox" value="${s.id}" class="subject-pick-checkbox">
        <span class="subject-chip-dot"></span>${escapeHtml(s.name)}
      </label>
    `).join('');
  }
}

function renderSubjectTagsHtml(subjectIds){
  return (subjectIds || []).map(sid => {
    const s = getSubjectById(sid);
    if(!s) return '';
    return `<span class="subject-tag" style="--chip-color:${s.color}">${escapeHtml(s.name)}</span>`;
  }).join('');
}

/* -------------------- نموذج إضافة موضوع مراجعة -------------------- */
function toggleRecurringSchedule(){
  const checked = document.getElementById('review-recurring-toggle').checked;
  const section = document.getElementById('review-schedule-section');
  if(section) section.style.display = checked ? '' : 'none';
}

function setScheduleType(type){
  document.querySelectorAll('.schedule-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  document.querySelectorAll('.schedule-sub').forEach(el => { el.style.display = 'none'; });
  const target = document.getElementById(`schedule-sub-${type}`);
  if(target) target.style.display = '';
  document.getElementById('review-form').dataset.scheduleType = type;
}

function toggleDayChip(el){
  el.classList.toggle('active');
}

function addReviewItem(){
  const titleInput = document.getElementById('review-title-input');
  const title = titleInput.value.trim();
  if(!title){ toast('اكتب اسم الموضوع أو الامتحان أول', 'error'); return; }

  const subjectIds = Array.from(document.querySelectorAll('.subject-pick-checkbox:checked')).map(cb => cb.value);
  const isRecurring = document.getElementById('review-recurring-toggle').checked;
  const examDate = document.getElementById('review-exam-date').value || null;
  const examTime = document.getElementById('review-exam-time').value || null;

  let schedule = null;
  let scheduleWeeks = null;
  if(isRecurring){
    const scheduleType = document.getElementById('review-form').dataset.scheduleType || 'daily';
    schedule = { type: scheduleType };
    if(scheduleType === 'daily'){
      schedule.timesPerDay = Math.max(1, parseInt(document.getElementById('review-times-per-day').value) || 1);
    } else if(scheduleType === 'week'){
      schedule.daysOfWeek = Array.from(document.querySelectorAll('.day-chip.active')).map(el => parseInt(el.dataset.day));
      if(schedule.daysOfWeek.length === 0){ toast('اختار يوم وحد على الأقل بالأسبوع', 'error'); return; }
    } else if(scheduleType === 'every'){
      schedule.everyN = Math.max(1, parseInt(document.getElementById('review-every-n').value) || 1);
    }
    const weeksVal = parseInt(document.getElementById('review-end-weeks').value);
    scheduleWeeks = (weeksVal > 0) ? weeksVal : null;
  } else if(!examDate){
    toast('إذا مو مراجعة متكررة، لازم تحدد موعد الامتحان أقلاً', 'error');
    return;
  }

  const startDate = document.getElementById('review-start-date').value || todayKey();

  const review = ensureReview(DATA);
  review.items.push({
    id: uid(), title, subjectIds, schedule, scheduleWeeks, startDate, examDate, examTime,
    completedDates: [], createdAt: new Date().toISOString(),
  });
  persist();
  renderAll();

  titleInput.value = '';
  document.querySelectorAll('.subject-pick-checkbox').forEach(cb => { cb.checked = false; });
  document.getElementById('review-exam-date').value = '';
  document.getElementById('review-exam-time').value = '';
  document.getElementById('review-end-weeks').value = '';
  document.querySelectorAll('.day-chip.active').forEach(el => el.classList.remove('active'));
  toast(isRecurring ? 'تم إضافة الموضوع للخطة ✓' : 'تم إضافة الامتحان ✓', 'success');
}

function deleteReviewItem(id){
  if(!confirm('حذف هذا الموضوع نهائياً من خطة المراجعة؟')) return;
  const review = ensureReview(DATA);
  review.items = review.items.filter(i => i.id !== id);
  persist();
  renderAll();
}

function toggleTodayDone(id){
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === id);
  if(!item) return;
  const key = todayKey();
  if(!item.completedDates) item.completedDates = [];
  const idx = item.completedDates.indexOf(key);
  if(idx === -1){ item.completedDates.push(key); }
  else { item.completedDates.splice(idx, 1); }
  persist();
  renderTodayLists();

  const allDone = getDueTodayItems().every(it => (it.completedDates || []).includes(key));
  if(idx === -1 && allDone && getDueTodayItems().length > 0){
    confettiBurst();
    toast('خلّصت كل مراجعات اليوم! 🎉', 'success');
  }
}

/* -------------------- عرض «اليوم» -------------------- */
function getDueTodayItems(){
  const review = ensureReview(DATA);
  const now = new Date();
  return review.items.filter(item => isReviewDueOn(item, now));
}

function renderTodayLists(){
  const review = ensureReview(DATA);
  const todayKeyStr = todayKey();
  const dueToday = getDueTodayItems();
  const pending = dueToday.filter(item => !((item.completedDates || []).includes(todayKeyStr)));

  const listEl = document.getElementById('today-reviews-list');
  if(dueToday.length === 0){
    listEl.innerHTML = `<div class="empty-state">${ICONS.info}<div>ما اكو مراجعات مجدولة اليوم</div></div>`;
  } else if(pending.length === 0){
    listEl.innerHTML = `<div class="empty-state">${ICONS.checkCircle}<div>خلّصت كل مراجعات اليوم! تراجعها تلقائياً تطلع لك بيوم جدولها الجاي 🌙</div></div>`;
  } else {
    const sorted = pending.slice().sort((a, b) => {
      const da = daysUntil(a.examDate), db = daysUntil(b.examDate);
      if(da == null && db == null) return 0;
      if(da == null) return 1;
      if(db == null) return -1;
      return da - db;
    });
    listEl.innerHTML = sorted.map(item => {
      const dLeft = daysUntil(item.examDate);
      const countdown = (dLeft != null && dLeft >= 0)
        ? `<span class="exam-countdown">${dLeft === 0 ? 'الامتحان اليوم! 🔥' : `باقي ${arCount(dLeft,'يوم','أيام')} للامتحان`}</span>` : '';
      const hasQuestions = (item.questions || []).length > 0;
      return `
        <li class="achieve-item">
          <button class="achieve-check" onclick="toggleTodayDone('${item.id}')" title="راجعتها اليوم؟ اضغط لتأشيرها كمنتهية وتختفي من هذي القائمة">${ICONS.check}</button>
          <span class="achieve-text">${escapeHtml(item.title)}${countdown}</span>
          ${hasQuestions ? `<button type="button" class="btn btn-secondary btn-sm quiz-btn" onclick="startQuiz('${item.id}')">${ICONS.target}<span>امتحن نفسك</span></button>` : ''}
          <span class="review-subject-tags">${renderSubjectTagsHtml(item.subjectIds)}</span>
        </li>`;
    }).join('');
  }

  // امتحانات اليوم تبقى ظاهرة دايماً بدون أي تفاعل أو اختفاء — تاريخ الامتحان معلومة ثابتة ما تنحذف بالتأشير
  const examsToday = review.items.filter(item => item.examDate === todayKeyStr);
  const examEl = document.getElementById('today-exams-list');
  if(examsToday.length === 0){
    examEl.innerHTML = `<div class="empty-state">${ICONS.trophy}<div>ما اكو امتحانات اليوم</div></div>`;
  } else {
    examEl.innerHTML = examsToday.map(item => {
      const hasQuestions = (item.questions || []).length > 0;
      return `
      <li class="achieve-item">
        <span class="achieve-check done" style="cursor:default">${ICONS.target}</span>
        <span class="achieve-text">${escapeHtml(item.title)} ${item.examTime ? `<span class="num-inline">— ${item.examTime}</span>` : ''}</span>
        ${hasQuestions ? `<button type="button" class="btn btn-secondary btn-sm quiz-btn" onclick="startQuiz('${item.id}')">${ICONS.target}<span>امتحن نفسك</span></button>` : ''}
        <span class="review-subject-tags">${renderSubjectTagsHtml(item.subjectIds)}</span>
      </li>`;
    }).join('');
  }

  renderUpcomingExams();
}

function renderUpcomingExams(){
  const review = ensureReview(DATA);
  const el = document.getElementById('upcoming-exams-list');
  if(!el) return;
  const upcoming = review.items
    .filter(item => { const d = daysUntil(item.examDate); return d != null && d > 0 && d <= 14; })
    .sort((a, b) => daysUntil(a.examDate) - daysUntil(b.examDate));
  if(upcoming.length === 0){
    el.innerHTML = `<div class="empty-state-mini">ما اكو امتحانات قريبة (خلال 14 يوم)</div>`;
  } else {
    el.innerHTML = upcoming.map(item => {
      const hasQuestions = (item.questions || []).length > 0;
      return `
      <div class="upcoming-exam-row">
        <span class="review-subject-tags">${renderSubjectTagsHtml(item.subjectIds)}</span>
        <span>${escapeHtml(item.title)}</span>
        ${hasQuestions ? `<button type="button" class="icon-btn" title="امتحن نفسك" onclick="startQuiz('${item.id}')">${ICONS.target}</button>` : ''}
        <span class="exam-countdown">باقي ${arCount(daysUntil(item.examDate), 'يوم', 'أيام')}</span>
      </div>`;
    }).join('');
  }
}

/* -------------------- كل المواضيع (مراجعات متكررة) وكل الامتحانات (بلا جدول تكرار) — منفصلين -------------------- */
function reviewRowHtml(item, isExamOnly){
  const hasQuestions = (item.questions || []).length > 0;
  return `
    <li class="session-item">
      <span class="session-dot"></span>
      <span class="session-time">${escapeHtml(item.title)}</span>
      ${!isExamOnly ? `<span class="session-dur">${formatScheduleSummary(item.schedule, item.scheduleWeeks)}</span>` : ''}
      ${item.examDate ? `<span class="day-tag">امتحان: ${formatDayLabel(item.examDate)}${item.examTime ? ' ' + item.examTime : ''}</span>` : ''}
      <span class="session-spacer"></span>
      <span class="review-subject-tags">${renderSubjectTagsHtml(item.subjectIds)}</span>
      <span class="session-actions">
        ${hasQuestions ? `<button class="icon-btn" title="امتحن نفسك" onclick="startQuiz('${item.id}')">${ICONS.target}</button>` : ''}
        <button class="icon-btn" title="الأسئلة" onclick="openQuestionsModal('${item.id}')">${ICONS.note}${hasQuestions ? `<span class="q-count">${item.questions.length}</span>` : ''}</button>
        <button class="icon-btn danger" title="حذف" onclick="deleteReviewItem('${item.id}')">${ICONS.trash}</button>
      </span>
    </li>`;
}

function renderAllTopics(){
  const review = ensureReview(DATA);
  const reviewListEl = document.getElementById('all-topics-list');
  const examListEl = document.getElementById('all-exams-only-list');
  if(!reviewListEl) return;

  const reviewItems = review.items.filter(item => item.schedule);
  const examOnlyItems = review.items.filter(item => !item.schedule);

  const byNameThenDate = (a, b) => {
    const aid = (a.subjectIds || [])[0];
    const bid = (b.subjectIds || [])[0];
    const an = (aid && getSubjectById(aid) && getSubjectById(aid).name) || 'ي';
    const bn = (bid && getSubjectById(bid) && getSubjectById(bid).name) || 'ي';
    return an.localeCompare(bn, 'ar');
  };

  if(reviewItems.length === 0){
    reviewListEl.innerHTML = `<div class="empty-state">${ICONS.book}<div>لسه ما ضفت أي موضوع مراجعة متكرر</div></div>`;
  } else {
    reviewListEl.innerHTML = reviewItems.slice().sort(byNameThenDate).map(item => reviewRowHtml(item, false)).join('');
  }

  if(examListEl){
    if(examOnlyItems.length === 0){
      examListEl.innerHTML = `<div class="empty-state">${ICONS.target}<div>ما اكو امتحانات مضافة بدون مراجعة متكررة</div></div>`;
    } else {
      const byExamDate = (a, b) => (daysUntil(a.examDate) ?? 9999) - (daysUntil(b.examDate) ?? 9999);
      examListEl.innerHTML = examOnlyItems.slice().sort(byExamDate).map(item => reviewRowHtml(item, true)).join('');
    }
  }
}

/* -------------------- إدارة الأسئلة (اختياري لكل موضوع) -------------------- */
function openQuestionsModal(itemId){
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === itemId);
  if(!item) return;
  if(!item.questions) item.questions = [];
  document.getElementById('modal-questions').dataset.itemId = itemId;
  document.getElementById('modal-questions-title').textContent = `أسئلة: ${item.title}`;
  clearQuestionImageDraft();
  clearQuestionHtmlDraft();
  renderQuestionsList(item);
  showModal('modal-questions');
}

function renderQuestionsList(item){
  const listEl = document.getElementById('questions-list');
  if(!item.questions || item.questions.length === 0){
    listEl.innerHTML = `<div class="empty-state-mini">ما اكو أسئلة بعد — إضافتها اختيارية تماماً، بس تخليك تكدر «تمتحن نفسك» بيها لما تراجع.</div>`;
  } else {
    listEl.innerHTML = item.questions.map(q => `
      <div class="qa-row">
        ${q.image ? `<img class="qa-thumb" src="${q.image}" alt="صورة السؤال" onclick="previewQuestionImage('${item.id}','${q.id}')">` : ''}
        ${q.htmlFile ? `<button type="button" class="qa-html-badge" title="عرض ملف HTML المرفق" onclick="previewQuestionHtml('${item.id}','${q.id}')">${ICONS.note}<span>HTML</span></button>` : ''}
        <div class="qa-row-text">
          <div class="qa-question">${q.question ? escapeHtml(q.question) : '<span class="qa-empty-hint">(بدون نص سؤال)</span>'}</div>
          <div class="qa-answer">${q.answer ? escapeHtml(q.answer) : '<span class="qa-empty-hint">(بدون جواب مكتوب)</span>'}</div>
        </div>
        <button class="icon-btn danger" title="حذف" onclick="deleteQuestionFromItem('${item.id}','${q.id}')">${ICONS.trash}</button>
      </div>`).join('');
  }
}

/* -------------------- صورة السؤال (اختياري) -------------------- */
let questionImageDraft = null; // صورة السؤال الجديد قيد الإضافة حالياً (base64 مصغّرة) — قبل الضغط على «إضافة السؤال»

function handleQuestionImageSelect(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  if(!file.type || !file.type.startsWith('image/')){ toast('اختر ملف صورة صالح', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 900;
      let width = img.width, height = img.height;
      if(width > MAX_DIM || height > MAX_DIM){
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      questionImageDraft = canvas.toDataURL('image/jpeg', 0.72);
      renderQuestionImageDraftPreview();
    };
    img.onerror = () => toast('تعذر قراءة هذي الصورة', 'error');
    img.src = e.target.result;
  };
  reader.onerror = () => toast('تعذر قراءة هذي الصورة', 'error');
  reader.readAsDataURL(file);
}

function renderQuestionImageDraftPreview(){
  const wrap = document.getElementById('qimage-preview-wrap');
  const img = document.getElementById('qimage-preview');
  if(!wrap || !img) return;
  if(questionImageDraft){ img.src = questionImageDraft; wrap.style.display = 'flex'; }
  else { img.src = ''; wrap.style.display = 'none'; }
}

function clearQuestionImageDraft(){
  questionImageDraft = null;
  renderQuestionImageDraftPreview();
}

function previewQuestionImage(itemId, qId){
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === itemId);
  const q = item && (item.questions || []).find(x => x.id === qId);
  if(!q || !q.image) return;
  document.getElementById('image-preview-img').src = q.image;
  showModal('modal-image-preview');
}

/* -------------------- ملف HTML مرفق بالسؤال (اختياري) -------------------- */
let questionHtmlDraft = null; // محتوى ملف الـHTML قيد الإضافة حالياً (نص خام) — قبل الضغط على «إضافة السؤال»
let questionHtmlDraftName = '';
const MAX_HTML_FILE_BYTES = 500 * 1024; // نص فقط (مو صور)، فـ٥٠٠ كيلوبايت سخية جداً لأي صفحة HTML عادية

function handleQuestionHtmlSelect(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  const looksHtml = /\.(html?|HTML?)$/.test(file.name) || file.type === 'text/html';
  if(!looksHtml){ toast('اختر ملف HTML صالح (.html)', 'error'); return; }
  if(file.size > MAX_HTML_FILE_BYTES){ toast('الملف كبير — حاول ملف HTML أصغر من 500 كيلوبايت', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    questionHtmlDraft = String(e.target.result || '');
    questionHtmlDraftName = file.name;
    renderQuestionHtmlDraftPreview();
  };
  reader.onerror = () => toast('تعذر قراءة هذا الملف', 'error');
  reader.readAsText(file);
}

function renderQuestionHtmlDraftPreview(){
  const wrap = document.getElementById('qhtml-preview-wrap');
  const nameEl = document.getElementById('qhtml-preview-name');
  if(!wrap || !nameEl) return;
  if(questionHtmlDraft){ nameEl.textContent = questionHtmlDraftName; wrap.style.display = 'flex'; }
  else { nameEl.textContent = ''; wrap.style.display = 'none'; }
}

function clearQuestionHtmlDraft(){
  questionHtmlDraft = null;
  questionHtmlDraftName = '';
  renderQuestionHtmlDraftPreview();
}

// معاينة ملف HTML قبل ما تضيفه للسؤال — تفتح بنفس نافذة معاينة الأسئلة المحفوظة
function previewQuestionHtmlDraft(){
  if(!questionHtmlDraft) return;
  const frame = document.getElementById('html-preview-frame');
  if(frame) frame.srcdoc = questionHtmlDraft;
  showModal('modal-html-preview');
}

// عرض ملف HTML مرفق بسؤال محفوظ مسبقاً — يفتح جوه إطار معزول (iframe sandboxed) عشان الأمان،
// وبلا سكربتات فعّالة داخله (نعرض التصميم والمحتوى بس، بدون تنفيذ أي جافاسكربت من داخل الملف المرفوع)
function previewQuestionHtml(itemId, qId){
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === itemId);
  const q = item && (item.questions || []).find(x => x.id === qId);
  if(!q || !q.htmlFile) return;
  const frame = document.getElementById('html-preview-frame');
  if(frame) frame.srcdoc = q.htmlFile;
  showModal('modal-html-preview');
}

function addQuestionToItem(){
  const itemId = document.getElementById('modal-questions').dataset.itemId;
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === itemId);
  if(!item) return;
  const qInput = document.getElementById('question-input');
  const aInput = document.getElementById('answer-input');
  const question = qInput.value.trim();
  const answer = aInput.value.trim();
  if(!question && !questionImageDraft && !questionHtmlDraft){ toast('لازم تكتب سؤال أو تختار صورة أو ترفع ملف HTML على الأقل', 'error'); return; }
  if(!item.questions) item.questions = [];
  item.questions.push({ id: uid(), question, answer, image: questionImageDraft || null, htmlFile: questionHtmlDraft || null });
  persist();
  renderQuestionsList(item);
  renderAllTopics();
  renderTodayLists();
  qInput.value = ''; aInput.value = ''; qInput.focus();
  clearQuestionImageDraft();
  clearQuestionHtmlDraft();
}

function deleteQuestionFromItem(itemId, qId){
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === itemId);
  if(!item) return;
  item.questions = (item.questions || []).filter(q => q.id !== qId);
  persist();
  renderQuestionsList(item);
  renderAllTopics();
  renderTodayLists();
}

/* -------------------- الامتحان الذاتي (اختياري) -------------------- */
let quizState = null;

function startQuiz(itemId){
  const review = ensureReview(DATA);
  const item = review.items.find(i => i.id === itemId);
  if(!item || !item.questions || item.questions.length === 0) return;
  const shuffled = item.questions.slice().sort(() => Math.random() - 0.5);
  quizState = { itemId, questions: shuffled, index: 0, correct: 0, revealed: false };
  document.getElementById('modal-quiz-title').textContent = `امتحن نفسك: ${item.title}`;
  showModal('modal-quiz');
  renderQuizStep();
}

function renderQuizStep(){
  const body = document.getElementById('modal-quiz-body');
  if(!body || !quizState) return;

  if(quizState.index >= quizState.questions.length){
    const total = quizState.questions.length;
    const pct = total > 0 ? Math.round((quizState.correct / total) * 100) : 0;
    if(pct === 100) confettiBurst();
    const review = ensureReview(DATA);
    const item = review.items.find(i => i.id === quizState.itemId);
    if(item){
      const attemptDate = new Date().toISOString();
      if(!item.quizAttempts) item.quizAttempts = [];
      item.quizAttempts.push({ id: uid(), correct: quizState.correct, total, date: attemptDate });
      item.lastQuizScore = { correct: quizState.correct, total, date: attemptDate }; // نبقيه للتوافق مع أي كود قديم
      persist();
      renderExamLog();
    }
    body.innerHTML = `
      <div class="quiz-summary">
        <div class="quiz-summary-score num">${quizState.correct} / ${total}</div>
        <div class="quiz-summary-label">${pct}% جاوبتها صح ${pct===100 ? '🎉' : ''}</div>
        <button type="button" class="btn btn-primary" onclick="closeModal('modal-quiz')">تم</button>
      </div>`;
    return;
  }

  const q = quizState.questions[quizState.index];
  const hasVisual = q.image || q.htmlFile;
  body.innerHTML = `
    <div class="quiz-progress num">سؤال ${quizState.index + 1} من ${quizState.questions.length}</div>
    ${q.image ? `<img class="quiz-question-image" src="${q.image}" alt="صورة السؤال">` : ''}
    ${q.htmlFile ? `<div class="quiz-question-html-wrap">
      <button type="button" class="quiz-html-expand-btn" title="توسيع لحجم الشاشة" onclick="expandQuizHtml()"><span data-icon="eye"></span></button>
      <iframe class="quiz-question-html" id="quiz-question-html-frame" sandbox="allow-scripts" title="محتوى السؤال"></iframe>
    </div>` : ''}
    ${q.question ? `<div class="quiz-question">${escapeHtml(q.question)}</div>` : (hasVisual ? '' : `<div class="quiz-question quiz-question-empty">(سؤال بدون نص)</div>`)}
    ${quizState.revealed ? `
      <div class="quiz-answer-box">${q.answer ? escapeHtml(q.answer) : 'ما كتبت جواب — شوف إذا تتذكرها بنفسك 🙂'}</div>
      <div class="quiz-actions">
        <button type="button" class="btn btn-danger" onclick="answerQuizSelf(false)">${ICONS.x}<span>ما عرفتها</span></button>
        <button type="button" class="btn btn-primary" onclick="answerQuizSelf(true)">${ICONS.check}<span>عرفتها</span></button>
      </div>` : `
      <button type="button" class="btn btn-secondary btn-block" onclick="revealQuizAnswer()">اظهار الجواب</button>`}
  `;
  if(q.htmlFile){
    const frame = document.getElementById('quiz-question-html-frame');
    if(frame) frame.srcdoc = q.htmlFile;
  }
}

// يوسّع صورة السؤال الـHTML الحالية بوضع الامتحان الذاتي لنفس نافذة المعاينة الكاملة الشاشة
function expandQuizHtml(){
  const q = quizState.questions && quizState.questions[quizState.index];
  if(!q || !q.htmlFile) return;
  const frame = document.getElementById('html-preview-frame');
  if(frame) frame.srcdoc = q.htmlFile;
  showModal('modal-html-preview');
}

function revealQuizAnswer(){
  if(!quizState) return;
  quizState.revealed = true;
  renderQuizStep();
}

function answerQuizSelf(knew){
  if(!quizState) return;
  if(knew) quizState.correct++;
  quizState.index++;
  quizState.revealed = false;
  renderQuizStep();
}

/* -------------------- سجل الامتحانات (كل محاولات «امتحن نفسك» مجمّعة حسب المادة) -------------------- */
function getAllQuizAttempts(){
  const review = ensureReview(DATA);
  const rows = [];
  review.items.forEach(item => {
    (item.quizAttempts || []).forEach(att => {
      rows.push({ ...att, itemTitle: item.title, subjectIds: item.subjectIds || [] });
    });
  });
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderExamLogGroupHtml(subject, rows){
  const headHtml = subject
    ? `<span class="subject-chip" style="--chip-color:${subject.color}"><span class="subject-chip-dot"></span>${escapeHtml(subject.name)}</span>`
    : `<span class="subject-chip" style="--chip-color:var(--text-faint)"><span class="subject-chip-dot"></span>بدون مادة</span>`;
  const rowsHtml = rows.map(att => {
    const pct = att.total > 0 ? Math.round((att.correct / att.total) * 100) : 0;
    const scoreCls = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
    return `
      <div class="exam-log-row">
        <span class="exam-log-title">${escapeHtml(att.itemTitle)}</span>
        <span class="exam-log-date num">${formatDateArabic(att.date)} · ${formatTime(att.date)}</span>
        <span class="exam-log-score ${scoreCls} num">${att.correct}/${att.total} · ${pct}%</span>
      </div>`;
  }).join('');
  return `<div class="exam-log-group"><div class="exam-log-subject-head">${headHtml}</div>${rowsHtml}</div>`;
}

function renderExamLog(){
  const container = document.getElementById('exam-log-list');
  if(!container) return;
  const attempts = getAllQuizAttempts();
  if(attempts.length === 0){
    container.innerHTML = `<div class="empty-state">${ICONS.chart}<div>لسه ما امتحنت نفسك بأي موضوع — ضيف أسئلة لموضوع من «كل المواضيع» وجرب «امتحن نفسك»</div></div>`;
    return;
  }
  const groups = {}; // subjectId -> { subject, rows: [] }
  const noSubjectRows = [];
  attempts.forEach(att => {
    if(!att.subjectIds || att.subjectIds.length === 0){ noSubjectRows.push(att); return; }
    att.subjectIds.forEach(sid => {
      const subj = getSubjectById(sid);
      if(!subj) return;
      if(!groups[sid]) groups[sid] = { subject: subj, rows: [] };
      groups[sid].rows.push(att);
    });
  });
  const orderedGroups = Object.values(groups).sort((a, b) => a.subject.name.localeCompare(b.subject.name, 'ar'));
  let html = orderedGroups.map(g => renderExamLogGroupHtml(g.subject, g.rows)).join('');
  if(noSubjectRows.length) html += renderExamLogGroupHtml(null, noSubjectRows);
  container.innerHTML = html;
}

/* -------------------- الرسم الشامل والإقلاع -------------------- */
function renderAll(){
  renderSubjects();
  renderSubjectPicker();
  renderTodayLists();
  renderAllTopics();
  renderExamLog();
}

function init(){
  hydrateIcons();
  applyTheme(DATA.settings);
  renderBrandName();
  renderHeaderClock();
  setInterval(renderHeaderClock, 1000);
  renderAll();
  setScheduleType('daily');

  const startDateInput = document.getElementById('review-start-date');
  if(startDateInput) startDateInput.value = todayKey();

  document.getElementById('subject-form').addEventListener('submit', (e) => { e.preventDefault(); addSubject(); });
  document.getElementById('review-form').addEventListener('submit', (e) => { e.preventDefault(); addReviewItem(); });

  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if(e.target === ov) closeModal(ov.id); });
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){ document.querySelectorAll('.modal-overlay.show').forEach(ov => closeModal(ov.id)); }
  });

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') renderAll();
  });
}

document.addEventListener('DOMContentLoaded', init);
