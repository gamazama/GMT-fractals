
export const getFragmentMainGLSL = (enablePathTracing: boolean, enableDepthOutput: boolean = true) => {

    // Optimized: Only inject the code for the ACTIVE mode.
    // This dramatically reduces shader compilation time.
    let integrator = '';
    
    if (enablePathTracing) {
        integrator = `
        // Path Tracer Mode (Compiled)
        col = calculatePathTracedColor(ro, rd, d, result, stochasticSeed);
        `;
    } else {
        integrator = `
        // Direct Lighting Mode (Compiled)
        col = calculateShading(ro, rd, d, result, stochasticSeed);
        `;
    }

    // Conditionally add MRT depth output
    // When disabled (physics probe in Manual mode), shader compiles faster
    const depthOutputDecl = enableDepthOutput 
        ? `layout(location = 1) out vec4 fragDepth;  // Distance to surface in .r (RGBA for readPixels compatibility)`
        : ``;
    
    const depthOutputWrite = enableDepthOutput
        ? `fragDepth = vec4(depth, 0.0, 0.0, 1.0);  // Output distance to second render target`
        : ``;
    
    const depthOutputInvalid = enableDepthOutput
        ? `fragDepth = vec4(-1.0, 0.0, 0.0, 1.0);  // Invalid depth for region outside`
        : ``;

    return `
// ------------------------------------------------------------------
// MAIN RENDER LOOP
// ------------------------------------------------------------------

// Output Layout for GLSL 3.00 ES - MRT for color + depth
layout(location = 0) out vec4 pc_fragColor;
${depthOutputDecl}

// Safety to prevent NaNs/Infs from poisoning the accumulation buffer
vec3 sanitizeColor(vec3 col) {
    // Optimization: Replaced complex branching with hardware clamps.
    // Clamp to [0, 200.0] to handle fireflies/NaNs gracefully without conditional logic.
    // vec3(200.0) is generous enough for HDR bloom, but low enough to stop Inf accumulation.
    return min(max(col, vec3(0.0)), vec3(200.0));
}

vec3 renderPixel(vec2 uvCoord, float seedOffset, out float outDepth) {
    vec3 ro = vec3(0.0);
    vec3 rd = vec3(0.0, 0.0, 1.0);
    float stochasticSeed = 0.0;
    
    getCameraRay(uvCoord, uExtraSeed + seedOffset, ro, rd, stochasticSeed);
    
    // Background Logic (Direct Mode Miss)
    vec3 bgCol = vec3(0.0);
    vec3 safeFog = InverseACESFilm(uFogColor);
    
    if (uEnvBackgroundStrength > 0.001) {
        vec3 env = GetEnvMap(rd, 0.0) * uEnvBackgroundStrength; 
        bgCol = mix(env, safeFog, clamp(uFogIntensity, 0.0, 1.0));
    } else {
        // If Background Visibility is 0, we just show fog color (usually black)
        // We mix with a tiny bit of fog color based on Y to prevent total pitch black banding
        bgCol = mix(safeFog + vec3(0.01), safeFog, abs(rd.y));
    }
    
    vec3 col = bgCol;
    float d = 0.0;
    vec4 result = vec4(0.0);
    
    vec3 glow = vec3(0.0);
    float volumetric = 0.0;
    
    // Primary Ray Trace
    bool hit = traceScene(ro, rd, d, result, glow, stochasticSeed, volumetric);
    
    if (hit) {
        ${integrator}
    } else {
        d = 1000.0;
    }
    
    col = applyPostProcessing(col, d, glow, volumetric);
    outDepth = d;  // Output depth for physics probe
    return col;
}

void main() {
    vec4 history = texture(uHistoryTexture, vUv); // texture() in GLSL 3

    // --- Region Check ---
    if (vUv.x < uRegionMin.x || vUv.y < uRegionMin.y || vUv.x > uRegionMax.x || vUv.y > uRegionMax.y) {
        pc_fragColor = history;
        ${depthOutputInvalid}
        return;
    }

    float depth;
    vec3 col = renderPixel(vUv, 0.0, depth);
    col = sanitizeColor(col);
    vec3 safeHistory = history.rgb;
    
    vec3 finalCol = mix(safeHistory, col, uBlendFactor);
    pc_fragColor = vec4(finalCol, 1.0);
    ${depthOutputWrite}
}
`;
};
