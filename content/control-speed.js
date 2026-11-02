/* control-speed.js — 0.25×–2× menu; selected speed persists as the default
   for future reels (chrome.storage.local via Instarols.settings). */
(() => {
  const Instarols = window.Instarols;
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  let btn = null;
  let menu = null;
  let video = null;
  let off = null;

  function label(rate) {
    return `${rate}×`;
  }

  function renderMenu(activeRate) {
    for (const item of menu.children) {
      const rate = Number(item.dataset.rate);
      item.classList.toggle('active', rate === activeRate);
      item.setAttribute('aria-checked', String(rate === activeRate));
    }
  }

  function sync() {
    if (!video) return;
    const rate = video.playbackRate;
    btn.textContent = label(rate);
    renderMenu(rate);
  }

  function apply(rate) {
    if (video) video.playbackRate = rate;
    Instarols.settings.set({ speed: rate });
    sync();
  }

  function openMenu() {
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  function onDocClick(e) {
    if (!menu.classList.contains('open')) return;
    const inOurMenu = e.composedPath().includes(menu) || e.composedPath().includes(btn);
    if (!inOurMenu) closeMenu();
  }

  Instarols.ui.registerControl({
    id: 'speed',
    mount(row) {
      btn = document.createElement('button');
      btn.className = 'icon-btn speed-btn';
      btn.type = 'button';
      btn.textContent = '1×';
      btn.title = 'Playback speed';
      btn.setAttribute('aria-haspopup', 'menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', () => {
        if (menu.classList.contains('open')) closeMenu();
        else openMenu();
      });
      row.appendChild(btn);

      const spacer = document.createElement('div');
      spacer.className = 'spacer';
      row.appendChild(spacer);

      menu = document.createElement('div');
      menu.className = 'speed-menu';
      menu.setAttribute('role', 'menu');
      for (const rate of SPEEDS) {
        const item = document.createElement('button');
        item.className = 'speed-item';
        item.type = 'button';
        item.setAttribute('role', 'menuitemradio');
        item.dataset.rate = String(rate);
        item.textContent = label(rate);
        item.addEventListener('click', () => {
          apply(rate);
          closeMenu();
        });
        menu.appendChild(item);
      }
      row.appendChild(menu);
      document.addEventListener('click', onDocClick, true);
    },
    setVideo(v) {
      if (off) off();
      off = null;
      video = v || null;
      closeMenu();
      if (video) {
        /* Apply the persisted default once settings load, unless the user
           (or an IG side effect) already changed the rate meanwhile. */
        Instarols.settings.ready.then(() => {
          if (video === v) {
            const wanted = Instarols.settings.get('speed');
            if (Number.isFinite(wanted) && video.playbackRate !== wanted) {
              video.playbackRate = wanted;
            }
            sync();
          }
        });
        off = Instarols.listen(video, { ratechange: sync });
      }
    },
  });
})();
