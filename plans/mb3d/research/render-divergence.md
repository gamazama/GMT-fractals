# MB3D ↔ GMT Render Divergence Table

> **Provenance correction (2026-06-28):** re-anchored from the dead `Calc.pas`
> `RayMarch` to the live `CalcThread.pas` marcher — see `render-pipeline-CORRECTIONS.md`.

> **What this is.** A precise, both-sided divergence catalogue between the
> Mandelbulb3D renderer and the GMT raymarcher, distilled from the two
> definitive specs (`mb3d-render-pipeline-spec.md`, `gmt-render-pipeline-spec.md`)
> and adversarially re-verified against source. Every row names the divergence,
> the **MB3D behaviour [file:line]**, the **GMT behaviour [file:line]**, and the
> **rendered consequence** (which scene / which artifact). Only divergences whose
> verdict was **SURVIVES** or **AMENDED** (using the amended text) are included.
> A short **Refuted "false divergences"** section at the end records places the
> two engines actually agree — kept here so future investigations don't re-chase
> theories already in the graveyard.
>
> Source roots: MB3D Pascal at `/h/tmp/mb3d-src/`, GMT at
> `h:/GMT/workspace-gmt/stable/`. GMT shader chunks (`trace.ts`, `de.ts`,
> `material_eval.ts`, `math.ts`) are JS templates that build GLSL at compile time.
>
> **Citation note.** The MB3D march rows are anchored to the **live** marcher —
> `TMandCalcThread.Execute`, whose march loop is inlined at `CalcThread.pas:128-258`
> (loop body `:186-253`, spawned `Calc.pas:209`). The `RayMarch` /
> `RayMarchVV` procedures (`Calc.pas:1815` / `:1944`) are **dead** — zero call
> sites anywhere in the tree (a grep for the bareword returns only the three
> definition sites). Earlier revisions of this doc cited `RayMarch`; those
> citations have been re-anchored (see `render-pipeline-CORRECTIONS.md` for the
> old→new map). The live and dead bodies are mechanically *similar* — most
> conclusions survive — but the step formula differs substantively (see MR-5).
> The canonical decompiler tree referenced by the importer notes lives at
> `/h/tmp/mb3d-decomp/` (the repo `plans/` copy has drifted).

---

## 1. March reach

How far a ray can travel into the model before the loop gives up. This is the
single most consequential cluster — it governs the "back of the model cut off"
artifact on dense deep scenes.

