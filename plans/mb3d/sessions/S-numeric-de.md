# Session: rebuild the Numerical DE estimator to match MB3D (de.ts)

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable`. Edits `engine-gmt/shaders/chunks/de.ts`
(+ `features/quality.ts` for the probe param) — **disjoint from the param-packing session** (emitFusedHybrid/
constPacker/slotTranspiler), so this is parallel-safe or can run after. Real-GPU verification required.

## Why (user-confirmed: the current estimator 7 is noisy/glitchy/param-dependent — unusable)
This is the unifying fix for the **missing-`dr` class** (Melting, Oxnot, HalTenny FoN, Hal-Tenny Resistance,
Jost1, Recycledrelatives — transform/inversion slots write no `dr`, so `r/dr` is wrong) AND DsyneGrafix. The
current numeric DE (ADR-0085) differences the WRONG field. Three confirmed root causes (deep-traced vs MB3D
`Calc.pas:445-523`):
- **(A) per-sample escape field.** GMT's `escapeRadius` (`de.ts:37-90`) lets each perturbed sample exit at its
  OWN escape iteration (`de.ts:75`) → the escape-*time* field is fractal at the probe scale → `|∇nu|` speckle.
  MB3D forces ALL samples to a FIXED iteration count (`MaxIt := ItResultI` + `RStop := Rstop3D` ×64,
  `Calc.pas:472-474`) → `Rout` varies smoothly → clean difference.
- **(B) ill-conditioned ratio.** GMT `DE = e/(|∇nu|+1e-9)` (`de.ts:107`) blows up where the gradient →0 → holes/
  overshoot. MB3D `R0·ln(R0)·scale/(√ΣΔRout²+ε)` (`Calc.pas:503`) is self-stabilizing (log-radius numerator +
  a `msDEstop·0.25` DE floor, `Calc.pas:515`).
- **(C) free probe.** GMT's `uNumDEeps` is a fixed runtime knob that ignores zoom/step → must be retuned per
  scene ("depends on many quality params"). MB3D's probe `= Min(msDEstop·0.1, 0.004)·StepWidth`
  (`HeaderTrafos.pas:891,957`) is auto-derived; the matching `mctDEoffset006 = probe·0.06` denominator-ε scales
  with it.

## The corrected design (port MB3D's fixed-iteration `Rout` finite difference)
Replace the escape-time-gradient with MB3D's approach. Three changes in `de.ts` (`numericFns`, ~:36-135):

1. **`centerIterCount(p)`** — the existing `escapeRadius` loop, but return the integer `iter` at which the
   CENTER point escaped (capped at `uIterations`). = GMT's analogue of MB3D `ItResultI`.

2. **`iterateRadius(p, fixedIters)`** — same orbit loop body, but the ONLY exit is `i >= fixedIters` (REMOVE the
   per-sample escape break `de.ts:75`; MB3D inflates RStop so the count is the sole terminator). Return the raw
   **final radius² `dot(z.xyz, z.xyz)` (Rout)** — NOT the smooth escape time `nu`.

3. **`numericDistance(p, epsScale)`** — center sets the count; the 3 axis-perturbed samples run the SAME count;
   difference `Rout`:
   ```glsl
   int nC = centerIterCount(p);
   float R0 = iterateRadius(p, nC);
   if (R0 < 1e-20) return uHitThreshold * 0.25;              // MB3D d1em200 guard + DE floor
   float e = numProbe(epsScale);                             // auto probe, see below
   float dRx = iterateRadius(p+vec3(e,0,0), nC) - R0;
   float dRy = iterateRadius(p+vec3(0,e,0), nC) - R0;
   float dRz = iterateRadius(p+vec3(0,0,e), nC) - R0;
   float g  = sqrt(dRx*dRx + dRy*dRy + dRz*dRz);
   float de = R0 * log(max(R0,1.0001)) * e / (g + e*0.06);   // MB3D R0·ln(R0)·scale / (√ΣΔ² + ε)
   return max(de, uHitThreshold * 0.25);                     // MB3D DE floor (Calc.pas:515)
   ```
   The `e` in the numerator + `e·0.06` in the denominator make the estimate **probe-scale-invariant** (both
   carry one factor of `e`) → `uNumDEeps` no longer changes DE magnitude, only gradient resolution → cause (C)
   gone. The `R0·ln(R0)` numerator never blows up when `g→0` → cause (B) gone. Fixed count → cause (A) gone.

4. **`numericNormal(p, eps)`** — central-difference the now-smooth **fixed-iteration `Rout`** (not `nu`) at the
   large footprint probe `max(eps*3, 1e-7)` (MB3D's `Noffset ≈ 0.15·DEstop` analogue, `Calc.pas:794,823`):
   `grad = vec3(R(p+ex)-R(p-ex), …); return normalize(-grad);` where each `R(·)` reuses one shared `nC`
   (cheaper) or recomputes its own. This is what fixes the noisy-normal/broken-shadow complaint at the source
   (differencing a smooth field, not the chaotic escape-time one).

5. **Auto probe `numProbe(epsScale)`** — replace the free `uNumDEeps` knob: `e = min(uHitThreshold*0.1, 0.004) *
   stepScale * epsScale` (MB3D `Min(msDEstop·0.1, 0.004)·StepWidth`). KEEP `uNumDEeps` only as an optional
   *multiplier* (default 1.0) for power users — because the estimate is now probe-invariant, it only fine-tunes
   resolution, not magnitude. Update `quality.ts:195-203` accordingly.

Perf: 1 center + 3 perturbed re-iterations = ~4× map cost — **identical to today** (and to MB3D).

## Gates / verify
- `npm run typecheck`, `npm run test:refine` (the numericDE §E — update the assertions for the new formula; the
  analytic estimators stay byte-identical since the numeric block is `#ifdef`-gated, so the off-path is untouched).
