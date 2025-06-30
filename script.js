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
  createTask: 'sounds/create-task.mp3',
  jump:       'sounds/jump.wav',
  yellow:     'sounds/yellow_platform.wav',
  jetpack: 'sounds/jetpack1.mp3'

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
Promise.all(Object.entries(SFX_FILES).map(([n,u]) => loadSfx(n,u)));
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
  renderer: 'svg',
  loop: false,
  autoplay: true,
  path: 'animations/intro.json'
});
introAnim.addEventListener('complete', () => {
  document.getElementById('lottie-intro').style.display = 'none';
});

const badgeContainer = document.getElementById('lottie-badge');
const badgeAnim = lottie.loadAnimation({
  container: badgeContainer,
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'animations/badge.json'
});
badgeAnim.setSpeed(2);
badgeAnim.addEventListener('complete', () => {
  badgeContainer.style.display = 'none';
});

// ─── Task Done Lottie ────────────────────────────────────────────
const taskDoneContainer = document.getElementById('lottie-task-done');
const taskDoneAnim = lottie.loadAnimation({
  container: taskDoneContainer,
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'animations/task-done.json'
});
taskDoneAnim.addEventListener('complete', () => {
  taskDoneContainer.style.display = 'none';
});


// ─── Daily card logic ───────────────────────────────────────────
const cards = Array.from({ length: 10 }, (_, i) => `card${i+1}`);
let startDate = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0,10);
if (!startDate) {
  localStorage.setItem('startDate', todayISO);
  startDate = todayISO;
}
const daysElapsed = Math.floor((new Date(todayISO) - new Date(startDate)) / 86400000);
const currentCard = cards[daysElapsed % cards.length];

// ─── DOM refs ───────────────────────────────────────────────────
const tabs      = {
  profile: document.getElementById('tab-profile'),
  play:    document.getElementById('tab-play'),
  badges:  document.getElementById('tab-badges'),
  todo:    document.getElementById('tab-todo'),
  game:    document.getElementById('tab-game')
};
const views     = {
  profile: document.getElementById('view-profile'),
  play:    document.getElementById('view-play'),
  badges:  document.getElementById('view-badges'),
  todo:    document.getElementById('view-todo'),
  game:    document.getElementById('view-game')
};
tabs.game.addEventListener('click', () => {
  showView('view-game');
  setTimeout(() => {
    resizeDJ();
  }, 100); // Laisse le temps au DOM de rendre la vue
});

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
const bestScoreP  = document.getElementById('best-score');

const scratchImg  = document.getElementById('scratch-image');
const scratchArea = document.getElementById('scratch-area');
const canvas      = document.getElementById('scratchCanvas');
const ctx         = canvas.getContext('2d');
const rewardBtn   = document.getElementById('reward-btn');
const badgesList  = document.getElementById('badges-list');

const todoIn      = document.getElementById('todo-input');
const todoAddBtn  = document.getElementById('todo-add-btn');
const todoList    = document.getElementById('todo-list');

const startScreen = document.getElementById('gameStartScreen');
const startBtn    = document.getElementById('startGameBtn');
const jetpackItem = document.getElementById('jetpack-item');
jetpackItem.style.display = 'none';

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

// ─── Profile stats, XP & Best Score ─────────────────────────────
function updateProfileStats() {
  cardsCount.textContent   = parseInt(localStorage.getItem('scratchCount')||'0',10);
  rewardsCount.textContent = JSON.parse(localStorage.getItem('scratchLog')||'[]').length;
  tasksCount.textContent   = parseInt(localStorage.getItem('tasksDone')||'0',10);
}
function updateXP() {
  const xp = parseInt(localStorage.getItem('xpTotal')||'0',10);
  const lvl = Math.floor(xp/100), rem = xp%100;
  levelDisp.textContent = lvl;
  xpBar.style.width     = `${rem}%`;
  xpText.textContent    = `${rem}/100`;
}
function updateBestScore() {
  const best = parseInt(localStorage.getItem('bestScore')||'0',10);
  bestScoreP.textContent = best;
}


