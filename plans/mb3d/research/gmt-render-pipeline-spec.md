# GMT Render-Pipeline Spec (MB3D-importer reference)

> **Provenance correction (2026-06-28):** re-anchored from the dead `Calc.pas` `RayMarch`
> (`Calc.pas:1815-1942`, zero call sites) to the live `TMandCalcThread.Execute` marcher
> (`CalcThread.pas:128-258`) and the live `HeaderTrafos.pas` constants — see
> `render-pipeline-CORRECTIONS.md`. The GMT-side mechanism descriptions were correct and stand;
> the MB3D cross-references (step formula, termination bound, normals dispatch, msDEstop
> scaling, binary-search attribution) are the ones re-anchored below.

**Purpose.** This is the definitive, code-grounded description of how GMT's fractal
raymarcher renders a pixel — the marcher, the distance estimators, the iteration
schema, the quality/hard-cap surface, and the MB3D importer's header→render-param
mapping. It exists so the MB3D converter can be reasoned about against the *actual*
GMT pipeline rather than against plausible-but-wrong mental models. Every fact is
tagged `[VERIFIED file:line]` (claim survived adversarial re-reading of the cited
source) or `[INFER … : <what settles it>]` (confidence was inferential and survived).
A `## Falsified hypotheses` section records the theories that were checked and refuted —
that graveyard is as load-bearing as the confirmed facts.

Paths are given as in the repo: GMT source under `h:/GMT/workspace-gmt/stable/`,
MB3D Pascal source under `/h/tmp/mb3d-src/`.

---

## 1. Executive summary — how GMT renders one pixel

A primary ray is generated from the camera and clipped to a bounding sphere of
radius `BOUNDING_RADIUS = 400.0`; the marcher starts at `d = max(0, bounds.x)`
[VERIFIED trace.ts:99-109]. It then sphere-traces in a single GLSL `for` loop bounded
at compile time by `MAX_HARD_ITERATIONS` (the desktop `#define` is
`DEFAULT_HARD_CAP = 2000`) and at runtime by `if (i >= int(uMaxSteps)) break;`
[VERIFIED trace.ts:118,130-131; constants.ts:22]. Each step calls `h = map(p + uCameraPosition)`,
which runs the fractal orbit up to `uIterations` and returns `vec4(distance, trap, iter, decomp)`
[VERIFIED trace.ts:44,138; de.ts:294-325]. The step advances
`d += max(h.x, floatPrecision*0.5) * uFudgeFactor * stepJitter`, where `floatPrecision`
scales with distance from the fractal origin (`PRECISION_RATIO_HIGH = 5e-7`) and `stepJitter`
is an asymmetric short-biased dither [VERIFIED trace.ts:24-28,204,212-213]. A hit is
declared when `h.x < finalEps`, with `finalEps = max(pixelFootprint*(uPixelThreshold/effectiveDetail), floatPrecision)`
[VERIFIED trace.ts:156-161,164]. If the loop misses, optional overstep recovery snaps the
ray back to the closest tracked near-miss when `minCandidateRatio <= 1 + uOverstepTolerance`
[VERIFIED trace.ts:188-199,218-246]; and when the `refineEnabled` compile-flag is set,
a post-hit damped bisection (≤ `REFINE_HARD_CAP = 8` steps) pins the surface
[VERIFIED trace.ts:54-84; constants.ts:31]. The march terminates on hit, on the runtime
step cap, or when `d > MAX_DIST (10000.0)` [VERIFIED trace.ts:119,131,164-186,215; math.ts:158].
Surface shading then computes a normal (analytic tetrahedron/forward-diff, or numeric
central-difference under `NUMERIC_DE`) and applies the material [VERIFIED material_eval.ts:8-52].

---

## 2. The marcher (`engine-gmt/shaders/chunks/trace.ts`)

`trace.ts` is a **JS template that builds GLSL** — `getTraceGLSL(...)` assembles the
marcher source string at compile time, injecting blocks conditionally (refinement,
miss handling, precision mode). The constants it references are `#define`s emitted from
other chunks.

### 2.1 Loop bounds — the central contrast with MB3D

```glsl
int limit = int(uMaxSteps);          // trace.ts:118
float maxMarch = MAX_DIST;            // trace.ts:119
...
for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {   // trace.ts:130
    if (i >= limit) break;                         // trace.ts:131
```

- `MAX_HARD_ITERATIONS` is a **compile-time `#define`** [VERIFIED trace.ts:130]. Its value
  is `DEFAULT_HARD_CAP = 2000` on desktop, `MOBILE_HARD_CAP = 256` on mobile
  [VERIFIED constants.ts:21-24], injected from `quality.compilerHardCap`
  (`builder.addDefine('MAX_HARD_ITERATIONS', …)`) [VERIFIED quality.ts:304-307].
- `uMaxSteps` is a **runtime uniform** (default 300) that breaks the loop early; it is the
  artistic depth knob, never larger than the hard cap [VERIFIED trace.ts:118,131; quality.ts:83-89].
- **MB3D contrast:** MB3D's **live** marcher (`TMandCalcThread.Execute`, the inlined loop at
  `CalcThread.pas:128-258`, spawned `Calc.pas:209`) is a `repeat … until` with **no
  compile-unrolled ceiling and no step-count cap** — its only exit is the distance bound
  `until (mZZ > Zend) or PCalcThreadStats.pLBcalcStop^` [VERIFIED CalcThread.pas:253].
  (The forward-declared `RayMarch`/`RayMarchVV` at `Calc.pas:1815/1944` are **dead** — zero
  call sites; do not read marcher mechanics from them.) GMT instead bounds the loop at compile
  time (`MAX_HARD_ITERATIONS`) so ANGLE/D3D never unrolls a data-dependent loop, and uses
  `uMaxSteps` as the live step cap [VERIFIED trace.ts:118-131]. The step-count cap is the
  central divergence (§7.2, §10).

### 2.2 Step advance

```glsl
// trace.ts:206-213
float stepJitter = uBlendFactor >= 0.99 ? 1.0
    : (1.0 - uStepJitter) + uStepJitter * fract(stochasticSeed * 127.1 + d * 31.7);
...
d += max(h.x, floatPrecision * 0.5) * currentFudge * stepJitter;
```

- `currentFudge = uFudgeFactor` (default 1.0) [VERIFIED trace.ts:204; quality.ts:158-164].
- `stepJitter` is asymmetric in `[1 - uStepJitter, 1.0]`, **biased short to avoid overshoot**,
  with coprime hash constants (127.1, 31.7) to break DE banding. It is **disabled during
  navigation** (`uBlendFactor >= 0.99` → `stepJitter = 1.0`) so the live image stays clean;
  banding averages away once accumulation starts. `uStepJitter` default 0.15
  [VERIFIED trace.ts:206-212; quality.ts:166].
