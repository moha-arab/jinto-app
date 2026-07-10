// desktop.js — settings dashboard. Connects to background controller via overwolf.windows.getMainWindow().

(function() {
  let bg = null;
  let controller = null;

  function init() {
    const els = {
      volumeSlider: document.getElementById('volume-slider'),
      volumeValue:  document.getElementById('volume-value'),
      voiceSelect:  document.getElementById('voice-select'),
      ttsStatus:    document.getElementById('tts-status'),
      convStatus:   document.getElementById('conv-status'),
      agentStatus:  document.getElementById('agent-status'),
      mapStatus:    document.getElementById('map-status'),
      gepStatus:    document.getElementById('gep-status'),
      gepRaw:       document.getElementById('gep-raw'),
      gepFeatures:  document.getElementById('gep-features'),
      forceBtn:     document.getElementById('force-snapshot-btn'),
      testBtn:      document.getElementById('test-voice-btn'),
      resetBtn:     document.getElementById('reset-btn'),
    };

    try {
      bg = overwolf.windows.getMainWindow();
      controller = bg && bg.jintoController;
    } catch (err) {
      console.error('[desktop] failed to get main window', err);
    }

    if (!controller) {
      els.ttsStatus.textContent = 'background not ready';
      return;
    }

    // Populate voice dropdown
    const catalog = controller.voiceCatalog || [];
    const currentId = (controller.tts && controller.tts.voiceId) || (catalog[0] && catalog[0].id);
    for (const v of catalog) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.label;
      if (v.id === currentId) opt.selected = true;
      els.voiceSelect.appendChild(opt);
    }
    els.voiceSelect.addEventListener('change', () => {
      controller.setVoiceId(els.voiceSelect.value);
    });

    // Volume
    const initialVol = Math.round((controller.volume || 1.0) * 100);
    els.volumeSlider.value = initialVol;
    els.volumeValue.textContent = initialVol + '%';
    els.volumeSlider.addEventListener('input', () => {
      const pct = parseInt(els.volumeSlider.value, 10);
      els.volumeValue.textContent = pct + '%';
      controller.setVolume(pct / 100);
    });

    // TTS provider
    if (controller.ttsProvider === 'cartesia') els.ttsStatus.textContent = 'Cartesia Sonic-3';
    else if (controller.ttsProvider === 'openai') els.ttsStatus.textContent = 'OpenAI gpt-4o-mini-tts';
    else if (controller.ttsProvider === 'webspeech') els.ttsStatus.textContent = 'Windows TTS';

    // Conversation + game state — refresh every 2 seconds
    function refreshStatus() {
      const n = (controller.conversation && controller.conversation.length) || 0;
      const turns = Math.floor(n / 2);
      els.convStatus.textContent = turns + (turns === 1 ? ' turn' : ' turns');

      const gs = controller.gameState && controller.gameState.snapshot();
      if (gs) {
        const ov = controller.gameState.isOverridden && controller.gameState.isOverridden() ? ' (override)' : '';
        els.agentStatus.textContent = (gs.agent || 'unknown') + ov;
        els.mapStatus.textContent = (gs.map || 'unknown') + ov;
      }
      const registered = controller.gameState && controller.gameState._registered;
      els.gepStatus.textContent = registered ? 'registered ✓' : 'NOT REGISTERED';

      if (els.gepRaw && controller.gameState) {
        const last = controller.gameState.lastRaw();
        els.gepRaw.textContent = last;
      }
      if (els.gepFeatures && controller.gameState) {
        const feats = controller.gameState.getSupportedFeatures();
        els.gepFeatures.textContent = feats.length ? feats.join(', ') : 'none reported';
      }
    }
    refreshStatus();
    setInterval(refreshStatus, 2000);

    // Force-pull current game state from Overwolf
    if (els.forceBtn) {
      els.forceBtn.addEventListener('click', () => {
        if (!overwolf || !overwolf.games || !overwolf.games.events) return;
        try {
          overwolf.games.events.getInfo((res) => {
            console.log('[desktop] getInfo response:', res);
            if (res && res.success && res.res) {
              controller.gameState._handleInfoUpdate({ info: res.res });
              els.forceBtn.textContent = 'PULLED ✓ — check status above';
              setTimeout(() => { els.forceBtn.textContent = 'PULL FRESH GAME STATE'; }, 2500);
            } else {
              els.forceBtn.textContent = 'failed — see console';
              setTimeout(() => { els.forceBtn.textContent = 'PULL FRESH GAME STATE'; }, 2500);
            }
          });
        } catch (err) {
          console.error('[desktop] force-snapshot failed', err);
        }
      });
    }

    // Test voice
    els.testBtn.addEventListener('click', async () => {
      const provider = controller.ttsProvider;
      const sample = "Hi, I'm jinto. Volume and voice are working.";

      if (provider === 'cartesia' && controller.tts) {
        try {
          await controller.tts.connect();
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

    // Reset conversation
    els.resetBtn.addEventListener('click', () => {
      controller.resetConversation();
      refreshStatus();
      els.resetBtn.textContent = 'RESET ✓';
      setTimeout(() => { els.resetBtn.textContent = 'RESET CONVERSATION'; }, 1500);
    });

    initPretendMode(bg, controller);
  }

  // ---- PRETEND MODE — full-pipeline testing without Valorant ----
  function initPretendMode(bg, controller) {
    const $ = (id) => document.getElementById(id);
    const el = {
      agent: $('pm-agent'), map: $('pm-map'), side: $('pm-side'),
      agentsList: $('pm-agents'), mapsList: $('pm-maps'),
      apply: $('pm-apply'), clear: $('pm-clear'), ovStatus: $('pm-ov-status'),
      q: $('pm-q'), ask: $('pm-ask'), speak: $('pm-speak'),
      state: $('pm-state'), transcript: $('pm-transcript'), response: $('pm-response'),
      gallery: $('pm-gallery'), galName: $('pm-gal-name'), galLabel: $('pm-gal-label'),
      galImg: $('pm-gal-img'), galCount: $('pm-gal-count'),
      galPrev: $('pm-gal-prev'), galNext: $('pm-gal-next'),
      dump: $('pm-dump'), prompt: $('pm-prompt'),
    };
    if (!el.apply) return; // section not present

    // Datalists: supported combos first, then the full roster/pool for refusal testing
    const AGENTS = ['Astra','Breach','Brimstone','Chamber','Clove','Cypher','Deadlock','Fade','Gekko',
      'Harbor','Iso','Jett','KAY/O','Killjoy','Miks','Neon','Omen','Phoenix','Raze','Reyna','Sage',
      'Skye','Sova','Tejo','Veto','Viper','Vyse','Waylay','Yoru'];
    const MAPS = ['Ascent','Bind','Breeze','Fracture','Haven','Icebox','Lotus','Pearl','Split','Sunset','Abyss','Corrode'];
    const supported = (typeof bg.getSupportedCombos === 'function') ? bg.getSupportedCombos() : [];
    const agentSet = new Set(supported.map((c) => c.agent));
    AGENTS.forEach((a) => agentSet.add(a));
    agentSet.forEach((a) => {
      const o = document.createElement('option'); o.value = a; el.agentsList.appendChild(o);
    });
    MAPS.forEach((m) => {
      const o = document.createElement('option'); o.value = m; el.mapsList.appendChild(o);
    });
    if (supported.length) {
      el.agent.placeholder = 'agent (e.g. ' + supported[0].agent + ')';
      el.map.placeholder = 'map (e.g. ' + supported[0].map + ')';
    }

    function refreshOvStatus() {
      if (controller.gameState.isOverridden()) {
        const gs = controller.gameState.snapshot();
        el.ovStatus.textContent = 'override ON: ' + gs.agent + ' / ' + gs.map + ' (' + gs.side + ')';
        el.ovStatus.style.color = '#C6FF3D';
      } else {
        el.ovStatus.textContent = 'override off';
        el.ovStatus.style.color = '#5A5A66';
      }
    }

    el.apply.addEventListener('click', () => {
      const agent = el.agent.value.trim();
      const map = el.map.value.trim();
      if (!agent || !map) {
        el.ovStatus.textContent = 'enter an agent AND a map';
        el.ovStatus.style.color = '#ff6b6b';
        return;
      }
      controller.gameState.setOverride({
        agent, map,
        side: el.side.value,
        roundPhase: 'shopping',
        roundNumber: 1,
      });
      refreshOvStatus();
    });

    el.clear.addEventListener('click', () => {
      controller.gameState.clearOverride();
      refreshOvStatus();
    });
    refreshOvStatus();

    // Typed questions → same pipeline as voice
    let askBusy = false;
    async function ask() {
      const text = el.q.value.trim();
      if (!text || askBusy) return;
      askBusy = true;
      el.ask.textContent = '…';
      resetGallery();
      try {
        await controller.askText(text, { speak: el.speak.checked });
      } catch (err) {
        console.error('[desktop] askText failed', err);
      } finally {
        askBusy = false;
        el.ask.textContent = 'ASK';
      }
    }
    el.ask.addEventListener('click', ask);
    el.q.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });

    // Live view of what the pipeline emits (same events the in-game overlay renders)
    let gal = null; // { name, steps: [{label, src}], idx }
    function resetGallery() {
      gal = null;
      el.gallery.style.display = 'none';
    }
    function renderGallery() {
      if (!gal || !gal.steps.length) { resetGallery(); return; }
      const step = gal.steps[gal.idx];
      el.gallery.style.display = 'block';
      el.galName.textContent = gal.name || '';
      el.galLabel.textContent = step.label || '';
      el.galCount.textContent = (gal.idx + 1) + '/' + gal.steps.length;
      if (step.src) {
        el.galImg.src = step.src;
        el.galImg.style.display = 'block';
      } else {
        el.galImg.style.display = 'none';
      }
    }
    function galStep(delta) {
      if (!gal) return;
      gal.idx = (gal.idx + delta + gal.steps.length) % gal.steps.length;
      renderGallery();
    }
    el.galPrev.addEventListener('click', () => galStep(-1));
    el.galNext.addEventListener('click', () => galStep(1));

    if (bg.jintoEventBus) {
      const busHandler = (name, value) => {
        if (name === 'transcript') {
          el.transcript.textContent = value ? ('you: ' + value) : '';
        } else if (name === 'response') {
          el.response.textContent = value || '';
        } else if (name === 'state') {
          el.state.textContent = value && value.label ? ('[' + value.label + ']') : '';
        } else if (name === 'show_image') {
          gal = { name: 'diagram', steps: [{ label: value.alt || '', src: value.src }], idx: 0 };
          renderGallery();
        } else if (name === 'show_setup') {
          gal = { name: value.name || 'setup', steps: value.steps || [], idx: 0 };
          renderGallery();
        } else if (name === 'next-diagram') {
          galStep(1);
        }
      };
      bg.jintoEventBus.addListener(busHandler);
      // The bus lives in the background window — detach on close or the listener leaks.
      window.addEventListener('beforeunload', () => {
        try { bg.jintoEventBus.removeListener(busHandler); } catch (_) {}
      });
    }

    // System prompt dump
    el.dump.addEventListener('click', () => {
      const visible = el.prompt.style.display !== 'none';
      if (visible) {
        el.prompt.style.display = 'none';
        el.dump.textContent = 'DUMP SYSTEM PROMPT';
        return;
      }
      try {
        el.prompt.textContent = controller.dumpPrompt();
      } catch (err) {
        el.prompt.textContent = 'dump failed: ' + err.message;
      }
      el.prompt.style.display = 'block';
      el.dump.textContent = 'HIDE PROMPT';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
