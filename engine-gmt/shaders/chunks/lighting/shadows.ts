

// qualityLevel: 1=Lite Soft, 2=Robust Soft, 3=Hard Only
export const getShadowsGLSL = (enabled: boolean, qualityLevel: number) => {

    // ZERO-COST ABSTRACTION:
    // If disabled, replace the entire complex function with a constant return.
    if (!enabled) {
        return `
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;
    }

    // Hard Only mode: compile only the hard shadow function, stub the soft one
    // This minimizes DE call sites — one loop instead of two
    if (qualityLevel === 3) {
        const MAX_HARD_STEPS = 512;
        return `
// ------------------------------------------------------------------
// SHADOWS (Hard Only — Fastest)
// ------------------------------------------------------------------
float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    if (uShadowIntensity < 0.001) return 1.0;

    // Enhanced sphere tracing (Keinert et al. 2014): over-relax each step by
    // OMEGA so the ray covers more open distance per DE tap, then guard against
    // overshoot — if the current and previous unbounding spheres fail to overlap
    // (radius + prevRadius < stepLength), undo the step and continue at the safe
    // (un-relaxed) radius. Reaches occluders in far fewer steps, which kills the
    // "ray exhaustion" cracks (march ran out of step budget before hitting the
    // caster) WITHOUT the light-leak/tunnelling a blind step floor risks.
    // Over-relaxation factor. Keinert over-relaxation is safe ONLY for DEs that
    // are proper distance bounds. A formula's fudgeFactor < 1 means its DE
    // OVERESTIMATES distance — set deliberately to stop slicing (e.g. Mandelbox /
    // AmazingSurf 0.5, Bristorbrot 0.6). Over-relaxing those tunnels surfaces →
    // false self-occlusion (over-dark) + slicing. So over-relax (1.6) only when
    // fudge>=1; otherwise step at the formula's conservative fudge (omega<1 → the
    // overlap check never fires → plain t += h*fudge, matching the soft march).
    float omega = uFudgeFactor >= 1.0 ? 1.6 : uFudgeFactor;
    float t = 0.01;
    float prevRadius = 0.0;
    float stepLength = 0.0;
    int limit = min(uShadowSteps, ${MAX_HARD_STEPS});

    for(int i = 0; i < ${MAX_HARD_STEPS}; i++) {
        if (i >= limit) break;

        float radius = DE_Dist(ro + rd * t);
        bool sorFail = omega > 1.0 && (radius + prevRadius) < stepLength;
        if (sorFail) {
            stepLength -= omega * stepLength;   // back out the overshoot
            omega = 1.0;                        // fall back to safe sphere tracing
        } else {
            if (radius < max(1.0e-5, t * 0.0005)) return 0.0;  // hit → occluded
            stepLength = radius * omega;
        }
        prevRadius = radius;
        t += stepLength;
        if (t > lightDist) return 1.0;
    }
    return 1.0;
}

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    return GetHardShadow(ro, rd, lightDist);
}
`;
    }

    const MAX_SHADOW_STEPS = 512;

    const settings = qualityLevel < 1.5 ? `
        float t = 0.05;
        float fudge = 1.0;
    ` : `
        float t = 0.0;
        float fudge = uFudgeFactor;
        float ph = 1.0e10;
    `;

    // Early-out when res saturates: GetSoftShadow returns clamp(res, 0, 1)
    // and `res` only ever decreases (min op). Once it drops below ~0.005 the
    // pixel is visually black; further marching can't change the output.
    // For deeply-shadowed surface points this skips most of the 128-step loop.
    const softLoopBody = qualityLevel < 1.5 ? `
            if(h < 0.005) return 0.0;
            res = min(res, k * h / t);
            if (res < 0.005) return 0.0;
            t += max(h, 0.05);
    ` : `
            float thresh = max(1.0e-6, t * 0.0001);
            if(h < thresh) return 0.0;
            // IQ + Aaltonen penumbra correction: triangulate the true closest
            // approach between the previous and current samples (removes silhouette
            // banding on smooth DEs). GUARD: on abrupt-DE formulas (folding boxes —
            // Mandelbox / AmazingSurf, whose DE jumps between steps) h can exceed
            // 2*ph → y>h → the triangulation is degenerate (dseg=0 → spurious BLACK,
            // the "over-dark box fractal" bug). Use the IQ refinement only when it's
            // valid (y<h); otherwise fall back to the plain h/t ratio.
            // @see https://iquilezles.org/articles/rmshadows/
            float y = h * h / (2.0 * ph);
            float pen = (y < h) ? (sqrt(h * h - y * y) / max(1.0e-5, t - y)) : (h / max(t, 1.0e-5));
            res = min(res, k * pen);
            ph = h;
            if (res < 0.005) return 0.0;
            t += h * fudge;
    `;

    return `
// ------------------------------------------------------------------
// SHADOWS (${qualityLevel < 1.5 ? 'Lite Soft' : 'Robust Soft'})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${settings}

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        ${softLoopBody}
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

export const LIGHTING_SHADOWS = getShadowsGLSL(true, 2);
