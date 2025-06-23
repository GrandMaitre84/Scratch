// ─── WebAudio setup pour ultra-low-latency ─────────────────────────
// 1) Création du contexte et déverrouillage au premier touch
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

// 2) Liste de vos fichiers SFX et buffers
const SFX_FILES = {
  tab:      'sounds/tab-click.mp3',
  validate: 'sounds/validate.mp3',
  reward:   'sounds/reward.mp3'
};
const sfxBuffers = {};

// Charge et décode chaque son
async function loadSfx(name, url) {
  const resp = await fetch(url);
  const arrayBuffer = await resp.arrayBuffer();
  sfxBuffers[name] = await audioCtx.decodeAudioData(arrayBuffer);
}
Promise.all(Object.entries(SFX_FILES).map(
  ([name,url]) => loadSfx(name, url)
));

// 3) Fonction pour jouer un son immédiatement
function playSfx(name) {
  const buf = sfxBuffers[name];
  if (!buf) return;              // pas encore prêt
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(0);
}

// ─── 0) Intro Lottie (masquage à la fin de l’animation) ───────────
const introContainer = document.getElementById('lottie-intro');
const introAnim = lottie.loadAnimation({
  container: introContainer,
  renderer: 'svg',
  loop: false,
  autoplay: true,
  path: 'animations/intro.json'
});
introAnim.addEventListener('complete', () => {
  introContainer.style.display = 'none';
});

// ─── 1) Liste des cartes et mapping carte→badge ────────────────────
const cards = ['card1', 'card2', 'card3', 'card4'];
const cardToBadge = {
  'card1': 'badge1',
  'card2': null,
  'card3': null,
  'card4': 'badge4'
};

// ─── 2) Sélection « une carte par jour » depuis la première ouverture ───
let start = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0,10);
if (!start) {
  localStorage.setItem('startDate', todayISO);
  start = todayISO;
}
const startDate   = new Date(start);
const todayDate   = new Date(todayISO);
const msPerDay    = 1000 * 60 * 60 * 24;
const daysElapsed = Math.floor((todayDate - startDate) / msPerDay);
const currentCard = cards[ daysElapsed % cards.length ];

// ─── 3) Récupération du DOM ───────────────────────────────────────
const tabProfile    = document.getElementById('tab-profile');
const tabPlay       = document.getElementById('tab-play');
const tabBadges     = document.getElementById('tab-badges');
const viewProfile   = document.getElementById('view-profile');
const viewPlay      = document.getElementById('view-play');
const viewBadges    = document.getElementById('view-badges');
const resetBtn      = document.getElementById('reset-btn');
const area          = document.getElementById('scratch-area');
const canvas        = document.getElementById('scratchCanvas');
const ctx           = canvas.getContext('2d');
const rewardBtn     = document.getElementById('reward-btn');
const pseudoInput   = document.getElementById('pseudo-input');
const pseudoBtn     = document.getElementById('pseudo-btn');
const pseudoSpan    = document.getElementById('pseudo-display');
const levelDisplay  = document.getElementById('level-display');
const xpBar         = document.getElementById('xp-bar');
const xpText        = document.getElementById('xp-text');
const scratchImage  = document.getElementById('scratch-image');
const profileForm   = document.getElementById('profile-form');
const profileHeader = document.getElementById('profile-header');

let drawing = false;

