// ─── WebAudio setup pour ultra-low-latency ─────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

const SFX_FILES = {
  tab:        'sounds/tab-click.mp3',
  validate:   'sounds/validate.mp3',
  scratch:    'sounds/scratch.mp3',
  reward:     'sounds/reward.mp3',
  badge:      'sounds/badge.mp3',
  taskDone:   'sounds/task-done.mp3',
  createTask: 'sounds/create-task.mp3'
};
const sfxBuffers = {};
async function loadSfx(name, url) {
  try {
    const resp = await fetch(url);
    const buf  = await resp.arrayBuffer();
    sfxBuffers[name] = await audioCtx.decodeAudioData(buf);
  } catch (e) {
    console.warn(`Erreur chargement SFX ${name}:`, e);
  }
}
Promise.all(Object.entries(SFX_FILES).map(([n, u]) => loadSfx(n, u)));
function playSfx(name) {
  const buf = sfxBuffers[name];
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(0);
}

// scratch sound loop
let scratchSource = null;
function startScratchSfx() {
  if (scratchSource || !sfxBuffers.scratch) return;
  scratchSource = audioCtx.createBufferSource();
  scratchSource.buffer = sfxBuffers.scratch;
  scratchSource.loop = true;
  scratchSource.connect(audioCtx.destination);
  scratchSource.start(0);
}
function stopScratchSfx() {
  if (!scratchSource) return;
  scratchSource.stop();
  scratchSource = null;
}

// ─── Lottie animations ────────────────────────────────────────────
const introAnim = lottie.loadAnimation({
  container: document.getElementById('lottie-intro'),
  renderer: 'svg', loop: false, autoplay: true,
  path: 'animations/intro.json'
});
introAnim.addEventListener('complete', () => {
  document.getElementById('lottie-intro').style.display = 'none';
});
const badgeContainer = document.getElementById('lottie-badge');
const badgeAnim = lottie.loadAnimation({
  container: badgeContainer,
  renderer: 'svg', loop: false, autoplay: false,
  path: 'animations/badge.json'
});
badgeAnim.setSpeed(2);
badgeAnim.addEventListener('complete', () => {
  badgeContainer.style.display = 'none';
});
const taskDoneContainer = document.getElementById('lottie-task-done');
const taskDoneAnim = lottie.loadAnimation({
  container: taskDoneContainer,
  renderer: 'svg', loop: false, autoplay: false,
  path: 'animations/task-done.json'
});
taskDoneAnim.addEventListener('complete', () => {
  taskDoneContainer.style.display = 'none';
});

// ─── Daily card logic ───────────────────────────────────────────
const cards = Array.from({ length: 10 }, (_, i) => `card${i + 1}`);
let startDate = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0, 10);
if (!startDate) {
  localStorage.setItem('startDate', todayISO);
  startDate = todayISO;
}
const daysElapsed = Math.floor((new Date(todayISO) - new Date(startDate)) / 86400000);
const currentCard = cards[daysElapsed % cards.length];

// ─── DOM refs ───────────────────────────────────────────────────
const tabs = {
  profile: document.getElementById('tab-profile'),
  play:    document.getElementById('tab-play'),
  badges:  document.getElementById('tab-badges'),
  todo:    document.getElementById('tab-todo')
};
const views = {
  profile: document.getElementById('view-profile'),
  play:    document.getElementById('view-play'),
  badges:  document.getElementById('view-badges'),
  todo:    document.getElementById('view-todo')
};
const resetBtn    = document.getElementById('reset-btn');
const pseudoIn    = document.getElementById('pseudo-input');
const pseudoBtn   = document.getElementById('pseudo-btn');
const pseudoDisp  = document.getElementById('pseudo-display');
const profileForm = document.getElementById('profile-form');
const profileStats= document.querySelector('.profile-stats');
const cardsCount  = document.getElementById('cards-scratched');
const rewardsCount= document.getElementById('rewards-count');
const tasksCount  = document.getElementById('tasks-done-count');
const levelDisp   = document.getElementById('level-display');
const xpBar       = document.getElementById('xp-bar');
const xpText      = document.getElementById('xp-text');

