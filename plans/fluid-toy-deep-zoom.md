# Fluid-Toy Deep Zoom — Implementation Plan

Bring perturbation + Linear Approximation (LA) deep zoom to fluid-toy's
Mandelbrot/Julia field. Targets ~10⁻³⁰⁰ practical depth with smooth
interactive zoom, while preserving fluid coupling.

Reference implementation: **FractalShark** (`H:/GMT/refSoftware/FractalShark`)
— specifically `LAReference.cpp`, `LAInfoDeep.h`, `LAKernel.cuh`,
`HDRFloat.h`. The math, table layout, and rebase rules below are taken
from there and adapted for WebGL2.

---

## 1. Background — what we're consuming

The fluid couples to the fractal via [features/coupling.ts](../fluid-toy/features/coupling.ts).
Five force modes read different fields off the per-pixel iteration:

| Mode | Reads | Endpoint vs integrated |
|---|---|---|
| 0 Gradient | smoothI finite-diff | endpoint |
| 1 Curl | same | endpoint |
| 2 Iterate | final z | endpoint |
| 3 C-Track | Δz, Δ smoothI vs prev frame | endpoint (after coupling change, see §6) |
| 4 Hue | smoothI-derived colour | endpoint |

All five force modes read endpoint data only. Trap distance, stripe sum,
and trap-iter on `outAux` (palette feature only) are integrated stats — they
do not feed coupling. **This is the green light for full LA**: the table
returns exact endpoints, and the integrated stats can fall through a
short per-iter tail or accept undersampling.

---

## 2. Algorithm reference (the LA stack)

### 2.1 Perturbation
One reference orbit `Z[0..N]` computed in arbitrary precision (worker).
Per-pixel native-float `dz` follows `dz' = 2·Z·dz + dz² + dc`. Pixel
position is `Z + dz`.

### 2.2 LA node — bivariate linear map
Each LA node represents `K` consecutive ref iterations as one affine map:
```
dz_out = ZCoeff · dz_in + CCoeff · dc
```
Plus validity radii `LAThreshold` (on dz) and `LAThresholdC` (on dc), the
covered iter count `StepLength`, and the next-stage cross-link
`NextStageLAIndex`.

**Step** (extend an LA by one ref iter z, power-2):
```
outZCoeff = 2z · ZCoeff
outCCoeff = 2z · CCoeff + 1
```
**Composite** (chain LA₁ then LA₂):
```
outZCoeff = LA₁.ZCoeff · LA₂.ZCoeff
outCCoeff = LA₁.CCoeff · LA₂.ZCoeff + LA₂.CCoeff
```

Generalised power d (z → zᵈ + c):
```
outZCoeff = d · zᵈ⁻¹ · ZCoeff
outCCoeff = d · zᵈ⁻¹ · CCoeff + 1
```
Composite is unchanged.

### 2.3 Validity test (FractalShark form)
Tighter than the radius approximation in mathr's article. Per-pixel
runtime check:
```
unusable = |dz · (2·Ref + dz)| ≥ LAThreshold
```
For power d: `|dz · (d·Refᵈ⁻¹ + lower-order(dz))| ≥ LAThreshold`. We can
keep the simpler test for d=2 and a broader bound for d>2.

### 2.4 Stage construction — greedy + binary tree
- **Stage 0**: walk the orbit; greedily extend an LA by `Step()` until
  `Step` reports period detection (the threshold collapses too far);
  push the LA, restart from current iter. Result: `m_LAs` array of
  variable-length leaf LAs.
- **Stage N+1**: walk stage-N LAs in pairs; greedily `Composite()` until
  period detection; push, restart.
- Stop when stage produces ≤1 entry. With `periodDivisor = 2` this is
  binary tree depth, `MaxLAStages = 1024` ceiling.

Total table size for ~50k ref iter: ~100k nodes (~6 MB at our packing).
Fits in `RGBA32F` texture comfortably.

### 2.5 Runtime walk
Per pixel, outer loop over stages (largest skips first), inner loop walks
LAs within stage:
```
while (stages remaining) {
  while (iter < maxIter) {
    step = LA.Prepare(dz);
    if (step.unusable) → break to next stage;
    iter += LA.StepLength;
    dz = LA.ZCoeff · dz + LA.CCoeff · dc;
    z = Z[ref+j] + dz;
    // Rebase check:
    if (|z| < |dz| || j >= MacroItCount) { dz = z; j = 0; }
    j++;
  }
}
// Per-iteration fallback (PO loop) for whatever LA can't cover:
while (iter < maxIter && |z|² < escapeR²) {
  dz = 2·Z[ref]·dz + dz² + dc;
  ref++;
  z = Z[ref] + dz;
  if (|z|² < |dz|² || ref >= maxRef) { dz = z; ref = 0; }
  iter++;
}
```

