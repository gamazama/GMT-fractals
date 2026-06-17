# ADR-0046: Unified-coordinate camera with treadmill absorb + absorbGenRef race guard

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/navigation/Navigation.tsx`, `engine-gmt/utils/CameraUtils.ts`, `engine-gmt/engine/PrecisionMath.ts`

## Context

Three.js `camera.position` is `f32`. At deep zoom (1e-15+) the f32 mantissa
loses the headroom needed to represent sub-pixel motion smoothly, and the pose
jitters at sub-pixel scale. Apps that target arbitrary zoom (1e-30 and beyond)
need camera coordinates carried in higher precision than `f32`.

Separately: async hover picks fired during a gesture can resolve AFTER the
camera offset has shifted (treadmill absorb between picks), producing a "snap
to stale pivot" glitch correlating with interaction speed — the faster the
user moves, the more likely the bug. The bug class is well-known to GMT users
under the name "glitch at end of interactions".

Alternatives considered:

- **Use double-precision Three.js shim.** WebGL doesn't expose f64 storage
  for vertex shaders; emulated double in GLSL is expensive and breaks
  third-party shaders. Rejected.
- **Keep camera at origin, store world position in a separate uniform.**
  Picked direction — but needs a careful absorb pattern to avoid losing
  pending motion between frames.
- **Recompute everything from a `lastInteractionTimestamp` and never store
  intermediate motion.** Loses inertia/damping; not viable for OrbitControls.

## Decision

Canonical world position = `sceneOffset + camera.position`. In steady state
`camera.position = (0,0,0)` and the high/low-split `sceneOffset` (a
`PreciseVector3` with `{x, y, z}` high parts plus `{xL, yL, zL}` low parts)
carries all world coordinate. During gestures `camera.position` accumulates
motion locally; `absorbOrbitPosition` bakes `camera.position` into
`sceneOffset` per-event (wheel, middle-drag, custom orbit) and resets
`camera.position` to zero — the "treadmill".

Every `absorbOrbitPosition` call bumps a monotonic `absorbGenRef` counter
(`engine-gmt/navigation/Navigation.tsx:273`). Hover picks snapshot the gen at
issue time; on resolution they compare gen-at-issue to current gen
(`engine-gmt/navigation/Navigation.tsx:557`) and drop themselves if the gen
has advanced. This is the "absorb-gen race guard" referenced in the header
block.

Three absorb modes:

| Caller | `silent` | `keepTarget` | Path |
|---|---|---|---|
| Orbit `onEnd`, wheel per-event, middle-drag per-event | `true` | `false` | Atomic `engine.queueOffsetSync(absorbed)` + direct `useFractalStore.setState({ sceneOffset })` to skip OFFSET_SET re-emit + accumulation reset. |
| Per-frame PAN absorb (drei PAN active) | `true` | `true` | As above plus shift `OrbitControls.target` by `-camera.position`. |
| Mode-switch safety | `false` | `false` | Full `setSceneOffset(...)` (worker sync + accumulation reset). |

`engine.dirty = true` MUST be set inside every per-event absorb path (wheel
:640, custom orbit :805, middle-drag :893, pan per-frame :1336). Without it
the integrator's `posChanged` check can't see motion since `camera.position`
is back at zero after each absorb.

## Consequences

- The header block at `engine-gmt/navigation/Navigation.tsx:1-97` is the
  canonical design rationale and must stay verbatim.
- Wheel + middle-drag absorb PER-EVENT, not at burst end. `scrollEndTimeout`
  (:644-650) is state-cleanup only — a late firing is harmless. Renaming it
  "flush" would be a misnomer per the explicit comment.
- `hoverPivotWorldRef` is NOT cleared on absorb. Clearing would force a "fly
  to centre" when the cursor hadn't moved (the 10 px gate suppresses re-pick).
  `absorbGenRef` is the correct invalidation mechanism.
- Camera resting state MUST be `position = (0,0,0)` with world in
  `sceneOffset`. The 100 ms stop-debounce normalises this and bakes
  `camera.position` into `sceneOffset` via `VirtualSpace.normalize`.
- The silent path (`engine.queueOffsetSync` + direct `setState`) keeps
  `getPreset()` / share-links accurate without triggering OFFSET_SET re-emit
  or accumulation reset. Apps that don't need the full event flow benefit.

### Folded: camera-lock and ignoreCamera are duals, not duplicates

`isCameraLocked = (isPlaying && (!isRecording || !recordCamera) && Object.keys(sequence.tracks).some(k => k.startsWith('camera.'))) || isScrubbing`
is the dual of AnimationEngine's `ignoreCamera = isPlaying && isRecording && recordCamera`
— same input flags, opposite outputs (suppress INPUT vs. suppress SCRUB
OUTPUT). Three independent readers exist: Navigation, AnimationEngine, and
`engine/plugins/topbar/PauseControls.tsx`. They are NOT duplicates; the
surfaces are intentionally independent. Optional refactor target: hoist as
named selectors (`selectCameraLocked` / `selectIgnoreCamera`) on
animationStore so each surface has one definition. See followup q-111.
