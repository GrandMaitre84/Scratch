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
const tabProfile   = document.getElementById('tab-profile');
const tabPlay      = document.getElementById('tab-play');
const tabBadges    = document.getElementById('tab-badges');
const viewProfile  = document.getElementById('view-profile');
const viewPlay     = document.getElementById('view-play');
const viewBadges   = document.getElementById('view-badges');
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

let drawing = false;

// ─── 4) Gestion du pseudo ─────────────────────────────────────────
function checkPseudo() {
  const form = document.getElementById('profile-form');
  const stored = localStorage.getItem('pseudo');
  if (stored) {
    form.style.display = 'none';
    pseudoSpan.textContent = stored;
  } else {
    form.style.display = 'flex';
    pseudoSpan.textContent = '';
  }
}
pseudoBtn.addEventListener('click', () => {
  const v = pseudoInput.value.trim();
  if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── 5) Mise à jour XP & Level ────────────────────────────────────
function updateXPDisplay() {
  const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const level = Math.floor(xpTotal / 100);
  const rem   = xpTotal % 100;
  levelDisplay.textContent = `Level : ${level}`;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `XP : ${rem}/100`;
}

// ─── 6) Bascule d’onglet ───────────────────────────────────────────
function showTab(tab) {
  [viewProfile, viewPlay, viewBadges].forEach(v => v.classList.remove('active'));
  [tabProfile, tabPlay, tabBadges].forEach(t => t.classList.remove('active'));

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
tabPlay.addEventListener   ('click', () => showTab('play'));
tabBadges.addEventListener ('click', () => showTab('badges'));

// Réinitialisation pour tests : conserve startDate et pseudo
resetBtn.addEventListener('click', () => {
  localStorage.removeItem('scratchLog');
  localStorage.removeItem('lastScratchDate');
  localStorage.removeItem('xpTotal');
  showTab('profile');
});

// ─── 7) Initialisation du canvas ───────────────────────────────────
function initScratch() {
  const w = area.clientWidth, h = area.clientHeight;
  canvas.width = w; canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999'; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30; ctx.lineCap = 'round';
}
window.addEventListener('resize', initScratch);

// ─── 8) Position du curseur ───────────────────────────────────────
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// ─── 9) Limite 1 scratch/jour ─────────────────────────────────────
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

// ─── 10) Vérification du grattage à 60% ────────────────────────────
function checkClear() {
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  if (cleared/(canvas.width*canvas.height)*100 >= 60) {
    // ajoute toujours 20 XP
    const xpTotal = parseInt(localStorage.getItem('xpTotal')||'0',10) + 20;
    localStorage.setItem('xpTotal', xpTotal);
    updateXPDisplay();

    // affiche bouton selon badge
    if (cardToBadge[currentCard]) {
      rewardBtn.textContent = 'REWARD';
    } else {
      rewardBtn.textContent = 'Déjà gratté aujourd’hui';
    }
    rewardBtn.style.display = 'block';
    canvas.style.pointerEvents = 'none';
  }
}

// ─── 11) Événements de grattage ──────────────────────────────────
['mousedown','touchstart'].forEach(evt => {
  canvas.addEventListener(evt, e => {
    drawing = true;
    const p = getPos(e);
    ctx.beginPath(); ctx.moveTo(p.x,p.y);
  });
});
['mousemove','touchmove'].forEach(evt => {
  canvas.addEventListener(evt, e => {
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x,p.y); ctx.stroke();
  });
});
['mouseup','mouseleave','touchend'].forEach(evt => {
  canvas.addEventListener(evt, () => {
    if (drawing) checkClear();
    drawing = false;
  });
});

// ─── 12) Clic sur bouton ──────────────────────────────────────────
['click','touchend'].forEach(evt => {
  rewardBtn.addEventListener(evt, () => {
    if (rewardBtn.textContent === 'REWARD' || rewardBtn.textContent === 'Déjà gratté aujourd’hui') {
      // dévoile toute la carte
      ctx.globalCompositeOperation = 'destination-out';
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // enregistre date
      localStorage.setItem('lastScratchDate', todayISO);
      // ajoute le badge si présent
      const badgeId = cardToBadge[currentCard];
      if (badgeId && rewardBtn.textContent === 'REWARD') {
        const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
        if (!log.includes(badgeId)) {
          log.push(badgeId);
          localStorage.setItem('scratchLog', JSON.stringify(log));
        }
      }
      showTab('badges');
    }
  });
});

// ─── 13) Affichage des badges ─────────────────────────────────────
function renderBadges() {
  const ul = document.getElementById('badges-list');
  ul.innerHTML = '';
  JSON.parse(localStorage.getItem('scratchLog')||'[]').forEach(id => {
    const li  = document.createElement('li');
    const img = document.createElement('img');
    img.src = `images/${id}.png`; img.alt = `Badge ${id}`;
    li.appendChild(img); ul.appendChild(li);
  });
}

// ─── 14) Service Worker ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
}

// Démarrage sur PROFIL
showTab('profile');
