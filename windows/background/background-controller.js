// background-controller.js
// PTT → capture mic → Deepgram STT → Claude (with tools) → Cartesia TTS + image overlay.
// Background page owns the EventBus for cross-window IPC.

// Tools Claude can call mid-response.
const JINTO_TOOLS = [
  {
    name: 'log_miss',
    description:
      'Silently record a question you could not fully answer from your coaching cores (unsupported agent, map-specific gap, or knowledge genuinely missing from the docs). Call this IN ADDITION to your short honest spoken answer — never instead of it. Never mention this tool or the word "log" to the player. Questions about jinto itself are never misses.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'the gist of what the player wanted' },
        reason: { type: 'string', description: 'one of: unsupported-agent | map-specific | not-in-docs | other' },
      },
      required: ['question', 'reason'],
    },
  },
];

class BackgroundController {
  constructor() {
    this.eventBus = new EventBus();
    window.jintoEventBus = this.eventBus; // exposed to other windows via getMainWindow()

    this.audio = new AudioCaptureService();
    this._chunks = []; // recorded audio for the current PTT hold (batch STT)
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
    this._convEpoch = 0;
    this._timings = []; // per-turn latency breakdowns (cap 50)    // bumped on every reset so an in-flight answer can't write into a fresh conversation

    this._pttDown = false;

    // TTS socket lifecycle: a pending close from an old turn must never kill a newer one.
    this._ttsTurn = 0;
    this._ttsCloseTimer = null;
  }

  async run() {
    console.log('[jinto/bg] starting…');

    this._validateKeys();
    this._registerPTTHotkey();
    this._listenForGameLaunch();
    this.gameState.start();

    // PRD: conversation resets when a new match starts, so last game's advice
    // (maybe a different agent) can't bleed into this one.
    this.eventBus.addListener((name) => {
      if (name === 'new-match') this.resetConversation();
    });

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
    const proxy = window.JINTO_PROXY || {};
    if (proxy.enabled) {
      console.log('[jinto/bg] proxy mode — services via ' + proxy.base);
      this.claude = new ClaudeService(null);
      this.tts = new CartesiaService(null);
      return;
    }
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
      if (e.name === kHotkeyToggleSettings) {
        this._toggleSettingsWindow();
      }
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
    this._convEpoch++;
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
      // Batch STT: just record while the key is held; transcription happens once on release.
      this._chunks = [];
      await this.audio.start(
        (chunk) => this._chunks.push(chunk),
        (err) => {
          console.error('[jinto/bg] mic error:', err);
          this.eventBus.trigger('state', { key: 'idle', label: 'mic error' });
        },
        (level) => this.eventBus.trigger('mic-level', level)
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
    const T = { release: performance.now() }; // latency marks; everything is measured from PTT release

    this.eventBus.trigger('ptt', 'up');
    this.eventBus.trigger('state', { key: 'thinking', label: 'transcribing' });

    // Stop the mic and wait for the recorder to flush its final chunk, then transcribe the
    // whole utterance in one shot (full-context batch beats word-by-word streaming).
    let finalText = '';
    try {
      await this.audio.stopAndFlush();
      this.eventBus.trigger('mic-level', 0); // settle the wave once the key is up
      T.flushed = performance.now();
      const chunks = this._chunks || [];
      this._chunks = [];
      if (chunks.length) {
        const blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });
        finalText = await new DeepgramService((window.JINTO_KEYS || {}).DEEPGRAM).transcribe(blob);
      }
    } catch (err) {
      console.error('[jinto/bg] transcription failed:', err);
      this.eventBus.trigger('state', { key: 'idle', label: 'stt error' });
      this.eventBus.trigger('response', '(transcription failed — try again)');
      return;
    }

    // If the user already started a new question while we transcribed, drop this one.
    if (this._pttDown) {
      console.log('[jinto/bg] new PTT during transcription — dropping stale turn');
      return;
    }

    T.stt = performance.now();
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

    // PRD: no hard code-gate. Every question reaches the model; the balanced-refusal rules
    // live in the system prompt (never a wall, never a hallucination).
    this.eventBus.trigger('state', { key: 'thinking', label: 'thinking' });
    this.eventBus.trigger('response', ''); // clear

    // Add user turn to conversation history (cap at last 20 entries).
    const convEpoch = this._convEpoch;
    this.conversation.push({ role: 'user', content: finalText });
    if (this.conversation.length > 20) this.conversation = this.conversation.slice(-20);
    // The API requires history to START with a user turn; the cap (or a mid-stream reset)
    // can violate that and would 400 every request from then on.
    while (this.conversation.length && this.conversation[0].role !== 'user') this.conversation.shift();

    let firstDelta = true;

    // Cancel any pending close from the PREVIOUS turn — otherwise its timer fires mid-answer
    // and kills the socket this turn is speaking through (text appears, no voice).
    if (this._ttsCloseTimer) { clearTimeout(this._ttsCloseTimer); this._ttsCloseTimer = null; }
    const turnId = ++this._ttsTurn;

