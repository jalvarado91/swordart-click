# Restyle: Pen on Paper / Sketchbook Look

## Context

The game is themed around drawing swords (sketching + unsheathing pun), but the current visual style is a generic dark UI with gold accents. The user wants the game to feel like pen on paper — a sketchbook you're drawing in. This means flipping from dark-bg-with-light-text to a paper-colored background with ink-colored text, hand-drawn-feeling borders, and a warmer, more tactile aesthetic.

## Key Design Decisions

- **Light paper background** instead of dark surface. The main game area should feel like a page.
- **Ink-colored text** (dark brown/black) instead of light parchment text.
- **Hand-drawn feel** via slightly rough borders (subtle box-shadow tricks or dashed/sketchy borders), imperfect-feeling spacing.
- **Pencil/ink accent colors** instead of gold — graphite grays, ink blues/blacks, with the accent color shifting based on the current media tier (pencil=gray, ink=blue-black, etc.) as a stretch goal.
- **Keep the serif font family** (Georgia) — it fits the sketchbook feel.
- **Paper texture** via subtle CSS gradients or noise on the background.
- **Panels feel like areas on the page** rather than floating cards — lighter dividers, less "card in space" and more "section of a page."
- **The draw button** should feel like a stamp or seal on the page rather than a floating circle.
- **Prestige section** keeps its distinct purple tint but adapted to work on the light background.
- **No external assets** — all texture/feel achieved with CSS only (gradients, shadows, borders).

## Sessions

## Session 1: Color palette and base typography — Completed

**Goal:** Flip the foundation from dark to paper-light. After this session the game is usable on the new palette even if panels aren't yet refined.

**Files:**
- `src/style.css` — `:root` variables, `body`, `#game`, `header`, `#stats`, `#rates` base styles

**Changes:**
- New `:root` palette:
  - `--bg`: warm off-white/cream (`#f4edd8` or similar)
  - `--paper`: slightly lighter paper white (`#faf6eb`)
  - `--surface`: the paper color for panels (very subtle tint difference)
  - `--surface-light`: light border/divider color
  - `--ink`: dark brown-black for primary text (`#2a2018`)
  - `--ink-light`: lighter ink for secondary text (`#6a5d4d`)
  - `--accent`: muted red-brown or warm gray for interactive elements
  - `--accent-bright`: slightly stronger version for hover/active
  - `--success`: muted green that works on light bg
  - `--disabled`: light gray
  - `--prestige`: keep purple tones but adjust for light bg
- Update `body` background to `--bg`
- Update `#game` — remove dark styling
- Update header, stats bar, rates — ink-colored text on paper
- Update `#strokes-count` and `#multiplier-display` colors for readability on light bg

**Verify:** Build, open in browser. Text is readable dark-on-light. Numbers display correctly. General layout unchanged.

## Session 2: Panels and cards — from floating cards to page sections — Completed

**Goal:** Restyle panels to feel like areas on a sketchbook page rather than dark floating cards.

**Files:**
- `src/style.css` — panel styles (`#media-panel`, `#upgrades-panel`, `#artists-panel`, `#breakdown-panel`, gallery, achievements, prestige, settings sections)

**Changes:**
- Panels: remove dark backgrounds, use paper color or transparent. Borders become subtle pencil-line-style (thin, slightly gray, possibly `border-style: dashed` or a hand-drawn-feeling `1px solid` in a pencil-gray color).
- Panel headings: ink-colored, keep uppercase + letter-spacing but remove the dim parchment look.
- Section dividers: thin horizontal rules that look like pencil lines rather than glowing borders.
- Collapsible sections: same border treatment.
- Prestige section: keep purple accent but on light background — adjust border and text colors so purple pops against paper.

**Verify:** Build, open in browser. Panels look like sections of a page. No floating card feel. Prestige section still visually distinct.

## Session 3: Buttons and interactive elements — Completed

**Goal:** Restyle buttons to feel like they belong on paper — stamped, inked, or sketched rather than glossy/dark.

**Files:**
- `src/style.css` — `.upgrade-btn`, `#draw-btn`, `.prestige-action-btn`, `.settings-btn`, `#media-upgrade-btn`

**Changes:**
- `.upgrade-btn`: ink-colored border, paper background, hover adds a subtle shadow or darkens slightly like pressing on paper. Disabled state: faded pencil look.
- `#draw-btn`: rethink as a seal/stamp on the page — ink-colored border, paper fill, the sword icon in ink. Keep the circular shape but make it feel stamped rather than floating. Active state: slight indent like pressing a stamp.
- `.prestige-action-btn`: purple ink on paper. Confirming state: red ink.
- `.settings-btn`: simple ink-outlined buttons.
- `.upgrade-cost`, `.upgrade-desc`, `.upgrade-owned` — adjust text colors for light bg readability.

**Verify:** Build, open in browser. All buttons clickable, hover/active/disabled states all look right on the paper background. Draw button feels like a stamp.

## Session 4: Gallery, achievements, and special elements — Completed

**Goal:** Restyle sword gallery entries, achievement entries, notifications, and floating text for the paper theme.

**Files:**
- `src/style.css` — sword gallery, achievements, notifications, floating text, production breakdown

**Changes:**
- Sword entries: unlocked = ink-drawn card with subtle border, locked = very faint pencil sketch look (low opacity, dashed border).
- Achievement entries: similar treatment — unlocked feels inked in, locked feels pencil-sketched.
- Notifications: paper-colored with ink border, slide in from right. Drop the dark background.
- Floating click text: ink-colored instead of gold. Should look like fresh ink marks.
- Production breakdown lines: thin pencil-line bottom borders.
- Unlock/achievement animations: adjust glow colors from gold to ink-appropriate (subtle shadow instead of bright glow).

**Verify:** Build, open in browser. Unlock a sword or achievement — animation looks good on paper. Notifications readable. Floating text visible.

## Session 5: Paper texture and finishing touches — Completed

**Goal:** Add subtle paper texture and polish the overall feel.

**Files:**
- `src/style.css` — body/game background texture, shadows, overall polish
- `index.html` — potentially minor structural additions if needed for texture layers

**Changes:**
- Add subtle paper texture to `body` or `#game` using CSS — either a repeating subtle gradient noise pattern or a very faint `box-shadow: inset` to give depth like a page has.
- Add a subtle page edge effect: slight shadow on the left/right of `#game` to make it feel like a page sitting on a desk.
- Review all hover/focus states for consistency.
- Review responsive breakpoints — ensure paper feel works on mobile.
- Adjust the prestige animation panel-in if colors need tweaking.
- Final pass: scan every element for leftover dark-theme colors that look wrong.

**Verify:** Build, open in browser at desktop and mobile widths. Full playthrough: click, buy upgrades, hire artists, media upgrade, prestige. Everything feels like a cohesive sketchbook. No leftover dark-theme elements.
