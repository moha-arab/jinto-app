// cores/battery.js — the question battery: grills jinto exactly as the app runs it
// (same prompt assembly, same model, same tools) and writes a report for review.
// Run:  node cores/battery.js     Output: cores/battery-report.md (untracked)

const fs = require('fs');
const path = require('path');

// ---- assemble jinto's brain exactly like background.html does ----
globalThis.window = {};
const root = path.join(__dirname, '..');
const load = (p) => (0, eval)(fs.readFileSync(path.join(root, p), 'utf8'));
load('scripts/content/cores/jett.js');
load('scripts/content/cores/clove.js');
load('scripts/content/cores/sova.js');
load('scripts/content/cores/cypher.js');
load('scripts/content/index.js');
load('scripts/prompts/system-prompt.js');

const secrets = fs.readFileSync(path.join(root, 'secrets.local.js'), 'utf8');
const keyMatch = secrets.match(/ANTHROPIC:\s*['"]([^'"]+)['"]/);
if (!keyMatch) { console.error('no ANTHROPIC key found in secrets.local.js'); process.exit(1); }
const API_KEY = keyMatch[1];

const TOOLS = [{
  name: 'log_miss',
  description: 'Silently record a question you could not fully answer from your coaching cores (unsupported agent, map-specific gap, or knowledge genuinely missing from the docs). Call this IN ADDITION to your short honest spoken answer — never instead of it. Never mention this tool or the word "log" to the player. Questions about jinto itself are never misses.',
  input_schema: { type: 'object', properties: {
    question: { type: 'string' }, reason: { type: 'string' },
  }, required: ['question', 'reason'] },
}];

// ---- game states (grouped so identical system prompts hit the cache) ----
const STATES = {
  jettAtk:   { agent: 'Jett',   map: 'Ascent', side: 'attack',  roundNumber: 3,  roundPhase: 'shopping' },
  jettDef:   { agent: 'Jett',   map: 'Ascent', side: 'defense', roundNumber: 14, roundPhase: 'shopping' },
  cloveDef:  { agent: 'Clove',  map: 'Split',  side: 'defense', roundNumber: 2,  roundPhase: 'shopping' },
  cloveAtk:  { agent: 'Clove',  map: 'Split',  side: 'attack',  roundNumber: 15, roundPhase: 'shopping' },
  sovaAtk:   { agent: 'Sova',   map: 'Haven',  side: 'attack',  roundNumber: 5,  roundPhase: 'shopping' },
  cypherDef: { agent: 'Cypher', map: 'Pearl',  side: 'defense', roundNumber: 1,  roundPhase: 'shopping' },
  cypherAtk: { agent: 'Cypher', map: 'Pearl',  side: 'attack',  roundNumber: 13, roundPhase: 'shopping' },
  select:    { agent: null,     map: 'Ascent' },
  noGame:    {},
};

