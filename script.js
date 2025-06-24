// script.js

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
    const buf = await resp.arrayBuffer();
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
function startScratchSfx(){
  if (scratchSource || !sfxBuffers['scratch']) return;
  scratchSource = audioCtx.createBufferSource();
  scratchSource.buffer = sfxBuffers['scratch'];
  scratchSource.loop = true;
  scratchSource.connect(audioCtx.destination);
  scratchSource.start(0);
}
function stopScratchSfx(){
  if (!scratchSource) return;
  scratchSource.stop();
  scratchSource = null;
}

// ─── 0) Intro Lottie ────────────────────────────────────────────
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

// ─── 0b) Badge Lottie ───────────────────────────────────────────
const badgeContainer = document.getElementById('lottie-badge');
const badgeAnim = lottie.loadAnimation({
  container: badgeContainer,
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'animations/badge.json'
});
badgeAnim.addEventListener('complete', () => {
  badgeContainer.style.display = 'none';
  showTab('badges');
});

// ─── 1) Cartes & badges ─────────────────────────────────────────
const cards = ['card1','card2','card3','card4'];
const cardToBadge = { 'card1':'badge1','card2':null,'card3':null,'card4':'badge4' };

// ─── 2) Carte du jour ───────────────────────────────────────────
let start = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0,10);
if (!start) { localStorage.setItem('startDate', todayISO); start = todayISO; }
const daysElapsed = Math.floor((new Date(todayISO) - new Date(start)) / 86400000);
const currentCard = cards[daysElapsed % cards.length];

// ─── 3) DOM ─────────────────────────────────────────────────────
const tabProfile     = document.getElementById('tab-profile');
const tabPlay        = document.getElementById('tab-play');
const tabBadges      = document.getElementById('tab-badges');
const viewProfile    = document.getElementById('view-profile');
const viewPlay       = document.getElementById('view-play');
const viewBadges     = document.getElementById('view-badges');
const resetBtn       = document.getElementById('reset-btn');
const area           = document.getElementById('scratch-area');
const canvas         = document.getElementById('scratchCanvas');
const ctx            = canvas.getContext('2d');
const rewardBtn      = document.getElementById('reward-btn');
const pseudoInput    = document.getElementById('pseudo-input');
const pseudoBtn      = document.getElementById('pseudo-btn');
const pseudoSpan     = document.getElementById('pseudo-display');
const levelDisplay   = document.getElementById('level-display');
const xpBar          = document.getElementById('xp-bar');
const xpText         = document.getElementById('xp-text');
const scratchImage   = document.getElementById('scratch-image');
const profileForm    = document.getElementById('profile-form');
const profileStats   = document.querySelector('.profile-stats');
const cardsDisplay   = document.getElementById('cards-scratched');
const rewardsDisplay = document.getElementById('rewards-count');

// statut & bouton DONE
const scratchStatus = document.createElement('p');
scratchStatus.id = 'scratch-status';
Object.assign(scratchStatus.style, { display:'none', margin:'1rem auto 0', padding:'.5rem 1rem', background:'#28A745', color:'#FFF', borderRadius:'4px', width:'80%', maxWidth:'300px', textAlign:'center' });
rewardBtn.insertAdjacentElement('afterend', scratchStatus);
const doneBtn = document.createElement('button');
doneBtn.id = 'done-btn'; doneBtn.textContent = 'DONE';
Object.assign(doneBtn.style, { display:'none', margin:'1rem auto 0', padding:'.5rem 1rem', background:'#28A745', color:'#FFF', border:'none', borderRadius:'4px', width:'80%', maxWidth:'300px', cursor:'pointer', fontSize:'16px', transition:'background .2s ease'});
doneBtn.addEventListener('mouseenter', ()=> doneBtn.style.background='#218838');
doneBtn.addEventListener('mouseleave', ()=> doneBtn.style.background='#28A745');
rewardBtn.insertAdjacentElement('afterend', doneBtn);

let drawing = false;

// ─── 4) Gestão du pseudo ────────────────────────────────────────
function checkPseudo() { /* ... */ }
pseudoBtn.addEventListener('click', /* ... */);

// ─── 5) updateProfileStats ─────────────────────────────────────
function updateProfileStats() { /* ... */ }

// ─── 6) updateXPDisplay ─────────────────────────────────────────
function updateXPDisplay() { /* ... */ }

// ─── 7) showTab ─────────────────────────────────────────────────
function showTab(tab) { /* ... */ }
[tabProfile, tabPlay, tabBadges].forEach((t,i) => t.addEventListener('click', ()=> showTab(['profile','play','badges'][i])));

// ─── 8) resetBtn listener ───────────────────────────────────────
resetBtn.addEventListener('click', /* ... */);

// ─── 9) initScratch ─────────────────────────────────────────────
function initScratch() { /* ... */ }
window.addEventListener('resize', initScratch);

// ───10) getPos ─────────────────────────────────────────────────
function getPos(e) { /* ... */ }

// ───11) checkDailyScratch ───────────────────────────────────────
function checkDailyScratch() { /* ... */ }

// ───12) checkClear ─────────────────────────────────────────────
function checkClear() { /* ... */ }

// ───13) scratch events ───────────────────────────────────────────
/* ... */

// ───14) Pointerup REWARD → lance anim badge + son badge ───────────
rewardBtn.addEventListener('pointerup', () => {
  if (rewardBtn.textContent === 'REWARD') {
    playSfx('reward');
    playSfx('badge');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.clearRect(0,0,canvas.width,canvas.height);
    localStorage.setItem('lastScratchDate', todayISO);
    const badgeId = cardToBadge[currentCard];
    const log = JSON.parse(localStorage.getItem('scratchLog')||'[]');
    if (badgeId && !log.includes(badgeId)) {
      log.push(badgeId);
      localStorage.setItem('scratchLog', JSON.stringify(log));
    }
    badgeContainer.style.display = 'flex';
    badgeAnim.goToAndPlay(0, true);
  }
});

// ───15) clic DONE ───────────────────────────────────────────────
doneBtn.addEventListener('click', /* ... */);

// ───16) renderBadges ─────────────────────────────────────────────
function renderBadges() { /* ... */ }

// ───17) Service Worker ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}

// ───18) Démarrage onglet Profil ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => showTab('profile'));
