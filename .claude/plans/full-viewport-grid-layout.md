# Full Viewport Grid Layout

## Context

The game currently uses a constrained `max-width: 1280px` flex-column layout that wastes screen real estate. The left column is overloaded — it holds the draw button, media upgrades, production breakdown, gallery, prestige, achievements, AND settings. The middle and right columns are just lists of upgrade buttons. This doesn't feel like a real game — it feels like a dashboard.

Games like Cookie Clicker and SPACEPLAN succeed because they give the **central visual area** prominence — that's where the "action" happens (clicking the cookie, watching planets spin). The shop/upgrades live in narrow side panels. The game evolves visually as you progress.

**Goals:**
1. Use the full browser width — no max-width constraint
2. Switch to CSS Grid for a clear, maintainable layout
3. Rethink information architecture: center = visual action, sides = shops
4. Create a prominent center canvas area that can evolve with progression
5. Move settings/achievements into a compact footer or header area — they're meta-UI, not gameplay

**Target layout (full viewport, no scroll):**

```
+------------------------------------------------------------------+
| HEADER: Title (compact) | Strokes: XXX | +X/click | +X/sec       |
+----------+----------------------------------+--------------------+
|          |                                  |                    |
| UPGRADES |           CANVAS                 |     ARTISTS        |
|          |                                  |                    |
| Click    |   [  Draw Button  ]              | Doodler        x5  |
| upgrades |                                  | Sketch Artist  x3  |
| + Media  |   Current sword visual           | Caricaturist   x1  |
| upgrade  |   + evolving scene               | ...                |
|          |                                  |                    |
| (scroll) |   Gallery swords grid            | (scroll)           |
|          |   (when expanded)                |                    |
|          |                                  |                    |
+----------+------+-----------+---------------+--------------------+
| FOOTER: Prestige | Achievements (0/11) | Settings | Production   |
+------------------------------------------------------------------+
```

Key decisions:
- **Center stage**: The draw button and a new "canvas" area dominate. This is where sword visuals, the gallery, and future visual progression (evolving scenes per media tier) will live.
- **Left panel**: Click upgrades + media upgrade — these are "tools" you buy to improve your click.
- **Right panel**: Artists — your passive income workforce.
- **Footer bar**: Prestige, achievements, settings, and production breakdown become collapsible footer sections. They're important but not primary gameplay — you check them periodically.
- **Header**: Merged title + stats into one compact row. No wasted vertical space.
- **Full width**: Remove max-width, let the game breathe on wide screens.

## Files
- `index.html` — restructure all sections into the new grid zones
- `src/style.css` — full rewrite to CSS Grid layout, remove old flex columns
- `src/render.ts` — update DOMCache and initDOM() for new element structure, update render()

## Changes

### Session 1: HTML restructure and CSS Grid skeleton — Completed

**Goal:** Restructure the HTML into the new grid zones and implement the CSS Grid layout. The game should be fully playable with the new layout by end of session.

**index.html changes:**

Restructure `#game` children into grid areas:

```html
<div id="game">
  <!-- Top bar: merged header + stats -->
  <div id="top-bar">
    <h1>Sword Art Click</h1>
    <div id="stats">...</div>
  </div>

  <!-- Left panel: click upgrades + media -->
  <div id="panel-left">
    <div id="media-panel">...</div>
    <div id="upgrades-panel">...</div>
  </div>

  <!-- Center stage: draw button + canvas area + gallery -->
  <div id="stage">
    <div id="click-zone">
      <button id="draw-btn">...</button>
    </div>
    <div id="canvas-area">
      <!-- Future: evolving visual scene per media tier -->
      <!-- For now: empty placeholder that gives the center presence -->
    </div>
    <div id="gallery-section" class="collapsible">...</div>
  </div>

  <!-- Right panel: artists -->
  <div id="panel-right">
    <div id="artists-panel">...</div>
  </div>

  <!-- Footer bar: prestige, achievements, settings, production -->
  <div id="bottom-bar">
    <div id="prestige-section" class="collapsible">...</div>
    <div id="breakdown-panel">...</div>
    <div id="achievements-section" class="collapsible">...</div>
    <div id="settings-section" class="collapsible">...</div>
  </div>

  <div id="notifications"></div>
</div>
```

