// background-controller.js
// PTT → capture mic → Deepgram STT → Claude (with tools) → Cartesia TTS + image overlay.
// Background page owns the EventBus for cross-window IPC.

// Tools Claude can call mid-response. show_image displays a reference diagram on the overlay.
const JINTO_TOOLS = [
  {
    name: 'show_image',
    description:
      'Display a reference diagram to the player on their in-game overlay. Call this whenever your spoken answer is based on a lesson that has an associated image (e.g. a wall placement diagram). Pass the exact image_id given in that lesson. Do not call it for lessons without an image.',
    input_schema: {
      type: 'object',
      properties: {
        image_id: {
          type: 'string',
          description: 'The image_id from the lesson, e.g. "viper-breeze-a-attack-wall".',
        },
      },
      required: ['image_id'],
    },
  },
];

class BackgroundController {
  constructor() {
    this.eventBus = new EventBus();
    window.jintoEventBus = this.eventBus; // exposed to other windows via getMainWindow()

    this.audio = new AudioCaptureService();
    this.stt = null; // lazy — created per session
    this.claude = null; // created once we have a key
    this.tts = null;    // created once we have a key (Cartesia, currently unused)
    this.player = new AudioPlayerService(44100);
    this.webSpeech = new WebSpeechService(); // robotic Windows TTS fallback
    this.openaiTts = null; // initialized in _validateKeys when key present
    this.gameState = new GameStateService(this.eventBus);

    // Active provider: 'cartesia' (low-latency streaming), 'openai' (one-shot, slower), 'webspeech' (robotic free)
    this.ttsProvider = 'cartesia';

    // User-controllable settings (exposed via desktop window)
    this.volume = 1.0;

    // Voice picker — curated Cartesia voice IDs the user can switch between
    this.voiceCatalog = [
      { id: 'e00d0e4c-a5c8-443f-a8a3-473eb9a62355', label: 'Zeke — Friendly Sidekick (young male, gaming)' },
      { id: '1463a4e1-56a1-4b41-b257-728d56e93605', label: 'Hugo — Teatime Friend (young British male)' },
      { id: 'd7862948-75c3-4c7c-ae28-2959fe166f49', label: 'Caspian — Oracle (echo-y, mystical)' },
      { id: 'fb26447f-308b-471e-8b00-8e9f04284eb5', label: 'Thistle — Troublemaker (genderless whimsical)' },
      { id: 'ec58877e-44ae-4581-9078-a04225d42bd4', label: 'Charles — Heroic Man (deep, strong)' },
      { id: '87286a8d-7ea7-4235-a41a-dd9fa6630feb', label: 'Henry — Plainspoken (calm older)' },
      { id: '98a34ef2-2140-4c28-9c71-663dc4dd7022', label: 'Clyde — Calm Narrator' },
    ];

    this.conversation = []; // {role, content} pairs, capped at 20

    this._pttDown = false;
  }

  async run() {
    console.log('[jinto/bg] starting…');

    this._validateKeys();
    this._registerPTTHotkey();
    this._listenForGameLaunch();
    this.gameState.start();

    // If we started up without Valorant running (e.g., user clicked jinto in the dock),
    // open the desktop dashboard so they have something to interact with.
    overwolf.games.getRunningGameInfo((info) => {
      const valorantRunning = info && info.isRunning && info.classId === kValorantGameId;
      if (!valorantRunning) {
        console.log('[jinto/bg] Valorant not running — opening desktop dashboard');
        this._openDesktop();
      }
    });

    console.log('[jinto/bg] ready');
  }

  _openDesktop() {
    overwolf.windows.obtainDeclaredWindow(kWindowDesktop, (result) => {
      if (!result || !result.success) {
        console.warn('[jinto/bg] could not obtain desktop window:', result);
        return;
      }
      overwolf.windows.restore(result.window.id);
    });
  }

  _validateKeys() {
    const keys = window.JINTO_KEYS || {};
    const missing = [];
    if (!keys.DEEPGRAM) missing.push('DEEPGRAM');
    if (!keys.ANTHROPIC) missing.push('ANTHROPIC');
    if (!keys.CARTESIA) missing.push('CARTESIA');
    if (missing.length) {
      console.error('[jinto/bg] missing API keys in secrets.local.js:', missing);
    } else {
      console.log('[jinto/bg] all 3 API keys present');
      this.claude = new ClaudeService(keys.ANTHROPIC);
      this.tts = new CartesiaService(keys.CARTESIA);
      if (keys.OPENAI) {
        this.openaiTts = new OpenAITtsService(keys.OPENAI);
      }
    }
  }