// ─── launch Doodle Jump Clone ───────────────────────────────────
const HIGH_BOUNCE = 1800;
const MOVING_SPEED = 100;

let doodleStarted = false;
let jetpack = null;
let jetpackActive = false;
let jetpackTimer = 0;
const JETPACK_DURATION = 2; // secondes
const JETPACK_IMG = new Image();
JETPACK_IMG.src = 'assets/jetpack.png';

let particles = [];

function createParticle(x, y) {
  particles.push({
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 30,
    vy: Math.random() * 50,
    alpha: 1,
    size: 6 + Math.random() * 4
  });
}

function launchDoodle() {
  if (doodleStarted) return;
  doodleStarted = true;

  const canvasDJ = document.getElementById('game');
  const ctxDJ = canvasDJ.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  function resizeDJ() {
    const bottomSpace = 60; // hauteur des onglets en pixels
    canvasDJ.width = innerWidth * DPR;
    canvasDJ.height = (innerHeight - bottomSpace) * DPR;
    canvasDJ.style.width = innerWidth + 'px';
    canvasDJ.style.height = (innerHeight - bottomSpace) + 'px';
    ctxDJ.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resizeDJ);
  resizeDJ();


  const GRAVITY = 2000;
  const JUMP_SPEED = 850;
  const H_SPEED = 300;
  const P_W = 80;
  const P_H = 12;
  const PLATFORM_SPACING = 140;
  const maxJumpH = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY) - 20;
  const airtime = 2 * JUMP_SPEED / GRAVITY;
  const maxHorz = H_SPEED * airtime * 0.9;
  const backgrounds = ['#87ceeb', '#ffdead', '#90ee90', '#add8e6'];

  const imgR = new Image(); imgR.src = 'assets/player_right.png';
  const imgL = new Image(); imgL.src = 'assets/player_left.png';

  const player = { x: 0, y: 0, w: 40, h: 40, vx: 0, vy: 0, facing: 'right' };
  function placePlayer(px, py) {
    player.x = px + (P_W - player.w) / 2;
    player.y = py - player.h;
    player.vy = -JUMP_SPEED;
  }

  let platforms = [], poolPlat = [];

  let score = 0;

  function makePlat(x, y, type = 1) {
    const p = poolPlat.pop() || { x: 0, y: 0, w: P_W, h: P_H, type: 1, vx: 0 };
    p.x = x; p.y = y; p.type = type;
    p.vx = (type === 3) ? (Math.random() < 0.5 ? -MOVING_SPEED : MOVING_SPEED) : 0;
    return p;
  }

  function recycle(i) {
    poolPlat.push(platforms[i]);
    platforms.splice(i, 1);
  }

  function initPlatforms() {
    platforms = [];
    poolPlat = [];

    const startY = innerHeight - P_H;
    const startX = innerWidth / 2 - P_W / 2;

    platforms.push(makePlat(startX, startY, 1));
    placePlayer(startX, startY);

    let y = startY - PLATFORM_SPACING;
    while (y > -innerHeight) {
      const prev = platforms[platforms.length - 1];
      const r = Math.random();
      let type = 1;
      if (r < 0.15 && score > 5000) type = 3;
      else if (r < 0.3 && score > 2000) type = 2;

      let nx = prev.x + (Math.random() * 2 - 1) * maxHorz;
      nx = Math.max(0, Math.min(innerWidth - P_W, nx));

      platforms.push(makePlat(nx, y, type));
      y -= PLATFORM_SPACING;
    }
  }

  initPlatforms();

  let left = false, right = false;
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') left = true;
    if (e.key === 'ArrowRight') right = true;
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft') left = false;
    if (e.key === 'ArrowRight') right = false;
  });
  canvasDJ.addEventListener('touchstart', e => {
    const tx = e.touches[0].clientX;
    left = tx < innerWidth / 2;
    right = tx > innerWidth / 2;
  });
  canvasDJ.addEventListener('touchend', () => left = right = false);

  const goScreen = document.getElementById('gameOverScreen'),
        goScore = document.getElementById('gameOverScore'),
        replay = document.getElementById('replayBtn');
  function showGameOver(s) {
    const prevBest = parseInt(localStorage.getItem('bestScore') || '0', 10);
    if (Math.floor(s) > prevBest) {
      localStorage.setItem('bestScore', Math.floor(s).toString());
    }
    goScore.textContent = Math.floor(s);
    goScreen.style.display = 'flex';
  }

  replay.addEventListener('click', () => {
    score = 0;
    lastTime = null;
    initPlatforms();
    jetpack = null;
    jetpackActive = false;
    particles = [];
    goScreen.style.display = 'none';
    requestAnimationFrame(loop);
  });

  let lastTime = null;
  function loop(ts) {
    if (lastTime === null) {
      lastTime = ts;
      return requestAnimationFrame(loop);
    }
    const dt = (ts - lastTime) / 1000;
    lastTime = ts;

    player.vx = (left ? -H_SPEED : 0) + (right ? H_SPEED : 0);
    player.x = Math.max(0, Math.min(innerWidth - player.w, player.x + player.vx * dt));

    if (left) player.facing = 'left';
    else if (right) player.facing = 'right';

    if (jetpackActive) {
      jetpackTimer -= dt;
      player.vy = -1000;

      createParticle(player.x + player.w / 2 - 5, player.y + player.h);
      createParticle(player.x + player.w / 2 + 5, player.y + player.h);

      if (jetpackTimer <= 0) {
        jetpackActive = false;
      }
    } else {
      player.vy += GRAVITY * dt;
    }

    player.y += player.vy * dt;

    if (player.y < innerHeight / 3) {
      const dy = innerHeight / 3 - player.y;
      player.y = innerHeight / 3;
      platforms.forEach(p => p.y += dy);
      if (jetpack) jetpack.y += dy;
      score += Math.floor(dy);
    }

    if (player.vy > 0) {
      for (const p of platforms) {
        if (
          player.x + player.w > p.x &&
          player.x < p.x + p.w &&
          player.y + player.h > p.y &&
          player.y + player.h - player.vy * dt < p.y
        ) {
          if (p.type === 2) {
            player.vy = -HIGH_BOUNCE;
            playSfx('yellow'); // ✅ son plateforme jaune
          } else {
            player.vy = -JUMP_SPEED;
            playSfx('jump'); // ✅ son normal
          }
          break;
        }
      }
    }


    platforms.forEach(p => {
      if (p.type === 3) {
        p.x += p.vx * dt;
        if (p.x <= 0 || p.x + p.w >= innerWidth) p.vx *= -1;
      }
    });

    if (jetpack &&
      player.x + player.w > jetpack.x &&
      player.x < jetpack.x + 30 &&
      player.y + player.h > jetpack.y &&
      player.y < jetpack.y + 30) {
      jetpackActive = true;
      jetpackTimer = JETPACK_DURATION;
      playSfx('jetpack');
      jetpack = null;
    }

    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y > innerHeight) recycle(i);
    }
    while (platforms.length < 12) {
      const topY = Math.min(...platforms.map(p => p.y));
      const prevX = platforms.find(p => p.y === topY).x;
      let nx = prevX + (Math.random() * 2 - 1) * maxHorz;
      nx = Math.max(0, Math.min(innerWidth - P_W, nx));
      let type = 1;
      const r = Math.random();
      if (r < 0.15 && score > 5000) type = 3;
      else if (r < 0.3 && score > 2000) type = 2;
      platforms.push(makePlat(nx, topY - PLATFORM_SPACING, type));
    }

    if (player.y > innerHeight) return showGameOver(score);

    ctxDJ.fillStyle = backgrounds[Math.floor(score / 1000) % backgrounds.length];
    ctxDJ.fillRect(0, 0, innerWidth, innerHeight);

    platforms.forEach(p => {
      ctxDJ.fillStyle =
        p.type === 2 ? '#FFD700' :
        p.type === 3 ? '#2288FF' :
                       '#654321';
      ctxDJ.fillRect(p.x, p.y, p.w, p.h);

      if (p.type === 1 && !jetpack && Math.random() < 0.009 && score > 20000) {
        jetpack = { x: p.x + P_W / 2 - 15, y: p.y - 30 };
      }
    });

    if (jetpack) {
      ctxDJ.drawImage(JETPACK_IMG, jetpack.x, jetpack.y, 30, 30);
    }

    const spr = player.facing === 'left' ? imgL : imgR;
    ctxDJ.drawImage(spr, player.x, player.y, player.w, player.h);

    // Particules
    particles.forEach((p, i) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 2;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      } else {
        ctxDJ.fillStyle = `rgba(255, 100, 0, ${p.alpha.toFixed(2)})`;
        ctxDJ.beginPath();
        ctxDJ.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctxDJ.fill();
      }
    });

    ctxDJ.fillStyle = '#000';
    ctxDJ.font = '20px sans-serif';
    ctxDJ.fillText(`Score: ${Math.floor(score)}`, 10, 30);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}



