// web-speech-service.js
// Uses the browser's built-in speechSynthesis API.
// Microsoft David Desktop on Windows = famously robotic TTS — matches the "AI not realistic" vibe.
// Tradeoff: lower quality than Cartesia, but free and instantly synthetic.

class WebSpeechService {
  constructor() {
    this.voice = null;
    this.activeUtterance = null;
    this.queue = [];
    this.onError = null;
    this.onDone = null;
    this.volume = 1.0;
    this._loadVoices();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
  }

  _loadVoices() {
    if (!('speechSynthesis' in window)) {
      console.error('[webspeech] speechSynthesis not supported');
      return;
    }
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return false;
      // Prefer Microsoft David (most robotic-sounding Windows voice).
      // Fall back to any English male voice, then any English voice.
      this.voice =
        voices.find(v => v.name.toLowerCase().includes('david')) ||
        voices.find(v => v.name.toLowerCase().includes('mark')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0];
      console.log('[webspeech] picked voice:', this.voice && this.voice.name);
      return true;
    };
    if (!pick()) {
      // Voices load asynchronously on some browsers
      window.speechSynthesis.addEventListener('voiceschanged', () => pick(), { once: true });
    }
  }

  /**
   * Speak a chunk of text. Multiple calls queue up and play in order.
   * Cancels any silence between utterances.
   */
  speak(text) {
    if (!text || !text.trim()) return;
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 1.05;   // slightly faster than default
    utterance.pitch = 1.0;
    utterance.volume = this.volume;

    utterance.onerror = (e) => {
      console.warn('[webspeech] utterance error', e);
      if (this.onError) this.onError(e);
    };
    utterance.onend = () => {
      if (this.activeUtterance === utterance) this.activeUtterance = null;
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && this.onDone) {
        this.onDone();
      }
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Cancel current and queued speech immediately (for barge-in).
   */
  cancel() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
  }

  isPlaying() {
    return 'speechSynthesis' in window &&
      (window.speechSynthesis.speaking || window.speechSynthesis.pending);
  }
}
