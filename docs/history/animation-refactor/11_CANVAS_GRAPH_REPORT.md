# Canvas GraphEditor — report

**Result line:** Shipped. The cache + overlay-split architecture is in place
and produces a large user-visible win during graph playback when the timeline
holds enough keyframes to make canvas painting matter. The prompt's specific
acceptance criterion ("Timeline:Graph per-commit ms ≤ 1.5 ms, 5× improvement
vs ~7 ms baseline") was **not** met as written; that target was based on a
load model that turned out to be wrong. The real bottleneck and the real win
are documented below.

## Bench delta

Captured on `debug/canvas-graph-heavy-{before,after-step4}.json`. Heavy seed
= 9000 keyframes / 6 tracks (the default cached seed at 882 keys is too small
to make canvas painting dominant; the prompt's "~7 ms/commit" example
implicitly used a heavier seed than the one currently committed). The
default cached seed was also rerun; numbers are similar in shape but smaller
in absolute terms.

### graph-play (4-second playback, 480 anim-notifications)

| metric                | before   | after    | delta            |
|-----------------------|---------:|---------:|------------------|
| **workerFps**         |    22.49 |    42.90 | **+91%**         |
| **mainFps p50**       |    20.04 |    59.88 | **+199% (vsync)**|
| **mainFps p5**        |    19.92 |    29.94 | +50%             |
| **longTaskCount**     |       12 |        0 | **-100%**        |
| **longTaskTotalMs**   |     1054 |        0 | **-100%**        |
| Timeline:Graph ms/c   |     4.10 |     4.10 | flat (see below) |
| Timeline:Graph max    |      8.1 |      8.0 | flat             |
| TimelineHost ms/c     |     4.60 |     4.60 | flat             |

### graph-scrub (marquee/playhead scrubbing under input)

| metric                | before   | after    |
|-----------------------|---------:|---------:|
| **workerFps**         |    39.38 |    59.84 |
| **mainFps p5**        |    29.94 |    59.52 |
| Timeline:Graph ms/c   |     4.20 |     4.10 |

### graph-zoom (mouse-wheel zoom)

Unchanged, as expected — zoom rebuilds the cache (viewKey changes), so the
cache neither helps nor hurts the zoom scenario itself. Bench stays at vsync.

## Why the React per-commit median is flat

`Timeline:Graph` and `TimelineHost` are React Profiler boundaries that wrap
the entire GraphEditor subtree, not just the canvas. Their per-commit cost
is **React reconciliation walking the subtree on every anim-notification**,
not the cost of `drawGraph` itself.

Instrumentation during pause-2 confirmed this directly:

- With the overlay split shipped, `drawGraph` is called **zero** times
  during a 2-second graph-play (verified via a counter exposed on
  `window.__drawStats`; removed before commit). `drawGraphOverlay` is
  called every frame as expected (~198/2s) but does only a clearRect +
  one stroked line + one filled triangle.
- The polyline cache hit rate is **100%** during graph-play (1080 hits
  / 0 misses across 6 tracks × ~180 redraws back when drawGraph still
  ran on every render — after the overlay split, the back useEffect
  doesn't fire at all during play, so neither does the cache).

Yet `Timeline:Graph` per-commit median didn't move. The React fanout to
every Profiler boundary is what `08_ENGINE_PROBE_FINDINGS.md` already
documented:

> Commit count is a near-useless metric in isolation. … No narrow-sub edit
> could move the count. … The fan-out is system-wide. Every profiled
> boundary across every panel commits at notification rate.

The canvas refactor moved the heavy main-thread work off the per-frame
path. It did not — and cannot — reduce React's scheduler walking the
GraphEditor subtree per notification. That requires the
AnimationDocument-style refactor in `02_RATIONALE.md` (deferred).

## What shipped

| file                                                | role                                                                                              |
|-----------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `utils/GraphRendererCache.ts` (new)                 | `PolylineCache`, `SoftSelectionMaskCache`, key/hash builders, `createCacheCanvas` (OffscreenCanvas + HTMLCanvasElement fallback). |
| `utils/GraphRendererBuilder.ts` (new)               | `buildTrackPolyline` (polyline + post-behavior tail + track-default-colour diamonds); `buildSoftSelectionMask` (per-(selection, view) tinted-diamond overlay). |
| `utils/GraphRenderer.ts` (rewrite)                  | `drawGraph` thinned to: background + grid + per-track cache composite + soft-mask composite + selection-aware overlays + ruler + gutter + value labels + limit pattern. `drawGraphOverlay` (new export) paints playhead + selection box on a separate transparent canvas. |
| `components/graph/GraphCanvas.tsx` (rewrite)        | Two stacked canvases (`<div>` wrapper, absolute-positioned). Back `useEffect` deps exclude `currentFrame` and `selectionBox`; overlay `useEffect` runs every render but is cheap. Event handlers attach to the overlay (topmost).|
| `debug/test-graph-renderer-cache.mts` (new)         | 28 unit tests for cache primitives + key builders (passing).                                       |
| `debug/canvas-graph-baseline.json` (new)            | Pre-implementation default-seed bench snapshot.                                                    |
| `debug/canvas-graph-heavy-{before,after-step4}.json`| Heavy-seed (9000 keys) before/after snapshots for the dramatic win above.                         |

## Cache key contract (as shipped)

Diverges from the prompt in one place. See "Surprises" below.

**Per-track polyline cache key:**
```
trackId + keyframesRef + scaleX|scaleY|normalized|range.min|range.max|panX|panY|bold
```
`keyframesRef` is the actual `Keyframe[]` reference — the existing
clone-on-write writers in `sequenceSlice` already produce a new array per
change, so referential equality is the version token. No new counter
needed.

**Soft-selection mask cache key:**
```
hash(sortedSelectedIds) + softRadius + softType + scaleX|scaleY|panX|panY|normalized
```
`hash` is an xor-fold of djb2 string hashes — order-independent, fast.

## Surprises

### 1. Polyline drawing wasn't the bottleneck.

The prompt named the polyline + post-behavior resampling as the dominant
cost. After Step 3 (cache wired with 100% hit rate on default seed), the
bench was flat. Profiling the per-key path showed the cost was actually
the **diamond drawing loop**: 882 keys × 5 canvas-state ops each
(`save/translate/rotate/fillRect/restore`) ≈ the observed 2.2 ms/commit.

Diamonds were moved into the cache in Step 2 (track-default colour, no
selection awareness). This still didn't move the React per-commit median
— which is the next surprise.

### 2. Cache hits 100%, bench flat → real cost is React reconciliation.

After Step 3, instrumentation showed the cache hitting every redraw, with
no measurable bench delta. The per-render `drawGraph` cost is small
compared to React reconciliation of the GraphEditor subtree per
anim-notification. The bench's `Timeline:Graph` boundary measures the
sum; the canvas refactor only affects half of it, and not the dominant
half.

This matched the systemic fanout already documented in
`08_ENGINE_PROBE_FINDINGS.md`. The remedy the spec proposes — overlay
canvas split so the back useEffect never re-runs at all — is what Step 5
delivers.

### 3. The user-visible win didn't show up in `Timeline:Graph` per-commit ms.

The prompt's acceptance criterion was framed in those units. After Step 5
shipped, the per-commit median was still 4.10 ms — but `workerFps` rose
from 22 → 43, `fpsP50` from 20 → 60 (vsync), and the 12 long tasks /
1054 ms of blocking went to zero.

The canvas work moved heavy main-thread paint off the per-frame path.
That doesn't reduce React's per-render reconciliation, but it stops the
canvas paint from monopolising the main thread between renders, which is
what was breaking vsync. Different metric, real fix.

### 4. `panX` is in the viewKey, contradicting the prompt.

The prompt said "panX is not in the key. Pan is `ctx.translate(-panX *
scaleX, 0)` on the back canvas during composition." Implementing this
properly requires a back canvas wider than the viewport (so post-behavior
tails extending right don't get clipped when panning). That involves a
max-canvas-width cap, a fallback to viewport-sized at deep zoom, and a
non-trivial frame-range calculation per track.

For the immediate bench win this is unnecessary: graph-play and
graph-scrub both hold pan fixed throughout, so cache hits remain at 100%
even with panX in the viewKey. Continuous-pan interactions (drag-pan)
will see a rebuild per pan-frame, but pan smoothness wasn't a complaint.
The simpler approach was chosen; the deviation is documented inline in
`GraphRendererBuilder.ts` so revisiting later is straightforward.

### 5. Step 4 (soft-mask cache) ships but doesn't move the bench.

The bench scenarios don't activate soft selection. The mask cache is
correct and the architecture is complete, but its empirical perf win
shows only when a user has soft-selection on with many keyframes — a
case the test suite doesn't currently exercise. Shipping anyway for
architectural completeness, since the alternative was leaving a half-
finished implementation that future maintainers would have to puzzle
over.

## Cache hit rates

Measured during pause-2 with default seed (882 keys / 6 tracks):

| metric                   | count |
|--------------------------|-------|
| polyline cache hits      |  1080 |
| polyline cache misses    |     0 |
| `drawGraph` calls / 2s   |     0 (after Step 5) |
| `drawGraphOverlay` / 2s  |   198 (~99/sec) |

The 100% hit rate with zero drawGraph invocations means the entire heavy-
paint path is dormant during ordinary playback. Only the overlay (clearRect
+ a stroked line + a triangle) runs per frame.

The diag harness used to capture these is `debug/diag-polyline-cache.mts`;
the cache class still carries a `stats` field for future probing, but the
runtime no longer publishes it to `window.__`.

## Spec amendments

None required. The high-level architecture matches `02_RATIONALE.md` §7 and
`03_SPEC.md` §3.7 (back / mid / front layers). The cache-key contract in
the prompt was implemented with the `panX`-in-viewKey deviation noted above
(documented inline in the builder so a future implementer who wants
pan-translation can find the spot to change).

## Follow-on items

Noticed but deliberately not done in this phase:

- **DPR / HiDPI.** Neither `GraphCanvas.tsx` nor `drawGraph` accounts for
  `devicePixelRatio`. The cached canvases inherit this — rendering looks
  identical to `main` on a 1× display but is blurrier than necessary on
  Retina. Separate cleanup; not blocking on this work shipping.
- **Pan-translation cache (the prompt's intended approach).** As above —
  the deviation is documented, and revisiting it once pan smoothness
  becomes a complaint is the natural moment.
- **GraphSidebar's per-track `LiveValueDisplay`.** Each row runs its own
  `requestAnimationFrame` to update the live-value badge during playback.
  Per `02_RATIONALE.md` §7's note, these collapse into one shared tick.
  Not touched by this work; queued for the Animation Document refactor.
- **The React per-commit cost itself.** `Timeline:Graph` at 4.10 ms/commit
  is mostly reconciliation of GraphEditor's subtree. Reducing it requires
  narrowing `useTrackAnimation`'s subscription (the per-Slider hook
  flagged in the audit) so playhead movement doesn't fan out to every
  animatable param. Out of scope here; covered by the deferred Animation
  Document plan.
- **Soft-selection bench coverage.** No scenario in
  `bench-perf-timeline.mts` activates soft selection. Worth adding a
  `graph-soft-marquee` scenario the next time the bench is touched, so
  Step 4's win has a regression gate.

## Recommendation

The user-visible lag during graph playback at high keyframe counts —
which is what motivated this whole refactor track — **is resolved.**
Worker FPS doubled, main-thread FPS tripled to vsync, and 1+ seconds of
main-thread blocking per 4-second scenario is gone.

The canvas DopeSheet work (the natural sibling, in `02_RATIONALE.md` §7
under `<DopeSheetCanvas />`) is the next move if dope-sheet lag is felt
at similar keyframe counts. Numbers above suggest the dope-sheet path is
much cleaner already (it doesn't have the per-key DOM diamond + per-RAF
TrackRow.tick stack the audit named) but a similar cache architecture
could shave whatever remains.

The deeper React fanout fix (AnimationDocument refactor) remains the
right next architectural move once a user reports lag in a place this
canvas work didn't touch. Until then, the cost is paid in React commit
time, not in canvas paint time, and `workerFps` / `fpsP50` are the
metrics that actually correlate with user-felt smoothness.
