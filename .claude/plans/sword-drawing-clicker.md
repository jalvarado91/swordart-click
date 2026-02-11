# Sword Art Click — Clicker Game Plan

## Context

A browser-based clicker/incremental game themed around "drawing swords" — the double meaning of sketching + swords. The player clicks to draw (sketch) swords, earning "Strokes" as currency. Progression unlocks new sword types, art media (pencil → ink → watercolor → oil → digital), and increasingly absurd pun-driven upgrades.

**Tech stack:** TypeScript + HTML + CSS, built with Bun. `bun run build` bundles `src/game.ts` → `dist/game.js`. Open `index.html` to play. localStorage for save/load.

**Core pun engine:**
- "Drawing" = sketching art AND unsheathing a blade
- Sword types are puns: Broadsword, Swordfish, Sword of Damocles, Pen Sword (pen is mightier), Cross-word Sword, Pass-word Sword, etc.
- Art media as upgrade tiers: Pencil Sketch → Charcoal → Ink → Watercolor → Oil Painting → Digital Art → AI-Generated (ironic final tier)
- Achievements lean into the puns: "Sharp Wit", "The Point", "Cutting Edge", "Drawn Out", "Sketchy Business", "A Fine Line"

**Core loop:**
1. Click the canvas to draw a sword → earn Strokes
2. Spend Strokes on upgrades (better media = more Strokes per click)
3. Hire "Artists" (automation) that draw swords passively
4. Unlock new sword types at milestones (cosmetic + bonus multipliers)
5. Eventually: Prestige by "erasing" your gallery to start fresh with permanent bonuses

---

## Session 1: Clickable canvas and core loop — Completed

**Goal:** Get the fundamental click loop working — click a button, see a number go up, buy a basic upgrade.

**File changes:**
- `index.html` — Page structure: title, canvas/click area, stroke counter, upgrade panel
- `style.css` — Layout and styling. Dark parchment/sketchbook aesthetic. Big central click target
- `game.js` — Game state, click handler, tick loop (for passive income), basic upgrade purchasing, save/load to localStorage

**Core mechanics to implement:**
- Click the "Draw!" button → gain Strokes (starting at 1 per click)
- Display: current Strokes, Strokes per click, Strokes per second
- First upgrade tier: "Pencil Sharpener" (increases click value), "Art Student" (passive Strokes/sec)
- Exponential cost scaling (1.12x per purchase)
- Auto-save every 30 seconds + save on purchase
- Load game state on page open

**Verification:**
- Open `index.html` in browser
- Clicking increments the counter
- Can buy upgrades, costs scale up
- Refresh the page — progress persists

---

## Session 1.5: Git, Bun, and TypeScript setup — Completed

**Goal:** Initialize version control, add Bun as the bundler, and migrate to TypeScript.

**Changes made:**
- `git init`, `.gitignore`, initial commit
- `bun init`, `package.json` with build/watch scripts
- `tsconfig.json` with strict mode and DOM lib
- Restructured: `game.js` → `src/game.ts`, `style.css` → `src/style.css`
- Added interfaces (`UpgradeEffect`, `UpgradeDef`, `GameState`) and typed all functions
- `index.html` updated to reference `dist/game.js` and `src/style.css`
- `CLAUDE.md` with project conventions
- Build: `bun run build` → `dist/game.js`

---

## Session 2: Sword types and art media progression — Completed

**Goal:** Add the thematic content — sword varieties and art media tiers that give the game its personality.

**File changes:**
- `src/game.ts` — Add sword catalog, media tiers, unlock logic, multiplier system
- `index.html` — Gallery display area, media selector UI, sword unlock notifications
- `src/style.css` — Sword gallery styling, unlock animations, media-tier visual themes

**Content to add:**

*Art Media tiers (upgrade paths that multiply all production):*
1. Pencil Sketch (starting) — 1x
2. Charcoal — 3x (cost: 100)
3. Ink & Quill — 10x (cost: 1,000)
4. Watercolor — 50x (cost: 25,000)
5. Oil Painting — 250x (cost: 500,000)
6. Digital Art — 2,000x (cost: 10,000,000)
7. AI-Generated — 50,000x (cost: 1,000,000,000) — flavor text: "You've become what you swore to destroy"

*Sword types (unlock at Stroke milestones, each adds a permanent bonus):*
- Butter Knife (0) — "Everyone starts somewhere"
- Letter Opener (50) — "The pen is... adjacent to the sword"
- Broadsword (500) — "Wide strokes"
- Swordfish (5,000) — "Something smells fishy about this one"
- Crossword Sword (25,000) — "4 across: pointy weapon"
- Password Sword (100,000) — "Must contain 1 uppercase, 1 number, and 1 hilt"
- Sword of Damocles (500,000) — "Hangs over your head while you draw"
- Excalibur (5,000,000) — "Pulled from a pencil case"
- Lightsaber (50,000,000) — "Technically not a sword. We'll allow it."
- Pen Sword (500,000,000) — "Mightier than itself. A paradox."

