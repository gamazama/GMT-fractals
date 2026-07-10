
import { getVNDFSamplerGLSL } from '../../shaders/chunks/vndf';

export interface ReflectionsGLSLOptions {
    /** Compile-gate for the damped-bisection hit refinement — armed from the quality
     *  feature's 'Surface Refinement' toggle (refineEnabled, ADR-0084), same gate as
     *  the primary march. When off, NO GLSL for it is emitted (no extra DE_Dist call
     *  site) and the marcher is byte-identical to the un-refined version. */
    refine?: boolean;
}

export const getReflectionsGLSL = (options: ReflectionsGLSLOptions = {}) => {
    // Static GLSL upper bound. WebGL2 requires `for` loops with constant
    // bounds; this is the unrolling ceiling the driver sees. uReflSteps (the
    // user slider, max 128 — see index.ts steps.max) controls the actual
    // runtime cap via `if (i >= limit) break`. Keeping this aligned with the
    // slider max avoids the driver generating code paths that can't run, and
    // measurably trims D3D11 HLSL→DXBC compile time.
    const MAX_REFL_STEPS = 128;

    // Damped-bisection hit refinement (the ADR-0084 refine twin for the reflection
    // march; MB3D runs the same iDEAddSteps bisection on reflected hits, CalcSR.pas:539).
    // The coarse march only BRACKETS the surface: the previous sample was outside the
    // threshold, this one is inside — bisect the ray parameter onto the DE==finalEps
    // crossing so reflected normals/shading evaluate ON the surface, not past it.
    // Emitted ONLY when the quality 'Surface Refinement' gate is compiled in — the
    // extra DE_Dist call site stays out of un-refined builds. uRefineActive is the
    // instant runtime on/off (loop compiled but skipped at 0).
    const refineBlock = options.refine
        ? `            if (uRefineActive > 0.5 && primed) {
                float tOut = t - lastStep;   // last sample outside the threshold
                float tIn  = t;              // this sample is inside
                for (int j = 0; j < REFINE_HARD_CAP; j++) {
                    if (j >= int(uRefineSteps)) break;
                    float tMid = 0.5 * (tOut + tIn);
                    if (DE_Dist(ro + rd * tMid) < finalEps) tIn = tMid; else tOut = tMid;
                }
                tHit = tIn;
            }
`
        : ``;

    return `
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

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

// Firefly clamp with a SOFT knee (shared "Firefly Clamp" control, uPTMaxLuminance).
// A hard clamp maps every bright reflection sample to exactly the ceiling, which
// flattens bright reflected regions; instead we pass luminance ≤ t through and
// compress the excess toward an asymptote of 2·t (monotonic → relative contrast
// preserved, extreme spikes still bounded). Mirrors the PT clampByLuminance.
// @see docs/adr/0071
vec3 clampReflLum(vec3 c) {
    float l = reflLuminance(c);
    float t = uPTMaxLuminance;
    if (l <= t) return c;
    float ln = t + t * (1.0 - exp(-(l - t) / t));   // -> 2·t as l -> inf
    return c * (ln / max(l, 0.001));
}

// GGX VNDF reflection-direction sampler (bounded spherical caps) — shared with
// the path tracer's bounce sampler via one emitter, so the algorithm has a
// single source of truth. The two integrators are mutually exclusive shaders,
// so emitting it under a refl-prefixed name here and as sampleGGXVNDF in the PT
// chunk never collides.
${getVNDFSamplerGLSL('sampleReflVNDF')}

// Reflection-bounce raymarcher — MB3D-faithful (ADR-0094, the reflection twin of
// the unified marcher, ADR-0092/0093).
//
// THRESHOLD: the reflected ray CONTINUES the primary view cone. The hit epsilon
// is the pixel footprint at (primary travel + reflected travel), floored by the
// float-precision minimum — so at t=0 it equals the primary hit's finalEps and
// never collapses. (The old model, 0.002·t measured from the reflector, went to
// zero at contact: reflections of adjacent geometry stalled the march, burned all
// steps and returned MISS, leaking env colour exactly where a mirror should show
// the neighbouring surface.) MB3D does the same by carrying the primary view
// depth ZZ into the reflected march: msDEstop = DEstop·(1+|ZZ|·DEstopFactor),
// ZZ += step·cos(view,refl) — CalcSR.pas:393-405.
//
// STEP: the unified MB3D step dynamics (trace.ts, ADR-0092) — uFudgeFactor step
// divisor + uMb3dDEsub safety-subtraction + Lipschitz overstep clamp + RSFmul
// damper — so reflected geometry agrees with primary geometry on non-Lipschitz /
// over-estimating fused DEs (MB3D imports) instead of tunneling into dust.
// MB3D's CalcRay marches reflections with literally the primary step code.
vec4 traceReflectionRay(vec3 ro, vec3 rd, float dPrimary) {
    float t = 0.0; // Caller biases ro along normal — no skip needed here

    // Dynamic loop
    int limit = uReflSteps;

    // Frame-constant threshold ingredients (trace.ts "Precision" twin).
    vec3 worldOriginOffset = uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
    float epsK = uPixelThreshold / (uDetail / uInternalScale);
    bool ortho = (uCamType > 0.5 && uCamType < 1.5);

    // MB3D faithful-step state (trace.ts mb3dDeclare twin).
    float lastDE = 0.0;      // DE at the previous march point
    float lastStep = 0.0;    // previous step width (world units)
    float rsf = 1.0;         // RSFmul convergence damper, clamped to [0.5, 1.0]
    bool primed = false;     // skip clamp/damper on the first sample (no history yet)

    for(int i=0; i<${MAX_REFL_STEPS}; i++) {
        if (i >= limit) break;

        vec3 pos = ro + rd * t;

        // OPTIMIZATION: Use Geometry-only estimator for marching
        // This skips Orbit Traps, Decomposition, and Color Smoothing logic
        float h = DE_Dist(pos);

        // Float-precision floor at this point (trace.ts precisionLogic, high path).
        float floatPrecision = max(1.0e-20, length(pos + worldOriginOffset) * PRECISION_RATIO_HIGH);
        // View-cone continuation: footprint at the TOTAL path length. Ortho rays
        // have a constant per-pixel footprint, matching the primary march.
        float pixelFootprint = ortho ? uPixelSizeBase : uPixelSizeBase * (dPrimary + t);
        float finalEps = max(pixelFootprint * epsK, floatPrecision);

        // MB3D overstep clamp + RSFmul damper (trace.ts mb3dPreHit twin).
        if (primed) {
            h = min(h, lastDE + lastStep);               // clamp a non-Lipschitz DE jump
            if (lastDE > h + 1.0e-30) {
                float conv = lastStep / (lastDE - h);
                rsf = (conv < 1.0) ? max(0.5, conv) : 1.0;
            } else { rsf = 1.0; }
        }

        if (h < finalEps) {
            // HIT: Retreat by half the last DE to land nearer the surface. The
            // march uses DE_Dist (geometry-only) throughout — the trap/iter data
            // we'd lose is only used downstream to drive gradient-texture color
            // sampling at the reflection hit; for the common case (gradient-driven
            // surface) returning vec4(0) for trap data falls back to the gradient's
            // default colour, which is visually close to the actual reflected
            // colour for default scenes. If pixel-perfect reflection colour
            // matters, swap back to DE().
            float tHit = t - h * 0.5;
${refineBlock}
            // Floor at floatPrecision: a legitimate contact hit on the very first
            // sample must still return a positive t (refHit.x > 0.0 is the caller's
            // hit test) — scale-aware, unlike a fixed epsilon.
            return vec4(max(tHit, floatPrecision), 0.0, 0.0, 0.0);
        }

        lastDE = h;
        // MB3D step: safety-subtract a fraction of the hit threshold, scale by the
        // step divisor (uFudgeFactor = MB3D sZstepDiv), damp by RSFmul — identical
        // dynamics to the primary march (trace.ts mb3dStep, no stochastic jitter).
        float stepW = max(floatPrecision * 0.5, (h - uMb3dDEsub * finalEps) * uFudgeFactor * rsf);
        lastStep = stepW;
        primed = true;
        t += stepW;

        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `;
};