| # | Divergence | MB3D behaviour [file:line] | GMT behaviour [file:line] | Rendered consequence |
|---|------------|----------------------------|---------------------------|----------------------|
| MR-1 | **March termination: distance-bound vs step-count cap.** MB3D's only loop exits are a world-distance bound (`mZZ > Zend`) or a user-stop flag — **no step-count cap**. GMT's *primary* terminator is a step count; distance is secondary. | `repeat` (CalcThread.pas:186) … `until (mZZ > Zend) or PCalcThreadStats.pLBcalcStop^` (CalcThread.pas:253). `Zend := MaxCD(1e-10, (dZend − dZstart) / StepWidth)` (HeaderTrafos.pas:779) — a normalized camera depth range over step width. The only other exit inside the loop is `Break` in the set-found branch (CalcThread.pas:251) — a *hit*, not budget exhaustion. | `int limit = int(uMaxSteps)` (trace.ts:118), `for (int i=0; i<MAX_HARD_ITERATIONS; i++)` (trace.ts:130) with `if (i >= limit) break;` (trace.ts:131) as the primary gate; distance gate `if (d > maxMarch) break;` (trace.ts:215) is secondary. uMaxSteps default 300 (quality.ts:84). | Dense deep IFS/Menger scenes have the **back of the model cut off** when the step budget runs out before the ray crosses the volume: **Theli-At, TimeMachine, Hyperben2, Hal-Tenny**. |
| MR-2 | **Step count is informational (MB3D) vs the runtime gate (GMT).** | `StepCount := 0` (CalcThread.pas:139); accumulated only (CalcThread.pas:204-209 in-loop; :254-257 post-loop fog/shadow total); **never in the `until` conditional**. Consumed post-march for fog/shadow length reporting (`Inc(pCTR.i64DEsteps, Round(StepCount))` :254; `mPsiLight.Shadow := … Round(Min0MaxCS(StepCount, 1023))` :257). | The loop index `i` *is* the live terminator (`if (i >= limit) break;`, trace.ts:131); there is no separate informational counter. | MB3D's reach is decoupled from step count (coarse vs fine step changes cost, not reachability); in GMT step count **is** reach, so the importer must inflate `maxSteps` to extend reach (see MR-8). |
| MR-3 | **Distance bound: per-scene normalized depth range vs fixed envelope.** | The live loop bound is **`Zend`**, not the dead `RayMarch`'s `MaxRayLength`: `until (mZZ > Zend)` (CalcThread.pas:253) where `Zend := MaxCD(1e-10, (dZend − dZstart) / StepWidth)` (HeaderTrafos.pas:779; `StepWidth := dStepWidth`, :778). This is a normalized camera depth range over step width — **fully derivable from header fields**, not a caller-supplied opaque field. | Compile-time `#define MAX_DIST 10000.0` (math.ts:158) **plus** a fixed `#define BOUNDING_RADIUS 400.0` entry clip: `vec2 bounds = intersectSphere(...)` / `if (bounds.x > bounds.y) return false;` / `d = max(0.0, bounds.x)` (trace.ts:106-109; math.ts:160). | MB3D geometry outside GMT's fixed 400-radius / 10000-far envelope risks being unreachable in GMT — but with `Zend` now source-settled (`dZend`, `dZstart`, `StepWidth` all header-derived) the importer can compute MB3D's actual depth bound and compare. **Whether it ever exceeds GMT's envelope is now answerable from the header rather than an open runtime question** *(pending the Zend↔MAX_DIST/BOUNDING_RADIUS relationship being worked through per scene).* |
| MR-4 | **Compile-time unroll ceiling (GMT) vs unbounded CPU loop (MB3D).** | CPU `repeat…until` is genuinely unbounded in step count (CalcThread.pas:186-253). | `MAX_HARD_ITERATIONS` is a `#define` from `compilerHardCap || DEFAULT_HARD_CAP` (quality.ts:306-307); DEFAULT_HARD_CAP=2000, MOBILE_HARD_CAP=256 (constants.ts:22-24). Reason: GPU watchdog/TDR — "ANGLE/D3D does not unroll define-bounded loops" (quality.ts:55). | GMT can **never** exceed 2000 march steps (256 mobile) per ray even with uMaxSteps maxed — a structural reach ceiling MB3D has not. The cap exists for the GPU, not fidelity, but directly bounds reach. |
| MR-5 | **Live step formula (safety-subtraction + floor + upper clamp) vs jitter-only step.** MB3D's live step is `DE`, minus a per-step DE-stop safety subtraction, scaled, floored at `s011`, then clamped *from above*; GMT's is a plain `DE × fudge × jitter` with only a lower floor. | `dTmp := MaxCS(s011, (dTmp − msDEsub * msDEstop) * sZstepDiv * RSFmul)` then `dT1 := MaxCS(msDEstop, 0.4) * mctMH04ZSD; if dT1 < dTmp then dTmp := dT1` (CalcThread.pas:200-206). Two terms the dead `RayMarch` step (`dTmp := dTmp * sZstepDiv * RSFmul`) lacked: **(a)** the safety subtraction `(DE − msDEsub·msDEstop)` *before* scaling, and **(b)** the `s011` (= 0.11) floor via `MaxCS`. `msDEsub` is gated by `iOptions` bit 2 (`HeaderTrafos.pas:961-964`; =0 when clear, else `MinCS(0.9, Sqrt(remapped sZstepDiv))`). Upper clamp `mctMH04ZSD = Max(iMandWidth,iMandHeight)*0.5*Sqrt(sZstepDiv+0.001)*MaxCS(0.01,sRaystepLimiter)` (HeaderTrafos.pas:860) — screen-relative. | Straight step `d += max(h.x, floatPrecision*0.5) * currentFudge * stepJitter` (trace.ts:213); `currentFudge = uFudgeFactor` (trace.ts:204). **No DE-stop subtraction**, only a *lower* floor (`max(h.x, floatPrecision*0.5)`), and no upper clamp. | MB3D under-steps near the surface (the `−msDEsub·msDEstop` term shortens the step as DE approaches the hit threshold) and bounds overshoot from above; GMT steps the full `DE×fudge` with no safety pullback, so an over-estimating fused DE can launch a GMT ray **further per step** in empty space than MB3D ever would, and tunnel thin features near the surface that MB3D's safety subtraction would have caught. *(The importer does not read `iOptions` bit 2, so the safety subtraction + `sZstepDiv` remap are silently dropped — see the CORRECTIONS "New importer consideration".)* |
| MR-6 | **Step damper + overstep clamp (MB3D) vs jitter only (GMT).** | Overstep/extrapolation clamp `if dTmp > RLastDE + RLastStepWidth then dTmp := RLastDE + RLastStepWidth` (CalcThread.pas:223); RSFmul contraction damper `if RLastDE > dTmp+s1em30 then dT1 := RLastStepWidth/(RLastDE-dTmp); if dT1<1 then RSFmul := maxCS(s05,dT1) else RSFmul := 1` (CalcThread.pas:224-230); RSFmul (0.5 floor) multiplies the *next* step at CalcThread.pas:200. | No per-step adaptive damper, no extrapolation clamp. Step uses fixed `uFudgeFactor` and asymmetric short-biased `stepJitter = uBlendFactor >= 0.99 ? 1.0 : (1.0-uStepJitter)+uStepJitter*fract(...)`, **disabled during navigation** (trace.ts:212-213). | MB3D self-throttles near contracting DE fields (sharper convergence on thin/dense features without overshoot). GMT relies on stochastic jitter (averaged only by accumulation) + post-miss snap-back, so **thin features tunnel on the live frame** and recover only statistically. |
| MR-7 | **Overstep/refine is backward-only in BOTH — neither extends reach.** *(Confirmation, not a reach fix.)* | `RMdoBinSearch`/`RMdoBinSearchIt` run only inside the live set-found branch, gated `iDEAddSteps <> 0` (CalcThread.pas:235), then `Break` out of the march loop (CalcThread.pas:251). The asm refiner seed (live proc at Calc.pas:1641; asm body :1699-1805) is a *negative* half-step `dT1 := RLastStepWidth * -0.5`, bisecting onto the already-crossed surface. | Closest-miss tracker records per step (trace.ts:188-198); snap-back runs only **after** the loop (`if (minCandidateRatio <= 1.0 + uOverstepTolerance) { d = candidateD; result = candidateH; result.x = 0.0; }`, trace.ts:221-244). | Refutes the historical *"binary search reaches the back"* theory on both sides: refinement converges backward onto already-bracketed geometry and discovers **no new far geometry**. The MR-1 reach gap can only be closed by raising the step budget (MR-8), not by recovery. |
| MR-8 | **Importer reach bridge (GMT-side fix for MR-1/MR-4).** | (mapped *from*) `dTmp := MaxCS(s011, (dTmp − msDEsub*msDEstop) * sZstepDiv * RSFmul)` (CalcThread.pas:200) — the live step mapped to GMT's `d += DE * uFudgeFactor` (the importer currently maps only the `sZstepDiv·RSFmul` scaling, dropping the `msDEsub` safety subtraction + `s011` floor). | For any authored-quality scene (`h2.deStop>0 || h2.rStop>0`): base `maxSteps:1500` (emitFusedHybrid.ts:334), fudge floored at 0.4 raised from 0.3 round-2 A1 (emitFusedHybrid.ts:381-386), `overstepTolerance = 2.0` (emitFusedHybrid.ts:393), `maxSteps = min(2000, max(1500, round(750/fudge)))` (emitFusedHybrid.ts:398). | The explicit, documented bridge to make a step-count-capped engine reach the far geometry a distance-terminated engine reaches: coarse fixed step + statistical recovery. Named fix for the **Theli / TimeMachine back-cut**. |
| MR-9 | **Forward-progress floor: dynamic depth-rescaled (MB3D) vs fixed precision floor (GMT).** | The live step *does* have a fixed lower floor `s011` (= 0.11) on the scaled step (`MaxCS(s011, …)`, CalcThread.pas:200); in addition the hit threshold `msDEstop` is rescaled *up* with the marched distance each step (`msDEstop := DEstop * (1 + mZZ * mctDEstopFactor)`, CalcThread.pas:221) and feeds the 0.4-floored max-step clamp (CalcThread.pas:201) — so the effective near-empty-space step grows with depth. | `floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH)` (PRECISION_RATIO_HIGH=5e-7) used as a *lower* floor only: `d += max(h.x, floatPrecision*0.5) * …` (trace.ts:27, 213). | In deep zoom MB3D **auto-coarsens both** hit threshold and max step together (detail near camera, coarse far away), keeping reach in budget. GMT's only depth-coupled term raises the *minimum* step, with no auto-coarsening — so deep GMT scenes still bottom out on the fixed `uMaxSteps` budget. |

