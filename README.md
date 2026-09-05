# jinto

A real-time voice AI coach for VALORANT. You hold a key mid-match, ask a question out loud
("how do I set up my site as Killjoy?"), and hear a spoken answer in ~2 seconds without leaving
the game. It runs as an [Overwolf](https://dev.overwolf.com) native app on top of the running
game and coaches 11 agents from a hand-authored, human-reviewed knowledge base.

This README is an engineering overview: the architecture, the problems that were actually hard,
and how they were solved.

---

## The pipeline

One question is a four-stage streaming pipeline, tuned so the player hears the first words fast
rather than waiting for the whole answer:

```
push-to-talk (hold `) ──► mic capture (MediaRecorder, Opus/WebM)
      │  release
      ▼
  batch STT ──────────► Deepgram Nova-3 (prerecorded endpoint, keyterm-boosted)
      │  transcript
      ▼
  streaming LLM ──────► Claude Sonnet (SSE, one tool: log_miss)
      │  tokens, at sentence boundaries
      ▼
  streaming TTS ──────► Cartesia Sonic-3 (WebSocket, PCM chunks)
      │
      ▼
  Web Audio playback (gap-free scheduling) + on-screen text card
```

**Why batch STT, not streaming.** An earlier build streamed partial transcripts and mis-heard
short commands badly ("yo" → "nope"). Switching to a full-utterance batch transcribe on
key-release traded a little latency for a large accuracy gain, and the utterance is short enough
(a spoken question) that the batch call is still sub-second.

**Sentence-boundary TTS.** Claude's tokens are buffered and flushed to Cartesia only at sentence
boundaries. Flushing on commas/clauses made the synthesized voice sound stitched together;
whole sentences keep prosody natural while still starting playback before the full answer exists.

**Latency, measured end to end.** Every turn is instrumented with marks from PTT-release to first
audio: mic flush, STT, first LLM token, first audio. Current p50 is ~2s voice-to-voice. The
breakdown is surfaced live in an in-app debug panel, so optimization was driven by data, not
guesses — the dominant remaining cost is the model's first-token time, not anything in our code.

---

## Latency engineering

Two targeted cuts, both from reading the instrumentation:

- **Prompt caching.** The system prompt is ~30k tokens (persona + 11 agent knowledge docs +
  behavioral rules). It was being reprocessed on every question. Splitting it into a *stable*
  block (cache breakpoint) and a small *volatile* game-state tail means the 30k-token prefix is
  written to cache once and read back on every subsequent turn — verified live: 29,885 tokens
  written on the first call, read on all others. ~10× cheaper on input and noticeably faster,
  and the split is designed so round/side changes never bust the cache; only switching agents
  does.
- **Warm TTS socket.** Cartesia's WebSocket handshake costs a few hundred ms. The connection is
  now reused across turns (it supports many contexts per socket) with a long idle grace, and
  stale/cancelled-context audio is filtered so reuse can't leak old audio into a new answer.

---

## The knowledge system, and preventing hallucination

Coaching quality is the product, so the knowledge model is deliberate.

**Authored cores, not the model's memory.** Each agent has a `cores/<agent>.md` "core" — a dense,
map-agnostic coaching doc written from current guides and reviewed by a human, against a written
[style guide](cores/STYLE.md). A build step (`cores/build.js`) compiles the Markdown into
self-registering JS modules the app injects into the prompt. The model *reasons over* these docs;
it is explicitly forbidden from inventing specifics (map spots, lineups, numbers) from its own
memory, which rot and are exactly where an LLM confidently lies.

**Structural cross-agent isolation.** The hardest correctness bug: asked about Jett, the model
would borrow Cypher's abilities ("throw a cage"). Prompt rules alone didn't hold. The fix is
structural — the current agent's core is injected as the `ACTIVE CORE`, every other agent's core
is walled behind an explicit `LOCKED` barrier that only unlocks when the player names that agent,
and an ability-ownership table states which vocabulary belongs to which kit. Cross-agent bleed
went to zero and is guarded by a regression test.

**Balanced refusal.** The prompt is tuned against two failure modes at once: never fabricate, but
never over-refuse a question that's *derivable* ("should Jett carry the spike?" → reason from her
kit + universal game rules, don't punt). It also refuses live tactical calls by design ("should I
push mid?" → "that's your read, I teach the agent, I don't call the round") — both a coaching
choice and a Riot third-party-policy requirement.

---

## Evaluation harness

`cores/battery.js` is an automated behavioral eval that assembles the **exact** production prompt,
model, and tools, then grills the system with 55 scripted questions across game states: kit
mechanics, slop-bait ("any tips?" must stay specific-or-honest), refusal balance, cross-agent
regression traps, map-specific gaps, and the agent-select / no-game states. It writes a graded
report. Every prompt or knowledge change is re-run through it before shipping — the eval is the
gate that caught the cross-agent bleed and the over-refusal regressions.

---

## Secrets: the serverless proxy

The app talks to three paid APIs (Deepgram, Anthropic, Cartesia). Shipping their keys inside a
distributed desktop app is a non-starter, so the app runs in **proxy mode** against a set of
Vercel Edge Functions ([`jinto.gg/api`](https://jinto.gg)):

- `/api/llm` — streams Anthropic SSE straight through, with the model and a max-token ceiling
  enforced *server-side* so a leaked app key can't run up cost.
- `/api/stt` — Deepgram batch passthrough with fixed params.
- `/api/tts-token` — mints a short-lived (10-min) Cartesia token so the low-latency TTS
  WebSocket stays **direct from the client** while the real key never leaves the server.

Keys live only in server env vars. The client authenticates with a non-secret app key; a single
config flag (`scripts/proxy-config.js`) switches between direct-dev and proxied-prod.

---

## Game integration

Agent, map, side, round, and phase come from Overwolf's Game Events Provider (GEP), the
publisher-sanctioned event feed — no Riot API, no memory reading, no data about other players.

**The agent-lock timing bug.** VALORANT announces your agent to GEP *once*, at lock. If the app
isn't actively catching events at that instant (e.g. it was backgrounded while the player loaded
in), it never sees a second announcement and sits blank. The fix: on any signal that a match has
begun (registration, first map/round, `match_start`) with no agent known, the app polls a fresh
`getInfo()` snapshot immediately and every 2.5s until the agent appears, then stops. Detection
also degrades honestly — when the map is known but the agent isn't, the app says exactly that and
asks, rather than guessing "agent select."

---

## Architecture

Overwolf native app, plain JS with ordered script tags (no build system for the app itself).
Three windows:

- **background** — headless; owns the services and an in-process event bus. Runs the pipeline.
- **overlay** — transparent, click-through, in-game only. The text card + a mic-reactive voice
  wave (driven by live RMS off the capture stream, which doubles as a mic diagnostic).
- **desktop** — the dashboard (Alt+F in-game or on desktop): live detection, supported agents,
  last exchange, a "miss log" of questions it couldn't answer, voice settings, and the latency
  debug panel.

| Layer | Tech |
|---|---|
| App shell | Overwolf Native WebApp (vanilla JS) |
| STT | Deepgram Nova-3 (batch, keyterm boosting) |
| LLM | Claude Sonnet (streaming SSE, tool use) |
| TTS | Cartesia Sonic-3 (WebSocket, PCM streaming) |
| Audio | Web Audio API (gap-free chunk scheduling) |
| Backend | Vercel Edge Functions (key proxy + token minting) |
| Game data | Overwolf GEP (VALORANT) |
| Eval | Custom battery harness (prod-identical prompt/model/tools) |

---

*jinto isn't endorsed by Riot Games. Riot Games, VALORANT, and all associated properties are
trademarks or registered trademarks of Riot Games, Inc.*
