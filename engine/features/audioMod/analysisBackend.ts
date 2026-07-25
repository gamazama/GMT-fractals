/**
 * AnalysisBackend — the seam between "where analysis runs" and everything else.
 *
 * Two implementations: `AudioAnalysis` (AnalyserNode, main thread) and
 * `WorkletAnalysis` (AudioWorklet, audio thread). Both fill the SAME
 * `filterBank` slots, so no consumer knows which is running.
 *
 * @invariant This is not a plugin registry and should not become one. It has
 *   exactly two implementations and exists so an A/B can vary one thing. If a
 *   third backend ever arrives (multirate-octave, gammatone), THAT is the
 *   moment to ask whether a registry is warranted — not before.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

export interface AnalysisBackend {
    readonly sampleRate: number;
    readonly binWidthHz: number;

    /** Wire up to the transport's tap. Idempotent. */
    attach(ctx: AudioContext, tap: AudioNode): void;
    detach(): void;

    setSmoothing(val: number): void;
    setFftSize(size: number): void;
    setDecibelRange(floor: number, ceiling: number): void;

    /** Pull/receive one frame and fill `filterBank`. */
    update(
        agcEnabled?: boolean,
        deltaSec?: number,
        bandsPerOctave?: number,
        normalizeBands?: boolean,
        spectralTilt?: number,
    ): void;

    /** Liveness signal. The bin contents have no consumer — both callers only
     *  null-check it. Named for its history; see ADR-0110's follow-ups. */
    getRawData(): Float32Array | null;
    getPeakLevel(): number;
    getSignalGain(): number;
}
