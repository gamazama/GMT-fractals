

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
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise, float surfEps, float epsRate) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist, float surfEps, float epsRate) { return 1.0; }
        `;
    }

    const MAX_SHADOW_STEPS = 512;

    return `
// ------------------------------------------------------------------
// SHADOWS (soft march — runtime Lite / HQ via uShadowQuality)
// Shadow rays march with the SAME MB3D-faithful convergence dynamics as the
// primary trace (overstep clamp + RSFmul damper + msDEsub, ADR-0092): a
// non-Lipschitz / over-estimating DE otherwise lets the shadow ray launch
// past the thin surfaces the main march resolves → light leaks / missing
// self-shadowing on exactly the scenes the faithful marcher targets.
//
// UNIT NORMALIZATION (@see docs/adr/0093): every constant in this march is in
// multiples of surfEps — the primary march's finalEps at the shadow-ray
// origin (cone-traced pixel footprint, floored by float precision; computed by
// the caller). MB3D achieves the same by marching in stepWidth-normalized
// units (CalcHardShadow.pas), so its floors/offsets shrink with zoom. The
// previous absolute world-unit constants (0.05 start / 0.05 step floor /
// 0.005 hit / 0.01 jitter) stepped clean over ALL visible geometry at high
// zoom — shadows silently vanished once the viewport spanned < ~0.05 world
// units.
//
// CONE THRESHOLD (MB3D ZZ2 twin, CalcHardShadow.pas:374,401-402): the hit
// threshold grows with the ray's VIEW-DEPTH change, not its own travel:
//   eps(t) = surfEps + epsRate·t,  epsRate = epsPerDist·dot(rd, viewDir)
// so shadow resolution tracks primary-trace resolution at whatever screen
// depth the shadow ray currently sits (rays toward the camera get FINER,
// floored at 0.1·surfEps; ortho passes epsRate = 0).
// ------------------------------------------------------------------
float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise, float surfEps, float epsRate) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    // uShadowQuality: <0.5 = HQ (Robust IQ penumbra), else Lite (fast step-floor).
    bool hq = uShadowQuality < 0.5;
    float fudge = hq ? uFudgeFactor : 1.0;
    float ph    = 1.0e10;   // previous-step distance, HQ triangulation only

    // MB3D-faithful march state (clamp + damper, CalcThread.pas:223-230)
    float rLastDE = 0.0;
    float rLastStep = 0.0;
    float rSF = 1.0;
    bool  primed = false;

    // Start offset + banding jitter, in surface-footprint units (preserves the
    // legacy Lite ratios: start = 10×hit, jitter = 2×hit — but now zoom-aware).
    float t = hq ? (0.5 + 2.0 * noise) * surfEps
                 : (10.0 + 2.0 * noise) * surfEps;

    int limit = uShadowSteps;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        // Overstep clamp + RSFmul damper — same dynamics as the primary trace.
        if (primed) {
            h = min(h, rLastDE + rLastStep);
            if (rLastDE > h + 1.0e-30) {
                float rT = rLastStep / (rLastDE - h);
                rSF = (rT < 1.0) ? max(0.5, rT) : 1.0;
            } else { rSF = 1.0; }
        }
        rLastDE = h;

        // View-depth cone threshold (see header). Floor keeps toward-camera
        // rays positive and bounded.
        float eps = max(0.1 * surfEps, surfEps + epsRate * t);

        if (hq) {
            // HQ / Robust — IQ + Aaltonen penumbra correction: triangulate the
            // true closest approach between the previous and current samples
            // (removes silhouette banding on smooth DEs). GUARD: on abrupt-DE
            // formulas (folding boxes — Mandelbox / AmazingSurf, whose DE jumps
            // between steps) h can exceed 2*ph → y>h → the triangulation is
            // degenerate (dseg=0 → spurious BLACK, the "over-dark box fractal"
            // bug). Use the IQ refinement only when valid (y<h AND y<t; t>0 is
            // guaranteed by the eps-scaled start); else fall back to the plain
            // h/t ratio. @see https://iquilezles.org/articles/rmshadows/
            if(h < eps) return 0.0;
            float y = h * h / (2.0 * ph);
            float pen = (y < h && y < t) ? (sqrt(h * h - y * y) / (t - y)) : (h / t);
            res = min(res, k * pen);
            ph = h;
            if (res < 0.005) return 0.0;
            // Faithful step: safety-subtract + damp (floor keeps the step positive).
            float stepW = max(eps * 0.5, (h - uMb3dDEsub * eps) * fudge * rSF);
            rLastStep = stepW;
            primed = true;
            t += stepW;
        } else {
            // Lite — step-floored march (no penumbra triangulation). The
            // 10·eps floor accelerates grazing-angle marches (~2x faster)
            // and dominates the damper most steps; the clamp above still stops
            // non-Lipschitz DE spikes launching the ray through geometry.
            // Early-out when res saturates (it only decreases via the min()).
            if(h < eps) return 0.0;
            res = min(res, k * h / t);
            if (res < 0.005) return 0.0;
            float stepW = max(h * rSF, 10.0 * eps);
            rLastStep = stepW;
            primed = true;
            t += stepW;
        }

        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

float GetHardShadow(vec3 ro, vec3 rd, float lightDist, float surfEps, float epsRate) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;

    // MB3D-faithful march state (clamp + damper — same dynamics as the primary
    // trace; the PT binary-visibility ray must not tunnel through thin surfaces).
    float rLastDE = 0.0;
    float rLastStep = 0.0;
    float rSF = 1.0;
    bool  primed = false;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

        if (primed) {
            h = min(h, rLastDE + rLastStep);
            if (rLastDE > h + 1.0e-30) {
                float rT = rLastStep / (rLastDE - h);
                rSF = (rT < 1.0) ? max(0.5, rT) : 1.0;
            } else { rSF = 1.0; }
        }
        rLastDE = h;

        // View-depth cone threshold (see GetSoftShadow header).
        float eps = max(0.1 * surfEps, surfEps + epsRate * t);

        if(h < eps) return 0.0;

        float stepW = max(eps * 0.5, (h - uMb3dDEsub * eps) * fudge * rSF);
        rLastStep = stepW;
        primed = true;
        t += stepW;

        if(t > lightDist) return 1.0;
    }

    return 1.0;
}
`;
};

export const LIGHTING_SHADOWS = getShadowsGLSL(true);
