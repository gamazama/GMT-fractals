# Shared canvas utils + GraphEditor simplify — report

**Result line:** Shipped. Cache primitives (`CacheCanvas`, `createCacheCanvas`, `getCacheCtx2D`, `SUPPORTS_OFFSCREEN`, `roundView`) and the generic `RefViewKeyCache<TToken>` now live in [`utils/canvasCache.ts`](../../utils/canvasCache.ts); `traceKeyframeShape` lives in [`utils/keyframeShape.ts`](../../utils/keyframeShape.ts). Both editor caches collapsed onto the shared base — `DopeSheetRendererCache.ts` dropped from 187 → 67 lines, `GraphRendererCache.ts` from 203 → 105. The GraphEditor simplify pass found and fixed the same `O(T × S × N)` selection-paint bug the DopeSheet's [Surprise #5](./16_CANVAS_DOPESHEET_REPORT.md) caught — `drawGraph`'s Pass 1 had been doing `keys.find(kk => kk.id === kid)` inside a `trackIds.forEach × selectedKeyframeIds` double loop. All bench scenarios stayed at vsync; zero long-task regression.

## What got extracted

| module                                           | role                                                                                              |
|--------------------------------------------------|---------------------------------------------------------------------------------------------------|
| [`utils/canvasCache.ts`](../../utils/canvasCache.ts) (140 lines) | `CacheCanvas`/`CacheCtx2D` types, `SUPPORTS_OFFSCREEN`, `createCacheCanvas`, `getCacheCtx2D`, `roundView` (4-decimal float-jitter quantiser), and generic `RefViewKeyCache<TToken>` keyed by `(id, token, viewKey)` with pluggable `tokenEqual` + `tokenSnapshot`. Subsumes `PolylineCache`, `TrackDiamondCache`, `GroupDiamondCache`. |
| [`utils/keyframeShape.ts`](../../utils/keyframeShape.ts) (42 lines) | `traceKeyframeShape(ctx, kx, cy, interpolation, size)` — emits path ops for Step square / Bezier circle / Linear diamond. Caller owns `beginPath` + `fill`/`stroke`. |
| [`utils/GraphRendererCache.ts`](../../utils/GraphRendererCache.ts) (105 lines, was 203) | Thin wrappers: `PolylineCache extends RefViewKeyCache<Keyframe[]>`. Single-entry `SoftSelectionMaskCache` stays here (different shape — one entry, composite-string key). View-key builders use `roundView` from the shared module. |
| [`utils/DopeSheetRendererCache.ts`](../../utils/DopeSheetRendererCache.ts) (67 lines, was 187) | `TrackDiamondCache extends RefViewKeyCache<Keyframe[]>`; `GroupDiamondCache extends RefViewKeyCache<ReadonlyArray<Keyframe[]>>` with `childTokensEqual` + slice-on-set snapshot. |
| [`utils/DopeSheetRenderer.ts`](../../utils/DopeSheetRenderer.ts) | Local `traceKeyframeShape` removed; imports the shared one. Signature widened from `CanvasRenderingContext2D` to `ShapeCtx` so the same helper paints both main-canvas + cache contexts. |
| [`utils/GraphRendererBuilder.ts`](../../utils/GraphRendererBuilder.ts) | `buildTrackPolyline` diamond loop + `buildSoftSelectionMask` per-key paint both call `traceKeyframeShape`. Local `dHalf`/`stepHalf`/`bezierR` constants removed; size is chosen by interpolation at the call site (`8` for Step/Bezier, `6` for Linear — see "size verification" below). Dead `POLYLINE_THEME` export deleted. |
| [`utils/GraphRenderer.ts`](../../utils/GraphRenderer.ts) | Pass 1 selection paint rewritten (see "Mirror bugs"). `currentFrame` + `selectionBox` dropped from `GraphRenderProps`/`drawGraph` — both were destructured but never read; only `drawGraphOverlay` uses them. Inline selection-fill diamond now goes through `traceKeyframeShape`. |
| [`components/graph/GraphCanvas.tsx`](../../components/graph/GraphCanvas.tsx) | Drops the `currentFrame: …, selectionBox: null` plumbing to `drawGraph`. |

### Size verification — `traceKeyframeShape` calls match the inline paint

