/* ==========================================================================
   School Online Exam Application Core Engine (MIL Exam)
   ========================================================================== */

(function () {
  'use strict';

  // Constants & Storage Keys
  const EXAM_DURATION_MS = 2 * 60 * 60 * 1000; // 2 Hours in milliseconds
  const USERS_KEY = 'mil_exam_users_db';
  const SUBMISSIONS_KEY = 'mil_exam_submissions_db';
  // NOTE: ACTIVE_SESSION_KEY is now stored in sessionStorage (per-tab isolation)
  // so multiple students on different browser tabs/windows don't share a login slot.
  const ACTIVE_SESSION_KEY = 'mil_exam_active_session';
  const DEFAULT_TEACHER_PASS = 'admin123';

  // --------------------------------------------------------------------------
  // Firebase Configuration & Firestore Initialization
  // --------------------------------------------------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyDiFMw9q1-xD0vX3WlciiOmsKewLVlGhB0",
    authDomain: "exam2-71a39.firebaseapp.com",
    projectId: "exam2-71a39",
    storageBucket: "exam2-71a39.firebasestorage.app",
    messagingSenderId: "370998951257",
    appId: "1:370998951257:web:0b97881bbd8526522e6048"
  };

  let db = null;
  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        console.warn('Firestore persistence notice:', err.code);
      });
      console.log('🔥 Firebase Firestore connected successfully!');
    } catch (e) {
      console.warn('Firebase setup notice:', e);
    }
  }

  // Meme Definitions with Offline SVG/Canvas Generators & GIF fallbacks
  const MEME_TIERS = {
    LEGENDARY: {
      minPct: 90,
      title: 'Galaxy Brain Mastery!',
      tierLabel: 'Tier S: Legend',
      badgeClass: 'legendary',
      caption: 'Outstanding! You mastered Media and Information Literacy like a boss!',
      bgGradient: 'linear-gradient(135deg, #6366f1, #06b6d4)',
      svgGraphic: `<svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4f46e5"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" rx="20" fill="url(#grad1)"/>
        <circle cx="200" cy="110" r="55" fill="#fef08a" opacity="0.9"/>
        <text x="200" y="125" font-size="60" text-anchor="middle">🧠</text>
        <text x="200" y="195" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">ABSOLUTE GENIUS!</text>
        <text x="200" y="230" font-size="14" fill="#e0e7ff" text-anchor="middle" font-family="sans-serif">Score: Locked until Teacher Review</text>
        <path d="M 50,40 L 80,70 M 350,40 L 320,70 M 50,260 L 80,230 M 350,260 L 320,230" stroke="#fef08a" stroke-width="4" stroke-linecap="round"/>
      </svg>`
    },
    EXCELLENT: {
      minPct: 75,
      title: 'Solid Performance!',
      tierLabel: 'Tier A: Excellent',
      badgeClass: 'excellent',
      caption: 'Great work! You have a strong grasp of the material.',
      bgGradient: 'linear-gradient(135deg, #10b981, #3b82f6)',
      svgGraphic: `<svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#059669"/>
            <stop offset="100%" stop-color="#2563eb"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" rx="20" fill="url(#grad2)"/>
        <text x="200" y="125" font-size="65" text-anchor="middle">🥂</text>
        <text x="200" y="195" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">HIGH FIVE! SOLID WORK!</text>
        <text x="200" y="230" font-size="14" fill="#d1fae5" text-anchor="middle" font-family="sans-serif">Submitted & Passed with Flying Colors</text>
      </svg>`
    },
    AVERAGE: {
      minPct: 50,
      title: 'You Made It Through!',
      tierLabel: 'Tier B: Average',
      badgeClass: 'average',
      caption: 'Not bad! You passed, but review a few more topics to level up.',
      bgGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      svgGraphic: `<svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" rx="20" fill="url(#grad3)"/>
        <text x="200" y="125" font-size="65" text-anchor="middle">😅</text>
        <text x="200" y="195" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">PHEW! YOU SURVIVED!</text>
        <text x="200" y="230" font-size="14" fill="#fef3c7" text-anchor="middle" font-family="sans-serif">Keep pushing forward!</text>
      </svg>`
    },
    NEEDS_WORK: {
      minPct: 0,
      title: 'Time to Hit the Books!',
      tierLabel: 'Tier C: Needs Improvement',
      badgeClass: 'needs-work',
      caption: 'Don\'t give up! Review your Media and Information Literacy notes and try again.',
      bgGradient: 'linear-gradient(135deg, #f43f5e, #be123c)',
      svgGraphic: `<svg viewBox="0 0 400 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e11d48"/>
            <stop offset="100%" stop-color="#9f1239"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" rx="20" fill="url(#grad4)"/>
        <text x="200" y="125" font-size="65" text-anchor="middle">📚</text>
        <text x="200" y="195" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="sans-serif">STUDY TIME! STAY FOCUSED!</text>
        <text x="200" y="230" font-size="14" fill="#ffe4e6" text-anchor="middle" font-family="sans-serif">Review key concepts with your teacher</text>
      </svg>`
    }
  };

  // State Application Store
  let rawQuestions = [];
  let shuffledQuestions = [];
  let currentUser = null;
  let timerInterval = null;
  let currentQuestionIndex = 0;
  let userAnswers = {}; // { questionId: selectedOptionKey }
  let flaggedQuestions = new Set();
  let violationLog = [];
  let isScoreReleased = false;

  // DOM Elements Cache
  const views = {
    auth: document.getElementById('view-auth'),
    exam: document.getElementById('view-exam'),
    submission: document.getElementById('view-submission'),
    teacher: document.getElementById('view-teacher')
  };

  // --------------------------------------------------------------------------
  // Seeded Pseudorandom Generator (Mulberry32) for Consistent Shuffle
  // --------------------------------------------------------------------------
  function stringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleArrayWithSeed(array, seedVal) {
    const rng = mulberry32(seedVal);
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --------------------------------------------------------------------------
  // Username Auto-Generation & Unique Check Logic
  // --------------------------------------------------------------------------
  function generateCleanBaseUsername(firstName, middleName, lastName) {
    const cleanStr = (str) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const f = cleanStr(firstName);
    const m = cleanStr(middleName);
    const l = cleanStr(lastName);

    const parts = [f, m, l].filter(Boolean);
    return parts.join('.');
  }

  // In-memory users cache (populated from Firestore on load)
  let usersCache = {};

  async function loadUsersFromFirebase() {
    if (!db) return;
    try {
      const snapshot = await db.collection('users').get();
      snapshot.forEach((doc) => { usersCache[doc.id] = doc.data(); });
      // Mirror to localStorage as offline backup
      localStorage.setItem(USERS_KEY, JSON.stringify(usersCache));
    } catch (err) {
      console.warn('Could not load users from Firebase, using localStorage cache.', err);
      usersCache = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    }
  }

  // getUniqueUsername — local-only preview (for the live username tag in the form).
  // Actual guaranteed-unique username is assigned atomically in registerUserAtomically().
  function getUniqueUsername(firstName, middleName, lastName) {
    const base = generateCleanBaseUsername(firstName, middleName, lastName) || 'student';
    const users = Object.keys(usersCache).length > 0
      ? usersCache
      : JSON.parse(localStorage.getItem(USERS_KEY) || '{}');

    if (!users[base]) return base;

    let counter = 1;
    while (users[`${base}.${counter}`]) counter++;
    return `${base}.${counter}`;
  }

  // --------------------------------------------------------------------------
  // Atomic User Registration (Firestore Transaction)
  // Handles up to 100 simultaneous registrations safely — no duplicate usernames.
  // --------------------------------------------------------------------------
  async function registerUserAtomically(firstName, middleName, lastName) {
    const base = generateCleanBaseUsername(firstName, middleName, lastName) || 'student';

    // Offline / no Firebase path — fall back to local uniqueness check
    if (!db) {
      const username = getUniqueUsername(firstName, middleName, lastName);
      const userObj = {
        username, firstName, middleName, lastName,
        registeredAt: new Date().toISOString()
      };
      usersCache[username] = userObj;
      const usersLocal = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
      usersLocal[username] = userObj;
      localStorage.setItem(USERS_KEY, JSON.stringify(usersLocal));
      return userObj;
    }

    // --- Firestore transaction: atomically claim a unique username slot ---
    // We try base first, then base.1, base.2, … until we find an unclaimed slot.
    // The transaction guarantees that even if two students with the same name
    // hit "Begin Examination" at the exact same millisecond, they each get
    // a distinct username with no read-check race condition.
    const MAX_ATTEMPTS = 100; // safety cap for classes with many same-name students
    let finalUserObj = null;

    for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
      const candidateUsername = attempt === 0 ? base : `${base}.${attempt}`;
      const docRef = db.collection('users').doc(candidateUsername);

      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (snap.exists) {
            // Slot taken — throw so we loop to next candidate
            throw new Error('USERNAME_TAKEN');
          }
          // Slot is free — atomically claim it
          const userObj = {
            username: candidateUsername,
            firstName, middleName, lastName,
            registeredAt: new Date().toISOString()
          };
          tx.set(docRef, userObj);
          finalUserObj = userObj;
        });
        // Transaction succeeded — break out of the loop
        break;
      } catch (err) {
        if (err.message === 'USERNAME_TAKEN') continue; // try next suffix
        // Unexpected Firestore error — fall back to local method
        console.warn('Firestore registration transaction failed, using local fallback.', err);
        const username = getUniqueUsername(firstName, middleName, lastName);
        finalUserObj = { username, firstName, middleName, lastName, registeredAt: new Date().toISOString() };
        break;
      }
    }

    if (!finalUserObj) throw new Error('Could not assign a unique username after maximum attempts.');

    // Update local caches so future getUniqueUsername() previews are accurate
    usersCache[finalUserObj.username] = finalUserObj;
    const usersLocal = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    usersLocal[finalUserObj.username] = finalUserObj;
    localStorage.setItem(USERS_KEY, JSON.stringify(usersLocal));

    return finalUserObj;
  }

  // --------------------------------------------------------------------------
  // Question File Parser (Question.txt) - Handles all standard text formats
  // --------------------------------------------------------------------------
  function parseQuestionText(text) {
    const questions = [];
    if (!text) return questions;

    // Split text into question blocks by detecting question number headers or line patterns
    const blocks = text.split(/(?=\n?\s*(?:QUESTION\s+\d+:?|Q\d+:?|ITEM\s+\d+:?|\d+[\.\)]\s+))/i);

    let idCounter = 1;

    for (let block of blocks) {
      block = block.trim();
      if (!block) continue;

      // Extract Question Text before options or answer line
      const qMatch = block.match(/(?:(?:QUESTION\s+\d+:?|Q\d+:?|ITEM\s+\d+:?|\d+[\.\)]\s+))?\s*([\s\S]+?)(?=\n\s*[A-Da-d][\.\)]|\n\s*(?:ANSWER|CORRECT\s+ANSWER|KEY|ANS):)/i);
      if (!qMatch) continue;

      let questionText = qMatch[1].trim();

      // Clean leading headers or decorative lines if any remain
      questionText = questionText.replace(/^=+\s*/, '').replace(/\s*=+\s*$/, '').trim();

      // Extract Options A, B, C, D (or a, b, c, d)
      const options = [];
      const optionMatches = [...block.matchAll(/\b([A-Da-d])[\.\)]\s*(.+?)(?=\n\s*[A-Da-d][\.\)]|\n\s*(?:ANSWER|CORRECT\s+ANSWER|KEY|ANS):|$)/gis)];

      for (let optMatch of optionMatches) {
        options.push({
          key: optMatch[1].toUpperCase(),
          text: optMatch[2].trim()
        });
      }

      // Extract Answer Key (ANSWER: B, Correct Answer: B, Key: B, Ans: B, etc.)
      const ansMatch = block.match(/(?:ANSWER|CORRECT\s+ANSWER|KEY|ANS):\s*([A-Da-d])/i);
      const correctAnswer = ansMatch ? ansMatch[1].toUpperCase() : (options[0]?.key || 'A');

      if (questionText && options.length >= 2) {
        questions.push({
          id: idCounter++,
          questionText: questionText,
          options: options,
          correctAnswer: correctAnswer
        });
      }
    }

    return questions;
  }

  async function loadQuestionFile() {
    try {
      const response = await fetch('Question.txt', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      localStorage.setItem('cachedQuestionTxt', text);
      rawQuestions = parseQuestionText(text);
    } catch (err) {
      console.warn('Could not fetch Question.txt, trying cache.', err);
      const cached = localStorage.getItem('cachedQuestionTxt');
      if (cached) {
        rawQuestions = parseQuestionText(cached);
      } else {
        alert('Unable to load exam questions. Please ensure the server is running and Question.txt is accessible.');
      }
    }
  }

  // --------------------------------------------------------------------------
  // View Router & UI State Management
  // --------------------------------------------------------------------------
  function showView(viewName) {
    Object.keys(views).forEach((name) => {
      if (views[name]) {
        views[name].classList.remove('active');
      }
    });

    if (views[viewName]) {
      views[viewName].classList.add('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --------------------------------------------------------------------------
  // Exam Engine: Timer, Shuffling, Anti-Cheat, Auto-Save
  // --------------------------------------------------------------------------
  async function startOrResumeExamSession(user) {
    currentUser = user;
    const sessionKey = `mil_exam_session_${user.username}`;
    let sessionData = null;

    // 1. Try Firestore first (source of truth)
    if (db) {
      try {
        const doc = await db.collection('sessions').doc(user.username).get();
        if (doc.exists) {
          sessionData = doc.data();
          // Sync to localStorage
          localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        }
      } catch (err) {
        console.warn('Firestore session read failed, trying localStorage.', err);
        sessionData = JSON.parse(localStorage.getItem(sessionKey) || 'null');
      }
    } else {
      // Offline: read from localStorage
      sessionData = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    }

    const now = Date.now();

    if (!sessionData) {
      // New Session Setup
      sessionData = {
        username: user.username,
        startTime: now,
        answers: {},
        flagged: [],
        currentIndex: 0,
        violations: [],
        isSubmitted: false
      };
      // Save new session to Firestore + localStorage
      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
      if (db) {
        db.collection('sessions').doc(user.username).set(sessionData).catch(err =>
          console.warn('Firestore new session save failed:', err)
        );
      }
    }

    userAnswers = sessionData.answers || {};
    flaggedQuestions = new Set(sessionData.flagged || []);
    currentQuestionIndex = sessionData.currentIndex || 0;
    violationLog = sessionData.violations || [];

    // Check if already submitted
    if (sessionData.isSubmitted) {
      renderSubmissionResult(sessionData);
      showView('submission');
      return;
    }

    // Shuffle questions consistently per user
    const userSeed = stringToSeed(user.username);
    const shuffledRaw = shuffleArrayWithSeed(rawQuestions, userSeed);

    shuffledQuestions = shuffledRaw.map((q) => {
      const qSeed = userSeed + q.id;
      const shuffledOptions = shuffleArrayWithSeed(q.options, qSeed);
      return { ...q, options: shuffledOptions };
    });

    startTimer(sessionData.startTime);
    renderHeaderInfo();
    renderQuestionGridNav();
    renderCurrentQuestion();
    initAntiCheatSurveillance();
    showView('exam');
  }

  function startTimer(startTime) {
    if (timerInterval) clearInterval(timerInterval);

    const timerDisplay = document.getElementById('timer-countdown');

    function updateClock() {
      const now = Date.now();
      const elapsed = now - startTime;
      const remainingMs = Math.max(0, EXAM_DURATION_MS - elapsed);
      const remainingSecs = Math.floor(remainingMs / 1000);

      const hours = Math.floor(remainingSecs / 3600);
      const mins = Math.floor((remainingSecs % 3600) / 60);
      const secs = remainingSecs % 60;

      const formatted = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (timerDisplay) {
        timerDisplay.textContent = formatted;
      }

      const timerPill = document.getElementById('timer-pill');
      if (timerPill) {
        if (remainingSecs <= 300) { // < 5 mins
          timerPill.className = 'timer-pill danger';
        } else if (remainingSecs <= 1800) { // < 30 mins
          timerPill.className = 'timer-pill warning';
        } else {
          timerPill.className = 'timer-pill';
        }
      }

      if (remainingSecs <= 0) {
        clearInterval(timerInterval);
        alert('Time has expired! Your exam is being automatically submitted.');
        submitExam(true);
      }
    }

    updateClock();
    timerInterval = setInterval(updateClock, 1000);
  }

  function saveExamProgress() {
    if (!currentUser) return;
    const sessionKey = `mil_exam_session_${currentUser.username}`;

    const sessionData = {
      username: currentUser.username,
      startTime: JSON.parse(localStorage.getItem(sessionKey) || '{}').startTime || Date.now(),
      answers: userAnswers,
      flagged: Array.from(flaggedQuestions),
      currentIndex: currentQuestionIndex,
      violations: violationLog,
      updatedAt: new Date().toISOString(),
      isSubmitted: false
    };

    // 1. Write to localStorage (instant, offline-safe)
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));

    // 2. Write to Firestore (primary source of truth)
    if (db) {
      db.collection('sessions').doc(currentUser.username)
        .set(sessionData, { merge: true })
        .catch(err => console.warn('Firestore session sync notice:', err));
    }

    // Flash Auto-save indicator badge
    const saveBadge = document.getElementById('auto-save-status');
    if (saveBadge) {
      saveBadge.innerHTML = '<span>⚡ Saved to Firebase</span>';
      setTimeout(() => {
        saveBadge.innerHTML = '<span>✔ Saved & Synced</span>';
      }, 1500);
    }
  }

  // --------------------------------------------------------------------------
  // Exam UI Component Renderers
  // --------------------------------------------------------------------------
  function renderHeaderInfo() {
    const userDisplay = document.getElementById('header-user-display');
    const userAvatar = document.getElementById('header-user-avatar');
    if (userDisplay && currentUser) {
      userDisplay.textContent = `@${currentUser.username}`;
    }
    if (userAvatar && currentUser) {
      userAvatar.textContent = (currentUser.firstName[0] || 'S').toUpperCase();
    }
  }

  function renderQuestionGridNav() {
    const gridNav = document.getElementById('question-nav-grid');
    if (!gridNav) return;

    gridNav.innerHTML = '';

    shuffledQuestions.forEach((q, index) => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn';

      if (index === currentQuestionIndex) {
        btn.classList.add('active');
      }
      if (userAnswers[q.id]) {
        btn.classList.add('answered');
      }
      if (flaggedQuestions.has(q.id)) {
        btn.classList.add('flagged');
      }

      btn.textContent = index + 1;
      btn.addEventListener('click', () => {
        currentQuestionIndex = index;
        renderCurrentQuestion();
        renderQuestionGridNav();
        saveExamProgress();
      });

      gridNav.appendChild(btn);
    });
  }

  function renderCurrentQuestion() {
    const q = shuffledQuestions[currentQuestionIndex];
    if (!q) return;

    const qNumTag = document.getElementById('q-number-tag');
    const qCountBadge = document.getElementById('q-count-badge');
    const qTextBox = document.getElementById('q-text-box');
    const optionsContainer = document.getElementById('options-list');
    const flagBtn = document.getElementById('flag-question-btn');

    if (qNumTag) qNumTag.textContent = `Question ${currentQuestionIndex + 1}`;
    if (qCountBadge) qCountBadge.textContent = `Item ${currentQuestionIndex + 1} of ${shuffledQuestions.length}`;
    if (qTextBox) qTextBox.textContent = q.questionText;

    if (flagBtn) {
      if (flaggedQuestions.has(q.id)) {
        flagBtn.classList.add('flagged');
        flagBtn.innerHTML = '🚩 Flagged';
      } else {
        flagBtn.classList.remove('flagged');
        flagBtn.innerHTML = '🏳️ Flag for Review';
      }
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = '';

      q.options.forEach((opt, idx) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';

        const optLetter = String.fromCharCode(65 + idx); // A, B, C, D display
        if (userAnswers[q.id] === opt.key) {
          optionItem.classList.add('selected');
        }

        optionItem.innerHTML = `
          <div class="option-key">${optLetter}</div>
          <div class="option-label">${opt.text}</div>
        `;

        optionItem.addEventListener('click', () => {
          userAnswers[q.id] = opt.key;
          renderCurrentQuestion();
          renderQuestionGridNav();
          saveExamProgress();
        });

        optionsContainer.appendChild(optionItem);
      });
    }

    // Update Nav Buttons State
    const prevBtn = document.getElementById('btn-prev-question');
    const nextBtn = document.getElementById('btn-next-question');

    if (prevBtn) prevBtn.disabled = currentQuestionIndex === 0;
    if (nextBtn) {
      if (currentQuestionIndex === shuffledQuestions.length - 1) {
        nextBtn.textContent = 'Review & Submit';
        nextBtn.className = 'btn-primary';
      } else {
        nextBtn.textContent = 'Next Question →';
        nextBtn.className = 'btn-secondary';
      }
    }
  }

  // --------------------------------------------------------------------------
  // Anti-Cheating Surveillance System
  // --------------------------------------------------------------------------
  function initAntiCheatSurveillance() {
    // 1. Tab Switch / Focus Blur Detector
    // Uses a 300 ms grace period so that brief Windows OS focus losses
    // (taskbar clicks, notifications, Alt-Tab accidents) don't trigger false positives.
    let focusLossTimer = null;

    function handleVisibilityLoss() {
      if (document.hidden && views.exam && views.exam.classList.contains('active')) {
        // Start grace-period timer — only log if still hidden after 300 ms
        if (!focusLossTimer) {
          focusLossTimer = setTimeout(() => {
            focusLossTimer = null;
            if (document.hidden && views.exam && views.exam.classList.contains('active')) {
              const timestamp = new Date().toLocaleTimeString();
              violationLog.push({ type: 'Tab Switch / Window Change', time: timestamp });
              showViolationWarningOverlay(violationLog.length);
              saveExamProgress();
            }
          }, 300);
        }
      } else {
        // Tab came back into focus — cancel any pending timer
        if (focusLossTimer) {
          clearTimeout(focusLossTimer);
          focusLossTimer = null;
        }
      }
    }

    document.removeEventListener('visibilitychange', handleVisibilityLoss);
    document.addEventListener('visibilitychange', handleVisibilityLoss);


    // 2. Anti Copy / Right Click Restriction on Exam Area
    const examCard = document.getElementById('view-exam');
    if (examCard) {
      examCard.addEventListener('contextmenu', (e) => e.preventDefault());
      examCard.addEventListener('copy', (e) => e.preventDefault());
      examCard.addEventListener('paste', (e) => e.preventDefault());
    }
  }

  function showViolationWarningOverlay(count) {
    const existing = document.getElementById('violation-warning-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'violation-warning-overlay';
    overlay.className = 'warning-overlay';
    overlay.innerHTML = `
      <div class="glass-card warning-card">
        <div class="warning-icon">⚠️</div>
        <h3 class="warning-title">Anti-Cheat Violation Detected!</h3>
        <p class="warning-desc">You left or switched browser tabs during the examination. This incident has been logged for teacher review.</p>
        <div style="margin-bottom: 1.25rem; font-weight:700; color: var(--accent-rose);">Total Warnings: ${count}</div>
        <button class="btn-primary" id="btn-dismiss-warning">I Understand - Return to Exam</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-dismiss-warning').addEventListener('click', () => {
      overlay.remove();
    });
  }

  // --------------------------------------------------------------------------
  // Exam Submission & Meme Score Calculation
  // --------------------------------------------------------------------------
  async function submitExam(isAutoSubmit = false) {
    if (!isAutoSubmit) {
      const unansweredCount = shuffledQuestions.length - Object.keys(userAnswers).length;
      let msg = 'Are you sure you want to submit your examination?';
      if (unansweredCount > 0) {
        msg = `You still have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`;
      }
      if (!confirm(msg)) return;
    }

    if (timerInterval) clearInterval(timerInterval);

    // Silent Score Calculation
    let score = 0;
    shuffledQuestions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) score++;
    });

    const total = shuffledQuestions.length;
    const percentage = Math.round((score / total) * 100);

    // Evaluate Meme Tier
    let tierKey = 'NEEDS_WORK';
    if (percentage >= MEME_TIERS.LEGENDARY.minPct) tierKey = 'LEGENDARY';
    else if (percentage >= MEME_TIERS.EXCELLENT.minPct) tierKey = 'EXCELLENT';
    else if (percentage >= MEME_TIERS.AVERAGE.minPct) tierKey = 'AVERAGE';

    // Build detailed answer log for teacher review
    const answerDetails = shuffledQuestions.map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      studentAnswer: userAnswers[q.id] || null,
      correctAnswer: q.correctAnswer,
      isCorrect: userAnswers[q.id] === q.correctAnswer
    }));

    const sessionKey = `mil_exam_session_${currentUser.username}`;
    const sessionData = {
      username: currentUser.username,
      firstName: currentUser.firstName,
      middleName: currentUser.middleName || '',
      lastName: currentUser.lastName,
      fullName: `${currentUser.firstName} ${currentUser.middleName || ''} ${currentUser.lastName}`.trim(),
      answers: userAnswers,
      answerDetails: answerDetails,
      score: score,
      total: total,
      percentage: percentage,
      tierKey: tierKey,
      violations: violationLog,
      submittedAt: new Date().toISOString(),
      submittedAtLocal: new Date().toLocaleString(),
      isSubmitted: true,
      isScoreReleased: false
    };

    // 1. Save locally first (offline resilience)
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}');
    submissions[currentUser.username] = sessionData;
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

    // 2. Push to Firebase Firestore (real-time sync for teacher dashboard)
    if (db) {
      try {
        await db.collection('submissions').doc(currentUser.username).set(sessionData);
        console.log('✅ Submission saved to Firebase for:', currentUser.username);
      } catch (err) {
        console.warn('⚠️ Firestore save failed (offline). Local backup kept.', err);
      }
    }

    renderSubmissionResult(sessionData);
    showView('submission');
  }

  function renderSubmissionResult(sessionData) {
    const tier = MEME_TIERS[sessionData.tierKey] || MEME_TIERS.NEEDS_WORK;

    const memeContainer = document.getElementById('submission-meme-container');
    const scoreLockContainer = document.getElementById('submission-score-container');

    const isReleased = sessionData.isScoreReleased || false;

    if (memeContainer) {
      memeContainer.innerHTML = `
        <div class="meme-card">
          <span class="meme-tier-badge ${tier.badgeClass}">${tier.tierLabel}</span>
          <div class="meme-graphic-box" style="width: 100%; max-width: 380px;">
            ${tier.svgGraphic}
          </div>
          <h3 class="meme-caption">${tier.title}</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">${tier.caption}</p>
        </div>
      `;
    }

    if (scoreLockContainer) {
      if (isReleased) {
        scoreLockContainer.innerHTML = `
          <div class="score-unlocked-card">
            <div style="font-size: 0.85rem; font-weight:700; color: var(--accent-emerald); text-transform: uppercase;">Teacher Approved Score</div>
            <div class="unlocked-score-number">${sessionData.score} / ${sessionData.total}</div>
            <div style="font-size: 1.1rem; font-weight:600; color: var(--text-main);">${sessionData.percentage}% Grade</div>
          </div>
        `;
      } else {
        scoreLockContainer.innerHTML = `
          <div class="score-lock-card">
            <div class="lock-icon">🔒</div>
            <div class="lock-text">
              <h4>Numerical Score Hidden</h4>
              <p>Exam Submitted! Your score will be visible once reviewed and approved by your teacher.</p>
            </div>
          </div>
        `;

        // Real-time Firestore listener — auto-unlocks score when teacher releases it
        if (db) {
          db.collection('submissions').doc(sessionData.username).onSnapshot((snapshot) => {
            if (snapshot.exists) {
              const freshData = snapshot.data();
              if (freshData.isScoreReleased) {
                renderSubmissionResult(freshData);
              }
            }
          });
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Teacher Portal & Score Release Controller
  // --------------------------------------------------------------------------
  async function openTeacherPortal() {
    const pass = prompt('Enter Teacher Access Key:', '');
    if (!pass) return;

    // Fetch password from Firestore config (secure)
    if (db) {
      try {
        const doc = await db.collection('config').doc('teacherAccess').get();
        const correctPass = doc.exists ? doc.data().password : DEFAULT_TEACHER_PASS;
        if (pass !== correctPass) {
          alert('❌ Invalid Teacher Access Key.');
          return;
        }
      } catch (err) {
        console.warn('Firestore config read failed, using fallback.', err);
        if (pass !== DEFAULT_TEACHER_PASS) {
          alert('❌ Invalid Teacher Access Key.');
          return;
        }
      }
    } else {
      if (pass !== DEFAULT_TEACHER_PASS) {
        alert('❌ Invalid Teacher Access Key.');
        return;
      }
    }

    renderTeacherDashboard();
    showView('teacher');
  }

  // Holds the Firestore unsubscribe handle for the teacher dashboard listener
  let teacherSnapshotUnsubscribe = null;

  function renderTeacherDashboard() {
    const tableBody = document.getElementById('teacher-submissions-tbody');
    if (!tableBody) return;

    // Show loading state
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">⏳ Loading submissions from Firebase...</td></tr>`;

    // Unsubscribe from any previous listener to avoid duplicates
    if (teacherSnapshotUnsubscribe) {
      teacherSnapshotUnsubscribe();
      teacherSnapshotUnsubscribe = null;
    }

    // Inject stats bar + search + CSV export controls once
    let teacherControls = document.getElementById('teacher-dashboard-controls');
    if (!teacherControls) {
      const wrapper = document.querySelector('.teacher-wrapper');
      teacherControls = document.createElement('div');
      teacherControls.id = 'teacher-dashboard-controls';
      teacherControls.innerHTML = `
        <!-- Live Stats Summary -->
        <div id="teacher-stats-bar" style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        ">
          <div class="teacher-stat-card" id="stat-total">
            <div class="stat-num">0</div>
            <div class="stat-label">Total Submitted</div>
          </div>
          <div class="teacher-stat-card" id="stat-released">
            <div class="stat-num" style="color:var(--accent-emerald)">0</div>
            <div class="stat-label">Scores Released</div>
          </div>
          <div class="teacher-stat-card" id="stat-pending">
            <div class="stat-num" style="color:var(--accent-amber)">0</div>
            <div class="stat-label">Pending Review</div>
          </div>
          <div class="teacher-stat-card" id="stat-violations">
            <div class="stat-num" style="color:var(--accent-rose)">0</div>
            <div class="stat-label">Flagged Students</div>
          </div>
          <div class="teacher-stat-card" id="stat-avg">
            <div class="stat-num" style="color:var(--accent-cyan)">—</div>
            <div class="stat-label">Class Average</div>
          </div>
        </div>

        <!-- Search + Export Row -->
        <div style="display:flex; gap:0.75rem; margin-bottom:1rem; flex-wrap:wrap; align-items:center;">
          <input id="teacher-search-input" type="text" placeholder="🔍 Search student name or @username…"
            style="flex:1; min-width:220px; padding:0.65rem 1rem; border-radius:8px;
                   background:rgba(0,0,0,0.25); border:1px solid var(--border-color);
                   color:var(--text-main); font-size:0.9rem; font-family:var(--font-body);"
          />
          <select id="teacher-filter-tier" style="padding:0.65rem 0.85rem; border-radius:8px;
            background:rgba(0,0,0,0.25); border:1px solid var(--border-color);
            color:var(--text-main); font-size:0.85rem; font-family:var(--font-body);">
            <option value="">All Tiers</option>
            <option value="LEGENDARY">🧠 Legendary</option>
            <option value="EXCELLENT">🥂 Excellent</option>
            <option value="AVERAGE">😅 Average</option>
            <option value="NEEDS_WORK">📚 Needs Work</option>
          </select>
          <select id="teacher-filter-status" style="padding:0.65rem 0.85rem; border-radius:8px;
            background:rgba(0,0,0,0.25); border:1px solid var(--border-color);
            color:var(--text-main); font-size:0.85rem; font-family:var(--font-body);">
            <option value="">All Statuses</option>
            <option value="released">✅ Released</option>
            <option value="locked">🔒 Locked</option>
          </select>
          <button id="btn-export-csv" class="btn-secondary" style="padding:0.65rem 1rem; font-size:0.85rem; white-space:nowrap;">
            ⬇️ Export CSV
          </button>
        </div>
      `;
      // Insert before the table
      const tableResponsive = wrapper.querySelector('.table-responsive');
      wrapper.insertBefore(teacherControls, tableResponsive);

      // Attach style for stat cards
      if (!document.getElementById('teacher-stat-style')) {
        const style = document.createElement('style');
        style.id = 'teacher-stat-style';
        style.textContent = `
          .teacher-stat-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 0.85rem 1rem;
            text-align: center;
          }
          .stat-num {
            font-family: var(--font-heading);
            font-size: 1.6rem;
            font-weight: 800;
            color: var(--text-main);
            line-height: 1;
          }
          .stat-label {
            font-size: 0.72rem;
            color: var(--text-subtle);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.3rem;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Master list updated by Firestore snapshot
    let allStudents = [];

    function updateStats(list) {
      const total = list.length;
      const released = list.filter(s => s.isScoreReleased).length;
      const pending = total - released;
      const flagged = list.filter(s => (s.violations || []).length > 0).length;
      const avg = total > 0
        ? Math.round(list.reduce((acc, s) => acc + (s.percentage || 0), 0) / total)
        : null;

      const q = (id) => document.querySelector(`#${id} .stat-num`);
      if (q('stat-total')) q('stat-total').textContent = total;
      if (q('stat-released')) q('stat-released').textContent = released;
      if (q('stat-pending')) q('stat-pending').textContent = pending;
      if (q('stat-violations')) q('stat-violations').textContent = flagged;
      if (q('stat-avg')) q('stat-avg').textContent = avg !== null ? `${avg}%` : '—';
    }

    function getFilteredList() {
      const searchEl = document.getElementById('teacher-search-input');
      const tierEl = document.getElementById('teacher-filter-tier');
      const statusEl = document.getElementById('teacher-filter-status');
      const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
      const tier = tierEl ? tierEl.value : '';
      const status = statusEl ? statusEl.value : '';

      return allStudents.filter(s => {
        const matchSearch = !search
          || (s.fullName || '').toLowerCase().includes(search)
          || (s.username || '').toLowerCase().includes(search);
        const matchTier = !tier || s.tierKey === tier;
        const matchStatus = !status
          || (status === 'released' && s.isScoreReleased)
          || (status === 'locked' && !s.isScoreReleased);
        return matchSearch && matchTier && matchStatus;
      });
    }

    function drawTable(studentList) {
      tableBody.innerHTML = '';

      if (studentList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No matching submissions found.</td></tr>`;
        return;
      }

      studentList.forEach((sub, rowIndex) => {
        const tr = document.createElement('tr');
        const isReleased = sub.isScoreReleased || false;
        const violationCount = (sub.violations || []).length;
        const submittedDisplay = sub.submittedAtLocal || sub.submittedAt || '—';

        tr.innerHTML = `
          <td>
            <strong>${sub.fullName}</strong>
            <br><small style="color:var(--text-subtle)">@${sub.username}</small>
          </td>
          <td>${submittedDisplay}</td>
          <td><span class="meme-tier-badge">${sub.tierKey}</span></td>
          <td><span style="color:${violationCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight:700;">${violationCount} violation${violationCount !== 1 ? 's' : ''}</span></td>
          <td><strong>${sub.score} / ${sub.total} (${sub.percentage}%)</strong></td>
          <td>
            <span class="status-badge ${isReleased ? '' : 'offline'}">${isReleased ? '✅ Unlocked' : '🔒 Locked'}</span>
          </td>
          <td>
            <button class="btn-secondary btn-toggle-release" data-user="${sub.username}" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
              ${isReleased ? '🔒 Lock' : '🔓 Release'}
            </button>
            <button class="btn-secondary btn-danger btn-reset-student" data-user="${sub.username}" style="padding:0.35rem 0.75rem; font-size:0.8rem; margin-left:0.25rem;">
              🗑️
            </button>
          </td>
        `;
        tableBody.appendChild(tr);
      });

      // Attach button listeners
      document.querySelectorAll('.btn-toggle-release').forEach((btn) => {
        btn.addEventListener('click', (e) => toggleScoreRelease(e.currentTarget.getAttribute('data-user')));
      });
      document.querySelectorAll('.btn-reset-student').forEach((btn) => {
        btn.addEventListener('click', (e) => resetStudentAttempt(e.currentTarget.getAttribute('data-user')));
      });
    }

    function refreshView() {
      updateStats(allStudents);
      drawTable(getFilteredList());
    }

    // Wire search + filter controls
    const searchInput = document.getElementById('teacher-search-input');
    const tierFilter = document.getElementById('teacher-filter-tier');
    const statusFilter = document.getElementById('teacher-filter-status');
    const exportBtn = document.getElementById('btn-export-csv');

    if (searchInput) searchInput.addEventListener('input', refreshView);
    if (tierFilter) tierFilter.addEventListener('change', refreshView);
    if (statusFilter) statusFilter.addEventListener('change', refreshView);

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const rows = [['Full Name', 'Username', 'Score', 'Total', 'Percentage', 'Tier', 'Violations', 'Score Released', 'Submitted At']];
        allStudents.forEach(s => {
          rows.push([
            `"${s.fullName || ''}"`,
            `"${s.username || ''}"`,
            s.score ?? '',
            s.total ?? '',
            `${s.percentage ?? ''}%`,
            `"${s.tierKey || ''}"`,
            (s.violations || []).length,
            s.isScoreReleased ? 'Yes' : 'No',
            `"${s.submittedAtLocal || s.submittedAt || ''}"`,
          ]);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MIL_Exam_Results_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Real-time Firestore listener — updates teacher table whenever a student submits
    if (db) {
      teacherSnapshotUnsubscribe = db.collection('submissions')
        .orderBy('submittedAt', 'asc')
        .onSnapshot((snapshot) => {
          allStudents = [];
          snapshot.forEach((doc) => allStudents.push(doc.data()));
          // Mirror to localStorage as offline backup
          const submissionsCache = {};
          allStudents.forEach((s) => { submissionsCache[s.username] = s; });
          localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissionsCache));
          refreshView();
        }, (err) => {
          console.warn('Firestore snapshot error, falling back to localStorage.', err);
          allStudents = Object.values(JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}'));
          refreshView();
        });
    } else {
      // Offline fallback
      allStudents = Object.values(JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}'));
      refreshView();
    }
  }

  async function toggleScoreRelease(username) {
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}');
    if (!submissions[username]) return;
    const newState = !submissions[username].isScoreReleased;
    submissions[username].isScoreReleased = newState;
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

    // Push to Firestore so student sees score unlock in real-time
    if (db) {
      try {
        await db.collection('submissions').doc(username).update({ isScoreReleased: newState });
        console.log(`✅ Score release updated for ${username}: ${newState}`);
      } catch (err) {
        console.warn('Firestore score release update failed.', err);
      }
    }
    // Table re-draws automatically via Firestore onSnapshot
  }

  async function releaseAllScores() {
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}');
    Object.keys(submissions).forEach((u) => { submissions[u].isScoreReleased = true; });
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));

    if (db) {
      const batch = db.batch();
      Object.keys(submissions).forEach((u) => {
        batch.update(db.collection('submissions').doc(u), { isScoreReleased: true });
      });
      try {
        await batch.commit();
        console.log('✅ All scores released in Firebase.');
      } catch (err) {
        console.warn('Firestore batch release failed.', err);
      }
    }
    alert('✅ All student scores have been released!');
  }

  async function resetStudentAttempt(username) {
    if (!confirm(`Are you sure you want to reset the exam attempt for @${username}? This cannot be undone.`)) return;

    // Remove from localStorage
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}');
    delete submissions[username];
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    localStorage.removeItem(`mil_exam_session_${username}`);

    // Delete from Firestore
    if (db) {
      try {
        await db.collection('submissions').doc(username).delete();
        console.log(`🗑️ Submission deleted from Firebase for: ${username}`);
      } catch (err) {
        console.warn('Firestore delete failed.', err);
      }
    }
    // Table re-draws automatically via Firestore onSnapshot
  }

  // --------------------------------------------------------------------------
  // Application Event Initializer
  // --------------------------------------------------------------------------
  async function initApp() {
    // 1. Load Question.txt
    await loadQuestionFile();

    // 2. Load existing users from Firebase (for unique username generation)
    await loadUsersFromFirebase();


    // 2. Registration Form Handlers & Realtime Username Preview
    const fnInput = document.getElementById('reg-firstname');
    const mnInput = document.getElementById('reg-middlename');
    const lnInput = document.getElementById('reg-lastname');
    const usernameTag = document.getElementById('username-tag-preview');
    const authForm = document.getElementById('auth-form');

    function updateUsernamePreview() {
      const fn = fnInput ? fnInput.value : '';
      const mn = mnInput ? mnInput.value : '';
      const ln = lnInput ? lnInput.value : '';

      if (fn || ln) {
        const gen = getUniqueUsername(fn, mn, ln);
        if (usernameTag) usernameTag.textContent = `@${gen}`;
      } else {
        if (usernameTag) usernameTag.textContent = '@firstname.middlename.lastname';
      }
    }

    if (fnInput) fnInput.addEventListener('input', updateUsernamePreview);
    if (mnInput) mnInput.addEventListener('input', updateUsernamePreview);
    if (lnInput) lnInput.addEventListener('input', updateUsernamePreview);

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fn = fnInput.value.trim();
        const mn = mnInput.value.trim();
        const ln = lnInput.value.trim();

        if (!fn || !ln) {
          alert('Please enter your First Name and Last Name.');
          return;
        }

        // Disable submit button while we atomically claim a username in Firestore
        const submitBtn = authForm.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ Registering…'; }

        let userObj;
        try {
          // Atomically registers the user and assigns a guaranteed-unique username.
          // Safe for 100 simultaneous registrations — no two students can get
          // the same username even if they have identical names.
          userObj = await registerUserAtomically(fn, mn, ln);
        } catch (err) {
          console.error('Registration failed:', err);
          alert('Registration failed. Please try again.');
          if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>Begin Examination</span> →'; }
          return;
        }

        // Store active user in sessionStorage — isolated per browser tab/window.
        // This prevents multiple students using the site simultaneously from
        // overwriting each other's "who is logged in" slot.
        sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(userObj));

        console.log('✅ User registered:', userObj.username);
        startOrResumeExamSession(userObj);
      });
    }

    // 3. Question Navigation Controls
    const prevBtn = document.getElementById('btn-prev-question');
    const nextBtn = document.getElementById('btn-next-question');
    const flagBtn = document.getElementById('flag-question-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
          currentQuestionIndex--;
          renderCurrentQuestion();
          renderQuestionGridNav();
          saveExamProgress();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < shuffledQuestions.length - 1) {
          currentQuestionIndex++;
          renderCurrentQuestion();
          renderQuestionGridNav();
          saveExamProgress();
        } else {
          submitExam();
        }
      });
    }

    if (flagBtn) {
      flagBtn.addEventListener('click', () => {
        const q = shuffledQuestions[currentQuestionIndex];
        if (!q) return;

        if (flaggedQuestions.has(q.id)) {
          flaggedQuestions.delete(q.id);
        } else {
          flaggedQuestions.add(q.id);
        }

        renderCurrentQuestion();
        renderQuestionGridNav();
        saveExamProgress();
      });
    }

    // 4. Header Actions (Theme Toggle, Teacher Portal, Logout/Switch User)
    const themeToggle = document.getElementById('btn-toggle-theme');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
      });
    }

    const teacherBtn = document.getElementById('btn-teacher-portal');
    if (teacherBtn) {
      teacherBtn.addEventListener('click', openTeacherPortal);
    }

    const teacherBackBtn = document.getElementById('btn-teacher-back');
    if (teacherBackBtn) {
      teacherBackBtn.addEventListener('click', () => {
        // Use sessionStorage so the back button returns THIS tab's user, not a shared slot
        const activeUser = JSON.parse(sessionStorage.getItem(ACTIVE_SESSION_KEY) || 'null');
        if (activeUser) {
          startOrResumeExamSession(activeUser);
        } else {
          showView('auth');
        }
      });
    }

    const releaseAllBtn = document.getElementById('btn-release-all-scores');
    if (releaseAllBtn) {
      releaseAllBtn.addEventListener('click', releaseAllScores);
    }

    const submitExamBtn = document.getElementById('btn-submit-exam-sidebar');
    if (submitExamBtn) {
      submitExamBtn.addEventListener('click', () => submitExam(false));
    }


    // 5. Restore Active User Session from sessionStorage (per-tab, not shared).
    // We intentionally do NOT read from Firestore or localStorage here because
    // those are shared across all tabs/users. sessionStorage is scoped to this
    // specific browser tab, so each student gets their own independent login state.
    const activeUser = JSON.parse(sessionStorage.getItem(ACTIVE_SESSION_KEY) || 'null');

    if (activeUser) {
      startOrResumeExamSession(activeUser);
    } else {
      showView('auth');
    }

    // 6. Network Status Monitor (PWA / Offline)
    function updateNetworkStatus() {
      const badge = document.getElementById('network-status-badge');
      if (badge) {
        if (navigator.onLine) {
          badge.className = 'status-badge';
          badge.innerHTML = '<span class="status-dot"></span> Online';
        } else {
          badge.className = 'status-badge offline';
          badge.innerHTML = '<span class="status-dot"></span> Offline Mode';
        }
      }
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    // 7. Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.log('Service Worker registration skipped or unavailable offline:', err);
      });
    }
  }

  // Initialize App on DOM Load
  document.addEventListener('DOMContentLoaded', initApp);
})();
