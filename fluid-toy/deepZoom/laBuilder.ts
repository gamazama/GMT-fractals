/**
 * LA table construction. Two-pass algorithm ported from FractalShark
 * `LAReference::CreateLAFromOrbit` (stage 0) and `CreateNewLAStage`
 * (stages 1+).
 *
 * Stage 0 walks the reference orbit, greedily extending an LA via
 * `Step` until period detection fires; flushes, restarts. Each leaf
 * LA covers a contiguous run of iterations.
 *
 * Stage N+1 walks stage-N's LAs, greedily composing pairs via
 * `Composite` until period detection fires; flushes. Each higher-stage
 * LA covers many lower-stage LAs (and thus many iters at once). The
 * tree continues until a stage produces ≤1 LA — that's the root.
 *
 * At runtime the shader walks stages from outermost (largest skips)
 * inward; phase 6 wires that up. Phase 5 just builds the table.
 */

import {
    type Complex,
    type LAInfoDeep,
    cChebyNorm,
    compositeLA,
    detectPeriod,
    initLAInfoDeep,
    isLAThresholdZero,
    isZCoeffZero,
    newLAInfoDeep,
    stepLA,
} from './LAInfoDeep';
import { type LAParameters, defaultLAParameters } from './laParameters';

/** One stage of the LA tree. Tells the runtime where this stage's
 *  LAs live in the flat `m_LAs` array and how many of them there are. */
export interface LAStage {
    /** Index in the LAs array where this stage's first LA sits. */
    laIndex: number;
    /** Number of LAs in this stage (the runtime walks them in sequence). */
    macroItCount: number;
}

/** Output of the construction pass. */
export interface LATable {
    /** All LAs, all stages, packed into one array. Stage boundaries
     *  recorded in `stages`. */
    las: LAInfoDeep[];
    /** Per-stage metadata. `stages[0]` is the leaf level (smallest skips);
     *  `stages[stages.length-1]` is the root (largest skips). */
    stages: LAStage[];
    /** Total reference orbit length the table was built for. */
    refOrbitLength: number;
    /** True if construction completed (ran to maxRefIteration). False if
     *  bailed early on a degenerate orbit. */
    valid: boolean;
}

/** Read Z[i] from the orbit Float32Array (RGBA32F packed: re, im, |z|², 0). */
const readOrbit = (orbit: Float32Array, i: number): Complex => ({
    re: orbit[i * 4 + 0],
    im: orbit[i * 4 + 1],
});

const LOW_BOUND = 64;
const PERIOD_DIVISOR = 2;
const MAX_LA_STAGES = 1024;

/**
 * Stage 0 build: greedy walk of the reference orbit producing leaf LAs.
 *
 * The control flow mirrors FractalShark's `CreateLAFromOrbit`. Key
 * subtlety: when period is first detected, we go through a "settling"
 * phase that picks the period length; then iterate again with that
 * period as the macro window size.
 */
