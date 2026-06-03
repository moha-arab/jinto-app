// overlay.js — controls the in-game overlay.
// Small text card (top-right) + big diagram panel (right-center), managed independently.

(function() {
  const els = {
    card: null, statusText: null,
    transcriptRow: null, transcript: null,
    responseRow: null, response: null,
    diagram: null, imageEl: null, imageCaption: null,
    brandDot: null, debugText: null,
  };

  let cardHideTimer = null;
  let diagramHideTimer = null;

  // Diagram stays up long enough to study while you walk to the spot, then fades.
  const DIAGRAM_MS = 30000;

  function init() {
    els.card          = document.getElementById('jinto-card');
    els.statusText    = document.getElementById('status-text');
    els.transcriptRow = document.getElementById('transcript-row');
    els.transcript    = document.getElementById('transcript');
    els.responseRow   = document.getElementById('response-row');
    els.response      = document.getElementById('response');
    els.diagram       = document.getElementById('jinto-diagram');
    els.imageEl       = document.getElementById('image-el');
    els.imageCaption  = document.getElementById('image-caption');
    els.brandDot      = document.querySelector('.brand-dot');

    hideCard();
    hideDiagram();
    setState('idle', '');

    resizeToGame();

    try {
      const main = overwolf.windows.getMainWindow();
      const bus = main && main.jintoEventBus;
      if (bus) bus.addListener(handleEvent);
      else console.warn('[jinto/overlay] no event bus on main window');
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
        // New question — reset the card, and clear any diagram from the last answer.
        clearCardHide();
        setState('listening', '');
        els.transcript.textContent = '';
        els.transcriptRow.classList.add('hidden');
        els.responseRow.classList.add('hidden');
        hideDiagram();
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
        // Text card fades quickly. The diagram (if any) runs on its own longer timer.
        scheduleCardHide(4500);
      }
    }

    if (name === 'show_image') {
      if (payload && payload.src) {
        els.imageEl.src = payload.src;
        els.imageEl.alt = payload.alt || '';
        els.imageCaption.textContent = payload.caption || captionFromId(payload.alt || '');
        showDiagram();
        scheduleDiagramHide(DIAGRAM_MS);
      }
    }

    if (name === 'hide_image') hideDiagram();
    if (name === 'hide_overlay') { hideCard(); hideDiagram(); }
  }

  function captionFromId(id) {
    if (!id) return '';
    return id
      .replace(/^killjoy-ascent-/, '')
      .replace(/^viper-breeze-/, '')
      .replace(/-/g, ' ')
      .trim();
  }

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

  function showDiagram() { if (els.diagram) els.diagram.classList.remove('hidden'); }
  function hideDiagram() {
    if (els.diagram) els.diagram.classList.add('hidden');
    if (diagramHideTimer) { clearTimeout(diagramHideTimer); diagramHideTimer = null; }
  }
  function scheduleDiagramHide(ms) {
    if (diagramHideTimer) clearTimeout(diagramHideTimer);
    diagramHideTimer = setTimeout(hideDiagram, ms);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