---

## 2. DE selection

Which distance estimator a scene runs, and how a multi-slot hybrid resolves it.
Governs the "dust / overshoot to black" class.

| # | Divergence | MB3D behaviour [file:line] | GMT behaviour [file:line] | Rendered consequence |
|---|------------|----------------------------|---------------------------|----------------------|
| DE-1 | **Dispatch: per-load function pointer vs one static baked estimator.** | `IsCustomDE := DEoption in [2,5,6,11,20]`; dispatch once at load: `if bIsDEcomb then CalcDE := CalcDEfull else if isCustomDE then CalcDE := CalcDEanalytic else CalcDE := CalcDEnoADE` (HeaderTrafos.pas:649-671). | `estimatorType = quality?.estimator || 0` read at compile time; one `getDist` body baked per estimator 0-6 (core_math.ts:230, 34); numeric path armed only when `estimatorType > 6.5` (core_math.ts:242). Runtime selector: `numericDE ? numericDistance(p,1.0) : getDist(r,safeDr,iter,z)` (de.ts:233-239). | MB3D picks per merged DEoption at load (incl. a third `CalcDEfull` combined path GMT has no analog for); GMT bakes **one** estimator, and the importer's `mapDEMeta` **never produces numeric (7)** — so a scene MB3D would render numeric can still get a GMT analytic estimator. |
| DE-2 | **Merge-all-slots (MB3D) vs pick-one-slot (GMT).** | `CheckFormulaOptions` loops ALL active slots (HeaderTrafos.pas:442) and **merges** iDEoptions: e.g. `2: if not (de in [2,5,6,11]) then DEoption := 0` (drops to numeric on incompatible mix), hard-errors a dIFS/non-dIFS mix, then `if bDisableADE` forces 2,11→0 / 5,6→4 (HeaderTrafos.pas:442-469). One bad slot collapses the whole stack to numeric. | Picks **one** slot: `deSlot = find(deOpt===20) ?? find(deOpt>=0) ?? deCandidates[0]` (emitFusedHybrid.ts:169-171); applies `mapDEMeta` to that single slot: `log=(opt&0x38)===32; julia=(opt&7)===4; estimator:(log||julia)?0.0:2.0` (constPacker.ts:171-174). | A scene whose *merged* MB3D DEoption is 0 (numeric) but which has a deOption-2 slot gets GMT analytic **est2** instead — the documented **DsyneGrafix** case. GMT never merges/collapses. |
| DE-3 | **The dr-gap.** Transform/inversion hybrids with no derivative-producing slot: MB3D falls to numeric; GMT keeps an analytic r/dr estimate and passes dr unchanged → overshoot. *(AMENDED — estimator number corrected.)* | `doHybridPasDE` inits the derivative (`32: Deriv1:=1` … `else w:=1`, formulas.pas:3705); each slot called by-var `fHybrid[n](x,y,z,w,…)` (formulas.pas:3718) so only deriv-producing slots change w; result `Result := Sqrt(Rout)/Abs(w)` (formulas.pas:3735). A transform/inversion slot never updates w → merged DEoption collapses to 0 → **numeric `CalcDEnoADE`**. | Picks an analytic estimator from the DE-owner slot: **est2** (r/dr) when it's a decompiled box-fold (`mapDEMeta`, deOption 2 e.g. ABoxMod/Kali, constPacker.ts:174), or **est1** via the intern-AmazingBox fallback for the canonical DsyneGrafix case (est1≈est2 on box geometry, emitFusedHybrid.ts:304-313). GMT deliberately does **NOT** auto-route to numeric est7 — "numeric stays a user opt-in" (emitFusedHybrid.ts:317-327). dr passed UNCHANGED → overshoot. | The transform/inversion missing-dr class imports as **dust / black**: **Oxnot, Recycledrelatives** (both black), **HalTenny FoN, Hal-Tenny Resistance, Jost1**. (**Melting is FIXED** — `34033d4`; residual is a colour tint, not silhouette — so it is no longer in this dust/black list.) Fix for the remaining class = manually select numeric estimator 7 in the Quality panel. *(Note: numeric math itself is a **faithful but probe-invariant-adapted** port — `CalcDEnoADE` formula at Calc.pas:503 (`bufRout*Ln(bufRout)*dDEscale/(Sqrt(Rst+wt+dt)+mctDEoffset006)`) maps to GMT's `numericDistance` at de.ts:190-202, esp. :200 (`R0*log(...)*uNumDEeps*e/(g+e*0.06)`). GMT adds a probe `e` numerator factor + an `e*0.06` denominator term that make the magnitude probe-invariant (see the gmt-spec amendment); it is **not** byte-for-byte. The ONLY divergence that matters here is the routing decision, auto vs manual — the formula is faithful.)* |

---

## 3. Iteration semantics

How many times the fused weave runs per pixel and what caps it. Largely matched
(the weave cursor and header-Iterations cap are ported faithfully); divergences
are at the edges.

