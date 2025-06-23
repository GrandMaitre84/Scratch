// ─── WebAudio setup pour ultra-low-latency ─────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
document.body.addEventListener('touchstart', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });

const SFX_FILES = {
  tab:      'sounds/tab-click.mp3',
  validate: 'sounds/validate.mp3',
  reward:   'sounds/reward.mp3',
  scratch:  'sounds/scratch.mp3'
};
const sfxBuffers = {};
async function loadSfx(name, url) {
  const resp = await fetch(url);
  const buf  = await resp.arrayBuffer();
  sfxBuffers[name] = await audioCtx.decodeAudioData(buf);
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

// bouclage du scratch
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

// ─── 0) Intro Lottie ───────────────────────────────────────────────
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

// ─── 1) Cartes & badges ───────────────────────────────────────────
const cards = ['card1','card2','card3','card4'];
const cardToBadge = {
  'card1':'badge1','card2':null,
  'card3':null,'card4':'badge4'
};

// ─── 2) Carte du jour ─────────────────────────────────────────────
let start = localStorage.getItem('startDate');
const todayISO = new Date().toISOString().slice(0,10);
if (!start) {
  localStorage.setItem('startDate', todayISO);
  start = todayISO;
}
const daysElapsed = Math.floor((new Date(todayISO) - new Date(start)) / 86400000);
const currentCard = cards[daysElapsed % cards.length];

// ─── 3) DOM ───────────────────────────────────────────────────────
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

// statut de grattage / NEXT SCRATCH TOMORROW
const scratchStatus = document.createElement('p');
scratchStatus.id = 'scratch-status';
Object.assign(scratchStatus.style, {
  display: 'none',
  margin: '1rem auto 0',
  padding: '.5rem 1rem',
  background: '#28A745',
  color: '#FFF',
  borderRadius: '4px',
  width: '80%',
  maxWidth: '300px',
  textAlign: 'center',
  cursor: 'default'
});
rewardBtn.insertAdjacentElement('afterend', scratchStatus);

// bouton DONE (même look que REWARD)
const doneBtn = document.createElement('button');
doneBtn.id = 'done-btn';
doneBtn.textContent = 'DONE';
Object.assign(doneBtn.style, {
  display: 'none',
  margin: '1rem auto 0',
  padding: '.5rem 1rem',
  background: '#28A745',
  color: '#FFF',
  border: 'none',
  borderRadius: '4px',
  width: '80%',
  maxWidth: '300px',
  cursor: 'pointer',
  fontSize: '16px',
  transition: 'background .2s ease',
  display: 'none'
});
doneBtn.addEventListener('mouseenter', () => doneBtn.style.background = '#218838');
doneBtn.addEventListener('mouseleave', () => doneBtn.style.background = '#28A745');
rewardBtn.insertAdjacentElement('afterend', doneBtn);

let drawing = false;

// ─── 4) Pseudo ────────────────────────────────────────────────────
function checkPseudo() {
  const stored = localStorage.getItem('pseudo');
  if (stored) {
    profileForm.style.display   = 'none';
    profileHeader.style.display = 'flex';
    pseudoSpan.textContent      = stored;
  } else {
    profileForm.style.display   = 'flex';
    profileHeader.style.display = 'none';
    pseudoSpan.textContent      = '';
  }
}
pseudoBtn.addEventListener('click', () => {
  playSfx('tab');
  playSfx('validate');
  const v = pseudoInput.value.trim();
  if (!v) return;
  localStorage.setItem('pseudo', v);
  checkPseudo();
});

// ─── 5) XP & Level ────────────────────────────────────────────────
function updateXPDisplay() {
  const xpTotal = parseInt(localStorage.getItem('xpTotal') || '0', 10);
  const level   = Math.floor(xpTotal / 100);
  const rem     = xpTotal % 100;
  levelDisplay.textContent = `Level of love : ${level}`;
  xpBar.style.width        = `${rem}%`;
  xpText.textContent       = `XP : ${rem}/100`;
}

// ─── 6) Onglets (avec SFX) ───────────────────────────────────────
function showTab(tab) {
  [viewProfile,viewPlay,viewBadges].forEach(v=>v.classList.remove('active'));
  [tabProfile,tabPlay,tabBadges].forEach(t=>t.classList.remove('active'));
  playSfx('tab');
  if (tab==='profile') {
    viewProfile.classList.add('active');
    tabProfile.classList.add('active');
    checkPseudo(); updateXPDisplay();
  }
  if (tab==='play') {
    viewPlay.classList.add('active');
    tabPlay.classList.add('active');
    scratchImage.src = `images/${currentCard}.png`;
    checkDailyScratch();
  }
  if (tab==='badges') {
    viewBadges.classList.add('active');
    tabBadges.classList.add('active');
    renderBadges();
  }
}
tabProfile.addEventListener('click',()=>showTab('profile'));
tabPlay.addEventListener   ('click',()=>showTab('play'));
tabBadges.addEventListener ('click',()=>showTab('badges'));

// ─── 7) Reset tests ──────────────────────────────────────────────
resetBtn.addEventListener('click', ()=>{
  localStorage.removeItem('scratchLog');
  localStorage.removeItem('lastScratchDate');
  localStorage.removeItem('xpTotal');
  localStorage.removeItem('pseudo');
  showTab('profile');
});

// ─── 8) Canvas ───────────────────────────────────────────────────
function initScratch(){
  const w=area.clientWidth, h=area.clientHeight;
  canvas.width = w; canvas.height = h;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#999'; ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 30; ctx.lineCap = 'round';
}
window.addEventListener('resize', initScratch);

// ─── 9) Position curseur ─────────────────────────────────────────
function getPos(e){
  const r=canvas.getBoundingClientRect();
  return {
    x:(e.touches?e.touches[0].clientX:e.clientX)-r.left,
    y:(e.touches?e.touches[0].clientY:e.clientY)-r.top
  };
}

// ───10) Limite 1 scratch/jour ────────────────────────────────────
function checkDailyScratch(){
  const last = localStorage.getItem('lastScratchDate');
  if (last===todayISO){
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity       = '0.5';
    rewardBtn.style.display    = 'none';
    doneBtn.style.display      = 'none';
    scratchStatus.textContent  = 'NEXT SCRATCH TOMORROW';
    scratchStatus.style.display= 'block';
  } else {
    initScratch();
    canvas.style.pointerEvents = 'auto';
    canvas.style.opacity       = '1';
    rewardBtn.style.display    = 'none';
    doneBtn.style.display      = 'none';
    scratchStatus.style.display= 'none';
  }
}

// ───11) Vérif 60% ────────────────────────────────────────────────
function checkClear(){
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let cleared=0;
  for(let i=3;i<data.length;i+=4) if(data[i]===0) cleared++;
  if(cleared/(canvas.width*canvas.height)*100>=60){
    // ajoute XP
    const xpTotal = parseInt(localStorage.getItem('xpTotal')||'0',10)+20;
    localStorage.setItem('xpTotal', xpTotal);
    updateXPDisplay();
    if(cardToBadge[currentCard]){
      rewardBtn.textContent  = 'REWARD';
      rewardBtn.style.display= 'block';
      doneBtn.style.display  = 'none';
      scratchStatus.style.display = 'none';
    } else {
      doneBtn.style.display       = 'block';
      rewardBtn.style.display     = 'none';
      scratchStatus.style.display = 'none';
    }
    canvas.style.pointerEvents='none';
  }
}

// ───12) Évènements grattage (SFX boucle) ─────────────────────────
['mousedown','touchstart'].forEach(evt=>{
  canvas.addEventListener(evt,e=>{
    startScratchSfx();
    drawing=true;
    const p=getPos(e);
    ctx.beginPath(); ctx.moveTo(p.x,p.y);
  });
});
['mousemove','touchmove'].forEach(evt=>{
  canvas.addEventListener(evt,e=>{
    if(!drawing) return;
    const p=getPos(e);
    ctx.lineTo(p.x,p.y); ctx.stroke();
  });
});
['mouseup','mouseleave','touchend'].forEach(evt=>{
  canvas.addEventListener(evt,()=>{
    stopScratchSfx();
    if(drawing) checkClear();
    drawing=false;
  });
});

// ───13) Clic REWARD (SFX) ────────────────────────────────────────
['click','touchend'].forEach(evt=>{
  rewardBtn.addEventListener(evt,()=>{
    if(rewardBtn.textContent==='REWARD'){
      playSfx('reward');
      ctx.globalCompositeOperation='destination-out';
      ctx.clearRect(0,0,canvas.width,canvas.height);
      localStorage.setItem('lastScratchDate', todayISO);
      const badgeId=cardToBadge[currentCard];
      const log=JSON.parse(localStorage.getItem('scratchLog')||'[]');
      if(badgeId && !log.includes(badgeId)){
        log.push(badgeId);
        localStorage.setItem('scratchLog', JSON.stringify(log));
      }
      showTab('badges');
    }
  });
});

// ───14) Clic DONE (SFX tab-click) ────────────────────────────────
doneBtn.addEventListener('click',()=>{
  playSfx('tab');
  ctx.globalCompositeOperation='destination-out';
  ctx.clearRect(0,0,canvas.width,canvas.height);
  localStorage.setItem('lastScratchDate', todayISO);
  doneBtn.style.display        = 'none';
  scratchStatus.textContent    = 'NEXT SCRATCH TOMORROW';
  scratchStatus.style.display  = 'block';
});

// ───15) Rendu badges ─────────────────────────────────────────────
function renderBadges(){
  const ul=document.getElementById('badges-list');
  ul.innerHTML='';
  const SLOTS = 30, won=JSON.parse(localStorage.getItem('scratchLog')||'[]');
  for(let i=0;i<SLOTS;i++){
    const li=document.createElement('li');
    li.classList.add('badge-slot');
    const num=document.createElement('span');
    num.classList.add('badge-slot-number');
    num.textContent=i+1;
    li.appendChild(num);
    if(won[i]){
      const img=document.createElement('img');
      img.src=`images/${won[i]}.png`;
      img.alt=`Badge ${won[i]}`;
      li.appendChild(img);
    }
    ul.appendChild(li);
  }
}

// ───16) Service Worker ───────────────────────────────────────────
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(console.error);
}

// ───17) Démarrage onglet Profil ─────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>showTab('profile'));
