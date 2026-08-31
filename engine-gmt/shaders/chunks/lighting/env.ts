

export const LIGHTING_ENV = `
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

// Direction of the procedural sky's sun. Single source of truth — the
// procedural branch of GetEnvMap and the path tracer's analytic sun NEE
// (sampleProceduralEnv) both read it, so they can't drift. @see docs/adr/0070
vec3 proceduralSunDir() { return normalize(vec3(1.0, 4.0, 2.0)); }

// 4-tap bicubic B-spline sample of the env map's BASE level (Sigg & Hadwiger
// GPU Gems 2 formulation — four bilinear taps reconstruct the 16-texel cubic).
// For MAGNIFIED low-res equirect skies (a 1k map across a full viewport),
// plain bilinear shows diamond-shaped texel artifacts; the B-spline smooths
// them into clean gradients. Only used in the near-base regime (lod < 1) —
// mip-blurred lookups stay single-tap trilinear.
//
// NOTE the gate  lod < 1  is  roughness * uEnvMaxMip < 1  — a ROUGHNESS test,
// not a magnification test; it carries no pixel footprint. So it also fires on
// every near-mirror reflection (roughness < ~0.08-0.1), which is the maximally
// MINIFIED case, not the magnified one this filter was written for. Harmless
// only because the taps below are explicit-LOD. @see docs/adr/0072 (update
// 2026-08-31) and docs/adr/0069 (the minification term still missing).
vec3 sampleEnvBicubic(vec2 uv) {
    vec2 ts = vec2(textureSize(uEnvMapTexture, 0));
    vec2 coord = uv * ts - 0.5;
    vec2 ix = floor(coord);
    vec2 f = coord - ix;
    vec2 f2 = f * f;
    vec2 f3 = f2 * f;
    vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) / 6.0;
    vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
    vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
    vec2 w3 = f3 / 6.0;
    vec2 g0 = w0 + w1;
    vec2 g1 = w2 + w3;
    // Each tap lands between two texels so the hardware bilinear does the
    // inner interpolation; +0.5 centres on texels. Horizontal wrap comes from
    // the sampler (wrapS = Repeat on env textures — the equirect seam).
    //
    // c0/c1 are DELIBERATELY DISCONTINUOUS in uv: at every base-texel boundary
    // both jump by +0.8 texels while coord moves ~0 (w1/g0 steps 1.0 -> 0.8 as
    // ix advances). The B-spline RESULT stays continuous because g0/g1 step
    // compensatingly — but a derivative taken from these COORDINATES does not.
    // Hence textureLod below, never texture(): an implicit-LOD fetch hands the
    // hardware that 0.8-texel saw-tooth as its minification estimate, which on
    // a mirror is ~2.4 mips of LOD noise quantised to 2x2 quads — the hard
    // stair-stepped reflection edges reported 2026-08-31.
    // @invariant the four taps request LOD 0 explicitly — proven by:
    //   npm run test:env-sampling  ("bicubic taps carry an explicit LOD")
    vec2 c0 = (ix - 1.0 + w1 / g0 + 0.5) / ts;
    vec2 c1 = (ix + 1.0 + w3 / g1 + 0.5) / ts;
    return textureLod(uEnvMapTexture, vec2(c0.x, c0.y), 0.0).rgb * (g0.x * g0.y)
         + textureLod(uEnvMapTexture, vec2(c1.x, c0.y), 0.0).rgb * (g1.x * g0.y)
         + textureLod(uEnvMapTexture, vec2(c0.x, c1.y), 0.0).rgb * (g0.x * g1.y)
         + textureLod(uEnvMapTexture, vec2(c1.x, c1.y), 0.0).rgb * (g1.x * g1.y);
}

// Single-site image-path sample. Every GetEnvMap-body instance fxc inlines used
// to carry TWO copies of the bicubic mix (both uEnvAvgColor branches) — at ~14
// transitive instances in a raymarched build that was ~2.5s of cold compile
// (measured 2026-07-10, §2.6.2). One call site here emits the bicubic once per
// instance; baseFilter is CONSTANT at every caller, so fxc DCEs the bicubic
// entirely out of instances that pass false (the fog chain — fogRadiance samples
// at lod ≥ 1 on any real map, the magnification branch was dead there anyway).
vec3 envImageSample(vec2 uv, float lod, bool baseFilter) {
    if (baseFilter && lod < 1.0) {
        // Near-base (magnification) regime: bicubic-smooth the base level
        // and blend into the mip chain by lod 1 (continuous hand-off).
        return mix(sampleEnvBicubic(uv), textureLod(uEnvMapTexture, uv, 1.0).rgb, max(lod, 0.0));
    }
    return textureLod(uEnvMapTexture, uv, max(lod, 0.0)).rgb;
}

// Core env sample — shared by GetEnvMap (baseFilter on) and fogRadiance
// (baseFilter off). Callers MUST pass a constant baseFilter so fxc can DCE.
vec3 envSampleCore(vec3 dir, float roughness, bool baseFilter) {
    // Path 0: SOLID sky (uEnvSource 2) — the sky IS a flat colour
    // (uFogColorLinear, the shared Sky/Fog colour, ADR-0098). Constant in every
    // direction, so it also acts as a uniform dome light, appears in
    // reflections, and feeds fogRadiance — all for free through this one exit.
    if (uEnvSource > 1.5) return uFogColorLinear;

    // 1. Apply Rotation (CPU Optimized: uEnvRotationMatrix, identity when rotation is 0)
    dir.xz = uEnvRotationMatrix * dir.xz;

    vec3 col; // Result variable

    if (uEnvSource > 0.5) {
        // Path 1: Gradient Texture
        float t = dir.y * 0.5 + 0.5;
        col = texture(uEnvGradient, vec2(t, 0.5)).rgb;
    }
    else if (uUseEnvMap > 0.5) {
        // Path 2: EnvMap Texture (Flattened else-if for compiler safety)
        // Equirectangular projection: longitude → [0,1], latitude → [0,1]
        vec2 uv = vec2(atan(dir.z, dir.x) * INV_TAU + 0.5, 1.0 - acos(dir.y) * INV_PI);
        // Roughness blur via an ABSOLUTE LOD (textureLod), not a LOD bias.
        // texture(uv, bias) clamps the bias to GL_MAX_TEXTURE_LOD_BIAS (often
        // 2.0 on ANGLE/D3D11), so rough reflections could never blur past ~2
        // mips and stayed sharp. textureLod selects the mip directly.
        //
        // A box-filtered equirectangular mip chain collapses to a pole-biased,
        // often-dark GLOBAL average at its smallest mips. So toward the rough
        // end we blend to the solid-angle-CORRECT average (uEnvAvgColor, sinθ-
        // weighted on env load) instead of those degenerate mips — energy-honest
        // and direction-independent where the lobe is near-hemispherical. The
        // sentinel uEnvAvgColor.r < 0 (pixel extraction failed) falls back to
        // capping the LOD short of the bad mips. @see docs/adr/0069
        if (uEnvAvgColor.r >= 0.0) {
            float lod = roughness * uEnvMaxMip;
            col = envImageSample(uv, lod, baseFilter);
            float avgMix = smoothstep(uEnvMaxMip - 4.0, uEnvMaxMip, lod);
            col = mix(col, uEnvAvgColor, avgMix);
        } else {
            col = envImageSample(uv, roughness * max(0.0, uEnvMaxMip - 4.0), baseFilter);
        }

        // Apply Color Profile (Linear/ACES)
        col = applyTextureProfile(col, uEnvMapColorSpace);
    }
    else {
        // Path 3: Procedural Sky — simple gradient + sun glint + rim fill
        float y = dir.y * 0.5 + 0.5;  // Remap vertical direction [-1,1] → [0,1]
        vec3 skyBase = mix(vec3(0.02, 0.02, 0.05), vec3(0.15, 0.15, 0.25), y);  // Dark navy horizon → lighter zenith
        vec3 sky = mix(skyBase, vec3(0.1), roughness * 0.5);  // Desaturate with roughness (blurry reflections see averaged sky)

        // Sun: sharp specular highlight, blurs with roughness
        float specPower = mix(100.0, 0.5, roughness * roughness);  // Sharp (100) for mirrors, soft (0.5) for rough
        float rimPower = mix(10.0, 1.0, roughness);  // Rim falloff exponent

        vec3 sunDir = proceduralSunDir();  // Fixed upper-right sun position
        float sunDot = max(0.0, dot(dir, sunDir));
        float light = pow(sunDot, specPower);

        // Counter-light rim fill — prevents pure black on shadow side
        vec3 rimDir = normalize(vec3(-1.0, 1.0, -1.0));
        float rimDot = max(0.0, dot(dir, rimDir));
        float rim = pow(rimDot, rimPower) * 0.5;

        float brightness = mix(1.0, 0.3, roughness);  // Rough surfaces see dimmer sky overall
        col = sky + vec3(1.0) * light * 0.8 * brightness + vec3(0.8, 0.9, 1.0) * rim * brightness;
    }

    return col;
}

vec3 GetEnvMap(vec3 dir, float roughness) {
    return envSampleCore(dir, roughness, true);
}

// In-scattered fog radiance for a ray direction (ADR-0097; semantics inverted
// per ADR-0097 update #4). Physically the fog IS the atmosphere lit by the sky,
// so BY DEFAULT it tracks a heavily blurred env sample per direction — aerial
// perspective: fog brightens toward the bright side of the sky, and for a
// SOLID sky it is exactly the Sky colour. uFogTint ("Fog Tint") blends toward
// the custom flat Fog Color instead (1 = fully custom — the pre-inversion
// legacy look; migration v6 pins old scenes there).
//
// DELIBERATELY NOT scaled by uEnvStrength: the fog follows the VISIBLE sky
// definition, not the env-light strength — a sunset backdrop with the dome
// light at 0 (already an artistic decouple) should still be matchable by the
// fog. The HDR knee below bounds the brightness either way.
//
// NOT roughness 1.0: for image env maps GetEnvMap's terminal LOD blends to the
// direction-INDEPENDENT solid-angle average (ADR-0069 avgMix window, the last
// 4 mips) — per-direction fog would come out one flat grey. Sample at the
// blurriest mip BELOW that window instead (lod = uEnvMaxMip - 4, i.e.
// roughness = 1 - 4/uEnvMaxMip): maximally soft but still directional.
// Gradient/procedural env paths ignore the exact value and stay directional.
vec3 fogRadiance(vec3 dir) {
    if (uFogTint > 0.999) return uFogColorLinear;
    float fogRough = clamp(1.0 - 4.0 / max(uEnvMaxMip, 5.0), 0.5, 1.0);
    // baseFilter=false: at fogRough ≥ 0.5 the lod<1 magnification branch is dead
    // at runtime — passing the constant lets fxc DCE the bicubic out of every
    // fogRadiance inline (~8 instances in a raymarched build, §2.6.2).
    vec3 envFog = envSampleCore(dir, fogRough, false);
    // HDR soft knee: even blurred, a bright HDR sun region can carry luminance
    // 10-50+, and fog radiance multiplies into EVERY fogged term (ambient, env,
    // post fog) — the scene blew out with only a little tint (owner repro).
    // Pass luminance <= 1 through untouched and compress the excess toward an
    // asymptote of 2 (the clampReflLum curve with t = 1): fog is scattered
    // AMBIENT light, never a sun-disc-bright emitter.
    float l = dot(envFog, vec3(0.2126, 0.7152, 0.0722));
    if (l > 1.0) envFog *= (2.0 - exp(-(l - 1.0))) / l;
    return mix(envFog, uFogColorLinear, uFogTint);
}

// Sample the env map at the resolution the CDF was built from. Used by
// path-traced env-NEE under PT_ENV_MIS_IS so per-direction Le matches what
// the CDF pdf claims for the cell — without this match, sub-pixel features
// (sun discs) inside dim cells produce firefly spikes proportional to the
// resolution ratio between source and CDF. Sharp sun reflections still
// resolve via the BSDF-side !hit branch (full-res sampleMiss); MIS picks
// the lower-variance estimator per direction.
vec3 sampleEnvAtCDFMip(vec3 dir) {
    // Non-texture paths have no high-res mismatch — fall back to GetEnvMap.
    if (uEnvSource > 0.5 || uUseEnvMap < 0.5) return GetEnvMap(dir, 0.0);

    dir.xz = uEnvRotationMatrix * dir.xz;
    vec2 uv = vec2(atan(dir.z, dir.x) * INV_TAU + 0.5, 1.0 - acos(dir.y) * INV_PI);
    vec3 col = textureLod(uEnvMapTexture, uv, uEnvCDFMipBias).rgb;
    return applyTextureProfile(col, uEnvMapColorSpace);
}
`;
