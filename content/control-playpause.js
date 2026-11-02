/* control-playpause.js — play/pause button that mirrors real video state
   (listens to play/pause/ended, never assumes). */
(() => {
  const Instarols = window.Instarols;
  let btn = null;
  let video = null;
  let off = null;

  function sync() {
    if (!video) return;
    btn.classList.toggle('is-paused', video.paused);
    const paused = video.paused;
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
