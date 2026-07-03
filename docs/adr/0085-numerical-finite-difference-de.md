# ADR-0085: Numerical (finite-difference) DE estimator

> **Rebuild 2026-06-28 (S-numeric-de — supersedes the escape-time MECHANICS of "Decision"
> §1–§4; the decision to HAVE estimator 7 stands):** the original mechanics (difference the
> smooth escape time `nu`) are replaced with a faithful float32 port of MB3D `CalcDEnoADE`
> (`Calc.pas:445-523`) — a **fixed-iteration final-radius (Rout) finite difference**.
>
> **Why the escape-time version was wrong.** `nu` is float32-clean, but for a BOUNDED orbit it
> is constant (never escapes → no gradient) → flat. The whole missing-`dr` class MB3D routes to
> `CalcDEnoADE` is bounded/IFS-ish (DsyneGrafix's IdesFormula collapses y,z→0 → a bounded 1-D
> map; box/Menger stacks stay bounded). `Rout` varies for bounded AND escaping orbits; `nu` does
> not. So the escape-time estimator rendered these scenes flat/blank.
>
> **Corrected mechanics (de.ts):**
> - `centerCount(p)` — run the orbit at the NORMAL bailout; return the center's escape iteration
>   (`ItResultI`, capped at uIterations). This FIXED count is what every perturbed sample re-runs
>   (so `Rout` is a smooth function of the seed — no per-sample escape-iteration jump).
> - `iterateRadius(p, fixedIters)` — run the fixed count with no early-escape break, only the
>   INFLATED bailout `Rstop3D = Sqr(dRstop)·64 = uDeBailout²·64` (Calc.pas:474/558) as an overflow
>   guard. **The cap magnitude is load-bearing:** too low (e.g. `uDeBailout·64`) and the folds
>   overshoot it within the count → every tap clamps equal → `g=0` → `DE` blows up → ray escapes
>   (blank); the literal MB3D `uDeBailout²·64` lets fold samples land at distinct values → clean
>   `ΔRout`. (High-power maps like z⁸ still overshoot in one step → saturate, but those carry an
>   analytic `dr` and never select this estimator.)
> - `numericDistance(p, epsScale)` — `DE = R0·ln(R0)·dDEscale·e / (√ΣΔRout² + e·0.06)`, floored at
>   `numFootprint(p)·0.25` (MB3D `msDEstop·0.25`). The probe `e` in the numerator makes the
>   magnitude PROBE-INVARIANT (it cancels against `g ∝ e`), so the auto footprint probe
>   (`numProbe`/`numFootprint`, zoom-scaled, quality-param-free) never needs per-scene retuning.
> - `numericNormal` — central-difference `Rout` at the shared fixed count; `Rout` increases
>   OUTWARD (escaping side) so the outward normal is **+∇Rout** (sign flip vs the old `−∇nu`).
> - **`uNumDEeps` repurposed** from a probe size to MB3D's **`dDEscale`** (the per-scene
>   magnitude calibration; `quality.ts` default 0.1, was 0.0015). Too high inflates/overshoots the
>   surface; too low → escape (flat). It is now THE numeric-DE dial (the probe is auto).
>
> **Validation.** CPU float32 sims: `debug/sim-numeric-de.mts` (Mandelbulb — shows raw-Rout
> saturation for high-power maps) and `debug/sim-numeric-de2.mts` (fold-based Mandelbox — confirms
> a clean gradient, no saturation, tracks the analytic DE). Shader dump `debug/dump-est7-shader.mts`
> confirms the functions compile in. **User-verified in the real GMT app:** DsyneGrafix forms on
> est7 with **DE scale ≈ 0.1 + Ray detail ≈ 1.5** (the rougher numeric DE needs a looser hit
> threshold than analytic — lower `uDetail`). The headless render-harness could NOT reproduce this
> (it doesn't surface the runtime recipe — iterations defaulted to the imported 2000, and
> detail/dDEscale didn't reach the live render), which is why the rebuild had to be certified in
> the app, not the harness. Success bar: the fold/IFS hybrids form; DsyneGrafix is best-effort
> (its y,z-collapse makes it the hardest case). Analytic estimators remain byte-identical
> (`#ifdef NUMERIC_DE`-gated; `test:refine` §E green). @see `engine-gmt/shaders/chunks/de.ts`,
> `plans/mb3d/sessions/S-numeric-de.md`, MB3D `Calc.pas:445-523` + `HeaderTrafos.pas:558,890,955`.

> **Correction 2026-06-27 (lighting NOT yet working — §3/Consequences over-claimed):** the
> escape-time-gradient normal (`numericNormal`, "Decision §3") was reported as producing a
> "coherent, lit 3-D surface." On closer inspection the **normals are noisy and shadows are
> broken** (glow-only is smooth, confirming the geometry/DE is fine — it's the normal + shadow
> path). Cause: `numericNormal` probes `∇nu` at the *small* `uNumDEeps` (0.0015), where the
> escape-time field is chaotic, and shadows march the noisy 4× `numericDistance`. The estimator's
> **geometry is correct; its lighting is unfinished.** Fix scheduled in the fidelity pass
> (`plans/mb3d/research/fidelity-pass-SESSION.md` item 2): a separate, larger normal probe + a
> smoother/cheaper shadow path. The "float32 grain" open-follow-up below is a related symptom.

> **Update 2026-06-27 (lighting fix landed — S1 item 2; supersedes the speckle in the correction
> above):** the normal + shadow path is fixed in `de.ts`/`material_eval.ts`. (1) `numericNormal`
> now takes the pixel-footprint `eps` GetNormal already computes and probes `∇nu` at `eps·3`
> (a few pixels wide), instead of the fixed `uNumDEeps` (0.0015). The footprint SCALES with zoom,
> so the probe denoises the sub-pixel escape-time chaos at any depth — the old absolute probe
> straddled the whole scene at deep zoom (DsyneGrafix td≈2e-3) and flattened it. It also switches
> from forward to CENTRAL differences (drops the shared `n0` center tap), the single biggest
> denoise. (2) `numericDistance` gained an `epsScale`: `map()`'s silhouette keeps `1.0`, but
> `mapDist()` (shadows + AO, low-frequency) probes at `2.5×` so the escape-time noise averages out.
> Result on DsyneGrafix: smooth, coherently shaded 3-D form (the rings read as lit relief, not
> speckle); geometry sharpness is the user's `uNumDEeps` knob (lower it for deep zoom). Analytic
> estimators are byte-identical (all of this is `#ifdef NUMERIC_DE`-gated). Residual low contrast
> is lighting/material, not normal noise. The "float32 grain" follow-up below is thereby resolved.

> **Update 2026-07-02 (RELIABILITY FIX — est7 rendered black on most formulas; two coupled
> causes found + fixed, GPU-certified on real ANGLE/D3D11; supersedes the raw-Rout MECHANICS of
> the 2026-06-28 rebuild, decision unchanged):** the numeric estimator "broke almost all
> formulas" (blank/black). Root-caused CPU-sim-first (`debug/sim-numeric-de3.mts`,
> `sim-numeric-de4.mts`) then GPU-certed (`debug/cert-one.mts`, headed Chrome). TWO causes:
>
> 1. **`iterateRadius` saturation → g=0 → DE explosion (the "black" for fast/high-power escapers).**
>    It returned `min(dot, cap)`. A Mandelbulb z⁸ (and the no-ADE escape targets Oxnot/Aexion in
>    their hybrid weave) overshoots the inflated cap in ONE step, so the centre AND all 3 perturbed
>    taps clamp to the identical cap → `g=0` → `DE = R0·ln(R0)·e/(0+e·0.06)` explodes (~1e8) → the
>    ray leaps to infinity → blank. The 2026-06-28 "high-power maps carry an analytic dr, don't
>    select est7" caveat was wrong in practice — the user selects est7 on ANY formula, and the
>    hybrid weave escapes fast. **Fix:** difference **ln(Rout)**, not Rout (`iterateRadius` →
>    `iterateLogRadius`, returns `log(clamp(dot,1e-12,1e30))`). Since ΔRout ≈ Rout·Δ(ln Rout),
>    MB3D's `bufRout·ln(bufRout)/√Σ(ΔRout)²` **equals** `ln(bufRout)/√Σ(Δln Rout)²` — the huge
>    Rout cancels top-and-bottom, for bounded AND escaping orbits. The log form is the float32-safe
>    ALGEBRAIC EQUIVALENT of MB3D (no overflow, no g=0 collapse). `numericDistance` numerator is
>    now `L0 = ln(R0)`; `numericNormal` central-differences ln(Rout) (same +grad direction, robust).
>
> 2. **The DE floor EXCEEDED GMT's hit threshold (the "black" for everything else, incl. the
>    Mandelbulb).** MB3D floors at `msDEstop·0.25` where `msDEstop` IS its hit threshold (a floored
>    DE < msDEstop still hits). The 2026-06-28 port floored at `numFootprint·0.25`, but GMT's hit
>    threshold (trace.ts) is `numFootprint·(uPixelThreshold/effectiveDetail)` — a SMALLER fraction.
>    Whenever `uPixelThreshold/effectiveDetail < 0.25` (the Mandelbulb preset's `pixelThreshold=0.2`
>    → threshold `fp·0.13` < floor `fp·0.25`), a floored DE could NEVER drop below the hit threshold
>    → every ray missed → black, regardless of `numDEeps`/`detail`/marcher. **Fix:** floor at
>    **0.25× GMT's actual hit threshold** (mirror trace.ts:204-208), not 0.25× the raw footprint —
>    restores MB3D's "floor a quarter below the hit distance" invariant at any quality setting.
>
> **`uNumDEeps` default 0.1 → 0.3** (hits the true surface in ~36 steps at default fudge/detail;
> overshoots only above ~1.0 — wide safe band). **est7 pairs with the MB3D-faithful marcher**
> (ADR-0088, auto-set on `.m3p` import): the Lipschitz overstep clamp + StepDiv keep the
> over-estimating numeric DE from overshooting — native formulas selecting est7 should enable it too.
>
> **3. Shadows/AO/reflections (secondary rays).** The numeric DE is a good SILHOUETTE estimator
> (→0 at the surface, so the primary faithful marcher converges) but under-reports true distance
> in the thick escape-time boundary shell, so at VERY HIGH AO intensity the secondary marchers
> (`GetSoftShadow`, `GetAO`, `traceReflectionRay` → `mapDist` → `numericDistance(p,2.5)`)
> over-occlude. A ×4 secondary distance correction was tried and REVERTED — it amplified
> secondary-ray noise at normal settings; at default AO/shadow intensities the un-scaled secondary
> DE reads correctly (shadows + AO track the numeric surface). The residual over-occlusion at
> extreme AO intensity is left as a known limit of the escape-time distance estimate.
>
> **4. Deep (high-nC) sections flickered black (user-reported).** The escape field is CHAOTIC at
> high iteration counts, so a narrow (×1) finite-difference probe is noisy: a sub-probe jitter (or
> camera motion) perturbs the sample enough to flip the DE hit↔miss → deep sections flicker black
> (measured CV ≈ 0.45 at nC≈17 with ×1, → 0.00 at ×3 — `debug/sim-numeric-de4.mts`). Central
> differences do NOT help (the noise is the chaos, not the bias); an nC-adaptive probe BACKFIRES
> (nC itself jumps under jitter). **Fix:** widen the PRIMARY (silhouette) probe — exposed as
> `quality.numDESmooth` (uniform `uNumDESmooth`, default 2.5), so the user dials stability↔detail.
> A wider probe averages the sub-footprint chaos → a stable, flicker-free silhouette at the cost of
> some deep-detail sharpness. Lower toward 1.0 for maximum detail (accepts flicker).
>
> **GPU cert (real ANGLE/D3D11, RTX 2070, headed Chrome):** Mandelbulb est7 black (sigma 2.2) →
> full 8-fold bulb (sigma 35, vs analytic 40); **Oxnot-Shells (PseudoXDB, no-analytic-derivative
> escape) blank → rich shell structure (sigma 50)** — the no-ADE escape class this unlocks. The CPU
> sim alone initially MASKED cause #2 (it used `pixelThreshold=0.5`, where `fp·0.25 < threshold`);
> the GPU cert on the real preset surfaced it — the reason the rebuild had to be app/GPU-certed, not
> harness-only. Analytic estimators byte-identical (`#ifdef NUMERIC_DE`-gated; test:refine §E green).
> @see `engine-gmt/shaders/chunks/de.ts`, `debug/sim-numeric-de{3,4}.mts`, `debug/cert-one.mts`,
> `plans/mb3d/sessions/S-numeric-de-reliability.md`, MB3D `Calc.pas:445-523` + `HeaderTrafos.pas:890-956`.

