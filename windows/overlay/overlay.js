// overlay.js — text card (top-right) + a one-at-a-time gallery you cycle with the next-key.
// show_image opens a 1-step gallery; show_setup opens a multi-step gallery; next-diagram advances.

(function() {
  const els = {
    card: null, statusText: null,
    transcriptRow: null, transcript: null,
    responseRow: null, response: null,
    gallery: null, img: null, label: null, count: null, hint: null,
    brandDot: null,
  };

  let cardHideTimer = null;
  let galleryHideTimer = null;
  const GALLERY_MS = 45000; // lingers a while; player usually clears it with the next question

  let steps = [];   // [{label, src|null}]
  let idx = 0;

  function init() {
    els.card          = document.getElementById('jinto-card');
    els.statusText    = document.getElementById('status-text');
    els.transcriptRow = document.getElementById('transcript-row');
    els.transcript    = document.getElementById('transcript');
    els.responseRow   = document.getElementById('response-row');
    els.response      = document.getElementById('response');
    els.gallery       = document.getElementById('jinto-gallery');
    els.img           = document.getElementById('gallery-img');
    els.label         = document.getElementById('gallery-label');
    els.count         = document.getElementById('gallery-count');
    els.hint          = document.getElementById('gallery-hint');
    els.brandDot      = document.querySelector('.brand-dot');

    hideCard();
    clearGallery();
    setState('idle', '');

    resizeToGame();

    try {
      const main = overwolf.windows.getMainWindow();
      const bus = main && main.jintoEventBus;
      if (bus) bus.addListener(handleEvent);
      else console.warn('[jinto/overlay] no event bus');
    } catch (err) {
      console.error('[jinto/overlay] bus wiring failed', err);
    }
  }

  function resizeToGame() {
    overwolf.games.getRunningGameInfo((gameInfo) => {
      if (!gameInfo || !gameInfo.isRunning) return;
      const w = gameInfo.logicalWidth || gameInfo.width;
      const h = gameInfo.logicalHeight || gameInfo.height;
      if (!w || !h) return;
      overwolf.windows.getCurrentWindow((cur) => {
        if (!cur || !cur.success || !cur.window) return;
        overwolf.windows.changeSize(cur.window.id, w, h, () => {
          overwolf.windows.changePosition(cur.window.id, 0, 0, () => {});
        });
      });
    });
  }

  function handleEvent(name, payload) {
    if (name === 'ptt') {
      if (payload === 'down') {
        clearCardHide();
        setState('listening', '');
        els.transcript.textContent = '';
        els.transcriptRow.classList.add('hidden');
        els.responseRow.classList.add('hidden');
        clearGallery();          // new question wipes the old gallery
        showCard();
        els.brandDot.classList.add('pulse');
      } else if (payload === 'up') {
        els.brandDot.classList.remove('pulse');
      }
    }

    if (name === 'transcript') {
      els.transcript.textContent = payload || '';
      els.transcriptRow.classList.remove('hidden');
    }

    if (name === 'response') {
      els.response.textContent = payload || '';
      els.responseRow.classList.remove('hidden');
    }

    if (name === 'state') {
      setState(payload.key, payload.label);
      if (payload.key === 'idle' && (payload.label === 'done' || payload.label === 'no speech' || payload.label === 'heard you')) {
        scheduleCardHide(4500);
      }
    }

    if (name === 'show_image') {
      if (payload && payload.src) {
        openGallery([{ label: payload.caption || captionFromId(payload.alt || ''), src: payload.src }]);
      }
    }

    if (name === 'show_setup') {
      if (payload && payload.steps && payload.steps.length) {
        openGallery(payload.steps);
      }
    }

    if (name === 'next-diagram') {
      advanceGallery();
    }

    if (name === 'hide_image' || name === 'hide_overlay') {
      clearGallery();
      if (name === 'hide_overlay') hideCard();
    }
  }

  // ---- gallery ----

  function openGallery(newSteps) {
    steps = newSteps || [];
    idx = 0;
    renderStep();
    if (els.gallery) els.gallery.classList.remove('hidden');
    if (galleryHideTimer) clearTimeout(galleryHideTimer);
    galleryHideTimer = setTimeout(clearGallery, GALLERY_MS);
  }

  function advanceGallery() {
    if (!steps.length) return;
    idx = (idx + 1) % steps.length;
    renderStep();
    if (galleryHideTimer) clearTimeout(galleryHideTimer);
    galleryHideTimer = setTimeout(clearGallery, GALLERY_MS);
  }

  function renderStep() {
    const step = steps[idx];
    if (!step) return;

    if (step.src) {
      els.img.src = step.src;
      els.img.classList.remove('hidden');
    } else {
      els.img.removeAttribute('src');
      els.img.classList.add('hidden');
    }

    els.label.textContent = step.label || '';

    if (steps.length > 1) {
      els.count.textContent = (idx + 1) + ' / ' + steps.length;
      els.hint.classList.remove('hidden');
    } else {
      els.count.textContent = '';
      els.hint.classList.add('hidden');
    }
  }

  function clearGallery() {
    steps = [];
    idx = 0;
    if (els.gallery) els.gallery.classList.add('hidden');
    if (els.img) { els.img.removeAttribute('src'); els.img.classList.add('hidden'); }
    if (els.label) els.label.textContent = '';
    if (els.count) els.count.textContent = '';
    if (els.hint) els.hint.classList.add('hidden');
    if (galleryHideTimer) { clearTimeout(galleryHideTimer); galleryHideTimer = null; }
  }

  function captionFromId(id) {
    if (!id) return '';
    return id.replace(/^killjoy-ascent-/, '').replace(/^viper-breeze-/, '').replace(/-/g, ' ').trim();
  }

  // ---- text card ----

  function setState(key, label) {
    if (els.statusText) {
      els.statusText.dataset.state = key;
      els.statusText.textContent = label || key;
    }
  }
  function showCard() { if (els.card) els.card.classList.remove('hidden'); }
  function hideCard() { if (els.card) els.card.classList.add('hidden'); clearCardHide(); }
  function scheduleCardHide(ms) { clearCardHide(); cardHideTimer = setTimeout(hideCard, ms); }
  function clearCardHide() { if (cardHideTimer) { clearTimeout(cardHideTimer); cardHideTimer = null; } }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
