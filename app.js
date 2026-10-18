/**
 * QuickTiew - Application Logic
 * Supports Worked Examples, Matching (1.pdf), Multiple-Choice Quiz, Flashcards, Mock Exam, Weak Spots
 */

// Application State
let state = {
  currentMode: 'worked',
  currentSet: 'all',
  searchQuery: '',
  soundEnabled: true,
  // Question collections
  filteredQuestions: [],
  // Quiz Mode
  quizIndex: 0,
  quizAnswers: {}, // id -> selected answer
  quizResults: { correct: 0, wrong: 0 },
  // Flashcard Mode
  fcIndex: 0,
  fcFlipped: false,
  // Matching Mode
  matchingQuestions: [],
  matchingChoices: [],
  matchingUserAnswers: {}, // qId -> selected letter 'A'-'J'
  // Mock Exam Mode
  mockQuestions: [],
  mockUserAnswers: {}, // qId -> selected choice
  mockTimerSeconds: 1800, // 30 mins
  mockTimerInterval: null,
  mockSubmitted: false,
  // Storage
  weakSpots: new Set(),
  mastered: new Set()
};

// ==========================================
// Web Audio API Sound Synthesizer
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playSuccess() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playError() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playClick() {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
}

const sfx = new SoundFX();

// ==========================================
// Shuffle Utility (Fisher-Yates)
// ==========================================
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ==========================================
// LocalStorage Persistence
// ==========================================
function loadStorage() {
  try {
    const savedWeak = localStorage.getItem('quicktiew_weak_spots');
    if (savedWeak) {
      state.weakSpots = new Set(JSON.parse(savedWeak));
    }
    const savedMastered = localStorage.getItem('quicktiew_mastered');
    if (savedMastered) {
      state.mastered = new Set(JSON.parse(savedMastered));
    }
    const savedSound = localStorage.getItem('quicktiew_sound');
    if (savedSound !== null) {
      state.soundEnabled = JSON.parse(savedSound);
    }
  } catch (e) {
    console.error('Failed to load localStorage', e);
  }
  updateWeakCountBadge();
  updateSoundIcon();
}

function saveStorage() {
  try {
    localStorage.setItem('quicktiew_weak_spots', JSON.stringify([...state.weakSpots]));
    localStorage.setItem('quicktiew_mastered', JSON.stringify([...state.mastered]));
    localStorage.setItem('quicktiew_sound', JSON.stringify(state.soundEnabled));
  } catch (e) {
    console.error('Failed to save localStorage', e);
  }
  updateWeakCountBadge();
}

function updateWeakCountBadge() {
  const el = document.getElementById('weak-count');
  if (el) el.textContent = state.weakSpots.size;
}

