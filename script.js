// ─── Flags d’initialisation ───────────────────────────────────
let tamagochiInitialized = false;

// ─── WebAudio setup pour ultra-low-latency ─────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });
// ─── Init Mon Tamagochi ─────────────────────────────────────
function initTamagochi() {
  if (tamagochiInitialized) return;
  tamagochiInitialized = true;

  // --- Constantes de configuration ---
  const MAX_TAKES  = { multivit: 4, magnesium: 2, vitD: 1, iode: 1 };
  const SUPP_PCT   = 6.25;
  const RETENTION  = 0.7;
  const STEPS_GOAL = 6000;
  const STEPS_PCT  = 50;

  const EFFECTS = {
    multivit:  { energy:  8, happiness:  8, stress:  -8 },
    magnesium: { energy:  2, happiness:  2, stress: -20 },
    vitD:      { energy:  5, happiness: 15, stress: -15 },
    iode:      { energy:  5, happiness:  5, stress:  -5 }
  };
  const MAX_PTS = {
    energy:    4*EFFECTS.multivit.energy + 2*EFFECTS.magnesium.energy + EFFECTS.vitD.energy + EFFECTS.iode.energy,
    happiness: 4*EFFECTS.multivit.happiness + 2*EFFECTS.magnesium.happiness + EFFECTS.vitD.happiness + EFFECTS.iode.happiness,
    stress:    Math.abs(4*EFFECTS.multivit.stress) + Math.abs(2*EFFECTS.magnesium.stress) + Math.abs(EFFECTS.vitD.stress) + Math.abs(EFFECTS.iode.stress)
  };

  // --- État ---
  let state = {
    yesterdayHealth: 0,
    baseline:        0,
    taken:           { multivit:0, magnesium:0, vitD:0, iode:0 },
    steps:           null,
    health:          0
  };

  // --- Sélecteurs ---
  const healthFill    = document.getElementById('health-bar-fill');
  const healthPct     = document.getElementById('health-pct');
  const petImg        = document.getElementById('pet-img');
  const petCard       = document.getElementById('pet-card');
  const statusMessage = document.getElementById('status-message');
  const energyBar     = document.getElementById('energy-bar');
  const happinessBar  = document.getElementById('happiness-bar');
  const stressBar     = document.getElementById('stress-bar');
  const btnEditSteps  = document.getElementById('btn-edit-steps');
  const btnCorrectSteps  = document.getElementById('btn-correct-steps');
  const stepsBarFill  = document.getElementById('steps-bar-fill');
  const stepsText        = document.getElementById('steps-text');

  const btns = {
    multivit:  document.getElementById('btn-multivit'),
    magnesium: document.getElementById('btn-magnesium'),
    vitD:      document.getElementById('btn-vitd'),
    iode:      document.getElementById('btn-iode')
  };

  // --- Clés localStorage ---
  const KEY_DATE  = 'tamagochi-date';
  const KEY_YEST  = 'tamagochi-yesterdayHealth';
  const KEY_BASE  = 'tamagochi-baseline';
  const KEY_TAKEN = 'tamagochi-taken';
  const KEY_STEPS = 'tamagochi-steps';

  // --- Load / Save ---
  function loadState() {
    state.yesterdayHealth = parseFloat(localStorage.getItem(KEY_YEST)) || 0;
    state.baseline        = parseFloat(localStorage.getItem(KEY_BASE)) || (state.yesterdayHealth * RETENTION);

    try {
      const takenStored = JSON.parse(localStorage.getItem(KEY_TAKEN));
      if (takenStored && typeof takenStored === 'object') {
        state.taken = { multivit:0, magnesium:0, vitD:0, iode:0, ...takenStored };
      } else {
        state.taken = { multivit:0, magnesium:0, vitD:0, iode:0 };
      }
    } catch {
      state.taken = { multivit:0, magnesium:0, vitD:0, iode:0 };
    }

    const s = localStorage.getItem(KEY_STEPS);
    state.steps = s !== null ? parseInt(s, 10) : null;
  }

  function saveState() {
    localStorage.setItem(KEY_YEST,  state.yesterdayHealth);
    localStorage.setItem(KEY_BASE,  state.baseline);
    localStorage.setItem(KEY_TAKEN, JSON.stringify(state.taken));
    if (state.steps !== null) localStorage.setItem(KEY_STEPS, state.steps);
    else localStorage.removeItem(KEY_STEPS);
  }


  // --- Reset quotidien ---
  function resetIfNewDay() {
    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(KEY_DATE) !== today) {
      state.yesterdayHealth = state.health;
      state.baseline        = state.yesterdayHealth * RETENTION;
      state.taken           = { multivit:0, magnesium:0, vitD:0, iode:0 };
      state.steps           = null;
      localStorage.setItem(KEY_DATE, today);
      saveState();
    }
  }

  // --- Calcul santé ---
  function computeHealth() {
    const totalTakes = Object.values(state.taken).reduce((a,b) => a+b, 0);
    const supplPct   = totalTakes * SUPP_PCT;
    const stepsPct   = state.steps !== null
      ? Math.min(state.steps / STEPS_GOAL,1) * STEPS_PCT
      : 0;
    state.health     = Math.min(100, state.baseline + supplPct + stepsPct);
  }

  // --- Update UI ---
  function updateUI() {
    healthFill.style.width = `${state.health}%`;
    healthPct.textContent  = `${Math.round(state.health)} %`;

    if      (state.health >= 80) petImg.src = 'images/pet-very-happy.png';
    else if (state.health >= 60) petImg.src = 'images/pet-happy.png';
    else if (state.health >= 50) petImg.src = 'images/pet-neutral.png';
    else if (state.health >= 25) petImg.src = 'images/pet-sad.png';
    else                          petImg.src = 'images/pet-depressed.png';

    petCard.classList.toggle('show-stars', state.health >= 60);

    statusMessage.textContent =
      state.health >= 80 ? '🤩 Super Happy Mousie!' :
      state.health >= 60 ? '😊 Happy Mousie !' :
      state.health >= 50 ? '😐 Neutral Mouse' :
      state.health >= 25 ? '☹️ Sad mouse…' : '😢 Crying Mouse';

    console.log('Compléments pris (state.taken) :', JSON.stringify(state.taken));
    let e=0,h=0,s=0;
    for (let k in state.taken) {
      e += EFFECTS[k].energy    * state.taken[k];
      h += EFFECTS[k].happiness * state.taken[k];
      s += EFFECTS[k].stress    * state.taken[k];
    }
    energyBar.style.width    = `${Math.min(100,Math.round(e/MAX_PTS.energy*100))}%`;
    happinessBar.style.width = `${Math.min(100,Math.round(h/MAX_PTS.happiness*100))}%`;
    const sp = 100 - Math.min(100, Math.round(Math.abs(s)/MAX_PTS.stress*100));
    stressBar.style.width    = `${Math.max(0,sp)}%`;

    if (state.steps !== null) {
      // on a déjà saisi des pas aujourd'hui :
      btnEditSteps.style.display    = 'none';     // ← cache complètement le bouton
      btnCorrectSteps.style.display = 'block';

      // 1) largeur de la barre
      const barPct = Math.min(state.steps / STEPS_GOAL, 1) * 100;
      stepsBarFill.style.width      = `${barPct}%`;

      // 2) nombre affiché au centre de la barre
      stepsText.textContent         = `${state.steps}/${STEPS_GOAL}`;
    } else {
      // pas encore saisi aujourd'hui :
      btnEditSteps.style.display    = 'block';    // ← ré-affiche le bouton à minuit
      btnCorrectSteps.style.display = 'none';
      stepsBarFill.style.width      = '0%';
      stepsText.textContent         = '';
    }



    for (let k in btns) {
      btns[k].disabled = state.taken[k] >= MAX_TAKES[k];
    }
  }

  // ─── Handler pour les compléments ─────────────────────────────
  function handleSupplement(key) {
    // 0) jouer le son de tab-click
    playSfx('tab');

    // 1) si on n’a pas déjà atteint le maximum
    if (state.taken[key] < MAX_TAKES[key]) {
      state.taken[key]++;
      computeHealth();
      updateUI();
      saveState();
    }
  }

  
  // ─── Handlers ────────────────────────────────────────────────
  function handleEditSteps() {
    playSfx('tab');  // son au clic
    const v = parseInt(prompt("Combien de pas as-tu fait aujourd'hui ?",""), 10);
    if (!isNaN(v) && v >= 0) {
      state.steps = v;

      // 1) Cumuler le total de pas
      const prevTotal = parseInt(localStorage.getItem('totalSteps') || '0', 10);
      const newTotal  = prevTotal + v;
      localStorage.setItem('totalSteps', newTotal);

      // 2) Calcul des paliers de 10 000 franchis
      const prevThresh = Math.floor(prevTotal / 10000);
      const newThresh  = Math.floor(newTotal  / 10000);
      const crossed    = newThresh - prevThresh;

      // 3) Ajouter 20 XP par palier franchi
      if (crossed > 0) {
        const xpOld = parseInt(localStorage.getItem('xpTotal') || '0', 10);
        const xpNew = xpOld + crossed * 20;
        localStorage.setItem('xpTotal', xpNew.toString());
      }

      // 4) Mettre à jour santé et UI
      computeHealth();
      updateUI();
      updateProfileStats();  // met à jour total-steps sur le profil
      updateXP();            // met à jour xp-bar & Level of Love
      saveState();
    } else {
      alert("Valeur invalide. Entrez un nombre positif.");
    }
  }

  function handleCorrectSteps() {
    playSfx('tab');  // son au clic
    // 1) Récupère l'ancienne valeur (0 si jamais saisi)
    const oldSteps = state.steps || 0;

    // 2) Demande la nouvelle valeur
    const input    = prompt("Corriger le nombre de pas du jour :", oldSteps);
    const newSteps = parseInt(input, 10);

    if (!isNaN(newSteps) && newSteps >= 0) {
      // 3) Ajuste le total cumulé dans localStorage
      const totalPrev = parseInt(localStorage.getItem('totalSteps') || '0', 10);
      const totalNew  = totalPrev - oldSteps + newSteps;
      localStorage.setItem('totalSteps', totalNew);

      // 4) Calcule le delta de paliers franchis (10 000 pas)
      const prevThresh = Math.floor(totalPrev / 10000);
      const newThresh  = Math.floor(totalNew  / 10000);
      const crossed    = newThresh - prevThresh;

      // 5) Ajuste l'XP en conséquence
      if (crossed !== 0) {
        const xpOld = parseInt(localStorage.getItem('xpTotal') || '0', 10);
        const xpNew = xpOld + crossed * 20;
        localStorage.setItem('xpTotal', xpNew.toString());
      }

      // 6) Mets à jour l’état et sauvegarde Tamagochi
      state.steps = newSteps;
      saveState();

      // 7) Rafraîchis l’UI Tamagochi
      computeHealth();
      updateUI();

      // 8) Rafraîchis la carte Profil
      updateProfileStats();  // met à jour total-steps
      updateXP();            // met à jour xp-bar & Level of Love
    } else {
      alert("Valeur invalide. Entrez un nombre positif.");
    }
  }




  // ─── Init final ──────────────────────────────────────────────
  loadState();
  resetIfNewDay();
  computeHealth();
  updateUI();

  // ─── Brancher les événements sur les boutons ─────────────────
  btnEditSteps     .addEventListener('click', handleEditSteps);
  btnCorrectSteps  .addEventListener('click', handleCorrectSteps);
  btns.multivit    .addEventListener('click', () => handleSupplement('multivit'));
  btns.magnesium   .addEventListener('click', () => handleSupplement('magnesium'));
  btns.vitD        .addEventListener('click', () => handleSupplement('vitD'));
  btns.iode        .addEventListener('click', () => handleSupplement('iode'));
}


