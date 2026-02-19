# Balance Snapshot

Last updated: 2026-02-18

## Current Capability State

This branch contains the following progression/content capabilities.

- `PRESTIGE_THRESHOLD`: `2_300_000_000`
- `COST_SCALE`: `1.155`
- `ARTIST_COST_SCALE`: `1.15`
- Media tiers: 8 total (`Pencil` -> `AI-Generated`), including `Neural Art`
- Artists: 10 total, including `Storyboarder` and `Art Director`
- Click upgrades: 5 total, including `Ink Brush` and `Precision Blade`
- Prestige upgrades: 9 total, including `Sharp Eye`, `Steady Hand`, `Ink Reserves`, `Sketch Head Start`
- Achievements include deeper-session goals: `Workshop Foreman`, `Long-Form`, `Committed`, `The Long Game`, `Retirement Plan`, `Studio Machine`, `Gallery Empire`, `Atelier Legion`, `Production Line`, `Guild Network`, `Grand Collective`, `Legacy Vault`, `Atelier Assembly`, `Living Archive`, `Endless Studio`

## Evaluation Notes

- ROI-driven evaluator modes (`optimal`, `idle`) spend immediately on best ROI.
- Because of this, `decision moments` is constrained and should not be treated as a hard balancing target for ROI modes.
- If evaluating choice density, include `cheapest` strategy as an accumulation-oriented proxy.

## Evaluator Standards

### Authoritative Metrics

- Milestone timing (media tiers, swords, prestige access)
- Phase durations (early/mid/late)
- Experience cadence:
  - first-time major beat count and timing
  - average/median beat gap
  - longest novelty drought
  - post-prestige recovery timing

### Diagnostic Metrics

- Raw `decision moments` count (strategy-sensitive)
- `close-call moments` and close-call share (helps interpret choice pressure)
- End-of-run passive/click split (build-style indicator, not strict pass/fail)
- Dead-zone count/time (sensitive to strategy and pacing target)

### Required Evaluation Matrix for Balance Changes

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:human`
- `bun run evaluate:prestige`

## Validation Commands

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bunx tsc --noEmit`
