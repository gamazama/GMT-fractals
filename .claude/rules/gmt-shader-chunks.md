---
paths:
  - "engine-gmt/shaders/**"
---

# engine-gmt GLSL chunk library

The 21 files under `engine-gmt/shaders/chunks/` are the GLSL every GMT fragment
shader is assembled from — the raymarcher, the distance-estimator twins, the
lighting stack, the path tracer and the post chain. `ShaderFactory` concatenates
them; it is source text that becomes a program, not modules the app imports.

## Read first

- `chunks/trace.ts` — `getTraceGLSL`. The ray march itself: the MB3D-faithful
  step (clamp / damper / `uFudgeFactor`), the compile-gated post-hit refinement,
  and the glow/lean/histogram variants. Grep `enableRefine` for the gate.
- `chunks/de.ts` — `DE_MASTER`. Emits `map()` and `mapDist()` from ONE formula
  body, plus the numeric finite-difference DE path behind `kernel.numericDE`.
- `chunks/lighting/**` — shading, shadows, env, PBR, volumetric scatter.
- `chunks/pathtracer.ts`, `chunks/post.ts`, `chunks/post_process.ts`.

Decisions: **ADR-0084** (post-hit surface refinement), **ADR-0085** (numerical
finite-difference DE), **ADR-0092** (the MB3D-faithful step IS the marcher — the
legacy plain sphere step and `uMb3dStepDiv` must never come back), ADR-0093
(zoom-normalised shadow march), ADR-0076 (trace/map inline removal), ADR-0070
(path-tracer procedural sun NEE). Also: ADR-0088 (the faithful marcher's first,
MB3D-only compile-gated form — superseded in part by ADR-0092), ADR-0071 (the path
tracer's soft-knee firefly clamp, grep `clampByLuminance`), ADR-0074 (area-light PT
shadows fold into one shadow march, grep `shadowLogic`), ADR-0075 (one normal estimator
in the path tracer, grep `getSurfaceMaterial`), ADR-0068 (the VNDF sampler in
`chunks/vndf.ts`, shared by reflections and the path tracer), ADR-0077 (Edge Polish and
Step Relaxation removed from the march loop), ADR-0100 (navigation renders the same
integrand as the final image — no cheaper motion path in `ray.ts`, `trace.ts` or
`lighting/shared.ts`).

## What's load-bearing

- **Compile gates must collapse to nothing when off.** `enableRefine: false` and
  `numericDE: false` emit the *byte-identical* unrefined source, not a disabled
  branch: same pixels, zero compile cost. `test:refine`'s block A asserts it
  character-for-character. If you add a gate, add the collapsed-form assertion with it.
- **`map()` and `mapDist()` are twins.** Both come out of `DE_MASTER` from the
  same formula body, loop init and `getDist`, because the refine loop's mid-point
  `mapDist` has to converge on the silhouette `map` found the hit on. `mapDist`
  strips the colour/trap machinery only — never anything that perturbs `z`.
- **These are strings, so a typo is a runtime compile error, not a type error.**
  `typecheck` cannot see inside them.

## Guards

```
npm run test:refine        # fast (0.8 s); reaches 9 of the 21 files
npm run test:env-sampling  # env-map sampling contract (ADR-0069 / ADR-0072)
npm run test:shader        # long — full native config sweep, compiles the real programs (19 of 21)
```

`test:env-sampling` reads `chunks/lighting/env.ts` as text because `test:shader` only
proves the program COMPILES: an implicit-LOD fetch (`texture()` on the mipmapped env
texture) compiles and renders wrong.
