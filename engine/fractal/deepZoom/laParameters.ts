/**
 * LA construction parameters. Defaults match FractalShark's
 * `LAParameters` (Detection Method 2 with `LAThresholdScale = 2^-24`,
 * the f32-epsilon-derived bound).
 *
 * Tunable but rarely needs touching — the defaults give a sensible
 * trade-off between table size and validity. Smaller `laThresholdScale`
 * = stricter validity = larger table, more aggressive period detection.
 */

export interface LAParameters {
    /** Bound for the dz validity threshold update during Step. f32 eps
     *  scaled by a safety margin. 2^-24 ≈ 5.96e-8. */
    laThresholdScale: number;
    /** Same as above for dc. Independent because dc and dz can have
     *  very different magnitudes at deep zoom. */
    laThresholdCScale: number;
    /** Period detection: ratio threshold for detecting periodicity in
     *  Composite. */
    periodDetectionThreshold: number;
    /** Stage-0 period detection ratio (Step path). */
    stage0PeriodDetectionThreshold: number;
    /** MinMag-based detection (method 1) ratio. */
    periodDetectionThreshold2: number;
    /** Stage-0 MinMag-based ratio. */
    stage0PeriodDetectionThreshold2: number;
    /** 1 = MinMag-based detection (uses |Z| running min); 2 = threshold-
     *  ratio detection (uses LAThreshold collapse). FractalShark
     *  defaults to 2 for Mandelbrot. */
    detectionMethod: 1 | 2;
}

export const defaultLAParameters = (): LAParameters => ({
    laThresholdScale: Math.pow(2, -24),
    laThresholdCScale: Math.pow(2, -24),
    periodDetectionThreshold: 0.03,
    stage0PeriodDetectionThreshold: 0.03,
    periodDetectionThreshold2: 0.03,
    stage0PeriodDetectionThreshold2: 0.03,
    detectionMethod: 2,
});
