# Binary-Search Surface Refinement for Discontinuous MB3D Hybrid DEs — Implementation Spec

> **⚠ SUPERSEDED AS THE DUST FIX 2026-06-27.** This spec assumes post-hit surface refinement
> resolves the DsyneGrafix-class "dust". **It does not** — an exhaustive fine march is still
> fragmented, so the dust is a DE-fidelity gap, not an overshoot a ray-refinement can recover
> (`dsyne-de-fidelity-findings.md`). Refinement still shipped as a useful native, opt-in control
> (ADR-0084), but the **actual** dust fix is the numerical finite-difference DE estimator
> (**ADR-0085**). Build this spec only for the refinement control itself, NOT as the dust remedy,
> and do NOT wire the importer auto-route it describes.

> **GATING REVISED 2026-06-27 (user decision):** §3.4 below proposes an importer-set
> `enableRefine` COMPILE flag. **Do NOT do that** — make refinement a NATIVE, default-off
> `refineSteps` QUALITY uniform (`uRefineSteps`, default 0) usable by ANY formula; the loop is
> runtime-gated so output is pixel-identical when off (no compile flag needed), and the MB3D
> importer just sets `quality.refineSteps` from `bStepsafterDEStop` like it sets detail/fudge/
> deBailout. The algorithm (§2, §3.1-3.3), the map/mapDist invariant (§5), and the file index
> (§8) are unchanged. See [`binary-search-de-SESSION.md`](./binary-search-de-SESSION.md).

**Status:** Draft / ready-for-implementation
**Branch context:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable`
**Author:** synthesizer (binary-search-DE front)
**Cites:** Investigation A (MB3D `Calc.pas` refinement), Investigation B (GMT `trace.ts` march), both grounded against source.
**Related ADRs:** 0076 (map-inline cost model), 0077 (Edge-Polish removal + "no inert controls"), 0083 (MB3D importer).

---

## 1. Problem statement — why DsyneGrafix-class hybrids render as dust

GMT's primary march is classic sphere tracing (`engine-gmt/shaders/chunks/trace.ts:82-168`):
each step advances `d += max(h.x, eps*0.5) * uFudgeFactor * stepJitter` (`trace.ts:165`) and
declares a hit the instant `h.x < finalEps` (`trace.ts:116`), accepting the **overshoot position
as-is**. There is no surface refinement: the forward-only "Edge Polish" loop that once sat at the
hit site was removed 2026-06-19 (ADR-0077) because forward-stepping can only push deeper past a
zero-crossing, never settle back onto it.

Sphere tracing is correct **only when the DE is a true (Lipschitz-1) lower bound** on distance to
the surface. The fused-hybrid DE that the MB3D importer weaves (`emitFusedHybrid.ts`) is, for the
DsyneGrafix family and similar discontinuous hybrids, **not** Lipschitz-1:

- The analytic estimator is `Result := bufRout * Ln(bufRout) * dDEscale / (Sqrt(Rst+wt+dt) + offset)`
  (MB3D `Calc.pas:503`). When one weave slot has an *explosive* escape boundary — `Rout` leaps from
  ~`RStop` to astronomically large across an infinitesimal spatial step — both `bufRout·ln(bufRout)`
  and the finite-difference gradient spike **discontinuously**.
- The DE therefore **over-estimates** (the ray sphere-traces straight past the true surface) and is
  **spatially discontinuous** (adjacent pixels get wildly different DE).

With no refinement, GMT accepts whichever overshot sample first dipped below `finalEps`. For a
discontinuous DE that is a cloud of disconnected accepted points scattered around the true surface:
**dust**, not a coherent front face. This is exactly the failure mode reported for DsyneGrafix
imports.

MB3D does not have this problem because **it never trusts the coarse DE to land on the surface.**
The coarse march only *brackets* the surface (gets one sample inside the hit threshold); a separate
after-DE-stop **binary search** (`RMdoBinSearch`, `Calc.pas:1641`) then walks the ray back and forth
across the iso-surface `DE = msDEstop`, halving the interval for `bStepsafterDEStop` extra `CalcDE`
evaluations, converging the *ray parameter* onto the actual crossing. That refinement is what turns
an overshooting/discontinuous fused DE into a clean surface. GMT lacks it; the importer even reads
the controlling header byte (`stepsAfterDEStop`, `parseMB3D.ts:242`) but drops it on the floor
(`emitFusedHybrid.ts` / `loadMB3DScene` only map `DEstop→uDetail`, `RStop→deBailout`).

**Goal:** port MB3D's `RMdoBinSearch` shape into GMT's kernel as a damped-bisection post-hit
refinement, gated so it (a) only compiles for MB3D/discontinuous-DE builds and (b) is byte-identical
to today on the 19 working/certified scenes when off.

---

## 2. MB3D's algorithm, distilled to pseudocode

From `Calc.pas:RMdoBinSearch` (asm body 1699-1805; readable algorithm in the comment at 1672-1697).
The coarse march stops at the **first sample inside** the threshold (`DE < msDEstop`), having moved
the ray by `RLastStepWidth` from a sample that was **outside**. Refinement then:

```
// state at entry: ray is just INSIDE (DE < msDEstop); previous sample was OUTSIDE.
itmp := bStepsafterDEStop          // refinement budget (header byte @134)
dT1  := RLastStepWidth * -0.5      // FIRST MOVE: step BACK half the last march step

