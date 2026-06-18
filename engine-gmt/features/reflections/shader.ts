

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
// reflection mode — never compiled on the Balanced/Env-map path. Names are
// refl-prefixed; the PT path keeps its own copies and the two integrators are
// mutually exclusive, so there is no symbol collision in ultra (PT + raymarch).
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

// Branchless orthonormal basis (Duff et al. 2017) — avoids the degenerate
// case of the naive cross-product basis at n.z ≈ -1.
void reflTangentBasis(vec3 n, out vec3 t, out vec3 b) {
    float s = n.z >= 0.0 ? 1.0 : -1.0;
    float a = -1.0 / (s + n.z);
    float c = n.x * n.y * a;
    t = vec3(1.0 + s * n.x * n.x * a, s * c, -s * n.x);
    b = vec3(c, s + n.y * n.y * a, -n.y);
}

// GGX visible-normal importance sampling via *bounded spherical caps*
// (Dupuy & Benyoub 2023, "Sampling Visible GGX Normals with Spherical Caps";
// bound from Eto & Tokuyoshi 2024, "Bounded VNDF Sampling for the Smith-GGX
// BRDF"). Returns a world-space half-vector drawn from the VNDF conditioned on
// viewDir. Sampling the VNDF (rather than a uniform cone around the mirror
// direction) makes the single-sample specular weight collapse to F * G1(L) —
// bounded, so it cannot produce the grazing-angle fireflies the old cone jitter
// sprayed, and it converges on the true glossy lobe. The spherical-cap method
// is cheaper than Heitz 2018 and never samples below the horizon; the bounded
// cap further tightens the z-range so fewer occluded normals are drawn on rough
// surfaces. Reduces exactly to the unbounded cap when k = 1.
vec3 sampleReflVNDF(vec3 n, vec3 viewDir, float roughness, vec2 u) {
    float alpha = roughness * roughness;  // perceptual roughness → GGX alpha
    vec3 t, b;
    reflTangentBasis(n, t, b);
    // View direction in tangent space (z-up = surface normal).
    vec3 wi = vec3(dot(viewDir, t), dot(viewDir, b), dot(viewDir, n));

    // Warp the view to the hemisphere configuration.
    vec3 wiStd = normalize(vec3(alpha * wi.x, alpha * wi.y, wi.z));

    // Bounded spherical cap: lower z bound -bnd instead of -wiStd.z.
    float phi = 6.28318530718 * u.x;
    float a2 = alpha * alpha;
    float s = 1.0 + length(wi.xy);  // isotropic; sgn omitted since alpha <= 1
    float s2 = s * s;
    float k = (1.0 - a2) * s2 / (s2 + a2 * wi.z * wi.z);
    float bnd = wi.z > 0.0 ? k * wiStd.z : wiStd.z;
    float z = (1.0 - u.y) * (1.0 + bnd) - bnd;
    float sinTheta = sqrt(clamp(1.0 - z * z, 0.0, 1.0));
    vec3 c = vec3(sinTheta * cos(phi), sinTheta * sin(phi), z);

    // Microfacet normal in hemisphere config → unwarp to ellipsoid → world.
    vec3 wmStd = c + wiStd;
    vec3 wm = normalize(vec3(alpha * wmStd.x, alpha * wmStd.y, wmStd.z));
    return normalize(t * wm.x + b * wm.y + n * wm.z);
}

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
