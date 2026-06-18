
import { getVNDFSamplerGLSL } from '../../shaders/chunks/vndf';

export const getReflectionsGLSL = () => {
    // Static GLSL upper bound. WebGL2 requires `for` loops with constant
    // bounds; this is the unrolling ceiling the driver sees. uReflSteps (the
    // user slider, max 128 — see index.ts steps.max) controls the actual
    // runtime cap via `if (i >= limit) break`. Keeping this aligned with the
    // slider max avoids the driver generating code paths that can't run, and
    // measurably trims D3D11 HLSL→DXBC compile time.
    const MAX_REFL_STEPS = 128;

    return `
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

#define REFL_HIT_THRESHOLD 0.002

// ------------------------------------------------------------------
// REFLECTION SAMPLING HELPERS
// Self-contained (no dependency on the lighting-shared chunk, which the
// non-Cook-Torrance Direct build omits). Only emitted under the Raymarched
// reflection mode — never compiled on the Balanced/Env-map path. The clamp /
// luminance helpers are refl-local (the PT path has its own clampByLuminance);
// the VNDF sampler is shared with the PT bounce via getVNDFSamplerGLSL, emitted
// here under a refl-prefixed name. The two integrators are mutually exclusive
// shaders, so no symbol collides even in Ultra (PT + raymarch).
// ------------------------------------------------------------------

float reflLuminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Firefly clamp — caps a single reflection sample's Rec.709 luminance at
// uPTMaxLuminance (the shared "Firefly Clamp" control). Without this, a
// jittered reflection ray landing on a bright highlight spikes and never
// averages out across accumulation frames.
vec3 clampReflLum(vec3 c) {
    float l = reflLuminance(c);
    return c * min(1.0, uPTMaxLuminance / max(l, 0.001));
}

// GGX VNDF reflection-direction sampler (bounded spherical caps) — shared with
// the path tracer's bounce sampler via one emitter, so the algorithm has a
// single source of truth. The two integrators are mutually exclusive shaders,
// so emitting it under a refl-prefixed name here and as sampleGGXVNDF in the PT
// chunk never collides.
${getVNDFSamplerGLSL('sampleReflVNDF')}

// Lightweight Raymarcher for Reflection Bounce
vec4 traceReflectionRay(vec3 ro, vec3 rd) {
    float t = 0.0; // Caller biases ro along normal — no skip needed here

    // Dynamic loop
    int limit = uReflSteps;

    for(int i=0; i<${MAX_REFL_STEPS}; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use Geometry-only estimator for marching
        // This skips Orbit Traps, Decomposition, and Color Smoothing logic
        float d = DE_Dist(ro + rd * t);

        if(d < REFL_HIT_THRESHOLD * t) {
            // HIT: Retreat by half the last step to refine surface position.
            // Use DE_Dist (geometry-only) for the refinement — saves an
            // expensive full DE() call. The trap/iter data we'd lose is only
            // used downstream to drive gradient-texture color sampling at the
            // reflection hit; for the common case (gradient-driven surface)
            // returning vec4(0) for trap data falls back to the gradient's
            // default colour, which is visually close to the actual reflected
            // colour for default scenes. If pixel-perfect reflection colour
            // matters, swap back to DE().
            float refinedT = t - d * 0.5;
            return vec4(refinedT, 0.0, 0.0, 0.0);
        }
        t += d;
        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `;
};
