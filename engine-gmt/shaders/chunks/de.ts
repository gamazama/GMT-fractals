
export const DE_MASTER = (
    formulaBody: string,
    loopInit: string = '',
    getDistBody: string,
    hybridInit: string = '',
    hybridPreLoop: string = '',
    hybridInLoop: string = '',
    distOverrideInit: string = '',
    distOverrideInLoopFull: string = '',
    distOverrideInLoopGeom: string = '',
    distOverridePostFull: string = '',
    distOverridePostGeom: string = '',
    postMapCode: string = '',
    postDistCode: string = ''
) => {
    // When hybridInLoop sets skipMainFormula, we need the variable and if-wrapper.
    // Otherwise emit the formula body directly — saves a bool + branch per iteration.
    const needsSkip = hybridInLoop.includes('skipMainFormula');

    return `
${getDistBody}

// --- CORE ESTIMATOR (Coloring & Geometry) ---
// Returns: vec4(distance, trap_distance, iteration_count, decomposition_angle)
vec4 map(vec3 p) {
    // 1. Apply Precision Offset
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);

    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    g_orbitTrap = vec4(1e10);
    g_geomTrap = 1e10;

    float iter = 0.0;
    float smoothIter = 0.0;

    float decomp = 0.0;
    float lastLength = 0.0;
    bool decompCaptured = false;

    // Color iteration limit: snapshot coloring state at boundary (branchless)
    vec4 savedOrbitTrap = vec4(1e10);
    float savedTrap = 1e10;
    float savedGeomTrap = 1e10;
    float savedIter = 0.0;

    ${distOverrideInit}
    ${loopInit}
    ${hybridPreLoop}

    bool escaped = false;
    // Absolute raymarch bailout (uDeBailout, default 100), decoupled from the
    // escape/coloring threshold. High = accurate analytic DE, sharp surfaces;
    // low = early bail that slices the fractal into shells (overstep artifacts
    // by design). When bailout < uEscapeThresh the decomp/potential capture
    // below never fires — accepted tradeoff for the slicing effect. Floored at
    // 1.0 so |z|² stays ≥ 1 (keeps log-based DEs well-defined).
    float bailout = max(uDeBailout, 1.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${needsSkip ? 'bool skipMainFormula = false;' : ''}

        ${hybridInLoop}

        ${needsSkip ? 'if (!skipMainFormula) {' : '// --- Main Formula ---'}
            applyPreRotation(z.xyz);

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

            applyPostRotation(z.xyz);
        ${needsSkip ? '}' : ''}

        // Count completed iterations. After uIterations runs iter == uIterations,
        // which matches Fragmentarium's n counter used in explicit getDist expressions.
        iter += 1.0;

        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));

        // Geometric trap — accumulates here (post-formula, pre-snapshot) so
        // it shares z state + snapshot timing with g_orbitTrap above. The
        // older addHybridFold position fired BEFORE the formula step and
        // its skip-iter-0 guard left savedGeomTrap at 1e10 for low
        // uColorIter, freezing the trap to a flat constant. Self-contained
        // formulas thread their own trap math through their inner loop and
        // gate this block off via SELF_CONTAINED_SDE (core_math.ts).
#if defined(TRAP_ENABLED) && !defined(SELF_CONTAINED_SDE)
        {
            vec3 _d = z.xyz - uTrapCenter;
            float _td;
            int _ts = int(uTrapShape + 0.1);
            if (_ts == 1)      _td = length(_d);
            else if (_ts == 2) _td = abs(length(_d) - uTrapRadius);
            else if (_ts == 3) _td = min(min(abs(_d.x), abs(_d.y)), abs(_d.z));
            else               _td = abs(dot(z.xyz, uTrapNormal) - uTrapOffset);
            g_geomTrap = min(g_geomTrap, _td);
        }
#endif

        // Color iteration snapshot. Direct if-assignment (rather than mix
        // with a 0/1 gate) lets fxc co-locate savedX with the running X
        // in the same register: with mix, savedX was both an operand and
        // a destination on every iter, forcing a separate live range.
        // Audit Tier 2 / compile #3.
        if (iter <= uColorIter) {
            savedOrbitTrap = g_orbitTrap;
            savedTrap      = trap;
            savedGeomTrap  = g_geomTrap;
            savedIter      = iter;
        }

        if (!decompCaptured && r2 > uEscapeThresh) {
            decomp = atan(z.y, z.x) * INV_TAU + 0.5;
            lastLength = sqrt(r2);
            decompCaptured = true;
        }

        if (dr > 1.0e10 || r2 > bailout) {
            escaped = true;
            break;
        }

        ${distOverrideInLoopFull}
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

    ${distOverridePostFull}

    // Restore saved coloring state if color iteration limit was active
    // When uColorIter > 0, use the frozen snapshot; otherwise keep full-iteration values
    float useColorSnap = step(0.5, uColorIter);
    g_orbitTrap = mix(g_orbitTrap, savedOrbitTrap, useColorSnap);
    trap = mix(trap, savedTrap, useColorSnap);
    g_geomTrap = mix(g_geomTrap, savedGeomTrap, useColorSnap);

    // Persist the capped geometric trap into g_geomTrapFinal so the colour
    // sampler reads the value at the actual hit point. mapDist() (called
    // later for normals / shadows / AO) resets g_geomTrap and re-accumulates
    // it from a different position, which is why we need the side channel.
    // Standard g_orbitTrap doesn't need this — mapDist never writes to it.
    g_geomTrapFinal = g_geomTrap;

    // Color mode 8 = LLI (Last Length Iteration) decomposition — needs lastLength from escape check
    bool useLLI = (abs(uColorMode - 8.0) < 0.1) || (abs(uColorMode2 - 8.0) < 0.1);
#ifdef USE_TEXTURE
    if (uUseTexture > 0.5) {
        if (abs(uTextureModeU - 8.0) < 0.1) useLLI = true;
        if (abs(uTextureModeV - 8.0) < 0.1) useLLI = true;
    }
#endif
    float outTrap = useLLI ? lastLength : trap;

    // --- FEATURE INJECTION: POST-MAP (accumulative) ---
    // Variables in scope: p_fractal, finalD, decomp, smoothIter, outTrap
    ${postMapCode}

    // When color iteration limit is active, use capped iter for normalized coloring value
    float colorIterNorm = mix(smoothIter / max(1.0, uIterations), savedIter / max(1.0, uColorIter), useColorSnap);
    return vec4(finalD, outTrap, colorIterNorm, decomp);
}

// --- OPTIMIZED GEOMETRY-ONLY ESTIMATOR ---
// Strips out all Orbit Trap, Coloring, Decomposition, and Smoothing logic.
// Used for Shadows, AO, and Normals.
float mapDist(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    // We still need 'trap' for formula signatures, but the compiler will DCE it since we don't return it.
    float trap = 1e10;
    g_geomTrap = 1e10;

    // Add missing iter definition for compatibility with loopInit chunks that might expect it
    float iter = 0.0;

    ${distOverrideInit}
    ${loopInit}
    ${hybridPreLoop}

    // Geometry-only twin of map()'s bailout — see that comment for the rationale.
    float bailout = max(uDeBailout, 1.0);

    // Geometry Loop
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${needsSkip ? 'bool skipMainFormula = false;' : ''}

        ${hybridInLoop}

        ${needsSkip ? 'if (!skipMainFormula) {' : '// --- Main Formula ---'}
            applyPreRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (dot(z.xyz, z.xyz) > bailout) break;
            #endif

            ${formulaBody}

            applyPostRotation(z.xyz);
        ${needsSkip ? '}' : ''}

        // Track completed iterations so getDist expressions that use iter
        // (e.g. r * pow(Scale, -iter)) receive the correct count for shadow marching.
        iter += 1.0;

        if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) break;

        ${distOverrideInLoopGeom}
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);

    vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;

    ${distOverridePostGeom}

    // --- FEATURE INJECTION: POST-DIST (accumulative) ---
    ${postDistCode}

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