- The `max(h.x, floatPrecision*0.5)` floor guarantees forward progress even when the DE
  returns near-zero [VERIFIED trace.ts:213].
- **Dynamic "Step Relaxation" was removed 2026-06-19** — a never-useful, default-0, inert
  control; its removal was compile-neutral (straight-line ALU) [VERIFIED trace.ts:202].

### 2.3 Hit threshold (`finalEps`) and precision logic

```glsl
// trace.ts:156-161
float effectiveDetail = uDetail / uInternalScale;
float pixelFootprint = (uCamType > 0.5 && uCamType < 1.5)   // 1 = orthographic
    ? uPixelSizeBase
    : uPixelSizeBase * d;
float threshold = pixelFootprint * (uPixelThreshold / effectiveDetail);
float finalEps = max(threshold, floatPrecision);
```

- `pixelFootprint` is constant for orthographic cameras (`uCamType ∈ (0.5,1.5)`) and grows
  with `d` for perspective — so `uPixelThreshold` means *fraction of a viewport pixel* at
  any scale [VERIFIED trace.ts:156-160]. `uPixelThreshold` default 0.5, `uDetail` default 1.0
  [VERIFIED quality.ts:178-183,172-177].
- **Precision floor** is distance-scaled (`distFromFractalOrigin = length(p + worldOriginOffset)`,
  trace.ts:146):

```glsl
// trace.ts:24-28
const precisionLogic = useLowPrecision ? `
    float floatPrecision = max(PRECISION_RATIO_LOW, distFromFractalOrigin * PRECISION_RATIO_LOW);
` : `
    float floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);
`;
```

  `PRECISION_RATIO_HIGH = 5.0e-7` (~0.5 ppm, default desktop), `PRECISION_RATIO_LOW = 1.0e-5`
  (~10 ppm, mobile/standard) [VERIFIED math.ts:161-162]. `useLowPrecision = (precisionMode == 1) || isMobile`
  [VERIFIED trace.ts:19].

### 2.4 Bounding sphere & termination

```glsl
// trace.ts:99-109
vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
if (bounds.x > bounds.y) { fogScatter = vec3(0.0); return false; }
d = max(0.0, bounds.x);
```

`BOUNDING_RADIUS = 400.0`, `MAX_DIST = 10000.0`, `MISS_DIST = 1000.0` [VERIFIED math.ts:158-160].
The march terminates on:
1. **Hit** — `h.x < finalEps` → `return true` [VERIFIED trace.ts:164-186].
2. **Runtime step cap** — `i >= limit` (`limit = int(uMaxSteps)`) [VERIFIED trace.ts:131].
3. **Distance cap** — `d > maxMarch` (`maxMarch = MAX_DIST`) [VERIFIED trace.ts:215,119].

The inner distance call is always `h = map(p + uCameraPosition);` [VERIFIED trace.ts:44,138].
`map()` returns `vec4(distance, trap, iter, decomp)` with orbit-trap colouring computed.
A split `mapDist()`-in-the-loop optimization was **tried and reverted**: the compiler already
DCEs `h.y/h.z/h.w` when no downstream body reads them, so `mapDist()` saved nothing per step
but added a redundant `map()` at hit detection — net **+5% slower**
[VERIFIED trace.ts:38-45; bench-shader history 2026-05-02].

On miss the trailing block resolves volume at infinity:

```glsl
// trace.ts:30-36
const missBlock = volumeFinalizeCode.trim().length > 0
    ? `vec3 p_end = ro + rd * d;
  h = map(p_end + uCameraPosition);
  h.x = MISS_DIST;
  vec3 p = p_end;
  ${volumeFinalizeCode}`
    : `h = vec4(MISS_DIST, 0.0, 0.0, 0.0);`;   // trace.ts:248-249
```

`result = h; // h.x is dist, h.yzw is trap data` [VERIFIED trace.ts:184].

---

## 3. Overstep recovery & compile-gated post-hit refinement

These are GMT's two answers to **non-Lipschitz / over-estimating DEs** that tunnel through
thin surfaces. They are independent: recovery runs **after a miss**, refinement runs **after a hit**.

### 3.1 Overstep recovery (candidate tracking + snap-back)

The marcher tracks the closest the ray ever got to a surface, normalized by the precision
required at that depth:

```glsl
// trace.ts:124-128
float minCandidateRatio = 1.0e10;
float candidateD = -1.0;
vec4 candidateH = vec4(0.0);
```

Per step, gated on `uOverstepTolerance > 0.0`:

```glsl
// trace.ts:188-199
if (uOverstepTolerance > 0.0) {
    float ratio = h.x / finalEps;
    if (ratio < minCandidateRatio) {
        minCandidateRatio = ratio;
        candidateD = d;
        candidateH = h;   // snapshot full map() so recovery reuses trap/iter/decomp
    }
}
```

Post-loop recovery:

```glsl
// trace.ts:218-246
if (uOverstepTolerance > 0.0 && candidateD > 0.0) {
    if (minCandidateRatio <= (1.0 + uOverstepTolerance)) {
         d = candidateD;
         result = candidateH;   // reuse captured map() (byte-identical to re-eval) @see adr/0076
         result.x = 0.0;        // force hit
         ...
         return true;
    }
}
```

- `uOverstepTolerance` default **0.0** (off) [VERIFIED quality.ts:184-189]. A tolerance of
  2.0 accepts misses within 2× the hit epsilon and snaps back, treating them as tunneled hits
  [VERIFIED trace.ts:218-246].
- Recovery **reuses the candidate's `h.yzw`** (trap/iter/decomp colour) — the ray parameter
  is refined but colour is unchanged, byte-identical to re-evaluating `map(p_cand)` without
  re-inlining the heaviest body [VERIFIED trace.ts:195-197,228-232; adr/0076].

### 3.2 Compile-gated post-hit refinement (damped bisection)

The coarse march only **brackets** a hit: `dPrev` was outside (`h.x >= finalEps`), `d` is
inside (`h.x < finalEps`). An over-estimating fused DE oversteps a thin/discontinuous surface
so the accepted overshoot scatters into "dust"; bisecting the ray parameter onto the
`DE == finalEps` crossing lands a coherent near-face instead.

```glsl
// trace.ts:54-84 (refineBlock, emitted only when enableRefine === true)
float dPrev = d;                       // bracket low end
...
if (uRefineActive > 0.5) {
    float dOut = dPrev;                // outside (h.x >= finalEps)
    float dIn  = d;                    // inside  (h.x <  finalEps)
    for (int j = 0; j < REFINE_HARD_CAP; j++) {
        if (j >= int(uRefineSteps)) break;
        float dMid = 0.5 * (dOut + dIn);
        float hMid = mapDist((ro + rd * dMid) + uCameraPosition);  // geometry-only twin
        if (hMid < finalEps) dIn = dMid; else dOut = dMid;
    }
    d = dIn;                           // refined near-face surface
}
```

