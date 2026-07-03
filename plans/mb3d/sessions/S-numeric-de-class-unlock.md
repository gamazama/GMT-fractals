# Handoff — Numerical DE is reliable; now UNLOCK the no-analytic-derivative escape CLASS

**Date prepared:** 2026-07-03 · **Branch:** `feat/mb3d-importer` @ `h:/GMT/workspace-gmt/stable` (NOT pushed).
**Predecessor:** `plans/mb3d/sessions/S-numeric-de-reliability.md` (the task that produced the fixes below).

---

## TL;DR for the orchestrator

The numerical finite-difference DE (`estimator 7`, MB3D `CalcDEnoADE` port, ADR-0085) **used to render
almost everything black**. It is now **reliable and GPU-certified** — a native Mandelbulb and Oxnot-Shells
(PseudoXDB, a no-analytic-derivative *escape* formula) both render richly on real ANGLE/D3D11. The
user has visually signed off ("looking GREAT").

**Deliverable 1 (auto-route) is DONE** (`389825b`, 2026-07-03). Deliverable 2 (test + un-pull the
tail) remains, and the auto-route work sharpened what's actually in the tail — see below.

1. ✅ **Auto-route truly-no-ADE scenes to est7 on import.** `emitFusedHybrid` now routes a weave where
   NO slot writes a derivative (new `slotTranspiler.writesDeriv`) and it isn't dIFS → estimator 7 +
   the certified recipe. **Oxnot-Shells renders its shells on plain import** (GPU-verified, no
   overrides). Narrow by design: box/Menger/IFS weaves keep the cheaper analytic estimator (only
   1/39 bundled scenes routes). ADR-0085's opt-in stance is superseded FOR THIS SUBSET.
2. **Test + un-pull the tail** — refined by the auto-route (details in Deliverable 2 below):
   Recycledrelatives/DsyneGrafix have a box `dr` (stay analytic by default); Aexion (deOption-4 Julia)
   and Hydra (dIFS + no-deriv lattice) are NOT caught by the narrow `writesDeriv` signal and need
   either a widened route or a manual verdict.

---

## What was fixed this session (all on `feat/mb3d-importer`, NOT pushed)

est7 was black for **three coupled reasons**, each found CPU-sim-first then GPU-certed on real
ANGLE/D3D11 (headed Chrome — never SwiftShader). Commits:

| commit | fix |
|---|---|
| `78a28ba` | debug: CPU sim (`sim-numeric-de3.mts`) isolating the bug |
| `bef9cae` | **(A)** difference `ln(Rout)` not `Rout` — the raw-`Rout` `min(dot,cap)` saturated fast/high-power escapers → all taps clamp equal → `g=0` → DE explodes ~1e8 → miss/black. `ln` cancels the huge `Rout` (float32-safe, MB3D-equivalent). |
| `68aa518` | **(B)** floor at **0.25× GMT's hit threshold**, not `numFootprint·0.25`. The verbatim port floored ABOVE GMT's threshold (Mandelbulb `pixelThreshold=0.2` → threshold `fp·0.13` < floor `fp·0.25`) → a floored DE could never register a hit → black. This was the decisive GPU fix; the CPU sim masked it (it used `pixelThreshold=0.5`). |
| `2001110` | docs: ADR-0085 (append-only update block) + EXECUTION-STATUS decisions-log |
| `151fc95` → `5ef956e` | a ×4 secondary (shadow/AO/reflection) distance correction — tried, then **reverted** (amplified noise; un-scaled reads fine at default AO). |
| `b8920ee` | **(C)** deep-region **flicker** knob `quality.numDESmooth` (uniform `uNumDESmooth`, default 2.5). The escape field is chaotic at high `nC`, so a narrow probe is noisy → sub-probe jitter flips hit↔miss → deep sections flicker black (CV 0.45 @ nC≈17 → 0.00 @ ×3 probe). Central diff doesn't help; nC-adaptive backfires. A wider primary probe averages the chaos. |
| `8c78e36` | surface `numDESmooth` in the Quality panel (`whitelistParams`). |

Also: `uNumDEeps` default `0.1→0.3`. **Gates green:** typecheck 0, `test:refine` §E byte-identical
(analytic estimators untouched — numeric block is `#ifdef NUMERIC_DE`-gated), `test:mb3d` 24/0,
`test:mb3d:weave` 58/0, corpus **0-mismatch** (render-only — decoder never touched). ADR-0085 has the
full narrative.

## The est7 render recipe (what makes it work — reuse verbatim)

- `estimator: 7` **+** `mb3dFaithful: true` (its Lipschitz clamp + StepDiv keep the over-estimating
  numeric DE from overshooting — auto-set by the importer on `.m3p` import, `emitFusedHybrid.ts:389`).
- `numDEeps ≈ 0.3` (magnitude), `detail ≈ 1.5` (looser hit threshold), `numDESmooth ≈ 2.5` (flicker/
  detail trade — raise for stable, lower to 1.0 for max detail).
