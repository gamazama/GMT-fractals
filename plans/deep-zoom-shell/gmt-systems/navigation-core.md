# GMT systems vs the deep zoomer — navigation core

Reader: navigation-core. Read-only pass, 2026-10-07, worktree `deep-zoom` (branch `deep-zoom-tool`).
Nothing was run. Line numbers are hints; the symbol name is the locator.

## 0. The headline, before the detail

1. **"The engine's navigation plugin" is one class.** `engine/plugins/navigation/` holds exactly one
   file, `core/VirtualSpace.ts` (263 lines). There is no index, no controller, no input handling, no
   install function. Everything a user would call "GMT navigation" — Orbit, Fly, the HUD, the input
   capture, the speed model — lives in `engine-gmt/navigation/` (2 500 lines) plus
   `engine-gmt/engine/controllers/CameraController.ts` (178 lines), and is wired straight into GMT's
   worker proxy, React-Three-Fiber and drei. The extraction stopped at "Stage 1"
   (`VirtualSpace.ts` header: "Moved from `engine-gmt/engine/PrecisionMath.ts` during the Stage-1
   navigation extraction (2026-04-24)").
2. **The offset-pair precision claim is confirmed: about 1e-16, and no float layout reaches 1e-77.**
   Package F8's double-double (about 1e-32) would not reach it either. The deep zoomer's position
   cannot live in `VirtualSpace` in any form; the renderer must stay the position authority.
3. **The good news: GMT's fly integrator already works the way a deep zoomer needs.** It never reads
   the absolute position. It turns keys into a *displacement* and hands that displacement to whoever
   is listening (`FractalEvents.emit('offset_shift', …)`). Its speed is already "a fraction of the
   distance to the surface per second" — the same model as the page. Two hard-coded floors
   (1e-6 and 1e-4) and one hard-coded event name are all that tie it to GMT's f32 depth range.
4. **Orbit mode is the opposite.** It is built on absolute local coordinates, drei's OrbitControls
   and world-position picks returned as plain numbers. It cannot work at depth without a real rework.
   The page has no orbit, so that rework is not needed now.

## 1. Facts, with file and symbol

### 1.1 Position store — `engine/plugins/navigation/core/VirtualSpace.ts`

- Position is `PreciseVector3` = six JS numbers `{x,y,z,xL,yL,zL}` (`types/common.ts`, `PreciseVector3`).
- `VirtualSpace.normalize` only carries whole units from the low part to the high part:
  ```ts
  const THRESHOLD = 0.5;
  if (Math.abs(so.xL) > THRESHOLD) { const shift = Math.floor(so.xL + 0.5); so.x += shift; so.xL -= shift; }
  ```
  So `xL` is an ordinary double kept inside about ±0.5, and `x` is an integer-ish double. The smallest
  step `xL` can hold near 0.5 is about 1.1e-16. **Position resolution = about 1e-16 absolute.** Claim verified.
- `move(dx,dy,dz)`: `this.offset.xL += dx; … VirtualSpace.normalize(this.offset);` — plain double add,
  no error-free transform. A displacement smaller than about 1e-17 added to an `xL` near 0.3 is lost.
- `absorbCamera(cameraPosition)`: same thing, `this.offset.xL += cameraPosition.x; …normalize`.
- `setFromUnified(x,y,z)` and `split(val)`: `high = Math.fround(val); low = val - high` — takes ONE
  double in, so it can never carry more than a double's 53 bits.
- `updateShaderUniforms`: `const totalX = this.offset.x + this.offset.xL + cameraPosition.x;` — the pair
  is collapsed to a single double before being re-split into two f32 vectors. Whatever the pair held
  beyond a double is thrown away here, on the way to the renderer.
- `getLightShaderVector` and `resolveRealWorldPosition` do the same collapse (`so.x + so.xL`). (Lights
  are another reader's file; noted because they read the absolute position as numbers.)
- `updateSmoothing` contains absolute-size constants: a jump over `10.0` units resets smoothing; the
  lock thresholds are `1.0e-18` and `1.0e-21` (squared distance, i.e. 1e-9 and 3e-11 units). All are
  meaningless at a view scale of 1e-77.
- `getUnifiedCameraState` falls back to `targetDistance: targetDistance > 0 ? targetDistance : 3.5`.
- The file's own header calls it "Generic raymarch-camera infrastructure, not GMT-specific", and it
  imports only `three` and `types/common`. It has no fractal words. It does assume a `THREE.Camera`.

### 1.2 Who calls VirtualSpace (grep `VirtualSpace` across the repo)

Only GMT: `engine-gmt/engine/FractalEngine.ts`, `engine-gmt/engine/managers/UniformManager.ts`,
`engine-gmt/engine/worker/handleRenderTick.ts`, `engine-gmt/engine/worker/WorkerProxy.ts`,
`engine-gmt/engine/controllers/PickingController.ts`, `engine-gmt/animation/cameraBinders.ts`,
`engine-gmt/store/cameraSlice.ts`, `engine-gmt/utils/CameraUtils.ts`,
`engine-gmt/renderer/GmtRendererTickDriver.tsx`, `engine-gmt/navigation/Navigation.tsx`,
`utils/PresetLogic.ts`, `utils/defaultPresetFields.ts`, `debug/opus-cam.ts`, all through the shim
`engine-gmt/engine/PrecisionMath.ts`. **No hit in `fluid-toy/` or `fractal-toy/`** — the header's
sentence "Apps without those uniforms (fluid-toy, fractal-toy) use VirtualSpace purely for offset
bookkeeping" is not true today. `GmtNavigation` is mounted only by `app-gmt/AppGmt.tsx`.

### 1.3 Movement — `engine-gmt/engine/controllers/CameraController.ts`, `CameraController.update`

- Signature: `update(camera: THREE.Camera, delta, inputs {move, look, moveJoy, isDragging, dragDelta, invertY}, settings {baseSpeed, distEstimate, autoSlow})`.
- Speed, in world units per second:
  ```ts
  const minDist = inputs.move.boost ? 1e-4 : 0;
  const clampedDist = Math.max(effectiveDist, minDist);
  const targetSpeed = settings.autoSlow
      ? Math.max(clampedDist * settings.baseSpeed * boost, 1e-6)
      : 2.0 * settings.baseSpeed * boost;
  ```
  So speed = surface distance × `flySpeed` × (4 with Shift). **The floor `1e-6` units/s and the Shift
  floor `1e-4` are the two numbers that break at depth**: at a surface distance of 1e-30, one frame at
  the floor moves the camera 1e-8 units — 22 orders of magnitude past the surface.
- Displacement leaves as an event, not as a write to any position:
  ```ts
  const mv = tv.clone().applyQuaternion(camera.quaternion);
  FractalEvents.emit('offset_shift', { x: mv.x, y: mv.y, z: mv.z });
  ```
  Three doubles in world units. A double holds 1e-79 exactly as well as it holds 1e-3, so this
  displacement format is good down to about 1e-300 — far past the zoomer's 1e-77.
- Listeners today (grep `OFFSET_SHIFT`): `engine-gmt/engine/FractalEngine.ts`
  (`this.virtualSpace.move(x, y, z); this.resetAccumulation();`) and
  `engine-gmt/renderer/GmtRendererTickDriver.tsx` (`proxy.post({ type: 'OFFSET_SHIFT', x, y, z })`).
  The event names are declared in `engine/FractalEvents.ts` (`OFFSET_SHIFT: 'offset_shift'`,
  `OFFSET_SET: 'offset_set'`), i.e. in engine core.
- Distance smoothing: rises slowly (`DIST_INCREASE_LERP_RATE = 1.2`, linear lerp), drops instantly.
  A linear lerp across many decades (surfacing from 1e-40 to 1) is slow in log terms but harmless.
- Rotation is applied directly to the three camera: `camera.rotateX/Y/Z(...)`, with roll (`rotateZ`).

### 1.4 Orientation

- Held as the R3F camera's quaternion; stored as `cameraRot {x,y,z,w}` and in `CameraState.rotation`
  (`types/common.ts`, `CameraState`). **Roll exists**: Q/E (`useInputController`, `KeyQ`/`KeyE` →
  `rollLeft/rollRight`), applied in fly by `camera.rotateZ` and in orbit by
  `camera.up.applyAxisAngle(fwd, rollAngle)` (`Navigation.tsx`, "Q/E roll velocity application").
- `VirtualSpace.applyCameraState` sets `camera.quaternion` and derives `camera.up` from it.
- The page: yaw + pitch, no roll, FOV fixed at 34.1° (from the brief; page script not opened by me).

### 1.5 Speed units and who scales them

- `flySpeed` is a store value, `navigation.flySpeed`, default read as `navSettings?.flySpeed ?? 0.5`
  (`Navigation.tsx`, the `useInputController(...)` call). The wheel changes it in fly mode, clamped
  `0.001 … 1.0` (`useInputController`, `handleWheel`, "FLY SPEED"). HUD prints it as a percent
  (`usePhysicsProbe`, `updateSpeedHud`: `SPD ${(speedRef.current * 100).toFixed(1)}%`).
- The distance comes from `usePhysicsProbe` → `distAverageRef`, which mirrors
  `engine.lastMeasuredDistance` from the GMT worker's depth readback. It has GMT-range sentinels:
  `Math.max(distAverageRef.current, 1e-4)` on sky, and `updateResetButton` shows the "you are lost"
  recovery button when `dist > MAX_SKY_DISTANCE || dist < 0.001` — at depth every frame is `< 0.001`.
- Modifiers: `engine-gmt/navigation/modifiers.ts` — Shift ×4, Alt ×0.1, pure functions, no imports.

### 1.6 Input capture — `engine-gmt/navigation/useInputController.ts`

- Keys on `window` (`keydown`/`keyup`/`blur`), W A S D, Q E roll, Space/C up/down; ignores typing
  targets (`isTypingTarget`: input, textarea, contenteditable, `.cm-editor`).
- Mouse: `mousedown` on `gl.domElement` (the R3F canvas, from `useThree()`), `mousemove`/`mouseup` on
  `window`. Fly look is a *rate* control: the drag offset from where the button went down, in NDC
  (`dragStart`, `mousePos`), not pointer-lock mouse-look. No `requestPointerLock` anywhere in the folder.
- Wheel on the canvas: fly speed in Fly; in ortho it writes GMT's optics
  (`state.optics.camType`, `state.setOptics({ orthoScale … })`) — GMT feature state read by name.
- Touch: two on-screen joysticks arrive as `window` CustomEvents `joyMove` / `joyLook`
  (`handleJoyMove`, `handleJoyLook`); in Orbit, touch is drei's
  `touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}` (`Navigation.tsx`, the JSX return).
- GMT-bound: `useThree`/`useFrame` (needs to sit inside an R3F `<Canvas>`), `useFractalStore`
  (`invertY`, `optics`), `selectMovementLock`, `INTERACTION_SOURCES.camera`.

### 1.7 Movement lock — `store/engineStore.ts`, `selectMovementLock`

```ts
if (state.getInteractionSources().has('gizmo') || state.interactionMode !== 'none' || state.isExporting || state.isBucketRendering) return true;
for (const feat of features) { if (feat.interactionConfig?.blockCamera && feat.interactionConfig.activeParam) { … return true; } }
```
Engine-core, feature-driven, no fractal words. Any app on the engine store can call it.

### 1.8 Orbit, wheel-zoom, pick, transitions — `engine-gmt/navigation/Navigation.tsx`

- Module top: `const engine = getProxy();` (`engine-gmt/engine/worker/WorkerProxy`). The file cannot be
  imported without GMT's worker proxy module.
- Orbit accumulates motion in `camera.position` (local) and bakes it with `absorbOrbitPosition`:
  `if (camera.position.lengthSq() < 1e-8) return;` — local motion under 1e-4 units is never absorbed —
  and `orbitRef.current.target.copy(fwd.multiplyScalar(0.0001))`. Both are absolute sizes.
- It reads the absolute position as numbers in many places: `snapshotHoverPivotLocal`
  (`const so = engine.sceneOffset;`), `absorbOrbitPosition`, the reticle projection, the frame tail
  (`unifiedOffsetRef.current = { x: so.x, …, xL: (so.xL ?? 0) + camera.position.x, … }`).
- Cursor-anchored gestures need `engine.pickWorldPosition(ndcX, ndcY, true, true)` — a world point as
  plain numbers from the GMT worker.
- Camera transitions lerp the absolute position in one double and re-split it:
  `const sX = VirtualSpace.split(interpPos.x);` (in `useFrame`, transition branch).
- Fallback distance `3.5` appears six times; sky sentinel `dist >= 1000.0`.

### 1.9 How camera state leaves toward a renderer

1. Displacements: `offset_shift` event (fly) → worker `OFFSET_SHIFT`.
2. Absolute sets: `engine.queueOffsetSync(absorbed)` (sent "atomically with the next RENDER_TICK",
   per the comment in `absorbOrbitPosition`) or `setSceneOffset` → `OFFSET_SET`.
3. Pose: the R3F camera's quaternion and local position ride `RENDER_TICK`
   (`Navigation.tsx` header: "push the resulting world pose into the engine via `RENDER_TICK`";
   the sender is `GmtRendererTickDriver.tsx` — body not read, see Unverified).
4. Store, 100 ms after motion stops: `useFractalStore.setState({ cameraRot, sceneOffset: normalizedOffset, targetDistance: dist })`.
5. Undo/keyframes: props `onStart(camState)` / `onEnd()`, and `captureCameraKeyFrame`.
6. Inbound: `FRACTAL_EVENTS.CAMERA_TELEPORT` and `CAMERA_TRANSITION` carry a full `CameraState`.

### 1.10 What an app supplies today, and what it gets

To mount `GmtNavigation` an app must already be GMT: an R3F `<Canvas>`, the GMT worker proxy, the
engine store with `navigation`, `optics`, `invertY`, `sceneOffset`, `cameraRot`, `targetDistance`,
`hudRefs` (five DOM refs), `setSceneOffset`, and `mode`. It gets back a moved `THREE.Camera`, events
and store writes. There is no adapter, registration or callback surface. The only adapter-shaped
camera piece in engine core is the slot plugin `engine/plugins/Camera.ts` (`CameraAdapter`:
`captureState()` / `applyState()` over opaque JSON) — camera *bookmarks*, not navigation.

## 2. The gap, sub-system by sub-system

The deep zoomer's position is three 256-bit fixed-point numbers the renderer owns. The rule that
makes every row below work: **navigation may hand the renderer a displacement (three doubles, world
units) and may ask it for the surface distance (one double); it must never read the absolute position
back as numbers.** Displacements and distances are small magnitudes, which doubles hold exactly at
any depth; absolute position is a long number, which they cannot.

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Position store (`VirtualSpace` offset, `normalize`, `move`, `absorbCamera`) | Six doubles; resolution about 1e-16; collapsed to one double on the way to uniforms and lights | **ADAPTER** (not used) | None. The renderer module keeps its BigInt position; the shell never instantiates `VirtualSpace`. Do NOT stretch `PreciseVector3` — even F8's double-double stops at about 1e-32, 45 orders short | 0 | Nothing. F8 stays a GMT-only question and is not a prerequisite for the shell |
| Fly movement integration (`CameraController.update`) | Emits a displacement on a hard-coded GMT bus event; speed floors `1e-6` u/s and `1e-4` (Shift); rotates a `THREE.Camera` | **REWORK** (small) | Move the class to `engine/plugins/navigation/core/` as the engine's fly integrator. (a) Replace `FractalEvents.emit('offset_shift', …)` with a required `translate(dx,dy,dz)` sink passed in; (b) make the two floors settings (`minSpeed`, `boostMinDistance`) whose defaults are today's numbers. GMT passes a sink that emits `offset_shift` and takes the defaults. Function changed: `CameraController.update` (signature) and its one call site in `Navigation.tsx` | 0.5 session | Gains: the integrator becomes usable by fractal-toy or any 3D app, and GMT can later lower its own floor if F8 lands. Risk: fly feel — byte-identical if defaults are untouched; `smoke:camera` exists but whether it flies is unverified |
| Speed model (distance × `flySpeed` × modifier) | Same model as the page. Range `0.001…1.0`, shown as percent | **AS-IS** | — (the shell declares its own `flySpeed` param; blueprint already proposes 0.01…0.5, default 0.06) | 0 | — |
| Distance source (`usePhysicsProbe`) | Reads GMT worker depth readback; clamps to `1e-4`; shows the recovery button under `0.001` | **ADAPTER** | The shell feeds the integrator's `distEstimate` from the renderer's own surface-distance telemetry. `usePhysicsProbe` is not used. If the probe is ever hoisted, its two thresholds must become inputs | 0.25 session in the shell | Nothing touched |
| Orientation | Quaternion with roll on a `THREE.Camera`; saved as `cameraRot` | **ADAPTER** now; renderer-module change for roll | The shell keeps a camera object for the integrator to rotate, then converts quaternion → yaw/pitch for the renderer and drops roll (bind Q/E to nothing). To keep roll, the *ported renderer module* accepts a full camera basis instead of yaw/pitch — a change in `deep-zoom/renderer/`, not in GMT | 0.25 session (yaw/pitch); 1 session in the module for roll | GMT untouched. Gimbal: yaw/pitch extraction is unstable looking straight up/down — clamp pitch as the page does |
| Field of view | `VirtualSpace.smoothedFov = 60.0`; GMT default 60°; page fixed 34.1° | **ADAPTER** | Shell-side constant or param; nothing in navigation depends on FOV for movement | 0 | — |
| Input capture — keys, drag-look, wheel (`useInputController`) | R3F `useThree`/`useFrame`; GMT store fields `optics.camType`, `invertY`; `selectMovementLock`; `INTERACTION_SOURCES` | **REWORK** (medium) — or ADAPTER by re-writing 150 lines in the shell, which would be a parallel copy | Hoist to `engine/plugins/navigation/` as a hook that takes its dependencies as arguments: the DOM element, `isLocked()`, `invertY`, `speed`/`setSpeed`, an optional `onWheel` override (GMT passes its ortho-scale handler), an `onActivity(active)` callback (GMT passes its InteractionSession begin/end), and a tick source instead of `useFrame`. Functions changed: `useInputController` (signature, drop the three store reads and `useThree`), its call in `Navigation.tsx`, `components/ui/stopNavKeys.ts` import path | 1 session | Gains: one input layer for every 3D app; key map stays in one place. Risk: the ADR-0061 session wiring ("frame-edge driven" close) is subtle — port it as a callback, do not re-derive it |
| Pointer capture | None: fly look is drag-offset rate control, no pointer lock | **ADAPTER** | If the page uses pointer lock (blueprint mentions `host.isCaptured()`), that stays the renderer module's business; the engine hook does not need it | 0 | — |
| Touch (joysticks via `joyMove`/`joyLook` window events) | Event names are generic; the joystick component was not read | **ADAPTER** (probable) | The integrator already takes `moveJoy` and `look`; the shell mounts the joystick component if it has no GMT store reads | 0.5 session, unverified | — |
| Movement lock (`selectMovementLock`) | Engine store + feature `interactionConfig.blockCamera` | **AS-IS** | — | 0 | — |
| Modifiers (`modifiers.ts`) | Pure | **AS-IS** (import path is `engine-gmt/`; move the 19-line file with the integrator) | — | trivial | — |
| Orbit mode, cursor-anchored wheel zoom, middle-drag dolly, pivot reticle (`Navigation.tsx`) | drei OrbitControls in absolute local units; `1e-8` / `0.0001` constants; world-point picks as numbers; reads `engine.sceneOffset` numerically | **NOT-NOW** | Would apply the day the owner wants orbit or click-to-anchor zoom at depth. The generic rework then: navigation works in *view units* (local coordinates divided by a scale the position authority reports), picks return a point *relative to the camera in view units*, and absorb becomes `authority.translate(local × scale)`. Functions: `absorbOrbitPosition`, `snapshotHoverPivotLocal`, the three gesture effects, the pick call | 4–6 days, high regression risk in GMT's most-tuned file | GMT would gain orbit below its present 1e-4 dead zone; risk is the whole orbit feel |
| Smoothing (`VirtualSpace.updateSmoothing`) | Absolute thresholds `10.0`, `1e-18`, `1e-21` | **NOT-NOW** | Not used by the shell (the page renders the true pose each frame). Would need view-unit thresholds under the orbit rework above | — | — |
| Camera transitions / teleport (`CAMERA_TRANSITION`, `CAMERA_TELEPORT`, `CameraState`) | Absolute position lerped in one double | **ADAPTER** | The shell does not emit these. Jumps and dives are renderer-module calls that take its own position type (strings of fixed-point digits in saved state) | 0 | — |
| Camera state toward the renderer | GMT bus + worker messages + store `sceneOffset`/`cameraRot` | **ADAPTER** | Shell glue: sink → `renderer.translate(dx,dy,dz)`; pose → `renderer.setYawPitch`; nothing goes through `FRACTAL_EVENTS` or the GMT worker | 0.5 session | — |
| Camera bookmarks (`engine/plugins/Camera.ts`, `CameraAdapter`) | Opaque JSON blob per slot | **AS-IS** | Shell registers an adapter whose `captureState` returns the position as digit strings plus yaw/pitch | 0.25 session | — |
| HUD (`HudOverlay.tsx`, DST/SPD) | Five DOM refs written by GMT's probe; `formatDist` switches to exponent under 0.001 | **ADAPTER** | Not opened beyond its use; the shell's status chip already shows depth (blueprint). Do not mount `GmtNavigationHud` | 0 | — |

## 3. The reworks that matter, in order

1. **Hoist the fly integrator with a displacement sink and settable floors** (0.5 session). This is
   the seam the brief's example describes, and the code is already 95% there: the integrator never
   reads the position. After it, the deep zoomer flies on GMT's own movement code — same speed curve,
   same Shift/Alt, same joystick shaping — and the renderer stays the only thing that knows where it is.
2. **Hoist `useInputController` with injected dependencies** (1 session). Without it the shell either
   mounts an R3F canvas it has no other use for, or copies the key/drag/wheel code — a parallel copy,
   which the owner's rules forbid.
3. **Leave `VirtualSpace` alone.** The tempting rework — make the engine's position store
   arbitrary-precision — is the wrong one: it would put a BigInt on GMT's per-frame path and into
   saved `sceneOffset`, to serve a renderer that already owns its position. F8 (double-double) is a
   separate GMT question and does not gate the shell.

Total needed now: about 1.5 sessions of engine rework plus about 1.5 sessions of shell glue.
Orbit at depth (4–6 days) is deferred, not rejected.

Both reworks are stated without fractal words and with defaults equal to today's behaviour; neither
adds a flag, and neither changes a saved-scene field or a worker message.

**A cheaper first step if the hoists are postponed:** the shell can import `CameraController` from
`engine-gmt/` unchanged and subscribe to `offset_shift` itself (no GMT engine is listening in the
shell's bundle). That is a pure ADAPTER, but the `1e-6` floor makes it unusable below a surface
distance of roughly 1e-5, so it only proves the wiring; it does not fly deep.

## 4. Corrections to carry into the blueprint

- The blueprint treats flying as the renderer's own business (`host.setHotkeys('fly')`,
  BLUEPRINT.md line 77–78). That works and needs zero GMT change. The cost is that the shell's flight
  feel, key map and touch controls are then the page's, not GMT's, and nothing of GMT's navigation is
  reused. Reworks 1 and 2 are what "use as much of gmt-engine's native plugins as possible" costs for
  navigation: about 1.5 sessions. It is an owner call, not a technical necessity.
- `VirtualSpace.ts`'s header claim that fluid-toy and fractal-toy use it is false (no import in
  either). Worth a `@stale` when someone next edits that file.

## 5. Unverified

- `engine-gmt/navigation/HudOverlay.tsx` (338 lines) — not opened; the joystick component's location
  and its store reads are unknown, so the Touch row is a probable, not a checked, verdict.
- `engine-gmt/renderer/GmtRendererTickDriver.tsx`, `engine-gmt/engine/worker/handleRenderTick.ts`,
  `WorkerProxy.queueOffsetSync` — only grep lines read; the exact RENDER_TICK payload is not confirmed.
- Whether `engine-gmt/engine/FractalEvents` (imported by `CameraController`) is the same bus object as
  `engine/FractalEvents.ts` — assumed a re-export, not opened.
- Whether importing `Navigation.tsx` (`const engine = getProxy()` at module top) starts a worker — not opened.
- `Navigation.tsx` lines 500–1130 (hover pre-pick, custom orbit drag, middle-drag, reticle,
  camera-lock, mode-switch, fit-on-mount) were read through grep hits and the header's effect roster,
  not line by line. The orbit verdict rests on `absorbOrbitPosition` (read in full) and those hits.
- `usePhysicsProbe.ts` lines 60–216 — grep hits only.
- `engine-gmt/store/cameraSlice.ts`, `engine-gmt/animation/cameraBinders.ts`, `utils/PresetLogic.ts`
  (how `sceneOffset` is saved and keyframed) — not opened; another reader's area.
- The page's own controls (pointer lock or not, its speed constant, pitch clamp, touch) — the page
  script was not opened; statements about it come from the brief and BLUEPRINT.md.
- Which smoke, if any, exercises fly-mode movement — not checked.
- `.claude/rules/navigation.md` — exists per the engine-plugins rule, not opened.
