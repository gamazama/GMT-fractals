# ADR-0099: RotationDescriptor contract + CPU-derived rotation uniforms + canvas rotation gizmo

**Date:** 2026-07-12
**Status:** Accepted.

## Context

A "rotation vec3" meant four different things across the codebase, distinguished
only by a loose widget `mode` string: (azimuth, pitch, angle) Rodrigues triples
(`mode: 'rotation'`, 22 native formulas), sequential per-axis Euler radians
(`mode: 'axes'`, 5 formulas), MB3D degrees-native Euler triples (importer option
type 6), and scalar twists. The camera uses quaternions. Two structural problems:

1. **Rotation conversion leaked into the shader.** Live-bound MB3D 3-angle
   rotations shipped the raw degrees vec3 to the GPU and rebuilt the matrix via
   an in-shader `mb3dRot()` helper INSIDE the slot wrapper — 6 sin/cos + a 3×3
   build per formula invocation, i.e. per iteration per march step. Worse,
   single-angle options (types 3/4, sin/cos const pairs) and 6-angle 4×4
   rotations (type 12) had NO live path at all — they could only be baked as
   GLSL literals, so editing them meant a recompile.
2. **No machine-readable semantics.** Widgets could not tell a degrees-native
   Euler triple from a radian Rodrigues triple; a planned canvas rotation gizmo
   would have had nothing to bind to.

## Decision

**1. `RotationDescriptor` is the explicit semantic contract** for rotation
params: `{ kind: 'euler'|'axis-angle'|'direction'|'twist', units: 'rad'|'deg',
order?: 'gmt-zxy'|'mb3d-xyz'|'seq-xyz' }` (`engine/rotationDescriptor.ts`,
zero-dep so pure UI, engine-core defs and engine-gmt all import it). Legacy
`mode` strings derive a descriptor via `rotationFromMode()`; explicit fields win.
MB3D imports stamp `units: 'deg'` — consumers must NOT apply the radian ±2π
bound override or rad→deg display mapping to those (FormulaParamsWidget +
BaseVectorInput gate on it; `nativeDegreesMapping` displays identity-with-°).

**2. Rotations are converted on the CPU; the shader receives finished data.**
`engine-gmt/utils/rotationMath.ts` is THE single conversion source — each
function mirrors one authority implementation verbatim and is named for its
convention (MB3D `Rx·Ry·Rz` vs GMT `Z·X·Y` vs the half-angle Rodrigues wire
format — they are NOT interchangeable). A fixed **derived-rotation uniform
bank** lives in the base schema (`uMb3dRotM0..5` mat3, `uMb3dRotSC0..5` vec2
sin/cos, `uMb3dRot4D0..1` mat4 — caps match the vec3-lane ceiling). The MB3D
live binder (`constPacker.bindOptions`) binds angle-option const offsets to
bank elements and emits `DerivedRotationSpec { uniform, convert, sources }`
records; `UniformManager.syncDerivedRotations` (called from
`FractalEngine.syncFrame`, covering live/bucket/export paths) reads the SOURCE
lane uniforms each frame — which already carry config edits, UNIFORM events and
animation writes — converts, and writes the bank. `MB3D_ROT_GLSL` is deleted.
Types 3/4/12 became live-editable for the first time.

**3. Specs ride `def.shader` everywhere.** `shader.derivedRotations` crosses
the worker `REGISTER_FORMULA` wire whole (the capabilities pattern), is
renumbered onto a def-global sequence when weaving (each slot binds against a
private allocator; `emitFusedHybrid.mb3dBankBody` remaps names in one
simultaneous regex pass and re-points sources at bank lanes), and round-trips
GMF via `shaderMeta.derivedRotations` (per the FormulaFormat stash/restore
invariant). Def-global bank exhaustion re-bakes only the offending slot.

**4. Canvas rotation gizmo.** A dumb screen-anchored SVG primitive
(`engine/components/gizmo/RotationGizmo.tsx` — rings + axis arrow + angle arc,
imperative per-frame `update()`, orthographic mini-view oriented by the display
camera) with ALL semantics in engine-gmt (`features/rotation_gizmo/`): per-kind
display via rotationMath, ring drags → per-component screen-angle edits written
through the SAME setter + `slotWriteValue` path as the sliders (one param
interaction session per drag → single undo step; camera stands down via the
existing `gizmo` interaction source). Open gizmos + puck positions are session
UI state in a standalone zustand store (`rotationGizmoStore`) — never
serialized. Multiple gizmos coexist; each is toggled from the `Vector3Input`
header icon (a pure `onGizmoToggle`/`gizmoActive` prop pair — the primitive
stays store-free).

## Consequences

- MB3D rotation edits are runtime uniform updates (no recompile), and the
  per-march-step matrix rebuild is gone from rotation-bearing MB3D shaders.
- Every rotation encoding is now introspectable — the gizmo, the widgets, and
  any future consumer read one descriptor instead of guessing from `mode`.
- The derived bank is a FIXED vocabulary: growing it (or adding a convert kind)
  touches UniformSchema + `DERIVED_ROT_BANKS` + `syncDerivedRotations` together.
- `debug/test-mb3d-weave.mts` asserts the new contract (318 checks: derived
  specs, def-global renumbering, bank sources, bake fallbacks).
- Native `mode: 'rotation'` formulas still run `gmt_precalcRodrigues` in GLSL
  loopInit (once per ray — negligible). Migrating them onto derived uniforms is
  the designated follow-up so the CPU-converts rule covers everything.
- Display-orientation helpers in rotationMath (`seqEulerXyzToMat3`,
  `mb3dEulerDegToMat3Display`, …) are gizmo rendering aids, not wire contracts —
  a convention nuance there shows as ring orientation, never a wrong value.