- **Compile-gated on the master toggle `refineEnabled`** (not the step count). When false,
  the entire `refineBlock` collapses to `""` — byte-identical shader, zero compile/runtime
  cost. When true, GMT injects `#define REFINE_HARD_CAP` and arms the loop
  [VERIFIED trace.ts:57-84; quality.ts:309-317; adr/0084]:

```ts
// quality.ts:309-317
if (state?.refineEnabled) {
    builder.addDefine('REFINE_HARD_CAP', String(REFINE_HARD_CAP));
    builder.enableRefinement(true);
}
```

- `REFINE_HARD_CAP = 8` is the compile-time unrolled ceiling for this loop, mirroring how
  `MAX_HARD_ITERATIONS` bounds the march [VERIFIED constants.ts:26-31].
- `uRefineActive` is the **instant runtime on/off** (loop compiled but skipped at 0.0);
  `uRefineSteps` (default 4.0, range 1–8) tunes the live step count without recompiling
  [VERIFIED trace.ts:68; quality.ts:228-240].
- The bisection uses `mapDist()` (geometry-only twin, no colouring) — distance is all the
  root-find needs [VERIFIED trace.ts:73-76; adr/0076]. Colour (`h.yzw`) is kept from the
  overshoot `map()`; the nudge is sub-pixel so colour is visually identical
  [VERIFIED trace.ts:80-81; adr/0076].
- This is **MB3D's `RMdoBinSearch`** (binary search), not the secant search — see the
  Falsified Hypotheses section for the corrected attribution.

---

## 4. DE estimators (`engine-gmt/shaders/chunks/de.ts` + `features/core_math.ts`)

GMT exposes **8 distance-estimator modes**, selected at **compile time** via
`quality.estimator` [VERIFIED quality.ts:102-151; core_math.ts:34-115,228-235]. The
selector `generateGetDist(estimatorType, supportsCuttingPlane, supportsDifs)` emits a static
`getDist()` whose branch conditions are compile-time constants the GLSL optimizer removes.

### 4.1 The estimator table

| `estimator` | Name | `getDist()` returns | Notes |
|---|---|---|---|
| 0 (default) | Analytic (Log) | `0.17328679 * log2(r²) * r / dr_safe` | = `0.5·ln(r)·r/dr` |
| 1 | Linear (Unit 1.0) | `(r - 1.0) / dr_safe` | |
| 2 | Pseudo (Raw) | `r / dr_safe` | = MB3D `Sqrt(Rout)/Abs(w)` |
| 3 | Dampened | `0.34657359 * log2(r²) * r / (dr_safe + 8.0)` | = `0.5·ln(r)·r/(dr+8)` |
| 4 | Linear (Offset 2.0) | `(r - 2.0) / dr_safe` | |
| 5 | Cutting Plane | `vec2(abs(cp_dmin), cp_trap)` | gated on `supportsCuttingPlane` |
| 6 | dIFS (Orbit Trap) | `vec2(g_difsDE, iter)` | gated on `supportsDifs` |
| 7 | Numerical (Finite-Diff) | (numeric path — see §5) | arms `enableNumericDE` |

[VERIFIED core_math.ts:42-93; quality.ts:102-151]

```ts
// core_math.ts:34-57 (selector head — order matters)
if (estimatorType > 5.5 && supportsDifs) {        // 6 → dIFS
    return `vec2 getDist(float r,float dr,float iter,vec4 z){return vec2(g_difsDE,iter);}`;
}
if (estimatorType > 5.5) estimatorType = 1.0;       // dIFS on non-dIFS formula → Linear
if (estimatorType > 4.5 && supportsCuttingPlane) {  // 5 → Cutting Plane
    return `vec2 getDist(float r,float dr,float iter,vec4 z){return vec2(abs(cp_dmin),cp_trap);}`;
}
if (estimatorType > 4.5) estimatorType = 1.0;       // CP on non-CP formula → Linear
```

The dIFS check **must precede** the CP checks, or estimator 6 would be coerced to CP/Linear
and break the dIFS DE [VERIFIED core_math.ts:35-48]. Estimator 5 reads engine-provided
accumulators `cp_dmin`/`cp_trap` declared in `CP_PREAMBLE` and reset in `CP_INIT`, injected
only when `pairSupportsCuttingPlane` [VERIFIED core_math.ts:117-135,272-275]. Estimator 6
reads `g_difsDE` (running minimum of `mb3dRout/mb3dVary` over the orbit, written per
iteration by an MB3D fused dIFS formula), mirroring MB3D's `doHybridIFS3D`
[VERIFIED core_math.ts:35-48].

### 4.2 The iteration loop, escape test, and `dr` accumulation

`map()` and `mapDist()` share the same loop structure:

```glsl
// de.ts:294-325 (map), 450-477 (mapDist)
for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
    if (i >= int(uIterations)) break;
    #ifndef SKIP_PRE_BAILOUT
    if (dot(z.xyz, z.xyz) > bailout) { escaped = true; break; }   // early bailout
    #endif
    ${formulaBody}                                                // injected per-formula
    if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) { escaped = true; break; }
}
```

- **Escape test:** `dr > 1.0e10` (derivative blow-up guard against NaN/Inf) **OR**
  `dot(z.xyz,z.xyz) > bailout` (radius² > bailout). The dr guard appears in `map()` and
  `centerCount()` alike [VERIFIED de.ts:121,372].
- **`uIterations` cap:** runtime — `if (i >= int(uIterations)) break;` checked before each
  body, so the iteration count is interactive without recompile [VERIFIED de.ts:294-295,451-452].
- **`dr` accumulation is the formula's responsibility, not the loop's.** `dr` is initialized
  to 1.0 (`float dr = 1.0;`) and threaded `inout` through the injected formula body, which
  applies the chain rule per iteration [VERIFIED de.ts:263]. Example (AmazingSurface):
  `loopInit` does `dr *= preScale` (pre-scale param), then per iteration
  `dr = dr * abs(scale) * k + 1.0` where `k` is the sphere-inversion factor
  [VERIFIED AmazingSurface.ts:12-20,52-55].
- **`bailout` (uDeBailout, default 100, floored at 1.0)** is the **absolute raymarch bailout**,
  **decoupled** from the colouring threshold `uEscapeThresh`. High → accurate analytic DE,
  sharp surfaces; low → early bail that slices the fractal into shells (overstep artifacts by
  design). When `bailout < uEscapeThresh` the decomp/potential capture never fires — an
  accepted tradeoff for the slicing effect. Floored at 1.0 so `|z|² ≥ 1` keeps log-DEs
  well-defined [VERIFIED de.ts:285-292].
