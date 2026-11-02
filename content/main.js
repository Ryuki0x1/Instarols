/* main.js — boot: build the shell before controls mount into it. */
(() => {
  const Instarols = window.Instarols;

  function boot() {
    if (!Instarols?.tracker || !Instarols?.ui?.boot) return; // load-order guard
    Instarols.tracker.init();
    Instarols.ui.boot();
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
