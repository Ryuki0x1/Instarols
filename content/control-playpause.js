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
        <svg class="play-icon" viewBox="0 0 24 24" width="20" height="20" fill="#fff">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg class="pause-icon" viewBox="0 0 24 24" width="20" height="20" fill="#fff" style="display:none">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
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
