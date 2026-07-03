# Session prompt — native surface-refinement DE (binary search)

> **⚠ DONE + SUPERSEDED AS THE DUST FIX 2026-06-27.** Surface refinement shipped (ADR-0084) as a
> native, opt-in `CompilableFeatureSection` control — but it does **not** fix the DsyneGrafix dust
> it targeted (that's a DE-fidelity gap; see `dsyne-de-fidelity-findings.md`). The real dust fix is
> the numerical finite-difference DE estimator (**ADR-0085**). This prompt is historical.

Copy the block below as the first message of a new session. It implements MB3D's
post-hit surface refinement as a **native GMT quality feature** (not an MB3D-importer
escape hatch), then has the importer consume it. Full algorithm + verified file/line
index: [`plans/mb3d/research/binary-search-de-spec.md`](./binary-search-de-spec.md).

---

## Prompt

Implement **native surface-hit refinement** (a damped binary search at the ray's first
hit) in GMT's shader engine, on branch `feat/mb3d-importer` at `h:/GMT/workspace-gmt/stable`.
Commit per logical step; don't push. Real GPU only for renders (headed Chrome → ANGLE),
never headless SwiftShader.

**Why:** GMT sphere-traces and accepts the first sample under the hit threshold as-is. When
the DE is non-Lipschitz / overstepping (DsyneGrafix-class MB3D hybrids, and in general some
frag imports, modular graphs, aggressive hybrids), the ray overshoots a thin/discontinuous
surface and the accepted points scatter into **dust** instead of a coherent front face. MB3D
avoids this: the coarse march only *brackets* the surface, then `RMdoBinSearch` walks the ray
parameter back and forth across the iso-surface for `bStepsafterDEStop` extra DE evals. Port
that shape.

**Read first:** `plans/mb3d/research/binary-search-de-spec.md` (the algorithm distilled to
pseudocode in §2, the exact GLSL in §3, the map()/mapDist() agreement requirement in §5, and
the file/line index in §8 — all grounded against `engine-gmt/shaders/chunks/trace.ts`,
`de.ts`, and MB3D `Calc.pas:1641`). Also `engine-gmt/features/quality.ts` (where the new
control lives) and `engine-gmt/shaders/chunks/trace.ts:82-168` (the march loop + the
`if (h.x < finalEps)` hit block at ~:116).

**ARCHITECTURE DECISION (overrides the spec's gating — do it this way):** make refinement a
**native, default-off QUALITY control**, NOT an MB3D-importer compile flag. The spec proposed
an `enableRefine` flag threaded through `getTraceGLSL` and set only on MB3D `FractalDefinition`s
— that's the fork pattern this repo avoids (CLAUDE.md "genericize, don't fork"). Instead:

1. **`refineSteps` quality param** in `engine-gmt/features/quality.ts` (next to fudge/detail/
   maxSteps/estimator/deBailout): float, uniform `uRefineSteps`, **default 0**, range 0..8,
   exposed in the quality UI for ANY formula. Add a compile-time `#define REFINE_HARD_CAP 8`
   (bounds the unrolled loop, like `MAX_HARD_ITERATIONS`).
2. **The bisection loop in `trace.ts`**, inside the hit block (`if (h.x < finalEps)`),
   runtime-gated on `if (uRefineSteps > 0)`. Capture the previous (outside) `d` as `dPrev`
   right before the step advance (~:165), so the hit gives a valid bracket `[dPrev, d]`.
   Bisect with `mapDist()` at mid-points (geometry-only, cheap — per ADR-0076), set `d = dIn`
   (near face). Keep `h.yzw` (trap/iter/decomp) from the overshoot `map()` — the nudge is
   sub-pixel. See spec §3.3 for the exact GLSL.
3. **No compile flag, no importer shader plumbing.** Default `uRefineSteps = 0` → the loop runs
   0 iterations → the hit point is unchanged → output is **pixel-identical** when off. That is
   the no-regression guarantee (stronger than the spec's source-identity; verify it).
4. **MB3D importer consumes it:** in `emitFusedHybrid.ts`'s scene-quality override block
   (~:265-289, where `deStop→detail`, `rStop→deBailout` already live), set
   `sceneQuality.refineSteps = min(8, h.stepsAfterDEStop > 0 ? max(4, h.stepsAfterDEStop) : 0)`
   (`stepsAfterDEStop` @134 is already parsed). No `FractalDefinition.shader` flag.

**Correctness invariant (spec §5):** the refinement evaluates `mapDist()` at mid-points while
the hit came from `map()`. They must compute the same distance (the silhouette) — they share
`loopBody`/`getDist` in `de.ts`, so they agree by construction; add a guard/test asserting
`mapDist(p) ≈ map(p).x` near the surface for the canary. The dIFS `g_difsDE` accumulator is
per-call clean (spec §5.2, verified) so dIFS scenes are safe. Do NOT touch the Physics-probe
stub (`ShaderBuilder.ts:450-489`) or mesh-export's Newton projection (separate refiners).

**Canary (must improve):** DsyneGrafix — import it, set `uRefineSteps` (sweep 0→8), confirm the
dust resolves into a coherent surface vs the MB3D ref (`H:/GMT/refSoftware/MB3D/output/
DsyneGrafix - Getting Loopy.jpg`). Sweep DE/refine via the harness with
`configOverrides:{quality:{refineSteps:N}}` (the harness `qualityOverride` is fixed as of
`06fc465`; `configOverrides.quality` applies at compile). Cert tool: `npx tsx
debug/cert-render.mts [name]` (needs the harness at `localhost:5173/render-harness.html`).

**No-regression (must be pixel-identical with refine off):** render 3-4 certified scenes
(Theli, Hyperben2, AureliusCat dIFS, a native non-MB3D formula) with `uRefineSteps = 0`
before/after — pixel-diff must be zero. Also confirm a native formula (e.g. MengerSponge,
Mandelbulb) is unaffected at default.

**Watch / risks (spec §7):** stochastic `stepJitter` makes `dPrev` a jittered-but-valid
bracket (verify no temporal shimmer during accumulation); a discontinuity *inside* the bracket
can fool plain bisection — if dust persists in a thin band, fall back to MB3D's ±0.55 damped
secant (self-corrects sign) as a v2; perf is `uRefineSteps` extra `mapDist` calls per HIT pixel
only (far cheaper than raising maxSteps globally).

**Gates (keep green):** `npm run typecheck`, `test:mb3d`(24) / `:weave`(42) / `:map`(32), the
cert render. Update `quality.ts` JSDoc + add an ADR if the refinement is a load-bearing kernel
decision (it is — write one: "post-hit surface refinement for non-Lipschitz DEs").

**Stretch (optional):** expose it in the quality UI with a sensible label ("Surface Refinement"
/ "Hit Refinement") and a one-line help string, so users can dial it for any hard-to-march
formula, not just imports.
