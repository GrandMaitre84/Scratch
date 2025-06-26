// ─── WebAudio setup pour ultra-low-latency ─────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

const SFX_FILES = {
  tab:      'sounds/tab-click.mp3',
  validate: 'sounds/validate.mp3',
  scratch:  'sounds/scratch.mp3',
  reward:   'sounds/reward.mp3',
  badge:    'sounds/badge.mp3'
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

// ─── DOM Elements ─────────────────────────────────────────────
const tabProfile   = document.getElementById('tab-profile');
const tabPlay      = document.getElementById('tab-play');
const tabBadges    = document.getElementById('tab-badges');
const tabGame      = document.getElementById('tab-game');

const viewProfile  = document.getElementById('view-profile');
const viewPlay     = document.getElementById('view-play');
const viewBadges   = document.getElementById('view-badges');
const viewGame     = document.getElementById('view-game');

const resetBtn     = document.getElementById('reset-btn');
const area         = document.getElementById('scratch-area');
const canvas       = document.getElementById('scratchCanvas');
const ctx          = canvas.getContext('2d');
const rewardBtn    = document.getElementById('reward-btn');
const pseudoInput  = document.getElementById('pseudo-input');
const pseudoBtn    = document.getElementById('pseudo-btn');
const pseudoSpan   = document.getElementById('pseudo-display');
const levelDisplay = document.getElementById('level-display');
const xpBar        = document.getElementById('xp-bar');
const xpText       = document.getElementById('xp-text');
const scratchImage = document.getElementById('scratch-image');
const profileForm  = document.getElementById('profile-form');
const profileStats = document.querySelector('.profile-stats');
const cardsDisplay = document.getElementById('cards-scratched');
const rewardsDisplay = document.getElementById('rewards-count');

// statut & Done
const scratchStatus = document.createElement('p');
scratchStatus.id = 'scratch-status';
Object.assign(scratchStatus.style, {
  display: 'none', margin: '1rem auto 0', padding: '.5rem 1rem',
  background: '#28A745', color: '#FFF', borderRadius: '4px',
  width: '80%', maxWidth: '300px', textAlign: 'center'
});
rewardBtn.insertAdjacentElement('afterend', scratchStatus);

const doneBtn = document.createElement('button');
doneBtn.id = 'done-btn';
doneBtn.textContent = 'DONE';
Object.assign(doneBtn.style, {
  display: 'none', margin: '1rem auto 0', padding: '.5rem 1rem',
  background: '#28A745', color: '#FFF', border: 'none', borderRadius: '4px',
  width: '80%', maxWidth: '300px', cursor: 'pointer', fontSize: '16px',
  transition: 'background .2s ease'
});
doneBtn.addEventListener('mouseenter', () => doneBtn.style.background = '#218838');
doneBtn.addEventListener('mouseleave', () => doneBtn.style.background = '#28A745');
rewardBtn.insertAdjacentElement('afterend', doneBtn);

// scratch tracking
let drawing = false;
let rewardTriggered = false;
let doneTriggered = false;

// ─── 1) Cartes & mapping ────────────────────────────────────────
const cards = [
  'card1','card2','card3','card4','card5',
  'card6','card7','card8','card9','card10'
];
const cardToBadge = {};
async function initCardToBadge() {
  await Promise.all(cards.map(async card => {
    const badgeId = card.replace('card', 'badge');
    try {
      const resp = await fetch(`images/${badgeId}.png`, { method: 'HEAD' });
      cardToBadge[card] = resp.ok ? badgeId : null;
    } catch {
      cardToBadge[card] = null;
    }
  }));
}

// ─── 2) Carte du jour ───────────────────────────────────────────
let startDate = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0,10);
if (!startDate) {
  localStorage.setItem('startDate', todayISO);
  startDate = todayISO;
}
const daysElapsed = Math.floor((new Date(todayISO) - new Date(startDate)) / 86400000);
const currentCard = cards[daysElapsed % cards.length];

// ─── 3) Pseudo management ────────────────────────────────────────
function checkPseudo() {
  const stored = localStorage.getItem('pseudo');
  if (stored) {
    profileForm.style.display = 'none';
    profileStats.style.display = 'flex';
    pseudoSpan.textContent = stored;
  } else {
    profileForm.style.display = 'flex';
    profileStats.style.display = 'none';
    pseudoSpan.textContent = '';
  }
}
pseudoBtn.addEventListener('click', () => {
  playSfx('tab'); playSfx('validate');
  const v = pseudoInput.value.trim();
  if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── 4) Stats Profil ─────────────────────────────────────────────
function updateProfileStats() {
  const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  cardsDisplay.textContent = Math.floor(xpTotal / 20);
  rewardsDisplay.textContent = JSON.parse(localStorage.getItem('scratchLog') || '[]').length;
}

// ─── 5) XP & Level display ───────────────────────────────────────
function updateXPDisplay() {
  const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const level = Math.floor(xpTotal / 100);
  const rem = xpTotal % 100;
  levelDisplay.textContent = level;
  xpBar.style.width = `${rem}%`;
  xpText.textContent = `${rem}/100`;
}

// ─── 6) Onglets ─────────────────────────────────────────────────
function showTab(tab) {
  // masquer toutes les vues et désactiver tous les boutons
  [viewProfile, viewPlay, viewBadges, viewGame].forEach(v => v.classList.remove('active'));
  [tabProfile, tabPlay, tabBadges, tabGame].forEach(t => t.classList.remove('active'));
  playSfx('tab');

  if (tab === 'profile') {
    viewProfile.classList.add('active');
    tabProfile.classList.add('active');
    checkPseudo();
    updateXPDisplay();
    updateProfileStats();
  }
  else if (tab === 'play') {
    viewPlay.classList.add('active');
    tabPlay.classList.add('active');
    scratchImage.src = `images/${currentCard}.png`;
    checkDailyScratch();
  }
  else if (tab === 'badges') {
    viewBadges.classList.add('active');
    tabBadges.classList.add('active');
    renderBadges();
  }
  else if (tab === 'game') {
    viewGame.classList.add('active');
    tabGame.classList.add('active');
    // si tu veux, tu peux ici forcer le reload de l'iframe
    // document.getElementById('game-frame').src += '';
  }
}

tabProfile.addEventListener('click', () => showTab('profile'));
tabPlay.addEventListener('click',    () => showTab('play'));
tabBadges.addEventListener('click',  () => showTab('badges'));
tabGame.addEventListener('click',    () => showTab('game'));

// ─── 7) Reset ────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  ['scratchLog','lastScratchDate','xpTotal','pseudo','scratchCount'].forEach(k => localStorage.removeItem(k));
  checkPseudo();
  showTab('profile');
});