const scratchImg  = document.getElementById('scratch-image');
const scratchArea = document.getElementById('scratch-area');
const canvas      = document.getElementById('scratchCanvas');
const ctx         = canvas.getContext('2d');
const rewardBtn   = document.getElementById('reward-btn');
const badgesList  = document.getElementById('badges-list');

const todoIn      = document.getElementById('todo-input');
const todoAddBtn  = document.getElementById('todo-add-btn');
const todoList    = document.getElementById('todo-list');

const TODOS_KEY   = 'todos';
const TASKS_KEY   = 'tasksDone';

// scratch status
const scratchStatus = document.createElement('p');
scratchStatus.id = 'scratch-status';
Object.assign(scratchStatus.style, {
  display: 'none',
  margin: '1rem auto 0',
  padding: '.5rem 1rem',
  background: '#28A745',
  color: '#FFF',
  borderRadius: '4px',
  width: '90%',
  textAlign: 'center'
});
rewardBtn.insertAdjacentElement('afterend', scratchStatus);

let drawing = false, rewardTriggered = false;

// ─── Pseudo management ─────────────────────────────────────────
function checkPseudo() {
  const p = localStorage.getItem('pseudo');
  if (p) {
    profileForm.style.display = 'none';
    profileStats.style.display = 'grid';
    pseudoDisp.textContent = p;
  } else {
    profileForm.style.display = 'flex';
    profileStats.style.display = 'none';
  }
}
pseudoBtn.addEventListener('click', () => {
  playSfx('tab'); playSfx('validate');
  const v = pseudoIn.value.trim();
  if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── Profile stats & XP ────────────────────────────────────────
function updateProfileStats() {
  cardsCount.textContent   = parseInt(localStorage.getItem('scratchCount') || '0', 10);
  rewardsCount.textContent = JSON.parse(localStorage.getItem('scratchLog') || '[]').length;
  tasksCount.textContent   = parseInt(localStorage.getItem(TASKS_KEY) || '0', 10);
}
function updateXP() {
  const xp = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const lvl = Math.floor(xp / 100);
  const rem = xp % 100;
  levelDisp.textContent = lvl;
  xpBar.style.width     = `${rem}%`;
  xpText.textContent    = `${rem}/100`;
}

// ─── Tab navigation ────────────────────────────────────────────
function showTab(tab) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  Object.values(tabs).forEach(b => b.classList.remove('active'));
  views[tab].classList.add('active');
  tabs[tab].classList.add('active');
  playSfx('tab');
  if (tab === 'profile') {
    checkPseudo();
    updateProfileStats();
    updateXP();
  }
  if (tab === 'play') {
    scratchImg.src = `images/${currentCard}.png`;
    checkDailyScratch();
    initScratch();
  }
  if (tab === 'badges') {
    renderBadges();
  }
  if (tab === 'todo') {
    renderTodos();
  }
}
Object.keys(tabs).forEach(tab => {
  tabs[tab].addEventListener('click', () => showTab(tab));
});

// ─── Reset app ─────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  ['scratchLog', 'lastScratchDate', 'xpTotal', 'pseudo', 'scratchCount', TASKS_KEY]
    .forEach(k => localStorage.removeItem(k));
  checkPseudo();
  showTab('profile');
});

// ─── Canvas init & daily logic ──────────────────────────────────
function initScratch() {
  const w = scratchArea.clientWidth, h = scratchArea.clientHeight;
  canvas.width  = w;
  canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30;
  ctx.lineCap   = 'round';
}
function checkDailyScratch() {
  const last = localStorage.getItem('lastScratchDate');
  if (last === todayISO) {
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity       = '0.5';
    rewardBtn.style.display    = 'none';
    scratchStatus.textContent  = 'NEXT SCRATCH TOMORROW';
    scratchStatus.style.display= 'block';
  } else {
    initScratch();
    canvas.style.pointerEvents = 'auto';
    canvas.style.opacity       = '1';
    rewardBtn.style.display    = 'none';
    scratchStatus.style.display= 'none';
    rewardTriggered = false;
  }
}
window.addEventListener('resize', () => {
  if (views.play.classList.contains('active')) initScratch();
});

