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
        els.agentStatus.textContent = gs.agent || 'unknown';
        els.mapStatus.textContent = gs.map || 'unknown';
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
      refreshConv();
      els.resetBtn.textContent = 'RESET ✓';
      setTimeout(() => { els.resetBtn.textContent = 'RESET CONVERSATION'; }, 1500);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
