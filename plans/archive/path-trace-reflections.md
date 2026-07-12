# Path-traced reflection quality — feature plan

**Status:** ✅ Phases 1–3 shipped 2026-05-05. Visual verification pending (user does this — memory `feedback_visual_smokes`).
**Last updated:** 2026-05-05.

## Shipped deviations from plan

- **Feature lives in `LightingFeature`, not a new `PathTraceReflectionsFeature`.**
  Mirrors the area-lights precedent — all PT compile gates (`ptAreaLights`,
  `ptNEEAllLights`, etc.) sit alongside `ptEnabled` in the same feature, so
  the new `ptReflMode` / `ptSobolBounce` go there too rather than fragmenting
  PT controls across two feature definitions.
- **Constants are float values, not strings.** `ptReflMode` is `type: 'float'`
  with `options:` (codebase convention; no `'string'` ParamType).
  `0.0 = Off / 1.0 = Env MIS / 2.0 = Env MIS + IS`.
- **Env CDF is rebuilt on every env load**, not lazily. ~10ms once-per-load
  cost vs. branchier code paths — cheap insurance for users toggling the gate
  without re-uploading the env.
- **Env CDF uniforms live in `LightingFeature.extraUniforms`** alongside
  `uLightCount` etc. The CPU builder lives at
  `engine-gmt/features/reflections/env_cdf.ts` (new file).
- **`ptEnvNEE` legacy migration is one-shot at first load**, not on every
  inject. Old scenes lacking `ptReflMode` and having `ptEnvNEE = true`
  auto-promote to Env MIS once. Setting `ptReflMode` explicitly (even to Off)
  pins the new value — no flip-flopping with the orphan field.

## Why

