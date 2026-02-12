# Sword Art Click

Browser-based clicker/incremental game themed around "drawing swords" (sketching + unsheathing pun).

## Tech Stack

- TypeScript, vanilla HTML, vanilla CSS
- Bun for bundling (no frameworks)
- localStorage for save/load

## Commands

- `bun run build` — bundle `src/main.ts` → `dist/game.js`
- `bun run watch` — same, with file watching
- `bunx tsc --noEmit` — type check without emitting
- Open `index.html` in a browser to play (no dev server needed)

## File Structure

```
index.html          — entry point, references dist/game.js and src/style.css
src/
  main.ts           — entry point: loadGame, initDOM, game loop
  types.ts          — all interfaces (GameState, UpgradeDef, etc.)
  data.ts           — all static constants and definition arrays
  state.ts          — global GameState object, createDefaultState(), replaceState()
  helpers.ts        — pure functions (formatNumber, cost calculators, multipliers)
  audio.ts          — Web Audio sound system
  effects.ts        — imperative side effects (floating text, notifications, shake, erase)
  logic.ts          — all state-mutating functions (buy*, tick, prestige, save/load)
  render.ts         — DOM element cache, initDOM(), single render(state) function
  style.css         — all styles
dist/               — build output (gitignored)
```

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

## Conventions

- Use Bun instead of Node.js, npm, or npx
- No external runtime dependencies — keep it vanilla
- Game state is a single `GameState` object, saved to localStorage as JSON
- Run `bunx tsc --noEmit` to type check after changes

## How To Add Things

### New upgrade type
1. `types.ts` — add interface if needed
2. `data.ts` — add definition to the appropriate `_DEFS` array
3. `logic.ts` — add `buyX()` function that mutates state
4. `render.ts` — add to `initDOM()` (create elements, wire click handler) and `render()` (update text/disabled)

### New achievement
1. `data.ts` — add entry to `ACHIEVEMENT_DEFS` with a `check` function. That's it — achievements are checked automatically in `logic.ts` and rendered from the array.

### New UI panel
1. `types.ts` — add any new state fields to `GameState`
2. `state.ts` — add defaults in `createDefaultState()`
3. `index.html` — add container element
4. `render.ts` — cache elements in `DOMCache` interface, create in `initDOM()`, update in `render()`
5. `logic.ts` — add any mutation functions
6. Wire event listeners in `initDOM()`

### New effect (animation, sound, visual feedback)
1. `effects.ts` — add function (these are imperative, outside the render loop)
2. Call it from `logic.ts` where needed
