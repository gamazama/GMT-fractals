# Tiled Progressive Rendering — Session Handover (2026-06-15)

Pick-up doc for the next session. Design rationale is in
[`tiled-progressive-rendering.md`](./tiled-progressive-rendering.md); this is **where we
are, what broke, and what to do next.**

## TL;DR

Goal: stop the UI freezing while the fractal renders. Solution: render the idle (static)
viewport **one horizontal band per frame** instead of one giant full-screen raymarch, so the
GPU yields and the compositor can paint UI between bands. **The core works and the user
verified it feels good.** Then a code review found integration bugs; fixing them caused a
regression cascade. Most are now fixed; **everything is uncommitted on `main`** (no commits
yet — recommend branching + committing before more work).

## What works (user-verified ✅) / open (⚠️)

- ✅ Core tiling: idle renders band-by-band, smooth UI, converges to full res (M1–M3).
- ✅ Export of a settled scene = full image (the critical export-corruption bug is fixed).
- ✅ Topbar render-region confines correctly (tiling stands down for it).
- ✅ Sample-cap stops correctly; count plateaus.
- ✅ Formula switch shows no stale previous scene.
- ✅ Post-process sliders (bloom/colour/post) re-grade WITHOUT re-rendering a settled scene
  (user-verified). ⚠️ Still worth a glance: fractal-param sliders still feel responsive
  (adaptive via accum-drop), and the stale-flash is gone on the adaptive→bands handoff incl.
  re-navigating right after bands start.
- ⚠️ **DEFERRED to a dedicated session:** **black frames after some moves.** On a held /
  no-fresh-capture move on a heavy scene, the handoff seed is absent so bands fill from
  black briefly. Accepted as the lesser evil vs. the stale flash. Needs the proper
  "buffer always valid across resize" fix (see Next Steps).

## The uncommitted diff (what changed, by file)

- `engine-gmt/engine/BandScheduler.ts` (NEW) — center-out band schedule, pass-indexed blend.
- `engine-gmt/engine/FractalEngine.ts` — the tiling block in `compute()` (region per band,
  `setTiledBlend`, `accumulationCount` = pass index, cap-stop, seed-at-handoff); `setRegion()`
  + `clearTilingRegion()` helpers; `invalidateSeed()` on formula/mode change; tiling fields.
- `engine/RenderPipeline.ts` — `_blendOverride` + `setTiledBlend()` (pass-indexed blend);
  `accumulationEnabled` getter; `convergenceNeeded` getter; seed machinery (`captureSeed`,
  `seedFromLastFrame`, `_seedTarget`/`_hasSeed`/`_resizedSinceSeed`, copy pass);
  `invalidateSeed()`; cap gate now bypassed in tiled mode (`_blendOverride===null`).
