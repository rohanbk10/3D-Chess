'use strict';
/*************************************************************************
 * GAME STATE, RULES (chess.js), AI OPPONENT (web worker) & PERSISTENCE
 *************************************************************************/
const game = new Chess();
const settings = { mode: 'ai', difficulty: 'normal' };
const DIFFICULTY = {
  easy: { maxDepth: 1, timeMs: 300, noise: 260 },
  normal: { maxDepth: 3, timeMs: 1500, noise: 12 },
  hard: { maxDepth: 5, timeMs: 3500, noise: 0 }
};
const HINT_OPTS = { maxDepth: 4, timeMs: 1500, noise: 0 };
const STORE_KEY = 'wizards-chess:v1';

let selectedSquare = null;
let legalMovesForSelected = [];
let pendingPromotionMove = null;
let isAIThinking = false;
let isHintThinking = false;
let hintMove = null;
let lastMove = null;
let gameOverShownAt = -1;

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const UNICODE_PIECES = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};
const PIECE_NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

function getPieceName(code) {
  return PIECE_NAMES[code] || 'Piece';
}

/*************************************************************************
 * ENGINE (Web Worker with main-thread fallback, e.g. when opened via file://)
 *************************************************************************/
let engineWorker = null;
let engineSeq = 0;
let latestEngineRequest = 0;
const engineJobs = new Map();

function runEngineSync(fen, opts) {
  try {
    return WizardEngine.findBestMove(fen, opts);
  } catch (err) {
    console.error('Engine error', err);
    return null;
  }
}

function initEngine() {
  try {
    engineWorker = new Worker('js/engine-worker.js');
    engineWorker.onmessage = e => {
      const job = engineJobs.get(e.data.id);
      engineJobs.delete(e.data.id);
      if (job) job.done(e.data.move || null);
    };
    engineWorker.onerror = err => {
      console.warn('Engine worker failed, falling back to main thread.', err);
      engineWorker = null;
      const jobs = [...engineJobs.values()];
      engineJobs.clear();
      jobs.forEach(job => setTimeout(() => job.done(runEngineSync(job.fen, job.opts)), 30));
    };
  } catch (err) {
    engineWorker = null;
  }
}

function requestEngineMove(opts, callback) {
  const id = ++engineSeq;
  latestEngineRequest = id;
  const fen = game.fen();
  // Stale answers (after undo / reset / a human move) are silently dropped.
  const done = move => { if (id === latestEngineRequest) callback(move); };
  if (engineWorker) {
    engineJobs.set(id, { done, fen, opts });
    engineWorker.postMessage({ id, fen, opts });
  } else {
    setTimeout(() => done(runEngineSync(fen, opts)), 40);
  }
}

function cancelEngine() {
  latestEngineRequest = ++engineSeq;
  isAIThinking = false;
  isHintThinking = false;
}

/*************************************************************************
 * BOARD <-> ENGINE SYNC & HIGHLIGHTS
 *************************************************************************/
function disposeObject(obj) {
  obj.traverse(child => {
    if (child.isMesh && child.geometry) child.geometry.dispose();
  });
}

function syncFullBoardFromEngine() {
  for (let i = piecesGroup.children.length - 1; i >= 0; i--) {
    const child = piecesGroup.children[i];
    piecesGroup.remove(child);
    disposeObject(child);
  }
  Object.keys(boardPieces).forEach(sq => delete boardPieces[sq]);

  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const sqName = String.fromCharCode(97 + f) + (8 - r);
      const mesh = createPieceMesh(cell.type, cell.color);
      mesh.position.copy(squareToWorld(sqName));
      mesh.userData.square = sqName;
      piecesGroup.add(mesh);
      boardPieces[sqName] = mesh;
    }
  }
  clearSelection();
  updateHUD();
}

function findKingSquare(color) {
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const c = board[r][f];
      if (c && c.type === 'k' && c.color === color) return String.fromCharCode(97 + f) + (8 - r);
    }
  }
  return null;
}

function refreshHighlights() {
  const checkedKing = game.in_check() ? findKingSquare(game.turn()) : null;
  for (const [sq, h] of Object.entries(highlightMeshes)) {
    const legal = legalMovesForSelected.find(m => m.to === sq);
    const isCapture = legal && (legal.captured || legal.flags.includes('e'));
    h.pad.visible = sq === selectedSquare;
    h.dot.visible = Boolean(legal && !isCapture);
    h.ring.visible = Boolean(legal && isCapture);
    h.last.visible = Boolean(lastMove && (sq === lastMove.from || sq === lastMove.to));
    h.check.visible = sq === checkedKing;
    h.hint.visible = Boolean(hintMove && (sq === hintMove.from || sq === hintMove.to));
    h.group.visible = h.pad.visible || h.dot.visible || h.ring.visible ||
      h.last.visible || h.check.visible || h.hint.visible;
  }
}

function clearSelection(keepHint = false) {
  selectedSquare = null;
  legalMovesForSelected = [];
  if (!keepHint) hintMove = null;
  refreshHighlights();
}

