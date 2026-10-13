# Critic - navigation (section 3 of GMT-SYSTEMS.md)

Read-only review, 2026-10-07. Files opened in full: `engine/plugins/navigation/core/VirtualSpace.ts`,
`engine-gmt/engine/controllers/CameraController.ts`, `engine-gmt/navigation/usePhysicsProbe.ts`,
`engine-gmt/navigation/modifiers.ts`. Opened in part: `engine-gmt/navigation/useInputController.ts`
(lines 28-66, 126-150, 195-335), `engine-gmt/navigation/Navigation.tsx` (grep of every position /
distance read, plus lines 1378-1442), `mandelbulb_deepzoom/index.html` (grep + lines 3641-3678),
`engine-gmt/engine/worker/WorkerProxy.ts` (grep). Not opened: `HudOverlay.tsx`, `deep-zoom/renderer/`
(the port), `components/MobileControls.tsx`, the research files under `gmt-systems/`.

## Verdict

The central idea holds. The fly integrator and the input hook never hold the absolute position:

- `CameraController.update` reads only `camera.quaternion` (`tv.clone().applyQuaternion(camera.quaternion)`)
  and writes only `camera.rotateX/Y/Z` plus one emit, `FractalEvents.emit('offset_shift', { x: mv.x, y: mv.y, z: mv.z })`.
  All of it is JS doubles; a 1e-77 displacement survives.
- `useInputController` reads no position at all.
- Every position read I found in navigation (`engine.sceneOffset` at `snapshotHoverPivotLocal`,
  `absorbOrbitPosition`, the transition handler, the save-on-interaction-end block that calls
  `engine.virtualSpace.getUnifiedCameraState`, the reticle projection) lives in `Navigation.tsx`,
  which the shell does not mount. So "covered" is true by exclusion, not by a seam.

Every function section 3 names exists and the quoted lines are in the code (checked: `safeDelta`,
the `1e-6` and `1e-4` floors, `tr.y = -inputs.dragDelta.x * 2.0`, the `[0.001, 1.0]` wheel clamp,
`Math.max(distAverageRef.current, 1e-4)`, `dist > MAX_SKY_DISTANCE || dist < 0.001`, the two
`OFFSET_SHIFT` listeners, `window.__moveAlong`, `window.__lockInput`, the `rec` formula, the single
`CameraController` call site, `flySpeed` default 0.5). The dive-time arithmetic is right.

Five things are wrong or missing. Two change the step plan.

## Findings

### 1. WRONG - yaw/pitch with "roll off" does not work as an adapter on this integrator

`CameraController.update` turns the camera with

    camera.rotateX(v.x * safeDelta * this.SENSITIVITY);
    camera.rotateY(v.y * safeDelta * this.SENSITIVITY);
    camera.rotateZ(v.z * safeDelta * this.SENSITIVITY);

three.js `rotateY` turns about the object's own up axis. Once pitch is not zero, turning left/right
tilts the horizon - roll accumulates from yaw alone, with Q/E never pressed. The page turns about
world Y (`cam.yaw += e.movementX*0.0009`, pitch clamped at 1.55).

Section 3.2(d) prices the cheap option at "0.25 session in the shell" as a one-way conversion and
3.2(c) lists `roll` as a setting. Neither says the yaw axis changes. If the shell only extracts
yaw/pitch each frame, the object the integrator holds keeps its roll, and the next move uses
`tv.applyQuaternion(camera.quaternion)` with a basis the picture is not drawn with: strafe and
Space/C go off-axis from what is on screen, growing as the user looks around.

Fix: either (a) the shell writes the cleaned quaternion (yaw about world Y, pitch clamped, roll
zero) back into the object every frame before the next `update` - say so in N5, it is the adapter's
job and it is cheap; or (b) the integrator gets an `upAxis: 'local' | 'world'` setting (default
local = today) instead of a bare `roll` boolean. (a) keeps GMT untouched. Either way the feel of
looking around differs from GMT's free-fly, and that is not stated in 3.1.

### 2. WRONG - step N1 (distance source) is not needed by the shell, and it is the least guarded GMT change

The integrator already takes the distance as a plain argument: `settings: { baseSpeed, distEstimate, autoSlow }`,
fed in `Navigation.tsx` by `distEstimate: distAverageRef.current`. The shell's `navigation.ts` can
pass the module's distance straight in. No registration is required for flying.

Meanwhile `usePhysicsProbe` is not a reader of `engine.lastMeasuredDistance`, it is a reader AND a
writer. It writes the smoothed, sky-floored value back in four places
(`engine.lastMeasuredDistance = 1.0`, `= distAverageRef.current`, `= smoothed`, `= manualDistance`),
`Navigation.tsx` writes it too (`engine.lastMeasuredDistance = newState.targetDistance`), and the
proxy has a setter (`set lastMeasuredDistance(v)` in `WorkerProxy.ts`). The write-back is load-bearing:
the worker branch only reprocesses when `shadowDist !== distAverageRef.current`. A read-only
`() => ({ distance, hit, kind })` contract either leaves the write-back on GMT's proxy (then the
source is a wrapper around nothing) or drops it (then the 8%-per-frame blend runs every frame instead
of once per worker reading, and fly-speed ramp-up changes).

