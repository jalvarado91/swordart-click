# Sword Art Click

Browser-based clicker/incremental game themed around "drawing swords" (sketching + unsheathing pun). Sketchbook/pen-on-paper visual style with hand-drawn SVG borders.

## Tech Stack

- TypeScript, vanilla HTML, vanilla CSS
- Bun for bundling (no frameworks)
- localStorage for save/load
- No external runtime dependencies

## Commands

- `bun run build` — bundle `src/main.ts` → `dist/game.js`
- `bun run watch` — same, with file watching
- `bunx tsc --noEmit` — type check without emitting
- Open `index.html` in a browser to play (no dev server needed)

## File Structure

```
index.html          — entry point, full-viewport grid layout
src/
  main.ts           — entry point: loadGame, initDOM, game loop
  types.ts          — all interfaces (GameState, UpgradeDef, etc.)
  data.ts           — all static constants and definition arrays
  state.ts          — global GameState object, createDefaultState(), replaceState()
  helpers.ts        — pure functions (formatNumber, cost calculators, multipliers)
  audio.ts          — Web Audio sound system
  effects.ts        — imperative side effects (floating text, notifications, shake, erase)
  logic.ts          — all state-mutating functions (buy*, tick, prestige, save/load)
  render.ts         — DOM cache, initDOM(), render(state), drawer/tab wiring, phase system
  style.css         — all styles (sketchbook theme, grid layout, phase theming, drawer)
assets/
  ShortStack.ttf    — handwritten font
  border.svg        — hand-drawn panel border (DoodleCSS-inspired)
  button.svg        — hand-drawn button border
  button-heavy.svg  — heavy-weight button border
  button-prestige.svg — prestige-themed button border
  button-danger.svg — danger/confirm button border
  hr.svg            — hand-drawn horizontal rule
  hr-prestige.svg   — prestige-themed horizontal rule
dist/               — build output (gitignored)
```

## Layout: Full-Viewport CSS Grid

The game fills the entire browser viewport with no page-level scrolling. Individual panels scroll internally.

```
+------------------------------------------------------------------+
| TOP-BAR: Title | Strokes | Per Click | Per Second | Multiplier   |
+------------------+------------------------+----------------------+
|                  |                        |                      |
| PANEL-LEFT       |        STAGE           |    PANEL-RIGHT       |
|                  |                        |                      |
| Media panel      |   Canvas/hero area     | Artists panel        |
|  (draw button,   |   (hero frame with     |  (artist hire        |
|   media upgrade)  |    title + status)     |   buttons)           |
|                  |                        |                      |
| Upgrades panel   |   Sword gallery        |                      |
|  (click upgrades) |   (collapsible)        |                      |
|                  |                        |                      |
| (scrolls)        |   (scrolls)            | (scrolls)            |
+------------------+------------------------+----------------------+
| BOTTOM-BAR: [Production] [Achievements] [Ascend] [Settings]     |
+------------------------------------------------------------------+
| DRAWER (slides up from bottom when a tab is clicked):            |
|   Production breakdown | Achievements | Prestige | Settings      |
+------------------------------------------------------------------+
```

Key structural IDs: `#top-bar`, `#panel-left`, `#stage`, `#panel-right`, `#bottom-bar`, `#drawer`

### Drawer Pattern

Prestige, production breakdown, achievements, and settings live in a **drawer** that slides up from the bottom bar. Each bottom-bar button toggles its corresponding `.drawer-panel`. The drawer has a backdrop, close button, and responds to Escape. All wiring is in `render.ts` `initDOM()`.

## Architecture: Game Loop Pattern

The game uses a game-dev-style loop. Every tick (100ms):

1. **`update()`** — mutates state (passive income, expire confirmation timers)
2. **`render(state)`** — reads state, writes entire UI to DOM

Event handlers (clicks) just mutate state. The next frame picks up changes.

### Rules

- **State is the single source of truth.** All UI state (confirmations, timers) lives in `GameState`, never in closures or DOM attributes.
- **`render()` never reads from the DOM.** It only writes: `.textContent`, `.disabled`, `.className`. No `innerHTML` in the render loop.
- **DOM elements are created once in `initDOM()`.** The render loop updates them in place. `innerHTML` is only used at init time.
- **Event handlers are thin.** They mutate `state` and return. No DOM manipulation, no calling render.
- **Logic functions don't touch the DOM.** Functions in `logic.ts` mutate state and call effects (sound, notifications). They never call render.

## Render System Details

`render.ts` is the largest file (~1200 lines). Key patterns:

