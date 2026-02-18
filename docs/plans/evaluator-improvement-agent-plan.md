# Evaluator Improvement Workstream (Agent-Assignable)

## Execution Status

- [x] Task A: Reproduce baseline and lock evidence (`docs/plans/evaluator-taskA-baseline-2026-02-17.md`)
- [x] Task B: Evaluator/runtime prestige parity fixes in `scripts/evaluate.ts`
- [x] Task C: Metric/report consistency fixes in `scripts/evaluate.ts`
- [x] Task D: Add experience-feel metrics in `scripts/evaluate.ts`
- [x] Task E: Rework decision-moments interpretation in `scripts/evaluate.ts`
- [x] Task F: Add human-like strategy profile (`--strategy human`)
- [x] Task G: Re-evaluate after fixes (`docs/plans/evaluator-post-fix-reval-2026-02-17.md`)
- [x] Task H: Documentation standard updates (`docs/balance.md`, `package.json`)

## Task A: Reproduce Baseline and Lock Evidence

- Goal: Recreate current behavior before changing anything.
- Run:
  - `bun run evaluate:optimal`
  - `bun run evaluate:idle`
  - `bun run evaluate:prestige`
  - `bun scripts/evaluate.ts --strategy cheapest --clicks 3 --minutes 60`
- Deliverable: Markdown summary with milestone times, phase durations, decision moments, prestige timings, and notable flags.
- Done when: Results are captured and comparable after later changes.

## Task B: Fix Evaluator/Game Logic Parity

- Goal: Make simulation match runtime game behavior.
- Files: `scripts/evaluate.ts` (compare against `src/logic.ts`).
- Fixes:
  1. Prestige reset should not persist artists (currently incorrect in evaluator).
  2. Apply `inkReserves` and `sketchHeadStart` in evaluator prestige reset.
- Done when: Post-prestige behavior in eval matches runtime logic semantics.

## Task C: Correct Metric/Report Inconsistencies

- Goal: Remove misleading outputs.
- Files: `scripts/evaluate.ts`.
- Fixes:
  1. Dead-zone threshold text must match code (`>120s` or change code to `>20s` consistently).
  2. "Content reached" should be computed from events, not 5-min snapshots.
  3. Replace stale "reach 10M strokes" message with current threshold-aware text.
- Done when: No contradictory thresholds/messages remain.

## Task D: Add Experience-Feel Metrics

- Goal: Measure progression/lore cadence, not only economy.
- Files: `scripts/evaluate.ts`.
- Add metrics:
  1. Time between first-time major beats (`MEDIA`, `SWORD`, `ACHIEVE`).
  2. Longest novelty drought (no new major content).
  3. Time from first prestige to regaining prior max media tier/sword.
  4. Event burstiness (too many major unlocks in short windows).
- Done when: Report includes these metrics with brief explanations.

## Task E: Rework Decision Moments Interpretation

- Goal: Avoid over-trusting a metric constrained by ROI behavior.
- Files: `scripts/evaluate.ts`.
- Changes:
  1. Keep raw decision-moment count.
  2. Add close-call choice metric (top options within ROI delta band).
  3. Add warning that ROI strategy naturally suppresses simultaneous affordability.
- Done when: Decision quality is represented, not only count.

## Task F: Add Human-Like Strategy Profile

- Goal: Better approximate actual player feel.
- Files: `scripts/evaluate.ts`.
- Add strategy: `human` with:
  1. Non-zero reaction delay.
  2. Imperfect choice selection (near-best ROI, not always best).
  3. Moderate click rhythm variance.
- Done when: `--strategy human` works with stable/repeatable output.

## Task G: Re-evaluate Balance After Evaluator Fixes

- Goal: Use corrected evaluator to identify real pacing changes.
- Run same matrix as Task A plus `human`.
- Decide next balance actions based on corrected metrics.
- Done when: New balance recommendations are based on corrected evaluator outputs.

## Task H: Documentation and Handoff Standard

- Goal: Make future agent work consistent.
- Update docs with:
  1. Which metrics are authoritative.
  2. Which are diagnostic only.
  3. Required eval command matrix for any balance PR.
- Done when: Any new agent can run the process without rediscovering assumptions.

## Recommended Execution Order

- `A -> B -> C -> (D/E/F in parallel) -> G -> H`