| # | Divergence | MB3D behaviour [file:line] | GMT behaviour [file:line] | Rendered consequence |
|---|------------|----------------------------|---------------------------|----------------------|
| IT-1 | **Iteration cap value: no upper clamp vs 2000 clamp.** | `until (ItResultI >= maxIt) or (Rout > RStop)` (formulas.pas:3471); `maxIt = iMaxIt = Iterations` with no upper clamp (HeaderTrafos.pas:551; Calc.pas:378). | `if (i >= int(uIterations)) break;` (de.ts:294-295); `uIterations = clampIter(header.iterations) = min(2000, max(1, round(n)))` (emitFusedHybrid.ts:49; DEFAULT_HARD_CAP=2000). | For authored Iterations > 2000 GMT **silently truncates** the orbit; MB3D runs all of them. No artifact on bundled scenes (all <2000); pathological deep counts only. |
| IT-2 | **Cap counter: ItResultI (non-silent slots) vs loop index `i`.** *(AMENDED — GMT cap counter is `i`, not the `iter` float.)* | `ItResultI` increments only on non-silent slots (`if nHybrid[n] < 0 then Continue else Inc(ItResultI)`, formulas.pas:3465-3470); cap compares ItResultI to header Iterations (not a per-slot sum). | The CAP counter is the loop index **`i`** (`if (i >= int(uIterations)) break;`, de.ts:294-295) — **not** the `iter` float at de.ts:329 (a separate smooth-iter display counter). GMT rejects silent slots (emitFusedHybrid.ts:75), so every supported scene is all-counted → GMT `i` == MB3D `ItResultI` step-for-step. | **Matched.** Refutes the falsified "sum of per-slot counts is the real cap" theory on both sides. |
| IT-3 | **Iteration floor to cover every weave slot (GMT only).** | Runs exactly `header.Iterations` weave steps; **drops a trailing slot** whose first appearance is past the authored count (formulas.pas:3454-3471). | `minCoverIters` = position of last unique slot's first appearance + 1 (emitFusedHybrid.ts:91-93); `iterations: max(clampIter(h.iterations), minCoverIters)` (emitFusedHybrid.ts:250). | GMT renders trailing-slot geometry MB3D drops at low authored counts — **Wada** centre sphere (authored Iterations=2 over a 3-slot cycle PolyFold-symIFS→SphereIFS→SphereIFS; the 2nd SphereIFS never ran in MB3D). Deliberate divergence ("restores the artist's intent"). Other bundled scenes already cover all slots and stay identical. |
| IT-4 | **No iteration-limited hit in GMT (MB3D iteration-limited hit).** | Live marcher hit test `(ItResultI >= MaxItsResult) or (dTmp < msDEstop)` (already-in-set entry CalcThread.pas:161; in-loop set-found `DElimited := (ItResultI < MaxItsResult) or (dTmp < msDEstop)`, :234) — reaching the iteration cap with DE still above threshold declares an iteration-limited hit (DElimited false) and back-steps (CalcThread.pas:187-194). | Hit test is **only** `if (h.x < finalEps)` (trace.ts:163-164); no iteration-count hit path. | For bounded non-dIFS interiors (IFS/Menger relying on r/dr) where the orbit maxes out but the post-loop DE never crosses finalEps, MB3D paints a surface and GMT **marches through** (missing solid interior / different silhouette). dIFS is shielded — its estimator-6 orbit-trap running-minimum DE *does* cross finalEps. **Most consequential iteration divergence.** |
| IT-5 | **Minimum-iterations march gate dropped (GMT).** | Live continue-march condition `(ItResultI < iMinIt) or ((ItResultI < MaxItsResult) and (dTmp >= msDEstop))` forces stepping while below `iMinIt = Min(Iterations, MinimumIterations)` even past the DE threshold (CalcThread.pas:196-197; HeaderTrafos.pas:552). | Hits the instant `h.x < finalEps` with no minimum-orbit precondition (trace.ts:164); importer never reads MinimumIterations (#135) — grep of utils/mb3d returns nothing. | MB3D suppresses spurious near-camera hits (forces continued marching); GMT can declare an early surface there — extra foreground shell/fog where MB3D would skip. Scenes with a high authored MinimumIterations most affected. |
| IT-6 | **dIFS `MaxItsResult` +1 omitted (GMT).** | dIFS (DEoption=20) gets one extra allowed iteration: `MaxItsResult := It3Dex.MaxIt; if DEoption=20 then Inc(MaxItsResult)` (Calc.pas:302-303). | Sets dIFS iterations the same as any scene, no +1 (`iterations: max(clampIter(h.iterations), minCoverIters)`, emitFusedHybrid.ts:250). | A dIFS scene runs **one fewer** orbit iteration in GMT at the same authored Iterations — a genuine source-level off-by-one on every estimator-6 import. Small (one orbit-trap fold), but real. |
| IT-7 | **Escape radius (RStop→deBailout): matched, with GMT clamp.** *(AMENDED — RStop seed site corrected.)* | Escapes on `Rout > RStop`, `Rout = x²+y²+z²` (formulas.pas:3468); loop RStop seeded by explicit assignment `It3Dex.RStop := dRStop` (Calc.pas:510/579/600), `dRStop = Sqr(header.RStop)` (HeaderTrafos.pas:558). *(The Calc.pas:2725 FastMove copies the 168-byte J/julia block, not RStop.)* | Escapes on `r2 > bailout`, `r2 = dot(z.xyz,z.xyz)` (de.ts:372); `deBailout = min(1000, max(16, header.RStop²))` (emitFusedHybrid.ts:363), dIFS forced to 1000. | Both compare squared radius to RStop² — **matched** for mid-range RStop. Only GMT's [16,1000] clamp (very large RStop saturates to "run full orbit"; floor 16 guards RStop<4) and the dIFS exemption differ. |
| IT-8 | **Weave-cursor wrap: ported faithfully.** | `Inc(n); if n > EndTo then n := iRepeatFrom` (formulas.pas:3458-3459); CheckHybridOptions mode-0 sets EndTo=last non-zero-count slot and clamps RepeatFrom back over empty slots: `x:=5; while (x>0) and (Formulas[x].iItCount=0) do Dec(x); … repeat1 := Min(x, bHybOpt1 shr 4)` (CustomFormulas.pas:104-112). | `buildWeaveSequence` replicates exactly: mode-0 `endTo` = last non-zero slot, `repeatFrom = min(x, hybOpt1>>4)` over `nHybrid[x]<=0` (weaveSequencer.ts:49-58); cursor walk `while (bTmp<=0){ n++; if (n>endTo) n=repeatFrom; }` (weaveSequencer.ts:72-74), baked as a modulo LUT. | **Matched** — same slot at the same iteration index in both engines. "Does GMT iterate the fused weave the same number of times per pixel?" → **YES**, subject to the IT-1/IT-3 cap/floor edges. |
| IT-9 | **ColorOnIt reduced-cap colour DE eval (MB3D) has no GMT analog.** | `i := maxIt; maxIt := ColorOnIt-1; RStop := Sqr(RStop)*64; CalcDE(...); maxIt := i; RStop := dRStop` (Calc.pas:1269-1274) — a colour-only DE re-eval at a *lowered* iteration cap with an inflated escape radius. | `uColorIter` snapshots running orbitTrap/trap/iter when `iter <= uColorIter` and substitutes post-escape (de.ts:359-364) — different mechanism, no reduced-cap re-eval, no ×64. Importer never maps ColorOnIt→uColorIter (none in utils/mb3d). | **Colouring** divergence only (not silhouette): a scene authored with a specific ColorOnIt colours differently between engines. |
| IT-10 | **DE produced by full weave re-iteration in BOTH; per-eval count matched.** *(Confirmation.)* | `doHybridPasDE` re-runs the whole weave per CalcDE call with the same cap `until (ItResultI >= maxIt) or (Rout > RStop)`, returns DE from final Rout/Deriv (formulas.pas:3726-3735); `Deriv1:=1` seed (Calc.pas:2732). | `map()`/`mapDist()` re-run the whole weave per call with the same `i >= uIterations` / `r2 > bailout` cap, then `getDist` after the loop (de.ts:378-388); `mb3dDr1=1.0` seed (emitFusedHybrid.ts:434). | Per-point iteration **count per DE eval matches**. The remaining difference (MB3D reads tracked derivative `w`; GMT reads its `dr` accumulator) is a DE-*math* difference (the DE-3 cluster), **not** an iteration-count difference. |

---

## 4. Hit threshold

The surface-stop criterion. **Genuinely different stopping criteria, not the same
surface in different units:** MB3D's threshold is world-absolute and depth-degrading;
GMT's is a screen-relative cone-traced pixel footprint plus a float-precision floor.

| # | Divergence | MB3D behaviour [file:line] | GMT behaviour [file:line] | Rendered consequence |
|---|------------|----------------------------|---------------------------|----------------------|
| HT-1 | **Depth-degrading world threshold (MB3D) vs depth-invariant screen threshold (GMT).** | Live formula: `msDEstop := DEstop * (1 + mZZ * mctDEstopFactor)` rescaled EVERY step (CalcThread.pas:155/192/221; init `msDEstop := DEstop`, :141, `DEstop := MaxCS(s0001, sDEstop)`). It scales **directly on `mZZ`** (the accumulated marched ray distance) — the dead `RayMarch`'s projected `Clamp0D(ActZpos + Zstepped*ZZposMul)` dot-product form is NOT the live path. `mctDEstopFactor ≥ 0` → multiplier ≥ 1 → threshold **grows** with marched depth. Far geometry matched coarser by design. | `pixelFootprint = (perspective) uPixelSizeBase*d`; `threshold = pixelFootprint*(uPixelThreshold/effectiveDetail)`; `finalEps = max(threshold, floatPrecision)` (trace.ts:157-161). The d-scaling exists only to hold the threshold at a constant *fraction of a screen pixel* across scales — screen-angular-**constant**. | **Opposite intents.** In deep-zoom / large-depth-range scenes MB3D **softens** distant surfaces while GMT holds them sharp; on grazing far high-variance surfaces (Theli background Menger half-spheres) GMT keeps trying to resolve detail MB3D smooths away. |
| HT-2 | **Hit predicate same shape, different quantity.** | Hit when `(ItResultI >= MaxItsResult) or (dTmp < msDEstop)` — already-in-set entry at CalcThread.pas:161, set-found `DElimited := (ItResultI < MaxItsResult) or (dTmp < msDEstop)` at :234; continue-march while `dTmp >= msDEstop` (CalcThread.pas:196-197). Threshold = world-absolute, depth-rescaled scalar. | Hit when `h.x < finalEps` (trace.ts:164). Threshold = screen-pixel-relative scalar recomputed inline per step. | Predicate matches (`DE < threshold`); the threshold's **units and depth behaviour** do not. |
| HT-3 | **Base threshold: one authored scalar (MB3D) vs inline-composed (GMT).** | `sDEstop(#177) → msDEstop = MaxCS(0.001, sDEstop) → DEstop` (HeaderTrafos.pas:535-536; `DEstop := MaxCS(s0001, sDEstop)`), read at march entry `msDEstop := DEstop` (CalcThread.pas:141). | No single scalar counterpart: composed each step from `uPixelSizeBase = height*2/viewportY` (UniformManager.ts:342) × d × (uPixelThreshold/effectiveDetail). Defaults uPixelThreshold 0.5, uDetail 1.0. | MB3D ships one authored world-distance scalar; GMT recomputes a screen-relative epsilon from camera geometry every step. The importer must collapse the former into GMT's quality knobs (HT-5). |
| HT-4 | **Depth-scaling factor `mctDEstopFactor` has NO GMT analog — silently dropped.** | `if bVaryDEstop then mctDEstopFactor := GetDEstopFactor(@Header) else mctDEstopFactor := 0` (HeaderTrafos.pas:861-862); `bVaryDEstop := (bVaryDEstopOnFOV <> 0)` (HeaderTrafos.pas:567); GetDEstopFactor builds a FOV/zoom/z-range ratio from `dStepWidth` (HeaderTrafos.pas:58-72, line 70). The live marcher consumes it every step via `msDEstop := DEstop * (1 + mZZ * mctDEstopFactor)` (CalcThread.pas:155/192/221). | Grep of engine-gmt for `bVaryDEstop\|mctDEstopFactor\|DEstopFactor\|varyDEstop` → **zero matches**; parser reads `deStop: dv.getFloat32(177)` (parseMB3D.ts:343) but **never offset 178** (`bVaryDEstopOnFOV`). *(Positive anchor: `parseMB3D` does extract the neighbouring quality bytes — `deStop` @177, `bStepsafterDEStop` @134, `rStop`, iterations — so the omission is byte 178 specifically, not the whole quality block.)* | An MB3D scene with **Vary-DEstop-on-FOV ON** loses its depth-dependent detail falloff on import — GMT renders the whole depth range at constant screen-pixel detail. **A structural omission rather than a calibration error** *(magnitude unconfirmed — the importer's own detail-sweep canary showed the dropped depth-degradation is NOT the cause of Theli's missing background half-spheres; which corpus scenes set byte 178 needs reading it, which the parser doesn't).* |
| HT-5 | **Importer bridge: world-absolute DEstop → screen-relative detail (calibrated, lossy).** | `Result.msDEstop := MaxCS(s0001, sDEstop)` (HeaderTrafos.pas:535) — the one authored scalar. | `if (h2.deStop > 0) sceneQuality.detail = min(6, max(1, 3.3 / max(0.1, deStop)))` (emitFusedHybrid.ts:372). The 3.3 numerator is an explicitly reference-CALIBRATED fit (different spaces, no closed form, emitFusedHybrid.ts:365-367); uPixelThreshold/uPixelSizeBase left at defaults. | Silhouette/hit density approximately matched at mid-depth where calibration was tuned; **diverges at depth extremes and under heavy FOV/zoom** (the regimes mctDEstopFactor governed). One MB3D scalar → one GMT knob. |
| HT-6 | **Normal-probe depth scaling tracks the hit-threshold divergence.** | `Noffset := MinCS(1, DEstop)*(1 + mZZ*mctDEstopFactor)*0.15` (Calc.pas:794) — normal probe widens with depth via the **same** mctDEstopFactor. | Normal eps depth-scales through the depth-invariant screen footprint instead: `pixelSizeScale = uPixelSizeBase/uInternalScale`, `orthoPixelFootprint = ortho ? pixelSizeScale : pixelSizeScale*d`, `eps = max(floatLimit, orthoPixelFootprint/uDetail)` (material_eval.ts:63-72). | At depth, MB3D normals are computed over a wider (coarser) probe → smoother far shading; GMT's normal probe stays screen-constant → far surfaces keep crisp (potentially noisier) normals. **One imported scalar (uDetail) drives BOTH GMT's hit threshold and normal width**, where MB3D drives them with two independent mechanisms. |
| HT-7 | **GMT's `floatPrecision` is a second floor with no MB3D counterpart.** | `msDEstop` has only the fixed authored lower clamp `MaxCS(0.001, sDEstop)` (HeaderTrafos.pas:535) — a world floor, double precision throughout. | `finalEps = max(threshold, floatPrecision)`, `floatPrecision = max(1.0e-20, distFromFractalOrigin*PRECISION_RATIO_HIGH)` (5e-7) — a float-robustness floor scaling with distance from the **fractal origin** (not camera depth), guarding f32 cancellation (trace.ts:24-28; math.ts:161). | At very deep zoom GMT's hit epsilon is forced **up** by floatPrecision to avoid f32 noise, **capping resolvable detail**; MB3D keeps a constant 0.001 world floor. Different mechanisms (numeric-robustness vs authored-minimum), bite in different regimes. |
| HT-8 | **Shared zoom constant routed to different subsystems.** | `dStepWidth := 2.1345 / (dZoom*Width)` (DivUtils.pas:1029) feeds GetDEstopFactor→mctDEstopFactor (HeaderTrafos.pas:63-70) which scales `msDEstop` per step. | Identical `stepWidth = 2.1345/(zoom*width)` in mapCamera (mapCamera.ts:103) used **only** for eye/view-plane pushback — never the hit epsilon (trace.ts composes finalEps purely from uPixelSizeBase/uPixelThreshold/uDetail/d). | Zoom changes MB3D's effective hit threshold (coarser as you zoom out / at the far plane); in GMT zoom only moves the camera, detail stays screen-pixel-constant. **The mechanism behind HT-1/HT-4.** |

---

## 5. Normals & post-hit refinement

Normal probe scale/stencil, and surface refinement availability. The importer maps
**none** of MB3D's normal model and **drops** MB3D's refinement wiring, substituting
a different (forward-miss) recovery mechanism.

> **Dispatch note (re-anchored).** The live marcher computes normals via an
> **indirect function pointer** — `TCalculateNormalsFunc(pCalcNormals)(MCTparas, RSFmul)`
> (CalcThread.pas:243), not a hard-coded call from the dead `RayMarch`. `pCalcNormals`
> is assigned **once** at load (HeaderTrafos.pas:959-960): `RMCalculateNormals`
> (`Calc.pas:776`, when `NormalsOnDE`) else `RMCalculateNormalsOnSmoothIt`
> (`Calc.pas:904`). The `Calc.pas:794` / `:799-816` / `:833-835` lines cited below
> are inside `RMCalculateNormals` — a **live** funcptr target reached through the
> pointer, not the direct call the abandoned `RayMarch` made.

| # | Divergence | MB3D behaviour [file:line] | GMT behaviour [file:line] | Rendered consequence |
|---|------------|----------------------------|---------------------------|----------------------|
| NR-1 | **Normal probe scale: 0.15-of-hit-threshold (MB3D) vs pixel-footprint/precision (GMT).** | `Noffset := MinCS(1, DEstop)*(1 + mZZ*mctDEstopFactor)*0.15` (Calc.pas:794) — a fixed 0.15 fraction of the clamped, depth-rescaled hit threshold; `DEstop = MaxCS(0.001, sDEstop)` (HeaderTrafos.pas:535-536). | `eps = max(floatLimit = distFromFractalOrigin*5e-7, visualLimit = orthoPixelFootprint/uDetail)` (material_eval.ts:63-72) — no 0.15 factor, no tie to the hit threshold. | MB3D's normal smoothness tracks the convergence threshold; GMT's tracks screen-pixel size + zoom depth. GMT typically probes at a **smaller absolute offset** → reads finer micro-relief MB3D didn't, and is **more sensitive to a fragmented iso-surface** (the DsyneGrafix "dust" class). |
| NR-2 | **Conditional depth scaling (MB3D, off by default) vs unconditional (GMT).** | Scaled by `(1 + mZZ*mctDEstopFactor)`; mctDEstopFactor = 0 unless `bVaryDEstopOnFOV` set (HeaderTrafos.pas:861-862), so a default scene uses a **depth-invariant** `MinCS(1,DEstop)*0.15`. | floatLimit ∝ distFromFractalOrigin and perspective visualLimit ∝ d (material_eval.ts:67-70) — depth scaling **always on**. | A default MB3D scene holds normals fixed with depth; GMT always widens the probe at depth → on deep-zoom imports GMT normals coarsen with distance even though the source held them fixed. (Importer reproduces neither the model nor the gating — NR-4.) |
| NR-3 | **Normal stencil: header-selectable (MB3D) vs compile-fixed (GMT).** | `iSmNormals = (iOptions shr 6) and 15` (HeaderTrafos.pas:534) picks at runtime: =8 → 5×5×5 sparse 124-tap stencil (`StepSNorm = Noffset*1.3333`, `ScaleVectorV(@N, 0.0075)`, Calc.pas:799-816); <8 → 6-tap central diff; >0 → extra roughness-smoothing pass that **doubles Noffset** (Calc.pas:833-835). | Branches only on compile constant `NUMERIC_DE`: analytic tetrahedron 4-tap (GetNormal) / forward-diff 4-tap (GetFastNormal), or numeric 6-tap central diff at `eps*3.0` (material_eval.ts:8-26; de.ts:210-227). | An MB3D scene authored with `iSmNormals=8` (smooth HQ normals) or the roughness pass active **loses that exact filtering** on import; GMT renders with its fixed 4-tap (or 6-tap numeric) normal regardless → different micro-surface smoothness/roughness vs the MB3D reference. |
| NR-4 | **Importer maps NOTHING of MB3D's normal model.** | `iSmNormals` exists (HeaderTrafos.pas:534) but parseMB3D never extracts it. | Grep of engine-gmt/utils/mb3d for `iSmNormals\|smNormals\|Noffset\|normalEps` → **zero**; emitFusedHybrid sets no normal param (`preset.features.quality = {...q, ...sceneQuality}`, emitFusedHybrid.ts:408, no normal key); GMT always uses default kernel + `eps = max(floatLimit, visualLimit)` (material_eval.ts:72). | Every NR-1…NR-3 divergence (0.15-of-threshold scale, conditional depth scaling, iSmNormals stencil/roughness) is **silently dropped** on import. Imported normals = whatever the default analytic-tetrahedron path produces at the pixel-footprint eps. |
| RF-1 | **Post-hit refinement availability: runtime header byte (MB3D) vs compile flag (GMT) — both OFF by default.** | Both refiners gated `iDEAddSteps <> 0` = header `bStepsafterDEStop` @134, default 0 → live set-found branch skips refinement (`if iDEAddSteps <> 0 then …`, CalcThread.pas:235-238; HeaderTrafos.pas:538). | `refineEnabled` boolean default false, `onUpdate:'compile'` (quality.ts:221-225); when false the entire refine block is empty → byte-identical kernel (trace.ts:12-16). | Common case (both 0/false) → **neither refines, they agree**. Divergence bites only when an MB3D scene authored `bStepsafterDEStop>0`: MB3D refined it, GMT imports with refinement OFF (RF-3), so any "dust" MB3D's bisection cleaned reappears in GMT. MB3D's gate travels with the scene file; GMT's lives in the UI. |
| RF-2 | **Refinement algorithm (DE-crossing): same family, different damping/tolerance.** | Live `RMdoBinSearch` is x87 asm (Calc.pas:1699-1805; the Pascal above is commented out): halve `RLastStepWidth` (`fmul sm05`, Calc.pas:1725-1726), per-step rescale `msDEstop`, damp next step by **0.55** toward the crossing (`fmul s055`, Calc.pas:1775-1781), **early-exit** on `|dTmp − msDEstop| ≤ 0.001` (Calc.pas:1787-1793). | Plain midpoint bisection `dMid = 0.5*(dOut+dIn)` on the finalEps crossing, fixed `uRefineSteps` (≤8) iterations, **no tolerance exit**, **no per-step rescale**, via geometry-only `mapDist` (trace.ts:68-79). | Both correct backward root-finds; refined depth differs **sub-step**. On a sharply-curved/thin surface they land at marginally different points — a fidelity-tuning difference, **not** an artifact divergence. |
| RF-3 | **Importer DROPS bStepsafterDEStop wiring, substitutes overstepTolerance.** | `bStepsafterDEStop` @134 parsed (parseMB3D.ts:345) but consumed by NO importer code; MB3D's refinement is a post-HIT **backward** DE bisection (live call `RMdoBinSearch(MCTparas, dTmp, RLastStepWidth)`, CalcThread.pas:237). | Explicitly declines to map it to `quality.refineSteps` (2026-06-27 canary: refinement doesn't fix DsyneGrafix dust, emitFusedHybrid.ts:399-401); instead hardcodes `sceneQuality.overstepTolerance = 2.0` (emitFusedHybrid.ts:393) — a post-MISS **forward** snap-back. | Structurally opposite mechanisms sharing the intent (recover a thin surface a coarse step misresolves): MB3D refines a surface already **crossed**; GMT recovers a surface **missed** if closest approach came within (1+2.0)×eps. A scene that relied on MB3D's backward bisection gets GMT's miss-recovery, which can localize the surface differently or not at all where the ray never came within 3×eps. |
| RF-4 | **MB3D's iteration-count refiner `RMdoBinSearchIt` has no GMT analog.** | When the hit was iteration-limited (`DElimited` false) MB3D runs `RMdoBinSearchIt(MCTparas, mZZ)` (live call CalcThread.pas:238; `DElimited := (ItResultI < MaxItsResult) or (dTmp < msDEstop)`, :234), secant-searching the ray for `YP := maxIt − 0.99` on the **smooth iteration-count** field, not distance (proc body Calc.pas:1049, 1083-1086). | refine block only ever bisects the **distance** crossing (`hMid < finalEps`, trace.ts:73-77); no iteration-count refiner. | For iteration-limited surfaces (bounded interiors / dIFS where MB3D auto-raises iDEAddSteps), MB3D pins the surface onto the `maxIt−0.99` smooth-iteration isocontour; GMT (if refinement is even on, which on import it isn't) pins onto a distance isocontour → **different interior boundary** for these scenes. |
| RF-5 | **Refinement step-count semantics diverge.** *(AMENDED — live DE refiner runs FULL iDEAddSteps, not `shr 1`.)* | Live `RMdoBinSearch` (asm) loads the **full** iDEAddSteps into the loop counter (Calc.pas:1724, no halving — the `iDEAddSteps shr 1` form is only in the commented-out Pascal at Calc.pas:1647 and the separate `RMdoSecantSearch` at Calc.pas:1615); `RMdoBinSearchIt` likewise runs the full count (Calc.pas:1055). dIFS auto-raises iDEAddSteps to ≥ `Round(MinCS(1,sZstepDiv)*2)+2` (HeaderTrafos.pas:899). | `uRefineSteps` default 4.0, range 1-8 (quality.ts:234-236), compile-capped by `REFINE_HARD_CAP = 8` with an importer-cap comment (constants.ts:26-31); but since the importer doesn't map bStepsafterDEStop (RF-3), imported scenes inherit **zero** refinement steps unless the user enables it. | MB3D's refinement effort is scene-authored (full iDEAddSteps) and dIFS-boosted; GMT's is a fixed 1-8 dial imported scenes never inherit. A dIFS scene MB3D refined with ~4 backward iterations imports with zero refinement unless the user turns it on. |
| RF-6 | **Both refiners are strictly post-hit/backward — neither extends reach.** *(Confirmation, same as MR-7.)* | `RMdoBinSearch`/`RMdoBinSearchIt` run only inside the live set-found branch (gated CalcThread.pas:235), then `Break` out of the march (CalcThread.pas:251). | refine block runs only inside `if (h.x < finalEps)`, bracketing [dPrev outside, d inside] and bisecting backward (trace.ts:164-174). | Refutes "binary search reaches the back geometry" on both sides. The importer dropping refinement (RF-3) **cannot** be the cause of cut-off back-of-model geometry — that's the march-budget problem handled by MR-8 (fudge floor 0.4 + overstepTolerance 2.0 + maxSteps 1500-2000). |

