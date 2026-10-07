# GMT navigation and the deep zoomer - what can be used, what must change

Reader: navigation-gmt. Read-only pass, 2026-10-07. Nothing was run. Paths are relative to the
worktree root unless they start with `H:/`. "The page" is
`H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (frozen).

Verdict words: AS-IS, ADAPTER (shell or renderer-module code only), REWORK (the GMT system
changes), NOT-NOW.

## 1. What the experience is for a GMT user today

Two modes, switched with Tab (`app-gmt/main.tsx`, shortcut `gmt.toggleCameraMode`, flips
`cameraMode` between `'Orbit'` and `'Fly'`).

**Fly** (`engine-gmt/navigation/useInputController.ts`, `handleKeyDown`):
W/S forward/back, A/D strafe, Space/C up/down, Q/E roll, Shift = 4x, Alt = 0.1x
(`engine-gmt/navigation/modifiers.ts`: `CAMERA_BOOST_MULT = 4.0`, `CAMERA_PRECISE_MULT = 0.1`).
Left-drag looks around; it is a *rate* control (the further the drag from where it started, the
faster the turn - `dragDelta` into `CameraController.update`, `tr.y = -inputs.dragDelta.x * 2.0`),
not pointer lock. Mouse wheel changes the fly speed setting (0.001 to 1.0, `handleWheel`).
Touch: two joysticks arrive as window events `joyMove` / `joyLook` (`handleJoyMove`,
`handleJoyLook`).

**Speed feel** (`engine-gmt/engine/controllers/CameraController.ts`, `update`):

```
const minDist = inputs.move.boost ? 1e-4 : 0;
const clampedDist = Math.max(effectiveDist, minDist);
const targetSpeed = settings.autoSlow
    ? Math.max(clampedDist * settings.baseSpeed * boost, 1e-6)
    : 2.0 * settings.baseSpeed * boost;
