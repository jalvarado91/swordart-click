# Balance Pass Cadence Run Log (2026-02-18)

Captured on: 2026-02-18 EST  
Branch: `game-eval-system-plus`  
Commit: `58c4a99` (starting point)

## Scope

Workstream source: `docs/plans/balance-pass-cadence-agent-plan.md`

Goals for this pass:

- Delay first prestige for active play (`optimal`, `human`)
- Reduce late-session novelty droughts
- Preserve idle pacing near current behavior

## Task 1: Starting Baseline (Pre-Tuning)

### Commands

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:human`
- `bun run evaluate:prestige`

### Baseline Metrics

| Run | First prestige | Longest novelty drought | Peak novelty burst |
|---|---:|---:|---:|
| `optimal` (60m) | `17:09` | `21:42` | `8 beats / 2:00` |
| `human` (60m) | `16:45` | `24:57` | `8 beats / 2:00` |
| `idle` (120m) | `39:47` | `42:12` | `5 beats / 2:00` |
| `prestige` (120m, max 2) | `#1 17:09`, `#2 24:45` | `1:01:06` | `8 beats / 2:00` |

## Iteration Summary

| Iteration | Data changes | `optimal` prestige | `human` prestige | `idle` prestige | `optimal` drought | `human` drought | `idle` drought |
|---|---|---:|---:|---:|---:|---:|---:|
| Baseline | none | `17:09` | `16:45` | `39:47` | `21:42` | `24:57` | `42:12` |
| 1 | Nerf `Ink Brush`/`Precision Blade`; add 3 late artist-count achievements | `18:46` | `18:35` | `40:21` | `12:44` | `11:50` | `23:48` |
| 2-4 | Additional click-band tuning (`COST_SCALE`, `Ink Brush`, `Precision Blade`, `Calligraphy`) | `22:54` | `23:32` | `40:21` | `11:41` | `14:25` | `23:44` |
| 5 | Small prestige-threshold calibration to `2.3B` | `23:24` | `24:02` | `40:54` | `11:07` | `14:25` | `25:36` |
| 6 | Prestige-cadence follow-up: add ultra-late achievements (`1,360` to `1,440` artists) | `23:24` | `24:02` | `40:54` | `11:07` | `14:25` | `25:36` |

## Final Validation Matrix

### Commands

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:human`
- `bun run evaluate:prestige`
- `bunx tsc --noEmit`
- `bun run build`

### Final Metrics

| Run | First prestige | Longest novelty drought | Peak novelty burst | Dead zones |
|---|---:|---:|---:|---:|
| `optimal` (60m) | `23:24` | `11:07` | `8 beats / 2:00` | `0` |
| `human` (60m) | `24:02` | `14:25` | `8 beats / 2:00` | `0` |
| `idle` (120m) | `40:54` | `25:36` | `6 beats / 2:00` | `0` |
| `prestige` (120m, max 2) | `#1 23:24`, `#2 32:57` | `14:59` | `8 beats / 2:00` | `0` |

## Target Table (Hit/Miss)

| Target | Final | Status |
|---|---:|---|
| `optimal` first prestige `22:00`-`30:00` | `23:24` | hit |
| `human` first prestige `24:00`-`34:00` | `24:02` | hit |
| `idle` first prestige `38:00`-`55:00` | `40:54` | hit |
| `idle` first prestige not below `35:00` | `40:54` | hit |
| `optimal` longest novelty drought `<= 15:00` | `11:07` | hit |
| `human` longest novelty drought `<= 18:00` | `14:25` | hit |
| `idle` longest novelty drought `<= 30:00` | `25:36` | hit |
| no unreachable artists (`optimal`/`idle`) | all 10 artist types hired in both runs | hit |
| at least one prestige in `optimal` 60m and `idle` 120m | yes in both | hit |
| no >10 major beats in 2-minute burst windows | peak `8` | hit |

## Decision Record

### What changed in `src/data.ts`

- `COST_SCALE`: `1.12` -> `1.155`
- `PRESTIGE_THRESHOLD`: `2_000_000_000` -> `2_300_000_000`
- `Calligraphy Set`: `baseCost 400` -> `700`; click value `+10` -> `+8`
- `Ink Brush`: `baseCost 5_000` -> `16_000`; click value `+25` -> `+14`
- `Precision Blade`: `baseCost 100_000` -> `900_000`; click value `+75` -> `+25`
- Added late-run achievements:
  - `Studio Machine` (1,050 total artists)
  - `Gallery Empire` (1,180 total artists)
  - `Atelier Legion` (1,275 total artists)
  - `Production Line` (1,360 total artists)
  - `Guild Network` (1,385 total artists)
  - `Grand Collective` (1,400 total artists)
  - `Atelier Assembly` (1,412 total artists)
  - `Living Archive` (1,425 total artists)
  - `Endless Studio` (1,440 total artists)

### Top 2 remaining issues for next pass

1. First prestige feel flags remain percentage-based in evaluator output (still prints warning at ~39-40% session share), despite timing now matching per-strategy targets.
2. Late achievement chain is currently artist-count-heavy; consider diversifying with mixed condition types (strokes, playtime, prestige-depth) to avoid monotony.
