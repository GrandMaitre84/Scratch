// ─── WebAudio setup pour ultra-low-latency ─────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

const SFX_FILES = {
  tab:         'sounds/tab-click.mp3',
  validate:    'sounds/validate.mp3',
  scratch:     'sounds/scratch.mp3',
  reward:      'sounds/reward.mp3',
  badge:       'sounds/badge.mp3',
  taskDone:    'sounds/task-done.mp3',
  createTask:  'sounds/create-task.mp3'
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
  if (scratchSource || !sfxBuffers['scratch']) return;
  scratchSource = audioCtx.createBufferSource();
  scratchSource.buffer = sfxBuffers['scratch'];
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

const badgeAnim = lottie.loadAnimation({
  container: document.getElementById('lottie-badge'),
  renderer: 'svg', loop: false, autoplay: false,
  path: 'animations/badge.json'
});
badgeAnim.setSpeed(2);
badgeAnim.addEventListener('complete', () => {
  document.getElementById('lottie-badge').style.display = 'none';
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

// ─── Cartes & badges dynamiques ─────────────────────────────────
const cards = ['card1','card2','card3','card4','card5','card6','card7','card8','card9','card10'];
const cardToBadge = {};
async function initCardToBadge() {
  await Promise.all(cards.map(async card => {
    const badgeId = card.replace('card','badge');
    try {
      const resp = await fetch(`images/${badgeId}.png`, { method: 'HEAD' });
      cardToBadge[card] = resp.ok ? badgeId : null;
    } catch {
      cardToBadge[card] = null;
    }
  }));
}

// ─── Carte du jour ─────────────────────────────────────────────
let startDate = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0,10);
if (!startDate) {
  localStorage.setItem('startDate', todayISO);
  startDate = todayISO;
}
const daysElapsed = Math.floor((new Date(todayISO) - new Date(startDate)) / 86400000);
const currentCard = cards[daysElapsed % cards.length];

// ─── DOM Elements ───────────────────────────────────────────────
const tabProfile   = document.getElementById('tab-profile');
const tabPlay      = document.getElementById('tab-play');
const tabBadges    = document.getElementById('tab-badges');
const tabTodo      = document.getElementById('tab-todo');
const tabGame      = document.getElementById('tab-game');

const viewProfile  = document.getElementById('view-profile');
const viewPlay     = document.getElementById('view-play');
const viewBadges   = document.getElementById('view-badges');
const viewTodo     = document.getElementById('view-todo');
const viewGame     = document.getElementById('view-game');

const resetBtn     = document.getElementById('reset-btn');
const pseudoInput  = document.getElementById('pseudo-input');
const pseudoBtn    = document.getElementById('pseudo-btn');
const pseudoSpan   = document.getElementById('pseudo-display');
const profileForm  = document.getElementById('profile-form');
const profileStats = document.querySelector('.profile-stats');
const cardsDisplay = document.getElementById('cards-scratched');
const rewardsDisplay = document.getElementById('rewards-count');
const levelDisplay = document.getElementById('level-display');
const xpBar        = document.getElementById('xp-bar');
const xpText       = document.getElementById('xp-text');
const scratchArea  = document.getElementById('scratch-area');
const canvas       = document.getElementById('scratchCanvas');
const ctx          = canvas.getContext('2d');
const rewardBtn    = document.getElementById('reward-btn');

// TO DO Elements
const todoInput    = document.getElementById('todo-input');
const todoAddBtn   = document.getElementById('todo-add-btn');
const todoList     = document.getElementById('todo-list');

// localStorage keys
const TODOS_KEY      = 'todos';
const TASKS_DONE_KEY = 'tasksDone';

// Phaser game container
const gameContainer = document.getElementById('game-container');
let phaserGame = null;

// Scratch status / Done button
const scratchStatus = document.createElement('p');
scratchStatus.id = 'scratch-status';
Object.assign(scratchStatus.style, { display: 'none', margin: '1rem auto 0', padding: '.5rem 1rem', background: '#28A745', color: '#FFF', borderRadius: '4px', width: '80%', maxWidth: '300px', textAlign: 'center' });
rewardBtn.insertAdjacentElement('afterend', scratchStatus);
const doneBtn = document.createElement('button');
doneBtn.id = 'done-btn'; doneBtn.textContent = 'DONE';
Object.assign(doneBtn.style, { display: 'none', margin: '1rem auto 0', padding: '.5rem 1rem', background: '#28A745', color: '#FFF', border: 'none', borderRadius: '4px', width: '80%', maxWidth: '300px', cursor: 'pointer', fontSize: '16px' });
doneBtn.addEventListener('mouseenter', () => doneBtn.style.background = '#218838');
doneBtn.addEventListener('mouseleave', () => doneBtn.style.background = '#28A745');
rewardBtn.insertAdjacentElement('afterend', doneBtn);

let drawing = false, rewardTriggered = false, doneTriggered = false;

// ─── Pseudo management ─────────────────────────────────────────
function checkPseudo() {
  const stored = localStorage.getItem('pseudo');
  if (stored) {
    profileForm.style.display = 'none';
    profileStats.style.display = 'grid';
    pseudoSpan.textContent = stored;
  } else {
    profileForm.style.display = 'flex';
    profileStats.style.display = 'none';
    pseudoSpan.textContent = '';
  }
}
pseudoBtn.addEventListener('click', () => {
  playSfx('tab'); playSfx('validate');
  const v = pseudoInput.value.trim(); if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── Stats Profil ───────────────────────────────────────────────
function updateProfileStats() {
  // cartes grattées selon scratchCount, pas xpTotal
  const scratched = parseInt(localStorage.getItem('scratchCount') || '0', 10);
  cardsDisplay.textContent = scratched;
  // nombre de rewards
  const rewards = JSON.parse(localStorage.getItem('scratchLog') || '[]').length;
  rewardsDisplay.textContent = rewards;
  // tâches effectuées
  const done = parseInt(localStorage.getItem(TASKS_DONE_KEY) || '0', 10);
  document.getElementById('tasks-done-count').textContent = done;
}

// ─── XP & Level display ───────────────────────────────────────
function updateXPDisplay() {
  const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const level   = Math.floor(xpTotal / 100);
  const rem     = xpTotal % 100;
  levelDisplay.textContent = level;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `${rem}/100`;
}

// ─── Gestion des onglets ──────────────────────────────────────
function showTab(tab) {
  [viewProfile, viewPlay, viewBadges, viewTodo, viewGame].forEach(v => v.classList.remove('active'));
  [tabProfile, tabPlay, tabBadges, tabTodo, tabGame].forEach(b => b.classList.remove('active'));
  playSfx('tab');
  switch (tab) {
    case 'profile':
      viewProfile.classList.add('active'); tabProfile.classList.add('active');
      checkPseudo(); updateXPDisplay(); updateProfileStats();
      break;
    case 'play':
      viewPlay.classList.add('active'); tabPlay.classList.add('active');
      document.getElementById('scratch-image').src = `images/${currentCard}.png`;
      checkDailyScratch();
      break;
    case 'badges':
      viewBadges.classList.add('active'); tabBadges.classList.add('active');
      renderBadges();
      break;
    case 'todo':
      viewTodo.classList.add('active'); tabTodo.classList.add('active');
      renderTodos();
      break;
    case 'game':
      viewGame.classList.add('active'); tabGame.classList.add('active');
      if (!phaserGame) setTimeout(launchPhaserGame, 300);
      break;
  }
}
tabProfile.addEventListener('click', () => showTab('profile'));
tabPlay.addEventListener('click', () => showTab('play'));
tabBadges.addEventListener('click', () => showTab('badges'));
tabTodo.addEventListener('click', () => showTab('todo'));
tabGame.addEventListener('click', () => showTab('game'));

// ─── Reset ────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  ['scratchLog','lastScratchDate','xpTotal','pseudo','scratchCount',TASKS_DONE_KEY]
    .forEach(k => localStorage.removeItem(k));
  checkPseudo();
  showTab('profile');
});

// ─── Initialisation du canvas scratch ─────────────────────────
function initScratch() {
  const w = scratchArea.clientWidth, h = scratchArea.clientHeight;
  canvas.width = w; canvas.height = h;
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#999';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30; ctx.lineCap = 'round';
}
window.addEventListener('resize', initScratch);

// ─── Position du curseur ─────────────────────────────────────
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
           y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top };
}

