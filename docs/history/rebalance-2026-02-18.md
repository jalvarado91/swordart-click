# Rebalance Timeline (2026-02-18)

## Context

Initial eval showed progression was too fast, meaningful choices were limited,
and late game had little new content after early prestige.

## Pass 1

### Changes

- Raised prestige threshold from `10_000_000` to `500_000_000`
- Raised media costs substantially
- Increased `ARTIST_COST_SCALE` to `1.17`
- Reduced artist base rates
- Re-anchored sword thresholds
- Added achievements: `Workshop Foreman`, `Long-Form`, `Committed`, `The Long Game`

### Result

- Prestige slowed, but still too fast for target windows.

## Pass 2

### Changes

- Flattened media multipliers (`x3/x10/x50/x250/...` reduced)
- Raised mid/late artist base costs

### Result

- Idle prestige timing improved significantly.
- `decision moments` collapsed due to larger purchase gaps.

## Pass 3

### Changes

- Added click upgrade: `Ink Brush`
- Added artists: `Storyboarder`, `Art Director`
- Added prestige upgrades: `Sharp Eye`, `Steady Hand`
- Wired new prestige multipliers in helper calculations

### Result

- Content depth improved.
- Progression accelerated somewhat due to new income bridges.
- `decision moments` remained low in ROI modes.

## Pass 4

### Changes

- Reduced `ARTIST_COST_SCALE` back to `1.15`
- Reduced artist base rates broadly

### Result

- Idle first prestige reached target range (~35 minutes).
- Confirmed evaluator behavior constrains `decision moments` in ROI modes.

## Follow-up Guidance

- Treat ROI-mode `decision moments` as a diagnostic, not a hard target.
- Keep balancing goals centered on timeline milestones and discovery pacing.
- Preserve newly added content systems unless explicitly removed by design direction.