const buildStage0 = (
    orbit: Float32Array,
    maxRefIteration: number,
    params: LAParameters,
    out: LATable,
): boolean => {
    out.las.length = 0;
    out.stages.length = 0;
    out.stages.push({ laIndex: 0, macroItCount: 0 });

    // Initial LA (Ref = z[0] = 0) followed by one Step using z[1].
    let LA = initLAInfoDeep(readOrbit(orbit, 0), params);
    {
        const stepped = newLAInfoDeep();
        stepLA(LA, readOrbit(orbit, 1), stepped, params);
        LA = stepped;
    }

    if (isZCoeffZero(LA)) return false;  // degenerate (e.g. orbit pinned at 0)

    let nextStageLAIndex = 0;
    let i = 2;
    let period = 0;

    // First period-detection scan.
    for (; i < maxRefIteration; i++) {
        const candidate = newLAInfoDeep();
        const periodDetected = stepLA(LA, readOrbit(orbit, i), candidate, params);
        if (!periodDetected) {
            LA = candidate;
            continue;
        }
        // Period detected at iter `i`. Flush the LA up to here.
        period = i;
        LA.StepLength = period;
        LA.NextStageLAIndex = nextStageLAIndex;
        out.las.push(LA);
        nextStageLAIndex = i;

        // Re-seed for the next pass. FractalShark advances by either 1
        // or 2 iterations depending on whether the next slot can fit
        // another LA without going past maxRefIteration.
        if (i + 1 < maxRefIteration) {
            const seed = initLAInfoDeep(readOrbit(orbit, i), params);
            const stepped = newLAInfoDeep();
            stepLA(seed, readOrbit(orbit, i + 1), stepped, params);
            LA = stepped;
            i += 2;
        } else {
            LA = initLAInfoDeep(readOrbit(orbit, i), params);
            i += 1;
        }
        break;
    }

    let periodBegin = period;
    let periodEnd = period === 0 ? 0 : periodBegin + period;

    if (period === 0) {
        // Orbit didn't trigger period detection over the whole maxIter
        // range. Fall back to a length-based macro window: "n-th root"
        // partition matching FractalShark behaviour.
        if (maxRefIteration > LOW_BOUND) {
            const seed = initLAInfoDeep(readOrbit(orbit, 0), params);
            const stepped = newLAInfoDeep();
            stepLA(seed, readOrbit(orbit, 1), stepped, params);
            LA = stepped;
            nextStageLAIndex = 0;
            i = 2;
            const nthRoot = Math.round(Math.log2(maxRefIteration) / PERIOD_DIVISOR);
            period = Math.round(Math.pow(maxRefIteration, 1 / nthRoot));
            periodBegin = 0;
            periodEnd = period;
        } else {
            // Tiny orbit — single LA covers the whole thing.
            LA.StepLength = maxRefIteration;
            LA.NextStageLAIndex = nextStageLAIndex;
            out.las.push(LA);
            const tail = initLAInfoDeep(readOrbit(orbit, maxRefIteration), params);
            tail.StepLength = 0;
            out.las.push(tail);
            out.stages[0].macroItCount = 1;
            return false;
        }
    } else if (period > LOW_BOUND) {
        // Period was very long — use n-th root partitioning instead of
        // raw period to keep stage-0 LAs from being too big.
        out.las.pop();
        const seed = initLAInfoDeep(readOrbit(orbit, 0), params);
        const stepped = newLAInfoDeep();
        stepLA(seed, readOrbit(orbit, 1), stepped, params);
        LA = stepped;
        nextStageLAIndex = 0;
        i = 2;
        const nthRoot = Math.round(Math.log2(maxRefIteration) / PERIOD_DIVISOR);
        period = Math.round(Math.pow(maxRefIteration, 1 / nthRoot));
        periodBegin = 0;
        periodEnd = period;
    }

    // Second pass: walk to maxRefIteration, flushing on period detect
    // OR when we hit the macro window boundary.
    for (; i < maxRefIteration; i++) {
        const candidate = newLAInfoDeep();
        const periodDetected = stepLA(LA, readOrbit(orbit, i), candidate, params);

        if (!periodDetected && i < periodEnd) {
            LA = candidate;
            continue;
        }

        LA.StepLength = i - periodBegin;
        LA.NextStageLAIndex = nextStageLAIndex;
        out.las.push(LA);
        nextStageLAIndex = i;
        periodBegin = i;
        periodEnd = periodBegin + period;

        const ip1 = i + 1;
        const detected = ip1 < maxRefIteration
            ? detectPeriod(candidate, readOrbit(orbit, ip1), params)
            : true;

        if (detected || ip1 >= maxRefIteration) {
            LA = initLAInfoDeep(readOrbit(orbit, i), params);
        } else {
            const seed = initLAInfoDeep(readOrbit(orbit, i), params);
            const stepped = newLAInfoDeep();
            stepLA(seed, readOrbit(orbit, ip1), stepped, params);
            LA = stepped;
            i++;
        }
    }

    LA.StepLength = i - periodBegin;
    LA.NextStageLAIndex = nextStageLAIndex;
    out.las.push(LA);

    out.stages[0].macroItCount = out.las.length;

    // Sentinel tail: the runtime walks NextStageLAIndex links and needs
    // a terminator after the last real LA. Matches FractalShark which
    // pushes one final LA with the maxRefIteration ref value.
    const tail = initLAInfoDeep(readOrbit(orbit, maxRefIteration), params);
    tail.StepLength = 0;
    out.las.push(tail);

    return true;
};

/** Build one higher-level stage by composing pairs of the previous
 *  stage's LAs. Returns true if the stage is non-trivial (multiple
 *  LAs); false signals "we've reduced to ≤1 LA, stop here". */
