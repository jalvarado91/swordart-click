# Task A Baseline Evidence (Evaluator Improvement Plan)

Captured on: 2026-02-17 23:26-23:34 EST  
Branch: `claude/game-evaluation-system-DUqHy`  
Commit: `0fbeb74`

## Commands Run

- `bun run evaluate:optimal`
- `bun run evaluate:idle`
- `bun run evaluate:prestige`
- `bun scripts/evaluate.ts --strategy cheapest --clicks 3 --minutes 60`

## Core Metrics

| Run | First prestige | Early | Mid | Late | Decision moments | Avg decision frequency | End progress |
|---|---:|---:|---:|---:|---:|---:|---|
| `optimal` (60m) | `17:09` | `01:41` | `03:03` | `55:14` | `10` | every `06:00` | media `7/7`, swords `10/10`, achievements `17/17` |
| `idle` (120m) | `39:47` | `07:11` | `09:33` | `1:43:15` | `10` | every `12:00` | media `7/7`, swords `10/10`, achievements `16/17` |
| `cheapest` (60m) | `17:10` | `01:41` | `03:04` | `55:13` | `10` | every `06:00` | media `7/7`, swords `10/10`, achievements `17/17` |
| `prestige` (120m, max 2) | `#1 17:09`, `#2 19:15` | `01:41` | `03:03` | `1:55:14` | `10` | every `12:00` | media `7/7`, swords `10/10`, achievements `17/17`, prestige `2` |

## Milestone Timings (selected)

| Milestone | optimal | idle | cheapest | prestige run |
|---|---:|---:|---:|---:|
| Charcoal | `01:38` | `06:51` | `01:39` | `01:38` |
| Ink & Quill | `04:24` | `15:45` | `04:25` | `04:24` |
| Watercolor | `08:22` | `24:58` | `08:23` | `08:22` |
| Oil Painting | `13:51` | `35:00` | `13:52` | `13:51` |
| Lightsaber | `13:19` | `34:09` | `13:20` | `13:19` |
| The Long Game | `17:09` | `39:47` | `17:10` | `17:09` |
| Pen Sword | `19:33` | `42:49` | `19:33` | `20:22` |
| AI-Generated | `23:45` | `47:33` | `23:45` | `22:43` |

## Notable Flags and Observations

- Evaluator flags first prestige as rushed in all runs:
  - optimal: 29% of session (`17:09` / 60m)
  - idle: 33% of session (`39:47` / 120m)
  - prestige run: 14% of session (`17:09` / 120m)
- `optimal` and `cheapest` are near-identical under current setup.
- Decision moments are fixed at `10` across all tested strategies.
- In `evaluate:prestige`, prestige #2 occurs only `02:06` after prestige #1.
- Idle run misses only `Sketchy Business` (`5,000` clicks), as expected for low CPS.

## Baseline Use

Use this file as the before/after reference for Tasks B–G. Any evaluator changes should rerun the same command matrix and compare directly to this snapshot.
