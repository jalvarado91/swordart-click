# Agent Instructions (Codex/OpenCode)

This repository already has `CLAUDE.md`. Treat it as the canonical engineering and architecture guide.

## Source of Truth

- Primary: `CLAUDE.md`
- If this file and `CLAUDE.md` conflict, follow `CLAUDE.md`.

## Project Snapshot

- Stack: TypeScript + vanilla HTML/CSS
- Tooling: Bun
- Build output: `dist/game.js`
- Entry point: `src/main.ts`

## Commands

- `bun run build` - bundle once
- `bun run watch` - bundle in watch mode
- `bunx tsc --noEmit` - type check

## Architecture Rules

- Keep `GameState` as the single source of truth.
- `render()` writes UI only; do not read DOM state in render.
- Create/cache DOM in `initDOM()`, then update in `render()`.
- Event handlers should mutate state only (no direct render/DOM work).
- `logic.ts` mutates state and triggers effects, never direct rendering.

## Change Checklist

1. Make focused edits in the appropriate module (`data.ts`, `logic.ts`, `render.ts`, `state.ts`, `types.ts`).
2. Run `bunx tsc --noEmit` after changes.
3. Run `bun run build` when behavior or UI logic changes.
4. Keep runtime dependency-free unless explicitly requested.

## Where To Look

- Game rules/data: `src/data.ts`
- State shape/defaults: `src/types.ts`, `src/state.ts`
- State mutations: `src/logic.ts`
- Rendering/DOM wiring: `src/render.ts`
- Effects/audio: `src/effects.ts`, `src/audio.ts`

For complete implementation detail and feature extension patterns, read `CLAUDE.md`.
