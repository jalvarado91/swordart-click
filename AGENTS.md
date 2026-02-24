# Agent Instructions (Codex/OpenCode)

This repository already has `CLAUDE.md`. Treat it as the canonical engineering
and architecture guide.

## Source of Truth

- Primary: `CLAUDE.md`
- If this file and `CLAUDE.md` conflict, follow `CLAUDE.md`.

## Scope of This File

`AGENTS.md` is intentionally minimal and operational. Keep branch-specific
balancing details out of this file.

## Required Commands

- `bunx tsc --noEmit` after code changes
- `bun run build` when behavior/UI wiring changes
- `bun run evaluate:optimal` and `bun run evaluate:idle` for balance changes

## Working Rules

- Keep `GameState` as the single source of truth.
- `render()` writes UI only; do not read DOM state in render.
- Event handlers mutate state only; no direct render calls.
- `logic.ts` mutates state and may trigger effects, but does not render.

## Where Balance Context Lives

- Current tuning and capability snapshot: `docs/balance.md`
- Rebalance timeline/history: `docs/history/rebalance-2026-02-18.md`
