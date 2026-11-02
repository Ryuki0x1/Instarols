/* control-volume.js — mute toggle + 0–100% slider. Persists last volume in
   chrome.storage.local so it survives reloads AND reel-to-reel scrolling.
   IG's native mute stays usable. */
(() => {
  const Instarols = window.Instarols;
  let btn = null;
  let slider = null;
  let video = null;
  let off = null;
  let persistTimer = null;

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

  function schedulePersist() {
    if (!video) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => persist(video.volume), 400);
  }

  function applyRemembered() {
    if (!video) return;
    Instarols.settings.ready.then(() => {
      if (video === null) return;
      const remembered = Instarols.settings.get('volume');
      if (Number.isFinite(remembered)) {
        video.volume = Math.min(1, Math.max(0, remembered));
        if (video.muted && remembered > 0) video.muted = false;
      }
      sync();
    });
  }

  function onMuteToggle() {
    if (!video) return;
    if (video.muted || video.volume === 0) {
      Instarols.settings.ready.then(() => {
        if (video === null) return;
        const remembered = Instarols.settings.get('volume');
        const target = Number.isFinite(remembered) && remembered > 0 ? remembered : 0.5;
        video.volume = target;
        video.muted = false;
        sync();
        persist(target);
      });
    } else {
      video.muted = true;
      sync();
      persist(0);
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
    syncMute();
    schedulePersist();
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
        <svg class="vol-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="0">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 4.83h2.79L8.15 1l.85.35v13l-.85.33-3.86-3.85H1.5l-.5-.5v-5l.5-.5zM4.85 10L8 13.14V2.56L4.85 5.68l-.35.15H2v4h2.5l.35.17zM15 7.83a6.97 6.97 0 0 1-1.578 4.428l-.712-.71A5.975 5.975 0 0 0 14 7.83c0-1.4-.48-2.689-1.284-3.71l.712-.71A6.971 6.971 0 0 1 15 7.83zm-2 0a4.978 4.978 0 0 1-1.002 3.004l-.716-.716A3.982 3.982 0 0 0 12 7.83a3.98 3.98 0 0 0-.713-2.28l.716-.716c.626.835.997 1.872.997 2.996zm-2 0c0 .574-.16 1.11-.44 1.566l-.739-.738a1.993 1.993 0 0 0 .005-1.647l.739-.739c.276.454.435.988.435 1.558z"/>
        </svg>
        <svg class="mute-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="0" style="display:none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M1.5 5h2.79l3.86-3.83.85.35v13l-.85.33L4.29 11H1.5l-.5-.5v-5l.5-.5zm3.35 5.17L8 13.31V2.73L4.85 5.85 4.5 6H2v4h2.5l.35.17zm9.381-4.108l.707.707L13.207 8.5l1.731 1.732-.707.707L12.5 9.207l-1.732 1.732-.707-.707L11.793 8.5 10.06 6.77l.707-.707 1.733 1.73 1.731-1.731z"/>
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
      /* Remembered volume survives reloads AND reel-to-reel scrolling */
      applyRemembered();
      off = Instarols.listen(video, {
        volumechange: () => {
          sync();
          schedulePersist();
        },
      });
    },
  });
})();
