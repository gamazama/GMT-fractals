

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

    // Background = THE SKY (Solid / Gradient / Image via GetEnvMap) scaled by
    // Sky Visibility — a plain brightness dial, 0 → black backdrop (ADR-0098;
    // matches the path tracer's long-standing semantics). The old "fall back to
    // the flat Background Color at visibility 0" rule is GONE: a flat-colour
    // backdrop is now the Solid sky source.
    //
    // Camera-blur softening of the sky: a mip-LOD blur scaled by the DoF
    // aperture, ADDED on top of the aperture-jittered ray direction (rd, not
    // rdClean) so the sky keeps the same grain as the fractal's DoF. Sky is at
    // infinity → max defocus. Fourth-root curve calibrated to the LOG aperture
    // slider's practical range (0.001–0.1): 0.005 → lod ≈ 2.4 (visible),
    // 0.05 → ≈ 4.3 (strong), 1.0 → ≈ 8.5 (washed). Supersedes ADR-0072's
    // "capped to stay subtle" 0.4·sqrt curve — owner: camera blur must blur
    // the background MEANINGFULLY. uDOFStrength == 0 → skyBlur 0 → unchanged.
    float skyBlur = min(0.85, pow(uDOFStrength, 0.25) * 0.9);
    // Per-direction fog in-scatter (fogRadiance, ADR-0097): with Sky Tint up,
    // the fogged sky keeps its directional gradient instead of flattening.
    vec3 bgCol = mix(
        GetEnvMap(rd, skyBlur) * uEnvBackgroundStrength,
        fogRadiance(rd),
        clamp(uFogIntensity, 0.0, 1.0));

    vec3 col = bgCol;
    float d = 0.0;
    vec4 result = vec4(0.0);

    vec3 glow = vec3(0.0);
    vec3 fogScatter = vec3(0.0);
    float volumetric = 0.0;

    // Primary Ray Trace
    bool hit = traceScene(ro, rd, d, result, glow, stochasticSeed, volumetric, fogScatter);

    ${integrator}

    col = applyPostProcessing(col, d, rd, glow, volumetric, fogScatter);
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
