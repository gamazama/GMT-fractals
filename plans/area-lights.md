# Area lights — feature plan

**Status:** scoped only; not started. Pick up in a focused session.
**Last updated:** 2026-05-02 (after S3 PT optimization session).

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
