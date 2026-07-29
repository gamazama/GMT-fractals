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
npm run smoke:engine-gmt          # app-gmt boot: BOOTED, compile, FRAME_READY, store
npm run test:shader               # long — full native config sweep
```

`smoke:tsaa` is NOT a guard for this area despite the name — it boots
`fluid-toy.html`, whose TSAA is its own shader path (`fluid-toy/fluid/
FluidEngine.ts`, `FRAG_TSAA_BLEND`). fluid-toy never imports `RenderPipeline`;
`engine/RenderPipeline.ts` has exactly one importer, the
`engine-gmt/engine/RenderPipeline.ts` re-export shim. An engine-gmt TSAA /
accumulation regression cannot fail it. Same trap for `smoke:formula-switch`
(fractal-toy.html) and `smoke:fractal-kind` (fluid-toy.html) — sibling apps, not
engine-gmt.

### `test:bucket-convergence` is NOT a guard for this rule — removed above

**Correction (2026-07-29 guard sweep — falsified, not inferred.)** This section
used to end "Use `test:bucket-convergence` for that path", and that script used to
head the Guards block. It covers neither that path nor any file this rule scopes,
so it has been removed from the block. The harness imports `engine/RenderPipeline`
**directly**, not through the `engine-gmt/engine/RenderPipeline.ts` shim — and a
re-export points engine-gmt→core, never the reverse — so nothing under
`engine-gmt/engine/**` is in its import graph. The rule-guard checker had been
reporting this as one of its four known miscitations.

Three breaks, each applied to the source and reverted, running both that harness
and `tsc`:

- Remove `convergencePending = false` from engine-core's `resetAccumulation`
  (grep `resetAccumulation` in `engine/RenderPipeline.ts`) → harness **RED**, exit
  1, "FIXED: resetAccumulation cleared the stale pending measurement". The harness
  is healthy — it simply guards `engine/RenderPipeline.ts`, which is scoped by
  [`render-and-shaders-core.md`](./render-and-shaders-core.md), where the same
  citation is correct and where it stays.
- Gut `GmtBucketHost.resetAccumulation()` — the per-bucket
  `pipeline.resetAccumulation()` call, grep `resetAccumulation` in
  `engine-gmt/engine/GmtBucketHost.ts` → harness **GREEN** *and* typecheck green.
  That is an engine-gmt accumulation regression passing everything.
- Repoint the shim's `export *` at another module → harness **GREEN**, typecheck
  **RED** (6 errors). The shim holds no runtime logic, so typecheck is its only
  meaningful cover.

So: for engine-core accumulation/convergence, `test:bucket-convergence` is the
guard and it works — run it from `render-and-shaders-core.md`. For
`engine-gmt/engine/**` accumulation there is **no runtime guard at all** — treat
`GmtBucketHost` and the bucket path as unguarded and verify changes by hand.