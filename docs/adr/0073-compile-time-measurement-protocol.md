# ADR-0073: Compile-time measurement protocol + adopted diagnostics

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `debug/measure-pt-compile.mts`, `debug/measure-pt-switches.mts`, `engine-gmt/engine/CompileScheduler.ts` (instrumentation), `docs/policy/shader-compile-optimization.md`

## Context

PT shader cold compiles run ~10–20s (D3D11/ANGLE). A multi-session effort to cut
that needs a *repeatable* way to measure where the time goes, because naive
measurement lies in two specific ways discovered in session 1:

1. **The Chrome GPU program disk cache makes a repeat compile of the same shader
   ~50ms** (≈200–400× faster than cold). Any benchmark that compiles a variant
   twice, or doesn't disable the disk cache, measures the cache, not the compile.
2. **Cold compiles have a ~1s noise floor** (thermal/contention). Absolute ms
   drifts run-to-run; one session-1 run reported a known-free switch (Sobol) at
   +2865ms — pure contamination.

Two diagnostic scripts were written in session 1 to measure correctly, plus the
existing `CompileScheduler` `[Compile]` log they parse. They were untracked. The
consolidation (this session) needed a decision: adopt them as the protocol's
canonical tooling, or leave them ad-hoc.

## Decision

Adopt the two scripts as the compile-time protocol's canonical measurement tools
and commit them. The protocol they encode is documented in
`docs/policy/shader-compile-optimization.md` §5 and is binding for execution
sessions:

- **Measure cold:** `--use-angle=d3d11 --disable-gpu-shader-disk-cache`, headed
  Chrome, each variant compiled exactly once per process. Read `gpu=` from the
  `[Compile]` log (isolates fxc/link from preview + first-draw), not the wall
  window.
- **Attribute with within-run deltas** (switch − baseline cancels correlated
  baseline noise), one switch at a time. Treat sub-~1s deltas as noise. Keep a
  known-free control (Sobol); discard any run where it reads non-zero.
- **Validate by falsification:** measure before/after, revert non-wins; never
  micro-optimize straight-line GLSL on a code-reading hunch (a session-1 CDF-loop
  hypothesis was measured false). Gate correctness on `webglCompile` + visual;
  gate quality regressions on `BENCH_SHADER` thresholds.

- `debug/measure-pt-compile.mts` — cold PT compile per formula, old-vs-new
  defaults (the §2.2 toll table).
- `debug/measure-pt-switches.mts` — per-switch marginal cold cost (the §2.3 hog
  table).

The `[Compile]` two-stage/single-stage log lines in `CompileScheduler.ts`
(already marked "do not remove") are load-bearing protocol inputs; this ADR
formalizes that contract.

## Consequences

- The diagnostics are tracked and reproducible; execution sessions don't
  re-derive the methodology or re-discover the cache/noise pitfalls.
- The scripts are Windows-pinned in one respect: `debug/runWithServer.mts` dies
  with `spawn EINVAL`, so they wait for an externally-started `npm run dev` and
  connect to `localhost` (IPv6 `::1`), not `127.0.0.1`. Documented in the script
  headers and the policy doc §5.4.
- A measurement gap is now explicit: the `[Compile]` log isolates `gen=` and
  `gpu=` but **not** the first-draw/"unfold" phase (absorbed into total). Closing
  it is backlog item L7 (add a `firstDraw=` timer around the post-swap render).
- The protocol is integrator-agnostic but the scripts hardcode PT switches;
  extending to other compile-gated features (geometry hybrid, volumetric,
  interlace — ADR-0055) means adding their gates to the `SWITCHES` table.