**Verification:**
- Media tiers purchasable and visibly change the aesthetic/multiplier
- Swords unlock at correct thresholds with notification
- Gallery shows collected swords
- All new state saves/loads correctly

---

## Session 3: Automation upgrades and idle income — Completed

**Goal:** Add depth to the idle/automation side — multiple tiers of "artists" that passively generate Strokes.

**File changes:**
- `src/game.ts` — Artist system with multiple tiers, per-artist upgrades, offline progress calculation
- `index.html` — Artist hiring panel UI, production breakdown tooltip
- `src/style.css` — Artist panel styling, hire button states

*Artist tiers (automation generators):*
1. Doodler — 1 Stroke/sec (base cost: 15)
2. Sketch Artist — 5 Strokes/sec (base cost: 100)
3. Caricaturist — 25 Strokes/sec (base cost: 750)
4. Illustrator — 100 Strokes/sec (base cost: 5,000)
5. Court Painter — 500 Strokes/sec (base cost: 50,000)
6. Renaissance Master — 3,000 Strokes/sec (base cost: 500,000)
7. Sword Swallower — 15,000 Strokes/sec (base cost: 5,000,000) — "Draws swords differently"
8. Bob Ross — 100,000 Strokes/sec (base cost: 100,000,000) — "Happy little swords"

**Also implement:**
- Offline progress: on load, calculate elapsed time and grant idle earnings (capped at 8 hours)
- Count display for each artist owned
- Production breakdown showing contribution of each source

**Verification:**
- Can hire artists, they produce passively
- Multiple tiers available with scaling costs
- Close and reopen — offline earnings granted
- Production breakdown is accurate

---

## Session 4: Achievements and visual polish — Completed

**Goal:** Add achievements, click feedback animations, sound effects, and overall polish to make the game feel satisfying.

**File changes:**
- `src/game.ts` — Achievement system with unlock conditions, number formatting (K, M, B, T), click animation triggers
- `index.html` — Achievement panel/log, floating number animation elements, settings menu (sound toggle)
- `src/style.css` — Achievement popup animation, floating "+N" on click, screen shake on big milestones, particle effects via CSS
- `sfx/` — A few simple audio files (click, purchase, achievement, milestone) or generate them with Web Audio API

*Achievements (sampling):*
- "First Stroke" — Draw your first sword
- "Sharp Wit" — Reach 1,000 Strokes
- "Cutting Edge" — Buy your first media upgrade
- "The Art of War" — Own 10 artists
- "Sketchy Business" — Draw 10,000 swords
- "Drawn Out" — Play for 30 minutes
- "A Fine Line" — Reach 1,000,000 Strokes
- "Foiled Again" — Reach the Ink & Quill media tier
- "Oil's Well That Ends Well" — Reach Oil Painting
- "Pixel Perfect" — Reach Digital Art
- "I, For One, Welcome Our AI Overlords" — Reach AI-Generated

**Also implement:**
- Large number formatting (1,234,567 → 1.23M)
- Floating "+N" text on each click
- Screen flash/shake on milestone unlocks
- Settings: mute toggle, manual save button, export/import save (base64)
- Favicon (simple sword emoji or SVG)

**Verification:**
- Achievements pop up at correct thresholds
- Click feedback feels satisfying (animation + optional sound)
- Numbers format cleanly at all scales
- Save export/import works
- Game looks and feels polished

---

## Session 5: Prestige system and endgame

**Goal:** Add the "Erase & Redraw" prestige mechanic for replayability and a sense of meta-progression.

**File changes:**
- `src/game.ts` — Prestige currency ("Erasure Points"), prestige reset logic, permanent bonuses, prestige upgrade shop
- `index.html` — Prestige panel UI, confirmation dialog, prestige stats display
- `src/style.css` — Prestige panel styling, "erasing" animation on reset

**Prestige mechanics:**
- "Erase & Redraw" becomes available after reaching 10,000,000 Strokes
- Erasing resets: Strokes, artists, media tier, sword unlocks
- Erasing grants: "Erasure Points" based on total Strokes earned (formula: floor(sqrt(totalStrokes / 1,000,000)))
- Erasure Points buy permanent bonuses:
  - "Muscle Memory" — +10% click power per level
  - "Art School" — +25% artist production per level
  - "Better Paper" — Start with Charcoal media after prestige
  - "Portfolio" — Keep unlocked sword types across prestiges
  - "Speed Sketch" — +50% all production per level (expensive)

**Verification:**
- Prestige button appears at correct threshold
- Reset clears appropriate state, preserves prestige currency and upgrades
- Prestige upgrades apply correctly to new run
- Multiple prestige cycles work smoothly
- Overall game arc feels satisfying from start to prestige
