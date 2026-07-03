# MB3D → GMT Render-Conversion Plan

> **IMPLEMENTED 2026-06-29 — the MB3D-faithful marcher (ADR-0088).** The headline `[engine]`
> lever — render imports with MB3D's *actual* march convergence dynamics — is built: a compile-
> gated marcher in `trace.ts` that ports MB3D's overstep clamp + RSFmul damper + msDEsub safety-
> subtraction (`CalcThread.pas:196-230`) onto GMT's world-unit threshold, enabled by the importer
> for every real `.m3p` import. KEY finding that shaped it: MB3D's marcher constants are
> **stepWidth-normalized**, so we port the dimensionless *dynamics* (the dust fix) and reuse GMT's
> world-unit `finalEps`/step-floor rather than MB3D's absolute `s011`/`msDEstop`. Gates green
> (typecheck, mb3d 24, weave 58, smoke:boot, faithful GLSL parses); **pending GPU visual verify**
> on the dust scenes (DsyneGrafix, Recycledrelatives/Oxnot) + a re-glance at the certified set.
> NB: the "raise the 2000 step cap" reach lever (cluster A) was DEMOTED — `uMaxSteps` is a user
> slider, not a hard cap, so the back-cut is "turn up Max Steps," not a render-math gap.
>
> **Provenance correction (2026-06-28):** re-anchored from the dead `Calc.pas` `RayMarch` to the
> live `CalcThread.pas` `TMandCalcThread.Execute` marcher — see `render-pipeline-CORRECTIONS.md`
> (authoritative). The substantive changes: the step formula (now carries an `msDEsub·msDEstop`
> safety subtraction + an `s011` floor), the termination bound (`Zend` is source-settled, not a
> harness item), the `msDEstop` depth scaling (on `mZZ`, not a projected `ActZpos`), and the
> normals funcptr dispatch. The max-step clamp and the fudge-floor-0.4 fix are byte-identical
> on the live path and survive unchanged.
>
> **What this is.** The synthesis layer above the divergence catalogue: *exactly what GMT
> must change* to render imported MB3D scenes the way MB3D renders them. Every item closes a
> named row in `render-divergence.md`, names the concrete edit (file + change), states the
> engineering cost/tradeoff, and estimates which residual scenes it fixes. Items are tagged
> `[engine]` (kernel/marcher/DE/estimator — `trace.ts`/`de.ts`/`core_math.ts`),
> `[importer]` (header→quality mapping — `utils/mb3d/*`), or `[architectural]` (a fundamental
> renderer mismatch with a real tradeoff). The list is **prioritized by residual-scenes-fixed**,
> grouped by the four open clusters. A closing section honestly separates what source-reading
> settles from what genuinely needs an **instrumented Free-Pascal harness**.
>
> **Inputs.** `render-divergence.md` (the divergence table — authority for every "closes DV-N"
> link), `mb3d-render-pipeline-spec.md` + `gmt-render-pipeline-spec.md` (the two specs),
> `EXECUTION-STATUS.md` + `dsyne-de-fidelity-findings.md` + `binary-search-de-spec.md` +
> `coverage-unlocks.md` (scene-level context). **Source remains authority for all render claims.**
>
> **Standing facts that bound the whole plan (from the specs, do not re-litigate):**
> - The back-cut is a **march-budget** problem, not a refinement problem. Both engines' refiners
>   are strictly post-hit/backward (MR-7, RF-6) — neither discovers far geometry. Reach is only
>   extended by raising the step budget (MR-8).
> - GMT can **never** exceed `MAX_HARD_ITERATIONS` (2000 desktop / 256 mobile) march steps per
>   ray (MR-4). The cap exists for the GPU watchdog/TDR, not fidelity — but it is a hard reach
>   ceiling MB3D's distance-terminated `repeat…until` does not have.
> - The dr-gap / dust class is a **DE-routing** decision, not a numeric-formula bug: GMT's
>   `numericDistance` is a **faithful but probe-invariant-adapted** port of MB3D's numeric DE
>   (DE-3, §5 gmt-spec). MB3D `Calc.pas:503` = `bufRout*Ln(bufRout)*dDEscale/(Sqrt(Rst+wt+dt)+
>   mctDEoffset006)`; GMT `de.ts:200` = `R0*log(...)*uNumDEeps*e/(g+e*0.06)` — GMT adds an `e`
>   numerator factor + an `e*0.06` denom term for probe-invariance. The divergence is
>   *auto-route-to-numeric (MB3D) vs manual opt-in (GMT)*, **not** the formula.
> - The current importer already bridges the *easy* part of the back-cut: fudge floor 0.4 +
>   overstepTolerance 2.0 + maxSteps 1500-2000 (MR-8). Round-2 claims full-volume on
>   Theli/TimeMachine but only ~15/21 scenes are certified — the residual is quantitative.