function updateSoundIcon() {
  const icon = document.getElementById('sound-icon');
  if (icon) {
    if (state.soundEnabled) {
      icon.setAttribute('data-lucide', 'volume-2');
      icon.classList.remove('text-rose-400');
    } else {
      icon.setAttribute('data-lucide', 'volume-x');
      icon.classList.add('text-rose-400');
    }
    if (window.lucide) lucide.createIcons();
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  saveStorage();
  updateSoundIcon();
  if (state.soundEnabled) sfx.playSuccess();
}

// ==========================================
// Filter and Search
// ==========================================
function getFilteredQuestions() {
  let list = [...QUESTION_BANK];

  if (state.currentSet !== 'all') {
    const setNum = parseInt(state.currentSet, 10);
    list = list.filter(q => q.set === setNum);
  }

  if (state.searchQuery.trim()) {
    const query = state.searchQuery.trim().toLowerCase();
    list = list.filter(q =>
      q.question.toLowerCase().includes(query) ||
      q.answer.toLowerCase().includes(query) ||
      q.explanation.toLowerCase().includes(query) ||
      q.memoryHook.toLowerCase().includes(query) ||
      q.keywords.some(k => k.toLowerCase().includes(query))
    );
  }

  return list;
}

function handleSetChange(val) {
  state.currentSet = val;
  state.filteredQuestions = getFilteredQuestions();

  if (state.currentMode === 'quiz') {
    state.quizIndex = 0;
    state.quizAnswers = {};
    state.quizResults = { correct: 0, wrong: 0 };
    renderQuiz();
  } else if (state.currentMode === 'matching') {
    initMatching();
  } else if (state.currentMode === 'flashcard') {
    state.fcIndex = 0;
    state.fcFlipped = false;
    renderFlashcard();
  } else if (state.currentMode === 'worked') {
    renderWorkedExamples();
  }
}

function handleSearch(val) {
  state.searchQuery = val;
  state.filteredQuestions = getFilteredQuestions();

  if (state.currentMode === 'worked') {
    renderWorkedExamples();
  } else if (state.currentMode === 'quiz') {
    state.quizIndex = 0;
    renderQuiz();
  } else if (state.currentMode === 'flashcard') {
    state.fcIndex = 0;
    renderFlashcard();
  }
}

function shuffleCurrentSet() {
  sfx.playClick();
  state.filteredQuestions = shuffleArray(getFilteredQuestions());

  if (state.currentMode === 'worked') {
    renderWorkedExamples();
  } else if (state.currentMode === 'quiz') {
    state.quizIndex = 0;
    state.quizAnswers = {};
    state.quizResults = { correct: 0, wrong: 0 };
    renderQuiz();
  } else if (state.currentMode === 'matching') {
    initMatching();
  } else if (state.currentMode === 'flashcard') {
    state.fcIndex = 0;
    state.fcFlipped = false;
    renderFlashcard();
  } else if (state.currentMode === 'mock') {
    initMockExam();
  }
}

// ==========================================
// Mode Switching
// ==========================================
function switchMode(mode) {
  sfx.playClick();
  state.currentMode = mode;

  // Update tabs active state
  const modes = ['worked', 'matching', 'quiz', 'flashcard', 'mock', 'weakness'];
  modes.forEach(m => {
    const desktopTab = document.getElementById(`tab-${m}`);
    const mobileTab = document.getElementById(`m-tab-${m}`);
    const view = document.getElementById(`view-${m}`);

    if (m === mode) {
      if (desktopTab) {
        desktopTab.className = 'nav-tab px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 bg-indigo-600 text-white shadow-sm';
      }
      if (mobileTab) {
        mobileTab.className = 'mobile-tab whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white';
      }
      if (view) view.classList.remove('hidden');
    } else {
      if (desktopTab) {
        desktopTab.className = 'nav-tab px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 text-slate-400 hover:text-slate-200';
      }
      if (mobileTab) {
        mobileTab.className = 'mobile-tab whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium bg-slate-900 text-slate-400';
      }
      if (view) view.classList.add('hidden');
    }
  });

  // Mode initializations
  state.filteredQuestions = getFilteredQuestions();

  if (mode === 'worked') {
    renderWorkedExamples();
  } else if (mode === 'matching') {
    initMatching();
  } else if (mode === 'quiz') {
    renderQuiz();
  } else if (mode === 'flashcard') {
    renderFlashcard();
  } else if (mode === 'mock') {
    if (!state.mockQuestions.length || state.mockSubmitted) {
      initMockExam();
    }
  } else if (mode === 'weakness') {
    renderWeakSpots();
  }

  if (window.lucide) lucide.createIcons();
}

// ==========================================
// MODE 1: Worked Examples Renderer
// ==========================================
function renderWorkedExamples() {
  const container = document.getElementById('worked-cards-container');
  const countBadge = document.getElementById('worked-total-badge');
  if (!container) return;

  const list = state.filteredQuestions;
  if (countBadge) countBadge.textContent = `${list.length} ข้อ`;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 text-center py-16 text-slate-500">
        <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
        <p class="text-base font-medium">ไม่พบข้อสอบที่ตรงกับคำค้นหา</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = list.map((q, idx) => {
    const isMastered = state.mastered.has(q.id);
    const isWeak = state.weakSpots.has(q.id);

    return `
      <div class="rounded-2xl p-5 bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group">
        <div class="space-y-3">
          <!-- Top meta line -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold flex items-center justify-center">
                #${q.id}
              </span>
              <span class="text-xs text-slate-400 font-medium">${q.category}</span>
            </div>
            <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              ชุดที่ ${q.set}
            </span>
          </div>

          <!-- Question -->
          <div>
            <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">โจทย์ข้อสอบ</div>
            <h3 class="text-base sm:text-lg font-semibold text-white leading-snug">
              ${escapeHtml(q.question)}
            </h3>
          </div>

          <!-- Worked Answer (Highlighted) -->
          <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
            <div class="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
              <span>คำตอบที่ถูกต้อง (The Answer)</span>
            </div>
            <div class="text-lg font-bold text-emerald-300">
              ${escapeHtml(q.answer)}
            </div>
          </div>

          <!-- Reverse Engineering Hook -->
          <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start space-x-2">
            <i data-lucide="lightbulb" class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5"></i>
            <div>
              <span class="font-bold text-amber-300">สูตรจำ/จุดสังเกต:</span> ${escapeHtml(q.memoryHook)}
            </div>
          </div>

          <!-- Explanation -->
          <div class="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span class="font-semibold text-indigo-300">เหตุผลประกอบ:</span> ${escapeHtml(q.explanation)}
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div class="flex flex-wrap gap-1">
            ${q.keywords.map(k => `<span class="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-md font-mono">${escapeHtml(k)}</span>`).join('')}
          </div>
          <div class="flex items-center space-x-1.5">
            <button onclick="toggleMastered(${q.id})" title="ทำเครื่องหมายว่าจำได้แล้ว" class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${isMastered ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}">
              ${isMastered ? '✓ จำได้แล้ว' : 'จำได้แล้ว'}
            </button>
            <button onclick="toggleWeakSpot(${q.id})" title="บันทึกข้อนี้ไว้ทบทวนซ้ำ" class="p-1 rounded-lg text-xs font-medium border transition-colors ${isWeak ? 'bg-rose-500 text-white border-rose-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-rose-400'}">
              <i data-lucide="bookmark" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function toggleMastered(id) {
  if (state.mastered.has(id)) {
    state.mastered.delete(id);
  } else {
    state.mastered.add(id);
    state.weakSpots.delete(id);
    sfx.playSuccess();
  }
  saveStorage();
  renderWorkedExamples();
}

function toggleWeakSpot(id) {
  if (state.weakSpots.has(id)) {
    state.weakSpots.delete(id);
  } else {
    state.weakSpots.add(id);
    state.mastered.delete(id);
    sfx.playClick();
  }
  saveStorage();
  renderWorkedExamples();
}

// ==========================================
// MODE 2: MATCHING DRILL (แบบกระดาษสอบ 1.pdf)
// ==========================================
function initMatching() {
  // Take 10 questions for the current set or first 10
  let pool = getFilteredQuestions();
  if (pool.length < 10) {
    pool = QUESTION_BANK.slice(0, 10);
  } else {
    pool = pool.slice(0, 10);
  }

  // Shuffle order of questions on left
  state.matchingQuestions = shuffleArray(pool);

  // Extract choices: unique answers from these 10 questions
  const uniqueAnswers = Array.from(new Set(pool.map(q => q.answer)));
  const shuffledChoices = shuffleArray(uniqueAnswers);

  // Map choices to letters A, B, C, D, ...
  const letters = 'ABCDEFGHIJ'.split('');
  state.matchingChoices = shuffledChoices.map((ans, idx) => ({
    letter: letters[idx],
    text: ans
  }));

  state.matchingUserAnswers = {};
  const banner = document.getElementById('matching-score-banner');
  if (banner) banner.classList.add('hidden');

  renderMatching();
}

function renderMatching() {
  const qContainer = document.getElementById('matching-questions-list');
  const cContainer = document.getElementById('matching-choices-list');
  if (!qContainer || !cContainer) return;

  // Render Right: Choices A-J
  cContainer.innerHTML = state.matchingChoices.map(c => `
    <div class="flex items-start space-x-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
      <span class="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold font-mono flex items-center justify-center flex-shrink-0">
        ${c.letter}
      </span>
      <span class="text-slate-200 mt-0.5 font-medium leading-relaxed">${escapeHtml(c.text)}</span>
    </div>
  `).join('');

  // Render Left: 10 Questions with Select dropdown
  qContainer.innerHTML = state.matchingQuestions.map((q, idx) => {
    const selectedLetter = state.matchingUserAnswers[q.id] || '';

    return `
      <div id="matching-card-${q.id}" class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3 transition-all">
        <div class="flex items-start space-x-3 flex-1">
          <div class="flex-shrink-0">
            <select onchange="handleMatchingSelect(${q.id}, this.value)" class="w-14 bg-slate-950 border border-slate-700 text-indigo-400 font-mono font-bold text-sm rounded-lg py-1 px-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center cursor-pointer">
              <option value="">-</option>
              ${state.matchingChoices.map(c => `
                <option value="${c.letter}" ${selectedLetter === c.letter ? 'selected' : ''}>${c.letter}</option>
              `).join('')}
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-xs font-mono text-slate-500 font-bold">ข้อ ${idx + 1}.</span>
            <p class="text-sm font-medium text-white leading-snug">${escapeHtml(q.question)}</p>
            <div id="matching-feedback-${q.id}" class="hidden text-xs pt-1.5 space-y-0.5"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleMatchingSelect(qId, letter) {
  sfx.playClick();
  state.matchingUserAnswers[qId] = letter;
}

function resetMatching() {
  sfx.playClick();
  initMatching();
}

function checkMatchingAnswers() {
  let correctCount = 0;
  const total = state.matchingQuestions.length;

  state.matchingQuestions.forEach((q) => {
    const card = document.getElementById(`matching-card-${q.id}`);
    const feedback = document.getElementById(`matching-feedback-${q.id}`);
    const userLetter = state.matchingUserAnswers[q.id] || '';

    // Find what text corresponds to userLetter
    const chosenChoice = state.matchingChoices.find(c => c.letter === userLetter);
    const chosenText = chosenChoice ? chosenChoice.text : '';

    // Find the correct letter for this question
    const correctChoice = state.matchingChoices.find(c => c.text === q.answer);
    const correctLetter = correctChoice ? correctChoice.letter : '?';

    const isCorrect = chosenText === q.answer;

    if (card && feedback) {
      feedback.classList.remove('hidden');
      if (isCorrect) {
        correctCount++;
        card.className = 'p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/50 flex items-start justify-between gap-3 transition-all';
        feedback.innerHTML = `
          <div class="text-emerald-400 font-semibold flex items-center space-x-1">
            <span>✓ ถูกต้อง (${correctLetter})</span>
          </div>
        `;
      } else {
        state.weakSpots.add(q.id);
        card.className = 'p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/50 flex items-start justify-between gap-3 transition-all';
        feedback.innerHTML = `
          <div class="text-rose-400 font-semibold">✗ เฉลยที่ถูกคือ: [${correctLetter}] ${escapeHtml(q.answer)}</div>
          <div class="text-slate-400 text-[11px]">${escapeHtml(q.explanation)}</div>
        `;
      }
    }
  });

  saveStorage();

  const banner = document.getElementById('matching-score-banner');
  if (banner) {
    banner.classList.remove('hidden');
    const pct = Math.round((correctCount / total) * 100);
    const isPass = pct >= 80;

    if (isPass) {
      sfx.playSuccess();
      banner.className = 'p-4 rounded-xl border bg-emerald-950/50 border-emerald-500/40 text-emerald-200 flex items-center justify-between';
      banner.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-lg">
            ${correctCount}/${total}
          </div>
          <div>
            <div class="font-bold text-base">ยอดเยี่ยมมาก! ได้คะแนน ${pct}%</div>
            <div class="text-xs text-emerald-300/80">จำ Pattern ได้แม่นยำ พร้อมลุยข้อสอบจริง</div>
          </div>
        </div>
      `;
    } else {
      sfx.playError();
      banner.className = 'p-4 rounded-xl border bg-rose-950/50 border-rose-500/40 text-rose-200 flex items-center justify-between';
      banner.innerHTML = `
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center font-bold text-rose-400 text-lg">
            ${correctCount}/${total}
          </div>
          <div>
            <div class="font-bold text-base">ได้คะแนน ${pct}% (ข้อที่ผิดถูกส่งไปคลังข้อผิดแล้ว)</div>
            <div class="text-xs text-rose-300/80">แนะนำให้อ่าน Worked Examples อีก 1 รอบแล้วกดสุ่มจับคู่ใหม่</div>
          </div>
        </div>
      `;
    }
  }
}

// ==========================================
// MODE 3: MULTIPLE CHOICE QUIZ (สลับโจทย์+ชอยส์)
// ==========================================
function renderQuiz() {
  const list = state.filteredQuestions;
  if (list.length === 0) return;

  if (state.quizIndex >= list.length) {
    state.quizIndex = list.length - 1;
  }
  if (state.quizIndex < 0) {
    state.quizIndex = 0;
  }

  const q = list[state.quizIndex];

  // Update indexes
  document.getElementById('quiz-curr-idx').textContent = state.quizIndex + 1;
  document.getElementById('quiz-total-idx').textContent = list.length;
  document.getElementById('quiz-cat-badge').textContent = q.category;
  document.getElementById('quiz-set-name').textContent = q.setName;
  document.getElementById('quiz-question-text').textContent = q.question;

  // Progress Bar
  const pct = Math.round(((state.quizIndex + 1) / list.length) * 100);
  document.getElementById('quiz-progress-bar').style.width = `${pct}%`;

  // Score counters
  document.getElementById('quiz-correct-count').textContent = state.quizResults.correct;
  document.getElementById('quiz-wrong-count').textContent = state.quizResults.wrong;

  // Nav buttons
  document.getElementById('quiz-prev-btn').disabled = state.quizIndex === 0;

  // Generate 4 randomized choices (Correct answer + 3 random distractors from question's choices)
  let choicesPool = q.choices.filter(c => c !== q.answer);
  // shuffle pool and pick 3
  let distractors = shuffleArray(choicesPool).slice(0, 3);
  let fourChoices = shuffleArray([q.answer, ...distractors]);

  // If user already answered this question in this session:
  const prevSelected = state.quizAnswers[q.id];
  const choicesContainer = document.getElementById('quiz-choices-container');
  const feedbackBox = document.getElementById('quiz-feedback-box');

  choicesContainer.innerHTML = fourChoices.map((choice, idx) => {
    const letters = ['ก', 'ข', 'ค', 'ง'];
    return `
      <button onclick="handleQuizAnswer('${escapeHtml(choice)}')" class="quiz-choice-btn w-full p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-left flex items-start space-x-3 transition-all cursor-pointer group" data-choice="${escapeHtml(choice)}">
        <span class="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors">
          ${letters[idx]}
        </span>
        <span class="text-sm font-medium text-slate-200 group-hover:text-white leading-relaxed mt-0.5">
          ${escapeHtml(choice)}
        </span>
      </button>
    `;
  }).join('');

  if (prevSelected) {
    revealQuizAnswer(prevSelected, false);
  } else {
    feedbackBox.classList.add('hidden');
  }
}

function handleQuizAnswer(selectedChoice) {
  const q = state.filteredQuestions[state.quizIndex];
  if (state.quizAnswers[q.id]) return; // already answered

  state.quizAnswers[q.id] = selectedChoice;
  const isCorrect = selectedChoice === q.answer;

  if (isCorrect) {
    state.quizResults.correct++;
    sfx.playSuccess();
    state.mastered.add(q.id);
    state.weakSpots.delete(q.id);
  } else {
    state.quizResults.wrong++;
    sfx.playError();
    state.weakSpots.add(q.id);
    state.mastered.delete(q.id);
  }

  saveStorage();
  revealQuizAnswer(selectedChoice, true);
}

function revealQuizAnswer(selectedChoice, isNew) {
  const q = state.filteredQuestions[state.quizIndex];
  const isCorrect = selectedChoice === q.answer;

  const buttons = document.querySelectorAll('.quiz-choice-btn');
  buttons.forEach(btn => {
    const choice = btn.getAttribute('data-choice');
    btn.disabled = true;
    btn.classList.remove('cursor-pointer', 'hover:border-indigo-500/50');

    if (choice === q.answer) {
      btn.className = 'w-full p-4 rounded-xl bg-emerald-950/40 border border-emerald-500 text-left flex items-start space-x-3 transition-all';
      const badge = btn.querySelector('span:first-child');
      if (badge) {
        badge.className = 'w-7 h-7 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0';
        badge.innerHTML = '✓';
      }
    } else if (choice === selectedChoice && !isCorrect) {
      btn.className = 'w-full p-4 rounded-xl bg-rose-950/40 border border-rose-500 text-left flex items-start space-x-3 transition-all';
      const badge = btn.querySelector('span:first-child');
      if (badge) {
        badge.className = 'w-7 h-7 rounded-lg bg-rose-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0';
        badge.innerHTML = '✗';
      }
    } else {
      btn.classList.add('opacity-40');
    }
  });

  // Reveal Worked Example Feedback Box
  const feedbackBox = document.getElementById('quiz-feedback-box');
  if (feedbackBox) {
    feedbackBox.classList.remove('hidden');

    if (isCorrect) {
      feedbackBox.className = 'p-5 rounded-xl border bg-emerald-950/30 border-emerald-500/40 space-y-3';
      feedbackBox.innerHTML = `
        <div class="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
          <i data-lucide="check-circle" class="w-4 h-4"></i>
          <span>ถูกต้อง! เก่งมาก</span>
        </div>
        <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
          <span class="font-bold text-amber-300">สูตรจำลัด:</span> ${escapeHtml(q.memoryHook)}
        </div>
        <div class="text-xs text-slate-300 leading-relaxed">
          <span class="font-semibold text-indigo-300">เหตุผลประกอบ:</span> ${escapeHtml(q.explanation)}
        </div>
      `;
    } else {
      feedbackBox.className = 'p-5 rounded-xl border bg-rose-950/30 border-rose-500/40 space-y-3';
      feedbackBox.innerHTML = `
        <div class="flex items-center space-x-2 text-rose-400 font-bold text-sm">
          <i data-lucide="x-circle" class="w-4 h-4"></i>
          <span>ตอบผิด! เฉลยที่ถูกคือ: <span class="text-emerald-300 ml-1 font-bold underline">${escapeHtml(q.answer)}</span></span>
        </div>
        <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
          <span class="font-bold text-amber-300">สูตรจำลัด (Reverse Hook):</span> ${escapeHtml(q.memoryHook)}
        </div>
        <div class="text-xs text-slate-300 leading-relaxed">
          <span class="font-semibold text-indigo-300">เหตุผลประกอบ:</span> ${escapeHtml(q.explanation)}
        </div>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }
}

function nextQuizQuestion() {
  sfx.playClick();
  if (state.quizIndex < state.filteredQuestions.length - 1) {
    state.quizIndex++;
    renderQuiz();
  } else {
    // Reached end of quiz
    alert(`🎉 ทำครบแล้วทุกข้อในชุดนี้! คุณได้ ${state.quizResults.correct} คะแนน จาก ${state.filteredQuestions.length} ข้อ`);
  }
}

function prevQuizQuestion() {
  sfx.playClick();
  if (state.quizIndex > 0) {
    state.quizIndex--;
    renderQuiz();
  }
}

// ==========================================
// MODE 4: FLASHCARDS (การ์ดจำเร็ว)
// ==========================================
function renderFlashcard() {
  const list = state.filteredQuestions;
  if (list.length === 0) return;

  if (state.fcIndex >= list.length) state.fcIndex = 0;
  if (state.fcIndex < 0) state.fcIndex = list.length - 1;

  const q = list[state.fcIndex];

  document.getElementById('fc-curr-idx').textContent = state.fcIndex + 1;
  document.getElementById('fc-total-idx').textContent = list.length;
  document.getElementById('fc-category').textContent = q.category;

  document.getElementById('fc-question-text').textContent = q.question;
  document.getElementById('fc-answer-text').textContent = q.answer;
  document.getElementById('fc-hook-text').innerHTML = `
    <span class="font-bold text-amber-400">💡 เทคนิคจำ:</span> ${escapeHtml(q.memoryHook)}
  `;

  // Reset flip
  state.fcFlipped = false;
  const inner = document.getElementById('flashcard-inner');
  if (inner) inner.classList.remove('rotate-y-180');
}

function flipFlashcard() {
  sfx.playClick();
  state.fcFlipped = !state.fcFlipped;
  const inner = document.getElementById('flashcard-inner');
  if (inner) {
    if (state.fcFlipped) {
      inner.classList.add('rotate-y-180');
    } else {
      inner.classList.remove('rotate-y-180');
    }
  }
}

function nextFlashcard() {
  sfx.playClick();
  state.fcIndex++;
  renderFlashcard();
}

function prevFlashcard() {
  sfx.playClick();
  state.fcIndex--;
  renderFlashcard();
}

// Spacebar / Keyboard navigation for flashcards & quiz
window.addEventListener('keydown', (e) => {
  if (state.currentMode === 'flashcard') {
    if (e.code === 'Space') {
      e.preventDefault();
      flipFlashcard();
    } else if (e.code === 'ArrowRight') {
      nextFlashcard();
    } else if (e.code === 'ArrowLeft') {
      prevFlashcard();
    }
  }
});

// ==========================================
// MODE 5: MOCK EXAM (จำลองสอบ 30 ข้อเหมือน 1.pdf)
// ==========================================
function initMockExam() {
  // Randomly sample 30 questions from the entire bank of 70
  state.mockQuestions = shuffleArray(QUESTION_BANK).slice(0, 30);
  state.mockUserAnswers = {};
  state.mockSubmitted = false;
  state.mockTimerSeconds = 1800; // 30 mins

  // Reset timer
  if (state.mockTimerInterval) clearInterval(state.mockTimerInterval);
  state.mockTimerInterval = setInterval(updateMockTimer, 1000);

  const resultsCard = document.getElementById('mock-results-card');
  if (resultsCard) resultsCard.classList.add('hidden');

  const submitBtn = document.getElementById('mock-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  renderMockQuestions();
}

function updateMockTimer() {
  state.mockTimerSeconds--;
  if (state.mockTimerSeconds <= 0) {
    clearInterval(state.mockTimerInterval);
    submitMockExam();
    return;
  }

  const mins = Math.floor(state.mockTimerSeconds / 60);
  const secs = state.mockTimerSeconds % 60;
  const timerEl = document.getElementById('mock-timer');
  if (timerEl) {
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

function renderMockQuestions() {
  const container = document.getElementById('mock-questions-container');
  if (!container) return;

  container.innerHTML = state.mockQuestions.map((q, idx) => {
    // Generate 4 randomized choices for mock
    let distractors = shuffleArray(q.choices.filter(c => c !== q.answer)).slice(0, 3);
    let fourChoices = shuffleArray([q.answer, ...distractors]);

    return `
      <div id="mock-q-card-${q.id}" class="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
        <div class="flex items-center justify-between">
          <span class="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs font-bold flex items-center justify-center">
            ${idx + 1}
          </span>
          <span class="text-xs text-slate-500">${escapeHtml(q.category)}</span>
        </div>

        <h3 class="text-base sm:text-lg font-semibold text-white leading-relaxed">
          ${escapeHtml(q.question)}
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          ${fourChoices.map(c => `
            <label class="mock-choice-label flex items-start space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors" data-qid="${q.id}">
              <input type="radio" name="mock_q_${q.id}" value="${escapeHtml(c)}" onchange="handleMockChoiceSelect(${q.id}, '${escapeHtml(c)}')" class="mt-1 text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-700 bg-slate-900">
              <span class="text-xs sm:text-sm text-slate-300 font-medium leading-snug">${escapeHtml(c)}</span>
            </label>
          `).join('')}
        </div>

        <div id="mock-q-feedback-${q.id}" class="hidden p-3.5 rounded-xl border text-xs leading-relaxed space-y-1"></div>
      </div>
    `;
  }).join('');
}

function handleMockChoiceSelect(qId, choice) {
  sfx.playClick();
  state.mockUserAnswers[qId] = choice;
}

function submitMockExam() {
  if (state.mockSubmitted) return;
  state.mockSubmitted = true;
  clearInterval(state.mockTimerInterval);

  let score = 0;
  const total = state.mockQuestions.length;

  state.mockQuestions.forEach(q => {
    const userChoice = state.mockUserAnswers[q.id];
    const isCorrect = userChoice === q.answer;
    const card = document.getElementById(`mock-q-card-${q.id}`);
    const feedback = document.getElementById(`mock-q-feedback-${q.id}`);

    if (isCorrect) {
      score++;
      state.mastered.add(q.id);
      state.weakSpots.delete(q.id);
      if (card) card.classList.add('border-emerald-500/50', 'bg-emerald-950/10');
      if (feedback) {
        feedback.classList.remove('hidden');
        feedback.className = 'p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 space-y-1';
        feedback.innerHTML = `✓ ตอบถูกต้อง: ${escapeHtml(q.answer)}`;
      }
    } else {
      state.weakSpots.add(q.id);
      state.mastered.delete(q.id);
      if (card) card.classList.add('border-rose-500/50', 'bg-rose-950/10');
      if (feedback) {
        feedback.classList.remove('hidden');
        feedback.className = 'p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 space-y-1.5';
        feedback.innerHTML = `
          <div class="font-bold">✗ เฉลยที่ถูกต้อง: <span class="text-white">${escapeHtml(q.answer)}</span></div>
          <div class="text-slate-300 text-[11px]">${escapeHtml(q.explanation)}</div>
          <div class="text-amber-300 text-[11px]">💡 เทคนิคจำ: ${escapeHtml(q.memoryHook)}</div>
        `;
      }
    }
  });

  saveStorage();

  // Scroll to top to see results
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const resultsCard = document.getElementById('mock-results-card');
  const pct = Math.round((score / total) * 100);
  const isPass = pct >= 80;

  if (isPass) sfx.playSuccess();
  else sfx.playError();

  if (resultsCard) {
    resultsCard.classList.remove('hidden');
    resultsCard.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl ${isPass ? 'bg-emerald-950/40 border border-emerald-500/40' : 'bg-rose-950/40 border border-rose-500/40'}">
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 rounded-2xl ${isPass ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'} flex flex-col items-center justify-center font-bold shadow-lg">
            <span class="text-2xl">${score}</span>
            <span class="text-[10px] uppercase font-mono tracking-wider">/${total}</span>
          </div>
          <div>
            <h3 class="text-xl font-bold ${isPass ? 'text-emerald-300' : 'text-rose-300'}">
              ${isPass ? '🎉 ผ่านเกณฑ์การทดสอบยอดเยี่ยม!' : '⚠️ ยังไม่ผ่านเกณฑ์ 80%'}
            </h3>
            <p class="text-xs text-slate-300 mt-1">
              คุณทำได้ ${pct}% (ข้อที่ผิดจำนวน ${total - score} ข้อถูกส่งไปคลังข้อผิดเพื่อทวนซ้ำแล้ว)
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="initMockExam()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all">
            สอบใหม่อีกรอบ (สุ่ม 30 ข้อใหม่)
          </button>
          <button onclick="switchMode('weakness')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all">
            ไปติวข้อที่ผิด
          </button>
        </div>
      </div>
    `;
  }
}

// ==========================================
// MODE 6: WEAK SPOTS DRILL (คลังข้อผิด)
// ==========================================
function renderWeakSpots() {
  const container = document.getElementById('weakness-container');
  if (!container) return;

  const weakQuestions = QUESTION_BANK.filter(q => state.weakSpots.has(q.id));

  if (weakQuestions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
        <i data-lucide="check-check" class="w-14 h-14 mx-auto text-emerald-400"></i>
        <h3 class="text-xl font-bold text-white">ยอดเยี่ยมมาก! ไม่มีข้อที่ตอบผิดค้างอยู่</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto">
          คุณสามารถไปทดลองทำในโหมดจำลองสอบ 30 ข้อ หรือสลับชอยส์เพื่อทดสอบความแม่นยำเพิ่มเติมได้ครับ
        </p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="text-xs text-slate-400 mb-2">
      มีข้อสอบที่ต้องทบทวนทั้งหมด <span class="font-bold text-rose-400">${weakQuestions.length}</span> ข้อ
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${weakQuestions.map(q => `
        <div class="rounded-2xl p-5 bg-slate-900 border border-rose-500/30 space-y-3 shadow-lg">
          <div class="flex items-center justify-between text-xs">
            <span class="font-mono font-bold text-rose-400">#ข้อ ${q.id}</span>
            <span class="text-slate-400">${q.category}</span>
          </div>

          <h4 class="text-sm font-semibold text-white leading-relaxed">${escapeHtml(q.question)}</h4>

          <div class="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-1">
            <div class="text-emerald-400 font-bold uppercase tracking-wider">เฉลย:</div>
            <div class="text-emerald-200 font-semibold text-base">${escapeHtml(q.answer)}</div>
          </div>

          <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            <span class="font-bold text-amber-400">💡 เทคนิคจำ:</span> ${escapeHtml(q.memoryHook)}
          </div>

          <div class="text-xs text-slate-400 leading-relaxed bg-slate-950 p-2.5 rounded-lg">
            ${escapeHtml(q.explanation)}
          </div>

          <button onclick="removeWeakSpot(${q.id})" class="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors flex items-center justify-center space-x-1">
            <span>✓ จำได้แม่นแล้ว (ลบออกจากคลังข้อผิด)</span>
          </button>
        </div>
      `).join('')}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function removeWeakSpot(id) {
  state.weakSpots.delete(id);
  state.mastered.add(id);
  sfx.playSuccess();
  saveStorage();
  renderWeakSpots();
}

function clearWeakSpots() {
  if (confirm('คุณต้องการล้างประวัติข้อสอบที่ตอบผิดทั้งหมดใช่หรือไม่?')) {
    state.weakSpots.clear();
    saveStorage();
    renderWeakSpots();
  }
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial Launch on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  state.filteredQuestions = getFilteredQuestions();
  switchMode('worked');
});