function selectSquare(sq) {
  if (activeMoveAnimation || isAIThinking || game.game_over() || pendingPromotionMove) return;
  const turn = game.turn();
  if (settings.mode === 'ai' && turn === 'b') return;

  if (selectedSquare && legalMovesForSelected.some(m => m.to === sq)) {
    initiateMove(selectedSquare, sq);
    return;
  }

  const piece = game.get(sq);
  if (piece && piece.color === turn && sq !== selectedSquare) {
    selectedSquare = sq;
    legalMovesForSelected = game.moves({ square: sq, verbose: true });
    refreshHighlights();
    playSound('select');
  } else {
    clearSelection();
  }
}

/*************************************************************************
 * MAKING MOVES
 *************************************************************************/
function initiateMove(fromSq, toSq, forcedPromotion = null) {
  const matching = game.moves({ square: fromSq, verbose: true }).filter(m => m.to === toSq);
  if (matching.length === 0) return;

  const isPromotion = matching.some(m => m.flags.includes('p'));
  const isHumanTurn = !(settings.mode === 'ai' && game.turn() === 'b');
  if (isPromotion && !forcedPromotion && isHumanTurn) {
    pendingPromotionMove = { from: fromSq, to: toSq };
    openPromotionModal(true);
    return;
  }

  cancelEngine();
  const promotionChoice = forcedPromotion || 'q';
  const moveObj = game.move({ from: fromSq, to: toSq, promotion: promotionChoice });
  if (!moveObj) return;

  clearSelection();
  gameOverShownAt = -1;

  // En passant removes a pawn that is NOT on the destination square.
  let capturedSq = toSq;
  if (moveObj.flags.includes('e')) capturedSq = toSq[0] + fromSq[1];
  const capturedPieceRoot = moveObj.captured ? boardPieces[capturedSq] : null;
  if (capturedPieceRoot && capturedSq !== toSq) delete boardPieces[capturedSq];

  // Castling: the rook glides alongside the king.
  let rookGlide = null;
  if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
    const rank = moveObj.color === 'w' ? '1' : '8';
    const kingside = moveObj.flags.includes('k');
    const rookFrom = (kingside ? 'h' : 'a') + rank;
    const rookTo = (kingside ? 'f' : 'd') + rank;
    const rookMesh = boardPieces[rookFrom];
    if (rookMesh) {
      delete boardPieces[rookFrom];
      boardPieces[rookTo] = rookMesh;
      rookMesh.userData.square = rookTo;
      rookGlide = { mesh: rookMesh, from: squareToWorld(rookFrom), to: squareToWorld(rookTo) };
    }
  }

  if (moveObj.captured) {
    showBattleBanner(
      `${getPieceName(moveObj.piece)} strikes ${toSq.toUpperCase()} — ${getPieceName(moveObj.captured)} Shattered!`,
      'swords'
    );
  } else if (rookGlide) {
    showBattleBanner(moveObj.flags.includes('k') ? 'Castles kingside' : 'Castles queenside', 'castle');
  }

  animatePieceAction({
    fromSq,
    toSq,
    capturedPieceRoot,
    rookGlide,
    onComplete: () => {
      const mover = boardPieces[fromSq];
      delete boardPieces[fromSq];

      if (isPromotion && mover) {
        piecesGroup.remove(mover);
        disposeObject(mover);
        const promoted = createPieceMesh(promotionChoice, moveObj.color);
        promoted.position.copy(squareToWorld(toSq));
        promoted.userData.square = toSq;
        piecesGroup.add(promoted);
        boardPieces[toSq] = promoted;
        showBattleBanner(`Pawn ascends to ${getPieceName(promotionChoice)}`, 'workspace_premium');
      } else if (mover) {
        boardPieces[toSq] = mover;
        mover.userData.square = toSq;
      }

      saveState();
      updateHUD();
      checkGameEndOrTriggerAI();
    }
  });
}

function completePromotion(pieceChar) {
  openPromotionModal(false);
  if (pendingPromotionMove) {
    const { from, to } = pendingPromotionMove;
    pendingPromotionMove = null;
    initiateMove(from, to, pieceChar);
  }
}

function cancelPromotion() {
  if (!pendingPromotionMove) return;
  pendingPromotionMove = null;
  openPromotionModal(false);
}

/*************************************************************************
 * GAME END & AI TURN
 *************************************************************************/
function getGameResult() {
  if (game.in_checkmate()) {
    const marbleWins = game.turn() === 'b';
    return {
      title: marbleWins ? 'Polished Marble Triumphs' : 'Dark Obsidian Triumphs',
      detail: 'Checkmate',
      icon: 'emoji_events',
      winner: marbleWins ? 'w' : 'b'
    };
  }
  if (game.in_stalemate()) return { title: 'Stalemate', detail: 'No legal moves, but no check. A draw.', icon: 'balance', winner: null };
  if (game.insufficient_material()) return { title: 'Draw', detail: 'Insufficient material to checkmate.', icon: 'balance', winner: null };
  if (game.in_threefold_repetition()) return { title: 'Draw', detail: 'Threefold repetition.', icon: 'balance', winner: null };
  if (game.in_draw()) return { title: 'Draw', detail: 'Fifty-move rule.', icon: 'balance', winner: null };
  return null;
}

