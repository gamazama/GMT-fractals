# ADR-0118: A surface says what it does — the Explorer's cursors, its stale knots, and the room its toolbar takes

- **Status:** Accepted
- **Date:** 2026-09-11
- **Relates to:** ADR-0114 (the shell's visual language), ADR-0117 (the drag hold this
  completes); `components/AdvancedGradientEditor.tsx` (grep `knotsStale`, and the CURSORS
  block), `components/QualityRangePad.tsx` (grep `hoverMode`),
  `palette/components/PickerWall.tsx` (grep `minGutter`, `viaTool`),
  `gradient-explorer/v2/BrowseStage.tsx` (grep `TOOLBAR_CLEAR`);
  guards: `npm run smoke:ge-cursors`, `npm run smoke:ge-livedrag`, `npm run smoke:ge-ground`,
  `npm run smoke:ge-tray`

## Context

Five reports from the owner's bench on one day, and they turned out to be one complaint told
five ways: a surface was doing something other than what it looked like it was doing.

- The hero's **knots sat still through an Adjust or Curves change and stayed wrong after it**.
  Not a bug in the hold (ADR-0117) — over a BAKED document the knots belong to the document
  underneath, and the bar is showing the pipeline's result on top of it. They were an accurate
  description of a gradient that was no longer on screen.
- The **bottom strip wore the selection crosshair while the main bar wore nothing** — and it is
  the main bar that selects. The editor's container starts a marquee for any press that is not
  on an interactive child or the knot track, so dragging the bar marquees the knots; the strip's
  own handler inserts one. Owner: "its drag makes a selection of the knots — thats why its
  confusing that the bottom strip has the selection crosshair, when the bottom strip of the hero
  creates a new knot".
- The **strip under the wall's spectrum pad wore a crosshair** and nothing there is drawn: a
  press near a bound resizes it, anywhere else moves the window.
- The **wall's tool column sat on the wall's first tiles**. It floats at the left edge, over the
  row-label gutter — which is 132 px wide on a roomy catalogue and 24 px on a set.
- With the **zoom tool active, a click threw the zoom away**. The tool borrows the middle-drag
  path, and middle-CLICK means "reset to 1:1".

## Decision

### 1. Knots are drawn only while they describe what the bar shows

`previewConfig` already means exactly "paint THIS on the bar instead of the edited stops". Its
presence is therefore the rule: while it is set, the knot layer goes — markers, bias handles,
and the track's own gestures. Baking brings them back, describing the thing you baked.

The track KEEPS its height. The hero must not change size when a face opens (`smoke:ge-tray`
asserts the wall never moves), and a collapsing track would move it.

This is not "hide them during a drag": a dial dragged back through its default makes the
pipeline the identity for a frame, the document IS the bar again, and the knots are right to
come back. The guard asserts that rather than the simpler, wrong thing — see below.

### 2. `crosshair` and `copy` are different cursors, on the elements that perform them

The file's cursor vocabulary had one entry reading "place or draw ON the track — add a knot,
drag a marquee": two gestures under one cursor, and the surface that actually had the selection
(the bar) wearing `default` in the hero and `pointer` in GMT's panel, where a click gives
nothing. Now `crosshair` means SELECT and lives on the bar; `copy` means MAKE and lives on the
knot track and nowhere else. `pointer` still wins on the bar while a click bakes, because then
it does have a click to give.

The same reading fixes the wall's range pad: its cursor is read off the same hit test
`onPointerDown` uses — `ew-resize` within `EDGE_HIT` of a bound, `move` elsewhere — and holds
whatever the drag grabbed while one is open. That is a shared engine control, so every
`QualityRangePad` in the suite gains it; the interaction was always the same, only the cursor
was silent.

### 3. A host that floats something over the wall says how much room it needs

`PickerWall` takes `minGutter`: a floor under the left margin, whatever the labels ask for. It
raises the same `labelW` the labels and the tile grid are both laid out from, so the two stay in
step and every hit test follows for free. GE v2 passes its tool column's width.

