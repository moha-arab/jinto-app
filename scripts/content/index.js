// content/index.js — agent CORE registry.
// A core = per-agent, map-agnostic coaching knowledge (PRD scope 1).
// Each core file pushes onto window.JINTO_CORE_MODULES and gets a <script> tag in
// background.html BEFORE this file. Entry shape: { agent: 'Jett', patch: '13.00', knowledge: '...' }

const JINTO_CORES = (function () {
  const mods = (typeof window !== 'undefined' && window.JINTO_CORE_MODULES) || [];
  const list = [];
  for (const m of mods) {
    if (!m || !m.agent || !m.knowledge) continue;
    list.push({ agent: m.agent, patch: m.patch || 'unknown', knowledge: m.knowledge });
  }
  return list;
})();

/** All loaded cores. */
function getAllCores() {
  return JINTO_CORES.slice();
}

/** The core for one agent, or null. */
function getCore(agent) {
  if (!agent) return null;
  const a = String(agent).toLowerCase();
  return JINTO_CORES.find((c) => c.agent.toLowerCase() === a) || null;
}

/** Names of agents jinto knows, e.g. ['Jett', 'Clove']. */
function getSupportedAgents() {
  return JINTO_CORES.map((c) => c.agent);
}
