---
paths:
  - "engine/RenderPipeline.ts"
  - "engine/BloomPass.ts"
  - "engine/ShaderBuilder.ts"
  - "engine/UniformSchema.ts"
  - "engine/fractal/shaders/**"
---

# Engine-core render pipeline + shader builder

Read first: JSDoc on `engine/RenderPipeline.ts` and `engine/BloomPass.ts`
(writeIndex semantics, bloom, accumulation); JSDoc on `engine/ShaderBuilder.ts`
plus [`docs/policy/uniform-plugin-contract.md`](../../docs/policy/uniform-plugin-contract.md)
(uniform schema, BASE vs feature merge, the section escape hatch).

Decisions: ADR-0018 (pipeline), ADRs 0019-0020 (shader builder). For
`engine/fractal/shaders/`: ADR-0063 (the host-agnostic `engine/fractal` carve these
files came from — fluid-toy consumes them through re-export shims and the Gradient
Explorer through `engine/fractal/FractalColorRenderer.ts`; neither forks them), ADR-0064
(the LA→PO reference-index handoff in `fractalKernel.ts`).

## Keep it domain-agnostic

This is engine-core. No fractal vocabulary here — no `if (formula === 'Mandelbulb')`,
no `state.geometry?.juliaX`. App-specific behaviour arrives via plugin seams,
registries and store augmentations. If GMT needs something this can't express,
extend it *generically* so another app could use the same seam.

## Accumulation

Convergence measurement + reset semantics: ADR-0017 (async fence readback),
ADR-0018 (gating on `_convergenceNeeded`), ADR-0067 (bucket render is fixed-spp —
no per-bucket convergence; also the `resetAccumulation` → `convergencePending`
carry-over fix that `npm run test:bucket-convergence` guards). For *what counts as
a visual change that may reset accumulation*, see ADR-0061's "Scope boundary"
section (render invalidation stays in the accumulation-reset system, separate from
gesture activity) and ADR-0078 (`noAccumReset` / `preserveOnApply`). Accumulation
FPS readings lie — see the benchmarking note in
[`docs/policy/shader-compile-optimization.md`](../../docs/policy/shader-compile-optimization.md);
measure with timer queries over a full-frame region, dump once and measure many.

## The engine-core GLSL under `engine/fractal/shaders/`

`ditherTail.ts` has a cross-tree contract: the adaptive TPDF blue-noise tail is included by
BOTH the live-fractal display pass and the Gradient Explorer compositor (re-exported from
`gradient-explorer/fullscreen/ditherTail.ts`), so its four calibrated constants are shared.
Its flat gate must open only on a truly constant region, and `debug/test-dither.mts` holds
a hand-written TS mirror of the same maths, checked against the GLSL.

## Guards

```
npm run test:dither   # the flat gate both ways, the constants read out of DITHER_TAIL_GLSL, banding and plateau drops
```

The `test:bucket-convergence` reference above is also a live citation.