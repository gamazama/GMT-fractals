# ADR-0114: The Gradient Explorer v2 shell and its visual language

- **Status:** Accepted
- **Date:** 2026-09-10
- **Relates to:** `gradient-explorer/v2/**` (grep `TUCK_PX`, `TOOLBAR_LEFT`, `data-gx-tools`, `WEIGHT` in `ui/Icon.tsx`), `plans/ge-v2-unified-shell-plan.md` (§1 principles, §4 phases, §8 principles log)

## Context

The v2 shell was built across Phases A–E and W over 2026-09-03 to 09-10, each phase in its
own session, each opened with a brief from `plans/ge-v2-unified-shell-plan.md`. The plan
carries the decisions; §8 logs the principles as they were amended. But a plan is a
planning artefact — it is read by whoever is doing the next phase, and it will stop being
read the day Phase G swaps the entry point and the plan is done.

Phase G's checklist has owed "an ADR for the unified shell and its visual language" since
the plan was written. The reason to pay it before Phase F rather than after: **the rules
below were each derived from a specific mistake, and the mistakes are cheaper to record
than to repeat.** Three of them were made and corrected inside the 2026-09-10 session
alone, twice after I had already reported the fix as verified.

This ADR does not restate the plan. It records the rules that are not obvious from reading
the code, and the falsified reasoning behind them.

## Decision

### 1. Depth means "what does this surface float over"

A surface casts a shadow **onto the ground it floats above, and never onto chrome it is
joined to.** The three shadows in the shell follow from that one sentence:

- The hero **panel** casts left onto the image column. It is flush with the card's top,
  right and bottom, so the image column is the only side with anything underneath.
- The **hero band** casts a 12px band onto the top of the ground, so the set rail reads as
  sitting *under* the card rather than beside it.
- The **tray** casts the heaviest — it hangs furthest off the ground — and it is *clipped*
  to start where the card's band ends (`TUCK_PX`, which also feeds the tray's own `top`
  offset, so the two cannot drift).

Two corollaries, both learned the hard way:

**A shadow cannot be kept off a surface by offsetting it.** A CSS shadow is a Gaussian and
its tail runs past the `blur/2` an offset cancels. The tray's ambient was first pushed down
by the 8px it reached above; that narrowed the bleed onto the active tab's tongue without
ending it, and the "verified" screenshot was read wrong because grey-on-grey at 16px is not
judgeable by eye. Only a clip is a guarantee.

**Diagnose a shadow by giving it a saturated ink.** Setting the layer to solid red and
screenshotting turns "is there a faint bleed here" into a fact. Every shadow claim in this
shell was settled that way.

### 2. Stacking order is a statement about hierarchy, and is written down

`z-20` is the hero's shadow band, `z-30` the tray, `z-40` the export windows. The band is
*deliberately* below the tray: the tray floats further off the ground than the hero does, so
it must not be dimmed by the shadow of something it floats above. A z-index in this shell
carries a reason in a comment beside it, because the numbers are otherwise indistinguishable
from arbitrary ones.

### 3. One icon set, one weight — with density as the only exception

16px stroke glyphs in `currentColor`, weight 1.5. `WEIGHT` in `ui/Icon.tsx` overrides that
for glyphs whose parts share the box: at 16px a gear's teeth fuse into a disc and a dashed
outline clogs into a solid one. Three glyphs carry 1.25 for that reason and no other.

**Judge a glyph by rasterising at 16px and magnifying the pixels, never by eye at 64.** The
first icon batch shipped wrong twice — once by framing each glyph at its exact bounding box,
which clips a stroke because a stroke straddles its path (commit `b1361884`), and once by
over-correcting into glyphs that were small and lost. The house rules live at the top of
`components/gradient/pickerIcons.tsx` and `ui/Icon.tsx`.

**The owner's drawings are refitted by script, never retyped.** Batch 2 was transformed from
the sheet's 8-unit tiles onto the 16-unit grid programmatically, so the curves are the
authored ones.

### 4. A control's place says what kind of control it is

Tools live in a column down the wall's left edge, where a drawing application puts them.
View controls do not: switching bars for a list is not something the pointer does *to* the
wall, so the grid/list toggle stayed in the corner. They were one cluster and reading as one
kind of thing was the defect.

**When a cluster splits, its behavioural exemptions must split with it.** That single
element had been the click-away exemption that stops a stray pointerdown cancelling an
active tool; splitting it in two without noticing would have made switching to list view
silently cancel the zoom you were using. The exemption is now a `data-gx-tools` attribute
both clusters carry.

### 5. Surfaces are grouped by what they do, not by where they sit

The wall's header — the set rail, the narrowing bar, the Filters rows — wears the hero
band's surface, not the wall's. They are one band of controls between the card and the
canvas; on the wall's own ground they read as part of the canvas they narrow. Every row in
the band has to agree or the band is not continuous.

### 6. "The wall" includes its header

Stated because it was got wrong: the tray's shadow was first clipped to the top of the tile
canvas, which stripped it from the rail and the bar. In the owner's language the wall is the
whole ground below the card. Vocabulary in this shell follows the owner's usage, and a
disagreement about a word is a disagreement about the design.

## Consequences

- **Phase F inherits an open question.** The plan specifies "the tools palette bottom-right"
  on phone, written before the tools became a left column on desktop. Rule 4 says the
  column is about legibility, not about the left edge specifically — but which form the
  phone takes is a decision Phase F has to make, not inherit.
- **Phase G's ADR debt is now partly paid.** Still owed: Recent auto-collect. ADR-0111
  (pipeline input slot) and ADR-0112 (variants) are done.
- **These rules are for `gradient-explorer/v2/**` and are not automatically app-gmt's.**
  Where a decision would change a shared component the shell has so far declined — the
  visible settings gear is still `GearIcon` from `components/Icons`, which app-gmt uses too,
  even though the owner's own gear now sits unused in `ui/Icon.tsx`. Adopting these rules
  studio-wide is a separate decision.
- **Nothing here is enforced by a guard.** They are conventions with reasons; the reasons
  are the enforcement. `smoke:ge-*` pin behaviour, not appearance, and the visual claims in
  this ADR were checked by screenshot and by rasterising at size.
