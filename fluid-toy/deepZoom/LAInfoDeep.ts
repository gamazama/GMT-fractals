/**
 * LAInfoDeep — one node of the Linear Approximation table.
 *
 * Each node is a bivariate linear map `dz_end = ZCoeff·dz_start + CCoeff·dc`
 * representing a contiguous block of reference-orbit iterations. Validity
 * radii (`LAThreshold` for dz, `LAThresholdC` for dc) bound the input
 * region within which the linearisation stays accurate.
 *
 * Ported from FractalShark's LAInfoDeep.h (HpSharkFloatLib). The math
 * follows their convention bit-for-bit so the validation tests can
 * compare against a known-good implementation if needed.
 *
 * Numerical type: plain f64 complex. Reference-orbit construction uses
 * BigInt fixed-point (HighPrecComplex.ts) for the orbit itself; LA
 * coefficients live in normal-range bounded values where f64 gives
 * ~16 digits — enough for shader-side f32/HDR consumption.
 */

import type { LAParameters } from './laParameters';

/** Complex number as `{ re, im }` — f64 components. */
export interface Complex {
    re: number;
    im: number;
}

export const cZero = (): Complex => ({ re: 0, im: 0 });
export const cOne = (): Complex => ({ re: 1, im: 0 });

export const cAdd = (a: Complex, b: Complex): Complex => ({
    re: a.re + b.re,
    im: a.im + b.im,
});

export const cSub = (a: Complex, b: Complex): Complex => ({
    re: a.re - b.re,
    im: a.im - b.im,
});

export const cMul = (a: Complex, b: Complex): Complex => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
});

/** Chebyshev (L∞) norm — max(|re|, |im|). Matches FractalShark; cheaper
 *  than the L2 norm and tight enough for the threshold comparisons. */
export const cChebyNorm = (a: Complex): number =>
    Math.max(Math.abs(a.re), Math.abs(a.im));

export const cScale = (a: Complex, s: number): Complex => ({
    re: a.re * s,
    im: a.im * s,
});

/**
 * One LA node. Mutable for in-place construction (the table contains
 * thousands of nodes; immutable would churn GC). Treat as frozen once
 * pushed into the table.
 */
export interface LAInfoDeep {
    /** Reference-orbit value at the START of this LA's iter range. */
    Ref: Complex;
    /** Linear coefficient on `dz_start`. */
    ZCoeff: Complex;
    /** Linear coefficient on `dc`. */
    CCoeff: Complex;
    /** Validity radius for `dz_start`: linearisation valid while |dz| < this. */
    LAThreshold: number;
    /** Validity radius for `dc`: linearisation valid while |dc| < this. */
    LAThresholdC: number;
    /** Running min of |Z| over the covered range — period-detection state. */
    MinMag: number;
    /** Number of iterations this LA covers. Matches FractalShark's
     *  convention where an LA constructed from `LAInfoDeep(z=0)` and one
     *  Step represents one iteration covered. Set by the builder when
     *  the LA is finalised — 0 during in-progress construction. */
    StepLength: number;
    /** Index into the next stage's table where this LA's region begins.
     *  Walked at runtime when the LA's threshold is exceeded and we
     *  need to drop down to a finer-grained LA. */
    NextStageLAIndex: number;
}

export const newLAInfoDeep = (): LAInfoDeep => ({
    Ref: cZero(),
    ZCoeff: cZero(),
    CCoeff: cZero(),
    LAThreshold: 0,
    LAThresholdC: 0,
    MinMag: 0,
    StepLength: 0,
    NextStageLAIndex: 0,
});

/**
 * Initial LA seeded at reference value `z`. The constructor produces
 * the identity transformation: ZCoeff = CCoeff = 1, thresholds = 1.
 * `MinMag` initialises to 4 (the escape-radius² baseline) only when
 * detection method 1 is in use; method 2 leaves it at 0 (unused).
 */
