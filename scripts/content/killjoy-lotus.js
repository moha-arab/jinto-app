// killjoy-lotus.js — 5 lessons for Killjoy on Lotus.
// DRAFT — Mohammad to verify map-specific positioning.

const KILLJOY_LOTUS = {
  agent: 'Killjoy',
  map: 'Lotus',
  lessons: [
    {
      id: 'killjoy-lotus-kit-overview',
      triggers: ['kit', 'abilities', 'rundown', 'never played', 'first time'],
      short:
        "Killjoy has four utilities. Turret (E) is your free intel — 180° cone, deployable, gets shot easily. Alarmbot (Q) is one bot that detects + applies vulnerable on hit. Nanoswarm (C) is two mollies. Lockdown (X) is your ult — big detain zone that charges off orbs. Turret is most-used; mollies decide post-plants.",
      expanded:
        "Range matters — your util has a ~40m leash from where you are. If you leave that range, turret + alarmbot disable. On Lotus that means staying near your setup; you can't push aggressively without losing your kit. Learn to think in 'rounds where I trust my util' vs 'rounds where I trust my aim'.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'killjoy-lotus-b-default-setup',
      triggers: ['b setup', 'b site setup', 'default b', 'b defense'],
      short:
        "B on Lotus has two entrances — flowers and main. Standard setup: turret in heaven facing flowers, alarmbot tucked behind site boxes facing main, mollies held for post-plant. The why: heaven catches the wide swing at low-mid elo, alarmbot covers the second entry, mollies are post-plant first.",
      expanded:
        "At higher elo (D2+), defenders see more split pushes than rushes. Don't stack everything on flowers — you'll get cooked from a main lurker. If you suspect a stack, swap turret to a more aggressive angle. Hold the alarmbot back so a hookah lurker doesn't kill it round one.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'killjoy-lotus-c-default-setup',
      triggers: ['c setup', 'c site setup', 'default c', 'c defense', 'c hold'],
      short:
        "C is small and aggressive. Alarmbot deep in C-main catching the wide swing. Turret tucked behind boxes on site facing C-long. Mollies for post-plant. The why: C is tight enough that early info beats fancy positioning. The bot at main pings entry, turret trades if you die.",
      expanded:
        "Don't put alarmbot ON site — defenders can see the laser. Put it 5-10 meters down main so it pings before they're already on site. Turret should be hidden behind a box, not the obvious mid-site spot — that's where everyone shoots it.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'killjoy-lotus-mollie-priority',
      triggers: ['mollies', 'nanoswarm', 'molly post plant', 'when to molly', 'molly contact'],
      short:
        "Mollies are post-plant first, contact second. You have two, the spike has ~30 seconds. Hold both for the plant unless you genuinely need one to stall an early push. The why: a molly on contact kills one push; a molly on post-plant denies the defuse.",
      expanded:
        "Exceptions: if your team is dying fast on defense and you need to buy your duelist time to rotate, drop a molly to stall. The cost is real — you have nothing left for plant — but a lost site is worse. Practice eyeballing when 'I need to stall now' is worth it.",
      image: null,
      attribution: 'self-recorded',
    },
    {
      id: 'killjoy-lotus-ult-use',
      triggers: ['ult', 'lockdown', 'when to ult', 'when do i ult'],
      short:
        "Lockdown on retake first, defending site second. Drop it from cover after the spike lands — defenders get detained, your team retakes free. On defense, only drop if your team is full-rotated. The why: 12-second cast time means it dies if you place it in a fight.",
      expanded:
        "Best lockdown spot is behind a wall the enemy has to push around. On Lotus B, dropping from heaven covers the whole site. On C, drop from the back corner. Pair with mollies on the doors enemies push to break out.",
      image: null,
      attribution: 'self-recorded',
    },
  ],
};
