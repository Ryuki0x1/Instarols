/* control-scrubber.js — YouTube-style timeline: buffered range, drag preview
   (commit on release — seeking per-frame is hostile to video streams),
   hover tooltip with tabular time, and a current/total readout. */
(() => {
  const Instarols = window.Instarols;
  let video = null;
  let off = null;
  let rafLoop = 0;
  let dragging = false;
  let hoverPct = null;
  let track = null;
  let bufferedEl = null;
  let fillEl = null;
  let thumbEl = null;
  let tooltipEl = null;
  let timeEl = null;

  function duration() {
    const d = video?.duration;
    return Number.isFinite(d) && d > 0 ? d : 0;
  }

  function pctFromEvent(e) {
    const r = track.getBoundingClientRect();
    if (!r.width) return 0;
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }

  function render() {
    if (!video) return;
    const d = duration();
    const t = video.currentTime || 0;
    const pct = d ? t / d : 0;
    fillEl.style.width = `${pct * 100}%`;
    thumbEl.style.left = `${pct * 100}%`;

    /* buffered: end of the furthest range containing the playhead */
    let bufferedEnd = 0;
    const b = video.buffered;
    for (let i = b.length - 1; i >= 0; i--) {
      if (t >= b.start(i) && t <= b.end(i)) {
        bufferedEnd = b.end(i);
        break;
      }
    }
    if (!bufferedEnd && b.length) bufferedEnd = b.end(b.length - 1);
    const bpct = d ? Math.min(1, bufferedEnd / d) : 0;
    bufferedEl.style.width = `${bpct * 100}%`;

    if (hoverPct !== null) {
      tooltipEl.style.left = `${hoverPct * 100}%`;
      tooltipEl.textContent = Instarols.fmtTime(hoverPct * d);
      tooltipEl.classList.add('show');
    } else {
      tooltipEl.classList.remove('show');
    }
    timeEl.textContent = `${Instarols.fmtTime(t)} / ${Instarols.fmtTime(d)}`;
  }

  /* smooth updates at 60fps while playing (timeupdate is only ~4Hz) */
  function playLoop() {
    rafLoop = 0;
    render();
    if (video && !video.paused && !video.ended) {
      rafLoop = requestAnimationFrame(playLoop);
    }
  }
  function ensureLoop() {
    if (!rafLoop && video && !video.paused) rafLoop = requestAnimationFrame(playLoop);
  }

  function onPointerDown(e) {
    if (!video) return;
    dragging = true;
    track.setPointerCapture(e.pointerId);
    preview(pctFromEvent(e));
  }

  function onPointerMove(e) {
    if (!video) return;
    const pct = pctFromEvent(e);
    if (dragging) preview(pct);
    else hoverPct = pct;
    render();
  }

  function onPointerUp(e) {
    if (!video) return;
    if (dragging) {
      dragging = false;
      try {
        track.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
      video.currentTime = pctFromEvent(e) * duration();
      ensureLoop();
    }
  }

  function onPointerLeave() {
    hoverPct = null;
    render();
  }

  /* preview = visual only (AGENTS.md: commit on release) */
  function preview(pct) {
    const d = duration();
    fillEl.style.width = `${pct * 100}%`;
    thumbEl.style.left = `${pct * 100}%`;
    tooltipEl.style.left = `${pct * 100}%`;
    tooltipEl.textContent = Instarols.fmtTime(pct * d);
    tooltipEl.classList.add('show');
  }

  Instarols.ui.registerControl({
    id: 'scrubber',
    mount(strip) {
      track = document.createElement('div');
      track.className = 'scrub';
      track.setAttribute('role', 'slider');
      track.setAttribute('aria-label', 'Timeline');
      track.setAttribute('tabindex', '0');
      track.innerHTML = `
        <div class="buffered"></div>
        <div class="fill"></div>
        <div class="thumb"></div>
        <div class="tooltip"></div>
      `;
      bufferedEl = track.querySelector('.buffered');
      fillEl = track.querySelector('.fill');
      thumbEl = track.querySelector('.thumb');
      tooltipEl = track.querySelector('.tooltip');
      track.addEventListener('pointerdown', onPointerDown);
      track.addEventListener('pointermove', onPointerMove);
      track.addEventListener('pointerup', onPointerUp);
      track.addEventListener('pointercancel', onPointerUp);
      track.addEventListener('pointerleave', onPointerLeave);
      strip.appendChild(track);

      timeEl = document.createElement('span');
      timeEl.className = 'time';
      timeEl.textContent = '0:00 / 0:00';
      strip.appendChild(timeEl);
    },
    setVideo(v) {
      if (off) off();
      off = null;
      if (rafLoop) cancelAnimationFrame(rafLoop);
      rafLoop = 0;
      video = v || null;
      dragging = false;
      hoverPct = null;
      if (video) {
        const swapped = () => {
          if (video === v) render();
        };
        off = Instarols.listen(video, {
          timeupdate: ensureLoop,
          progress: render,
          loadedmetadata: swapped,
          durationchange: swapped,
          play: () => {
            syncDragCommitted();
            ensureLoop();
          },
          pause: render,
          ended: render,
          seeking: render,
        });
        ensureLoop();
      }
      if (timeEl) timeEl.textContent = '0:00 / 0:00';
      if (fillEl) fillEl.style.width = '0%';
    },
  });

  function syncDragCommitted() {
    /* after play resumes, the drag state is definitely committed */
    if (!dragging) render();
  }
})();