- **Real-GPU canary = DsyneGrafix** (estimator 7): must render the smooth concentric-ring relief WITHOUT retuning
  a probe — that's the proof the param-sensitivity is gone. Then the 6 dr-gap scenes (Melting, Oxnot, HalTenny
  FoN, Hal-Tenny Resistance, Jost1, Recycledrelatives) on estimator 7 should form correctly / un-black.
- Confirm analytic-estimator scenes are unchanged (numeric is `#ifdef NUMERIC_DE`-gated).
- **Update ADR-0085** — supersede the escape-time-gradient approach with the fixed-iteration `Rout`-difference
  (record the 3 root causes + the MB3D port). This is a load-bearing correction.

## After this lands
The dr-gap auto-route (round-2 queue) becomes viable: route the missing-`dr` scenes to estimator 7 now that it's
robust. That gate lives in `emitFusedHybrid.ts` → after the param session. (Future optimization: analytic-`dr`
emission for recognized transforms — sphere inversion `dr*=1/r²`, box fold ±1, scale-add `dr*=|s|` — gives an
exact, probe-free, 4×-cheaper `dr` where the decompiler can prove every slot's Jacobian; numeric DE stays the
general fallback for arbitrary `[CODE]`.)

---

## Session outcome + handoff (2026-06-28) — committed on `feat/mb3d-importer`

**Status: implemented, user-verified working in the real GMT app, committed. Not byte-clean across all
hybrids yet — needs per-scene calibration. Pick up from here.**

### What the spec above got WRONG (corrected this session)
The spec told me to difference the **smooth escape time `nu`**. That is float32-clean but **WRONG for this
class**: the missing-`dr` MB3D scenes are bounded/IFS-ish (DsyneGrafix's IdesFormula collapses y,z→0 → a
bounded 1-D map; box/Menger stacks stay bounded), and for a bounded orbit `nu` is constant (never escapes →
no gradient) → **flat/blank render**. I read the actual MB3D source (`Calc.pas:445-523`, `HeaderTrafos.pas`)
and the real `CalcDEnoADE` differences the **fixed-iteration final radius `Rout`**, which varies for bounded
AND escaping orbits. Two more spec errors: the cap is `Rstop3D = Sqr(dRstop)·64 = uDeBailout²·64` (NOT
`uDeBailout·64` — too-low saturates `g→0`→escape→blank), and `uNumDEeps` is MB3D's **`dDEscale` magnitude
calibration**, not a probe size.

