// deepgram-service.js
// Streaming STT via Deepgram Nova-3 WebSocket.
// Sends MediaRecorder chunks as they arrive, receives transcripts.

// Keyterm prompting (Nova-3): domain vocabulary Deepgram should expect, so "jinto" doesn't
// become "gentle" and "A site" doesn't become "a sight". Plain terms, no weights, ~50 max.
const JINTO_KEYTERMS = [
  'jinto',
  'hey jinto',
  'A site', 'B site', 'C site',
  'spike', 'retake', 'post-plant', 'lineup', 'one-way', 'molly', 'ult', 'eco',
  'anchor', 'lurk', 'flank', 'trade', 'smokes', 'entry', 'peek', 'rotate',
  // agents
  'Jett', 'Clove', 'Sova', 'Cypher', 'Reyna', 'Raze', 'Omen', 'Sage', 'Phoenix',
  'Chamber', 'Killjoy', 'Viper', 'Brimstone', 'Breach', 'Skye', 'Fade', 'Gekko',
  'Neon', 'Yoru', 'Iso', 'Deadlock', 'Harbor', 'Astra', 'Vyse', 'Tejo', 'Waylay',
  // maps
  'Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl',
  'Lotus', 'Sunset', 'Abyss', 'Corrode',
];

class DeepgramService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.onInterim = null;  // (text) => void
    this.onFinal = null;    // (text) => void
    this.onError = null;    // (Error) => void
    this._finalTextBuffer = '';
  }

  async connect() {
    if (this.ws) this.close();

    const params = new URLSearchParams({
      model: 'nova-3',
      interim_results: 'true',
      smart_format: 'true',
      punctuate: 'true',
      language: 'en',
      endpointing: '300',
    });
    // keyterm must repeat per term (no comma lists per Deepgram docs)
    for (const term of JINTO_KEYTERMS) params.append('keyterm', term);
    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    return new Promise((resolve, reject) => {
      // Auth via subprotocol — browsers can't set Authorization headers on WebSockets.
      this.ws = new WebSocket(url, ['token', this.apiKey]);

      this.ws.onopen = () => {
        console.log('[deepgram] connected');
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('[deepgram] ws error', err);
        if (this.onError) this.onError(new Error('Deepgram WebSocket error'));
        reject(err);
      };

      this.ws.onclose = (e) => {
        console.log('[deepgram] closed', e.code, e.reason);
      };

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          // Keep-alive / metadata messages — ignore
          if (data.type && data.type !== 'Results') return;

          const alt = data.channel && data.channel.alternatives && data.channel.alternatives[0];
          if (!alt) return;
          const text = (alt.transcript || '').trim();
          if (!text) return;

          if (data.is_final) {
            this._finalTextBuffer += (this._finalTextBuffer ? ' ' : '') + text;
            // Don't fire onFinal yet — Deepgram may send multiple is_final segments.
            // Pipeline calls .finish() on PTT release, which flushes via UtteranceEnd.
            if (this.onInterim) this.onInterim(this._finalTextBuffer);
          } else {
            // Interim — show user we're listening
            const preview = (this._finalTextBuffer ? this._finalTextBuffer + ' ' : '') + text;
            if (this.onInterim) this.onInterim(preview);
          }
        } catch (err) {
          console.error('[deepgram] message parse error', err, e.data);
        }
      };
    });
  }

  sendChunk(blob) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(blob);
    }
  }

  // Call on PTT release. Sends CloseStream to flush, waits for final transcript.
  async finish(timeoutMs = 1500) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const final = this._finalTextBuffer;
      this._finalTextBuffer = '';
      return final;
    }

    return new Promise((resolve) => {
      let resolved = false;
      const settle = (text) => {
        if (resolved) return;
        resolved = true;
        this._finalTextBuffer = '';
        resolve(text);
      };

      // Capture next "final" or UtteranceEnd type message
      const origHandler = this.ws.onmessage;
      this.ws.onmessage = (e) => {
        origHandler && origHandler(e);
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'UtteranceEnd' || (data.is_final && data.speech_final)) {
            settle(this._finalTextBuffer);
          }
        } catch (_) {}
      };

      // Send the close-stream signal
      try { this.ws.send(JSON.stringify({ type: 'CloseStream' })); } catch (_) {}

      // Safety timeout — return whatever we've buffered
      setTimeout(() => settle(this._finalTextBuffer), timeoutMs);
    });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this._finalTextBuffer = '';
  }
}
