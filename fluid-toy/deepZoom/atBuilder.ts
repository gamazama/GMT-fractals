/**
 * AT (Approximation Terms) — front-loading the perturbed iteration as
 * a plain `z² + c'` loop in transformed coordinates.
 *
 * Each LA in the table represents `StepLength` iters as a bivariate
 * linear map; AT is the *closed form* of one such LA reinterpreted as
 * a standard Mandelbrot iteration with `c' = dc·CCoeff + RefC` and a
 * scaled escape radius. Running k AT steps covers `k·StepLength`
 * actual perturbation iterations — and each AT step is a single
 * complex square + add in plain f32 with zero texture reads. Massive
 * speedup at depth where the AT validity (`|dc| ≤ ThresholdC`) covers
 * most of the screen.
 *
 * Construction picks the *outermost* stage whose AT is "Usable" given
 * the screen's max |dc|² (the wider the coverage, the bigger the per-
 * step speedup). Stages whose coefficients are f32-unsafe are skipped
 * — same overflow guard as the LA cap in laBuilder.ts.
 *
 * Math ported from FractalShark `LAInfoDeep::CreateAT` + `ATInfo::Usable`.
 */

import {
    type Complex,
    type LAInfoDeep,
    cAdd,
    cChebyNorm,
    cMul,
    cSub,
} from './LAInfoDeep';
import type { LATable } from './laBuilder';

/** Runtime AT data — packed as uniforms when uploaded. ~9 floats
 *  total, easily a single uniform block (or 3 vec4s).  */
export interface ATInfo {
    /** How many actual perturbation iters one AT step covers. */
    stepLength: number;
    /** Per-pixel validity radius for dc. AT applies only to pixels with
     *  |dc|_cheby ≤ thresholdC. */
    thresholdC: number;
    /** Squared escape radius in AT's transformed-z space. */
    sqrEscapeRadius: number;
    /** Transformed reference C: c' = dc·ccoeff + refC. */
    refC: Complex;
    /** Transform multiplier on dc (composite of LA's ZCoeff and CCoeff). */
    ccoeff: Complex;
    /** Transform divisor for output: dz = z_at · invZCoeff. */
    invZCoeff: Complex;
}

/** Complex reciprocal: 1 / (a + bi) = (a - bi) / (a² + b²). */
const cReciprocal = (z: Complex): Complex => {
    const denom = z.re * z.re + z.im * z.im;
    if (denom === 0 || !isFinite(denom)) return { re: 0, im: 0 };
    return { re: z.re / denom, im: -z.im / denom };
};

/** Tight cap on AT coefficients — AT applies LA coefficients to a
 *  transformed c' and then transforms back via 1/ZCoeff. Each ulp of
 *  the round trip loses one digit of f32 precision per decimal-order
 *  of |ZCoeff|. With f32's 7-digit mantissa we want |ZCoeff| ≤ ~1e4
 *  to leave ~3 digits of headroom for adjacent-pixel resolution.
 *  Tighter than this would force AT onto stages with very few
 *  iters/step (no useful skip); looser produces visible block-pixel
 *  artefacts at the centre of deep views where adjacent pixels'
 *  dc·CCoeff differences fall below f32's precision floor. */
const F32_AT_COEFF_LIMIT = 1e4;
const F32_SAFE_FOR_AT = (z: Complex): boolean => {
    const m = Math.max(Math.abs(z.re), Math.abs(z.im));
    return isFinite(m) && m < F32_AT_COEFF_LIMIT;
};

/** Soft escape-radius limit. FractalShark uses 32·2^1 = 64 for the
 *  small-exponents case; we go a hair larger for slightly more headroom
 *  inside the AT loop before falling out to the slower paths. */
const AT_LIM = 4096;

/**
 * Derive an ATInfo from a single LA (the first LA of some stage) and
 * the next LA in the table (used for the transformed RefC).
 *
 * Returns null if any coefficient escapes f32-safe range — the runtime
 * can't use this stage's AT.
 */
const createATFromLA = (la: LAInfoDeep, next: LAInfoDeep): ATInfo | null => {
    if (!F32_SAFE_FOR_AT(la.ZCoeff) || !F32_SAFE_FOR_AT(la.CCoeff)) return null;
    if (la.LAThreshold === 0 || la.LAThresholdC === 0) return null;

    const ccoeff = cMul(la.ZCoeff, la.CCoeff);
    if (!F32_SAFE_FOR_AT(ccoeff)) return null;
    const invZCoeff = cReciprocal(la.ZCoeff);
    if (!isFinite(invZCoeff.re) || !isFinite(invZCoeff.im)) return null;

    const refC = cMul(next.Ref, la.ZCoeff);
    if (!F32_SAFE_FOR_AT(refC)) return null;

    const ccoeffNorm2 = ccoeff.re * ccoeff.re + ccoeff.im * ccoeff.im;
    const zCoeffNorm2 = la.ZCoeff.re * la.ZCoeff.re + la.ZCoeff.im * la.ZCoeff.im;

    const sqrEscapeRadius = Math.min(zCoeffNorm2 * la.LAThreshold, AT_LIM);
    const ccoeffCheby = cChebyNorm(ccoeff);
    const thresholdC = Math.min(la.LAThresholdC, ccoeffCheby > 0 ? AT_LIM / ccoeffCheby : Infinity);

    if (!isFinite(sqrEscapeRadius) || !isFinite(thresholdC)) return null;
    if (sqrEscapeRadius <= 4) return null;  // would always escape immediately

    return {
        stepLength: Math.max(1, la.StepLength),
        thresholdC,
        sqrEscapeRadius,
        refC,
        ccoeff,
        invZCoeff,
    };
};

/**
 * Test whether an AT covers the screen at the given max-|dc|².
 * Mirrors FractalShark's `ATInfo::Usable`. The `factor` (2^32 in their
 * code) accounts for the headroom we need beyond the bare ratio test.
 */
const isUsable = (at: ATInfo, sqrRadius: number): boolean => {
    const ccoeffNorm2 = at.ccoeff.re * at.ccoeff.re + at.ccoeff.im * at.ccoeff.im;
    const refCNorm2 = at.refC.re * at.refC.re + at.refC.im * at.refC.im;
    const factor = Math.pow(2, 32);
    const lhs = ccoeffNorm2 * sqrRadius * factor;
    return lhs > refCNorm2 && at.sqrEscapeRadius > 4;
};

/**
 * Pick the AT covering the *most* iters per AT step (largest StepLength)
 * among stages that pass the Usable test. Walks the table's stages
 * outermost first; first usable AT wins.
 *
 * Returns null when no stage qualifies — the runtime falls back to the
 * LA + PO paths without AT.
 */
export const buildAT = (table: LATable, screenSqrRadius: number): ATInfo | null => {
    if (!table.valid || table.stages.length === 0) return null;

    // Walk stages from outermost (largest skips) inward. First Usable
    // wins because that's the deepest fast-forward we can apply.
    for (let s = table.stages.length - 1; s >= 0; s--) {
        const stage = table.stages[s];
        if (stage.macroItCount < 1) continue;
        const firstLA = table.las[stage.laIndex];
        // The "next LA" sits one slot past — used for RefC. The table
        // includes a sentinel tail after each stage, so this is safe.
        const nextLA = table.las[stage.laIndex + 1];
        if (!nextLA) continue;
        const at = createATFromLA(firstLA, nextLA);
        if (at && isUsable(at, screenSqrRadius)) return at;
    }
    return null;
};
