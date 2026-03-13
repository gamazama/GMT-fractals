
export const DE_MASTER = (
    formulaBody: string,
    loopInit: string = '',
    getDistBody: string,
    hybridInit: string = '',
    hybridPreLoop: string = '',
    hybridInLoop: string = '',
    distOverrideInit: string = '',
    distOverrideInLoopMap: string = '',
    distOverrideInLoopDist: string = '',
    distOverridePostMap: string = '',
    distOverridePostDist: string = ''
) => {
    
    return `
${getDistBody}

#define MATERIAL_WATER 10.0

// --- CORE ESTIMATOR (Coloring & Geometry) ---
// Returns: vec4(distance, trap_distance, iteration_count, decomposition_angle)
vec4 map(vec3 p) {
    // 1. Apply Precision Offset
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    g_orbitTrap = vec4(1e10);
    
    float iter = 0.0; 
    float smoothIter = 0.0;
    
    float decomp = 0.0;
    float lastLength = 0.0;
    bool decompCaptured = false;
    
    bool rotated = false;

    ${distOverrideInit}
    ${loopInit}
    ${hybridPreLoop}

    bool escaped = false;
    // Bailout must exceed escape threshold so coloring captures the last pre-escape state.
    // +100 buffer prevents premature bailout on slowly-escaping orbits.
    float bailout = max(100.0, uEscapeThresh + 100.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        bool skipMainFormula = false;

        ${hybridInLoop}

        if (!skipMainFormula) {
            applyLocalRotation(z.xyz);

            float r2_check = dot(z.xyz, z.xyz);

            if (!decompCaptured && r2_check > uEscapeThresh) {
                decomp = atan(z.y, z.x) * INV_TAU + 0.5;
                lastLength = sqrt(r2_check);
                decompCaptured = true;
            }

            // --- OPTIMIZATION: EARLY BAILOUT ---
            // Check if point has escaped BEFORE running expensive math (pow/sin/cos).
            // Some formulas (JuliaMorph) opt-out of this via define.
            #ifndef SKIP_PRE_BAILOUT
            if (r2_check > bailout) {
                escaped = true;
                break;
            }
            #endif

            ${formulaBody}
        }

        // Count completed iterations. After uIterations runs iter == uIterations,
        // which matches Fragmentarium's n counter used in explicit getDist expressions.
        iter += 1.0;

        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));

        if (!decompCaptured && r2 > uEscapeThresh) {
            decomp = atan(z.y, z.x) * INV_TAU + 0.5;
            lastLength = sqrt(r2);
            decompCaptured = true;
        }

        if (dr > 1.0e10 || r2 > bailout) {
            escaped = true;
            break;
        }

        ${distOverrideInLoopMap}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    if (!decompCaptured) {
        decomp = atan(z.y, z.x) * INV_TAU + 0.5;
        lastLength = r;
    }

    vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;
    smoothIter = distRes.y;

    ${distOverridePostMap}
    
    // Color mode 8 = LLI (Last Length Iteration) decomposition — needs lastLength from escape check
    bool useLLI = (abs(uColorMode - 8.0) < 0.1) || (abs(uColorMode2 - 8.0) < 0.1);
    if (uUseTexture > 0.5) {
        if (abs(uTextureModeU - 8.0) < 0.1) useLLI = true;
        if (abs(uTextureModeV - 8.0) < 0.1) useLLI = true;
    }
    float outTrap = useLLI ? lastLength : trap;
    
    // --- HOOK: Water Plane ---
    // Wrapped in ifdef to ensure it is optimized out if feature disabled
    #ifdef WATER_ENABLED
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
        // Signal Water material via named sentinel (fractal decomp is in [0,1]; MATERIAL_WATER > 1)
        decomp = MATERIAL_WATER;
        smoothIter = 0.0;
        outTrap = 0.0;
    }
    #endif

    return vec4(finalD, outTrap, smoothIter / max(1.0, uIterations), decomp);
}

// --- OPTIMIZED GEOMETRY-ONLY ESTIMATOR ---
// Strips out all Orbit Trap, Coloring, Decomposition, and Smoothing logic.
// Used for Shadows, AO, and Normals.
float mapDist(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    
    vec4 z = vec4(p_fractal, uParamB); 
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
    
    float dr = 1.0;
    // We still need 'trap' for formula signatures, but the compiler will DCE it since we don't return it.
    float trap = 1e10; 
    
    // Add missing iter definition for compatibility with loopInit chunks that might expect it
    float iter = 0.0;
    
    bool rotated = false;

    ${distOverrideInit}
    ${loopInit}
    ${hybridPreLoop}

    float bailout = max(100.0, uEscapeThresh + 100.0);

    // Geometry Loop
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        bool skipMainFormula = false;

        ${hybridInLoop}

        if (!skipMainFormula) {
            applyLocalRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (dot(z.xyz, z.xyz) > bailout) break;
            #endif

            ${formulaBody}
        }

        // Track completed iterations so getDist expressions that use iter
        // (e.g. r * pow(Scale, -iter)) receive the correct count for shadow marching.
        iter += 1.0;

        if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) break;

        ${distOverrideInLoopDist}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;

    ${distOverridePostDist}
    
    // --- HOOK: Water Plane ---
    #ifdef WATER_ENABLED
    float dWater = mapWater(p_fractal);
    if (dWater < finalD) {
        finalD = dWater;
    }
    #endif

    return finalD;
}

// Wrapper for Coloring
vec4 DE(vec3 p_ray) {
    return map(p_ray + uCameraPosition);
}

// Wrapper for Geometry (Shadows/AO/Normals)
float DE_Dist(vec3 p_ray) {
    return mapDist(p_ray + uCameraPosition);
}`;
};
