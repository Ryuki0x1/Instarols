/* control-playpause.js — play/pause button that mirrors real video state
   (listens to play/pause/ended, never assumes). SVG-drawn icons. */
(() => {
  const Instarols = window.Instarols;
  let btn = null;
  let video = null;
  let off = null;

  function sync() {
    if (!video) return;
    const paused = video.paused;
    btn.classList.toggle('is-paused', paused);
    btn.querySelector('.play-icon').style.display = paused ? 'block' : 'none';
    btn.querySelector('.pause-icon').style.display = paused ? 'none' : 'block';
    btn.title = paused ? 'Play' : 'Pause';
    btn.setAttribute('aria-label', btn.title);
  }

  function onToggle() {
    if (!video) return;
    if (video.paused) video.play().catch(() => {}); // autoplay-guards may reject
    else video.pause();
  }

  Instarols.ui.registerControl({
    id: 'playpause',
    mount({ row }) {
      btn = document.createElement('button');
      btn.className = 'icon-btn play is-paused';
      btn.type = 'button';
      btn.innerHTML = `
        <svg class="play-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="0">
          <path d="M3.78 2L3 2.41v12l.78.42 9-6V8l-9-6zM4 13.48V3.35l7.6 5.07L4 13.48z"/>
        </svg>
        <svg class="pause-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="0" style="display:none">
          <path d="M4.5 3H6v10H4.5V3zm7 0v10H10V3h1.5z"/>
        </svg>
      `;
      btn.addEventListener('click', onToggle);
      row.appendChild(btn);
    },
    setVideo(v) {
      if (off) off();
      off = null;
      video = v || null;
      if (video) {
        sync();
        off = Instarols.listen(video, { play: sync, pause: sync, ended: sync });
      } else {
        btn?.classList.add('is-paused');
      }
    },
  });
})();
