'use strict';
/*************************************************************************
 * STARTUP & EVENT WIRING
 *************************************************************************/
let newGameArmedUntil = 0;
let newGameTimer = null;

function onNewGameClick() {
  const needsConfirm = game.history().length > 0 && !game.game_over();
  if (needsConfirm && performance.now() > newGameArmedUntil) {
    newGameArmedUntil = performance.now() + 3000;
    $('new-game-label').textContent = 'Sure?';
    showBattleBanner('Click New Game again to abandon this match', 'warning');
    clearTimeout(newGameTimer);
    newGameTimer = setTimeout(() => { $('new-game-label').textContent = 'New Game'; }, 3000);
    return;
  }
  newGameArmedUntil = 0;
  $('new-game-label').textContent = 'New Game';
  resetGame();
}

function anyModalOpen() {
  return ['promotion-modal', 'gameover-modal', 'help-modal'].some(id => !$(id).classList.contains('hidden'));
}

function bindEvents() {
  $('btn-mode-ai').addEventListener('click', () => setGameMode('ai'));
  $('btn-mode-pass').addEventListener('click', () => setGameMode('pass'));
  $('select-difficulty').addEventListener('change', e => setDifficulty(e.target.value));
  $('btn-hint').addEventListener('click', requestHint);
  $('btn-undo').addEventListener('click', undoLastMove);
  $('btn-sound').addEventListener('click', toggleAudio);
  $('btn-new').addEventListener('click', onNewGameClick);
  $('btn-help').addEventListener('click', () => setModalOpen('help-modal', true));
  $('help-close').addEventListener('click', () => setModalOpen('help-modal', false));

  document.querySelectorAll('[data-promo]').forEach(btn =>
    btn.addEventListener('click', () => completePromotion(btn.dataset.promo)));
  $('promo-cancel').addEventListener('click', cancelPromotion);

  $('gameover-new').addEventListener('click', resetGame);
  $('gameover-close').addEventListener('click', hideGameOverModal);

  ['white', 'black', 'top', 'orbit'].forEach(p =>
    $('cam-' + p).addEventListener('click', () => setCameraPreset(p)));

  // click on a modal backdrop closes it
  ['help-modal', 'gameover-modal'].forEach(id =>
    $(id).addEventListener('click', e => { if (e.target === $(id)) setModalOpen(id, false); }));
  $('promotion-modal').addEventListener('click', e => { if (e.target === $('promotion-modal')) cancelPromotion(); });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.tagName === 'SELECT') return;
    const key = e.key.toLowerCase();
    if (key === 'escape') {
      cancelPromotion();
      setModalOpen('help-modal', false);
      hideGameOverModal();
      clearSelection();
    } else if (anyModalOpen()) {
      return;
    } else if (key === 'h') requestHint();
    else if (key === 'u') undoLastMove();
    else if (key === 'm') toggleAudio();
    else if (['1', '2', '3', '4'].includes(key)) setCameraPreset(['white', 'black', 'top', 'orbit'][Number(key) - 1]);
  });
}

function startGame() {
  hydrateIcons();
  initEngine();
  loadState();
  syncModeUI();
  bindEvents();
  syncFullBoardFromEngine();
  onResize();
  animate();
  hideLoading();

  const result = getGameResult();
  if (result) showBattleBanner(`${result.title} — ${result.detail}`, result.icon);
  else if (game.history().length > 0) showBattleBanner('Welcome back, your match was restored', 'history_edu');
  maybeStartAI();
}

startGame();
