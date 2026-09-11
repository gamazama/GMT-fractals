# ADR-0117: One sort per render, not one per texel — the gradient sampler's two entry points

- **Status:** Accepted
- **Date:** 2026-09-11
- **Relates to:** ADR-0111 (the working pipeline's input slot); `utils/colorUtils.ts` (grep
  `sampleSortedStops`, `hexParseCache`), `components/AdvancedGradientEditor.tsx` (grep
  `previewWide`, `stripEnds`), `palette/core/stopFit.ts` (grep `segmentError`),
  `palette/store/workingStore.ts` (grep `bracketDrag`);
  guards: `npm run test:palette-blendspaces` (byte-exact per-mode output),
  `npm run smoke:ge-livedrag` (step [5] pins the bar to the ramp), `npm run smoke:ge-tray`;
  measuring tool: `npm run prof:ge-drag`

## Context

Dragging a dial in GE v2's Adjust face, or a knot in Curves, lagged. Profiling an Adjust drag
(`prof:ge-drag`, 1280×800, a ~40-stop gradient) put the cost in three places, none of them the
work the frame actually needed:

1. **A sort per pixel.** The hero's strip preview samples the stops once per display pixel —
   1536 of them — and it sorted the list first, correctly, once. Then it called `sampleStops`,
   which copies and sorts the list *again on every call*. At 40 stops that is 61k element
   copies and ~330k comparisons per frame, re-deriving an order the caller had already
   established. `stopFit`'s `segmentError` did the same thing up to 512 refinement iterations
   deep, over a list it had sorted at the top of the loop.

2. **A 256-texel ramp nobody painted.** In `strip` chrome the preview is drawn from the
   1536-px buffer, but the 256-texel `renderStopsToRamp` memo ran anyway on every change —
   because two of its texels, the endpoints, were being read for the gutters either side.

3. **A fit that ran every frame despite being told not to.** The owner's 2026-09-11 hold —
   "the gradient can update, but we don't need all the stops' knots to update during a drag" —
   keys on `paramUndoBracket`'s depth, which the palette's own gestures open (`genEditStart`).
   The Adjust face is DDFS sliders through `AutoFeaturePanel`, which bracket through the
   engine's `handleInteractionStart('param')` and never touch that depth. So the hold covered
   Curves and Mix and missed the face with the most dials on it: `fitRampToStops` was live in
   the profile throughout the drag.

The shape of all three is the same. A cheap general-purpose entry point was called from a
loop, and each call redid setup the loop had already done.

## Decision

### 1. The pre-sorted sampler is exported, and named so the mistake is visible

`sampleSorted` — the per-texel core that `renderStopsToRamp` loops over — is exported as
`sampleSortedStops` for callers that already hold a sorted list and sample it many times. It
is the SAME function, so the single code path that keeps `sampleStops` and `renderStopsToRamp`
byte-identical is untouched; `test:palette-blendspaces` asserts the exact hex each mode
produces and is the guard on that.

Its contract is in its name and stated in its JSDoc: `sorted` must be ascending by position;
unsorted input does not throw, it samples wrong. Sorting at the seam, once, is the caller's
job. The guard the export exists to provide is legibility — `sampleStops` in a `for` loop now
reads as the error it is.

The empty-list guard moved down into `sampleSorted`, because the first exported caller read
`sorted[0].position` off undefined the moment the export existed. An empty stop list is a real
state at this seam (a gradient mid-construction, a fit called before its stops exist), and it
now returns the same greyscale ramp `sampleStops` always did.

### 2. Hex parsing is memoised; `hexToRgb` still hands out a fresh object

`sampleSorted` parses two stop colours per sample, so the strip preview ran a regex and three
`parseInt`s 3072 times a frame for the ~40 distinct colours a gradient actually has. A
`Map<string, packed24>` cache fixes that, bounded by distinct colour literals in play.

`hexToRgb` still allocates a new object per call. Several callers mutate what they get back,
and returning a shared instance would turn this cache into a source of colour corruption — the
saving is the parse, not the allocation.

### 3. `strip` chrome does not compute the ramp it does not paint

`previewRamp` is `null` in strip chrome. The two end colours the gutters want come out of the
1536-px buffer that is being painted anyway (`stripEnds`).

### 4. "A param drag is open" has two honest sources, and the hold reads both

`useWorkingDerived` holds the fit while EITHER `paramUndoBracket`'s depth is non-zero (the
palette's gestures) OR the engine store's `isUserInteracting` is set (the DDFS sliders). Both
routes end at `beginParamTransaction`, so the two flags agree about what they mean; they
differ only in which callers reach them.

### 5. Holding the fit must not hold the GRADIENT — the held stops are re-coloured every frame