export const initLAInfoDeep = (z: Complex, params: LAParameters): LAInfoDeep => ({
    Ref: { re: z.re, im: z.im },
    ZCoeff: cOne(),
    CCoeff: cOne(),
    LAThreshold: 1,
    LAThresholdC: 1,
    MinMag: params.detectionMethod === 1 ? 4 : 0,
    StepLength: 0,
    NextStageLAIndex: 0,
});

/**
 * Extend `la` by one reference-orbit iteration at value `z`.
 *
 * Math (matches FractalShark LAInfoDeep::Step):
 *   outZCoeff      = 2z · ZCoeff
 *   outCCoeff      = 2z · CCoeff + 1
 *   outLAThreshold = min(LAThreshold,  |z|/|ZCoeff| · scaleZ)
 *   outLAThresholdC = min(LAThresholdC, |z|/|CCoeff| · scaleC)
 *
 * Returns `true` when the new LAThreshold dropped below
 * `LAThreshold · stage0PeriodDetectionThreshold` — signal to flush the
 * LA and start a new one (period detected).
 */
export const stepLA = (
    la: LAInfoDeep,
    z: Complex,
    out: LAInfoDeep,
    params: LAParameters,
): boolean => {
    const chebyZ = cChebyNorm(z);
    const chebyZCoeff = cChebyNorm(la.ZCoeff);
    const chebyCCoeff = cChebyNorm(la.CCoeff);

    // Update MinMag if using detection method 1.
    if (params.detectionMethod === 1) {
        out.MinMag = Math.min(chebyZ, la.MinMag);
    }

    // Threshold updates.
    const t1 = chebyZCoeff > 0 ? chebyZ / chebyZCoeff * params.laThresholdScale : Infinity;
    const t2 = chebyCCoeff > 0 ? chebyZ / chebyCCoeff * params.laThresholdCScale : Infinity;
    out.LAThreshold = Math.min(la.LAThreshold, t1);
    out.LAThresholdC = Math.min(la.LAThresholdC, t2);

    // Coefficient updates: 2z · {Z,C}Coeff, then +1 on CCoeff.
    const z2re = 2 * z.re;
    const z2im = 2 * z.im;
    out.ZCoeff = {
        re: z2re * la.ZCoeff.re - z2im * la.ZCoeff.im,
        im: z2re * la.ZCoeff.im + z2im * la.ZCoeff.re,
    };
    out.CCoeff = {
        re: z2re * la.CCoeff.re - z2im * la.CCoeff.im + 1,
        im: z2re * la.CCoeff.im + z2im * la.CCoeff.re,
    };

    out.Ref = la.Ref;  // Ref of an LA never moves once seeded.

    // Period detection — method 2: threshold collapsed below scaled bound.
    if (params.detectionMethod === 1) {
        return out.MinMag < la.MinMag * params.periodDetectionThreshold2;
    }
    return out.LAThreshold < la.LAThreshold * params.stage0PeriodDetectionThreshold;
};

/**
 * Stand-alone period check: would adding this z to a fresh LA from this
 * starting point trigger detection? Used by the construction algorithm
 * to peek one step ahead without committing.
 */
export const detectPeriod = (
    la: LAInfoDeep,
    z: Complex,
    params: LAParameters,
): boolean => {
    const chebyZ = cChebyNorm(z);
    if (params.detectionMethod === 1) {
        return chebyZ < la.MinMag * params.periodDetectionThreshold2;
    }
    const chebyZCoeff = cChebyNorm(la.ZCoeff);
    if (chebyZCoeff === 0) return false;
    const ratio = chebyZ / chebyZCoeff * params.laThresholdScale;
    return ratio < la.LAThreshold * params.periodDetectionThreshold;
};