---

## 6. Refuted "false divergences" (places the engines actually AGREE)

These were investigated and found to be matches, not divergences — recorded so
future passes don't re-chase them. (Several were historical theories that this
importer's debugging graveyard has already killed.)

- **"Per-pixel iteration count is a sum of per-slot counts."** FALSE on both
  sides. MB3D caps on `ItResultI` vs header Iterations (formulas.pas:3465-3471);
  GMT caps on the loop index `i` vs `uIterations` (de.ts:294-295). The weave
  cursor is ported faithfully (IT-2, IT-8) — same slot at the same iteration
  index per pixel.

- **"GMT iterates the fused weave a different number of times per pixel."** FALSE
  for supported scenes — GMT `i` == MB3D `ItResultI` step-for-step (IT-2), the
  weave wrap (EndTo/RepeatFrom) is replicated (IT-8), and the DE is produced by
  the same full-weave re-iteration per eval at the same cap (IT-10). The only
  per-pixel-count differences are the edge cases IT-1 (>2000 clamp), IT-3 (cover
  floor), and IT-6 (dIFS +1).

- **"Binary search / surface refinement reaches the back of the model."** FALSE
  on both sides. Both engines' refiners are strictly post-hit and converge
  *backward* onto already-bracketed geometry (MR-7, RF-6); neither discovers new
  far geometry. The back-cut is a march-*budget* problem (MR-1/MR-8), not a
  refinement problem.

