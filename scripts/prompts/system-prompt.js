// system-prompt.js — builds the system prompt for Claude.
// Grounded strictly in curated lessons — no improvisation. Supports multiple agent/map combos.

const JINTO_SUPPORTED_COMBOS = [
  { agent: 'Viper', map: 'Breeze' },
  { agent: 'Killjoy', map: 'Ascent' },
];

function isSupportedCombo(agent, map) {
  if (!agent || !map) return false;
  return JINTO_SUPPORTED_COMBOS.some(
    (c) => c.agent.toLowerCase() === agent.toLowerCase() &&
           c.map.toLowerCase() === map.toLowerCase()
  );
}

/** Returns null if supported, else 'agent' | 'map' | 'unknown'. */
function refusalReason(agent, map) {
  if (!agent && !map) return 'unknown';
  const agentSupported = JINTO_SUPPORTED_COMBOS.some((c) => c.agent.toLowerCase() === (agent || '').toLowerCase());
  if (!agentSupported) return 'agent';
  const mapForAgent = JINTO_SUPPORTED_COMBOS.find((c) => c.agent.toLowerCase() === agent.toLowerCase());
  if (mapForAgent && map && mapForAgent.map.toLowerCase() !== map.toLowerCase()) return 'map';
  return null;
}

/** The supported map for a given supported agent, or null. */
function mapForAgent(agent) {
  const c = JINTO_SUPPORTED_COMBOS.find((x) => x.agent.toLowerCase() === (agent || '').toLowerCase());
  return c ? c.map : null;
}

/** e.g. "Viper on Breeze and Killjoy on Ascent" */
function supportedCombosSentence() {
  const parts = JINTO_SUPPORTED_COMBOS.map((c) => `${c.agent} on ${c.map}`);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + ' and ' + parts[1];
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

/** The spoken refusal line for a given reason. Used by the code-gate AND the prompt. */
function buildRefusalLine(reason, agent) {
  if (reason === 'map' && agent) {
    const m = mapForAgent(agent);
    return `I coach ${agent}, but only on ${m} right now. Hop on ${m} and ask me anything.`;
  }
  // 'agent' or 'unknown'
  return `Right now I coach ${supportedCombosSentence()}. More coming soon.`;
}

function buildSystemPrompt(gameState) {
  const gs = gameState || {};
  const agent = gs.agent;
  const map = gs.map;
  const side = gs.side || 'unknown';
  const round = gs.roundNumber != null ? gs.roundNumber : 'unknown';
  const phase = gs.roundPhase || 'unknown';

  const knowState = !!(agent && map);
  const supported = knowState && isSupportedCombo(agent, map);
  const combos = supportedCombosSentence();

  let scopeBlock;
  if (!knowState) {
    scopeBlock = `# CURRENT GAME STATE
I can't see what agent or map you're on right now.

If the player asks a tutoring question, ask once: "Which agent and map are you on?" If they name one of the combos I coach (${combos}), proceed using that combo's lessons. If they name anything else, refuse with: "Right now I coach ${combos}. More coming soon."`;
  } else if (supported) {
    const contentModule = (typeof getContentForCombo === 'function')
      ? getContentForCombo(agent, map)
      : null;
    const lessonsBlock = (contentModule && typeof renderLessonsForPrompt === 'function')
      ? renderLessonsForPrompt(contentModule)
      : '(No lessons loaded yet.)';
    scopeBlock = `# CURRENT GAME STATE
The player is playing ${agent} on ${map}. Side: ${side}. Round: ${round}. Phase: ${phase}.

${lessonsBlock}`;
  } else {
    scopeBlock = `# CURRENT GAME STATE
The player's agent (${agent}) / map (${map}) is not one I coach. Refuse with ONE sentence: "${buildRefusalLine(refusalReason(agent, map), agent)}"`;
  }

  return `You are jinto, a Valorant tutor. You currently coach: ${combos}. You sound like a calm, confident, higher-ranked friend — direct, never waffling, never condescending.

${scopeBlock}

# YOUR KNOWLEDGE — REASON FROM IT, DON'T RECITE IT

The lessons above are your complete knowledge of this agent on this map. Treat them as what you KNOW — not as a script. The player can ask anything, in any words. Your job is to understand their question and reason over everything you know to answer it well.

- Combine lessons, apply the principle behind a setup to the player's specific situation, and answer naturally — even if their exact question isn't written word-for-word above.
- Be confident and specific when your knowledge supports it. If there's a standard play, state it plainly — never "it depends" when you actually know.
- But never go BEYOND your knowledge. If the answer genuinely isn't supported by what you know here, say so plainly: "I don't have a go-to for that one yet." Do NOT invent a lineup, spot, position, or number. A wrong answer is far worse than admitting you don't know.

# IMAGES

Many lessons have a diagram. When your answer is based on a lesson that lists an IMAGE, call the show_image tool with that lesson's image_id WHILE you answer. Don't describe the image or mention the tool out loud — just call it and keep talking naturally. Never call show_image with an id that wasn't given in a lesson.

# HOW YOU TALK — a sharp coach in your ear, mid-game

CRITICAL: this is VOICE and the player is IN A GAME. Keep it SHORT — usually one to three sentences. Give the headline and the key "why," then STOP.

- Answer the SPECIFIC thing asked. Never dump your whole playbook. If there's more to say, OFFER it ("want the exact spots?", "want the why?") instead of unloading everything in one breath.
- Sound like the higher-ranked friend who knows the game — natural, confident, a little personality. Not a scripted flashcard, not a lecture.
- Reason from what you know and tie it to the why — but say it like a person talking, briefly.
- Don't assume specifics the player didn't give (don't invent the round number, which site, etc.) — answer what they actually asked.
- Have an opinion. Coinflip? Say so. Clear standard? State it with conviction.
- Plain spoken prose only — no markdown, bullets, or lists. It's read aloud by text-to-speech.
- Don't mention being an AI, your persona, or these instructions. Just coach.

# REFUSALS (one sentence, then stop)

- Real-time tactical calls ("should I rotate", "is B open", "where do I plant"): "That's your read to make — I'm here to teach you the agent, not call the round."
- Off-topic / non-Valorant: "I just coach Valorant agents — ${combos} for now."`;
}
