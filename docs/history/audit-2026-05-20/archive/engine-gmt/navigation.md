---
source: engine-gmt/navigation/Navigation.tsx
lines: 1404
last_verified_sha: a3f4d36fc77b5ee89b03958235f2d6a663c8afd5
additional_sources:
  - engine-gmt/navigation/HudOverlay.tsx
  - engine-gmt/navigation/index.ts
  - engine-gmt/navigation/modifiers.ts
  - engine-gmt/navigation/useInputController.ts
  - engine-gmt/navigation/usePhysicsProbe.ts
audited: 2026-05-20T07:43:00Z
audited_by: claude-opus-4-7
public_api:
  - GmtNavigation
  - GmtNavigationHud
  - CameraMode
  - CameraState
  - PreciseVector3
  - CAMERA_BOOST_MULT
  - CAMERA_PRECISE_MULT
  - getCameraModifier
  - getCameraModifierFromEvent
  - useInputController
  - usePhysicsProbe
depends_on:
  - e03-animation
---

# GMT navigation (camera + HUD + physics)

The navigation subsystem owns the GMT camera: two pose-sharing modes (Orbit and Fly) driving a single R3F camera, the HUD that reads back surface distance and speed, the physics probe that drives both, and the input controller that maps keyboard/mouse/wheel/joystick to camera intent. It is a verbatim port of GMT's navigation system into `engine-gmt/` with path-rewrites only, zero logic changes (engine-gmt/navigation/index.ts:1-20). The unified coordinate system — `world = sceneOffset + camera.position`, with `camera.position` absorbed back into `sceneOffset` between gestures to preserve f32 mantissa headroom at deep zoom — is the load-bearing invariant the entire integrator is built around (engine-gmt/navigation/Navigation.tsx:21-29).

## Public API

The barrel re-exports two default components plus three type aliases lifted from `../types` (engine-gmt/navigation/index.ts:22-24). The two hooks (`useInputController`, `usePhysicsProbe`) and the four modifier helpers are internal to the subsystem — Navigation is their only consumer — but verifier-discoverable because they are named exports on their files.

| Symbol | Kind | Source | Notes |
|--------|------|--------|-------|
| `GmtNavigation` | default export of `Navigation.tsx` | engine-gmt/navigation/index.ts:22 | Mount inside a Canvas. Returns `null` outside Orbit mode; in Orbit mode renders `<OrbitControls />` and runs the integrator via `useFrame` (engine-gmt/navigation/Navigation.tsx:1351). |
| `GmtNavigationHud` | default export of `HudOverlay.tsx` | engine-gmt/navigation/index.ts:23 | Self-subscribes to the engine store via per-field selectors so the parent stays free to narrow its own subscription (engine-gmt/navigation/HudOverlay.tsx:38-50). |
| `CameraMode` / `CameraState` / `PreciseVector3` | type re-exports | engine-gmt/navigation/index.ts:24 | Defined in `engine-gmt/types`; canonical Camera-state shape used by teleport events and store. |
| `CAMERA_BOOST_MULT` | const = `4.0` | engine-gmt/navigation/modifiers.ts:8 | Shift modifier. |
| `CAMERA_PRECISE_MULT` | const = `0.1` | engine-gmt/navigation/modifiers.ts:9 | Alt modifier. |
| `getCameraModifier(boost, precise)` | helper | engine-gmt/navigation/modifiers.ts:11-16 | Composes multiplicatively. Shift+Alt = `0.4×`. |
| `getCameraModifierFromEvent(e)` | helper | engine-gmt/navigation/modifiers.ts:18-19 | Reads `shiftKey` + `altKey` off a KeyboardEvent/MouseEvent/WheelEvent. |
| `useInputController(mode, speed, setSpeed, hudRefs?)` | hook | engine-gmt/navigation/useInputController.ts:15-19 | Returns `{ moveState, isDraggingRef, dragStart, mousePos, speedRef, joystickMove, joystickLook, invertY, rollVelocity, isInteracting }` (engine-gmt/navigation/useInputController.ts:264). |
| `usePhysicsProbe(hudRefs, speedRef)` | hook | engine-gmt/navigation/usePhysicsProbe.ts:12-19 | Returns `{ distAverageRef }`; writes SPD/DST/reset HUD elements imperatively each frame (engine-gmt/navigation/usePhysicsProbe.ts:172). |