const buildNextStage = (
    orbit: Float32Array,
    maxRefIteration: number,
    params: LAParameters,
    out: LATable,
): boolean => {
    const prevStage = out.stages.length - 1;
    const currentStage = out.stages.length;
    if (currentStage >= MAX_LA_STAGES) return false;

    const prevStageLAIndex = out.stages[prevStage].laIndex;
    const prevStageMacroItCount = out.stages[prevStage].macroItCount;

    const newStageStart = out.las.length;
    out.stages.push({ laIndex: newStageStart, macroItCount: 0 });

    // Prime: compose the first two LAs of the previous stage.
    const prevLA0 = out.las[prevStageLAIndex];
    const prevLA1 = out.las[prevStageLAIndex + 1];
    let LA = newLAInfoDeep();
    compositeLA(prevLA0, prevLA1, LA, params);
    let nextStageLAIndex = 0;
    let i = prevLA0.StepLength + prevLA1.StepLength;
    let j = 2;

    let period = 0;

    // First scan — find the first period-detect to anchor the macro window.
    for (; j < prevStageMacroItCount; j++) {
        const candidate = newLAInfoDeep();
        const prevLAj = out.las[prevStageLAIndex + j];
        const periodDetected = compositeLA(LA, prevLAj, candidate, params);

        if (periodDetected) {
            if (isLAThresholdZero(prevLAj)) break;
            period = i;
            LA.StepLength = period;
            LA.NextStageLAIndex = nextStageLAIndex;
            out.las.push(LA);
            nextStageLAIndex = j;

            const prevLAjp1 = out.las[prevStageLAIndex + j + 1];
            const detected = j + 1 < prevStageMacroItCount
                ? detectPeriod(candidate, prevLAjp1.Ref, params)
                : true;
            if (detected || j + 1 >= prevStageMacroItCount) {
                LA = { ...prevLAj };
                i += prevLAj.StepLength;
                j++;
            } else {
                const composed = newLAInfoDeep();
                compositeLA(prevLAj, prevLAjp1, composed, params);
                LA = composed;
                i += prevLAj.StepLength + prevLAjp1.StepLength;
                j += 2;
            }
            break;
        }
        LA = candidate;
        i += prevLAj.StepLength;
    }

    let periodBegin = period;
    let periodEnd = period === 0 ? 0 : periodBegin + period;

    if (period === 0) {
        const prevStageStepLength = out.las[prevStageLAIndex].StepLength;
        if (maxRefIteration > prevStageStepLength * LOW_BOUND) {
            // Length-based fallback partitioning.
            const composed = newLAInfoDeep();
            compositeLA(prevLA0, prevLA1, composed, params);
            LA = composed;
            i = prevLA0.StepLength + prevLA1.StepLength;
            nextStageLAIndex = 0;
            j = 2;
            const ratio = maxRefIteration / prevStageStepLength;
            const nthRoot = Math.round(Math.log2(maxRefIteration) / PERIOD_DIVISOR);
            period = prevStageStepLength * Math.round(Math.pow(ratio, 1 / nthRoot));
            periodBegin = 0;
            periodEnd = period;
        } else {
            // Reduced to one LA — stage is trivial, stop the tree.
            LA.StepLength = maxRefIteration;
            LA.NextStageLAIndex = nextStageLAIndex;
            out.las.push(LA);
            const tail = initLAInfoDeep(readOrbit(orbit, maxRefIteration), params);
            tail.StepLength = 0;
            out.las.push(tail);
            out.stages[currentStage].macroItCount = 1;
            return false;
        }
    } else if (period > out.las[prevStageLAIndex].StepLength * LOW_BOUND) {
        // Period was huge — re-partition.
        out.las.pop();
        const composed = newLAInfoDeep();
        compositeLA(prevLA0, prevLA1, composed, params);
        LA = composed;
        i = prevLA0.StepLength + prevLA1.StepLength;
        nextStageLAIndex = 0;
        j = 2;
        const prevStageStepLength = out.las[prevStageLAIndex].StepLength;
        const ratio = period / prevStageStepLength;
        const nthRoot = Math.round(Math.log2(maxRefIteration) / PERIOD_DIVISOR);
        period = prevStageStepLength * Math.round(Math.pow(ratio, 1 / nthRoot));
        periodBegin = 0;
        periodEnd = period;
    }

    // Second pass — walk the remaining stage-N LAs, flushing on period
    // detect or window boundary.
    for (; j < prevStageMacroItCount; j++) {
        const candidate = newLAInfoDeep();
        const prevLAj = out.las[prevStageLAIndex + j];
        const periodDetected = compositeLA(LA, prevLAj, candidate, params);

        if (periodDetected || i >= periodEnd) {
            LA.StepLength = i - periodBegin;
            LA.NextStageLAIndex = nextStageLAIndex;
            out.las.push(LA);
            nextStageLAIndex = j;
            periodBegin = i;
            periodEnd = periodBegin + period;

            const prevLAjp1 = out.las[prevStageLAIndex + j + 1];
            const detected = j + 1 < prevStageMacroItCount
                ? detectPeriod(candidate, prevLAjp1.Ref, params)
                : true;
            if (detected || j + 1 >= prevStageMacroItCount) {
                LA = { ...prevLAj };
            } else {
                const composed = newLAInfoDeep();
                compositeLA(prevLAj, prevLAjp1, composed, params);
                LA = composed;
                i += prevLAj.StepLength;
                j++;
            }
        } else {
            LA = candidate;
        }
        i += out.las[prevStageLAIndex + j].StepLength;
    }

    LA.StepLength = i - periodBegin;
    LA.NextStageLAIndex = nextStageLAIndex;
    out.las.push(LA);
    out.stages[currentStage].macroItCount = out.las.length - newStageStart;

    const tail = initLAInfoDeep(readOrbit(orbit, maxRefIteration), params);
    tail.StepLength = 0;
    out.las.push(tail);

    return true;
};