// ─── Tab navigation ────────────────────────────────────────────
function showTab(tab) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  Object.values(tabs).forEach(b => b.classList.remove('active'));
  views[tab].classList.add('active');
  tabs[tab].classList.add('active');
  playSfx('tab');

  if(tab==='profile'){
    checkPseudo();
    updateBestScore();
    updateProfileStats();
    updateXP();
  }
  if(tab==='play'){
    scratchImg.src = `images/${currentCard}.png`;
    checkDailyScratch();
    initScratch();
  }
  if(tab==='badges'){
    renderBadges();
  }
  if(tab==='todo'){
    renderTodos();
  }
  if(tab==='game'){
    startScreen.classList.remove('hidden');
  }
}
Object.keys(tabs).forEach(tab => tabs[tab].addEventListener('click', ()=>showTab(tab)));

// ─── Start Game button ─────────────────────────────────────────
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  launchDoodle();
});

// ─── Reset app ─────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  ['scratchLog','lastScratchDate','xpTotal','pseudo','scratchCount','tasksDone','bestScore']
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
  ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30;
  ctx.lineCap   = 'round';
}
function checkDailyScratch() {
  const last = localStorage.getItem('lastScratchDate');
  if(last===todayISO){
    canvas.style.pointerEvents   = 'none';
    canvas.style.opacity         = '0.5';
    rewardBtn.style.display      = 'none';
    scratchStatus.textContent    = 'NEXT SCRATCH TOMORROW';
    scratchStatus.style.display  = 'block';
  } else {
    initScratch();
    canvas.style.pointerEvents   = 'auto';
    canvas.style.opacity         = '1';
    rewardBtn.style.display      = 'none';
    scratchStatus.style.display  = 'none';
    rewardTriggered              = false;
  }
}
window.addEventListener('resize', () => {
  if(views.play.classList.contains('active')) initScratch();
});