```

So speed = distance x fly-speed setting x boost, per second, with "auto-slow" on by default
(`engine-gmt/features/navigation.ts`, `autoSlow: default true`, `flySpeed: default 0.5`). Rising
distance is eased in (`DIST_INCREASE_LERP_RATE = 1.2`), falling distance applies at once. The
move itself leaves the controller as an event, not as a camera write:

```
FractalEvents.emit('offset_shift', { x: mv.x, y: mv.y, z: mv.z });
```

**Where "distance" comes from.** The worker reads ONE pixel, the centre of the previous frame,
every third frame, from the alpha channel of the accumulation target
(`engine-gmt/engine/worker/WorkerDepthReadback.ts`, `tick`: `tickCount % 3 === 0`,
`_issueReadback` reads `cx, cy, 1, 1`; `_checkFence` writes `engine.lastMeasuredDistance` and
`engine.centerIsSky`). It is the distance along the centre ray to whatever is under the
crosshair - not the nearest surface in any direction. It crosses to the main thread in the
worker's shadow state (`engine-gmt/engine/worker/WorkerProxy.ts`, `get lastMeasuredDistance()`),
is smoothed in `engine-gmt/navigation/usePhysicsProbe.ts` (`processDepthData`: +8% per frame on
a rise over 1.5x, instant on a fall; sky keeps the last value floored at `1e-4`) and lands in
`distAverageRef`, which is what `CameraController` gets as `distEstimate`. Because the target can
be half-float (`rt.texture.type === HalfFloatType`), the read-back cannot represent a distance
below about 6e-8 at all.

**Collision.** There is none. "Auto-slow on collision" is only the speed law above: speed falls
to zero as distance falls to zero. Nothing stops the camera passing through a surface.

**Orbit** (`engine-gmt/navigation/Navigation.tsx`): left-drag rotates about the point under the
cursor (custom handler, `orbitCursorAnchor` default on, uses `engine.pickWorldPosition`), wheel
and middle-drag dolly toward that point, right-drag pans through drei's `OrbitControls`, Q/E
roll. Every gesture ends by folding `camera.position` into the scene offset
(`absorbOrbitPosition`).

**HUD** (`engine-gmt/navigation/HudOverlay.tsx`, text written by `usePhysicsProbe.ts`):
`DST <distance>` (`formatDist`: `d < 0.001 ? d.toExponential(2) : d.toFixed(4)`; red below 1.0,
grey with "(sky)"), `SPD <n>%` in Fly (also a drag slider, drawn on a log scale
`(Math.log10(flySpeed) + 3) / 3`), a crosshair, the orbit pivot dot, a hint line
(`'WASD Move · Space/C Vert · Shift Boost'`), and a Reset button that appears on its own when
`dist > MAX_SKY_DISTANCE || dist < 0.001` (`updateResetButton`) and turns into "Step Back" when
the camera is already at the formula's default (`isCameraAtFormulaDefault`).

**Reset / home** (`engine-gmt/store/cameraSlice.ts`): `resetToFormulaDefault` reads the active
formula's default preset and calls `teleportToOffset`, which sets `sceneOffset`, `cameraRot`,
`targetDistance` and emits `CAMERA_TELEPORT`. `stepBackFromCurrent` moves back exactly 1.0 unit
(`STEP_BACK_DISTANCE = 1.0`).

**How the camera reaches the renderer.** Position lives in `VirtualSpace`
(`engine/plugins/navigation/core/VirtualSpace.ts`) as six doubles (`x,y,z` + `xL,yL,zL`). Moves
arrive as `OFFSET_SHIFT` (three doubles), jumps as `OFFSET_SET` / `CAMERA_TELEPORT`
(`engine/FractalEvents.ts`; forwarded to the worker in
`engine-gmt/renderer/GmtRendererTickDriver.tsx`; applied in `engine-gmt/engine/FractalEngine.ts`:
`this.virtualSpace.move(x, y, z)`). `UniformManager` then packs it for the shader
(`engine-gmt/engine/managers/UniformManager.ts` calls
`this.virtualSpace.updateShaderUniforms(effectiveCamPos, ...)`), and that function is where the
precision ceiling is fixed:

```
const totalX = this.offset.x + this.offset.xL + cameraPosition.x;   // one double
const highX = Math.fround(totalX);
uniformLow.set(totalX - highX, ...);
```

The pair is summed into a single double before it is split, so the shader never sees more than
about 1e-16 of position, whatever the pair holds. Field of view enters the same manager as
`const tanFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5)` scaled into `CamBasisY`;
`engine-gmt/features/optics.ts` declares `camFov` 10 to 150, default 60, plus orthographic,
360 skybox and depth-of-field.

## 2. Three facts that decide most verdicts

1. **The fly integrator already hands out its move as a plain double delta.**
   `CameraController.update` emits `offset_shift` with f64 components; the page does the same
   thing internally: `camHP[j] += hp.fromNum(v[j]*s)` (page line ~3675). A double represents
   1e-77 without trouble (doubles reach 1e-308). So GMT's fly maths can drive a 256-bit camera:
   the shell listens for the delta and adds it to its own BigInt position. **The deep-zoom shell
   does not need package F8** (the double-double VirtualSpace) - VirtualSpace is simply not the
   position store in that shell. F8 stays a GMT-internal question.
2. **Everything in `engine-gmt/navigation/` is welded to GMT's renderer object and to
   react-three-fiber.** `Navigation.tsx`, `usePhysicsProbe.ts`, `useInputController.ts` all do
   `import { useThree, useFrame } from '@react-three/fiber'`; the first two do
   `const engine = getProxy()` from `engine-gmt/engine/worker/WorkerProxy`. None of it can be
   mounted beside a renderer that owns its own canvas. Only `VirtualSpace` was moved into
   `engine/plugins/navigation/core/` ("Stage-1 navigation extraction (2026-04-24)" in its
   header); `engine/plugins/navigation/` contains nothing else.
3. **The speed law is the same law, but the constants are absolute.** The page:
   `speed = smoothedDist * cam.baseSpeed * boost * dt * 60`, rise eased with `exp(-1.2*dt)`,
   Shift = 4.0 - visibly the ancestor or twin of `CameraController`. But GMT adds floors that
   are fatal at depth: speed floor `1e-6` units per second (at a surface distance of 1e-20 one
   frame of W throws the camera 14 decades), Shift floor `1e-4`, sky floor `1e-4`, Reset prompt
   at `dist < 0.001`, orbit pivot rejects `dist <= 1e-7`, teleport ignores
   `targetDistance <= 0.001`, absorb skips `camera.position.lengthSq() < 1e-8`, movement
   detection `> 1e-12`. GMT's own marcher stops near 1e-6, so these never bit.

One difference in meaning, not in code: GMT's distance is "depth under the crosshair"; the
page's is "nearest surface from the camera", exact, from the reference orbit
(`rawDist = 0.5*Rk*log(Rk)/DRk`, page lines ~3660-3668). Flying past a wall while looking into
open space is fast in GMT and slow in the page. A distance-source seam should let the source say
which kind it is; the fly law does not care.

## 3. Verdict table

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Depth read-back (`WorkerDepthReadback`) | A GMT worker, an accumulation target with depth in alpha, half-float possible | ADAPTER (not used) | None. The renderer module publishes its own exact distance each frame (it already computes `smoothedDist`; `window.__smoothedDist` is the page's handle). | 0 | Nothing touched. |
| Distance into navigation | One global: `engine.lastMeasuredDistance` / `centerIsSky` on GMT's `WorkerProxy`, read in `usePhysicsProbe`, `Navigation.initOrbitPivot`, `scene_widgets`, drawing, camera manager | **REWORK** | A distance-source registration in `engine/plugins/navigation`: an app registers `() => { distance: number, hit: boolean, kind: 'centre-ray' or 'nearest' }`. GMT registers one that returns the proxy's two fields; `usePhysicsProbe` reads the source instead of `engine`. No behaviour change for GMT. | 0.5 session | Gain: the 15 or so scattered readers of `lastMeasuredDistance` get one named contract. Risk: low; a node test that GMT's source returns the proxy values. |
| Fly integrator (`CameraController`) | Lives in `engine-gmt/engine/controllers`; absolute floors `1e-6` and `1e-4`; roll always on; emits `offset_shift` by string | **REWORK** | Move it into `engine/plugins/navigation` (it imports only three, the event bus and `modifiers`), and turn the two floors and "roll enabled" into constructor options whose defaults are today's numbers. A deep app passes floor 0 and roll off. | 1 session | Gain: stage 2 of an extraction already started. Risk: fly feel is sacred - guard with a node test that replays a fixed input script and compares the emitted deltas with today's to the last bit. |
| Position sink (`OFFSET_SHIFT`, `OFFSET_SET`, `CAMERA_TELEPORT`) | Listener is GMT's engine; payloads are doubles / `PreciseVector3` | ADAPTER for moves; NOT-NOW for jumps | Moves: the shell subscribes to `OFFSET_SHIFT` on `engine/FractalEvents.ts` and adds the delta to its BigInt position. Jumps: a `CameraState` cannot carry 256 bits, so the shell keeps its own jump path (its camera adapter, opaque JSON, `engine/plugins/Camera.ts` `CameraAdapter`). | 0.25 session | Nothing touched. |
| `VirtualSpace` (position store, smoothing) | Double pair, summed to one double at the uniform step: about 1e-16 | NOT-NOW | Not used by the shell. F8 would only matter for deep zoom *inside* GMT's own marcher. | 0 | Avoids the F8 risk (saved `sceneOffset` values changing). |
| Keys, wheel, joystick state (`useInputController`) | Needs an R3F canvas (`useThree().gl.domElement`, `useFrame`); reads GMT store fields `invertY`, `isTimelineHovered`, `optics.camType`; opens the ADR-0061 `camera` interaction session | **REWORK** | Split the hook: a renderer-free part in `engine/plugins/navigation` that takes a DOM element and a tick callback and returns `moveState`, joystick refs, modifiers, `isInteracting`; GMT's hook becomes a thin wrapper that supplies `gl.domElement`, `useFrame` and the orthographic wheel case. Movement lock already goes through the generic `selectMovementLock`. | 1 session | Gain: touch joysticks, Shift/Alt, typing-target guard, blur reset, interaction session for free in every app. Risk: medium - the interaction-session edges (ADR-0061) must stay balanced; reuse its existing smoke. |
| Speed modifiers (`modifiers.ts`) | Pure functions | AS-IS | Moves with the integrator. | 0 | - |
| Mouse look | GMT: left-drag rate control with reticle. Page: pointer lock, `cam.yaw += e.movementX*0.0009` | ADAPTER, owner's call on feel | The shell picks one. GMT's drag-look comes with the integrator; pointer lock is the renderer's own and would have to be offered as a second look source if both are wanted. | 0 to 0.5 session | A feel decision, not an engineering one. |
| Roll (Q/E) and the key map | GMT: Q/E roll, Space/C vertical. Page: Q/E vertical, no roll, yaw + pitch only | ADAPTER | Shell passes "roll off" to the integrator and feeds the renderer a look basis instead of yaw/pitch (the page builds `{fwd,right,up}` in `basis()` and moves along them, so a basis input is natural - shader side unverified). Keys follow GMT: Space/C vertical. | 0.5 session in the renderer module | GMT untouched. If the renderer later accepts a full basis, roll comes for free. |
| Field of view (`optics.camFov`, `UniformManager` `tanFov`) | 10 to 150 degrees, default 60, GMT uniforms; also ortho, skybox, DOF in the same feature | ADAPTER for FOV; NOT-NOW for the rest | The optics feature is GMT's (its params name GMT uniforms). The shell declares its own `fov` param, default 34.1, and the renderer module turns its constant into a parameter. Ortho / skybox / DOF apply only when the deep renderer has those projections; focus lock needs a centre-ray distance. | 0.5 session in the renderer module | Nothing touched. |
| Iterations rising with depth | Nothing in GMT navigation does this | ADAPTER | Stays in the renderer module (`rec = min(160, 32 + ceil(1.35 * -log10(dist)))`, page ~3645); the shell shows the number. | 0 | - |
| HUD distance and speed readouts (`usePhysicsProbe` writers, `HudOverlay`) | Text written straight into GMT's HUD spans; red below 1.0; Reset prompt at `< 0.001`; reads `cameraMode`, `resetCamera`, `stepBackCamera`, tutorial anchors | **REWORK** (small) or ADAPTER | `formatDist` already prints scientific notation below 0.001 (two decimals), so the number format is fine. Generic change: the "you are lost" test becomes a predicate the app registers (GMT: `dist > MAX_SKY_DISTANCE or dist < 0.001`; a deep app: sky only), and the colour threshold likewise. If the owner prefers zero GMT changes, the shell writes its own two HUD widgets through `engine/plugins/Hud.tsx` (what the blueprint already plans) and loses the shared look. | 0.5 session (predicate) or 0 (own widgets) | Gain: one HUD cluster shared by apps. Risk: low. |
| Reset / home / Step Back (`cameraSlice`) | "Home" = the active GMT formula's default preset; step back = exactly 1.0 unit; payload is `CameraState` | ADAPTER | The shell registers its own home (its start view) and its own step back (a multiple of the current distance). Only the HUD button is shared, through the predicate above. | 0.25 session | Nothing touched. |
| Orbit mode, cursor-anchored pivot, pan, dolly (`Navigation.tsx`, about 1,100 of its 1,561 lines) | drei `OrbitControls` on an R3F camera; pivot stored as a world position in doubles ("World coordinates are stable across absorbs"); `engine.pickWorldPosition`; absorb thresholds `1e-8`, `1e-4` | NOT-NOW (a REWORK when wanted) | Would need: a pick source registration (the deep renderer can answer from its G-buffer depth), the pivot kept camera-relative instead of world, and every absolute threshold scaled by distance. Below 1e-16 a world-space pivot in doubles is meaningless. | 3 to 4 sessions, high regression risk in GMT's most-used gesture | What would make it apply: the owner asking for orbit at depth. Fly is the deep zoomer's native mode. |
| Camera animation, Key Cam, saved cameras (`cameraBinders`, `cameraSlice`) | `CameraState` of doubles through `CAMERA_TELEPORT` / `CAMERA_TRANSITION` | NOT-NOW here | Another reader's area; noted only because every one of them goes through the jump events that cannot carry the position. | - | - |

## 4. What the deep zoomer gains once the three seams exist

With the distance source, the relocated integrator and the renderer-free input hook in place,
the shell gets without writing them: W/A/S/D + Space/C flying with GMT's exact easing, Shift 4x
and Alt 0.1x, wheel-adjusts-speed, the log speed slider, touch joysticks
(`components/MobileControls.tsx` dispatches the `joyMove` / `joyLook` events - sender not opened,
unverified), invert-Y, the typing-target guard, window-blur key release, the movement lock used
by export and picking (`selectMovementLock`), and the ADR-0061 interaction session that tells the
rest of the engine "the camera is moving" (adaptive quality, accumulation reset). It does NOT
gain orbit, focus point / focus lock, or cursor-anchored zoom - those need the orbit rework and a
centre-ray distance.

## 5. Order and total

1. Distance source registration - 0.5 session. Unblocks everything else, zero behaviour change.
2. Integrator into `engine/plugins/navigation` with floors and roll as options - 1 session,
   with the replay test written first against today's code.
3. Renderer-free input hook - 1 session.
4. HUD predicate - 0.5 session (optional).

About 3 sessions of engine work, all of it behaviour-preserving for GMT, against roughly 1
session saved in the shell and a permanent second copy of fly controls avoided. If the owner
wants the shell flying this week, the fallback is honest: keep the page's own fly loop (it is
the same law) and do steps 1 to 3 afterwards - but that is the parallel copy the standing rules
warn about, so it should be recorded as a debt with a date.

## 6. Unverified

- That the page's shaders take the camera only as a basis (so roll and a variable field of view
  are cheap in the renderer module). I read `basis()` being used for movement and the yaw line,
  not the uniform upload.
- Where 34.1 degrees is set in the page; I did not find or open that line.
- `components/MobileControls.tsx` as the sender of `joyMove` / `joyLook` (grep hit only).
- Whether the shell's canvas is outside react-three-fiber (taken from the brief's "GMT's canvas
  cannot be shared"; `plans/deep-zoom-shell/BLUEPRINT.md` was only grepped, not read through).
- `Navigation.tsx` lines 480 to 1150 and 1180 to 1370 (transition, teleport and orbit gesture
  bodies) were read by grep, not line by line; the threshold constants quoted from them are
  exact, their surrounding logic is summarised from the file's header comment.
- `getFormulaDefaultCamera`, `CameraUtils`, `engine.pickWorldPosition` bodies - not opened.
- F8 text is quoted from `plans/deep-zoom-in-gmt/WORK-PACKAGES.md`; I re-read
  `VirtualSpace.normalize` and `updateShaderUniforms` myself and they match it.
- All sizes are estimates from reading, nothing was built or run.
