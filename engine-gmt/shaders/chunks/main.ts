

export const getFragmentMainGLSL = (enablePathTracing: boolean, maxLights: number, compositeCode: string = '') => {

    const shadingCall = enablePathTracing
        ? 'col = calculatePathTracedColor(ro, rd, d, result, stochasticSeed);'
        : 'col = calculateShading(ro, rd, d, result, stochasticSeed);';

    const integrator = `
        if (hit) {
            ${shadingCall}
        } else {
            if (d < 0.001) d = MISS_DIST;
        }

        // --- FEATURE INJECTION: POST-INTEGRATOR COMPOSITING ---
        ${compositeCode}
    `;

    return `
// ------------------------------------------------------------------
// MAIN RENDER LOOP
// ------------------------------------------------------------------

// Output Layout for GLSL 3.00 ES - single color output
layout(location = 0) out vec4 pc_fragColor;

// Safety to prevent NaNs/Infs from poisoning the accumulation buffer.
// Clamp to 200.0 (not 1.0) to preserve HDR range for tone mapping — fireflies above this are clamped.
vec3 sanitizeColor(vec3 col) {
    return min(max(col, vec3(0.0)), vec3(200.0));
}

vec3 renderPixel(vec2 uvCoord, float seedOffset, out float outDepth) {
    vec3 ro = vec3(0.0);
    vec3 rd = vec3(0.0, 0.0, 1.0);
    float stochasticSeed = 0.0;
    vec3 roClean, rdClean;

    getCameraRay(uvCoord, ro, rd, stochasticSeed, roClean, rdClean);

    // Background Logic (Direct Mode Miss)
    vec3 bgCol = vec3(0.0);
    vec3 safeFog = uFogColorLinear;

    if (uEnvBackgroundStrength > 0.001) {
        vec3 env = GetEnvMap(rd, 0.0) * uEnvBackgroundStrength;
        bgCol = mix(env, safeFog, clamp(uFogIntensity, 0.0, 1.0));
    } else {
        bgCol = mix(safeFog + vec3(0.01), safeFog, abs(rd.y));
    }

    vec3 col = bgCol;
    float d = 0.0;
    vec4 result = vec4(0.0);

    vec3 glow = vec3(0.0);
    vec3 fogScatter = vec3(0.0);
    float volumetric = 0.0;

    // Primary Ray Trace
    bool hit = traceScene(ro, rd, d, result, glow, stochasticSeed, volumetric, fogScatter);

    ${integrator}

    col = applyPostProcessing(col, d, glow, volumetric, fogScatter);
    // Project hit point onto clean (un-jittered) ray for stable depth readback
    // When DoF is off, roClean==ro and rdClean==rd so this equals d
    outDepth = dot(ro + rd * d - roClean, rdClean);
    return col;
}

void main() {
    vec4 history = texture(uHistoryTexture, vUv); // texture() in GLSL 3

    // --- Region Check ---
    if (vUv.x < uRegionMin.x || vUv.y < uRegionMin.y || vUv.x > uRegionMax.x || vUv.y > uRegionMax.y) {
        pc_fragColor = history;
        return;
    }

    // --- Normal rendering for all pixels ---
    float depth;
    vec3 col = renderPixel(vUv, 0.0, depth);
    col = sanitizeColor(col);
    vec3 safeHistory = history.rgb;

    vec3 finalCol = mix(safeHistory, col, uBlendFactor);

    // Alpha channel write:
    //   Beauty / depth passes store the projected depth (physics probe reads this every frame,
    //   and the depth post-process branch normalizes it).
    //   Alpha pass stores per-sample binary coverage (1.0 for a surface hit, 0.0 for sky).
    //   Accumulating that binary signal across the Halton-jittered sub-pixel samples averages
    //   out to fractional coverage — i.e. properly anti-aliased edges in the final mask, for
    //   free from the existing TAA pipeline.
    //
    //   Hit threshold is MISS_DIST minus a safety margin: depth is a projection of d along the
    //   un-jittered ray, so DoF jitter can push genuine hits slightly past MISS_DIST. The
    //   margin absorbs that without flipping real hits to "sky".
    float alphaOut = (uOutputPass > 0.5 && uOutputPass < 1.5)
        ? step(depth, MISS_DIST - 100.0)
        : depth;
    pc_fragColor = vec4(finalCol, alphaOut);
}
`;
};
