// How the app reaches its AI services.
//
//   enabled: false   Development. Calls Deepgram, Anthropic and Cartesia directly
//                    using keys from secrets.local.js (gitignored).
//   enabled: true    Proxied. Speech-to-text and the language model go through
//                    jinto.gg/api, where the provider keys live in server
//                    environment variables and never reach the client. Speech
//                    synthesis still connects directly, authenticated with a
//                    short-lived token minted by /api/tts-token.
//
// appKey identifies this client to the proxy. It is not a provider credential,
// but it is still read from secrets.local.js so it stays out of version control.
// See secrets.example.js for the expected shape.
window.JINTO_PROXY = {
  enabled: true,
  base: 'https://jinto.gg/api',
  appKey: (window.JINTO_KEYS && window.JINTO_KEYS.APP_KEY) || '',
};
