# ADR-0074: Area-light PT shadows fold into a single shadow march

**Date:** 2026-06-19
**Status:** Accepted
**Scope:** `engine-gmt/shaders/chunks/pathtracer.ts` (`shadowLogic`), compile-time
backlog L5 in `docs/policy/shader-compile-optimization.md`

## Context

The PT `ptAreaLights` ("True Area Lights") compile gate was the biggest
un-localized cold-compile hog after session 2 closed the Env-MIS+IS path as
compile-tight: ~2027ms (session-1 machine) / ~1450–1677ms (session-3 machine).
Session 3 localized it by splitting `PT_AREA_LIGHTS` into measured sub-pieces
(bounce-side light-hit integration, NEE-side sphere sampling, env-NEE occlusion,
and the sphere **shadow override**) and measuring each cold per the §5 protocol.

**The sphere shadow override was >half the cost.** Measured in isolation it was
**+969ms** (Mandelbulb); a within-run A/B of the old vs new shadow structure put
the saving at **630ms** (Mandelbulb, light DE) and **1356ms** (Great Stellated
Dodecahedron, heavy DE). The saving scaling with DE weight is the signature of a
duplicated distance-estimator march.

The cause: for sphere (type-2) area lights the NEE site already sampled a point
on the sphere surface, with `lDir`/`distToLight` pointing at it, so the shadow ray
wants a **hard** result toward that exact sample (its penumbra comes from
accumulating different sphere-surface samples across frames, not from an analytic
march). The previous code expressed that as a **separate `GetHardShadow(...)`
call** wrapping the default soft/stochastic march:

```glsl
#ifdef PT_AREA_LIGHTS
if (uLightType[lightIdx] > 1.5) { shadow = GetHardShadow(shadowRo, lDir, distToLight); }
else
#endif
{ shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r); }
```

`GetSoftShadow` and `GetHardShadow` are *different* functions, each a full
256-step `DE_Dist` raymarch. fxc inlines both into the NEE loop → **two complete
fractal shadow marches translated + register-allocated** where one suffices. That
second march is the ~600–1356ms.

This fits the compile-time scope decision (policy §0): same feature set on, remove
genuinely redundant emitted GLSL inside the chunk; it is **not** a default/
load-order change and **not** a framework workaround.

## Decision

Fold the sphere case into the single shadow march already present, so exactly one
march is emitted per shadow-casting light regardless of light type:

- **Soft variant** (`useSoft` — the default, area-lights-checkbox-off path): drive
  the softness hard for spheres and reuse the existing `GetSoftShadow` call.
  `GetSoftShadow`'s robust penumbra is `res = min(res, k·h/t)`; at `k = 2000`
  (the UI max hardness) the penumbra only opens for `h < 5e-4·t`, i.e. the result
  is ~binary — a hard shadow toward the sphere sample. The real penumbra is still
  supplied by accumulating sphere-surface samples across frames.

  ```glsl
  float shK = uShadowSoftness;
  #ifdef PT_AREA_LIGHTS
  if (uLightType[lightIdx] > 1.5) shK = 2000.0;
  #endif
  shadow = GetSoftShadow(shadowRo, lDir, shK, distToLight, blueNoise.r);
  ```

- **Stochastic variant** (area-lights checkbox on): the march is already
  `GetHardShadow`; the sphere case just points it straight at the sphere sample
  (no re-jitter, which would defeat sphere sampling) instead of issuing a second
  `GetHardShadow` call.

With the override gone in the soft variant, `GetHardShadow` has no callers there
and fxc DCEs it — the duplicate march disappears entirely.

## Consequences

- **Cold PT compile with `ptAreaLights` on drops ~600ms (light DE) to ~1.4s
  (heavy DE).** Measured within-run A/B (noise-canceled, Sobol control clean):
  Mandelbulb −630ms (13055→12425ms total), Great Stellated Dodec. −1356ms
  (19044→17688ms total). See policy §2.3/§8 L5 for the table. `estCompileMs` for
  `ptAreaLights` recalibrated accordingly (L6).
- **Non-sphere lights are byte-identical** — `shK = uShadowSoftness`, same
  `GetSoftShadow` call as before. The vast majority of scenes (no sphere lights)
  are wholly unaffected; only the type-2 sphere branch changed.
- **Sphere-light shadows** change from a pure-binary `GetHardShadow` to a
  near-binary `GetSoftShadow(k=2000)`. Both march `DE_Dist` toward the same
  per-frame sphere sample and return ~binary occlusion that accumulates to the
  same soft penumbra; the soft form is marginally softer at the contact edge
  (arguably more physically correct for an area light). Gated on `webglCompile`
  (passes) + visual; a sphere-light visual confirmation is the remaining check.
- **Generalizes a pattern for L4:** prefer one parameterized march over a second
  inlined copy of a near-identical march. The win is the inlined `DE_Dist` body,
  not the function-level dedup (which fxc would no-op — §4.3).
