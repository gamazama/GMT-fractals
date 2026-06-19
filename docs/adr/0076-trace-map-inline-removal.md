# ADR-0076: Trace function drops two `map()` inlines (refine→`mapDist`, recovery reuse)

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/trace.ts` (`getTraceGLSL`, the
`traceScene`/`traceSceneLean` template), compile-time backlog L5 in
`docs/policy/shader-compile-optimization.md`

> **Update 2026-06-19 (refine→`mapDist` superseded; recovery-reuse stands):** the
> surface-refinement loop was subsequently **removed entirely** when the "Edge
> Polish" control was retired (ADR-0077) — so lever (1) below (refine
> `map`→`mapDist`) is moot (no refine loop exists). Lever (2) (overstep-recovery
> reuses `candidateH`) is unaffected and remains in force. The cost model this ADR
> established is unchanged and is what justified the further removal.

## Context

Session 4 of the compile-time initiative worked the ranked L5 leads (the
`traceScene`/`traceSceneLean` duplicate, the `envVisibility` fold, the
refinement-loop `map`→`mapDist` swap). Three of them were measured cold via
within-run A/B (`--use-angle=d3d11 --disable-gpu-shader-disk-cache`, Sobol
control) and reverted as no-ops; this ADR records the two that shipped.

The march template `getTraceGLSL` inlined the **full `map()`** — the heaviest
body in the shader (~177 lines: fractal iteration + orbit-trap + decomposition +
coloring snapshot, `de.ts`) — at **three** sites per trace function:

1. the inner march step (`h = map(...)`, distance every step),
2. the surface-**refinement** loop (`h_ref = map(...)`, "Edge Polish"),
3. the overstep-**recovery** block (`result = map(...)`, recovered-hit coloring).

In maximal PT both `traceScene` (camera) and `traceSceneLean` (bounce) carry all
three → the census counted **6 `map()` call-sites**.

**The cost model (the load-bearing finding):** ANGLE/fxc **folds byte-identical
functions** (so removing `traceSceneLean`, which is identical to `traceScene`
when the volume injection is empty, was a measured **no-op** — lead 1), **but
inlines `map()` per call-site, each inline ≈2s of cold fxc translate.** So the
win is not "remove a duplicate function" — it is "remove a genuine `map()`
inline." (This also reconciles ADR-0074/0075: those removed a distinct *body*
that a runtime predicate kept live; folding doesn't apply there.)

## Decision

Remove two of the three `map()` inlines from the trace template:

1. **Refinement loop → `mapDist()`.** The refine loop only converges `d` onto the
   surface (it reads `h.x`), so it uses the geometry-only twin `mapDist()`
   instead of the full `map()`. `h.yzw` (trap/iter/decomp coloring) is kept from
   the hit-point `map()` above; the refinement nudge is sub-pixel so the coloring
   difference is negligible — **and "Edge Polish" (`refinementSteps`) is 0 by
   default, so the default-config output is byte-identical.**

2. **Recovery reuses the captured candidate `map()`.** The inner march already
   computes the full `map()` (`h`) at every step. Candidate tracking now
   snapshots `h` into `candidateH` when it updates `candidateD`; the recovery
   block reuses `candidateH` instead of re-evaluating `map(p_cand)`. Same
   position (`ro + rd*candidateD`) → **byte-identical** output, no quality change.
   `candidateH` is only written/read under `uOverstepTolerance > 0` and DCEs
   otherwise.

Both apply to the shared template, so they benefit `traceScene` (Direct + PT)
and `traceSceneLean` (PT). The census drops to **2 `map()` call-sites** (the
inner march in each trace fn; the inner-march `map`→`mapDist` split is *not*
done — it was reverted historically for +5% runtime, `trace.ts:33-38`).

## Consequences

Measured cold, within-run A/B (Mandelbulb + Great Stellated Dodecahedron;
clean Sobol controls):

| Lever | Mandelbulb | Great Stellated |
|---|---|---|
| Refine `map`→`mapDist` | −1986ms (B−A) / −1779ms (D−C) | −2412ms / −1553ms |
| Recovery reuse `candidateH` | −1650ms / −1851ms | −2763ms / −2099ms |
| **Combined PT baseline (pre→post)** | **~13.4s → ~10.0s (−25%)** | **~17.2s → ~12.8s (−26%)** |

(The recovery A/B's baseline confirmed the refine win cross-run: its `reuse=OFF`
baseline was already ~1.7s below the pre-refine baseline.)

- **Correctness:** all 44 formulas pass `webglCompile` (`native-config-sweep
  --fresh`). Recovery reuse is byte-identical. Refinement-on (non-default) is a
  sub-pixel coloring shift — pending a user visual glance at Edge-Polish scenes.
- **Runtime:** neutral-to-better. At the default (`refinementSteps`=0) the refine
  loop doesn't run; the recovery `map()` re-eval is replaced by reading a stored
  vec4. No inner-march change, so no repeat of the +5% main-march regression.
- **Generality:** the win is a property of removing a `map()` inline, formula-
  agnostic; the saving scales with DE weight (signature of a removed `map()`).

@see `docs/policy/shader-compile-optimization.md` §8 L5 (session 4).
