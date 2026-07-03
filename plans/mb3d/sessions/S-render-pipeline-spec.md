# ULTRACODE session: MB3D ↔ GMT render-pipeline spec + faithful-conversion plan

**Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` · **MB3D Pascal source:** `/h/tmp/mb3d-src/`
**Mode:** ultracode — author Workflow scripts, fan out reading agents, adversarially verify every finding
against source, synthesize. Be exhaustive; token cost is not a constraint; correctness is everything.

## Mission
Produce a **definitive, code-grounded** specification of (1) exactly how **Mandelbulb3D renders** a pixel,
(2) exactly how **GMT renders** a pixel, (3) precisely **where the two pipelines diverge**, and (4) a
**faithful-conversion plan** — exactly what must change in GMT (engine and/or importer) to render imported
MB3D scenes the way MB3D does. Output written specs, not just analysis.

## THE ONE RULE: never assume — read the code
This importer's entire history says it plainly: **every fix that worked came from reading the actual Pascal;
every failure came from a plausible-but-unverified hypothesis** (the iteration-sum model, the dr-gap "one
lever", the Wada iteration-0 theory, a confidently-wrong "binary search reaches the back" claim — all
falsified the moment someone read the source). So:
- **Every claim cites `file:line`.** No claim without a line reference to the real code.
- **Mark each claim `[VERIFIED file:line]`.** `[INFER]` is allowed ONLY when the code genuinely can't resolve
  it — and then say *what* runtime data would be needed to settle it (the compile-and-instrument path).
- **Adversarially verify.** Every non-trivial finding is independently re-read by a second agent whose job is
  to REFUTE it against the source. A finding survives only if the skeptic can't break it. Default to "not yet
  proven."
- **Do not trust this brief's "known anchors" below — they are hypotheses to CONFIRM OR REFUTE against the
  source**, including the ones the orchestrator stated confidently. (One of them — "MB3D reaches deep geometry
  via a binary-search marcher" — was already proven WRONG by reading `Calc.pas:1937`.)

## Background (read first, then verify against code)
- `plans/mb3d/converter-design.md` — the importer architecture. `plans/mb3d/EXECUTION-STATUS.md` — full state.
  ADRs 0083–0087. These give context; the SOURCE is the authority where they disagree.
- The importer faithfully decodes MB3D **math** (279 formulas, 0 cross-check mismatch) but several scenes render
  wrong because GMT and MB3D are **different renderers** — the divergence is in the render pipeline, not the
  decoded math. That divergence is what this spec must pin down from code.

## Source map (start points — trace outward, don't stop here)
**MB3D (`/h/tmp/mb3d-src/`):**
- `Calc.pas` — the renderer. `RayMarch` (`:1815`), `RMdoBinSearch` (`:1641`, post-hit refine), `RMdoBinSearchIt`
  (`:1041`), `RMCalculateNormals` (`:776`), `CalcDEnoADE` numeric DE (`:445`). The `CalcDE` function pointer is
  set per-scene — trace where (`HeaderTrafos.pas` DEoption logic ~`:438-470`, ~`:890-960`).
- `formulas.pas` — `doHybridPasDE` (analytic hybrid DE, ~`:3700`), `doHybridIFS3D` (dIFS orbit-trap, ~`:3210`),
  `doHybridPas` (the weave/iteration cursor), the per-formula orbit loops (escape `Rout > RStop`).
- `HeaderTrafos.pas` — how header fields become runtime values: `msDEstop`, `sZstepDiv`, `mctMH04ZSD`,
  `MaxRayLength`, `RStop`/`dRStop`/`Rstop3D`, `mctDEoffset`, `iDEAddSteps`, `MaxItsResult`, `iMinIt`, the
  per-slot `iterCount` vs the header iteration cap.
- `CustomFormulas.pas`, `Math3D.pas`, `DivUtils.pas`, `TypeDefinitions.pas` — const packing, math, struct layout.

**GMT (`h:/GMT/workspace-gmt/stable/`):**
- `engine-gmt/shaders/chunks/trace.ts` — the GMT marcher (step advance, hit threshold, maxSteps cap,
  overstepTolerance, refineSteps).
- `engine-gmt/shaders/chunks/de.ts` — the DE/estimators (analytic estimators 0–6, numeric estimator 7), the
  iteration loop, normals.
- `engine-gmt/features/quality.ts` + `data/constants.ts` (`DEFAULT_HARD_CAP`) — quality params + hard caps.
- `engine-gmt/features/core_math.ts` — the param/uniform schema, iteration cadence.
- `engine-gmt/utils/mb3d/{emitFusedHybrid,constPacker,slotTranspiler,mapCamera}.ts` — the importer's mapping of
  MB3D header → GMT quality/coreMath/geometry.

## Deliverables (write these as docs under `plans/mb3d/research/`)
1. **`mb3d-render-pipeline-spec.md`** — exactly how MB3D renders a pixel, every step line-grounded:
   camera→ray setup; the march loop (step = `DE·sZstepDiv·RSFmul`, the max-step clamp `MaxCS(msDEstop,0.4)·mctMH04ZSD`,
   the `RSFmul` damper, termination `Zstepped > MaxRayLength` — **confirm there is no step-count cap**); the hit
   threshold `msDEstop` and its zoom/Zpos scaling; the **DE dispatch** (`CalcDE` → which function for which
   DEoption: analytic `doHybridPasDE`, numeric `CalcDEnoADE`, dIFS `doHybridIFS3D` — and the EXACT formula each
   returns); the **iteration/weave** model (`doHybridPas` cursor, per-slot `iterCount`, `MaxItsResult`, escape
   `Rout > RStop`, whether the pattern cycles to the cap or runs the per-slot sum — this was misread before,
   settle it from code); **normals** (`RMCalculateNormals`, the large `Noffset`); **post-hit refinement**
   (`RMdoBinSearch`, gated `iDEAddSteps`). Include every constant's derivation (`HeaderTrafos.pas`).
2. **`gmt-render-pipeline-spec.md`** — the same for GMT (`trace.ts`/`de.ts`/`quality.ts`), line-grounded: the
   marcher, the maxSteps hard cap (`DEFAULT_HARD_CAP`) and why it exists (GPU watchdog/perf), the estimators,
   the iteration loop, normals, and the importer's header→quality mapping.
3. **`render-divergence.md`** — a precise table: every place the two pipelines differ, each row citing BOTH
   `file:line`s. (Seed hypotheses to verify: MB3D distance-terminated march with no step cap vs GMT's 2000-step
   cap; MB3D's per-DEoption DE selection incl. a numeric fallback vs GMT's analytic-dr estimators + opt-in
   numeric; iteration-cap semantics; hit-threshold derivation; normal-probe scale.)
4. **`render-conversion-plan.md`** — exactly what GMT must change to render MB3D faithfully, each item tagged
   **[engine]** (kernel/marcher/DE change) vs **[importer]** (header→quality mapping) vs **[architectural]**
   (fundamental mismatch with a real tradeoff), prioritized by how many residual scenes it fixes
   (Theli/Hal-Tenny back-cut, the dr-gap trio Oxnot/Recycledrelatives/Melting, Hyperben2, DsyneGrafix), with the
   engineering cost/tradeoff stated (e.g., raising the GPU step cap vs the Windows TDR watchdog). Flag anything
   that genuinely needs runtime instrumentation (compile a minimal Free-Pascal harness of `RayMarch` + one
   formula and dump per-step values) rather than source-reading to settle.

## Workflow shape (suggested)
- **Phase 1 — MB3D read:** fan out agents over the march loop / DE dispatch / iteration-weave / normals /
  const-derivation, each producing line-grounded findings; an adversarial verifier per finding re-reads the
  source to refute. Synthesize → `mb3d-render-pipeline-spec.md`.
- **Phase 2 — GMT read:** same over `trace.ts`/`de.ts`/`quality.ts`/importer. → `gmt-render-pipeline-spec.md`.
- **Phase 3 — diverge + plan:** with both specs, a panel maps divergences (each cross-checked vs both sources)
  → `render-divergence.md`, then the conversion plan → `render-conversion-plan.md`.
- Keep all four docs' claims `file:line`-cited. A final completeness critic asks "what's still `[INFER]` that a
  closer read could settle, and what genuinely needs the instrumented harness?"

## Gotchas (verify, don't trust)
- MB3D's `RayMarch` march terminates on **distance** (`Zstepped > MaxRayLength`, `Calc.pas:1937`) with **no
  step-count cap**; `RMdoBinSearch` is **post-hit only** (`:1919-1931`). The orchestrator's earlier
  "binary-search reaches the back" was WRONG — re-confirm the real reach mechanism from code.
- `uNumDEeps` in GMT's numeric DE is the `dDEscale` magnitude, NOT a probe (per the numeric-DE rebuild). MB3D's
  numeric DE caps at `Rstop3D = Sqr(dRstop)·64`. Confirm both against source.
- Per-slot `iterCount` vs the header iteration cap: the "sum is the real count" model was FALSIFIED on
  MengerTrees ([1] but a 60-iter sponge). Settle the true iteration semantics from `doHybridPas` + the loop's
  `MaxItsResult` termination.

## Output
Commit the four docs under `plans/mb3d/research/`. Update `EXECUTION-STATUS.md` with a pointer. Do not change any
render/importer code in this session — this is a **spec + plan** session; implementation is a later, separate run
informed by it. Report: the headline divergences, the prioritized conversion plan, and which items (if any)
genuinely require the instrumented Free-Pascal harness vs are fully settled by source.
