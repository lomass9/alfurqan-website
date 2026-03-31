const plannerForm = document.getElementById('plannerForm');
const subjectsContainer = document.getElementById('subjectsContainer');
const addSubjectBtn = document.getElementById('addSubjectBtn');
const subjectTemplate = document.getElementById('subjectTemplate');

const resultSection = document.getElementById('resultSection');
const summaryText = document.getElementById('summaryText');
const insightsBox = document.getElementById('insights');
const scheduleBox = document.getElementById('schedule');

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const peakSlot = {
  morning: ['08:00', '09:10', '10:20', '11:30', '12:40'],
  afternoon: ['13:00', '14:10', '15:20', '16:30', '17:40'],
  evening: ['17:00', '18:10', '19:20', '20:30', '21:40'],
  night: ['20:00', '21:10', '22:20', '23:30', '00:40']
};

function daysUntil(dateString) {
  if (!dateString) return null;
  const now = new Date();
  const exam = new Date(dateString);
  if (Number.isNaN(exam.getTime())) return null;
  const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function subjectPriority(subject, strategy) {
  const weakness = 100 - subject.level;
  const difficultyWeight = subject.difficulty * 11;

  let urgency = 0;
  if (subject.daysToExam !== null) {
    if (subject.daysToExam <= 0) urgency = 42;
    else urgency = Math.max(0, 36 - subject.daysToExam);
  }

  const modeBoost = {
    balanced: weakness * 0.5 + urgency * 1.1,
    exam: weakness * 0.35 + urgency * 1.8,
    recovery: weakness * 0.9 + urgency * 0.7
  };

  return Math.max(8, difficultyWeight + modeBoost[strategy]);
}

function allocateSessions(subjects, totalSessions, strategy) {
  const scores = subjects.map((subject) => ({
    ...subject,
    score: subjectPriority(subject, strategy)
  }));

  const totalScore = scores.reduce((acc, s) => acc + s.score, 0);
  let assigned = 0;

  const allocation = scores.map((subject) => {
    const raw = (subject.score / totalScore) * totalSessions;
    const count = Math.max(1, Math.floor(raw));
    assigned += count;
    return { ...subject, sessions: count };
  });

  while (assigned < totalSessions) {
    allocation.sort((a, b) => b.score - a.score);
    allocation[0].sessions += 1;
    assigned += 1;
  }

  while (assigned > totalSessions) {
    allocation.sort((a, b) => a.score - b.score);
    const candidate = allocation.find((item) => item.sessions > 1);
    if (!candidate) break;
    candidate.sessions -= 1;
    assigned -= 1;
  }

  return allocation.sort((a, b) => b.score - a.score);
}

function buildQueue(allocation) {
  const queue = [];
  allocation.forEach((subject) => {
    for (let i = 0; i < subject.sessions; i += 1) {
      queue.push({
        name: subject.name,
        level: subject.level,
        daysToExam: subject.daysToExam
      });
    }
  });

  queue.sort((a, b) => {
    if (a.daysToExam === null && b.daysToExam === null) return a.level - b.level;
    if (a.daysToExam === null) return 1;
    if (b.daysToExam === null) return -1;
    return a.daysToExam - b.daysToExam;
  });

  return queue;
}

function pickFocus(subject) {
  if (subject.level < 50) return 'تقوية أساسيات + 5 أسئلة قصيرة';
  if (subject.level < 70) return 'حل تمارين متوسطة + تلخيص صفحة';
  return 'مراجعة ذكية + اختبار ذاتي 10 دقائق';
}

function distributeSchedule({ freeDays, startDate, slots, sessionsPerDay, queue }) {
  const schedule = [];
  let queueIndex = 0;

  freeDays.forEach((dayIndex, offset) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + offset);

    const sessions = [];
    let lastSubject = '';

    for (let i = 0; i < sessionsPerDay; i += 1) {
      if (!queue.length) break;

      let candidate = queue[queueIndex % queue.length];
      if (candidate.name === lastSubject && queue.length > 1) {
        queueIndex += 1;
        candidate = queue[queueIndex % queue.length];
      }

      sessions.push({
        time: slots[i],
        subject: candidate.name,
        focus: pickFocus(candidate),
        urgent: candidate.daysToExam !== null && candidate.daysToExam <= 10
      });

      lastSubject = candidate.name;
      queue.splice(queueIndex % queue.length, 1);
      if (!queue.length) break;
      queueIndex %= queue.length;
    }

    schedule.push({
      dayName: dayNames[dayIndex],
      date: date.toLocaleDateString('ar-EG'),
      sessions
    });
  });

  return schedule;
}