- Some formulas opt out of the pre-bailout check via `SKIP_PRE_BAILOUT` (e.g. JuliaMorph);
  `selfContainedSDE` formulas (e.g. MandelTerrain) inject both `SKIP_PRE_BAILOUT` and
  `SELF_CONTAINED_SDE`, which also gates off the outer-loop geometric-trap block so they
  thread the trap through their own inner loop [VERIFIED core_math.ts:193-205; de.ts:315-320,341-352].

### 4.3 Smooth iteration & decomposition (colouring)

```glsl
// core_math.ts:100-106
float smoothIter = iter;
if (m2 > 1.0) {
    float threshLog = log2(max(uEscapeThresh, 1.1));
    smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
}
```

`uEscapeThresh` (default 4.0, range 1–1000) is a **colouring-only** threshold used by
Potential, Decomposition, Green's-Flow, and the smooth-iteration normalization — distinct
from the geometry `uDeBailout` [VERIFIED coloring/index.ts:165-175; de.ts:304-310,366-370].
A `uColorIter` snapshot mechanism captures `(orbitTrap, trap, geomTrap, iter)` at
`iter <= uColorIter` and substitutes them post-escape via
`mix(full, saved, step(0.5, uColorIter))`, capping iteration count for colouring without
affecting geometry [VERIFIED de.ts:359-364,393-397].

---

## 5. Numeric estimator 7 (`numericDistance`, `uNumDEeps`)

When `estimator > 6.5`, the importer/quality layer calls `builder.enableNumericDE(true)` and
adds `#define NUMERIC_DE 1` [VERIFIED core_math.ts:237-245]. This swaps `map()`/`mapDist()`
to call `numericDistance()` instead of analytic `getDist()` (the analytic `getDist` body is
dead code in this path, falling back to Linear) and routes normals to `numericNormal()`. It
is the path for any formula whose analytic `dr` is missing or wrong (MB3D `[CODE]` hybrids,
hard frag imports). When `numericDE` is false, **nothing** changes — the analytic path is
byte-identical [VERIFIED de.ts:16-21,233-246; adr/0085].

### 5.1 Fixed-count finite difference

The numeric DE is a float32-robust port of MB3D's `CalcDEnoADE` (Calc.pas:445-523). Three
helpers:

- **`centerCount(p)`** — runs the orbit with the **normal** bailout and returns the
  completed-iteration count at which the **center** escaped (capped at `uIterations`) =
  MB3D's `ItResultI` (Calc.pas:473). This FIXED count is what every perturbed sample re-runs,
  making `Rout` a SMOOTH function of the seed (no per-sample escape-iteration jump)
  [VERIFIED de.ts:83-127,29-33].
- **`iterateRadius(p, fixedIters)`** — the SAME orbit body run a FIXED count, returning final
  radius² (`Rout`). The per-sample early-escape break is REMOVED; the iteration count is the
  real terminator. The bailout is **MB3D's INFLATED `Rstop3D = Sqr(dRstop)·64`**
  (Calc.pas:474/558, where `dRstop = uDeBailout`):

```glsl
// de.ts:154-155
float bo = max(uDeBailout, 1.0);
float cap = min(bo * bo * 64.0, 1.0e30);   // MB3D Rstop3D = Sqr(dRstop)·64; clamp keeps float32-safe
```

  The 64× cap **must** be this high: a too-low cap is overshot by the folds *within* the
  count → every escaped tap clamps to the same value → ΔRout = 0 → g = 0 → DE blows up → flat.
  With the real cap, escaped samples grow to DISTINCT values across the count → a clean ΔRout
  gradient (verified on a fold-based Mandelbox, `debug/sim-numeric-de2.mts`)
  [VERIFIED de.ts:130-138,154-155; TypeDefinitions.pas:686; HeaderTrafos.pas:559].

- **`numericDistance(p, epsScale)`** — the estimate:

```glsl
// de.ts:190-202
float floorDE = numFootprint(p) * 0.25;           // MB3D msDEstop·0.25 (Calc.pas:515)
int   nC  = centerCount(p);
float R0  = iterateRadius(p, nC);
if (R0 < 1.0e-20) return floorDE;                  // MB3D d1em200 guard (Calc.pas:455)
float e   = numProbe(p, epsScale);
float dRx = iterateRadius(p + vec3(e,0,0), nC) - R0;
float dRy = iterateRadius(p + vec3(0,e,0), nC) - R0;
float dRz = iterateRadius(p + vec3(0,0,e), nC) - R0;
float g   = sqrt(dRx*dRx + dRy*dRy + dRz*dRz);
float de  = R0 * log(max(R0, 1.0001)) * uNumDEeps * e / (g + e * 0.06);
return max(de, floorDE);
```

### 5.2 `uNumDEeps` is a magnitude knob, not a probe

`uNumDEeps` (default 0.1, range 0.001–5.0, log scale, uniform `uNumDEeps`, hidden unless
`estimator == 7.0`) carries **MB3D's `dDEscale`** — the per-scene zoom magnitude calibration
[VERIFIED quality.ts:190-205]. Without it the DE is **~700× too large → ray escapes → flat**
(this was the bug behind the first flat numeric render) [VERIFIED de.ts:190-202 (formula site,
`uNumDEeps` factor at `:200`); rationale comment de.ts:38-43].

> **Amendment (formula differs from MB3D source).** GMT's implemented numerator includes an
> extra `e` factor that MB3D's original (`Result := bufRout * Ln(bufRout) * dDEscale / (Sqrt(Rst+wt+dt) + mctDEoffset006)`,
> Calc.pas:503) does **not** have. GMT added the probe `e` deliberately to make the magnitude
> **probe-invariant**: `g = |ΔRout| ∝ e` and the `e·0.06` term both scale with `e`, so `e`
> cancels. `e` supplies world units; the auto footprint probe never needs per-scene retuning,
> and `uNumDEeps` is left as a pure magnitude dial [AMENDED de.ts:190-202 (formula site, the `de`
> assignment with the extra `e` factor at `:200`) vs Calc.pas:503; probe-invariance is the
> documented rationale at de.ts:38-43].

`numProbe(p, epsScale) = max(min(numFootprint(p), 0.004) * epsScale, 1.0e-5)`, with
`numFootprint(p) = ortho ? uPixelSizeBase : uPixelSizeBase * length(p - uCameraPosition)`.
The probe is zoom-invariant and quality-param-free (no `uDetail`/`uPixelThreshold`);
`epsScale = 1.0` for `map()` silhouette, `2.5` for `mapDist()` shadows/AO (wider probe →
smoother low-frequency `Rout` gradient → softer shadows) [VERIFIED de.ts:58-76,240-246].

