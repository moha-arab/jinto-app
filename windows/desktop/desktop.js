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

    initDetection();
    initKnows();
    initLastExchange();
    initMissLog();
    initVoice();
    initConversation();
    initDebug();
    initFtue();
    initHotkeys();
  }

  // ---- FTUE (first launch only) ----
  function initFtue() {
    let seen = null;
    try { seen = localStorage.getItem('jinto-ftue-done'); } catch (_) {}
    if (!seen) $('ftue').style.display = '';
    $('ftue-done').addEventListener('click', () => {
      try { localStorage.setItem('jinto-ftue-done', '1'); } catch (_) {}
      $('ftue').style.display = 'none';
    });
  }

  // ---- HOTKEYS ----
  function renderHotkeys() {
    try {
      overwolf.settings.hotkeys.get((res) => {
        if (!res || !res.success) return;
        const all = [].concat(res.globals || [], (res.games && res.games['21640']) || []);
        const find = (name) => { const h = all.find((x) => x.name === name); return h && h.binding; };
        const ptt = find('jinto_ptt'); const dash = find('jinto_toggle_settings');
        if (ptt) $('hk-ptt').textContent = ptt === 'Oemtilde' ? '` (hold)' : ptt + ' (hold)';
        if (dash) $('hk-dash').textContent = dash;
      });
    } catch (_) {}
  }

  function initHotkeys() {
    renderHotkeys();
    try { overwolf.settings.hotkeys.onChanged.addListener(renderHotkeys); } catch (_) {}
    $('hk-change').addEventListener('click', () => {
      location.href = 'overwolf://settings/games-overlay?hotkey=jinto_ptt&gameId=21640';
    });
  }

  // ---- JINTO SEES ----
  function renderDetection() {
    const gs = controller.gameState.snapshot();
    const el = $('det-line');
    if (gs.agent && gs.map) {
      const side = gs.side ? ' — ' + gs.side : '';
      el.innerHTML = '';
      el.textContent = gs.agent + ' on ' + gs.map + side;
      $('det-sub').textContent = [
        gs.roundNumber != null ? 'round ' + gs.roundNumber : '',
        gs.roundPhase || '',
      ].filter(Boolean).join(' · ');
    } else if (gs.map && !gs.agent) {
      if (gs.roundPhase || gs.roundNumber != null) {
        el.textContent = 'in a match on ' + gs.map + ' — agent not detected';
        $('det-sub').textContent = "jinto will ask which agent you're on · PULL FRESH GAME STATE in debug can fix this";
      } else {
        el.textContent = 'agent select on ' + gs.map;
        $('det-sub').textContent = 'lock an agent and jinto follows';
      }
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

    // Voice doctor: plays the sample AND reports what actually happened on the button —
    // connection result, audio chunks received, audio engine state, volume. One glance
    // tells us which layer a silence lives in.
    $('test-voice-btn').addEventListener('click', async () => {
      const btn = $('test-voice-btn');
      const sample = "Hi, I'm jinto. Volume and voice are working.";
      const provider = controller.ttsProvider;
      const restore = (ms) => setTimeout(() => { btn.textContent = '▶ test voice'; }, ms);

      if (provider === 'openai' && controller.openaiTts) { controller.openaiTts.speak(sample); return; }
      if (provider === 'webspeech') { controller.webSpeech.speak(sample); return; }
      if (!controller.tts) { btn.textContent = '✗ no tts service (key missing?)'; restore(8000); return; }

      try {
        btn.textContent = 'testing…';
        // Rebind audio to the CURRENT output device (fixes headset-switch silence)
        if (controller.player && controller.player.reset) controller.player.reset();

        let chunks = 0;
        let serverErr = null;
        await controller.tts.connect();
        controller.tts.onAudioChunk = (b64) => { chunks++; controller.player.enqueueChunk(b64); };
        controller.tts.onError = (e) => { serverErr = String((e && e.message) || e); };
        controller.tts.startContext();
        controller.tts.sendText(sample, false);
        controller.tts.finish();

        await new Promise((r) => setTimeout(r, 4000));
        const ctx = controller.player && controller.player.ctx;
        const diag = 'chunks:' + chunks
          + ' · audio:' + (ctx ? ctx.state : 'none')
          + ' · vol:' + Math.round((controller.volume || 0) * 100) + '%'
          + (serverErr ? ' · ERR: ' + serverErr.slice(0, 60) : '');
        console.log('[voice-doctor]', diag);
        btn.textContent = (chunks > 0 ? '✓ ' : '✗ ') + diag;
        restore(15000);
        setTimeout(() => controller.tts && controller.tts.close(), 6000);
      } catch (err) {
        btn.textContent = '✗ connect failed: ' + String((err && err.message) || err).slice(0, 50);
        console.error('[voice-doctor] connect failed', err);
        restore(15000);
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
  function renderLatency() {
    const timings = (controller.getTimings && controller.getTimings()) || [];
    if (!timings.length) return;
    const t = timings[timings.length - 1];
    const part = (label, v) => v == null ? null : label + ' ' + v;
    $('lat-last').textContent = [
      part('stt', (t.flush || 0) + (t.stt || 0)),
      part('first token', t.llmFirst),
      part('llm', t.llmTotal),
      part('v2v', t.v2v),
    ].filter(Boolean).join(' · ') + ' ms';
    const v2vs = timings.map((x) => x.v2v).filter((v) => v != null).sort((a, b) => a - b);
    if (v2vs.length) {
      const p50 = v2vs[Math.floor((v2vs.length - 1) / 2)];
      $('lat-p50').textContent = (p50 / 1000).toFixed(2) + 's over ' + v2vs.length + ' turn' + (v2vs.length === 1 ? '' : 's');
    }
    const u = t.usage;
    if (u) {
      const read = u.cache_read_input_tokens || 0, wrote = u.cache_creation_input_tokens || 0;
      $('lat-cache').textContent = read ? 'HIT — read ' + read + ' tok' : (wrote ? 'MISS — wrote ' + wrote + ' tok' : 'uncached');
    }
  }

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
    renderLatency();
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
        else if (name === 'tts-error') {
          const el = $('lx-state');
          el.textContent = '[voice failed — text only: ' + value + ']';
          el.style.color = '#ff6b6b';
          setTimeout(() => { el.style.color = '#C6FF3D'; }, 8000);
        }
        else if (name === 'miss-logged') { renderMissLog(); }
        else if (name === 'turn-timing') { renderLatency(); }
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