// ─── Utility to get pointer position ───────────────────────────
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// ─── Scratch event handlers ─────────────────────────────────────
canvas.addEventListener('mousedown', e => {
  drawing = true; startScratchSfx();
  const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y);
});
canvas.addEventListener('mousemove', e => {
  if(!drawing) return;
  const p = getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke();
});
canvas.addEventListener('mouseup', () => {
  drawing = false; stopScratchSfx(); checkClear();
});
canvas.addEventListener('mouseleave', () => {
  drawing = false; stopScratchSfx();
});
['touchstart','touchmove','touchend'].forEach(evt => {
  canvas.addEventListener(evt, e => {
    e.preventDefault();
    if(evt==='touchstart'){
      drawing = true; startScratchSfx();
      const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y);
    }
    if(evt==='touchmove' && drawing){
      const p = getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke();
    }
    if(evt==='touchend'){
      drawing = false; stopScratchSfx(); checkClear();
    }
  }, { passive:false });
});


// ─── Clear detection at 65% ─────────────────────────────────────
function checkClear() {
  // 1) Calcul du pourcentage gratté
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  const percent = (cleared / (canvas.width * canvas.height)) * 100;

  if (percent >= 65) {
    // 2) On marque ce scratch comme fait aujourd’hui
    localStorage.setItem('lastScratchDate', todayISO);

    // 3) Révéler entièrement l’image (faire disparaître l’overlay)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 4) Désactive le grattage et coupe le son
    canvas.style.pointerEvents = 'none';
    stopScratchSfx();

    // 5) Incrémente le compteur et met à jour le profil
    const scratchCount = parseInt(localStorage.getItem('scratchCount') || '0', 10) + 1;
    localStorage.setItem('scratchCount', scratchCount.toString());
    updateProfileStats();

    // 6) Ajoute 20 XP
    const xpNew = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 20;
    localStorage.setItem('xpTotal', xpNew.toString());
    updateXP();

    // 7) Teste dynamiquement la présence du badge du jour
    const badgeImg = new Image();
    badgeImg.onload = () => {
      // badge trouvé → on affiche REWARD
      rewardBtn.style.display     = 'block';
      rewardBtn.disabled          = false;
      scratchStatus.style.display = 'none';
    };
    badgeImg.onerror = () => {
      // pas de badge → on affiche directement le message
      rewardBtn.style.display      = 'none';
      scratchStatus.textContent    = 'NEXT SCRATCH TOMORROW';
      scratchStatus.style.display  = 'block';
    };
    badgeImg.src = `images/${currentCard.replace('card','badge')}.png`;
  }
}


