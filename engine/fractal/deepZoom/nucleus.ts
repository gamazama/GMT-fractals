/**
 * Minibrot-nucleus reference search for the deep-zoom path.
 *
 * The canonical deep-zoom reference is a **periodic** orbit: the critical
 * orbit of a minibrot nucleus c* (the centre of a period-P island) returns
 * to zero exactly every P iterations, so storing ONE period and wrapping the
 * reference index modulo P gives an exact, arbitrarily-long reference from a
 * short orbit. This is what FractalShark, Kalles Fraktaler and Imagina use
 * (Phil Thompson's BLA write-up describes the same recipe).
 *
 * Two steps, both pure CPU (HighPrecComplex BigInt fixed point):
 *
 *  1. `detectPeriod` — the derivative / atom-domain ball criterion
 *     (Pauldelbrot; FractalShark `RefOrbitCalc.cpp` `SetPeriodMaybeZero`).
 *     Iterate z_{n+1}=z_n²+c while tracking the c-derivative
 *     d_{n+1}=2·z_n·d_n+1; the period is the first n where
 *     |z_n|∞ < 2·radius·|d_n|∞ — the orbit has fallen back inside the
 *     period-n minibrot's atom domain at this view radius. The comparison is
 *     exact (fixed point) so a huge derivative — which overflows f64 well
 *     before deep periods — cannot false-trigger.
 *
 *  2. `newtonNucleus` — Newton's method on f_P(c)=z_P(c)=0, refining a seed
 *     (the view centre / relocated deepest point) to the exact nucleus c*
 *     via c ← c − z_P/z_P' (z_P and its c-derivative computed together).
 *
 * Power-2 / Mandelbrot only — the derivative recurrence is d=2-specific, and
 * that's the only mode where LA (the periodic reference's main beneficiary)
 * runs. Callers fall back to the relocation/`laUnsafe` heuristics when no
 * nucleus is found.
 *
 * @see docs/adr/0066-deep-zoom-nucleus-reference.md
 * @see refSoftware/FractalShark/FractalSharkLib/RefOrbitCalc.cpp (period detect)
 * @see refSoftware/FractalShark/FractalSharkGpuLib/LAKernel.cuh (RefIteration % period)
 */

import { HPComplex, HPReal } from './HighPrecComplex';

const ESCAPE_RADIUS_SQ = 4;

export interface PeriodResult {
    /** Detected period (≥1), or 0 if none found within `cap` / orbit escaped. */
    period: number;
    /** True if the critical orbit escaped before a period was found. */
    escaped: boolean;
}

/** 2·z·d + 1 — the period-2 c-derivative step (d_{n+1} from z_n, d_n). */
const derivStep = (z: HPComplex, d: HPComplex, one: HPComplex): HPComplex => {
    const zd = z.mul(d);
    // 2·zd via self-add (cheaper than constructing an HPReal "2").
    const two_zd = new HPComplex(zd.re.add(zd.re), zd.im.add(zd.im));
    return two_zd.add(one);
};

/**
 * Detect the period of the minibrot nearest `c` at the given view `radius`
 * (fractal-coordinate half-extent of the view). Returns period 0 when the
 * orbit escapes or no atom-domain re-entry happens within `cap` iterations.
 */
export const detectPeriod = (
    c: HPComplex,
    radius: number,
    cap: number,
    precisionBits: number,
): PeriodResult => {
    const p = precisionBits;
    const one = new HPComplex(HPReal.fromNumber(1, p), HPReal.zero(p));
    // 2·radius as an exact fixed-point scalar for the ball test.
    const twoR = HPReal.fromNumber(2 * radius, p);

    let z = HPComplex.zero(p);
    let d = HPComplex.zero(p);
    for (let n = 1; n <= cap; n++) {
        // d_n uses z_{n-1} (pre-square); update derivative first, then z.
        d = derivStep(z, d, one);
        z = z.sqr().add(c);

        if (z.norm2().isGreaterThanFour()) return { period: 0, escaped: true };

        // |z_n|∞ < 2·radius·|d_n|∞  ⇒  c is inside the period-n atom domain.
        const zN = z.chebyNorm();
        const bound = twoR.mul(d.chebyNorm());
        if (zN.cmp(bound) < 0) return { period: n, escaped: false };
    }
    return { period: 0, escaped: false };
};

/**
 * Refine `seed` to the exact period-`period` nucleus c* via Newton's method
 * on z_P(c)=0. Returns the refined HPComplex, or null if the derivative
 * collapses or it fails to converge within `maxSteps`.
 *
 * Convergence is measured in exact fixed point: the step |Δc|∞ shrinks
 * quadratically until it hits the precision floor (then stops decreasing) —
 * at which point c is as accurate as the working precision allows. The
 * caller re-verifies by building the orbit and checking z_P ≈ 0.
 */
export const newtonNucleus = (
    seed: HPComplex,
    period: number,
    precisionBits: number,
    maxSteps = 64,
): HPComplex | null => {
    const p = precisionBits;
    const one = new HPComplex(HPReal.fromNumber(1, p), HPReal.zero(p));
    let c = seed;
    let prevNorm: HPReal | null = null;

    for (let step = 0; step < maxSteps; step++) {
        // z_P and d_P = dz_P/dc at the current c.
        let z = HPComplex.zero(p);
        let d = HPComplex.zero(p);
        for (let n = 0; n < period; n++) {
            d = derivStep(z, d, one);
            z = z.sqr().add(c);
        }
        if (d.re.m === 0n && d.im.m === 0n) return null; // singular derivative

        const delta = z.div(d); // z_P / z_P'
        c = c.sub(delta);

        const dn = delta.chebyNorm();
        // Quadratic convergence: once the step stops shrinking we've hit the
        // precision floor — c is fully refined.
        if (prevNorm !== null && dn.cmp(prevNorm) >= 0) return c;
        if (dn.m === 0n) return c;
        prevNorm = dn;
    }
    return c; // ran the budget; caller's orbit verification is the gate
};