### 2.6 Rebasing
Triggered by `|Z+dz| < |dz|` — pixel orbit drifted near the critical
point, switch the reference baseline. Total iteration count `iter` is
**never reset**, only the per-reference index `j`/`ref`. This preserves
smoothI continuity across rebases — important for force gradient modes.

---

## 3. Architecture

### 3.1 Boundary
- **Worker** (Web Worker, separate from main thread): high-precision
  reference orbit + LA table construction. Pure CPU, no WebGL access.
  Outputs typed arrays.
- **Main thread**: receives buffers, uploads as textures, drives sync to
  FluidEngine. Per the fluid-toy README's Zustand-cascade rule, the
  table-rebuild trigger fires only on store-level events (zoom past
  validity, c-base change), never per-frame.
- **GPU shader**: forks `evalJulia` in [shaders.ts](../fluid-toy/fluid/shaders.ts) — standard f32
  path when deep-zoom is off, perturbed/LA path when on.

### 3.2 New module layout
```
fluid-toy/
├── deepZoom/
│   ├── HDRFloat.ts          mantissa+int32 exp, host-side type + ops
│   ├── HighPrecComplex.ts   wraps decimal.js or custom MPFR-lite for ref orbit
│   ├── referenceOrbit.ts    builds Z[0..N] given (centre, c, power)
│   ├── laBuilder.ts         Step / Composite / construction pipeline
│   ├── laRuntime.ts         wraps everything; rebuild policy
│   ├── laTextures.ts        pack LA nodes into Float32Array → texture
│   └── deepZoomWorker.ts    web worker entry; receives (centre, c, zoom,
│                            power, maxIter), emits (refOrbitBuf, laBuf,
│                            stagesBuf)
├── features/
│   └── deepZoom.ts          DDFS feature
└── components/
    └── (no new components phase 1)
```

### 3.3 Texture layout

**Reference orbit**: `RGBA32F`, width = ceil(maxRef / rowSize), one texel
per ref iter. Channels: `[Z.re, Z.im, |Z|², _]`. The |Z|² is precomputed
to save a mul per iter in the shader (and is the rebase test
denominator).

For HDR (depths past ~10⁻³⁰): two textures, second carries `[Z.expRe,
Z.expIm, _, _]` int32 packed as f32.

**LA nodes**: `RGBA32F × 3` per node, 1D texture (or 2D with row
unpacking):
```
texel 0: [Ref.re, Ref.im, ZCoeff.re, ZCoeff.im]
texel 1: [CCoeff.re, CCoeff.im, LAThreshold, LAThresholdC]
texel 2: [MinMag, StepLength, NextStageLAIndex, _]
```
Plus a small **stage table** (`MaxLAStages` ≤ 32 in practice for our
depth range): `[LAIndex, MacroItCount]` per stage.

For HDR: a fourth texel per node carries the four exponents of Ref.re,
Ref.im, ZCoeff.re, ZCoeff.im (CCoeff exps in a fifth, etc.). Six texels
per HDR node, ~96 bytes. 100k nodes = 10 MB — still fine.

### 3.4 Rebuild policy

The reference orbit + LA table is valid for a region around its centre.
Rebuild triggers, in order of cost:
- **c-base change** (Julia mode): full rebuild. Coupling adjustment in §6
  handles this without needing per-frame rebuild.
- **Zoom out by >2× from build zoom**: rebuild (validity scales with
  zoom — old table is wasteful, not wrong).
- **Pan past validity radius**: rebuild. Track analytically — when the
  current centre-to-build-centre distance exceeds the most-restrictive
  `LAThresholdC` in the table, schedule.
- **Auto-orbit micro-motion** (Julia, c circling): **disabled in deep
  mode** — see §6.

Rebuilds are queued and debounced; in-flight rebuilds get cancelled by
the next request. Old textures stay bound until the new one is uploaded.

---

## 4. Phases

Each phase ends with a runnable, testable state. Merge between phases.

