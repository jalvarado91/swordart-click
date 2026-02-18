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
