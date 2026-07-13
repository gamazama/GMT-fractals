# Preview Region at Export Resolution — Plan

> Draft plan | 2026-04-20

## Shipped — with design changes

This doc is kept as the historical plan. The **shipped** implementation diverged in one major way: instead of routing preview through `BucketRenderer.startPreview()` with a bucket-render lock, Preview Region is now a lightweight **uniform-only** mode driven by `PREVIEW_REGION_SET` / `PREVIEW_REGION_CLEAR` worker messages. No render lock engages — the user can keep changing parameters, moving the camera, editing sliders, and the preview re-renders live at export density. Accumulation is capped by `samplesPerBucket`. Exit via the "Exit Preview ✕" chip in the Bucket Render panel header, Escape, or by closing the panel.

See `engine/worker/renderWorker.ts` (handlers) and `hooks/usePreviewTarget.ts` (capture) for the final shape. References below to `BUCKET_PREVIEW_START`, `BucketRenderer.startPreview`, `WorkerProxy.startPreviewRegion`, and a canvas-floating HUD are **obsolete** — they describe the initial plan, not the shipped code.

## Goal

Let users click anywhere on the viewport to see that section rendered at the **final export resolution**, converging live and filling the canvas, so they can confirm detail/noise/bloom looks right before committing to a full export.

## Interaction

- Click "Preview Region" in the Bucket Render panel → enters `selecting_preview` interaction mode. Cursor changes (crosshair).
- As the user hovers over the canvas, a **ghost rectangle** follows the cursor. Its size is fixed at `(canvasPixelW / outputW, canvasPixelH / outputH)` in normalized UV — i.e. it marks exactly the slice of the full export that will fill the canvas at **1:1 export-pixel density**.
- If the user moves near an edge, the ghost clamps inside `[0,1]` so the rect stays fully on-canvas.
- Click → rect is captured at that cursor position, preview starts. Bucket renderer blits the zoomed-in region to the canvas, converging live.
- Exit: Escape, or clicking the "Exit Preview" chip in the HUD, or clicking the toolbar toggle off. A second click on the canvas while in preview starts a *new* preview at the new cursor position (no need to exit first).

### Why click-to-zoom (not drag-rect)

The "1:1 export-pixel density" requirement pins the rectangle's *size* — it's always `canvasW/outputW × canvasH/outputH` in UV. That leaves only a position to pick. A single click is the minimal gesture for that; drag-rect would let the user pick a wrong-aspect / wrong-size rect that would either distort or not be "1:1". Click-to-zoom makes the ideal pick the only pick.

### Edge cases

- **Export dimensions ≤ viewport**: the rect width/height would be ≥ 1.0 in UV. Clamp the rect to `(0,0)-(1,1)` — the preview ends up equivalent to Refine View, no harm done. HUD shows a note like "Output ≤ viewport · preview shows full frame".
- **Non-square export vs. non-square viewport**: the rect has the viewport's aspect (it's canvas-sized in both dimensions). Preview fills the canvas without stretch because both the rect and the canvas share the viewport aspect. The camera basis is configured for the full *export* aspect during render (same as regular bucket export), so content framing matches the export exactly.
- **Clamping near edges**: cursor stays at rect edge instead of rect center once clamped, matching standard Photoshop-style "crop follows cursor until hitting canvas edge" behavior.

## Why this is easy now

The image-tile machinery that just shipped is the exact primitive we need. A preview is "one image tile whose origin/size comes from the selected rectangle instead of a grid division, and whose output goes to the screen instead of a file."

Specifically, `BucketRenderer.startImageTile()` already:
- Derives pipeline resolution from the tile's pixel rect (`tileW × tileH`)
- Sets `uImageTileOrigin / uImageTileSize / uTilePixelOrigin / uFullOutputResolution` so primary rays cover the correct slice of the full image
- Runs bloom/CA/tone-map on the tile composite
- Blits the final result back to the canvas via `blitToScreen()` when `!isExporting`, which already does zoom-to-fill (the display material samples `map` at UV 0..1 on a fullscreen quad — canvas size is independent of composite size).