function checkGameEndOrTriggerAI() {
  const result = getGameResult();
  if (result) {
    playSound(result.winner ? 'check' : 'select');
    showBattleBanner(`${result.title} — ${result.detail}`, result.icon, true);
    gameOverShownAt = game.history().length;
    setTimeout(() => {
      if (gameOverShownAt === game.history().length && game.game_over()) showGameOverModal(result);
    }, 1100);
    return;
  }
  if (game.in_check()) {
    showBattleBanner(`${game.turn() === 'w' ? 'Marble' : 'Obsidian'} King is in Check!`, 'warning');
    playSound('check');
  }
  maybeStartAI();
}

function maybeStartAI() {
  if (settings.mode !== 'ai' || game.turn() !== 'b' || game.game_over()) return;
  if (activeMoveAnimation || pendingPromotionMove || isAIThinking) return;
  isAIThinking = true;
  updateHUD();
  const startedAt = performance.now();
  requestEngineMove(DIFFICULTY[settings.difficulty] || DIFFICULTY.normal, move => {
    // Feel like the automaton is "thinking" even when the engine answers instantly.
    const wait = Math.max(0, 550 - (performance.now() - startedAt));
    const requestId = latestEngineRequest;
    setTimeout(() => {
      if (requestId !== latestEngineRequest) return; // cancelled meanwhile
      isAIThinking = false;
      if (!move || game.game_over() || game.turn() !== 'b' || settings.mode !== 'ai') {
        updateHUD();
        return;
      }
      initiateMove(move.from, move.to, move.promotion || 'q');
    }, wait);
  });
}

/** Spell Hint: highlight the engine's preferred move for the side to move. */
function requestHint() {
  if (activeMoveAnimation || isAIThinking || isHintThinking || game.game_over() || pendingPromotionMove) return;
  if (settings.mode === 'ai' && game.turn() === 'b') return;
  isHintThinking = true;
  showBattleBanner('The wizard guide is divining…', 'auto_fix_high', true);
  requestEngineMove(HINT_OPTS, move => {
    isHintThinking = false;
    if (!move || game.game_over()) return;
    hintMove = { from: move.from, to: move.to };
    selectedSquare = move.from;
    legalMovesForSelected = game.moves({ square: move.from, verbose: true });
    refreshHighlights();
    const piece = game.get(move.from);
    showBattleBanner(
      `Spell Hint: ${getPieceName(piece.type)} ${move.from.toUpperCase()} → ${move.to.toUpperCase()}`,
      'auto_fix_high'
    );
    playSound('select');
  });
}

/*************************************************************************
 * SETTINGS, UNDO, RESET
 *************************************************************************/
function setGameMode(mode) {
  if (settings.mode === mode) return;
  settings.mode = mode;
  cancelEngine();
  clearSelection();
  syncModeUI();
  saveState();
  showBattleBanner(mode === 'ai' ? 'Mode: vs Cathedral Automaton (AI)' : 'Mode: Two-Player Pass & Play', 'tune');
  updateHUD();
  maybeStartAI();
}

function setDifficulty(level) {
  if (!DIFFICULTY[level]) return;
  settings.difficulty = level;
  syncModeUI();
  saveState();
  showBattleBanner(`Automaton difficulty: ${level[0].toUpperCase() + level.slice(1)}`, 'tune');
}

function undoLastMove() {
  if (activeMoveAnimation || pendingPromotionMove || game.history().length === 0) return;
  cancelEngine();
  game.undo();
  if (settings.mode === 'ai' && game.turn() === 'b') game.undo();
  gameOverShownAt = -1;
  hideGameOverModal();
  syncFullBoardFromEngine();
  saveState();
  showBattleBanner('Chronicle Rewound', 'undo');
  maybeStartAI();
}

function resetGame() {
  cancelEngine();
  activeMoveAnimation = null;
  pendingPromotionMove = null;
  openPromotionModal(false);
  hideGameOverModal();
  game.reset();
  gameOverShownAt = -1;
  syncFullBoardFromEngine();
  saveState();
  showBattleBanner("New Wizard's Chess Match Begun", 'castle');
}

/*************************************************************************
 * PERSISTENCE (localStorage; silently ignored when unavailable)
 *************************************************************************/
function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      pgn: game.pgn(),
      mode: settings.mode,
      difficulty: settings.difficulty,
      audio: audioEnabled
    }));
  } catch (e) { /* storage unavailable */ }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!saved) return;
    if (saved.mode === 'ai' || saved.mode === 'pass') settings.mode = saved.mode;
    if (DIFFICULTY[saved.difficulty]) settings.difficulty = saved.difficulty;
    if (typeof saved.audio === 'boolean') audioEnabled = saved.audio;
    if (saved.pgn && !game.load_pgn(saved.pgn)) game.reset();
  } catch (e) {
    game.reset();
  }
}
