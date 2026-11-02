/* control-volume.js — mute toggle + 0–100% slider. Persists last volume in
   chrome.storage.local so it survives reloads; IG's native mute stays usable. */
(() => {
  const Instarols = window.Instarols;
  let btn = null;
  let slider = null;
  let video = null;
  let off = null;

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
    const volSvg = btn.querySelector('.vol-icon');
    const muteSvg = btn.querySelector('.mute-icon');
    if (volSvg) volSvg.style.display = muted ? 'none' : 'block';
    if (muteSvg) muteSvg.style.display = muted ? 'block' : 'none';
  }

  function sync() {
    syncVolumeSlider();
    syncMute();
  }

  function persist(v) {
    if (Number.isFinite(v) && v >= 0 && v <= 1) {
      Instarols.settings.set({ volume: v });
    }
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
    persist(v);
  }

  function onSliderChange() {
    const v = Number(slider.value);
    if (Number.isFinite(v)) persist(v);
  }

  Instarols.ui.registerControl({
    id: 'volume',
    mount({ row }) {
      btn = document.createElement('button');
      btn.className = 'icon-btn mute';
      btn.type = 'button';
      btn.innerHTML = `
        <svg class="vol-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07M17.12 6.88a3 3 0 0 1 0 4.24M18.36 5.64a1 1 0 0 1 0 1.41"/>
        </svg>
        <svg class="mute-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07M17.12 6.88a3 3 0 0 1 0 4.24M18.36 5.64a1 1 0 0 1 0 1.41"/>
          <line x1="22" y1="2" x2="2" y2="22"/>
        </svg>
      `;
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
      if (!video) return;
      /* Remembered volume survives reloads via chrome.storage.local */
      Instarols.settings.ready.then(() => {
        if (video !== v) return; // guard against stale callbacks
        const remembered = Instarols.settings.get('volume');
        if (Number.isFinite(remembered) && !video.muted) {
          video.volume = Math.min(1, Math.max(0, remembered));
        }
        sync();
      });
      off = Instarols.listen(video, { volumechange: sync });
    },
  });
})();
