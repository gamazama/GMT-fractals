# Canvas DopeSheet — implementation prompt

**Purpose:** replace the DopeSheet's DOM-per-keyframe rendering and per-RAF imperative tick with a layered canvas that mirrors the architecture proved out by the canvas GraphEditor work. Targets the costs identified by [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md): mount/unmount churn during scroll/zoom, `TrackRow.tick` imperative cost, and the long-task budget overflow during scrub/play with many keyframes visible.

**This is an implementation phase, not a probe.** Output is working code that lands on `dev`, plus a report.

**Status:** **HELD** until [`13_DOPESHEET_PROBE_PROMPT.md`](./13_DOPESHEET_PROBE_PROMPT.md) returns "strong case" or "partial case → canvas". Do not start without that signal — the probe might surface that a smaller fix (TrackRow.tick replacement only, or engineStore narrowing in dopesheet-specific consumers) addresses most of the user-felt lag.

**Estimated effort:** 1-2 weeks, similar to canvas GraphEditor. Possibly shorter if `15_DOPESHEET_PROBE_FINDINGS.md` shows the load shape is simpler than graph's (fewer code paths to migrate, no soft-selection mask), possibly longer if the interaction surface is broader (drag, marquee, transform bar, group-diamond aggregation, sticky sidebar coordination).

## Read first (in order)

