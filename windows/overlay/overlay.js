// overlay.js — controls the in-game overlay UI.
// Subscribes to background EventBus and updates the card visually.

(function() {
  const els = {
    card: null,
    statusText: null,
    transcriptRow: null,
    transcript: null,
    responseRow: null,
    response: null,
    imageSlot: null,
    imageEl: null,
    brandDot: null,
  };

  let hideTimer = null;
  let imageShown = false;

  function init() {
    els.card           = document.getElementById('jinto-card');
    els.statusText     = document.getElementById('status-text');
    els.transcriptRow  = document.getElementById('transcript-row');
    els.transcript     = document.getElementById('transcript');
    els.responseRow    = document.getElementById('response-row');
    els.response       = document.getElementById('response');
    els.imageSlot      = document.getElementById('image-slot');
    els.imageEl        = document.getElementById('image-el');
    els.brandDot       = document.querySelector('.brand-dot');
    els.debugText      = document.getElementById('debug-text');

    // Minimal mode: stay hidden by default. Only appears during PTT/answer/done.
    setState('idle', '');
    hideCard();
    debug('overlay ready (hidden)');

    // Resize this window to match the game's actual viewport so CSS top-right anchors correctly.
    resizeToGame();

    // Wire up to background EventBus
    try {
      const main = overwolf.windows.getMainWindow();
      const bus = main && main.jintoEventBus;
      if (!bus) {
        debug('NO EVENT BUS on main window');
        return;
      }
      bus.addListener(handleEvent);
      debug('connected to event bus');
    } catch (err) {
      debug('event bus error: ' + err.message);
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
          overwolf.windows.changePosition(cur.window.id, 0, 0, () => {
            debug('overlay sized ' + w + 'x' + h);
          });
        });
      });
    });
  }

  function debug(msg) {
    if (els.debugText) {
      const t = new Date();
      const ts = t.toTimeString().slice(0, 8);
      els.debugText.textContent = '[' + ts + '] ' + msg;
    }
    console.log('[jinto/overlay]', msg);
  }

  function handleEvent(name, payload) {
    if (name === 'ptt') {
      debug('PTT ' + payload);
      if (payload === 'down') {
        clearHide();
        setState('listening', '');
        els.transcript.textContent = '';
        els.transcriptRow.classList.add('hidden');
        els.responseRow.classList.add('hidden');
        els.imageSlot.classList.add('hidden');
        imageShown = false;
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
      debug('state: ' + payload.label);
      // Auto-hide after jinto finishes. Keep diagrams up longer so the player can study them.
      if (payload.key === 'idle' && (payload.label === 'done' || payload.label === 'no speech' || payload.label === 'heard you')) {
        scheduleHide(imageShown ? 11000 : 4000);
      }
    }

    if (name === 'game-state') {
      const a = payload.agent || '?';
      const m = payload.map || '?';
      debug('game: ' + a + ' / ' + m);
    }

    if (name === 'gep-registered') {
      debug('gep: ' + (payload ? 'registered' : 'failed'));
    }

    if (name === 'show_image') {
      imageShown = true;
      if (payload && payload.src) {
        els.imageEl.src = payload.src;
        els.imageEl.alt = payload.alt || '';
        els.imageSlot.classList.remove('hidden');
      }
    }

    if (name === 'hide_image') {
      els.imageSlot.classList.add('hidden');
    }

    if (name === 'hide_overlay') {
      hideCard();
    }
  }

  function setState(key, label) {
    if (els.statusText) {
      els.statusText.dataset.state = key;
      els.statusText.textContent = label || key;
    }
  }

  function showCard() {
    if (els.card) els.card.classList.remove('hidden');
  }

  function hideCard() {
    if (els.card) els.card.classList.add('hidden');
    clearHide();
  }

  function scheduleHide(ms) {
    clearHide();
    hideTimer = setTimeout(() => hideCard(), ms);
  }

  function clearHide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
