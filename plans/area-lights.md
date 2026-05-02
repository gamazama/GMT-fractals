# Area lights — feature plan

**Status:** ✅ Phases 1–4 shipped 2026-05-03. UX cleanup + latent-bug fixes shipped same day. Phase 4 unbias bench still to be built (spec preserved below).
**Last updated:** 2026-05-03 (after cleanup pass + UX iteration).

## Why

Today's lighting model is point lights + directional lights. Soft shadows
are achieved via the `uAreaLights` flag — a stochastic-shadow-jitter trick
that perturbs the shadow ray direction within a fixed cone. It looks like
a soft shadow but the underlying light is still a delta point: the
integrator can't apply MIS, can't catch BSDF-side direct hits, and
soft-shadow convergence requires many accumulation frames.

True area lights — lights with finite emission surface — unlock:

- **MIS (Veach 1995)** combining NEE and BSDF sampling. ~2-4× variance
  reduction → same visual quality at 64-128 frames vs current 256.
- **BSDF-side direct catches.** Glossy/mirror surfaces currently miss
  direct light entirely (NEE gives diffuse-flavored direct only). With
  area lights + MIS, BSDF bounces hitting the light surface contribute
  emission via the BSDF estimator — produces correct specular highlights
  on direct light reflections.
- **Power-weighted light selection** ([reverted Patch 3 in S3]) becomes
  viable. MIS smooths the dim-light variance issue that killed it.
- **Geometrically correct soft shadows.** Current cone-jitter has fixed
  width regardless of distance/occluder — physically wrong but visually
  acceptable. True area sampling matches solid-angle math.

## Scope (v1)

**In:**
- New light type: sphere area light (`uLightType[i] = 2.0`).
- NEE samples a point on the sphere surface (uniform area sampling).
- BSDF ray-sphere intersection test in `traceSceneLean` and primary trace.
- MIS power-heuristic combining NEE and BSDF estimators.
- UI: light-type dropdown (point / directional / sphere). Sphere lights
  reuse the existing `uLightRadius`/`uLightSoftness` slider.
