const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// --- ملف وسجل زوار اليوم (بدون أي أسماء) ---
const VISITS_FILE = path.join(__dirname, 'visits_data.json');
const recentVisitors = new Map();

function loadVisits() {
  try {
    if (fs.existsSync(VISITS_FILE)) {
      return JSON.parse(fs.readFileSync(VISITS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading visits file:', e);
  }
  return {};
}

function saveVisits(data) {
  try {
    fs.writeFileSync(VISITS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing visits file:', e);
  }
}

function getTodayKey() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Baghdad' }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

function formatArabicTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('ar-IQ', {
      timeZone: 'Asia/Baghdad',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return date.toLocaleTimeString();
  }
}

function getTodayVisits() {
  const today = getTodayKey();
  const data = loadVisits();
  return data[today] || { date: today, count: 0, lastVisitTime: '', history: [] };
}

function recordVisit(req = null) {
  const bodyVid = req && req.body && req.body.visitorId ? String(req.body.visitorId) : null;
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim() : 'direct';
  const trackerKey = bodyVid ? `vid_${bodyVid}` : `ip_${ip}`;
  const now = Date.now();
  const lastTime = recentVisitors.get(trackerKey);
  // منع التكرار اللحظي (5 ثواني فقط) حتى لا يمنع الاختبار المتكرر أو الزائر الذي يعود بعد قليل
  if (lastTime && (now - lastTime < 5000)) {
    return getTodayVisits();
  }
  recentVisitors.set(trackerKey, now);
  if (recentVisitors.size > 500) {
    for (const [k, v] of recentVisitors.entries()) {
      if (now - v > 3600000) recentVisitors.delete(k);
    }
  }

  const today = getTodayKey();
  const data = loadVisits();
  if (!data[today]) {
    data[today] = { date: today, count: 0, lastVisitTime: '', history: [] };
  }
  const timeStr = formatArabicTime(new Date());
  data[today].count += 1;
  data[today].lastVisitTime = timeStr;
  data[today].history.unshift({ time: timeStr, timestamp: now });
  if (data[today].history.length > 50) {
    data[today].history = data[today].history.slice(0, 50);
  }
  saveVisits(data);
  return data[today];
}

// API تسجيل زيارة مجهولة لصفحة الإندكس
app.post('/api/visit', (req, res) => {
  const dayData = recordVisit(req);
  res.json({ success: true, count: dayData.count, lastVisitTime: dayData.lastVisitTime });
});

// API فحص زوار اليوم
app.get('/api/visits/today', (req, res) => {
  const dayData = getTodayVisits();
  res.json({
    today: dayData.date || getTodayKey(),
    hasVisitorToday: (dayData.count || 0) > 0,
    count: dayData.count || 0,
    lastVisitTime: dayData.lastVisitTime || null,
    history: dayData.history || []
  });
});

// Clean route aliases BEFORE express.static
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/focus-tracker', (req, res) => {
  res.sendFile(path.join(__dirname, 'focus-tracker.html'));
});

app.get('/review', (req, res) => {
  res.sendFile(path.join(__dirname, 'review.html'));
});

// Index page route - tracks visitor entry
app.get(['/', '/index.html'], (req, res) => {
  const accept = req.headers['accept'] || '';
  if (accept.includes('text/html')) {
    recordVisit(req);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve static assets from root directory
app.use(express.static(path.join(__dirname)));

// Fallback to index.html
app.get('*', (req, res) => {
  const accept = req.headers['accept'] || '';
  if (accept.includes('text/html') && !req.path.startsWith('/api')) {
    recordVisit(req);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