### Phase 1 — DDFS scaffolding
**Files:** `features/deepZoom.ts`, `registerFeatures.ts`,
`storeTypes.ts`, `panels.ts`, `FluidToyApp.tsx`

DDFS feature with params, off by default:
```ts
enabled: bool        // master toggle
useScaledFloat: bool // auto-engage at zoom < 1e-6
useLA: bool          // requires enabled
maxRefIter: int      // 5_000..200_000, default 50_000
showStats: bool      // overlay: orbit length, LA stages, table size
```
Feature panel shows toggles + read-only stats. Sync function is a no-op
in this phase — wires plumbing only. No engine path forks yet.

**Done when:** toggling does nothing visible, no regressions, type
augmentation lands.

### Phase 2 — Worker + reference orbit (CPU only)
**Files:** `deepZoom/HighPrecComplex.ts`, `deepZoom/referenceOrbit.ts`,
`deepZoom/deepZoomWorker.ts`

Pick a high-precision lib. Options:
1. `decimal.js` — battle-tested, ~30 KB gzipped, base-10 (slow for our
   binary math but easy).
2. Custom MPFR-lite using `BigInt` for mantissa + `int32` exp (fastest,
   ~200 lines).
3. `bignumber.js` — middle ground.

**Recommend (2)**: a small native impl. The complex ops we need (mul,
add, |z|², compare) are small. We'll lift the algorithm from
`HpSharkFloatLib/HighPrecision.h` if needed.

Worker entry:
```ts
self.onmessage = ({ data: { centre, c, kind, power, zoom, maxRefIter } }) => {
  const orbit = computeReferenceOrbit(centre, c, kind, power, maxRefIter);
  postMessage({ orbit: orbit.buffer, length: orbit.length }, [orbit.buffer]);
};
```

**Done when:** worker computes a reference orbit at e.g. centre =
(-0.75, 0), zoom = 1e-30, returns `Float32Array` of length ~10k. Visual
verify by logging |Z| trajectory. No shader changes yet.

### Phase 3 — Perturbation shader path (no LA, power-2 only)
**Files:** `fluid/shaders.ts`, `fluid/FluidEngine.ts`,
`deepZoom/laTextures.ts`

Fork `evalJulia` with a `#define DEEP_ZOOM` branch:
```glsl
#ifdef DEEP_ZOOM
  vec2 dc = (uv * uScaleDeep);  // scaled-float in phase 4
  vec2 dz = vec2(0.0);
  int ref = 0;
  for (int i = 0; i < uMaxIter; ++i) {
    vec2 Z = texelFetch(uRefOrbit, ivec2(ref, 0), 0).xy;
    vec2 dz_new = cmul(2.0 * Z, dz) + cmul(dz, dz) + dc;
    dz = dz_new;
    ref++;
    vec2 z = texelFetch(uRefOrbit, ivec2(ref, 0), 0).xy + dz;
    float zMag2 = dot(z, z);
    if (dot(dz, dz) > zMag2 || ref >= uMaxRefIter - 1) {
      dz = z;
      ref = 0;
    }
    if (zMag2 > uEscapeR2) { /* escape, write outputs */ }
  }
#else
  /* existing path */
#endif
```

FluidEngine receives the orbit buffer, uploads to `uRefOrbit` texture on
update. Toggle flips the `#define` and recompiles.

**Done when:** Mandelbrot kind, power 2, zoom ~1e-7 renders identically
to the f32 path. Quality should be visually indistinguishable. Stats
overlay shows orbit length.

### Phase 4 — Scaled floats (HDRFloat)
**Files:** `deepZoom/HDRFloat.ts`, shader updates, texture layout

Add `vec2(mantissa, exp)` per HDR scalar in GLSL:
```glsl
struct HDR { float m; float e; };  // exp stored as float, integer-valued
HDR hdrAdd(HDR a, HDR b) { ... renormalize after ... }
HDR hdrMul(HDR a, HDR b) { ... }
HDR hdrReduce(HDR x) { /* normalize mantissa to [1, 2) range */ }
```
`dc`, `dz` become 2 × HDR (re + im). Reference orbit texture grows to
two RGBA32F textures (mantissa + exp) — packed as described in §3.3.

Auto-engage when `zoom < 1e-30` (configurable). Below that threshold,
shader recompiles with a second `#define USE_HDR`. Above, plain f32
deltas (already from phase 3).

