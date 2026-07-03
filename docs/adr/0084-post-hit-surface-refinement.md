# ADR-0084: Post-hit surface refinement (damped binary search) for non-Lipschitz DEs

> **Update 2026-06-27 (UI = CompilableFeatureSection; kernel unchanged):** the original
> single `refineSteps` compile param (0 = off, each value recompiled) was the wrong UI shape,
> and a first attempt at splitting it into a compile boolean + runtime amount placed in a plain
> `feature` whitelist *still didn't work* — a bare `onUpdate: 'compile'` param in a runtime
> feature whitelist renders the sliders without a working compile toggle (the codebase's own
> note at `panels.ts` flags this for volumetric). The correct norm is the **override-mode
> `CompilableFeatureSection`** (same shape as Geometry's Burning Mode / volumetric): three
> params — **`refineEnabled`** (`onUpdate: 'compile'`, the compile gate that emits/removes the
> loop), **`refineActive`** (hidden runtime `uniform uRefineActive`, the instant on/off the
> section header drives after compile), **`refineSteps`** (runtime `uniform uRefineSteps`,
> default 4, the live step count) — all in group `refine`, surfaced by a
> `{ type: 'compilable', id: 'quality', compileParam: 'refineEnabled', runtimeToggleParam:
> 'refineActive', runtimeGroup: 'refine' }` panel item. The trace-kernel runtime gate changed
> from `if (uRefineSteps > 0.0)` to `if (uRefineActive > 0.5)`; the compile gate keys on
> `refineEnabled`. No-regression unchanged (off → byte-identical, zero cost).

> **Update 2026-06-27 (importer made opt-in; kernel decision unchanged):** the DsyneGrafix
> canary bench (below, "Consequences") showed refinement does **not** resolve the dust it
> was meant for — an exhaustive fine march (fudge 0.05 / 5000 steps) is *still* fragmented,
> so that dust is a **DE-fidelity** gap (the fused weave emits a fragmented iso-surface),
> not an overshoot a single-step ray refinement can recover. Consequently the MB3D importer
> **no longer auto-maps `bStepsafterDEStop` → `quality.refineSteps`** (it would add ~0.5–2s
> compile per import for no benefit on the target scenes). `refineSteps` is now a pure
> user opt-in via the Quality panel, default 0, for any coherent-but-overshooting formula.
> The kernel, compile-gate, and no-harm guarantees are unchanged; only the importer's
> consumption (decision §4 below) is withdrawn.

**Date:** 2026-06-27
**Status:** Accepted
**Scope:** `engine-gmt/features/quality.ts` (new `refineSteps` param + `REFINE_HARD_CAP`
inject), `engine-gmt/shaders/chunks/trace.ts` (compile-gated bisection loop + `dPrev`
bracket), `engine-gmt/engine/ShaderBuilder.ts` (`enableRefinement` flag → Main trace),
`engine-gmt/utils/mb3d/emitFusedHybrid.ts` (importer maps `bStepsafterDEStop`),
`data/constants.ts` (`REFINE_HARD_CAP`). New uniform `uRefineSteps`.
**Related:** ADR-0076 (map-inline cost model), ADR-0077 (Edge-Polish removal — the
"no inert always-compiled control" rule this honours), ADR-0083 (MB3D importer).

## Context

GMT sphere-traces and **accepts the first sample under the hit threshold as-is**
(`trace.ts`: `if (h.x < finalEps)` at the overshoot position). That is correct only
when the distance estimator is a true Lipschitz-1 lower bound. The fused-hybrid DE the
MB3D importer weaves (and, in general, some Fragmentarium imports, modular graphs, and
aggressive hybrids) is, for the **DsyneGrafix-class** discontinuous hybrids, *not*
Lipschitz-1: one weave slot has an explosive escape boundary, so `Rout·ln(Rout)` and the
finite-difference gradient spike discontinuously. The ray overshoots a thin/discontinuous
surface and the accepted points scatter into **dust** instead of a coherent front face.

MB3D does not have this problem because it never trusts the coarse DE to land on the
surface. Its coarse march only *brackets* the surface; a separate `RMdoBinSearch`
(`Calc.pas:1641`) then walks the ray parameter back and forth across the iso-surface for
`bStepsafterDEStop` extra DE evals, converging the *ray parameter* onto the actual
crossing. The importer already parses that controlling byte (`stepsAfterDEStop` @134) but
dropped it on the floor.

GMT used to carry a forward-only "Edge Polish" refinement at the hit site; **ADR-0077
removed it** because forward-stepping can only push deeper past a zero-crossing (never
settle back onto it) — and, decisively, because it was an *inert-but-always-compiled*
control whose live `mapDist` inline cost ~1.2–1.7s of cold compile for **every** formula
even at its default-0. Any re-introduction must not repeat that.

## Decision

Add a **native, compile-gated, default-off quality control** `refineSteps` that ports
MB3D's `RMdoBinSearch` shape as a **damped binary search** at the first hit. Three
deliberate choices:

1. **Native quality param, not an MB3D fork.** `refineSteps` lives in `quality.ts` next
   to `fudge`/`detail`/`estimator`/`deBailout` and works for **any** formula
   (float, `uniform uRefineSteps`, default 0, range 0..8). The MB3D importer is just one
   consumer — it sets `quality.refineSteps` like it already sets `detail`/`deBailout`.
   This follows CLAUDE.md "genericize, don't fork": the spec's original
   `FractalDefinition.shader` `enableRefine` flag (set only on MB3D defs) was rejected.

2. **Compile-gated on the value (honours ADR-0077).** The control is `onUpdate: 'compile'`.
   At `refineSteps === 0` (default) the trace kernel emits **zero** refinement GLSL — the
   three insertion points (`dPrev` declaration, the bisection block, the `dPrev = d`
   capture) all collapse to empty strings — so the shader source is **byte-identical** to
   the unrefined march and costs **zero** extra compile/runtime. This is strictly stronger
   than a runtime-gated-but-always-compiled uniform (which would re-incur exactly the
   ADR-0077 `mapDist`-inline cost on all 44 native formulas). Each non-zero value
   recompiles, like `estimator` — which is what makes the compile-time impact *measurable*
   by toggling it (the owner's explicit requirement). `REFINE_HARD_CAP` (8, a
   `#define`) bounds the unrolled loop, mirroring `MAX_HARD_ITERATIONS`.

3. **Plain mid-point bisection on a clean bracket, `mapDist` mid-points.** The coarse
   march hands us a valid bracket `[dPrev, d]` (`dPrev` outside, `d` inside), so straight
   bisection converges monotonically — MB3D's ±0.55 damped secant exists only because it
   reuses the last step width and must self-correct the sign. Mid-points evaluate the
   geometry-only twin `mapDist` (distance is all the root-find needs; keeps the inline
   cheap per ADR-0076), and `h.yzw` (trap/iter/decomp colour) is kept from the overshoot
   `map()` — the nudge is sub-pixel. `dPrev` is declared **before** the march loop and
   only assigned at the bottom (declaring it at the advance site would put it out of scope
   at the hit check one iteration later).

The importer mapping: `refineSteps = stepsAfterDEStop > 0 ? min(8, max(4, steps)) : 0` —
floor at 4 when the artist enabled it (MB3D's preview default), 0 when they left it off
(respect the authored choice; those scenes march clean and pay nothing).

The Physics-probe stub and the path-tracer lean trace deliberately **never** refine
(`getTraceGLSL(..., enableRefine=false)`) — the probe is a depth read that must not move,
and mesh-export has its own Newton projection (a separate refiner).

## Correctness invariant

The refinement evaluates `mapDist()` at mid-points while the hit came from `map()`. They
**must compute the same silhouette distance**, else the refined hit drifts off the
normal/shadow surface. They share `formulaBody`/`loopInit`/`getDist` in `DE_MASTER`
(`de.ts`), so they agree by construction — `mapDist` only strips colour/trap/decomp
machinery that never perturbs `z`. The dIFS `g_difsDE` accumulator is per-call clean
(re-seeded in each `map`/`mapDist` loop-init), so dIFS scenes are safe. A structural guard
(`test:refine` section C) asserts both twins carry the same body.

## Consequences

- **No-regression:** at the default (`refineSteps = 0`) the kernel is source-identical →
  pixel-identical → zero compile cost. Verified by `test:refine` (the off path omits every
  refine marker and the three insertion points reduce to the original adjacent source).
- **Canary:** DsyneGrafix-class imports — dust resolves to a coherent surface as
  `uRefineSteps` rises (visual cert vs the MB3D reference).
- **Cost when on:** one `mapDist` inline (compile) + `uRefineSteps` `mapDist` calls **per
  hit pixel only** (runtime) — far cheaper than globally raising `uMaxSteps` or lowering
  `uFudgeFactor`. Budget against ADR-0077's ~1.2–1.7s for the old loop; expect ≤ that.
- **Tuning UX:** because it's a compile param, scrubbing `refineSteps` recompiles per step
  (like `estimator`). Acceptable for a "dial it for a hard formula" control; a runtime
  count within a compiled-on build is a possible v2.
- **Watch:** `stepJitter` makes `dPrev` a jittered-but-valid bracket (converges regardless;
  watch for temporal shimmer during accumulation). A discontinuity *inside* the bracket can
  fool plain bisection — if dust persists in a thin band, fall back to MB3D's ±0.55 damped
  secant as a v2.

@see `engine-gmt/shaders/chunks/trace.ts` (the loop), `plans/mb3d/research/binary-search-de-spec.md`,
ADR-0076, ADR-0077, ADR-0083.
