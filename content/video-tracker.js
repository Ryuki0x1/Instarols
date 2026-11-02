/* video-tracker.js — find Instagram <video> elements and elect the engaged one.
   Rule (AGENTS.md): never rely on IG-specific class names; generic <video>
   binding + geometry heuristics only, so IG DOM churn can't break us. */
(() => {
  const Instarols = (window.Instarols = window.Instarols || {});

  /* Subscribe a batch of events; returns one cleanup function. */
  Instarols.listen = function (target, handlers) {
    const pairs = Object.entries(handlers);
    for (const [type, fn] of pairs) target.addEventListener(type, fn);
    return () => {
      for (const [type, fn] of pairs) target.removeEventListener(type, fn);
    };
  };

  Instarols.fmtTime = function (secs) {
    if (!Number.isFinite(secs) || secs < 0) secs = 0;
    secs = Math.floor(secs);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return (
      (h ? h + ':' + String(m).padStart(2, '0') : String(m)) +
      ':' +
      String(s).padStart(2, '0')
    );
  };

  const tracker = {
    active: null,
    _cbs: [],

    onChange(cb) {
      this._cbs.push(cb);
    },

    init() {
      /* Rescans are cheap (a few getBoundingClientRect); throttle by frame. */
      const rescan = throttleFrame(() => this._elect(), this);
      const mo = new MutationObserver(rescan);
      mo.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('scroll', rescan, { capture: true, passive: true });
      window.addEventListener('resize', rescan);
      this._elect();
    },

    _elect() {
      const next = pickEngagedVideo();
      if (next === this.active) return;
      const prev = this.active;
      this.active = next;
      for (const cb of this._cbs) cb(next, prev);
    },
  };

  function pickEngagedVideo() {
    const inReels = location.pathname.startsWith('/reels/'); // includes view during transition
    const inFeed = location.pathname === '/'; // home feed full-height reels
    const vh = innerHeight;
    const vw = innerWidth;
    let best = null;
    let bestScore = 0;

    for (const video of document.querySelectorAll('video')) {
      const r = video.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) continue;

      /* Visible portion of the video within the viewport. */
      const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      const visW = Math.min(r.right, vw) - Math.max(r.left, 0);
      if (visH <= 0 || visW <= 0) continue;
      const ratio = (visH * visW) / (vh * vw);
      if (ratio < 0.1) continue;

      /* Explore/search grid tiles and other small previews are never the
         engaged reel — only dialog viewers or tall reel surfaces qualify. */
      const inDialog = !!video.closest('[role="dialog"]');
      const tallEnough = r.height > vh * 0.55;
      if (!tallEnough && !inDialog) continue;

      let score = ratio + (inDialog ? 2 : 0);
      if ((inReels || inFeed) && tallEnough) score += 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = video;
      }
    }
    return best;
  }

  function throttleFrame(fn, self) {
    let queued = false;
    return (...args) => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        fn.apply(self, args);
      });
    };
  }

  Instarols.tracker = tracker;
})();
