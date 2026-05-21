# ADR-0047: Custom cursor-anchored gestures replace drei rotate/dolly when orbitCursorAnchor is on

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/navigation/Navigation.tsx`

## Context

GMT's "Orbit" mode is built on `@react-three/drei`'s `OrbitControls`. The
drei integrator rotates/dollies around a fixed `target` via `lookAt(target)`,
which produces a "rotate around the centre of the scene" UX. For fractal
exploration the more useful UX is "rotate around the point under the cursor"
(Blender-style) so the user can pivot precisely on a surface feature.

Two implementation challenges:

1. drei's `lookAt(target)` is incompatible with cursor-anchored rotation —
   any time the user rotates, drei re-applies `lookAt` and snaps the camera
   back to face the target.
2. drei's `OrbitControls` runs at `useFrame` priority `-1`, BEFORE
   Navigation's priority-0 frame. To suppress drei's update during a custom
   gesture, `orbitRef.current.enabled = false` must be set SYNCHRONOUSLY
   inside the pointer handler — flipping a ref alone lets one frame slip
   through with drei's old behaviour.

Alternatives considered:

- **Fork drei's `OrbitControls`.** Heavy maintenance burden; drei evolves
  frequently. Rejected.
- **Disable drei entirely and reimplement orbit from scratch.** Loses drei's
  damping, mobile-touch support, and pan implementation. Rejected.
- **Only enable cursor-anchor on certain gestures.** Picked direction.

## Decision

When `orbitCursorAnchor` (default ON) is set AND the device is non-mobile,
custom handlers own ROTATE (left-drag), DOLLY (wheel + middle-drag) while
drei is restricted to PAN (right-drag). Configuration at
`engine-gmt/navigation/Navigation.tsx:1278-1285, 1368-1371`:

```
mouseButtons={{ LEFT: -1, MIDDLE: -1, RIGHT: PAN }}
enableZoom={!cursorAnchorEffective}
```

The wheel handler uses `passive: false` (Navigation.tsx:589, 652) so it can
call `e.preventDefault()` — required for the cursor-anchored translation
math to deny page scrolling.

Touch (`pointerType === 'touch'`) cedes to drei's native `THREE.TOUCH.ROTATE`
(Navigation.tsx:684-686) because drei's multi-touch handling is reliable and
the custom gesture machinery doesn't help on tap-to-pivot.

Mobile force-disables cursor-anchor regardless of the saved setting
(`engine-gmt/navigation/Navigation.tsx:157-162`) — multi-touch is drei's
responsibility and the per-event hover machinery is wasted there.

When `orbitCursorAnchor = OFF`, drei owns ROTATE/DOLLY/PAN; the custom
handlers gate themselves off.

## Consequences

- **drei must be ENABLED for wheel-only PAN when cursor-anchor is OFF**
  (`engine-gmt/navigation/Navigation.tsx:1273-1285`). Otherwise
  `enabled = false` at wheel-fire time silently no-ops the zoom because no
  pointerdown precedes a wheel-only interaction.
- **Q/E roll must skip the manual `orbitRef.update()` when drei is enabled**
  (`engine-gmt/navigation/Navigation.tsx:1301-1321`). Calling
  `orbitRef.current.update()` while drei is running would double-multiply
  `_sphericalDelta` by `(1 - dampingFactor)`, visible as halved
  pointer-driven motion stagger.
- **`OrbitControls.PAN` distance** is computed from
  `camera.position.distanceTo(target)`. After a custom-orbit gesture leaves
  `target` at `camera.position + forward × 0.0001`, drei pan would be a
  no-op; `onStart` re-seats `target` ahead at `distAverageRef` distance
  (`engine-gmt/navigation/Navigation.tsx:1373-1393`).
- **Synchronous `orbitRef.enabled = false`** inside the pointerdown handler
  is mandatory; deferring to an effect leaks one frame of drei behaviour
  visible as a single-frame snap.
- Adding new HUD widgets in Orbit mode needs `pointer-events-auto` class
  (the catch-all UI gate at Navigation.tsx:529, 584, 687, 844, 952). Without
  it, the widget leaks pointer events into the camera handlers.
