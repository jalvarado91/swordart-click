# Reset Game + Laptop Layout Optimization

## Context

Two issues to address:
1. **No way to reset the game.** There's no "start fresh" button — the only option is manually clearing localStorage. Need a reset button with a confirmation step to prevent accidental data loss.
2. **Awkward layout on laptop screens.** The current layout is a 900px max-width single container with a two-column `#main-area` (left: click button + media + upgrades, right: artists + production), then gallery, achievements, and settings stacked full-width below. This creates excessive vertical scrolling because the artists list alone is 8 items tall, the click zone burns 240px of height, and everything below the fold requires scrolling past it all. Laptop screens (typically 1200–1440px wide, ~750–900px viewport height) are the primary target.

**Key design decisions:**
- Shrink the click zone and tighten vertical spacing to keep stats + button + core panels visible without scrolling
- Reorganize into a denser layout: click button and stats as a compact header area, with upgrades/artists/media as the scrollable content below
- Gallery, achievements, settings go into collapsible sections so they don't push everything down
- Add a "Reset Game" button in settings with a two-click confirmation (first click reveals "Are you sure?", second click actually resets)

---

## Session 1: Laptop layout optimization — Completed

**Goal:** Rework the layout so the core gameplay loop (stats, click button, upgrades, artists) fits better on a laptop screen without excessive scrolling.

**File changes:**
- `src/style.css` — Rework layout: shrink click zone (200px → 140px button, reduce min-height), tighten header/stats padding, make `#main-area` three-column (click+media | upgrades | artists), reduce panel padding/margins, make gallery/achievements/settings collapsible with a toggle
- `index.html` — Add collapsible toggle buttons on gallery/achievements/settings section headings, restructure `#main-area` to support the new column layout
- `src/game.ts` — Add toggle logic for collapsible sections (pure DOM, persist collapsed state to localStorage)

**Layout target (laptop ~1200px+ wide):**
```
[Header: Title + Stats (compact)]
[  Click+Media  |  Upgrades  |  Artists+Production  ]
[Gallery (collapsible)]
[Achievements (collapsible)]
[Settings (collapsible)]
```

**Specific changes:**
- `#draw-btn`: 200px → 140px, `#click-zone` min-height 240px → 160px
- Header padding: 20px → 12px, stats padding: 16px → 10px
- `#main-area`: three columns — first column is click zone + media panel, second is upgrades, third is artists + production breakdown
- Panel padding: 16px → 12px, panel gap: 20px → 14px
- Gallery, achievements, settings: add a clickable h2 that toggles content visibility, default to collapsed for achievements and settings, expanded for gallery
- Responsive: below 900px fall back to two columns, below 700px single column (existing behavior)

**Verification:**
- On a ~1366×768 viewport, stats + click button + top of upgrade/artist panels should be visible without scrolling
- Collapsible sections toggle open/closed and state persists across page reloads
- Mobile (< 700px) layout still works as before
- All existing functionality intact

---

## Session 2: Game reset button — Completed

**Goal:** Add a "Reset Game" button in the settings panel with a safety confirmation.

**File changes:**
- `index.html` — Add reset button in `#settings-controls`
- `src/game.ts` — Add `resetGame()` function: clears localStorage save, resets state to default, re-renders everything. Add two-click confirmation: first click changes button text to "Are you sure? Click again to reset" with a danger style, second click within 3 seconds actually resets, otherwise reverts to normal
- `src/style.css` — Add `.settings-btn.danger` style (red-tinted border/text) for the confirmation state

**Verification:**
- Click "Reset" once → button changes to confirmation text with danger styling
- Wait 3+ seconds without clicking → button reverts to normal "Reset" text
- Click "Reset" then click again within 3s → game fully resets (strokes, upgrades, artists, media, swords, achievements all back to default)
- After reset, game behaves exactly like a fresh start
- Existing save/export/import still work normally
