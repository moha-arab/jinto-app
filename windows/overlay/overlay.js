// overlay.js — small text card (top-right) + a column of diagrams (top-left, stacks down).
// Multiple diagrams can show at once; they clear when you ask the next question (or after a timeout).

(function() {
  const els = {
    card: null, statusText: null,
    transcriptRow: null, transcript: null,
    responseRow: null, response: null,
    diagrams: null, brandDot: null,
  };

  let cardHideTimer = null;
  let diagramsHideTimer = null;
  const shownIds = new Set(); // dedupe within a single answer
  const DIAGRAMS_MS = 30000;  // how long diagrams linger after the last one

  function init() {
    els.card          = document.getElementById('jinto-card');
    els.statusText    = document.getElementById('status-text');
    els.transcriptRow = document.getElementById('transcript-row');
    els.transcript    = document.getElementById('transcript');
    els.responseRow   = document.getElementById('response-row');
    els.response      = document.getElementById('response');
    els.diagrams      = document.getElementById('jinto-diagrams');
    els.brandDot      = document.querySelector('.brand-dot');

    hideCard();
    clearDiagrams();
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
        // New question — reset card, wipe the diagram column from the last answer.
        clearCardHide();
        setState('listening', '');
        els.transcript.textContent = '';
        els.transcriptRow.classList.add('hidden');
        els.responseRow.classList.add('hidden');
        clearDiagrams();
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
      if (payload && payload.src) addDiagram(payload.src, payload.alt || '', payload.caption || '');
    }

    if (name === 'hide_image') clearDiagrams();
    if (name === 'hide_overlay') { hideCard(); clearDiagrams(); }
  }

  // ---- diagram column ----

  function addDiagram(src, id, caption) {
    if (!els.diagrams) return;
    if (id && shownIds.has(id)) return; // already showing this one this turn
    if (id) shownIds.add(id);

    const card = document.createElement('div');
    card.className = 'diagram-card';

    const img = document.createElement('img');
    img.src = src;
    img.alt = id || '';
    card.appendChild(img);

    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.textContent = caption || captionFromId(id);
    card.appendChild(cap);

    els.diagrams.appendChild(card);

    // restart the linger timer each time a new diagram arrives
    if (diagramsHideTimer) clearTimeout(diagramsHideTimer);
    diagramsHideTimer = setTimeout(clearDiagrams, DIAGRAMS_MS);
  }

  function clearDiagrams() {
    if (els.diagrams) els.diagrams.innerHTML = '';
    shownIds.clear();
    if (diagramsHideTimer) { clearTimeout(diagramsHideTimer); diagramsHideTimer = null; }
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
