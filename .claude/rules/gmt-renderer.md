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
per-switch cost. Cold PT compiles run ~10-20s.

**Sliders stay runtime. Only mode toggles recompile.** A compile behind a continuous
control is the bug. Expensive optional systems (volumetrics) stay out of the Shader
Compiler panel and compile only when enabled.

## Benchmarking

Bench on a real GPU (`d3d11`): headless SwiftShader lies about relative cost and ANGLE's
D3D11 optimizer folds aggressively, so bench-verify an audit's claims rather than reasoning
from the GLSL source. Accumulation FPS is not a valid measurement — use timer queries over
a full-frame region; dump once, measure many.

## Guards

```
npm run smoke:engine-gmt          # app-gmt boot: BOOTED, compile, FRAME_READY, store
npm run test:shader               # long — full native config sweep
```

- `test:shader` chains `test:baseline && test:hybrid && test:hybrid-adv && test:weave-sweep`.
  The first three emit byte-identical shaders (nothing reads the hybrid mode fields any
  more), so `npm run test:baseline` alone gives what they give, in ~4 s.
- **Not guards here:** `smoke:tsaa`, `smoke:formula-switch` and `smoke:fractal-kind` boot
  sibling apps; `test:bucket-convergence` imports `engine/RenderPipeline` directly and its
  home is [`render-and-shaders-core.md`](./render-and-shaders-core.md).
- `engine-gmt/engine/**` accumulation — `GmtBucketHost` and the bucket path — has **no
  runtime guard**; verify changes by hand. The `RenderPipeline.ts` re-export shim's only
  cover is typecheck.