User report: in PT mode, env-map reflections on shiny surfaces remain
visibly noisy after 4000 samples. The dev fork already shipped VNDF
sampling (Heitz 2018) and roughness regularization (Cycles "Filter
Glossy"), so the grazing-angle fireflies from half-vector IS are gone.
Remaining variance lives in three places, all in the env-reflection path:

1. **No specular env NEE.** `PT_ENV_NEE` cosine-samples the hemisphere
   and contributes Lambertian only — diffuse-flavored direct env. Glossy
   and mirror surfaces get zero direct env contribution; they rely on
   the bounce ray "accidentally" pointing at a bright sky pixel. With a
   sun-disc HDR, that's a lottery the BSDF samples can't win in 4000
   tries.
2. **No env-map importance sampling.** `GetEnvMap` is a plain texture
   fetch with mip-bias-by-roughness. Bright concentrated features (sun
   disc, lamp) are hit only when the GGX lobe direction happens to
   align — same lottery, different cause.
3. **Blue-noise GGX lobe seed is not stratified.** `dirSeed = blueNoise.gb`
   is great for spatial dither but suboptimal for tight 2D lobes. A low-
   discrepancy 2D sequence (Sobol) with per-pixel rotation converges
   measurably faster on shiny surfaces.

Goal: bring 4000-sample noise down to ~256–512 sample equivalent on
sun-disc HDR scenes, and ~512–1024 on broad-sky scenes.

## Scope (v1)

**In:**
- One new compile-gated DDFS feature: `PathTraceReflectionsFeature`.
- Three-mode dropdown: `Off` / `Env MIS` / `Env MIS + IS`.
- Orthogonal `sobolBounce` boolean (LDS for GGX lobe only).
- Retire `ptEnvNEE` boolean; load-only shim maps `true → 'Env MIS'`.
- CPU env-map CDF builder (~10 ms on env load), uploaded as marginal
  (1D) + conditional (2D) tables. Defaults are 1×1 stubs when off.

**Out:**
- ReSTIR or other inter-pixel light reuse.
- Multi-bounce env IS (only the BSDF-side env hit at !hit gets MIS;
  intermediate bounces still use BSDF sampling alone).
- Owen-scrambled Sobol (Cranley-Patterson rotation only — simpler,
  lower compile cost, ~80% of the win).
- Env CDF on procedural sky (`uEnvSource < 0.5 && uUseEnvMap < 0.5`).
  Procedural sky is uniform enough that uniform-sphere MIS already
  converges fast; CDF only matters for HDR textures with concentrated
  features.
- Env CDF rebuild on env rotation. Rotation is a 2×2 matrix applied
  to `dir` at sample time — the CDF stays valid in pre-rotation space;
  we sample, then apply `uEnvRotationMatrix⁻¹` to the sample direction.

## Architecture

### File layout

```
engine-gmt/features/reflections/
├── index.ts              EXISTING — direct-mode env / raymarched
├── shader.ts             EXISTING — traceReflectionRay
├── pt_quality.ts         NEW — DDFS def + GLSL injection
└── env_cdf.ts            NEW — CPU CDF builder
```

`pt_quality.ts` is a separate feature from `ReflectionsFeature` because
the existing one is direct-mode-only. They share the `reflections/`
folder for discoverability but have no runtime overlap.

### Compile gates emitted

```
PT_ENV_MIS              mode == 'Env MIS' || 'Env MIS + IS'
PT_ENV_MIS_IS           mode == 'Env MIS + IS'
PT_SOBOL_BOUNCE         sobolBounce == true
```

`PT_ENV_NEE` removed (codepath replaced by `PT_ENV_MIS` block).

### State migration

`LightingState.ptEnvNEE` field stays in the type for back-compat reads
but is no longer in the params list. A one-time shim in the scene loader:

```ts
if ('ptEnvNEE' in state && state.ptEnvNEE === true) {
    state.ptReflMode = 'Env MIS';
}
delete state.ptEnvNEE;
```

GMF/JSON files written before this change continue to load with the
expected behavior.

### Uniforms added

| Name | Type | Default | Notes |
|---|---|---|---|
| `uEnvCDFMarginal` | sampler2D (1×N R32F) | 1×1 stub | Marginal CDF over rows |
| `uEnvCDFConditional` | sampler2D (W×H R32F) | 1×1 stub | Conditional CDF per row |
| `uEnvCDFSize` | vec2 | (1, 1) | (W, H) of the CDF — also signals "stub" when (1,1) |
| `uEnvLumIntegral` | float | 1.0 | ∫L sin(θ) dθ dφ over the env. Normalizer for pdf_env. |

CDF resolution: 256×128 (W×H). Anything finer is overkill given the
envmap mip is already pre-blurred; anything coarser misses sun discs.

## Phases

### Phase 1 — Sobol(2) + Cranley-Patterson rotation

Smallest change, no scene-data dependency. Validates the bench harness.

- New GLSL helpers in `pathtracer.ts` (gated by `PT_SOBOL_BOUNCE`):
  - `sobol2(uint i) → vec2` — Sobol(2) with the standard direction
    matrices for d=0,1.
  - `cpHash(vec2 fragCoord) → vec2` — one wang-hash per axis, mapped
    to [0,1).
  - `sobol2CP(uint i, vec2 fragCoord) → vec2` —
    `fract(sobol2(i) + cpHash(fragCoord))`.
- Replace `vec2 dirSeed = blueNoise.gb` with:
  ```glsl
  #ifdef PT_SOBOL_BOUNCE
      uint sIdx = uint(uAccumCount) * 8u + uint(bounce);
      vec2 dirSeed = sobol2CP(sIdx, gl_FragCoord.xy);
  #else
      vec2 dirSeed = blueNoise.gb;
  #endif
  ```
- All other blue-noise uses (shadow jitter `.gb` in stochastic shadow
  block, RR `.r`, light pick `.r`, env-NEE `.rg`+offset) untouched.
  Blue noise is good for spatial-distributed dither; LDS wins for tight
  lobes only.
- `uAccumCount` is already a uniform (used for accumulation blend
  weight). Bounce index folded into `sIdx` via `*8u + bounce` —
  uPTBounces ≤ 8, no overlap.

Estimated compile cost: ~50 ms (small helper, one #ifdef branch).

### Phase 2 — Env MIS (uniform sphere PDF)

Specular env NEE that pairs with BSDF-side env hits via balance
heuristic. No CDF yet — `pdf_env = 1/(4π)` constant.

- New GLSL helpers (gated by `PT_ENV_MIS`):
  - `pdfEnvUniform() → float` — returns `1.0 / (4.0 * PI)`.
  - `sampleEnvUniform(seed) → vec3` — uniform sphere sample (Marsaglia).
- Replace the `PT_ENV_NEE` block (lines 574-598 of pathtracer.ts) with
  a `PT_ENV_MIS` block that does both diffuse-cosine AND specular-VNDF
  env samples, each MIS-weighted against `pdf_env`.
- BSDF-side env hit at the next-iter `!hit` branch: when no light hit
  intercepted (`lightHit < 0`), compute
  `pdf_bsdf = pdfBSDF(n_prev, viewDir_prev, currentRd, roughness_prev, probSpec_prev)`
  and `w_bsdf = misPower2(pdf_bsdf, pdf_env)`. Multiply env contribution
  by `w_bsdf`. Bounce 0 keeps `skyIntensity = uEnvBackgroundStrength`
  unchanged for primary-ray sky look.
- Hoist `n_prev` / `viewDir_prev` / `roughness_prev` / `probSpec_prev`
  capture so it's done unconditionally — already in place for area
  lights, so this is free.

Estimated compile cost: ~250 ms.

### Phase 3 — Env CDF + IS

CPU CDF builder + GPU sampling/PDF. Layers on top of Phase 2.

#### CPU side — `env_cdf.ts`

```ts
export interface EnvCDFTextures {
    marginal: THREE.DataTexture;     // 1 × H, R32F
    conditional: THREE.DataTexture;  // W × H, R32F
    size: { w: number; h: number };
    lumIntegral: number;
}

export function buildEnvCDF(
    img: ImageData | { data: Float32Array, width: number, height: number },
    targetW: number = 256,
    targetH: number = 128,
): EnvCDFTextures;
```

Algorithm (Pharr/Jakob/Humphreys §13.6.5):

1. Downsample env to (W, H), compute per-texel luminance `L_ij`
   weighted by `sin(θ)` (latitude weight — equal solid angle per row).
2. For each row `j`: `condRow_j[i] = Σ_{k≤i} L_jk` (running sum,
   normalized by row total).
3. Marginal: `marginal[j] = Σ_k L_jk` (per-row totals), running sum
   normalized by total.
4. `lumIntegral = Σ_ij L_ij * sin(θ_j) * (TAU / W) * (PI / H)`.

Both tables stored as cumulative ∈ [0, 1]. Single channel R32F.

Triggered from:
- `MaterialController.loadTexture('env', ...)` — main-thread path.
- `renderWorker.ts` `TEXTURE` and `TEXTURE_HDR` handlers — worker path.

When the feature gate is off, skip CDF generation (the texture is
unused). Re-run on env rotation? **No** — see Scope (Out).

#### GPU side

```glsl
#ifdef PT_ENV_MIS_IS
// Two-LUT inverse CDF sampling. Returns world-space direction + pdf.
// Heitz et al. — single binary search per axis, 8-step bracket fits
// in a fixed-trip loop the compiler can unroll.
vec3 sampleEnvImportance(vec2 seed, out float pdf);

// pdf_env(L) for MIS weight at the BSDF-side env hit. dir is in
// pre-rotation env space (multiply by uEnvRotationMatrix⁻¹ first).
float pdfEnvImportance(vec3 dir);
#endif
```

`sampleEnvImportance`:
1. Binary search marginal for row `j`.
2. Binary search conditional row `j` for column `i`.
3. Recover `(θ, φ)` from `(i, j)`, return unit vector.
4. `pdf = (W * H * L_ij) / (TAU * PI * sin(θ) * lumIntegral)`.
5. Apply `uEnvRotationMatrix⁻¹` so the direction matches what
   `GetEnvMap(dir, 0.0)` will sample.

When `PT_ENV_MIS_IS` is on:
- Replace `sampleEnvUniform` call in env-NEE block with `sampleEnvImportance`.
- Replace `pdf_env = 1/(4π)` with `pdfEnvImportance(envDir)` in the
  MIS weight at the BSDF-side env hit.

Estimated compile cost: ~400 ms (two binary searches, fixed-trip
unrolled).

## DDFS feature definition (skeleton)

```ts
export const PathTraceReflectionsFeature: FeatureDefinition = {
    id: 'ptReflections',
    shortId: 'ptr',
    name: 'PT Reflections',
    category: 'Rendering',
    engineConfig: {
        toggleParam: 'enabled',
        mode: 'compile',
        label: 'PT Reflection Quality',
        groupFilter: 'engine_settings'
    },
    params: {
        enabled: { type: 'boolean', default: false, hidden: true,
                   onUpdate: 'compile', noReset: true },
        mode: {
            type: 'string', default: 'Env MIS',
            options: [
                { label: 'Off',           value: 'Off',           estCompileMs: 0 },
                { label: 'Env MIS',       value: 'Env MIS',       estCompileMs: 250 },
                { label: 'Env MIS + IS',  value: 'Env MIS + IS',  estCompileMs: 650 },
            ],
            label: 'Environment Sampling',
            description: 'Direct env-map sampling with MIS. Env MIS handles broad skies; Env MIS + IS adds importance sampling for HDR maps with sun discs / concentrated lights.',
            onUpdate: 'compile', noReset: true,
            group: 'engine_settings', parentId: 'ptEnabled',
        },
        sobolBounce: {
            type: 'boolean', default: false, ui: 'checkbox',
            label: 'Sobol Bounce Sampling',
            description: 'Low-discrepancy sequence for the GGX bounce direction. ~30% lower variance on shiny surfaces; no effect on rough/diffuse.',
            onUpdate: 'compile', noReset: true, estCompileMs: 50,
            group: 'engine_settings', parentId: 'ptEnabled',
        },
    },
    inject: (builder, config, variant) => {
        if (variant !== 'Main') return;
        const s = config.ptReflections as { enabled, mode, sobolBounce };
        if (!s?.enabled) return;
        if (s.mode === 'Env MIS' || s.mode === 'Env MIS + IS') {
            builder.addDefine('PT_ENV_MIS', '1');
        }
        if (s.mode === 'Env MIS + IS') {
            builder.addDefine('PT_ENV_MIS_IS', '1');
        }
        if (s.sobolBounce) builder.addDefine('PT_SOBOL_BOUNCE', '1');
    },
};
```

## Risks / known fragilities

- **MIS PDF mismatch.** `pdfBSDF` already lives in pathtracer.ts and
  is used for area lights — we must call it with the SAME mixture
  density the bounce-direction sampler uses. The hoist of `probSpec`
  above NEE done by area lights covers this; we read the same value.
- **CDF cache invalidation.** Env rotation does NOT invalidate the
  CDF (matrix-applied at sample time). Env-source switch (gradient ↔
  texture ↔ procedural) DOES — must call `buildEnvCDF` on the new
  env or set `uEnvCDFSize = (1,1)` to fall back to uniform sphere.
- **Worker-thread CDF build.** Building a 256×128 CDF on the worker
  blocks the worker thread for ~10 ms. Acceptable; runs once per env
  load. Don't rebuild on every frame.
- **Half-float HDR precision.** Worker stores HDR as `HalfFloatType`.
  CDF integrand uses luminance × `sin(θ)`; for a real HDR sun this can
  exceed half-float range. Build the CDF in `float32` (CPU side) from
  the unpacked half-float source, store as R32F.
- **`uEnvRotationMatrix⁻¹`.** A 2×2 rotation; inverse = transpose.
  Cheap. Make sure to upload both the forward and inverse to avoid a
  per-pixel transpose call.

## Bench / verification

Per memory `feedback_visual_smokes`: user does final visual testing.
Automated checks:

1. `npm run typecheck` — must stay clean.
2. `npm run build` — must stay clean.
3. `npm run shader:dump --pt --all-features` — verify `PT_ENV_MIS`,
   `PT_ENV_MIS_IS`, `PT_SOBOL_BOUNCE` emit correctly under each gate
   combo.
4. **New bench:** `debug/bench-pt-refl.mts` (optional, follow
   `debug/bench-shader.mts` pattern from project_appgmt_shader_bench
   memory). GPU-only test, scenes:
   - Chrome ball (roughness 0.05) + uniform sky → Phase 1+2 win, no
     Phase 3 difference.
   - Chrome ball + sun-disc HDR → Phase 3's main win.
   - Rough ball (roughness 0.6) → all phases ≈ neutral (regression
     check).
   Metric: variance vs sample count, plotted to `debug/bench-pt-refl.html`.

## Out-of-scope follow-ups (post v1)

- Owen-scrambled Sobol for higher dimensions (would replace blue noise
  for shadow jitter / RR if it actually wins).
- Env CDF rebuild on procedural-sky parameter changes (sky is uniform
  enough that this currently doesn't matter).
- Multi-bounce env IS — would require carrying CDF samples across
  iterations.
- ReSTIR direct light — separate research project.

