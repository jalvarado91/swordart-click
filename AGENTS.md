# Sword Art Click — Agent Work Log

## Evaluation Summary (2026-02-18)

Three strategies run against the current build: **optimal** (3 cps, best ROI),
**cheapest** (3 cps, always cheapest), **idle** (0.5 cps, best ROI).

### What the numbers show

| Metric | Optimal | Idle | Cheapest |
|---|---|---|---|
| First prestige | 2:01 | 5:41 | 2:02 |
| All media tiers reached | by 2:55 | by 6:39 | by 2:55 |
| All 10 swords unlocked | by 2:55 | by 6:39 | by 2:55 |
| All achievements (except one) | by 30:12 | by 30:05 | by 30:13 |
| Late phase starts | 1:38 | 5:06 | 1:38 |
| Late phase duration | 58m21s | 54m53s | 58m21s |
| Decision moments (60 min) | 11 | 11 | 11 |
| Final total income | 1.47T/sec | 1.47T/sec | 1.47T/sec |

**Optimal and cheapest converge to identical outcomes.** The purchase order barely matters.

### The three critical problems

**1. Progression is 20× too fast**
The entire game arc — all media tiers, all swords, prestige — completes in 3–7
minutes. This leaves 53–57 minutes of late-phase gameplay with zero new content.
The player sees everything before they've had time to feel anything. Early phase
lasts under 60 seconds. Mid phase lasts under 2 minutes. These phases carry the
game's strongest lore and UX moments — they're blinking past.

Root cause: costs are too low relative to income. Charcoal at 100 strokes is
affordable at 37 seconds. Prestige at 10M strokes is reachable in ~2 minutes.

**2. Choices don't matter**
Only 11 decision moments in 60 minutes (one every 5.5 minutes). Optimal and
cheapest buying produce *identical* final states. There are no meaningful
trade-offs — no point at which saving for a big purchase is clearly better than
buying something small now. The game plays itself.

Root cause: uniform cost scaling (1.12 upgrades, 1.15 artists) creates a smooth
ramp with no peaks or valleys that would force real decisions.

**3. The late game is empty**
After prestige at ~2–6 minutes, 90%+ of the session is spent in late phase with
income scaling but no new content unlocking, no new swords, no new achievements,
no new flavor. The only time-gated thing is the "Drawn Out" achievement at 30
minutes — but the game is effectively over by minute 3.

---

## Next Agent: Progression Rebalance

**Goal:** Make a first run feel like 30–45 minutes of genuine discovery, with
prestige as a meaningful choice at the end, not an afterthought at minute 2.

### Target timeline (what the eval report should show after changes)

| Event | Target |
|---|---|
| First artist | ~30–60s |
| Charcoal (tier 1) | ~2–4 min |
| Ink & Quill (tier 2) | ~6–10 min |
| Watercolor (tier 3) | ~12–18 min |
| Oil Painting (tier 4) | ~20–28 min |
| First prestige available | ~35–50 min |
| Digital Art (tier 5) | Run 2+ |
| AI-Generated (tier 6) | Run 3+ |
| Bob Ross first hire | ~25–35 min |
| Lightsaber sword | ~25–35 min |
| Pen Sword | Run 2+ |

### Concrete changes to make

**A. Raise the prestige threshold**
`PRESTIGE_THRESHOLD` in `src/data.ts`: `10_000_000` → `500_000_000`
This alone pushes first prestige from 2 minutes to ~40 minutes with current costs.

**B. Raise media tier costs** (in `src/data.ts`, `MEDIA_TIERS` array)
Current costs are too cheap — each tier should feel like a significant save:

| Tier | Current cost | Target cost |
|---|---|---|
| Charcoal | 100 | 500 |
| Ink & Quill | 1,000 | 10,000 |
| Watercolor | 25,000 | 150,000 |
| Oil Painting | 500,000 | 3,000,000 |
| Digital Art | 10,000,000 | 75,000,000 |
| AI-Generated | 1,000,000,000 | 5,000,000,000 |

