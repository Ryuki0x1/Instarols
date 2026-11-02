/* control-volume.js — mute toggle + 0–100% slider. Extends IG's native mute
   (which stays reachable — AGENTS.md collision rule); lasts-mounted video
   listeners keep the UI truthful under any external volume change. */
(() => {
  const Instarols = window.Instarols;
  let btn = null;
  let slider = null;
  let video = null;
  let off = null;

  function effectiveVolume() {
    return video ? (video.muted ? 0 : video.volume) : (slider?.value ?? 0);
  }

  function syncVolumeSlider() {
    if (!video) return;
    const v = video.muted ? 0 : video.volume;
    slider.value = String(v);
    slider.style.setProperty('--fill', `${Math.round(v * 100)}%`);
  }

  function syncMute() {
    if (!video) return;
    const muted = video.muted || video.volume === 0;
    btn.classList.toggle('is-muted', muted);
    const label = muted ? 'Unmute' : 'Mute';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  function sync() {
    syncVolumeSlider();
    syncMute();
  }

  function onMuteToggle() {
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.5;
    } else {
      video.muted = true;
    }
  }

  function onSliderInput() {
    if (!video) return;
    const v = Number(slider.value);
    if (Number.isFinite(v)) {
      video.volume = v;
      if (v > 0) video.muted = false;
    }
    slider.style.setProperty('--fill', `${Math.round(v * 100)}%`);
  }

  function onSliderChange() {
    const v = Number(slider.value);
    if (Number.isFinite(v) && video && !video.muted) {
      Instarols.settings.set({ volume: v });
    }
  }

  Instarols.ui.registerControl({
    id: 'volume',
    mount({ row }) {
      btn = document.createElement('button');
      btn.className = 'icon-btn mute';
      btn.type = 'button';
      btn.addEventListener('click', onMuteToggle);
      row.appendChild(btn);

      slider = document.createElement('input');
      slider.className = 'vol';
      slider.type = 'range';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.01';
      slider.setAttribute('aria-label', 'Volume');
      slider.addEventListener('input', onSliderInput);
      slider.addEventListener('change', onSliderChange);
      row.appendChild(slider);
    },
    setVideo(v) {
      if (off) off();
      off = null;
      video = v || null;
      if (video) {
        /* remembered volume (AGENTS.md data model) */
        const remembered = Instarols.settings.get('volume');
        if (Number.isFinite(remembered)) {
          video.volume = Math.min(1, Math.max(0, remembered));
        }
        sync();
        off = Instarols.listen(video, {
          volumechange: sync,
        });
      }
    },
  });
})();
