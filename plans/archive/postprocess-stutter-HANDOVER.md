# Post-process / PT-load stutter — Session Handover

Pick-up doc. The tiled-progressive renderer work is **committed and verified** (4 commits,
ending `2e545c4`). This session chased a **post-process slider stutter under Path-Tracing
load** and went down a wrong path. **All of this session's experiments were reverted** — the
tree is clean at `2e545c4`. This doc is what we learned so the next attempt doesn't repeat it.

## State

- `git log`: `2e545c4` (M5b phase-2 AIMD) is HEAD. Working tree clean, typecheck green.
- The committed renderer work (tiled idle rendering, adaptive band count, animation-interaction
  adaptive, FPS-closed-loop band count) is all user-verified and untouched.
- **Reverted this session** (do NOT just re-apply): a `skipFullResTrace` experiment and a
  `band-while-static` experiment in `FractalEngine.compute()`, plus temp instrumentation
  (`getAdaptiveScale`, a per-frame diag ring on the engine drained via `GET_RENDER_INFO`,
  `tilingDiag` on the `RENDER_INFO` message) and a `window.__loadSceneFile` dev hook in
  `app-gmt/main.tsx`. Temp harnesses `debug/diag-tiling.mts` + `debug/diag-postfx.mts` removed.

## The problem (still open)

User reports: adjusting **post-process effects** (bloom, saturation, droste) **stutters under
Path-Tracing load**, while "levels/bias does not stutter." Phrased it as "real, though not huge
GPU work." Latest, most important clue: a bloom adjustment **was not converging** — the
path-traced image stayed noisy while being adjusted.

## What we established by measurement (trust these)

Built a headed-Chrome + GPU harness driving real interaction-bracketed slider drags, with a
per-frame engine ring buffer (scale / resolution / tiling / held / accum). Findings:

1. **droste is display-only.** It's a `postShader` ([droste/index.ts:244]) whose `mainUV` warps
   `sampleUV` in the **display blit** ([shaders/chunks/post_process.ts] — `texture(map, sampleUV)`),
   and **every droste param is `noReset`**. It does NOT touch the raymarch. Same class as bloom
   (a `BloomPass` in `handleRenderTick`) and saturation (colorGrading). My earlier "droste warps
   the trace" claim was wrong.
2. **Display-only drags do NOT produce full-res traces** in Direct OR PT mode — measured 0 traces,
   smooth 59.5 p5 in Direct. So the renderer's raymarch is not the cost during these drags.
3. **Scene-CHANGING drags (e.g. power/paramA) DO stutter under PT** — 147 full-res PT traces at
   `scale=1` (adaptive never downscales a slider drag), p5 collapsed to ~12–20. This is a *real*
   renderer issue but is **not** the post-process one the user is reporting.
4. The harness drives the store directly (`setPostEffects(...)`), so it **never re-renders the
   effects panel UI**. So a main-thread/React panel re-render during a real DOM slider drag is a
   live hypothesis it could not rule in or out.

## Two approaches tried — both wrong (do not repeat)

- **Skip the trace when static+interacting+full-res** → smooth, but **froze PT convergence**:
  the noisy path-traced image couldn't refine while you adjusted bloom. User rejected ("bloom is
  a fail because wasn't converging").
- **Band while static (relax tiling gate to `!interacting || sceneStatic`)** → intended to keep
  converging cheaply. User observed **"there was no banding, you've broken it"** on the real PT
  test scene (running ~15–30fps). Reverted.

## Important corrections from the user (constraints for next time)

- **Test on the real scene:** `H:\GMT\assets\testScene.png` (PNG with embedded GMF, path-traced).
  Load it, don't test the default boot scene.
- **Do NOT globally pre-enable droste.** "droste is also a fail — it switches on before path
  tracer kicks in." Enabling a postShader effect while in Direct/preview and then switching to PT
  appears to misbehave; that's a *separate* bug worth its own look. Only exercise effects as
  transient drags on an already-live PT scene.

## Likely real diagnosis (unconfirmed — start here)

The renderer is *not* re-tracing during display-only drags, yet the user feels a stutter under PT.
Two candidates remain, in order of likelihood:

1. **Main-thread / React:** the effects panel re-renders every frame as the slider's `onChange`
   fans out through the store. This matches "not huge GPU work." **Next step:** measure a **real
   on-screen slider drag with the panel open**, capturing React commit time (the `bench-perf.mts`
   harness already has `BenchProfiler` boundaries + store-notify + long-task capture). Confirm
   whether the post-process panel's components re-render per frame, and narrow their store
   subscriptions / memoize if so. This is a UI fix, not a renderer fix.
2. **Convergence cadence under PT:** idle PT convergence is itself banded and slow (~30fps, accum
   climbs ~8 per 150 frames on the test scene). If the user expects the image to be *clean* while
   adjusting an effect, that's a PT-speed expectation, not a per-drag bug. Worth confirming what
   "waiting for convergence" means precisely (a UI indicator? visible noise?).

## The one real renderer bug found (separate, lower priority)

Scene-changing **slider** drags (power, etc.) run full-frame at `scale=1` under PT because adaptive
only downscales camera/gizmo/scrub gestures, not `slider`-source drags (the cost EMA is sampled on
`sessionHoldActive` frames only — `costSampleInteractingOnly` in `UniformManager`). Fix direction:
let a scene-changing full-frame re-trace feed the cost EMA + engage adaptive, while still excluding
tiled bands. Verify with the harness (success = `scale > 1` during the drag, p5 recovers).

## How to recreate the measurement harness

- Headed real-GPU Chrome via Playwright (`channel:'chrome', headless:false`), viewport 1920×1080.
  Pattern is in `debug/bench-perf.mts` (boot gate on `__gmtProxy.accumulationCount`, store via
  `window.__store`, worker RPC via `__gmtProxy.getRenderInfo()`).
- To drive an effect like the real slider raises `interacting`: bracket the store calls with
  `store.getState().beginInteraction('slider')` … `pokeInteraction('slider')` each frame …
  `endInteraction('slider')`. (Driving the store WITHOUT this leaves `interacting=false` and
  everything bands — that mistake invalidated the first run.)
- To load the scene you need a hook: re-add `window.__loadSceneFile = loadSceneFile` (from
  `engine/plugins/SceneIO`) in `app-gmt/main.tsx`, then in-page build a `File` from the PNG bytes,
  `await __loadSceneFile(file)` → `__store.getState().loadScene({ preset })`.
- For a real-DOM measurement (the recommended next step), open the effects panel and drive the
  actual slider element with pointer events; capture React via the existing `BenchProfiler` taps in
  `bench-perf.mts`.

## Recommendation

Start with the **React-panel measurement (candidate #1)** — it's the only layer not yet measured,
and it's the only difference between the (smooth) store-driven harness and the (stuttery) real
drag. If it's the panel, the fix is UI-side (subscription narrowing / memoization), entirely
outside the renderer. Keep the renderer at `2e545c4` until that's confirmed.
