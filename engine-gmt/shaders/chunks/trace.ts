import type { KernelFeatures } from './kernel';

export interface TraceOptions {
    isMobile?: boolean;
    enableGlow?: boolean;
    precisionMode?: number;
    glowQuality?: number;
    /** Injected volume-integration code (per-step body / miss finalize). */
    volumeBodyCode?: string;
    volumeFinalizeCode?: string;
    functionName?: string;
    /** Kernel feature gates — the trace kernel reads `refine` (post-hit damped
     *  bisection, @see docs/adr/0084) and `mb3dFaithful` (MB3D marcher: overstep
     *  clamp + RSFmul damper + msDEsub, @see docs/adr/0088). When a gate is off,
     *  NO GLSL for it is emitted — the kernel is byte-identical to the plain march,
     *  so default scenes carry zero compile/runtime cost. */
    kernel?: KernelFeatures;
}

export const getTraceGLSL = (options: TraceOptions = {}) => {
    const {
        isMobile = false,
        enableGlow = false,
        precisionMode = 0,
        glowQuality = 0,
        volumeBodyCode = '',
        volumeFinalizeCode = '',
        functionName = 'traceScene',
        kernel = {},
    } = options;
    const enableRefine = !!kernel.refine;
    const enableMB3DFaithful = !!kernel.mb3dFaithful;

    const useLowPrecision = (precisionMode === 1) || isMobile;

    // Adaptive precision: epsilon scales with distance from fractal origin to prevent
    // floating-point artifacts at deep zoom. The ratio (5e-7 high / 1e-5 low) determines
    // minimum detail size relative to distance — lower ratio = finer detail but more noise.
    const precisionLogic = useLowPrecision ? `
        float floatPrecision = max(PRECISION_RATIO_LOW, distFromFractalOrigin * PRECISION_RATIO_LOW);  // Low precision: ~10 ppm
    ` : `
        float floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);  // High precision: ~0.5 ppm
    `;

    const missBlock = volumeFinalizeCode.trim().length > 0
        ? `vec3 p_end = ro + rd * d;
    h = map(p_end + uCameraPosition);
    h.x = MISS_DIST;
    vec3 p = p_end;
    ${volumeFinalizeCode}`
        : `h = vec4(MISS_DIST, 0.0, 0.0, 0.0);`;

    // Audit Tier 1 #1 (split map/mapDist in march loop) was tried and reverted:
    // the compiler already DCEs unused trap/iter/decomposition in map() because
    // h.y/h.z/h.w aren't read downstream when no volumetric body needs them.
    // Replacing the inner call with mapDist() saved nothing per-step but added
    // a redundant map() call at hit detection, net slower (+5%). See
    // bench-shader history 2026-05-02 for the regression run.
    const innerDistCall = `h = map(p + uCameraPosition);`;
    const hitFinalizeCall = ``;

    // --- Post-hit surface refinement (compile-gated; empty strings when off) ---
    // Three insertion points, all emitted ONLY when enableRefine. When off they
    // collapse to empty so the kernel source is byte-identical to the unrefined
    // march (strongest no-regression). @see docs/adr/0084
    //   1. refineDeclare  — carry the last OUTSIDE ray parameter across iterations.
    //   2. refineBlock    — the bisection itself, inside the hit block.
    //   3. refineRemember — record the outside sample just before each step advance.
    // Both declares carry their own trailing newline so an OFF gate collapses to
    // NOTHING (no stray blank line) — the off kernel stays byte-identical to the
    // pre-gate source. Guarded by test-trace-refine.mts ("dPrev-insert collapsed").
    const refineDeclare = enableRefine
        ? `    float dPrev = d;          // last OUTSIDE sample → bracket [dPrev,d] for the hit refine below\n`
        : ``;
    const refineBlock = enableRefine
        ? `            // --- MB3D-style damped-bisection SURFACE REFINEMENT ---
            // The coarse march only BRACKETS: dPrev was outside (h.x >= finalEps),
            // d is inside (h.x < finalEps). A non-Lipschitz / over-estimating fused
            // DE oversteps a thin or discontinuous surface, so the accepted overshoot
            // scatters into "dust"; bisecting the ray parameter onto the DE==finalEps
            // crossing lands a coherent near face instead. Compile-gated on the quality
            // 'Surface Refinement' toggle (refineEnabled). @see MB3D RMdoBinSearch
            // (Calc.pas:1641), docs/adr/0084. Note the forward-only "Edge Polish"
            // above could only push deeper past the crossing — this steps BACK onto it.
            // uRefineActive is the instant runtime on/off (loop compiled but skipped at 0).
            if (uRefineActive > 0.5) {
                float dOut = dPrev;           // outside  (h.x >= finalEps here)
                float dIn  = d;               // inside   (h.x <  finalEps)
                for (int j = 0; j < REFINE_HARD_CAP; j++) {
                    if (j >= int(uRefineSteps)) break;
                    float dMid = 0.5 * (dOut + dIn);
                    // geometry-only twin — distance is all the root-find needs; keeps
                    // the inline cheap (mapDist, not map) per docs/adr/0076.
                    float hMid = mapDist((ro + rd * dMid) + uCameraPosition);
                    if (hMid < finalEps) dIn = dMid; else dOut = dMid;
                }
                d = dIn;                      // refined near-face surface (like MB3D)
                // h.yzw (trap/iter/decomp colour) kept from the overshoot map() — the
                // nudge is sub-pixel so colour is visually identical (docs/adr/0076).
            }
`
        : ``;
    const refineRemember = enableRefine
        ? `dPrev = d;   // remember this outside sample before advancing the ray
        `
        : ``;

    // --- MB3D-FAITHFUL MARCHER (compile-gated; all three blocks empty when off) ---
    // Ports MB3D's live marcher CONVERGENCE DYNAMICS (TMandCalcThread.Execute,
    // CalcThread.pas:196-230) into GMT's world-unit march: the Lipschitz overstep
    // CLAMP (a DE that grew faster than the last step can't be trusted — reject the
    // non-Lipschitz spike), the RSFmul DAMPER (shrink the step toward 0.5 as the DE
    // collapses onto a surface), and the msDEsub safety-SUBTRACTION. Those three are
    // what stop an over-estimating / discontinuous fused DE from overshooting a thin
    // surface into "dust". NOTE: MB3D's absolute constants (s011 floor, msDEstop,
    // max-step clamp) are stepWidth-NORMALIZED units (mZZ/Zend live in stepWidth
    // space — mVgradsFOV is rotated by the stepWidth-scaled VGrads, Calc.pas:1220),
    // so they do NOT map to GMT's world-unit DE. We instead reuse GMT's world-unit
    // hit threshold (finalEps — cone-traced + DEstop-calibrated by the importer, the
    // world-unit twin of MB3D's msDEstop) and step floor (floatPrecision). The
    // depth-scaling of msDEstop is already supplied by GMT's cone tracing
    // (pixelFootprint ∝ d). @see docs/adr/0088, plans/mb3d/research/render-conversion-plan.md
    const mb3dDeclare = enableMB3DFaithful
        ? `    float mb3dRLastDE = 0.0;     // DE at the previous march point
    float mb3dRLastStep = 0.0;   // previous step width (world units)
    float mb3dRSF = 1.0;         // RSFmul convergence damper, clamped to [0.5, 1.0]
    bool  mb3dPrimed = false;    // skip clamp/damper on the first sample (no history yet)\n`
        : ``;
    const mb3dPreHit = enableMB3DFaithful
        ? `            // MB3D overstep clamp + RSFmul damper (CalcThread.pas:223-230)
            if (mb3dPrimed) {
                h.x = min(h.x, mb3dRLastDE + mb3dRLastStep);     // clamp a non-Lipschitz DE jump
                if (mb3dRLastDE > h.x + 1.0e-30) {
                    float mb3dT = mb3dRLastStep / (mb3dRLastDE - h.x);
                    mb3dRSF = (mb3dT < 1.0) ? max(0.5, mb3dT) : 1.0;
                } else { mb3dRSF = 1.0; }
            }
`
        : ``;
    const mb3dStep = enableMB3DFaithful
        ? `mb3dRLastDE = h.x;
            // MB3D step: safety-subtract a fraction of the hit threshold, scale by the
            // authored step divisor (uMb3dStepDiv = MB3D sZstepDiv), damp by RSFmul
            // (CalcThread.pas:200). uMb3dDEsub = MB3D msDEsub (iOptions bit 2; 0 when unset).
            float mb3dStepW = max(floatPrecision * 0.5, (h.x - uMb3dDEsub * finalEps) * uMb3dStepDiv * mb3dRSF);
            mb3dRLastStep = mb3dStepW;
            mb3dPrimed = true;
            d += mb3dStepW * stepJitter;`
        : `d += max(h.x, floatPrecision * 0.5) * currentFudge * stepJitter;`;

    return `
// ------------------------------------------------------------------
// STAGE 2: RAYMARCHING (Flattened & Optimized)
// ------------------------------------------------------------------

bool ${functionName}(vec3 ro, vec3 rd, out float d, out vec4 result, inout vec3 glow, float stochasticSeed, inout float volumetric, out vec3 fogScatter) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    // Pre-compute the world-origin offset once. uCameraPosition + uSceneOffset*
    // are all frame-constant and were being re-summed every march step at the
    // precision-check site below — moving the addition outside the loop saves
    // 2 vec3 adds per step per pixel (audit Tier 1).
    vec3 worldOriginOffset = uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
    vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
    vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
    if (bounds.x > bounds.y) { fogScatter = vec3(0.0); return false; }

    d = max(0.0, bounds.x);

    // 2. Flattened Accumulators
    vec3 accColor = vec3(0.0);
    vec3 accScatter = vec3(0.0); // Volumetric scatter (god rays) accumulator
    float accDensity = 0.0;
    float accAlpha = 0.0; // Scalar glow accumulator for Fast Mode
    
    // 3. Loop Config
    int limit = int(uMaxSteps);
    float maxMarch = MAX_DIST;
    
    // Temporary Hit holder (distance, trap, iter, decomp)
    vec4 h = vec4(0.0);

    // --- CANDIDATE TRACKING (Overstep Recovery) ---
    // Tracks the closest the ray ever got to a surface, normalized by the required precision at that depth.
    float minCandidateRatio = 1.0e10;
    float candidateD = -1.0;
    vec4 candidateH = vec4(0.0);
${refineDeclare}${mb3dDeclare}
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        
        // A. Distance Estimation
        // When no per-step volumetric body needs trap data, use mapDist() —
        // distance only, skipping orbit-trap mins / decomposition / smoothing.
        ${innerDistCall}
        
        // B. Volumetric Effects (Inlined Code Block)
        // Uses: d, h, p, accColor, accDensity, accAlpha
        ${volumeBodyCode}
        
        // C. Precision
        vec3 p_fractal_approx = p + worldOriginOffset;
        float distFromFractalOrigin = length(p_fractal_approx);
        
        ${precisionLogic}
        
        // Dynamic Epsilon (Cone Tracing). uPixelSizeBase is viewport-pixel size
        // (invariant to adaptive downscale — see UniformManager.syncFrame). The
        // uDetail / uInternalScale factor also cancels DPR from the threshold, so
        // uPixelThreshold means "fraction of a viewport pixel" across all scales.
        // Ortho: parallel rays → pixel footprint is constant.
        // Perspective/360: cone widens with distance → scale by d.
        float effectiveDetail = uDetail / uInternalScale;
        float pixelFootprint = (uCamType > 0.5 && uCamType < 1.5)
            ? uPixelSizeBase
            : uPixelSizeBase * d;
        float threshold = pixelFootprint * (uPixelThreshold / effectiveDetail);
        float finalEps = max(threshold, floatPrecision);
${mb3dPreHit}
        // D. Hit Detection
        if (h.x < finalEps) {

            // Populate full map() data (orbit-trap, iter, decomposition) once
            // at the hit point — only the distance was tracked through the
            // inner loop when innerVolumeBodyEmpty is true. No-op otherwise.
            ${hitFinalizeCall}

            // (Surface "Edge Polish" refinement removed 2026-06-19 — it was a
            // never-useful control, default-0 and inert, and its loop carried a
            // live mapDist inline worth ~1.2–1.7s of cold compile. @see docs/adr/0076)
${refineBlock}
            // Apply Final Volumetric Resolve (Inlined)
            vec3 p_final = ro + rd * d; 
            vec3 p = p_final; // Alias for volumeFinalizeCode
            ${volumeFinalizeCode}
            
            // Output
            glow = accColor;
            fogScatter = accScatter;
            volumetric = accDensity;
            result = h; // h.x is dist, h.yzw is trap data
            return true;
        }

        // E. Candidate Tracking
        if (uOverstepTolerance > 0.0) {
            float ratio = h.x / finalEps;
            // Capture the 'closest miss'
            if (ratio < minCandidateRatio) {
                minCandidateRatio = ratio;
                candidateD = d;
                // Snapshot the full map() result already computed this step so
                // recovery can reuse it instead of re-inlining map() below.
                candidateH = h;
            }
        }
        
        // F. Step Advance
        // (Dynamic "Step Relaxation" removed 2026-06-19 — never-useful control,
        // default-0 and inert; straight-line ALU so removal is compile-neutral.)
        float currentFudge = uFudgeFactor;

        // Stochastic step jitter: break up deterministic DE banding.
        // Asymmetric [1-jitter, 1.0] — biased short to avoid overshoot.
        // uStepJitter=0 disables (stepJitter=1.0). uStepJitter=0.15 is default.
        // Disabled during navigation for a clean image — banding
        // averages away once accumulation starts.
        // Stochastic step jitter — coprime hash constants (127.1, 31.7) prevent banding artifacts
        float stepJitter = uBlendFactor >= 0.99 ? 1.0 : (1.0 - uStepJitter) + uStepJitter * fract(stochasticSeed * 127.1 + d * 31.7);
        ${refineRemember}${mb3dStep}

        if (d > maxMarch) break;
    }
    
    // --- RECOVERY CHECK ---
    // If we missed, but we tracked a candidate that was within 'uOverstepTolerance' multiples of the threshold,
    // we assume we tunneled through a detailed surface and snap back to it.
    if (uOverstepTolerance > 0.0 && candidateD > 0.0) {
        // Example: If tolerance is 2.0, we accept misses that were within 2x the epsilon.
        // E.g. We missed with ratio 1.5, which is < 1.0 (hit) + 2.0 (tol).
        if (minCandidateRatio <= (1.0 + uOverstepTolerance)) {
             d = candidateD;
             // Re-evaluate map at the candidate position to get correct Trap/Color data
             // We can't trust 'h' because it's from the last missed step at infinity
             vec3 p_cand = ro + rd * d;
             // Reuse the full map() captured at the candidate step (same
             // position ro+rd*candidateD) — byte-identical to re-evaluating
             // map(p_cand), without re-inlining the heaviest body. @see docs/adr/0076
             result = candidateH;
             result.x = 0.0; // Force hit
             
             // Finalize volume for the recovered path? 
             // Strictly speaking we should, but for visual consistency we use the accumulated values.
             
             vec3 p = p_cand; // Alias for injected code which expects 'p'
             
             ${volumeFinalizeCode}
             glow = accColor;
             fogScatter = accScatter;
             volumetric = accDensity;
             return true;
        }
    }

    // MISS: Resolve volume at infinity
    ${missBlock}

    glow = accColor;
    fogScatter = accScatter;
    volumetric = accDensity;

    return false;
}
`;
};