---

## 0. Residual scene ledger (what's still wrong, and which cluster owns it)

Distilled from `EXECUTION-STATUS.md` decisions log + the round-2 session notes. "Residual" =
imports but renders wrong vs the MB3D reference (not "blocked at parse/decompile" — that's the
`coverage-unlocks.md` roadmap, a different axis).

| Scene | Symptom | Cluster | Current state |
|---|---|---|---|
| **Theli-At** | back of model cut off; bg Menger half-spheres missing | March reach (+ HT/accum) | A1 bridge applied; "full volume" claimed, not certified; bg is accumulation-driven |
| **TimeMachine** | back of model cut off | March reach | A1 bridge applied; claimed fixed |
| **Hal-Tenny** (Resistance / FoN) | FoN renders **empty**; Resistance imports | March reach + dr-gap (heterogeneous) | FoN is a *different* bug (empty, not cut) — has Integer-Power deriv |
| **Hyperben2** | extra foreground Menger slab + washout | Hyperben2 (own cluster) | spec hypothesis FALSIFIED; cause is camera-framing / intern-box DE / S1 est |
| **Oxnot** | black / dust (true no-deriv weave) | dr-gap trio | est7 leaves it fragmented |
| **Recycledrelatives** | black; sparse fan, fragmented iso-surface | dr-gap trio | DE-fidelity residual; glow exposes correct-position fan |
| **Melting spot bloxx** | was black (4D w/dr conflation) | dr-gap trio | FIXED `34033d4`; residual is colour tint |
| **DsyneGrafix - Getting Loopy** | dust (orbit-collapse, IdesFormula) | DsyneGrafix (dust/refine) | est7 @ numDEeps≈0.1 recovers it; not statically detectable |
| **Abominog** | under-resolved far detail; mono-green | March reach / HT (accum) + colour | geometry correct; detail unresponsive (convergence-bound) |
| **Wada basin** | was ~40 spheres in a torus | (coverage — closed) | FIXED (iter cover-floor `826be3e` + [CONSTANTS] `bf81087`) |

Two cross-cutting truths from the ledger that re-shape the priority order below:
1. **The "dr-gap trio" is not one class.** The precise *no-slot-produces-a-derivative* detector
   selects **only Oxnot**. Recycledrelatives (has deriv, fragmented), Hal-Tenny FoN (has deriv,
   empty), DsyneGrafix (has deriv, orbit-collapse) are heterogeneous. A blanket auto-route fixes
   at most one and regresses the ~5 dr-gap scenes that already render. (EXECUTION-STATUS round-2.)
2. **Theli's missing *background* is accumulation-limited, not march/HT-limited.** A detail sweep
   ∈ {4.1, 8, 10} left the bg half-spheres unchanged; they are grazing high-variance far surfaces
   that resolve with samples. So the reach work fixes the *back-cut*, not the *background*.

---

## 1. CLUSTER A — March reach (Theli / Hal-Tenny / TimeMachine back-cut)  ·  **highest residual-scenes-fixed**

The single most consequential cluster (MR-1…MR-9). The importer bridge (MR-8) is already
landed; what remains is (A1) **certifying** it quantitatively, then (A2/A3) closing the
*structural* reach ceiling that the bridge cannot, for the densest scenes.

### A1 — Certify the existing reach bridge (no code; instrumented trace)  ·  **[engine-verify]**
- **Closes:** MR-1, MR-8 (verification, not new code). The catalogue's open question §7 item 2.
- **Concrete work:** an instrumented Free-Pascal build of the **live** marcher
  (`CalcThread.pas:128-258` `TMandCalcThread.Execute`, the inlined march loop — **not** the dead
  `Calc.pas` `RayMarch`) + GMT side-by-side step/world-depth trace on Theli and TimeMachine. Dump,
  per ray at a few canonical pixels: MB3D accumulated ray distance `mZZ` at loop exit
  (`CalcThread.pas:219` accumulator, `:253` `until (mZZ > Zend)`) vs GMT `d` at loop exit, and the
  step *count* each took to cross the volume. Confirm GMT's 1500-2000 budget at fudge 0.4 actually
  reaches the same far surface `mZZ` reaches before crossing `Zend`.
- **Cost/tradeoff:** harness build only (see final section). No render-pipeline change. This is
  the cheapest way to convert "claimed full-volume" → "certified," and it tells us whether A2/A3
  are even needed (if the bridge already reaches, the residual back-cut scenes are A2/A3-bound;
  if not, the bridge constants need retuning).
- **Scenes:** confirms/denies Theli + TimeMachine (2). The back-cut itself, not the bg.

