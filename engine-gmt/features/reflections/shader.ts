
import { getVNDFSamplerGLSL } from '../../shaders/chunks/vndf';

export interface ReflectionsGLSLOptions {
    /** Compile-gate for the damped-bisection hit refinement — armed from the quality
     *  feature's 'Surface Refinement' toggle (refineEnabled, ADR-0084), same gate as
     *  the primary march. When off, NO GLSL for it is emitted (no extra DE_Dist call
     *  site) and the marcher is byte-identical to the un-refined version. */
    refine?: boolean;
    /** Compile-gate for true surface colour at reflected hits (the feature's own
     *  'Accurate Colors' toggle): one full DE() call at the single exit point fills
     *  refHit.yzw with real trap/iter/decomposition data instead of zeros (which fall
     *  back to the gradient's default colour). Off = no extra map() call site. */
    accurateColors?: boolean;
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

// Candidate-recovery confidence range, in multiples of the hit threshold. A ray
// that ends its budget having passed within this many footprints of a surface is
// treated as a GRADED hit (quadratic fade from full trust at 1× to env at 6×)
// rather than a binary MISS — the cone-coverage reading: within ~6 footprints,
// the pixel's reflection cone did clip that surface. Tune here, not per-scene.
#define REFL_RECOVERY_RANGE 6.0

// Reflection-bounce raymarcher — MB3D-faithful (ADR-0094, the reflection twin of
// the unified marcher, ADR-0092/0093; candidate recovery + graded fade: ADR-0095;
// multi-bounce / segment fog / accurate colours: ADR-0096).
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
vec4 traceReflectionRay(vec3 ro, vec3 rd, float dPrimary, out float reflFade) {
    float t = 0.0; // Caller biases ro along normal — no skip needed here
    reflFade = 1.0; // full confidence on a real hit; graded on candidate recovery

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

    // Closest-approach candidate (trace.ts overstep-recovery twin, pure ALU).
    float minRatio = 1.0e10; // min h/finalEps seen along the ray
    float candT = -1.0;      // ray parameter at that closest approach

    float hitT = -1.0;       // resolved hit parameter — single exit point below

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
            // HIT: Retreat by half the last DE to land nearer the surface.
            float tHit = t - h * 0.5;
${refineBlock}
            // Floor at floatPrecision: a legitimate contact hit on the very first
            // sample must still return a positive t (refHit.x > 0.0 is the caller's
            // hit test) — scale-aware, unlike a fixed epsilon.
            hitT = max(tHit, floatPrecision);
            break;
        }

        // Track the closest approach in threshold multiples — non-hit steps only
        // (a hit returns above). Ties resolve to the EARLIEST/nearest surface.
        float ratio = h / finalEps;
        if (ratio < minRatio) {
            minRatio = ratio;
            candT = max(t, floatPrecision); // keep a t=0 candidate returnable (x > 0 hit test)
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

    // Budget exhausted (or ray left the scene) without a hit. A binary MISS here
    // paints env colour into pixels whose neighbours hit — the "dotty" speckle;
    // MB3D never has this failure mode because its reflected rays march unbounded
    // (CalcSR.pas repeat-loop runs to Zend). GMT keeps the step budget but snaps
    // to the closest-approach candidate with GRADED confidence: reflFade 1 at
    // ratio 1 falling quadratically to 0 at REFL_RECOVERY_RANGE, so reflected
    // silhouettes blend smoothly toward env instead of flipping hit/miss per
    // frame under the VNDF jitter (MB3D's fade-not-cutoff idiom, cf. its
    // (t/maxLen)^8 falloffs). Deliberately NOT tied to uOverstepTolerance — that
    // is a default-0 scene-repair knob for the primary march; for a reflection
    // ray, recovery is always the lesser evil vs a guaranteed-wrong env leak.
    if (hitT < 0.0 && candT > 0.0 && minRatio < REFL_RECOVERY_RANGE) {
        float f = 1.0 - (minRatio - 1.0) / (REFL_RECOVERY_RANGE - 1.0);
        f = clamp(f, 0.0, 1.0);
        reflFade = f * f;
        if (reflFade > 0.001) hitT = candT;
    }

    if (hitT > 0.0) {
        ${options.accurateColors
            ? `// 'Accurate Colors' (gated): ONE full map() at the resolved hit fills the
        // trap/iter/decomposition channels so the reflected surface samples its true
        // colour. The march itself stays on geometry-only DE_Dist — this is the only
        // full-DE call site the gate adds.
        vec4 hitData = DE(ro + rd * hitT);
        return vec4(hitT, hitData.yzw);`
            : `// Trap channels zeroed: the reflected surface colours from the gradient's
        // default — visually close for gradient-driven scenes. The 'Accurate Colors'
        // toggle compiles a true colour lookup here instead.
        return vec4(hitT, 0.0, 0.0, 0.0);`}
    }
    return vec4(-1.0); // MISS
}
    `;
};