## Current region-selection plumbing (verified)

- [hooks/useRegionSelection.ts](hooks/useRegionSelection.ts) — gated on `interactionMode === 'selecting_region'`; draws a rect, writes to `renderRegion` on mouse-up. Handles move + 8-direction resize on an already-set region.
- [components/ViewportArea.tsx:114-295](components/ViewportArea.tsx#L114-L295) — `RegionOverlay` component renders the region rect, live sample/convergence HUD, and clear/resize affordances.
- [store/slices/rendererSlice.ts](store/slices/rendererSlice.ts) — `renderRegion: {minX,minY,maxX,maxY} | null` + `setRenderRegion`.

The existing Render Region feature is a viewport-resolution accumulation mask; it lives and continues to work unchanged. Preview Region is a separate, export-resolution feature with a different lifecycle.

## Design

### Store additions

- `previewRegion: {minX,minY,maxX,maxY} | null` — the rectangle the user drew. Lives only while preview is active.
- `setPreviewRegion(r)` — setter.
- `isPreviewingRegion: boolean` — true while the bucket renderer is in preview mode (lets UI lock input and swap the HUD).
- `setIsPreviewingRegion(v)`.
- `InteractionMode` union: add `'selecting_preview'`.

### UI

- **Entry point**: a "Preview Region" icon button in the Bucket Render panel (next to Refine View / Export). Clicking enters `selecting_preview` mode. Keyboard shortcut `P`.
- **Hover ghost**: a new small hook (`usePreviewTarget`) tracks the cursor over the canvas and emits a live rectangle at `canvasPxW / outputW × canvasPxH / outputH` UV, clamped to `[0,1]`. A `<div>` overlay renders a dashed outline at that rect — no pointer-events, just visual. This is distinct from `useRegionSelection` (which handles drag-rect + resize handles) — preview is click-only, no drag.
- **Click → start**: mousedown in `selecting_preview` captures the ghost rect, calls `setPreviewRegion(r)` + `engine.startPreviewRegion(r, bucketConfig)`, and stays in `selecting_preview` so a second click starts a new preview without re-entering the mode. Optional: switch to `none` after first click so subsequent clicks don't accidentally re-preview — config choice.
- **During preview**: the canvas is fully covered by the blit. A compact HUD top-left:
  ```
  [Preview] 7680×4320 · region 768×432 · 14/256 samples · 0.24% conv  [Exit ✕]
  ```
  Reuses the sample/convergence polling pattern from `RegionOverlay`.
- **Exit**: Escape, clicking `Exit ✕`, or clicking the toolbar toggle off. All call `engine.stopPreviewRegion()`.

### Engine

Add a single new entry point on `BucketRenderer`:

```ts
public startPreview(region: {minX:number;minY:number;maxX:number;maxY:number}, config: BucketRenderConfig)
```

Implementation is ~10 lines — it mirrors `start()` but with these differences:

1. `isExporting = false` (blit instead of save).
2. Builds `imageTiles` as a single custom-rect tile:
   ```ts
   const px0 = Math.floor(region.minX * outW);
   const py0 = Math.floor(region.minY * outH);
   const px1 = Math.ceil(region.maxX * outW);
   const py1 = Math.ceil(region.maxY * outH);
   this.imageTiles = [{ col: 0, row: 0, pixelX: px0, pixelY: py0, pixelW: px1 - px0, pixelH: py1 - py0 }];
   ```
   Everything downstream (`startImageTile()`, the bucket loop, `runPostProcessing()`, `blitToScreen()`) works unchanged — `startImageTile()` computes UV origin/size from pixel coords and resizes the pipeline to the tile size.
3. Marks the engine state so the worker lock stays engaged (prevents camera drift mid-preview) and so the shadow state flags `isPreviewingRegion` on the main thread for the UI.

Add `WorkerProxy.startPreviewRegion(region, config)` and matching `BUCKET_PREVIEW_START` / `BUCKET_PREVIEW_STOP` worker messages (the existing `BUCKET_STOP` can be reused, but a distinct message keeps the intent clear in the protocol).

### Lifecycle

```
user clicks "Preview Region"           setInteractionMode('selecting_preview')
  → hovers over canvas                  usePreviewTarget emits ghostRect
    ghost outline follows cursor         (canvasW/outputW × canvasH/outputH UV)
  → clicks canvas                       setPreviewRegion(ghostRect)
                                        engine.startPreviewRegion(r, bucketConfig)
  → worker enters preview mode          isPreviewingRegion = true, worker lock on
  → bucket loop runs                    single tile, converges
  → canvas shows blitted preview         blitToScreen() at each bucket completion
                                        + final post-processed frame on finish

user presses Escape / clicks Exit       engine.stopPreviewRegion()
  → worker cleanup (existing path)       cam.aspect/resolution/uniforms restored
  → preview texture dropped              setPreviewRegion(null)
  → normal viewport resumes              isPreviewingRegion = false
```

Because preview uses the same cleanup path as a regular single-image bucket render, we get the aspect-restore and uniform-restore for free.

### Interaction with existing features

- **Render Region** (viewport-res accumulation mask) is unaffected — different state, different code path. The user can have a render region set and then separately preview any sub-rect.
- **Bucket Render panel** stays the authoritative source for output dimensions. Preview always uses the current `outputWidth × outputHeight`. This means opening the Bucket Render panel to change the export size also changes what the preview will render at.
- **Region selection conflicts**: if the user is mid-selection in `selecting_region` and clicks "Preview Region", swap to `selecting_preview` (mutually exclusive modes, single `InteractionMode` enum handles this).
- **Camera movement during preview**: locked via the existing bucket-render worker message gate. Same lock, same guarantees.

## Rollout steps

1. **Store + types**: add `previewRegion`, `isPreviewingRegion`, `'selecting_preview'` to `InteractionMode`. Setters.
2. **BucketRenderer.startPreview**: ~15 LOC on top of existing `start()` / `startImageTile()` — build the single-tile list from a region param; route through existing logic.
3. **Worker protocol**: `BUCKET_PREVIEW_START` + proxy method. Reuse `BUCKET_STOP`.
4. **Hooks**:
   - New `usePreviewTarget(containerRef)` — tracks cursor, emits `ghostRect` (UV) when `interactionMode === 'selecting_preview'`. Handles mousedown → capture + start preview.
   - `useRegionSelection` stays unchanged (drag-rect for Render Region only).
5. **UI**:
   - Add "Preview Region" button to Bucket Render panel.
   - Compact preview HUD component (subset of `RegionOverlay` — label, sample/conv counter, exit).
   - Escape-to-exit global keybinding (guarded by `isPreviewingRegion`).
6. **Docs**: section in [docs/02_Rendering_Internals.md](02_Rendering_Internals.md) §6 + in-app help entry.

## What I'm *not* planning to change

- The blit-to-screen zoom behavior (already correct).
- The image-tile uniform contract (already covers this case by construction).
- The post-processing pipeline (bloom/CA per-tile behaves exactly as it would for an export, which is the point — we want the preview to faithfully show what the export will produce, including any bloom-seam quirks when `tileCols/tileRows > 1`).
- The Render Region feature.

## Decisions (confirmed 2026-04-20)

1. **Entry point**: Bucket Render panel only. No viewport-toolbar icon.
2. **Output dimensions change mid-preview** (user edits Width/Height/Preset in the Bucket Render panel while a preview is active) → preview auto-exits and the viewport returns to normal rendering. Rationale: the rendered pixels no longer represent the current export settings, so continuing to show them is misleading. User re-enters preview mode and clicks to pick a new region under the new dims.
3. **Region persistence across exits**: no. Every preview entry starts fresh — the user must click to pick a rect. Preview is ephemeral by design.