### A2 — Raise the desktop hard cap with a TDR-safe budget  ·  **[engine]** + **[importer]**
- **Closes:** MR-4 (compile-time unroll ceiling = structural reach ceiling), MR-1 for scenes
  whose volume genuinely needs >2000 coarse steps.
- **Concrete edit:**
  - `data/constants.ts:21-22` — `DEFAULT_HARD_CAP` is currently 2000. The cap is a *compile-time*
    `#define MAX_HARD_ITERATIONS`; the spec records the load-bearing fact "**ANGLE/D3D does not
    unroll define-bounded loops**" (quality.ts:51-59) — so raising the cap costs **compile time
    ~nothing**, only raises the loop's static upper bound. Candidate: expose a higher ceiling
    (e.g. 4000) *gated behind a quality knob*, NOT a blanket raise.
  - `engine-gmt/utils/mb3d/emitFusedHybrid.ts:398` — the importer's
    `maxSteps = min(2000, max(1500, round(750/fudge)))` clamp would lift to the new ceiling for
    authored-quality scenes only.
- **Cost/tradeoff — the real one is runtime, not compile.** `uMaxSteps` is the per-frame
  terminator; a ray that actually *runs* 4000 DE evals per pixel on a dense Menger scene can trip
  the **Windows GPU watchdog (TDR) → desktop freeze** (the documented 3D-deepzoom hazard; memory
  `project_golden_problem_prep` — full-res deep render trips the watchdog). So the raise must be
  (a) opt-in per scene, (b) paired with adaptive-resolution downscale so the per-frame GPU draw
  stays under the TDR budget, and (c) NOT applied on mobile (`MOBILE_HARD_CAP=256` stays). This
  is why A2 ranks below A1: A1 may show 2000 already suffices at fudge 0.4, making A2 unnecessary.
- **Scenes:** the *residual* back-cut scenes A1 shows still cut at 2000 (likely Theli's densest
  interior, possibly Hal-Tenny). Estimate 1-2 beyond what A1 certifies.

### A3 — Port the depth-coupled auto-coarsening (reach-in-budget)  ·  **[engine]** + **[importer]**
- **Closes:** MR-9 (dynamic depth-rescaled forward floor), and indirectly MR-1 by extending reach
  *without* raising the step count — the MB3D mechanism that keeps reach in budget.
- **The divergence:** MB3D auto-coarsens **both** the hit threshold and the max-step clamp with
  accumulated marched depth (`msDEstop := DEstop * (1 + mZZ·mctDEstopFactor)`,
  `CalcThread.pas:221` — scaling directly on the accumulated ray distance `mZZ`, re-evaluated every
  step, **not** on a projected `ActZpos`; `dT1 := MaxCS(msDEstop,0.4)·mctMH04ZSD`,
  `CalcThread.pas:201`). `mctDEstopFactor := GetDEstopFactor(@Header)` when `bVaryDEstop` else `0`
  (`HeaderTrafos.pas:861-862`). GMT's only depth-coupled term is `floatPrecision` as a *lower* floor
  (trace.ts:213) — it raises the *minimum* step, never coarsens. So deep GMT scenes still bottom out
  on the fixed budget where MB3D coarsens past them.
- **Concrete edit:** add a depth-scaled coarsening factor to GMT's step + hit-eps, driven by an
  imported `mctDEstopFactor` analog. Kernel: in `trace.ts` step advance (line 213) and finalEps
  (line 161), multiply by `(1 + depthTerm * uDepthCoarsen)` where `depthTerm` is GMT's accumulated
  march distance `d` — the direct analog of the live MB3D term `mZZ` (NB the *live* marcher scales
  on accumulated ray distance `mZZ`, `CalcThread.pas:221`, **not** the dead path's projected
  `ActZpos`, so a plain `d` is the faithful match — no `dot(rd, viewAxis)` projection needed).
  Importer: read header
  `bVaryDEstopOnFOV` (@178, **currently never parsed** — parseMB3D reads only @177, see HT-4) and
  derive `uDepthCoarsen` via a port of `GetDEstopFactor` (HeaderTrafos.pas:58-72; FOV/zoom/z-range
  ratio with floor `d1d6 = 1/6`).
- **Cost/tradeoff:** medium. (1) This is the **only** mechanism that closes HT-4 (the silently-
  dropped depth-degradation) *and* helps reach simultaneously — one imported scalar drives both,
  exactly as MB3D drives `msDEstop` and `Noffset` from `mctDEstopFactor`. (2) Risk: GMT's hit-eps
  is screen-relative by design (HT-1); adding MB3D's world-depth coarsening *changes the look* on
  deep scenes (far surfaces soften). That's faithful-to-MB3D but a divergence from GMT's "hold
  sharp at all scales" intent — a **look call** the user must verify. (3) The importer's own
  detail-sweep canary already showed dropping the depth-degradation is **not** the cause of Theli's
  missing bg half-spheres — so A3's *fidelity* payoff is on deep-zoom scenes generally, while its
  *reach* payoff overlaps A2. Sequence A3 after A1/A2 prove the reach gap survives the cheaper fixes.
