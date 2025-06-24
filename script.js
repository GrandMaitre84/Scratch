// ───14) Pointerdown REWARD → un seul déclenchement, sans ghost click ────
rewardBtn.addEventListener('pointerdown', evt => {
  evt.preventDefault();  // empêche le ghost click qui suivrait

  // Ne rien faire si ce n’est pas un vrai REWARD
  if (rewardBtn.textContent !== 'REWARD') return;

  // Effets sonores
  playSfx('reward');
  playSfx('badge');

  // Efface le canvas et enregistre la date
  ctx.globalCompositeOperation = 'destination-out';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  localStorage.setItem('lastScratchDate', todayISO);

  // Enregistre le badge obtenu
  const badgeId = cardToBadge[currentCard];
  const log     = JSON.parse(localStorage.getItem('scratchLog') || '[]');
  if (badgeId && !log.includes(badgeId)) {
    log.push(badgeId);
    localStorage.setItem('scratchLog', JSON.stringify(log));
  }

  // Affiche l’overlay et lance l’animation Lottie du badge
  badgeContainer.style.display = 'flex';
  badgeAnim.goToAndPlay(0, true);
});
