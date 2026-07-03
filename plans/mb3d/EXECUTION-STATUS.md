# MB3D Completion — Execution Status (live tracker)

**Orchestrated run.** Source of truth for stage progress. Plan: `COMPLETION-PLAN.md`.
Branch `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable`. NOT pushed.

Item classes: **R** research/recon (orchestrator agents, no GPU) · **C** code+CPU-gate ·
**V** visual/GPU (user session). Gates: `typecheck`, `test:mb3d`(24), `:weave`(58),
`:refine`(46), `corpus-check`(**293/0**), `check:mb3d-decompiler`, `cert-render.mts` (real GPU).

## ▶ THE FRONTIER HAS SHIFTED: decode → DE-FIDELITY (reframe 2026-06-30, post user-validation)
**Tier-1 SHIPPED** (5/6 fixes, `484d300`): corpus **293 → 333/0** (deterministic), zero regression. User
GPU-validated the 8 new scenes vs the MB3D refs: **6 render faithfully** (Rama-Elysium, toricaleggs,
JuliaSetSample, Dainbramage-Home, KochSurf-Sample-6, Oxnot-Flexing — bundle **32 → 38**); **2 render wrong**
(`Aexion 10bulbs` dust, `Dainbramage - Hydra` noise) and were source-traced.

**The strategic insight: the DECODE problem is essentially SOLVED (333/0 formulas faithful). Every remaining
scene failure is now a DE / RENDER-fidelity gap — "the DE GMT computes ≠ the DE MB3D computes."** The whole
remaining backlog collapses to one frame: **faithfully port MB3D's DE dispatch** instead of mapping each
formula to GMT's nearest estimator. MB3D picks a DE FUNCTION per scene (HeaderTrafos.pas:497-505):
`doHybridPasDE` (3D, deOption 0/1/2/11), **`doHybrid4DDEPas` (4D, deOption 4/5/6)**, `doHybridIFS3D` (dIFS,
deOption 20), and the DEcombine two-orbit path. GMT has 3D + dIFS; **4D and two-orbit are the gaps.**

**NEXT — prioritized directions (RE-REVISED 2026-07-02 after the 4D-escape build+GPU test; see that decisions-log
entry). BOTH the 2026-07-01 audit's #1 ("no-deriv Rout recompute") AND the "4D escape structural lever" are now
RETIRED — the 4D escape was IMPLEMENTED FAITHFULLY, GPU-tested, and REVERTED (no net benefit; see below).**
1. **Oxnot step-floor** (converged, cheap-ish). DE math is correct; the deliberate `Math.max(0.4, fudge)` floor
   (emitFusedHybrid.ts:388, guards the Theli/TimeMachine back-cutoff) over-steps its authored 0.3. Honor authored
   fine steps + raise the coupled `maxSteps` budget. Calibration — needs a GPU tuning pass (trades vs the Theli cut).
   Does NOT touch the shared marcher.
2. **U7 two-orbit DEcombine kernel** (independent, **+6 scenes**: DEcomb1, ExcludeBulbMeng, Mengerplus-for-MC,
   ThePearl-dIFS, cutted-sphere-over-carpet, Dodeca-Torus-mix; +Recycledrelatives-Test). Engine-core `DE_MASTER`:
   two orbits + per-group estimator + faithful CSG (`maxInv`=signed diff, `mixF1`=hand-off). Visual-only → GPU-cert.
3. **Hydra z0-input-coord** (harder). Its noise is the #3 semantic risk: `_JuliaSets` re-runs every 4th iter and
   re-lattices from the FOLDED z instead of the original pixel. Faithful fix = bind its input-coords (offsets 0/8/16)
   to `z0` captured once in loopInit, not the evolving z. Not a one-liner.
- **RETIRED — 4D escape radius** (Aexion + QuatP4). Was "the ONE confirmed structural lever." IMPLEMENTED
   faithfully (`#define`-gated ESC_W2 additive-w² escape byte-identical off; scene-level `CheckDEoption` merge;
   all-slots-w-coord; bespoke deOption-4/5/6 getDist; numeric fallback). GPU verdict: **QuatP4 unchanged** (it
   already worked — it has a real analytic `dr`; the audit mislabeled "uses a 4th coord" as "needs 4D escape"),
   **Melting-spot unchanged-but-slower**, **Aexion still a solid fill**. **REVERTED** — no visible benefit + shared-
   marcher HIGH risk. Root cause (uniqueness analysis, `debug/probe-mb3d-4d-uniqueness.mts`): Aexion is the ONLY
   no-derivative **Mandelbrot-class (quadratic-escape)** scene; both the analytic bulb-DE (`|z.z|·ln|z.z|` overshoots)
   AND the numeric finite-diff DE (gradient collapses → degenerate) fail. Aexion stays PARKED (a future custom-DE fix
   might crack it). Don't re-chase 4D escape for these scenes. See the 2026-07-02 decisions-log entry.
- **Banked / out-of-band:** intern-AmBox convergence (Hyperben2/Theli-bg), Bulbox intern #5 (+BulboxCut,
   `formulas.pas:5114`), Tier-3 walls (texture pipeline, IEEE bit-model, genuine-loop CFG).