- **Scenes:** any deep-zoom import with `bVaryDEstopOnFOV` set (count unknown — parser never reads
  the byte; see harness section). Faithful-look improvement on Theli/TimeMachine/Abominog at depth;
  reach contribution overlaps A2.

> **Cluster A net:** A1 certifies 2 (Theli/TimeMachine back-cut) at zero render-code cost. A2/A3
> are the structural follow-ons for whatever A1 shows still cut, gated on the TDR tradeoff and a
> look call. **Do A1 first — it may retire A2 entirely.**

---

## 2. CLUSTER B — The dr-gap trio (Oxnot / Recycledrelatives / Melting — DE selection)

DE-1, DE-2, DE-3. The catalogue and the round-2 session agree: this is a **routing** problem,
and the "one lever, six scenes" framing is **falsified**. The scenes are heterogeneous, so the
fixes are per-symptom, not one auto-route.

### B1 — Statically-detectable orbit-collapse → auto-route to numeric est7  ·  **[importer]**
- **Closes:** DE-2, DE-3 for the *detectable* subset only.
- **The constraint (from EXECUTION-STATUS round-2 + gmt-spec §9.5):** a *blanket* missing-dr→est7
  auto-route over-routes — 10/20 sample scenes carry a non-analytic slot but most render cleanly
  analytically; numeric only ADDS speckle + ~4× cost (some 30s+). ADR-0085's documented concern.
  So GMT deliberately keeps numeric a **manual opt-in** (emitFusedHybrid.ts:317-327).
- **Concrete edit (narrow, not blanket):** detect the *genuine orbit-collapse* signature at
  import time — a weave slot whose decompiled body zeroes ≥2 output axes given the scene's authored
  options + Julia seed (DsyneGrafix: IdesFormula with `Y_mul=Z_mul=0` and `cy=cz=0` pins the orbit
  to the x-axis → 1-D set → fragmented DE; dsyne-findings §2). When detected, set
  `quality.estimator = 7` and `numDEeps` from the scene's `dDEscale`. Site: a new guard in
  `emitFusedHybrid.ts` alongside the existing est-selection block (~317).
- **Cost/tradeoff:** medium-risk static analysis. (1) The collapse is *option-dependent*, so the
  detector must evaluate the decompiled body's axis-output symbolically against the packed consts —
  non-trivial but bounded (the decompiler already has the body + const map). (2) **The `dDEscale`
  port is NOT 1:1** — DsyneGrafix's MB3D scene `dDEscale` is 0.95 (iter-weighted slot avg,
  HeaderTrafos.pas:715/770) but `numDEeps=0.95` renders flat mush (sig 40) while 0.1 gives the good
  render (sig 87) — a ~10× calibration gap (round-2). So even when routed, the magnitude knob needs
  a calibration the source doesn't directly give. Until that's settled, B1 is **risky to auto-set**.
- **Scenes:** DsyneGrafix (1) cleanly, *if* the magnitude calibration is pinned. Net: **defer to
  manual opt-in** (current state) unless the harness settles the dDEscale→numDEeps mapping. This
  item is honestly a "report partial" — the spec's own conclusion.

### B2 — Fragmented-iso-surface residual (Recycledrelatives, Oxnot)  ·  **[engine]** (DE-fidelity, hard)
- **Closes:** the DE-3 *residual* that routing does NOT fix.
- **Why routing fails here:** Recycledrelatives has a deriv-producing slot, so it's not the
  no-dr case; its fused ABoxMod1+ABoxModKali Julia weave resolves the fan as sparse POINTS, not a
  solid surface (FIX 2 round-1). est7 and finer fudge do NOT solidify it — same DE-fidelity class
  as the DsyneGrafix dust. Oxnot is the true no-deriv case but est7 *still* leaves it fragmented.
- **Concrete edit:** none clean exists. The honest options: (a) the **two-orbit / DE-combine
  kernel** (Cluster context — U7 is the same engine-core `DE_MASTER` seam) if these scenes' fans
  come from a combine the single-orbit kernel can't express; (b) a genuinely better fused-DE for
  the mixed-fold weave (research-grade). (c) Ship `glow` exposure as the user-facing workaround
  (the correctly-positioned sparse fan is viewable at glow=4).
- **Cost/tradeoff:** high / research-grade. This is the deepest residual in the corpus. Not a
  parameter tweak. **Defer** behind A and the cheaper B/C/D items; flag as a permanent-ish DE-
  fidelity gap with the glow workaround documented.