repeat
  mZZ := mZZ + dT1                 // move ray parameter by dT1
  C1  := C1 + marchVec * dT1       // move ray position
  msDEstop := DEstop * (1 + mZZ * mctDEstopFactor)   // depth-varying hit threshold
  dec(itmp); if itmp <= 0 then break                 // hard budget cap
  dTmp := CalcDE(...)              // RE-SAMPLE the DE at the new position
  if dTmp < msDEstop then          // INSIDE  → reverse, shrink ×0.55  (step back)
    dT1 := abs(dT1) * -0.55
  else                            // OUTSIDE → keep forward, shrink ×0.55 (step fwd)
    dT1 := abs(dT1) *  0.55
until abs(dTmp - msDEstop) <= 0.001 // converge to DE == threshold (tol s0001)
// final C1 / mZZ is the refined surface point → used for normal, colour, Z-buffer.
```

Key properties:
- **Steps back first**, guaranteeing the surface is bracketed (prev sample outside, this one inside).
- **±0.55 damping** (not ½): slightly over half so an alternating-sign overshoot converges instead
  of collapsing prematurely. A damped secant/false-position hybrid on `DE(t) − msDEstop = 0`.
- **Re-evaluates the real field** each iteration — over-estimation in the coarse DE is irrelevant;
  the root-find lands on the actual near face of the iso-surface.
- **Bounded budget** = `bStepsafterDEStop` `CalcDE` evals (preview default 4, or 7 for dIFS —
  `Navigator.pas:777`; dIFS raises it via `HeaderTrafos.pas:898`).

The iteration-limited twin `RMdoBinSearchIt` (`Calc.pas:1041`) refines onto the smooth-iteration
contour instead of the DE; **out of scope for v1** (GMT's dIFS estimator already produces a usable
trap-min DE, and the DE-limited refiner is the one that fixes dust — see §5).

---

## 3. The exact GLSL change in GMT

### 3.1 Where — `engine-gmt/shaders/chunks/trace.ts`, inside `if (h.x < finalEps)` (line 116)

This is the only correct seam: at that point `d` (just past the surface), `ro`, `rd`, `h` (full
`map()` at the overshoot), and the epsilon machinery are all live, and the refinement must run
**before** the volumetric-resolve block (`trace.ts:127-130`) and `result = h` (`trace.ts:136`). It
slots exactly where the removed Edge-Polish comment sits (`trace.ts:123-125`).

### 3.2 The one missing piece of march state — remember the previous (outside) `d`

The march doesn't currently keep the prior sample's `d`. Add one cheap float, set at the **bottom**
of the loop right before the advance so it always holds the position of the last *outside* sample:

```glsl
// just before  d += ...  at trace.ts:165
float dPrev = d;          // <-- NEW: last outside sample (this step did NOT hit)
d += max(h.x, floatPrecision * 0.5) * currentFudge * stepJitter;
```

On the iteration that hits, `dPrev` is the previous (outside) `d` and `d` is the inside `d` — a
valid bracket `[dPrev, d]`.

### 3.3 The bisection loop (emitted only when refinement is compiled in)

Insert at `trace.ts:116`, immediately inside `if (h.x < finalEps) {`, gated by a **TS-level compile
flag** `enableRefine` so non-MB3D builds carry zero bytes (see §3.4). Pseudocode-shaped GLSL:

```glsl
if (h.x < finalEps) {

    // --- MB3D-style damped-bisection surface refinement (compile-gated) ---
    // Coarse march only BRACKETS: dPrev was outside, d is inside. Converge the
    // ray parameter onto the DE==eps crossing so a discontinuous/over-estimating
    // fused DE lands on a coherent surface instead of dust. @see RMdoBinSearch.
    if (uRefineSteps > 0) {
        float dOut = dPrev;            // outside  (h.x >= eps was true here)
        float dIn  = d;                // inside   (h.x <  finalEps)
        for (int j = 0; j < REFINE_HARD_CAP; j++) {
            if (j >= int(uRefineSteps)) break;
            float dMid = 0.5 * (dOut + dIn);
            // geometry-only twin — distance is all the root-find needs; keeps the
            // inline cheap (mapDist, not map) per ADR-0076 cost model.
            float hMid = mapDist((ro + rd * dMid) + uCameraPosition);
            if (hMid < finalEps) dIn = dMid; else dOut = dMid;
        }
        d = dIn;                       // refined surface (near face, like MB3D)
        // h.yzw (trap/iter/decomp colour) kept from the overshoot map() — the
        // nudge is sub-pixel so colour is visually identical (ADR-0076 §1).
    }

    ${hitFinalizeCall}
    // ... existing volumetric resolve + result = h + return true ...
}
```

Notes / deltas from MB3D, with rationale:
- **Plain mid-point bisection, not ±0.55 secant.** GMT already has a *clean* bracket `[dPrev, d]`
  from the coarse march (MB3D's `±0.55` damping exists because it re-uses the *last step width* as
  the initial interval and must self-correct the sign). With an explicit bracket, straight bisection
  converges monotonically and is simpler/cheaper. (A secant variant is a possible v2 refinement if
  bench shows slow convergence; bisection halves the bracket every iter, so 6-8 steps ≈ 1/64–1/256
  of a march step — sub-`finalEps` for any sane march.)
- **Constant `finalEps` in the loop, not re-derived per mid-point.** The threshold is `d`-dependent
  for perspective (`trace.ts:109-113`), but across a sub-pixel bracket the variation is negligible;
  reusing the hit-point `finalEps` avoids recomputing `pixelFootprint`/`floatPrecision` per iter.
- **`mapDist` for mid-points, keep `h.yzw` from the overshoot `map()`.** Matches the ADR-0076
  decision the old refine loop already validated ("refinement nudge is sub-pixel so the colouring
  difference is negligible"). Do **not** call full `map()` in the loop (~2s cold per inline,
  ADR-0076).
- **`REFINE_HARD_CAP`** is a compile-time `#define` (e.g. `8`) so the loop unrolls predictably,
  mirroring how `uMaxSteps` is bounded by `MAX_HARD_ITERATIONS`. `uRefineSteps` is the runtime budget
  within that cap.

### 3.4 The gate — compile-out for non-MB3D builds, default-off uniform

Two-layer gate (both required — ADR-0077's lesson is "never ship an inert always-compiled control"):

1. **Compile gate (primary).** Thread a new boolean param `enableRefine` into `getTraceGLSL`,
   exactly like `enableGlow`/`precisionMode` are threaded today
   (`getTraceGLSL(isMobile, enableGlow, precisionMode, glowQuality, volumeBody, volumeFinalize,
   functionName)`, `trace.ts:4-12`; called at `ShaderBuilder.ts:585`). When `false`, emit **no**
   refinement GLSL at all (empty string), so the working scenes' shader is byte-identical to today
   and the loop fully DCEs. `ShaderBuilder` sets the flag from the active formula/scene
   (`this.<flag>` analogous to `this.isLite`, `this.precisionMode`). The MB3D importer marks
   imported fused-hybrid definitions as refinement-eligible (a `FractalDefinition.shader` flag, sibling
   to `supportsDifs` at `engine-gmt/types/fractal.ts:105`), so the builder enables the compile gate
   only for MB3D scenes.
2. **Runtime gate (secondary, in-shader).** `uRefineSteps` (new quality uniform, default `0`). Even
   in an MB3D build the loop is skipped at `uRefineSteps == 0` and DCEs to nothing. The importer
   threads the per-scene value (§4); the user can dial it in the quality panel.

This keeps the contract: the 19 certified/working scenes never compile the refinement (compile gate
false) → no compile-time cost, no runtime cost, byte-identical shader. Only MB3D-imported scenes pay
for it, and only when `uRefineSteps > 0`.

---

## 4. Threading `bStepsafterDEStop` / `sDEstop` from the importer

`parseMB3D.ts:242` already extracts `stepsAfterDEStop: dv.getUint8(134)` and `deStop: dv.getFloat32(177)`
into the parsed header. The wiring to add (in `emitFusedHybrid.ts` / `loadMB3DScene.ts`, alongside
the existing `deStop→detail`, `rStop→deBailout` mapping at `emitFusedHybrid.ts:265-289`):

- **`uRefineSteps` ← `stepsAfterDEStop`.** Map the header byte to the new quality param, clamped to
  `REFINE_HARD_CAP`:
  ```ts
  // in the scene-quality override block (emitFusedHybrid.ts ~265-289)
  const refine = scene.header.stepsAfterDEStop;            // already parsed @134
  sceneQuality.refineSteps = Math.min(8, refine > 0 ? Math.max(4, refine) : 0);
  ```
  Floor at 4 when the artist enabled it at all (MB3D's preview default is 4; many scenes save a
  small non-zero), `0` when the artist left it off (respect the authored choice — those scenes don't
  need it). Cap at `REFINE_HARD_CAP` (8).
- **`enableRefine` compile flag ← "is this an MB3D fused-hybrid import".** Set the
  `FractalDefinition.shader` refinement-eligible flag on every fused-hybrid def the importer emits
  (next to `supportsDifs`). `ShaderBuilder` reads it to drive `getTraceGLSL(..., enableRefine)`.
  Non-imported native formulas never get the flag → never compile the loop.
- **`sDEstop` already maps to `uDetail`** (`emitFusedHybrid.ts:283`), which *is* the per-pixel hit
  threshold the bisection converges to (`finalEps` derives from `uDetail`, `trace.ts:108-113`). So
  `sDEstop` needs no new wiring — it already sets the iso-value the refinement lands on. The
  refinement makes the existing `sDEstop→uDetail` mapping *actually reachable* on a discontinuous DE
  (today the coarse overshoot ignores it).

No change to `parseMB3D.ts` (read-only this front; it already parses both bytes). The new param
`refineSteps` is added to the `quality` feature (§6 of the change list below).

---

## 5. The map()/mapDist() mirroring requirement

The refinement uses `mapDist()` for mid-point evaluations while the hit was found by `map()`. This is
**safe only because the twins compute the same distance** for the same point — the standing invariant
in `de.ts` (`map()` `de.ts:26-198`, `mapDist()` `de.ts:203-267`; the two share `loopInit`,
`hybridPreLoop`, `formulaBody`, `getDist`). Concrete requirements for MB3D imports:

1. **Twin distance agreement.** For any MB3D fused-hybrid def, `mapDist(p).x` must equal `map(p).x`
   (the silhouette). If they diverge (e.g. a colour-only side effect that perturbs `z`), refinement
   would settle on a slightly different surface than the silhouette → a hairline mismatch between the
   refined hit and the normal/shadow surface. **Verify twin agreement on each MB3D formula before
   enabling refine.** `emitFusedHybrid.ts` emits both twins from the same `loopBody`/`getDist`
   strings, so they agree by construction today — the test plan (§6) adds a guard.
2. **dIFS accumulator is per-call clean (VERIFIED).** The dIFS estimator (estimator 6) returns
   `g_difsDE` (`core_math.ts:45`). `g_difsDE` is a file-scope global declared in the fused preamble
   (`emitFusedHybrid.ts:298`) and **reset to `65535.0` in the per-call loop-init**
   (`emitFusedHybrid.ts:299`, `difsInit`), with the running-min accumulated in-loop
   (`emitFusedHybrid.ts:300`). `mapDist`'s loop-init runs the same `loopInit` → a mid-point
   `mapDist()` re-seeds and re-accumulates `g_difsDE` correctly. **No stale state.** (This resolves
   the open concern flagged in Investigation B §5.)
3. **No mirroring needed for the other DE builders.** The Physics-probe stub
   (`ShaderBuilder.ts:450-489`, "no refinement") is a depth probe — must NOT get refinement (it would
   change the physics distance read). Mesh-export has its own Newton projection
   (`SDFShaderBuilder.ts:446-529`) that already settles vertices onto the iso-surface — a separate,
   parallel refiner targeting mesh vertices, not screen hits. There is no requirement that the
   rendered silhouette be bit-identical to the exported mesh (none found in ADR-0083), so the two
   refiners stay independent.

---

## 6. Minimal test plan

**Canary (must improve): DsyneGrafix.** Import the DsyneGrafix-class scene from the MB3D corpus
(`H:/GMT/refSoftware/MB3D/mb3d-1.99src/M3Parameter/*.m3p` — pick the DsyneGrafix author's scene),
render with `uRefineSteps` from its header (≥4). Acceptance: the dust resolves into a coherent
surface (visual diff vs the MB3D reference render; the importer already produces side-by-side refs
under `debug/`). Compare `uRefineSteps = 0` (dust) vs `> 0` (surface) on the *same* import to isolate
the effect.

**No-regression on certified scenes (must be byte-identical).** The ~15-21 certified scenes (per the
MB3D session memory) are native or non-discontinuous; with the **compile gate off** they get the same
shader source as today. Verify in two layers:
1. **Shader-source identity:** for a certified non-MB3D scene, assert `getTraceGLSL(..., enableRefine=false)`
   output is character-identical to the current output (snapshot test, or diff the emitted GLSL).
   This is the strongest no-regression guarantee — same source, same pixels.
2. **Runtime A/B:** render 2-3 certified scenes (e.g. Theli, Hyperben, a dIFS scene like AureliusCat)
   before/after the change with refine off; pixel-diff must be zero.

**Refinement correctness (MB3D builds, refine on):**
- **Twin-agreement guard:** for each MB3D fused def, assert `mapDist(p) ≈ map(p).x` at sampled points
  near the surface (within `finalEps`), so the mid-point estimator matches the silhouette.
- **Convergence sanity:** with `uRefineSteps` swept 0→8, the refined `d` should monotonically
  approach the iso-surface (hit `h.x` after refinement ≤ hit `h.x` before); no oscillation.
- **dIFS no-regression:** render an existing dIFS MB3D scene with refine on; confirm `g_difsDE`
  re-accumulation in `mapDist` mid-points doesn't shift the surface (it shouldn't — same accumulator
  contract).

**Perf budget:** bench cold-compile delta with the compile gate **on** (MB3D build) — the loop carries
one `mapDist` inline; budget against ADR-0077's measured ~1.2-1.7s (that figure was *with* a map/mapDist
inline, so expect ≤ that, likely less since this is one `mapDist`, not the old loop's heavier body).
Runtime cost is `uRefineSteps` `mapDist` calls **per hit pixel only** — far cheaper than globally
raising `uMaxSteps` or lowering `uFudgeFactor`. Confirm the compile gate **off** path is compile- and
runtime-neutral (no `#define`, no uniform read in the hot loop).

Existing gates to keep green: `npm run typecheck`, `npm run test:mb3d`, the corpus cross-check, the
triage/scan render passes (per session memory the corpus is 278/0-mismatch, 180 GOOD).

---

## 7. Effort estimate & open risks

**Effort: M (medium).** The kernel change is small and localized (one bracketed loop at `trace.ts:116`
+ one `dPrev` line + one threaded compile flag through `getTraceGLSL`/`ShaderBuilder`). The bulk is
(a) the new `refineSteps` quality param + uniform plumbing, (b) the importer wiring + the
`FractalDefinition.shader` eligibility flag, and (c) the test surface (shader-source snapshot guard +
the DsyneGrafix canary + twin-agreement guard). No new subsystems; reuses the exact threading pattern
of `enableGlow`/`precisionMode`. Roughly a focused session.

**Open risks:**
1. **Bracket validity under jitter.** `stepJitter` (`trace.ts:164`) makes the coarse step stochastic,
   so `dPrev` is a *jittered* outside sample — still a valid bracket (it was outside), but the bracket
   width varies per frame. Bisection converges regardless; verify no temporal shimmer in the refined
   surface during accumulation (if it shimmers, snapshot `finalEps`/use a deterministic bracket for
   the refine pass).
2. **Discontinuity *inside* the bracket.** If the DE is discontinuous *between* `dPrev` and `d` (the
   pathological hybrid case), a single mid-point sign test can land on the wrong side. Plain bisection
   assumes monotonic sign change across the bracket. Mitigation: the bracket is one coarse march step
   wide and `finalEps`-thin at the surface; if dust persists in a thin band, fall back to MB3D's
   ±0.55 secant (which self-corrects sign) as a v2. Bench DsyneGrafix to confirm bisection suffices
   before adding the secant.
3. **`uDetail` over-tightening.** The importer caps `detail` at 6 (`emitFusedHybrid.ts:283`). With
   refinement now *reaching* that threshold, a too-fine `finalEps` could cost extra refine iters or
   never converge within `REFINE_HARD_CAP`. Watch the convergence-sanity test; loosen the cap or
   raise `REFINE_HARD_CAP` if needed.
4. **Twin divergence on future MB3D formulas.** The twin-agreement invariant (§5.1) is the correctness
   anchor. Any future fused-formula change that perturbs `z` in `map()` but not `mapDist()` (or vice
   versa) silently breaks refinement. The §6 twin-agreement guard catches it; keep it in CI for MB3D
   defs.
5. **Eligibility flag scope.** If the `enableRefine` compile flag is accidentally set on a native
   formula, that scene recompiles with the loop and *could* shift pixels. The flag must originate
   only from the MB3D importer's emitted defs; assert no native `FractalDefinition` carries it (a
   registry-walk test).

---

## 8. File/line index (implementer quick-ref)

| Concern | Location |
|---|---|
| Refinement insertion seam | `engine-gmt/shaders/chunks/trace.ts:116` (inside `if (h.x < finalEps)`) |
| `dPrev` capture | `engine-gmt/shaders/chunks/trace.ts:165` (before the advance) |
| Compile-flag threading (model: `enableGlow`/`precisionMode`) | `trace.ts:4-12`; caller `ShaderBuilder.ts:585` |
| `map()` full estimator / `mapDist()` twin | `engine-gmt/shaders/chunks/de.ts:26-198` / `de.ts:203-267` |
| dIFS accumulator (declare/reset/accumulate) | `emitFusedHybrid.ts:298` / `:299` / `:300` |
| dIFS getDist (estimator 6) | `engine-gmt/features/core_math.ts:35-45` |
| New `refineSteps` quality param site | `engine-gmt/features/quality.ts:170-175` (next to `overstepTolerance`) |
| Importer scene-quality overrides (add `refineSteps`) | `engine-gmt/utils/mb3d/emitFusedHybrid.ts:265-289` |
| Parsed header bytes (already read) | `parseMB3D.ts:242` (`stepsAfterDEStop` @134), `:240` (`deStop` @177) |
| `FractalDefinition.shader` flag (model: `supportsDifs`) | `engine-gmt/types/fractal.ts:105` |
| Physics probe stub ("no refinement", do NOT touch) | `ShaderBuilder.ts:450-489` |
| Mesh Newton projection (separate refiner, no mirroring) | `engine-gmt/engine/SDFShaderBuilder.ts:446-529` |
| MB3D `RMdoBinSearch` reference | `H:/GMT/refSoftware/MB3D/mb3d-1.99src/Calc.pas:1641` (asm), comment `:1672-1697` |
| MB3D DE estimator (where discontinuity originates) | `Calc.pas:503` (formula), `:515` (floor) |
| ADRs to honour | `docs/adr/0076`, `0077`, `0083` |
