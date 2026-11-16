'use strict';
/*************************************************************************
 * HUD, BANNERS, MODALS
 *************************************************************************/
const $ = id => document.getElementById(id);
let bannerTimeout = null;

function showBattleBanner(message, icon = 'swords', persist = false) {
  const banner = $('battle-banner');
  $('banner-text').textContent = message;
  setIcon($('banner-icon'), icon);
  banner.classList.remove('opacity-0', '-translate-y-2');
  banner.classList.add('opacity-100', 'translate-y-0');

  if (bannerTimeout) clearTimeout(bannerTimeout);
  if (!persist) {
    bannerTimeout = setTimeout(hideBattleBanner, 2800);
  }
}

function hideBattleBanner() {
  const banner = $('battle-banner');
  banner.classList.add('opacity-0', '-translate-y-2');
  banner.classList.remove('opacity-100', 'translate-y-0');
}

function setModalOpen(id, open) {
  const modal = $(id);
  modal.classList.toggle('hidden', !open);
  modal.classList.toggle('flex', open);
}

function openPromotionModal(open) {
  setModalOpen('promotion-modal', open);
  if (open) $('promo-queen').focus();
}

function showGameOverModal(result) {
  setIcon($('gameover-icon'), result.icon);
  $('gameover-title').textContent = result.title;
  $('gameover-detail').textContent = result.detail;
  setModalOpen('gameover-modal', true);
  $('gameover-new').focus();
}

function hideGameOverModal() {
  setModalOpen('gameover-modal', false);
}

function syncModeUI() {
  $('btn-mode-ai').classList.toggle('m3-chip-active', settings.mode === 'ai');
  $('btn-mode-pass').classList.toggle('m3-chip-active', settings.mode === 'pass');
  $('btn-mode-ai').setAttribute('aria-pressed', settings.mode === 'ai');
  $('btn-mode-pass').setAttribute('aria-pressed', settings.mode === 'pass');
  $('difficulty-wrap').classList.toggle('hidden', settings.mode !== 'ai');
  $('select-difficulty').value = settings.difficulty;
  setIcon($('icon-sound'), audioEnabled ? 'volume_up' : 'volume_off');
}

function updateHUD() {
  const turn = game.turn();
  const turnDot = $('turn-dot');
  const turnText = $('turn-text');

  if (game.in_checkmate()) {
    turnText.textContent = turn === 'w' ? 'Obsidian Wins!' : 'Marble Wins!';
  } else if (game.game_over()) {
    turnText.textContent = 'Draw';
  } else if (isAIThinking) {
    turnText.textContent = 'Obsidian Conjuring...';
  } else {
    const side = turn === 'w' ? "Marble's Turn" : "Obsidian's Turn";
    turnText.textContent = game.in_check() ? `${side} (CHECK!)` : side;
  }

  turnDot.className = turn === 'w'
    ? 'w-2.5 h-2.5 rounded-full bg-[#F5F2EB] shadow-[0_0_8px_#ffffff]'
    : 'w-2.5 h-2.5 rounded-full bg-[#9d6bff] shadow-[0_0_8px_#9d6bff]';

  // Shattered pieces & last move, derived from the move history
  const history = game.history({ verbose: true });
  const shatteredByWhite = [];
  const shatteredByBlack = [];
  history.forEach(m => {
    if (m.captured) (m.color === 'w' ? shatteredByWhite : shatteredByBlack).push(m.captured);
  });
  const last = history[history.length - 1];
  lastMove = last ? { from: last.from, to: last.to } : null;

  const none = '<span class="text-[11px] text-gray-500 italic">None shattered yet</span>';
  $('captured-by-white').innerHTML = shatteredByWhite.length
    ? shatteredByWhite.map(p => `<span title="Shattered ${getPieceName(p)}">${UNICODE_PIECES.b[p]}</span>`).join('')
    : none;
  $('captured-by-black').innerHTML = shatteredByBlack.length
    ? shatteredByBlack.map(p => `<span title="Shattered ${getPieceName(p)}">${UNICODE_PIECES.w[p]}</span>`).join('')
    : none;

  // Material differential
  let whiteMat = 0, blackMat = 0;
  game.board().forEach(row => row.forEach(cell => {
    if (!cell) return;
    if (cell.color === 'w') whiteMat += PIECE_VALUES[cell.type]; else blackMat += PIECE_VALUES[cell.type];
  }));
  const wAdv = $('white-advantage');
  const bAdv = $('black-advantage');
  wAdv.classList.toggle('hidden', whiteMat <= blackMat);
  bAdv.classList.toggle('hidden', blackMat <= whiteMat);
  if (whiteMat > blackMat) wAdv.textContent = `+${whiteMat - blackMat}`;
  if (blackMat > whiteMat) bAdv.textContent = `+${blackMat - whiteMat}`;

  // Move log
  const logEl = $('move-log');
  $('move-counter').textContent = `Ply ${history.length}`;
  if (history.length === 0) {
    logEl.innerHTML = '<div class="text-gray-500 italic text-[11px]">Click any Marble piece to command its movement...</div>';
  } else {
    let rows = '';
    for (let i = 0; i < history.length; i += 2) {
      const w = history[i];
      const b = history[i + 1];
      const wTag = w.captured ? `<span class="text-rose-300 font-semibold">${w.san}💥</span>` : w.san;
      const bTag = b ? (b.captured ? `<span class="text-purple-300 font-semibold">${b.san}💥</span>` : b.san) : '';
      rows += `
        <div class="grid grid-cols-7 py-1 px-2 rounded-lg odd:bg-white/5 text-[11px]">
          <span class="col-span-1 text-gray-500">${i / 2 + 1}.</span>
          <span class="col-span-3 text-stone-200 font-medium">${wTag}</span>
          <span class="col-span-3 text-purple-200 font-medium">${bTag}</span>
        </div>`;
    }
    logEl.innerHTML = rows;
    logEl.scrollTop = logEl.scrollHeight;
  }

  refreshHighlights();
  followTurnCamera();
}
