import type { KernelFeatures } from './kernel';

/** The injectable GLSL sections of the DE kernel, by splice point. All optional —
 *  an absent section emits nothing. */
export interface DEMasterOptions {
    /** Pre-loop state init (formula loopInit — e.g. MB3D scratch floats). */
    loopInit?: string;
    /** Code injected at the top of each DE iteration loop, before the main formula
     *  (geometry burning-mode mix, coloring geometric-trap accumulation). */
    perIterInject?: string;
    distOverrideInit?: string;
    distOverrideInLoopFull?: string;
    distOverrideInLoopGeom?: string;
    distOverridePostFull?: string;
    distOverridePostGeom?: string;
    postMapCode?: string;
    postDistCode?: string;
    /** Kernel feature gates — DE_MASTER reads `numericDE`: when true, map()/mapDist()
     *  estimate distance from a FIXED-ITERATION final-radius (Rout) finite difference
     *  (re-iterating perturbed seeds at the center point's escape count) instead of the
     *  analytic getDist(r, dr). For formulas with no/wrong analytic dr. Float32-robust
     *  port of MB3D CalcDEnoADE (Calc.pas:445-523). When false, NOTHING changes — the
     *  analytic path is byte-identical. @see docs/adr/0085 */
    kernel?: KernelFeatures;
    /** 4D formula (MB3D deOption 5/6): `z.w` is a real 4th SPATIAL coordinate the
     *  formula iterates + carries forward, not the DE derivative. MB3D's DE numerator
     *  and escape bailout are the 4D radius `Sqrt(x²+y²+z²+w²)` (Rout); GMT defaults to
     *  the 3D `length(z.xyz)`, which flattens w-direction surface detail (missing bulbs).
     *  When set, the DE radius `r` and the escape bailout include `z.w`. Coloring/orbit-trap
     *  stay 3D (they operate on the 3D projection). @see emitFusedHybrid wIsCoord. */
    is4D?: boolean;
}