- **Scenes:** Recycledrelatives, Oxnot (2) — but as research, not a near-term fix.

### B3 — Hal-Tenny FoN "empty" — separate root-cause hunt  ·  **[importer/engine]** (diagnose first)
- **Closes:** an *uncategorized* residual the dr-gap framing mis-bucketed.
- **State:** FoN has an Integer-Power deriv and renders **EMPTY** — a different bug from black/dust
  (round-2). Not settled by source-reading; needs a GPU-vs-ref bisect (geometry/camera/estimator),
  the same validate-first method that surfaced the Melting/Wada/Dainbramage fixes.
- **Cost/tradeoff:** diagnostic session (GPU, human judgment), not a planned edit. Could be camera
  framing, an Integer-Power dr seed, or an estimator mis-route. **Cheap to investigate, unknown to fix.**
- **Scenes:** Hal-Tenny FoN (1), contingent on diagnosis.

> **Cluster B net:** the realistic near-term yield is **0-1 scenes** auto (DsyneGrafix only if the
> numDEeps calibration is pinned by the harness; otherwise it stays the manual-opt-in it already is).
> B2 is research. B3 is a diagnostic. This cluster is **lower-yield than its row-count suggests** —
> the round-2 falsification is the load-bearing finding here.

---

## 3. CLUSTER C — Hyperben2

Its own cluster because the spec hypothesis was **conclusively falsified** (EXECUTION-STATUS
round-2): the extra-foreground-Menger slab is **not** a decompiler/packer regression. Ruled out:
Menger3.m3f has no `[CONSTANTS]` block (the bf81087 fix didn't touch it); reverting U5's Menger3
restructure renders byte-identical; Menger3's option types are all type-0/6 (untouched by the
U-series); the slab is robust to overstepTolerance (0 vs 2) and estimator (0/1/2).

### C1 — Bisect the slab's true cause  ·  **[engine]** (diagnose, then targeted fix)
- **Closes:** the Hyperben2 residual (uncategorized; not march/DE/HT as catalogued).
- **Remaining suspects (round-2):** camera framing, the Amazing-Box **intern** DE
  (emitFusedHybrid.ts:301-315 — the hardcoded est-1/fudge-0.45 path), or an S1 estimator interaction.
  The slab is foreground, so it's a *spurious near hit*, which points at IT-5 (dropped
  minimum-iterations march gate) or NR-1 (normal probe over-sensitive to a fragmented iso) as
  candidate catalogue rows worth checking — but neither is confirmed for this scene.
- **Concrete work:** GPU bisect — toggle the intern-box est path, re-derive the camera from
  `hVGrads` and verify framing, A/B the minimum-iterations gate (IT-5). Targeted fix follows the bisect.
- **Cost/tradeoff:** diagnostic-first (GPU, human). No safe blind edit — the round-2 session
  explicitly did NOT ship a wrong fix. Medium effort, uncertain payoff.
- **Scenes:** Hyperben2 (1). The washout component overlaps the fog work (ADR-0086, already shipped).

---

## 4. CLUSTER D — DsyneGrafix (dust / refine)

The canary dust scene. The catalogue + dsyne-findings + binary-search-spec converge on a
**settled** root cause: it is a **DE-fidelity** gap (orbit-collapse), NOT an overshoot.

### D1 — Numeric estimator opt-in (already shipped; keep manual)  ·  **[engine]** (done)  +  **[importer]** (deferred)
- **Closes:** DE-3 for DsyneGrafix specifically.
- **State:** the numeric estimator 7 (`numericDistance`, ADR-0085) is **already implemented and
  byte-identical when off** (de.ts:16-21,233-246; gmt-spec §5). est7 @ numDEeps≈0.1 cleanly recovers
  DsyneGrafix (sig 87). The only open piece is auto-routing it (= B1), which is deferred for the
  over-route + dDEscale-calibration reasons in B1. **No new engine work** — the capability exists.
- **Cost/tradeoff:** none for the existing manual path. The deferred auto-route is B1's risk.
- **Scenes:** DsyneGrafix (1) — recoverable today by the user in the Quality panel.

### D2 — Do NOT auto-wire refinement (confirm the decline)  ·  **[importer]** (no-op, documented)
- **Closes:** RF-3 (importer drops `bStepsafterDEStop`). The catalogue + binary-search-spec banner
  + the 2026-06-27 canary all agree this is **correctly dropped**.
- **State:** surface refinement (ADR-0084) is a NATIVE opt-in, default off. The canary proved an
  exhaustive fine march (fudge 0.05 / 5000 steps) is STILL fragmented → the dust is DE-fidelity,
  not overshoot, so refinement can't fix it. Auto-enabling adds ~0.5-2s compile per import for no
  benefit (emitFusedHybrid.ts:399-407).