The hook also depends on things the contract does not mention: `isCameraAtFormulaDefault`
(a position read through GMT's camera slice), `quality.physicsProbeMode` / `manualDistance`,
Focus Lock (`setOptics({ dofFocus })`), `engine.hasCompiledShader`, and the direct-mode depth read.

N0's replay test does not cover any of this (it drives `update` only), and section 3.3 itself says
no smoke flies. So N1 is first in the order, touches about 15 readers, and has no guard that would
go red.

Fix: take N1 out of "now". Order becomes N0, N2, N3, N4, N5. Bring the distance source back only
with N6 (shared HUD) or the focus widgets, with its own guard, and write the contract with the
write side in it.

### 3. WRONG - Alt does not slow flying in GMT

3.1 says "Shift 4x, Alt 0.1x" and row "Speed model" says "distance x fly speed x (4 with Shift, 0.1 with Alt)".
In `CameraController.update` translation uses only

    const boost = inputs.move.boost ? 4.0 : 1.0;

`precise` reaches `getCameraModifier` only for roll (`rollMod`). The other use,
`Navigation.tsx` `const speedMod = getCameraModifier(moveState.current.boost, moveState.current.precise)`,
is in the Orbit branch. Alt does scale the wheel step (`getCameraModifierFromEvent(e)` in `handleWheel`).
The page has no Alt at all (`const boost = keys['ShiftLeft']||keys['ShiftRight'] ? 4.0 : 1.0`).

Fix: either drop "Alt 0.1x" from 3.1, or state it as a new behaviour for both apps (a change to
GMT's feel, owner decision) rather than something that exists.

### 4. MISSING - the input-hook contract leaves out inputs the hook really has, and widening `speedRange` alone gives an unusable wheel

`useNavigationInput({ element, tick, isLocked, invertY, speed, setSpeed, speedRange, onWheel?, onActivity? })`
against what `useInputController` actually reads (document says "three store reads"):

- `mode: CameraMode` - branches in `handleWheel`, `onMouseDown`, `onMouseMove` and resets joysticks on change.
- `useFractalStore.getState().isTimelineHovered` - keys are ignored while the timeline is hovered. Not in the contract; the shell has a timeline (stage 6).
- `useMobileLayout()` - `if (isMobile && mode === 'Fly') return;` drag-look is switched off on phones, so phone flight rests entirely on the `joyMove` / `joyLook` senders the document marks unverified.
- `hudRefs` click exclusion, with the `.pointer-events-auto` fallback.
- `beginInteraction` / `pokeInteraction` / `endInteraction` on the store (three calls, not one `onActivity`).
- `selectMovementLock` in three places, `setOptics` / `optics.camType` / `optics.orthoScale`.

And the wheel law is additive with fixed steps:

    let step = 0.01; if (current < 0.05) step = 0.005; if (current > 0.1) step = 0.02;
    let next = Math.max(0.001, Math.min(1.0, current + (dir * step)));

The page's rate is 3.6 x distance per second, so the shell's range must reach at least 3.6.
From 0.5 that is 155 wheel notches at 0.02 each. The HUD line `SPD ${(speedRef.current * 100).toFixed(1)}%`
also assumes a top of 1.0. `speedRange` is not enough; the step law must be a setting too
(default = today's three steps), or the shell supplies its whole wheel handler through `onWheel`.

Fix: add `mode`, `isSuppressed()` (timeline hover and the like), `isTouchLayout`, `excludeTarget(el)`
and a three-edge activity callback to the contract; make the wheel step a function with today's as
default. N3 stays about 1 session but the wrapper is thicker than "three store reads" suggests.

### 5. MISSING - flying differences from the page that 3.1 does not admit

Checked against the page's loop (`index.html` near `const speed = smoothedDist * cam.baseSpeed * boost * dt * 60`):

- **Up/down axis.** Page: `mv([0,1,0], speed)` - world Y, on E/Q. GMT: `tv.y += 1` then
  `applyQuaternion(camera.quaternion)` - the camera's own up, on Space/C. Looking down and pressing
  "up" moves differently. 3.1 mentions the key change but not the axis.
- **Keys add, GMT normalises.** Page applies each held key at full speed (W+D = 1.41x). GMT does
  `tv.normalize()`. Small, but dive timings measured on the page will not match.
- **Two smoothers on one distance.** The page already eases the distance up at the same rate
  (`smoothedDist += (rawDist-smoothedDist)*(1-Math.exp(-1.2*dt))`) and its automatic iteration count,
  resolution cap and `refE` all read that `smoothedDist`. The integrator keeps its own copy
  (`smoothedDistEstimate`, `DIST_INCREASE_LERP_RATE = 1.2`, starts at 1.0, `reset()` returns it to 1.0).
  The document correctly feeds `rawDist` so the easing is not doubled, but then speed and iteration
  count follow two separately-clocked copies. Harmless if N4 guarantees the module keeps computing
  `rawDist` / `smoothedDist` every frame when the host owns input - state that as an N4 acceptance
  line (the port was not opened, unverified).
- **`autoSlow`.** The other branch of the speed line is `2.0 * settings.baseSpeed * boost` - an
  absolute speed. The shell must hard-wire `autoSlow: true`; one absolute-speed frame at depth is the
  same failure as the `1e-6` floor.
- **Exact position.** Not lost. The sink's doubles go through the same `hp.fromNum` path the page's
  own keys use (`camHP[j] += hp.fromNum(v[j]*s)` vs `__moveAlong`'s `hp.fromNum(dir[j]*dist)`). The
  shell should call `moveAlong([dx,dy,dz], 1)` rather than normalise and re-multiply.

## Step order

Safe for GMT once N1 is removed: N0 guards N2; N3 has `test:interaction*`. N2's defaults must be
proven identical by N0 including a held-Shift case at a tiny distance (covers the `1e-4` floor) and
an `autoSlow: false` case, otherwise the two floors move unguarded.
