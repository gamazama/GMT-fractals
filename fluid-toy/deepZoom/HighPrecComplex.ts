/**
 * Fixed-point BigInt arithmetic for the deep-zoom reference orbit.
 *
 * `HPReal` stores a real number as `mantissa / 2^precision` where mantissa
 * is a signed BigInt and precision is a power-of-two scale common to all
 * values in a computation. Multiplication is `(a*b) >> precision`,
 * addition/subtraction is straight BigInt math.
 *
 * Why fixed-point and not mantissa+exponent: in the reference orbit, all
 * values are bounded (|z| < escape radius) so dynamic range isn't an
 * issue. Fixed-point gives faster mul (one BigInt multiply, one shift)
 * and predictable error budget. The mantissa+exponent style only matters
 * inside the shader, where we use HDRFloat (added in phase 4).
 *
 * Precision selection: chosen by the orbit builder based on zoom depth
 * and iteration count. ~`-log₂(zoom) + log₂(maxIter) + 32` bits suffices.
 */

const ZERO = 0n;
const ONE = 1n;

/**
 * Real number as `m / 2^p`. Immutable.
 *
 * Operations require both operands share the same `p`. The orbit
 * builder pins `p` once per build and never mixes precisions.
 */
export class HPReal {
    constructor(
        public readonly m: bigint,
        public readonly p: number,
    ) {}

    static zero(p: number): HPReal {
        return new HPReal(ZERO, p);
    }

    /**
     * Convert a JS number to HPReal at the given precision. Extracts the
     * IEEE-754 (mantissa, exponent) and shifts directly so all 53 bits of
     * mantissa survive regardless of magnitude — including sub-ulp values
     * like the lo word of a Dekker pair (~1e-17 at deep zoom).
     */
    static fromNumber(n: number, p: number): HPReal {
        if (!Number.isFinite(n) || n === 0) return HPReal.zero(p);
        const sign = n < 0 ? -ONE : ONE;
        const abs = Math.abs(n);
        const exp = Math.floor(Math.log2(abs));
        const mantissa = abs / Math.pow(2, exp);
        // Pack mantissa as a 53-bit integer; it sits in [2^52, 2^53).
        const mantInt = BigInt(Math.round(mantissa * Math.pow(2, 52)));
        // Fixed-point store is m / 2^p, target value is mantInt × 2^(exp-52),
        // so m = mantInt shifted by (exp - 52 + p). Negative shift = right.
        const shift = exp - 52 + p;
        const m = shift >= 0 ? mantInt << BigInt(shift) : mantInt >> BigInt(-shift);
        return new HPReal(sign * m, p);
    }

    /**
     * Recover a JS number from the top 53 bits of mantissa. Lossy when
     * |value| has > 53 bits of significance, but for our use (sampling
     * |z| ≤ escape radius) the value is small enough to round-trip
     * exactly.
     */
    toNumber(): number {
        if (this.m === ZERO) return 0;
        const negative = this.m < ZERO;
        const abs = negative ? -this.m : this.m;
        const bits = abs.toString(2).length;
        if (bits <= 53) {
            const v = Number(abs) / Math.pow(2, this.p);
            return negative ? -v : v;
        }
        const shift = bits - 53;
        const top = Number(abs >> BigInt(shift));
        const v = top * Math.pow(2, shift - this.p);
        return negative ? -v : v;
    }

    add(o: HPReal): HPReal { return new HPReal(this.m + o.m, this.p); }
    sub(o: HPReal): HPReal { return new HPReal(this.m - o.m, this.p); }

    mul(o: HPReal): HPReal {
        return new HPReal((this.m * o.m) >> BigInt(this.p), this.p);
    }

    sqr(): HPReal {
        return new HPReal((this.m * this.m) >> BigInt(this.p), this.p);
    }