- `uAreaLights` flag becomes the per-light type toggle for back-compat
  (existing scenes' soft shadows still work as point + jitter).

**Out (v1):**
- Rectangular / disc area lights — sphere only.
- Mesh lights.
- Spot lights with area falloff.
- Light-importance sampling (sample bright parts of an extended source
  more often). The light is uniformly emissive in v1.
- ReSTIR or other inter-pixel light reuse.
- Refactoring `LightSpheresFeature` into the main lighting feature —
  keep them separate, just wire up the new sampling code.

## Architecture

**Light type encoding** (`uLightType[i]`):
- 0.0 = point (delta)
- 1.0 = directional (delta)
- 2.0 = sphere area (NEW)

The shader paths fork on type for both NEE direction selection and
shadow-ray construction. Type 2 takes a different code path.

**NEE for sphere light:**

```glsl
// Sample point on sphere (uniform area sampling)
vec2 u = vec2(blueNoise.gb);  // 2 dims, decorrelate from existing usage
float z = 1.0 - 2.0 * u.x;
float r = sqrt(max(0.0, 1.0 - z*z));
float phi = TAU * u.y;
vec3 localPt = vec3(r * cos(phi), r * sin(phi), z);
vec3 surfacePt = uLightPos[lightIdx] + uLightRadius[lightIdx] * localPt;

// Direction to that point
vec3 lVec = surfacePt - p_ray;
float dist = length(lVec);
vec3 lDir = lVec / max(1.0e-5, dist);

// Solid-angle PDF: uniform on sphere area = 1 / (4πr²)
// Convert to per-direction PDF = (4πr²)⁻¹ × (dist² / |cos(θ_light)|)
// where θ_light is angle between lDir and outward normal at sphere surface
vec3 sphereOutNormal = localPt;  // unit vector (sphere center to surface)
float cosThetaLight = abs(dot(-lDir, sphereOutNormal));
float pdfArea = 1.0 / (4.0 * PI * radius * radius);
float pdfDir = pdfArea * dist * dist / max(1.0e-5, cosThetaLight);
```

**BSDF-vs-light intersection** (in `traceSceneLean` / `traceScene`):

```glsl
// Before each scene DE step, test ray against any sphere lights it could hit.
// Closer of (sphere hit, scene hit) wins. If sphere hit closer, return
// sphere-hit info instead of scene hit.
for (int li = 0; li < uLightCount; li++) {
    if (uLightType[li] < 1.5 || uLightType[li] > 2.5) continue;  // sphere only
    vec3 oc = ro - uLightPos[li];
    float b = dot(rd, oc);
    float c = dot(oc, oc) - uLightRadius[li] * uLightRadius[li];
    float disc = b*b - c;
    if (disc <= 0.0) continue;
    float t_hit = -b - sqrt(disc);
    if (t_hit > 0.0 && t_hit < d_scene) { /* sphere hit closer */ }
}
```

This adds N tests per ray (N = light count). Expensive if done per march
step; cheaper if done once per ray segment. For PT bounces, do it ONCE
before the trace and use min(t_sphere, t_scene_hit) at the end.

**MIS weights** (Veach power-heuristic, β=2):

```glsl
// At NEE site:
float pdf_bsdf = (probSpec * ggxPDF(n, viewDir, lDir, roughness)
               + (1 - probSpec) * cosineWeightedPDF(n, lDir));
float w_nee = (pdfDir*pdfDir) / (pdfDir*pdfDir + pdf_bsdf*pdf_bsdf);
radiance += w_nee * directContrib;

// At BSDF site, when bounce ray hits a sphere light:
float pdf_light = computeLightDirPDF(...);  // see NEE math above
float w_bsdf = (pdf_bsdf*pdf_bsdf) / (pdf_bsdf*pdf_bsdf + pdf_light*pdf_light);
radiance += w_bsdf * sphereLightEmission * throughput;
```

For point/directional lights (type 0/1), MIS collapses: pdf_light is a
delta, w_nee = 1, w_bsdf = 0. Code path is naturally guarded by light type.

## Implementation phases

Each phase is independently shippable and bench-verifiable.

**Phase 1 — Light-type plumbing.** Add `uLightType = 2.0` to the type
enum. Add a `LightType` dropdown UI. Sphere lights still behave like
points in NEE (sample center, not surface) — visual no-op. Just lays the
plumbing down. Bench-neutral. Validates that the type system extends
cleanly.

**Phase 2 — NEE samples sphere surface.** Implement the sphere-surface
sampling for type-2 lights. Compute `pdfDir` from solid angle. Replace
`pdf = activeCount` compensation with `pdf = 1/pdfDir` for type-2 picks
(point lights still use the old form). This produces real soft shadows
without `uAreaLights` jitter — should match the jitter form visually but
with correct physics. Bench: variance vs jitter form on a reference scene.

**Phase 3 — BSDF intersect against sphere lights.** Add the per-ray
sphere-test loop in `traceSceneLean` and primary trace. When bounce ray
hits a sphere light, return as a "light hit" event. Add the emission to
radiance via the BSDF estimator. Bench: now BSDF rays catch direct light
on glossy/mirror surfaces — visible specular highlights from the light.

**Phase 4 — MIS weights.** Combine NEE and BSDF estimators with power
heuristic. Both pdfDir (already computed in NEE) and the BSDF pdf at the
NEE direction (need to compute) are required. Bench: variance reduction
on reference scenes (glossy/mirror with area lights).

**Phase 5 — Re-attempt power-weighted light selection (Patch 3 from S3).**
With MIS smoothing the dim-light variance issue, intensity-CDF light
selection should now converge cleanly. Test on the standard 3-light
Mandelbulb scene.

## Open questions

These need to be decided in the planning session before coding:

1. **Visible spheres and area lights — same data?** `LightSpheresFeature`
   already has `uLightRadius`, `uLightSoftness`. If a light's type is set
   to "sphere area," does the existing visible-sphere render automatically
   show that light? Probably yes — same radius. But softness becomes
   meaningless (true area light has its own physically-correct edge
   softness). Decide: hide the softness slider for sphere lights, or
   reinterpret it as something else.

2. **Per-light type selection vs global flag.** Currently `uAreaLights` is
   a global compile-toggle. With per-light types we have N lights × 3
   types — does each light get its own dropdown? Probably yes; `uAreaLights`
   becomes deprecated (or kept as a per-light "soft shadows on point
   light" affordance). Migration story: if a scene has `uAreaLights = on`,
   convert all point lights to sphere lights with radius equal to the
   visible-sphere radius?

3. **BSDF intersection cost.** N lights × per-ray test = O(N) per bounce
   ray. For 3 lights this is trivial. For users with 8+ lights, could
   become significant. Default GMT scenes are 3 lights — fine for v1.

4. **MIS PDF computation cost.** Computing the BSDF PDF at the NEE
   direction adds overhead per NEE sample. Cycles bench numbers suggest
   the variance reduction more than pays for it. Verify on this stack.

5. **Backwards compat for saved scenes.** Existing GMF files have
   `uLightType` 0 or 1 only. Loading should just work — type 2 only
   appears for new scenes / explicit user opt-in. No migration needed.

6. **Directional area lights** (sun-disc) — type 3? Out of scope for v1
   but worth keeping the type enum extensible. The MIS framework
   generalizes naturally.

## References (existing code)

- [`engine-gmt/features/lighting/index.ts`](../engine-gmt/features/lighting/index.ts)
  — main lighting feature. `uLightType` enum, NEE via shadow march.
- [`engine-gmt/features/lighting/light_spheres.ts`](../engine-gmt/features/lighting/light_spheres.ts)
  — visualization sphere render. Has `intersectLightSphere`. Reusable
  for the BSDF-intersection logic in Phase 3.
- [`engine-gmt/shaders/chunks/lighting/shared.ts`](../engine-gmt/shaders/chunks/lighting/shared.ts)
  — `LIGHT_SPHERE_INTERSECTION_GLSL` etc. The intersect math is already
  here; just needs hooking into the trace path.
- [`engine-gmt/shaders/chunks/pathtracer.ts`](../engine-gmt/shaders/chunks/pathtracer.ts)
  — PT loop. NEE block lines 159-246. Bounce direction lines 272-303.
  MIS additions go in both.
- [`docs/BENCH_SHADER_HANDOFF.md`](../docs/BENCH_SHADER_HANDOFF.md) §
  "Patch 3" — the failed power-weighted lights attempt and why MIS
  unblocks it.

## Estimated effort

- Phase 1 (plumbing): 1-2 hours.
- Phase 2 (sphere NEE): 4-6 hours.
- Phase 3 (BSDF intersect): 4-8 hours. Care with trace-loop integration.
- Phase 4 (MIS): 4-8 hours. The PDF math is fiddly; bench-verify each
  step.
- Phase 5 (revisit Patch 3): 1-2 hours given the code is in S3 history.

Total: ~2-3 focused sessions for v1. Bench-verify after each phase per
the BENCH_SHADER_HANDOFF procedure.

## Success criteria

- A 3-light Mandelbulb scene with sphere area lights + MIS converges to
  visually clean soft shadows + correct specular highlights at ≤ 128
  accumulation frames (vs current 256+ for clean shadows alone).
- Per-frame GPU within 10% of current point-light + jitter performance.
- Pixel-accurate against an "all NEE off / BSDF only at infinite samples"
  reference (verifies MIS is unbiased).
- Existing scenes (point + directional only) bit-identical to current
  output (verifies no regression on the common path).

---

# Implementation log & resume notes (added 2026-05-02)

This section captures decisions and skeletons worked out in the design
session before code began, so a future session can resume cleanly without
recovering context. The original plan above still stands; this section
narrows the open questions and pre-bakes the Phase 2-4 code.

## Phases 1-4 — DONE (2026-05-02)

All four phases shipped in one session. Default-shader output unchanged
(everything gated behind `ptAreaLights` checkbox + `PT_AREA_LIGHTS`
define). Bench gate (Phase 4 unbias spec) remains to be built when the
user wants to validate MIS bias-freeness on real scenes.

## Cleanup pass + UX iteration — DONE (2026-05-03)

After visual confirmation that the integration was working, two UX bug
reports prompted a follow-up session:

- **Visible-emitter render** wasn't appearing for Sphere lights:
  `intersectLightSphere` filter `uLightType[i] > 0.5` was excluding both
  Directional (1) AND Sphere (2). Narrowed.
- **Shadow path for Sphere lights** was wrong in two ways: the soft-shadow
  branch's `GetSoftShadow` added penumbra ON TOP of sphere-surface
  sampling (double-soften), and the stochastic-jitter branch's
  `if (!isDirectional)` block overwrote our sphere-sampled `lDir` with
  `uLightPos[lightIdx] + jitterOffset` (defeating sphere sampling).
  Fixed by wrapping the existing shadow logic in a runtime branch:
  `if (uLightType > 1.5) shadow = GetHardShadow(shadowRo, lDir, distToLight); else <existing>`.
  Gated by `PT_AREA_LIGHTS` so default builds still emit only one shadow
  path (preserves S3 ANGLE fix).
- **`hideEmitter` field** added to `LightParams`. Visible Sphere toggle
  now type-aware: Sphere lights flip `hideEmitter` (radius unchanged);
  Point lights keep legacy `radius==0 = invisible`. New uniform
  `uLightHideEmitter` (Float32Array, MAX_LIGHTS).
- **Latent bugs surfaced when reviewing Direct mode:** `pbr.ts:48` and
  `volumetric_scatter.ts:48` had the same `> 0.5` over-broad type check.
  In Direct mode, Sphere lights were treated as Directional — no
  position, ignoring `uLightPos`. Both narrowed.
- **UI clarification:** `ptStochasticShadows` checkbox renamed
  "Area Lights" → "Soft Shadow Jitter"; ShadowControls header button
  "Area" → "Jitter". Added per-light amber warning banner that appears
  when a Sphere light's preconditions for area integration aren't met
  (renderMode != PathTracing OR !ptAreaLights). Hardness slider
  description gains a note about Sphere lights.

**Cleanup pass (multi-agent code review):**
- Extracted `misPower2(pdfA, pdfB)` helper — both MIS sites now call it
  instead of inlining `pl² / max(1e-20, pl² + pb²)`.
- Reused existing `intersectSphere` from `math.ts:281` inside
  `intersectAreaLight` — loop body shrank from ~12 lines of math to 4.
- Extracted JSX IIFE in `LightControls.tsx` (60-line emitter section)
  into a named `renderEmitterSection()` helper above the return.
- Removed phase-narration comments and the "trap that killed Patch 3"
  task reference per the project's comment style rules.

Skipped (judged not worth the churn):
- GLSL `LIGHT_TYPE_*` constants — codebase convention is float-range
  comparisons everywhere.
- Per-light loop preamble macro — too short for the abstraction overhead.
- GGX `D_nee`/`G1V_nee` hoist for sharing with `pdfVNDF` — efficiency
  agent recommended skip unless profiling shows >1% win.

Files touched in Phases 2-4 (all in
`engine-gmt/shaders/chunks/pathtracer.ts`):
- Phase 2: `intersectAreaLight`, `pdfSphereLightDir` helpers; NEE block
  splits on `isSphere` and uses sphere-surface sampling + per-direction
  PDF compensation.
- Phase 3: `tracePTBounce` wrapper (passthrough when gate off);
  `n_prev`/`viewDir_prev`/`roughness_prev`/`probSpec_prev`/`lightHit`
  declared at function scope; `activeCount`/`activeIndices` hoisted out
  of the bounce loop (loop-invariant); `probSpec` calc hoisted above
  NEE. Bounce + env-NEE call sites swap to `tracePTBounce`.
  Light-emission branch added to the `!hit` handler at loop top.
- Phase 4: `pdfVNDF` + `pdfBSDF` mixture-density helpers; MIS
  power-heuristic at NEE site (`w_nee`) and BSDF site (`w_bsdf`,
  replacing Phase 3's literal `1.0`).

`npm run typecheck` and `npm run build` clean after every phase. Shader
dump (`npm run shader:dump --pt --all-features`) confirms gated paths
emit correctly under `PT_AREA_LIGHTS`, and the default-PT shader retains
all helpers behind `#ifdef` so the GPU driver strips them at compile.

## Phase 1 reference (initial plumbing)

8 files, behaviorally inert. Sphere lights behave as points at center
until `ptAreaLights` is enabled.

| File | Change |
|------|--------|
| `engine-gmt/types/graphics.ts:30` | `LightType` += `'Sphere'` |
| `types/graphics.ts:30` | Same widening — duplicate-state copy is load-bearing for app-gmt boot path. **Both copies must move in lockstep on every type-level change.** |
| `engine-gmt/engine/managers/UniformManager.ts:287-289` | `typeArr[i]` writes `2.0` for Sphere |
| `engine-gmt/features/lighting/utils/lightMenuUtils.ts:33-38` | Menu radio "Sphere (Area)"; bumps zero radius to 0.5 default on selection |
| `engine-gmt/features/lighting/index.ts` | New `ptAreaLights` boolean param + state field; emits `PT_AREA_LIGHTS` define when on. Default off, compile-gated, ~600ms estCompileMs |
| `engine-gmt/features/lighting/components/LightControls.tsx:185, 276` | Two `=== 'Point'` → `!== 'Directional'` (camera-fixed flow + keyframe button) |
| `engine-gmt/components/panels/lighting/LightPanelControls.tsx:113, 262, 328` | Three `=== 'Point'` → `!== 'Directional'` (camera-fixed + position editor + range/falloff) |

`npm run typecheck` clean. `npm run build` clean (8.36s).

## Resolved open questions

### Q1 (Visible spheres + area lights — same data?) — YES

Sphere area lights reuse the existing `radius` field that already drives
`LightSpheresFeature` visualization. The `softness` slider becomes
inert/hidden when `type=Sphere` (true area lights have physically-correct
edge softness from solid-angle math). One field, one value.

### Q2 (`uAreaLights` migration) — DON'T MIGRATE

Keep `uAreaLights` permanently as the global "soft point shadows via
jitter" toggle. Don't auto-promote existing `uAreaLights=true` scenes to
type-2 sphere lights. Three reasons:

1. The jitter-cone form is artistically calibrated to a fixed cone width;
   physical sphere sampling at the same radius produces a different look.
2. Existing scenes' `radius` was set for the *visible sphere*, not as
   physical light extent. Reading it as physical light size invents data
   the artist never authored.
3. `radius: 0` scenes would become degenerate sphere lights.

User opts in via the per-light type dropdown (Phase 1) + the global
`ptAreaLights` compile gate (Phase 1). No migration code anywhere.

### Q3 (BSDF intersection cost) — wrap, don't widen the trace

Keep `traceSceneLean` signature unchanged. Phase 3 adds a thin wrapper
`tracePTBounce` in `pathtracer.ts` that does sphere-light intersection
*before* the trace and resolves which is closer. Five `traceScene*`
callers in the codebase; only the two PT-side callers swap to the
wrapper. `getTraceGLSL`, Physics variant, Histogram variant, primary
trace, atmosphere, volumetric — all untouched.

Wrapper sketch under "Phase 2-4 helpers" below.

### Q4 (MIS PDF cost) — cheap, math is one line

`pdfVNDF` shares `D` and `G1V` with the existing NEE block (already
computed at `pathtracer.ts:265-266`). The PDF is `G1V * D / (4 * NdotV)`
— literally one extra line in scope. The mixture-PDF (`probSpec * pSpec
+ (1-probSpec) * pDiff`) is the gotcha — must match the bounce-direction
sampler at `pathtracer.ts:340-357` exactly. See helper code below.

### Q5 (Backwards compat for saved scenes) — works as-is

Existing GMF/JSON files have `type: 'Point' | 'Directional'`. Both still
satisfy the widened union. `'Sphere'` only appears for explicit user
opt-in. Confirmed by typecheck.

### Q6 (Directional area lights / sun-disc) — out of scope, type 3 reserved

Type enum is extensible. Plan unchanged.

## Phase 2-4 helper code (historical sketches)

> ⚠️ **These are the original design sketches.** Shipped code in
> `engine-gmt/shaders/chunks/pathtracer.ts` differs in details (e.g.
> shipped `intersectAreaLight` reuses `intersectSphere` from `math.ts`,
> shipped MIS sites call `misPower2()` helper added in cleanup). For
> current code, search the file for the helper names. Sketches retained
> as design rationale.

All of these live in `engine-gmt/shaders/chunks/pathtracer.ts`, above
`calculatePathTracedColor`. Wrap NEE-side and intersection helpers in
`#ifdef PT_AREA_LIGHTS`. PDF helpers are unconditional (cheap, called
only by MIS code which is itself gated).

### Sphere-light intersection (Phase 2/3)

```glsl
#ifdef PT_AREA_LIGHTS
// Tests ray against type-2 sphere lights only. Returns t_hit (-1 if no hit),
// writes lightIdx to outIdx. Distinct from intersectLightSphere() in shared.ts:
// that one is for visible emitter rendering (chord-thickness, halo softness,
// type-0 gating). This one is geometric integration — ray-sphere only.
float intersectAreaLight(vec3 ro, vec3 rd, float tMax, out int outIdx) {
    float tBest = tMax;
    outIdx = -1;
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        if (uLightType[i] < 1.5 || uLightType[i] > 2.5) continue;
        if (uLightIntensity[i] < 0.01) continue;
        if (uLightRadius[i] < 0.001) continue;

        vec3 oc = ro - uLightPos[i];
        float b = dot(rd, oc);
        float r = uLightRadius[i];
        float c = dot(oc, oc) - r * r;
        float disc = b * b - c;
        if (disc <= 0.0) continue;

        float sq = sqrt(disc);
        float t = -b - sq;
        if (t < 1.0e-4) t = -b + sq;
        if (t < 1.0e-4) continue;
        if (t < tBest) { tBest = t; outIdx = i; }
    }
    return outIdx >= 0 ? tBest : -1.0;
}
#endif
```

### PT bounce-trace wrapper (Phase 3)

```glsl
// Bounce-ray trace that also tests sphere area lights. Reuses traceSceneLean
// untouched. Returns:
//   true                   → fractal hit (use d, result for shading)
//   false, lightHit >= 0   → sphere light hit at distance d
//   false, lightHit  < 0   → ray escaped to env (caller uses sampleMiss)
bool tracePTBounce(
    vec3 ro, vec3 rd,
    out float d, out vec4 result, inout vec3 glow,
    float seed, inout float volumetric, out vec3 fogScatter,
    out int lightHit
) {
#ifdef PT_AREA_LIGHTS
    int   tmpIdx;
    float tLight = intersectAreaLight(ro, rd, MAX_DIST, tmpIdx);
    bool hit = traceSceneLean(ro, rd, d, result, glow, seed, volumetric, fogScatter);

    if (tmpIdx >= 0 && (!hit || tLight < d)) {
        d = tLight;
        lightHit = tmpIdx;
        return false;
    }
    lightHit = -1;
    return hit;
#else
    lightHit = -1;
    return traceSceneLean(ro, rd, d, result, glow, seed, volumetric, fogScatter);
#endif
}
```

Call sites to swap (verified via grep 2026-05-02):
- `pathtracer.ts:364` — bounce trace (use `lightHit` for Phase 4 BSDF estimator)
- `pathtracer.ts:306` — env-NEE (env contribution gated on `!envHit && _envLightHit < 0`)

### VNDF & mixture BSDF PDF (Phase 4)

```glsl
// Heitz 2018 §3 eq. 17, post-Jacobian: pdf_VNDF(L) = G1(V) * D / (4 * NdotV).
// Self-consistency: f(L)*NdotL/pdf_VNDF(L) = F * G2/G1(V) = F * G1(L), matches
// the throughput weight at pathtracer.ts:350. Verified bias-free.
float pdfVNDF(vec3 n, vec3 v, vec3 l, float roughness) {
    vec3 h = v + l;
    float lensq = dot(h, h);
    if (lensq < 1.0e-10) return 0.0;
    h *= inversesqrt(lensq);

    float NdotV = max(0.001, dot(n, v));
    float NdotH = max(0.0, dot(n, h));
    if (NdotH <= 0.0) return 0.0;

    float a  = roughness * roughness;
    float a2 = a * a;
    float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
    float D     = a2 / (PI * denom * denom + GGX_EPSILON);

    float kG  = a * 0.5;
    float G1V = NdotV / (NdotV * (1.0 - kG) + kG);

    return G1V * D / (4.0 * NdotV);
}

// MUST match bounce-direction sampler's mixture (pathtracer.ts:340-357).
// If probSpec calculation changes there, update here in lockstep.
float pdfBSDF(vec3 n, vec3 v, vec3 l, float roughness, float probSpec) {
    float NdotL = max(0.0, dot(n, l));
    float pSpec = pdfVNDF(n, v, l, roughness);
    float pDiff = NdotL / PI;
    return probSpec * pSpec + (1.0 - probSpec) * pDiff;
}
```

### Sphere-light direction PDF (Phase 2 NEE, Phase 4 MIS)

```glsl
#ifdef PT_AREA_LIGHTS
// Solid-angle PDF for uniform-area sampling on a sphere light.
// activeCount factor accounts for uniform light selection — when one of N
// lights is picked at random, MIS sees pdf_omega/N for this light. The
// activeCount param is the same trap that killed Patch 3; explicit arg
// forces the caller to think about it.
float pdfSphereLightDir(vec3 lDir, vec3 sphereOutNormal, float dist,
                        float radius, int activeCount) {
    float cosThetaLight = max(1.0e-5, abs(dot(-lDir, sphereOutNormal)));
    float pdfArea = 1.0 / (4.0 * PI * radius * radius);
    float pdfDir  = pdfArea * dist * dist / cosThetaLight;
    return pdfDir / float(max(1, activeCount));
}
#endif
```

## Phase 4 MIS edits (sketch)

At NEE site (after computing directContrib for type-2 light):

```glsl
#ifdef PT_AREA_LIGHTS
if (uLightType[lightIdx] > 1.5) {
    float pdf_light = pdfSphereLightDir(lDir, sphereOutNormal, distToLight,
                                        uLightRadius[lightIdx], activeCount);
    // probSpec must be hoisted above NEE — currently computed at line 333.
    // Trivial reorder; non-area lights skip this block so no impact on
    // existing point/directional path.
    float pdf_bsdf  = pdfBSDF(n, viewDir, lDir, roughness, probSpec);
    float w_nee = (pdf_light * pdf_light) /
                  (pdf_light * pdf_light + pdf_bsdf * pdf_bsdf);
    radiance += w_nee * directContrib * throughput;
} else
#endif
{
    radiance += directContrib * throughput;  // delta-light path, w_nee = 1
}
```

At BSDF site (after `tracePTBounce`, when `lightHit >= 0`):

```glsl
#ifdef PT_AREA_LIGHTS
if (lightHit >= 0) {
    vec3 lightPt = currentRo + currentRd * d;
    vec3 lightN  = normalize(lightPt - uLightPos[lightHit]);
    float pdf_light = pdfSphereLightDir(currentRd, lightN, d,
                                        uLightRadius[lightHit], activeCount);
    // _prev: values from PREVIOUS bounce that sampled currentRd. Phase 3 must
    // capture n, viewDir, roughness, probSpec before they're overwritten.
    float pdf_bsdf  = pdfBSDF(n_prev, viewDir_prev, currentRd, roughness_prev, probSpec_prev);
    float w_bsdf = (pdf_bsdf * pdf_bsdf) /
                   (pdf_bsdf * pdf_bsdf + pdf_light * pdf_light);
    vec3 emission = uLightColor[lightHit] * uLightIntensity[lightHit];
    radiance += w_bsdf * emission * throughput;
}
#endif
```

## Phase 4 unbias bench spec

Build `debug/bench-area-lights-unbias.mts` (follows `bench-shader.mts`
pattern). Scene file `debug/bench-scenes/area-lights-unbias.json`:

- Formula: Mandelbulb (default DE)
- Camera: standard 3/4 view
- 3 lights, all `type: 'Sphere'`, `castShadow: true`:
  - L0: pos (-2, 1, 2), #fff4e6, intensity 1.5, radius 0.4 (key)
  - L1: pos (2, -1, 1), #FFD6AA, intensity 0.5, radius 0.3 (fill)
  - L2: pos (0, -5, 2), #E0EEFF, intensity 0.25, radius 0.2 (rim)
- Material: roughness 0.15
- `ptBounces=3`, `ptAreaLights=true`, `ptStochasticShadows=false`
- Accumulation: 16384 frames

Procedure (requires Phase 4 to add a `PT_NEE_DISABLE` compile gate):
1. Run A: NEE disabled, BSDF only, 16384 frames → `ref.png`
2. Run B: full MIS, 16384 frames → `mis.png`
3. Run C: NEE only (current path with `ptAreaLights=false`), 16384 frames → `nee_only.png`
4. Diff via `debug/helpers/image-diff.mts`:
   - **Bias gate:** mean per-channel error A vs B < 1.5%
   - **Variance gate:** A vs B < A vs C (MIS beats NEE-only)

Expected failure modes:
- Uniform brightness offset on glossy surfaces → mixture-PDF bug
- Bias near direct specular highlights → VNDF Jacobian wrong
- Bias scales with light count → forgot `activeCount` factor

## Phase ordering / shippability

Each phase is an independent PR:
- **Phase 1 — DONE.** Plumbing, inert.
- **Phase 2 PR:** intersect helper + `pdfSphereLightDir` + replace NEE branch for type-2 lights. ~50 LOC, pathtracer.ts only. Real soft shadows, no MIS yet.
- **Phase 3 PR:** `tracePTBounce` wrapper + 2 call-site swaps + capture-prev-state for Phase 4. ~30 LOC. Glossy/mirror surfaces get direct-light BSDF hits.
- **Phase 4 PR:** `pdfVNDF` + `pdfBSDF` + MIS edits at both estimator sites. ~40 LOC. Unbias bench gate from spec above.
- **Phase 5 PR:** revisit Patch 3 (power-weighted light selection from S3 history).

## Things to remember in future sessions

- **Duplicate-state gotcha confirmed.** Any change to `LightType`,
  `LightParams`, `FalloffType`, `IntensityUnit` must touch BOTH
  `dev/types/graphics.ts` AND `dev/engine-gmt/types/graphics.ts`. Phase 1
  found this the hard way via typecheck.
- **`uAreaLights` keeps living** — it is NOT being removed. It is a
  separate, cheaper "soft point shadows" path. The new system is opt-in
  via per-light type=Sphere + global `ptAreaLights` compile gate.
- **Bench harness lives at `dev/`** (`npm run bench:shader`), not stable.
  dev/ has typecheck + build + smoke:* + bench:shader. Stable's
  `test:baseline` / `test:hybrid` / `test:interlace` do not exist here.
- **Per-light data already wired:** `radius`, `softness`, `falloff`,
  `position`, `intensity`, `color` — all flow through UniformManager and
  are visible in shaders today. Phase 2-4 don't add new uniforms.