export const DE_MASTER = (
    formulaBody: string,
    getDistBody: string,
    options: DEMasterOptions = {},
) => {
    const {
        loopInit = '',
        perIterInject = '',
        distOverrideInit = '',
        distOverrideInLoopFull = '',
        distOverrideInLoopGeom = '',
        distOverridePostFull = '',
        distOverridePostGeom = '',
        postMapCode = '',
        postDistCode = '',
        kernel = {},
        is4D = false,
    } = options;
    const numericDE = !!kernel.numericDE;
    // 4D DE (deOption 5/6): the DE radius + escape bailout use the full 4D magnitude
    // (incl. z.w) to match MB3D's Sqrt(Rout); otherwise the 3D length drops w-direction
    // surface detail. `length(z)` is Euclidean 4D (MB3D has no distance-metric option).
    const rExpr = is4D ? 'length(z)' : 'getLength(z.xyz)';
    const bail4 = is4D ? 'dot(z, z)' : 'dot(z.xyz, z.xyz)';

    // --- Numerical (finite-difference) DE support (emitted only when numericDE) ---
    // Port of MB3D CalcDEnoADE (Calc.pas:445-523), conditioned for WebGL2 float32.
    //
    //   centerCount(p) — run the orbit with the NORMAL bailout; return the iteration count at
    //     which the CENTER escaped (capped at uIterations) = MB3D's ItResultI. This FIXED count
    //     is what every perturbed sample re-runs, making Rout a SMOOTH function of the seed (no
    //     per-sample escape-iteration jump → cause A).
    //   iterateLogRadius(p, fixedIters) — run that fixed count (no early-escape break, just a
    //     float32 overflow guard) and return ln(Rout), the LOG of the final radius². The finite
    //     difference is taken on ln(Rout), NOT Rout — this is the float32-robust equivalent of
    //     MB3D's raw-Rout difference (derivation below) and the fix for the est7 "black scene".
    //   numericDistance(p, epsScale) — DE = L0·dDEscale·e / (√ΣΔ(ln Rout)² + e·0.06), floored at
    //     footprint·0.25 (MB3D msDEstop·0.25), where L0 = ln(R0). uNumDEeps carries dDEscale
    //     (MB3D's per-scene magnitude). The probe e in the numerator makes the magnitude
    //     PROBE-INVARIANT (g ∝ e cancels e) so the auto footprint probe never needs per-scene
    //     retuning (cause C) and uNumDEeps is a pure magnitude knob.
    //   numericNormal(p, eps) — central-difference ln(Rout) at the shared fixed count; Rout (and
    //     so ln Rout) INCREASES outward (escaping side) so the outward normal is +∇ln(Rout)
    //     (same direction as +∇Rout — ln is monotonic — but never collapses to zero).
    //   numProbe/numFootprint — AUTO-DERIVED probe from the view footprint (zoom-scaled,
    //     quality-param-free; MB3D's StepWidth-scaled mctDEoffset).
    //
    // WHY difference ln(Rout) and not Rout (the est7 black-scene fix, 2026-07-02): the raw-Rout
    // form returned min(dot, cap). A FAST or HIGH-POWER escaper (Mandelbulb z^8, but also the
    // no-ADE escape targets Oxnot/Aexion in the hybrid weave) overshoots the inflated cap in one
    // step, so the CENTRE and all 3 perturbed taps clamp to the IDENTICAL cap value → g=0 →
    // DE = R0·ln(R0)·e/(0 + e·0.06) explodes (~1e8) → every ray leaps to infinity → BLANK. MB3D
    // never hits this (float64, no clamp). The log form is the float32-safe ALGEBRAIC EQUIVALENT
    // of MB3D: since ΔRout ≈ Rout·Δ(ln Rout), MB3D's bufRout·ln(bufRout)/√Σ(ΔRout)² equals
    // ln(bufRout)/√Σ(Δln Rout)² — the huge bufRout cancels top and bottom, for BOUNDED and
    // ESCAPING orbits alike. ln(dot) is compressed to ≤ ln(1e30)=69, so distinct taps stay
    // distinct → no saturation, no catastrophic cancellation. Validated in debug/sim-numeric-de3.mts
    // (Mandelbulb MISS→HIT at the true surface; DE tracks the analytic DE with a flat ratio).
    // None of these touch the colouring globals (g_geomTrap/g_orbitTrap), so map() can call
    // them after its own coloured orbit without corrupting the trap snapshot. @see docs/adr/0085.
    const numericFns = numericDE ? `
// numFootprint(p): the local view footprint at p — pixel-size × camera distance
// (perspective) or constant (ortho), the same geometric scale trace.ts uses for its hit
// threshold but WITHOUT the uPixelThreshold / uDetail quality factors. Zoom-invariant,
// quality-param-free basis for the auto probe + the DE floor (cause C). @see docs/adr/0085.
float numFootprint(vec3 p) {
    bool ortho = (uCamType > 0.5 && uCamType < 1.5);
    float fp = ortho ? uPixelSizeBase : uPixelSizeBase * length(p - uCameraPosition);
    return max(fp, 1.0e-7);
}

// numProbe(p, epsScale): MB3D's mctDEoffset (≈ StepWidth-scaled 4-point probe), mapped to GMT
// — the view footprint supplies the probe scale (zoom-scaled, quality-param-free), capped at
// 0.004 near the camera (MB3D's Min(msDEstop·0.1, 0.004)) and floored so the ΔRout finite
// difference stays float32-resolvable. epsScale widens it for shadows/AO (2.5×). The DE is
// probe-INVARIANT in magnitude (the probe cancels), so this never needs per-scene retuning
// (cause C) — the magnitude knob is uNumDEeps (the dDEscale). @see docs/adr/0085.
float numProbe(vec3 p, float epsScale) {
    return max(min(numFootprint(p), 0.004) * epsScale, 1.0e-5);
}

// centerCount(p): run the orbit with the NORMAL bailout; return the completed-iteration count
// at which the CENTER escaped (capped at uIterations) — MB3D's ItResultI (Calc.pas:473). This
// is the FIXED count every perturbed sample then re-runs, which makes the differenced Rout a
// SMOOTH function of the seed (no per-sample escape-iteration jump → cause A). Does NOT touch
// the colouring globals. @see docs/adr/0085.
int centerCount(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    float iter = 0.0;

    ${distOverrideInit}
    ${loopInit}

    float bailout = max(uDeBailout, 1.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${perIterInject}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (dot(z.xyz, z.xyz) > bailout) return i;   // escaped before iteration i
            #endif

            ${formulaBody}

            applyPostRotation(z.xyz);

        iter += 1.0;

        if (dr > 1.0e10 || dot(z.xyz, z.xyz) > bailout) return i + 1;

        ${distOverrideInLoopGeom}
    }

    return int(uIterations);
}

// iterateLogRadius(p, fixedIters): the SAME orbit body run a FIXED count, returning ln(Rout)
// (log of the final radius²). The per-sample early-escape break is REMOVED; the ITERATION COUNT
// is the real terminator, with only a float32 OVERFLOW guard (dot > 1e30). We return the LOG,
// not Rout, and difference the log downstream: differencing ln(Rout) is the float32-robust
// equivalent of MB3D's raw-Rout difference (the huge Rout cancels — see the block comment above),
// and it never saturates. The old min(dot, cap) form clamped fast/high-power escapers to an
// identical cap → g=0 → DE explosion → black scene (fixed here). ln compresses any magnitude to
// ≤ ln(1e30)=69, so distinct taps stay distinct. @see docs/adr/0085.
float iterateLogRadius(vec3 p, int fixedIters) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    float iter = 0.0;

    ${distOverrideInit}
    ${loopInit}

    float ovf = 1.0e30;   // float32 overflow guard (well below FLT_MAX; log compresses it to ≤69)

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= fixedIters) break;

        ${perIterInject}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            ${formulaBody}

            applyPostRotation(z.xyz);

        iter += 1.0;

        if (dot(z.xyz, z.xyz) > ovf) break;   // overflow guard (count is the terminator)

        ${distOverrideInLoopGeom}
    }

    // ln(Rout). Tiny lower bound keeps the gradient alive for BOUNDED/IFS orbits (Rout∈(0,1) →
    // ln<0 → DE<0 → floored, matching MB3D's bufRout·ln(bufRout)<0 → floor). @see docs/adr/0085.
    return log(clamp(dot(z.xyz, z.xyz), 1.0e-12, ovf));
}

// numericDistance(p, epsScale): MB3D CalcDEnoADE estimate (Calc.pas:503), float32-robust LOG
// reformulation. The center sets the count; the 3 axis-perturbed samples re-run that SAME count;
// difference ln(Rout). DE = L0·dDEscale·e / (√ΣΔ(ln Rout)² + e·0.06), floored at 0.25× the HIT
// THRESHOLD (see below), where L0 = ln(R0). This equals MB3D's R0·ln(R0)·dDEscale/(√ΣΔRout²+off)
// with the huge R0 cancelled top-and-bottom — so it never saturates (the black-scene fix; the
// old raw-Rout form clamped fast escapers to g=0 → DE explosion → blank). uNumDEeps carries
// MB3D's dDEscale (per-scene magnitude). The probe e in the numerator makes the magnitude
// PROBE-INVARIANT (g = |Δln Rout| ∝ e and e·0.06 both scale with e, so e cancels) → e supplies
// world units, the probe never needs per-scene retuning, uNumDEeps is a pure magnitude knob.
// R0<1e-200 (MB3D d1em200 guard, Calc.pas:455) and bounded Rout<1 fall out naturally: ln→≤0 →
// de≤0 → floored. epsScale: map() passes 1.0 (sharp silhouette), mapDist() passes 2.5 (wider).
//
// THE FLOOR IS 0.25× GMT's HIT THRESHOLD, not 0.25× the raw footprint. MB3D floors at
// msDEstop·0.25 where msDEstop IS its hit threshold (a floored DE < msDEstop still registers a
// hit). GMT's hit threshold (trace.ts) is numFootprint·(uPixelThreshold/effectiveDetail) — a
// SMALLER fraction of the footprint. The original numFootprint·0.25 port therefore EXCEEDED the
// threshold whenever uPixelThreshold/effectiveDetail < 0.25 (e.g. the Mandelbulb preset's
// pixelThreshold=0.2 → threshold=fp·0.13 < floor=fp·0.25): the floored DE could never drop below
// the hit threshold → every ray missed → BLACK. Flooring at 0.25× the actual threshold restores
// MB3D's "floor sits a quarter below the hit distance" invariant at any quality setting. @see docs/adr/0085.
float numericDistance(vec3 p, float epsScale) {
    float fp = numFootprint(p);
    // GMT's hit threshold (mirror of trace.ts:204-208): footprint × pixelThreshold ÷ effectiveDetail.
    float effDetail = uDetail / max(uInternalScale, 1.0e-4);
    float hitThresh = fp * (uPixelThreshold / max(effDetail, 1.0e-4));
    float floorDE = hitThresh * 0.25;              // MB3D msDEstop·0.25, mapped to GMT's threshold
    int nC = centerCount(p);
    float L0 = iterateLogRadius(p, nC);            // ln(R0)
    float e = numProbe(p, epsScale);
    float dLx = iterateLogRadius(p + vec3(e, 0.0, 0.0), nC) - L0;
    float dLy = iterateLogRadius(p + vec3(0.0, e, 0.0), nC) - L0;
    float dLz = iterateLogRadius(p + vec3(0.0, 0.0, e), nC) - L0;
    float g = sqrt(dLx * dLx + dLy * dLy + dLz * dLz);
    float de = L0 * uNumDEeps * e / (g + e * 0.06);
    return max(de, floorDE);
}

// Surface normal for the numeric estimator = the fixed-iteration ln(Rout) gradient direction.
// Finite-differencing the numeric DE (which is ITSELF a finite difference) gives difference-
// of-differences noise → flat/dark shading; the fixed-count ln(Rout) field is smooth (all taps
// share one count), so its gradient is a clean normal. After a FIXED count, points on the
// ESCAPING (outside) side reach a far larger Rout than bounded interior points → ln(Rout)
// increases OUTWARD → the outward normal is +∇ln(Rout) (same direction as +∇Rout since ln is
// monotonic, but robust: the raw-Rout gradient collapsed to zero for fast escapers). @see docs/adr/0085.
vec3 numericNormal(vec3 p, float eps) {
    // Probe a few× the pixel footprint eps GetNormal already computes — wide enough to stay
    // well-conditioned, narrow enough to keep real structure. eps SCALES with zoom
    // (≈pixelSize·dist) so it holds at deep zoom. CRITICAL: all six taps re-run the SAME shared
    // count nC — that shared count is what makes the field smooth (a per-tap count would
    // reintroduce the escape-iteration jump). CENTRAL differences on ln(Rout). @see docs/adr/0085.
    float e = max(eps * 3.0, 1.0e-7);
    int nC = centerCount(p);
    float Lxp = iterateLogRadius(p + vec3(e, 0.0, 0.0), nC);
    float Lxm = iterateLogRadius(p - vec3(e, 0.0, 0.0), nC);
    float Lyp = iterateLogRadius(p + vec3(0.0, e, 0.0), nC);
    float Lym = iterateLogRadius(p - vec3(0.0, e, 0.0), nC);
    float Lzp = iterateLogRadius(p + vec3(0.0, 0.0, e), nC);
    float Lzm = iterateLogRadius(p - vec3(0.0, 0.0, e), nC);
    vec3 grad = vec3(Lxp - Lxm, Lyp - Lym, Lzp - Lzm);
    if (dot(grad, grad) < 1.0e-20) return vec3(0.0, 1.0, 0.0);
    return normalize(grad);
}
` : ``;

    // map()/mapDist() distance: numeric path differences the fixed-count ln(Rout) over the auto
    // probe (numericDistance runs its own perturbed orbits); analytic path is byte-identical
    // to before. smoothIter stays map()'s own coloured-orbit iter.
    // The PRIMARY (silhouette) probe width is uNumDESmooth (quality.numDESmooth, default 2.5): the
    // escape field is chaotic in deep/high-nC regions, so a narrow ×1 probe makes the DE flip
    // hit↔miss under sub-probe jitter → deep sections FLICKER black. A wider probe averages the
    // sub-footprint chaos → stable silhouette, trading some deep-detail sharpness. @see docs/adr/0085.
    const mapDistResult = numericDE
        ? `float finalD = numericDistance(p, uNumDESmooth);
    smoothIter = iter;`
        : `vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;
    smoothIter = distRes.y;`;
    // mapDist() drives shadows + AO + raymarched reflections: use a WIDER probe (2.5×) than
    // map()'s silhouette (1.0) for a smoother, lower-frequency gradient → softer shadows.
    // (A ×4 secondary silhouette→distance correction was tried to counter AO over-occlusion at
    // very high AO intensity, but it amplified secondary-ray noise at normal settings — reverted.
    // At default AO/shadow intensities the un-scaled secondary DE reads correctly.) @see docs/adr/0085.
    const mapDistGeomResult = numericDE
        ? `float finalD = numericDistance(p, 2.5);`
        : `vec2 distRes = getDist(r, safeDr, iter, z);

    float finalD = distRes.x;`;

    return `
${getDistBody}
${numericFns}

// --- CORE ESTIMATOR (Coloring & Geometry) ---
// Returns: vec4(distance, trap_distance, iteration_count, decomposition_angle)
vec4 map(vec3 p) {
    // 1. Apply Precision Offset
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);

    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    float trap = 1e10;
    g_orbitTrap = vec4(1e10);
    g_geomTrap = 1e10;

    float iter = 0.0;
    float smoothIter = 0.0;

    float decomp = 0.0;
    float lastLength = 0.0;
    bool decompCaptured = false;

    // Color iteration limit: snapshot coloring state at boundary (branchless)
    vec4 savedOrbitTrap = vec4(1e10);
    float savedTrap = 1e10;
    float savedGeomTrap = 1e10;
    float savedIter = 0.0;

    ${distOverrideInit}
    ${loopInit}

    bool escaped = false;
    // Absolute raymarch bailout (uDeBailout, default 100), decoupled from the
    // escape/coloring threshold. High = accurate analytic DE, sharp surfaces;
    // low = early bail that slices the fractal into shells (overstep artifacts
    // by design). When bailout < uEscapeThresh the decomp/potential capture
    // below never fires — accepted tradeoff for the slicing effect. Floored at
    // 1.0 so |z|² stays ≥ 1 (keeps log-based DEs well-defined).
    float bailout = max(uDeBailout, 1.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${perIterInject}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            float r2_check = dot(z.xyz, z.xyz);

            if (!decompCaptured && r2_check > uEscapeThresh) {
                decomp = atan(z.y, z.x) * INV_TAU + 0.5;
                lastLength = sqrt(r2_check);
                decompCaptured = true;
            }

            // --- OPTIMIZATION: EARLY BAILOUT ---
            // Check if point has escaped BEFORE running expensive math (pow/sin/cos).
            // Some formulas (JuliaMorph) opt-out of this via define.
            #ifndef SKIP_PRE_BAILOUT
            if (r2_check > bailout) {
                escaped = true;
                break;
            }
            #endif

            ${formulaBody}

            applyPostRotation(z.xyz);

        // Count completed iterations. After uIterations runs iter == uIterations,
        // which matches Fragmentarium's n counter used in explicit getDist expressions.
        iter += 1.0;

        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));

        // Geometric trap — accumulates here (post-formula, pre-snapshot) so
        // it shares z state + snapshot timing with g_orbitTrap above. The
        // older per-iter-inject position fired BEFORE the formula step and
        // its skip-iter-0 guard left savedGeomTrap at 1e10 for low
        // uColorIter, freezing the trap to a flat constant. Self-contained
        // formulas thread their own trap math through their inner loop and
        // gate this block off via SELF_CONTAINED_SDE (core_math.ts).
#if defined(TRAP_ENABLED) && !defined(SELF_CONTAINED_SDE)
        {
            vec3 _d = z.xyz - uTrapCenter;
            float _td;
            int _ts = int(uTrapShape + 0.1);
            if (_ts == 1)      _td = length(_d);
            else if (_ts == 2) _td = abs(length(_d) - uTrapRadius);
            else if (_ts == 3) _td = min(min(abs(_d.x), abs(_d.y)), abs(_d.z));
            else               _td = abs(dot(z.xyz, uTrapNormal) - uTrapOffset);
            g_geomTrap = min(g_geomTrap, _td);
        }
#endif

        // Color iteration snapshot. Direct if-assignment (rather than mix
        // with a 0/1 gate) lets fxc co-locate savedX with the running X
        // in the same register: with mix, savedX was both an operand and
        // a destination on every iter, forcing a separate live range.
        // Audit Tier 2 / compile #3.
        if (iter <= uColorIter) {
            savedOrbitTrap = g_orbitTrap;
            savedTrap      = trap;
            savedGeomTrap  = g_geomTrap;
            savedIter      = iter;
        }

        if (!decompCaptured && r2 > uEscapeThresh) {
            decomp = atan(z.y, z.x) * INV_TAU + 0.5;
            lastLength = sqrt(r2);
            decompCaptured = true;
        }

        if (dr > 1.0e10 || ${is4D ? 'dot(z, z)' : 'r2'} > bailout) {
            escaped = true;
            break;
        }

        ${distOverrideInLoopFull}
    }

    float r = ${rExpr};
    float safeDr = max(abs(dr), 1.0e-10);

    if (!decompCaptured) {
        decomp = atan(z.y, z.x) * INV_TAU + 0.5;
        lastLength = r;
    }

    ${mapDistResult}

    ${distOverridePostFull}

    // Restore saved coloring state if color iteration limit was active
    // When uColorIter > 0, use the frozen snapshot; otherwise keep full-iteration values
    float useColorSnap = step(0.5, uColorIter);
    g_orbitTrap = mix(g_orbitTrap, savedOrbitTrap, useColorSnap);
    trap = mix(trap, savedTrap, useColorSnap);
    g_geomTrap = mix(g_geomTrap, savedGeomTrap, useColorSnap);

    // Persist the capped geometric trap into g_geomTrapFinal so the colour
    // sampler reads the value at the actual hit point. mapDist() (called
    // later for normals / shadows / AO) resets g_geomTrap and re-accumulates
    // it from a different position, which is why we need the side channel.
    // Standard g_orbitTrap doesn't need this — mapDist never writes to it.
    g_geomTrapFinal = g_geomTrap;

    // Color mode 8 = LLI (Last Length Iteration) decomposition — needs lastLength from escape check
    bool useLLI = (abs(uColorMode - 8.0) < 0.1) || (abs(uColorMode2 - 8.0) < 0.1);
#ifdef USE_TEXTURE
    if (uUseTexture > 0.5) {
        if (abs(uTextureModeU - 8.0) < 0.1) useLLI = true;
        if (abs(uTextureModeV - 8.0) < 0.1) useLLI = true;
    }
#endif
    float outTrap = useLLI ? lastLength : trap;

    // --- FEATURE INJECTION: POST-MAP (accumulative) ---
    // Variables in scope: p_fractal, finalD, decomp, smoothIter, outTrap
    ${postMapCode}

    // When color iteration limit is active, use capped iter for normalized coloring value
    float colorIterNorm = mix(smoothIter / max(1.0, uIterations), savedIter / max(1.0, uColorIter), useColorSnap);
    return vec4(finalD, outTrap, colorIterNorm, decomp);
}

// --- OPTIMIZED GEOMETRY-ONLY ESTIMATOR ---
// Strips out all Orbit Trap, Coloring, Decomposition, and Smoothing logic.
// Used for Shadows, AO, and Normals.
float mapDist(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);

    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));

    float dr = 1.0;
    // We still need 'trap' for formula signatures, but the compiler will DCE it since we don't return it.
    float trap = 1e10;
    g_geomTrap = 1e10;

    // Add missing iter definition for compatibility with loopInit chunks that might expect it
    float iter = 0.0;

    ${distOverrideInit}
    ${loopInit}

    // Geometry-only twin of map()'s bailout — see that comment for the rationale.
    float bailout = max(uDeBailout, 1.0);

    // Geometry Loop
    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;

        ${perIterInject}

        // --- Main Formula ---
            applyPreRotation(z.xyz);

            #ifndef SKIP_PRE_BAILOUT
            if (${bail4} > bailout) break;
            #endif

            ${formulaBody}

            applyPostRotation(z.xyz);

        // Track completed iterations so getDist expressions that use iter
        // (e.g. r * pow(Scale, -iter)) receive the correct count for shadow marching.
        iter += 1.0;

        if (dr > 1.0e10 || ${bail4} > bailout) break;

        ${distOverrideInLoopGeom}
    }

    float r = ${rExpr};
    float safeDr = max(abs(dr), 1.0e-10);

    ${mapDistGeomResult}

    ${distOverridePostGeom}

    // --- FEATURE INJECTION: POST-DIST (accumulative) ---
    ${postDistCode}

    return finalD;
}

// Wrapper for Coloring
vec4 DE(vec3 p_ray) {
    return map(p_ray + uCameraPosition);
}

// Wrapper for Geometry (Shadows/AO/Normals)
float DE_Dist(vec3 p_ray) {
    return mapDist(p_ray + uCameraPosition);
}`;
};
