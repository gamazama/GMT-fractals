# ADR-0095: Reflection march candidate recovery with graded confidence fade

**Status:** Accepted — 2026-07-10. Branch `feat/weave-core`. Extends ADR-0094 (faithful reflection
march); addresses reflection noise/"dotty" speckle reported by the owner after ADR-0094 landed.

## Context

`traceReflectionRay` has a step budget (`uReflSteps`, default 64) — unlike MB3D, whose reflected
rays march unbounded until the far plane (`CalcSR.pas` repeat-loop). A ray that exhausts the budget
returned a binary MISS → env colour, producing two visible artifacts:

1. **Dotty speckle** — isolated env-coloured pixels wherever 64 steps weren't enough while
   neighbours hit (worse after ADR-0094's faithful step shrank step sizes; static/structured on
   mirror surfaces, so accumulation never averages it away).
2. **Silhouette flicker/variance** — at reflected silhouettes, VNDF-jittered rays flip between hit
   and env frame-to-frame; a binary outcome makes maximal per-sample variance.

The primary march already solved (1) with overstep-recovery candidate tracking (`trace.ts`), but
gated on `uOverstepTolerance` — a **default-0 scene-repair knob**. MB3D's units suggested the shape
for (2): it smooths every hard cutoff with fade terms (`(t/maxLen)^8`-class falloffs) instead of
binary thresholds.

## Decision

The reflection march always tracks its closest approach in threshold multiples
(`minRatio = min(DE/finalEps)`, pure ALU — no extra DE calls). On budget exhaustion or scene exit,
if `minRatio < REFL_RECOVERY_RANGE` (6.0, compile-time constant in `reflections/shader.ts`), the
march returns the candidate as a **graded hit**: a new `out float reflFade` carries confidence
`((RANGE − minRatio)/(RANGE − 1))²` — 1 at ratio 1, quadratically to 0 at 6× the footprint. The
caller (`REFL_RAYMARCH_SHADING`) mixes the shaded hit toward the env miss colour by `reflFade`.
Real in-budget hits keep `reflFade = 1` and are never faded.

- **Always-on, deliberately NOT tied to `uOverstepTolerance`.** For a reflection ray, snapping to a
  near-graze surface is always the lesser evil vs a guaranteed-wrong env leak; the primary march's
  opt-in semantics don't transfer. No new user parameter (an MB3D-style "reflection step divider"
  knob was considered and rejected as complexity without gain — owner call, 2026-07-10).
- **Cone-coverage reading:** a surface passing within ~6 footprints of the ray was clipped by the
  pixel's reflection cone; the fade is its coverage estimate. Shading a candidate a few footprints
  off-surface is safe — the DE gradient (normals) and lighting remain valid near the surface, as
  with primary overstep recovery.
- Cost: a divide + compare per step and one extra `sampleMissEnv` (mip lookup) on faded hits only.
  No new DE call sites — no compile-path concerns; the Balanced/Env path remains untouched.

## Consequences

- Budget-exhaustion dots become smooth near-surface reflections; reflected silhouettes get an
  analytic coverage gradient instead of per-frame hit/miss variance (less noise to accumulate away).
- Recovered hits slightly over-report geometry within 6 footprints of grazing rays — by design
  (coverage), bounded by the quadratic fade.
- `traceReflectionRay` gains an `out float reflFade` parameter; sole caller updated in
  `features/reflections/index.ts`.
- `REFL_RECOVERY_RANGE` is a code constant, not a param — retune there if scenes surface a bad
  default.