    /** True if value² > 4 (escape test). Cheaper than two `.toNumber()` round-trips. */
    isGreaterThanFour(): boolean {
        // (m / 2^p) > 4  ⟺  m > 4 · 2^p  ⟺  m > 1 << (p+2)
        const threshold = ONE << BigInt(this.p + 2);
        return this.m > threshold;
    }
}

/**
 * Complex number as a pair of HPReal at common precision.
 *
 * `sqr` and `add` are the only operations needed for the Mandelbrot
 * reference orbit. `mul` is provided for Julia mode (phase 10) and
 * power-d generalisations (phase 9).
 */
export class HPComplex {
    constructor(
        public readonly re: HPReal,
        public readonly im: HPReal,
    ) {}

    static zero(p: number): HPComplex {
        return new HPComplex(HPReal.zero(p), HPReal.zero(p));
    }

    static fromNumbers(re: number, im: number, p: number): HPComplex {
        return new HPComplex(HPReal.fromNumber(re, p), HPReal.fromNumber(im, p));
    }

    /** Construct from a double-double pair: hi + lo for each component.
     *  Adds the two parts at the chosen precision so the sub-f64
     *  bits of `lo` actually contribute to the BigInt mantissa. */
    static fromDoubleDouble(
        reHi: number, reLo: number,
        imHi: number, imLo: number,
        p: number,
    ): HPComplex {
        const re = HPReal.fromNumber(reHi, p).add(HPReal.fromNumber(reLo, p));
        const im = HPReal.fromNumber(imHi, p).add(HPReal.fromNumber(imLo, p));
        return new HPComplex(re, im);
    }

    add(o: HPComplex): HPComplex {
        return new HPComplex(this.re.add(o.re), this.im.add(o.im));
    }

    /** (a + bi)² = (a² − b²) + 2abi */
    sqr(): HPComplex {
        const a2 = this.re.sqr();
        const b2 = this.im.sqr();
        const ab = this.re.mul(this.im);
        return new HPComplex(a2.sub(b2), ab.add(ab));
    }

    /** (a + bi)(c + di) = (ac − bd) + (ad + bc)i */
    mul(o: HPComplex): HPComplex {
        const ac = this.re.mul(o.re);
        const bd = this.im.mul(o.im);
        const ad = this.re.mul(o.im);
        const bc = this.im.mul(o.re);
        return new HPComplex(ac.sub(bd), ad.add(bc));
    }

    /**
     * Integer power via exponentiation by squaring. Supports d ≥ 1.
     * For d=2 use `sqr()` directly — it's marginally cheaper. For
     * d=3..8 (the only range exposed in the fluid-toy UI) the cost is
     * 2-4 BigInt complex muls per orbit step.
     */
    pow(d: number): HPComplex {
        if (d <= 1) return d === 0
            ? new HPComplex(HPReal.fromNumber(1, this.re.p), HPReal.zero(this.re.p))
            : this;
        if (d === 2) return this.sqr();
        let result: HPComplex | null = null;
        let base: HPComplex = this;
        let e = d;
        while (e > 0) {
            if ((e & 1) === 1) {
                result = result === null ? base : result.mul(base);
            }
            e >>= 1;
            if (e > 0) base = base.sqr();
        }
        return result!;
    }

    /** |z|² (still in HPReal precision). */
    norm2(): HPReal { return this.re.sqr().add(this.im.sqr()); }

    toFloat32Pair(): [number, number] {
        return [this.re.toNumber(), this.im.toNumber()];
    }
}

/**
 * Pick a working precision suitable for an orbit at this zoom depth and
 * iteration count. The reference orbit accumulates ~log₂(maxIter) bits
 * of error per iteration in the worst case; we add 32 bits safety on
 * top. Floor of 64 keeps shallow zooms cheap.
 */
export const choosePrecisionBits = (zoom: number, maxIter: number): number => {
    if (!(zoom > 0) || !(maxIter > 0)) return 64;
    const fromZoom = Math.ceil(-Math.log2(zoom));
    const fromIter = Math.ceil(Math.log2(maxIter));
    return Math.max(64, fromZoom + fromIter + 32);
};