function renderInsights(allocation, totalSessions, focusMinutes, breakMinutes, strategy) {
  const top = allocation[0];
  const urgent = allocation
    .filter((s) => s.daysToExam !== null && s.daysToExam <= 10)
    .map((s) => s.name);

  const messages = [
    `أولوية هذا الأسبوع: ${top.name} (${top.sessions} جلسة من أصل ${totalSessions}).`,
    `إيقاعك المثالي: ${focusMinutes} دقيقة تركيز + ${breakMinutes} دقائق راحة.`,
    `نمط الخطة المختار: ${
      strategy === 'balanced' ? 'متوازن' : strategy === 'exam' ? 'اختبارات' : 'إنقاذ المواد الضعيفة'
    }.`
  ];

  if (urgent.length) {
    messages.push(`مواد قريبة الاختبار وتحتاج متابعة يومية: ${urgent.join('، ')}.`);
  }

  insightsBox.innerHTML = messages.map((m) => `<div class="insight">${m}</div>`).join('');
}

function renderSchedule(schedule) {
  scheduleBox.innerHTML = '';

  schedule.forEach((day) => {
    const card = document.createElement('article');
    card.className = 'day-card';

    const sessionsHTML = day.sessions
      .map(
        (session) => `
          <div class="session">
            <strong>${session.time}</strong> — ${session.subject}<br>
            <small>${session.focus}</small>
            ${session.urgent ? '<div class="tag">اختبار قريب</div>' : ''}
          </div>
        `
      )
      .join('');

    card.innerHTML = `<h4>${day.dayName}</h4><small>${day.date}</small>${sessionsHTML}`;
    scheduleBox.appendChild(card);
  });
}

function addSubjectRow(initial = {}) {
  const fragment = subjectTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.subject-row');

  row.querySelector('.subject-name').value = initial.name || '';
  row.querySelector('.subject-level').value = initial.level ?? 60;
  row.querySelector('.subject-difficulty').value = initial.difficulty ?? 3;
  row.querySelector('.subject-exam').value = initial.examDate || '';

  row.querySelector('.remove-subject').addEventListener('click', () => {
    row.remove();
  });

  subjectsContainer.appendChild(fragment);
}

function collectSubjects() {
  const rows = Array.from(document.querySelectorAll('.subject-row'));
  return rows
    .map((row) => ({
      name: row.querySelector('.subject-name').value.trim(),
      level: Number(row.querySelector('.subject-level').value),
      difficulty: Number(row.querySelector('.subject-difficulty').value),
      examDate: row.querySelector('.subject-exam').value
    }))
    .filter((subject) => subject.name)
    .map((subject) => ({
      ...subject,
      daysToExam: daysUntil(subject.examDate)
    }));
}

addSubjectBtn.addEventListener('click', () => addSubjectRow());

plannerForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const studentName = document.getElementById('studentName').value.trim();
  const goal = document.getElementById('goal').value.trim();
  const startDate = document.getElementById('startDate').value;
  const dailyHours = Number(document.getElementById('dailyHours').value);
  const energyPeak = document.getElementById('energyPeak').value;
  const focusMinutes = Number(document.getElementById('focusMinutes').value);
  const breakMinutes = Number(document.getElementById('breakMinutes').value);
  const strategy = document.getElementById('strategy').value;
  const maxSessionsDay = Number(document.getElementById('maxSessionsDay').value);

  const freeDays = Array.from(document.querySelectorAll('#freeDays input:checked')).map((cb) => Number(cb.value));
  const subjects = collectSubjects();

  if (!subjects.length) {
    alert('أضف على الأقل مادة واحدة.');
    return;
  }

  if (!freeDays.length) {
    alert('اختر يوم فراغ واحد على الأقل.');
    return;
  }

  const sessionBlock = focusMinutes + breakMinutes;
  const sessionsPerDay = Math.max(1, Math.min(maxSessionsDay, Math.floor((dailyHours * 60) / sessionBlock)));
  const totalSessions = Math.max(sessionsPerDay * freeDays.length, subjects.length);

  const allocation = allocateSessions(subjects, totalSessions, strategy);
  const queue = buildQueue(allocation);
  const slots = peakSlot[energyPeak].slice(0, sessionsPerDay);

  const schedule = distributeSchedule({
    freeDays,
    startDate,
    slots,
    sessionsPerDay,
    queue
  });

  summaryText.textContent = `رائع ${studentName}، بنينا خطة ${freeDays.length} أيام لهدفك: "${goal}" مع ${totalSessions} جلسة موزعة بذكاء حسب الأولوية.`;
  renderInsights(allocation, totalSessions, focusMinutes, breakMinutes, strategy);
  renderSchedule(schedule);

  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth' });
});

addSubjectRow({ name: 'رياضيات', level: 55, difficulty: 4, examDate: '' });
addSubjectRow({ name: 'كيمياء', level: 45, difficulty: 5, examDate: '' });
