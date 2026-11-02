/* ui.js — Instarols overlay shell: shadow-DOM control bar, intent-based
   reveal (pointer approaches video's lower band), responsive layout
   (ResizeObserver-driven frame loop), native-control collision lift, and
   the control registry each feature module plugs into. */
(() => {
  const Instarols = window.Instarols;

  /* ----- persisted settings (chrome.storage.local, guarded when absent) --- */
  const settings = (() => {
    const cache = { speed: 1, volume: null };
    let ready = Promise.resolve();
    try {
      if (chrome?.storage?.local) {
        ready = chrome.storage.local
          .get(Object.keys(cache))
          .then((stored) => Object.assign(cache, stored))
          .catch(() => {});
      }
    } catch {
      /* non-extension context: defaults are fine */
    }
    return {
      ready,
      get: (k) => cache[k],
      set(patch) {
        Object.assign(cache, patch);
        try {
          chrome?.storage?.local?.set(patch);
        } catch {
          /* ignore */
        }
      },
    };
  })();
  Instarols.settings = settings;

  /* ------------------------------------------------------------------ */
  const ui = (Instarols.ui = {
    controls: [],
    registerControl(c) {
      ui.controls.push(c);
    },
  });

  const HIDDEN_Y = '12px';
  let host = null;
  let root = null;
  let bar = null;
  let stripEl = null;
  let rowEl = null;
  let current = null; // active <video>
  let rafId = 0;
  let hidden = true;
  let suppressed = false; // video too small -> never show
  let busy = false; // dragging scrubber / interacting with menu
  let bandEnterAt = 0;
  let showHideTimer = 0;
  let baseBottom = 72; // px above video bottom: clears IG's native audio chip

  const STYLE = `
    :host { all: initial; pointer-events: none; }
    *, *::before, *::after { box-sizing: border-box; }
    .bar {
      position: absolute;
      left: 10px; right: 10px;
      bottom: ${baseBottom}px;
      padding: 6px 8px 6px 10px;
      border-radius: 10px;
      background: rgba(20, 21, 26, 0.88);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 18px rgba(0,0,0,0.45);
      color: #fff;
      font: 500 12px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      user-select: none;
      pointer-events: auto;
      opacity: 1;
      transform: translateY(0);
      transition: opacity 140ms ease, transform 140ms ease;
    }
    .bar.is-hidden {
      opacity: 0;
      transform: translateY(${HIDDEN_Y});
      pointer-events: none;
    }
    .row { display: flex; align-items: center; gap: 4px; }
    .spacer { flex: 1; }
    .icon-btn {
      appearance: none; background: transparent; border: 0; padding: 6px;
      width: 28px; height: 28px; display: inline-flex; align-items: center;
      justify-content: center; cursor: pointer; border-radius: 6px; color: #fff;
    }
    .icon-btn:hover, .icon-btn:focus-visible { background: rgba(255,255,255,0.12); outline: none; }
    .icon-btn:focus-visible { outline: 2px solid #4c8dff; }
    /* play / pause (CSS-drawn, no assets) */
    .icon-btn.play::before, .icon-btn.play::after { content: ''; display: block; background: #fff; border-radius: 2px; }
    .icon-btn.play:not(.is-paused)::before { width: 4px; height: 14px; margin-right: 4px; }
    .icon-btn.play:not(.is-paused)::after  { width: 4px; height: 14px; }
    .icon-btn.play.is-paused::before {
      width: 0; height: 0; margin: 0;
      background: transparent; border: 8px solid transparent; border-left: 13px solid #fff;
      border-right: 0; border-radius: 0; transform: translateX(2px);
    }
    .icon-btn.mute::before, .icon-btn.mute::after { content: ''; background: #fff; display: block; }
    .icon-btn.mute::before { width: 3px; height: 10px; margin-right: 3px; border-radius: 1px; }
    .icon-btn.mute::after  { width: 7px; height: 10px; border-radius: 0 3px 3px 0; }
    .icon-btn.mute.is-muted::after { width: 2px; height: 10px; transform: translateX(4px); }
    .icon-btn.mute.is-muted::before { transform: translateX(4px); }
    .vol {
      appearance: none; -webkit-appearance: none; width: 84px; height: 3px;
      border-radius: 2px; outline: none; cursor: pointer;
      background-image: linear-gradient(#fff, #fff),
        linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3));
      background-size: var(--fill, 50%) 100%, 100% 100%;
      background-repeat: no-repeat;
    }
    .vol::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #fff; }
    .time { white-space: nowrap; font-variant-numeric: tabular-nums; opacity: 0.9; margin: 0 6px 0 4px; }
    .speed-btn { width: auto; min-width: 40px; padding: 6px 8px; font-weight: 600; }
    .speed-menu {
      position: absolute; right: 8px; bottom: calc(100% + 8px);
      background: rgba(20,21,26,0.95); border-radius: 10px; padding: 4px;
      display: none; flex-direction: column; min-width: 64px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.5);
    }
    .speed-menu.open { display: flex; }
    .speed-item { appearance: none; background: transparent; border: 0; color: #fff;
      text-align: right; padding: 7px 10px; border-radius: 6px; cursor: pointer; font: inherit; }
    .speed-item:hover { background: rgba(255,255,255,0.12); }
    .speed-item.active { color: #4c8dff; font-weight: 700; }
    /* compact: video < ~430px wide -> drop slider + time text */
    .bar.compact .vol, .bar.compact .time { display: none; }
    /* timeline (control-scrubber.js) */
    .scrub-row { position: relative; display: flex; align-items: center; gap: 8px; padding: 2px 0 6px; }
    .scrub {
      position: relative; flex: 1; height: 5px; border-radius: 3px;
      background: rgba(255, 255, 255, 0.28); cursor: pointer; touch-action: none;
    }
    .buffered, .fill { position: absolute; top: 0; bottom: 0; left: 0; width: 0; border-radius: 3px; }
    .buffered { background: rgba(255, 255, 255, 0.4); }
    .fill { background: #4c8dff; }
    .thumb {
      position: absolute; top: 50%; left: 0; width: 12px; height: 12px;
      border-radius: 50%; background: #4c8dff; transform: translate(-50%, -50%);
      opacity: 0; transition: opacity 100ms ease;
    }
    .scrub:hover .thumb, .scrub:active .thumb, .scrub:focus-visible .thumb { opacity: 1; }
    .scrub:focus-visible { outline: 2px solid #4c8dff; outline-offset: 4px; }
    .tooltip {
      position: absolute; bottom: 16px; left: 0; transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85); padding: 3px 6px; border-radius: 5px;
      font-size: 11px; font-variant-numeric: tabular-nums; opacity: 0;
      pointer-events: none; white-space: nowrap; transition: opacity 100ms ease;
    }
    .tooltip.show { opacity: 1; }
  `;

  /* ------------------------------------------------------------------ */

  function build() {
    host = document.createElement('div');
    host.id = 'instarols-host';
    host.style.cssText = 'position:fixed; z-index:2147483646; pointer-events:none;';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style>
      <div class="bar is-hidden">
        <div class="scrub-row"></div>
        <div class="row"></div>
      </div>`;
    bar = root.querySelector('.bar');
    stripEl = root.querySelector('.scrub-row');
    rowEl = root.querySelector('.row');

    /* Keep page gesture handlers (tap-to-pause etc.) out of our controls.
       Bubble-phase stop: our own target handlers already ran, IG's never do. */
    for (const type of ['pointerdown', 'pointerup', 'click', 'dblclick']) {
      bar.addEventListener(type, (e) => e.stopPropagation());
    }
    document.documentElement.appendChild(host);
  }

  /* ---------------- reveal on intent ---------------- */

  function videoRect() {
    return current ? current.getBoundingClientRect() : null;
  }

  function pointerInIntentBand(e) {
    const r = videoRect();
    if (!r) return false;
    const bandTop = Math.min(
      r.bottom,
      r.bottom - Math.max(90, r.height * 0.32)
    );
    const inBand =
      e.clientX >= r.left - 8 &&
      e.clientX <= r.right + 8 &&
      ((e.clientY >= bandTop && e.clientY <= r.bottom + 28) || // lower band
        (e.clientY >= r.top && e.clientY <= bandTop)); // already inside video
    const barR = bar.getBoundingClientRect();
    const inBar =
      e.clientX >= barR.left &&
      e.clientX <= barR.right &&
      e.clientY >= barR.top - 8 &&
      e.clientY <= barR.bottom + 10;
    return inBand || inBar;
  }

  function onPointerMove(e) {
    if (!current || suppressed) {
      if (!hidden && !busy) hideNow();
      return;
    }
    const inBand = pointerInIntentBand(e);
    const now = performance.now();
    if (inBand) {
      if (!bandEnterAt) bandEnterAt = now;
      if (now - bandEnterAt >= 120) showNow();
    } else {
      bandEnterAt = 0;
      if (!hidden && !busy) hideSoon(400);
    }
  }

  function showNow() {
    clearTimeout(showHideTimer);
    bandEnterAt = 0;
    if (!current || suppressed) return;
    if (hidden) {
      frame(); // position from the live rect before the bar becomes visible
      resolveNativeOverlap();
      hidden = false;
      bar.classList.remove('is-hidden');
    }
    if (!rafId && current && !hidden) rafId = requestAnimationFrame(frame);
  }

  function hideSoon(ms) {
    clearTimeout(showHideTimer);
    if (busy) return;
    showHideTimer = setTimeout(hideNow, ms);
  }

  function hideNow() {
    clearTimeout(showHideTimer);
    hidden = true;
    bandEnterAt = 0;
    bar.classList.add('is-hidden');
  }

  /* Stay visible while the pointer rests or the user works the controls. */
  function onPointerStay(e) {
    if (!hidden && !busy && !pointerInIntentBand(e)) hideSoon(400);
  }

  /* ---------------- responsive positioning loop ---------------- */

  function frame() {
    rafId = 0;
    const r = current ? current.getBoundingClientRect() : null;
    if (!r || !r.width || r.bottom < -10 || r.top > innerHeight + 10) {
      hideNow();
      return; // until intent reveals again (responds to live rects)
    }
    host.style.left = `${Math.round(r.left)}px`;
    host.style.top = `${Math.round(r.top)}px`;
    host.style.width = `${Math.round(r.width)}px`;
    host.style.height = `${Math.round(r.height)}px`;
    bar.classList.toggle('compact', r.width < 430);
    const tooSmall = r.width < 260 || r.height < 300;
    if (tooSmall !== suppressed) {
      suppressed = tooSmall;
      if (suppressed) hideNow();
      else showNow();
    }
    if (!hidden && current && !rafId) rafId = requestAnimationFrame(frame);
  }

  /* Lift the bar above any interactive IG widget still inside our band
     (native audio chip, etc.) — never overlap native controls (AGENTS.md). */
  function resolveNativeOverlap() {
    let offset = 0;
    for (let i = 0; i < 4; i++) {
      const r = bar.getBoundingClientRect();
      if (!r.width) break;
      const probeY = r.top + r.height / 2;
      const samples = [r.left + 16, (r.left + r.right) / 2, r.right - 16];
      let foreign = null;
      for (const x of samples) {
        for (const el of document.elementsFromPoint(x, probeY)) {
          if (el === current || (current && current.contains(el))) continue;
          if (el.contains(host) || host.contains(el)) continue;
          const objective =
            el.matches?.('[role="button"],button,a,input,[role="slider"]') ||
            getComputedStyle(el).cursor === 'pointer';
          if (objective) {
            foreign = el;
            break;
          }
        }
        if (foreign) break;
      }
      if (!foreign) break;
      offset += 34;
      bar.style.bottom = `${baseBottom + offset}px`;
    }
  }

  /* ---------------- active video plumbing ---------------- */

  function setActive(video) {
    current = video || null;
    hideNow();
    bar.style.bottom = `${baseBottom}px`;
    for (const c of ui.controls) c.setVideo?.(video);
    if (video && !rafId) rafId = requestAnimationFrame(frame);
  }

  function onScrollCapture() {
    if (!hidden && !busy) hideSoon(150);
  }

  Instarols.ui.boot = function () {
    build();
    const mounted = [];
    for (const c of ui.controls) {
      try {
        c.mount?.({ strip: stripEl, row: rowEl });
        mounted.push(c.id);
      } catch (e) {
        mounted.push(c.id + '!ERR:' + String(e.message || e).slice(0, 80));
      }
    }
    host.dataset.mounted = mounted.join('|');
    Instarols.tracker.onChange(setActive);
    setActive(Instarols.tracker.active);

    document.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('mousemove', onPointerStay, { passive: true });
    document.addEventListener('mouseleave', () => hideNow(), { passive: true });
    window.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });
    window.addEventListener('resize', () => {
      Instarols.tracker.elect();
      if (current) frame();
    });
  };
})();
