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
- **Serves both routes:** a second formula in the page's renderer, and the shape of `shader.perturbed` in F6. Whichever of F1 and F6 runs first fixes the contract; the other adopts it.

## F2 - Native perturbation in GMT's marcher: the go/no-go
- **Old ids:** the native plan as a whole. **Depends on:** F3 and F4 both green, OWNER-DECISIONS 1. **Size:** not work - a decision, then F5 to F18.
- **What it gates:** step 1 = F5 to F14 (about 5 to 7 weeks), step 2 = F15 and F16 (about 4 to 6 weeks), step 3 = F17, step 4 = F18. Sizes and what each step gives the user are in PLAN.md stage F.
- **Rules for every package below:** the work sits behind one compile gate, and with the gate off the fragment source is byte-identical to today's (the `npm run test:refine` pattern, `W/.claude/rules/gmt-shader-chunks.md`). Sliders stay runtime; only the mode toggle recompiles. GPU checks on real d3d11.
- **If F4 is red:** stop. What is left is deep primary rays shaded from the depth buffer, which stages A to E already deliver.

## F3 - SPIKE: scaled-f32 march in the standalone page
- **Stage:** F. **Old ids:** WP0a. **Depends on:** OWNER-DECISIONS 2 (an experiment on a branch of the page, behind a debug handle; it need not merge). **Size:** 1 session.
- **Files and symbols:** Page: `marchNear` (grep `vec2 marchNear`), `deAt`, `hdrToFloat`, `uRefE`, `pertOrbit`, `pertOrbitJS`, the direct-check harness named in the page's HANDOFF.
- **Steps:** copy `marchNear` to `marchNearF32` with a plain `float t` in units of 2^`uRefE`; feed the kernel delta = `rd*t` with exponent `uRefE`; convert the kernel's distance to scaled f32 with a clamp (it comes out as a mantissa+exponent pair that overflows f32 - check 11); switch between the two marches with a debug handle. Check 11 fixed what to look at: hit depth against `marchNear` on the same view at 1e-20 to 1e-25, and one grazing view that needs more than 1e4 surface distances of travel.
- **Acceptance:** the page's referee gate passes at 1e-10, 1e-20 and 1e-30 with the float-t march, and the per-pixel depth difference against the `vec2` march is under one pixel-cone width, grazing view included. Red at any depth means GMT's float loop cannot be kept and step 1 roughly doubles.
- **Risk:** low. The check read `marchNear` in full: the mantissa of its `t` is one f32 and every decision in the loop is a ratio, so the pair buys range, not digits.

## F4 - SPIKE: one marched shadow ray through the perturbed kernel  [the gate]
- **Old ids:** WP0b. **Depends on:** OWNER-DECISIONS 2; F3 for its last step. **Size:** 1 to 2 sessions.
- **Files and symbols:** Page: pass G (`marchNear`, `OrbitOut`), `pertOrbit(sampler2D orbit, int orbitLen, Hdr3 dc, int maxIter)`, `pertOrbitJS`, `T_SWITCH`, `deF32`, the `exhausted` flag, pass S's depth-buffer shadow.
- **Steps:** needs no new kernel. From a hit point march 32 to 64 steps toward the key light with the existing `pertOrbit`, delta = hit delta + s*L. Count a non-escaped sample as a hit (its distance is wrapped garbage). Past 1e-3 hand off to `deF32` as the primary march does. Write the result to a spare G-buffer channel and split-compare with the depth-buffer shadow. Run at 1e-10, 1e-25 and 1e-60, with one grazing light, and once more through F3's float march.
- **Acceptance:** criteria fixed before the run (check 9): (1) the distance along the shadow ray agrees with `pertOrbitJS` / the BigInt direct orbit at offsets of 1, 1e2 and 1e4 surface distances from the hit; (2) the ray ends inside the step budget (the primary march caps at 256 steps and sets `exhausted`); (3) the accumulated shadow at 1e-20 shows no sparkle between samples and agrees with the depth-buffer shadow where both can see the occluder. Any one red = secondary rays need their own reference, and stage F stops at F2.
- **Risk:** the largest unknown in stage F: nothing has run a marched shadow at depth anywhere. Known in advance: the delta resolves about 6e-8 of its own length, so shadow and AO epsilons must grow with distance from the camera; and the cost is about one extra march per shadowed light.