The alternative — moving the toolbar off the wall — was rejected: the column on the left is a
2026-09-10 decision with its own reasoning ("pick what your pointer does"), and the defect was
never where the toolbar is, it was that nothing had told the wall the toolbar was there.

### 4. A tap with the zoom tool picks a gradient

Clicking a gradient is what a click on this wall means everywhere else, and the tool is a
modifier on the DRAG, not on the click. The middle button keeps its reset — `viaTool` on the
drag state is what separates a tool press from a middle-click, since the two share a path.

### 5. A gesture under way keeps its own cursor

> Added 2026-09-11, after the owner tested §2: "during a selection drag, the cursor should stay
> selection drag and not be changing mid drag."

Naming each surface's gesture is right until a gesture is HAPPENING, and then the cursor went on
announcing whatever the pointer was passing over — a marquee begun on the bar turned into `copy`
the moment it crossed the knot track. The drag owns the cursor for its duration: `crosshair` for a
marquee, `grabbing` for a knot, `move` for a whole selection, `ew-resize` for a value along the
axis, and the existing `no-drop` when a knot is being pulled off.

`document.body.style.cursor` looks like the fix and is not — a descendant that sets its own
`cursor` beats an inherited one, which is every surface in this editor. The root carries the
drag's cursor and forces descendants to `inherit`; guarded by `smoke:ge-cursors` [3] and falsified
by dropping that one class.

### 6. The knots hide when the bar is showing something else — and NOT merely during a drag

> Amended 2026-09-11 along with ADR-0117 §6.

`knotsStale` keys on `previewConfig` alone. `previewRamp` — the hero handing the bar the
pipeline's output — does NOT make the knots stale: with a live source they are the fit of that
same ramp and describe it truly the moment the drag lets go. Only `previewConfig`, which means a
baked document is sitting underneath something else, does.

One consequence worth stating because a guard was written the wrong way round first: "hidden for
the whole drag" is NOT the contract. A dial dragged back through its default makes the pipeline
the identity for a frame, the document IS the bar again, and the knots are right to reappear.
`smoke:ge-livedrag` [4] asserts they vanish at least once and never move while drawn.

### 7. Leaving the picker for another face is ONE click

> Added 2026-09-11: "when switching to them from the color picker, it is requiring 2 clicks as
> the first click is leaving the picker."

The editor told its host about the selection from an effect that listed the CALLBACK in its deps,
so it re-fired on every render where the host passed a fresh arrow — which GE v2's shell does on
every render. The host reads that notification as an EVENT, and its rule is "a stop is selected
and the tray is elsewhere → open the inspector". Together: the tab's own `openTray` was
immediately undone, the hero's leave-the-inspector effect then cleared the stop, and the
zero-count notification closed the tray. Net: nothing opened.

The callback lives in a ref now, so its identity cannot manufacture an event that did not happen.
The general form — a notification prop whose identity is in an effect's deps becomes a spurious
event under any host that does not memoise — is worth looking for wherever `on*Change` meets
`useEffect`. Guarded by `smoke:ge-tray` [14].

## Consequences

- `smoke:ge-livedrag` gained a step for the stale knots, and it asserts the RIGHT contract:
  they must vanish at least once, and wherever they are drawn they must not have moved. The
  first cut asserted they were hidden for the whole drag and went red on a correct build,
  because Hue rotate sweeps through 0 mid-drag and the identity legitimately brings them back.
- `smoke:ge-ground`'s `SET_GUTTER` went 24 → 52 and now names what it pins (the room the tool
  column needs, not a row-label reserve). It caught the change on the first run, which is the
  behaviour a pinned layout number is for.
- The cursor changes reach app-gmt's gradient panel too, because it is the same component and
  the same gestures. That is the point rather than a side effect: the bar there also marquees.
- Not addressed: the knot track still has a `title` while inert, which is the only remaining
  place the hero's stale state is explained in words rather than by what is drawn.