  _registerPTTHotkey() {
    overwolf.settings.hotkeys.onHold.addListener((e) => {
      if (e.name !== kHotkeyPTT) return;
      // e.state is "down" or "up"
      console.log('[jinto/bg] PTT', e.state);
      if (e.state === 'down') this._handlePTTDown();
      else if (e.state === 'up') this._handlePTTUp();
    });
    console.log('[jinto/bg] PTT hotkey listener registered (' + kHotkeyPTT + ')');

    overwolf.settings.hotkeys.onPressed.addListener((e) => {
      if (e.name !== kHotkeyToggleSettings) return;
      this._toggleSettingsWindow();
    });
  }

  _toggleSettingsWindow() {
    overwolf.windows.obtainDeclaredWindow(kWindowDesktop, (result) => {
      if (!result || !result.success) {
        this._openDesktop();
        return;
      }
      overwolf.windows.getWindowState(result.window.id, (stateResult) => {
        if (stateResult && stateResult.window_state === 'normal') {
          overwolf.windows.close(result.window.id);
        } else {
          overwolf.windows.restore(result.window.id);
        }
      });
    });
  }

  // Public methods called from the desktop window
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.player) this.player.setVolume(this.volume);
    if (this.openaiTts) this.openaiTts.setVolume(this.volume);
    if (this.webSpeech) this.webSpeech.setVolume(this.volume);
  }

  setVoiceId(id) {
    if (this.tts) this.tts.voiceId = id;
  }

  resetConversation() {
    this.conversation = [];
    console.log('[jinto/bg] conversation reset');
  }

  async _handlePTTDown() {
    if (this._pttDown) return;
    this._pttDown = true;

    // Barge-in: kill anything still in flight from the previous turn before starting fresh.
    this._cancelInFlight();

    this.eventBus.trigger('ptt', 'down');
    this.eventBus.trigger('state', { key: 'listening', label: 'listening' });
    this.eventBus.trigger('transcript', ''); // clear previous
    this.eventBus.trigger('response', '');   // clear previous response

    try {
      // Open Deepgram first so it's ready when audio chunks arrive
      this.stt = new DeepgramService(window.JINTO_KEYS.DEEPGRAM);
      this.stt.onInterim = (text) => {
        this.eventBus.trigger('transcript', text);
      };
      this.stt.onError = (err) => {
        console.error('[jinto/bg] stt error:', err);
        this.eventBus.trigger('state', { key: 'idle', label: 'error' });
      };
      await this.stt.connect();

      // Start mic capture and route chunks to Deepgram
      await this.audio.start(
        (chunk) => this.stt && this.stt.sendChunk(chunk),
        (err) => {
          console.error('[jinto/bg] mic error:', err);
          this.eventBus.trigger('state', { key: 'idle', label: 'mic error' });
        }
      );
    } catch (err) {
      console.error('[jinto/bg] failed to start PTT pipeline:', err);
      this.eventBus.trigger('state', { key: 'idle', label: 'error' });
      this._pttDown = false;
    }
  }

  async _handlePTTUp() {
    if (!this._pttDown) return;
    this._pttDown = false;

    this.eventBus.trigger('ptt', 'up');
    this.eventBus.trigger('state', { key: 'thinking', label: 'transcribing' });

    // Stop mic immediately
    this.audio.stop();

    // Wait for final transcript
    let finalText = '';
    try {
      if (this.stt) {
        finalText = await this.stt.finish(1500);
      }
    } catch (err) {
      console.error('[jinto/bg] finish error:', err);
    } finally {
      if (this.stt) {
        this.stt.close();
        this.stt = null;
      }
    }

    console.log('[jinto/bg] final transcript:', finalText);
    this.eventBus.trigger('transcript', finalText);

    if (!finalText) {
      this.eventBus.trigger('state', { key: 'idle', label: 'no speech' });
      return;
    }

    // Phase 2b: send transcript to Claude, stream response back to overlay
    if (!this.claude) {
      this.eventBus.trigger('state', { key: 'idle', label: 'no claude key' });
      this.eventBus.trigger('response', '(Anthropic key missing)');
      return;
    }

    // Phase 3: code-gate refusal for out-of-scope combos.
    // Only triggers when we KNOW the agent+map and they're definitely not in scope.
    // If GEP data is missing (agent/map unknown), let Claude handle it — it'll ask the user.
    const gs = this.gameState.snapshot();
    const knowState = !!(gs.agent && gs.map);
    const reason = knowState ? refusalReason(gs.agent, gs.map) : null;
    if (reason && knowState) {
      let refusal;
      if (reason === 'agent') {
        refusal = "Right now I only coach Viper on Breeze. More coming soon.";
      } else if (reason === 'map') {
        refusal = `I coach Viper, but only on Breeze right now. Hop on Breeze and ask me anything.`;
      }
      console.log('[jinto/bg] code-gate refusal:', reason, gs.agent, gs.map);
      this.eventBus.trigger('state', { key: 'speaking', label: 'refusing' });
      this.eventBus.trigger('response', refusal);
      this._speak(refusal);
      if (this.ttsProvider === 'cartesia' && this.tts) {
        try {
          await this.tts.connect();
          this.tts.onAudioChunk = (b64) => this.player.enqueueChunk(b64);
          this.tts.startContext();
          this.tts.sendText(refusal, false);
          this.tts.finish();
          setTimeout(() => { if (this.tts) this.tts.close(); }, 6000);
        } catch (err) {
          console.error('[jinto/bg] cartesia refusal failed', err);
        }
      }
      setTimeout(() => this.eventBus.trigger('state', { key: 'idle', label: 'done' }), 500);
      return;
    }

    this.eventBus.trigger('state', { key: 'thinking', label: 'thinking' });
    this.eventBus.trigger('response', ''); // clear

    // Add user turn to conversation history (cap at last 20 turns)
    this.conversation.push({ role: 'user', content: finalText });
    if (this.conversation.length > 20) this.conversation = this.conversation.slice(-20);

    let firstDelta = true;

    // For Cartesia, open the WebSocket in parallel so it's ready when Claude starts streaming
    let ttsReady = false;
    const ttsReadyPromise = (async () => {
      if (this.ttsProvider !== 'cartesia' || !this.tts) return;
      try {
        await this.tts.connect();
        this.tts.onAudioChunk = (b64) => this.player.enqueueChunk(b64);
        this.tts.onError = (err) => console.error('[jinto/bg] cartesia error', err);
        this.tts.startContext();
        ttsReady = true;
      } catch (err) {
        console.error('[jinto/bg] cartesia connect failed', err);
      }
    })();

    // Cartesia path: stream Claude chunks at clause boundaries → Cartesia WebSocket → audio
    let cartesiaBuffer = '';
    const flushCartesia = (force = false) => {
      if (this.ttsProvider !== 'cartesia' || !ttsReady || !this.tts) return;
      if (!cartesiaBuffer) return;
      if (force) {
        this.tts.sendText(cartesiaBuffer, true);
        cartesiaBuffer = '';
        return;
      }
      const matches = [...cartesiaBuffer.matchAll(/[.!?,;:]\s|\n/g)];
      if (matches.length === 0) return;
      const lastMatch = matches[matches.length - 1];
      const lastIdx = lastMatch.index + lastMatch[0].length;
      const toSend = cartesiaBuffer.slice(0, lastIdx).trim();
      if (toSend) this.tts.sendText(toSend + ' ', true);
      cartesiaBuffer = cartesiaBuffer.slice(lastIdx);
    };

    try {
      const full = await this.claude.stream(
        this.conversation,
        buildSystemPrompt(this.gameState.snapshot()),
        (chunk, accumulated) => {
          if (firstDelta) {
            this.eventBus.trigger('state', { key: 'speaking', label: 'answering' });
            firstDelta = false;
          }
          this.eventBus.trigger('response', accumulated);
          // Stream into Cartesia at clause boundaries for low-latency continuous audio
          if (this.ttsProvider === 'cartesia') {
            ttsReadyPromise.then(() => {
              cartesiaBuffer += chunk;
              flushCartesia(false);
            });
          }
        },
        JINTO_TOOLS,
        (toolName, input) => this._handleToolCall(toolName, input)
      );

      this.conversation.push({ role: 'assistant', content: full });

      if (this.ttsProvider === 'cartesia') {
        await ttsReadyPromise;
        if (ttsReady) {
          flushCartesia(true);
          this.tts.finish();
          setTimeout(() => { if (this.tts) this.tts.close(); }, 8000);
        }
      } else if (full && full.trim()) {
        // OpenAI / WebSpeech path: send full text after Claude completes
        this._speak(full);
      }

      console.log('[jinto/bg] claude full response:', full);
      this.eventBus.trigger('state', { key: 'idle', label: 'done' });
    } catch (err) {
      // Silent on intentional aborts (user pressed PTT to interrupt)
      if (err.name === 'AbortError' || (err.message && err.message.includes('aborted'))) {
        console.log('[jinto/bg] claude stream aborted (interrupt)');
        return;
      }
      console.error('[jinto/bg] claude failed:', err);
      this.eventBus.trigger('state', { key: 'idle', label: 'claude error' });
      this.eventBus.trigger('response', '(Claude error — check console)');
      if (this.tts) this.tts.close();
      if (this.conversation.length && this.conversation[this.conversation.length - 1].role === 'user') {
        this.conversation.pop();
      }
    }
  }

  _speak(text) {
    if (!text || !text.trim()) return;
    if (this.ttsProvider === 'openai' && this.openaiTts) {
      this.openaiTts.speak(text);
    } else if (this.ttsProvider === 'webspeech') {
      this.webSpeech.speak(text);
    }
    // Cartesia path is streaming — handled separately in _handlePTTUp
  }

  /**
   * Handle a tool call from Claude. Currently only show_image.
   */
  _handleToolCall(toolName, input) {
    if (toolName !== 'show_image') return;
    const id = input && input.image_id;
    if (!id) return;

    const known = (typeof getKnownImageIds === 'function') ? getKnownImageIds() : new Set();
    if (!known.has(id)) {
      console.warn('[jinto/bg] show_image: unknown image_id "' + id + '" — dropping');
      return;
    }
    console.log('[jinto/bg] show_image:', id);
    this.eventBus.trigger('show_image', {
      src: '../../img/overlay/' + id + '.png',
      alt: id,
    });
  }

  /**
   * Kill anything in flight from the previous turn. Called at start of every new PTT press.
   */
  _cancelInFlight() {
    try { if (this.claude) this.claude.abort(); } catch (_) {}
    try {
      if (this.tts) {
        this.tts.cancel();
        this.tts.close();
      }
    } catch (_) {}
    try { if (this.player) this.player.stopAll(); } catch (_) {}
    try { if (this.openaiTts) this.openaiTts.cancel(); } catch (_) {}
    try { if (this.webSpeech) this.webSpeech.cancel(); } catch (_) {}

    // If we cancelled mid-Claude, the partial assistant message would poison history. Drop it.
    if (this.conversation.length > 0) {
      const last = this.conversation[this.conversation.length - 1];
      if (last.role === 'user') {
        // No assistant response was saved yet — fine to keep the user turn so the new question continues the same thread.
      } else if (last.role === 'assistant' && (!last.content || last.content.trim() === '')) {
        this.conversation.pop();
      }
    }
  }

  _listenForGameLaunch() {
    overwolf.games.onGameLaunched.addListener((info) => {
      if (!info || info.classId !== kValorantGameId) return;
      console.log('[jinto/bg] Valorant launched');
      this._openOverlay();
    });

    overwolf.games.onGameInfoUpdated.addListener((info) => {
      if (info && info.gameInfo && info.runningChanged) {
        if (info.gameInfo.classId === kValorantGameId && info.gameInfo.isRunning) {
          console.log('[jinto/bg] Valorant detected as running');
          this._openOverlay();
        }
      }
    });

    overwolf.games.getRunningGameInfo((info) => {
      if (info && info.classId === kValorantGameId && info.isRunning) {
        console.log('[jinto/bg] Valorant already running, opening overlay');
        this._openOverlay();
      }
    });
  }

  _openOverlay() {
    overwolf.windows.obtainDeclaredWindow(kWindowOverlay, (result) => {
      if (!result || !result.success) {
        console.error('[jinto/bg] obtainDeclaredWindow failed:', result);
        return;
      }
      overwolf.windows.restore(result.window.id, (restoreResult) => {
        if (restoreResult && restoreResult.success) {
          console.log('[jinto/bg] overlay opened');
        } else {
          console.error('[jinto/bg] restore failed:', restoreResult);
        }
      });
    });
  }
}