/** Largest |ZCoeff| or |CCoeff| we'll allow before considering a stage
 *  unsafe for the f32 shader path. The runtime evaluate computes
 *  `dz_pert = newdz·ZCoeff + dc·CCoeff`, then PO step needs
 *  `2·Z·dz_pert + dz_pert²`. With f32's ~3.4e38 max, dz_pert² caps
 *  dz_pert at ~1.8e19. Backsolving for dc·CCoeff staying under that
 *  for screen-typical |dc| down to ~1e-15: |CCoeff| ≤ ~1e10.
 *
 *  Insight from FractalShark: they don't have a plain-f32 BLA kernel
 *  at all — they use f64 (mandel_1x_double_perturb_bla) or HDR
 *  (mandel_1xHDR_*). f32's 7-digit mantissa simply runs out at deep
 *  zooms where perturbation matters, which is why their architecture
 *  uses higher-precision types. Without f64 in WebGL2 our practical
 *  ceiling is f32-safe coefficients; this cap keeps stages within
 *  that envelope and the runtime descends past the rest. */
const F32_COEFF_LIMIT = 1e10;

/**
 * Trim higher stages whose LA coefficients exceed f32's safe range.
 * Higher stages cover more iters → their ZCoeff/CCoeff magnitudes grow
 * exponentially (Lyapunov accumulation) → eventually overflow f32. Once
 * overflowed, applying the LA produces Inf, which propagates into
 * dz_pert and silently breaks the escape check (NaN comparisons return
 * false → pixel reads as interior → grey square).
 *
 * We scan stages from innermost (stage 0) outward, finding the deepest
 * stage where every LA's coefficient magnitudes fit. Higher stages are
 * dropped — the runtime falls back to using whatever stage we keep.
 */
const trimUnsafeStages = (out: LATable): void => {
    let lastSafeStage = -1;
    for (let s = 0; s < out.stages.length; s++) {
        const stage = out.stages[s];
        let stageOk = true;
        for (let k = 0; k < stage.macroItCount; k++) {
            const la = out.las[stage.laIndex + k];
            const z = Math.max(Math.abs(la.ZCoeff.re), Math.abs(la.ZCoeff.im));
            const c = Math.max(Math.abs(la.CCoeff.re), Math.abs(la.CCoeff.im));
            if (!isFinite(z) || !isFinite(c) || z > F32_COEFF_LIMIT || c > F32_COEFF_LIMIT) {
                stageOk = false;
                break;
            }
        }
        if (stageOk) lastSafeStage = s;
        else break;
    }
    if (lastSafeStage < 0) {
        // Stage 0 itself overflowed — no safe LA usable. Mark invalid;
        // the runtime will skip LA entirely and fall straight to PO.
        out.valid = false;
        out.stages = [];
        out.las = [];
        return;
    }
    if (lastSafeStage < out.stages.length - 1) {
        out.stages = out.stages.slice(0, lastSafeStage + 1);
        // We don't trim the LAs array — unused tail nodes are wasted
        // memory but harmless (the runtime indexes via stages, not LAs
        // directly). At ~12 bytes/node × a few thousand nodes, it's
        // negligible. Could trim later if memory becomes a concern.
    }
};

/**
 * Top-level builder. Takes the reference orbit (RGBA32F-packed) and
 * produces the LA table by running stage-0 then iteratively building
 * higher stages until the merge tree collapses to one LA per stage.
 */
export const buildLATable = (
    orbit: Float32Array,
    refOrbitLength: number,
    params: LAParameters = defaultLAParameters(),
): LATable => {
    const out: LATable = {
        las: [],
        stages: [],
        refOrbitLength,
        valid: false,
    };

    // FractalShark's maxRefIteration is `count - 1` (last index).
    const maxRefIteration = refOrbitLength - 1;
    if (maxRefIteration <= 0) return out;

    out.valid = buildStage0(orbit, maxRefIteration, params, out);
    if (!out.valid) return out;

    // Build higher stages until merge tree collapses.
    while (
        out.stages.length < MAX_LA_STAGES &&
        out.stages[out.stages.length - 1].macroItCount > 1
    ) {
        const continued = buildNextStage(orbit, maxRefIteration, params, out);
        if (!continued) break;
    }

    // Drop stages with f32-unsafe coefficients. Must run AFTER full
    // build because each stage's coefficients are computed from the
    // previous stage's — we can't tell during construction whether a
    // stage will overflow without composing through it.
    trimUnsafeStages(out);

    return out;
};