## F5 - ADR and capability token
- **Old ids:** WP1. **Depends on:** F2. **Size:** 1 session.
- **Files and symbols:** NEW ADR under `W/docs/adr/`, plus the ADR-0059 amendment that `W/engine-gmt/types/capabilities.ts` requires for a new token; the `Capability` union (add `'iter:perturbable'`).
- **Steps:** the ADR records the scaled camera frame, the compile gate, what a formula must supply, what is excluded (non-whole power, twist, Radiolaria, hybrid and interlace, `NUMERIC_DE` formulas; Julia unverified), and the depth figures from checks 11 and 12: about 1e-13 on today's camera, about 1e-32 after F8, ceiling about 3e-42.
- **Acceptance:** `npm run typecheck` green; a formula that declares the token without `shader.perturbed` fails an assertion in F6's test. Red if the token can be used without a kernel.

## F6 - Formula contract: `shader.perturbed` and the reference-builder registry
- **Old ids:** WP2 (same contract as F1). **Depends on:** F5. **Size:** 1 session.
- **Files and symbols:** the `shader` block in `W/engine-gmt/types/fractal.ts` (beside `function` / `loopBody` / `loopInit` / `getDist` / `preambleVars`); the `REGISTER_FORMULA` message in `W/engine-gmt/engine/worker/WorkerProtocol.ts`; NEW `W/engine-gmt/deepzoom/referenceRegistry.ts` (formula id -> TS builder).
- **Steps:** add optional `perturbed: { function, loopBody, rowsPerIter }`; extend `REGISTER_FORMULA` to carry it; the CPU builder is looked up by formula id on the worker side, because TS code cannot cross the worker as a string.
- **Acceptance:** NEW `npm run test:deep-contract` (node, text level): register a dummy formula with `perturbed` and assert the strings arrive in the worker-side registry. Falsify by dropping the field from the `REGISTER_FORMULA` payload.
- **Risk:** Formula Workshop and imported formulas register over the same message and must keep working with the field absent.

## F7 - CPU side: BigInt fixed point, reference orbit, referee
- **Old ids:** WP3, merged with X1. **Depends on:** F5; X1 strongly preferred. **Size:** 2 sessions as a port; under 1 if X1's modules exist.
- **Files and symbols:** if X1 is done, import its `hp.js` (`makeHP`, `buildRefOrbit`) and `cpu-kernel.js` (`pertOrbitJS`) - the layout in `CORE-EXTRACTION.md`. Otherwise NEW `W/engine-gmt/deepzoom/hp.ts`, `mandelbulbReference.ts`, `mandelbulbReferee.ts`, ported verbatim from the page. Pattern only (its maths is 2D): `computeReferenceOrbit` in `W/engine/fractal/deepZoom/referenceOrbit.ts`.
- **Steps:** import rather than port wherever possible - a port keeps two copies of the maths, against the one-master rule. Output is Float32Array rows per iteration in the page's layout. Bring the page's node certification tests with it.
- **Acceptance:** NEW `npm run test:deep-kernel`: referee against direct BigInt iteration at the page's 11 certified depths, same tolerances as the page. Falsify by changing one binomial coefficient.

