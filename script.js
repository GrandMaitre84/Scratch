// ─── WebAudio setup ─────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

const SFX = {
  tab: 'sounds/tab-click.mp3',
  validate: 'sounds/validate.mp3',
  scratch: 'sounds/scratch.mp3',
  reward: 'sounds/reward.mp3',
  badge: 'sounds/badge.mp3',
  taskDone: 'sounds/task-done.mp3',
  createTask: 'sounds/create-task.mp3'
};
const sfxBuf = {};
async function loadSfx(name, url) {
  try {
    const r = await fetch(url);
    const ab = await r.arrayBuffer();
    sfxBuf[name] = await audioCtx.decodeAudioData(ab);
  } catch (e) {
    console.warn('SFX load error', name, e);
  }
}
Object.entries(SFX).forEach(([n, u]) => loadSfx(n, u));
function playSfx(name) {
  const buf = sfxBuf[name];
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(0);
}

// ─── Lottie animations ───────────────────────────────────────────
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
  container: badgeContainer, renderer: 'svg', loop: false, autoplay: false,
  path: 'animations/badge.json'
});
badgeAnim.setSpeed(2);
badgeAnim.addEventListener('complete', () => {
  badgeContainer.style.display = 'none';
});

const taskDoneContainer = document.getElementById('lottie-task-done');
const taskDoneAnim = lottie.loadAnimation({
  container: taskDoneContainer, renderer: 'svg', loop: false, autoplay: false,
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
const dayCount = Math.floor((new Date(todayISO) - new Date(startDate)) / 86400000);
const currentCard = cards[dayCount % cards.length];

// ─── DOM references ─────────────────────────────────────────────
const el = {
  profileTab:   document.getElementById('tab-profile'),
  playTab:      document.getElementById('tab-play'),
  badgesTab:    document.getElementById('tab-badges'),
  todoTab:      document.getElementById('tab-todo'),
  profileView:  document.getElementById('view-profile'),
  playView:     document.getElementById('view-play'),
  badgesView:   document.getElementById('view-badges'),
  todoView:     document.getElementById('view-todo'),
  resetBtn:     document.getElementById('reset-btn'),
  pseudoIn:     document.getElementById('pseudo-input'),
  pseudoBtn:    document.getElementById('pseudo-btn'),
  pseudoDisp:   document.getElementById('pseudo-display'),
  profileForm:  document.getElementById('profile-form'),
  profileStats: document.querySelector('.profile-stats'),
  scratchImg:   document.getElementById('scratch-image'),
  scratchArea:  document.getElementById('scratch-area'),
  canvas:       document.getElementById('scratchCanvas'),
  ctx:          document.getElementById('scratchCanvas').getContext('2d'),
  rewardBtn:    document.getElementById('reward-btn'),
  todoIn:       document.getElementById('todo-input'),
  todoAddBtn:   document.getElementById('todo-add-btn'),
  todoList:     document.getElementById('todo-list'),
  cardsCount:   document.getElementById('cards-scratched'),
  rewardsCount: document.getElementById('rewards-count'),
  tasksCount:   document.getElementById('tasks-done-count'),
  levelDisp:    document.getElementById('level-display'),
  xpBar:        document.getElementById('xp-bar'),
  xpText:       document.getElementById('xp-text')
};
const TODOS_KEY = 'todos';
const TASKS_KEY = 'tasksDone';

// ─── Profile functions ─────────────────────────────────────────
function checkPseudo() {
  const p = localStorage.getItem('pseudo');
  if (p) {
    el.profileForm.style.display = 'none';
    el.profileStats.style.display = 'grid';
    el.pseudoDisp.textContent = p;
  } else {
    el.profileForm.style.display = 'flex';
    el.profileStats.style.display = 'none';
  }
}
el.pseudoBtn.addEventListener('click', () => {
  playSfx('tab'); playSfx('validate');
  const v = el.pseudoIn.value.trim(); if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

function updateProfileStats() {
  el.cardsCount.textContent   = parseInt(localStorage.getItem('scratchCount') || '0',10);
  el.rewardsCount.textContent = JSON.parse(localStorage.getItem('scratchLog') || '[]').length;
  el.tasksCount.textContent   = parseInt(localStorage.getItem(TASKS_KEY) || '0',10);
}

function updateXP() {
  const xp = parseInt(localStorage.getItem('xpTotal') || '0',10);
  const lvl = Math.floor(xp/100), rem = xp%100;
  el.levelDisp.textContent = lvl;
  el.xpBar.style.width = `${rem}%`;
  el.xpText.textContent = `${rem}/100`;
}

// ─── Tab navigation ────────────────────────────────────────────
function showTab(tab) {
  ['profile','play','badges','todo'].forEach(t => {
    el[t+'View'].classList.remove('active');
    el[t+'Tab'].classList.remove('active');
  });
  playSfx('tab');
  el[tab+'View'].classList.add('active');
  el[tab+'Tab'].classList.add('active');
  if (tab==='profile') { checkPseudo(); updateProfileStats(); updateXP(); }
  if (tab==='play')    { el.scratchImg.src = `images/${currentCard}.png`; checkDaily(); initScratch(); }
  if (tab==='badges')  { renderBadges(); }
  if (tab==='todo')    { renderTodos(); }
}
['profile','play','badges','todo'].forEach(t => {
  el[t+'Tab'].addEventListener('click', ()=>showTab(t));
});

// ─── Reset ────────────────────────────────────────────────────
el.resetBtn.addEventListener('click', () => {
  ['scratchLog','lastScratchDate','xpTotal','pseudo','scratchCount',TASKS_KEY]
    .forEach(k => localStorage.removeItem(k));
  checkPseudo(); showTab('profile');
});

// ─── Scratch canvas ───────────────────────────────────────────
function initScratch() {
  const w = el.scratchArea.clientWidth,
        h = el.scratchArea.clientHeight;
  el.canvas.width = w; el.canvas.height = h;
  el.ctx.globalCompositeOperation = 'source-over';
  el.ctx.fillStyle = '#999'; el.ctx.fillRect(0,0,w,h);
  el.ctx.globalCompositeOperation = 'destination-out';
  el.ctx.lineWidth = 30; el.ctx.lineCap = 'round';
}
window.addEventListener('resize', initScratch);

function getPos(e) {
  const r = el.canvas.getBoundingClientRect();
  return {
    x: (e.touches?e.touches[0].clientX:e.clientX) - r.left,
    y: (e.touches?e.touches[0].clientY:e.clientY) - r.top
  };
}

function checkDaily() {
  const last = localStorage.getItem('lastScratchDate');
  if (last === todayISO) {
    el.canvas.style.pointerEvents = 'none'; el.canvas.style.opacity = '0.5';
    el.rewardBtn.style.display = 'none';
  } else {
    el.canvas.style.pointerEvents = 'auto'; el.canvas.style.opacity = '1';
    el.rewardBtn.style.display = 'none';
  }
}

let drawing = false, rewardTriggered = false;
['mousedown','touchstart'].forEach(ev => el.canvas.addEventListener(ev, e => {
  playSfx('scratch'); drawing = true;
  const p = getPos(e); el.ctx.beginPath(); el.ctx.moveTo(p.x,p.y);
}));
['mousemove','touchmove'].forEach(ev => el.canvas.addEventListener(ev, e => {
  if (!drawing) return;
  const p = getPos(e); el.ctx.lineTo(p.x,p.y); el.ctx.stroke();
}));
['mouseup','mouseleave','touchend'].forEach(ev => el.canvas.addEventListener(ev, () => {
  drawing = false;
  const data = el.ctx.getImageData(0,0,el.canvas.width,el.canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  // seuil à 65%
  if (cleared / (el.canvas.width * el.canvas.height) * 100 >= 65) {
    localStorage.setItem('scratchCount', parseInt(localStorage.getItem('scratchCount')||'0',10) + 1);
    updateProfileStats();
    const xpNew = parseInt(localStorage.getItem('xpTotal')||'0',10) + 20;
    localStorage.setItem('xpTotal', xpNew);
    updateXP();
    el.rewardBtn.style.display = 'block';
    el.rewardBtn.disabled = false;
    rewardTriggered = false;
    el.canvas.style.pointerEvents = 'none';
  }
}));

// ─── Reward handler ───────────────────────────────────────────
function handleReward(e) {
  e.preventDefault();
  if (rewardTriggered) return;
  rewardTriggered = true;
  el.rewardBtn.disabled = true;
  playSfx('reward'); playSfx('badge');
  el.ctx.globalCompositeOperation = 'source-out';
  el.ctx.clearRect(0,0,el.canvas.width,el.canvas.height);
  localStorage.setItem('lastScratchDate', todayISO);
  const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
  const badgeId = currentCard.replace('card','badge');
  if (!log.includes(badgeId)) log.push(badgeId);
  localStorage.setItem('scratchLog', JSON.stringify(log));
  renderBadges();
  showTab('badges');
  badgeContainer.style.display = 'flex'; badgeAnim.goToAndPlay(0,true);
}
el.rewardBtn.addEventListener('click', handleReward);
el.rewardBtn.addEventListener('touchend', handleReward, { passive: false });

// ─── Badges render ────────────────────────────────────────────
function renderBadges() {
  const ul = document.getElementById('badges-list'); ul.innerHTML = '';
  const won = JSON.parse(localStorage.getItem('scratchLog')||'[]');
  for (let i = 0; i < 30; i++) {
    const li = document.createElement('li'); li.className = 'badge-slot';
    const num = document.createElement('span'); num.className = 'badge-slot-number'; num.textContent = i+1;
    li.appendChild(num);
    if (won[i]) {
      const img = document.createElement('img');
      img.src = `images/${won[i]}.png`;
      li.appendChild(img);
    }
    ul.appendChild(li);
  }
}

// ─── ToDo & task done ─────────────────────────────────────────
function getTodos() { return JSON.parse(localStorage.getItem(TODOS_KEY)||'[]'); }
function saveTodos(a) { localStorage.setItem(TODOS_KEY, JSON.stringify(a)); }
function renderTodos() {
  el.todoList.innerHTML = '';
  getTodos().forEach((t,i) => {
    const li = document.createElement('li');
    const span = document.createElement('span'); span.className='todo-text'; span.textContent=t;
    const cb = document.createElement('input'); cb.type='checkbox';
    cb.addEventListener('change', () => {
      playSfx('taskDone');
      taskDoneContainer.style.display='flex'; taskDoneAnim.goToAndPlay(0,true);
      let doneCnt = parseInt(localStorage.getItem(TASKS_KEY)||'0',10)+1;
      localStorage.setItem(TASKS_KEY, doneCnt);
      let xpNew = parseInt(localStorage.getItem('xpTotal')||'0',10)+10;
      localStorage.setItem('xpTotal', xpNew);
      updateXP();
      setTimeout(() => {
        const rem = getTodos().filter((_,j)=>j!==i);
        saveTodos(rem);
        renderTodos();
        updateProfileStats();
      }, 500);
    });
    li.append(span, cb);
    el.todoList.appendChild(li);
  });
}
el.todoAddBtn.addEventListener('click', () => {
  const v = el.todoIn.value.trim(); if (!v) return;
  playSfx('createTask');
  const arr = getTodos(); arr.unshift(v); saveTodos(arr);
  el.todoIn.value = ''; renderTodos();
});

// ─── Service Worker & init ─────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
document.addEventListener('DOMContentLoaded', () => {
  initScratch(); renderTodos(); showTab('profile');
});
