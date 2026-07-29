---
paths:
  - "engine-gmt/shaders/**"
---

# engine-gmt GLSL chunk library

The 21 files under `engine-gmt/shaders/chunks/` are the GLSL every GMT fragment
shader is assembled from — the raymarcher, the distance-estimator twins, the
lighting stack, the path tracer and the post chain. `ShaderFactory` concatenates
them; nothing here is a module the app imports at runtime, it is source text that
becomes a program.

Created 2026-07-29 by the guard sweep. Before that this tree was scoped only by
[`fork-rules.md`](./fork-rules.md), which covers all of `engine-gmt/**` and cites
no guards at all — so a change to the marcher loaded a rule about forking policy
and named nothing that could catch a mistake.

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
(path-tracer procedural sun NEE).

## What's load-bearing

- **Compile gates must collapse to nothing when off.** `enableRefine: false` and
  `numericDE: false` emit the *byte-identical* unrefined source, not a disabled
  branch. Same source means same pixels and zero compile cost, and that is what
  `test:refine`'s block A asserts character-for-character. If you add a gate,
  add the collapsed-form assertion with it.
- **`map()` and `mapDist()` are twins.** Both come out of `DE_MASTER` from the
  same formula body, loop init and `getDist`, because the refine loop's mid-point
  `mapDist` has to converge on the silhouette `map` found the hit on. `mapDist`
  strips the colour/trap machinery only — never anything that perturbs `z`.
- **These are strings, so a typo is a runtime compile error, not a type error.**
  `typecheck` cannot see inside them. That is why the text assertions in the
  guards below are worth their apparent crudeness.

## Guards

```
npm run test:refine
npm run test:shader        # long — full native config sweep, compiles the real programs
```

`test:refine` reaches 9 of the 21 files here and is the fast one (0.8s, 83
checks). Falsified 2026-07-29 five ways: forcing `enableRefine` true in `trace.ts`
(8 red), forcing `numericDE` true in `de.ts` (8 red), moving `REFINE_HARD_CAP`
from 8 to 6 in `data/constants.ts` (1 red), and — after a repair, because it did
not previously fail — making `emitFusedHybrid` return no def (12 red). `test:shader`
reaches 19 of 21 and actually compiles, so it catches GLSL that merely parses.
