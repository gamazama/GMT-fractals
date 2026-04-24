# Formula Audit Report
> Last updated: 2026-04-09 | GMT v0.9.1

Systematic audit of all 42 GMT native formulas. Covers naming accuracy, mathematical correctness, description quality, parameter usage, preambleVars/usesSharedRotation compliance, and cross-reference against Fragmentarium originals.

**Audit history:**
- 2026-03-08: Initial audit of 28 formulas
- 2026-04-09: Added 13 new formulas (polyhedra, PseudoKleinian variants, KaliBox, Claude). Verified deferred Phase 1-2 items.

## Audit Methodology

1. Read every formula's GLSL shader code and identified the actual mathematical algorithm
2. Cross-referenced names/descriptions against known fractal mathematics
3. Analyzed parameter slot usage and identified consolidation opportunities
4. Checked default presets for correctness (estimator type, iterations, camera)
5. **Compared against Fragmentarium reference .frag files** in `features/fragmentarium_import/reference/Examples/`

---

## Status Legend

| Status | Meaning |
|--------|---------|
| OK | Name, description, and algorithm all correct |
| FIX-DESC | Description is vague, misleading, or hallucinated — needs rewriting |
| FIX-PARAMS | Parameters could be improved with vec2/vec3/rotation modes |
| FIX-DE | Distance estimator setting is wrong or suboptimal |
| FIX-MATH | Algorithm has mathematical errors vs the reference |
| RENAME | Formula name doesn't match what the code actually does |

---

## Cross-Reference: GMT vs Fragmentarium Originals

### CRITICAL Issues (algorithm is wrong vs reference)

#### ✅ Dodecahedron — FIXED (2026-03-13)
- **Reference**: `Examples/Kaleidoscopic IFS/Dodecahedron.frag` (Syntopia/Knighty)
- **Fix applied**: Replaced 2 simplified normals + abs+sort with correct 3 golden-ratio normals × 3 repetitions = 9 fold ops per iteration. True dodecahedral symmetry now implemented.
  ```glsl
  dodeca_n1 = normalize(vec3(-1.0, Phi-1.0, 1.0/(Phi-1.0)))
  dodeca_n2 = normalize(vec3(Phi-1.0, 1.0/(Phi-1.0), -1.0))
  dodeca_n3 = normalize(vec3(1.0/(Phi-1.0), -1.0, Phi-1.0))
  ```

#### ✅ Buffalo — FIXED (2026-03-13)
- **Reference**: `Examples/3DickUlus/BuffaloBulb.frag` (ported from Mandelbulber)
- **Fix applied**: Removed Menger-style fold (not in original). Added `vec3A` (Abs After Power) and `vec3B` (Abs Before Power) per-axis toggle parameters. Default preset uses `vec3A = {y:1, z:1}` for the signature Y+Z abs buffalo shape.

### HIGH Priority Issues

#### Mandelbulb — Minor missing feature
- **Reference**: `Examples/Historical 3D Fractals/Mandelbulb.frag`
- **Missing**: `DerivativeBias` parameter (clamps minimum dr growth). Used for artistic control of surface detail.
- **GMT additions** (not in reference): Theta/Phi phase shifts, Z-twist, Radiolaria mutation — all valid creative enhancements.
- **Impact**: Low. DerivativeBias is a nice-to-have, not critical.

#### AmazingBox (Mandelbox) — Simplified but functional DE
- **Reference**: `Examples/Historical 3D Fractals/Mandelbox.frag` (Rrrola)
- **Difference**: Reference tracks `p.w` as running distance estimate with power scaling (`AbsScaleRaisedTo1mIters`). GMT uses standard `dr = dr * abs(Scale) + 1.0`.
- **Impact**: Medium. Both are valid approaches. GMT's is the standard Mandelbulber-style derivative. Reference's Rrrola formula can give tighter bounds in some configurations.

#### Kleinian — Simplified but valid
- **Reference**: `Examples/Experimental/boxfold_kleinian.frag`
- **Difference**: Reference implements full Kleinian group with TransA/TransAInv inversions, separation line, wrapping. GMT is a simplified single-pass fold+inversion.
- **Impact**: Low-Medium. GMT's version is a legitimate simplified Kleinian, just not the full group study. Both produce Kleinian-family geometry.

#### PseudoKleinian — Enhanced with extras
- **Reference**: `Examples/Knighty Collection/PseudoKleinian.frag`
- **GMT additions**: "Magic Factor" (paramD) modulates inversion radius — not in reference. Also adds twist and spatial shifts.
- **Impact**: Low. GMT's enhancements expand the parameter space. Core algorithm matches.

### OK — Verified Correct