- **Cost/tradeoff:** keeping it dropped is correct. This item exists only to record "do not
  re-wire RF-3" — a graveyard entry, not a task.
- **Scenes:** 0 (negative result; prevents a regression-by-good-intention).

---

## 5. Small confirmed source-level divergences (cheap fidelity, low scene yield)

These are confirmed-by-source off-by-ones / drops with magnitude unquantified. Worth a batch
"fidelity polish" session only if A-D leave budget; each is a few lines.

| # | Item | Tag | Closes | Edit | Scenes |
|---|---|---|---|---|---|
| E1 | dIFS `MaxItsResult` +1 | [engine]/[importer] | IT-6 | `emitFusedHybrid.ts:250` — add +1 to dIFS (deOption 20) iterations to match `Inc(MaxItsResult)` (Calc.pas:302-303) | every est-6 import, one orbit-trap fold each (small) |
| E2 | Minimum-iterations march gate | [engine]+[importer] | IT-5 | read header `MinimumIterations` (@135, **never parsed**); add a `uMinIter` march precondition mirroring `iMinIt` — live next-step gate `if (pIt3Dext.ItResultI < iMinIt) or ...` (CalcThread.pas:196-197, **not** the dead Calc.pas RayMarch). **Also a Hyperben2 C1 suspect** (suppresses spurious near hits) | high-MinIter scenes; possibly Hyperben2 slab |
| E3 | ColorOnIt reduced-cap colour eval | [engine] | IT-9 | colouring-only; MB3D re-evals DE at lowered cap ×64 RStop (Calc.pas:1269-1274). GMT's `uColorIter` is a different mechanism. Map ColorOnIt→uColorIter | colour-only divergence on ColorOnIt-authored scenes |
| E4 | iteration-limited hit (RMresult=2) | [engine] | IT-4 | **most consequential iteration divergence** — GMT has no iteration-count hit path (trace.ts:163-164). Bounded non-dIFS interiors where the orbit maxes but post-loop DE never crosses finalEps: MB3D paints, GMT marches through. dIFS is shielded. Adding an iter-limited hit test is a kernel change with broad blast radius | bounded IFS/Menger interiors (count unknown) |
| E5 | iSmNormals / normal model | [engine]+[importer] | NR-1…NR-4 | importer maps NOTHING of MB3D's normal model. Live: normals are an **indirect funcptr** (`TCalculateNormalsFunc(pCalcNormals)(MCTparas, RSFmul)`, CalcThread.pas:243), assigned once at HeaderTrafos.pas:959-960 (`RMCalculateNormals` if `NormalsOnDE` else `RMCalculateNormalsOnSmoothIt`); both use probe offset `Noffset := MinCS(1, DEstop) * (1 + mZZ * mctDEstopFactor) * 0.15` + central differences. Map `iSmNormals` (@ via iOptions>>6) + reproduce the depth-scaled `Noffset` | micro-surface smoothness vs ref on iSmNormals=8 scenes |
| E6 | iOptions bit2 → `msDEsub` step-safety | [importer] | new (step-safety lever) | the live step formula's safety-subtraction `msDEsub` (CalcThread.pas:200) is gated by `iOptions and 4` (HeaderTrafos.pas:961-964): bit **clear** → `msDEsub := 0` (step reduces to `MaxCS(s011, DE·sZstepDiv·RSFmul)`); bit **set** → `sZstepDiv` remapped via `s² + 1.2·s·(1−s)` **and** `msDEsub := MinCS(0.9, Sqrt(remapped sZstepDiv))`. Importer **does not read `iOptions` bit 2**, so both the `sZstepDiv` remap and the per-step DE safety subtraction silently drop to the bit-clear path. Read `iOptions`, branch on bit 2, carry `msDEsub` + remapped `sZstepDiv` into the GMT step params | any scene authored with `iOptions` bit2 set (affects surface convergence / near-surface under-stepping; corpus count unknown — parser never reads the byte) |

E4 is flagged separately: it is the **most consequential iteration divergence** in the catalogue
(IT-4), but the fix is a kernel change touching the hit test for every formula, with real
regression risk on the certified scenes. Treat E4 as its own scoped engine task, not part of the
cheap batch.

---

## 6. Prioritized headline list (by residual-scenes-fixed)

1. **A1 — certify the reach bridge (instrumented trace).** 2 scenes (Theli/TimeMachine back-cut),
   zero render-code cost. May retire A2. *[engine-verify / harness]*
2. **A2 — TDR-safe hard-cap raise.** 1-2 residual back-cut scenes A1 shows still cut. Gated on the
   Windows-TDR tradeoff + adaptive downscale + opt-in. *[engine]+[importer]*