    // For Cartesia, open the WebSocket in parallel so it's ready when Claude starts streaming
    let ttsReady = false;
    const ttsReadyPromise = (async () => {
      if (this.ttsProvider !== 'cartesia' || !this.tts) return;
      try {
        await this.tts.connect();
        this.tts.onAudioChunk = (b64) => {
          if (!T.firstAudio) { T.firstAudio = performance.now(); this._updateTimingFirstAudio(T); }
          this.player.enqueueChunk(b64);
        };
        this.tts.onError = (err) => {
          console.error('[jinto/bg] cartesia error', err);
          this.eventBus.trigger('tts-error', String((err && err.message) || err));
        };
        this.tts.startContext();
        ttsReady = true;
      } catch (err) {
        // Was silent before: the answer showed as text with no audio and no explanation.
        console.error('[jinto/bg] cartesia connect FAILED — answer will be text-only', err);
        this.eventBus.trigger('tts-error', 'voice connection failed: ' + String((err && err.message) || err));
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
      // Sentence boundaries only — comma/colon fragments made the voice sound stitched together.
      const matches = [...cartesiaBuffer.matchAll(/[.!?]\s|\n/g)];
      if (matches.length === 0) return;
      const lastMatch = matches[matches.length - 1];
      const lastIdx = lastMatch.index + lastMatch[0].length;
      const toSend = cartesiaBuffer.slice(0, lastIdx).trim();
      if (toSend) this.tts.sendText(toSend + ' ', true);
      cartesiaBuffer = cartesiaBuffer.slice(lastIdx);
    };

    // Two system blocks: the stable one (persona + all cores + rules) carries the cache
    // breakpoint so rounds/sides changing never bust the ~26k-token prefix; game state rides
    // after it uncached. Cache TTL is 5 min — consecutive questions in a match all hit.
    const promptParts = buildSystemPromptParts(this.gameState.snapshot());
    const systemBlocks = [
      { type: 'text', text: promptParts.stable, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: promptParts.volatile },
    ];

    try {
      T.llmStart = performance.now();
      const full = await this.claude.stream(
        this.conversation,
        systemBlocks,
        (chunk, accumulated) => {
          if (firstDelta) {
            T.llmFirst = performance.now();
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

      T.llmDone = performance.now();
      this._recordTiming(T);

      if (convEpoch === this._convEpoch) {
        this.conversation.push({ role: 'assistant', content: full });
      } else {
        console.log('[jinto/bg] conversation was reset mid-answer — dropping stale assistant turn');
      }

      if (this.ttsProvider === 'cartesia') {
        await ttsReadyPromise;
        if (ttsReady) {
          flushCartesia(true);
          this.tts.finish();
          // Only close if no newer turn started in the meantime.
          this._ttsCloseTimer = setTimeout(() => {
            this._ttsCloseTimer = null;
            if (this.tts && turnId === this._ttsTurn) this.tts.close();
          }, 60000); // long grace: questions inside a match reuse the warm socket
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
   * Handle a tool call from Claude. MVP has ONE tool: log_miss — silent bookkeeping of
   * questions jinto couldn't answer from its cores (PRD: the improvement backlog).
   */
  _handleToolCall(toolName, input) {
    if (toolName !== 'log_miss') return;
    const q = input && input.question;
    if (!q) return;
    const gs = this.gameState.snapshot();
    const entry = {
      q: String(q).slice(0, 300),
      reason: String((input && input.reason) || 'other').slice(0, 40),
      agent: gs.agent || null,
      map: gs.map || null,
      time: Date.now(),
    };
    try {
      const log = this.getMissLog();
      log.unshift(entry);
      localStorage.setItem('jinto-miss-log', JSON.stringify(log.slice(0, 200)));
    } catch (err) {
      console.warn('[jinto/bg] miss log write failed', err);
    }
    console.log('[jinto/bg] miss logged:', entry.reason, '—', entry.q);
    this.eventBus.trigger('miss-logged', entry);
  }

  /** The miss log, newest first. */
  // ---- latency instrumentation ----
  _recordTiming(T) {
    const ms = (a, b) => (a != null && b != null) ? Math.round(a - b) : null;
    const entry = {
      at: Date.now(),
      flush: ms(T.flushed, T.release),
      stt: ms(T.stt, T.flushed),
      llmFirst: ms(T.llmFirst, T.llmStart),
      llmTotal: ms(T.llmDone, T.llmStart),
      v2v: ms(T.firstAudio, T.release), // voice-to-voice: PTT release -> first audio chunk
      usage: this.claude ? this.claude.lastUsage : null,
    };
    T._entry = entry;
    this._timings.push(entry);
    if (this._timings.length > 50) this._timings = this._timings.slice(-50);
    const u = entry.usage || {};
    console.log('[jinto/bg] turn timing: flush ' + entry.flush + ' · stt ' + entry.stt +
      ' · first token ' + entry.llmFirst + ' · llm total ' + entry.llmTotal +
      ' · voice-to-voice ' + entry.v2v + 'ms · cache read ' + (u.cache_read_input_tokens || 0) +
      ' / wrote ' + (u.cache_creation_input_tokens || 0));
    this.eventBus.trigger('turn-timing', entry);
  }

  // First audio can land after the LLM stream finishes (TTS still speaking) — patch the
  // already-recorded entry and re-emit so the dashboard shows the real voice-to-voice number.
  _updateTimingFirstAudio(T) {
    if (T._entry && T._entry.v2v == null && T.firstAudio != null) {
      T._entry.v2v = Math.round(T.firstAudio - T.release);
      this.eventBus.trigger('turn-timing', T._entry);
    }
  }

  getTimings() {
    return this._timings.slice();
  }

  getMissLog() {
    try {
      return JSON.parse(localStorage.getItem('jinto-miss-log') || '[]');
    } catch (_) {
      return [];
    }
  }

  clearMissLog() {
    localStorage.removeItem('jinto-miss-log');
    this.eventBus.trigger('miss-logged', null);
  }

  /**
   * Kill anything in flight from the previous turn. Called at start of every new PTT press.
   */
  _cancelInFlight() {
    try { if (this.claude) this.claude.abort(); } catch (_) {}
    try {
      if (this.tts) {
        this.tts.cancel();
        // Keep the socket: barge-in means a new question is coming RIGHT NOW — the warm
        // connection is exactly what makes that next answer fast.
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