---

## 6. Normals (`engine-gmt/shaders/chunks/material_eval.ts`)

Three normal kernels, branched at compile time on `NUMERIC_DE`:

- **`GetNormal(p, eps)` — analytic tetrahedron (4 taps):**

```glsl
// material_eval.ts:8-27
#ifdef NUMERIC_DE
  return numericNormal(p_ray + uCameraPosition, eps);
#else
  vec2 k = vec2(1.0, -1.0);
  vec3 n = k.xyy*DE_Dist(p+k.xyy*eps) + k.yyx*DE_Dist(p+k.yyx*eps)
         + k.yxy*DE_Dist(p+k.yxy*eps) + k.xxx*DE_Dist(p+k.xxx*eps);
  return normalize(n);
#endif
```

- **`GetFastNormal(p, eps)` — analytic forward difference (4 taps):** `n = (d(p+εx)-d0, d(p+εy)-d0, d(p+εz)-d0)`
  where `d0 = DE_Dist(p)` is **load-bearing** (corrects the positive residual from an early
  ray stop) [VERIFIED material_eval.ts:29-52].
- **`numericNormal(p, eps)` — central difference over the fixed-count `Rout` field (6 taps):**
  probes at `e = max(eps*3.0, 1e-7)`, calls `centerCount(p)` once, then `iterateRadius` at ±e
  per axis; returns `normalize(Rxp-Rxm, Ryp-Rym, Rzp-Rzm)` (Rout increases outward on the
  escaping side) [VERIFIED de.ts:210-227].

**Adaptive eps:** `eps = max(floatLimit, visualLimit)` where
`floatLimit = distFromFractalOrigin * PRECISION_RATIO_HIGH` (float floor) and
`visualLimit = orthoPixelFootprint / uDetail` (`orthoPixelFootprint = ortho ? pixelSizeScale : pixelSizeScale * d`)
[VERIFIED material_eval.ts:63-72].

**Multipass strategy:** in path tracing, `GetNormal` is called once per bounce (NUMERIC_DE
uses one call for all bounces to avoid 8 `DE_Dist` inlines); in direct lighting,
`highQuality` compile-branches between `GetNormal(eps)` (primary) and `GetFastNormal(eps*1.5)`
(shadows/reflections). Bump mapping is gated on `highQuality` to skip 3 noise taps on
reflections [VERIFIED material_eval.ts:78-102,113-125].

---

## 7. Quality params + hard caps (`features/quality.ts`, `data/constants.ts`)

### 7.1 The march/DE quality surface

| Param | Uniform | Type | Default | Range | Group | Cadence |
|---|---|---|---|---|---|---|
| `maxSteps` | `uMaxSteps` | int | 300 | 32 … `DEFAULT_HARD_CAP` (2000) | kernel | runtime |
| `detail` | `uDetail` | float | 1.0 | 0.1 … 10.0 | kernel | runtime |
| `pixelThreshold` | `uPixelThreshold` | float | 0.5 | 0.1 … 2.0 | kernel | runtime |
| `fudgeFactor` | `uFudgeFactor` | float | 1.0 | 0.01 … 1.0 | kernel | runtime |
| `overstepTolerance` | `uOverstepTolerance` | float | 0.0 | 0.0 … 1000.0 (log) | kernel | runtime |
| `deBailout` | `uDeBailout` | float | 100.0 | 1 … 1000 (log) | metric | runtime |
| `estimator` | — | float enum | 0.0 | {0,1,2,3,4,5,6,7} | metric | **compile** |
| `numDEeps` | `uNumDEeps` | float | 0.1 | 0.001 … 5.0 (log) | kernel | runtime (estimator==7 only) |
| `refineEnabled` | — | boolean | false | — | refine | **compile** |
| `refineActive` | `uRefineActive` | boolean | false | — | refine (hidden) | runtime |
| `refineSteps` | `uRefineSteps` | float | 4.0 | 1.0 … 8.0 | refine | runtime |
| `compilerHardCap` | — | int | `DEFAULT_HARD_CAP` (2000) | 64 … 2000 | engine_settings (hidden) | **compile** |
| `precisionMode` | — | float enum | 0.0 | {0=High,1=Standard} | engine_settings (hidden) | **compile** |

[VERIFIED quality.ts:51-70,83-89,102-205,221-240]

Notes:
- `maxSteps` **max is the hard cap** (`DEFAULT_HARD_CAP`); its **default (300) is far below**
  the cap (2000). `maxSteps` is the live depth knob, `compilerHardCap` is the compiled safety
  ceiling [VERIFIED quality.ts:83-89,51-60].
- `fudgeFactor` < 0.2 recommended for deep zooms [VERIFIED quality.ts:158-164].
- `overstepTolerance` is the "Overstep Fix" / Candidate Recovery Threshold (0 = off)
  [VERIFIED quality.ts:184-189].
- `numDEeps` is hidden unless `estimator == 7.0` (`condition: { param:'estimator', eq:7.0 }`)
  [VERIFIED quality.ts:197-205].

### 7.2 The hard caps and WHY they exist

```ts
// constants.ts:21-31
export const DEFAULT_HARD_CAP = 2000;   // desktop — safety loop cap for ray/DE loops
export const MOBILE_HARD_CAP  = 256;    // reduced cap to prevent GPU hangs
export const REFINE_HARD_CAP  = 8;      // compile-time ceiling for the post-hit bisection
```

- `MAX_HARD_ITERATIONS` (= `compilerHardCap`, default `DEFAULT_HARD_CAP`) bounds the unrolled
  loop size in `trace.ts` (march) and `de.ts` (`centerCount`, `iterateRadius`, `map`,
  `mapDist`) [VERIFIED quality.ts:304-307].
- **Why the caps exist — GPU watchdog / TDR:** mobile's `MOBILE_HARD_CAP = 256` is explicitly
  "to prevent GPU hangs" [VERIFIED constants.ts:23-24]. `precisionMode` Standard "prevents GPU
  hangs on mobile" [VERIFIED quality.ts:61-70]. `compilerHardCap` is the "Safety limit for
  ray/DE loops" and its description records the key driver fact: **"Requires recompile but
  does not affect compile time — ANGLE/D3D does not unroll define-bounded loops."** So the cap
  is the loop's static upper bound (so the driver compiles a bounded loop instead of an
  unbounded one), while `uMaxSteps`/`uIterations` do the real per-frame termination
  [VERIFIED quality.ts:51-59].
