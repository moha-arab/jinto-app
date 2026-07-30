// audio-player-service.js
// Queues PCM audio chunks from Cartesia and plays them via Web Audio API.
// Schedules each chunk to start exactly when the previous one ends — no gaps.

class AudioPlayerService {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.ctx = null;
    this.gain = null;
    this.volume = 1.0;
    this.nextStartTime = 0;
    this.activeSources = [];
  }

  ensureContext() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
      this.nextStartTime = 0;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain) this.gain.gain.value = this.volume;
  }

  /**
   * Decode a base64-encoded PCM s16le chunk and schedule it for playback.
   */
  enqueueChunk(base64Data) {
    if (!base64Data) return;
    this.ensureContext();

    try {
      // base64 -> Uint8Array
      const binStr = atob(base64Data);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

      // s16le PCM -> Float32 [-1, 1]
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      // Build a 1-channel AudioBuffer at our sample rate
      const buffer = this.ctx.createBuffer(1, float32.length, this.sampleRate);
      buffer.getChannelData(0).set(float32);

      // Schedule playback at nextStartTime (so chunks line up seamlessly)
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gain);

      const now = this.ctx.currentTime;
      const startAt = Math.max(now, this.nextStartTime);
      source.start(startAt);

      this.nextStartTime = startAt + buffer.duration;
      this.activeSources.push(source);

      // Clean up after the source finishes
      source.onended = () => {
        const i = this.activeSources.indexOf(source);
        if (i > -1) this.activeSources.splice(i, 1);
      };
    } catch (err) {
      console.error('[audio-player] enqueue failed', err);
    }
  }

  /**
   * Tear down the AudioContext so the next play rebinds to the CURRENT default output
   * device. Needed after headset plug/unplug — the old context keeps routing to the
   * dead device and everything plays into the void.
   */
  reset() {
    try { this.stopAll(); } catch (_) {}
    if (this.ctx) { try { this.ctx.close(); } catch (_) {} }
    this.ctx = null;
    this.gain = null;
    this.nextStartTime = 0;
  }

  /**
   * Stop all currently-playing audio immediately (for barge-in).
   */
  stopAll() {
    for (const source of this.activeSources) {
      try { source.stop(); } catch (_) {}
    }
    this.activeSources = [];
    this.nextStartTime = this.ctx ? this.ctx.currentTime : 0;
  }

  isPlaying() {
    return this.activeSources.length > 0 || (this.ctx && this.nextStartTime > this.ctx.currentTime);
  }
}
