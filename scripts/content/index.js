// content/index.js — registry mapping "agent|map" → content module.
// V1 ALPHA: Viper on Breeze ONLY. Other agents added once this one is perfect.

const JINTO_CONTENT = (function() {
  const modules = [
    VIPER_BREEZE,
    KILLJOY_ASCENT,
  ];
  const map = {};
  for (const m of modules) {
    if (!m || !m.agent || !m.map) continue;
    const key = (m.agent + '|' + m.map).toLowerCase();
    map[key] = m;
  }
  return map;
})();

/**
 * Look up the content module for an agent+map combo. Null if unsupported.
 */
function getContentForCombo(agent, map) {
  if (!agent || !map) return null;
  const key = (agent + '|' + map).toLowerCase();
  return JINTO_CONTENT[key] || null;
}

/**
 * Set of valid image IDs across all loaded lessons (for validating show_image tool calls).
 */
function getKnownImageIds() {
  const ids = new Set();
  for (const key in JINTO_CONTENT) {
    const m = JINTO_CONTENT[key];
    for (const l of (m.lessons || [])) {
      if (l.image) ids.add(l.image);
    }
  }
  return ids;
}

/**
 * Render lessons as a compact prompt block for Claude.
 */
function renderLessonsForPrompt(module) {
  if (!module || !module.lessons || module.lessons.length === 0) {
    return '# LESSONS\n(No lessons loaded yet — you have no specific Viper Breeze knowledge. If asked anything specific, honestly say you are still being trained on this combo and do not invent answers.)';
  }
  const lines = [];
  lines.push('# LESSONS — your COMPLETE knowledge of ' + module.agent + ' on ' + module.map);
  lines.push('This is everything you know. If a question is not covered here, say you do not have it yet. Do not invent.');
  lines.push('');
  for (const l of module.lessons) {
    lines.push('## ' + l.id);
    lines.push('Fires when player asks about: ' + (l.triggers || []).join(', '));
    lines.push('ANSWER: ' + l.short);
    if (l.expanded) lines.push('IF THEY WANT MORE: ' + l.expanded);
    if (l.image) lines.push('IMAGE: this lesson has a diagram. When you give this answer, call show_image with image_id "' + l.image + '".');
    lines.push('');
  }
  return lines.join('\n');
}