- `engine/AdaptiveResolution.ts` — `costSampleInteractingOnly` input (EMA samples only
  interaction frames, so cheap idle bands don't poison the full-res cost estimate).
- `engine-gmt/engine/managers/UniformManager.ts` — passes `costSampleInteractingOnly:true`;
  **adaptive now engages on `sessionHoldActive||isSceneAnimating` + `ignoreAccumDrop:false`**
  (buffer-invalidating gestures only — the post-process-slider fix).
- `engine-gmt/engine/worker/renderWorker.ts` — `clearTilingRegion()` on EXPORT/BUCKET/PREVIEW
  start; `tilingSuppressed` for preview-region.
- **Unused now (clean up):** `RenderPipeline.maybeSeedAfterResize()` + `_resizedSinceSeed`'s
  set-in-resize is still wired but the per-resize call was removed (seed is handoff-only).

## Architecture (current behaviour)

- **3 modes** (in `FractalEngine.compute()`): interaction & playback → full-frame (adaptive,
  unchanged); **idle → tiled** (`!shouldHold && !interacting && !bucket && !export &&
  !tilingSuppressed && !convergenceNeeded && accumulationEnabled`).
- **Accumulation:** in-shader running mean; pass-indexed blend `1/(passIndex+1)`, constant
  per pass → no seams. `accumulationCount` is repurposed as the per-pixel sample count
  (= pass index + 1). The shader's region copy-forward (`shaders/chunks/main.ts:77`) keeps
  out-of-band pixels intact, so the buffer stays complete each frame with NO extra blit.
- **Cap-stop:** scheduler stops at `passCount >= sampleCap`; `render()` bypasses its own cap
  gate while `_blendOverride` is set (tiled mode owns the stop — else off-by-one).
- **Seed (handoff only):** `seedFromLastFrame` runs ONLY when `accumulationCount===0` (a real
  reset) AND a resize blanked the buffer (`_resizedSinceSeed`) AND a fresh frame was captured
  (`_hasSeed`); it consumes both flags (one-shot). This is the M3 behaviour.

## ⚠️ The regression saga — DO NOT re-introduce

The hard-won lessons (each caused a user-visible regression):
1. **Seed on every resize** → replays a STALE frame during navigation's rapid resizes →
   "stale flash / camera lost." FIX: seed ONLY at the handoff, and only when a resize
   actually blanked the buffer; consume one-shot.
2. **Restart/seed on every tiling re-entry** → a momentary `interacting` blip (e.g. a slider)
   restarted pass 0 → re-accumulated a settled scene + stale frame every render. FIX: restart
   + seed ONLY when `accumulationCount===0` (a REAL reset), never just on re-entry.
3. **Adaptive engaged on any `interacting`** → display-only sliders triggered an adaptive
   resize → resetAccumulation → fractal re-render. FIX: engage adaptive only on
   buffer-invalidating gestures (`sessionHoldActive` + accum-drop), not display-only sliders.
   `noReset` params correctly drop nothing → stay non-adaptive.
4. **Cap gate off-by-one** in tiled mode (froze one sample short) → `render()` skips its cap
   gate when `_blendOverride` set.

## Key invariants / gotchas

- `resetAccumulation()` does NOT clear the buffer — only a **resize** (new render targets)
  produces true black. Seed/black-flash logic hinges on this.
- `accumulationCount` is overloaded (UI count, jitter index, cap gate, adaptive). Changing
  its meaning (pass index) rippled to many consumers — verify any new consumer.
- Region uniform `uRegionMin/Max` has multiple owners (tiling band, bucket, preview, topbar
  render-region). Tiling must release it on exit AND on export/bucket/preview entry
  (compute() doesn't run during export).
- Adaptive change touches **ADR-0061** (`ignoreAccumDrop` was deliberately `true`); re-enabled
  to `false` to distinguish invalidating vs display-only gestures. Watch for one-shot
  preset/param changes engaging adaptive briefly (should be fine — deep-accum protects).

## Open issues + next steps (prioritized)

1. **VERIFY the last 2 fixes** (post-process re-render; stale flash) before anything else.
2. **Black-frames-after-move (deferred):** the right fix is the **altitude move** — make the
   accumulation buffer valid across a resize (blit old→new in `resize()` / a proper
   content-preservation invariant) instead of the capture/seed dance. Would delete most of
   the seed machinery and kill the black AND stale classes together.
3. **M5b — FPS-target slider + adaptive band size** (the original ask). The cost EMA is now
   accurate. Static EMA-derived band count first (`bandRows ≈ targetFrameMs/fullResFrameMs`),
   AIMD later. `BandScheduler.nBands` is currently fixed at 24.
4. **Render-region refinement:** tile *within* the region box rather than standing down (user
   request).
5. **Cleanups (deferred):** remove unused `maybeSeedAfterResize`; `copyTextureToTexture` for
   the seed blit; the pipeline-owns-`renderTiledBand()` refactor (would make the whole thing
   a transaction instead of `compute()` poking pipeline internals).
6. **M4 — bloom at pass boundaries** (deferred; not blocking).

## Extra notes for the next session

**Edit the right engine tree.** Shared engine files live in `engine/` (engine-core);
`engine-gmt/engine/` mostly RE-EXPORTS them (`engine-gmt/engine/RenderPipeline.ts` is just
`export * from '../../engine/RenderPipeline'`). The pipeline/seed/cap/adaptive changes are in
`engine/RenderPipeline.ts` and `engine/AdaptiveResolution.ts` — edit those, not the GMT re-exports.

**`test:render` harness + tiling.** With tiling on by default, the full-engine render sweep
captures mid-band-sweep frames, not converged thumbnails. Set `progressiveTilingEnabled=false`
(or wait for convergence) for deterministic captures. That harness runs to the real GPU
(`--gpu`); headless SwiftShader is CPU and slow.

**Worker loop ownership (matters for M5b).** Idle tiling is MAIN-THREAD-TICK-DRIVEN today: R3F
`useFrame` → `RENDER_TICK` → worker renders ONE band per tick (coalesced to latest). There is
NO worker-`requestAnimationFrame` loop — it was deferred. M5b likely wants a worker-rAF
self-driven loop for vsync back-pressure and true GPU-idle when converged (today the worker
still processes ticks + blits when converged; only the raymarch idles).

**M5b inputs (already wired — just consume).** FPS signal = main-thread 500ms sampler
(`GmtRendererTickDriver.tsx` ~231, `viewport.reportFps`). Cost estimate = AdaptiveResolution's
`fullResFrameMs` EMA (now accurate). Initial band count ≈ `clamp(targetFrameMs / fullResFrameMs
× screenRows)`; AIMD off the FPS sampler to refine. `BandScheduler` takes a fixed `nBands` (24)
in its ctor — make it settable + regenerate the center-out order at a pass boundary.

**Adaptive change blast radius.** The `ignoreAccumDrop:false` + `sessionHoldActive` change is at
GMT's `UniformManager` call site only — sibling apps (fluid-toy, gradient-explorer) drive the
shared `tickAdaptiveResolution` via `gateOnAccumOnly` (a different path), so they're unaffected.
Side effect to watch: fractal-slider frames now engage adaptive via accum-drop but DON'T feed
the cost EMA (it samples `sessionHoldActive` frames only) — minor; camera moves feed it.

**Review-findings status** (7-angle review):
- FIXED: export-corruption, topbar render-region, preview-strip, sample-cap runaway count, cap
  off-by-one, seed-stale-on-formula-change, ghosting, post-process re-render.
- FIXED for capped scenes (count plateaus → idle detection + export estimate OK); infinite-cap
  still grows the count (pre-existing — idle detection moot there). RegionOverlay
  convergence-never-settles is moot (tiling stands down for render-region).
- DEFERRED: capture-once-at-transition / seed alloc-churn; `costSampleInteractingOnly` gating
  for the tiling-disabled case; copyTextureToTexture/shared-blit; `setUniform` fanout;
  pipeline-owns-`renderTiledBand()` refactor; **`resize()`-preserve-content (= the black-frames fix)**.

**Repro the deferred black-frames:** a held move (DOF-off camera) on a heavy scene that makes
adaptive downscale — the low→full resize at the handoff blanks the buffer and a held move
captures no fresh frame, so bands fill from black for ~0.4s.

## Commands

- `npm run typecheck` / `npm run test:baseline` / `npm run test:hybrid` — all green as of
  handover. Run from `h:/GMT/workspace-gmt/dev` (cwd resets to `stable` between turns — always
  `cd` first).
- Toggle tiling off for A/B or a stable fallback: `FractalEngine.progressiveTilingEnabled = false`.

## Git

Everything is **uncommitted on `main`**. Recommend: branch (`feat/tiled-progressive`) +
commit before continuing, so this isn't lost and the diff is reviewable.
