'use strict';
/* Tiny non-deferred helpers: loading overlay + friendly fatal errors. */
function showFatalError(message) {
  const text = document.getElementById('loading-text');
  const overlay = document.getElementById('loading');
  if (!text || !overlay) return;
  overlay.style.display = 'flex';
  text.textContent = message;
  text.className = 'text-sm text-md-danger max-w-md leading-relaxed';
}

function hideLoading() {
  const overlay = document.getElementById('loading');
  if (overlay) overlay.remove();
}

window.addEventListener('error', e => {
  // Only surface script errors while the game is still starting up.
  if (document.getElementById('loading')) {
    showFatalError('Something went wrong while loading the game. Please refresh the page. (' + (e.message || 'unknown error') + ')');
  }
});
