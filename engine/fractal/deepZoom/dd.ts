/**
 * Double-double arithmetic — represent a value as `(hi, lo)` such that
 * `hi + lo` recovers ~106 bits of precision (vs f64's 53). Used to
 * accumulate sub-f64 pan deltas in deep-zoom centre coordinates so
 * panning past zoom 1e-15 doesn't quantise.
 *
 * The two-sum trick (Knuth/Dekker) computes the round-off error of a
 * float addition without conditional branches:
 *
 *   s = a + b
 *   bb = s - a       // approximates b
 *   err = (a - (s - bb)) + (b - bb)
 *
 * `s + err = a + b` exactly when no overflow occurs. We use this to
 * preserve the sub-f64 portion of pan accumulations.
 *
 * Native depth ceiling: 53 + 53 = ~106-bit mantissa = ~32 decimal
 * digits. Reaches zoom ~1e-30 cleanly. Past that, we'd need either
 * triple-double (rarely justified) or full BigInt-precision centre
 * (the deferred Option C).
 */

/** Two-sum: returns `[s, err]` such that `s + err === a + b` exactly. */
export const twoSum = (a: number, b: number): [number, number] => {
    const s = a + b;
    const bb = s - a;
    const err = a - (s - bb) + (b - bb);
    return [s, err];
};

/** Add a regular f64 `x` to a (hi, lo) double-double. */
export const ddAddF64 = (hi: number, lo: number, x: number): [number, number] => {
    const [s, e] = twoSum(hi, x);
    // Combine the new error term with the existing lo, then renormalise
    // so |newLo| < ulp(newHi).
    const [newHi, newLo] = twoSum(s, lo + e);
    return [newHi, newLo];
};

/** Subtract two double-doubles: (aHi + aLo) − (bHi + bLo). */
export const ddSub = (
    aHi: number, aLo: number,
    bHi: number, bLo: number,
): [number, number] => {
    const [s, e] = twoSum(aHi, -bHi);
    const [newHi, newLo] = twoSum(s, e + (aLo - bLo));
    return [newHi, newLo];
};
