---
paths:
  - "engine-gmt/engine/*.ts"
  - "engine-gmt/engine/managers/**"
---

# engine-gmt renderer + shader pipeline

Read first: JSDoc on `engine-gmt/engine/FractalEngine.ts`,
`engine-gmt/engine/CompileScheduler.ts`, `engine-gmt/engine/ShaderBuilder.ts`
(the 17-position assembly), `engine-gmt/engine/managers/UniformManager.ts`
(`syncFrame`) and `ConfigManager.ts` (the `update` diff),
`engine-gmt/engine/GmtBucketHost.ts`.

Decisions: ADRs 0040-0042 (renderer), ADRs 0043-0044 (shader pipeline),
ADR-0045 (bucket render), ADRs 0040 + 0073 (compile time),
ADRs 0079 (quality consolidation), 0092 (the faithful marcher),
0094-0098 (reflections, fog, sky), 0099 (rotation descriptors).

## Compile cost

[`docs/policy/shader-compile-optimization.md`](../../docs/policy/shader-compile-optimization.md)
carries the cold/cached model, the measure→attribute→validate protocol, and
per-switch cost. Cold PT compiles run ~10-20s; regressions here are expensive and
easy to introduce.

**Sliders stay runtime. Only mode toggles recompile.** If a change would put a
compile behind a continuous control, that's the bug.

Expensive optional systems (volumetrics) stay out of the Shader Compiler panel and
compile only when enabled — that's what keeps register pressure off the base shader.

## Benchmarking

Bench on a real GPU (`d3d11`). Headless SwiftShader lies about relative cost, and
ANGLE's D3D11 optimizer folds aggressively — always bench-verify an audit's claims
rather than reasoning from the GLSL source.

Accumulation FPS is not a valid measurement. Use timer queries over a full-frame
region; dump once, measure many.

## Guards

```
npm run test:bucket-convergence   # RenderPipeline accumulation + convergence fence
npm run smoke:engine-gmt          # app-gmt boot: BOOTED, compile, FRAME_READY, store
npm run test:shader               # long — full native config sweep
```

`smoke:tsaa` is NOT a guard for this area despite the name — it boots
`fluid-toy.html`, whose TSAA is its own shader path (`fluid-toy/fluid/
FluidEngine.ts`, `FRAG_TSAA_BLEND`). fluid-toy never imports `RenderPipeline`;
`engine/RenderPipeline.ts` has exactly one importer, the
`engine-gmt/engine/RenderPipeline.ts` re-export shim. An engine-gmt TSAA /
accumulation regression cannot fail it. Use `test:bucket-convergence` for that
path. Same trap for `smoke:formula-switch` (fractal-toy.html) and
`smoke:fractal-kind` (fluid-toy.html) — sibling apps, not engine-gmt.