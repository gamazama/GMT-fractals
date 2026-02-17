

export const generateMaterialEval = (injectedCode: string = "") => `
// ------------------------------------------------------------------
// SHARED SURFACE EVALUATION
// ------------------------------------------------------------------

vec3 GetNormal(vec3 p_ray, float eps) {
    // High Quality: Tetrahedron Normal (4 taps)
    // OPTIMIZATION: Use DE_Dist
    vec2 k = vec2(1.0, -1.0);
    vec3 n = k.xyy * DE_Dist(p_ray + k.xyy * eps) + 
             k.yyx * DE_Dist(p_ray + k.yyx * eps) + 
             k.yxy * DE_Dist(p_ray + k.yxy * eps) + 
             k.xxx * DE_Dist(p_ray + k.xxx * eps);
    
    if (dot(n, n) < 1.0e-20) return vec3(0.0, 1.0, 0.0);
    
    return normalize(n);
}

vec3 GetFastNormal(vec3 p, float eps) {
    // Low Quality: Forward Difference (3 taps)
    // Optimization: Uses DE_Dist
    // We assume distance at p is ~0.0 (Surface)
    vec2 e = vec2(eps, 0.0);
    
    float dx = DE_Dist(p + e.xyy);
    float dy = DE_Dist(p + e.yxy);
    float dz = DE_Dist(p + e.yyx);
    
    vec3 n = vec3(dx, dy, dz);
    
    if (dot(n, n) < 1.0e-20) return vec3(0.0, 1.0, 0.0);
    
    return normalize(n);
}

// Evaluate surface properties (Albedo, Normal, Roughness, Emission)
// Used by both Direct Lighting and Path Tracer
void getSurfaceMaterial(vec3 p_ray_in, vec3 p_fractal_in, vec4 result, float d, out vec3 albedo, out vec3 n, out vec3 emission, out float roughness, bool highQuality) {
    // Initialize outputs to satisfy strict compilers (X4000)
    albedo = vec3(0.0);
    n = vec3(0.0, 1.0, 0.0);
    emission = vec3(0.0);
    roughness = 0.5;

    float distFromFractalOrigin = length(p_fractal_in);
    float pixelSizeScale = length(uCamBasisY) / uResolution.y * 2.0;
    
    // Matches trace.ts precision floor
    float floatLimit = max(1.0e-20, distFromFractalOrigin * 5.0e-7);
    
    float visualLimit = pixelSizeScale * d * (1.0 / uDetail);
    
    float eps = max(floatLimit, visualLimit);

    // Alias inputs (No Retreat/Modification)
    vec3 p_ray = p_ray_in;
    vec3 p_fractal = p_fractal_in;
    
    // --- ADAPTIVE NORMAL ESTIMATION ---
    
    if (highQuality) {
        n = GetNormal(p_ray, eps);
    } else {
        // Boost epsilon slightly for fast normals to avoid noise
        // FIX: Removed invalid 'd' argument. FastNormal calculates relative to 0.0 surface.
        n = GetFastNormal(p_ray, eps * 1.5);
    }
    
    // --- Layer 3: Procedural Noise & Bump Mapping ---
    // Calculate if needed for Surface OR Emission (Mode 3)
    float noiseVal = 0.0;
    vec3 noiseP = p_fractal * uLayer3Scale;
    bool useL3 = (uLayer3Strength > 0.0 || abs(uLayer3Bump) > 0.0 || abs(uEmissionMode - 3.0) < 0.1);
    
    if (useL3) {
        noiseVal = getLayer3Noise(noiseP);
        
        if (abs(uLayer3Bump) > 0.001) {
            vec2 e = vec2(0.01, 0.0);
            float nx = getLayer3Noise(noiseP + e.xyy) - noiseVal;
            float ny = getLayer3Noise(noiseP + e.yxy) - noiseVal;
            float nz = getLayer3Noise(noiseP + e.yyx) - noiseVal;
            vec3 grad = vec3(nx, ny, nz);
            
            // Only apply detailed bump mapping on high quality rays (primary hit)
            // Skip bump on bounces to save perf and reduce shimmering
            if (highQuality) {
                n = normalize(n - grad * uLayer3Bump * 10.0);
            }
        }
    }

    // --- Coloring Calculation ---
    vec3 col1 = vec3(0.0);
    
    // Layer 1 (Always calculated as base)
    if (uUseTexture > 0.5) {
        col1 = getTextureColor(p_fractal, n, result);
    } else {
        float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
        float twistAngle = 0.0;
        if (abs(uColorTwist) > 0.001) {
            twistAngle = atan(p_fractal.y, p_fractal.x) * 0.15915;
        }
        float t1Raw = val1 * uColorScale + uColorOffset + (distFromFractalOrigin + twistAngle) * uColorTwist;
        float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
        col1 = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }

    // Layer 2
    // Calculate if needed for Surface Blending OR Emission (Mode 2)
    vec3 col2 = vec3(0.0);
    bool useL2 = (uBlendOpacity > 0.01 || uBlendMode > 5.5 || abs(uEmissionMode - 2.0) < 0.1);

    if (useL2) { 
        float val2 = getMappingValue(uColorMode2, p_fractal, result, n, uColorScale2);
        
        float twistAngle2 = 0.0;
        if (abs(uColorTwist2) > 0.001) {
            twistAngle2 = atan(p_fractal.y, p_fractal.x) * 0.15915;
        }
        
        float t2Raw = val2 * uColorScale2 + uColorOffset2 + (distFromFractalOrigin + twistAngle2) * uColorTwist2;
        float t2 = pow(abs(fract(mod(t2Raw, 1.0))), uGradientBias2);
        
        col2 = textureLod0(uGradientTexture2, vec2(t2, 0.5)).rgb;
    }

    // --- Compose Albedo ---
    albedo = col1;

    // Apply Layer 2 Blend (Only if opacity > 0 or Bump mode)
    if (uBlendOpacity > 0.01 || uBlendMode > 5.5) {
        if (uBlendMode > 5.5) {
             vec3 bumpVec = (col2 - 0.5) * 2.0;
             // Apply layer blend bump
             if (highQuality) {
                n = normalize(n + bumpVec * uBlendOpacity);
             }
        } else {
             albedo = blendColors(albedo, col2, uBlendOpacity, uBlendMode);
        }
    }
    
    // Apply Layer 3 Blend (Only if strength > 0)
    if (uLayer3Strength > 0.001) {
        float n01 = noiseVal * 0.5 + 0.5;
        albedo = mix(albedo, uLayer3Color, n01 * uLayer3Strength);
    }
    
    // --- FEATURE INJECTION: MATERIAL PROPERTIES ---
    // Inject Emission, Roughness, and other surface logic here.
    ${injectedCode}
    
    // --- HOOK: Water Plane Material ---
    // Overrides albedo/normal/roughness if water ID is detected
    // Safe to call even if water disabled (stub will be empty)
    if (abs(result.w - 12345.0) < 0.1) {
        applyWaterMaterial(albedo, roughness, n, p_fractal);
        emission = vec3(0.0);
    }
}`;