// ─── Utility to get pointer position ───────────────────────────
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// ─── Clear detection at 65% ─────────────────────────────────────
function checkClear() {
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  if (cleared / (canvas.width * canvas.height) * 100 >= 65) {
    localStorage.setItem('scratchCount',
      (parseInt(localStorage.getItem('scratchCount') || '0', 10) + 1).toString()
    );
    updateProfileStats();
    const xpNew = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 20;
    localStorage.setItem('xpTotal', xpNew.toString());
    updateXP();
    rewardBtn.style.display = 'block';
    rewardBtn.disabled      = false;
    canvas.style.pointerEvents = 'none';
    stopScratchSfx();
  }
}

// ─── Scratch event handlers ─────────────────────────────────────
// Mouse
canvas.addEventListener('mousedown', e => {
  drawing = true;
  startScratchSfx();
  const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
});
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
});
canvas.addEventListener('mouseup', () => {
  drawing = false;
  stopScratchSfx();
  checkClear();
});
canvas.addEventListener('mouseleave', () => {
  drawing = false;
  stopScratchSfx();
});

// Touch (disable scroll)
['touchstart','touchmove','touchend'].forEach(evt => {
  canvas.addEventListener(evt, e => {
    e.preventDefault();
    if (evt === 'touchstart') {
      drawing = true; startScratchSfx();
      const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    }
    if (evt === 'touchmove' && drawing) {
      const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    if (evt === 'touchend') {
      drawing = false; stopScratchSfx(); checkClear();
    }
  }, { passive: false });
});

// ─── Reward handler ────────────────────────────────────────────
rewardBtn.addEventListener('click', e => {
  e.preventDefault();
  if (rewardTriggered) return;
  rewardTriggered = true;
  rewardBtn.disabled = true;
  playSfx('reward'); playSfx('badge');
  ctx.globalCompositeOperation = 'source-out';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  localStorage.setItem('lastScratchDate', todayISO);
  const badgeId = currentCard.replace('card','badge');
  const log = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  if (!log.includes(badgeId)) log.push(badgeId);
  localStorage.setItem('scratchLog', JSON.stringify(log));
  badgeContainer.style.display = 'flex';
  badgeAnim.goToAndPlay(0, true);
  showTab('badges');
}, { passive: false });

// ─── Render badges ─────────────────────────────────────────────
function renderBadges() {
  badgesList.innerHTML = '';
  const won = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  for (let i = 0; i < 30; i++) {
    const li = document.createElement('li');
    li.className = 'badge-slot';
    const num = document.createElement('span');
    num.className = 'badge-slot-number';
    num.textContent = i + 1;
    li.appendChild(num);
    if (won[i]) {
      const img = document.createElement('img');
      img.src = `images/${won[i]}.png`;
      img.alt = `Badge ${won[i]}`;
      li.appendChild(img);
    }
    badgesList.appendChild(li);
  }
}

// ─── ToDo & taskDone ───────────────────────────────────────────
function getTodos() {
  return JSON.parse(localStorage.getItem(TODOS_KEY) || '[]');
}
function saveTodos(arr) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(arr));
}
function renderTodos() {
  todoList.innerHTML = '';
  getTodos().forEach((text, idx) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = text;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      playSfx('taskDone');
      taskDoneContainer.style.display = 'flex';
      taskDoneAnim.goToAndPlay(0, true);
      const doneCnt = parseInt(localStorage.getItem(TASKS_KEY) || '0', 10) + 1;
      localStorage.setItem(TASKS_KEY, doneCnt.toString());
      const xpNew = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 10;
      localStorage.setItem('xpTotal', xpNew.toString());
      updateXP();
      setTimeout(() => {
        const rem = getTodos().filter((_, j) => j !== idx);
        saveTodos(rem);
        renderTodos();
        updateProfileStats();
      }, 500);
    });
    li.append(span, cb);
    todoList.appendChild(li);
  });
}
todoAddBtn.addEventListener('click', () => {
  const v = todoIn.value.trim();
  if (!v) return;
  playSfx('createTask');
  const arr = getTodos();
  arr.unshift(v);
  saveTodos(arr);
  todoIn.value = '';
  renderTodos();
});

// ─── Service Worker & init ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
document.addEventListener('DOMContentLoaded', () => {
  checkPseudo();
  initScratch();
  renderTodos();
  showTab('profile');
});