**Done when:** zoom ~1e-100 on Mandelbrot picker renders with no
precision artefacts. Zoom-in / zoom-out around the threshold should be
visually continuous (might need a brief overlap window where both paths
agree).

### Phase 5 — LA construction (worker)
**Files:** `deepZoom/laBuilder.ts`, `deepZoomWorker.ts` extension

Implement `LAInfoDeep.Step`, `Composite`, period detection, and the
two-pass construction (`CreateLAFromOrbit` → `CreateNewLAStage`). All in
TypeScript using the HDRFloat type from phase 4. Single-threaded for
now (CPU worker; multi-threading via shared workers is a future
optimisation).

Output: typed arrays for the LA texture and the stage table.

**Done when:** worker emits both the orbit and the LA table for the
same view. Log stage count, total nodes, build time. Sanity check by
running the validity test on random `dz, dc` against a manually-iterated
ground truth.

### Phase 6 — LA runtime (shader)
**Files:** `fluid/shaders.ts` major fork

Add the LA outer-stage walk before the PO fallback:
```glsl
int currentStage = uLAStageCount;
while (currentStage > 0) {
  --currentStage;
  int laIndex = stageTable[currentStage].laIndex;
  int macroIters = stageTable[currentStage].macroItCount;
  int j = ref;
  while (iter < uMaxIter) {
    LA la = readLA(laIndex);
    vec2 dzNew = cmul(la.zCoeff, dz) + cmul(la.cCoeff, dc);
    if (dot(dzNew, dzNew) >= la.threshold * la.threshold) break;
    iter += la.stepLength;
    dz = dzNew;
    vec2 z = la.ref + dz;
    if (dot(z,z) < dot(dz,dz) || j >= macroIters) { dz = z; j = 0; }
    ++j;
    laIndex++;
  }
  if (iter >= uMaxIter) break;
}
// Then PO fallback from phase 3.
```
HDR variant uses the HDR ops from phase 4.

**Done when:** zoom ~1e-50 renders 10–100× faster than phase 3 alone.
Compare frame time on a fixed view with LA on/off. Visual diff should be
zero (or below 1 LSB).

### Phase 7 — AT (Approximation Terms) front-loading

**Files:** `deepZoom/atBuilder.ts`, shader extension

AT recasts the **front portion** of the perturbed iteration into a
*standard* `z² + c` iteration on transformed coordinates, run in plain
f32 with no texture reads. Per pixel it can fast-forward 30–50% of
iterations at depth. This is a perf optimisation on top of the working
LA stack from phase 6, not a replacement.

Build (worker, after LA stages are built): walk `m_LAStages` from
outermost stage inward; for each stage's first LA, derive an `ATInfo`
via `LAInfoDeep::CreateAT` (lifted from FractalShark). Test
`Usable(SqrRadius)` against the screen's max `|dc|`. First stage where
`Usable` returns true wins → set `useAT = true`, store the ATInfo.

The AT struct is small (~12 complex floats): `ZCoeff`, `CCoeff`,
`InvZCoeff`, `RefC`, `ThresholdC`, `SqrEscapeRadius`, `StepLength`, plus
precomputed norms (`CCoeffNormSqr`, `RefCNormSqr`). Pass to the shader as
uniforms (no texture).

Shader runs AT *first* when `useAT && |dc| ≤ ThresholdC`, ahead of the
LA outer-stage walk:
```glsl
if (uUseAT && cMagSquared(dc) <= uATThresholdC * uATThresholdC) {
  vec2 c_at = cmul(dc, uATCCoeff) + uATRefC;
  vec2 z_at = vec2(0.0);
  int atMax = uMaxIter / uATStepLength;
  int i = 0;
  for (; i < atMax; ++i) {
    if (dot(z_at, z_at) > uATSqrEscapeRadius) break;
    z_at = cmul(z_at, z_at) + c_at;  // power-2; for power d, cpow(z_at, d)
  }
  iter = i * uATStepLength;
  dz   = cmul(z_at, uATInvZCoeff);
  // continue into the LA outer-stage walk from this (iter, dz)
}
```

The PO fallback rebase rule (`|tempZ|² < |dz|²`) **already handles the
case where AT escapes mid-iteration with a stale `ref` index**, so no
special wiring needed at the LA→PO boundary.

Worker requires `SqrRadius` = max(|dc|² across screen corners). Main
thread computes from current view bounds; rebuild triggers already
include zoom changes that move this.