- **Numeric DE math is the divergence.** FALSE — `CalcDEnoADE` (Calc.pas:503) is a
  **faithful but probe-invariant-adapted** port of GMT's `numericDistance`
  (de.ts:190-202, esp. :200). Not byte-for-byte: GMT adds a probe `e` numerator
  factor and an `e*0.06` denominator term that make the magnitude probe-invariant
  (see the gmt-spec amendment). The DE-3 divergence is the **routing decision**
  (MB3D auto-falls to numeric on the dr-gap; GMT keeps an analytic estimator and
  makes numeric a manual opt-in), not the numeric formula.

- **Escape-radius semantics differ.** FALSE — both escape on squared radius vs
  RStop² (IT-7); matched for mid-range RStop, differing only by GMT's [16,1000]
  clamp and dIFS exemption.

- **The hit predicate differs in shape.** FALSE — both are `DE < threshold`
  (HT-2). What genuinely differs is the threshold's *units and depth behaviour*
  (HT-1), not the comparison.

- **DEoption-11 / DE-estimator choice was the cause of an evolving-Scale-vary
  failure** (Ellarien "Shrooms"). FALSE (red herring per the importer history) —
  the real cause was a dropped per-iteration `inc [bFirstIt]` memory write in the
  decompiler, not the DE option.

