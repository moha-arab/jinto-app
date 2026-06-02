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

  async start(onChunk, onError) {
    if (this._active) return;
    this.onChunk = onChunk;
    this.onError = onError;

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

  _cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.recorder = null;
    this._active = false;
  }

  isActive() { return this._active; }
}
