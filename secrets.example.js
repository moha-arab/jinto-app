// Copy to secrets.local.js (gitignored) and fill in.
//
// In proxied mode only APP_KEY is required; the provider keys live in the
// server environment instead. In direct mode the provider keys are required
// and APP_KEY is unused.
window.JINTO_KEYS = {
  APP_KEY: '',    // identifies this client to jinto.gg/api
  DEEPGRAM: '',   // direct mode only
  ANTHROPIC: '',  // direct mode only
  CARTESIA: '',   // direct mode only
};
