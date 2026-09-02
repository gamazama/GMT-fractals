/**
 * autoGain — the global AGC, shared by both analysis backends.
 *
 * Extracted (ADR-0110) rather than copied. Two backends each carrying their
 * own peak follower would be the same near-identical-module trap the engine
 * has hit before: they drift, and an A/B between them stops isolating the one
 * thing it is meant to test.
 *
 * @assumption Silence FREEZES both the follower and the gain. Gating on the
 *   RELEASED peak instead of the live input is the trap: through a gap between
 *   tracks the follower keeps decaying, the gain is recomputed against an
 *   ever-smaller peak, and it ratchets to the ceiling before the peak finally
 *   drops under the floor — so the next downbeat arrives at maximum boost and
 *   detonates. This shipped once already.
 * @assumption Attack is instantaneous, release is timed. A peak is a peak; the
 *   release rate is what sets how fast the rig adapts to a quieter track.
 */

/** Below this the input is treated as silence and the gain is frozen. */
const AGC_FLOOR = 0.04;
/** Ceiling on the boost. Past this you are amplifying noise, not signal. */
const AGC_MAX_BOOST = 8;
/** Where AGC aims to put the running peak. Short of 1.0 so genuine peaks keep
 *  some headroom instead of sitting pinned at the gate ceiling. */
const AGC_TARGET = 0.8;
/** Per-second release rate. ~2.5s to fall an order of magnitude. */
const AGC_RELEASE = 0.4;

export class AutoGain {
    private peak = 0;
    private gain = 1;

    /** Multiplier the rule pipeline applies to a band average. 1 when off, so
     *  the non-AGC path is bit-identical to having no AGC at all. */
    public get value(): number { return this.gain; }

    public reset() { this.peak = 0; this.gain = 1; }

    /** `peakLevel` is the loudest BIN this frame, 0..1. */
    public update(enabled: boolean, peakLevel: number, deltaSec: number) {
        if (!enabled) { this.gain = 1; this.peak = 0; return; }

        // Silence gate FIRST — see the class @invariant.
        if (peakLevel < AGC_FLOOR) return;

        if (peakLevel > this.peak) {
            this.peak = peakLevel;
        } else {
            const k = Math.exp(-AGC_RELEASE * Math.max(0, deltaSec) * 10);
            this.peak = peakLevel + (this.peak - peakLevel) * k;
        }

        this.gain = Math.min(AGC_MAX_BOOST, AGC_TARGET / Math.max(AGC_FLOOR, this.peak));
    }
}
