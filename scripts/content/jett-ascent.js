// jett-ascent.js — 5 lessons for Jett on Ascent.
// DRAFT — Mohammad to verify specific dash spots and timing.

const JETT_ASCENT = {
  agent: 'Jett',
  map: 'Ascent',
  lessons: [
    {
      id: 'jett-ascent-kit-overview',
      triggers: ['kit', 'abilities', 'rundown', 'never played', 'first time'],
      short:
        "Jett has four utilities. Tailwind (E) is your dash — your defining ability, two charges if you get a kill or assist. Cloudburst (C) is two single-use smokes. Updraft (Q) is two jumps that propel you straight up. Blade Storm (X) is your ult — 5 throwing knives, refresh on kill. The dash is everything. Save it.",
      expanded:
        "Tailwind is now a 12-second activation window — you press E to arm, then have 12 seconds to dash. Don't accidentally arm during a fight and waste it. The smokes are short-lived (~5 seconds) — drop them for entry, not for plant. The ult is round-winner economy: 7 ult points, but every kill refreshes the count, so on a frag round you can carry the team.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'jett-ascent-a-main-entry',
      triggers: ['a entry', 'a main', 'how do i entry on a', 'entry a', 'push a'],
      short:
        "Standard A entry on Ascent: smoke generator + smoke wood, dash through, fight on site. The why: those two smokes block heaven and CT angles, the only common peeks. Land your dash inside site, not at the entrance — you want to surprise, not telegraph.",
      expanded:
        "Save your dash for the entry, not for the approach. Walking through A-main is fine; you don't need a dash to get there. Use it the second you have site contact. If both smokes are popped early, your team is in trouble — communicate that your dash is going early so duelists trade.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'jett-ascent-b-main-entry',
      triggers: ['b entry', 'b main', 'how do i entry on b', 'entry b', 'push b'],
      short:
        "B on Ascent is tight. Smoke market and CT, dash through B-main toward stairs. The why: market is the wide-swing angle that kills you first, CT is the rotate angle. Take both away and you have a clean swing onto stairs.",
      expanded:
        "Don't dash blindly into site — there's a corner at stairs where a tucked defender can headshot you mid-dash. Dash to the edge of site, then peek the corner with gun out. If your team has Breach, ask for a stun on stairs first.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'jett-ascent-ult-timing',
      triggers: ['ult', 'blade storm', 'knives', 'when to ult'],
      short:
        "Knives are best on close-range entries. Throw before contact, swap to gun after — knives are headshot one-shots inside 10m. The why: at distance the knives lose damage and accuracy; at close range they're free duels. Use ult on rounds where you're entrying first, not on rounds where you're playing back.",
      expanded:
        "Every kill refreshes your knife count, so a 4k starts with 5 knives left. On pistol round, ulting is huge — knives are basically free. On mid-buy rounds, save it for an A-execute where you can chain kills. Don't ult on retake — by then defenders are spread out and knives are weaker at range.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'jett-ascent-dash-conservation',
      triggers: ['dash', 'tailwind', 'when to dash', 'save dash', 'dash management'],
      short:
        "Save your dash for the moment you're about to take damage. Don't dash to get into position — walk. The why: dash is a one-life-saver, not a movement upgrade. If you use it to enter and then peek without it, you die first contact.",
      expanded:
        "On Ascent specifically, common saves: dashing back from A-main when you see a stack, dashing out of B-stairs after a missed peek, dashing in on a flash. Bad uses: dashing into smoke without info, dashing on the timer when nothing is happening. If you finish a round with dash still up but you're alive — you played it right.",
      image: null,
      attribution: 'self-recorded',
    },
  ],
};