`GmtNavigation` props (engine-gmt/navigation/Navigation.tsx:120-133): `mode: CameraMode`, optional `onStart(state: CameraState)` / `onEnd()` callbacks fired at the start and end of detected movement (1174-1180, 1191-1217), `hudRefs` (container/speed/dist/reset/reticle), `setSceneOffset(v)`, `fitScale = 1.0` (scales drag delta in Fly mode so fixed-resolution mode doesn't amplify sensitivity — engine-gmt/navigation/Navigation.tsx:1226-1228).

`GmtNavigationHud` props (engine-gmt/navigation/HudOverlay.tsx:13-30): `isMobile`, optional `activeHint`/`onDismissHint` (typed `ActiveHint = unknown`; hint widget NOT rendered by the engine — see Interactions below), `hudRefs`, `region: 'top' | 'bottom' | 'all'` (defaults to `'all'`; the split lets apps anchor the bottom cluster outside a scaled canvas in Fixed mode — engine-gmt/navigation/HudOverlay.tsx:24-29).

## Architecture

### Single component, two modes, ~20 shared refs

Orbit and Fly are NOT independent components. They share the camera, the VirtualSpace `sceneOffset`, the gesture pivot refs, and the per-frame integrator. The header comment justifies the file's size by listing ~20 dense refs as the cost of splitting (engine-gmt/navigation/Navigation.tsx:6-19). Outside Orbit mode the JSX returns `null` and only the refs + `useFrame` body run (engine-gmt/navigation/Navigation.tsx:1351).

### Unified coordinate system

Canonical world position = `sceneOffset + camera.position`. In steady state `camera.position = (0,0,0)` and `sceneOffset` carries the world coordinate. Mid-gesture `camera.position` accumulates motion locally; each absorb bakes it into `sceneOffset` and resets `camera.position` to zero, preserving f32 mantissa headroom at deep zoom (engine-gmt/navigation/Navigation.tsx:21-29).

`absorbOrbitPosition(silent, keepTarget)` (engine-gmt/navigation/Navigation.tsx:265-325) is the canonical absorb call:

| Caller | `silent` | `keepTarget` | Path |
|--------|----------|--------------|------|
| Orbit `onEnd`, custom-orbit `onUp`, wheel per-event, middle-drag per-event/onUp | `true` | `false` | Atomic `engine.queueOffsetSync(absorbed)` + direct `useFractalStore.setState({ sceneOffset })` to skip OFFSET_SET re-emit and accumulation reset, while still keeping `getPreset()` / share-links accurate (engine-gmt/navigation/Navigation.tsx:311-323). |
| Per-frame pan absorb (drei PAN) | `true` | `true` | As above plus shifts `OrbitControls.target` by `-camera.position` so its world position stays put (engine-gmt/navigation/Navigation.tsx:297-302). |
| Mode-switch `useLayoutEffect` safety | `false` | `false` | Full `setSceneOffset(...)` (worker sync + accumulation reset) — used when the gesture context is being torn down anyway (engine-gmt/navigation/Navigation.tsx:995). |

The `absorbGenRef` counter (engine-gmt/navigation/Navigation.tsx:204) increments on every absorb (engine-gmt/navigation/Navigation.tsx:273). Any hover pick issued before that increment was computed against the old `sceneOffset`; on resolution at engine-gmt/navigation/Navigation.tsx:557 it compares the gen-at-issue against the current gen and drops the result if they differ. Symptom this fixes: "quicker the interaction → more likely glitch" (engine-gmt/navigation/Navigation.tsx:197-204).

### Cursor-anchored gesture pivots

Two refs hold the orbit/zoom pivot:

- `hoverPivotWorldRef` — WORLD-space, stable across gestures (sceneOffset shifts between gestures); `null` = pick miss (engine-gmt/navigation/Navigation.tsx:187).
- `gestureActivePivotRef` — LOCAL-space snapshot captured at gesture start, held for the gesture's lifetime so cursor drift doesn't shift the pivot (engine-gmt/navigation/Navigation.tsx:188).

`snapshotHoverPivotLocal()` does the world→local conversion using the CURRENT `sceneOffset` at gesture start (engine-gmt/navigation/Navigation.tsx:218-227).

`cursorAnchorEffective = !isMobile && (navSettings?.orbitCursorAnchor ?? true)` (engine-gmt/navigation/Navigation.tsx:162). The cursor-anchored path is force-disabled on mobile regardless of the saved setting because multi-touch is drei's responsibility and the per-event hover machinery is wasted there (engine-gmt/navigation/Navigation.tsx:157-162).

### Effect roster (source order)

1. **Mount init** (engine-gmt/navigation/Navigation.tsx:353-376) — copy `cameraRot` from store; init orbit pivot if Orbit.
2. **Teleport / transition listener** (engine-gmt/navigation/Navigation.tsx:379-471) — subscribes to `FractalEvents.on('camera_teleport', ...)` and `on('camera_transition', ...)` (engine-gmt/navigation/Navigation.tsx:468-470). Teleport sets camera+offset directly, reseeds `distAverageRef` / `orbitRadiusRef`, re-syncs orbit target preserving roll via `camera.up` rebuild (engine-gmt/navigation/Navigation.tsx:380-424). Transition lerps unified position + slerps rotation over 0.5 s, then emits a final `camera_teleport` to commit exact precision (engine-gmt/navigation/Navigation.tsx:427-470, 1037-1077).
3. **Hover pre-pick** (engine-gmt/navigation/Navigation.tsx:523-563) — Orbit-only `pointermove` on `gl.domElement`. Self-throttling in-flight gate (`hoverPickInFlightRef` at engine-gmt/navigation/Navigation.tsx:195) plus 10 px movement gate (squared px `< 100` at engine-gmt/navigation/Navigation.tsx:542). Skips during ANY active gesture (`isOrbitDragging`, `isScrollingRef`, `isCustomOrbitRef`) at engine-gmt/navigation/Navigation.tsx:536. Pick result is written to `hoverPivotWorldRef` only if `absorbGenRef` is unchanged since issue (engine-gmt/navigation/Navigation.tsx:548-559).
4. **Custom wheel handler** (engine-gmt/navigation/Navigation.tsx:578-657) — TRANSLATION along the cursor→pivot ray: `new_pos = pivot + (camera - pivot) * f`, `f = exp(deltaY * 0.0015 * dollySpeed)` (engine-gmt/navigation/Navigation.tsx:610-612). Bypasses drei's `DOLLY` which would `lookAt(target)` and cause lateral re-orientation (engine-gmt/navigation/Navigation.tsx:565-577). Per-event absorb keeps `camera.position` near zero between events; pivot is shifted by `-camera.position` into the new local frame before absorb (engine-gmt/navigation/Navigation.tsx:622-625). Burst end is a 100 ms `scrollEndTimeout` that does cleanup-only — no offset mutation — so a late firing is harmless (engine-gmt/navigation/Navigation.tsx:644-650).
5. **Custom left-drag orbit** (engine-gmt/navigation/Navigation.tsx:673-831) — Blender-style "rotate around cursor": rotate `(camera.position - pivot)` AND `camera.quaternion` by the same composite quaternion so the pivot's direction-from-camera is invariant in camera-space (engine-gmt/navigation/Navigation.tsx:659-672). Azimuth uses frozen `gestureUpRef` (snapshotted at pointerdown from `camera.up` so Q/E roll between gestures is honoured but within-gesture pole stays put — engine-gmt/navigation/Navigation.tsx:498-500, 720, 772-776). Polar clamped to `[eps, π-eps]` (`eps = 0.02`) at engine-gmt/navigation/Navigation.tsx:781-784. Application is synchronous in `pointermove`, not deferred to `useFrame`, to avoid a 1-frame latency (engine-gmt/navigation/Navigation.tsx:754-761). Touch (`pointerType === 'touch'`) cedes to drei's native `THREE.TOUCH.ROTATE` (engine-gmt/navigation/Navigation.tsx:684-686).
6. **Middle-drag dolly** (engine-gmt/navigation/Navigation.tsx:837-912) — same translation math as wheel but driven by vertical drag (`dy * 0.005`, drag-down = zoom-in, Blender convention) at engine-gmt/navigation/Navigation.tsx:861-866. Same per-event absorb + on-up second absorb (engine-gmt/navigation/Navigation.tsx:883-902).
7. **Pivot-reticle DOM dot** (engine-gmt/navigation/Navigation.tsx:918-943) — imperatively-created `<div>` appended to `gl.domElement.parentElement` in an Orbit-only effect; per-frame positioning via `camera.project()` in the `useFrame` body (engine-gmt/navigation/Navigation.tsx:1107-1147). Active-gesture: full opacity over `gestureActivePivotRef`; idle hover: 0.55 opacity over `hoverPivotWorldRef` re-localised each frame; off-screen/behind-camera: hidden.
8. **Orbit pointer-gate** (engine-gmt/navigation/Navigation.tsx:946-976) — `pointerdown` capture sets `allowOrbitInteraction.current` and `orbitRef.current.enabled = true` only if the click hit the canvas (not a `.pointer-events-auto` overlay).
9. **Camera-lock effect** (engine-gmt/navigation/Navigation.tsx:981-987) — re-initialises orbit pivot on unlock.
10. **Mode-switch `useLayoutEffect`** (engine-gmt/navigation/Navigation.tsx:990-1014) — emits `camera_snap`, force-absorbs residual orbit position (mid-scroll switch safety at engine-gmt/navigation/Navigation.tsx:995), seeds Fly speed from `engine.lastMeasuredDistance` or orbit radius, or reseats orbit pivot via `initOrbitPivot()`.
11. **Per-frame integrator** (engine-gmt/navigation/Navigation.tsx:1016-1349) — transition lerp → camera-lock early-return → orbit-ready re-init → pos/rot delta detect → pivot reticle project → `isCameraInteracting` push → accumulation reset (`engine.dirty`) → keyframe capture if recording → stop-debounce (100 ms) that normalises camera→origin and writes `cameraRot`/`sceneOffset`/`targetDistance` to store (skipping miss sentinel `1000.0`) → Fly or Orbit branch → unified-offset shadow.

### Custom-vs-drei gating

Computed per-frame at engine-gmt/navigation/Navigation.tsx:1278-1285. When `orbitCursorAnchor` is ON, drei is enabled ONLY for PAN (right-drag) while custom handlers own ROTATE/DOLLY/MIDDLE (drei's `mouseButtons` set to `LEFT: -1, MIDDLE: -1, RIGHT: PAN`; `enableZoom={!cursorAnchorEffective}` at engine-gmt/navigation/Navigation.tsx:1368-1371). When OFF, drei owns all of ROTATE/DOLLY/PAN.

### Camera lock

`isCameraLocked = (isPlaying && (!isRecording || !recordCamera) && Object.keys(sequence.tracks).some(k => k.startsWith('camera.'))) || isScrubbing` (engine-gmt/navigation/Navigation.tsx:978). While locked: drei disabled, `setIsCameraInteracting(false)`, `engine.cameraInUse = false`, early return from `useFrame` (engine-gmt/navigation/Navigation.tsx:1079-1087). This is the **dual** of AnimationEngine's `ignoreCamera = isPlaying && isRecording && recordCamera` — same input flags, opposite outputs (suppress input vs. suppress scrub output). They are NOT duplicates; the surfaces are intentionally independent. See followup q-111 for the full reasoning and the third independent reader in `engine/plugins/topbar/PauseControls.tsx`.

### Fly branch

Delegates physics to `flyController = new CameraController()` (imported from `engine-gmt/engine/controllers/CameraController` — outside this subsystem's scope) at engine-gmt/navigation/Navigation.tsx:117, 169, 1242-1258. Drag delta is scaled by `fitScale` to prevent sensitivity amplification under fixed-resolution mode (engine-gmt/navigation/Navigation.tsx:1226-1228). The inertial-reticle DOM ref shows drag offset as a `translate3d` (engine-gmt/navigation/Navigation.tsx:1230-1240).

### Orbit branch tail

Per-frame Q/E roll applied via `applyAxisAngle(fwd, rollAngle)` on `camera.up` (and on `gestureUpRef` if mid custom-orbit so the per-event up reset doesn't strip roll). The manual `orbitRef.current.update()` is skipped when drei is already running to avoid `(1 - dampingFactor)` double-multiplication and the resulting staggered motion (engine-gmt/navigation/Navigation.tsx:1307-1321). Per-frame pan absorb (`keepTarget=true`) runs while `isOrbitDragging` and `camera.position.lengthSq() > 1e-8`, then sets `engine.dirty` because zero `camera.position` masks pan motion from the `posChanged` check (engine-gmt/navigation/Navigation.tsx:1331-1337).

### `unifiedOffsetRef` shadow

Maintained at the end of every `useFrame` as `sceneOffset + camera.position` (engine-gmt/navigation/Navigation.tsx:1340-1348). No consumer inside this subsystem reads it; left in place as a canonical-world-position shadow for external consumers (snapshot pipeline, controllers).

### `useInputController`

Owns keyboard/mouse/wheel/joystick state. Move state has 10 booleans — forward, backward, left, right, up, down, rollLeft, rollRight, boost, precise (engine-gmt/navigation/useInputController.ts:9-13). Key bindings: WASD translate, QE roll, Space up, KeyC down, Shift{L,R} = boost, Alt{L,R} = precise (engine-gmt/navigation/useInputController.ts:82-99). Prevents browser defaults for Ctrl+W, Space, and Alt (engine-gmt/navigation/useInputController.ts:70-76). Ignores keys when the target is `INPUT`/`TEXTAREA`/`contentEditable`/`.cm-editor`, and when `isTimelineHovered` is true (engine-gmt/navigation/useInputController.ts:68-79) — so timeline shortcuts aren't shadowed by WASD.

Roll integration runs in its own `useFrame` (priority default): exponential approach to target with `accelRate = 1.0` while held, `3.0` decaying; scaled by `max(0.1, speedRef.current)` so Q/E retains usability at low fly speed; zeros below 0.001 threshold (engine-gmt/navigation/useInputController.ts:53-64).

Wheel handling (engine-gmt/navigation/useInputController.ts:125-163) respects `selectMovementLock`. Ortho mode (`Math.abs(state.optics.camType - 1.0) < 0.1`) adjusts `state.optics.orthoScale` directly with `(1 + dir * 0.1 * mod)`, clamped `[1e-10, 1000]`. Fly mode adjusts `flySpeed` with step `0.005` (<0.05), `0.01` default, `0.02` (>0.1), clamped `[0.001, 1.0]`. Orbit mode only calls `markActivity()` because Navigation's custom wheel handler owns the real zoom math.

Fly drag origin (engine-gmt/navigation/useInputController.ts:200-225) captures NDC `dragStart` on canvas mouse-down. Mobile + Fly is suppressed (`isMobile && mode === 'Fly'` returns at engine-gmt/navigation/useInputController.ts:215) since joystick is the mobile path; HUD/`pointer-events-auto` click are excluded via `hudRefs.contains` or class fallback (engine-gmt/navigation/useInputController.ts:204-212).

Orbit drag activity (engine-gmt/navigation/useInputController.ts:233-241) only marks activity if the drag target is on the canvas — guards against UI button clicks triggering `isCameraInteracting` → resolution-scaling churn → accumulation reset.

Joystick channel subscribes to `window 'joyMove' / 'joyLook'` `CustomEvent`s carrying `{x, y}` `detail`; values feed `joystickMove.current` / `joystickLook.current` consumed by `CameraController.update` in Fly mode (engine-gmt/navigation/useInputController.ts:35-36, 169-170, 175-176).

`isInteracting()` returns `true` if dragging, any move-key/joystick non-zero, or within 200 ms of the last activity timestamp (covers discrete scroll/key-tap events that don't keep `moveState` true) at engine-gmt/navigation/useInputController.ts:256-262.

### `usePhysicsProbe`

Writes three HUD elements (`speed`, `dist`, `reset`) imperatively each frame, plus mirrors `engine.lastMeasuredDistance` from the depth readback (engine-gmt/navigation/usePhysicsProbe.ts:27-77):

| HUD element | Cadence | Format |
|-------------|---------|--------|
| `speed` | every 10th frame | `SPD ${speedRef * 100}%` (engine-gmt/navigation/usePhysicsProbe.ts:27-31). |
| `dist` | every frame | `DST ${formatDist(d)}`; red `<1.0`, cyan otherwise; sky/invalid uses gray `(sky)` label (engine-gmt/navigation/usePhysicsProbe.ts:33-38, 57). |
| `reset` button | every frame | Auto-shows at `d > MAX_SKY_DISTANCE` OR `d < 0.001`, or always in sky branch (engine-gmt/navigation/usePhysicsProbe.ts:40-44, 58). |

Asymmetric distance smoothing: large increases (`> prev * 1.5`) blend at 8% per frame (~60 frames to converge); decreases snap instantly so fly speed drops immediately on surface approach — intentional for safety/responsiveness when diving toward a surface (engine-gmt/navigation/usePhysicsProbe.ts:64-73).

Probe modes: `qualityState.physicsProbeMode = 0` (auto depth-buffer readback), `1` (same auto path — no explicit branch), `2` (`manualDistance` override at engine-gmt/navigation/usePhysicsProbe.ts:96-104).

Depth readback path (engine-gmt/navigation/usePhysicsProbe.ts:106-167): in worker mode (`!renderer`) reads from `engine.lastMeasuredDistance` shadow state and pushes to `processDepthData` (engine-gmt/navigation/usePhysicsProbe.ts:107-127); direct mode samples a 3×3 neighbourhood around `(width/2, height/2)` via `engine.pipeline.readPixels` against `getPreviousRenderTarget()` (previous-frame to avoid GPU stall) and averages valid depth samples (`>0`, `<MAX_SKY_DISTANCE`, finite) at engine-gmt/navigation/usePhysicsProbe.ts:129-167. Skips during initial shader compile (`!engine.hasCompiledShader || frameCount < 15`) at engine-gmt/navigation/usePhysicsProbe.ts:84-90.

Focus Lock (worker path only): when `store.focusLock` is on, syncs `optics.dofFocus` to smoothed distance if relative change `> 1%` and distance is in `(0, MAX_SKY_DISTANCE)` at engine-gmt/navigation/usePhysicsProbe.ts:114-123.

### HUD overlay

`HudOverlay` self-subscribes to individual store fields (`tabSwitchCount`, `cameraMode`, `navigation`, `showHints`, plus three action callbacks) rather than taking parent props (engine-gmt/navigation/HudOverlay.tsx:38-50), so re-renders fire only on actual visible changes. Synthetic `state`/`actions` objects are constructed locally for prop-style consumer code.

Visibility logic subscribes to `useAnimationStore.isCameraInteracting` via `useAnimationStore.subscribe` (not the React selector), fades the crosshair container at 2 s and the bottom cluster at 10 s after interaction stops; both snap to opacity 1 immediately on interaction (engine-gmt/navigation/HudOverlay.tsx:61-94).

Speed slider (Fly only) maps drag x ∈ [0,1] across slider rect to `flySpeed = 10^(3x − 3)`, i.e. `[10⁻³, 10⁰] = [0.001, 1.0]` (engine-gmt/navigation/HudOverlay.tsx:106-129). Haptic `vibrate(5)` at limits. Visual progress bar back-computes `(log10(flySpeed) + 3) / 3` (engine-gmt/navigation/HudOverlay.tsx:131-134).

`region` prop (`'top' | 'bottom' | 'all'`, default `'all'`) splits the crosshair layer from the bottom-pill cluster so the bottom cluster can be anchored to the viewport area outside the scaled canvas in Fixed mode (engine-gmt/navigation/HudOverlay.tsx:24-29, 136-138).

Cursor-anchor toggle button (Orbit only, non-mobile) toggles `state.navigation.orbitCursorAnchor` with a crosshair-glyph SVG; tooltip swaps between "around cursor" and "around centre" (engine-gmt/navigation/HudOverlay.tsx:228-256).

Tutorial-hint stubs: HUD imports `useTutorAnchor`, `mergeRefs`, `actionBus` from `engine/plugins/Tutorial` and wires anchors on the speed slider and reset button (engine-gmt/navigation/HudOverlay.tsx:6, 203, 191); the full `<HintDisplay>` overlay is intentionally NOT ported — see Interactions below.

`modifiers.ts` is shared by `useInputController` (wheel handler at engine-gmt/navigation/useInputController.ts:132) and Navigation (wheel at engine-gmt/navigation/Navigation.tsx:609, middle-drag at engine-gmt/navigation/Navigation.tsx:864, custom orbit drag at engine-gmt/navigation/Navigation.tsx:766, drei zoom/rotate/pan speed assignments at engine-gmt/navigation/Navigation.tsx:1288-1291). UI sliders use a separate `10×/0.1×` scale via `useDragValue.ts` per the comment at engine-gmt/navigation/modifiers.ts:5-6.

## Invariants

- **Camera resting state must be `position = (0,0,0)`** with world coordinates in `sceneOffset`. The 100 ms stop-debounce explicitly normalises this and bakes `camera.position` into `sceneOffset.{xL,yL,zL}` then `VirtualSpace.normalize` (engine-gmt/navigation/Navigation.tsx:1202-1216).
- **Wheel + middle-drag absorb per-event, not at burst end.** The `scrollEndTimeout` is state-cleanup only; renaming it `flush` would be a misnomer per the explicit comment at engine-gmt/navigation/Navigation.tsx:327-339.
- **`hoverPivotWorldRef` is NOT cleared on absorb.** Clearing would force a "fly to centre" when the cursor hadn't moved (10 px gate suppresses re-pick). `absorbGenRef` is the correct invalidation mechanism (engine-gmt/navigation/Navigation.tsx:274-282).
- **Hover pre-pick skips during `isCustomOrbitRef`**, not just during `isOrbitDragging` / `isScrollingRef`. Missing this guard would risk a stale `absorbGenRef` miss mid-custom-orbit (engine-gmt/navigation/Navigation.tsx:530-536).
- **Drei's `OrbitControls` runs at `useFrame` priority −1**, before Navigation's priority-0 frame. To suppress its `lookAt(target)` during a custom gesture you must flip `orbitRef.current.enabled = false` synchronously inside the pointer handler — flipping a ref alone lets one frame slip (engine-gmt/navigation/Navigation.tsx:722-726).
- **Drei must be ENABLED for wheel-only PAN when cursor-anchor is OFF**, otherwise `enabled=false` at wheel-fire time silently no-ops zoom (no pointerdown precedes wheel-only interaction) at engine-gmt/navigation/Navigation.tsx:1273-1285.
- **Q/E roll skips the manual `orbitRef.update()` when drei is enabled** to avoid double-multiplying `_sphericalDelta` by `(1 - dampingFactor)` — visible as halved pointer-driven motion stagger (engine-gmt/navigation/Navigation.tsx:1301-1321).
- **`MAX_SKY_DISTANCE` (imported from `data/constants`)** is the sky sentinel both for physics-probe acceptance and for the "show reset button" trigger (engine-gmt/navigation/usePhysicsProbe.ts:42, 48). The integrator separately guards a `1000.0` literal when writing `targetDistance` to store at engine-gmt/navigation/Navigation.tsx:1200.
- **Distance smoothing is asymmetric** — instant snap on decrease is intentional for safety/responsiveness (prevents speed lag when diving toward a surface) at engine-gmt/navigation/usePhysicsProbe.ts:64-73.
- **`engine.dirty` must be set inside per-event absorb paths** (wheel at engine-gmt/navigation/Navigation.tsx:640, custom orbit at engine-gmt/navigation/Navigation.tsx:805, middle-drag at engine-gmt/navigation/Navigation.tsx:893, pan per-frame at engine-gmt/navigation/Navigation.tsx:1336) because per-event absorb returns `camera.position` to zero each event — the integrator's `posChanged` check can't see the motion otherwise.
- **OrbitControls.PAN distance** is computed from `camera.position.distanceTo(target)`. After a custom-orbit gesture leaves `target` at `camera.position + forward × 0.0001`, drei pan would be a no-op; `onStart` seats `target` ahead at `distAverageRef` distance to fix this (engine-gmt/navigation/Navigation.tsx:1373-1393).
- **Wheel handler uses `passive: false`** so it can call `e.preventDefault()` — required for the custom translation math to deny the page from scrolling (engine-gmt/navigation/Navigation.tsx:589, 652).
- **Pointer-events-auto class is the catch-all UI gate** for nearly every Orbit-mode handler (engine-gmt/navigation/Navigation.tsx:529, 584, 687, 844, 952). Adding new HUD widgets without that class will leak pointer events into the camera handlers.
- **Worker-mode physics probe does not read pixels** — consumes `engine.lastMeasuredDistance` set by the worker's own depth readback. Direct mode does the 3×3 readback locally (engine-gmt/navigation/usePhysicsProbe.ts:107-127, 129-167).
- **`engine.queueOffsetSync(absorbed)` plus direct `useFractalStore.setState({ sceneOffset })`** is the silent path — bypasses `setSceneOffset` to skip OFFSET_SET re-emit and accumulation reset, while still keeping `getPreset()`/share-links accurate (engine-gmt/navigation/Navigation.tsx:311-323).
- **`engine.cameraInUse` is set per-frame from Navigation** as a `MARK_INTERACTION` pulse for the adaptive-resolution kick-in only; the persistent worker-side `cameraInUse` is driven by `GmtRendererTickDriver` per the comment at engine-gmt/navigation/Navigation.tsx:1155-1162.
- **`useInputController` ignores keys while `isTimelineHovered`** to keep timeline shortcuts un-shadowed by WASD (engine-gmt/navigation/useInputController.ts:78-79).
- **Camera key capture (`captureCameraKeyFrame`) runs during `isRecording && recordCamera`** with `skipSnapshot: true` and interpolation `'Linear'` (when playing) or `'Bezier'` (when not) at engine-gmt/navigation/Navigation.tsx:1181-1186.

## Interactions with other subsystems

- **e03-animation.** Navigation reads `useAnimationStore` (`isPlaying`, `isScrubbing`, `isRecording`, `recordCamera`, `currentFrame`, `sequence`) at engine-gmt/navigation/Navigation.tsx:473-478 and writes `setIsCameraInteracting` at engine-gmt/navigation/Navigation.tsx:163, 1081, 1154. The HUD subscribes to `isCameraInteracting` via `useAnimationStore.subscribe` (engine-gmt/navigation/HudOverlay.tsx:62). Camera-keyframe capture funnels through `engine/animation/cameraKeyRegistry` (engine-gmt/navigation/Navigation.tsx:114, 1182-1186). The `isCameraLocked` predicate is dual to AnimationEngine's `ignoreCamera`; see followup q-111.
- **`FractalEvents` bus.** Listens for `camera_teleport` and `camera_transition` (engine-gmt/navigation/Navigation.tsx:468-470), emits `camera_snap` on mode switch (engine-gmt/navigation/Navigation.tsx:992) and on play/scrub stop (engine-gmt/navigation/Navigation.tsx:1021), and re-emits `camera_teleport` at the end of a smooth transition to commit exact precision (engine-gmt/navigation/Navigation.tsx:1074).
- **WorkerProxy / engine state.** `getProxy()` is imported at module scope (engine-gmt/navigation/Navigation.tsx:106-107, engine-gmt/navigation/usePhysicsProbe.ts:4-5). Navigation reads/writes `engine.sceneOffset`, `engine.lastMeasuredDistance`, `engine.shouldSnapCamera`, `engine.dirty`, `engine.cameraInUse`, `engine.virtualSpace`, `engine.queueOffsetSync(...)`, `engine.pickWorldPosition(...)`, `engine.hasCompiledShader`, `engine.renderer`, `engine.pipeline?.getPreviousRenderTarget?.()`, `engine.pipeline?.readPixels?.(...)`.
- **Tutorial plugin.** The HUD imports `useTutorAnchor`, `mergeRefs`, `actionBus` from `engine/plugins/Tutorial` (engine-gmt/navigation/HudOverlay.tsx:6) to expose anchor points on the speed slider and reset button. Apps that omit the tutorial plugin need stub anchors or these calls will error at runtime. The engine HUD **intentionally does not render a hint overlay**; `activeHint?` / `onDismissHint?` are app-extension hooks consumed by an app-rendered widget the app mounts alongside `GmtNavigationHud`. The full `<HintDisplay>` JSX preserved in the comment at engine-gmt/navigation/HudOverlay.tsx:259-261 is historical, not a TODO. See followup q-110.
- **Animation `captureCameraKeyFrame`.** Imported from `engine/animation/cameraKeyRegistry` and called during `isRecording && recordCamera` (engine-gmt/navigation/Navigation.tsx:114, 1181-1186).
- **CameraController (Fly physics).** Instantiated at engine-gmt/navigation/Navigation.tsx:117, 169 and stepped per-frame in the Fly branch at engine-gmt/navigation/Navigation.tsx:1242-1258. Out of this subsystem's scope.
- **PrecisionMath / VirtualSpace.** Used in the transition path to split a unified `THREE.Vector3` into high/low offset components (engine-gmt/navigation/Navigation.tsx:118, 1050-1057) and in the stop-debounce to normalise offset overflow (engine-gmt/navigation/Navigation.tsx:1210).
- **`useMobileLayout`.** Forces cursor-anchored orbit off on mobile (engine-gmt/navigation/Navigation.tsx:156-162) and gates Fly mouse-drag origin (engine-gmt/navigation/useInputController.ts:23, 214).
- **`engine/plugins/Tutorial` `actionBus`.** Fires `camera.reset` from the HUD reset button (engine-gmt/navigation/HudOverlay.tsx:192).

## Known issues / Phase 2 carry-in

- **q-107 — pivot-reticle DOM mutation.** The pivot dot at engine-gmt/navigation/Navigation.tsx:918-943 is created via `document.createElement` / `appendChild` on `gl.domElement.parentElement`. The followup characterises this as "lifecycle-and-coordinate-system convenience, not perf": the dot needs to attach to the canvas parent so its coordinates match the canvas in Fixed mode (where the canvas is scaled/letterboxed), whereas `HudOverlay` is mounted on a viewport-relative parent. The HUD's inertial reticle is also imperatively style-mutated each frame (engine-gmt/navigation/Navigation.tsx:1231-1238 over engine-gmt/navigation/HudOverlay.tsx:166-173) — so the asymmetry is creation, not update. Low-risk consolidation target: add a `canvasOverlay` slot to `HudOverlay` so both reticles render there. Defer until `HudOverlay` is next touched.
- **q-110 — hint system stubs.** The HUD intentionally ships without a hint overlay; `ActiveHint = unknown` plus `_activeHint`/`_onDismissHint` aliasing (engine-gmt/navigation/HudOverlay.tsx:11, 38) are app-extension hooks. The wider tutorial/hint system lives in `engine/plugins/Tutorial.tsx` and is composed in by the host app, not by engine-gmt. Doc rule per the followup: "navigation HUD does not render hints; apps mount their own widget alongside" — applied above in Interactions.
- **q-111 — `isCameraLocked` vs `ignoreCamera`.** Documented above as a dual, not a duplicate. Optional refactor opportunity: hoist as named selectors (`selectCameraLocked` / `selectIgnoreCamera`) on the animation store so the surfaces have one definition each instead of three open-coded readers (Navigation, AnimationEngine, PauseControls).
- **q-108, q-109 pending.** Two open followups against this subsystem had not been answered at the time of this audit. Doc may need a regen pass when they land.
- **Orphan-sweep candidates (from survey, not refuted by followups):**
  - `unifiedOffsetRef` shadow (engine-gmt/navigation/Navigation.tsx:173, 1340-1348) is maintained every frame but has no in-subsystem reader; likely consumed by external snapshot/controller code. Grep-confirm before deletion.
  - Local `rollVelocity` ref at engine-gmt/navigation/Navigation.tsx:233 is declared but only the `inputRollVel` destructure from `useInputController` is read (engine-gmt/navigation/Navigation.tsx:248). Candidate for deletion if no external consumer.
  - `setIsCameraInteracting` is always truthy after subscription (engine-gmt/navigation/Navigation.tsx:163) yet engine-gmt/navigation/Navigation.tsx:1081 and engine-gmt/navigation/Navigation.tsx:1154 guard `if (setIsCameraInteracting)`. Harmless defensive code; can be tightened.

## Historical context

No existing doc covered this subsystem; this is the canonical reference going forward. The header comment block in `Navigation.tsx` (engine-gmt/navigation/Navigation.tsx:1-97) is itself an in-source design rationale — preserve it. The pivot-reticle commentary at engine-gmt/navigation/Navigation.tsx:1098-1106 explicitly calls out the reticle's secondary role as a debugging aid for the "occasional glitch at end of interactions" bug class that motivated the `absorbGenRef` design. The `modifiers.ts` comment (engine-gmt/navigation/modifiers.ts:1-6) preserves the rationale for the 4× / 0.1× modifier convention vs. the UI-slider `10× / 0.1×` scale.
