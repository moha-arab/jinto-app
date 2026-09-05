// audio-capture-service.js
// Captures microphone audio while PTT is held. Sends 100ms chunks to a callback.
// Uses MediaRecorder (Opus in WebM container) — Deepgram auto-detects.

class AudioCaptureService {
  constructor() {
    this.stream = null;
    this.recorder = null;
    this.onChunk = null;  // (Blob) => void
    this.onError = null;  // (Error) => void
    this._active = false;
  }

  async start(onChunk, onError, onLevel) {
    if (this._active) return;
    this.onChunk = onChunk;
    this.onError = onError;
    this.onLevel = onLevel; // (0..1) live mic loudness, for the reactive wave

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // MediaRecorder with Opus is widely supported in Chromium
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      this.recorder = new MediaRecorder(this.stream, { mimeType: mime });

      this.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && this.onChunk) {
          this.onChunk(e.data);
        }
      };
      this.recorder.onerror = (e) => {
        console.error('[audio-capture] recorder error', e);
        if (this.onError) this.onError(e.error || new Error('recorder error'));
      };

      this.recorder.start(100); // 100ms chunks
      this._active = true;

      // Live mic-level meter off the SAME stream: lets the overlay wave react to real audio,
      // so a flat wave while you talk means the mic (not jinto) is the problem.
      try {
        this._levelCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = this._levelCtx.createMediaStreamSource(this.stream);
        const analyser = this._levelCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        this._levelTimer = setInterval(() => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / buf.length);
          if (this.onLevel) this.onLevel(Math.max(0, Math.min(1, rms * 3.5)));
        }, 50);
      } catch (e) {
        console.warn('[audio-capture] level meter unavailable', e);
      }
      console.log('[audio-capture] started, mime=' + mime);
    } catch (err) {
      console.error('[audio-capture] getUserMedia failed:', err);
      if (this.onError) this.onError(err);
      this._cleanup();
      throw err;
    }
  }

  stop() {
    if (!this._active) return;
    try {
      if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.stop();
      }
    } catch (err) {
      console.warn('[audio-capture] stop warn', err);
    }
    this._cleanup();
    console.log('[audio-capture] stopped');
  }

  /**
   * Stop and wait for the recorder to flush its final chunk (MediaRecorder delivers the tail
   * of the audio asynchronously after stop). Required for batch transcription — without the
   * flush, the last word of the question gets cut off.
   */
  async stopAndFlush(timeoutMs = 800) {
    if (!this._active || !this.recorder) { this._cleanup(); return; }
    const rec = this.recorder;
    await new Promise((resolve) => {
      let done = false;
      const settle = () => { if (!done) { done = true; resolve(); } };
      rec.onstop = settle;
      setTimeout(settle, timeoutMs);
      try {
        if (rec.state !== 'inactive') rec.stop();
        else settle();
      } catch (_) { settle(); }
    });
    this._cleanup();
    console.log('[audio-capture] stopped (flushed)');
  }

  _cleanup() {
    if (this._levelTimer) { clearInterval(this._levelTimer); this._levelTimer = null; }
    if (this._levelCtx) { try { this._levelCtx.close(); } catch (_) {} this._levelCtx = null; }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.recorder = null;
    this._active = false;
  }

  isActive() { return this._active; }
}
