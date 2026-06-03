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
 * Set of valid image IDs across all loaded combos (validates show_image tool calls).
 * Supports both schemas: knowledge-shaped ({images:[{id}]}) and lesson-shaped ({lessons:[{image}]}).
 */
function getKnownImageIds() {
  const ids = new Set();
  for (const key in JINTO_CONTENT) {
    const m = JINTO_CONTENT[key];
    for (const im of (m.images || [])) if (im && im.id) ids.add(im.id);
    for (const l of (m.lessons || [])) if (l && l.image) ids.add(l.image);
  }
  return ids;
}

/**
 * Render a combo's knowledge as a prompt block for Claude.
 * Knowledge-shaped modules (preferred) → rich knowledge + a diagram list to reason over.
 * Lesson-shaped modules (legacy, e.g. Viper/Breeze) → the lesson list.
 */
function renderLessonsForPrompt(module) {
  if (!module) {
    return '(No knowledge loaded for this combo. If asked anything specific, honestly say you do not have it yet — do not invent.)';
  }

  // Knowledge-shaped (the good format)
  if (module.knowledge) {
    let s = '# YOUR KNOWLEDGE — ' + module.agent + ' on ' + module.map + '\n';
    s += 'This is the full extent of what you know about this combo. Reason over ALL of it to answer the player in your own words. If something genuinely is not covered, say you do not have it yet — never invent.\n';
    s += module.knowledge.trim() + '\n';
    if (module.images && module.images.length) {
      s += '\n# DIAGRAMS YOU CAN SHOW\nWhen your answer is about one of these, call show_image with its id (silently — do not say the id out loud):\n';
      for (const im of module.images) s += '- ' + im.id + ' — ' + (im.when || '') + '\n';
    }
    return s;
  }

  // Legacy lesson-shaped
  if (module.lessons && module.lessons.length) {
    const lines = [];
    lines.push('# YOUR KNOWLEDGE — ' + module.agent + ' on ' + module.map);
    lines.push('Reason over all of this to answer in your own words. If a question is not covered, say you do not have it yet. Do not invent.');
    lines.push('');
    for (const l of module.lessons) {
      lines.push('## ' + l.id);
      lines.push(l.short);
      if (l.expanded) lines.push('More: ' + l.expanded);
      if (l.image) lines.push('(Diagram available — call show_image with image_id "' + l.image + '".)');
      lines.push('');
    }
    return lines.join('\n');
  }

  return '(No knowledge loaded for this combo yet — say so honestly, do not invent.)';
}
