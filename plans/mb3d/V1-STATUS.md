# MB3D Importer — v1 status & forward direction

**Branch:** `feat/mb3d-importer` @ HEAD `48586f9` · **Prepared:** 2026-07-03 for the v1 merge to `main`.
Live scene/corpus counts and the active worklist live in [`EXECUTION-STATUS.md`](./EXECUTION-STATUS.md); this doc is
the durable "what v1 is / what's deferred" summary that travels with the merge.

## What v1 ships

A deterministic **Mandelbulb3D `.m3p`/text → native GMT** importer: parse → hybrid-weave sequence → fused
`FractalDefinition`, plus the render machinery to make the imported math look right.

- **Decoder (essentially solved).** x87 + SSE2 `[CODE]` decompiler with a faithful numeric cross-check; the
  corpus renders faithfully at the count recorded in `EXECUTION-STATUS.md` (0-mismatch). Standalone formula
  library (100+ decompiled formulas) + bundled sample scenes, click-to-load in the Import MB3D modal.
- **Faithful marcher (ADR-0088), perf-cleared.** MB3D's damped/Lipschitz-clamped step math, compile-gated,
  auto-on for imports. GPU-benchmarked (2026-07-02): compile-negligible, free-to-faster vs the standard march
  → cleared as a candidate default marcher. Data: `research/faithful-marcher-perf-2026-07-02.md`.
- **Render-fidelity fixes that landed:** Euclidean distance metric (was Chebyshev), `deBailout = rStop²` (was
  clamped to 1000), 4D-coordinate path for deOption-5/6, and the **est7 no-analytic-derivative auto-route**
  (Deliverable 1, `389825b`) — no-ADE scenes (e.g. Oxnot) render on plain import with no manual estimator switch.
- **Scene import:** camera, lighting/material, palette (L0–L3).
- **Bundled with the merge (orthogonal):** `bb5993f` fluid-toy "iteration multiplier → 0" dissolve animation.
  Accepted as-is; see Known behaviors.

## Merge-safety (code review, 2026-07-03)

Five-angle review of the ~17 GMT-shared files (`main...HEAD`). **Verdict: no merge blocker.**
- Every compile-gated addition (faithful marcher, est7 numeric-DE, 4D path) is **byte-identical when off** —
  native (non-import) GMT rendering is provably unchanged.
- The domain-agnostic `engine/**` core is **clean of MB3D language** (CLAUDE.md rule holds); signature changes are
  all trailing-optional/default-off (mesh-export, path-tracer, physics-probe unaffected).
- Remaining findings are cleanup/altitude that the **N-formula unification** absorbs (estimator registry, kernel-
  feature seam, shared param packer), not merge blockers.

## Known behaviors (not bugs)

- **Estimator 6/7 → Linear on cross-formula load.** A scene saved with estimator 6 (dIFS) or 7 (numeric) loaded
  onto a formula lacking `supportsDifs`/numeric support silently falls back to Linear (`core_math.ts`). This is a
  graceful fallback (the alternative references a non-existent preamble → compile error), reachable only for
  mb3d-era scenes via preset-apply / "Convert to native."
- **fluid-toy deep-zoom dissolve edge.** With `bb5993f`, fluid-toy's `iterMul` can drop the deep reference-orbit
  build below the old 0.25 floor, which at extreme low values can produce ADR-0065 deep-zoom artifacts. Intended
  behavior of the dissolve feature; a deep-path floor guard is a separable fluid-toy follow-up if it bites.

## Forward direction (deferred, post-merge)

Two tracks, in priority order:

1. **N-formula weave unification — the next major initiative.** GMT has two parallel formula-scheduling systems
   (interlace = 2-formula alternation; the MB3D weave = N fixed slots) + a coupled, single-formula param-surfacing
   layer + an all-or-nothing packing path. Unify into one engine-level **weave core** — `WeaveSpec` (the single
   contract) + one scheduler + one emitter (native slots + unified parametric packing) + one extracted param
   primitive — with interlace, the importer, and a new **user-facing weaver** as thin front-ends. The weaver lives
   in the Import MB3D modal first (mode-0 ordered stacking over the MB3D library), then promotes to a dockable
   panel with native-formula slots + a per-iteration struct-state framework. Design + staged/cert-gated build in
   `sessions/S-nformula-weave-unification.md`.
2. **DE / render-fidelity front** (per `EXECUTION-STATUS.md` ranking): 4D escape radius (built + GPU-tested +
   reverted, `62575bc` — needs the shared-marcher approach), Oxnot step-floor calibration, Hydra z0 input-coord
   plumbing, U7 two-orbit DEcombine kernel (+~6 scenes).

**Tier-3 walls (separate initiatives, do not cheap-chase):** texture-asset pipeline (HeightMapIFS lightmaps),
IEEE-754 bit-pattern model (Amazing Surf 2), genuine-loop / irreducible-CFG structurer, intern-AmBox convergence
sim (Hyperben2/Theli/QuatP4). Colour/shading fidelity is a cross-cutting polish track. Realistic scene ceiling
with cheap+medium work ≈ 50%; the walls are needed for more.
