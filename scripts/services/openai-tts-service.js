// openai-tts-service.js
// OpenAI gpt-4o-mini-tts — clean AI-assistant voice, less uncanny than realistic TTS.
// Uses the `instructions` field to nudge prosody toward calm/synthetic mentor feel.
// Plays via HTML5 <audio> with a queue so chunks land in order.

class OpenAITtsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model  = 'gpt-4o-mini-tts';
    this.voice  = 'alloy';   // neutral / AI-assistant feel — see VOICE OPTIONS below
    this.instructions = "Speak with a clear, modern AI assistant voice. Slightly synthetic, friendly, not mature or grave. Younger-sounding. Even pacing. Avoid dramatic or storyteller delivery — you are an AI, not a narrator.";
    this.audioQueue = [];   // queued <audio> elements awaiting playback
    this.playing = false;
    this.activeAudio = null;
    this.volume = 1.0;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.activeAudio) this.activeAudio.volume = this.volume;
    for (const a of this.audioQueue) a.volume = this.volume;
  }

  /**
   * Synthesize and queue a chunk of text. Returns when the HTTP request finishes
   * (NOT when audio plays out — queued behind any prior chunks).
   */
  async speak(text) {
    if (!text || !text.trim()) return;
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          voice: this.voice,
          input: text,
          instructions: this.instructions,
          response_format: 'mp3',
        }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('[openai-tts] HTTP', response.status, errText.slice(0, 200));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = this.volume;
      this.audioQueue.push(audio);
      this._playNext();
    } catch (err) {
      console.error('[openai-tts]', err);
    }
  }

  _playNext() {
    if (this.playing) return;
    if (this.audioQueue.length === 0) return;
    this.playing = true;
    const audio = this.audioQueue.shift();
    this.activeAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      this.activeAudio = null;
      this.playing = false;
      this._playNext();
    };
    audio.onerror = (e) => {
      console.error('[openai-tts] audio playback error', e);
      this.activeAudio = null;
      this.playing = false;
      this._playNext();
    };
    audio.play().catch((err) => {
      console.error('[openai-tts] play() rejected', err);
      this.activeAudio = null;
      this.playing = false;
      this._playNext();
    });
  }

  /**
   * Cancel everything queued and stop the current audio. For barge-in.
   */
  cancel() {
    if (this.activeAudio) {
      try { this.activeAudio.pause(); } catch (_) {}
      try { URL.revokeObjectURL(this.activeAudio.src); } catch (_) {}
      this.activeAudio = null;
    }
    for (const a of this.audioQueue) {
      try { URL.revokeObjectURL(a.src); } catch (_) {}
    }
    this.audioQueue = [];
    this.playing = false;
  }

  isPlaying() {
    return this.playing || this.audioQueue.length > 0;
  }
}

/* ============================================================
   VOICE OPTIONS — swap `this.voice` above:
   - 'alloy'   : neutral / AI-assistant feel (CURRENT — most synthetic-coded)
   - 'sage'    : clear, calm, younger
   - 'coral'   : bright, friendly
   - 'ballad'  : warm, soft
   - 'verse'   : lively, modern
   - 'echo'    : calm male (older feel)
   - 'onyx'    : deeper male, authoritative
   - 'nova'    : energetic female
   - 'shimmer' : soft female
   - 'fable'   : British, expressive
   - 'ash'     : confident male
   ============================================================ */
