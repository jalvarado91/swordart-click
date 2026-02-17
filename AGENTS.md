# Agent Instructions (Codex/OpenCode)

This repository already has `CLAUDE.md`. Treat it as the canonical engineering and architecture guide.

## Source of Truth

- Primary: `CLAUDE.md`
- If this file and `CLAUDE.md` conflict, follow `CLAUDE.md`.

## Project Snapshot

- Stack: TypeScript + vanilla HTML/CSS, no frameworks
- Tooling: Bun (not npm/node/npx)
- Build output: `dist/game.js`
- Entry point: `src/main.ts`
- Visual theme: sketchbook/pen-on-paper with hand-drawn SVG borders

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
- Use `prev*` tracking variables to skip unnecessary DOM writes in `render()`.

## Layout

Full-viewport CSS Grid, no page-level scroll. Grid areas: `#top-bar`, `#panel-left` (media + click upgrades), `#stage` (canvas/hero + gallery), `#panel-right` (artists), `#bottom-bar` (tab buttons), `#drawer` (slides up for prestige/production/achievements/settings).

## Change Checklist

1. Make focused edits in the appropriate module (`data.ts`, `logic.ts`, `render.ts`, `state.ts`, `types.ts`, `style.css`).
2. For layout changes, update both `index.html` and `src/style.css`.
3. For new UI elements, add to `DOMCache` in `render.ts` and wire in `initDOM()`.
4. Run `bunx tsc --noEmit` after changes.
5. Run `bun run build` when behavior or UI logic changes.
6. Keep runtime dependency-free unless explicitly requested.

## Where To Look

- Game rules/data: `src/data.ts`
- State shape/defaults: `src/types.ts`, `src/state.ts`
- State mutations: `src/logic.ts`
- Rendering/DOM wiring/drawer/phase system: `src/render.ts`
- Effects/audio: `src/effects.ts`, `src/audio.ts`
- Layout structure: `index.html` (grid zones), `src/style.css` (grid + theme)
- Visual assets: `assets/` (SVG borders, font)

For complete implementation detail, extension patterns, and the drawer/phase system, read `CLAUDE.md`.
