# ADR-0067: Bucket render uses fixed sample count — no per-bucket convergence

**Date:** 2026-06-18
**Status:** Accepted
**Scope:** `engine/export/BucketRunner.ts`, `engine/export/BucketRenderTypes.ts`, `engine-gmt/engine/GmtBucketHost.ts`, bucket-render UI + store

## Context

The bucket renderer composites a high-resolution image from GPU sub-tile
"buckets" accumulated into a per-image-tile HDR composite, then runs post
(tone map, bloom, chromatic aberration) **once** on the assembled composite.

Each GPU bucket used to terminate independently via an async-convergence
early-out (`BucketRenderHost.isCurrentBucketConverged` → `RenderPipeline`
fence + delta readback against `convergenceThreshold`). Three problems
surfaced (see test:bucket-convergence and the seam investigation):

1. **Carry-over bug:** the convergence fence/target are pipeline-global but
   measured per-bucket; `resetAccumulation()` did not clear `convergencePending`.
   A bucket that hit its sample cap before its fence resolved left a pending
   measurement, so the next bucket couldn't start its own and polled a STALE
   delta — declaring itself "converged" at a near-minimum sample count
   regardless of content. (Fixed separately in `resetAccumulation`.)
2. **Per-bucket spp variance → seams:** even working correctly, the early-out
   lets adjacent buckets stop at different sample counts. The resulting
   noise/bias step at the boundary is amplified by post (chromatic aberration,
   bloom) into a visible line. At MATCHED spp adjacent buckets are bit-identical
   (verified in plans/pt-validation-report.md), so equal spp ⇒ seamless.
3. **Weak metric / preview≠export:** the delta metric `|Aₙ−Aₙ₋₁| ≈ noise/n` is
   outlier-dominated and shrinks as 1/n whether or not the image is clean; and a
   convergence-driven Refine preview rendered a different spp distribution than
   the export it was meant to predict.

The early-out's only real benefit was skipping samples on empty/dark background
buckets; frame-filling content already ran every bucket to the cap.

## Decision

Remove per-bucket convergence from bucket render entirely. Every bucket — for
both the saved export and the interactive Refine/Preview — renders to the
user-set `samplesPerBucket` cap. **Sample count is the single quality control.**

- `BucketRunner.update` gates composite solely on `samplesAccumulated >= maxSamples`,
  where `samplesAccumulated = bucketFrameCount - 1` (the runner ticks at the top
  of the frame, before the host renders that tick's sample — see ADR rationale in
  the off-by-one comment; this also fixes the blank-tile-at-spp-1 symptom).
- `BucketRenderHost.isCurrentBucketConverged` and `convergenceThreshold` are
  removed from the host contract / `BucketRenderConfig` / store / bucket UI.
- The `RenderPipeline` convergence machinery (`startAsyncConvergence` /
  `pollConvergenceResult`) is **kept** — its only remaining consumer is the
  viewport `RegionOverlay` (ADR-0018), which now uses a local constant threshold
  for its informational readout.

## Consequences

- GPU-bucket boundaries are seamless by construction at matched spp; the Refine
  preview faithfully matches the export.
- Empty/dark-background buckets now cost the full sample cap instead of
  early-outing — slower for background-heavy scenes at high spp. Mitigated by
  user-set max samples (≈64–128 is the visual-convergence knee), center-spiral
  bucket order, and the manual stop button. If empty-scene perf ever bites, the
  correct re-add is a single whole-frame stop or adaptive sampling + a denoiser,
  not per-bucket convergence.
- Multi-image-tile post (bloom/CA applied per tile) remains a separate seam
  source with its own UI warning — unchanged by this ADR.