1. **[`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md)** — the empirical justification. Particularly which of the four cost buckets dominate.
2. **[`11_CANVAS_GRAPH_REPORT.md`](./11_CANVAS_GRAPH_REPORT.md)** — the canvas GraphEditor's report. Pattern reference for cache architecture, surprises encountered, and the metric-trap lesson (per-commit ms isn't where the win shows).
3. **[`02_RATIONALE.md`](./02_RATIONALE.md)** §7 — original `<DopeSheetCanvas />` sketch.
4. **[`03_SPEC.md`](./03_SPEC.md)** §3.7 — full canvas API outline.
5. **Existing code (do not change until you've read the full picture):**
   - `dev/components/timeline/DopeSheet.tsx` (499 lines) — root of the DopeSheet React tree
   - `dev/components/timeline/TrackRow.tsx` (316 lines) — per-track row with the `tick()` export, module-level `diamondState` / `liveValueState` maps
   - `dev/components/timeline/TrackGroup.tsx` (171 lines) — collapsible group with aggregated keyframes
   - `dev/hooks/useDopeSheetInteraction.ts` (530 lines) — drag, marquee, transform-bar handlers
   - `dev/components/timeline/SelectionTransformBar.tsx` — selection-range overlay
6. **Canvas GraphEditor implementation (the model):**
   - `dev/utils/GraphRendererCache.ts`
   - `dev/utils/GraphRendererBuilder.ts`
   - `dev/utils/GraphRenderer.ts`
   - `dev/components/graph/GraphCanvas.tsx`

## Architecture

Three layers, same shape as canvas GraphEditor, adapted for dope-sheet geometry:

```
   ┌──────────────────────────────────────────────┐
   │  Front (overlay)                             │  redraws every interaction tick
   │  - playhead vertical line                    │  cheap (one stroked line)
   │  - selection marquee box                     │  cheap (one stroked rect)
   │  - drag-ghost previews                       │  cheap (small fills during drag)
   │  - hover highlight on group rows             │  cheap (small fills)
   └──────────────────────────────────────────────┘
                       ↑ composited over
   ┌──────────────────────────────────────────────┐
   │  Mid (selection-aware diamond overrides)     │  redraws on selection change
   │  - selected keyframe diamonds rendered with  │  invalidates only when selection
   │    selection style (white fill + ring)       │    set changes (small typical set)
   │  - dirty-state overlay for at-playhead keys  │  invalidates on currentFrame change
   │    (replaces TrackRow.tick's diamondState    │    when paused
   │     direct DOM mutations)                    │
   └──────────────────────────────────────────────┘
                       ↑ composited over
   ┌──────────────────────────────────────────────┐
   │  Back (per-track diamond field + group rows) │  redraws per-track on data change
   │  - one cached canvas per visible track row   │  invalidates when (track keyframes
   │  - flat-bar background per row               │    OR viewport scale OR rowHeight)
   │  - group rows: aggregated parent diamonds    │    changes; panX via ctx.translate
   │    (union of children's keyframe frames)     │    OR keyed (graph editor's tradeoff)
   │  - track separators / row backgrounds        │  group-row cache keyed by group's
   │                                              │    child track refs (any child change
   │                                              │    invalidates the group)
   └──────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────┐
   │  Sticky sidebar (stays DOM)                  │  unchanged: track labels, eye icons,
   │  - track labels                              │  select-all buttons, live-value
   │  - visibility toggles                        │  displays. Sidebar is O(track count),
   │  - select-all-keys buttons                   │  not O(keyframe count) — DOM fine.
   │  - live-value text readout                   │
   └──────────────────────────────────────────────┘
```

The sticky-sidebar split matters: dope-sheet sidebar carries non-trivial chrome (label, eye, select-all, live-value, drag handle), all of which is fine as DOM because it scales with track count. The keyframe area is what scales with keyframe count and must move to canvas.

## Cache key contract

**Per-track diamond cache key:**
```
trackId + keyframesRef + viewScaleX + rowHeight + flat-flag + panX
```

Same observations as canvas GraphEditor:
- `keyframesRef` is the version token via the now-correct writers (commit `b667cfe`).
- Including `panX` is the simpler-but-rebuild-on-pan tradeoff per [`11_CANVAS_GRAPH_REPORT.md`](./11_CANVAS_GRAPH_REPORT.md) §"Surprises" #4. Acceptable; can be revisited.
- `flat-flag` is the existing `isFlatTrack(keyframes)` boolean — dimmed rendering for tracks with no animation.
- No `normalized` flag — dope-sheet doesn't have per-track value normalisation.
- No `bold` flag — dope-sheet doesn't have track-highlighting.

**Per-group-row diamond cache key:**
```
groupId + childTrackRefs[] + viewScaleX + rowHeight + panX
```

A group row's aggregated diamonds are the union of all child-track keyframe frames. Cache invalidates when any child's keyframes change. `childTrackRefs[]` (sorted by trackId, joined as a string) is the version token.

## Implementation steps

### Step 1 — Cache infrastructure (~1 day)

Create `dev/utils/DopeSheetRendererCache.ts` (or mirror to graph's location convention). Three caches:

- `TrackDiamondCache` — per-track-row diamond field.
- `GroupDiamondCache` — per-group-row aggregated diamond field.
- (Optional) `SelectionOverlayCache` — selected diamonds on mid layer, if profiling shows it.

Pattern reference: `dev/utils/GraphRendererCache.ts`. Use OffscreenCanvas with HTMLCanvasElement fallback for jsdom tests.

Unit tests in `dev/tests/dopeSheetRendererCache.spec.ts`: 20-30 tests covering get/set/evict, key invalidation, OffscreenCanvas-vs-HTMLCanvasElement fallback.

### Step 2 — Per-track diamond builder (~1 day)

Extract from `TrackRow.tsx`'s current render the logic that paints a single track row's diamonds. New function: `buildTrackDiamonds(track, view, rowHeight, color, flat): OffscreenCanvas`. Pure: given inputs, produces a row-sized canvas.

Renders:
- The flat-bar background (current `bg-transparent hover:bg-white/5` + `opacity-50` when flat) — actually this stays as a row-row CSS background; canvas just paints diamonds on top.
- A keyframe diamond per keyframe, at `(frame * scaleX - 10, rowHeight/2)`, with size + shape from `interpolation` (Linear=rotated rect, Step=square, Bezier=circle).
- Diamond colour: cyan-900 fill, cyan-400 border (track default). Selection / dirty colours are mid-layer.

Test: render a fixture track, hash canvas pixels, assert stable across renders.

### Step 3 — Per-group diamond builder (~1 day)

For collapsed-group rows that show the union of child keyframes. Same canvas type, smaller diamond (3×3 instead of 3×3 — but coloured grey).

Helper: `buildGroupDiamonds(childTracks, view, rowHeight): OffscreenCanvas`. Internally walks all child tracks, builds a Set<frame>, paints one diamond per unique frame.

### Step 4 — `<DopeSheetCanvas />` component (~2-3 days)

New component at `dev/components/timeline/DopeSheetCanvas.tsx`. Replaces the JSX tree currently rendered by DopeSheet.tsx's `{organizedTracks.groups.map(...)}` + `{organizedTracks.standalone.map(...)}` sections.

Structure:
- One `<canvas>` element for the back layer, sized to scrollable content width × all-track-rows-stacked height.
- One `<canvas>` element for the mid layer, same size.
- One `<canvas>` element for the front (overlay) layer, same size.
- Sidebar stays DOM, rendered alongside (the sticky-left sidebar columns from existing DopeSheet.tsx).

Hit testing: `pickKeyframe(x, y) -> { trackId, keyId } | null` via JS binary search per track. Used by the existing event handlers (`handleKeyMouseDown`, etc.).

Cache invalidation triggers:
- Back: per-track when its keyframes ref changes; per-group when any child ref changes; all when scaleX / rowHeight / panX changes.
- Mid: when `selectedKeyframeIds` changes OR (when paused) when `currentFrame` crosses a keyframe.
- Front: every interaction tick (selection marquee, playhead, drag-ghost).

### Step 5 — Wire interaction handlers (~1-2 days)

`useDopeSheetInteraction.ts` already speaks in pixel coordinates and frame indices. Its `handleContentMouseDown`, `startDragKeys`, etc. need only the hit-test addition: instead of receiving `(tid, kid)` from a child component's onMouseDown, receive `(x, y)` and call `pickKeyframe(x, y)` to derive `(tid, kid)`.

The marquee selection in `useDopeSheetInteraction.ts:425-487` already iterates all tracks' keyframes directly (not via DOM); preserved as-is.

### Step 6 — Delete the old DOM tree (~0.5 day)

Remove:
- `KeyframeDiamond` component from `TrackRow.tsx`.
- `GroupDiamond` component from `TrackGroup.tsx`.
- Module-level `diamondState` and `groupDiamondState` maps.
- `TrackRow.tsx`'s `tick()` function — diamond dirty-state moves to the mid-layer canvas (cheap to repaint on currentFrame change).
- `TrackRow.tsx`'s `LiveValueDisplay` component — sidebar live-value moves to either (a) a shared RAF tick reading the doc, or (b) stays as-is in the sidebar DOM (sidebar isn't a perf problem; preserve).

The `liveValueState` map can stay for the sidebar live-value text updates — that's a sidebar concern, not a keyframe-area concern.

`TrackRow.tsx` itself shrinks to just the sticky sidebar row (label + buttons), or merges into the sidebar component.
`TrackGroup.tsx` similar — header row + sidebar group label, keyframe rendering gone.

### Step 7 — Validation (~1 day)

- **Bench:** run the probe's heavy seed against pre/post. Expected pattern (mirror of canvas graph editor result):
  - `workerFps`: substantial improvement in `dope-play`.
  - `longTaskCount` / `longTaskTotalMs`: significant drop in `dope-scrub` and `dope-zoom`.
  - `mainFps p5`: rises toward vsync in `dope-scrub` and `dope-zoom`.
  - `Timeline:DopeSheet` per-commit ms: probably flat or marginally worse (same reason as `Timeline:Graph` was flat — the React boundary measures both paint AND reconciliation).
  - `__trackRowTickStats.diamondLoopMs`: ZERO (the tick function is gone).
- **Visual diff:** open dope sheet at the heavy seed. Confirm diamonds appear in the right places, in the right colours, with the right shapes (Linear/Step/Bezier visual distinction preserved).
- **Interaction smoke:** every dope-sheet interaction must continue to work:
  - Click a keyframe → select it.
  - Marquee-select → select all in range.
  - Drag a keyframe → moves it.
  - Drag the transform bar → move/scale selected.
  - Double-click empty row → add keyframe at clicked frame.
  - Right-click keyframe → context menu opens.
  - Group diamond click → selects all keys at that frame across child tracks.
  - Group expand/collapse.
  - Track visibility toggle (eye), select-all (icon), trash.
  - Live-value text in sidebar updates during playback.
  - Dirty-state colour change when paused and current frame matches a keyframe whose value differs from the live param.
- **Regression suite:** existing tests pass.
- New tests:
  - `tests/dopeSheetRendererCache.spec.ts` (cache unit tests).
  - `tests/dopeSheetCanvasIntegration.spec.ts` (boots fixture, asserts diamond canvas pixel hash stability for a known sequence).

## Acceptance criteria

- [ ] `dope-play` `workerFps` improves substantially vs. probe baseline (target: ≥30 % gain at heavy seed; canvas GraphEditor got +91 %, dope-sheet load shape may differ).
- [ ] `dope-scrub` `longTaskTotalMs` drops to near-zero (target: <100 ms in a 4 s scenario, ideally 0).
- [ ] `dope-zoom` `longTaskCount` drops; component mount/unmount churn observable in React Profiler also drops.
- [ ] `__trackRowTickStats.diamondLoopMs` reads zero (the tick function is gone — confirm with a probe before declaring done).
- [ ] All dope-sheet interactions function identically.
- [ ] No visible rendering regression at heavy seed.
- [ ] Existing test suites pass.
- [ ] New cache + integration tests added and pass.
- [ ] `16_CANVAS_DOPESHEET_REPORT.md` written, including bench delta and any pattern reuses or deviations vs. canvas GraphEditor.

## Out of scope

- Canvas GraphEditor changes (it shipped, don't touch).
- AnimationDocument refactor (deferred).
- React fanout reductions (proven ineffective in isolation).
- Audio strip / waveform rendering (separate component, smaller cost).
- Timeline ruler (low cost, can stay DOM).
- KeyframeInspector panel (one component, not a fanout source).

## Pause points (surface for review)

- **After Step 1 (cache infrastructure).** Confirm the cache API matches the GraphRendererCache shape closely enough that they could be unified later. If they diverge significantly, the unification is harder than the duplication — flag it.
- **After Step 4 (`<DopeSheetCanvas />` mounted, back layer wired).** Visual diff: do diamonds appear in the right places with the right shapes? Bench checkpoint: are the cache hit rates 100 % in dope-play and dope-scrub?
- **After Step 6 (old DOM tree deleted).** This is the highest-regression-risk moment because anything that depended on the diamond DOM (CSS selectors? screenshot tests? automation?) breaks now. Run a full interaction smoke before declaring Step 6 complete.

## Concerns to flag if encountered

- **Sidebar / keyframe-area scroll coupling.** The current implementation uses a single scroll container with the sidebar sticky-positioned. The canvas approach must preserve this; the back canvas needs to be wider than the viewport in scroll-content units, with the sidebar overlaying via `position: sticky`.
- **Track-row drag-reorder (if it exists).** Verify that this isn't currently supported via DOM drag handles on the keyframe area — if it is, port the affordances. (Quick grep of DopeSheet.tsx + TrackRow.tsx for `onDragStart` will tell.)
- **DPR / HiDPI:** flag in the report (same handling as canvas GraphEditor — fix together in a separate pass).

## Report doc structure

Write `16_CANVAS_DOPESHEET_REPORT.md` adjacent to this prompt. Sections mirror `11_CANVAS_GRAPH_REPORT.md`:

1. Result line.
2. Bench delta table (per dope-* scenario, before/after).
3. What shipped.
4. Surprises (especially: did the per-track-canvas-per-row vs. one-big-canvas decision matter? did selection overlay cache help?).
5. `__trackRowTickStats` confirming the imperative tick is gone.
6. Cache hit rates.
7. Follow-on items (DPR, soft-selection bench scenario, anything noticed).
8. Recommendation: does the user still feel lag? If yes, where? If no, the canvas track of the refactor is complete and the next architectural move is deferred AnimationDocument (or whatever the next user complaint surfaces).

## Pre-flight

- [ ] `15_DOPESHEET_PROBE_FINDINGS.md` exists with "strong case" or "partial case → canvas" verdict.
- [ ] On a fresh branch: `feature/canvas-dopesheet`.
- [ ] `npm run typecheck` passes.
- [ ] `bench-perf-timeline` baseline at heavy seed captured to `debug/canvas-dopesheet-baseline.json`.
- [ ] ~1 week clear schedule.

## Why this is likely the biggest single perf win in the refactor

The graph editor canvas work fixed one heavy painter. The dope sheet has multiple cost layers all firing per frame: DOM mount/unmount of hundreds of diamonds during scroll, per-RAF imperative loop over those diamonds for dirty-state, React reconciliation across the tree, plus the paint cost on top. Replacing the DOM with canvas collapses all four into one cheap canvas composite. If the probe confirms the load shape, this single implementation should produce a larger user-felt win than the canvas GraphEditor did — and the canvas GraphEditor already moved worker FPS from 22 to 43.