- `REFINE_HARD_CAP = 8` bounds the unrolled post-hit bisection, mirroring `MAX_HARD_ITERATIONS`;
  the MB3D importer caps its `bStepsafterDEStop` mapping to this too [VERIFIED constants.ts:26-31].

---

## 8. core_math iteration schema (`features/core_math.ts`)

```ts
// core_math.ts:149
iterations: { type:'float', default:16, label:'Iterations', shortId:'it',
              uniform:'uIterations', min:1, max:500, step:1, group:'main' }
```

- `uIterations` — float uniform, default **16**, range **1–500**, runtime (no recompile).
  Consumed by every orbit loop as `if (i >= int(uIterations)) break;` in `centerCount()`,
  `map()`, and `mapDist()` [VERIFIED core_math.ts:149,14; de.ts:294-295,451-452].
- `MAX_HARD_ITERATIONS` is the **compile-time** unroll ceiling; `uIterations` is the
  **runtime** cap. The `i >= int(uIterations)` test runs inside the GPU loop, so iteration
  count is interactive without recompilation [VERIFIED core_math.ts:149; quality.ts:51-59].
- **Bailout / escape radius mapping to MB3D `RStop`:** `uDeBailout` (default 100, floored at
  1.0) is r²-space; it maps to MB3D's `RStop` field (@92, escape radius² where `Rout > RStop`
  stops the raymarch DE) [VERIFIED parseMB3D.ts:109-111; quality.ts:152-157]. MB3D's
  per-formula `dRstop` is **16 for generic formulas, 1024 for fold-based** (box/Menger/IFS,
  `f ∈ [4,5,6]`) [VERIFIED CustomFormulas.pas:327,331].
- `uEscapeThresh` (colouring, default 4.0) is the separate escape/colouring threshold used in
  smooth-iter and decomp; not the geometry bailout (see §4.2–4.3)
  [VERIFIED coloring/index.ts:165-175; de.ts:285-292].

---

## 9. Importer header→quality mapping (`engine-gmt/utils/mb3d`)

The importer maps MB3D header fields to GMT render params across
parse → `mapDEMeta`/`mapCamera` → `emitFusedHybrid`. This is the seam where divergences are
bridged or dropped.

### 9.1 Iterations

```ts
// emitFusedHybrid.ts:46-49
const clampIter = (n:number) => Math.min(DEFAULT_HARD_CAP, Math.max(1, Math.round(n || 16)));
```

User iterations are clamped to **[1, DEFAULT_HARD_CAP = 2000]** (was a 500 ceiling — that
truncated deep scenes) [VERIFIED emitFusedHybrid.ts:46-49; constants.ts:21-22]. For multi-slot
weaves the final count is floored to **`minCoverIters`** (index where the last unique slot
first appears + 1) so no trailing slot is dropped:
`iterations: Math.max(clampIter(h.iterations), minCoverIters)`
[VERIFIED emitFusedHybrid.ts:78-93,250].

### 9.2 Quality fields

- **`RStop → deBailout`:** MB3D header `RStop` is the **LINEAR** escape radius; GMT's
  `uDeBailout` is r²-space, so `deBailout = Math.min(1000, Math.max(16, RStop²))`. The MIN(16)
  floor guards degenerate `RStop < 4`. **dIFS scenes (estimator 6) are EXEMPT** — their
  distance is an orbit-trap running minimum, not an escape DE, so the bounded IFS orbit must
  run all iterations; `mapDEMeta` already forces their `deBailout = 1000`, and `RStop` never
  lowers it [VERIFIED emitFusedHybrid.ts:339-363; parseMB3D.ts:109-111].

```ts
// emitFusedHybrid.ts:363
if (h2.rStop > 0 && !isDifs) sceneQuality.deBailout = Math.min(1000, Math.max(16, h2.rStop * h2.rStop));
```

- **`DEstop → detail`:** `detail = Math.min(6, Math.max(1, 3.3 / Math.max(0.1, deStop)))`.
  `uDetail ∝ 1/DEstop`; the **3.3 numerator is a reference-CALIBRATED fit** (MB3D's hit
  threshold is world-absolute, GMT's is screen-relative — different spaces, no closed form),
  **not source-derived**. Re-anchoring to `1.0/DEstop` (S1 item 1e) was DECLINED: a detail
  sweep ∈ {4.1, 8, 10} left Theli's missing background half-spheres unchanged (they are
  grazing high-variance far surfaces that resolve with accumulation samples, not a finer hit
  ε) [INFER emitFusedHybrid.ts:364-372 — runtime formula verified in code; the 3.3 constant's
  origin is settled only by the reference-scene calibration sweep, not by a Pascal derivation].

