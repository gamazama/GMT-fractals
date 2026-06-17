# Canvas GraphEditor — implementation prompt

**Purpose:** replace `GraphRenderer.drawGraph`'s per-redraw polyline + soft-selection resampling with a three-layer canvas cache so `Timeline:Graph` cost drops from ~7 ms/commit to <1 ms/commit during `graph-play`. Empirically identified as the dominant user-visible lag by [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md).

**This is an implementation phase, not a probe.** Output is working code that lands on `dev`, plus a report. Estimated effort: 1-2 weeks (depending on cache-key + interaction-handler integration friction).

**Status:** ready for fresh session. Bench instrumentation (`990f2e9`) is in place. Bench metric improvement ([`10_BENCH_METRIC_PROMPT.md`](./10_BENCH_METRIC_PROMPT.md)) should land first if not already shipped, so the before/after comparison is unambiguous.

## Read first (in order)

1. **[`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md)** — the empirical justification. Particularly the React attribution table showing `Timeline:Graph` at 6.95 ms × 480 commits = 3.3 s/scenario.
2. **[`02_RATIONALE.md`](./02_RATIONALE.md)** §7 — original sketch of the three-layer cache.
3. **[`03_SPEC.md`](./03_SPEC.md)** §3.7 — `GraphCurvesCanvas` shape (back/mid/front layers, per-track cache keyed by version).
4. **The code under test:**
   - `dev/components/graph/GraphCanvas.tsx` (79 lines) — thin wrapper, calls `drawGraph` in `useEffect`.
   - `dev/utils/GraphRenderer.ts` (575 lines) — `drawGraph` is the hot function. `getSoftWeight` (line 64-86) is called per polyline segment per redraw.
   - `dev/components/GraphEditor.tsx` (471 lines) — parent that hosts GraphCanvas and supplies props.
   - `dev/hooks/useGraphInteraction.ts` (851 lines) — interaction handlers; NOT changing in this phase but worth knowing.
5. **The bench baseline:** `debug/bench-perf-timeline-latest.json` from a clean `dev` run. Capture before starting; the post-implementation run compares against it.

## Architecture

Three composited canvases, drawn back-to-front per render:

```
   ┌──────────────────────────────────────────────┐
   │  Front (overlay)                             │  redraws every interaction tick
   │  - playhead vertical line                    │  cheap; one canvas-wide stroke
   │  - selection box                             │  cheap; one stroked rect
   │  - hover highlight                           │  cheap; small fill
   │  - drag handle affordances                   │  cheap; small fills
   └──────────────────────────────────────────────┘
                       ↑ composited over
   ┌──────────────────────────────────────────────┐
   │  Mid (soft-selection mask)                   │  redraws on selection change
   │  - per-key falloff weight as alpha           │  invalidates when selectedKeyframeIds
   │  - soft-radius colored regions               │    or softSelectionRadius/Type change
   └──────────────────────────────────────────────┘
                       ↑ composited over
   ┌──────────────────────────────────────────────┐
   │  Back (per-track polylines + grid + ruler)   │  per-track redraw on track change
   │  - one cached canvas per visible track       │  invalidates when (track keyframes ref
   │  - grid + ruler + post-behavior tails        │    OR viewport scale OR normalized) changes
   │  - keyframe diamonds + handles               │  panX is via ctx.translate (no rebuild)
   └──────────────────────────────────────────────┘
```

## Cache key contract

The dominant correctness question. Get this wrong and either cache invalidates on every render (no gain) or stale data lingers (visual bugs).

**Per-track polyline cache key:**
```ts
{ trackId, keyframesRef, viewScaleX, viewScaleY, normalized, trackRangeMin, trackRangeMax }
```

- `keyframesRef` is the actual `Keyframe[]` array reference. Cloned writers in `sequenceSlice` (e.g. `batchAddKeyframesMultiRange` at `:260, :364`) already produce new arrays per change — referential equality is the version token. No new version counter needed.
- `viewScaleX` / `viewScaleY` change on zoom; cache invalidates per zoom. Acceptable — zoom is a deliberate action.
- `normalized` is the "Normalize per-track" toggle.
- `trackRangeMin/Max` matters in normalize mode and changes when a track's value range shifts.
- `panX` is **not** in the key. Pan is `ctx.translate(-panOffset, 0)` on the back canvas during composition.

**Soft-selection mask cache key:**
```ts
{ selectedKeyframeIdsHash, softSelectionRadius, softSelectionType, viewScaleX }
```

- `selectedKeyframeIdsHash` is a stable hash of the sorted id list (xor-of-string-hashes is fine).
- Invalidates on selection change, soft-radius change, or zoom.

**Overlay layer has no cache** — repainted per render directly. Cost is bounded by viewport pixel count, not by track count.

## Implementation steps

### Step 1 — Cache infrastructure (~2 days)

Create `dev/utils/GraphRenderer/cache.ts` (or `dev/components/graph/graphRendererCache.ts` — pick the home that matches existing conventions). Three primitives:

```ts
class PolylineCache {
  private entries = new Map<string, { keyframesRef: WeakRef<Keyframe[]>, viewKey: string, canvas: OffscreenCanvas | HTMLCanvasElement, height: number }>();
  get(trackId: string, keyframes: Keyframe[], viewKey: string): CachedCanvas | null;
  set(trackId: string, keyframes: Keyframe[], viewKey: string, canvas: ...): void;
  evictStale(visibleTrackIds: Set<string>): void;
}

class SoftSelectionMaskCache { ... similar shape, single canvas ... }
```

Notes:
- Use `OffscreenCanvas` where supported; fall back to detached `<canvas>` element if not (some test envs).
- WeakRef on `keyframesRef` lets old entries be garbage-collected if a writer clones the array. Avoid holding strong refs to old keyframe data.
- Eviction policy: on every render, drop entries for trackIds no longer visible (cheap; visible set is small). Optional LRU later if needed.

Write unit tests in `dev/tests/graphRendererCache.spec.ts`:
- get/set/evict round-trip
- viewKey change invalidates correctly
- keyframesRef change invalidates correctly

### Step 2 — Per-track polyline builder (~2 days)

Extract from current `drawGraph` the logic that draws ONE track's polyline. New function: `buildTrackPolyline(track, view, normalized, range): OffscreenCanvas`. Pure: given inputs, produces a canvas of size `viewportWidth × trackHeight`.

Renders into a fresh OffscreenCanvas:
- The polyline (sample the curve at pixel resolution per `view.scaleX`)
- Keyframe diamonds (one per key)
- Handle lines for selected keys (lines from key to tangent endpoints)
- Post-behavior tail (Hold/Loop/Continue/PingPong/OffsetLoop) — current `drawPostBehavior` reuses here

Test: render a fixture track, hash the canvas pixels, assert stable.

### Step 3 — Wire cache into `drawGraph` (~1 day)

Refactor `drawGraph` so the per-track loop becomes:

```ts
for (const tid of visibleTrackIds) {
  const track = sequence.tracks[tid];
  const keys = track.keyframes;
  const viewKey = `${view.scaleX}|${view.scaleY}|${normalized ? '1' : '0'}|${range.min}|${range.max}`;
  let cached = polylineCache.get(tid, keys, viewKey);
  if (!cached) {
    const canvas = buildTrackPolyline(track, view, normalized, range);
    polylineCache.set(tid, keys, viewKey, canvas);
    cached = { canvas };
  }
  // Composite to main canvas, applying pan translation
  ctx.drawImage(cached.canvas, -view.panX * view.scaleX, 0);
}
polylineCache.evictStale(new Set(visibleTrackIds));
```

Bench checkpoint here: `Timeline:Graph` per-commit ms should drop substantially (target: <2 ms in graph-play). If it doesn't, the cache isn't hitting — investigate before continuing.

### Step 4 — Soft-selection mask cache (~1-2 days)

Currently `getSoftWeight` is called per polyline segment per redraw. Replace with: render the entire weight field into a single canvas, sample by lookup.

`buildSoftSelectionMask(selectedIds, softRadius, softType, viewScaleX, viewportSize): OffscreenCanvas` — pure function. For each selected key, paint a falloff gradient around its x-position. Composite all gradients into one mask canvas.

In `drawGraph`, after the polyline composition, composite the mask canvas with appropriate blend mode to highlight soft-selection regions.

Bench checkpoint: cost of soft-selection-on render should approach cost of soft-selection-off render.

### Step 5 — Overlay layer (~1 day)

Currently overlay (playhead, selection box, hover) is drawn in the same `drawGraph` pass. Split into a separate canvas:

- Restructure `GraphCanvas.tsx` to hold two stacked `<canvas>` elements: back (the cached polylines + mask) and overlay.
- Back canvas redraws when polyline cache invalidates.
- Overlay canvas redraws every render but only does cheap operations.

This separation means a playhead nudge (just `currentFrame` changing) only repaints the overlay — the back canvas stays as-is. Major perf win for scrub scenarios.

### Step 6 — Validation (~1 day)

- **Bench:** run `bench-perf-timeline` against the baseline captured in "Read first" step 5. Expected: `Timeline:Graph` per-commit ms < 1 ms in graph-play. Frame time p50 should drop noticeably in `graph-play`.
- **Visual diff:** open the GraphEditor, scrub through a heavy seeded sequence. Compare side-by-side with `main` build. Pixel-equal is the goal; small differences in antialiasing are acceptable; any visible artifact (missing curves, stale rendering, color shifts) is a blocker.
- **Interaction smoke:** click a key, marquee-select, drag a key, drag a tangent handle, toggle soft-selection, change soft-radius, zoom, pan. All should behave identically to `main`.
- **Regression suite:** existing tests should pass unchanged. Add `tests/graphRendererCache.spec.ts` + a `tests/graphRendererIntegration.spec.ts` that boots the bench fixture and asserts polyline pixel hash stability.

## Acceptance criteria

- [ ] `Timeline:Graph` per-commit ms drops to ≤1.5 ms in `graph-play` (5× improvement vs ~7 ms baseline).
- [ ] No visible regression in graph rendering (manual visual diff acceptable; pixel-perfect not required for antialiased polyline edges).
- [ ] All graph interactions (key click, marquee, drag, soft-selection, zoom, pan) work identically.
- [ ] No regression in `dope-*` scenarios (they don't touch this code, but verify).
- [ ] No regression in existing test suites.
- [ ] New tests added: `tests/graphRendererCache.spec.ts` + `tests/graphRendererIntegration.spec.ts`.
- [ ] `bench-perf-timeline-latest.json` captured post-implementation, committed alongside.
- [ ] `11_CANVAS_GRAPH_REPORT.md` written.

## Out of scope

- Canvas DopeSheet (separate piece of work; only if user lag remains after this lands).
- AnimationDocument refactor (deferred per probe findings).
- Changes to `useGraphInteraction.ts` or any interaction handler — they read pixel positions, which the canvas refactor preserves.
- Changes to `sequenceSlice.ts` or any data layer.
- Adding per-track version counters as a side-band (use the keyframes-array reference as the version token; the existing clone-on-write writers already provide this).
- React fan-out reductions (probed twice and proven ineffective).

## Pause points (surface for review)

- **After Step 1 (cache infrastructure built).** Confirm the cache API matches expectations before integrating with `drawGraph`. The 3 cache primitives are the load-bearing contract.
- **After Step 3 (polyline cache wired).** Bench checkpoint. If `Timeline:Graph` per-commit ms doesn't drop, the cache isn't hitting — escalate before doing Steps 4-5. Possible causes: wrong cache key, writers cloning more aggressively than expected, viewport changes invalidating per-tick. Investigate, don't paper over.
- **After Step 5 (overlay layer split).** Visual diff against `main`. This is the highest-regression-risk step because it changes the canvas DOM structure.

## Out-of-band concerns to flag

- **DPR / HiDPI:** the current `GraphCanvas.tsx` doesn't account for device pixel ratio (every canvas is 1:1). The cache work doesn't have to fix this, but if the rendering looks blurrier than before on a Retina display, note it in the report — separate cleanup.
- **OffscreenCanvas test environment:** Playwright runs against headless Chrome which supports OffscreenCanvas. Vitest/jsdom does NOT. The cache class should fall back to detached `<canvas>` when OffscreenCanvas is unavailable, so unit tests run in jsdom.
- **Pan precision:** `ctx.drawImage(cached, -panX * scaleX, 0)` with sub-pixel panX may produce 1-pixel rendering inconsistencies vs the current per-redraw approach. If visible, round to integer pixel during composition or render the cache at 2× scale.

## Report doc structure

Write `11_CANVAS_GRAPH_REPORT.md` adjacent to this prompt. Sections:

1. **Result line:** "Canvas GraphEditor shipped." / "Shipped with caveats — see issues." / etc.
2. **Bench delta:** `Timeline:Graph` per-commit ms before / after, plus the full React attribution table delta. `frameDts` p50/p5 deltas.
3. **What shipped:** files created/modified, with brief descriptions.
4. **Cache hit rates:** if instrumented (recommended), report observed hit/miss ratios per scenario.
5. **Surprises:** anything that didn't match the architecture above. Cache-key edge cases, OffscreenCanvas quirks, etc.
6. **Spec amendments:** if `03_SPEC.md` §3.7 was updated based on implementation reality, log in `04_CORRECTIONS.md`.
7. **Follow-on items:** what was noticed but not done (DPR, pan-precision, etc.).
8. **Recommendation:** does the user-reported lag still bother you, or is this enough? If the former, the canvas DopeSheet work is next.

## Pre-flight before starting

- [ ] `10_BENCH_METRIC_PROMPT.md` has shipped (per-commit ms column in bench output). If not, ship it first — this phase's validation depends on it.
- [ ] On a fresh branch: `feature/canvas-graph-editor`.
- [ ] `npm run typecheck` passes on starting state.
- [ ] `bench-perf-timeline` baseline captured and committed to `debug/canvas-graph-baseline.json`.
- [ ] ~1 week clear schedule. This is the longest single piece of work in the revised plan.
