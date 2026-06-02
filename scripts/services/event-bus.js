// event-bus.js — lightweight pub/sub for cross-window IPC.
// No ES modules — loaded as a regular <script> in background.html and overlay.html.
// Background window owns the instance; other windows access it via overwolf.windows.getMainWindow().

class EventBus {
  constructor() {
    this._listeners = [];
  }

  addListener(handler) {
    this._listeners.push(handler);
  }

  removeListener(handler) {
    const i = this._listeners.indexOf(handler);
    if (i > -1) this._listeners.splice(i, 1);
  }

  trigger(name, value) {
    this._listeners.forEach((l) => {
      try { l(name, value); } catch (err) { console.error('[event-bus]', err); }
    });
  }
}