- **`ZstepDiv → fudgeFactor`:** 1:1 mapping, clamped **[0.4, 1.0]**:
  `fudgeFactor = Math.min(1.0, Math.max(0.4, authoredFudge))`, where
  `authoredFudge = zStepDiv>0 ? zStepDiv : formula-default`. MB3D's **live** march advances
  `dTmp := MaxCS(s011, (dTmp − msDEsub·msDEstop) · sZstepDiv · RSFmul)` (`CalcThread.pas:200`) ≈
  GMT's `d += max(h.x, floatPrecision*0.5) · uFudgeFactor · stepJitter` (trace.ts:213). The
  mapping carries the `sZstepDiv` damper (→ `uFudgeFactor`) and the `s011` (= 0.11) forward-progress
  floor (≈ GMT's `max(h.x, floatPrecision*0.5)` floor). Two live terms the importer does **not**
  yet reproduce: the per-step safety-subtraction `msDEsub·msDEstop` and the `sZstepDiv` quadratic
  remap, both gated by `iOptions` bit 2 (`HeaderTrafos.pas:961-964`; `msDEsub = 0` when the bit is
  clear). RSFmul is MB3D's runtime step-relaxation multiplier (`CalcThread.pas:223-230`), with no
  GMT analog. (The old anchor `Calc.pas:1878` was the dead `RayMarch` step `dTmp * sZstepDiv * RSFmul`,
  which lacks both the safety term and the `s011` floor — see render-pipeline-CORRECTIONS.md §2.) The
  **floor was raised 0.3 → 0.4 (2026-06-28, round-2 A1)**: at the old 0.3 floor + the 2000
  `maxSteps` cap, the densest IFS/Menger scenes (Theli, TimeMachine) took steps too tiny to
  cross the whole volume in budget → the back of the model was cut off. A coarser 0.4 step
  crosses it, and overstep recovery snaps back onto any thin detail the bigger step tunnels
  through [VERIFIED emitFusedHybrid.ts:373-386; parseMB3D.ts:116-118].

- **`maxSteps`:** base budget **1500** for imported scenes (the cloned scaffold's 300 left
  deep IFS/Menger cut off). For scenes with authored quality (`rStop>0 || deStop>0`), it
  scales inversely with fudge but never below 1500:
  `maxSteps = Math.min(2000, Math.max(1500, Math.round(750 / fudgeFactor)))`. Fudge ≥ 0.5 →
  1500 (byte-identical to the base); fudge < 0.5 → deeper, purely additive
  [VERIFIED emitFusedHybrid.ts:328-334,393-398].

- **`overstepTolerance = 2.0`** — **hardcoded** for every MB3D scene with authored quality
  (`rStop>0 || deStop>0`); 0 (off) for standalone/non-imported. It is GMT's analog of MB3D's
  `bStepsafterDEStop` binary-search recovery; ~2.0 chosen per the round-2 spec (sweep-confirmed),
  recovers thin detail the coarser 0.4 fudge step skips
  [VERIFIED emitFusedHybrid.ts:387-393; quality.ts:184-189].

### 9.3 Estimator selection

- **Decompiled `[CODE]` formulas** route via `DECOMPILED_DE_META[name].deOption` through
  `mapDEMeta`, **bitmask-faithful to `doHybridPasDE`** (formulas.pas:3729-3736):
  - `deOption == 20` (dIFS) → **estimator 6**, `fudgeFactor 0.7`, `deBailout 1000`.
  - `(deOption & 0x38) == 32` (Log) → **estimator 0**.
  - `(deOption & 7) == 4` (Julia) → **estimator 0**.
  - else (box folds, IFS, transforms — opt 0/2/6/11/21/-1) → **estimator 2** (`r/dr`).

```ts
// constPacker.ts:155-179 (mapDEMeta)
if (opt === 20) return { estimator:6.0, fudgeFactor:0.7, deBailout:1000, distanceMetric:1.0 };
const log   = (opt & 0x38) === 32;
const julia = (opt & 7) === 4;
return { estimator: (log||julia) ? 0.0 : 2.0,
         fudgeFactor: Math.min(1.0, Math.max(0.01, de.deScale || 1)),
         deBailout:   Math.min(1000, Math.max(1, (de.rStop||100)**2)),
         distanceMetric: 1.0 };
```

  The DE slot is chosen preferring the **dIFS owner** (`deOption 20`) over a transform that
  merely carries `deOption ≥ 0` (e.g. PolyFold-symIFS = 21) — picking the transform would
  misroute to estimator 2 and render black on a bounded IFS orbit (Wada basin)
  [VERIFIED constPacker.ts:140-179; emitFusedHybrid.ts:161-175].

- **Intern #4 (Amazing Box)** is **hardcoded estimator 1, fudge 0.45** on a separate
  empirically-calibrated path (NOT via `mapDEMeta`), matching native GMT's AmazingBox
  (est 0 rendered it black). The decompiled path routes box folds to estimator 2 (source-correct),
  but est 1 `(r-1)/dr` and est 2 `r/dr` are **visually identical on box geometry** (verified
  S1 item 1b), so the divergence is immaterial [VERIFIED emitFusedHybrid.ts:301-315].

- **dIFS (deOption 20) → estimator 6.** The dIFS slot writes per-iteration `mb3dRout` and
  accumulates `mb3dVary` as scratch; `emitFusedHybrid` declares a file-scope `g_difsDE`
  (preamble), resets it to `65535.0` per `map()`/`mapDist()` (loopInit), and folds the active
  slot's `mb3dRout/mb3dVary` into the running minimum **only right after a dIFS-owner slot ran**
  (a mixed weave with a non-dIFS transform that never writes `mb3dRout` would otherwise fold a
  stale 0.0 → `g_difsDE` collapses to 0 → DE ≈ 0 → black). Mirrors MB3D `doHybridIFS3D`
  (min over orbit of `Rout/VaryScale`); orbit never escapes, so `deBailout` forced to 1000
  [VERIFIED emitFusedHybrid.ts:173-175,186-193,411-419; constPacker.ts:157-163].

### 9.4 Camera, FOV, Julia/4D seeds, lighting

- **Camera pose** is reverse-engineered from `hVGrads` (3×3 navigation matrix, **ROW-MAJOR**
  @246, 9 doubles — NOT the `dXWrot/dYWrot/dZWrot` 4D-rotation fields, which are 0 for almost
  every scene). Rows 0/1/2 are screen-X / screen-Y / depth gradients; `right = +row0`,
  `up = −row1` (Y inverted), `view = +row2`. A THREE.js `Matrix4.makeBasis(right, up, −view) →
  Quaternion` gives the rotation. `stepWidth = 2.1345 / (zoom*width)`; the FOV-dependent
  view-plane pushback `VPoff = stepWidth*height*0.5*cos(fovHalf)/sin(fovHalf)`;
  `eye = mid + view·(dZstart − midZ − VPoff)`. When `bNewOptions & 1` (and `mandId > 43`) the
  first 4 doubles are a quaternion instead [VERIFIED mapCamera.ts:1-32,56-58,80-122;
  parseMB3D.ts:95-101].
- **FOV:** `camFov = (isFinite(fovY) && fovY >= 10) ? min(150, fovY) : 60`
  [VERIFIED mapCamera.ts:56-58; parseMB3D.ts:78-80].
- **Julia seeds:** `juliaMode = isJulia`; `{juliaX,juliaY,juliaZ} = {jx,jy,jz}` only when
  `isJulia` [VERIFIED emitFusedHybrid.ts:252-256].
- **4D seeds:** Quaternion (#2, `has4D`) → `paramA = isJulia ? jw : 0` (c.w), `paramB = 0`
  (z.w start). 4D-coordinate dIFS/KIFS (`deOption 5/6`, `has4DCoord && !has4D`) →
  `paramB = isJulia ? jw : 0` (z.w slice) [VERIFIED emitFusedHybrid.ts:258-280].
- **Lighting:** `mapMB3DLighting` decodes the 6 physical light slots; active lights
  (`Loption & 1 == 0`) populate `lighting.lights`; if none, the `lighting` feature is omitted
  so the preset inherits `DEFAULT_LIGHTS` [VERIFIED emitFusedHybrid.ts:216-235; parseMB3D.ts:43-65].

### 9.5 What is DROPPED (intentional)

- **`bStepsafterDEStop` binary-search wiring is NOT auto-mapped to `refineSteps`.** Surface
  refinement (ADR-0084) stays a native opt-in (default off). A 2026-06-27 canary showed it
  does NOT resolve the DsyneGrafix-class "dust": an exhaustive fine march (fudge 0.05 / 5000
  steps) is STILL fragmented → the dust is a DE-fidelity gap, not an overshoot a single-step
  refinement can fix. Auto-enabling would add ~0.5–2s compile per import for no benefit
  [VERIFIED emitFusedHybrid.ts:399-407].
- **Numeric estimator (7) auto-routing is NOT applied.** MB3D collapses a hybrid's DE to
  numeric the moment any active slot lacks an analytic DE; GMT does not, because the static
  signal over-routes badly (10/20 sample scenes carry such a slot but most still render
  cleanly analytically; numeric only ADDS speckle + ~4× cost, some scenes 30s+). The one
  genuine orbit-collapse case (DsyneGrafix's IdesFormula, Y/Z mul = 0) isn't statically
  detectable. Numeric is a **user opt-in** in the Quality panel [VERIFIED emitFusedHybrid.ts:317-327].
- **`ZstepDiv` scaling past the 0.4 floor is dropped** — a coarser step is required to cross
  the dense IFS volume in budget; tiny authored values (Ellarien/Theli 0.05–0.1) would blow
  the step budget [VERIFIED emitFusedHybrid.ts:373-386].
- **`msDEstop` per-scene numerical-DE calibration logic is NOT mapped** (numeric DE uses the
  auto footprint probe + the `uNumDEeps` knob instead) [VERIFIED emitFusedHybrid.ts:317-327].

### 9.6 Weave & const-buffer machinery (context for the above)

- **Const buffer** for decompiled `[CODE]` bodies (which reference `Cm<offset>`) is packed by
  `packConstBuffer` (port of `FillCustomVBufWithVars` + `BuildRotMatrix`), applying
  type-specific transforms (DOUBLE/SINGLE/INTEGER, ANGLE→sin/cos·π/180, 3SINGLEANGLES→3×3
  matrix, etc.) starting at offset 8 after the fixed prelude 0.5 [VERIFIED constPacker.ts:1-13,88-138].
- **Weave order** is precomputed by `buildWeaveSequence` (port of `doHybridPas`), walking the
  stateful cursor (per-slot `iterCount`, `endTo`/`repeatFrom` nibbles) until the
  `(slot, countdown)` state repeats, then baking the trajectory as a GLSL int lookup. Silent
  steps (negative `iterCount`) are stored as `~slotIndex` and never advance the escape
  criterion [VERIFIED weaveSequencer.ts:1-31,35-99].
- **Only weave mode 0 (ALTERNATE) is supported.** Modes 1 (interpolate), 2 (DEcombine/CSG),
  3 (KIFS) change DE/blend semantics, not just order, and are flagged unsupported
  [VERIFIED weaveSequencer.ts:10-14; emitFusedHybrid.ts:72-74].
- **Single-slot fallback:** an untranspilable single `[CODE]` slot falls back to a same-named
  GMT formula (matched by `gmtSubId` regex) at its defaults, loudly flagged `tier:'code-sub'`
  with a note that this is NOT MB3D's math [VERIFIED emitFusedHybrid.ts:54-64,124-147].

---

## 10. Falsified hypotheses

These plausible claims were checked against source and **refuted**. Recording them prevents
re-derivation of the same wrong models.

1. **"MB3D's marcher uses Secant search (`RMdoSecantSearch`) for step relaxation post-hit;
   GMT replaces it with damped bisection."** — **REFUTED.** MB3D's **live** marcher
   (`TMandCalcThread.Execute`) calls **`RMdoBinSearch`** (binary search), not `RMdoSecantSearch`,
   in the post-hit "set found" branch: `if iDEAddSteps <> 0 then ... if DElimited then
   RMdoBinSearch(...) else RMdoBinSearchIt(...)` [VERIFIED CalcThread.pas:235-238]. A
   tree-wide grep confirms **`RMdoSecantSearch` has zero live call sites** — it is *defined*
   (`Calc.pas:1609`) and appears only once more, commented out, as a `//test` line
   (`CalcThread.pas:920`). Additionally, "step relaxation" is the `RSFmul` multiplier
   (re-derived per step at `CalcThread.pas:223-230`), a separate mechanism from post-hit
   refinement. GMT's refinement correctly mirrors MB3D's **binary search** (`RMdoBinSearch`).
   *Counter-evidence:* live dispatch `RMdoBinSearch(MCTparas, dTmp, RLastStepWidth)`
   [CalcThread.pas:237]; `procedure RMdoSecantSearch(...)` defined but uncalled [Calc.pas:1609].
   (The trace.ts source comment cites `RMdoBinSearch` at its *definition* site `Calc.pas:1641` —
   accurate as the procedure's home, though the live *call* is `CalcThread.pas:237`. The old
   citations `Calc.pas:1926/1909-1917` were the dead `RayMarch` body — see
   render-pipeline-CORRECTIONS.md §"What HOLDS". Net effect on the spec: the §3.2 attribution to
   `RMdoBinSearch` stands; do not describe GMT refinement as "replacing a secant search.")

2. **"MB3D's `CalcDEnoADE` numeric-DE formula matches GMT's `numericDistance` exactly."** —
   **REFUTED / AMENDED (kept in §5.2 as an amendment).** MB3D's original lacks the `e`
   multiplier in the numerator (`bufRout*Ln(bufRout)*dDEscale / (Sqrt(Rst+wt+dt)+mctDEoffset006)`,
   Calc.pas:503). GMT *intentionally added* `e` to make the DE probe-invariant. The two are
   numerically different formulas with the same provenance — treat GMT's as the adapted,
   probe-invariant port, not a byte-port. *Counter-evidence:* Calc.pas:503 vs de.ts:200.

3. **"The 3.3 `DEstop → detail` numerator is derived from MB3D's `Calc.pas` hit-offset
   formula."** — **REFUTED (downgraded to INFER in §9.2).** The constant is explicitly a
   reference-CALIBRATED fit because MB3D's hit threshold is world-absolute and GMT's is
   screen-relative — different spaces, no closed form. The runtime formula
   `min(6, max(1, 3.3/max(0.1, deStop)))` is verified in code, but the `3.3` itself is settled
   only by the reference-scene calibration sweep, not by a Pascal derivation. The proposed
   re-anchor to `1.0/DEstop` (S1 item 1e) was DECLINED after a detail sweep falsified the
   hypothesis that Theli's missing far half-spheres were a detail problem (they resolve with
   accumulation, not a finer ε). *Counter-evidence:* emitFusedHybrid.ts:364-372 (the comment
   states "ref-CALIBRATED fit … not source-derived").

---

### Cross-references
- ADR-0076 (map/mapDist split, candidate-H reuse), ADR-0084 (compile-gated refinement),
  ADR-0085 (numeric DE), ADR-0083 (MB3D importer).
- `plans/mb3d/converter-design.md`, `plans/mb3d/camera-import-spec.md`,
  `plans/mb3d/research/dsyne-de-fidelity-findings.md`.