**Bundle note:** Aexion + Hydra stay pulled from the sample list (both render wrong; the pulls are NOT the fix). The
4D-escape session (2026-07-02) confirmed Aexion is not cheaply fixable. Decoder fixes stand.
**⚠ AUDIT-USE NOTE:** the DE-fidelity audit's grouping + the 2-genuinely-4D finding are trustworthy; its specific
one-line fixes are NOT (mechanism-1 compile-errored / no-op'd against real code). Verify every proposed DE fix
against the emitted GLSL + scratch declarations before implementing.

**Landed this session (all committed on feat/mb3d-importer, GPU-verified, gates green):**
- **Faithful marcher** (ADR-0088, compile-gated, auto-on for imports) — `1f3bf59`/`596d244`/`2844f1d`/`7ea36b6`.
  **Perf question CLOSED (2026-07-02):** GPU timer-query bench (RTX 2070/ANGLE) — compile **negligible**, GPU
  **free** on smooth DEs (+0.1 %) to **faster** on overshooting DEs (−15 %, the import regime); only cost is the
  authored StepDiv finer-stepping (a runtime knob, break-even on hard DEs). → **supports making it GMT's default
  marcher** (native at StepDiv 1.0 pays nothing). Data: `research/faithful-marcher-perf-2026-07-02.md`. Open:
  real fused-import A/B + non-NVIDIA/mobile confirmation. Bench gained reusable
  `--mb3d-faithful/--mb3d-stepdiv/--mb3d-desub/--formula` flags.
- **Euclidean metric** (was hardcoded Chebyshev — unfaithful) — `ac98603`.
- **deBailout = rStop²** (was clamped to 1000 — premature orbit bail) — `7bd6379`. → recovered
  **Recycledrelatives** (fan), **HalTenny-FoN** (0.13→0.45), **Jost1** (0.59→0.67); zero certified-scene regression.
- 5-doc render-pipeline spec + corrections (`99df2a1`); ADR-0083..0088.

**Walls / banked (don't re-chase without NEW info):**
- **Hyperben2 / Theli / QuatP4** — intern-AmBox **convergence gap** (over-fold). BANKED; workarounds
  `iterations ~40` + `estimator 4`. Root cause = GMT's intern Amazing-Box doesn't settle like MB3D's; it is
  NOT the c-add (tried removing `+c` → regressed every AmBox scene → reverted). Needs an orbit-by-orbit
  sim of intern #4 vs MB3D's disassembled `_AmazingBox` `[CODE]`.
- **Oxnot** — suspected math error (output saved). **DsyneGrafix** — dust (user has a lead).
- **Decompiler/coverage gates:** U9 second-base/stack mem (~41 fm), weave modes 1-3 (DEcombine two-orbit
  kernel), HeightMapIFS indirect-call. See `plans/mb3d/research/coverage-unlocks.md`.

**Hard-won lessons (carry forward):** (1) verify importer DE-param mappings (metric/estimator/bailout/
clamps/iterations) against MB3D **SOURCE + behavior**, never GMT defaults or self-justifying comments —
both big bugs (metric, deBailout) were wrong-but-uncaught for ages. (2) A body-level change to a SHARED
intern formula needs **visual verification across ALL its scenes** before commit — `nbFraction` coverage
is blind to over-fold / wrong-look (the no-c revert). (3) When every computed value checks out but the
render is wrong, question the **clamps/caps** taken as given.

## Render-pipeline spec + faithful-conversion plan (2026-06-28 — spec session, NO code changed)
Definitive, code-grounded specs of how MB3D vs GMT render a pixel, exactly where they diverge, and
what GMT must change to render imported scenes faithfully. Five docs under `plans/mb3d/research/`:
- `mb3d-render-pipeline-spec.md` · `gmt-render-pipeline-spec.md` · `render-divergence.md` · `render-conversion-plan.md`
- `render-pipeline-CORRECTIONS.md` — **foundational correction (read first):** the spec's anchor
  `Calc.pas RayMarch` is **DEAD code** (zero call sites tree-wide); the live primary marcher is
  `TMandCalcThread.Execute` (`CalcThread.pas:128-258`, spawned `Calc.pas:209`). Re-anchored every
  marcher claim. Same class of error the brief/ADR-0083/prior sessions all carried.
- **What HOLDS:** the no-step-cap thesis (live loop ends `until (mZZ > Zend)`, `CalcThread.pas:253`;
  `StepCount` never gates) — the central divergence vs GMT's ~2000-step hard cap (`trace.ts:130`),
  which causes the Theli/Hal-Tenny back-cut. Max-step clamp `MaxCS(msDEstop,0.4)·mctMH04ZSD` identical
  both sides → the prior fudge-floor-0.4 fix (`0179051`) stays valid.
- **Corrected:** step formula adds `msDEsub·msDEstop` safety-subtraction + `s011` floor
  (`CalcThread.pas:200`); march bound is `Zend = (dZend−dZstart)/StepWidth` (`HeaderTrafos.pas:779`,
  **now source-settled — retires the "MaxRayLength needs harness" INFER**); normals via `pCalcNormals`
  pointer (`HeaderTrafos.pas:959-960`).
- **Top conversion lever:** A1 instrument-verify reach equivalence → A2 TDR-safe step-cap raise.
  **New importer lever found:** `iOptions` bit 2 → `msDEsub` step-safety (`HeaderTrafos.pas:961-964`),
  currently ignored by the importer.
- **Still needs a Free-Pascal harness:** quantitative reach equivalence (A1), per-scene `MaxRayLength`
  vs GMT clip envelope, `dDEscale→numDEeps` ~10× calibration. Everything else is source-settled.

## Strategic reframe + scope (2026-06-29)

**Faithful marcher SHIPPED + USER-VERIFIED** (ADR-0088; `1f3bf59`/`596d244`/`2844f1d`/`7ea36b6`):
subtle geometry change, "great effect to the picture", perf good. Toggle = CompilableFeatureSection in
the Quality panel (auto-on for `.m3p` imports; Step Div / DE Sub live sliders). 3-way contact sheet
(orig | old | new) at `H:/GMT/refSoftware/MB3D/cert/contact-sheet.html`.

**Residuals now split into TWO categories (the reframe):**
- **Renderer-fixable** — solved by the faithful marcher (DsyneGrafix dust → solid).
- **Decode / weave-MATH broken** — NO renderer setting helps; the decoded formula or the weave is
  wrong. **Recycledrelatives - Fractal Fan** (2-slot `ABoxMod1` + `ABoxModKali`) is the type case: user
  tried every DE/estimator/setting, still empty/wrong → investigate the **math**, not the render.
  (Cross-check blind spot, ADR-0087: a wrong-but-consistent decode reads 0-mismatch yet renders wrong.)
  **TRIAGED 2026-06-29: weave MODE 0 (ALTERNATE — supported), emit=RENDERABLE — so NOT the DEcombine
  ceiling.** 2 slots, both `formulaIndex 20` x87-decompiled: `ABoxMod1`(×4) + `ABoxModKali`(×4) cycling
  `[0,0,0,0,1,1,1,1]`, 60 iters, rStop 1024, deStop 0.7, iOptions bit-2 clear (msDEsub=0). → a genuine
  **decode-math bug** in one/both decompiled ABox formulas. Next isolation step: render each slot
  STANDALONE — if one breaks alone, that formula's x87 decode is wrong; if both are clean alone but the
  weave is empty, the bug is in the fusion. In-scope importer track (not a push blocker).
  **DEEP INSTRUMENTATION 2026-06-29 — the decode layer is EXONERATED.** (User: both ABox formulas are
  blank STANDALONE in MB3D too — they're weave-only transforms, so standalone render is moot.) Traced
  BOTH decodes line-by-line vs the `.m3f` source (M3Formulas/ABoxMod1.m3f + ABoxModKali.m3f ship the
  readable math): **faithful** (incl. ABoxMod1's x/y c-swap, the Boxscale Min-R clamp-before-square).
  Dumped the packed const map: **all consts correct + offset-aligned** (Cm16..Cm72). `dr` threading
  correct (`w↔dr`, seeds 1.0). Julia flag+constant correct (matches header isJulia/jx-jy-jz=−0.4,3,3).
  Estimator = 2 (r/dr) correct. float64 orbit sim → a normal escaping fractal with finite DEs (~0.3).
  **So it is NOT the decoded math, consts, dr, julia, or estimator** — every layer xcheck OR a float64
  sim can verify is correct, yet the GPU is blank. The bug is in the layer NEITHER can see: **float32
  GPU execution and/or the fused-weave kernel wiring** (escape/bailout, the `phase` weave threading, or
  the `juliaType:'offset'` application). MB3D renders the same math/consts/c non-blank → divergence is in
  EXECUTION, not the decode. **Decisive next step = GPU shader instrumentation** (dump per-march-step
  z/dr/DE from the real kernel; or a float32 orbit sim) — a different, GPU-bound kind of work, not
  source-reading. Logged as the lead fused-execution residual; still not a push blocker.
  **CIRCULAR-TEST AUDIT 2026-06-29 (user challenge):** two of the above "verified" checks were
  error-tests (validated GMT-vs-GMT). Both re-checked against MB3D SOURCE and both HOLD: (1) Min-R
  clamp — `Sqr(Max(1e-40,MinR))` confirmed at `CustomFormulas.pas:464-466` (GMT matches); (2) Julia —
  the authoritative flag is `bIsJulia`@190 (`HeaderTrafos.pas:562 bDoJulia := bIsJulia<>0`), values
  `dJx/dJy/dJz`@191/199/207 per TMandHeader10; parseMB3D reads exactly these. NB the stale `DoJulia`@152
  / `J1`@24 fields hold garbage in the saved format — parseMB3D correctly ignores them. Exoneration of
  the decode layer now stands on source, not circular validation.
  **DISASSEMBLER CHECK 2026-06-29 (user: `.m3f` Description is educational pseudocode, often diverges
  from `[CODE]`; use the de-assembler).** Ran `dis.mjs` (capstone) on both: **UNHANDLED = 0** for
  ABoxMod1 (x87) AND ABoxModKali (SSE2) — every `[CODE]` instruction was translated, none silently
  dropped. So decode-vs-`[CODE]` is verified for COMPLETENESS (disasm) + NUMERICS (xcheck) + CONSTS
  (dump) — i.e. against the real `[CODE]`, not the Description. Only un-exhausted decode check = a full
  op-by-op asm↔GLSL SEMANTIC trace (would catch a *consistent* mistranslation that xcheck's shared
  interpreter also makes) — unlikely given 5 corroborations, deep if pursued. Bug remains GMT-execution
  (float32 / fused-weave-wiring).
  **FUSED-WIRING + DE TRACE 2026-06-29 — wiring & compute EXONERATED too.** Traced the full fused
  kernel (weave `phase=WEAVE[i%8]`✓, `dr` threading `w↔dr`✓, slot `c`-adds incl. ABoxMod1 swap✓) AND the
  de.ts driver loop (`z0=(pixel,uParamB)`, `c=mix(z,(uJulia,uParamA),juliaMode)`→Julia c=(−0.4,3,3)✓,
  `dr=1.0` seed✓, escape `dot(z)>bailout`✓, NO double-dr-update — only the slot writes dr✓, `dr>1e10`
  break de.ts:474). Estimator 2 formula confirmed `d=r/dr_safe` (core_math.ts:77-80; "Pseudo (Raw)" UI
  label is cosmetic). **float32-vs-float64 orbit sim replicating de.ts exactly: DE identical, finite &
  sane (~0.4–1.6), dr stays ~30–75 (orbit escapes early via r²>1000 before dr blows up), 0/25 bad
  pixels** → float32 + dr-overflow hypotheses REFUTED. So decode/consts/dr/julia/estimator/DE/fused-
  wiring/driver-loop are ALL correct with a well-behaved DE field, yet GPU renders blank. **Remaining
  suspects (no longer wiring or compute): CAMERA/framing (mapCamera points at empty space) OR the
  marcher missing a genuinely-thin "fan" set despite sane DE.** Both need a GPU debug-viz render (colour
  by iter-count / raw DE / hit-mask) — or a cheap non-GPU mapCamera-vs-header check first. Static
  analysis exhausted; the answer is on the GPU. Still not a push blocker.
  **METRIC DIVERGENCE FOUND + FIXED 2026-06-29 (`ac98603`, user-spotted).** GMT's importer hardcoded
  `quality.distanceMetric=1` (Chebyshev) for EVERY import, but MB3D's DE radius is unconditionally
  Euclidean (`r := Sqrt(Rout)`, formulas.pas:2498; MB3D has no metric option). Fixed all 3 sites →
  `0.0` Euclidean (constPacker mapDEMeta dIFS+general, emitFusedHybrid intern-box). GMT already had
  Euclidean (math.ts:202 `m<0.5 → length(p)`), so it was just selecting it. **Affects ALL imports** —
  a real fidelity win (rounder Euclidean surfaces matching MB3D vs the old sharper Chebyshev corners);
  surface-shape change, judge on the contact sheet. GPU re-render: **zero coverage regression** (every
  scene's nbFraction identical to the Chebyshev run). BUT **Recycledrelatives STILL blank (nb 0.00)** —
  the metric was NOT its blank cause (Cheb vs Eucl only shifts r by ≤√3). So Recycledrelatives' blank
  remains the open fused-execution residual (needs GPU debug-viz: colour by iter-count/raw-DE/hit-mask).
  Contact sheet now shows orig | faithful+Cheb | faithful+Eucl (metric A/B).
  **RESOLVED 2026-06-29 (`7bd6379`, user-found the actual bug): the deBailout clamp.** MB3D escapes
  `Rout > RStop` where runtime RStop = `Sqr(RStop_header)` (HeaderTrafos.pas:558, formulas.pas:3471) =
  ~1.05e6 for rStop=1024. The importer COMPUTED rStop² but clamped `Math.min(1000, …)` → bailed at
  r²>1000. Harmless for fast-escapers, but FOLD orbits (box/IFS) oscillate back, so the premature bail
  erased their structure → blank. Fix: clamp to the raised slider ceiling (1e7) not 1000 (emitFusedHybrid
  + constPacker general paths; raised quality.ts deBailout max 1000→1e7; dIFS bounded path left as-is).
  **GPU-verified: Recycledrelatives nb 0.00→0.98 (the Fractal Fan appears!), HalTenny-FoN 0.13→0.45,
  Jost1 0.59→0.67; ALL certified scenes still 1.00 (zero regression); 32/32 render.** LESSON: when every
  computed value checks out but the render is wrong, question the CLAMPS/caps taken as given — my sims
  even USED bailout=1000 (the buggy value) and I trusted the importer's own "1000 ≈ full orbit" comment
  (true only for escapers). Two real importer bugs this session (metric + bailout) both surfaced by the
  user challenging the "exoneration". The deep decode/wiring exoneration was still load-bearing — it
  cornered the bug to the DE inputs, leaving the bailout as the last unquestioned given.

## Hyperben2 / Theli over-folding (intern-AmBox-hybrid class) — BANKED 2026-06-30, root cause NOT found
After the deBailout fix, Hyperben2/Theli (intern Amazing-Box #4 + Menger3 weaves) still **over-fold**:
they add a Menger plane every weave-cycle past ~40 iters, where MB3D settles at ~40 (4 planes).
Established: header MaxIter=2000 is REAL (user confirmed in MB3D UI); **deBailout has NO effect → the
orbit is bounded (scale=1), NOT escape-limited → it's a convergence issue** (MB3D's orbit settles by
~40, GMT's keeps moving). The exact count is twitchy (40↔41 with the metric; estimator 4 `(r-2)/dr`
also "fixes" it) = a convergence-boundary artifact, not a hard number. Silent slots RULED OUT (parse
reads iterCount signed; none negative). **FALSE LEAD (reverted): "intern #4 adds c but MB3D's
_AmazingBox.m3f is 'without C component' → remove +c."** Removing `+c` from slotTranspiler intern #4
REGRESSED every Amazing-Box scene (ABoxScale/Chrystal/… collapsed) — because GMT's architecture adds
the framework's `c` INSIDE the body (`c` is `inout`, seeded per-pixel + evolved by c-mixer slots), so
stripping it removes `c` entirely. Reverted clean; nb-coverage (32/32) masked the look regression →
**LESSON: a body-level change to a SHARED intern formula needs VISUAL verification across ALL its
scenes before commit, not just nb-coverage.** Root cause of the over-folding still open (a real
convergence gap in GMT's intern Amazing-Box vs MB3D, NOT the c-add). **BANKED** with user workarounds
(coreMath.iterations ~40 + estimator 4); not a push blocker. The session's real wins (Euclidean metric,
deBailout=rStop²) stand and recovered the bigger set.

**The greatest unlock = a WEAVE / hybrid-builder UI** (use the decoded formulas in combination, as MB3D
intends). Feasibility high — `emitFusedHybrid` already fuses an in-memory slot stack, `synthScene`
builds scenes from scratch, `buildWeaveSequence` does N-slot mode-0; so it's UI + scene-assembly on a
proven engine. **BUT beyond the current importer scope** — it broadens the shared-UI surface. Direction:
ultimately fold the MB3D workflow INTO the **Formula Workshop**; **generalize the Workshop's param-
surfacing UI (more GMT-like) as the FIRST unlock** (foundation already started — `uniformSlots.ts` lifted
the Workshop occupancy algebra to shared); prototype the weave by piling into the **Import modal** for
now → migrate to the Workshop when ready; the **Formula Picker** holds finished MB3D scenes.

**Scope guard / push-readiness:** keep the importer branch push-ready; deeper GMT integration is a
deliberate LATER phase. Branch GMT-core footprint is narrow + mergeable — **14 non-importer files,
+924/-24, ALL additive + gated** (no native regression; render seams compile-gated off-by-default, UI
purely additive). Renders via generic engine seams (estimators 6/7, gates, shared packer), not GMT-
specific escape hatches. Open before push: close the faithful-marcher loop (certified-scene regression
sweep via the contact-sheet WRONG-list); the math-broken residuals (Recycledrelatives) are a separate
track, not a push blocker.

## Baseline (re-measure after each coverage stage)
- Formulas faithful: **333 / 0 mismatch** (Tier-1 batch, 2026-06-30: +40 from the `fild`/`_JuliaSets`/`Aexion1`/
  `ja-jbe`/GP-flag-skipFiller decode fixes; **deterministic** — `helistairsIFS` denylisted as a const-seed-flaky
  decode. All 293 prior bodies byte-identical. Was 293/0 after the [CONSTANTS] fix.)
- Standalone library transpile-clean: **333** (verified-faithful set; non-GPU proxy for the GOOD count)
- Standalone library GOOD (GPU render-triage): **180 → _still pending GPU re-run_** — SwiftShader catalog triage ~7.5 s/formula (≈33 min), machine-hogging; left for a real-GPU session. Proxy = transpile-clean 293.
- Corpus scenes **IMPORT** (supported, slots all fuse): **33 → 41 / 80** (Tier-1 +8 import; **6 render-faithful,
  2 render-wrong** per the user's GPU validation — Aexion-10bulbs + Dainbramage-Hydra, pulled from the bundle)  ·  best-effort substitute 2
- Corpus scenes **render FAITHFULLY** (geometry matches ref — the meaningful fidelity count): **~25 → ~31 / 80**
  (Tier-1 +6 user-confirmed vs the MB3D refs: Rama-Elysium's TorusIFS rings, toricaleggs' egg-spiral, JuliaSetSample's
  julia blobs, Dainbramage-Home's koch_cube, KochSurf-Sample-6, Oxnot-Flexing). **2 render-WRONG (DE-fidelity, pulled
  + reclassified):** Aexion-10bulbs (no-derivative "dust", Oxnot class) + Dainbramage-Hydra (dIFS/non-dIFS lattice
  noise) — root causes + fix paths in the decisions log. Full per-scene table: `research/scene-unlock-triage-2026-06-30.md`.
- Bundled scenes certified (geometry+framing): **~19 / 20**
- Bundled scenes exposing editable sliders (vs baking literals): **11 → 21 / 32** (dense param-packing, S-PP; +8 from packing surplus scalars into idle uVec2*/uVec4* lanes, +2 more from overflowing surplus vec3s into uVec4* `.xyz` holders — Genetic Menger, Dainbramage)
- MB3D ref renders available for visual cert: **7** (more = user renders in MB3D)
- **Target: ~60/80 (75%), empirical** — M-tier did NOT reach the ~48 (60%) checkpoint; the two biggest estimated levers hit harder walls than the recon predicted (see S3 decisions).

## Stage status

| Stage | Item | Class | Status | Owner | Notes |
|---|---|---|---|---|---|
| S0 | foundation (dead code, drift guard, scratch) | C | ✅ DONE | orch | `10b32cf`, `da7e871` |
| S1 | 1. quality-param de-empiricize (Calc.pas) | R→V | ✅ DONE | orch | 1a deBailout=RStop² `4c85571`; 1b estimator table (box/IFS=r/dr est 2) `cef4891`; 1c fudge=ZstepDiv `a181b26` (Theli markedly sharper); 1d/1e maxSteps+detail DECLINED+documented `ba85e12` (no fidelity gain — Theli bg is convergence-driven, not steps/detail). All 20 scenes hold/improve on real GPU |
| S1 | 2. numeric-DE lighting fix | V | ✅ DONE | orch | `5b2d251`: numericNormal central-diff @ eps·3 footprint probe (was fixed uNumDEeps → speckle); numericDistance epsScale (mapDist shadows 2.5× smooth); DsyneGrafix est 7 = smooth lit relief not speckle; analytic byte-identical (#ifdef-gated); ADR-0085 reconciled |
| S1 | 3. fog application (Hyperben2) | R→V | ✅ DONE | orch | `0da5b5a` + **ADR-0086**: mapFog() depth-cue→DepthCol2 / dyn→DynFog; DepthCol2-primary (white=unset), near=1.3·td/far=5·td (no slider clamp), white-luminance guard. Genetic Menger=green / TimeMachine=blue match refs; Hyperben2 washout→grey atmosphere; BatJorge guarded; Hal-Tenny no-fog byte-identical |
| S2 | U3 type-12 packer (case 12) | C/V | ✅ DONE | orch | `c2895cb`: BuildRotMatrix4d port (Math3D.pas:2548), 16 singles Cm52..112. Corpus scenes +1 (Melting spot bloxx). **Visual-verify MixPinski4** (no cross-check) |
| S2 | U6 abs-via-multiply x87 fix | C | ✅ DONE | orch | `91b97f5`: x87 `fmul [PVar+0/8]`→abs, +80/88→neg (mirror SSE2). 269 `*Cp{0,8}`→abs across 87 formulas, 0 other body changes, corpus 279/0. Scenes +1 |
| S2 | U1 PAligned16 Cp const-pack | C/V | ✅ DONE | orch | `2f250ad`: PALIGNED16 table (23 consts, verified vs DivUtils.pas) + transpileSlot Cp-replace both arms; shared seedConsts() across 3 cross-check sites, corpus 279/0 at REAL values. Transpile-clean 179→244 (+65). Scenes +2. **Corrects ADR-0083** |
| S2 | U8 intern #6 transpile | C/V | ✅ DONE | orch | `c058a46`: HybridFolding port (formulas.pas:5153) — abs-fold + #0 int-power bulb. Scenes +1 (Dainbramage). **Visual-verify** (no intern cross-check) |
| S3 | U2 dIFS option-count pad | C | ✅ DONE | orch | `af91232`: pad truncated `.m3p` slot to DECOMPILED_DEFAULTS before bindOptions/packConstBuffer. App-side, not cross-check-gated. Cleared the lone `Cm…` const-pack scene gap; **0 scenes solo** (prereq, by design). Residual `Cp0/Cp8` misses are the separate mask-LOAD ceiling |
| S3 | U5 forward-branch structuring | C | ✅ DONE | orch | `8561398`: (1) signed jCC after `and/test ah,mask` (jg/jle≡jne/je, OF=SF=0) — regex+decodeCond; xcheck.mjs clears CF in lockstep. (2) interior `fxch`/`fst st(i)` between compare↔extract — snapshot+emit-before-guard (MsltoeSym2/3). Library **279→293** (+14). Corpus 293/0, diff purely additive. **0 corpus scenes** (the +14 are co-blocked / standalone-only) |
| S3 | U4 sphereIFS **+ HeightMapIFS** | C | ✅ DONE (partial) | orch | `a935fa3`: sphereIFS was a CASE-mismatch, not a missing body — scene `sphereIFS` vs library `SphereIFS` (case-insensitive Win FS). Case-resolving lookup → **+1 scene (`material colors`)**. **HeightMapIFS = indirect-call wall** (`call dword ptr [esi+0x10c]` → compiled MB3D sampler, not in [CODE]); U9-class, NOT closed → dIFS-shrub scenes stay blocked |
| S3 | U7 weave mode 2 (DEcombine/CSG) | C/V | ⚠️ DEFERRED | — | **RECON WRONG**: not single-slot/app-side. The mode-2 scenes are genuine **2-group DEcombine** (split at wEndTo, 6 combine ops from bOptions3+1; e.g. DEcomb1 = MsltoeSym2 `min` SierpHilbert). Faithful = a **two-orbit kernel** (two independent z-iterations + combine), an engine-core `DE_MASTER` change like the dIFS `g_difsDE` seam — NOT a dispatcher tweak. Visual-only (no x-check). 5 scenes recoverable later (both groups supported): DEcomb1, Dodeca Torus mix, ExcludeBulbMeng, Mengerplus for MC, ThePearl dIFS. See S3 decisions |
| S3b | U9 second-base/stack mem **+ indirect-call (HeightMapIFS) + two-orbit DEcombine (U7)** (~41 fm + 5 scenes) | C/V | ⏳ queued | — | 60→75% push |
| S3b | U10 re-triage structurable gotos | C | ⏳ queued | — | ~54 gotos vs ~12 real loops |
| S-PP | dense param-packing (sliders not bake) | C | ✅ DONE | orch | `<pending>`: replaced the multi-slot `{si,vi}` budget (6 scalars + 3 vec3) with a `LaneAllocator` over **24 scalar lanes** (paramA..F → uVec2* comps → uVec4* comps) + **up to 6 vec3-shaped units** (uVec3A/B/C, then uVec4* `.xyz` holders) — surplus scalars pack densely into idle uVec2*/uVec4* lanes (combined vec sliders), surplus vec3s overflow into uVec4* holders (the uVec4 units are a shared pool: scalars claim low→high, vec3 high→low). Lifted the Formula Workshop's occupancy algebra + `slotToUniform` into shared `engine-gmt/utils/uniformSlots.ts` (LaneAllocator + ScalarParamPacker there too); Workshop re-exports it (frag 236-pass byte-identical). Small `FormulaParamsWidget` add: a vec3 param on id `vec4A/B/C` renders as a 3-axis control over `.xyz`. **Bundled scenes with sliders 11 → 21 (+10 that previously baked)**; single-slot + ≤6-scalar + ≤3-vec3 byte-identical; corpus 293/0 untouched (binder/accessor only). Gates: typecheck, mb3d 24, weave **58** (+16). Residual: Jost1 still bakes (6 vec3 + 12 scalars = exact capacity edge, tipped by vec2-split alignment waste) |
| S4 | ledger UI + hybrid builder | V | ⏳ queued | — | optional polish |

## Decisions log
- 2026-07-03 — **NO-ADE AUTO-ROUTE (Deliverable 1 of the class unlock): DONE** (`389825b`). est7 is
  reliable, so `emitFusedHybrid` now auto-routes a weave with NO derivative-writing slot (new
  `slotTranspiler.writesDeriv`) + non-dIFS → estimator 7 + recipe (numDEeps 0.3, numDESmooth 2.5,
  mb3dFaithful, detail≤1.5). NARROW (avoid over-routing analytic scenes → noise/4× cost): 1/39 bundled
  routes (**Oxnot-Shells renders on plain import, GPU-verified**); box/Menger keep analytic. Two intern
  return paths both needed writesDeriv (the multi-slot one, slotTranspiler:340, false-routed
  Chrystal/HalTenny/JuliaSetSample on the first cut — fixed). Supersedes ADR-0085's opt-in stance for
  this subset (subtle orbit-collapse case DsyneGrafix stays opt-in). Emit-side; corpus untouched;
  typecheck 0, weave 58/0, mb3d 24/0, refine §E byte-identical. **NEXT = Deliverable 2** (test+un-pull the
  tail: DsyneGrafix analytic-or-dust, Aexion deOption-4, Hydra dIFS+lattice — see
  `plans/mb3d/sessions/S-numeric-de-class-unlock.md`).
- 2026-07-02 — **NUMERICAL-DE RELIABILITY: FIXED + GPU-CERTIFIED. est7 rendered black on most formulas;
  two coupled causes found via CPU-sim-first + real-ANGLE cert; the no-ADE escape class now RENDERS.**
  (Session `S-numeric-de-reliability.md`.) Commits `78a28ba` (sim) → `bef9cae` (log fix) → `68aa518`
  (floor fix). Root-caused deterministically in `debug/sim-numeric-de3.mts` / `sim-numeric-de4.mts`
  (GMT de.ts algorithm vs MB3D `CalcDEnoADE`, exact real formula + preset), then GPU-certed on RTX 2070 /
  ANGLE D3D11 (headed Chrome, `debug/cert-one.mts` — one scene per fresh boot so compile-gated quality
  applies). **TWO causes, both black:**
  - **(A) `iterateRadius` saturation → g=0 → DE explosion.** It returned `min(dot, cap)`; a fast/high-power
    escaper (Mandelbulb z⁸, Oxnot/Aexion in the weave) overshoots the cap in one step → centre + all 3 taps
    clamp equal → g=0 → `DE = R0·ln(R0)·e/(0+e·0.06)` ≈ 1e8 → ray leaps to ∞ → blank. **Fix: difference
    ln(Rout), not Rout** (`iterateLogRadius`). ΔRout ≈ Rout·Δ(ln Rout) ⇒ MB3D's `bufRout·ln(bufRout)/√Σ(ΔRout)²`
    == `ln(bufRout)/√Σ(Δln Rout)²` — the huge Rout cancels; float32-safe, never saturates. numerator now L0=ln(R0);
    numericNormal differences ln(Rout).
  - **(B) DE floor EXCEEDED the hit threshold.** MB3D floors at `msDEstop·0.25` (msDEstop = its hit threshold).
    The port floored at `numFootprint·0.25`, but GMT's hit threshold is `numFootprint·(uPixelThreshold/
    effectiveDetail)` — smaller. Mandelbulb preset `pixelThreshold=0.2` → threshold `fp·0.13` < floor `fp·0.25`
    → floored DE never < threshold → every ray misses → black, regardless of numDEeps/detail/marcher. **Fix:
    floor at 0.25× GMT's ACTUAL hit threshold** (mirror trace.ts:204-208). The CPU sim MASKED (B) — it used
    `pixelThreshold=0.5` where `fp·0.25 < threshold`; the GPU cert on the real preset surfaced it (why rule 2
    exists).
  - **`uNumDEeps` default 0.1→0.3.** est7 pairs with the mb3dFaithful marcher (Lipschitz clamp + StepDiv;
    auto-set on `.m3p` import) — native formulas selecting est7 should enable it.
  - **(C) deep-region FLICKER** (`b8920ee`, user-reported): high-nC escape field is chaotic → narrow probe
    noisy → sub-probe jitter flips hit↔miss → deep sections flicker black (DE CV 0.45@nC≈17 → 0.00@×3 probe;
    central-diff no help, nC-adaptive backfires). Fix = widen the primary probe, exposed as `quality.numDESmooth`
    knob (uniform `uNumDESmooth`, default 2.5; surfaced in the panel `whitelistParams`, `8c78e36`). A ×4 secondary
    (shadow/AO) distance correction was tried (`151fc95`) then reverted (`5ef956e`, noise).
  - **CERT:** Mandelbulb est7 black (σ 2.2) → full 8-fold bulb (σ 35, vs analytic 40); **Oxnot-Shells (PseudoXDB,
    no-ADE escape) blank → rich shell structure (σ 50).** The prime suspects the session named (probe scale,
    bCalcInside inversion) were NOT the cause — `bInsideRendering=FALSE` for Oxnot (`probe-oxnot-consts.mts` →
    addon.options2=0 → no inversion), and the probe cancels in the DE. Gates green (typecheck, refine §E
    byte-identity, mb3d 24, weave 58, corpus 0-mismatch render-only). ADR-0085 updated. **USER VERIFIED "GREAT"
    2026-07-03.** ▶ NEXT (handoff `plans/mb3d/sessions/S-numeric-de-class-unlock.md`): (1) **auto-route no-ADE
    scenes to est7 on import** (still opt-in → they default to analytic → blank) + (2) test + un-pull the
    class (Oxnot / DsyneGrafix / Recycledrelatives / Aexion / Hydra) on the user's per-scene visual verdict.
- 2026-07-02 — **OXNOT (Item 2 "step-floor") DIAGNOSED → it is the SAME wall as Aexion: a no-analytic-
  derivative ESCAPE formula. Pivot to a NUMERICAL-DE reliability session.** Worked Item 2; the "0.4 fudge
  floor over-steps the authored 0.3" premise was FALSIFIED — the faithful marcher steps by `uMb3dStepDiv`
  (the authored 0.3), never the floored `fudgeFactor` (trace.ts:131); the floor only feeds `maxSteps`.
  Override control proved Oxnot is **quality-independent** (TimeMachine responds to a `detail` override,
  Oxnot is byte-identical across bailout/step/budget/estimator/detail). Root-caused via usage triage +
  disassembly:
  - **PseudoXDB is the culprit** — it is Oxnot's only slot used by no other bundled scene (`_PolyFold-sym`
    → Jost1, `Riemann2` → HalTenny, both render → decode-exonerated). `debug/probe-oxnot-usage.mts`.
  - **Its decode is FAITHFUL** — disassembled the x87 `[CODE]` op-by-op: `x'=K(x²−y²)+c.x, y'=2Kxy+c.y,
    z'=Zmul(z²−x²−y²)+c.z`, `K=2|z|/√(x²+y²)`; deOption 0 and the `[CODE]` writes **no derivative** (`w`≡1
    → MB3D DE = `Sqrt(Rout)/|w|` = raw radius `r`). Not a port bug (why the cross-check reads clean).
  - **Orbit is sane** — `debug/probe-pxdb-sim.mts`: float32 ≈ float64 (0% NaN, ~9.8% bounded set near
    origin). The geometry EXISTS; float32 isn't degenerating it.
  - **GMT misses it with EVERY DE** (est 0/2/7-numeric/refine/centered-camera → all rays miss → blank);
    MB3D renders it richly (user's `PseudoXDB-temp.m3p` + JPG) because MB3D routes no-analytic-DE formulas
    to its NUMERICAL estimator (`CalcDEnoADE`). GMT's numeric DE (est 7) also misses it, and the user
    reports est 7 "breaks almost all formulas."
  - **CONCLUSION: Items 1 (Aexion) + 2 (Oxnot) collapse into ONE root cause** — no-analytic-derivative
    ESCAPE formulas (also likely Recycledrelatives, Hydra, DsyneGrafix). Neither is a 4D-escape nor a
    step-floor problem. The real lever is a **reliable numerical DE**. Pivoted to a dedicated session:
    `plans/mb3d/sessions/S-numeric-de-reliability.md` (CPU-sim-first parity vs MB3D `CalcDEnoADE`; prime
    suspects = the `mctDEoffset` probe scale + the missing `bCalcInside` inversion). Oxnot stays parked.
- 2026-07-02 — **4D ESCAPE RADIUS: BUILT FAITHFULLY, GPU-TESTED, REVERTED. The 2026-07-01 audit's "one confirmed
  structural lever" was a MIS-DIAGNOSIS.** Implemented the full scene-level 4D DE dispatch and reverted it after the
  GPU verdict showed no net benefit. What was built (all CPU-gated green — typecheck, mb3d 24, weave 58, corpus
  **333/0**, decompiler in-sync; **native off-path byte-identical**, CPU-proven 8648 B):
  - **`de.ts` `#define`-gated 4D escape** — an ADDITIVE `ESC_W2(v)` macro (`+ v.w*v.w` when `MB3D_ESCAPE_4D`, else
    empty) at all 6 escape sites (map/mapDist + the numeric centerCount/iterateRadius). Off = escape math unchanged.
  - **Scene-level merge** = a port of MB3D `CheckDEoption` (HeaderTrafos.pas:403-430): merged deOption 4/5/6 →
    the whole weave runs 4D (`doHybrid4DDEPas`, formulas.pas:3476). Aexion merges to 4, Melting-spot to 6.
  - **All-slots-w-coord** (slotTranspiler `is4D`): every slot persists `w`→z.w (not just the per-slot deOption-5/6
    trigger); dr = mb3dDr1 if the slot writes one, else left = Deriv1 ≡ 1. Bespoke getDist: deOption 4 →
    `|z.z|·ln|z.z|/dr` (formulas.pas:3525), 5/6 → `length(z)/|dr|`. paramB seeds z.w. escape4D → `builder.addDefine`.
  - **GPU verdict (user, real ANGLE):** **QuatP4 UNCHANGED** — it already rendered; it carries a real analytic `dr`
    (Quaternion/IntPow write it), and its `w` doesn't drive the bailout, so 4D escape is a no-op for it. The audit
    conflated "uses a 4th coordinate" with "needs 4D escape." **Melting-spot UNCHANGED-but-slower** (the 4-component
    `length(z)` estimator; the faithfulness gain is invisible). **Aexion STILL a solid fill.**
  - **Root cause of Aexion (uniqueness analysis, `debug/probe-mb3d-4d-uniqueness.mts` — classifies all 39 scenes by
    DE mechanism):** "no derivative" is NOT the problem — **20 no-derivative scenes render fine** because they are
    BOUNDED FOLDS (IFS/Menger/box), where `DE = r/dr = r` (raw radius) is valid. **Aexion is the ONLY no-derivative
    MANDELBROT-CLASS scene** (`x'=x²−y²+2wz+Cx`, quadratic ESCAPE; its `[CODE]` never writes Deriv1). An escaping
    orbit fundamentally needs a derivative. Both DE families fail: the analytic bulb-DE `|z.z|·ln|z.z|` is huge at the
    escape radius (~16) → rays tunnel past → fill; the numeric finite-diff DE (est 7, even with a 4D-gated Rout field)
    degenerates because Aexion's fixed-count Rout field is flat → gradient `g`→0 → DE → `R0·ln(R0)·numDEeps/0.06` →
    also huge → fill. Its 3 formulas (`_PolyFolding`/`_updateC`/`Aexion1`) + the deOption-4 DE are unique to it.
  - **REVERTED** (de.ts + core_math + emitFusedHybrid + slotTranspiler + fractal type → HEAD). Aexion + QuatP4 stay
    pulled. Kept `debug/probe-mb3d-4d-uniqueness.mts` (reusable DE-class analysis). Aexion PARKED (a future custom-DE
    / world-unit max-step-clamp session might crack it — it's low-value: "the 4d rotations are not very useful with
    this formula" per its own author).
  - **LESSONS (carry forward):** (1) "uses a 4th coordinate" ≠ "needs 4D escape" — a 4th coord only matters to the
    escape if `w` drives the bailout (it doesn't for a Quaternion Julia with a real `dr`). (2) The DE discriminator is
    **bounded-fold (DE=r works) vs escaping (needs a derivative)**, NOT 3D-vs-4D. (3) A derivative-less ESCAPE fractal
    is not renderable by any stock DE (analytic or numeric-finite-diff). (4) This is the 4th time this session a
    DE-fidelity finding — audit's, workflow's, or mine — did not survive contact with a real GPU render (rule 1
    again). The 4D escape needed a full faithful build + GPU test to falsify; CPU gates (333/0, byte-identical) were
    all green and told us nothing about the actual render.
- 2026-07-01 — **DE-FIDELITY AUDIT (11-scene multi-agent workflow) + CODE-VERIFICATION — the frontier is now
  DE/render fidelity, not decode.** Ran a fan-out/verify/synthesize workflow (`wf_a293e410-52c`, 23 agents)
  source-tracing every render-wrong scene to its MB3D DE function (`HeaderTrafos.pas:499` dispatch → `doHybridPasDE`
  3D / `doHybrid4DDEPas` 4D / `doHybridIFS3D` dIFS). **The adversarial verify stage caught 7 of 11 tracer
  misdiagnoses** (mostly the merged-`deOption` — MB3D merges slot deOptions via `CheckDEoption`, HeaderTrafos.pas:457).
  **RELIABLE outputs (code-confirmed):**
  - **Only 2 scenes are genuinely 4D:** Aexion-10bulbs (deOption 4) + QuatP4hybridJulia — need the 4D escape radius
    `x²+y²+z²+w²` (GMT is 3D-only, `de.ts` `dot(z.xyz)`; only intern #2 gets `has4D`). This is the one confirmed
    STRUCTURAL fix: `#define`-gated 4D escape + extend `has4D` to deOption 4/5/6 + estimator sync. Effort M, risk
    HIGH (shared marcher — needs a native-GMT no-change canary).
  - **Melting-spot + Ellarien are ALREADY FIXED** (the `wIsCoord` fix `34033d4`; the Phase-8 `bFirstIt` fix
    `a9ee280`) → regression-guards, not tasks. Several other findings assumed missing fixes the tree already carries
    (the bitmask `mapDEMeta`, the 0.4 fudge floor).
  - **Oxnot = "converged":** DE math is correct; the `0.4` fudgeFactor floor (emitFusedHybrid.ts:388, deliberate —
    guards the Theli/TimeMachine back-cutoff) over-steps its authored 0.3 → dust. A step-floor/maxSteps calibration,
    needs a GPU tuning pass.
  - **⚠ FALSIFIED on code-verification — the workflow's TOP-ranked fix does NOT work.** The audit ranked "no-deriv
    mechanism 1" (`recomputeRout` gate at emitFusedHybrid.ts:183, `|| usedIdx.length>1`) #1, validated on Hydra.
    Checked against the actual code: **none of Hydra's slots have `mb3dRout` in scratch** (it's undeclared → the
    change would COMPILE-ERROR), **no slot reads `mb3dRout`** (recompute = no-op), and **GMT's escape is `dot(z.xyz)`
    not the scratch `mb3dRout`** — the "escape at stale Rout" theory is wrong. The verify agent marked it VERIFIED
    but missed the declared/read check. NOT implemented.
  - **Hydra's real cause (code-traced): the #3 input-coord semantic risk, on weave re-runs.** Its slots DO grow a
    derivative (IcosahedronIFS writes `w`→`dr`, decompiled-formulas.ts:142-144), so it's NOT no-deriv. `_JuliaSets`
    (slot 0 of a 4-slot / 100-iter weave) re-runs every 4th iteration and re-derives its lattice from the FOLDED
    working-z instead of the original pixel; the 3 aggressive IFS folds scatter z hard between runs → cell-boundary
    noise. **JuliaSetSample renders fine** because its one companion slot (Integer Power bulb) keeps z gentle. Faithful
    fix = bind `_JuliaSets`'s input-coords (offsets 0/8/16) to the ORIGINAL pixel `z0` (captured once in loopInit),
    not the evolving z — the z0-plumbing explored for Aexion. Hard-ish; not a one-liner.
  - **META-LESSON (3rd time this session): DE-fidelity findings — mine, the recon's, OR a multi-agent workflow's —
    do NOT survive contact with the actual code until per-formula verified.** Aexion was mis-filed "Oxnot no-deriv"
    before tracing; Hydra's audit "stale Rout" was falsified against the scratch/escape code. The workflow's VALUE was
    structural (grouping, catching 7 tracer errors, confirming the 2 real 4D scenes + the already-fixed set); its
    specific one-line fixes are NOT trustworthy without reading the emitted GLSL + scratch declarations.
  - **Revised direction ranking:** (1) **4D escape** (Aexion + QuatP4) — the one confirmed structural lever; (2)
    **Oxnot step-floor** (calibration + GPU tuning, cheap-ish); (3) **Hydra z0-input-coord** (needs z0 plumbing); (4)
    U7 two-orbit (+6, independent); the "no-deriv Rout recompute" group is RETIRED (falsified).
- 2026-06-30 — **TIER-1 CHEAP-UNLOCK BATCH SHIPPED (5 of 6; real-GPU verified).** Worked the batch in
  `sessions/S-tier1-unlocks.md`. Corpus faithful **293 → 333/0** (deterministic), bundled scenes **32 → 40**
  (+8), **40/40 render** on real GPU (ANGLE), **8 new render coherent geometry**, **zero regression** (all 293
  prior formula bodies byte-identical — verified by key-diff; every certified scene holds its nb on the cert sweep).
  - **#1 `fild [esi-0x18]` → `ItResultI` (mb3dIter) SCRATCH offset 64.** Added to the decompiler SCRATCH map
    (decompile+xcheck) + `SCR`; GMT-side bound to `float(i)` each iteration in `emitFusedHybrid` loopBody (NOT
    threaded scratch — it's the live loop index). → **+Rama-Elysium** (TorusIFS renders its toroidal rings).
    Unblocked the 9-formula `fild` set EXCEPT helistairsIFS (see denylist note).
  - **#2 const-pack `case 15` = DSQRRECI** = `1/Max(1e-40, v²)` (CustomFormulas.pas:516; source name is DSQRRECI,
    not "DRecipSquare"). One line in `constPacker.ts` mirroring case 13. → **+toricaleggs** (renders the radial
    egg-spiral). No `.m3f` declares it as a string option, so no TYPE_MAP change needed (numeric type via `.m3p`).
  - **#3 `_JuliaSets` input-coords C1/C2/C3 @ offsets 0/8/16 → working x/y/zz.** The authoritative struct
    (`TypeDefinitions.pas:87` TIteration3Dext) confirms 0/8/16 = the pre-4D-rotation input coords; **offset 16
    (0x10) was MIS-mapped to `c.w`** — corrected (0 faithful formulas emitted c.w, so safe). → **+Dainbramage-Hydra,
    +JuliaSetSample**, both render coherent _JuliaSets geometry. **⚠ Honest caveat: neither has an MB3D ref JPG**,
    so the prompt's strict 1:1 visual check was impossible; the input-coord→z.xyz binding (exact only for iter-0
    pretransforms) rendered valid, no divergence/garbage — but ref-confirmation is owed if a ref is produced.
  - **#4 `Aexion1` `[esi-0x38]` = J4/Cw @ offset −56** (TIteration3Dext J4). One field-map add. → **+Aexion-10bulbs**
    (renders exactly 10 bulb clusters in a ring; carries the known DE "dust", geometry correct).
  - **#5 unsigned `ja`/`jbe`-after-`and ah,mask` jCC sync + GP-flag `skipFiller`.** (a) `decodeCond`: `jbe`≡`je`,
    `ja`≡`jne` after AND clears CF (xcheck already evaluated these — decompiler lagged). (b) `detectGpBranch` now
    skips padding nops between `and eax,imm` and the jCC (koch_surf's `and eax,1; nop; nop; je`). → **+Dainbramage-
    Home** (koch_cube) **+ bonus KochSurf-Sample-6, Oxnot-Flexing** (koch_surf flipped — its other slots were
    already supported; the recon predicted it wouldn't flip, but the GP-flag fix cleared its last blocker).
  - **#6 Bulbox intern #5 — DEFERRED (scope correction).** The recon called it an S "radius-gated mix of #4+#0",
    but the MB3D source (`formulas.pas:5114` HybridSuperCube2) is a from-scratch port of TWO asm formulas — the
    scaled power-2 triplex `HybridItIntPow2scale` (NOT the #0 latitude bulb) + the Amazing-Box `HybridCube` — plus
    a blend/renormalize region + exact 6-option packing offsets, and **interns have no cross-check** → a hand-decode
    error ships silently with no gate. Per the "don't force-ship / no half-implemented features" rule, deferred to a
    dedicated visual-verify session rather than ship a likely-imperfect, unverifiable intern. **−BulboxCut** (the
    one expected scene not landed).
  - **helistairsIFS DENYLISTED (`xcheck.mjs DECODE_DENYLIST`).** The `fild` fix unblocked it, but its cross-check
    is **const-seed-flaky** (~40% of runs trip a maxErr≈13 divergence on the DE) — a residual decode gap (an
    integer-sign-reinterpret / option-flag branch beyond fild) the recon's "geometry decode clean" missed. Flaky →
    excluded from BOTH the gate (corpus-check) and the shipped library so neither is non-deterministic. NOT a scene
    target (TorusIFS, not helistairsIFS, carries Rama-Elysium). This is the prompt's "diag undercounts / 0-mismatch
    necessary-not-sufficient" trap made concrete. **Net: +40 reliable (would be +41 with the flaky one).**
  - **Meta:** the +8 scenes beats the +6 expected (from #1–#5; #6 deferred) thanks to 2 koch_surf bonus scenes;
    the recon's "~+7 incl. BulboxCut" lands as **+8 without BulboxCut**. Gates: typecheck · test:mb3d 24 ·
    weave 58 · corpus 333/0 (×5 stable) · check:mb3d-decompiler in-sync · cert-render 40/40.
  - **USER GPU VALIDATION (same day, with MB3D ref JPGs) → 6 of 8 faithful; 2 reclassified render-WRONG +
    PULLED.** The cert sweep's nb=1.00 confirmed non-blank but NOT geometry-correct (the documented limit). User
    flew all 8: **6 match their refs** (Rama-Elysium, toricaleggs, JuliaSetSample, Dainbramage-Home, KochSurf-
    Sample-6, Oxnot-Flexing); **2 render wrong and no DE/Quality setting fixes them:**
    - **Aexion-10bulbs — "dust" → ROOT-CAUSED to a 4D-formula gap (source-traced; supersedes the first-pass
      "Oxnot no-derivative" guess).** Aexion1's DEoption is **4**, and MB3D routes DEoption **4/5/6** to a SEPARATE
      DE function `doHybrid4DDEPas` (HeaderTrafos.pas:499; formulas.pas:3492-3527): the orbit escapes on the **4D
      radius** `x²+y²+z²+w²`, the derivative is `Deriv1` (seeded 1, and Aexion1's `[CODE]` never writes it — the
      `//todo: parse 3d DEs deriv1` gap), and the DE is the escape-time estimate `Abs(z)·Ln(Abs(z))/Deriv1`. GMT
      treats every decompiled formula as **3D** (escape on `x²+y²+z²`, only intern #2 is 4D) and feeds the orbit's
      `w`-channel into `dr` → garbage derivative → dust. Verified by experiment: pinning `dr=1`, seeding `z.w`, and
      plugging MB3D's exact `|z|·ln|z|` getDist each gave a SOLID FILL — the orbit/escape-time values cannot match
      MB3D without the 4D escape radius. **Fix = 4D-decompiled-formula support** (new roadmap item below); the #4
      Cw decode is correct.
    - **Dainbramage-Hydra — "noisy".** Weave `_JuliaSets → IcosahedronIFS → ABoxPlatinumB → koch_oct`: a no-deriv
      LATTICE slot (`_JuliaSets`) woven with 3 IFS slots (their DE-meta reads deOption 2, NOT 20 — so they route to
      estimator 2 r/dr, not the dIFS orbit-trap) → noise over the (correct) radiating-tentacle shape. The #3 input-
      coord decode is correct — **JuliaSetSample** (the simple `_JuliaSets → Integer Power` weave) renders faithfully,
      proving the decode. Hydra's noise is a DE-fidelity residual NOT yet traced to MB3D-source precision (unlike
      Aexion); candidate: the IFS slots should be dIFS (estimator 6) but their .m3f DEoption is 2 — needs a per-
      formula DE-dispatch check. **Folded into the "faithful DE dispatch" roadmap item below.**
    - **Action (interim):** both PULLED from the bundle (`gen-sample-scenes.mjs` SKIP, like spineJulia) → bundle
      **40 → 38** — NOT as the fix, only so the sample list stays all-faithful until the DE work lands; the decoded
      formulas stay in the library and the scenes return once they render right. Net **+6 user-confirmed-faithful**
      (32 → 38). Decoder fixes #1–#5 all stand. **LESSON (re-confirmed): cert-render nb is a non-blank check, NOT a
      fidelity check — a new scene is only "faithful" after a human flies it against the MB3D ref. The two casualties
      are exactly the two flagged pre-validation as DE-risk (#3 semantic, #4 no-cross-check-for-render).**
- 2026-06-30 — **SCENE-UNLOCK RECON (no code changed) → `research/scene-unlock-triage-2026-06-30.md`.**
  Re-measured the corpus on real GPU + visually ref-compared 18 scenes + triaged every blocked-formula gate
  with `diag.mjs` + 6-agent adversarial source verification against the MB3D Pascal. **Counts:** 33 import
  (unchanged), **~25/80 render faithfully** (up from ~22 floor), ~8 render-wrong, 45 blocked; bundled 25 ✅ /
  7 ⚠ / 0 blocked. **Verified cheap-unlock batch (Tier 1, all S, cross-check-gated, ~+7 scenes):** (1) `fild
  [esi-0x18]`=`ItResultI` SCRATCH offset 64 — blocks **9 formulas**, the OTrap-on-iters colour idiom; trap-check
  passed (geometry/DE decode clean, only the unused trap-colour output damaged) → +Rama-Elysium. (2) const-pack
  `case 15`=DRecipSquare `1/max(1e-40,v²)`, one line like case 13 → +toricaleggs. (3) `_JuliaSets` input-coord
  offsets 0/8/16 → +Dainbramage-Hydra,+JuliaSetSample (⚠ semantic risk: input-coord→z.xyz exact only for
  iteration-0 pretransforms — GPU-visual-check). (4) `Aexion1` `[esi-0x38]`=Cw offset → +Aexion-10bulbs.
  (5) unsigned `ja/jbe`-after-`and` jCC sync (decompiler lags the interpreter) — **measured 293→296/0** →
  +Dainbramage-Home. (6) Bulbox intern #5 (radius-gated mix of ported AmBox+IntPow bulb) → +BulboxCut.
  **Corrected stale classifications:** **Amazing Surf 2 is NOT cheap branches** — it's IEEE-754 *field surgery
  in the fold body* (exponent-clamp + sign-carry pow2 multiplier) silently dropped as NEUTRAL int-ops → current
  GLSL reads an unassigned local; HARD-WALL (L, bit-pattern model). **HeightMapIFS + `_MapTranslate` are real
  indirect-call walls** (`GetMapPixelDirectXY`/`GetMapPixelSphere` sample an external disk bitmap) → decompiling
  gains 0 scenes; need a texture-asset pipeline. **U7 mode-2 verified 6 recoverable** (not 5 — +cutted-sphere)
  but needs per-group estimator selection + faithful CSG ops (maxInv=signed difference, mixF1=sequential
  hand-off, not min). **Meta-lesson:** `diag` UNHANDLED count can UNDERCOUNT — silently-dropped NEUTRAL int-ops
  give a wrong-but-"clean" decode (a new face of the ADR-0087 cross-check blind spot); a low count is necessary,
  not sufficient — check the emitted GLSL for reads of never-assigned locals. **Tool-hygiene S-fix found:** the
  decompiler `parseInt`-misparses an indirect `call [reg+off]` operand → infinite recursion ("Max call stack")
  → guard it to a clean UNHANDLED (latent hang for the whole Map-func family).
- 2026-06-28 — **SCENE FIXES round 2 (real-GPU verified, ANGLE/D3D11). 2 committed, 2 reported PARTIAL
  (both spec hypotheses FALSIFIED by experiment).** Worked the 4 items in `sessions/S-scene-fixes-round2.md`.
  Full re-cert + contact sheet regenerated; no certified-scene regression (Genetic Menger/AureliusCat/material
  colors/Surreal shell/MengerTrees clean — no overstep noise; the 2 EMPTY scenes were already empty pre-session).
  - **A1 Theli/TimeMachine — FIXED (`0179051`).** Fudge floor 0.3→0.4 (a coarser step crosses the dense volume
    within the 2000-maxSteps cap) + `overstepTolerance=2.0` (runtime uOverstepTolerance closest-miss recovery,
    GMT's analog of MB3D `bStepsafterDEStop`, trace.ts:221-245). Scoped to the authored-header block → standalone
    library byte-identical. Both scenes now render the FULL model (back no longer cut off) matching their refs.
  - **Wada — FIXED (`826be3e`), spec diagnosis CORRECTED.** Round-1's "lost iteration-0 trap capture" was
    FALSIFIED: seeding g_difsDE with the un-transformed sphere distance is a confirmed no-op (never the orbit
    minimum). Real cause = orbit COVERAGE. Wada's 3-slot weave (PolyFold-symIFS → SphereIFS → SphereIFS) ran at
    header iterations=2, so the 2nd SphereIFS (the small CENTRE sphere) never executed; the outer 5 are the
    5-fold polar-fold copies of the 1st SphereIFS. Fix: floor coreMath.iterations to cover every slot's first
    appearance in the weave order. Scanned all bundled scenes → ONLY Wada affected (2→3); Dainbramage (200/322)
    and Lenord (60/65) already cover their slots → byte-identical. Confirmed in source: MaxIt=header Iterations
    (HeaderTrafos.pas:551); MB3D folds after every non-silent slot (formulas.pas:3262-3282) but PolyFold never
    writes Rout so the after-transform fold reads stale data — i.e. NOT a trap-init capture.
  - **dr-gap numeric route — PARTIAL, the "6 scenes / one lever" framing FALSIFIED (no code change).** The
    precise "no used slot produces a derivative" detector selects ONLY Oxnot — every other named scene has a
    deriv-producing slot. The failures are heterogeneous, not one class: Oxnot (true no-deriv, est7 leaves it
    fragmented), Recycledrelatives (has deriv, fragmented-iso DE residual), HalTenny FoN (has Integer-Power deriv,
    renders EMPTY — different bug), DsyneGrafix (has deriv, ORBIT-COLLAPSE dust). est7 cleanly recovers ONLY
    DsyneGrafix (beautiful ornamental render at numDEeps≈0.1) — and it's not statically detectable. The dDEscale
    port is ALSO not 1:1: MB3D's scene dDEscale for DsyneGrafix is 0.95 (iter-weighted slot-DEscale avg,
    HeaderTrafos.pas:715/770) but numDEeps=0.95 renders flat mush (sig 40) while 0.1 gives the good render
    (sig 87) — a ~10× calibration gap. A blanket missing-dr→est7 auto-route would over-route (regress the ~5
    dr-gap scenes that already render: AkuraPare/Jost1/Hal-Tenny-Resistance/Melting/Virtual tubes) — exactly
    ADR-0085's documented concern. Per spec ("report partial, don't force"): est7 stays a MANUAL opt-in;
    DsyneGrafix recoverable that way. AkuraPare/Jost1/HalTenny/Virtual tubes/Melting were fixed by the
    [CONSTANTS] fix + round-1 and render fine now.
  - **Hyperben2 — PARTIAL, spec hypothesis CONCLUSIVELY FALSIFIED (no code change).** The extra-foreground-Menger-
    slab is NOT a decompiler/packer regression: (1) Menger3.m3f has NO `[CONSTANTS]` block → bf81087 didn't touch
    it; (2) U5 DID restructure Menger3's body (`<`→`!(>=)`, NaN-divergent), but reverting it to the b85f271
    certified form renders BYTE-IDENTICAL → not the cause; (3) Menger3's option types are all type-0/6, untouched
    by the entire U-series, so its packed Cm values are unchanged; (4) the slab is robust to overstepTolerance
    (0 vs 2) and estimator (0/1/2). The slab's true cause is elsewhere (camera framing / Amazing-Box intern DE /
    S1 estimator) and needs a separate engine-side bisect — NOT shipped a wrong fix.
- 2026-06-28 — **DENSE PARAM-PACKING SHIPPED — multi-slot hybrids now expose sliders instead of baking
  literals.** The multi-slot allocator's budget was **6 scalar params (paramA..F) + 3 vec3** — a 7th scalar
  overflowed and the WHOLE scene fell back to baking (`parametric=false` → `parameters:[]` → no sliders),
  even though 18 `uVec2*`/`uVec4*` float lanes sat idle (declared in core_math.ts, synced by UniformManager).
  Reused the Formula Workshop's existing solution: lifted its occupancy algebra (`getSlotOccupancy` /
  `componentSlotBase` / `buildOccupancyMap` / `isSlotConflict`) + `slotToUniform` into a shared
  **`engine-gmt/utils/uniformSlots.ts`** (both trees consume it; the Workshop re-exports from
  param-builder.ts / variable-renamer.ts so its imports are unchanged). Added a `LaneAllocator` +
  `ScalarParamPacker` there: a dense scalar cursor over **24 lanes** (paramA..F → uVec2A/B/C comps →
  uVec4A/B/C comps) plus the 3-unit vec3 pool kept for genuine vec3 params (rotations / X-Y-Z triples +
  `mb3dRot`). `bindOptions` (decompiled) and `internMultiParam` (intern) now allocate through the packer;
  vec-lane scalars group into ONE combined vec slider per base uniform (label joined with `" | "`, per-axis
  defaults), rendered by the shared `FormulaParamsWidget` (Vector{2,4}Input, per-axis editable/animatable —
  same path MB3D's X/Y/Z→vec3 already proved). `startSlot()` aligns each slot to a fresh vec base so a vec
  uniform is never split across two slots (would collide on coreMath + duplicate the param id). 4D
  (Quaternion) hybrids still reserve paramA/B and bake (untouched). **No kernel / uniform-schema change.**
  - **vec4-as-vec3 overflow (same-session follow-up):** once uVec3A/B/C are full, surplus vec3 params spill
    into uVec4* units as `.xyz` holders (`.w` unused). The 3 uVec4 units are a SHARED pool — scalar-packing
    claims components low→high (A→B→C), vec3-overflow claims whole units high→low (C→B→A); collide only when a
    scene needs both >12 scalars AND >3 vec3 (no bundled scene does). Small `FormulaParamsWidget` add: a
    `type:'vec3'` param with id `vec4A/B/C` renders as a 3-axis control over `coreMath.vec4*.xyz` (w=0). GLSL:
    `mb3dRot(uVec4C.xyz, …)` for rotations, `uVec4C.x/.y/.z` for X/Y/Z triples.
  - **Effective capacity before → after: 6 scalars + 3 vec3 → 24 scalar lanes + up to 6 vec3-shaped units (3
    uVec3 + 3 uVec4-as-vec3).**
  - **Bundled scenes with sliders: 11 → 21 (+10 that previously baked)** (probe `probe-mb3d-packgain.mts`,
    baseline-confirmed by stashing the change: old code = 0 of these parametric, 21 baked → new = 11 baked).
    +8 from scalar dense-packing (AkuraPare, Chrystal, DsyneGrafix-Getting Loopy, HalTenny-Freak Of Nature,
    Hyperben2-Ozosphere, LightBulbMoon-A Fabulous Excuse, Oxnot-Shells, Surreal shell); +2 from vec4-as-vec3
    overflow (Genetic Menger, Dainbramage). Still baked: 11 — 9 unmapped-option-type (bake-but-render; e.g.
    material colors, Wada basin), 1 has4D (QuatP4hybridJulia), 1 vec3-capacity-edge (Jost1: 6 vec3 + 12 scalars
    exactly, tipped over by the vec2-split alignment waste).
  - **Single-slot + ≤6-scalar + ≤3-vec3 multi-slot are byte-identical** (vec3 never enters the uVec4 region for
    them; lane order starts at paramA; the 11 already-parametric scenes unchanged) — `test:mb3d:weave`
    single-slot `paramA===-1.5` + Menger3 `CScale=vec3A` + multi-slot 5-param assertions green. **Workshop tests held**: `test:frag` 60/60, `test:frag:integration` 236-pass identical
    to the stashed baseline. Corpus cross-check 293/0 untouched (no decompiled GLSL bodies changed — this is
    binder/accessor + slider-schema only). Shared module: `engine-gmt/utils/uniformSlots.ts`.
- 2026-06-28 — **FORMULA [CONSTANTS] FIX (ADR-0087, `bf81087`) — corpus scenes 28 → 33, the "Cp0/Cp8
  mask-LOAD ceiling" was a fixable bug, not a wall.** A formula's `[CONSTANTS]` block (195/460 corpus
  formulas) is written from Cp0 upward, OVERWRITING the PAligned16 abs/sign masks at those offsets — so
  U6's "Cp0/Cp8 is always the abs bit-mask" assumption was wrong for them. The decompiler turned real
  declared constants (e.g. PolyFold-symIFS's 1/2π at Cp0, 2π at Cp8) into `abs()`. The cross-check missed
  it because it seeded Cp0/Cp8 randomly AND the interpreter mirrored the same wrong abs() → both sides
  matched a value neither verified (the U1 PAligned16 blind-spot, again). **Visible failure: Wada basin
  rendered ~40 spheres in a torus** — the dropped 2π factors collapsed PolyFold-symIFS's symmetry snap
  from 2π/Order (5-fold) to 1/Order rad (~32-fold). (User caught the ~40-vs-5 sphere count; that was the
  tell.) **Fix:** parse `[CONSTANTS]` per .m3f → bake the real constant as a literal at the covered
  offsets (decompile.mjs), gate the interpreter's abs/sign mirror off + seed the real values there
  (xcheck.mjs), thread through generate-library + corpus-check. Per-offset discrimination: a formula
  with 1 constant keeps Cp0=const / Cp8=mask; no-`[CONSTANTS]` formulas untouched. App side unchanged
  (literal bakes in). **Regen: 88 bodies changed (ALL declare `[CONSTANTS]`, verified; 0 added/removed),
  corpus 293/0.** This deliberately broke the byte-identical invariant — correctly (those 88 were
  rendering wrong). **GPU re-cert:** Wada = correct 6-sphere basin; AkuraPare = `_ngon` hexagonal
  ziggurat; Jost1 = `_PolyFold-sym` temple; Virtual tubes / HalTenny import. Certified scenes
  (AureliusCat/material colors/Theli/Abominog) byte-identical, GPU-confirmed no regression.
  Recycledrelatives stays a separate fragmented-iso-surface residual (its ABoxModKali body changed but
  the fan is a DE-fidelity gap). Re-bundled (`362f727`): 33 loadable. **LESSON: cross-check 293/0 held
  both before and after — this was GPU-vs-ref-only visible. Mask/const decode changes MUST be GPU-re-cert'd.**
- 2026-06-28 — **SCENE FIXES round 1 (real-GPU verified vs refs, ANGLE d3d11).** Worked FIX 0/1/2/3 from
  `sessions/S-scene-fixes.md`. **2 committed, 2 diagnosed-deeper-than-spec (no code change).** No certified-scene
  regression (AureliusCat mixed-dIFS σ≈55, material colors σ≈42, Genetic Menger σ≈34, Theli-At σ≈58 — all render).
  - **FIX 1 Melting spot bloxx — FIXED (`34033d4`), matches ref.** The 4D `w`/`dr` conflation: DEoption 5/6 means
    `w` is the 4th SPATIAL coord and the derivative lives in mb3dDr1 (MB3D DE `Rst/|Deriv1|`, Calc.pas:664), vs
    DEoption 2/11 = `Rst/|w|` (w IS the deriv). Added a deOption∈{5,6} w-is-coordinate wrapper (seed w from z.w,
    write folded coord back to z.w, route mb3dDr1→dr), init mb3dDr1=1.0 (Calc.pas:2732), seed z.w slice. σ ~2→~24,
    renders the blocky 4D Sierpinski/Menger cube hybrid. (Colour tint differs — separate lighting matter.)
  - **FIX 0 Wada basin — UN-BLACKED (`4e4466c`), geometry residual.** Root cause confirmed = the user's hypothesis:
    the dIFS g_difsDE fold ran EVERY iteration, so PolyFold-symIFS (deOption 21, no mb3dRout) folded the loopInit
    mb3dRout=0 on iter 0 → g_difsDE collapses to 0 → black. Gated the fold to dIFS-owner (deOption-20) slots in the
    dispatcher (MB3D's per-iteration fold is a no-op on transform slots anyway, except the iter-0 collapse).
    σ 0.5→~21. **BUT geometry renders a rotationally-symmetric torus, not the ref's 6 dark spheres** — a separate,
    deeper fidelity residual in the PolyFold-symIFS+SphereIFS weave (not the g_difsDE collapse this fixes; iteration
    count + camera ruled out — iter2 vs iter24 σ identical, camera confirmed correct by user).
  - **FIX 2 Recycledrelatives — clamp theory DISPROVEN, no fix.** The ±2 Julia clamp is NOT the cause: the preset
    carries the exact unclamped c=(−0.4,3,3), and forcing c=(−0.4,1.5,1.5) (within ±2) is EQUALLY black. The real
    cause is a **fragmented iso-surface** — the fused ABoxMod1+ABoxModKali Julia weave resolves the fan as sparse
    POINTS, not a solid surface (same DE-fidelity class as DsyneGrafix "dust"). glow=4 exposes the correctly-
    positioned sparse fan/shell (σ→48); numeric estimator (est 7) and finer fudge do NOT solidify it. The geometry +
    camera are right; the surface is genuinely fragmented. Deep DE-fidelity residual — user can enable glow to view.
  - **FIX 3 Abominog — geometry correct, detail unresponsive, no fix.** Renders the two symmetric fern/totem
    structures (geometry RIGHT). detail 6→12 + maxSteps 1500→3000 sweep leaves σ unchanged (18.9→19.1) and the image
    visually identical — confirming the S1 "far detail is convergence-driven, not steps/detail" finding for this
    1000-iter IFS class. No clean heuristic emerged (per spec → note as per-scene tuning). The monochrome-green vs
    ref's orange/teal is a SEPARATE colour-import gap, not detail.
- 2026-06-28 — **SCENE VALIDATION round 1 (user GPU-tested the 7 newly-bundled scenes).** chrystal + material
  colors GOOD; 5 bugs, all root-caused (diagnostic agent, CPU, grounded). **2 fixed:** Dainbramage FoldInt
  sign-flip (`c44ba3e`, GMT was −MB3D's fold), Wada basin dIFS deSlot-misroute (`1d49444`, picked a deOption-21
  transform over the deOption-20 dIFS owner → est 2 not 6 → black). **3 in `sessions/S-scene-fixes.md`:** Melting
  spot bloxx BLACK = 4D `w`/`dr` conflation in Sierpinski4ex/MixPinski4 (wrapper seeds w from dr + writes folded-w
  into dr; real deriv mb3dDr1 dropped) — HIGH, involved (needs a wIsCoord flag); Recycledrelatives BLACK = Julia
  c=(−0.4,3,3) hits GMT's ±2 clamp — MED; Abominog under-resolved detail — MED-LOW, render sweep. **Cleared false
  suspects:** U3 type-12 matrix is CORRECT (verified vs Pascal); S1 quality mapping is NOT the cause (params resolve
  sanely) — the bugs are formula-level DE math + slot selection. **Validate-first pivot is paying off** — these are
  real fidelity bugs cross-check can't catch, surfaced only by GPU-vs-MB3D-ref comparison.
- 2026-06-28 — **TESTABILITY FIX + process gap.** User: "the new scenes don't appear in GMT, nor any thumbnail/cert
  output to look against — my hands are tied." Root cause: we counted faithful scenes via `scan-mb3d-scenes.mts`
  but **never re-ran `gen-sample-scenes.mjs`**, so the modal's click-to-load list (`sampleScenes.ts`) was stale at
  21 while 28 imported faithfully — the unlocks were INVISIBLE in the app. Regenerated → **27 bundled** (28 faithful
  − spineJulia, now SKIP-denylisted: imports clean but renders solid-white interior). **STANDING PROCESS CHANGE:
  every coverage stage MUST re-run `gen-sample-scenes.mjs` so unlocks are immediately loadable + cert-renderable.**
  Measuring coverage ≠ surfacing it. Also: MB3D formula LIBRARY (293) needs a dev-server restart to refresh (catalog
  is memoized); MB3D library has no thumbnails by design (separate FormulaPicker surface) — thumbnails = net-new work.
- 2026-06-28 — **S3 M-tier SHIPPED (partial): U2 `af91232` / U5 `8561398` / U4 `a935fa3`; U7 deferred.** Corpus faithful **27 → 28**; library **279 → 293** (+14). All CPU gates green (typecheck, mb3d 24, weave 42, refine 46, corpus **293/0**, decompiler in-sync). **The M-tier did NOT reach the ~48 (60%) checkpoint — it landed +1 scene.** Root cause: the two biggest *estimated* scene levers both hit harder walls than the recon predicted:
  - **U7 (est "+≥2 now, 5–8 later") was misdiagnosed as a single-slot app-side win.** Dumping the addons proved every flippable mode-2 scene is a genuine **2-group DEcombine** (the stack splits at `wEndTo`; group1 `[0..wEndTo]` is CSG-combined with group2 `[wEndTo+1..5]` via one of 6 ops `min/max/maxInv/linS/smoothS/mixF1` from `bOptions3+1` — HeaderTrafos.pas:595-668, Calc.pas:609-649). `buildWeaveSequence` only sees group1 (hence the "single slot" illusion). Faithful emit needs **two independent orbit iterations + a combine**, which the single-orbit `DE_MASTER` kernel (de.ts) can't express — it's an engine-core change analogous to the dIFS `g_difsDE`/estimator-6 seam, and it's **visual-only (no cross-check)**, so a wrong CSG ships silently. Deferred to a dedicated two-orbit-kernel session rather than shipping half-correct math. 5 scenes are then recoverable (both groups already supported): DEcomb1, Dodeca Torus mix, ExcludeBulbMeng, Mengerplus for MC, ThePearl dIFS.
  - **U4's dIFS-shrub scenes (est "+≥13" via U2) are blocked by HeightMapIFS, not the Cm/sphereIFS gaps U2/U4 closed.** HeightMapIFS calls a compiled MB3D height-map sampler through a struct function pointer (`call dword ptr [esi+0x10c]`) that isn't in the formula's `[CODE]` — an indirect-call / second-base wall (U9-class). sphereIFS itself was only a case-mismatch (already decompiled as `SphereIFS`); the case-fix recovered `material colors` (the one shrub-family scene whose other slots were all supported).
  - **U2 + U5 delivered their stated unit (the const-pack gap + 14 formulas) but 0 *corpus* scenes** — U2 is a prereq by design; U5's 14 formulas are co-blocked or standalone-only. The library win is real (transpile-clean 244→293).
  - Residual narrow ceiling unchanged: Cp0/Cp8 **mask-LOAD** scenes (`_ngon`, `_PolyFold-sym`, Riemann2, IcosahedronIFS, foldinghexIFS, totoricalIFS — need a mask-load decode beyond U6) and the genuine-loop formulas (U10). **Owed visual cert (real GPU, human judgment) still open: U3 MixPinski4 matrix order, U8 Dainbramage FoldInt look, + the new `material colors`. Library GOOD render-triage re-baseline left for a GPU session (CPU SwiftShader sweep ≈ 33 min, machine-hogging).**
- 2026-06-28 — **S2 cheap-wins SHIPPED** (U3 `c2895cb` / U6 `91b97f5` / U1 `2f250ad` / U8 `c058a46`). Corpus faithful **22 → 27**. All CPU gates green (typecheck, mb3d 24, weave 42, refine 46, corpus **279 / 0 at the REAL PAligned16 values**, decompiler in-sync). **U1 corrects ADR-0083**: the `Cp` gap is the deterministic DivUtils.pas:1616 PAligned16 fixed table (verified line-for-line), NOT an ambiguous runtime dump. Under-delivered on corpus SCENES vs the per-unlock estimates (U1 ≥8→+2, U8 +3→+1, U3 +3→+1) — the cause is multi-slot blocking: each unlock freed its FORMULA in all its scenes, but co-slots (Quadrat3D external-CODE, Riemann2/`_ngon` Cp-mask LOADS, Cm dIFS gaps) keep those scenes blocked until the M-tier (U2/U4/U5/U7). FORMULA-level win is strong (standalone transpile-clean 179→244, +65). Cross-check stayed 0-mismatch by construction (U6 abs both sides; U1 known-value both sides). Visual cert pending (not gate-covered): U3 MixPinski4 matrix order + U8 Dainbramage FoldInt.
- 2026-06-27 — fidelity-first order confirmed by user. Coverage bar 75% (empirical).
- 2026-06-27 — S0 shipped; decompiler drift guard added (`check:mb3d-decompiler`).
- 2026-06-27 — **S1 fidelity pass SHIPPED** (6 commits `4c85571`..`5b2d251`, ADR-0086 + ADR-0085 reconcile). All gates green (typecheck, mb3d 24, weave 42, refine 46, corpus 279/0, decompiler in-sync). Real-GPU re-cert all 20 scenes hold/improve. Judgment calls: (1b) box-slot LEFT at est 1 — est 1 (r-1)/dr ≡ est 2 r/dr pixel-identical on box geometry, so flipping the calibrated path was gratuitous risk. (1d/1e) maxSteps + detail anchor DECLINED — Theli's "missing background" is a time-boxed-accumulation artifact (grazing far surfaces need samples), NOT steps/detail (swept both, no effect); reducing the budget = pure regression risk. (3) fog calibration: DepthCol2-primary + white-luminance guard + near=1.3·td/far=5·td were re-derived from the spec's raw constants, which regressed (clamp over-fogged TimeMachine, near≈far collapsed deep-zoom, white DynFog washed Hyperben2/BatJorge).

## S1 regression remediation (2026-06-27, post-broad-corpus visual check)
User flagged broad regressions (Stage 1 certified on only 20 bundled scenes; the wider corpus showed two):
- **Incomplete images** (`4b46b5f`) — S1 1c honoured ZstepDiv as fudge (0.5→0.3, finer) but DECLINED the
  paired maxSteps raise (over-generalised from Theli). Coupled `maxSteps = clamp(750/fudge, 1500, 2000)` —
  only RAISES above the 1500 base, so fudge≥0.5 scenes byte-identical. FIXED.
- **Fog washout** (`09aa540`) — root cause is the miss-ray BACKGROUND FILL (envBackgroundStrength=0 fogs the
  void → full-frame intensity·fogColor), NOT the band (which under-fogged the subject). Source-derived band
  0.79·td/5.8·td (PaintThread.pas:619/645 → mapCamera Z-scale); intensity 0.55→0.35, white-guard onset 0.8→0.6.
  Keeps coloured backgrounds (Genetic/TimeMachine), gentler. **Next lever if still washed: geometry-only fog
  (envBackgroundStrength>0) — removes the fill at the cost of the coloured sky = a look call.** Awaiting GPU verify.
- **LESSON:** the cert set (20 bundled / 7 refs) is too narrow — it let both regressions through. Widen the
  visual gate (render-triage across the standalone library + more scenes) before declaring a fidelity stage done.

## In flight
- **Stage 3 M-tier COMPLETE (partial)** (2026-06-28). U2 `af91232` / U5 `8561398` / U4 `a935fa3` shipped (3 commits);
  U7 deferred. Corpus faithful **27 → 28**, library **279 → 293**. CPU gates all green. **M-tier did NOT reach the
  ~48 (60%) checkpoint** — see the S3 decisions-log entry for the full why. Net scene delta = +1 (`material colors`).
  Owed visual cert (real GPU, human judgment): U3 MixPinski4 matrix order, U8 Dainbramage FoldInt, + `material colors`.
- **Stage 3b is now the 60→75% push** and carries THREE structural blockers, not two:
  - **U7 two-orbit DEcombine** (engine-core `DE_MASTER` kernel — two independent orbits + 6 CSG combine ops; 5 scenes
    immediately recoverable: DEcomb1, Dodeca Torus mix, ExcludeBulbMeng, Mengerplus for MC, ThePearl dIFS). Visual-only.
  - **HeightMapIFS indirect call** (`call dword ptr [esi+0x10c]` → compiled sampler, not in [CODE]) — blocks the
    dIFS-shrub scenes (dIFS shrub / heart shrub / heart shrub otrap); U9-class (second-base/indirect-call mem).
  - **Cp0/Cp8 mask-LOAD decode** (beyond U6's mask-MULTIPLY) — `_ngon`, `_PolyFold-sym`, Riemann2, IcosahedronIFS,
    foldinghexIFS, totoricalIFS leak a bare `Cp0/Cp8` abs/sign mask LOAD; each is the SOLE blocker of its scene.
  - Plus U9 second-base/stack mem (~41 fm) and U10 genuine loops (~12 fm, permanent x-check gaps).
- **Owed visual checks (real GPU, NOT cross-check-gated):** (1) U3 — MixPinski4 / Sierpinski4ex matrix ORDER
  (Melting spot bloxx vs its MB3D ref); (2) U8 — Dainbramage FoldInt look; (3) S3 — `material colors` (new). Plus
  the `probe-mb3d-triage.mts` library GOOD re-baseline — CPU SwiftShader sweep ≈ 33 min (machine-hogging), left for
  a real-GPU session; transpile-clean **293** is the current proxy.
- **Trajectory vs the 75% (60/80) bar:** S2 cheap wins +5 (22→27), S3 M-tier +1 (27→28) = **28/80 (35%)**. The
  roadmap's "M-tier → ~48 (60%)" assumed U7 was app-side and the dIFS-shrub family flipped on U2/U4; both proved to
  be deeper walls (two-orbit kernel; HeightMapIFS indirect call). The path to 60% now runs through the Stage-3b
  structural items above, not more cheap wins. The FORMULA-level coverage is strong (293/0).
- **Stage 1 COMPLETE** (2026-06-27). All three items landed + GPU-certified; ADR-0086 (fog) +
  ADR-0085 reconcile written. Residual non-fog-non-DE gap on some scenes (LightBulbMoon, Ellarien dark
  foregrounds) is LIGHTING brightness — a future lighting-intensity pass, not S1.