// ─── Limite 1 scratch/jour ────────────────────────────────────
function checkDailyScratch() {
  const last = localStorage.getItem('lastScratchDate');
  if (last === todayISO) {
    canvas.style.pointerEvents = 'none'; canvas.style.opacity = '0.5';
    rewardBtn.style.display = 'none'; doneBtn.style.display = 'none';
    scratchStatus.textContent = 'NEXT SCRATCH TOMORROW'; scratchStatus.style.display = 'block';
  } else {
    initScratch(); canvas.style.pointerEvents = 'auto'; canvas.style.opacity = '1';
    rewardBtn.style.display = 'none'; doneBtn.style.display = 'none'; scratchStatus.style.display = 'none';
  }
}

// ─── Vérification 70% ─────────────────────────────────────────
function checkClear() {
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) cleared++;
  if (cleared / (canvas.width * canvas.height) * 100 >= 70) {
    localStorage.setItem('scratchCount', parseInt(localStorage.getItem('scratchCount')||'0',10) + 1);
    updateProfileStats();
    const newXp = parseInt(localStorage.getItem('xpTotal')||'0',10) + 20;
    localStorage.setItem('xpTotal', newXp);
    updateXPDisplay();
    if (cardToBadge[currentCard]) {
      rewardBtn.textContent = 'REWARD'; rewardBtn.style.display = 'block';
    } else {
      doneBtn.style.display = 'block';
    }
    canvas.style.pointerEvents = 'none';
  }
}

// ─── Gestion des events scratch ───────────────────────────────
['mousedown','touchstart'].forEach(ev => canvas.addEventListener(ev, e => { startScratchSfx(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }));
['mousemove','touchmove'].forEach(ev => canvas.addEventListener(ev, e => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); }));
['mouseup','mouseleave','touchend'].forEach(ev => canvas.addEventListener(ev, () => { stopScratchSfx(); if (drawing) checkClear(); drawing = false; }));