| Formula | Reference File | Status |
|---------|---------------|--------|
| **Mandelbulb** | `Historical 3D Fractals/Mandelbulb.frag` | Core algorithm correct. GMT adds creative enhancements. |
| **MengerSponge** | `Kaleidoscopic IFS/Menger.frag` | Correct sort + scale + offset. DE approach equivalent (both use scale^n). |
| **SierpinskiTetrahedron** | `Kaleidoscopic IFS/Tetrahedron.frag` | Folds correct. GMT adds per-axis scale (breaks strict IFS when non-uniform). |
| **MixPinski** | `mclarekin/darkbeam_MixPinski.frag` | Faithful port (this session). |
| **MarbleMarcher** | `LoicVDB/MarbleMarcher.frag` | GMT has explicit fold logic. Reference is a wrapper. GMT is more complete. |
| **Quaternion** | `Historical 3D Fractals/QuaternionJulia.frag` | Correct quaternion squaring. GMT adds 4D rotation. |
| **MengerAdvanced** | `Kaleidoscopic IFS/NewMenger.frag` | Different approach (lattice vs direct sort) but both valid Menger variants. |

### No Reference Available

These GMT formulas have no matching .frag in the reference collection — they are original GMT creations or from other sources:

| Formula | Notes |
|---------|-------|
| **AmazingSurf** | GMT original variant (sinusoidal Mandelbox) |
| **AmazingSurface** | GMT Menger-Kleinian hybrid |
| **BoxBulb** | GMT hybrid (Mandelbox + Mandelbulb) |
| **Bristorbrot** | Custom polynomial (origin unclear) |
| **MakinBrot** | Custom Mandelbulb variant (Makin's discovery) |
| **Tetrabrot** | Modified quaternion squaring |
| **ArisBrot** | GMT original complex hybrid |
| **Phoenix** | Phoenix Julia (memory feedback) |
| **MandelTerrain** | GMT original (2D→3D heightmap) |
| **Mandelorus** | GMT original (toroidal Mandelbulb) |
| **Appell** | Simplified Appell polynomial |
| **Borromean** | Cyclic permutation fractal |
| **MandelMap** | GMT original (projection mapping) |
| **MandelBolic** | Hyperbolic Mandelbrot extension |
| **Mandelbar3D** | 3D tricorn extension |
| **JuliaMorph** | 2D Julia stacking |

---

## Needs Description Fix

| Formula | Issue | Status |
|---------|-------|--------|
| **Bristorbrot** | FIX-DESC | ✅ Fixed — now reads "A custom polynomial fractal: x²-y²-z², y(2x-z), z(2x+y)..." |
| **Appell** | FIX-DESC | ✅ Fixed — now reads "simplified Appell polynomial: P(x) = x^n - k|x|^2..." |

---

## Needs Parameter Refactor (vec2/vec3 upgrade)

| Formula | Status | Notes |
|---------|--------|-------|
| **MarbleMarcher** | ✅ Done | Now uses vec3A (Shift) + vec3B (Rotation, mode: 'axes') |
| **MakinBrot** | ✅ Done | Now uses vec3A (Shift) + vec3B (Rotation, mode: 'rotation') |
| **Mandelbar3D** | ✅ Done | Now uses vec3A (Offset) + vec3B (Rotation, mode: 'rotation') |
| **Dodecahedron** | ✅ Done | Math fixed + now uses vec3B (Rotation) + vec3A (Shift) |
| **Tetrabrot** | Still pending | Rot X/Z still scalar params — LOW priority |
| **Quaternion** | Still pending | 4D rotation planes don't map cleanly to vec3 — LOW priority |

---

## Needs DE Fix

| Formula | Issue | Current | Fix |
|---------|-------|---------|-----|
| **SierpinskiTetrahedron** | Was `estimator: 4.0` (r-2)/dr | Fixed to `estimator: 1.0` (r-1)/dr | **DONE** (this session) |

---

## Parameter Slot Best Practices

Established pattern from SierpinskiTetrahedron and MixPinski:

| Purpose | Recommended Slot | Options |
|---------|-----------------|---------|
| Scale (uniform) | `vec3C` with `linkable: true` | Or `paramA` if scalar-only |
| Scale (per-axis) | `vec3C` without linkable | — |
| Rotation | `vec3B` or `vec3C` with `mode: 'rotation'` | Preamble pre-calc for perf |
| Offset/Shift | `vec3A` or `vec3B` | — |
| 4D components | `vec2A/B/C` | Split vec4 into vec3 + vec2 |
| Power | `paramA` | — |
| Fold/Inversion | `paramB`, `paramC`, `paramD` | — |

---

## Refactor Priority Queue

### Phase 0 — Critical Math Fixes ✅ COMPLETE
1. ✅ **Dodecahedron** — Rewritten with correct 3 golden-ratio normals, 3×3 fold pattern
2. ✅ **Buffalo** — Menger fold removed, per-axis abs toggles added

### Phase 1 — Description Fixes ✅ COMPLETE
1. ✅ **Bristorbrot** — description rewritten to match actual polynomial
2. ✅ **Appell** — Clifford Analysis claim toned down

### Phase 2 — Parameter Consolidation ✅ COMPLETE
1. ✅ **MarbleMarcher** — Shift → vec3A, Rotation → vec3B
2. ✅ **MakinBrot** — Shift → vec3A, Rotation → vec3B (mode: 'rotation')
3. ✅ **Mandelbar3D** — Offset → vec3A, Rotation → vec3B (mode: 'rotation')

### Phase 3 — Enhancement (still open)
1. **Tetrabrot** — consolidate rotations to vec3 (LOW)
2. **Quaternion** — complex 4D rotation, lower priority (LOW)
3. Add `linkable: true` to scale params where applicable (LOW)
4. **Mandelbulb** — consider adding DerivativeBias parameter (LOW)
5. **Octahedron, Icosahedron, TruncatedIcosahedron** — add cutting-plane `getDist` blocks to match RhombicDodecahedron/RhombicTriacontahedron pattern (MEDIUM — would give tighter surface bounds)

---

## New Formulas Audit (2026-04-09)

13 formulas added since the original audit, mostly polyhedra from the 2026-04-03 session.

### Polyhedra — All OK

All polyhedra formulas follow a consistent pattern: icosahedral/octahedral symmetry folds + scale + offset + shared Rodrigues rotation + twist + shift. All have `usesSharedRotation: true`, accurate descriptions, and good parameter ranges.

| Formula | preambleVars | getDist | Estimator | Notes |
|---------|-------------|---------|-----------|-------|
| **Apollonian** | ✅ (5 vars) | N/A (custom DE inline) | 0.375×abs(z.y)/dr | Inversion mode with separate params. Complex but correct. |
| **Coxeter** | ✅ (6 vars) | ✅ Custom | Cutting-plane | Parameterized Symmetry N (3→tet, 4→oct, 5→ico). Elegant. |
| **Cuboctahedron** | ✅ (3 vars) | ✅ Custom | Cutting-plane | Octahedral fold + cutting-plane DE. |
| **GreatStellatedDodecahedron** | ✅ (5 vars) | ✅ Custom | Cutting-plane | Icosahedral + stellation param. |
| **Icosahedron** | N/A | No getDist | `estimator: 2` (r/dr) | Works, but could benefit from cutting-plane getDist like siblings. |
| **Octahedron** | N/A | No getDist | `estimator: 2` (r/dr) | Same — works fine but lacks cutting-plane precision. |
| **RhombicDodecahedron** | ✅ (3 vars) | ✅ Custom | Cutting-plane | RD face-normal folds. Excellent geometry docs in comments. |
| **RhombicTriacontahedron** | ✅ (3 vars) | ✅ Custom | Cutting-plane | Golden-ratio default scale (1.618). |
| **TruncatedIcosahedron** | N/A | No getDist | `estimator: 2` (r/dr) | Truncation param (0→ico, 1→soccer ball). Works but could add cutting-plane. |

### Other New Formulas — All OK

| Formula | preambleVars | usesSharedRotation | getDist | Notes |
|---------|-------------|-------------------|---------|-------|
| **Claude** | ✅ (2 vars) | ✅ | No (default) | Harmonic icosahedral fold — unique innovation. Clean. |
| **KaliBox** | ✅ (2 vars) | No (own rotation) | No (default) | Mandelbox variant. Uses private rotation, not shared Rodrigues. Correct. |
| **PseudoKleinianAdv** | ✅ (2 vars) | No | ✅ Custom (Thingy DE) | Full Knighty/Theli-at box+sphere fold. Complex but correct. |
| **PseudoKleinianMod4** | ✅ (1 var) | No | ✅ Custom (3 DE shapes) | Mandelbulber Mod4 variant. paramA selects DE shape via options dropdown. |

### Enhancement Opportunities (not bugs)

- **Icosahedron, Octahedron, TruncatedIcosahedron**: Could add cutting-plane `getDist` blocks to match their sibling polyhedra (RhombicDodecahedron, Cuboctahedron, etc.). Currently use `estimator: 2` (r/dr) which works but gives less precise surface bounds. See Phase 3 above.

---

## Formulas NOT Needing Changes

These are correct, well-described, and already use good parameter patterns:
- Mandelbulb, MandelBolic, Phoenix, Borromean, JuliaMorph, MandelTerrain, Mandelorus, MandelMap, ArisBrot
- MengerSponge, MengerAdvanced, BoxBulb, Kleinian, PseudoKleinian
- AmazingBox, AmazingSurf, AmazingSurface
- SierpinskiTetrahedron, MixPinski
- Bristorbrot ✅, Appell ✅ (descriptions fixed)
- MarbleMarcher ✅, MakinBrot ✅, Mandelbar3D ✅ (params consolidated to vec3)
- All 13 new formulas (see above)