3. **A3 — depth-coupled auto-coarsening (`mctDEstopFactor` port).** Closes HT-4 + helps reach;
   faithful-look on deep-zoom (Theli/TimeMachine/Abominog at depth). A **look call**. *[engine]+[importer]*
4. **C1 — bisect Hyperben2 slab.** 1 scene. Diagnostic-first; no blind fix. *[engine]*
5. **B3 — Hal-Tenny FoN empty root-cause.** 1 scene. Diagnostic-first. *[importer/engine]*
6. **D1 — DsyneGrafix numeric (already shipped, manual).** 1 scene today; auto-route = B1
   (deferred). *[engine] done*
7. **E-batch (E1/E2/E3/E5/E6) — confirmed small divergences.** Low per-item yield; E2 doubles as a
   Hyperben2 suspect; E6 (`iOptions` bit2 → `msDEsub`) is a pure-importer step-safety lever.
   *[engine]+[importer]*
8. **E4 — iteration-limited hit.** Most consequential iteration divergence, but broad blast radius;
   own scoped task. *[engine]*
9. **B1 — auto-route orbit-collapse → est7.** 0-1 scenes; blocked on the dDEscale→numDEeps
   calibration; otherwise stays manual. *[importer]*
10. **B2 — fragmented-iso DE fidelity (Recycledrelatives/Oxnot).** 2 scenes but **research-grade**;
    glow workaround documented. *[engine, architectural]*
11. **D2 — do NOT auto-wire refinement.** 0 scenes (graveyard; prevents a regression). *[importer no-op]*

**Honest yield summary.** The reach cluster (A) is the only one with a clear multi-scene,
near-term payoff, and even there A1 is *verification* before A2/A3 commit code. Clusters B and C
are dominated by **diagnostics and research** — the round-2 falsifications collapsed their
apparent scene counts. The cheap confirmed wins (E1/E3/E5) are real but small. There is **no
large remaining lever** of the "+13 scenes" kind the early roadmap imagined for rendering — the
big remaining scene gains are on the *coverage* axis (`coverage-unlocks.md`: U2/U7/U9), not the
*render-fidelity* axis this plan covers.

---

## 7. Needs an instrumented Free-Pascal harness (vs settled by source)

Be honest about which is which. A harness = compile a minimal build of the **live** marcher
(`CalcThread.pas:128-258` `TMandCalcThread.Execute`, **not** the dead `Calc.pas` `RayMarch`) + one
formula (Free Pascal / Lazarus on the `/h/tmp/mb3d-src/` tree) and dump per-step values, run
side-by-side against GMT. Source-reading has taken these as far as static analysis can.

### Genuinely needs the harness (source cannot settle):

- **A1 — quantitative reach equivalence (MR-8, catalogue §7 item 2).** Whether 1500-2000 steps @
  fudge 0.4 reaches the same far surface as MB3D's distance-terminated march. Source proves the
  *mapping* is close (`(dTmp − msDEsub·msDEstop)·sZstepDiv·RSFmul` with an `s011` floor,
  `CalcThread.pas:200` = `d += DE·uFudgeFactor`) but **not** that GMT's *capped* budget covers the
  same accumulated `mZZ`. Dump: MB3D `mZZ` + step-count at loop exit vs GMT `d` + `i` at exit, per
  canonical pixel on Theli/TimeMachine. **This gates whether A2/A3 are needed.**

