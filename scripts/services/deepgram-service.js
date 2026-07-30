// deepgram-service.js
// Batch STT via Deepgram Nova-3 (prerecorded endpoint).
// PTT hands us the COMPLETE utterance on key release, so we transcribe it in one shot with
// full sentence context — far more accurate than live streaming, which must commit to guesses
// word-by-word with no context ("yo" -> "nope"). Latency is comparable: the old streaming
// path already waited up to 1.5s after release to finalize.

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
  }

  /**
   * Transcribe a complete audio blob (webm/opus from MediaRecorder). Returns the transcript
   * string ('' if nothing was heard). Throws on HTTP/network errors or timeout.
   */
  async transcribe(blob, timeoutMs = 6000) {
    const params = new URLSearchParams({
      model: 'nova-3',
      smart_format: 'true',
      punctuate: 'true',
      language: 'en',
    });
    // keyterm must repeat per term (no comma lists per Deepgram docs)
    for (const term of JINTO_KEYTERMS) params.append('keyterm', term);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch('https://api.deepgram.com/v1/listen?' + params.toString(), {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + this.apiKey,
          'Content-Type': blob.type || 'audio/webm',
        },
        body: blob,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new Error('Deepgram HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
      }
      const data = await res.json();
      const alt = data.results && data.results.channels && data.results.channels[0]
        && data.results.channels[0].alternatives && data.results.channels[0].alternatives[0];
      return ((alt && alt.transcript) || '').trim();
    } finally {
      clearTimeout(timer);
    }
  }
}