/**
 * Compose two consecutive LAs into one covering both ranges. Math
 * ported verbatim from FractalShark LAInfoDeep::Composite — note the
 * extra `2 · LA.Ref` factor on the bridge term, which is part of their
 * indexing convention (LA.CCoeff already accounts for its first iter's
 * `+1`, so the bridge step omits it to avoid double-counting).
 *
 *   outZCoeff = (2·LA.Ref · this.ZCoeff) · LA.ZCoeff
 *   outCCoeff = (2·LA.Ref · this.CCoeff) · LA.ZCoeff + LA.CCoeff
 *
 * Threshold updates apply both this and LA's bounds intersected.
 *
 * Returns `true` when the composite's threshold collapsed below the
 * detection floor — signal to stop merging and flush.
 */
export const compositeLA = (
    self: LAInfoDeep,
    la: LAInfoDeep,
    out: LAInfoDeep,
    params: LAParameters,
): boolean => {
    const z = la.Ref;
    const chebyZ = cChebyNorm(z);
    let chebyZCoeff = cChebyNorm(self.ZCoeff);
    let chebyCCoeff = cChebyNorm(self.CCoeff);

    // First-stage threshold (this's own update against bridging through z).
    const t1a = chebyZCoeff > 0 ? chebyZ / chebyZCoeff * params.laThresholdScale : Infinity;
    const t2a = chebyCCoeff > 0 ? chebyZ / chebyCCoeff * params.laThresholdCScale : Infinity;
    let outLAT = Math.min(self.LAThreshold, t1a);
    let outLATc = Math.min(self.LAThresholdC, t2a);

    // Bridge: 2·z · this.{Z,C}Coeff. NOTE: NO +1 on CCoeff — see header doc.
    const z2re = 2 * z.re;
    const z2im = 2 * z.im;
    let outZ = {
        re: z2re * self.ZCoeff.re - z2im * self.ZCoeff.im,
        im: z2re * self.ZCoeff.im + z2im * self.ZCoeff.re,
    };
    let outC = {
        re: z2re * self.CCoeff.re - z2im * self.CCoeff.im,
        im: z2re * self.CCoeff.im + z2im * self.CCoeff.re,
    };

    // Second-stage threshold (LA's own bound, scaled by the bridge magnitude).
    chebyZCoeff = cChebyNorm(outZ);
    chebyCCoeff = cChebyNorm(outC);
    const t1b = chebyZCoeff > 0 ? la.LAThreshold / chebyZCoeff : Infinity;
    const t2b = chebyCCoeff > 0 ? la.LAThreshold / chebyCCoeff : Infinity;
    const tempThreshold = outLAT;  // saved for period-detection comparison below
    outLAT = Math.min(outLAT, t1b);
    outLATc = Math.min(outLATc, t2b);

    // Final composition: chain LA's coefficients onto the bridged this.
    outZ = cMul(outZ, la.ZCoeff);
    outC = cAdd(cMul(outC, la.ZCoeff), la.CCoeff);

    out.LAThreshold = outLAT;
    out.LAThresholdC = outLATc;
    out.ZCoeff = outZ;
    out.CCoeff = outC;
    out.Ref = self.Ref;  // composite's start ref = this's start ref.

    if (params.detectionMethod === 1) {
        const tempMin = Math.min(chebyZ, self.MinMag);
        out.MinMag = Math.min(tempMin, la.MinMag);
        return tempMin < self.MinMag * params.periodDetectionThreshold2;
    }
    return tempThreshold < self.LAThreshold * params.periodDetectionThreshold;
};

/** True if this LA's coefficient is so close to zero that further
 *  composition is degenerate. Construction breaks out when this fires. */
export const isZCoeffZero = (la: LAInfoDeep): boolean =>
    la.ZCoeff.re === 0 && la.ZCoeff.im === 0;

/** True if the LA's threshold collapsed all the way to zero — same
 *  diagnostic as the FractalShark `isLAThresholdZero` method. */
export const isLAThresholdZero = (la: LAInfoDeep): boolean =>
    la.LAThreshold === 0;
