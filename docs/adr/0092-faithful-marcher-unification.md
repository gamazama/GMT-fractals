# ADR-0092: The MB3D-faithful marcher becomes GMT's only marcher

**Status:** Accepted — 2026-07-05. Branch `feat/weave-core`. Supersedes ADR-0088 **in part** (the
compile-gate + separate step-divisor uniform; the marcher dynamics and unit analysis of 0088 stand).

## Context

ADR-0088 ported MB3D's live march convergence dynamics (Lipschitz overstep clamp + RSFmul damper +
msDEsub safety-subtraction, `CalcThread.pas:196-230`) as a **compile-gated** alternative step for
imported `.m3p` scenes, keeping GMT's plain sphere step (`d += DE·fudge`) as the default marcher.
Two findings since then:

1. **The perf objection died.** The 2026-07-02 GPU timer-query bench (0088's update block) showed
   the faithful step is compile-negligible and GPU **free on smooth DEs (+0.1 %), faster on the
   overshooting DEs it targets (−15 %)** at equal step size, with images matched to ~2 decimals.
   The 0088 update explicitly flagged "promoting it toward GMT's default marcher".
2. **The split marcher had a coherence hole** (owner-observed): shadow rays — `GetSoftShadow`
   (HQ + Lite), `GetHardShadow` (the path tracer's binary visibility), and the PT env-NEE
   `envVisibility` march — still advanced with the plain step **even when the faithful marcher was
   active**. A non-Lipschitz / over-estimating DE lets those rays launch past exactly the thin
   surfaces the faithful primary march resolves → light leaks / missing self-shadowing on the
   scenes the marcher exists for.

Owner directive (2026-07-05): retire the original GMT marcher entirely; the MB3D-faithful marcher
is the marcher, everywhere an image-producing ray marches.

## Decision

**One marcher.** The three faithful blocks (state, clamp+damper, step) are emitted
**unconditionally** by `getTraceGLSL` — Main trace, path-tracer lean trace (`traceSceneLean`), and
Histogram variant. The legacy step line is deleted. The same clamp + damper (+ msDEsub, scaled by
each march's own hit threshold) is added to `GetSoftShadow` HQ, `GetSoftShadow` Lite (clamp +
damper only — its 0.05 step floor stays, so it remains the fast approximation), `GetHardShadow`,
and the PT `envVisibility` march.

**One step divisor.** `quality.fudgeFactor` / `uFudgeFactor` (relabelled **"Step Size"**, was
"Slice Optimization") is the unified step divisor — MB3D's `sZstepDiv` maps 1:1 onto it
(`Calc.pas:1878`). The separate `mb3dStepDiv` param + `uMb3dStepDiv` uniform are **retired**.
`mb3dDEsub`/`uMb3dDEsub` survives as the one remaining scene-authored marcher param (group
`kernel`, advanced, default 0 — native scenes subtract nothing).

**Retired plumbing:** `KernelFeatures.mb3dFaithful`, `ShaderBuilder.enableMB3DFaithful()`, the
`quality.mb3dFaithful` compile-gate param, the quality feature's inject arm, and the Quality
panel's "MB3D-Faithful March" compilable section (the Step tuning row now shows
`fudgeFactor · stepJitter · mb3dDEsub`).

**Importer** (`emitFusedHybrid`): writes `fudgeFactor` directly from the authored `sZstepDiv`
(with the iOptions-bit-2 quadratic remap from `HeaderTrafos.pas:961-964`), clamped to
[0.01, 1.0] — the faithful mapping, replacing the legacy 0.4-floored fudge (which the faithful
marcher never read). The `maxSteps` budget curve stays anchored on a 0.4 step floor
(`min(2000, max(1500, 750 / max(0.4, fudge)))`) so every certified scene keeps its exact budget.

**Load migration** (`app-gmt/migrations.ts` v4, applied to every load path before feature
setters): scenes with `mb3dFaithful` truthy get `fudgeFactor ← mb3dStepDiv` (0.5 when omitted —
the old param default), preserving their primary march exactly; scenes without the gate drop the
inert `mb3dDEsub`; both retired keys are deleted; LFO/sequence tracks targeting
`quality.mb3dStepDiv` retarget to `quality.fudgeFactor` (pure key rename).

**Deliberately untouched:** the Physics distance probe (non-visual, fixed coarse step — feeds
orbit-control distance only) and the mesh-export `SDFShaderBuilder` marcher (separate subsystem).
Post-hit refine (ADR-0084) and the numeric DE (ADR-0085) remain independent gates. The
`uOverstepTolerance` candidate-recovery stays a user control (the importer still zeroes it — the
clamp+damper make it redundant on imports).

## Consequences

- **Shadow / visibility rays converge on the same surfaces the camera ray does** — the light-leak
  class is closed. Cost: the damper only shortens steps where the DE collapses (near surfaces);
  the Lite shadow path stays floor-dominated (fast).
- **Native scenes change marchers silently.** Bench evidence says images match to ~2 decimals
  (region-MAE) at equal step size, and the clamp/damper can only *shorten* suspicious steps —
  the failure direction is "slightly slower near surfaces", not "new holes". `fudgeFactor` default
  1.0 means natives march at full DE steps, paying ~0 versus the legacy step.
- **Imported fine-step scenes now pace shadow rays at the authored step** (previously 0.4-floored)
  — better shadow agreement, more shadow steps on fine-step scenes, bounded by `uShadowSteps`.
- **ADR-0088's "off-path byte-identical / per-scene gate" guarantee no longer exists** — that is
  the point of this ADR. The kernel-gate invariant in `shaders/chunks/kernel.ts` now covers
  `refine` + `numericDE` only.
- **No in-app A/B against the legacy march.** `debug/bench-shader.mts --mb3d-faithful` is retired
  (warns); `--mb3d-stepdiv` now drives `fudgeFactor`.
- **Saved scenes round-trip via migration v4**; files on disk are untouched until re-save (the
  standing one-way-door pattern of migrations v1–v3).
- Guards: `test:refine` grew marcher-unification checks (legacy step absent, clamp/damper/DEsub
  present, `uMb3dStepDiv` never reappears — 71 checks); `test:mb3d` 24 · `test:mb3d:weave` 281 ·
  `check:mb3d-decompiler` · `smoke:boot` all green at landing.

@see docs/adr/0088-mb3d-faithful-marcher.md (dynamics + unit analysis, perf data)
@see docs/adr/0084-post-hit-surface-refinement.md (refine remains an independent gate)
@see plans/mb3d/research/faithful-marcher-perf-2026-07-02.md