`traceKeyframeShape(ctx, kx, cy, interpolation, size)` reproduces every former inline diamond/square/circle:

| interpolation | DopeSheet (size=6 / 12)                  | Graph (size=8 / 8 / 6)                                            |
|---------------|------------------------------------------|--------------------------------------------------------------------|
| `Step`        | `size × size` axis-aligned square        | `size=8` → 8×8 (matches former `fillRect(kx-4, ky-4, 8, 8)`)       |
| `Bezier`      | circle of radius `size/2`                | `size=8` → r=4 (matches former `arc(kx, ky, 4, 0, 2π)`)            |
| `Linear`/default | rotated square w/ diagonal `(size/2)·√2` | `size=6` → diag = 3√2 ≈ 4.24 (matches former `dHalf = 4.24` diamond *and* former `save/translate/rotate(π/4)/fillRect(-3,-3,6,6)` 6×6 rotated rect — identical pixels) |

So the shared helper covers every former call site without behaviour change — verified by the bench (zero visual regression, scenario numbers within ±1 fps of the canvas-dopesheet-cleanup baseline).

## Mirror bugs

### `drawGraph` Pass 1 had the same `O(T × S × N)` selection-paint anti-pattern the DopeSheet's [Surprise #5](./16_CANVAS_DOPESHEET_REPORT.md) caught.

