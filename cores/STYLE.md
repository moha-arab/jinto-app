# Core doc writing guide

*Every core doc is written and revised against this guide. It exists so all cores sound like the
same coach. Sources of these rules: the PRD voice spec + Mohammad's red-pen of the first drafts
(July 2026). If a rule here changes, change it here first.*

## Who reads a core

Two readers: **the AI** (reasons from it live, mid-game) and **Mohammad** (verifies it).
Dense is fine — the AI unpacks dense prose easily. **Ambiguous is never fine** — if Mohammad
can't follow a sentence, he can't verify it, and the AI may mis-read it too.

## The master rule

**If a human expert Radiant coach wouldn't say it, don't say it.** Every sentence must pass that
test. A coach speaks current reality in the present tense — "your dart comes back fast enough to
use twice a round" — and never shows the homework: no patch numbers, no nerf dates, no esports
event citations, no "since the 11.10 change" in the body. The doc's header patch stamp exists so
WE know when it was written; the prose acts like the game has always been the way it is now.
Correcting a stale habit is coach-speak ("it's 50 overheal now, not the 100 you might have
heard") — citing the patch that changed it is not.

## Voice

- **Opinionated and earned.** Real takes ("smokes are the best ability in the game") are the
  point. A coach has opinions; a wiki doesn't.
- **Asymmetric.** Most words on what actually loses rounds; one dismissive line on what barely
  matters. Never equal-length sections for symmetry's sake.
- **Reason from what the enemy can do.** Not "smoke the deepest sightline" (maxim) —
  "smoke the spots defenders can peek you from as you walk in" (reasoning). Every piece of
  advice implicitly answers "or else what?"
- **Attack and defense coached separately.** Different jobs.
- **Tie everything to THIS agent's mechanics.** Advice that fits any agent is banned.
- Second person, spoken-coach register, plain words.

## Facts

- **Decisions, not stat-sheet trivia.** A number earns its place ONLY if it changes a decision.
  Clove's ~6-second death smoke: keep (it sizes what the smoke can cover — half a defuse).
  A windup change from 0.9s to 0.7s: cut — translate to the decision ("once a wire trips,
  assume you're revealed") or delete. Nobody asks the coach for patch-note deltas.
- **No [VERIFY] tags in shipped docs.** Research resolves them before Mohammad reads. If a fact
  genuinely can't be confirmed, REWRITE the advice so it doesn't depend on that fact.
- **Volatile claims get made durable or cut.** "Tops the winrate charts as of patch X" is
  homework (see the master rule); state the durable reason behind the claim instead. The header
  stamp is the ONLY date in a doc — it's how we know when "now" was.
- **Sourcing:** facts come from real, current sources — guides, videos, Reddit mains, and
  Mohammad's own game knowledge (he is a valid source). Never from the AI's own memory.
- Patch line at the top of every doc: *(written against patch X.XX, month year)*.

## Clarity rules (from the first red-pen)

- **Analogies must explain themselves.** "A Phoenix ult" means nothing to someone who doesn't
  play Phoenix. Either unpack it in the same sentence or drop it.
- **No compressed comparisons that require a decode.** "A fake that spends Brimstone's whole
  round costs you thirty seconds of patience" → say it straight: "Brimstone's fake costs his
  smokes for the round; yours costs thirty seconds of recharge."
- **Jargon is fine, riddles aren't.** Callouts, "choke," "one-way," "refrag" — fine. A sentence
  whose meaning flips depending on how you parse it — rewrite.
- **Cross-agent comparisons must earn their place.** Keep one only if it changes the player's
  decision or frames their identity ("Omen converts through teammates; you convert through
  fights" — keeps). If deleting the comparison loses nothing ("Brimstone's fake costs his whole
  round" in a Clove doc), delete it. The player is not playing the other agent.

## Structure (flexible skeleton — asymmetry encouraged)

```
# <Agent> — core
(written against patch X.XX, <month year>)
## Who you are on the team        one tight paragraph: the job, the win condition
## The kit, for real              per ability: what it's REALLY for, where/when/why, common misuse
## Attack                         the round start to finish; post-plant
## Defense                        site play, retake role, positioning logic
## Decisions that win or lose rounds
## Mistakes that actually cost rounds   ranked, blunt, from real players
```

## Banned (instant AI-tell)

Universal tips (crosshair placement, "communicate", "check corners") · truisms ("positioning is
key") · hedging ("it depends on your playstyle") · unprompted tips · fake precision (invented
numbers/spots) · listicle symmetry · intro/outro fluff · em-dash-heavy prose.

## Length

1,200–1,800 words. If a sentence teaches nothing, cut it.