**C. Raise artist base costs and/or reduce base rates**
Artists are too cheap too fast. Two options, pick one or combine:
- Option 1: Raise `ARTIST_COST_SCALE` from `1.15` to `1.18`
- Option 2: Reduce `baseRate` values by ~30–40% across all artists
- Recommend: both — increase cost scale to 1.17 and reduce rates by ~25%

Adjusted `baseRate` targets:
| Artist | Current | Target |
|---|---|---|
| Doodler | 1/sec | 0.8/sec |
| Sketch Artist | 5/sec | 4/sec |
| Caricaturist | 25/sec | 18/sec |
| Illustrator | 100/sec | 70/sec |
| Court Painter | 500/sec | 350/sec |
| Renaissance Master | 3,000/sec | 2,000/sec |
| Sword Swallower | 15,000/sec | 10,000/sec |
| Bob Ross | 100,000/sec | 65,000/sec |

**D. Adjust sword unlock thresholds**
With the slower income curve, current thresholds will unlock too slowly.
Re-anchor them to the new expected income:

| Sword | Current | Target |
|---|---|---|
| Letter Opener | 50 | 100 |
| Broadsword | 500 | 2,000 |
| Swordfish | 5,000 | 20,000 |
| Crossword Sword | 25,000 | 150,000 |
| Password Sword | 100,000 | 750,000 |
| Sword of Damocles | 500,000 | 4,000,000 |
| Excalibur | 5,000,000 | 30,000,000 |
| Lightsaber | 50,000,000 | 250,000,000 |
| Pen Sword | 500,000,000 | 2,500,000,000 |

**E. Add 4–5 achievements that require actual session depth**
Current achievements are all reachable in the first 3 minutes (except Drawn Out).
Add to `ACHIEVEMENT_DEFS` in `src/data.ts`:

- **"Workshop Foreman"** — Own 5 different artist types (not just 10 total)
- **"Oil and Water"** — Reach Oil Painting tier (`mediaTier >= 4`) — move from
  existing "Oil's Well" which can stay, but gate it behind actual session progress
- **"Long-Form"** — Earn 1,000,000 total Strokes in a single run *without*
  prestiging (checks `s.totalStrokes >= 1_000_000 && s.prestigeCount === 0`)
- **"Committed"** — Reach 1,000 total clicks in a single session  
- **"The Long Game"** — Reach the prestige screen (`s.totalStrokes >= PRESTIGE_THRESHOLD`)

### How to validate the changes

After each change, run:
```
bun run evaluate:optimal
bun run evaluate:idle
```

Look for:
- First prestige between 30–50 min (not 2–6 min)
- Media tiers spread across the session, not clustered in first 3 minutes
- At least 25+ decision moments per session
- Early phase lasting 4–8 min, mid phase lasting 10–15 min
- Bob Ross appearing before prestige with optimal play

### Files to change
- `src/data.ts` — all constants and definitions (primary target)
- `src/data.ts` — `ACHIEVEMENT_DEFS` array (new achievements)
- Run `bun run evaluate` after changes to validate before committing

### What NOT to change yet
- Artist names, media tier names, sword names — lore pass comes later
- The prestige upgrade costs/effects — those are fine, just need to be earned
- The click upgrade values — these are fine
- The UI/UX code — separate pass

### Branch
Work on `claude/game-evaluation-system-DUqHy` (same branch, already checked out).
Run `bunx tsc --noEmit` before committing.

---

## Rebalance Pass 1 — Results (2026-02-18)

**Changes applied to `src/data.ts`:**
- `PRESTIGE_THRESHOLD`: 10M → 500M
- `ARTIST_COST_SCALE`: 1.15 → 1.17
- Media costs: Charcoal 100→500, Ink 1K→10K, Watercolor 25K→150K, Oil 500K→3M, Digital 10M→75M, AI 1B→5B
- Artist base rates reduced ~20-25% across all 8 artists
- Sword thresholds re-anchored to new income curve
- 4 new achievements: Workshop Foreman, Long-Form, Committed, The Long Game

**Evaluation results after rebalance:**

