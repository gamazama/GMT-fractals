

export const LIGHTING_ENV = `
// ------------------------------------------------------------------
// ENVIRONMENT MAP
// ------------------------------------------------------------------

// Direction of the procedural sky's sun. Single source of truth — the
// procedural branch of GetEnvMap and the path tracer's analytic sun NEE
// (sampleProceduralEnv) both read it, so they can't drift. @see docs/adr/0070
vec3 proceduralSunDir() { return normalize(vec3(1.0, 4.0, 2.0)); }

vec3 GetEnvMap(vec3 dir, float roughness) {
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
            col = textureLod(uEnvMapTexture, uv, lod).rgb;
            float avgMix = smoothstep(uEnvMaxMip - 4.0, uEnvMaxMip, lod);
            col = mix(col, uEnvAvgColor, avgMix);
        } else {
            float lod = roughness * max(0.0, uEnvMaxMip - 4.0);
            col = textureLod(uEnvMapTexture, uv, lod).rgb;
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
