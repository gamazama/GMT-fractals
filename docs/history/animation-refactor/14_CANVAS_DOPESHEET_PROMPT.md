# Canvas DopeSheet — implementation prompt

**Purpose:** replace the DopeSheet's DOM-per-keyframe rendering with a layered canvas. Primary target per [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md): **the 137 ms × 6 tracks reconciliation freeze on `dope-select-track`** — clicking a track triggers a single DopeSheet render that reconciles ~9000 `<KeyframeDiamond>` DOM nodes. Secondary target: `dope-scrub`'s ~6050 ms of non-React main-thread time per 4 s scenario (most plausibly browser layout reflow from those same 9000 absolutely-positioned divs participating in PlayheadCursor's layout pass).

**This is an implementation phase, not a probe.** Output is working code that lands on `dev`, plus a report.

**Status:** **READY.** [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md) returned "modified strong case" (2026-05-17) with two of the original three prompt hypotheses falsified — see "Probe-driven amendments" below for what this changes vs. the v1 prompt.

**Estimated effort:** 1-2 weeks, similar to canvas GraphEditor.

## Probe-driven amendments (2026-05-17)

Read this section before reading the rest of the prompt. The probe invalidated three claims from this prompt's v1:

1. **`TrackRow.tick` is already dead code in dev.** The exported `tick()` function still exists in `TrackRow.tsx` but is never imported anywhere. `GmtRendererTickDriver.tsx:57` has it in a Phase-C-shell comment but the registration is commented out. Step 6's "delete TrackRow.tick" item becomes bookkeeping (remove dead exports + module-level `diamondState` / `liveValueState` / `groupDiamondState` maps that nothing populates), not behavioural change.
2. **Mount/unmount churn during `dope-zoom` is not present at the 9000-key heavy seed.** Zoom is at vsync with 9 React commits over 4 s. Either binary-search virtualisation is fast enough, or wheel-zoom doesn't shift enough keys across the viewport boundary per tick. The acceptance criterion that mentions "mount/unmount churn observable in React Profiler also drops" should be reframed: it's not currently a problem to drop. Leave the bullet for regression purposes (denser seeds may expose it), but don't expect a measurable gain there.
3. **`dope-play` will only marginally improve.** Its 3245 ms of React work is the systemic anim-notification fanout documented in [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md), distributed across `Dock:right` (757 ms), `Item:widget:formula-params` (398 ms), `TopBarHost` (478 ms), `DomOverlays` (352 ms), etc. The DopeSheet itself is already `medianMs: 0` during play. Canvas DopeSheet drops `Timeline:DopeSheet`'s 22.6 ms total → ~0; ~3000 ms of unrelated React work remains. **Set user expectations accordingly when shipping.** The full fix for play smoothness lives in the deferred AnimationDocument refactor.

Expected post-canvas bench delta (from `15_DOPESHEET_PROBE_FINDINGS.md` §"Decision"):

| scenario | before | expected after |
|---|---:|---:|
| **dope-select-track workerFps** | **8** | **≥ 55** |
| **dope-select-track DopeSheet medianMs** | **137** | **≤ 5** |
| dope-scrub workerFps | 16 | ≥ 45 |
| dope-scrub longTaskMs | 7034 | ≤ 1500 |
| dope-play workerFps | 26 | 30–40 (small canvas win; main improvement awaits AnimationDocument) |
| dope-zoom | vsync | vsync (unchanged) |

If post-canvas `dope-scrub` still has > 3000 ms of long tasks, the residual is `AnimationSystem.tick` (which evaluates 9000 keyframes through binders per `eng.scrub`); next probe should instrument that. If < 1500 ms, the canvas refactor settled the unaccounted-cost question.

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

Mostly bookkeeping after the probe — much of this is already unused on `dev`.

Remove:
- `KeyframeDiamond` component from `TrackRow.tsx` (still mounted by the JSX render path; replaced by canvas).
- `GroupDiamond` component from `TrackGroup.tsx` (same).
- Module-level `diamondState` and `groupDiamondState` maps in `TrackRow.tsx` (already orphaned in dev — `tick()` populates them but `tick()` is never called).
- `TrackRow.tsx`'s `tick()` function — **already dead code in dev** per probe finding §"`__trackRowTickStats`". Confirm with one final grep before delete: `grep -rn "tick.*TrackRow\|TrackRow.*tick\|import.*tick.*from.*timeline" --include="*.ts" --include="*.tsx"` should produce no live import.
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

Calibrated against `15_DOPESHEET_PROBE_FINDINGS.md` measured baselines.

- [ ] **PRIMARY:** `dope-select-track` `Timeline:DopeSheet` median commit time drops from **137 ms** to **≤ 5 ms** (target: 25× improvement). `workerFps` rises from 8 to ≥ 55.
- [ ] **SECONDARY:** `dope-scrub` `longTaskTotalMs` drops from **7034 ms** to **≤ 1500 ms**. `workerFps` rises from 16 to ≥ 45.
- [ ] `dope-play` `workerFps` improves modestly (target: 26 → 30–40). Note in the report that the residual ~3000 ms is the systemic React fanout from `08_ENGINE_PROBE_FINDINGS.md`, unaddressable without AnimationDocument. **Do not over-promise on dope-play.**
- [ ] `dope-zoom` remains at vsync (currently is — regression check, not target).
- [ ] `dope-idle` remains at vsync.
- [ ] `__trackRowTickStats.diamondLoopMs` reads zero (the tick function and its state maps are deleted — already dead in dev, this is confirming the deletion).
- [ ] All dope-sheet interactions function identically (especially: selection click, marquee select, drag, transform bar, double-click-to-add-key, right-click context menu, group expand/collapse, sticky sidebar buttons).
- [ ] No visible rendering regression at heavy seed.
- [ ] Existing test suites pass.
- [ ] New cache + integration tests added and pass.
- [ ] `16_CANVAS_DOPESHEET_REPORT.md` written, including bench delta against `dopesheet-probe-baseline.json` and any pattern reuses or deviations vs. canvas GraphEditor.

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

## Why this is the biggest user-felt single win in the refactor

The original framing (multiple cost layers all firing per frame) was partly wrong; the probe ([`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md)) showed `TrackRow.tick` is dead code and zoom churn isn't present at this seed. But the actual finding is more dramatic in a different way:

**Clicking a track currently freezes the app for ~137 ms.** That's a single React commit cycling through 9000 `<KeyframeDiamond>` reconciliations. With six tracks in the heavy seed, that's six freezes of ~137 ms each as the user navigates. It's the "the UI is unresponsive when I try to do anything" experience users feel viscerally.

Canvas DopeSheet makes selection-state updates O(viewport pixels) instead of O(keyframe count). The expected post-canvas `dope-select-track` median is **≤ 5 ms** — a 25–30× improvement on the single most user-visible lag symptom in the app. The graph editor canvas got worker FPS from 22 to 43 on graph-play; this work gets `dope-select-track` from 8 to 55 fps. Different metric, larger absolute change in user feel.

The follow-on (probably less dramatic but still real) is `dope-scrub` workerFps from 16 to 45 by removing the 6050 ms of unaccounted layout-or-keyframe-eval work that scales with diamond count. The probe couldn't isolate that cost between (a) browser layout reflow from 9000 absolutely-positioned divs participating in PlayheadCursor's layout pass and (b) `AnimationSystem.tick`'s per-frame keyframe binder evaluation. After canvas DopeSheet ships, the residual answers the question: if dope-scrub long-task time drops to <1500 ms, the layout was the cost. If it stays >3000 ms, AnimationSystem.tick is. Either way, the probe's outcome justifies starting here.
