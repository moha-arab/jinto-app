// schema.js — type definitions for jinto's content modules.

/**
 * @typedef {Object} Lesson
 * @property {string}   id          Unique ID, e.g., "viper-breeze-b-wall".
 * @property {string[]} triggers    Phrases a player might say that should fire this lesson.
 * @property {string}   short       1-3 sentence answer in jinto's voice, with the "why" attached.
 * @property {string}   [expanded]  Optional longer answer for "more" / "explain" follow-ups.
 * @property {string|null} [image]  Optional image filename in img/overlay/ (Phase 5).
 * @property {string}   [attribution] "self-recorded" | "via G2 vs FNATIC" | etc.
 */

/**
 * @typedef {Object} ContentModule
 * @property {string}   agent       Display name, e.g., "Viper"
 * @property {string}   map         Display name, e.g., "Breeze"
 * @property {Lesson[]} lessons
 */