### DOMCache
All DOM elements are queried once in `initDOM()` and stored in a `DOMCache` object. The render loop uses only cached references. This includes upgrade/artist/sword/achievement element maps, stat tiles, drawer elements, hero area, and phase-related elements.

### Run Phases
The game has three visual phases based on progression: `early`, `mid`, `late`. Detected in `detectRunPhase()` based on media tier, total strokes, clicks, prestige count, and ascension availability. Each phase changes:
- Panel headings and flavor text (via `PHASE_CONTENT` map)
- CSS body class (`run-phase-early`, `run-phase-mid`, `run-phase-late`)
- Background atmosphere gradients (CSS custom properties)
- Draw button label and hero title

### Progressive Disclosure
Upgrades and artists are hidden until the player approaches their cost (`shouldShowProgressiveOption()`). This prevents overwhelming new players with expensive options.

### Stat Tile Animations
Stat tiles show change deltas with brief visual cues (`stat-cue`, `stat-cue-burst`) when values change. Delta values accumulate within a merge window to avoid flickering.

### Canvas/Hero Area
The center stage has a hero frame with a title and status line that evolves with progression. CSS classes on `#canvas-area` reflect the current media tier (`canvas-pencil`, `canvas-charcoal`, etc.) and activity state (`hero-active`, `hero-milestone`, `hero-ascension-ready`).

### Previous-State Tracking
`render()` uses module-level `prev*` variables to skip unnecessary DOM writes. Lists (swords, achievements) only re-render when their count changes. Media tier text only updates when the tier changes. This is critical for the 100ms tick performance.

## Visual Theme

Sketchbook/pen-on-paper aesthetic:
- **Paper background** (`--bg: #e8e0cc`, `--paper: #f4edd8`) with CSS grain texture
- **Ink-colored text** (`--ink: #2a2018`) instead of light-on-dark
- **Hand-drawn SVG borders** via CSS `border-image` (DoodleCSS-inspired)
- **Short Stack font** for handwritten feel
- **Phase-based atmosphere** gradients that shift with progression
- **No external assets beyond the SVGs and font** — all texture via CSS

## Conventions

- Use Bun instead of Node.js, npm, or npx
- No external runtime dependencies — keep it vanilla
- Game state is a single `GameState` object, saved to localStorage as JSON
- Run `bunx tsc --noEmit` to type check after changes
- CSS custom properties (`:root` vars) for all colors, sizes, and borders

## How To Add Things

### New upgrade type
1. `types.ts` — add interface if needed
2. `data.ts` — add definition to the appropriate `_DEFS` array
3. `logic.ts` — add `buyX()` function that mutates state
4. `render.ts` — add to `initDOM()` (create elements, wire click handler) and `render()` (update text/disabled). Add `prev*` tracking if the list doesn't change every frame.

### New achievement
1. `data.ts` — add entry to `ACHIEVEMENT_DEFS` with a `check` function. That's it — achievements are checked automatically in `logic.ts` and rendered from the array.

### New UI panel in a sidebar
1. `types.ts` — add any new state fields to `GameState`
2. `state.ts` — add defaults in `createDefaultState()`
3. `index.html` — add container inside `#panel-left`, `#panel-right`, or `#stage`
4. `render.ts` — cache elements in `DOMCache` interface, create in `initDOM()`, update in `render()`
5. `logic.ts` — add any mutation functions
6. Wire event listeners in `initDOM()`

### New drawer panel (bottom bar section)
1. `index.html` — add a `.drawer-panel` inside `#drawer-content`, add a `.tab-btn` in `#bottom-bar`
2. `render.ts` — the drawer open/close logic in `initDOM()` auto-discovers `.tab-btn` and `.drawer-panel` elements by `data-drawer` attribute. Just match the `data-drawer` value to the panel's `id` (pattern: `drawer-{name}`).
3. Add any needed elements to `DOMCache` and update in `render()`

### New effect (animation, sound, visual feedback)
1. `effects.ts` — add function (these are imperative, outside the render loop)
2. Call it from `logic.ts` where needed

### New phase content
1. `render.ts` — add/edit entries in the `PHASE_CONTENT` map for each run phase (early/mid/late)
2. `style.css` — add phase-specific CSS under `.run-phase-early`, `.run-phase-mid`, `.run-phase-late` body classes

### Adding CSS borders/decorations
The hand-drawn look uses SVG `border-image` assets. Reference existing patterns in `style.css` — the `--sketch-btn`, `--sketch-border`, `--sketch-hr` custom properties. Create new SVG assets in `assets/` if needed.