**Power-d variant** (lands together with phase 9 power generalisation,
not in this phase): `CreateAT` step rule and `PerformAT` shader use
`cpow(z, d)` instead of `z*z`.

**Done when:** at zoom 1e-30 with AT on, frame time drops 20–40% vs LA
alone. Visual diff vs LA-only path: below 1 LSB.

### Phase 8 — Wire into FluidEngine + coupling adjustment
**Files:** `features/coupling.ts`, motion shader in `shaders.ts`,
`FluidEngine.ts`

1. Update C-Track shader (mode 3) to use analytic `dz/dc` instead of
   `uJuliaPrev` finite-diff. Compute `dz/dc` in `evalJulia` (we already
   compute `dz` for `outAux.b`; just keep the vec2). C-Track becomes:
   ```glsl
   } else if (uMode == 3) {
     vec4 aux = texture(uJuliaAux, vUv);
     vec2 dzdc = aux.rg;  // expose in outAux instead of just |dzdc|
     float m = length(dzdc);
     vec2 dir = (m > 1e-6) ? dzdc / m : vec2(0.0);
     force = dir * clamp(m, 0.0, 3.0);
   }
   ```
   This both fixes the deep-zoom finite-diff problem **and** removes the
   `uJuliaPrev` dependency for mode 3.
2. Disable auto-orbit when deep-zoom is enabled (gate via `condition`
   on `orbitEnabled` param, and force-off the runtime LFO in
   `orbitTick.ts`).

**Done when:** all five force modes look correct at zoom 1e-50 across
gradient/curl/iterate/c-track/hue. C-Track behaves identically at
shallow zoom (since the finite-diff was already approximating `dz/dc`).

### Phase 9 — Variable power
**Files:** `deepZoom/laBuilder.ts`, shader updates

LA construction generalises:
- `Step`: replace `2z·ZCoeff` with `d·z^(d-1)·ZCoeff`.
- PO fallback shader step: pre-expand `(Z+dz)^d - Z^d` per power d ∈
  {2..8} as a switch.
- Reference orbit step uses `cpow(z, d)` — unchanged from existing path.

**Done when:** power 3 deep-zoom renders, validates against shallow-zoom
power-3 output at the boundary zoom level.

### Phase 10 — Julia mode
**Files:** `referenceOrbit.ts`, shader

Julia kind: reference orbit is at one specific pixel point, iterating
`z' = z² + c` with `c` fixed. The structure is the same — only the
initial conditions change.

**Done when:** Julia mode deep zoom works, picker tool can use it for
high-zoom c-picking.

### Phase 11 — Multi-reference tiling (future)
**Files:** orchestration layer

For minibrot zooms where one reference can't cover the whole frame.
Tile the screen, compute one reference per tile, pick best per tile.
Defer until phases 1–10 ship and we hit a real case where one reference
fails.

---

## 5. Open questions / deferred

- **MPFR-vs-decimal.js** — phase 2 decision. Recommend benching during
  prototyping.
- **Cancellation semantics** — what happens to a rebuild in flight when
  the user pans past validity twice in quick succession? Worker should
  expose `cancel()` and the main thread should debounce + cancel-stale.
- **Compile cancellation** — recompiling shaders on toggle changes is
  cheap (the shader is small), but if we discover hitches, defer with
  the existing two-stage compile pattern.
- **Color path with LA** — currently colour reads `outAux.r` (trap min)
  and `outAux.g` (stripe sum), both integrated stats. With LA those are
  sampled only at endpoints — colour will look slightly different. Two
  fixes: (a) accept it, (b) after LA exhausts, run the last `colorIter`
  iters per-pixel to recover stats. Phase 6 should default to (a) and
  measure; only do (b) if the artist notices.

---

## 6. Coupling change spec (the one fluid-side change)

**File:** [features/coupling.ts](../fluid-toy/features/coupling.ts) and motion shader.

### Current (mode 3, C-Track)
```glsl
vec2 dz = c.rg - cp.rg;  // c=current julia, cp=prev frame's julia
float ds = c.b - cp.b;
vec2 dir = normalize(dz);
force = dir * clamp(length(dz)*3 + abs(ds)*0.2, 0, 3) * (1/dt);
```
Reads `uJuliaPrev`. Frame-to-frame finite diff in pixel space.

### Proposed
Change the iteration kernel to expose `dz/dc` as a vec2 in
`outAux.rg`, replacing the current `outAux.r = trap min` (move trap to
`outAux.b` since the `log(1+|dz|)` we currently put there is redundant
with `length(dz/dc)`).