// ─── 8) Canvas init ──────────────────────────────────────────────
function initScratch() {
  const w = area.clientWidth;
  const h = area.clientHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30;
  ctx.lineCap   = 'round';
}
window.addEventListener('resize', initScratch);

// ─── 9) Position curseur ─────────────────────────────────────────
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// ───10) Limite 1 scratch/jour ────────────────────────────────────
function checkDailyScratch() {
  const last = localStorage.getItem('lastScratchDate');
  if (last === todayISO) {
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity       = '0.5';
    rewardBtn.style.display    = 'none';
    doneBtn.style.display      = 'none';
    scratchStatus.textContent  = 'NEXT SCRATCH TOMORROW';
    scratchStatus.style.display = 'block';
  } else {
    initScratch();
    canvas.style.pointerEvents = 'auto';
    canvas.style.opacity       = '1';
    rewardBtn.style.display    = 'none';
    doneBtn.style.display      = 'none';
    scratchStatus.style.display= 'none';
  }
}

// ───11) Vérif 70% ────────────────────────────────────────────────
function checkClear() {
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  if (cleared / (canvas.width * canvas.height) * 100 >= 70) {
    const cnt = (parseInt(localStorage.getItem('scratchCount') || '0', 10) + 1);
    localStorage.setItem('scratchCount', cnt);
    updateProfileStats();

    const xpTotal = (parseInt(localStorage.getItem('xpTotal') || '0', 10) + 20);
    localStorage.setItem('xpTotal', xpTotal);
    updateXPDisplay();

    if (cardToBadge[currentCard]) {
      rewardBtn.textContent = 'REWARD';
      rewardBtn.style.display = 'block';
    } else {
      doneBtn.style.display   = 'block';
    }
    canvas.style.pointerEvents = 'none';
  }
}

// ───12) Événements de grattage ───────────────────────────────────
['mousedown','touchstart'].forEach(evt =>
  canvas.addEventListener(evt, e => {
    startScratchSfx();
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  })
);
['mousemove','touchmove'].forEach(evt =>
  canvas.addEventListener(evt, e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  })
);
['mouseup','mouseleave','touchend'].forEach(evt =>
  canvas.addEventListener(evt, () => {
    stopScratchSfx();
    if (drawing) checkClear();
    drawing = false;
  })
);

// ───13) REWARD handler ───────────────────────────────────────────
function handleReward(evt) {
  evt.preventDefault();
  if (rewardTriggered) return;
  rewardTriggered = true;
  playSfx('reward'); playSfx('badge');

  ctx.globalCompositeOperation = 'source-out';
  ctx.clearRect(0,0,canvas.width,canvas.height);

  localStorage.setItem('lastScratchDate', todayISO);
  const badgeId = cardToBadge[currentCard];
  const log = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  if (badgeId && !log.includes(badgeId)) {
    log.push(badgeId);
    localStorage.setItem('scratchLog', JSON.stringify(log));
  }
  renderBadges();
  showTab('badges');
  document.getElementById('lottie-badge').style.display = 'flex';
}
rewardBtn.addEventListener('click', handleReward);
rewardBtn.addEventListener('touchend', handleReward, { passive: false });

// ───14) DONE handler ─────────────────────────────────────────────
function handleDone(evt) {
  evt.preventDefault();
  if (doneTriggered) return;
  doneTriggered = true;
  playSfx('tab');

  ctx.globalCompositeOperation = 'destination-out';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  localStorage.setItem('lastScratchDate', todayISO);
  doneBtn.style.display   = 'none';
  scratchStatus.textContent = 'NEXT SCRATCH TOMORROW';
  scratchStatus.style.display = 'block';
}
doneBtn.addEventListener('click', handleDone);
doneBtn.addEventListener('touchend', handleDone, { passive: false });

// ───15) Rendu badges ─────────────────────────────────────────────
function renderBadges() {
  const ul = document.getElementById('badges-list');
  ul.innerHTML = '';
  const SLOTS = 30;
  const won = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  for (let i = 0; i < SLOTS; i++) {
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
    ul.appendChild(li);
  }
}

// ───16) Service Worker ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}

// ───17) Initialisation au chargement ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCardToBadge().then(() => {
    showTab('profile');
  });
});
