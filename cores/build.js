// cores/build.js — converts cores/*.md (the editable docs) into the app's content modules.
// Run after any core edit:  node cores/build.js
// Emits scripts/content/cores/<agent>.js files that self-register on window.JINTO_CORE_MODULES.
// JSON-escaping the knowledge string avoids every backtick/quote/template-literal hazard.

const fs = require('fs');
const path = require('path');

const CORES_DIR = __dirname;
const OUT_DIR = path.join(__dirname, '..', 'scripts', 'content', 'cores');

const AGENT_NAMES = { jett: 'Jett', clove: 'Clove', sova: 'Sova', cypher: 'Cypher' };

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(CORES_DIR).filter((f) => f.endsWith('.md') && f !== 'STYLE.md');
let count = 0;

for (const file of files) {
  const key = path.basename(file, '.md');
  const agent = AGENT_NAMES[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  const raw = fs.readFileSync(path.join(CORES_DIR, file), 'utf8');

  // Pull the patch from the header stamp; strip the H1 and the stamp line from the knowledge
  // (the system prompt adds its own "## <Agent> core (written against patch X)" header).
  const patchMatch = raw.match(/written against patch\s+([\d.]+)/i);
  const patch = patchMatch ? patchMatch[1] : 'unknown';

  const lines = raw.split('\n');
  const body = [];
  let stripped = 0;
  for (const line of lines) {
    const t = line.trim();
    if (stripped < 2 && (t.startsWith('# ') || /written against patch/i.test(t))) {
      stripped++;
      continue;
    }
    body.push(line);
  }
  const knowledge = body.join('\n').trim();

  const out =
    '// GENERATED from cores/' + file + ' — do not edit by hand. Edit the .md and run: node cores/build.js\n' +
    '(window.JINTO_CORE_MODULES = window.JINTO_CORE_MODULES || []).push({\n' +
    '  agent: ' + JSON.stringify(agent) + ',\n' +
    '  patch: ' + JSON.stringify(patch) + ',\n' +
    '  knowledge: ' + JSON.stringify(knowledge) + ',\n' +
    '});\n';

  fs.writeFileSync(path.join(OUT_DIR, key + '.js'), out);
  console.log(agent + ': patch ' + patch + ', ' + knowledge.split(/\s+/).length + ' words -> scripts/content/cores/' + key + '.js');
  count++;
}

console.log(count + ' core(s) built.');
