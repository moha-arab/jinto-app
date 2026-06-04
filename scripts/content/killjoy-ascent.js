// killjoy-ascent.js — Killjoy on Ascent.
// KNOWLEDGE-SHAPED (not canned Q&A): a coach's mental model jinto reasons over.
// Sourced from the Dignitas "Ultimate Killjoy Ascent Guide" (studied in full) + fact-checked research, rewritten in jinto's own words.
// Image ids map to img/overlay/<id>.png. Answered with the show-don't-ask / refusal rules in the system prompt.

const KILLJOY_ASCENT = {
  agent: 'Killjoy',
  map: 'Ascent',

  knowledge: `
ROLE / IDENTITY
Killjoy is a lockdown sentinel — she wins rounds by denying space with gadgets, not by fragging. On Ascent her home is B. The map funnels attackers through a few tight chokes, and B's Lane is the tightest: a long narrow corridor where layered traps leave nowhere to dodge. A Killjoy + Sova B hold is one of the hardest things in the game to push. Default plan: anchor B, lock it down, and save your ult to retake A when they commit there. She CAN hold A, but B is where she's strongest — play B unless your team genuinely needs you on A.

HER KIT, IN ONE BREATH
Nanoswarm (molly) — two charges, a stealthed grenade you throw and detonate on command for a damage zone. Alarmbot — a homing bot that seeks the nearest enemy and applies Vulnerable (double damage); think of it as a TRIGGER and a tripwire, not a killer. Turret — a fragile camera-gun (a few bullets kill it) that watches an angle, deals chip, and slows; its real job is intel and area denial, not frags. Lockdown (ult) — detains every enemy inside a ~30m radius for several seconds, cutting their guns and abilities. Turret and alarmbot are recallable and reusable, so you can re-place them as the round shifts.

THE LEASH (her biggest constraint)
Her turret and alarmbot switch OFF if she strays too far from them (roughly 40 meters) and take a moment to re-arm when she returns. This is the #1 thing newer Killjoys get wrong — they set up B, then wander mid or go lurk for a pick and silently disable their own setup. Anchor. Stay central. Your value is the gadgets being live, not your aim.

THE B LANE TRAP — "TOASTER OVEN" (her signature)
Most B pushes come through Lane because it's the fastest way on, and it's so narrow that two nanoswarms laid along it cover the whole width — the cracks between them are too thin to slip through, so anyone pushing eats damage the entire way. First molly on the thin-brick intersection, second on the cracked brick further down. The ALARMBOT in Lane is the trigger: the instant it pings, you detonate the mollies. Alarmbot depth is a real choice — closer to the entrance buys you more reaction time; deeper lets them commit further into the trap before it fires. When the mollies pop, attackers pick their poison: push forward and you clean them up from site while they're focused on escaping, or back out and your teammates in Spawn/Market punish them.

TOASTER VARIATION (anti-utility)
Once enemies catch on, they'll avoid Lane or break your mollies with Sova darts, grenades, etc. Counter by re-placing: first molly in the corner between the door switch and Lane, second on the ledge at the end of Lane. Covers slightly less ground but is much harder to clear with utility.

DOOR SWITCH (deny the close)
Attackers almost always close the Market doors the second they're on B, to cut off your spawn. This setup punishes that. Alarmbot behind the door switch; then back yourself against the switch wall, aim at the bottom plank of the table and left-click so the molly lands INSIDE the table. It delays anyone trying to close the door — and once their smokes fade they're stuck exposed to Market and Defender Spawn.

B TURRETS
Two main spots. Deep in the Logs cubby it can't see B Main but it shreds anyone pushing Lane — this is the one that pairs with the Toaster, hidden from B Main while covering the push, the famous KJ Ascent turret. Alternatively, on the Defender-Spawn barrels watching B Main — only the top peeks out so it's hard to kill, great on pistols and from range, and it slows pushes while chipping. Situational extras: on the on-site Radianite crates to catch Lane exits (play off it from Boat House); a far-left off-angle that forces B-Main pushers to turn away from Markets and Spawn to kill it; a Markets turret to stand in for a missing teammate; and an aggressive one watching hard into B Main for save-round close fights. The turret dies to a few bullets — hide it on an angle they won't instantly clear; never plant it somewhere obvious where it dies round one.

MID / MARKET
You don't HOLD mid, you delay it. An alarmbot + molly in Market stalls a mid push long enough for a teammate to rotate and warns you they're trying to split a site — placement doesn't need to be precise. Once your teammate arrives, hold a crossfire with them instead of peeking alone.

A DEFENSE (your weaker side, but solid)
If your comp puts you on A, treat its tight spots like Lane. TREE ROOM: use the three grates — alarmbot on the MIDDLE grate, a nanoswarm on each of the outer two. That blankets the whole room except one crack, so be ready to kill a weakened enemy bolting through it. THE A DOOR / GENERATOR: attackers close the A door and push Generator to plant — molly the wire by the switch, molly the second crack in the ledge, alarmbot in the middle so it trips when anyone moves to the door or Generator. TURRETS: two common spots watch both A Main and Tree Room at an off-angle, forcing A-Main pushers to turn to shoot them; the Rafters-boxes turret is fine for pistols (chips from afar, you might even recall it before it dies) but for rifle rounds place it somewhere less obvious. Two more turrets — behind Generator and in Hell — only wake up when an enemy nears the door switch, so they pile extra slow onto the Door setup.

THE ULT — LOCKDOWN
Detains everyone on the site for several seconds and cuts their guns and abilities — a retake button and a force-them-off-site tool, not something to burn on a random round. The one rule that wins or wastes it: aim DOWN when you place it. Looking up drops it on a box or table where enemies can shoot it during its wind-up and destroy it before it detains. Place it low and behind cover, and make sure no one offsite has line of sight to break it.

RETAKES
Because you anchor B, you'll usually be retaking A. Drop Lockdown in the A corner — it covers the site and forces attackers back toward A Main or Wine while your team swings. The combo that nearly guarantees the defuse: with Tree Room safe and the door closed, tuck into the corner between the tree and the wall and throw a nanoswarm at the empty space just above the tree branch into Wine — do it with about 7 seconds left on the Lockdown and detonate as it lands. Now the Wine attackers choose between being detained or dying to the molly, and anyone in A Main is too far to contest. There's an equivalent B-retake Lockdown that blankets the site and pushes them out toward your team — same aim-DOWN rule so it doesn't land on the table where it gets wall-banged.

ATTACK
On attack she's a support, not an entry. Turret to watch flank (Mid, or A Main / B Main) so nobody sneaks behind the team — the strong Mid spot sits high on the Tiles / Mid Link wall and sees from Cat Cubby all the way to Defender Spawn. Lockdown can clear a site for the take: thrown in B Main or A Main it lets the team walk on — just know the A Main one doesn't cover the right side of Hell or Rafters, so enemies can hide there. After the plant, her nanoswarm lineups lock the defuse, and a turret left on-site slows the retake and lets you peek off its contact.

POST-PLANT LINEUPS
Nanoswarms double as anti-defuse denial — they burn the timer on anyone defusing. You can drop a molly straight on the spike, but good players just break it, so set lineups from a safe distance are better. The three you should know cold:
- A, spike at the Green Boxes: stand in the corner between the Radianite boxes and the wall, aim at the tip of the spike, throw.
- A, spike at Generator: same corner, but align the tip of your turret icon with the small spike, then throw.
- B, default Green Boxes plant: from the corner in B Lobby, aim at the spike — it lands in front of the Green Boxes and covers it.
You know the stand spot and the reference point for each; the diagram shows the exact crosshair placement, so still fire the gallery when the player wants pixel precision.

COMMON MISTAKES (lower-elo Killjoy on Ascent)
The leash — wandering off and silently killing your own setup — is the big one. Others: planting the turret somewhere obvious so it dies round one; detonating both nanoswarms on a single trigger instead of staggering them so the trap lasts longer; placing Lockdown facing up so it lands grabbable on a table; and either hoarding the ult until you never use it or burning it on a round it won't swing. And the mindset trap: going hunting for kills instead of anchoring — her value is the space her gadgets deny, not her frags.
`,

  // Single-spot diagrams (show_image). Key spots are listed here so a single-spot question resolves;
  // many also appear as steps inside a setup on purpose.
  images: [
    { id: 'killjoy-ascent-b-turret-logs', when: 'the signature B turret — deep in the Logs cubby (covers Lane, hidden from B Main)' },
    { id: 'killjoy-ascent-b-turret-defspawn', when: 'the alternate B turret — on the Defender-Spawn barrels watching B Main' },
    { id: 'killjoy-ascent-b-turret-aggressive', when: 'the aggressive B-Main turret (save rounds / close-range B Main)' },
    { id: 'killjoy-ascent-b-toaster-nano1', when: 'the FIRST Lane nanoswarm spot (thin-brick intersection) on the B Toaster setup' },
    { id: 'killjoy-ascent-b-toaster-nano2', when: 'the SECOND Lane nanoswarm spot (cracked brick) on the B Toaster setup' },
    { id: 'killjoy-ascent-b-toaster-alarmbot', when: 'where the alarmbot goes in Lane (the trigger for the Toaster mollies)' },
    { id: 'killjoy-ascent-b-toaster-coverage', when: 'what the two Lane mollies actually cover (Toaster coverage)' },
    { id: 'killjoy-ascent-mid-market-setup', when: 'the mid / Market delay setup (alarmbot + molly)' },
    { id: 'killjoy-ascent-a-tree-nano1', when: 'the A Tree Room nanoswarm/grate trap (when anchoring A)' },
    { id: 'killjoy-ascent-a-door-nano1', when: 'the A door / Generator nanoswarm trap (when anchoring A)' },
    { id: 'killjoy-ascent-a-retake-lockdown', when: 'where to drop Lockdown to retake A' },
    { id: 'killjoy-ascent-a-retake-wine-aim', when: 'the A-retake Wine molly aim point — above the tree branch (pairs with the A-retake Lockdown)' },
    { id: 'killjoy-ascent-b-retake-lockdown', when: 'where to drop Lockdown to retake B (aim DOWN so it does not land on the table)' },
    { id: 'killjoy-ascent-attack-mid-turret', when: 'the attack-side flank-watch turret on the Mid / Tiles wall' },
    { id: 'killjoy-ascent-attack-lockdowns', when: 'attack Lockdown spots in B Main and A Main (to walk onto site)' },
    { id: 'killjoy-ascent-lineup-b-default', when: 'the default B (Green Boxes) post-plant molly — this shot shows where it LANDS to cover the spike (throw from the corner in B Lobby, aiming at the spike); it is not a precise stand+aim view' },
    { id: 'killjoy-ascent-lineup-a-greenboxes-aim', when: 'the aim point for the A Green Boxes post-plant molly lineup (for the full stand+aim steps use the lineup-a-greenboxes setup)' },
    { id: 'killjoy-ascent-lineup-a-generator-aim', when: 'the aim point for the A Generator post-plant molly lineup (for the full stand+aim steps use the lineup-a-generator setup)' },
  ],

  // Step-by-step setups (show_setup) the player cycles with the next-key.
  setups: [
    {
      id: 'b-toaster',
      name: 'B Lane lockdown — the "Toaster Oven" (main B setup)',
      steps: [
        { label: 'Overview — the whole B Lane setup on the minimap', image: 'killjoy-ascent-b-toaster-overview' },
        { label: 'Turret — deep in the Logs cubby; covers Lane, stays hidden from B Main', image: 'killjoy-ascent-b-turret-logs' },
        { label: 'Alarmbot — in Lane; this is your TRIGGER to pop the mollies', image: 'killjoy-ascent-b-toaster-alarmbot' },
        { label: 'Nanoswarm 1 — on the thin-brick intersection', image: 'killjoy-ascent-b-toaster-nano1' },
        { label: 'Nanoswarm 2 — on the cracked brick further down Lane', image: 'killjoy-ascent-b-toaster-nano2' },
        { label: 'Coverage — both mollies blanket the width of Lane; pop on the alarm', image: 'killjoy-ascent-b-toaster-coverage' },
      ],
    },
    {
      id: 'b-toaster-variation',
      name: 'B Lane variation — harder to break with utility',
      steps: [
        { label: 'Use this when they start clearing your mollies with darts/nades. Turret + alarmbot stay the same as the Toaster.', image: null },
        { label: 'Nanoswarm 1 — in the corner between the door switch and Lane', image: 'killjoy-ascent-b-toastervar-nano1' },
        { label: 'Nanoswarm 2 — on the ledge at the end of Lane', image: 'killjoy-ascent-b-toastervar-nano2' },
      ],
    },
    {
      id: 'b-doorswitch',
      name: 'B — stop attackers closing the Market door',
      steps: [
        { label: 'Alarmbot — behind the door switch', image: 'killjoy-ascent-b-doorswitch-alarmbot' },
        { label: 'Nanoswarm — back to the switch wall, aim the bottom plank of the table so it lands inside it; delays the door close', image: 'killjoy-ascent-b-doorswitch-nano' },
      ],
    },
    {
      id: 'b-turrets',
      name: 'B turret options',
      steps: [
        { label: 'Overview — the two common B turret spots', image: 'killjoy-ascent-b-turret-overview' },
        { label: 'Defender-Spawn barrels — watches B Main; only the top peeks, hard to kill', image: 'killjoy-ascent-b-turret-defspawn' },
        { label: 'Deep Logs cubby — covers Lane, hidden from B Main (pairs with the Toaster)', image: 'killjoy-ascent-b-turret-logs' },
        { label: 'Situational extras — Radianite crates, far-left off-angle, Markets', image: 'killjoy-ascent-b-turret-extra-overview' },
        { label: 'Aggressive — watches hard into B Main; good for save rounds', image: 'killjoy-ascent-b-turret-aggressive' },
      ],
    },
    {
      id: 'mid-market',
      name: 'Mid / Market delay',
      steps: [
        { label: 'Alarmbot + nanoswarm in Market — stalls a mid push and warns you of a split (placement is forgiving)', image: 'killjoy-ascent-mid-market-setup' },
        { label: 'Once a teammate rotates — hold a crossfire with them, do not peek alone', image: 'killjoy-ascent-mid-market-crossfire' },
      ],
    },
    {
      id: 'a-tree',
      name: 'A Tree Room trap (when anchoring A)',
      steps: [
        { label: 'Three grates — alarmbot on the MIDDLE grate, a nanoswarm on each outer grate', image: 'killjoy-ascent-a-tree-nano1' },
        { label: 'Second outer grate — covers the whole room except one crack, so watch it for a runner', image: 'killjoy-ascent-a-tree-nano2' },
      ],
    },
    {
      id: 'a-door',
      name: 'A door / Generator trap (when anchoring A)',
      steps: [
        { label: 'Nanoswarm 1 — on the wire by the switch', image: 'killjoy-ascent-a-door-nano1' },
        { label: 'Nanoswarm 2 — on the second crack in the ledge; alarmbot in the middle so it trips at the door or Generator', image: 'killjoy-ascent-a-door-nano2' },
      ],
    },
    {
      id: 'a-turrets',
      name: 'A turret options',
      steps: [
        { label: 'Overview — common A turret spots that watch A Main and Tree at an off-angle', image: 'killjoy-ascent-a-turret-overview' },
        { label: 'Rafters boxes — fine for pistol rounds (chips from afar, you can recall it)', image: 'killjoy-ascent-a-turret-rafters' },
        { label: 'Door-switch turrets — behind Generator / in Hell; wake up only near the switch to pile slow onto the Door trap', image: 'killjoy-ascent-a-turret-doorswitch' },
      ],
    },
    {
      id: 'a-retake',
      name: 'A retake — Lockdown + Wine molly',
      steps: [
        { label: 'Lockdown — in the A corner; covers the site and forces them back to A Main / Wine (aim DOWN)', image: 'killjoy-ascent-a-retake-lockdown' },
        { label: 'Wine molly — stand in the corner between the tree and the wall (Tree Room safe, door closed)', image: 'killjoy-ascent-a-retake-wine-stand' },
        { label: 'Wine molly — aim at the empty space above the tree branch; throw with ~7s left, pop it on landing', image: 'killjoy-ascent-a-retake-wine-aim' },
      ],
    },
    {
      id: 'attack-turret',
      name: 'Attack — Mid flank-watch turret',
      steps: [
        { label: 'Turret high on the Tiles / Mid Link wall (far right of the left wall)', image: 'killjoy-ascent-attack-mid-turret' },
        { label: 'What it watches — from Cat Cubby over the arches to Defender Spawn', image: 'killjoy-ascent-attack-mid-turret-view' },
      ],
    },
    {
      id: 'lineup-a-greenboxes',
      name: 'Post-plant molly — A Green Boxes plant',
      steps: [
        { label: 'Stand — in the corner between the Radianite boxes and the wall', image: 'killjoy-ascent-lineup-a-greenboxes-stand' },
        { label: 'Aim — at the tip of the marked spike, then throw', image: 'killjoy-ascent-lineup-a-greenboxes-aim' },
      ],
    },
    {
      id: 'lineup-a-generator',
      name: 'Post-plant molly — A Generator plant',
      steps: [
        { label: 'Stand — same corner by the Radianite boxes', image: 'killjoy-ascent-lineup-a-generator-stand' },
        { label: 'Aim — align the tip of your turret icon with the small spike, then throw', image: 'killjoy-ascent-lineup-a-generator-aim' },
      ],
    },
  ],
};