// ─── 4) Gestion du pseudo ─────────────────────────────────────────
function checkPseudo() {
  const stored = localStorage.getItem('pseudo');
  if (stored) {
    profileForm.style.display    = 'none';
    profileHeader.style.display  = 'flex';
    pseudoSpan.textContent       = stored;
  } else {
    profileForm.style.display    = 'flex';
    profileHeader.style.display  = 'none';
    pseudoSpan.textContent       = '';
  }
}
pseudoBtn.addEventListener('click', () => {
  playSfx('validate');
  const v = pseudoInput.value.trim();
  if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── 5) Mise à jour XP & “Level of love” ─────────────────────────
function updateXPDisplay() {
  const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const level   = Math.floor(xpTotal / 100);
  const rem     = xpTotal % 100;
  levelDisplay.textContent = `Level of love : ${level}`;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `XP : ${rem}/100`;
}

// ─── 6) Bascule d’onglet (avec SFX) ─────────────────────────────────
function showTab(tab) {
  [viewProfile, viewPlay, viewBadges].forEach(v => v.classList.remove('active'));
  [tabProfile, tabPlay, tabBadges].forEach(t => t.classList.remove('active'));
  playSfx('tab');

  if (tab === 'profile') {
    viewProfile.classList.add('active');
    tabProfile.classList.add('active');
    checkPseudo();
    updateXPDisplay();
  }
  if (tab === 'play') {
    viewPlay.classList.add('active');
    tabPlay.classList.add('active');
    scratchImage.src = `images/${currentCard}.png`;
    checkDailyScratch();
  }
  if (tab === 'badges') {
    viewBadges.classList.add('active');
    tabBadges.classList.add('active');
    renderBadges();
  }
}
tabProfile.addEventListener('click', () => showTab('profile'));
tabPlay.addEventListener('click',    () => showTab('play'));
tabBadges.addEventListener('click',  () => showTab('badges'));

// ─── 7) Reset pour tests ───────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  localStorage.removeItem('scratchLog');
  localStorage.removeItem('lastScratchDate');
  localStorage.removeItem('xpTotal');
  localStorage.removeItem('pseudo');
  showTab('profile');
});

// ─── 8) Initialisation du canvas ───────────────────────────────────
function initScratch() {
  const w = area.clientWidth, h = area.clientHeight;
  canvas.width  = w;
  canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30;
  ctx.lineCap   = 'round';
}
window.addEventListener('resize', initScratch);

// ─── 9) Position du curseur ───────────────────────────────────────
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// ─── 10) Limite 1 scratch/jour ─────────────────────────────────────
function checkDailyScratch() {
  const last = localStorage.getItem('lastScratchDate');
  if (last === todayISO) {
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity       = '0.5';
    rewardBtn.style.display    = 'block';
    rewardBtn.textContent      = 'Déjà gratté aujourd’hui';
  } else {
    initScratch();
    canvas.style.pointerEvents = 'auto';
    canvas.style.opacity       = '1';
    rewardBtn.style.display    = 'none';
  }
}

// ─── 11) Vérification du grattage à 60% ────────────────────────────
function checkClear() {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  if (cleared / (canvas.width * canvas.height) * 100 >= 60) {
    const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 20;
    localStorage.setItem('xpTotal', xpTotal);
    updateXPDisplay();

    rewardBtn.textContent = cardToBadge[currentCard] ? 'REWARD' : 'Déjà gratté aujourd’hui';
    rewardBtn.style.display    = 'block';
    canvas.style.pointerEvents = 'none';
  }
}

// ─── 12) Événements de grattage ──────────────────────────────────
['mousedown', 'touchstart'].forEach(evt => {
  canvas.addEventListener(evt, e => {
    drawing = true;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
});
['mousemove', 'touchmove'].forEach(evt => {
  canvas.addEventListener(evt, e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
});
['mouseup', 'mouseleave', 'touchend'].forEach(evt => {
  canvas.addEventListener(evt, () => {
    if (drawing) checkClear();
    drawing = false;
  });
});

// ─── 13) Clic REWARD (avec SFX) ───────────────────────────────────
['click', 'touchend'].forEach(evt => {
  rewardBtn.addEventListener(evt, () => {
    if (
      rewardBtn.textContent === 'REWARD' ||
      rewardBtn.textContent === 'Déjà gratté aujourd’hui'
    ) {
      playSfx('reward');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      localStorage.setItem('lastScratchDate', todayISO);

      const badgeId = cardToBadge[currentCard];
      if (badgeId && rewardBtn.textContent === 'REWARD') {
        const log = JSON.parse(localStorage.getItem('scratchLog') || '[]');
        if (!log.includes(badgeId)) {
          log.push(badgeId);
          localStorage.setItem('scratchLog', JSON.stringify(log));
        }
      }
      showTab('badges');
    }
  });
});

// ─── 14) Affichage des badges ─────────────────────────────────────
function renderBadges() {
  const ul = document.getElementById('badges-list');
  ul.innerHTML = '';
  const SLOTS = 30;
  const won   = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  for (let i = 0; i < SLOTS; i++) {
    const li = document.createElement('li');
    li.classList.add('badge-slot');
    const num = document.createElement('span');
    num.classList.add('badge-slot-number');
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

// ─── 15) Service Worker ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
}

// ─── 16) Forcer l'onglet Profil au démarrage ──────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showTab('profile');
});
