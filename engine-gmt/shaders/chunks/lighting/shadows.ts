

// Soft-shadow penumbra QUALITY is now a RUNTIME uniform (uShadowQuality):
//   < 0.5 → HQ / Robust  (IQ + Aaltonen analytic penumbra — accurate, ~2× slower)
//   else  → Lite         (step-floored march — fast)
// Both bodies compile in and a single uniform-coherent `if (hq)` selects one, so
// runtime cost = the selected path and switching HQ↔Lite needs NO recompile
// (same pattern as the jitter toggle — see pbr.ts). Lite/HQ compile identically,
// so bundling them is ~free. The dedicated binary "Hard" march is no longer a
// Direct path (Direct always uses this soft march; hardness = uShadowSoftness/k);
// GetHardShadow remains for the path-tracer's binary visibility.
export const getShadowsGLSL = (enabled: boolean) => {

    // ZERO-COST ABSTRACTION: if disabled, replace the functions with constants.
    if (!enabled) {
        return `
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;
    }

    const MAX_SHADOW_STEPS = 512;

    return `
// ------------------------------------------------------------------
// SHADOWS (soft march — runtime Lite / HQ via uShadowQuality)
// ------------------------------------------------------------------
float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    // uShadowQuality: <0.5 = HQ (Robust IQ penumbra), else Lite (fast step-floor).
    bool hq = uShadowQuality < 0.5;
    float t     = hq ? 0.0 : 0.05;
    float fudge = hq ? uFudgeFactor : 1.0;
    float ph    = 1.0e10;   // previous-step distance, HQ triangulation only

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        if (hq) {
            // HQ / Robust — IQ + Aaltonen penumbra correction: triangulate the
            // true closest approach between the previous and current samples
            // (removes silhouette banding on smooth DEs). GUARD: on abrupt-DE
            // formulas (folding boxes — Mandelbox / AmazingSurf, whose DE jumps
            // between steps) h can exceed 2*ph → y>h → the triangulation is
            // degenerate (dseg=0 → spurious BLACK, the "over-dark box fractal"
            // bug). Use the IQ refinement only when valid (y<h); else fall back
            // to the plain h/t ratio. @see https://iquilezles.org/articles/rmshadows/
            float thresh = max(1.0e-6, t * 0.0001);
            if(h < thresh) return 0.0;
            float y = h * h / (2.0 * ph);
            float pen = (y < h) ? (sqrt(h * h - y * y) / max(1.0e-5, t - y)) : (h / max(t, 1.0e-5));
            res = min(res, k * pen);
            ph = h;
            if (res < 0.005) return 0.0;
            t += h * fudge;
        } else {
            // Lite — step-floored march (no penumbra triangulation). The
            // max(h, 0.05) floor accelerates grazing-angle marches (~2x faster).
            // Early-out when res saturates (it only decreases via the min()).
            if(h < 0.005) return 0.0;
            res = min(res, k * h / t);
            if (res < 0.005) return 0.0;
            t += max(h, 0.05);
        }

        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        float thresh = max(1.0e-6, t * 0.0002);

        if(h < thresh) return 0.0;

        t += h * fudge;

        if(t > lightDist) return 1.0;
    }

    return 1.0;
}
`;
};

export const LIGHTING_SHADOWS = getShadowsGLSL(true);
