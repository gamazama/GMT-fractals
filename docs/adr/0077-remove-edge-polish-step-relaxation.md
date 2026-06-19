# ADR-0077: Remove Edge Polish + Step Relaxation quality controls

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/features/quality.ts` (params + `QualityState`),
`engine-gmt/shaders/chunks/trace.ts` (march loop), `engine-gmt/panels.ts`
(quality panel whitelists). Uniforms `uRefinementSteps`, `uStepRelaxation` dropped.

## Context

Two quality controls were judged (owner executive decision, 2026-06-19) to have
never worked as documented and never been useful:

- **Edge Polish** (`quality.refinementSteps` → `uRefinementSteps`) — "extra
  micro-steps after hitting the surface to fix slicing/banding."
- **Step Relaxation** (`quality.stepRelaxation` → `uStepRelaxation`) — "dynamic
  step size: fudge near the surface, 1.0 in the void, to save steps."

Both **default to 0 and are provably inert there** (Edge Polish: the loop is
guarded by `if (uRefinementSteps > 0)`; Step Relaxation: `mix(fudge, 1.0, relax *
0) = fudge`), and **no formula or preset in the repo sets either non-zero**. So
removing them is invisible to every default and repo scene; only a hypothetical
user-saved scene that dialed them up degrades — gracefully (the field is ignored
on load), and the controls never helped there anyway.

The removal also intersects the compile-time initiative (L5). A within-run cold
A/B (`--use-angle=d3d11 --disable-gpu-shader-disk-cache`, two runs, formula-paired)
attributed each:

| Removed | Mandelbulb | Great Stellated | Verdict |
|---|---|---|---|
| **Step Relaxation** | −53 / +55ms | −127 / +97ms | **~0 — fxc no-op** (straight-line ALU, §4.3) |
| **Edge Polish (refine loop)** | −692 / −1689ms | −1451 / −1365ms | **real, ~1.2–1.7s** (a `mapDist` inline + loop) |

(Step Relaxation is three lines of `smoothstep`/`mix` ALU in the march loop —
exactly the class ANGLE/fxc already folds, so removing it doesn't reduce translate
time. Edge Polish drove a loop carrying a live `mapDist` inline, which does.)

## Decision

Delete both controls outright: the params + `QualityState` fields
(`quality.ts`), their GLSL in the march loop (`trace.ts` — the refinement loop
and the `safeZone`/`relax`/`currentFudge` block, `currentFudge` hardwired to
`uFudgeFactor`), and the panel whitelist entries (`panels.ts`). The uniforms
disappear with the params (they were declared only via the params' `uniform`
field). Dead `refinementSteps: 0` / `stepRelaxation: 0` keys remain in some
formula default-config blobs; they are ignored on load (harmless), left as a
low-priority cleanup.

## Consequences

- **Compile:** ~1.2–1.7s cold off the PT path (all from Edge Polish; Step
  Relaxation was free either way). This is *in addition to* ADR-0076, and it
  **supersedes ADR-0076's refine `map`→`mapDist`** (the refine loop no longer
  exists). ADR-0076's recovery-reuse (4b) stands.
- **Correctness:** invisible at the default and across all 44 repo formulas
  (`webglCompile` green; the controls were default-inert). `map()` call-sites in
  maximal-PT: 6 (session start) → 2.
- **Behaviour lost:** the two niche recovery knobs are gone. Per the owner
  decision they never delivered their documented effect; re-introducing either
  would need a working implementation + a real use case, not a revival.
- L6: `BASE_COMPILE_MS` nudged down again (covers the always-present trace code).

@see `docs/policy/shader-compile-optimization.md` §8 L5 (session 4); ADR-0076.
