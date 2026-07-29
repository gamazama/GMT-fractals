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

Decisions: ADR-0018 (pipeline), ADRs 0019-0020 (shader builder).

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

Added to this rule's scope 2026-07-29 by the guard sweep: those five files —
`ditherTail.ts`, `fractalDisplay.ts`, `fractalKernel.ts`, `gradientSample.ts`,
`tsaaBlend.ts` — were scoped by NO rule at all, so opening any of them loaded
nothing. They are engine-core shader source, which is this rule's remit.

`ditherTail.ts` is the one with a cross-tree contract worth knowing before you
touch it: the adaptive TPDF blue-noise tail is included by BOTH the live-fractal
display pass and the Gradient Explorer compositor (which re-exports it from
`gradient-explorer/fullscreen/ditherTail.ts`), so its four calibrated constants
are shared. Two things follow. Its flat gate must open only on a truly constant
region — earlier 0.006/0.030 thresholds half-gated real gradients straight back
into banding — and `debug/test-dither.mts` holds a hand-written TS mirror of the
same maths, which is now checked against the GLSL rather than trusted.

## Guards

```
npm run test:dither
```

`test:dither` prints a banding/noise lab and a montage, but its exit status now
turns on five assertion groups: the flat gate in both directions, the four
constants and two structural expressions read back out of `DITHER_TAIL_GLSL`, a
>4x banding drop, a >4x plateau reduction, and `renderFieldDithered`'s WIGGLE.
Falsified 2026-07-29 five ways, three of which it could not see before that date
(`DITHER_FLAT_HI` widened, the flat gate deleted, error diffusion disabled).
The `test:bucket-convergence` reference above is also a live citation and reaches
the accumulation code it is named for.