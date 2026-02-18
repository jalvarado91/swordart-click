# Balance Pass Plan (Cadence-Driven) — For Next Agent

## Mission

Use the upgraded evaluator to run a focused balance pass that:

1. Delays first prestige for active play (`optimal`, `human`)
2. Reduces long late-session novelty droughts
3. Preserves idle pacing that already feels close to target

Do **not** change evaluator logic in this pass; tune game data/content pacing.

## Baseline (from 2026-02-17 post-fix runs)

- `optimal` (60m): first prestige `17:09`, longest novelty drought `21:42`
- `human` (60m): first prestige `16:45`, longest novelty drought `24:57`
- `idle` (120m): first prestige `39:47`, longest novelty drought `42:12`
- `prestige` (120m): prestige #1 `17:09`, #2 `24:45`

Reference: `docs/plans/evaluator-post-fix-reval-2026-02-17.md`

## Success Targets

### Prestige Timing

- `optimal` first prestige: `22:00` to `30:00`
- `human` first prestige: `24:00` to `34:00`
- `idle` first prestige: `38:00` to `55:00` (do not regress below `35:00`)

### Experience Cadence

- `optimal` longest novelty drought: `<= 15:00`
- `human` longest novelty drought: `<= 18:00`
- `idle` longest novelty drought: `<= 30:00`

### Stability/Progression Guardrails

- No unreachable artists in `optimal` or `idle`
- At least one prestige by end of `optimal` 60m and `idle` 120m
- Keep content progression readable (no >10 major beats inside 2-minute burst windows)

## Constraints

- Primary tuning file: `src/data.ts`
- Do not rename lore entities (artists/media/swords) in this pass
- Do not change UI/UX code in this pass
- Do not modify evaluator internals (`scripts/evaluate.ts`) in this pass

## Work Plan

## Task 1: Capture New Starting Baseline

Run and store outputs:

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:human`
- `bun run evaluate:prestige`

Create/update a short run note in `docs/plans/` for this pass.

## Task 2: Slow Active-Play Prestige (without crushing idle)

Tune active-dominant progression levers first:

- Click upgrade costs and/or values (`UPGRADE_DEFS`), especially mid/late click upgrades
- Keep early click feel intact; bias nerfs to `Ink Brush` and `Precision Blade` band

Why: this mostly impacts `optimal`/`human` while minimizing idle regression.

## Task 3: Spread Major Beats to Reduce Droughts

Use major-beat-bearing content (`MEDIA`, `SWORD`, `ACHIEVE`) to fill long gaps.

Candidate levers:

- Re-anchor late sword thresholds (`Lightsaber`, `Pen Sword`) if they front-load too early
- Re-anchor late media costs (`Digital`, `Neural`, `AI`) so late beats are less clustered
- Add 2-4 late achievements that naturally trigger in 30-60m windows

Note: achievements are valid cadence beats; use them intentionally for pacing.

## Task 4: Preserve Idle Playability

After each tuning iteration, verify idle remains in range:

- First prestige not worse than `55:00`
- Major content still arrives steadily (avoid giant pre-prestige dead stretches)

## Task 5: Regression Sweep and Final Matrix

Run full matrix at end:

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:human`
- `bun run evaluate:prestige`
- `bunx tsc --noEmit`

Summarize before/after for:

- First prestige timings
- Longest novelty drought
- Beat burstiness
- Any regressions (unreachable content, stalled progression)

## Task 6: Decision Record

Write final decision note in `docs/plans/` with:

- What changed in `src/data.ts`
- Which targets were hit/missed
- Top 2 remaining issues for next pass

## Suggested Iteration Loop

1. Apply one small tuning batch
2. Run `optimal` + `human`
3. If active targets move correctly, run `idle`
4. Keep/revert batch based on target movement
5. Repeat until targets are met or diminishing returns

## Recommended Command Set

- `bun run evaluate:optimal`
- `bun run evaluate:human`
- `bun run evaluate:idle`
- `bun run evaluate:prestige`
- `bunx tsc --noEmit`

## Deliverables Checklist

- [ ] Updated `src/data.ts` balance values
- [ ] Post-pass run summary in `docs/plans/`
- [ ] Target table (hit/miss) for prestige and novelty drought
- [ ] `bunx tsc --noEmit` success