// ─── Handler Reward & Done ────────────────────────────────────
function handleReward(e) {
  e.preventDefault(); if (rewardTriggered) return; rewardTriggered = true;
  playSfx('reward'); playSfx('badge');
  ctx.globalCompositeOperation = 'source-out'; ctx.clearRect(0,0,canvas.width,canvas.height);
  localStorage.setItem('lastScratchDate', todayISO);
  const badgeId = cardToBadge[currentCard]; const log = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  if (badgeId && !log.includes(badgeId)) { log.push(badgeId); localStorage.setItem('scratchLog', JSON.stringify(log)); }
  renderBadges(); showTab('badges'); document.getElementById('lottie-badge').style.display = 'flex'; badgeAnim.goToAndPlay(0, true);
}
rewardBtn.addEventListener('click', handleReward);
rewardBtn.addEventListener('touchend', handleReward, { passive: false });

doneBtn.addEventListener('click', e => { e.preventDefault(); if (doneTriggered) return; doneTriggered = true; playSfx('tab'); ctx.globalCompositeOperation = 'destination-out'; ctx.clearRect(0,0,canvas.width,canvas.height); localStorage.setItem('lastScratchDate', todayISO); doneBtn.style.display = 'none'; scratchStatus.textContent = 'NEXT SCRATCH TOMORROW'; scratchStatus.style.display = 'block'; });
doneBtn.addEventListener('touchend', e => e.preventDefault(), { passive: false });

// ─── Rendu badges ─────────────────────────────────────────────
function renderBadges() {
  const ul = document.getElementById('badges-list'); ul.innerHTML = '';
  const won = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  for (let i = 0; i < 30; i++) {
    const li = document.createElement('li'); li.className = 'badge-slot';
    const num = document.createElement('span'); num.className = 'badge-slot-number'; num.textContent = i+1;
    li.appendChild(num);
    if (won[i]) {
      const img = document.createElement('img'); img.src = `images/${won[i]}.png`; img.alt = `Badge ${won[i]}`;
      li.appendChild(img);
    }
    ul.appendChild(li);
  }
}

// ─── TO DO & Tasks done ───────────────────────────────────────
function getTodos() { return JSON.parse(localStorage.getItem(TODOS_KEY) || '[]'); }
function saveTodos(arr) { localStorage.setItem(TODOS_KEY, JSON.stringify(arr)); }
function renderTodos() {
  const items = getTodos(); todoList.innerHTML = '';
  items.forEach((text, idx) => {
    const li = document.createElement('li'); const span = document.createElement('span'); span.className = 'todo-text'; span.textContent = text;
    const cb = document.createElement('input'); cb.type = 'checkbox';
    cb.addEventListener('change', () => {
      playSfx('taskDone'); taskDoneContainer.style.display = 'flex'; taskDoneAnim.goToAndPlay(0, true);
      const doneCount = parseInt(localStorage.getItem(TASKS_DONE_KEY) || '0', 10) + 1;
      localStorage.setItem(TASKS_DONE_KEY, doneCount);
      const xpNew = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 10;
      localStorage.setItem('xpTotal', xpNew);
      updateXPDisplay();
      setTimeout(() => { const remaining = getTodos().filter((_, i) => i !== idx); saveTodos(remaining); renderTodos(); updateProfileStats(); }, 500);
    });
    li.append(span, cb); todoList.appendChild(li);
  });
}

todoAddBtn.addEventListener('click', () => {
  const txt = todoInput.value.trim(); if (!txt) return;
  playSfx('createTask');
  const arr = getTodos(); arr.unshift(txt); saveTodos(arr); todoInput.value = ''; renderTodos();
});

// ─── Service Worker & démarrage initial ─────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
document.addEventListener('DOMContentLoaded', () => {
  initCardToBadge().then(() => showTab('profile'));
  renderTodos();
});

// ─── Initialisation Phaser Game ────────────────────────────────
function launchPhaserGame() {
  if (phaserGame) return;
  const w = gameContainer.clientWidth || window.innerWidth;
  const h = gameContainer.clientHeight || (window.innerHeight - 64);
  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: w, height: h,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 600 }, debug: false } },
    scene: {
      preload() { this.load.image('background', 'doodle/images/bg.png'); this.load.image('platform', 'doodle/images/platform.png'); this.load.image('player', 'doodle/images/player.png'); },
      create() {
        this.add.image(w/2, h/2, 'background').setDisplaySize(w, h);
        this.platforms = this.physics.add.staticGroup(); for (let i=0; i<10; i++) { const x = Phaser.Math.Between(50, w-50); const y = h - i*70; this.platforms.create(x,y,'platform').setScale(0.5).refreshBody(); }
        this.player = this.physics.add.sprite(w/2, h-150, 'player').setScale(0.5); this.player.setBounce(0.2);
        this.physics.add.collider(this.player, this.platforms);
      },
      update() {}
    }
  });
}