- **Iterations must be set explicitly** via `configOverrides.coreMath.iterations` in the harness
  (`qualityOverride` won't set it); live app uses the scene's own value.

**Cert harness (fast GPU loop):** `debug/cert-one.mts '<configOverridesJSON>' <out.png> [Formula|MB3D:SceneName]`
— ONE scene per fresh browser boot (compile-gated quality applies reliably; multi-render sessions can
reuse a stale compile). Reports `nonBlack%`, `NaN%`, `sigma`. Headed ANGLE D3D11. Requires the vite dev
server on :5173. **CPU-sim first** (`debug/sim-numeric-de{3,4}.mts` — the DE algorithm vs MB3D
`CalcDEnoADE`, deterministic, GPU-free), then GPU-cert for the visual verdict.

---

## Deliverable 1 — auto-route no-ADE scenes to est7 ✅ DONE (`389825b`, 2026-07-03)

**Implemented** in `emitFusedHybrid.ts` + `slotTranspiler.ts` (emit-side; decoder corpus untouched):
- `slotTranspiler` exposes **`writesDeriv`** per slot — a decompiled `[CODE]` that writes the derivative
  `w` (deOption 2/11) or `mb3dDr1` (5/6); intern formulas → `true` (all thread `dr`). A position-only
  `[CODE]` (PseudoXDB/IdesFormula/Riemann2) → `false`. (Two intern return paths — the plain and the
  multi-slot-param one at slotTranspiler:340 — both must set it; the second was the bug that
  false-routed Chrystal/HalTenny/JuliaSetSample on the first cut.)
- `emitFusedHybrid` computes `noAnalyticDE = anySupported && !isDifs && !bodies.some(writesDeriv)` and,
  when true, sets `estimator 7 + numDEeps 0.3 + numDESmooth 2.5 + mb3dFaithful + detail≤1.5`.
- **Narrow by design** (avoid over-routing analytically-fine scenes → est7 noise/4× cost): only
  **1/39 bundled scenes routes** (Oxnot-Shells), verified by `debug/probe-autoroute-est7.mts`.
- GPU-verified (real ANGLE): Oxnot renders on PLAIN import (`cert-one.mts '{}' … 'MB3D:Oxnot - Shells'`,
  sigma 47); Recycledrelatives unchanged analytic (sigma 26). Gates: typecheck 0, weave 58/0, mb3d 24/0,
  refine §E byte-identical.

## Deliverable 2 — test + un-pull the tail (REMAINING; the auto-route sharpened it)

Present each on real ANGLE for the user's 1:1 verdict; **un-pull each as it passes** from
`plans/mb3d/decompiler/gen-sample-scenes.mjs` `SKIP` (`['spineJulia', 'Aexion 10bulbs', 'Dainbramage - Hydra']`)
then re-run `gen-sample-scenes.mjs`. Don't un-pull on `nonBlack%` alone.

| target | auto-route verdict | what's needed |
|---|---|---|
| **Oxnot - Shells** (PseudoXDB) | ✅ auto-routed to est7, renders on import | done — bundled, no SKIP entry |
| **Recycledrelatives - Fractal Fan** | stays analytic (ABoxMod1/Kali write `dr`), renders (sigma 26) | verify it's the intended look — likely NOT a no-ADE scene (the mapDEMeta bailout=rStop² fix already covered it) |
| **DsyneGrafix - Getting Loopy** | stays analytic (Amazing Box writes `dr`) | **the subtle case** — has a box `dr` but the IdesFormula collapses y,z → the weave DE may still be dust. Render it analytic; if dusty, it needs a manual est7 or a targeted widen. NOT statically caught by `writesDeriv` (ADR-0085's "not detectable"). |
| **Aexion 10bulbs** | NOT routed — Aexion1 is **deOption 4 (Julia)**, writes `w`, but maps to estimator 0 (no GMT analog) | needs a 2nd signal (deOption-4 → est7) OR stays parked (prior session: "not cheaply fixable"). Test est7 manually first — may crack now. |
| **Dainbramage - Hydra** | NOT routed — has **dIFS** slots (excluded) woven with a no-deriv `_JuliaSets` lattice | mixed dIFS + no-deriv; the `!isDifs` guard skips it. Needs a manual verdict on whether est7 or the dIFS est-6 path wins. |

**If Deliverable 2 warrants widening the auto-route:** the two extra signals are (a) DE-owner
`deOption === 4` (Julia, no GMT analog → est7), and (b) a mixed dIFS+no-deriv weave. Both are riskier
(could regress a working analytic/dIFS scene) — gate each behind a GPU A/B + the user's verdict.

## Rules / gotchas (carried from S-numeric-de-reliability)

1. **Source-truth** — read the MB3D Pascal + emitted GLSL, cite `file:line`. The prime suspects a task
   names are often wrong: this session, `bInsideRendering=FALSE` for Oxnot (`probe-oxnot-consts.mts`) ruled
   out the "bCalcInside inversion" suspect, and the probe cancels in the DE — the real causes were the
   saturation, the floor, and the probe width.
2. **GPU-cert on real ANGLE/D3D11 (headed Chrome), never SwiftShader.** The CPU sim can *mask* GPU-only
   bugs (the floor bug was invisible at `pixelThreshold=0.5`). Sim isolates the algorithm; GPU confirms.
3. **Render-only vs decoder** — everything this session was render-path (`de.ts`, `quality.ts`,
   `panels.ts`), so the decompiler corpus is untouched (0-mismatch). If Deliverable 1 touches
   `emitFusedHybrid`, that's still emit-side (no `decompiled-formulas.ts` regen) — but if any decoder
   `.mjs` changes, remember the drift gotcha (edit/regen in `/h/tmp/mb3d-decomp/`, `cp` back, run
   `npm run check:mb3d-decompiler`).
4. **Model/effort:** Opus 4.8, high/xhigh (numerics + GPU parity).

## Reusable artifacts left by this session

- `debug/sim-numeric-de3.mts` — GMT de.ts vs MB3D `CalcDEnoADE`, Mandelbulb (analytic = ground truth) + PseudoXDB.
- `debug/sim-numeric-de4.mts` — faithful real-formula sim + the flicker (DE-CV-under-jitter) diagnostic.
- `debug/cert-one.mts` — one-render-per-boot GPU cert (headed ANGLE); `cert-est7-gpu.mts`/`-sweep.mts` drive it.
- `debug/probe-oxnot-consts.mts` — dumps a scene's faithful DE constants (iterations, bailout, StepWidth, bInsideRendering).