| Metric | Before | After (Optimal) | After (Idle) | Target |
|---|---|---|---|---|
| First prestige | 2:01 | 7:08 | 15:53 | 35–50 min |
| Charcoal (tier 1) | 0:37 | 1:31 | 5:46 | 2–4 min |
| Ink & Quill (tier 2) | 2:55 | 3:07 | 10:09 | 6–10 min |
| Watercolor (tier 3) | 2:55 | 5:10 | 13:36 | 12–18 min |
| Oil Painting (tier 4) | 2:55 | 6:55 | 15:39 | 20–28 min |
| Decision moments | 11 | 26 | 26 | 25+ |
| Early phase | 1:38 | 1:34 | 5:58 | 4–8 min |
| Mid phase | 0:41 | 1:48 | 4:43 | 10–15 min |

**Progress:** Progression is now ~3.5× slower for optimal play and ~3× slower for idle play. Decision moments doubled from 11 to 26. The rebalance is a meaningful improvement but hasn't yet reached the 35–50 min prestige target.

**Remaining gap:** Optimal play still reaches prestige at 7 min (5× too fast). The core bottleneck is the media tier multiplier cascade — going from ×1 to ×250 in 7 minutes collapses the mid-game. Once Ink & Quill (×10) lands at 3 min, income 10-folds; Watercolor (×50) at 5 min 5-folds again; Oil (×250) at 7 min 5-folds again. These explosive jumps pull prestige forward even with higher costs.

---

## Next Agent: Rebalance Pass 2

**Goal:** Push first prestige from 7 min → 30–45 min for optimal play; from 15 min → 45–60 min for idle play.

**Root cause to address:** Media tier multipliers are too strong relative to their costs. The ×10/×50/×250/×2000 jumps create exponential income cliffs that can't be balanced by raising flat costs alone. Two complementary fixes:

### Recommended changes

**A. Raise artist base costs (not rates)**
The rates have been reduced enough; income is now cost-gated, not rate-gated. Double the `baseCost` for mid-to-late artists:

| Artist | Current baseCost | Target baseCost |
|---|---|---|
| Illustrator | 5,000 | 12,000 |
| Court Painter | 50,000 | 150,000 |
| Renaissance Master | 500,000 | 1,500,000 |
| Sword Swallower | 5,000,000 | 20,000,000 |
| Bob Ross | 100,000,000 | 500,000,000 |

**B. Reduce media tier multipliers (moderate reduction)**
The ×10 → ×50 → ×250 chain is too steep. Flatten the curve:

| Tier | Current multiplier | Target multiplier |
|---|---|---|
| Charcoal | ×3 | ×2 |
| Ink & Quill | ×10 | ×6 |
| Watercolor | ×50 | ×25 |
| Oil Painting | ×250 | ×100 |
| Digital Art | ×2,000 | ×800 |
| AI-Generated | ×50,000 | ×20,000 |

Note: Reducing multipliers means reducing the total income ceiling, which is fine — the goal is pacing, not numbers.

**C. Optionally add a 4th click upgrade** costing ~5,000 to give players a mid-game click investment sink.

### Validation targets (after pass 2)
Run `bun run evaluate:optimal` and `bun run evaluate:idle`. Look for:
- Optimal: first prestige 30–45 min
- Idle: first prestige 45–60 min
- Oil Painting reached 20–28 min with optimal
- Bob Ross first hire before prestige with optimal
- Mid phase lasting 10+ min with optimal

### Files to change
- `src/data.ts` — `ARTIST_DEFS` baseCost values, `MEDIA_TIERS` multipliers
- Run `bun run evaluate:optimal` and `bun run evaluate:idle` to validate
- Run `bunx tsc --noEmit` before committing

### Branch
`claude/game-evaluation-system-DUqHy` (same branch)

---

## Rebalance Pass 2 — Results (2026-02-18)

**Changes applied to `src/data.ts`:**
- Media multipliers flattened: Charcoal ×3→×2, Ink ×10→×6, Watercolor ×50→×25, Oil ×250→×100, Digital ×2000→×800, AI ×50000→×20000
- Mid-to-late artist `baseCost` raised: Illustrator 5K→12K, Court Painter 50K→150K, Renaissance 500K→1.5M, Sword Swallower 5M→20M, Bob Ross 100M→500M

