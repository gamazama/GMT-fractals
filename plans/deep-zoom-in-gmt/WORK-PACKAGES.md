# Work packages, in execution order

W = `H:/GMT/workspace-gmt/stable/.claude/worktrees/deep-zoom`. Page = `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html`.
Ids are stable and prefixed by stage (A hand-off, K page handles, X extraction, D in-viewport, E saves and timeline, F native). Sizes are focused sessions. "Old id" names the planners' packages each one merges; in stage F the old ids WP0a to WP12 are the native plan's (`W/debug/scratch/dz-wf2-plans.json`, label "plan: native-per-formula").

**First three to run: A1, A2, A3** (then A4 straight after). K1-K4 can go to the owner's own `kernel-perf` session in parallel; they block nothing in stage A. So can the two native spikes, F3 and F4 (2 to 3 sessions, in the page): their result should be known before D4 is started.

Rule for every package: a smoke that covers a panel must open the panel. GPU checks run headed on real d3d11, not SwiftShader.

---

## A1 - Pure view conversion and eligibility  [FIRST]
- **Stage:** A. **Old ids:** WP1, C3. **Depends on:** nothing. **Size:** 1 session.
- **Files and symbols:** NEW `W/deep-zoom/handoff.ts` (`gmtToDzView`, `dzViewToGmt`, `isDeepZoomEligible`, `f64ToFixed256`, `fixed256ToF64`); NEW `W/debug/test-dz-handoff.mts`. Reads: `DzView` in `W/deep-zoom/bridge.ts`; `defaultPreset` and params `paramA`, `vec2A`, `paramD`, `vec2B` in `W/engine-gmt/formulas/Mandelbulb.ts`; `makeHP` / `fromNum` in the page; `optics.camFov`.
- **Steps:** follow the sketch in `HANDOFF-MAPPING.md` section 4.
  1. Trace which store fields drive `uWorldRotMatrix` / `uPreRotMatrix` / `uPostRotMatrix` (`W/engine-gmt/shaders/chunks/math.ts`) - unverified today - and add them to the eligibility predicate. Pre/post rotation refuse. World rotation refuses in this version.
  2. Position: `fromNum(cameraPos) + fromNum(sceneOffset high) + fromNum(low)` per axis, each converted separately and summed as BigInt. Never pre-sum as doubles.
  3. Orientation: `f = q*(0,0,-1)`, `pitch = asin(f.y)`, `yaw = atan2(f.z, f.x)`; reverse `q = qY(-(yaw + pi/2)) * qX(pitch)`. Roll is dropped and listed in `lost`. Pitch beyond +-1.55 rad is clamped and listed.
  4. Always include `iters`, `power`, `phase` in the view (the page's auto-iterations only rise). Include `fovTanHalf` from `optics.camFov` even though the page ignores it until K1.
  5. Refusals with named reasons: `not-mandelbulb`, `non-integer-power`, `z-twist`, `radiolaria`, `julia`, `hybrid`, `rotation`.
  6. Reverse: if depth is under 1e-5, back out along the look ray to 1e-5 and return `{clamped:true, from, to}`.
- **Acceptance:** `npx tsx debug/test-dz-handoff.mts` (node only, no GPU) passes the five test vectors in `HANDOFF-MAPPING.md` section 5, plus the one-iteration CPU comparison of both formulas at (0.3, -0.5, 0.7), power 8, phase (0.4, -0.2), equal to 1e-12. Goes red if the high+low sum is rounded through a double, the fixed-point scale is wrong, or a refusal is missing.
- **Risk:** low. The test does not prove the two renderers show the same picture; that is A4's split image.

## A2 - Generic one-shot tab hand-off helper  [FIRST]
- **Stage:** A. **Old ids:** WP2. **Depends on:** nothing. **Size:** 1 session (half if GX is left alone).
- **Files and symbols:** NEW `W/store/tabHandoff.ts` (`writeOneShot`, `takeOneShot`, trip ping/answer) with top-of-file JSDoc; key family `gmt.dz.incoming` / `gmt.dz.outgoing`. Reference: `W/palette/core/explorerHandoff.ts` (`writeExplorerIncoming`, `takeExplorerIncoming`, `answerExplorerTrips`, `pingExplorerTrip`).
- **Steps:** write the generic helper with the same behaviour as the explorer trip (one-shot localStorage key, 2-minute TTL, trip id). Whether `explorerHandoff.ts` becomes a thin wrapper now or later is OWNER-DECISIONS 6; default in this package is "later", with a `@stale` note at the top of `explorerHandoff.ts` naming the helper.
- **Acceptance:** a node test: a one-shot is consumed exactly once and is gone after the TTL. If GX is moved onto it: `npx tsx debug/smoke-gmt-gx-handoff.mts` stays green; red if key names or timing changed.
- **Risk:** low when GX is untouched; medium if lifted (shipped behaviour).

## A3 - "Open in Deep Zoom" in app-gmt  [FIRST]
- **Stage:** A. **Old ids:** WP3. **Depends on:** A1, A2, stage 0. **Size:** 1 session.
- **Files and symbols:** NEW `W/app-gmt/deepZoomTrip.ts` (`openDeepZoomFromGmt`); EDIT `W/app-gmt/main.tsx` (one `menu.registerItem('file', { id:'open-deep-zoom', type:'button', order: 40.5, onSelect })`, beside `share-link` at order 40). Uses `stashLiveScene`, `showToast`, `useEngineStore`.
- **Steps:** on select read formula id, `coreMath`, `sceneOffset` (x/y/z and xL/yL/zL), `cameraRot`, `optics.camFov`, gradient 1. Run `isDeepZoomEligible`; on refusal toast the named reason and stop. Else stash the scene, write the one-shot `{view, gradientRamp, sceneName, trip}`, open `deep-zoom.html?trip=...` with a relative URL. Gradient: its own reader, not `gradientAt` (which returns null for a single-stop gradient); a flat gradient sends none and the tool keeps its own.
- **Acceptance:** NEW headed smoke `W/debug/smoke-gmt-dz-handoff.mts`, modelled on `smoke-gmt-gx-handoff.mts`: boot app-gmt, click File > Open in Deep Zoom, assert the new page's `__dz.getView().power === 8` and its cam strings equal `gmtToDzView` of the default preset; set `paramD = 0.3`, assert no tab opens and the toast names Z Twist. Red if the menu item, key or conversion breaks.
- **Risk:** whether a menu item can be disabled per formula is unverified; the fallback (always shown, refuses with a reason) is what this package builds.

## A4 - Deep-zoom tool accepts the incoming view, and the split-image check
- **Stage:** A. **Old ids:** WP4, WP6. **Depends on:** A2, A3. **Size:** 1 session + a short check with the owner.
- **Files and symbols:** EDIT `W/deep-zoom/DeepZoomApp.tsx` (after `connectCore` resolves), `W/deep-zoom/store.ts` (`fromGmt` record), `W/deep-zoom/ui/TopBar.tsx` ("Back to GMT", shown only when `fromGmt` is set), `W/deep-zoom/bridge.ts` (NEW `DzBridge.setGradientRamp(rgba: Uint8Array)` - encode a 256x1 PNG with `encodePng` from `W/utils/pngCodec.ts`, hand it to the page's `__loadGradient`).
- **Steps:** `takeOneShot('gmt.dz.incoming')` -> `bridge.setView` -> `setGradientRamp` -> toast "From GMT: <scene>" plus what was lost (roll, framing). "Back to GMT" pings the trip; if the opener answers, close this tab, else navigate to app-gmt (the stash restores the scene).
- **Acceptance:** second half of the A3 smoke: after arrival `telemetry().depth` is within 2x of GMT's distance; a ramp that is red on the left half and blue on the right produces both a red-dominant and a blue-dominant pixel in a thumbnail and no green-dominant one. Plus ONE split image (left half GMT, right half deep tool, same camera, depth about 1e-2) for the owner. Before K1 the framing differs by 1.88x, so the image is cropped to the page's field of view. Red if `setView` runs before the core is ready or the ramp is not uploaded.
- **Risk:** colour space of the strip in the page's shading pass (sRGB or linear) is unverified; a wrong guess shows as a gamma shift on a mid-grey ramp.

## A5 - "Open in GMT" from a deep-zoom location
- **Stage:** A. **Old ids:** WP5. **Depends on:** A1, A2. **Size:** 1 to 2 sessions (includes a short spike).
- **Files and symbols:** EDIT `W/deep-zoom/ui/LocationsPanel.tsx` (row action); NEW `W/app-gmt/deepZoomReturn.ts`; EDIT `W/app-gmt/main.tsx` (one call after the store exists). Reads `loadPreset` in `W/store/engineStore.ts`, `W/store/createFeatureSlice.ts`.
- **Steps:**
  1. Spike (30 minutes): find an existing action that sets camera without a whole load (saved-camera recall is the likely place - unverified). Confirm in `createFeatureSlice.ts` that a feature setter merges a partial object rather than replacing.
  2. Formula: `setCoreMath({ paramA, vec2A })` and `applyGradientConfig(config, 1)` inside `beginParamTransaction` / `endParamTransaction`. Not `applyPartialPreset`.
  3. Camera: set `sceneOffset` + `cameraRot` + `targetDistance` and emit both `CAMERA_TELEPORT` and `OFFSET_SET`, as `loadPreset` does.
  4. If clamped, an inline line: "GMT can stand 1e-5 from the surface. This view is at 6.4e-53; GMT opens on the same line of sight, 1e-5 away."
- **Acceptance:** smoke: bookmark a view near 1e-3, press Open in GMT, assert the store has formula `Mandelbulb`, `paramA` equal to the view's power, `sceneOffset` equal to `dzViewToGmt` within 1e-12, and `coreMath.iterations` unchanged from before (proves no reset to defaults). Red if the fragment lands before the store is built or other params reset.
- **Risk:** lowest value in stage A (the return is lossy by construction). Can move later without blocking anything.

## A6 - "Deep Zoom" as a gradient destination
- **Stage:** A (late). **Old ids:** WP7. **Depends on:** A4. **Size:** 1 to 2 sessions.
- **Files and symbols:** EDIT `W/deep-zoom/main.tsx` (`registerSendTarget({ id:'deep-zoom', label:'Deep Zoom', group:'host', apply })` from `W/store/sendTargetRegistry.ts`, same shape as the targets in `W/app-gmt/registerFeatures.ts`); EDIT `W/deep-zoom/ui/LookPanel.tsx`.
- **Acceptance:** smoke opens the Look panel, picks the first favourite, asserts the thumbnail's dominant hue changes and `getSendTargets()` contains `deep-zoom`.
- **Risk:** whether the Favients panel mounts in the hand-built deep-zoom shell (no engine store) is unverified. If not, ship the send target only.

---

## K1 - Page: field-of-view setter
- **Stage:** K. **Depends on:** OWNER-DECISIONS 2. **Size:** part of 1 session with K2-K4.
- **Files and symbols:** Page: `const fovScale = Math.tan(0.5*1.1)` (hard-coded in at least two render functions and as `fovScale:1.1` in the path header); `window.__dz.setView`.
- **Steps:** make `fovScale` a variable; `setView` accepts `fovTanHalf`; the path header records the real value; default unchanged.
- **Acceptance:** the page's `npm run verify` stays green at the default; A4's split image at GMT's 60 degrees shows a silhouette offset under 2 px. Red if the default framing moved (the certified depths would shift).

## K2 - Page: `setView` resets the smoothed distance
- **Files and symbols:** Page: `smoothedDist`, `frame(now)`, `window.__dz.setView`, `pathApplyCR`.
- **Steps:** on `setView`, set `smoothedDist` from one immediate probe (or to a safe high value so the next frame's probe snaps it down).
- **Acceptance:** a page suite step: dive to 1e-20, `setView` to the whole bulb, assert `telemetry().depth` is above 1e-1 within 2 frames (today it climbs at 1.2/s). Red if stale.

## K3 - Page: pause handle
- **Files and symbols:** Page: the trailing `requestAnimationFrame(frame)`; NEW `__dz.pause(bool)`.
- **Acceptance:** with pause on, a frame counter does not advance over 500 ms; off, it resumes with no accumulation reset.

## K4 - Page: handles for the bare names the suites read
- **Files and symbols:** `look-stats.mjs` lines 33-34 (`basis()`, `keyLightDir`, `colorScale`); all 41 harness files' `page.evaluate` bodies.
- **Steps:** sweep every `page.evaluate` body for bare identifiers (only 16 names were sampled so far); add `window.__` handles; change the suites to use them.
- **Acceptance:** all page suites green with the script temporarily set to `type="module"` served over http (this is also `CORE-EXTRACTION.md` step 1). Red on any ReferenceError.
- **Sync:** after K1-K4, refresh `W/public/deep-zoom-core/index.html` and re-run level 1's smoke.

---

## X0 - Baseline numbers before extraction
- **Stage:** X. **Depends on:** OWNER-DECISIONS 2. **Size:** half a session.
- **Steps:** `CORE-EXTRACTION.md` step 0: record the suites green, one `__timeThumb` number, and the three programs' compile times (`compileMs`). Time `buildRefOrbit` + `uploadOrbit` per frame WHILE FLYING at 1e-12, 1e-30 and 1e-77 - not one forced rebuild: the page rebuilds on every movement frame (`mv()` sets `orbitDirty`; `frame()` then calls `buildRefOrbit(camHP, cam.iters + 2)`), and that per-frame cost is the number nobody has. Confirm how the suites load the page (file:// or http).
- **Already settled by check 8 (PLAN.md), so not measured here:** whether a slow tick trips GMT's guards. It does not - `DOUBLE_RUN_WINDOW_MS` in `W/engine/TickRegistry.ts` and `BOOT_WATCHDOG_MS` in `W/engine-gmt/renderer/GmtRendererTickDriver.tsx` were read and neither can fire from a blocking tick. Budget the cold first compile at about 15 s (the page's own comment), not 5.
- **Acceptance:** the numbers written into the page's HANDOFF: suites green, `__timeThumb`, three compile times, three per-frame rebuild times. The rebuild times decide X5; the compile times decide where in GMT's boot the module may be created.

## X1 - Module script, shaders, pure maths, path maths, handle block
- **Old ids:** A1, A2 (part), A3 (part). **Depends on:** X0, K4. **Size:** 1 session.
- **Steps:** `CORE-EXTRACTION.md` steps 1 to 5. About 1,900 lines moved, under 100 edited.
- **Acceptance:** `npm run verify`, `npm run panel`, `node accum-check.mjs`, `node export-smoke.mjs`, `node embed-smoke.mjs` green after each step, same numbers as X0. Red if any kernel text or uniform order changed.

## X2 - Split the page UI from the renderer
- **Depends on:** X1. **Size:** half a session. `CORE-EXTRACTION.md` step 6; panel-smoke guards it.

## X3 - `createDeepZoom(canvas, options)` and the host API
- **Old ids:** A2, B1 (part). **Depends on:** X2. **Size:** 2 sessions.
- **Steps:** `CORE-EXTRACTION.md` steps 7 to 9. The 6 page-assuming sites (canvas lookup, `EMBED` from `location.search`, the `document.body.innerHTML ... throw 0` failure path, `$id` lookups, `window.innerWidth/innerHeight` sizing) become options. Handles live on the instance; the standalone page re-publishes them on `window`. `__cam`, `__look`, `__march`, `__gate` stay the same live objects. Add `step(now)`, `start`/`stop`, `resize`, `dispose`, context-loss handling.
- **Three rules from check 8:** (1) when a host calls `step(now)` the module's own trailing `requestAnimationFrame(frame)` never runs - a second driver that reached `runTicks` is the one thing that would trip GMT's 1 ms double-run guard; (2) camera motion and path playback use a wall clock inside the module, not a delta handed in by the host (GMT clamps its tick delta to 0.1 s, the page clamps its own to 0.05 s); (3) no synchronous compile from `step` - every program goes through `mkProgAsync` and the instance reports a "compiling" state. Today `ensureVariant` can force one (`blaPending[key].finish()` / `mkProg(vSrc(b, t))`); under a host it must wait instead.
- **Acceptance:** all page suites green, plus a new suite: create, dispose, create again leaves exactly one WebGL context and no stacked frame loop; with `step()` driven by hand, a frame counter advances only when `step` is called (red if the internal loop is still alive); forcing the BLA variant on returns "compiling" and no single `step` call takes over 100 ms.
- **Risk:** the one step with real risk. Must not run while the owner is mid-edit on the same file.

## X4 - Deep-zoom tool mounts the module; where the module lives
- **Old ids:** B1, A3. **Depends on:** X3, OWNER-DECISIONS 2. **Size:** 1 to 2 sessions.
- **Files and symbols:** `W/deep-zoom/DeepZoomApp.tsx`, `W/deep-zoom/bridge.ts` (transport swap from iframe handles to the instance), `registerTick` in `W/engine/TickRegistry.ts`. The module goes under `W/engine-gmt/` (not `W/engine/`, which must stay free of fractal code). Keep the iframe path behind a query flag for a week. The registered tick is the module's only driver (X3 rule 1). Without `KHR_parallel_shader_compile` (Firefox) the first compile blocks for about 15 s once: show a notice before it starts (OWNER-DECISIONS 7).
- **Acceptance:** level 1's GPU smoke passes on the module path; mount, unmount, mount leaves one context and one registered tick. `npm run typecheck`, `npm run build` exit 0.

## X5 - Reference orbit in a worker (optional)
- **Old ids:** F2. **Depends on:** X1; only if X0 shows a per-frame rebuild over roughly 30 to 50 ms while flying (check 8's threshold; the first draft guessed 8 ms). **Size:** 2 to 3 sessions. Pattern: `W/engine/fractal/deepZoom/laRuntime.ts`.
- **Scope:** the BigInt orbit build (`buildRefOrbit`, and `blaBuild` if it is in the same path) in a plain Web Worker with no GL. NOT a move of the renderer into a worker with OffscreenCanvas: check 8 found no guard that needs it, and it would not help with a slow deep draw, which stalls the browser's one GPU process whichever thread issued it. The answer to that stall is the page's existing frame-size caps (720 / 1080 / 1440 px) and keeping GMT's renderer suspended (D1).
- **Acceptance:** page suites green; no main-thread task over 50 ms from the orbit during continuous flight.
- **Reused by:** F10 (the native route needs the same worker).

---

## D0 - MEASUREMENT: three contexts alive together
- **Stage:** D. **Old ids:** WP8, C1. **Depends on:** stage 0. Can run any time GPU is free. **Size:** 1 day.
- **Files and symbols:** NEW `W/app-gmt/DeepViewportLayer.tsx` behind `?deep=1` (throwaway rig); `W/app-gmt/AppGmt.tsx` (`<div ref={viewportRef}>` inside `<ViewportFrame>`).
- **Steps:** mount the level-1 iframe over `GmtRendererCanvas`. On real d3d11 measure: (a) deep fps with GMT's dispatch stopped vs running; (b) GPU memory with all three contexts at a large viewport; (c) no context loss and no TDR over 5 minutes of flight; (d) time from "enter" to first deep frame, preloaded vs on demand; (e) pointer lock and Esc both ways; (f) whether app-gmt's panels stay usable while the deep layer is flying at 1e-12, 1e-30 and 1e-77 - drag one slider and record the longest main-thread task (the same-origin iframe shares GMT's main thread, so this rig measures what the module will do). Check 8 could not find this number anywhere.
- **Acceptance:** a table of the six results and a go/no-go. Go = deep layer within 10% of the standalone tool's fps with GMT stopped, no context loss. A long task over about 50 ms in (f) is not a no-go: it triggers X5.

## D1 - Suspend gate for GMT's renderer
- **Old ids:** C1, C2 (part). **Depends on:** D0 go. **Size:** 1 to 2 sessions.
- **Files and symbols:** `useFrame` in `W/engine-gmt/renderer/GmtRendererTickDriver.tsx` (`wantsRender`, `sendRenderTick`, `lastInvalidateRef`, `proxy.invalidateConvergedMirror`); the `ResizeObserver` in `W/engine-gmt/renderer/GmtRendererCanvas.tsx`.
- **Steps:** a new "renderer suspended" input checked after `runTicks()` and before `sendRenderTick`, overriding every `wantsRender` term. Resume does what the existing wake does. Gate the resize path while suspended. Not `proxy.isPaused`. Block snapshot and bucket render while suspended (consumers of `#gmt-render-canvas` are unverified - trace first). Also trace what reads `viewport.reportFps(t.fps)` (same `useFrame`): it feeds the main-thread frame rate to the adaptive loop, and a deep renderer on the main thread will lower it, so while suspended it must not drive GMT's adaptive resolution or its performance warning (unverified - check 8). Expose it as a generic engine-gmt seam, not a deep-zoom flag.
- **Acceptance:** NEW smoke: suspend, assert zero `RENDER_TICK` posts over 1 s while an LFO is running and the sample cap is 0; resume, assert the frame count advances and the accumulation count was not reset. Red if any term still dispatches.

## D2 - `deepZoom` feature, the layer, and panel sync
- **Old ids:** WP9, C2, D1 (part). **Depends on:** D1, A1, A4, K3; X4 preferred. **Size:** 2 sessions.
- **Files and symbols:** NEW `W/engine-gmt/features/deepZoom.ts` (`defineFeature`: `active`, `detail`, `reach`; registered in `W/app-gmt/registerFeatures.ts` before the store is built); NEW `W/app-gmt/deepZoomSync.ts`; the layer as a sibling inside `viewportRef`, created lazily on first enable, stacked through the tier scale (no raw z-index).
- **Steps:** subscriber maps `coreMath.paramA` -> power (whole number), `vec2A` -> phase, gradient 1 -> ramp, `detail`/`reach` -> the page's setters. Sliders stay runtime. Eligibility comes from A1's predicate through a registered handler, not an inline formula-name test in shared code.
- **Acceptance:** smoke with deep mode on: set `coreMath.paramA` to 5 through the store, assert the renderer's power is 5 within 500 ms; undo, assert 8. `npm run test:compat`, `npm run smoke:boot`, `npm run smoke:chrome`, `npm run check:zindex` stay green. Red if the feature registers after store construction.

## D3 - Enter and leave deep mode
- **Old ids:** WP10, C3 (part). **Depends on:** D2, K2. **Size:** 1 to 2 sessions.
- **Files and symbols:** NEW `W/app-gmt/deepZoomMode.ts` (`enterDeep`, `leaveDeep`); HUD line via `installHud`; `handleBlur` in `W/engine-gmt/navigation/useInputController.ts`.
- **Steps:** enter: `gmtToDzView` -> `setView` -> show layer -> suspend GMT -> gate `GmtNavigation` -> focus the layer. Leave: `dzViewToGmt` (clamped to 1e-5) -> camera write as in A5 as ONE undo step -> hide -> resume -> `exitPointerLock`, parent `window.focus()`, clear held keys. The offer is never automatic. Where the main thread reads the live surface distance is unverified (result-1 names `WorkerDepthReadback.ts`).
- **Acceptance:** smoke: enter from the default Mandelbulb, dive to 1e-12, leave; assert GMT's camera is finite, its surface distance is 1e-5 within 3x, one undo returns the pre-deep camera exactly, the frame count advances, and W/A/S/D move GMT's camera again. Red if GMT stays suspended or the write is more than one transaction.

## D4 - GMT's light rig into the shading pass
- **Old ids:** F1 (lights half). **Depends on:** D2. **Size:** 2 sessions. States which GMT light types have no equivalent. Materials, environment maps and the path tracer do not map.
- **Acceptance:** smoke: change a GMT light colour, read a deep pixel, the expected channel changes.

## D5 - Page controls as DDFS features
- **Old ids:** D1. **Depends on:** D2 (and X4 for the tool). **Size:** 3 sessions. The page's `CTLS` table (about 40 rows) -> features and manifest panels; hand-built controls in `W/deep-zoom/ui` that it replaces are deleted.
- **Acceptance:** round trip: set three params, undo twice, save a preset, reload, values equal; keyframe one and scrub.

---

## E1 - Exact camera in the scene file
- **Stage:** E. **Old ids:** WP11, E1. **Depends on:** D3. **Size:** 1 to 2 sessions + ADR.
- **Files and symbols:** `PresetField` and `presetFieldRegistry` in `W/utils/PresetFieldRegistry.ts`; pattern `W/engine-gmt/store/gmtPresetFields.ts`.
- **Steps:** field `deepView` = three decimal strings + yaw, pitch, bits 256, written only while deep mode is active; the clamped f32 camera is saved too, so older builds open a sane view. Check 7 confirmed the route (`serializeAll` copies any value that is not undefined; `serializeScene` is `JSON.stringify`) and found three rules: register the field at install time, before `createEngineStore`, or it throws `PresetFieldFrozenError`; the key must not start with `is` (`getDiff` and `quantize` in `W/utils/UrlStateEncoder.ts` drop such keys silently - `deepView` is fine); every exact value is a string, never a number (share links cut numbers to 5 decimals).
- **Acceptance:** node test: a 78-digit cam string survives serialise, parse, deserialise byte-identical, through `quantize` and `getDiff` in `W/utils/UrlStateEncoder.ts`, and through the PNG metadata leg (`W/utils/pngMetadata.ts` - the one leg check 7 did not read). Smoke: save at 1e-30, reload, depth within 2x. Red if any stage passes through `Number()`, or if the key is renamed to start with `is`.

## E2 - A dive as one timeline track
- **Old ids:** WP12, E2. **Depends on:** E1. **Size:** 2 to 3 sessions + ADR.
- **Files and symbols:** `binderRegistry` in `W/engine/animation/binderRegistry.ts`; `getBinder` in `W/engine/AnimationEngine.ts`; `addTrack` in `W/store/animation/sequenceSlice.ts`; patterns `W/hooks/useTrackAnimation.ts` and `recordPickKeyframes` in `W/engine-gmt/hooks/useInteractionManager.ts`; precedent for a non-DDFS id: `camera.unified.*` in `W/engine-gmt/animation/cameraBinders.ts`; `W/utils/timelineUtils.ts`.
- **Steps:** check 7 settled the opening question, so there is no "check first" step and no hidden DDFS float. There is no track picker that lists binder ids (`binderRegistry.list()` has no UI consumer); tracks are made by code. So:
  1. Register a binder for `dzPath.u` at install time, with E1's field, before `createEngineStore`.
  2. Ship one small control in the deep-mode UI, "key path position", that calls `addTrack('dzPath.u', label)` and `addKeyframe`. `addTrack` makes a float track for any id.
  3. Read `W/utils/timelineUtils.ts` to the end: it special-cases `camera.unified`, `camera.rotation` and `featureRegistry.get(parent)`, so a `dzPath.*` row may land in a fallback group in the dope sheet and graph editor and need a label case (unverified).
  4. Position interpolation stays in the renderer (arc-length Catmull-Rom on BigInt); the timeline only holds a number. Needs a pure `seekPath(u)` with no frame loop.
- **Acceptance:** smoke: record a dive to 1e-12; at three playhead positions the depth is monotonic and equal across two runs. Red if playback depends on wall-clock time. Plus a node test that a `binderRegistry` entry wins over name inference for an id that also parses as a feature param: `getBinder`'s lookup order is only an `@assumption` in the source, and this track depends on it. Falsify by moving the `binderRegistry.lookup(id)` line below the inference chain.
- **Risk:** lower than first written - no engine type change and no new track type. What is left is the dope-sheet grouping in step 3.

## E3 - RESEARCH: exporting an animation with a deep section
- **Old ids:** WP13. **Depends on:** E2. **Size:** 1 day to decide. Until then the product says "Deep sections export as a PNG sequence."

---

## F0 - Which formulas do people use
- **Stage:** F. **Depends on:** nothing. **Size:** under an hour, by the owner or with his database access. Count gallery scenes per formula id. Replaces the guess in `FORMULA-ELIGIBILITY.md` section 3 with a number and feeds OWNER-DECISIONS 1.

## F1 - RESEARCH: the per-formula contract, proved on Mandelbar3D
- **Depends on:** X1 (the kernel as modules), OWNER-DECISIONS 1. **Size:** about 1 week, in the standalone page, not in GMT.
- **Steps:** per `FORMULA-ELIGIBILITY.md` section 4: a formula supplies a BigInt reference step, a GLSL delta step, its extra reference rows, and a parameter envelope. Prove it on the easiest maths (an exact polynomial delta, no trig).
- **Acceptance:** the page's direct-check referee passes for Mandelbar3D at three depths down to 1e-30.

## F2 - Native perturbation in GMT's marcher
- Not sized here beyond result-1's 2 to 4 months for the Mandelbulb. Not started without OWNER-DECISIONS 1.
