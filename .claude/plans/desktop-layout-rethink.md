# Desktop Layout Rethink

## Context

Multiple attempts to fix the desktop layout have failed. The sticky approach blocks content below the fold. The flex-column-with-overflow approach has similar issues. The responsive breakpoints have accumulated stale overrides. Mobile isn't a priority — we need to focus entirely on making desktop feel great.

**The core problem:** The game has two zones of content — the "always needed" interactive area (stats, draw button, upgrades, artists) and the "check occasionally" sections (gallery, prestige, achievements, settings). Previous approaches tried to make the interactive area sticky/fixed while allowing scroll to the lower sections, but this created conflicts.

**The solution:** Make `#game` a full-viewport flex column. The interactive area (`#main-area`) fills remaining space with internally-scrolling columns. The lower sections (gallery, prestige, achievements, settings) move *into* the left column (`#col-click`) so everything lives inside the scrollable columns — no content is hidden below the fold. The header and stats bar sit above, compact and fixed-height.

This is how most successful clicker games work (Cookie Clicker, etc.) — everything is reachable within the viewport, with individual panels scrolling internally.

## Files
- `index.html` — move gallery/prestige/achievements/settings sections inside `#col-click` (after breakdown-panel)
- `src/style.css` — full layout rewrite for desktop, remove mobile breakpoints

## Changes

### Session 1: Restructure HTML and core layout — Completed

**Goal:** Move the "occasionally needed" sections into the left column and make the whole game fit in the viewport with internal column scrolling.

**index.html changes:**
- Move `#gallery-section`, `#prestige-section`, `#achievements-section`, `#settings-section` from after `#main-area` to inside `#col-click` (after `#breakdown-panel`)
- This means all content lives within the 3-column layout

**style.css layout changes:**
- `body`: add `height: 100vh; overflow: hidden` (no page-level scroll)
- `#game`: `height: 100vh; display: flex; flex-direction: column; overflow: hidden` (fixed to viewport)
- `header`: keep title sequence animation as-is
- `#stats`: keep as-is (compact bar)
- `#main-area`: `flex: 1; min-height: 0; display: flex; gap: 18px` — fills remaining space, no sticky
- Columns: remove `max-height: calc(...)`, just use `overflow-y: auto` — they naturally fill the flex parent
- `#col-click`: wider to accommodate the extra sections, `width: 280px`
- Remove both `@media` breakpoints entirely (not targeting mobile)
- Clean up any stale sticky/overflow overrides

**Section style adjustments:**
- Gallery, prestige, achievements, settings sections: remove `margin-top: 14px` (they're now inside a flex column with gap)
- These sections within #col-click should feel natural as part of the scrollable left column

**Verification:**
- `bun run build` succeeds
- `bunx tsc --noEmit` succeeds (no TS changes expected, but verify HTML restructure doesn't break DOM queries)
- Open in browser: entire game fits in viewport, no page-level scrollbar
- All three columns scroll independently when content overflows
- Gallery, prestige, achievements, settings are reachable by scrolling the left column
- Title sequence animation still works
- Collapsible sections still work