// ─── Dans showTab(tab) ─────────────────────────────────────────
function showTab(tab) {
  // Masquer toutes les vues et désactiver tous les onglets
  Object.values(views).forEach(v => v.classList.remove('active'));
  Object.values(tabs).forEach(b => b.classList.remove('active'));

  // Activer la vue et l’onglet sélectionnés
  views[tab].classList.add('active');
  tabs[tab].classList.add('active');

  // Son de changement d’onglet
  playSfx('tab');

  if (tab === 'tamagochi') {
    initTamagochi();    // initialisation (fait rien après la 1ʳᵉ fois)
    resetIfNewDay();    // reset quotidien si nouveau jour
    computeHealth();    // recalcule la santé d’après l’état
    updateUI();         // met à jour l’affichage (cache/réaffiche le bouton Pas du jour)
  }
}  // ← fermeture de la fonction showTab


const SFX_FILES = {
  tab:        'sounds/tab-click.mp3',
  scratch:    'sounds/scratch.mp3',
  reward:     'sounds/reward.mp3',
  badge:      'sounds/badge.mp3',
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
// ─── Son d'ouverture ───────────────────────────────────────────────
window.addEventListener('load', () => {
  document.addEventListener('click', () => {
    playSfx('openApp');
  }, { once: true });
});

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


// ─── Daily card logic (séquentiel) ─────────────────────────────
const cards = Array.from({ length: 64 }, (_, i) => `card${i+1}`);

function localISODate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

const KEY_SEQ_IDX  = 'cards-seq-index';

// (Optionnel) One-shot : démarrer à la carte 56 une seule fois
(function forceStartAtCard56Once () {
  const FLAG = '__force_card56_done__';
  if (localStorage.getItem(FLAG)) return;  // déjà appliqué

  localStorage.setItem(KEY_SEQ_IDX, '54'); // 0-based → 54 = card55
  localStorage.setItem(FLAG, '1');
})();



// Index 0-based en localStorage → renvoie "card{n}"
function getCurrentCard() {
  let idx = parseInt(localStorage.getItem(KEY_SEQ_IDX) ?? '0', 10);
  if (isNaN(idx) || idx < 0) idx = 0;
  // Si tu as le tableau `cards`, tu peux aussi clamp :
  // idx = Math.min(idx, cards.length - 1);
  const n = idx + 1;
  return `card${n}`;
}


// ─── DOM refs ───────────────────────────────────────────────────
const tabs      = {
  profile: document.getElementById('tab-profile'),
  play:    document.getElementById('tab-play'),
  badges:  document.getElementById('tab-badges'),
  game:    document.getElementById('tab-game'),
  tamagochi: document.getElementById('tab-tamagochi')
};
const totalStepsP = document.getElementById('total-steps')
const views     = {
  profile: document.getElementById('view-profile'),
  play:    document.getElementById('view-play'),
  badges:  document.getElementById('view-badges'),
  game:    document.getElementById('view-game'),
  tamagochi: document.getElementById('view-tamagochi')
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
const levelDisp   = document.getElementById('level-display');
const xpBar       = document.getElementById('xp-bar');
const xpText      = document.getElementById('xp-text');
const bestScoreP  = document.getElementById('best-score');
const btnCorrectSteps = document.getElementById('btn-correct-steps');


const scratchImg  = document.getElementById('scratch-image');
const scratchArea = document.getElementById('scratch-area');
const canvas      = document.getElementById('scratchCanvas');
const ctx         = canvas.getContext('2d');
const rewardBtn   = document.getElementById('reward-btn');
const badgesList  = document.getElementById('badges-list');



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
  const v = pseudoIn.value.trim();
  if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── Profile stats, XP & Best Score ─────────────────────────────
function updateProfileStats() {
  cardsCount.textContent   = parseInt(localStorage.getItem('scratchCount')  || '0', 10);
  rewardsCount.textContent = JSON.parse(localStorage.getItem('scratchLog')   || '[]').length;

  // cumul des pas
  const total = parseInt(localStorage.getItem('totalSteps') || '0', 10);
  totalStepsP.textContent  = total;
}

function updateXP() {
  const xp  = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const lvl = Math.floor(xp / 100), rem = xp % 100;
  levelDisp.textContent    = lvl;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `${rem}/100`;
}

function updateBestScore() {
  const best = parseInt(localStorage.getItem('bestScore') || '0', 10);
  bestScoreP.textContent   = best;
}

// +1 niveau tous les 1000 points
function getLevel(score) {
  return Math.floor(score / 1000);
}



// ─── launch Doodle Jump Clone ───────────────────────────────────
const HIGH_BOUNCE = 1800;
const BASE_MOVING_SPEED = 100;

let doodleStarted = false;
let jetpack = null;
let jetpackActive = false;
let jetpackTimer = 0;
let jetpackReady   = false; 
const JETPACK_DURATION = 2; // secondes
const JETPACK_IMG = new Image();
JETPACK_IMG.src = 'assets/jetpack.png';

let particles = [];
let lastJetpackTime = 0;

function createParticle(x, y) {
  particles.push({
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 10,      // Plus droit
    vy: 100 + Math.random() * 100,       // Va plus vite vers le bas
    alpha: 1,
    size: 8 + Math.random() * 6,         // Plus grosses flammes
    hue: 30 + Math.random() * 20         // Orange -> Jaune
  });
}

function launchDoodle() {
  if (doodleStarted) return;
  doodleStarted = true;

  const BASE_MOB_PROB  = 0.15;
  const MOB_PROB_INCR  = 0.01;
  const MAX_MOB_PROB   = 0.5;
  const BASE_BOUNCE_PROB = 0.05;
  
  // ─── Nouveaux paramètres piège ───
  const BASE_TRAP_PROB   = 0.10;  // 10 % de plateformes piège au niveau 0
  const TRAP_PROB_INCR   = 0.01;  // +1 % par niveau
  const MAX_TRAP_PROB    = 0.30;  // pas plus de 30 % de pièges


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


  const GRAVITY        = 2000;
  const JUMP_SPEED     = 700;
  const H_SPEED        = 300;
  const P_W            = 80;
  const P_H            = 12;

  // 1) On calcule d’abord la hauteur de saut
  const maxJumpH       = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY) - 20;
  const airtime        = 2 * JUMP_SPEED / GRAVITY;
  const maxHorz        = H_SPEED * airtime * 0.9;
  // Plage horizontale plus sûre (50% de la portée max)
  const horizRange = maxHorz * 0.5;

  // 2) Puis on définit l’espacement en fonction de maxJumpH
  const PLATFORM_SPACING = Math.min(100, maxJumpH * 0.8);

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
    // on ne stocke plus que la direction (-1 ou +1) pour p.vx
    p.vx = (type === 3)
      ? (Math.random() < 0.5 ? -1 : 1)
      : 0;
    return p;
  }


  function recycle(i) {
    poolPlat.push(platforms[i]);
    platforms.splice(i, 1);
  }

  function initPlatforms() {
    platforms = [];
    poolPlat  = [];

    const startY = innerHeight - P_H;
    const startX = innerWidth  / 2 - P_W / 2;

    // 1) plateforme de départ et position du joueur
    platforms.push(makePlat(startX, startY, 1));
    placePlayer(startX, startY);

    // 2) calcul de la plage horizontale sécurisée
    const airtime    = 2 * JUMP_SPEED / GRAVITY;
    const maxHorz    = H_SPEED * airtime * 0.9;
    const horizRange = maxHorz * 0.5;  // 50% de la portée max

    // 3) génération des lignes tant que la rangée est visible
    let prevX = startX;
    let y     = startY - PLATFORM_SPACING;

    while (y > -innerHeight) {
      // a) tirage du type (mobile/rebond selon score)
      const r    = Math.random();
      let   type = 1;
      if (r < 0.15 && score > 5000)      type = 3;
      else if (r < 0.3  && score > 2000) type = 2;

      // b) calcul de nx **depuis prevX** sur la plage sécurisée
      let nx = prevX + (Math.random() * 2 - 1) * horizRange;
      nx     = Math.max(0, Math.min(innerWidth - P_W, nx));

      // c) ajout de la plateforme
      platforms.push(makePlat(nx, y, type));

      // d) mise à jour de prevX pour la prochaine itération
      prevX = nx;

      // e) descendre à la ligne suivante
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
    jetpackReady  = false; 
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

    // ——— Niveau, difficulté et probabilités dynamiques ———
    const level       = getLevel(score);                                     // +1 niveau tous les 1000 pts
    const difficulty  = 1 + level * 0.05;                                     // +5% de challenge par niveau
    const movingSpeed = BASE_MOVING_SPEED * difficulty;

    const mobileProb = Math.min(
      BASE_MOB_PROB  + level * MOB_PROB_INCR,
      MAX_MOB_PROB
    );

    const bounceProb = BASE_BOUNCE_PROB;  // ou dynamique si tu veux

    const trapProb = Math.min(
      BASE_TRAP_PROB + level * TRAP_PROB_INCR,
      MAX_TRAP_PROB
    );

    // ─── Paramètres pour la plateforme “disparaisse” ───
    const BASE_VANISH_PROB = 0.05;    // 5 % de chance au niveau 0
    const VANISH_PROB_INCR = 0.005;   // +0.5 % par niveau
    const MAX_VANISH_PROB  = 0.20;    // jamais plus de 20 %
    const vanishProb = Math.min(
      BASE_VANISH_PROB + level * VANISH_PROB_INCR,
      MAX_VANISH_PROB
    );

    // ——— Déplacement du joueur ———
    player.vx = (left ? -H_SPEED : 0) + (right ? H_SPEED : 0);
    player.x  = Math.max(0, Math.min(innerWidth - player.w, player.x + player.vx * dt));


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
    // 🚀 apparition instantanée du jetpack à 10 000 pts
    if (!jetpackReady && score >= 10000) {
      jetpackReady = true;
      const visible = platforms.filter(p =>
        p.y > 0 && p.y < innerHeight - 50
      );
      if (visible.length) {
        const p = visible[Math.floor(Math.random() * visible.length)];
        jetpack = {
          x: p.x + p.w/2 - 15,
          y: p.y - PLATFORM_SPACING * 4
        };
      }
    }


    if (player.y < innerHeight / 3) {
      const dy = innerHeight / 3 - player.y;
      player.y = innerHeight / 3;
      platforms.forEach(p => p.y += dy);
      if (jetpack) jetpack.y += dy;
      score += Math.floor(dy);
    }

    if (player.vy > 0) {
      // on parcourt par index pour pouvoir recycler la plateforme
      for (let i = platforms.length - 1; i >= 0; i--) {
        const p = platforms[i];
        // 1) ignorer les pièges
        if (p.type === 4) continue;

        // 2) test de collision
        if (
          player.x + player.w > p.x &&
          player.x < p.x + p.w &&
          player.y + player.h > p.y &&
          player.y + player.h - player.vy * dt < p.y
        ) {
          // 3) rebond selon le type
          if (p.type === 5) {
            // vanish : rebond normal puis disparition
            player.vy = -JUMP_SPEED;
            playSfx('jump');
            recycle(i);
          }
          else if (p.type === 2) {
            // rebond jaune
            player.vy = -HIGH_BOUNCE;
            playSfx('yellow');
          }
          else {
            // plateforme classique ou mobile
            player.vy = -JUMP_SPEED;
            playSfx('jump');
          }
          break;
        }
      }
    }




    platforms.forEach(p => {
      if (p.type === 3) {
        // — Remplacement complet de la logique de déplacement mobile — 

        // 1) Déplacer selon p.vx (-1 ou +1)
        p.x += p.vx * movingSpeed * dt;

        // 2) Si on dépasse à gauche, recarder et repartir vers la droite
        if (p.x < 0) {
          p.x  = 0;
          p.vx =  1;
        }
        // 3) Si on dépasse à droite, recarder et repartir vers la gauche
        else if (p.x + p.w > innerWidth) {
          p.x  = innerWidth - p.w;
          p.vx = -1;
        }
      }
    });



    if (jetpack &&
      player.x + player.w > jetpack.x &&
      player.x < jetpack.x + 30 &&
      player.y + player.h > jetpack.y &&
      player.y < jetpack.y + 30) {
      playSfx('jetpack');      // ← son à la prise
      jetpackActive = true;
      jetpackTimer = JETPACK_DURATION;
      playSfx('jetpack');
      jetpack = null;
    }

    for (let i = platforms.length - 1; i >= 0; i--) {
      if (platforms[i].y > innerHeight) recycle(i);
    }
    if (jetpack && jetpack.y > innerHeight) {
      jetpack = null;
    }

    // ─── Génération des plateformes ───
    // 0) point de départ : centre écran
    let prevX = innerWidth/2 - P_W/2;
    // 50% de la portée max, pour moins d’extrêmes
    const horizRange = maxHorz * 0.5;

    while (platforms.length < 12) {
      // 1) hauteur de la nouvelle rangée
      const topY = Math.min(...platforms.map(p => p.y));

      // 2) tirer un nx atteignable depuis prevX
      let nx = prevX + (Math.random()*2 - 1) * horizRange;
      nx = Math.max(0, Math.min(innerWidth - P_W, nx));

      // 3) choisir le type (mobile, rebond, piège, vanish, classique)
      const r = Math.random();
      let type;
      if      (r < mobileProb)                                            type = 3; // mobile (bleue)
      else if (r < mobileProb + bounceProb)                               type = 2; // rebond (jaune)
      else if (r < mobileProb + bounceProb + trapProb)                    type = 4; // piège (rouge)
      else if (r < mobileProb + bounceProb + trapProb + vanishProb)       type = 5; // vanish (violet)
      else                                                                 type = 1; // classique (marron)


      // 4) créer la plateforme principale
      platforms.push(makePlat(nx, topY - PLATFORM_SPACING, type));

      // 5) si piège, générer 1 secours et mettre prevX = safeX
      if (type === 4) {

        // on veut au moins 50% de la plage ou P_W+10, mais jamais plus que horizRange
        const fallbackOffset = Math.min(
          horizRange,
          Math.max(horizRange * 0.5, P_W + 10)
        );


        // deux candidats décalés, clampés à l'écran
        const candidateXs = [
          nx + fallbackOffset,
          nx - fallbackOffset
        ]
        .map(x => Math.max(0, Math.min(innerWidth - P_W, x)))
        // on ne garde que ceux réellement éloignés de nx
        .filter(x => Math.abs(x - nx) >= fallbackOffset);

        // on choisit un safeX valide, ou on fallback vers l'autre côté
        const safeX = candidateXs.length
          ? candidateXs[Math.floor(Math.random() * candidateXs.length)]
          : (
              nx > innerWidth / 2
                ? Math.max(0, nx - fallbackOffset)
                : Math.min(innerWidth - P_W, nx + fallbackOffset)
            );

        platforms.push(makePlat(safeX, topY - PLATFORM_SPACING, 1));
        prevX = safeX;  // la prochaine rangée part de la plateforme fi able
      } else {
        prevX = nx;     // sinon on part de la plateforme normale
      }

    }

    if (player.y > innerHeight) return showGameOver(score);

    ctxDJ.fillStyle = backgrounds[Math.floor(score / 1000) % backgrounds.length];
    ctxDJ.fillRect(0, 0, innerWidth, innerHeight);

    platforms.forEach(p => {
      ctxDJ.fillStyle =
         p.type === 4 ? '#E74C3C' :  // piège en rouge
         p.type === 5 ? '#9B59B6' :  // vanish en violet
         p.type === 3 ? '#2288FF' :  // mobile (bleue)
         p.type === 2 ? '#FFD700' :  // rebond (jaune)
                        '#654321';   // classique (marron)
      ctxDJ.fillRect(p.x, p.y, p.w, p.h);

      if (
        p.type === 1 &&
        !jetpack &&
        Math.random() < 0.05 &&
        score > 10000 &&
        ts - lastJetpackTime > 30000 // au moins 30 secondes depuis le dernier
      ) {
        jetpack = { x: p.x + P_W / 2 - 15, y: p.y - 30 };
        lastJetpackTime = ts;
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
        const gradient = ctxDJ.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${p.alpha})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 30%, 0)`);

        ctxDJ.fillStyle = gradient;
        ctxDJ.beginPath();
        ctxDJ.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctxDJ.fill();

      }
    });

    ctxDJ.fillStyle = '#000';
    ctxDJ.font = '20px sans-serif';
    ctxDJ.fillText(`Score: ${Math.floor(score)}`, 10, 30);
    // affichage du niveau sous le score
    ctxDJ.font     = '16px sans-serif';          // un peu plus petit que le score
    ctxDJ.fillText(`Niveau: ${level}`, 10, 55);  // 55px pour être en dessous


    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}



// ─── Tab navigation ────────────────────────────────────────────
function showTab(tab) {
  // 1) Masquer toutes les vues et désactiver tous les onglets
  Object.values(views).forEach(v => v.classList.remove('active'));
  Object.values(tabs).forEach(b => b.classList.remove('active'));

  // 2) Activer la vue et l’onglet sélectionnés
  views[tab].classList.add('active');
  tabs[tab].classList.add('active');

  // 3) Son de changement d’onglet
  playSfx('tab');

  // 4) Cas par cas
  if (tab === 'profile') {
    checkPseudo();
    updateBestScore();
    updateProfileStats();
    updateXP();
  }
  else if (tab === 'play') {
    const currentCard = getCurrentCard(); // calcul dynamique
    scratchImg.src = `images/${currentCard}.webp`;
    checkDailyScratch();
    initScratch();
  }
  else if (tab === 'badges') {
    renderBadges();
  }
  else if (tab === 'game') {
    startScreen.classList.remove('hidden');
    // Bloque tout scroll/touchmove dans la vue Game
    document
      .getElementById('view-game')
      .addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  }
  else if (tab === 'tamagochi') {
    initTamagochi();
    resetIfNewDay();
    computeHealth();
    updateUI();
  }
}

// 5) Rattacher l’événement à chaque onglet
Object.keys(tabs).forEach(tab =>
  tabs[tab].addEventListener('click', () => showTab(tab))
);


// ─── Start Game button ─────────────────────────────────────────
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  launchDoodle();
});

// ─── Reset app ─────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  ['scratchLog','lastScratchDate','xpTotal','pseudo','scratchCount','bestScore']
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
  const today = localISODate(); // recalcul à chaque appel
  const last = localStorage.getItem('lastScratchDate');

  if (last === today) {
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

// ─── Utility: vérifier si un badge existe réellement ───────────────
async function badgeExistsFor(cardId) {
  const url = `images/${cardId.replace('card','badge')}.png`;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const type = (res.headers.get('content-type') || '').toLowerCase();
    return res.ok && type.startsWith('image/');
  } catch {
    return false;
  }
}

// ─── Clear detection at 65% ─────────────────────────────────────
async function checkClear() {
  // 1) Calcul du pourcentage gratté
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) cleared++;
  }
  const percent = (cleared / (canvas.width * canvas.height)) * 100;

  if (percent >= 65) {
    // 2) Marquer ce scratch comme fait aujourd’hui (date locale, mobile-safe)
    localStorage.setItem('lastScratchDate', localISODate());

    // 3) Révéler entièrement l’image (faire disparaître l’overlay)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 4) Désactiver le grattage et couper le son
    canvas.style.pointerEvents = 'none';
    stopScratchSfx();

    // 5) Incrémenter le compteur et mettre à jour le profil
    const scratchCount = parseInt(localStorage.getItem('scratchCount') || '0', 10) + 1;
    localStorage.setItem('scratchCount', scratchCount.toString());
    updateProfileStats();

    // 6) +20 XP
    const xpNew = parseInt(localStorage.getItem('xpTotal') || '0', 10) + 20;
    localStorage.setItem('xpTotal', xpNew.toString());
    updateXP();

    // 7) Badge éventuel pour la carte en cours (test HEAD fiable)
    const currentCard = getCurrentCard(); // ← la carte qu’on vient de gratter
    if (await badgeExistsFor(currentCard)) {
      scratchStatus.style.display = 'none';
      rewardBtn.style.display = 'block';
      rewardBtn.disabled = false;
    } else {
      scratchStatus.textContent = 'NEXT SCRATCH TOMORROW';
      scratchStatus.style.display = 'block';
      rewardBtn.style.display = 'none';
    }

    // 8) Avancer l’index de carte (anti-skip : on avance UNIQUEMENT après grattage)
    let seqIdx = parseInt(localStorage.getItem(KEY_SEQ_IDX) ?? '0', 10);
    if (isNaN(seqIdx) || seqIdx < 0) seqIdx = 0;
    localStorage.setItem(KEY_SEQ_IDX, String(seqIdx + 1));
  }
}




// ─── Reward handler ────────────────────────────────────────────
rewardBtn.addEventListener('click', e => {
  e.preventDefault();
  if (rewardTriggered) return;

  rewardTriggered = true;
  rewardBtn.disabled = true;

  playSfx('reward');
  playSfx('badge');

  // Révèle entièrement l’image
  ctx.globalCompositeOperation = 'source-out';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ✅ Date du jour recalculée à l’appel (mobile-safe)
  localStorage.setItem('lastScratchDate', localISODate());

  // ✅ Recalcule la carte du jour ici (pas de variable globale)
  const currentCard = getCurrentCard();
  const badgeId = currentCard.replace('card', 'badge');

  const log = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  if (!log.includes(badgeId)) log.push(badgeId);
  localStorage.setItem('scratchLog', JSON.stringify(log));

  // Animation badge + passage à l’onglet Badges
  badgeContainer.style.display = 'flex';
  badgeAnim.goToAndPlay(0, true);
  showTab('badges');
});


// ─── Render badges ─────────────────────────────────────────────
function renderBadges() {
  badgesList.innerHTML = '';

  // Sécurise la lecture du log
  let won = [];
  try {
    const raw = JSON.parse(localStorage.getItem('scratchLog') || '[]');
    won = Array.isArray(raw) ? raw : [];
  } catch {
    won = [];
  }

  const totalSlots = cards.length; // s’adapte si tu changes le nombre de cartes

  for (let i = 0; i < totalSlots; i++) {
    const n = i + 1;

    const li = document.createElement('li');
    li.className = 'badge-slot';

    const num = document.createElement('span');
    num.className = 'badge-slot-number';
    num.textContent = n;
    li.appendChild(num);

    // Affiche le iᵉ badge gagné (logique séquentielle : won[0] = badge1, won[1] = badge2, ...)
    if (won[i]) {
      const img = document.createElement('img');
      img.src = `images/${won[i]}.png`;
      img.alt = `Badge ${won[i]}`;
      img.loading = 'lazy';
      li.appendChild(img);
    }

    badgesList.appendChild(li);
  }
}


// ─── Service Worker & init ─────────────────────────────────────
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
document.addEventListener('DOMContentLoaded',()=>{
  checkPseudo();
  initScratch();
  initTamagochi();
  showTab('profile');
});

// Touche A = Reset complet (tests)
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'a') {
    localStorage.clear();
    location.reload();
  }
});