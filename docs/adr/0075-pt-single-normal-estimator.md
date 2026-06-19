# ADR-0075: Path tracer uses a single normal estimator (8→4 DE_Dist taps)

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/material_eval.ts` (`getSurfaceMaterial`),
compile-time backlog L5 in `docs/policy/shader-compile-optimization.md`

## Context

After ADR-0074 (the area-light shadow single-march), a readout of the live
assembled PT fragment shader (via `debug/dump-pt-shader.mts` →
`window.__gmtProxy._lastGeneratedFrag`) was scanned for the same pattern: heavy
functions inlined more than once. The cost unit is the **`DE_Dist` body inline**
(the fractal distance estimator) — fxc inlines it at each call site, which is
*why* removing one shadow march saved 0.6–1.4s.

The scan found 13 `DE_Dist` call sites. The largest single concentration was the
**adaptive normal estimation** in the shared `getSurfaceMaterial`:

```glsl
if (highQuality) n = GetNormal(p_ray, eps);          // tetrahedron, 4 taps
else             n = GetFastNormal(p_ray, eps * 1.5); // forward-diff,  4 taps
```

Both estimators are 4-tap (the "fast" one isn't even fewer taps, and recomputes
its center tap), so the `if/else` inlines **8 `DE_Dist` taps** — the single
biggest `DE_Dist` block in the shader.

It is inlined as 8 taps **only in the PT variant**, because there `highQuality`
is `bounce == 0` — a *runtime* value, so fxc can't dead-code-eliminate either
branch. In the Direct variant every `getSurfaceMaterial` call site passes a
compile-time-constant `highQuality` (`false` in `calculateShading` and in
raymarched reflections), so fxc already DCEs one branch → Direct only ever
inlines 4 taps.

A within-run A/B (cold, `--disable-gpu-shader-disk-cache`; in-process program
cache hits identified and discarded) confirmed this split:

| Variant | old (if/else) | new (1 call) | saving |
|---|---|---|---|
| Mandelbulb **Direct** | ~2650 | ~2650 | **~0** |
| Mandelbulb **PT** | 13474 / 14400 | 12556 / 11881 | **0.9–2.5s** |
| Great Stellated **Direct** | 3590 / 3602 | 3540 / 3552 | **~50ms (≈0)** |
| Great Stellated **PT** | 19963 / 19961 | 15351 / 15299 | **~4.6s** |

The PT saving scales hard with DE weight (the signature of removed `DE_Dist`
inlines); Direct is unaffected, exactly as the constant-fold analysis predicts.

## Decision

Collapse the PT normal estimation to a **single `GetNormal` call**; leave Direct
exactly as it was. Gate on `RENDER_MODE_PATHTRACING` (defined only for PT builds):

```glsl
#ifdef RENDER_MODE_PATHTRACING
    n = GetNormal(p_ray, highQuality ? eps : eps * 1.5);  // one tetra call, 4 taps
#else
    if (highQuality) n = GetNormal(p_ray, eps);           // Direct: unchanged
    else             n = GetFastNormal(p_ray, eps * 1.5);
#endif
```

The win requires **one call site** — replacing the `if/else` bodies with the same
function at two sites would still inline 8 taps. `GetNormal` (tetrahedron) is the
chosen survivor: it keeps PT bounce 0 byte-identical and upgrades indirect bounces
from forward-difference to the better, symmetric tetrahedron normal.

## Consequences

- **Cold PT compile drops ~0.9–2.5s (Mandelbulb) to ~4.6s (Great Stellated)** —
  the largest L5 win so far, on the PT *baseline* (every PT variant, all gates).
  See policy §2.2/§8 L5.
- **Direct is byte-identical** — the `#else` is the original `if/else`, and Direct's
  constant `highQuality` means fxc already produced one estimator there. No Direct
  compile, runtime, or visual change (the prior audit's forward-difference choice
  for Direct primary — `docs/BENCH_SHADER_HANDOFF.md` — stands untouched).
- **PT indirect-bounce normals change** from forward-difference to tetrahedron
  (higher quality, symmetric). PT primary (bounce 0) unchanged. Gate on
  `webglCompile` (passes) + a visual glance; quality only improves.
- **`GetFastNormal` stays** (still the Direct path's estimator) — not dead code.
- **Generalizes the L4 method:** dump the assembled shader, count `DE_Dist`
  (heavy-body) inlines, and collapse any that exist only because a *runtime*
  predicate keeps both branches of an `if/else` live. `@see` ADR-0074 for the
  shadow instance of the same pattern.