### Final implementation (de.ts, all `#ifdef NUMERIC_DE`-gated; analytic byte-identical)
- `centerCount(p)` → `ItResultI` (center's escape iteration, fixed count for all taps).
- `iterateRadius(p, nC)` → `Rout` at the fixed count, inflated `uDeBailout²·64` cap.
- `numericDistance` → `DE = R0·ln(R0)·dDEscale·e / (√ΣΔRout² + e·0.06)`, floor `numFootprint·0.25`. Probe
  `e` is auto (footprint, zoom-scaled) and cancels → **probe-invariant**; `dDEscale (uNumDEeps)` is the dial.
- `numericNormal` → central-difference `Rout`, **`+∇Rout`** (Rout increases outward — sign flip vs old `−∇nu`).
- `quality.ts`: `numDEeps` default **0.1** (was 0.0015 probe; now dDEscale).

### Verified WORKING RECIPE (DsyneGrafix, in the real app — harness can't reproduce)
`estimator 7 (Numerical)` · **DE scale 0.1** · **Ray detail ~1.5** (the rougher numeric DE needs a looser hit
threshold than analytic) · iterations ~15 (NOT the imported 2000) · fudge 1.0 · maxSteps 250 · jitter off ·
pixelThreshold 0.5 (0 kills it). → "thin clean, shows the entire foreground and background."

### What's left / open (for next time)
1. **Per-scene `dDEscale`.** MB3D derives it as `x1/n` from zoom/StepWidth (`HeaderTrafos.pas:769`). Not
   ported — it's a manual knob. Melting/Oxnot give *partial* geometry but not clean at a single setting; they
   want their own `dDEscale`/`detail`. Porting `x1/n` would auto-calibrate (the right next step).
2. **iterations = 2000.** The importer sets `uIterations` from the MB3D header max, not the weave cycle (15).
   Makes the numeric DE slow + the fixed count huge. Fix lives in `emitFusedHybrid.ts` (out of scope here —
   param-packing session owns that file). Real perf culprit, separate from the DE.
3. **Harness fidelity gap.** `debug/render-harness.ts` (`runMB3DWeaveTest`) does NOT surface the runtime
   recipe — iterations defaulted to the imported 2000 and detail/dDEscale didn't reach the live render, so the
   estimator renders FLAT in the harness while working in the app. **Certify est7 in the app, not the harness**
   until that's fixed. (Shader dump `debug/dump-est7-shader.mts` confirmed the compiled GLSL = de.ts exactly,
   which is how we proved the flat harness output was a param gap, not a code bug.)
4. **Optional auto-loosen the numeric hit threshold** (`trace.ts`, `NUMERIC_DE`-gated) so default Ray detail
   works without manual lowering. Left as a documented knob for now.
5. **High-power maps (z⁸) still saturate** even the high cap (one step overshoots) → but those carry analytic
   `dr` and never select est7, so it's moot.

### Artifacts
- CPU float32 sims: `debug/sim-numeric-de.mts` (Mandelbulb — shows raw-Rout saturation), `debug/sim-numeric-de2.mts`
  (fold Mandelbox — validates clean gradient vs analytic). `debug/dump-est7-shader.mts` (dump + confirm).
  `debug/probe-numeric-de-rebuild.mts` (GPU render probe — UNRELIABLE until the harness gap #3 is fixed).
- Gates: `npm run test:refine` (§E, 55/55), `npm run typecheck`. ADR-0085 has the full dated Update block.