## F8 - Camera precision: make the offset pair a real double-double  [new, from check 12]
- **Old ids:** none (fix A of the check on the native plan's fourth assumption). **Depends on:** F5. **Size:** about 2 sessions and an ADR (the check says "days"; my figure).
- **Files and symbols:** `W/engine/plugins/navigation/core/VirtualSpace.ts` (`split`, `normalize`, `move`, `absorbCamera`, `setFromUnified`, `updateShaderUniforms`, `updateSmoothing`); `SerializedOffset` in `W/engine-gmt/engine/worker/WorkerProtocol.ts`.
- **Steps:**
  1. Ten-minute trace first (both unverified): the size of the deltas navigation sends as `OFFSET_SHIFT` at depth, and whether `camera.position` passes through an f32 on its way into `absorbCamera`.
  2. In `normalize`, or a renormalise called from `move` and `absorbCamera`, use an error-free two-sum so the high word absorbs everything above half its ulp and the low word stays tiny. Today `normalize` only carries whole units (`THRESHOLD = 0.5`) and all travel piles into the low word.
  3. Keep the `Math.fround` split at the uniform-writing step only (`updateShaderUniforms` already re-splits there), so the high word can be a full double.
  4. Under the gate, scale the absolute thresholds in `updateSmoothing` (`1.0e-18` and `1.0e-21` squared distance) by the surface distance.
- **Acceptance:** node test: from a generic point (coordinates 0.1 to 1) travel 0.1 first, so the low word is no longer fresh from a split, then make 1,000 `move` calls of 1e-20 to 1e-26; high + low equals a BigInt running total to 1e-28 (a 1e-25 view needs position good to about S/1000). Red on today's `normalize`: after the 0.1 of travel the low word resolves only about 1e-17, so every one of those moves is lost. Plus `npm run test:compat`: every existing scene loads to the same high + low sum as before.
- **Risk:** this is shared engine code used by every app, and it changes what saved `sceneOffset` values look like. If the owner says no, F17 becomes a prerequisite of step 1 for anything deeper than about 1e-13.

## F9 - GLSL perturbed kernel, the `mapPert` twins, the distance adapter
- **Old ids:** WP4, plus item 3 of check 11. **Depends on:** F6, F7. **Size:** 3 to 4 sessions.
- **Files and symbols:** NEW `W/engine-gmt/shaders/chunks/de_perturbed.ts`; `W/engine-gmt/shaders/chunks/de.ts` (`DE_MASTER`, the four `applyPrecisionOffset` sites, the wrappers `DE` / `DE_Dist`); `W/engine-gmt/formulas/Mandelbulb.ts` (`shader.perturbed`, the capability).
- **Steps:** port the page's delta kernel as the Mandelbulb's `perturbed.function`. Emit `mapPert(vec3 dScaled)` and `mapPertDist` as twins from one body (the `map` / `mapDist` twin rule). Under the gate `DE` / `DE_Dist` call them with the camera-relative point and return distance in scaled units. Adapter: the kernel's distance is a mantissa+exponent pair that overflows f32 - convert it to units of 2^`uRefE` with a clamp, and renormalise `rd*t` on entry. Keep the non-escaped = hit rule and the orbit-trap and iteration outputs, so colouring works.
- **Acceptance:** `npm run test:refine` gains a gate-off block: fragment source byte-identical to today. Gate on: `npm run test:baseline` compiles the Mandelbulb. Falsify by leaving one uniform declared with the gate off.
- **Risk:** compile time. The page's deep program is about 15 s on a cold first compile by its own comment (the native plan assumed 5), and GMT's cold path-traced compiles already run 10 to 20 s. Measure before adding BLA.

## F10 - Orbit build off the render thread, ordered against the camera
- **Old ids:** WP5; shares its worker with X5. **Depends on:** F7, F8. **Size:** 2 sessions; 1 if X5 was built.
- **Files and symbols:** NEW `W/engine-gmt/deepzoom/orbitRuntime.ts` on the pattern of `DeepZoomRuntime` / `getDeepZoomRuntime` in `W/engine/fractal/deepZoom/laRuntime.ts` and `DeepZoomRequest` / `DeepZoomOrbitResponse` in `deepZoomWorker.ts`; `W/engine-gmt/engine/worker/WorkerProtocol.ts` (new `DEEP_ORBIT` message with a generation number, beside `OFFSET_SET` / `OFFSET_SHIFT`); `W/engine-gmt/engine/worker/renderWorker.ts`.
- **Steps:** a sibling worker builds the orbit from the camera's high and low words, each converted to BigInt separately. The result goes to the render worker as a transferable. Each orbit carries the exact camera it was built for; the render worker sends the residual (camera minus orbit centre) as a small uniform so frames between rebuilds stay valid - the reference-centre idea 2D already uses (`uDeepCenterOffset`, ADR-0065). The residual is computed on the CPU, high words first, then low words. Never from `updateShaderUniforms` or `uSceneOffsetHigh` + `uSceneOffsetLow`: those sum in one double, about 1e-16 (check 12).
- **Acceptance:** NEW `npm run test:deep-orbit-order` (node, fake worker): interleave `OFFSET_SHIFT` and `DEEP_ORBIT` in every order and assert residual + orbit centre equals the true camera, with one case at 1e-24. Falsify twice: drop the generation check; take the residual through a single-double sum.
- **Risk:** rebuild cost per camera move at high iteration counts - X0 measures it.

## F11 - Orbit texture and uniforms
- **Old ids:** WP6. **Depends on:** F9, F10. **Size:** 1 to 2 sessions.
- **Files and symbols:** `W/engine-gmt/engine/UniformNames.ts`, `UniformSchema.ts`, `managers/UniformManager.ts` (`syncFrame`). Precedent for a float DataTexture made inside the worker: the `TEXTURE_HDR` handler in `W/engine-gmt/engine/worker/renderWorker.ts` and `_makeGradientTexture` in `W/engine-gmt/engine/MaterialController.ts`.
- **Steps:** `uDeepOrbit` (RGBA32F, rows per iteration), `uDeepOrbitLen`, `uRefE`, `uDeepResidual`, a binomial array for the whole-number power. Upload on `DEEP_ORBIT` and reset accumulation. A power change marks the orbit dirty at runtime; no recompile.
- **Acceptance:** `npm run smoke:engine-gmt` still boots with the gate off; with it on, the existing `GET_UNIFORMS_SNAPSHOT` message shows an orbit length above 0 after a camera move. Red if the texture never arrives.

## F12 - The marcher in the scaled frame
- **Old ids:** WP7, plus items 1, 2 and 4 of check 11 and item 1 of check 10. **Depends on:** F9, F11. **Size:** 5 to 6 sessions (the planner's 3 to 4, plus the far limits, the sentinel audit and the Physics probe; my figure).
- **Files and symbols:** `getTraceGLSL` in `W/engine-gmt/shaders/chunks/trace.ts` (`floatPrecision`, `finalEps`, `mb3dStepW`, `maxMarch`, `stepJitter`, `innerDistCall`, the miss block's `map(p_end + uCameraPosition)`, the refine `mapDist`); `PRECISION_RATIO_HIGH`, `MAX_DIST`, `MISS_DIST` in `W/engine-gmt/shaders/chunks/math.ts`; the `variant === 'Physics'` `traceScene` in `W/engine-gmt/engine/ShaderBuilder.ts`; `W/engine-gmt/navigation/Navigation.tsx` (reads the `MISS_DIST` sentinel); the same floor in `material_eval.ts` (`floatLimit`), `lighting/pbr.ts` (`floatLimit`), `pathtracer.ts` (`floatLimitNEE`).
- **Steps:**
  1. Route the 3 direct sites in `trace.ts` and the Physics probe through `DE` / `DE_Dist`. They already pass a camera-relative point, so the swap stays in one place. (3 sites, not the 13 the plan counted - the rest are comments.)
  2. Precision floor. `floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH)` is about 5e18 in scaled units and makes every ray hit on step 0. Under the gate it becomes relative to scaled `t`. The same value feeds `finalEps` and the floor of `mb3dStepW`, so ADR-0092's step keeps its form with a different floor input. The Physics probe's `max(1.0e-5, ...)` floor gets the same treatment or it rejects every deep hit.
  3. Far limits. `MAX_DIST 10000.0` and `MISS_DIST 1000.0` stop a scaled ray after 10,000 surface distances and call any hit past 1,000 sky. Scale them by 1/S or carry the miss as a flag - after auditing every reader of `d > MISS_DIST`.
  4. Far-field hand-off: once scaled `t` times 2^`uRefE` passes about 1e-4 absolute, continue with today's absolute `map()`. The page has the same split (`uFarFrom`) to copy.
  5. `stepJitter` loses its `d` term above about 5e5 scaled units (cosmetic; fix or note).
- **Acceptance:** GPU smoke on real d3d11: at a fixed Mandelbulb view at 1e-12 the centre-pixel hit depth agrees with F7's CPU referee to within one pixel-cone width; a grazing view that needs more than 1e4 surface distances of travel still hits (red if a far limit stayed absolute); and the same smoke with the gate off must FAIL at that depth, which proves it can see the difference.
- **Risk:** the hand-off seam can show as a ring. This is the uncertain half of step 1.

## F13 - Shadows and AO in the scaled frame
- **Old ids:** WP8. **Depends on:** F12; F4 green. **Size:** 2 sessions.
- **Files and symbols:** `GetSoftShadow` and `GetHardShadow` in `W/engine-gmt/shaders/chunks/lighting/shadows.ts` (`DE_Dist(ro + rd * t)`, `surfEps`, `lightDist`; ADR-0093); AO in `W/engine-gmt/features/ao/shader.ts` (`DE_Dist(aopos)`); `W/engine-gmt/features/lighting/index.ts` (3 `DE_Dist` calls); the shadow call site in `lighting/pbr.ts`.
- **Steps:** read `shadows.ts` whole first - check 11 read only its `t` and `lightDist` lines. Scale the light vector, `lightDist` and `surfEps` into frame units (`lightDist` of about 1e25 at a 1e-25 view fits f32). Carry the non-escaped = hit rule from F4. Epsilons grow with distance from the camera. AO radii in surface-footprint units. Cap the shadow march at the frame limit and hand the rest to the absolute map.
- **Acceptance:** a split image from the same samples at 1e-12 (left marched shadow, right none) for the owner, plus a numeric check: a known self-shadowed pixel reads under 0.2 and a known lit pixel over 0.8. Red if shadows go uniformly 0 or 1 under the gate.
- **Risk:** cost. About one extra march per shadowed light, so at depth this is a stills and accumulation feature.

## F14 - Mode toggle, guard rails, certification smoke
- **Old ids:** WP9; reuses A1 and D2. **Depends on:** F12, F13. **Size:** 2 sessions.
- **Files and symbols:** the feature that owns precision and quality settings in engine-gmt (which file is unverified - grep `enableRefine` and `numericDE` for how a gate is armed from a feature's `inject()` in `W/engine-gmt/engine/ShaderBuilder.ts`). If D2 exists, the toggle is a mode of `W/engine-gmt/features/deepZoom.ts`, not a second feature. Eligibility is A1's `isDeepZoomEligible` plus a `NUMERIC_DE` refusal, lifted out of `W/deep-zoom/handoff.ts` into engine-gmt now that it has two consumers. app-gmt's panel manifest; package.json scripts.
- **Steps:** a mode toggle that recompiles once. Disabled with a plain reason when power is not whole, twist or Radiolaria is on, a hybrid is active, or the formula uses numeric DE. NEW `smoke:deep-gmt` at 1e-8 and 1e-12, and at 1e-16 and 1e-24 once F8 is in.
- **Acceptance:** `npm run smoke:deep-gmt` green on d3d11; `npm run smoke:chrome` opens the panel that holds the toggle without a pageerror; `npm run check:rule-guards` after the new smoke is cited from a rule.

## F15 - Depth-relative units, and the absolute-position sites
- **Old ids:** WP10, plus item 3 of check 10. **Depends on:** F14. **Size:** 6 to 8 sessions (the planner's 4 to 5, plus the position sites; my figure).
- **Files and symbols:** `W/engine-gmt/engine/worker/WorkerDepthReadback.ts` (half-float target); fog, depth-of-field and light uniforms in `W/engine-gmt/engine/UniformSchema.ts`; `targetDistance` in `W/engine-gmt/types/fractal.ts`. The sites that rebuild `p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh`: `lighting/shading.ts` (`p_fractal`), `lighting/pbr.ts` (`distFromFractalOrigin`), `lighting/volumetric_scatter.ts` (`_yWorld`, `_pfrac`), `pathtracer.ts` (`p_fractal`), `trace.ts` and `W/engine-gmt/features/reflections/shader.ts` (`worldOriginOffset`), `features/reflections/index.ts` (`p_next_fractal`), `features/lighting/index.ts` (`p_fractal`), `features/atmosphere/shader.ts` (`applyPrecisionOffset(p + uCameraPosition, ...)`).
- **Steps:** grep every uniform that is a length and decide for each: scale by 2^`uRefE` under the gate, or leave absolute. Log-encode the depth output like the page's `log2(t) - uRefE`. Fly speed from the decoded depth. For each position site decide: scale-aware replacement, or accept as coarse (colouring by absolute position) - in a scaled frame these lose all detail below S, and several feed precision thresholds. `numericNormal` (`material_eval.ts`) and `numFootprint` (`de.ts`) are not converted; `NUMERIC_DE` formulas stay excluded.
- **Acceptance:** a table-driven node test that lists every length uniform and every position site with its decision, and fails when a new one appears without one. Smoke: fly speed at 1e-20 is within 2x of one surface distance per second (needs F8).
- **Risk:** the count is the cost, and the count of length uniforms is unverified until the grep is done. What each `p_fractal` consumer does with the value was not read.

## F16 - Reflections, path tracer, tiled renderer and export under the gate
- **Old ids:** WP11. **Depends on:** F15. **Size:** 4 to 6 sessions.
- **Files and symbols:** `W/engine-gmt/shaders/chunks/pathtracer.ts` (`floatLimitNEE`, its one `DE_Dist(ro + rd * t)`, bounce origins); the wrapper callers the native plan's file list missed - `W/engine-gmt/features/reflections/shader.ts` (3 calls), `features/ao/shader.ts`, `features/lighting/index.ts` - which need no conversion but must be tested deep; `W/engine-gmt/engine/GmtBucketHost.ts`; `W/engine-gmt/engine/worker/WorkerExporter.ts`.
- **Steps:** bounce rays are camera-relative deltas like shadows; verify each origin. Tiles share one orbit and one `uRefE` for the whole picture, so there is no per-tile state. Export holds the orbit generation fixed per frame.
- **Acceptance:** a 2x2-tile render of a 1e-12 view is pixel-identical at the tile borders to a single-pass render of the same samples; a path-traced frame compiles on d3d11 inside the existing compile budget.
- **Risk:** engine-gmt's accumulation and bucket path has no runtime guard today (`W/.claude/rules/gmt-renderer.md` says so); this package must add one.

## F17 - Exact camera under the gate
- **Old ids:** WP12, merged with E1 and E2. **Depends on:** F14; E1 and E2 if built. **Size:** 2 to 3 weeks alone; about 1 week on top of E1 and E2 (my figure).
- **Files and symbols:** `W/engine/plugins/navigation/core/VirtualSpace.ts`; E1's `deepView` field; E2's `dzPath.u` binder. One field and one track for both renderers, not a second pair.
- **Steps:** navigation moves in BigInt under the gate; the six numbers stay beside it. Check 7 already answered what the native plan left unverified here: `PresetField` accepts a string. State the ceiling: the scaled far hand-off overflows f32 near 3e-42. Going deeper needs the page's near/far `tF` split or its mantissa+exponent `t` inside `trace.ts` and `shadows.ts` - research, not sized.
- **Acceptance:** save and reload a 1e-33 view; the orbit centre is identical to the last BigInt digit. A scene with only the six numbers still loads unchanged.
- **Risk:** design risk, its own ADR. FBX and After Effects camera export stay six-number.

## F18 - More formulas
- **Old ids:** the native plan's stage 4 (it listed no package). **Depends on:** F14, F1, F0. **Size:** 1 to 3 weeks per smooth formula. Fold formulas (Mandelbox family, Buffalo, BoxBulb): no size.
- **Steps:** the native plan names Quaternion and Tetrabrot. `FORMULA-ELIGIBILITY.md` ranks Mandelbar3D first and Quaternion fifth (its damping term uses the previous z), so order by that ranking and F0's count, not by the plan's pick. Each formula: derivation, CPU referee, certification, `shader.perturbed`. The formula picker's badge reads the `iter:perturbable` token.
- **Acceptance:** `npm run test:deep-kernel` gains the formula at three depths; `npm run smoke:chrome` opens the picker and the badge is on exactly the formulas that declare the token.