> **Update 2026-07-03 (AUTO-ROUTE the no-ADE subset — supersedes "Decision §Not auto-routed by the
> importer" for that subset; est7-is-opt-in stands for everything else):** now that est7 is reliable,
> `emitFusedHybrid` auto-routes a weave to estimator 7 when it GENUINELY has no analytic DE — the narrow
> signal the original decision said "isn't statically detectable" turns out to be, for the clean case:
> **no active slot updates the derivative** (`slotTranspiler.writesDeriv` — a decompiled `[CODE]` writes
> `w`/`mb3dDr1`, intern formulas thread `dr`) AND the scene isn't dIFS. This is NARROWER than MB3D's
> "any slot lacks a DE → numeric" (which over-routes — a box/Menger slot's `dr` still works), so
> analytically-fine scenes keep the cheaper analytic estimator (only 1/39 bundled scenes routes:
> Oxnot-Shells, which now renders its shells on plain import). The routed recipe = `estimator 7 +
> numDEeps 0.3 + numDESmooth 2.5 + mb3dFaithful + detail≤1.5`. The SUBTLE orbit-collapse case
> (DsyneGrafix: has a box `dr` but the IdesFormula collapses y,z so the weave DE is still dust) remains
> genuinely not-statically-detectable and stays user-opt-in, as the original decision said. Emit-side
> only (decoder corpus untouched). `389825b`.

**Date:** 2026-06-27
**Status:** Accepted
**Scope:** `engine-gmt/features/quality.ts` (estimator option 7 + `numDEeps` param),
`engine-gmt/features/core_math.ts` (arm flag + `NUMERIC_DE` define),
`engine-gmt/engine/ShaderBuilder.ts` (`enableNumericDE`),
`engine-gmt/shaders/chunks/de.ts` (`escapeRadius`/`numericDistance`/`numericNormal` + map/mapDist path),
`engine-gmt/shaders/chunks/material_eval.ts` (numeric normal). New uniform `uNumDEeps`.
**Related:** ADR-0084 (surface refinement), the DsyneGrafix DE-fidelity investigation
(`plans/mb3d/research/dsyne-de-fidelity-findings.md`). Ports MB3D `CalcDEnoADE` (`Calc.pas:445-503`).

## Context

GMT's distance estimators (`generateGetDist`, `core_math.ts`) are all closed-form functions
of one orbit's final state `getDist(r, dr, …)` — they need a valid **analytic derivative**
`dr`, accumulated by each formula as it iterates. That breaks for any formula whose iteration
does **not** update `dr`: MB3D `[CODE]` hybrids (the `[CODE]` computes only the position),
hard Fragmentarium imports, hand-written formulas. The DsyneGrafix investigation traced its
"dust" to exactly this — an IdesFormula `[CODE]` slot that never updates `dr`, so GMT's
analytic Linear estimator (`r/dr`) produces a garbage DE.

MB3D solves it the same way for the same case: the moment any active slot lacks an analytic
DE, its global DEoption collapses to 0 (`HeaderTrafos.pas:438-463`) and it switches to
`CalcDEnoADE` — a **numerical finite-difference DE** that ignores `dr` entirely. It perturbs
the ray seed on each axis, re-iterates the whole formula, and estimates distance from the
escape-field gradient. GMT had no equivalent.

## Decision

Add a **Numerical (Finite-Difference) estimator** (`estimator` value 7), usable by **any**
formula, compile-gated like every other estimator (`estimator` is already `onUpdate: 'compile'`;
selecting 7 emits the numeric path, any other value is byte-identical to before). Mechanics:

1. **`escapeRadius(p)`** (de.ts) — mapDist()'s geometry loop, but returns the **continuous
   (smooth) escape time** `nu = iter + 1 − log2(log2(r²)/log2(bailout))` rather than the raw
   final radius. Two deliberate choices drove this (both found empirically against DsyneGrafix):
   - **Smooth, not discrete.** The raw final `r²` jumps wildly when a perturbed orbit escapes
     one iteration sooner/later; the continuous escape time has no such jump → clean gradient.
   - **Small magnitude.** `nu` is O(iterations); finite-differencing it has no float32
     catastrophic cancellation (differencing two large `r²` values does — that was the first
     source of grain). It deliberately does NOT touch the colouring globals (`g_geomTrap`/
     `g_orbitTrap`), so `map()` can call it after its own coloured orbit without corruption.
2. **`numericDistance(p)`** — perturbs the seed by `uNumDEeps` on each axis (4 `escapeRadius`
   calls), and returns `DE = ε / (|∇nu| + tiny)` (the escape-time gradient → small DE near the
   boundary where escape time diverges, large DE in smooth regions). This is the port of
   `CalcDEnoADE`'s estimate, conditioned for float32.
3. **`numericNormal(p)`** + a `NUMERIC_DE` `#define` (material_eval) — the surface normal comes
   from the escape-time gradient `−∇nu` directly, NOT from finite-differencing the numeric DE.
   The DE is *itself* a finite difference, so differencing it again gave difference-of-difference
   noise (flat/dark shading); the escape-time field is smooth, so its gradient is a clean normal.
4. **`uNumDEeps` probe-size param** (default 0.0015, runtime) — the seed perturbation ε.
   Smaller resolves finer detail but amplifies grain; larger smooths. Runtime so it's tunable
   live without recompiling; unread (harmless) on other estimators.

**Not auto-routed by the importer.** MB3D's rule (any non-analytic slot → numeric) over-routes
in practice: 10/20 sample scenes carry a `deOption ∉ {2,5,6,11,20}` slot, but most still render
cleanly with the analytic estimator (their box/Menger slot supplies a usable `dr`), and numeric
only adds speckle + a **~4× cost** (some scenes 30s+ at 380px). Only a genuine orbit-collapse
case (DsyneGrafix's IdesFormula with Y/Z mul = 0) actually needs it, and that isn't statically
detectable. So the estimator stays a **user opt-in** — select it in the Quality panel for any
scene that imports as dust/noise. The importer leaves a note (`emitFusedHybrid.ts`) but does not
set it.

## Consequences

- **DsyneGrafix** (the canary) goes from disconnected dust to a coherent, lit 3-D surface with
  its characteristic concentric-ring / "loopy" structure (visual cert) — the actual fix the
  surface-refinement attempt (ADR-0084) could not provide.
- **No-regression:** any analytic estimator is byte-identical (DE_MASTER's numeric block is
  emitted only when `numericDE`; the `material_eval` `#ifdef NUMERIC_DE` is preprocessed out →
  pixel-identical, zero compile cost). Verified: `test:refine` §E + the gate suite.
- **Cost when selected:** ~4× the DE work (3 extra orbit re-iterations per DE) + the escape-time
  gradient normal. Real, inherent to the method (MB3D pays it too). It recompiles on selection
  (compile param). The `uNumDEeps` knob trades detail vs grain at runtime.
- **General capability:** this is the standard fallback DE for *any* formula with a missing/wrong
  analytic derivative, not an MB3D-specific patch — frag imports and hand-written formulas can
  use it too.

## Open follow-ups

- Float32 grain persists on some scenes even with the log-smooth escape time + gradient normal;
  full parity with MB3D's float64 estimate would need higher-precision accumulation.
- Exact MB3D visual parity also depends on camera/material/palette import calibration (separate
  from the DE).
- A narrower, render-triage-driven auto-route (route only scenes that actually image as dust)
  could be wired later; the static deOption signal is too coarse.

@see `engine-gmt/shaders/chunks/de.ts`, MB3D `Calc.pas:445-503`, ADR-0084,
`plans/mb3d/research/dsyne-de-fidelity-findings.md`.
