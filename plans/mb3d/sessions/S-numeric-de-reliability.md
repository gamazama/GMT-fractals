# Session prompt — Numerical DE reliability (unlock the no-analytic-derivative escape class)

**Date prepared:** 2026-07-02 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` (NOT pushed).

Paste the **Prompt** block below as the first message of the next session.

## Why this is the bigger win (from the 2026-07-02 Oxnot + Aexion sessions)

Two "cheap" scene fixes (Item 1 Aexion 4D-escape, Item 2 Oxnot step-floor) were each chased,
built, and **collapsed into the same root cause**: they are **no-analytic-derivative *escape*
formulas**. Their `[CODE]` never writes a derivative (`w`/`Deriv1` ≡ 1), so GMT's analytic DE
degenerates to the raw radius `r`, which cannot resolve the surface of an escaping orbit → **every
ray misses → blank/fill**. Verified per-formula (decode faithful to the x87 `[CODE]`, orbit sane in
a float32 sim — the geometry exists; only the DE fails).

**MB3D renders these via its numerical DE** (`CalcDEnoADE`): the moment any active slot lacks an
analytic DE, MB3D collapses `DEoption→0` and switches to a **fixed-iteration final-radius (Rout)
finite-difference** estimate that ignores `dr` entirely. GMT has a port of this (estimator 7,
ADR-0085) — but the user reports it is **unreliable ("breaks almost all the formulas")**, and est7
gave flat/all-miss on Oxnot's PseudoXDB in the harness (though the harness result is suspect — see
the ⚠ caveat).

**A reliable numerical DE unlocks the whole class at once:** Oxnot-Shells (PseudoXDB), Aexion-10bulbs
(Aexion1), and very likely Recycledrelatives (ABoxMod1+ABoxModKali Julia), Dainbramage-Hydra, and
DsyneGrafix (the original est7 canary). ~4–6 scenes, all currently pulled/parked.

## ⚠ Two rules that have bitten every prior session — obey them

1. **Never assume — read the MB3D Pascal source + the emitted GLSL, cite `file:line`.** The DE-fidelity
   audits' one-line fixes have been wrong 4× running; both prior 2026-07-02 "levers" (4D escape,
   step-floor) were faithful builds that delivered nothing on GPU. Verify against real code + a render.
2. **GPU-cert on real ANGLE/D3D11 (headed Chrome), never headless SwiftShader.** NB: ADR-0085 claims the
   render-harness can't apply the numeric runtime recipe — that is **STALE**. It predates the
   `render-harness.ts:475-483` fix that folds `qualityOverride` into `configOverrides.quality` so
   `estimator:7` + `numDEeps` + `detail` reach the compile (verified 2026-07-02: TimeMachine responds to
   a `detail` override; PseudoXDB est7≠est2 with a centered camera → est7 genuinely engages). So the
   harness **is** a valid GPU loop. The one gap: `qualityOverride` doesn't set `iterations` (that's
   `coreMath` — pass it via `configOverrides.coreMath.iterations`); the numeric fixed-count depends on
   it, so set it explicitly. The visual 1:1 verdict is still the user's (present renders, wait).

---

## Prompt

Make GMT's **numerical (finite-difference) DE estimator reliable** on branch `feat/mb3d-importer` at
`h:/GMT/workspace-gmt/stable`. It is a faithful port of MB3D `CalcDEnoADE` (ADR-0085) but breaks most
formulas; making it robust unlocks the no-analytic-derivative **escape** class that no analytic DE can
render (Oxnot/PseudoXDB, Aexion/Aexion1, Recycledrelatives, Dainbramage-Hydra, DsyneGrafix). Commit per
logical step; don't push. Obey the two rules in `plans/mb3d/sessions/S-numeric-de-reliability.md`.

### Read first (ground everything here — don't re-derive)
- **ADR-0085** (`docs/adr/0085-numerical-finite-difference-de.md`) — the current design, its TWO
  rebuilds (escape-time `nu` → fixed-count `Rout`), and its known limits (float32 grain, ~4× cost,
  per-scene `numDEeps`, and the ⚠ harness-can't-apply-the-recipe caveat).
- **MB3D `CalcDEnoADE`** — the exact reference: `Calc.pas:445-523`. Core (with the commented-out
  Vgrads path removed):
  ```
  mMandFunction(@C1);                         // run orbit at the center seed → Rout, ItResultI
  if bInsideRendering and (ItResultI = MaxIt) then 0
  else if Rout < 1e-200 then 0 else begin
    bufRout := Rout; It3Dex.MaxIt := ItResultI; It3Dex.RStop := Rstop3D;   // FIX count + inflate bailout
    C1 += mctDEoffset; mMandFunction; dt := Sqr(bufRout - Rout); C1 := bufD;   // perturb x-seed
    C2 += mctDEoffset; mMandFunction; wt := Sqr(bufRout - Rout); C2 := bufD;   // perturb y-seed
    C3 += mctDEoffset; mMandFunction; Rst := Sqr(bufRout - Rout); C3 := bufD;  // perturb z-seed
    Result := bufRout * Ln(bufRout) * dDEscale / (Sqrt(Rst+wt+dt) + mctDEoffset006);
  end;
  if Result < msDEstop*0.25 then Result := msDEstop*0.25;                  // DE floor
  if bCalcInside then begin Result := msDEstop*4 - Result*3; ... end;     // INTERIOR inversion
  ```
- **GMT's port** — `engine-gmt/shaders/chunks/de.ts`: `centerCount` / `iterateRadius` /
  `numericDistance` / `numericNormal` (emitted only when `numericDE`; armed by `estimator > 6.5` →
  `builder.enableNumericDE` in `core_math.ts`; `uNumDEeps` = `dDEscale`, `quality.ts` default 0.1).
- **The Oxnot proof this is the class** — the 2026-07-02 decisions-log entry in `EXECUTION-STATUS.md`
  + `debug/probe-oxnot-usage.mts` (PseudoXDB unique to Oxnot) + `debug/probe-pxdb-sim.mts` (float32
  orbit is sane — the bug is the DE, not the decode or precision).

### The method — CPU sim first (fastest loop, GPU-free, sidesteps the harness caveat)
Build/extend a **CPU float32 sim** (`debug/sim-numeric-de2.mts` is a starting point; `probe-pxdb-sim.mts`
shows the exact-decode replication pattern) that, for each test formula, computes the numeric DE field
**two ways** and compares:
  (a) exactly as GMT's `de.ts` does (centerCount → iterateRadius fixed-count → numericDistance),
  (b) exactly as MB3D `CalcDEnoADE` does (perturb the SEED, re-run at the center's ItResultI, the
     `bufRout·Ln(bufRout)·dDEscale/(√Σ + offset006)` estimate, the `msDEstop·0.25` floor, the
     `bCalcInside` inversion).
March a few camera rays through each and find **where GMT's DE misses the surface MB3D's finds.** This
is deterministic and needs no GPU — it isolates the algorithmic divergence directly. Only after the sim
agrees with MB3D do you touch the GPU/app.

### Prime suspects (verify each against the source before coding — rule 1)
1. **Probe scale `mctDEoffset`.** MB3D's is `StepWidth`-scaled per scene (a specific world value);
   GMT auto-derives from the view footprint (`numProbe`/`numFootprint`). A mis-scaled probe collapses
   the finite difference (`g→0` → DE blows up → miss, or `g` huge → DE→0 → solid). This is the most
   likely single cause.
2. **`bCalcInside` inversion — GMT likely does NOT implement it.** For interior-dominant sets (Oxnot's
   PseudoXDB has a bounded core; many of these render "inside-out"), MB3D inverts: `msDEstop·4 −
   Result·3`. Without it, an interior set is never resolved from outside.
3. **Fixed-count semantics for fast escapers.** MB3D fixes the count at the *center's* `ItResultI`.
   PseudoXDB escapes for ~90% of pixels at a *small* count → the perturbed-seed ΔRout over 2–5 iters
   may be too coarse/discontinuous. Check whether GMT's `centerCount`/`iterateRadius` reproduce this
   exactly (esp. the inflated `Rstop3D = uDeBailout²·64` cap and the no-early-break).
4. **The DE floor.** MB3D floors at `msDEstop·0.25`; GMT at `numFootprint·0.25`. If the floor dominates
   (footprint ≠ msDEstop scale), the DE is a near-constant → the ray steps at a fixed rate and never
   converges on the surface.
5. **The runtime recipe.** The numeric DE needs a looser hit threshold (detail ≈1.5) + `dDEscale` ≈0.1
   to register hits; if the importer/harness/app-load path doesn't apply them, rays never hit. Decide
   whether the importer should set `quality.numDEeps` + a looser `detail` when it routes to est7.

### Loop setup (the harness already works — don't rebuild it)
`qualityOverride` reaches the compile (`render-harness.ts:475-483`), so the harness is a valid GPU
iteration loop for est7. Two small things to get right: (1) also pass `configOverrides.coreMath.iterations`
(the numeric fixed-count depends on it and `qualityOverride` won't set it); (2) numeric renders cost ~4×,
so keep tiles small (≤420px) and one canonical scene per target. Prefer the **CPU sim** for algorithm
parity (it can compare GMT's `de.ts` math to MB3D `CalcDEnoADE` numerically, which pixels can't), and the
harness/app for the visual verdict.

### Test matrix + gates
- **No-ADE targets:** Oxnot-Shells, Aexion-10bulbs, DsyneGrafix (the ADR-0085 canary — must stay
  working), Recycledrelatives, Dainbramage-Hydra. **Analytic control:** any bundled analytic scene
  (e.g. TimeMachine) — must stay byte-identical (numeric block is `#ifdef`/flag-gated).
