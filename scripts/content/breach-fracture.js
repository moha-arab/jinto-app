// breach-fracture.js — 5 lessons for Breach on Fracture.
// DRAFT — Mohammad to verify specific flash and stun positions.

const BREACH_FRACTURE = {
  agent: 'Breach',
  map: 'Fracture',
  lessons: [
    {
      id: 'breach-fracture-kit-overview',
      triggers: ['kit', 'abilities', 'rundown', 'never played', 'first time'],
      short:
        "Breach has four utilities. Flashpoint (Q) is two flashes through walls — wide blind cone. Fault Line (E) is one stun in a line. Aftershock (C) is one delayed-damage zone through walls. Rolling Thunder (X) is your ult — a huge stun line across most of a site. You're a flash + stun setup agent. Every util goes through walls.",
      expanded:
        "Breach is the rare agent where the kit is meant to be used proactively, not held. You have 2 flashes + 1 stun + 1 aftershock per round — they all reset on round end. Use them. The mistake new Breaches make is hoarding util for 'the right moment' and then not using it. Default is: flash on entry, stun on contact, aftershock on lurkers.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'breach-fracture-a-flash-chain',
      triggers: ['a flash', 'flash a', 'a execute flash', 'how do i flash a', 'flash for a'],
      short:
        "Standard A execute flash: pop both flashpoints across A-main wall so they blind defenders on site. The why: Fracture A has tight angles — your team can't peek site without dying unless defenders are blind. Chain your two flashes so the second one covers the first's fade.",
      expanded:
        "Timing matters. First flash 0.5 seconds before your duelist enters, second flash 1.5 seconds after the first. Defenders look away from flash one, get caught looking back by flash two. Practice the timing in a custom — listen for the flash sound, count the gap before throwing the second.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'breach-fracture-b-aftershock',
      triggers: ['b aftershock', 'aftershock b', 'b main aftershock', 'clear b'],
      short:
        "Aftershock on B-main clears the common defender tuck. Stand outside main, aim through the wall at the corner inside main, throw. The why: that corner kills duelists first-peek every round. An aftershock there forces defenders to move before you push.",
      expanded:
        "If they don't move, aftershock does ~70 damage — your duelist trades easy. If they move, you have free entry. Pair with a fault line stun if you can — stun first, aftershock on the cover spot, push.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'breach-fracture-ult-use',
      triggers: ['ult', 'rolling thunder', 'when to ult', 'how do i ult'],
      short:
        "Rolling Thunder on full-site executes, not solo plays. Aim it down the long axis of the site — every defender in the cone gets concussed. The why: it's a huge AOE stun, basically a 'free site' button if your team commits behind it.",
      expanded:
        "Bad use: ulting alone on retake. The stun is 4 seconds, but if you're solo by the time defenders are stunned, they're already up and shooting. Always ult when your team is committed to pushing. On Fracture B, the line goes through site from B-main; on A, through site from arcade.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'breach-fracture-stun-flash-combo',
      triggers: ['stun flash combo', 'flash stun', 'combo', 'fault line', 'breach combo'],
      short:
        "Stun first, then flash. The why: stun hits defenders looking away (they hear it land), flash catches them turning. Two pieces of util on one duelist's entry = they trade or kill, every time.",
      expanded:
        "Stun goes through walls — you don't need line of sight. So you can stun a corner you can't see, then push the flash. The order matters: flash-then-stun blinds them and they hold the same angle; stun-then-flash makes them reorient mid-stun and they're caught looking around.",
      image: null,
      attribution: 'self-recorded',
    },
  ],
};