Remove the old `<header>`, `#main-area`, `#col-click`, `#col-upgrades`, `#col-artists` wrappers entirely.

**style.css changes:**

Replace the flex layout with CSS Grid:

```css
#game {
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 240px 1fr 260px;
  grid-template-areas:
    "top-bar   top-bar    top-bar"
    "left      stage      right"
    "bottom    bottom     bottom";
  overflow: hidden;
  /* Remove max-width, padding adjustments */
}

#top-bar    { grid-area: top-bar; }
#panel-left { grid-area: left; overflow-y: auto; }
#stage      { grid-area: stage; overflow-y: auto; }
#panel-right{ grid-area: right; overflow-y: auto; }
#bottom-bar { grid-area: bottom; }
```

- `#top-bar`: horizontal flex, compact single row with title + stats
- `#panel-left` / `#panel-right`: scrollable side panels, ~240-260px wide
- `#stage`: center area, flex column with draw button centered and gallery below
- `#bottom-bar`: horizontal flex row of collapsible sections
- `body`: remove `justify-content: center`, full width
- Remove the old header collapse animation (header is now a compact bar from the start)
- Move all section-specific styles (panel borders, headings) to work in their new locations
- `#canvas-area`: give it a min-height and subtle visual presence (e.g. a light sketch-border frame) as a placeholder for future visual content

**Collapsible footer sections:**
- Prestige, achievements, settings in the footer use a horizontal layout
- Each is a collapsible that expands *upward* (or reveals content below the heading)
- When expanded, the footer grows and the main area adjusts (grid row is `auto`)

**render.ts changes:**
- Update `initDOM()`: remove old column wrapper references, query new container IDs (`panel-left`, `panel-right`, `stage`, `bottom-bar`)
- Update `DOMCache`: remove `col-click`, `col-upgrades`, `col-artists` refs if any
- The render() function itself shouldn't need changes since it targets elements by ID, not by container structure
- Wire up any new collapsible toggles for footer sections

**Verification:**
- `bun run build` succeeds
- `bunx tsc --noEmit` succeeds
- Open in browser: game fills full viewport width, no horizontal/vertical page scroll
- Grid layout visible: left panel (upgrades), center stage (draw button + gallery), right panel (artists), footer bar
- All buttons work: draw, buy upgrades, buy artists, media upgrade, prestige, settings
- Collapsible sections still toggle
- Side panels scroll independently when content overflows
- Title animation removed — compact header shows immediately

### Session 2: Polish panel styles and footer UX — Completed

**Goal:** Refine the visual presentation of each grid zone. Make the panels feel like proper game UI regions with clear visual separation. Improve the footer bar interaction pattern.

**style.css changes:**

Top bar polish:
- Title on the left, stats spread across the remaining space
- Subtle bottom border (sketch-hr)
- Remove old header padding/animation keyframes (header-collapse, h1-collapse, tagline-collapse)
- Remove `.tagline` styles entirely

Side panel polish:
- `#panel-left`, `#panel-right`: subtle background tint or left/right sketch border to separate from center
- Panel headings: consistent uppercase small-caps style
- Upgrade buttons: ensure they use full panel width nicely
- Reduce gap between upgrade entries for density

Center stage polish:
- `#click-zone`: vertically centered in the available space above the gallery
- `#canvas-area`: styled frame/border using sketch-border, min-height ~200px, centered
- `#gallery-section`: grid of swords fills remaining space below canvas

Footer bar polish:
- Horizontal row of sections, each taking equal width
- Each section heading is always visible as a tab-like label
- Collapsible content appears below when toggled
- Sketch-hr top border on the footer
- Prestige section keeps its purple theme
- Production breakdown rendered as a compact summary in its footer slot

**index.html changes:**
- Remove the `<p class="tagline">` element from the top bar (tagline was already animation-hidden; remove it fully)

**Verification:**
- Visual: clean grid with distinct zones, sketch-style borders between areas
- Footer sections expand/collapse without breaking layout
- No overlapping elements or z-index issues
- Draw button remains prominent and centered
- Gallery grid adapts to center stage width

