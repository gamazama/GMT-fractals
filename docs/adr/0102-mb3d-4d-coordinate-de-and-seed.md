# ADR-0102: MB3D 4D-coordinate formulas — 4D DE radius (IFS only) + the c.w julia seed

**Date:** 2026-07-13
**Status:** Accepted. Extends ADR-0083 (MB3D importer) and the Phase-9 4D-coord (`wIsCoord`) handling.

## Context

MB3D deOption-5/6 formulas iterate `z.w` as a real 4th **spatial** coordinate (slotTranspiler's
`wIsCoord` path: `z.w` is seeded, carried forward, and folded like x/y/z; the real DE derivative
lives in `mb3dDr1`). Two fidelity bugs surfaced testing **ABoxSphereOffset4d** (a 4D-Julia box+sphere)
against its MB3D export — its surface bulbs were missing. Both were invisible to the corpus
cross-check, which verifies the per-iteration math but **not how the iteration is wired to the render**
(the DE radius) or **seeded** (the constant `c`).

**Bug 1 — the julia constant's 4th component `c.w` was garbage.** The shader builds
`c = mix(z, vec4(uJulia, uParamA), juliaMode)`, so for a JULIA `c.w = uParamA`. `emitFusedHybrid`'s
`has4DCoord` branch seeded `z.w` (paramB) but never `c.w` (paramA), so `c.w` fell through to
`core_math`'s `paramA` **default of 8.0**. A 4D formula adds `c.w` to `w` every iteration, so `w`
diverged by ~8/step. Because the sphere inversion reads the **4D** magnitude `x²+y²+z²+w²`, a runaway
`w` distorted x/y/z and smeared the surface detail — the missing bulbs. **Menger4/MixPinski4/…** dodged
it purely because they run in Mandelbrot mode (`c.w = z.w = 0`, never reading `paramA`).

**Bug 2 — the DE radius dropped `z.w`.** MB3D's deOption-6 DE numerator + escape bailout are the 4D
magnitude `Sqrt(Rout)`; GMT's `DE_MASTER` used `length(z.xyz)` (3D) everywhere, flattening w-direction
detail on the **IFS** 4D family (Melting spot bloxx / MixPinski4 / Sierpinski4ex).

## Decision

1. **`has4DCoord` seeds `c.w` too:** `coreMath.paramA = isJulia ? jw : 0` alongside `paramB` — exactly
   what the Quaternion `has4D` path already did. This is the actual missing-bulbs fix.
2. **4D DE radius, deOption-6 ONLY.** A `render:de-4d` capability (set by `emitFusedHybrid` when the DE
   slot is deOption 6 + writes `mb3dDr1`) makes `DE_MASTER` use `length(z)` for the DE radius `r` and
   `dot(z, z)` for the escape bailout; coloring/orbit-trap stay 3D. Gated precisely — every non-4D
   formula is byte-identical.
   **deOption 5 (the box "pas" family) is DELIBERATELY EXCLUDED:** its box+sphere lets `z.w` diverge
   (Bug 1 aside, the geometry legitimately grows in w), so a 4D radius explodes → flat screen. MB3D's
   deOption-5 DE reads as ~3D anyway; GMT's 3D radius already matches its export once `c.w` is correct.

## Consequences

- ABoxSphereOffset4d renders its surface bulbs, matching the MB3D export (owner-confirmed). The IFS 4D
  family gets the more-faithful 4D DE radius (Melting spot bloxx owner-confirmed unchanged/correct).
- The seed fix is general: any imported 4D-coord **Julia** now gets the right `c.w`. Mandelbrot-mode 4D
  formulas are unaffected (`paramA` no-op).
- **Lesson (recurring):** the cross-check gate is necessary but not sufficient — it proved the iteration
  faithful while the *render wiring* (3D DE radius) and the *seed* (`c.w = paramA` default) were both
  wrong. Same class as `_updateC2` / `bFirstIt` / the numeric-DE floor: verify the rendered result, not
  just 0-mismatch. Owner in-app visual check (faithful camera) remains the final gate for MB3D imports.
- Commits: `eb116cf4` (4D radius) → `7e0c6b40` (restrict to deOption 6) → `7e63af1e` (c.w seed).
  typecheck 0, test:mb3d 24/24, test:mb3d:weave 318/318.
