# Post-Fix Re-Evaluation (Tasks B-F)

Captured on: 2026-02-17 EST  
Branch: `claude/game-evaluation-system-DUqHy`  
Commit: `0fbeb74` (working tree with evaluator updates)

## Commands

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:human`
- `bun run evaluate:prestige`
- `bun scripts/evaluate.ts --strategy cheapest --clicks 3 --minutes 60`

## Summary of Evaluator Improvements

- Prestige simulation now matches runtime semantics for artist reset and prestige startup bonuses.
- Dead-zone label now matches the actual threshold used.
- Content-reached media tiers are event-derived (not snapshot-derived).
- Added experience-cadence metrics:
  - first-time major beat count/timing
  - beat gap stats
  - longest novelty drought
  - novelty burst window
  - post-prestige recovery timing
- Added decision-quality metric (`close-call moments`) and ROI strategy interpretation note.
- Added `human` strategy profile.

## Before vs After (selected)

| Metric | Baseline | After fixes |
|---|---:|---:|
| Prestige #2 timing (`evaluate:prestige`) | `19:15` | `24:45` |
| Decision moments (`optimal`) | `10` | `20` |
| Decision moments (`idle`) | `10` | `20` |
| Decision moments (`prestige`) | `10` | `30` |
| Close-call moments | not reported | reported |
| Experience cadence block | absent | present |

## Current Results (After Fixes)

| Run | First prestige | Decision moments | Close-call share | Longest novelty drought |
|---|---:|---:|---:|---:|
| `optimal` (60m) | `17:09` | `20` | `0%` | `21:42` |
| `idle` (120m) | `39:47` | `20` | `60%` | `42:12` |
| `human` (60m) | `16:45` | `2751` | `88%` | `24:57` |
| `prestige` (120m, max 2) | `#1 17:09`, `#2 24:45` | `30` | `0%` | `1:01:06` |

## Balance/Design Adjustments Identified

1. First prestige is still early for highly active play (`optimal`/`human` around ~17 min).
2. Novelty drought remains substantial after late unlocks (20-60 min windows depending on strategy).
3. `human` strategy validates that small reaction delays/near-best choices materially change decision density, so `optimal` alone is insufficient for feel assessment.
4. ROI-share warning remains useful: raw decision count should not be used alone for pass/fail.

## Suggested Next Work

- Apply a content pacing pass focused on post-oil and post-digital novelty density.
- Revisit prestige timing bands per strategy (`optimal`, `idle`, `human`) instead of a single percentage-of-session threshold.
- If needed, normalize decision moments as "per minute" for cross-strategy comparability.