// ---- the battery ----
const Q = [
  // Jett attack: kit, reasoning, slop bait
  ['jettAtk', 'should I carry the bomb?', 'derivable: no — she entries first'],
  ['jettAtk', 'why do I keep dying when I dash in?', 'core: dry entry / landing spot rules'],
  ['jettAtk', 'when should I use my ult?', 'core: ult economy'],
  ['jettAtk', 'they have an op, what do I do?', 'core: op counter'],
  ['jettAtk', 'any tips?', 'slop bait: must stay specific-or-honest'],
  ['jettAtk', 'how do I aim better?', 'generic bait: honest one-liner'],
  ['jettAtk', 'should I buy an operator on attack?', 'core: rifle on attack'],
  ['jettAtk', 'give me a one-way for B', 'regression: must use JETT smoke one-way, never Cypher cage (prod bug 7/18)'],
  ['jettAtk', 'wait how does the Clove ult work again?', 'named other agent mid-match: her core unlocks'],
  ['jettAtk', 'is Reyna better than Jett?', 'unsupported-adjacent + meta-ish: no tier talk'],
  // Jett defense
  ['jettDef', 'where should I play on defense?', 'core: op/off-angles, side-aware'],
  ['jettDef', 'should I rotate to B?', 'live tactical: refuse line'],
  // Clove defense
  ['cloveDef', 'where should I position?', 'core: mid default (Mohammad doctrine)'],
  ['cloveDef', 'should I smoke at the start of the round?', 'core: not on first footsteps'],
  ['cloveDef', 'give me a one-way for B site', 'map-specific: honest + principle + log_miss'],
  ['cloveDef', 'when do I use my ult?', 'core: ult conditions'],
  // Clove attack
  ['cloveAtk', 'should I entry first?', 'core: second body in'],
  ['cloveAtk', 'when do I pop my heal?', 'core: pre-swing not post-kill'],
  ['cloveAtk', 'my smokes feel useless, what am I doing wrong?', 'core: timing/placement mistakes'],
  // Sova attack
  ['sovaAtk', 'when do I dart?', 'core: timing weapon'],
  ['sovaAtk', 'how should I use my drone with my duelist?', 'core: drone-entry pattern'],
  ['sovaAtk', 'should I learn lineups?', 'core: three-per-site take'],
  ['sovaAtk', 'what do I do with shocks?', 'core: util burning / pre-swing flush'],
  // Cypher
  ['cypherDef', 'how do I set up my trips?', 'core: principles, no map specifics invented'],
  ['cypherDef', 'someone keeps breaking my wires, what do I do?', 'derivable from vary-the-web'],
  ['cypherAtk', 'when should I lurk?', 'core: legal start time'],
  ['cypherAtk', 'where exactly do I put my trips on this map?', 'map-specific: principle + log_miss'],
  // Agent select
  ['select', 'what agents do you support?', 'self: list four, no refusal'],
  ['select', 'how should I play Jett here?', 'unlocked coaching from core'],
  ['select', 'should I pick Omen?', 'unsupported: honest redirect + log_miss'],
  // No game
  ['noGame', 'what can you do?', 'self-facts'],
  ['noGame', 'tell me about Clove', 'desktop coaching'],
  ['noGame', 'whats the best pizza topping?', 'offtopic: one friendly line back'],
];

async function ask(state, q) {
  const system = globalThis.buildSystemPrompt(STATES[state]);
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    tools: TOOLS,
    messages: [{ role: 'user', content: q }],
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status === 529) {
      const wait = 25000 * (attempt + 1);
      console.log('  rate limited, waiting ' + wait / 1000 + 's...');
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 200));
    const data = await res.json();
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
    const tools = data.content.filter((b) => b.type === 'tool_use').map((b) => b.name + '(' + JSON.stringify(b.input) + ')');
    return { text, tools, usage: data.usage };
  }
  throw new Error('rate limited after 3 attempts');
}

(async () => {
  const only = process.argv[2]; // optional substring filter: node cores/battery.js "one-way"
  const list = only ? Q.filter(([, q]) => q.includes(only)) : Q;
  const rows = [];
  let n = 0;
  for (const [state, q, expect] of list) {
    n++;
    process.stdout.write('[' + n + '/' + Q.length + '] (' + state + ') ' + q + '\n');
    try {
      const r = await ask(state, q);
      const words = r.text.split(/\s+/).filter(Boolean).length;
      rows.push({ n, state, q, expect, text: r.text, tools: r.tools, words });
      console.log('  -> (' + words + 'w' + (r.tools.length ? ', ' + r.tools.join(' ') : '') + ') ' + r.text.slice(0, 100));
    } catch (err) {
      rows.push({ n, state, q, expect, text: 'ERROR: ' + err.message, tools: [], words: 0 });
      console.log('  -> ERROR ' + err.message);
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  const gs = (s) => { const g = STATES[s]; return g.agent ? g.agent + '/' + g.map + ' ' + g.side : (g.map ? 'select@' + g.map : 'no game'); };
  let md = '# jinto battery report\n\n';
  for (const r of rows) {
    md += '## ' + r.n + '. [' + gs(r.state) + '] "' + r.q + '"\n';
    md += '*expect: ' + r.expect + ' · ' + r.words + ' words' + (r.tools.length ? ' · ' + r.tools.join(' ') : '') + '*\n\n';
    md += '> ' + r.text.replace(/\n/g, '\n> ') + '\n\n';
  }
  const over = rows.filter((r) => r.words > 40).length;
  md += '---\n' + rows.length + ' questions · ' + over + ' answers over 40 words\n';
  fs.writeFileSync(path.join(__dirname, only ? 'battery-report-partial.md' : 'battery-report.md'), md);
  console.log('\nDONE. ' + rows.length + ' questions, ' + over + ' over 40 words. Report: cores/battery-report.md');
})();
