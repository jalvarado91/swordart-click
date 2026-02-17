# OpenCode Project Guide

Use this file as OpenCode-specific entry guidance. Canonical project rules are in `CLAUDE.md`.

## Canonical Docs

- First read: `CLAUDE.md`
- Then use: `AGENTS.md` for concise execution checklist

## Fast Start

- Install deps: already managed with Bun lockfile
- Type check: `bunx tsc --noEmit`
- Build: `bun run build`
- Play/test manually by opening `index.html`

## Implementation Expectations

- Preserve the update/render loop pattern in `src/main.ts` and `src/render.ts`.
- Add new game features by updating:
  - type/state definitions (`src/types.ts`, `src/state.ts`)
  - data defs (`src/data.ts`)
  - logic mutations (`src/logic.ts`)
  - UI creation and updates (`src/render.ts`)
- Avoid introducing frameworks or runtime dependencies.

## Quality Bar

- No dead code or orphaned UI nodes.
- Keep DOM writes centralized in render/effects layers.
- Validate with type check before finishing.
