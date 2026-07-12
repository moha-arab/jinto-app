// desktop.js — the jinto dashboard (Alt+F in-game, or the Overwolf dock on desktop).
// Reads live state from the background controller via overwolf.windows.getMainWindow().

(function() {
  let bg = null;
  let controller = null;

  const $ = (id) => document.getElementById(id);

  function init() {
    try {
      bg = overwolf.windows.getMainWindow();
      controller = bg && bg.jintoController;
    } catch (err) {
      console.error('[desktop] failed to get main window', err);
    }
    if (!controller) {
      $('det-line').textContent = 'background not ready — reopen jinto';
      return;
    }

    initTitlebar();
    initDetection();
    initKnows();
    initLastExchange();
    initMissLog();
    initVoice();
    initConversation();
    initDebug();
  }

  // ---- TITLE BAR (window is chrome-less; hotkeys only fire in-game, so these are the
  // only move/close controls on desktop) ----
  function initTitlebar() {
    $('titlebar').addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      overwolf.windows.getCurrentWindow((w) => {
        if (w && w.success) overwolf.windows.dragMove(w.window.id);
      });
    });
    $('tb-min').addEventListener('click', () => {
      overwolf.windows.getCurrentWindow((w) => {
        if (w && w.success) overwolf.windows.minimize(w.window.id);
      });
    });
    $('tb-close').addEventListener('click', () => {
      overwolf.windows.getCurrentWindow((w) => {
        if (w && w.success) overwolf.windows.close(w.window.id);
      });
    });
  }

  // ---- JINTO SEES ----
  function renderDetection() {
    const gs = controller.gameState.snapshot();
    const el = $('det-line');
    if (gs.agent && gs.map) {
      const side = gs.side ? ' — ' + gs.side : '';
      const phase = gs.roundPhase ? ' (' + gs.roundPhase + ')' : '';
      const round = gs.roundNumber != null ? ' · round ' + gs.roundNumber : '';
      el.innerHTML = '';
      el.textContent = gs.agent + ' on ' + gs.map + side;
      $('det-sub').textContent = (round + phase).trim();
    } else if (gs.map && !gs.agent) {
      el.textContent = 'agent select on ' + gs.map;
      $('det-sub').textContent = 'lock an agent and jinto follows';
    } else {
      el.innerHTML = '<span class="dim">no game detected</span>';
      $('det-sub').textContent = 'jinto still answers questions about the agents it knows';
    }
  }

  // ---- JINTO KNOWS ----
  function initKnows() {
    const wrap = $('knows');
    wrap.innerHTML = '';
    const cores = (typeof bg.getAllCores === 'function') ? bg.getAllCores() : [];
    if (!cores.length) {
      const s = document.createElement('span');
      s.className = 'knows-empty';
      s.textContent = 'No agents loaded yet.';
      wrap.appendChild(s);
      return;
    }
    for (const c of cores) {
      const chip = document.createElement('span');
      chip.className = 'agent-chip';
      chip.textContent = c.agent;
      const p = document.createElement('span');
      p.className = 'patch';
      p.textContent = 'patch ' + c.patch;
      chip.appendChild(p);
      wrap.appendChild(chip);
    }
  }

  // ---- LAST EXCHANGE (live via the event bus) ----
  function initLastExchange() {
    // Seed from conversation history if the window opened mid-session
    const conv = controller.conversation || [];
    let lastQ = null, lastA = null;
    for (const m of conv) {
      if (m.role === 'user') { lastQ = m.content; lastA = null; }
      else if (m.role === 'assistant') lastA = m.content;
    }
    if (lastQ) setExchange(lastQ, lastA || '');
  }

  function setExchange(q, a) {
    if (q != null) {
      $('lx-empty').style.display = 'none';
      $('lx-q').style.display = 'block';
      $('lx-q').textContent = 'you: ' + q;
    }
    if (a != null) {
      $('lx-a').style.display = 'block';
      $('lx-a').textContent = a;
    }
  }

  // ---- MISS LOG ----
  function renderMissLog() {
    const list = $('miss-list');
    const log = controller.getMissLog ? controller.getMissLog() : [];
    $('miss-count').textContent = log.length ? log.length + ' logged' : '';
    list.innerHTML = '';
    if (!log.length) {
      const s = document.createElement('span');
      s.className = 'miss-empty';
      s.textContent = 'No misses yet.';
      list.appendChild(s);
      return;
    }
    for (const m of log) {
      const item = document.createElement('div');
      item.className = 'miss-item';
      const q = document.createElement('div');
      q.className = 'miss-q';
      q.textContent = m.q;
      const meta = document.createElement('div');
      meta.className = 'miss-meta';
      const where = [m.agent, m.map].filter(Boolean).join(' / ') || 'no game';
      meta.textContent = where + ' · ' + m.reason + ' · ' + timeAgo(m.time);
      item.appendChild(q);
      item.appendChild(meta);
      list.appendChild(item);
    }
  }

  function initMissLog() {
    renderMissLog();
    $('miss-clear').addEventListener('click', () => {
      if (controller.clearMissLog) controller.clearMissLog();
      renderMissLog();
    });
  }

  function timeAgo(t) {
    if (!t) return '';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // ---- VOICE ----
  function initVoice() {
    const voiceSelect = $('voice-select');
    const catalog = controller.voiceCatalog || [];
    const currentId = (controller.tts && controller.tts.voiceId) || (catalog[0] && catalog[0].id);
    for (const v of catalog) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.label;
      if (v.id === currentId) opt.selected = true;
      voiceSelect.appendChild(opt);
    }
    voiceSelect.addEventListener('change', () => controller.setVoiceId(voiceSelect.value));

    const slider = $('volume-slider');
    const label = $('volume-value');
    const initialVol = Math.round((controller.volume || 1.0) * 100);
    slider.value = initialVol;
    label.textContent = initialVol + '%';
    slider.addEventListener('input', () => {
      const pct = parseInt(slider.value, 10);
      label.textContent = pct + '%';
      controller.setVolume(pct / 100);
    });

    $('test-voice-btn').addEventListener('click', async () => {
      const sample = "Hi, I'm jinto. Volume and voice are working.";
      const provider = controller.ttsProvider;
      if (provider === 'cartesia' && controller.tts) {
        try {
          await controller.tts.connect();
          // onAudioChunk is normally wired during a PTT answer; without this line the test
          // utterance streams back and every chunk is silently dropped (button seems dead).
          controller.tts.onAudioChunk = (b64) => controller.player.enqueueChunk(b64);
          controller.tts.startContext();
          controller.tts.sendText(sample, false);
          controller.tts.finish();
          setTimeout(() => controller.tts && controller.tts.close(), 6000);
        } catch (err) {
          console.error('[desktop] test voice failed', err);
        }
      } else if (provider === 'openai' && controller.openaiTts) {
        controller.openaiTts.speak(sample);
      } else if (provider === 'webspeech') {
        controller.webSpeech.speak(sample);
      }
    });
  }

  // ---- CONVERSATION ----
  function renderConversation() {
    const n = (controller.conversation && controller.conversation.length) || 0;
    const turns = Math.floor(n / 2);
    $('conv-status').textContent = turns + (turns === 1 ? ' turn' : ' turns');
  }

  function initConversation() {
    renderConversation();
    $('reset-btn').addEventListener('click', () => {
      controller.resetConversation();
      renderConversation();
      const btn = $('reset-btn');
      btn.textContent = 'RESET ✓';
      setTimeout(() => { btn.textContent = 'RESET CONVERSATION'; }, 1500);
    });
  }

  // ---- DEBUG ----
  function renderDebug() {
    const registered = controller.gameState && controller.gameState._registered;
    $('gep-status').textContent = registered ? 'registered ✓' : 'NOT REGISTERED';
    if (controller.gameState) {
      $('gep-raw').textContent = controller.gameState.lastRaw();
      const feats = controller.gameState.getSupportedFeatures();
      $('gep-features').textContent = feats.length ? feats.join(', ') : 'none reported';
    }
    const p = controller.ttsProvider;
    $('tts-status').textContent = p === 'cartesia' ? 'Cartesia Sonic-3' : p === 'openai' ? 'OpenAI TTS' : 'Windows TTS';
  }

  function initDebug() {
    renderDebug();
    $('force-snapshot-btn').addEventListener('click', () => {
      try {
        overwolf.games.events.getInfo((res) => {
          console.log('[desktop] getInfo response:', res);
          const btn = $('force-snapshot-btn');
          if (res && res.success && res.res) {
            controller.gameState._handleInfoUpdate({ info: res.res });
            btn.textContent = 'PULLED ✓';
          } else {
            btn.textContent = 'failed — see console';
          }
          setTimeout(() => { btn.textContent = 'PULL FRESH GAME STATE'; }, 2500);
        });
      } catch (err) {
        console.error('[desktop] force-snapshot failed', err);
      }
    });
  }

  // ---- LIVE UPDATES ----
  function initDetection() {
    renderDetection();

    if (bg.jintoEventBus) {
      const busHandler = (name, value) => {
        if (name === 'game-state' || name === 'gep-registered') { renderDetection(); renderDebug(); }
        else if (name === 'gep-raw') { $('gep-raw').textContent = value; }
        else if (name === 'transcript') { if (value) setExchange(value, null); }
        else if (name === 'response') { if (value != null) setExchange(null, value); renderConversation(); }
        else if (name === 'state') { $('lx-state').textContent = value && value.label ? '[' + value.label + ']' : ''; }
        else if (name === 'miss-logged') { renderMissLog(); }
        else if (name === 'new-match') { renderConversation(); }
      };
      bg.jintoEventBus.addListener(busHandler);
      // The bus lives in the background window — detach on close or the listener leaks.
      window.addEventListener('beforeunload', () => {
        try { bg.jintoEventBus.removeListener(busHandler); } catch (_) {}
      });
    }

    // Poll fallback for anything the bus misses
    setInterval(() => { renderDetection(); renderConversation(); renderDebug(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