### Session 3: Canvas area placeholder and progression theming — Completed

**Goal:** Give the center canvas area visual life that hints at future progression content. Add per-media-tier theming so the canvas evolves as the player upgrades their media.

**style.css changes:**
- `#canvas-area`: styled as a framed "paper" surface with the sketch border
- Add CSS classes for each media tier: `.canvas-pencil`, `.canvas-charcoal`, `.canvas-ink`, `.canvas-watercolor`, `.canvas-oil`, `.canvas-digital`, `.canvas-ai`
- Each tier class changes the canvas background subtly (pencil = light sketch lines, charcoal = slightly darker/smudged, ink = clean white, watercolor = faint color wash, oil = warm tones, digital = slight glow, ai = gradient shimmer)
- These are purely CSS — background gradients, subtle box-shadows, or filter changes

**render.ts changes:**
- In `render()`, set `#canvas-area` className based on `state.mediaTier` (e.g., `canvas-${MEDIA_TIERS[state.mediaTier].id}`)
- Add `canvasArea` to DOMCache
- Track `prevMediaTier` to only update when tier changes (already tracked for media button)

**types.ts / data.ts changes:**
- Add an `id` field to the `MediaTier` interface if not present (slug like "pencil", "charcoal", etc.) for CSS class mapping

**Verification:**
- `bun run build` and `bunx tsc --noEmit` succeed
- Canvas area visible in center stage with sketch-border frame
- When manually changing `state.mediaTier` in console, canvas background/style changes per tier
- No layout shifts when canvas style changes

### Session 4: Bottom bar content redesign

**Goal:** Rethink how information is presented in the bottom bar. The current approach just dumps the old collapsible sections into a horizontal row — production breakdown especially feels like an afterthought. Each section needs an interaction pattern that fits its role in a footer context.

**Open questions (decide at implementation time):**
- What's the right interaction model for each section? Options include: expandable/collapsible inline, floating modals/popovers, hover tooltips, or some combination. The compact default state is good for "out of the way", but these sections need a way to show full detail when the player wants it.
- Production breakdown is the biggest question — the per-artist stacked list doesn't belong in a footer. But the right replacement depends on how the rest of the bar feels by then.
- Prestige, achievements, settings may each warrant different patterns depending on how much content they hold.

**Scope:** Explore what feels right once sessions 2-3 are done and we can see the layout in practice. This session is intentionally underspecified — we'll figure out the design when we get here.

### Session 5: Canvas area — what goes here?

**Goal:** Figure out what the canvas area should actually *do*. Right now it's a themed empty box. This session is for exploring ideas and prototyping — not necessarily implementing a final version.

**The question:** Cookie Clicker has grandmas and farms visually populating the screen. SPACEPLAN has a planet that evolves. What's our equivalent? The canvas is the center of the game — it should reward the player visually as they progress.

**Ideas to explore:**
- **Sword display**: Show the most recently unlocked sword as a drawn illustration (ASCII art, SVG, or CSS art) that changes as you unlock new ones. The canvas becomes a showcase.
- **Drawing-in-progress**: An evolving sketch that fills in over time — starts as rough pencil lines, gains detail as you progress through media tiers. Could tie into the media tier theming that's already there.
- **Artist workshop scene**: Show your hired artists at work — doodlers scribbling, sketch artists drawing, etc. More artists = more activity in the scene. This is the Cookie Clicker grandma approach.
- **Stroke counter visualization**: Some kind of visual representation of strokes accumulating — ink pooling, paint splattering, pencil shavings piling up.
- **Combination**: The canvas could have layers — a background scene that evolves with media tier, foreground activity from artists, and a featured sword.

**Open questions:**
- How much of this is CSS-only vs needs JS/canvas rendering?
- Should it be interactive (clickable elements within the canvas) or purely visual?
- What's the MVP version that adds life without being a huge implementation effort?
- Should clicking the draw button trigger a visual effect in the canvas area (not just the floating text)?

**Scope:** Research and prototype. Pick one approach that feels right and implement a first pass. This may spawn follow-up work.