// ─── Reward handler ────────────────────────────────────────────
rewardBtn.addEventListener('click', e => {
  e.preventDefault();
  if(rewardTriggered) return;
  rewardTriggered = true;
  rewardBtn.disabled = true;
  playSfx('reward'); playSfx('badge');
  ctx.globalCompositeOperation = 'source-out';
  ctx.clearRect(0,0,canvas.width,canvas.height);
  localStorage.setItem('lastScratchDate', todayISO);
  const badgeId = currentCard.replace('card','badge');
  const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
  if(!log.includes(badgeId)) log.push(badgeId);
  localStorage.setItem('scratchLog', JSON.stringify(log));
  badgeContainer.style.display = 'flex';
  badgeAnim.goToAndPlay(0,true);
  showTab('badges');
});

// ─── Render badges ─────────────────────────────────────────────
function renderBadges() {
  badgesList.innerHTML='';
  const won = JSON.parse(localStorage.getItem('scratchLog')||'[]');
  for(let i=0;i<30;i++){
    const li = document.createElement('li');
    li.className = 'badge-slot';
    const num = document.createElement('span');
    num.className='badge-slot-number'; num.textContent=i+1;
    li.appendChild(num);
    if(won[i]){
      const img = document.createElement('img');
      img.src=`images/${won[i]}.png`; img.alt=`Badge ${won[i]}`;
      li.appendChild(img);
    }
    badgesList.appendChild(li);
  }
}

// ─── ToDo & taskDone ───────────────────────────────────────────
function getTodos() {
  return JSON.parse(localStorage.getItem('todos') || '[]');
}

function saveTodos(arr) {
  localStorage.setItem('todos', JSON.stringify(arr));
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
      // 1) Jouer son + animation
      playSfx('taskDone');
      taskDoneContainer.style.display = 'flex';
      taskDoneAnim.goToAndPlay(0, true);

      // 2) Mettre à jour le compteur global
      const doneCnt = parseInt(localStorage.getItem('tasksDone') || '0', 10) + 1;
      localStorage.setItem('tasksDone', doneCnt.toString());

      // 3) Award XP
      const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 10;
      localStorage.setItem('xpTotal', xpTotal.toString());

      // 4) Après la fin de l’anim, enlever la tâche et rafraîchir
      setTimeout(() => {
        // 1) mettre à jour le compteur « Tâches effectuées »
        updateProfileStats();
        // 2) mettre à jour la barre XP
        updateXP();  // <-- ici, utilise la fonction existante updateXP()

        // 3) retirer la tâche cochée et rafraîchir la liste
        const remaining = getTodos().filter((_, j) => j !== idx);
        saveTodos(remaining);
        renderTodos();
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
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
document.addEventListener('DOMContentLoaded',()=>{
  checkPseudo();
  initScratch();
  renderTodos();
  showTab('profile');
});