---

## 7. Open questions (need a runtime trace to settle — not blocking)

- **Distance bound — SOURCE-SETTLED (was "MaxRayLength needs harness").** The live
  loop bound is `Zend := MaxCD(1e-10, (dZend − dZstart) / StepWidth)`
  (HeaderTrafos.pas:779), **fully derivable from header fields** — the dead
  `RayMarch`'s opaque caller-supplied `MaxRayLength` is NOT the live bound. So the
  open question is no longer "what is the bound"; it is the narrower **Zend ↔
  MAX_DIST=10000 / BOUNDING_RADIUS=400 relationship** (MR-3): compute MB3D's per-scene
  `Zend` from the header and check whether it ever pushes geometry past GMT's fixed
  envelope. Still needing header reads the parser doesn't do: which corpus scenes set
  `bVaryDEstopOnFOV` (byte 178) / `iSmNormals=8` / `bStepsafterDEStop>0`. An
  instrumented Free-Pascal vs GMT side-by-side step/threshold trace on a back-cut
  scene (Theli / TimeMachine) would still pin the visual magnitude.

- **Quantitative reach equivalence** (MR-8): whether the 1500-step / 0.4-fudge /
  2.0-overstep bridge actually reaches the same far surface MB3D reaches on the
  named back-cut scenes — round-2 commits claim full-volume on Theli/TimeMachine
  but only ~15/21 scenes are certified; an instrumented step-count-vs-world-depth
  trace would settle it.

