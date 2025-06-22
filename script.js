// ─── 0) Override de test via URL (À retirer en production) ───
// Pour tester : ajoute ?card=card1, ?card=card2, ?card=card3 ou ?card=card4 à l’URL
const cards = ['card1', 'card2', 'card3', 'card4'];
const params = new URLSearchParams(window.location.search);
let currentCard = params.get('card');

if (!currentCard || !cards.includes(currentCard)) {
  // pas de param ou valeur invalide → calcul de la carte du jour
  const todayISO = new Date().toISOString().slice(0,10);
  const daySeed  = parseInt(todayISO.replace(/-/g,''),10);
  currentCard    = cards[ daySeed % cards.length ];
}
console.log('🃏 Carte courante =', currentCard);

// ─── 1) Mapping carte → badge ───
const cardToBadge = {
  'card1': 'badge1',
  'card2': null,
  'card3': null,
  'card4': 'badge4'
};

// ─── 2) DOM ───
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
let drawing = false;

// ─── 3) Gestion des onglets ───
function showTab(tab) {
  [viewProfile, viewPlay, viewBadges].forEach(v => v.classList.remove('active'));
  [tabProfile, tabPlay, tabBadges].forEach(t => t.classList.remove('active'));

  if (tab === 'profile') {
    viewProfile.classList.add('active'); tabProfile.classList.add('active');
    checkPseudo();
  }
  if (tab === 'play') {
    viewPlay.classList.add('active'); tabPlay.classList.add('active');
    document.getElementById('scratch-image').src = `images/${currentCard}.png`;
    checkDailyScratch();
  }
  if (tab === 'badges') {
    viewBadges.classList.add('active'); tabBadges.classList.add('active');
    renderBadges();
  }
}

// ─── 4) Réinitialisation pour tests ───
resetBtn.addEventListener('click', () => {
  localStorage.clear();
  showTab('profile');
});

// ─── 5) Initialisation du canvas ───
function initScratch() {
  const w = area.clientWidth, h = area.clientHeight;
  canvas.width = w; canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999'; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30; ctx.lineCap = 'round';
}
window.addEventListener('resize', initScratch);

// ─── 6) Récupérer la position du curseur ───
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// ─── 7) Limite 1 scratch/jour ───
function checkDailyScratch() {
  const todayISO = new Date().toISOString().slice(0,10);
  const last     = localStorage.getItem('lastScratchDate');

  if (last === todayISO) {
    canvas.style.pointerEvents = 'none'; 
    canvas.style.opacity       = '0.5';
    rewardBtn.style.display    = 'block'; 
    rewardBtn.textContent      = 'Déjà gratté aujourd’hui';
  } else {
    initScratch();
    canvas.style.pointerEvents = 'auto'; 
    canvas.style.opacity       = '1';
    if (cardToBadge[currentCard] === null) {
      rewardBtn.style.display    = 'block';
      rewardBtn.textContent      = 'Déjà gratté aujourd’hui';
    } else {
      rewardBtn.style.display    = 'none';
      rewardBtn.textContent      = 'REWARD';
    }
  }
}

// ─── 8) Vérification 60 % gratté ───
function checkClear() {
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) 
    if (data[i] === 0) cleared++;

  if (cleared / (canvas.width * canvas.height) * 100 >= 60) {
    const todayISO = new Date().toISOString().slice(0,10);
    localStorage.setItem('lastScratchDate', todayISO);

    const badgeId = cardToBadge[currentCard];
    if (badgeId) {
      const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
      if (!log.includes(badgeId)) {
        log.push(badgeId);
        localStorage.setItem('scratchLog', JSON.stringify(log));
      }
    }

    rewardBtn.style.display  = 'block';
    rewardBtn.textContent    = 'Déjà gratté aujourd’hui';
    updateXPDisplay();
  }
}

// ─── 9) Événements de grattage ───
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
    ctx.lineTo(p.x,p.y);
    ctx.stroke();
  });
});
['mouseup','mouseleave','touchend'].forEach(evt => {
  canvas.addEventListener(evt, () => {
    if (drawing) checkClear();
    drawing = false;
  });
});

// ─── 10) Clic sur “REWARD” ───
['click','touchend'].forEach(evt => {
  rewardBtn.addEventListener(evt, () => {
    if (rewardBtn.textContent !== 'REWARD') return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.clearRect(0,0,canvas.width,canvas.height);

    const badgeId = cardToBadge[currentCard];
    if (badgeId) {
      const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
      if (!log.includes(badgeId)) {
        log.push(badgeId);
        localStorage.setItem('scratchLog', JSON.stringify(log));
      }
    }

    const todayISO = new Date().toISOString().slice(0,10);
    localStorage.setItem('lastScratchDate', todayISO);
    rewardBtn.style.display = 'block';
    rewardBtn.textContent   = 'Déjà gratté aujourd’hui';
    updateXPDisplay();
    showTab('badges');
  });
});

// ─── 11) Rendu des badges ───
function renderBadges() {
  const ul = document.getElementById('badges-list');
  ul.innerHTML = '';
  JSON.parse(localStorage.getItem('scratchLog')||'[]')
    .forEach(id => {
      const li  = document.createElement('li');
      const img = document.createElement('img');
      img.src = `images/${id}.png`; img.alt = `Badge ${id}`;
      li.appendChild(img); ul.appendChild(li);
    });
}

// ─── 12) Level & XP ───
function updateXPDisplay() {
  const log   = JSON.parse(localStorage.getItem('scratchLog')||'[]');
  const xp    = log.length * 20;
  const level = Math.floor(xp / 100);
  const rem   = xp % 100;
  levelDisplay.textContent = `Level : ${level}`;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `XP : ${rem}/100`;
}

// ─── 13) Service Worker ───
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.error(err));
}

// Démarrage
showTab('profile');