- **Gates:** `typecheck`, `test:refine` §E (analytic byte-identical), `corpus-check` **333/0** (numeric
  DE is render-only — no decode change, so it must not move), `test:mb3d`(24)/`:weave`(58). The numeric
  DE change touches the SHARED marcher path only via the `numericDE`-gated block → native + analytic
  imports must be pixel-identical (canary a native formula + an analytic import).
- **When a scene renders faithfully** (user's visual verdict), re-run `gen-sample-scenes.mjs` and
  un-pull it (Aexion + Oxnot are currently in the SKIP set of `plans/mb3d/decompiler/gen-sample-scenes.mjs`).

### Deliverables
- A CPU-sim-grounded explanation of **why** est7 misses each target (which suspect(s)).
- A `de.ts` fix (probe scale / inside-inversion / floor / recipe) that makes the no-ADE class render,
  with analytic estimators byte-identical.
- App-cert renders on the matrix for the user's 1:1 verdict; un-pull the scenes that pass.
- Update ADR-0085 (append a dated `> **Update**` block — it's append-only) + `EXECUTION-STATUS.md`.

### Model / features
- **Model:** Opus 4.8, **high or xhigh reasoning effort** (numerics-heavy: float32 finite-difference
  behavior + MB3D-vs-GMT algorithm parity).
- **Method:** CPU-sim-first (the fast loop), app-cert for the visual verdict. A short multi-agent
  **Workflow** is optional for the initial parallel characterization (GMT-port-vs-`CalcDEnoADE`
  line-by-line diff + per-target sim in parallel), but the fix itself is sequential — don't over-fan-out.
- Real GPU (headed Chrome/ANGLE) for cert; never headless SwiftShader.

### Non-feature-file scope reminder
Track which debug harnesses / plans / sample-scene data you touch so the eventual squash/scope review is
clean. The 2026-07-02 sessions left reusable probes: `probe-oxnot-usage.mts` (formula-usage triage),
`probe-pxdb-sim.mts` (exact-decode float32 orbit sim), `sim-numeric-de2.mts` (numeric-DE sim starting point).
