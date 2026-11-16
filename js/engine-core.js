'use strict';
/*
 * Wizard's Chess engine: negamax + alpha-beta, iterative deepening, quiescence,
 * piece-square tables. Runs inside js/engine-worker.js (preferred) or on the
 * main thread as a fallback. Needs the patched vendor/chess.js (`_raw` API).
 */
(function (root) {
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const MATE = 100000;
  const INF = 1e9;

  // Piece-square tables from White's point of view; row 0 = rank 8.
  const PST = {
    p: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    n: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    b: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    r: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    q: [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    k: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20]
    ],
    kEnd: [
      [-50, -40, -30, -20, -20, -30, -40, -50],
      [-30, -20, -10, 0, 0, -10, -20, -30],
      [-30, -10, 20, 30, 30, 20, -10, -30],
      [-30, -10, 30, 40, 40, 30, -10, -30],
      [-30, -10, 30, 40, 40, 30, -10, -30],
      [-30, -10, 20, 30, 30, 20, -10, -30],
      [-30, -30, 0, 0, 0, 0, -30, -30],
      [-50, -30, -30, -30, -30, -30, -30, -50]
    ]
  };

  // Static evaluation in centipawns from the side-to-move's point of view.
  function evaluate(raw, turn) {
    const b = raw.board();
    let score = 0;
    let wMajor = 0, bMajor = 0;
    let wk = -1, bk = -1;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const i = r * 16 + f;
        const p = b[i];
        if (!p) continue;
        if (p.type === 'k') {
          if (p.color === 'w') wk = i; else bk = i;
          continue;
        }
        const white = p.color === 'w';
        const row = white ? r : 7 - r;
        const v = VAL[p.type] + PST[p.type][row][f];
        if (white) score += v; else score -= v;
        if (p.type !== 'p') { if (white) wMajor += VAL[p.type]; else bMajor += VAL[p.type]; }
      }
    }
    const endgame = wMajor <= 1300 && bMajor <= 1300;
    const kt = endgame ? PST.kEnd : PST.k;
    if (wk >= 0) score += kt[wk >> 4][wk & 15];
    if (bk >= 0) score -= kt[7 - (bk >> 4)][bk & 15];
    return turn === 'w' ? score : -score;
  }

  function orderScore(m, BITS) {
    let s = 0;
    if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece] + 1000;
    if (m.flags & BITS.PROMOTION) s += 800;
    return s;
  }

  function sortMoves(moves, BITS) {
    const scored = moves.map(m => ({ m, s: orderScore(m, BITS) }));
    scored.sort((a, b) => b.s - a.s);
    for (let i = 0; i < moves.length; i++) moves[i] = scored[i].m;
    return moves;
  }

  function otherColor(c) { return c === 'w' ? 'b' : 'w'; }

  function quiesce(chess, raw, turn, alpha, beta, ply, qd, ctx) {
    ctx.nodes++;
    if ((ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) ctx.aborted = true;
    if (ctx.aborted) return 0;
    const stand = evaluate(raw, turn);
    if (qd <= 0) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const BITS = raw.BITS;
    const moves = raw.moves().filter(m => m.captured || (m.flags & BITS.PROMOTION));
    sortMoves(moves, BITS);
    for (const m of moves) {
      raw.make(m);
      const score = -quiesce(chess, raw, otherColor(turn), -beta, -alpha, ply + 1, qd - 1, ctx);
      raw.undo();
      if (ctx.aborted) return 0;
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(chess, raw, turn, depth, alpha, beta, ply, ctx) {
    ctx.nodes++;
    if ((ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) ctx.aborted = true;
    if (ctx.aborted) return 0;
    const moves = raw.moves();
    if (moves.length === 0) return chess.in_check() ? -MATE + ply : 0;
    if (depth <= 0) return quiesce(chess, raw, turn, alpha, beta, ply, 4, ctx);
    sortMoves(moves, raw.BITS);
    let best = -INF;
    for (const m of moves) {
      raw.make(m);
      const score = -negamax(chess, raw, otherColor(turn), depth - 1, -beta, -alpha, ply + 1, ctx);
      raw.undo();
      if (ctx.aborted) return 0;
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  function toMove(raw, m) {
    const out = { from: raw.algebraic(m.from), to: raw.algebraic(m.to) };
    if (m.promotion) out.promotion = m.promotion;
    return out;
  }

  /**
   * @param {string} fen
   * @param {{maxDepth:number,timeMs:number,noise:number}} opts
   * @returns {{from:string,to:string,promotion?:string}|null}
   */
  function findBestMove(fen, opts) {
    const o = Object.assign({ maxDepth: 3, timeMs: 1500, noise: 0 }, opts);
    const chess = new Chess(fen);
    const raw = chess._raw;
    const turn = chess.turn();
    let rootMoves = raw.moves();
    if (rootMoves.length === 0) return null;
    if (rootMoves.length === 1) return toMove(raw, rootMoves[0]);

    sortMoves(rootMoves, raw.BITS);
    const ctx = { nodes: 0, aborted: false, deadline: Date.now() + o.timeMs };
    let result = null;

    for (let depth = 1; depth <= o.maxDepth; depth++) {
      const scored = [];
      let best = -INF;
      for (const m of rootMoves) {
        raw.make(m);
        const alpha = best === -INF ? -INF : best - o.noise;
        const score = -negamax(chess, raw, otherColor(turn), depth - 1, -INF, -alpha, 1, ctx);
        raw.undo();
        if (ctx.aborted) break;
        scored.push({ m, score });
        if (score > best) best = score;
      }
      if (ctx.aborted) break; // discard the unfinished iteration
      const candidates = scored.filter(s => s.score >= best - o.noise);
      const pick = o.noise > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : scored.find(s => s.score === best);
      result = pick.m;
      // search the best move first next iteration
      scored.sort((a, b) => b.score - a.score);
      rootMoves = scored.map(s => s.m);
      if (best >= MATE - 100) break;
    }
    if (!result) result = rootMoves[0];
    return toMove(raw, result);
  }

  root.WizardEngine = { findBestMove, evaluate };
})(typeof self !== 'undefined' ? self : this);