- **Visual magnitude of the small off-by-ones** (IT-6 dIFS +1, IT-9 ColorOnIt,
  HT-4 dropped depth-degradation): confirmed source divergences, magnitude
  unquantified — A/B renders would settle whether any warrants porting. The
  importer's own detail-sweep canary already showed the dropped depth-degradation
  is **not** the cause of Theli's missing background half-spheres (those are
  accumulation-limited, not hit-eps-limited).

---

## 8. Shading & colour — known gap (NOT covered here)

This table covers **render geometry** (marcher, step, termination, DE, normals,
hit-detection, refinement). It does **not** do a divergence pass over the
**render-side colour/shading** path — orbit-trap → palette mapping, tone-map, and
fog/glow as *applied* in the marcher vs GMT.

- **Shading / material / colour IMPORT** is covered separately by
  [`lighting-import-spec.md`](./lighting-import-spec.md).
- The **render-side colour/shading DIVERGENCE** is a **named follow-up**, explicitly
  out of scope for these four render-geometry docs. The live marcher touches it at
  e.g. `RMdoColor` (CalcThread.pas:169/247), `CalcZposAndRough` (:248), and the
  `StepCount`-derived volumetric shadow (:256-257) — but a full orbit-trap→palette /
  tone-map / fog-glow divergence pass has not been done.

This is a coverage gap, not a resolved item. See `render-pipeline-CORRECTIONS.md` §"Shading
& colour — known gap" and `lighting-import-spec.md` for the import side; the render-side
colour divergence remains open.