- **The march termination bound is source-settled (`Zend`) — NO harness needed (was the
  "MaxRayLength" item).** The live loop terminates `CalcThread.pas:253` at `(mZZ > Zend)`, where
  `Zend := MaxCD(1e-10, (dZend - dZstart) / StepWidth)` (`HeaderTrafos.pas:779`;
  `StepWidth := dStepWidth`, `:778`) — a normalized camera depth range over step width, **fully
  derivable from header fields**. The dead `RayMarch`'s caller-supplied `RMrec.MaxRayLength` (which
  had no readable assignment site) is **not** the live bound; the prior "MaxRayLength needs a
  runtime trace" open item is **retired**. Whether GMT's fixed `MAX_DIST=10000` /
  `BOUNDING_RADIUS=400` envelope clips MB3D-reachable geometry is now a *source-comparable* question
  (`Zend` vs GMT's envelope), not a harness one.

- **Which corpus scenes set `bVaryDEstopOnFOV` (@178) / `iSmNormals=8` / `bStepsafterDEStop>0`
  (@134) / `iOptions` bit2 (HT-4, NR-3, A3, E5, E6).** The parser **never reads** @178,
  `iSmNormals`, or `iOptions` bit2. Before A3/E5/E6 are worth building, dump these header bytes
  across the 80-scene corpus (a parser-extension probe, not a full Pascal harness) to size the
  affected-scene count. *(Partial: this is a parse-side probe, cheaper than a full live-marcher
  harness — but still "read bytes the importer ignores.")*

- **B1 — the `dDEscale → numDEeps` calibration (~10× gap).** DsyneGrafix's scene `dDEscale=0.95`
  but `numDEeps≈0.1` is what renders well. The iter-weighted slot-DEscale average
  (HeaderTrafos.pas:715/770) is readable, but *why* the good render needs ~10× less is not — needs
  a harness dumping MB3D's actual per-step numeric DE magnitude on DsyneGrafix vs GMT's
  `numericDistance` at matched points. Until settled, B1 cannot safely auto-set the magnitude.

- **StartForward / StepForward encoding (spec §10, MR setup).** `TypeDefinitions.pas:729` comments
  `0/1/2 = outside/insideConstStep/insideDIFSDE` but the live encoding + initial pre-DE advance is
  INFER-tagged; a runtime trace of the RMrec at the call site settles it. Minor (affects ray entry,
  not reach), but unresolved by source.

- **Visual magnitude of the small off-by-ones (E1 IT-6, E3 IT-9, A3 HT-4) (catalogue §7 item 3).**
  Confirmed source divergences; magnitude unquantified. A/B renders (GPU, not Pascal) settle
  whether any warrants the port. The importer's detail-sweep canary already showed the dropped
  depth-degradation is NOT Theli's bg cause — so HT-4's payoff is deep-zoom-look only.

### Fully settled by source (NO harness needed — do not re-investigate):

- **The back-cut is march-budget, not refinement** (MR-7, RF-6) — both refiners proven post-hit/
  backward in both engines. *Settled.*
- **Numeric DE math is a faithful but probe-invariant-adapted port** (DE-3, gmt-spec §5,
  falsified-hypothesis #2) — GMT `de.ts:200` adds an `e` numerator factor + an `e*0.06` denom term
  vs MB3D `Calc.pas:503` (probe-invariance), so it is **not** byte-for-byte; but the divergence is
  routing (auto vs manual), not the formula. *Settled.*
- **The weave/iteration count matches step-for-step** (IT-2, IT-8, IT-10) — same slot at same
  index; the "per-slot sum" theory is dead on both sides. *Settled.*
- **Escape-radius semantics match** (IT-7) — both compare squared radius to RStop²; only GMT's
  [16,1000] clamp + dIFS exemption differ, and those are intentional. *Settled.*
- **DsyneGrafix dust root cause** (Cluster D) — orbit-collapse via IdesFormula `Y_mul=Z_mul=0`,
  verified against `IdesFormula.m3f` + the full orbit path (dsyne-findings steps 1-4). est7
  recovers it. *Settled* (only the numDEeps magnitude, above, is open).
- **Wada coverage** — iter cover-floor + [CONSTANTS] fix; verified against source + GPU. *Settled.*
- **Refinement is correctly NOT auto-wired** (D2 / RF-3) — the canary (fudge 0.05 / 5000 steps
  still fragmented) settles it. *Settled.*
- **Hyperben2 is NOT a decompiler/packer regression** (Cluster C) — four independent rule-outs in
  round-2. The *remaining* cause needs a GPU bisect (C1), but the elimination is source-settled.
- **The march termination bound `Zend` is source-settled** (was the "MaxRayLength needs harness"
  item) — live exit `CalcThread.pas:253` `until (mZZ > Zend)`, `Zend := MaxCD(1e-10, (dZend -
  dZstart) / StepWidth)` (`HeaderTrafos.pas:778-779`), fully derivable from header fields. The dead
  `RayMarch`'s caller-supplied `RMrec.MaxRayLength` was never the live bound. *Settled.*

---

## 8. Sequencing recommendation

1. **A1 + the header-byte corpus probe** (one harness/probe session) — certifies the reach bridge
   and sizes A3/E5/E6's audience (incl. how many corpus scenes set `iOptions` bit2) before
   committing kernel code. Cheapest, highest-information.
2. **A2/A3** only for whatever A1 leaves cut, gated on the TDR tradeoff (A2) and a look call (A3).
3. **C1 + B3** — the two diagnostic-first scenes (Hyperben2 slab, Hal-Tenny FoN empty), GPU bisect.
4. **E1/E3/E5/E6** — the cheap confirmed-divergence batch (E6 = `iOptions` bit2 → `msDEsub`
   step-safety, pure importer), if budget remains.
5. **E4** — its own scoped task (iteration-limited hit; broad blast radius).
6. **B1** — only after the harness pins the numDEeps calibration; else DsyneGrafix stays manual (D1).
7. **B2** — research backlog (fragmented-iso DE fidelity); ship the glow workaround meanwhile.

Render-fidelity is in diminishing returns: the reach cluster is the last clear multi-scene lever,
and the big future scene gains live on the **coverage** axis, not here.
