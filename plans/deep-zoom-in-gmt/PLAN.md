# Deep zoom in GMT - the merged route

W = `H:/GMT/workspace-gmt/stable/.claude/worktrees/deep-zoom`. Page = `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (branch `kernel-perf`).
Written 2026-10-07 by the judge of three plans. Nothing was run; every code claim below comes from the planners' checks or the three studies beside this file (`HANDOFF-MAPPING.md`, `CORE-EXTRACTION.md`, `FORMULA-ELIGIBILITY.md`), which quote the symbols they read.

## Summary (10 lines)

1. Route: hand the scene across first (two tabs), then make the page a module, then show that module inside GMT's viewport, then save and animate it. Perturbation inside GMT's own marcher stays last and is not scheduled.
2. Stage A (about 5 sessions): "Open in Deep Zoom" from a plain Mandelbulb scene in app-gmt. Same position, power, phase, gradient. Works on the level-1 iframe tool, no page change needed.
3. Stage K (about 1 session, in the page's repo): four small page handles - field of view, a smoothed-distance reset in `setView`, a pause, and three names the test suites read bare.
4. Stage X (3 to 4 sessions, in the page's repo): the page becomes `createDeepZoom(canvas, options)`. No new maths. `CORE-EXTRACTION.md` sizes it; it is much smaller than the "1 to 2 weeks" two planners assumed.
5. Stage D (1 day of measurement, then 5 to 7 sessions): deep mode in app-gmt's viewport. Gated on one GPU measurement: three WebGL contexts alive at once on real d3d11.
6. Stage E (about 1 week, 2 ADRs): the exact camera in scene files, a dive as one timeline track.
7. Stage F (2 to 4 months for the Mandelbulb alone, per `debug/scratch/dz-wf1-result-1.txt`): native perturbation in GMT's marcher. Only a cheap contract proof (F0, F1) is planned; the rest is an owner decision.
8. Limits through stage E: Mandelbulb only, whole-number power 2 to 16, Z Twist 0, Radiolaria off, no Julia, no hybrid, no pre/post rotation. GMT's path tracer, volumetrics and materials do not follow.
9. The picture changes at the hand-over: different lighting code, and the page's field of view is fixed at 34.1 degrees vertical against GMT's default 60 (1.88x tighter) until K1 lands.
10. Not received: the third planner's text (native perturbation first) and the last one and a half checks of the module plan were cut off in my input. Stage F is built from result-1 and `FORMULA-ELIGIBILITY.md` instead; the gaps are marked 'unverified' where they matter.

## The stages

### Stage 0 - level 1 lands (other team, in progress)
The `deep-zoom` engine app embedding the page in an iframe (`W/deep-zoom/**`, `W/deep-zoom.html`, `W/public/deep-zoom-core/index.html`). Everything below assumes its typecheck, build and GPU smoke are green.

### Stage A - hand a scene across (two tabs)
- **User gets:** File > "Open in Deep Zoom" in app-gmt. A new tab opens at the same place with the same power, phase and gradient 1, and keeps going from 1e-6 to about 1e-77. An ineligible scene gets a toast naming the reason (Z Twist, Radiolaria, Julia, hybrid, non-whole power, pre/post rotation, not a Mandelbulb). Later in the stage: "Open in GMT" from a saved deep location, landing at GMT's nearest safe distance (1e-5) on the same line of sight, and saying so.
- **Cost:** about 5 sessions (A1 to A5), plus one split-image check with the owner.
- **Must be true first:** stage 0 landed. Nothing in the page changes.
- **Known gaps on day one:** framing is 1.88x tighter than GMT's default (fixed by K1); camera roll is dropped and reported; a default scene's gradient 1 is a single white stop, so the deep tool keeps its own gradient unless the scene has a real one.

### Stage K - four small page handles
- **User gets:** matching framing after the hand-off; correct fly speed when a view is pushed into an already-running page; no GPU work from a hidden page.
- **Cost:** about 1 session in the page's repo, plus the page's own suites (`npm run verify`, per `CORE-EXTRACTION.md` section 10).
- **Must be true first:** the owner agrees that an agent may edit the page on `kernel-perf`, or does it himself (decision 2).
- Can run in parallel with stage A; A does not wait for it.

### Stage X - the page becomes a module
- **User gets:** nothing visible. The owner gets one master instead of a page plus a vendored copy, and GMT gets something it can mount on its own canvas.
- **Cost:** 3 to 4 sessions (`CORE-EXTRACTION.md` section 11): steps 1 to 5 mechanical in one session, UI split half a session, the factory wrap one session, host API one session.
- **Must be true first:** the owner's colour work on `kernel-perf` is at a stopping point; the suites can load the page over http (unverified - `CORE-EXTRACTION.md` step 0).
- Level 1's iframe keeps working throughout, because the `window.__` names stay behind a shim.

### Stage D - deep mode inside app-gmt's viewport
- **User gets:** on an eligible Mandelbulb scene, when the camera is near 1e-5, a HUD line offers "Continue in deep mode". The deep picture replaces GMT's in the same viewport; Formula power and phase and Gradient 1 keep driving it; leaving returns to GMT's marcher at a safe view as one undo step.
- **Cost:** 1 day of measurement (D0), then 5 to 7 sessions (D1 to D5).
- **Must be true first:** D0 says go; stage A's converter (A1) exists; stage K's pause and smoothed-distance reset exist. Built on the module (stage X) if it is ready, else on the iframe behind `?deep=1`.
- **If D0 says no-go:** deep mode unmounts GMT's renderer while active (a full worker restart on return, seconds, accumulation lost), or stays a separate tab. Stages A, K, X are unaffected.

### Stage E - saves and the timeline
- **User gets:** a GMT scene saved in deep mode reopens at the exact view; a recorded dive is one track on GMT's timeline that can be scrubbed.
- **Cost:** about 1 week, two ADRs (string-encoded exact camera field; a float track that indexes app-owned pose data).
- **Must be true first:** stage D. Mixed GMT-and-deep video export stays research (E3) and is not sized.

### Stage F - perturbation in GMT's own marcher (not scheduled)
- **User gets (if ever built):** deep zoom with GMT's real look, and a path to more formulas.
- **Cost:** 2 to 4 months for the Mandelbulb alone, then 1 to 3 weeks per further smooth formula, open-ended for fold formulas (result-1 section (d)). The open problem is secondary rays (shadows, AO, reflections, path tracing) under perturbation.
- **Planned now:** only F0 (a gallery count of which formulas people use) and F1 (the per-formula contract proved on Mandelbar3D, the easiest maths - `FORMULA-ELIGIBILITY.md` section 3). Both are cheap and both inform decision 1.

## What the checks changed

Hand-off plan:
1. **"Same place in both renderers" - partly.** Same map, axes and handedness hold (`formula_Mandelbulb` in `W/engine-gmt/formulas/Mandelbulb.ts` against the page's `deMandelbulb`; `basis()` at yaw -pi/2, pitch 0 is an identity three.js camera). Failed: field of view (page fixed at 34.1 degrees; the planner's "63" was a misreading of `uv.y` spanning +-0.5), roll (page has yaw and pitch only), and rotations (`applyPreRotation` / `applyPostRotation` in `W/engine-gmt/shaders/chunks/math.ts` run inside the loop). Consequence: A1 reads `optics.camFov`, drops and reports roll, and refuses pre/post rotation; K1 adds a FOV setter. Which store fields feed the rotation matrices is unverified and is A1's first step.
2. **"Iframe layer inside the viewport" - partly.** Mounting, sizing and keyboard separation hold. Failed: it is three WebGL contexts, not two (worker canvas, R3F overlay, page); `setIsPaused` is soft (`FractalEngine` keeps rendering about 1 s after any wake, bucket renders ignore it); the page has no pause handle. Consequence: D0 is a measurement, not a build; D1 adds a real suspend gate; K3 adds a page pause.
3. **"`setView` applies a view fully" - partly.** The 2^256 fixed-point format holds exactly (`makeHP`, `fromNum`). Failed: `setView` does not touch `smoothedDist`, which only rises at 1.2/s, so a jump to a shallower view in a running page flies slowly and may stay in deep mode for seconds; auto iterations only ever rise. Consequence: the converter always sends `iters`, power and phase; K2 resets the smoothed distance. A fresh tab starts at 1.0, so stage A does not need K2.
4. **"A preset fragment can be applied at runtime" - partly.** `applyPartialPreset` (`W/engine-gmt/utils/applyPartialPreset.ts`) does not carry the camera and resets every other param of a listed feature to default. Consequence: the return trip (A5, D3) calls feature setters with only the changed keys inside one param transaction, and writes the camera by mirroring `loadPreset`'s `CAMERA_TELEPORT` + `OFFSET_SET` emits. `gradientAt` returns null for a flat gradient, so A3 uses its own reader.

Module plan:
5. **"The script wraps into a factory mechanically" - partly.** One classic script, no inline handlers, no eval. Failed: `look-stats.mjs` reads bare names (`basis`, `keyLightDir`, `colorScale`); about 6 top-level sites assume the page's DOM and URL; about 100 `window.__` handles would land on GMT's own window. Consequence: K4 exports the bare names first; X3 turns the 6 sites into options; the handles are namespaced on the instance with a shim for the standalone page.
6. **"GMT's worker can be idled" - partly.** No teardown is needed: the worker renders only on `RENDER_TICK`, sent from `GmtRendererTickDriver`'s `useFrame`. Failed: no external pause flag exists on that gate, and `display:none` would resize the worker to 1x1 through `GmtRendererCanvas`'s `ResizeObserver` and wipe accumulation. Consequence: D1 builds the gate after `runTicks()` and before `sendRenderTick`, hides by stacking, keeps the R3F `<Canvas>` mounted, gates `GmtNavigation`, and blocks snapshot and bucket render while suspended.
7. **"Strings ride the save system" - holds for save, load and share links** (`PresetField.serialize` returns any; `serializeScene` is `JSON.stringify`; `quantize` in `W/utils/UrlStateEncoder.ts` leaves strings alone). **The timeline half was cut off in my input:** whether the track picker can show a binder-only id is unverified. Consequence: E2 starts with that check and falls back to a hidden DDFS float.
8. **"Main-thread deep rendering is tolerable inside GMT" - check not received.** Unverified. `CORE-EXTRACTION.md` says three programs compile synchronously at load and the BigInt rebuild has no timing. Consequence: X0 records `compileMs` and a forced-rebuild time before anything is mounted in GMT; the worker move (X5) is optional and decided by those numbers.

## Ruled out, and why

- **Sharing GMT's canvas.** `WorkerProxy.initWorkerMode` calls `transferControlToOffscreen`, which is one-shot. A second canvas is the only option.
- **Using `proxy.isPaused` to idle GMT.** It wakes on interaction and ticks are still posted every frame.
- **`applyPartialPreset` for the return trip.** Resets the user's other params; does not move the camera.
- **A whole-scene load on return, as the normal path.** `loadPreset` clears undo history and the dirty baseline. Kept only as a last resort.
- **Shipping an iframe inside app-gmt as the product.** Acceptable as the D0 measurement rig and as a flagged fallback only; with extraction at 3 to 4 sessions, the module is the product path.
- **Waiting for native perturbation before giving the user anything.** 2 to 4 months for one formula against 5 sessions for stage A.
- **Copying `explorerHandoff.ts` for the deep-zoom trip.** Against "one source of truth"; A2 writes one generic helper. Whether the shipped GX trip moves onto it now or later is decision 6.
- **MengerSponge and other pure IFS formulas as deep-zoom targets.** Exactly self-similar; a wrap-around zoom shows the same thing (`FORMULA-ELIGIBILITY.md`).
- **Non-integer power and Z Twist in deep mode.** The page's kernel covers integer powers 2 to 16 with phase only.