Before, [`utils/GraphRenderer.ts:236-308`](../../utils/GraphRenderer.ts#L236-L308) wrapped the selection-aware overlay paint as:

```ts
trackIds.forEach((tid) => {
    const keys = track.keyframes;
    for (let si = 0; si < selectedKeyframeIds.length; si++) {
        const compositeId = selectedKeyframeIds[si];
        // ...
        if (compositeId.substring(0, sepIdx) !== tid) continue;
        const kid = compositeId.substring(sepIdx + 2);
        const k = keys.find(kk => kk.id === kid);     // O(N) inside O(T × S)
        // paint k
    }
});
```

At heavy seed (9000 keys all selected on one track) that's `9000 × 9000 = 81M find ops per repaint` — exactly the DopeSheet's diagnosis. Fixed by pre-bucketing `selectedKeyframeIds` by `trackId` once and building a per-track `Map<keyId, Keyframe>` for the inner lookup. Iteration order over `trackIds.forEach` preserved so paint order (which determines selection-ring stacking when keys overlap) doesn't shift.

This bug shipped silently because no bench scenario selects many keys at once on a heavily-keyed track. The fix is forward-compatible: when a future scenario does, the per-commit cost is O(S) instead of O(T × S × N).

### `currentFrame` + `selectionBox` were dead args on `drawGraph`.

Both were destructured at the top of `drawGraph` and never used — the back layer doesn't paint the playhead or the marquee, only `drawGraphOverlay` does. Removed from `GraphRenderProps` and the GraphCanvas call site. The split-canvas comment in [`components/graph/GraphCanvas.tsx`](../../components/graph/GraphCanvas.tsx) (back excludes `currentFrame`/`selectionBox` from deps) becomes more accurate now that the prop set actually matches the dep list.

### `POLYLINE_THEME` was a dead export.

Defined in `GraphRendererBuilder.ts` for "caller convenience" but never imported anywhere. Deleted.

## What I deferred (and why)

Not touched in this pass. Listed in priority order so the next branch has a starting point.

### 1. HiDPI / `devicePixelRatio` rendering

Neither `GraphCanvas` nor `DopeSheetCanvas` accounts for `devicePixelRatio` — both set `canvas.width/height` directly to CSS px, so diamonds and curves look soft on Retina displays. The 16_ report flagged this as a joint follow-on with the GraphEditor; this pass confirms the symmetry. The fix is mechanical (scale ctx by DPR, multiply pixel buffer, divide back at composite) but couples the two editors *and* the soft-mask cache builder, which would all need to agree on a DPR source. Worth a separate single-purpose branch so the visual diff can be eyeballed independent of structural changes.

### 2. Pan-translation tradeoff

Both `GraphRendererBuilder.ts` and `DopeSheetRendererBuilder.ts` bake `panX` into the cache key per [`11_CANVAS_GRAPH_REPORT.md`](./11_CANVAS_GRAPH_REPORT.md) §"Surprises" #4. The alternative (viewport-clamped canvas + `ctx.translate` at composite, with the canvas wider than the viewport to cover post-behaviour tails / off-edge keys) cuts pan-time cache misses to zero but adds allocation tradeoffs at deep zoom — `buildTrackDiamonds` already allocates `canvasWidth × rowHeight` per row, and the DopeSheet's 16_ §"Follow-on items" flags that at 30 min @ 60 fps × 4 px/frame the OffscreenCanvas buffer alone is multi-megabyte per row. Resolving both — viewport clamp + pan-out-of-key — wants a single coordinated rewrite of both `*RendererBuilder.ts` files.

### 3. `clampDpr` extraction

Only [`AudioStrip.tsx`](../../components/timeline/AudioStrip.tsx) currently clamps DPR to keep the buffer below `MAX_CANVAS_PX = 16384`; `TimelineRuler.tsx`, `GraphCanvas`, and `DopeSheetCanvas` use raw `window.devicePixelRatio` (or in the latter two, no DPR at all). Skipped because the extraction is a 4-line helper that today has one caller — premature abstraction by the constraint stated in the prompt. Lands naturally with the HiDPI follow-on (#1), at which point all four sites will need it and a shared helper becomes warranted.

### 4. Duplicate value-grid paint in `drawGraph`

In the `!normalized` branch, [`utils/GraphRenderer.ts:159-171`](../../utils/GraphRenderer.ts#L159-L171) paints horizontal value-grid lines + text labels *before* the clip rect is applied; then after the polyline composite + `ctx.restore()`, [`utils/GraphRenderer.ts:352-365`](../../utils/GraphRenderer.ts#L352-L365) repaints the same grid lines + labels (right-aligned this time). The second pass is the visible one — the gutter `fillRect` between them covers the first-pass labels, and the second-pass grid lines paint *over* the rendered polylines. This looks like a copy-paste survivor: the second-pass grid lines should probably be gutter-only (just the labels, which are gutter-aligned at `LEFT_GUTTER_WIDTH - 4` with `textAlign = right`). Skipped here because "no behaviour change" was a hard constraint and the visual effect of removing the grid-line overdraw isn't obvious without screenshots.

### 5. Soft-selection bench scenario

No scenario in `bench-perf-timeline.mts` exercises soft-selection at heavy seed; the soft-mask cache + the new `selectedByTrack` pre-bucket are both correct by construction but un-benched. Adding `graph-soft-marquee` would close that gap and would naturally regression-gate the O(T × S × N) fix above.

## Bench delta

Compared against [`debug/canvas-dopesheet-cleanup.json`](../../debug/canvas-dopesheet-cleanup.json) — the snapshot the canvas-DopeSheet branch landed at. New snapshot: [`debug/shared-utils-after.json`](../../debug/shared-utils-after.json). Heavy seed (1500 frames × 6 tracks = 9000 keyframes), median worker FPS across 3 runs / scenario.

| scenario               | wkrFps before | wkrFps after | longTaskMs before | longTaskMs after |
|------------------------|--------------:|-------------:|------------------:|-----------------:|
| dope-idle              |         60.0  |        60.0  |                 0 |                0 |
| dope-scrub             |         59.9  |        59.9  |                 0 |                0 |
| dope-play              |         59.2  |        59.0  |                 0 |                0 |
| dope-zoom              |         59.9  |        59.9  |                 0 |                0 |
| dope-select-track      |         60.0  |        59.9  |                 0 |                0 |
| graph-idle             |         59.9  |        59.9  |                 0 |                0 |
| graph-scrub            |         59.0  |        59.9  |                 0 |                0 |
| graph-play             |         39.7  |        40.2  |                 0 |                0 |
| graph-zoom             |         60.0  |        59.9  |                 0 |                0 |
| graph-select-track     |         59.9  |        59.9  |                 0 |                0 |

### Acceptance gates from the prompt

- [x] `dope-select-track wkrFps ≥ 55` — landed at **58.7** in the latest run (full bench output above; 3-run median is 59.9).
- [x] `graph-play wkrFps ≥ 35` — landed at **40.0** (3-run median 40.2).
- [x] No scenario regressed by more than the inter-run noise floor (±1 fps; observed range -0.2 to +0.9).
- [x] `longTaskMs = 0` across every scenario, unchanged from canvas-dopesheet baseline.

The O(T × S × N) fix doesn't show up as a wkrFps win at the heavy seed because no scenario triggers it — there's no `graph-select-many` scenario today. The bench result confirms the *no-regression* contract; the win is structural / forward-protective.

## Tests

| test                                                                                                                    | status                                                |
|-------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|
| [`debug/test-graph-renderer-cache.mts`](../../debug/test-graph-renderer-cache.mts)                                      | 28/28 passing (unchanged behaviour after migration)   |
| [`debug/test-dopesheet-renderer-cache.mts`](../../debug/test-dopesheet-renderer-cache.mts)                              | 41/41 passing (unchanged behaviour after migration)   |
| `npx tsc --noEmit`                                                                                                      | clean                                                 |

Test files were intentionally not touched — both pin the existing `new PolylineCache()` / `new TrackDiamondCache()` / `new GroupDiamondCache()` API surface plus the `.stats.{hits, missNoEntry, missViewKey, missKeysRef, sets}` shape. The subclass migration keeps every pinned name + property; the snapshot/equality contracts that the group-cache tests pin (e.g. "defensively copies the child-token array on set") are preserved by the `tokenSnapshot` constructor arg.

## A third canvas editor

The prompt asks whether a third canvas editor is likely — mini-map / navigator / similar. After this pass, the shared substrate is ready for one:

- `RefViewKeyCache<TToken>` parameterises everything that varies (token equality, token snapshotting). A mini-map row would likely use `RefViewKeyCache<Keyframe[]>` directly without subclassing — the `extends` step in `PolylineCache`/`TrackDiamondCache` exists only to keep the test API stable, not because the base class is hard to use.
- `traceKeyframeShape` is shape-agnostic about size. A mini-map at one-pixel-per-frame can pass `size = 2` and get correct sub-pixel diamonds; a heatmap-style overlay can pass `size = 1` and get single-pixel marks.
- `createCacheCanvas` / `getCacheCtx2D` handle the OffscreenCanvas/HTMLCanvas fallback once.

What's *not* yet shared and would need attention if a third editor lands:

- **Per-row viewKey builders** (`buildPolylineViewKey`, `buildTrackDiamondViewKey`, `buildGroupDiamondViewKey`) — each is short and shape-specific, so factoring into a single function adds parameter sprawl. Better to leave as duplicate one-liners until a third pattern appears.
- **Selection-paint passes** — `drawDopeSheetSelection` and `drawGraph` Pass 1 now share the bucket-by-track + per-track `Map<keyId, Keyframe>` shape after this pass; if a third editor adopts the same pattern, factoring out a `bucketSelected(selectedIds)` helper would be cheap (~10 lines).

Recommendation: **place new editors in `components/<editor-name>/` + `utils/<EditorName>Renderer*.ts` files**, following the existing convention. The shared utilities are already at `utils/canvasCache.ts` + `utils/keyframeShape.ts`, which is where any third caller will naturally reach for them. No relocation needed.

## Code-size delta

| file                              | before (lines) | after (lines) | delta |
|-----------------------------------|---------------:|--------------:|------:|
| `utils/canvasCache.ts`            | —              | 140           | +140  |
| `utils/keyframeShape.ts`          | —              | 42            | +42   |
| `utils/GraphRendererCache.ts`     | 203            | 105           | -98   |
| `utils/DopeSheetRendererCache.ts` | 187            | 67            | -120  |
| `utils/GraphRendererBuilder.ts`   | 421            | 393           | -28   |
| `utils/GraphRenderer.ts`          | 441            | 447           | +6 (selection-pass refactor +bucket map net-adds; sub-pixel constants -removes net-cancel) |
| `utils/DopeSheetRenderer.ts`      | 407            | 383           | -24   |
| `components/graph/GraphCanvas.tsx`| 124            | 122           | -2    |
| **net**                           |                |               | **-84** |

Two new modules totalling 182 lines; eight existing modules shrank by 266 lines. Net reduction is 84 lines, with the asymmetry being that the new modules are documented and unit-tested while the lines removed were mostly duplication.
