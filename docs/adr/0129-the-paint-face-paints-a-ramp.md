# ADR-0129: The Paint face paints a ramp, and a host tool can hold the strip

- **Status:** Accepted
- **Date:** 2026-09-25
- **Relates to:** ADR-0122 (the 256-texel ramp is the gradient — this face writes one), ADR-0113
  (the blend spaces Paint mixes in), ADR-0120 (the interface rides the undo entry), ADR-0111 (the
  working pipeline an Apply folds into). Code: `palette/core/paintRamp.ts` (grep `PaintSession`,
  `isWashTool`, `dabStep`), `gradient-explorer/v2/paint/paintStore.ts` (`commitPaint`,
  `discardPaint`, `syncPaintBase`), `gradient-explorer/v2/paint/PaintSurface.tsx`,
  `gradient-explorer/v2/paint/PaintFace.tsx` (`BrushLane`, the shortcut scopes),
  `components/AdvancedGradientEditor.tsx` (grep `stripTakeover`, `offerStops`),
  `components/gradient/rampMode.ts` (`editorAffordances`' `takenOver`),
  `components/gradient/gradientActions.ts` (`offerStops`), and the shell's `openTray`,
  `escapeFace` and `settlePaint` in `gradient-explorer/v2/GradientExplorerV2App.tsx`. Guards:
  `npm run test:palette-paint`, `npm run smoke:ge-paint`, `npm run test:gradient-rampmode`.

## Context

The owner asked for "a new paint face, where user can paint onto the gradient with different blend
mode, brush options, colour mixing, blurring". It was designed with them in four versions of an
interactive sketch (https://claude.ai/artifact/PRceFwcJuy6653UMjpHCKH) and then in the running app,
and the calls they made shape everything below:

- "paint straight onto the hero instead of there being stops"; "I like that the gradient is full
  and not split while we're working";
- the brush's size and hardness "on screen relating to it", then flow and spacing too, "then we
  would only have the tool specific settings"; spacing "a higher limit, like 1000%";
- the brush over the gradient as an outline with "a small curved tab showing the color" (a filled
  shape "is blocking the view");
- a clone stamp; no Wet brush; Soften and Sharpen as two tools; the picker only for a brush that
  lays down a colour;
- "clicking add-stops when paint is active appears to not work because stops are hidden", then
  "instead of disabling — perhaps they can just come up with a prompt to add stops if there are
  none"; while painting, the row still read the old "N stops".

A gradient is 256 texels (ADR-0122), so a brush on it is a 1-D brush: a dab is a window of texels
weighted by a profile, a stroke is dabs laid along the pointer's path.

## Decision

**The brush paints on the hero's bar, and the bar stays one gradient.** No split into source and
result, no knots. This is a general seam on the Stops editor, `stripTakeover: { bar, track }`: a
host tool lays its own surface over the bar and its 8 px end gutters (it paints those with its own
end colours) and fills the knot track's row. Every knot gesture — knots, insertion, the marquee,
knot edits, colour drops — stands down through ONE rule, `editorAffordances({ takenOver })`, not
through conditions scattered in the editor; the row shows Add stops where a stop value shows its
count and blend chooser, because the bar is not those stops and a blend change would re-render the
gradient under the tool. GE v2's Paint face is the first host.

**A painting is local until it is applied, and it is applied as a RAMP.** Strokes live in a
`PaintSession` (texels as floats, so faint dabs do not stair-step through 8-bit rounding) and step
back one at a time with Ctrl+Z while the face has any. Apply — and every way of leaving the face: a
tab, the fold, the ♥, Export, Share, Wallpaper — writes the painting to the working gradient as
`stops: []` plus the ramp, in ONE undo entry (a `paramGroup`, so a tab switch that applies is still
one click, one entry). It is never fitted to stops on the way, even when the gradient had stops
before: ADR-0122's "a gradient that already has stops keeps them" governs fits, and a painting is
not a fit — the texels are the author's. Esc and Cancel throw the painting away and write nothing,
so they leave no entry. A painting never outlives the gradient it was painted on: if the working
gradient changes under the face (a pick, New, an undo), the painting starts over on the new one.

**Stroke undo is a pushed shortcut scope, not a `when`.** The registry resolves a key to its
highest match and stops there if that match's `when` fails, so a `when`-gated Mod+Z above the app's
swallowed the app's undo once the strokes were gone. The face pushes `gx-paint-undo` only while it
has strokes (and `gx-paint-redo` only while it can redo), the way the timeline pushes its scope.

**Two families of brush.** Paint, Clone and Restore are WASH tools: a stroke accumulates coverage
(each dab adds `flow` of what is left) and recomposites every texel from the gradient as the stroke
found it, so Opacity is a stroke's ceiling and Flow its rate, and Clone cannot copy its own paint.
Smudge, Soften, Sharpen and Tone build up in place, and holding still keeps working (Smudge
excepted). Paint mixes in the Explorer's own blend spaces (`blendLerp`, ADR-0113 — Spectral mixes
like pigment) under thirteen blend modes, the colour ones in OkLCh.

**The brush's shared settings are handles on its shape.** The brush lane under the hero draws the
brush at the bar's scale, under the brush: feet = size, shoulders = hardness, the bar above =
strength, the diamond = flow, the triangle under the floor = spacing (0.02–10 × the diameter). The
row under it holds only the chosen brush's own settings.

**Where stops cannot be edited, a stop action asks.** On a ramp, or while a host tool holds the
strip, Double Stops, Reduce Stops… and Bias Handles stay enabled and ask "Add stops so you can edit
them?" (`offerStops`); a yes is Add stops, which — through the host — applies a painting first and
fits the stops to it. Distribute and Delete (selection-only) stay greyed, and Invert is off while a
tool holds the strip, since it would act on the gradient from before the painting.

**The Image tab shows only while a picture is loaded** (or its face is open); the picture slot, a
drop or a paste is the way in. It keeps the tab row to four on most visits and stops the file dialog
opening unasked.

## Consequences

- A painted gradient is a ramp: it exports, saves and reaches GMT as 256 texels, and Add stops (or
  any stop action's prompt) fits editable stops to it. Painting a gradient with stops and applying
  drops the stops by design.
- The painting is not in the session autosave; the applied gradient is.
- `stripTakeover` and `offerStops` are generic: any host can hold the strip, and app-gmt's editor
  gets the prompt on a ramp too (it has Add stops through the stop fitter).
- The Paint surface redraws from its store, not React, so a stroke does not re-render the hero.
- The stroke toggles' glyphs (Mirror, Wrap, Height) are still drafts; the brushes' are the owner's
  picks from four rounds (`gradient-explorer/v2/ui/Icon.tsx`, `SOLID`).

## Alternatives considered

- **Paint on a canvas in the tray**, not on the hero — rejected: the owner wanted the gradient itself
  as the surface.
- **Write each stroke into the working store as a preview** (the Curves wave's pattern) — not
  needed: the surface draws the painting itself, and a write per dab would re-derive the pipeline
  and re-render the hero many times a stroke.
- **Each stroke its own undo entry, no Apply** — rejected: GX's faces are Apply / Cancel over a
  destructive document (owner, 2026-09-13).
- **Fit the painting to stops on Apply when it can be described by few** — rejected: the owner asked
  for a painting instead of stops, and a fit is an approximation of what was painted.
- **Disable stop actions on a ramp and under a tool** — built, then replaced at the owner's word with
  the prompt.
- **A Wet (pick-up) brush and a gradient stamp** — the owner removed Wet and chose a clone stamp.
