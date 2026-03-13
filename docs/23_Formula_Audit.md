# Formula Audit Report (2026-03-08)

Systematic audit of all 28 GMT native formulas. Covers naming accuracy, mathematical correctness, description quality, parameter usage, and cross-reference against Fragmentarium originals.

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

| Formula | Issue | Current Description | Suggested Fix |
|---------|-------|-------------------|---------------|
| **Bristorbrot** | FIX-DESC | "A hybrid formula that mixes folding and analytical functions" | No folding in code. Actually a custom polynomial: `x²-y²-z², y(2x-z), z(2x+y)`. Describe the actual math. |
| **Appell** | FIX-DESC | References "Clifford Analysis" | Implementation is simplified Appell polynomial, not full Clifford analysis. Tone down the description. |

---

## Needs Parameter Refactor (vec2/vec3 upgrade)

| Formula | Current | Opportunity | Priority |
|---------|---------|-------------|----------|
| **MarbleMarcher** | 6 scalar (Shift X/Y/Z + Rot X/Z + Scale) | Shift X/Y/Z → **vec3A**, Rot X/Z → **vec3B** (mode:'rotation') | **HIGH** — 3 shift params + 2 rot params = 5 scalars → 2 vec3 |
| **MakinBrot** | 6 scalar (Scale + Offset + Rot X/Z + Shift Y + Twist) | Rot X/Z → **vec3A** (mode:'rotation'), could add Shift Y to vec3 | **MEDIUM** — 2 rotation params wasted as scalars |
| **Mandelbar3D** | 6 scalar (Scale + Offset X/Z + Rot X/Z + Twist) | Rot X/Z → **vec3A** (mode:'rotation'), Offsets → **vec3B** | **MEDIUM** — same pattern as MakinBrot |
| **Dodecahedron** | 6 scalar (Scale + Offset + Rot X/Z + Z Shift + Twist) | Will be redesigned when fold structure is fixed | **BLOCKED** — fix math first |
| **Tetrabrot** | 4 scalar (Julia W + Slice W + Rot X/Z) | Rot X/Z → **vec3A** (mode:'rotation') | **LOW** — only 2 params affected |
| **Quaternion** | 6 scalar (Julia W + Slice W + 4 rotation planes) | 4D rotations are inherently complex; low priority | **LOW** — 4D rotation planes don't map cleanly to vec3 |

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

### Phase 0 — Critical Math Fixes (algorithm is wrong)
1. **Dodecahedron** — Rewrite with correct 3 normals (golden-ratio), 3×3 fold pattern, remove abs+sort
2. **Buffalo** — Remove non-original Menger fold, add per-axis abs toggles, fix derivative

### Phase 1 — Quick Wins (description fixes only)
1. **Bristorbrot** — rewrite description to match actual polynomial
2. **Appell** — tone down Clifford Analysis claim

### Phase 2 — Parameter Consolidation (shader changes)
1. **MarbleMarcher** — consolidate 3 shift + 2 rot into 2 vec3 params
2. **MakinBrot** — consolidate 2 rot into vec3 with rotation mode
3. **Mandelbar3D** — consolidate 2 rot + 2 offsets into vec3 params

### Phase 3 — Enhancement (optional)
1. **Tetrabrot** — consolidate rotations
2. **Quaternion** — complex 4D rotation, lower priority
3. Add `linkable: true` to scale params where applicable
4. **Mandelbulb** — consider adding DerivativeBias parameter

---

## Formulas NOT Needing Changes

These are correct, well-described, and already use good parameter patterns:
- Mandelbulb, MandelBolic, Phoenix, Borromean, JuliaMorph, MandelTerrain, Mandelorus, MandelMap, ArisBrot
- MengerSponge, MengerAdvanced, BoxBulb, Kleinian, PseudoKleinian
- AmazingBox, AmazingSurf, AmazingSurface
- SierpinskiTetrahedron, MixPinski (both fixed this session)
