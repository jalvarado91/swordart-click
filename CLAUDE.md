# Sword Art Click

Browser-based clicker/incremental game themed around "drawing swords" (sketching + unsheathing pun).

## Tech Stack

- TypeScript, vanilla HTML, vanilla CSS
- Bun for bundling (no frameworks, no React)
- localStorage for save/load

## Commands

- `bun run build` — bundle `src/game.ts` → `dist/game.js`
- `bun run watch` — same, with file watching
- Open `index.html` in a browser to play (no dev server needed)

## File Structure

```
index.html          — entry point, references dist/game.js and src/style.css
src/game.ts         — all game logic
src/style.css       — all styles
dist/               — build output (gitignored)
```

## Conventions

- All game logic lives in `src/game.ts` (will split into modules as it grows)
- Use Bun instead of Node.js, npm, or npx
- No external runtime dependencies — keep it vanilla
- Game state is a single `GameState` object, saved to localStorage as JSON
