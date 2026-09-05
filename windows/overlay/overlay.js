// overlay.js — the in-game text card (top-right). Voice-only MVP: no gallery, no images.
// Shows listening state, the player's transcript, and jinto's streaming answer, then fades.

(function() {
  const els = {
    card: null, statusText: null,
    transcriptRow: null, transcript: null,
    responseRow: null, response: null,
  };

  let cardHideTimer = null;

  function init() {
    els.card          = document.getElementById('jinto-card');
    els.statusText    = document.getElementById('status-text');
    els.transcriptRow = document.getElementById('transcript-row');
    els.transcript    = document.getElementById('transcript');
    els.responseRow   = document.getElementById('response-row');
    els.response      = document.getElementById('response');

    hideCard();
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
        resetMicBars();
        els.transcript.textContent = '';
        els.transcriptRow.classList.add('hidden');
        els.responseRow.classList.add('hidden');
        showCard();
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

    if (name === 'mic-level') {
      updateMicBars(payload);
    }

    if (name === 'hide_overlay') {
      hideCard();
    }
  }

  // Reactive wave: while listening, the three bars follow real mic loudness. Flat bars while
  // you talk = the mic isn't reaching jinto. Clears back to the CSS animation otherwise.
  const MIC_MULT = [0.72, 1, 0.82];
  function updateMicBars(level) {
    if (!els.card || els.card.dataset.state !== 'listening') return;
    els.card.dataset.mic = '1';
    const bars = els.card.querySelectorAll('.voice i');
    bars.forEach((b, i) => { b.style.height = (3 + level * 15 * MIC_MULT[i]).toFixed(1) + 'px'; });
  }
  function resetMicBars() {
    if (!els.card) return;
    els.card.removeAttribute('data-mic');
    els.card.querySelectorAll('.voice i').forEach((b) => { b.style.height = ''; });
  }

  function setState(key, label) {
    if (els.card) {
      els.card.dataset.state = key; // drives the voice bars animation
      if (key !== 'listening') resetMicBars(); // hand thinking/speaking back to CSS
    }
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
