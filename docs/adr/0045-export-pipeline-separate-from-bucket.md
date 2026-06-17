# ADR-0045: Per-frame video/image-export pipeline separate from bucket render

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/engine/BucketRenderer.ts`,
`engine-gmt/engine/GmtBucketHost.ts`,
`engine-gmt/engine/worker/WorkerExporter.ts`,
`engine-gmt/engine/worker/WorkerHistogram.ts`,
`engine-gmt/engine/worker/WorkerDepthReadback.ts`

## Context

Two high-resolution output paths exist in GMT:

1. **Bucket render / Refine View** — single still image potentially
   larger than the viewport, requiring GPU-tile loops for VRAM safety
   AND image-tile loops for very-large outputs, with async convergence
   polling per bucket.
2. **Timeline video / image-sequence export** — fixed per-frame
   resolution, fast turn-around, accumulation via ping-pong RTs, audio
   mux, encoder bitrate considerations.

Earlier prototypes used the bucket renderer for both, but path-traced
video export ground to halt because each frame ran the full image-tile
+ bucket-spiral lifecycle. Bucket-render's per-bucket
`startAsyncConvergence` / `pollConvergenceResult` cycle is also
unsuitable for the deterministic N-samples-per-frame video pipeline.

## Decision

Two separate drivers sharing `engine.materials.exportMaterial`, the
`BloomPass`, and the post-process fullscreen-pass pattern but otherwise
structurally distinct.

- **Bucket render**: `BucketRenderer` (compatibility shim, 90L) +
  `GmtBucketHost` (BucketRenderHost impl) drive the generic
  `BucketRunner`. Owns aspect/size/bloom save+restore, async
  convergence polling, Refine View blit. Per-image-tile and
  per-GPU-bucket lifecycle hooks (`beginImageTile`, `beginGpuBucket`).
- **Video / image-sequence**: `WorkerExporter` allocates its own
  ping-pong accumulation RTs and walks frames N=samples times per
  frame, never going through BucketRunner. Handles AAC/Opus audio mux,
  first-chunk PTS normalization (Firefox leading-latency fix), 2-px
  boundary alignment for chroma-subsampling-safe encoder output,
  per-frame fire-and-forget file I/O via `imageWriteChain`, encoder
  bitrate stacking (`BITRATE_MULTIPLIER × 2.5`).

Both live on the worker side of the boundary. The two worker readback
subsystems (`WorkerDepthReadback`, `WorkerHistogram`) are sibling
consumers of the same pipeline / materials / BloomPass triad.

## Consequences

- Two code paths to maintain — convergence polling lives in
  `GmtBucketHost`; ping-pong sample loop lives in `WorkerExporter`.
  They share neither buffer nor lifecycle but DO share `BloomPass` +
  `exportMaterial`. Changes to either ripple to both.
- The `2.5×` bitrate correction is duplicated at
  `engine/export/videoEncoder.ts:114` for the main-thread capability
  probe (which deliberately omits the `2.5×` for capability tests).
  The `12 Mbps` Firefox H264 cap UI in `RenderPopup.tsx` is derived
  from the same constant — any change to the `2.5×` lands in 4 places
  simultaneously (q-114).
- The "render-into-target-and-read-it-back" pattern recurs across
  `WorkerDepthReadback` (async PBO + fenceSync) and `WorkerHistogram`
  (128×128 RT + Float32 readback) — three worker readback subsystems
  that all reach back into `RenderPipeline`. Code grouping (this
  module doc, this ADR) treats them as siblings.
- Future "render N times into FBO at fixed dimensions" use cases should
  follow the `WorkerExporter` pattern, not `BucketRenderer`.
