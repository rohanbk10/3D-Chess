'use strict';
// Web Worker host for the chess engine so the UI never freezes while it thinks.
importScripts('../vendor/chess.js', 'engine-core.js');

self.onmessage = function (e) {
  const { id, fen, opts } = e.data;
  try {
    self.postMessage({ id, move: self.WizardEngine.findBestMove(fen, opts) });
  } catch (err) {
    self.postMessage({ id, move: null, error: String(err) });
  }
};
