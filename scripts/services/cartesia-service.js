// cartesia-service.js
// Streaming TTS via Cartesia WebSocket. Sends text chunks as Claude streams, plays audio out.

const CARTESIA_VERSION = '2026-03-01';
const CARTESIA_MODEL = 'sonic-3';

// jinto voice — "Zeke - Friendly Sidekick". Young adult male, gaming/entertainment character.
// Description: "High pitched, friendly, young adult male for gaming and entertainment characters."
// Less mature than realistic voices → less uncanny → less creepy.
// Alternatives if Zeke doesn't fit:
//   '1463a4e1-56a1-4b41-b257-728d56e93605' = Hugo — Teatime Friend (young adult British, expressive)
//   'd7862948-75c3-4c7c-ae28-2959fe166f49' = Caspian — Oracle (echo-y, mystical, gravitas)
//   'fb26447f-308b-471e-8b00-8e9f04284eb5' = Thistle — Troublemaker (gender-neutral whimsical character)
//   'ec58877e-44ae-4581-9078-a04225d42bd4' = Charles — Heroic Man (very deep, strong)
const CARTESIA_DEFAULT_VOICE_ID = 'e00d0e4c-a5c8-443f-a8a3-473eb9a62355';

class CartesiaService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.voiceId = CARTESIA_DEFAULT_VOICE_ID;
    this.ws = null;
    this.contextId = null;
    this.onAudioChunk = null; // (base64String) => void
    this.onError = null;
    this.onDone = null;
  }

  async connect() {
    // Reuse a healthy socket: the WSS handshake costs a few hundred ms per turn, and Cartesia
    // supports many contexts per connection. A dead/half-open socket is replaced below.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.ws) this.close();

    const url = `wss://api.cartesia.ai/tts/websocket?cartesia_version=${CARTESIA_VERSION}&access_token=${encodeURIComponent(this.apiKey)}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[cartesia] connected');
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('[cartesia] ws error', err);
        if (this.onError) this.onError(new Error('Cartesia WebSocket error'));
        reject(err);
      };

      this.ws.onclose = (e) => {
        console.log('[cartesia] closed', e.code, e.reason);
        this.ws = null; // never let connect() reuse a closed socket
      };

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          // With socket reuse, a late message from a finished/cancelled context must not
          // leak into the current turn's audio.
          if (data.context_id && this.contextId && data.context_id !== this.contextId) return;
          if (data.type === 'chunk' && !this.contextId) return; // cancelled turn: eat late audio
          if (data.type === 'chunk' && data.data) {
            if (this.onAudioChunk) this.onAudioChunk(data.data);
          } else if (data.type === 'done' || data.done === true) {
            if (this.onDone) this.onDone();
          } else if (data.type === 'error') {
            console.error('[cartesia] server error', data);
            if (this.onError) this.onError(new Error('Cartesia: ' + (data.error || 'unknown')));
          }
        } catch (err) {
          console.error('[cartesia] parse error', err, e.data);
        }
      };
    });
  }

  /**
   * Start a new TTS context (one per response).
   * @returns {string} contextId
   */
  startContext() {
    this.contextId = 'jinto-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    return this.contextId;
  }

  /**
   * Send a text chunk to be spoken. `continue` true means more is coming.
   */
  sendText(transcript, continueAfter = true) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!transcript) return;
    const msg = {
      model_id: CARTESIA_MODEL,
      transcript,
      voice: { mode: 'id', id: this.voiceId },
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 44100,
      },
      context_id: this.contextId,
      continue: continueAfter,
      language: 'en',
    };
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Signal that no more text will follow for this context. Cartesia flushes remaining audio.
   */
  finish() {
    // Per Cartesia docs, send a final message with continue: false and empty transcript.
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = {
      model_id: CARTESIA_MODEL,
      transcript: '',
      voice: { mode: 'id', id: this.voiceId },
      output_format: {
        container: 'raw',
        encoding: 'pcm_s16le',
        sample_rate: 44100,
      },
      context_id: this.contextId,
      continue: false,
      language: 'en',
    };
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Cancel current generation immediately (for barge-in).
   */
  cancel() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.contextId) return;
    this.ws.send(JSON.stringify({ context_id: this.contextId, cancel: true }));
    this.contextId = null;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this.contextId = null;
  }
}