Added the same day, after the owner tested it: "the gradient needs to respond live — see the
palette is responding but the gradient is frozen — it is only the knots build and fit that we
don't need during a drag; the gradient must still draw."

Handing the held config straight back froze the hero's bar, and it froze in a way that read as
half the app being broken: the palette swatches sample `ramp`, which is rebuilt every frame, so
they kept moving, while the bar paints from `config` — through `previewConfig` on a baked
document, through the editor's `value` otherwise — and sat still. Both paint paths freeze
independently, so a fix or a guard that covers one proves nothing about the other.

`recolourHeldFit` splits the fit along the line the owner drew. WHERE each stop sits, with its
bias and interpolation, is what the expensive refinement decides and what the drag defers; WHAT
colour sits there is one array lookup into the live ramp. So the bar is exact at every stop and
interpolated between them by the rules the last fit chose: visibly live, marginally coarser than
the settled render, replaced by a real fit on release. It returns the held config by identity
when no colour moved, so opening a bracket without changing a value costs no re-render.

The deeper lesson is about the guard, not the code. "The knots hold still during a drag" and
"the gradient follows the finger" are two assertions about ONE gesture, and the frozen build
satisfied the first perfectly. Watched with its failing assertion downgraded to a warning, the
frozen build kept every other assertion in `smoke:ge-livedrag` green. A performance hold needs a
guard on what must still happen, not only on what must stop.

### 6. The bar paints the RAMP, not a render of the held stops

> Added 2026-09-11, after the owner tested §5: "while editing a curve, the gradient is not
> updating correctly, its showing a weird mix of the previous stops and the current colors."

§5 made the bar repaint every frame. It did not make it repaint CORRECTLY, and the difference
is the whole lesson: a held fit keeps its stop POSITIONS and refreshes only their colours, which
is a good approximation when a dial merely retints the ramp and a bad one when something moves
features ALONG it. A curve edit does exactly that, so the bar drew the old stops wearing the new
colours — a mix of two gradients, neither of them the one the pipeline had produced.

`AdvancedGradientEditor` takes `previewRamp`, and GE v2's hero passes the pipeline's own 256-texel
output whenever the pipeline is doing anything. The stops route — ramp → fit → stops → resample
1536 — is skipped entirely: it was both the expensive path and an approximation of a ramp we
already had. Upsampled nearest-neighbour, and 1536 / 256 is exactly 6, so a step edge stays hard
(the reason the bar samples per display pixel at all) and a smooth ramp bands at 1/256 of a
channel. A passthrough gradient keeps the stops route, where the stops ARE the gradient at full
authored precision.

`recolourHeldFit` stays, and its job is now only what its name says: the KNOTS keep their held
positions and take live colours, which is what the owner asked for.

The guard is `smoke:ge-livedrag` [5], and its tolerance is the point. With the fix the bar is
byte-identical to the ramp (worst channel error 0). Against the old held-stops paint a PHASE drag
measured 6 — close enough that a "within a few levels" threshold passes the broken build, which
is why the assertion demands exactness and allows only the ±1 of float→byte rounding. It also
asserts the gradient MOVED during the drag: comparing two things that are both standing still
passes trivially, and two earlier cuts of that step did exactly that.

## Consequences

- Measured over the same Adjust drag: `sampleSorted` 112 ms → 28 ms of self time, the strip's
  own re-render out of the profile entirely, `fitRampToStops` gone from it, and total scripting
  down ~47%. On a production build the drag holds 60 fps with no long tasks in either Chromium
  or Firefox (median 16.2 / 17.0 ms, p95 21.4 / 25.0 ms).
- Everything that renders a gradient anywhere in the suite got the hex-cache win for free,
  including the wall's thousands of tiles and every export path.
- `prof:ge-drag` is kept as the tool that found this. Read its totals against a production
  build (`ENGINE_URL` at a `vite preview`): React's dev build spends more in its own prop
  validation than this app spends in colour maths, which flatters and hides real regressions
  in equal measure.
- The fit hold is now wide enough that a future face which brackets its drags through neither
  route would silently lose it again. There is no guard for that; the two sources are
  documented at the site instead.
- Re-colouring cost nothing measurable: the same production drag reads 16.7 / 21.0 ms
  (median / p95) in Chromium and 16.0 / 24.0 in Firefox, inside the noise of the numbers above.
  It is O(stops) against a 1536-px repaint.
- `AdvancedGradientEditor`'s strip canvas now carries `data-gx-ramp`. It is a test handle and
  earns one: with a face live the hero shows a SOURCE band above the result, also a canvas, also
  full width, and frozen on purpose — `[data-gx-hero] canvas` returns whichever is first in the
  DOM, which flips as the split opens, and the first cut of `smoke:ge-livedrag` used it and
  called a working build frozen.
