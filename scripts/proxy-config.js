// proxy-config.js — how the app reaches its AI services.
// enabled=false: dev mode, direct API calls with keys from secrets.local.js.
// enabled=true: everything goes through jinto.gg/api (keys live in Vercel env
// vars; Cartesia gets a short-lived minted token so its WebSocket stays direct).
// The appKey only gates casual abuse of the proxy — it ships inside the app and
// is not a secret in the cryptographic sense.
window.JINTO_PROXY = {
  enabled: false, // flip once Vercel env vars are set and endpoints verified
  base: 'https://jinto.gg/api',
  appKey: 'REDACTED',
};
