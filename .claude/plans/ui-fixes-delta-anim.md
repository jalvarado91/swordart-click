# Plan: UI Polish & Feel Pass

## Context

After playing through the game, several things feel rough or under-baked. These aren't hard bugs
so much as places where the game doesn't feel as good as it could. Each session is a focused
exploration of one of those areas — we'll look at what's there, feel out what's off, and figure
out the best fix together.

## Sessions

## Session 1: Fix the left panel scroll/overlap issue — Completed

**What feels off:** The media panel (current tool) is sticky at the top of the left panel, but its
background is semi-transparent. When the click upgrades list is long enough to scroll, the
upgrades bleed through the media panel — it looks broken and hard to read.

**What good looks like:** Scrolling the upgrades list feels clean. The media panel stays anchored
and visually distinct — no content bleeds through it.

**Areas to explore:** How the sticky positioning and background transparency interact. Whether the
fix is purely CSS (opaque background, border, shadow) or needs layout restructuring. Whether the
media panel should visually "lift" above the content or simply be solid.

---

## Session 2: Canvas sizing — Completed

**What feels off:** The canvas doesn't always use the available horizontal space well, and
depending on window size it can feel either cramped or oddly proportioned.

**What good looks like:** The canvas feels like it fills its space naturally — wide and present,
not awkwardly boxed. Height is kept reasonable so it doesn't dominate the layout.

**Areas to explore:** Current `max-width`, `flex`, and `min-height` values. How the hero frame
content (title, rune ring, ornaments) responds to different canvas dimensions. Whether a max-height
constraint makes sense and what value feels right.

---

## Session 3: Number formatting — more digits — Completed

**What feels off:** Some numbers feel like they lose too much precision — "123K" when you'd want
to know if it's 123.4 or 123.8. Not a huge deal but the extra digit makes numbers feel more
meaningful.

**What good looks like:** Numbers feel informative without being cluttered. A bit more precision
in the right places.

**Areas to explore:** The current `formatNumber()` thresholds and where precision drops off. Which
contexts matter most (stat tiles, costs, delta cues). Whether the change should be global or
targeted.

---

## Session 4: Flash the stat tile background on change — Completed

**What feels off:** When a number changes, the delta cue animation tells you *what* changed but
the tile itself doesn't react. It feels a bit disconnected — you're watching a floating number
but the tile it belongs to is inert.

**What good looks like:** The tile itself briefly reacts to the change — a quick flash of color
that matches the direction (up/down). Subtle enough not to be distracting, present enough to
feel alive.

**Areas to explore:** The existing `.stat-cue-burst` mechanism and how the background flash could
hook into it. Animation duration and intensity — what feels responsive vs. flashy.

---

## Session 5: Delta numbers — duration and burst animation intensity — Completed

**What feels off:** Two related things:
1. Delta numbers disappear quickly during slow/single clicks — before you've had a chance to
   register what you earned.
2. The cumulative delta animation looks the same whether you clicked once or twenty times in a
   row. A big burst should feel bigger.

**What good looks like:**
- A single slow click: the delta number hangs around long enough to read.
- A rapid burst of clicks: the number accumulates and the animation gets progressively wilder as
  the burst grows — more travel, more energy, more drama.

**Areas to explore:** The current cue duration constants (`statStrokesCueUntil = now + 380`),
the merge window timing. How to express "burst intensity" in CSS — via a data attribute, CSS
custom property, or class variant. What "crazier" actually means visually for this aesthetic
(hand-drawn, sketchy) — probably not particle effects, but maybe more travel distance, stronger
scale pop, a slight wobble.

---

## Session 6: Media panel clarity

**What feels off:** The media panel is hard to read at a glance. The current multiplier is buried
in parens after the tier name ("Pencil Sketch (1x)"), the "Next Nx" tag is cryptic without
context, and the upgrade button doesn't clearly communicate the multiplier jump you're buying.

**What good looks like:** At a glance you know what you're using now and what it does, and what
the upgrade costs and what you'll gain. The multiplier — both current and next — should be the
star, not a footnote. The transition from current to next should feel legible: "you have 2x, this
buys you 5x."

**Areas to explore:** How to surface the current multiplier more prominently — maybe as a distinct
badge rather than inline parens. How to reframe "Next 2x" into something that shows the delta or
at least has clear context ("→ 5x multiplier" or "2x → 5x"). Whether the upgrade button layout
needs restructuring or just copy/label changes.