**Evaluation results after pass 2:**

| Metric | Pass 1 (Optimal) | Pass 2 (Optimal) | Pass 1 (Idle) | Pass 2 (Idle) | Target |
|---|---|---|---|---|---|
| First prestige | 7:08 | 15:16 | 15:53 | 30:34 | 35–50 min |
| Charcoal (tier 1) | 1:31 | 1:31 | 5:46 | 5:46 | 2–4 min |
| Ink & Quill (tier 2) | 3:07 | 3:53 | 10:09 | 12:39 | 6–10 min |
| Watercolor (tier 3) | 5:10 | 8:12 | 13:36 | 21:24 | 12–18 min |
| Oil Painting (tier 4) | 6:55 | 14:19 | 15:39 | 29:31 | 20–28 min |
| Decision moments | 26 | 9 | 26 | 9 | 25+ |
| Early phase | 1:34 | 1:36 | 5:58 | 6:04 | 4–8 min |
| Mid phase | 1:48 | 2:49 | 4:43 | 7:56 | 10–15 min |

**Progress:** Idle play first prestige is now 30:34 — within striking distance of the 35 min target. Optimal play is at 15:16, about 2× too fast. Media tiers are now spread across the session for idle play. Oil Painting lands at 29:31 with idle (right at target), Watercolor at 21:24 (close).

**Critical new problem:** Decision moments collapsed from 26 → 9. Raising costs without adding more purchasable items creates longer gaps between choices. The session now has one decision every 13 minutes (idle) instead of every 4.6 min. This makes the game feel passive, not engaging.

---

## Next Agent: Rebalance Pass 3

**Goal:** Fix the decision moment collapse (9 → 25+) while holding the prestige timing gains from pass 2.

**Root cause:** Raising baseCosts reduced purchase frequency without adding new decision points. The fix is to add more things to buy, not to further adjust costs.

### Recommended changes

**A. Add a 4th click upgrade** in `src/data.ts`, `UPGRADE_DEFS`:
```typescript
{
  id: "inkBrush",
  name: "Ink Brush",
  desc: "Broad, confident strokes. +25 per click.",
  baseCost: 5_000,
  effect: { type: "click", value: 25 },
},
```
This creates a meaningful mid-game investment decision (~5 min for optimal, ~18 min for idle).

**B. Add 2–3 intermediate artist types** between Caricaturist (750 base) and Illustrator (12K base).
The current cost gap between Caricaturist and Illustrator is 16× — nothing to buy in that window. Consider adding:
- A new artist at baseCost ~3,000–4,000 (fills the gap, creates a decision moment)
- A new artist at baseCost ~25,000–35,000 (between Illustrator and Court Painter, which is 12.5× gap)

Or alternatively: add milestone-based bonuses (e.g., owning 10 of a type unlocks a small permanent boost) to create micro-decisions at artist counts.

**C. Add more prestige upgrades** (to give EP something meaningful to spend on in later runs):
- "Sharp Eye" — +5% all production per prestige level owned (cheap, scales with prestige count)
- "Collector's Edition" — start with one free Doodler after prestige

**D. Optionally lower the PRESTIGE_THRESHOLD slightly** back toward 200–300M (from 500M) to bring optimal first prestige to 25–35 min rather than 15 min, which would be a more natural sweet spot.

### Validation targets (after pass 3)
Run `bun run evaluate:optimal` and `bun run evaluate:idle`. Look for:
- Decision moments: 20+ for both strategies
- Optimal: first prestige 25–40 min
- Idle: first prestige 40–60 min
- Mid phase lasting 8+ min with optimal, 12+ min with idle

### Files to change
- `src/data.ts` — `UPGRADE_DEFS` (new upgrade), `ARTIST_DEFS` (new artists), `PRESTIGE_UPGRADE_DEFS` (new upgrades), `PRESTIGE_THRESHOLD` (optional tweak)
- `src/logic.ts` — no changes needed if new upgrade uses existing `click` effect type
- Run `bunx tsc --noEmit` before committing

### Branch
`claude/game-evaluation-system-DUqHy` (same branch)