**New `outAux`:** `[dzdc.re, dzdc.im, trapMin, trapIterN]`
(stripeSum stays where it was, on a different texel — adjust as needed
when implementing).

**New mode 3:**
```glsl
vec2 dzdc = aux.rg;
float m = length(dzdc);
vec2 dir = (m > 1e-6) ? dzdc / m : vec2(0.0);
force = dir * clamp(m * 0.5, 0.0, 3.0);
```
No more `uJuliaPrev` for mode 3 → remove that texture binding when
mode == 3 (or just leave it bound and ignored; the cost is one
texture-fetch we don't do).

### Shallow-zoom equivalence
At shallow zoom `dz/dc ≈ (z_now − z_prev) / Δc`. Auto-orbit drives Δc
at rate `orbitSpeed * orbitRadius * 2π`. The finite-diff approach
implicitly computed the same direction modulo a frame-time-dependent
scale factor — the new gain `0.5` is the empirical shallow-zoom match
factor (calibrate during phase 8).

### Auto-orbit gating
In `features/coupling.ts`, add condition:
```ts
orbitEnabled: {
  ...,
  condition: { param: 'deepZoom.enabled', bool: false },
  // Or if cross-feature conditions aren't supported, gate in orbitTick.ts.
},
```
Force-off in `orbitTick.ts` when `deepZoom.enabled === true`. Show a
tooltip or hint explaining why.

---

## 7. Test strategy

### Per-phase
- **Phase 1**: smoke `smoke:fluid-toy` continues passing.
- **Phase 2**: unit test for reference orbit — compare first 100 iters
  against a known-good MPFR computation for a fixed (centre, c).
- **Phase 3**: visual diff vs f32 path at zoom 1e-7, both
  Mandelbrot. Use existing TSAA accumulation off, single sample, fixed
  seed — pixel-exact match expected.
- **Phase 4**: visual smoke at zoom 1e-100 — manually verify structure
  matches a reference image (Imagina/KF screenshot at same coords).
- **Phase 5**: unit test for LA `Step`/`Composite` — run an LA over N
  iterations, then evaluate at random `dz, dc` within validity, compare
  to manually-iterated ground truth.
- **Phase 6**: frame-time benchmark on/off at fixed view. LA on must be
  ≥3× faster at zoom 1e-30, ≥10× faster at zoom 1e-50.
- **Phase 7**: frame-time benchmark with AT on/off at zoom 1e-30.
  Visual diff vs phase 6 below 1 LSB.
- **Phase 8**: visual smoke for each of the 5 force modes at deep zoom,
  brush-coupling test (does fluid still respond correctly?).
- **Phase 9**: power-3 visual at zoom 1e-15.
- **Phase 10**: Julia visual at zoom 1e-30.

### Cross-cutting
- New smoke `smoke:deep-zoom`: boot fluid-toy, enable deepZoom, set
  zoom 1e-50, render one frame, screenshot, compare to baseline.
- Auto-orbit must visibly stop when deepZoom toggles on.

---

## 8. Out of scope

- Mesh export / VDB integration with deep-zoom fields.
- GMT main app integration. Once the stack works in fluid-toy and the
  picker, the same modules port over.
- Mandelbulb / 3D fractals. Different math, different stack.
- BLA-with-skew / hybrid formulas — Burning Ship etc. Same algorithm
  generalises but adds construction complexity.

---

## 9. Estimated scope per phase

| Phase | LOC (rough) | Risk |
|---|---|---|
| 1 — DDFS | ~150 | low |
| 2 — Worker + ref orbit | ~400 (incl. HighPrec) | medium |
| 3 — Perturb shader | ~200 | medium |
| 4 — HDRFloat | ~500 (host) + ~200 (GLSL) | medium-high |
| 5 — LA construction | ~700 | high |
| 6 — LA runtime | ~250 GLSL | medium |
| 7 — AT front-loading | ~150 (host) + ~50 GLSL | low |
| 8 — Coupling + wiring | ~150 | low |
| 9 — Variable power | ~200 | medium |
| 10 — Julia mode | ~100 | low |

Phases 1–8 are the MVP (depth + perf + fluid integration).
Phase 7 (AT) is small and lands cheaply on top of phase 6, so it's
worth doing before coupling rather than deferring.
Phases 9–10 are flag-gated extensions; phase 11 is reserved.
