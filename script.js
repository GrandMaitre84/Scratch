// DOM
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
const profileForm   = document.getElementById('profile-form');
const pseudoInput   = document.getElementById('pseudo-input');
const pseudoBtn     = document.getElementById('pseudo-btn');
const pseudoSpan    = document.getElementById('pseudo-display');
const levelDisplay  = document.getElementById('level-display');
const xpBar         = document.getElementById('xp-bar');
const xpText        = document.getElementById('xp-text');

let drawing = false;

// Bascule d’onglet
function showTab(tab) {
  [viewProfile, viewPlay, viewBadges].forEach(v => v.classList.remove('active'));
  [tabProfile, tabPlay, tabBadges].forEach(t => t.classList.remove('active'));
  if (tab === 'profile') {
    viewProfile.classList.add('active'); tabProfile.classList.add('active');
    checkPseudo();
  }
  if (tab === 'play') {
    viewPlay.classList.add('active'); tabPlay.classList.add('active');
    checkDailyScratch();
  }
  if (tab === 'badges') {
    viewBadges.classList.add('active'); tabBadges.classList.add('active');
    renderBadges();
  }
}

// Écoute onglets
['click','touchend'].forEach(evt => {
  tabProfile.addEventListener(evt, () => showTab('profile'));
  tabPlay.addEventListener(evt,    () => showTab('play'));
  tabBadges.addEventListener(evt,  () => showTab('badges'));
});

// Reset pour tests (efface pseudo, XP, badges et scratch)
resetBtn.addEventListener('click', () => {
  localStorage.clear();

  // Réinitialise le pseudo
  pseudoInput.value        = '';
  pseudoSpan.textContent   = '';

  // Réaffiche le formulaire de pseudo
  profileForm.style.display = 'flex';

  // Réinitialise niveau et XP
  levelDisplay.textContent = 'Level : 0';
  xpBar.style.width        = '0%';
  xpText.textContent       = 'XP : 0/100';

  // Retour sur Profil
  showTab('profile');
});

// Initialisation scratch
function initScratch() {
  const w = area.clientWidth, h = area.clientHeight;
  canvas.width = w; canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999'; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30; ctx.lineCap = 'round';
}
window.addEventListener('resize', initScratch);

// Position souris/tactile
function getPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
    y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top
  };
}

// Gestion du pseudo et affichage header
function checkPseudo() {
  const stored = localStorage.getItem('pseudo');
  if (stored) {
    profileForm.style.display = 'none';
    pseudoSpan.textContent    = stored;
    updateXPDisplay();
  } else {
    profileForm.style.display = 'flex';
  }
}
pseudoBtn.addEventListener('click', () => {
  const val = pseudoInput.value.trim();
  if (!val) return;
  localStorage.setItem('pseudo', val);
  checkPseudo();
});

// Limite 1 scratch/jour
function checkDailyScratch() {
  const today = new Date().toISOString().slice(0,10);
  const last  = localStorage.getItem('lastScratchDate');
  if (last === today) {
    canvas.style.pointerEvents = 'none'; canvas.style.opacity = '0.5';
    rewardBtn.style.display    = 'block';
    rewardBtn.textContent      = 'Déjà gratté aujourd’hui';
  } else {
    initScratch();
    canvas.style.pointerEvents = 'auto'; canvas.style.opacity = '1';
    rewardBtn.style.display    = 'none'; rewardBtn.textContent = 'REWARD';
  }
}

// Vérifie 60% effacé
function checkClear() {
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  if (cleared/(canvas.width*canvas.height)*100 >= 60) {
    const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
    if (!log.includes('badge1')) {
      log.push('badge1');
      localStorage.setItem('scratchLog', JSON.stringify(log));
    }
    localStorage.setItem('lastScratchDate', new Date().toISOString().slice(0,10));
    rewardBtn.style.display = 'block';
    updateXPDisplay();
  }
}

// Événements de grattage
canvas.addEventListener('mousedown', e => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
canvas.addEventListener('mousemove', e => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
canvas.addEventListener('mouseup',   () => { drawing = false; checkClear(); });
canvas.addEventListener('mouseleave',()=> { drawing = false; });
canvas.addEventListener('touchstart',e => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
canvas.addEventListener('touchmove', e => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
canvas.addEventListener('touchend',  () => { drawing = false; checkClear(); });

// Bouton REWARD
['click','touchend'].forEach(evt => {
  rewardBtn.addEventListener(evt, () => {
    if (rewardBtn.textContent !== 'REWARD') return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
    if (!log.includes('badge1')) {
      log.push('badge1');
      localStorage.setItem('scratchLog', JSON.stringify(log));
      localStorage.setItem('lastScratchDate', new Date().toISOString().slice(0,10));
    }
    rewardBtn.textContent   = 'Déjà gratté aujourd’hui';
    rewardBtn.style.display = 'block';
    updateXPDisplay();
    showTab('badges');
  });
});

// Affiche badges
function renderBadges() {
  const ul = document.getElementById('badges-list');
  ul.innerHTML = '';
  JSON.parse(localStorage.getItem('scratchLog')||'[]').forEach(id => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = `images/${id}.png`; img.alt = `Badge ${id}`;
    li.appendChild(img); ul.appendChild(li);
  });
}

// Mets à jour level, barre & texte XP
function updateXPDisplay() {
  const log   = JSON.parse(localStorage.getItem('scratchLog')||'[]');
  const xp    = log.length * 20;
  const level = Math.floor(xp / 100);
  const rem   = xp % 100;
  levelDisplay.textContent = `Level : ${level}`;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `XP : ${rem}/100`;
}

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .catch(err => console.error(err));
}

// Démarrage
showTab('profile');
