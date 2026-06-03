// killjoy-ascent.js — Killjoy on Ascent.
// KNOWLEDGE-SHAPED (not canned Q&A): a coach's mental model that jinto reasons over to answer anything.
// Built from 2 fact-checked research passes + the Dignitas guide (visually verified). Images in img/overlay/.

const KILLJOY_ASCENT = {
  agent: 'Killjoy',
  map: 'Ascent',

  knowledge: `
ROLE / IDENTITY
Killjoy is a lockdown sentinel — she wins rounds by denying space with gadgets, not by fragging. On Ascent her home is B. The map funnels attackers through a few tight chokes, and B's Lane is the tightest: a long narrow corridor where her trap layering leaves nowhere to dodge. A Killjoy + Sova B hold is one of the hardest things in the game to push. Default plan: anchor B, lock it down, and use your ult to retake A when they commit there. She can hold A, but B is where she's strongest — play B unless your team genuinely needs you elsewhere.

THE 40-METER LEASH (her biggest constraint)
Her turret and alarmbot shut OFF if she strays more than ~40m from them, and take a beat to re-arm when she returns. This is the #1 thing newer Killjoys get wrong — they set up B, then wander mid or go lurk for a pick, and silently disable their own setup. Anchor. Stay central. Your value is the gadgets being live, not your aim.

THE B LANE TRAP — "TOASTER OVEN"
Her signature B setup. Most B pushes come through Lane because it's the fastest way on, and it's so narrow that two nanoswarms laid along it cover the whole width — the gaps between them are too thin to slip through, so anyone pushing takes damage the entire way. An alarmbot in Lane is the trigger: the moment it pings, you pop the mollies. A common variation puts the second molly on the ledge at the end of Lane — covers slightly less but is much harder for enemies to clear before they push.

ALARMBOT AS A TRIGGER (the core skill)
Don't treat the alarmbot as a standalone — it's the timer for your mollies. When it goes off, you molly. Its placement depth is a real choice: closer to the entrance buys you more reaction time; deeper lets enemies commit further into the trap before it fires. It also applies Vulnerable (double damage), so whatever the molly then hits gets shredded. The alarmbot-into-nanoswarm combo is most of her defensive value.

TURRET CRAFT
Two main B turret spots. Deep in the Logs cubby it can't see B Main but it shreds anyone pushing Lane — this is the one that pairs with the Toaster, and it's the famous KJ Ascent turret because it stays hidden from B Main while still covering the push. Alternatively, on the Defender Spawn barrels watching B Main, for when you expect a B Main hit. Either way the turret is fragile — a few bullets kill it — and its job is intel and a slow, not kills, so hide it on an angle they won't instantly clear. Don't plant it somewhere obvious where it dies round one.

MID / MARKET
You don't hold mid, you delay it. An alarmbot + molly covering Market buys time and warns you if they try to take mid to split a site. Once a teammate rotates to mid, hold a crossfire with them instead of peeking alone.

THE ULT — LOCKDOWN
Lockdown detains everyone on a site for a few seconds — a retake button and a force-them-off-site tool, not something to burn on a random round. The one rule that wins or wastes it: aim DOWN when you place it. Looking up drops it on a box or table where enemies can shoot it during its wind-up and destroy it before it detains. Place it low, behind cover.

RETAKES
Because you anchor B, you'll usually be retaking A. Drop Lockdown in the A corner — it covers the site and forces attackers back toward A Main or Wine while your team swings in. Pair it with a nanoswarm on the spike if you have one; detain plus molly makes a clean defuse nearly impossible. There's an equivalent B-retake Lockdown spot that blankets the site and pushes them out toward you.

POST-PLANT LINEUPS
Your nanoswarms double as anti-defuse area denial — they run the timer down on anyone trying to defuse. There are set lineups for the common plants: the default B plant at the Green Boxes, the A Generator plant, and the A Green Boxes plant. Each has a stand spot and an aim point — the diagram shows it exactly, so lean on that rather than describing pixels.

A SITE WHEN YOU'RE FORCED THERE
If your comp puts you on A instead of B, treat A's Tree Room and the A door like Lane — tight spots perfect for nanoswarm traps, turret watching A Main or an off-angle. Just know A is her weaker side here; given the choice, you're worth more on B.

ATTACK
On attack she's support, not entry. Turret to watch flank (A Main or B Main) so nobody sneaks behind the team. Alarmbot + molly to dislodge a defender holding a key angle before the push. After the plant, the nanoswarm lineups lock the defuse. Lockdown can also clear a site for the take.

COMMON MISTAKES
The 40m leash — wandering off and killing your own setup — is the big one. Others: obvious turret spots that die instantly; blowing both nanoswarms on a single trigger instead of staggering them so the trap lasts longer; and either hoarding Lockdown until you never use it, or wasting it on a round where it doesn't actually win you the site.
`,

  // Diagrams jinto can show. It calls show_image with the id when its answer is about that thing.
  images: [
    { id: 'killjoy-ascent-b-toaster-overview', when: 'explaining how she holds B / the overall Toaster Oven plan' },
    { id: 'killjoy-ascent-b-toaster-coverage', when: 'the two-nanoswarm Lane trap and the area it covers' },
    { id: 'killjoy-ascent-b-alarmbot-lane', when: 'where to place the alarmbot in Lane' },
    { id: 'killjoy-ascent-b-turret-logs', when: 'the Logs-cubby turret spot' },
    { id: 'killjoy-ascent-b-turret-defspawn', when: 'the Defender-Spawn-barrels turret watching B Main' },
    { id: 'killjoy-ascent-mid-market-setup', when: 'the mid / Market alarmbot + molly setup' },
    { id: 'killjoy-ascent-a-retake-lockdown', when: 'the A-retake Lockdown placement' },
    { id: 'killjoy-ascent-b-retake-lockdown', when: 'the B-retake Lockdown placement' },
    { id: 'killjoy-ascent-lineup-b-default', when: 'the B default-plant (Green Boxes) post-plant nanoswarm lineup' },
    { id: 'killjoy-ascent-lineup-a-generator', when: 'the A Generator post-plant nanoswarm lineup' },
    { id: 'killjoy-ascent-lineup-a-greenboxes', when: 'the A Green Boxes post-plant nanoswarm lineup' },
    { id: 'killjoy-ascent-a-tree-nano1', when: 'the A Tree Room nanoswarm setup (when forced to anchor A)' },
    { id: 'killjoy-ascent-attack-mid-turret', when: 'the attack-side flank-watch turret spot' },
  ],
};
