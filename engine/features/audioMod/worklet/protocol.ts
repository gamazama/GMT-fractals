/**
 * Wire protocol between the analysis worklet and the main thread.
 *
 * Imported by BOTH sides, so it must stay free of DOM and of AudioWorklet
 * globals. Types only plus two small helpers.
 *
 * @assumption The payload is BANDS, not bins. ~56 levels + 56 flux values per
 *   snapshot rather than 2048 raw bins. That is the load-bearing shape
 *   decision: it keeps messages small, and it is the only form every candidate
 *   future backend (multirate-octave, gammatone IIR, sparse sliding DFT) can
 *   actually produce. A bin array would fit today's FFT and nothing else.
 * @assumption The band TABLE never crosses the wire — only values do. Both
 *   sides derive identical geometry from `(sampleRate, fftSize,
 *   bandsPerOctave)` via `bandMath.buildBandTable`, so shipping it would be
 *   redundant and would create two sources of truth.
 * @assumption Snapshots carry a timestamp because the main thread reads at an
 *   irregular rate and one consumer — modulation recording's per-frame
 *   back-fill — needs to index by time rather than take the latest. See
 *   ADR-0110 for why that consumer is not hypothetical.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

export const ANALYSIS_PROCESSOR_NAME = 'gmt-audio-analysis';

/** Analysis hops per second the processor aims for. The SuperFlux paper uses
 *  200fps; the real hop is rounded to a whole render quantum, so at 48kHz this
 *  lands on 256 samples ≈ 187.5Hz. */
export const TARGET_HOP_HZ = 200;

/** How often the processor posts a batch. ~60Hz, so a batch holds ~3 hops. */
export const POST_INTERVAL_SEC = 1 / 60;

/** Safety bound on one batch. Never reached in practice — the audio thread
 *  does not stall — but a runaway must not allocate without limit. */
export const MAX_SNAPSHOTS_PER_POST = 16;

/** Main → worklet. Everything the analyser needs; sent on attach and on any
 *  settings change. */
export interface AnalysisConfigMessage {
    kind: 'config';
    fftSize: number;
    bandsPerOctave: number;
    dbFloor: number;
    dbCeiling: number;
    tiltDbPerOct: number;
    smoothingTauSec: number;
}

/**
 * Worklet → main. A batch of snapshots since the last post.
 *
 * `data` is flat and interleaved: for snapshot i, levels occupy
 * `[i*stride, i*stride + bandCount)` and flux the following `bandCount`,
 * where `stride = bandCount * 2`. One buffer rather than 2N typed arrays
 * keeps allocation off the audio thread.
 */
export interface AnalysisBatchMessage {
    kind: 'bands';
    bandCount: number;
    count: number;
    /** AudioContext time at the end of each analysed window, seconds. */
    times: Float64Array;
    /** Loudest BIN per snapshot, 0..1 — what the global AGC follows. Sent
     *  rather than derived from bands, so the AGC sees the same number on both
     *  backends. @see BandAnalyser.peakLevel */
    peaks: Float32Array;
    data: Float32Array;
    /** Hops discarded because a batch overflowed. Non-zero means something is
     *  badly wrong upstream; the main thread logs it rather than hiding it. */
    dropped: number;
}

export type WorkletToMain = AnalysisBatchMessage;
export type MainToWorklet = AnalysisConfigMessage;

/** Quantum-aligned hop for a sample rate. Whole render quanta so the
 *  processor's counter stays exact instead of drifting. */
export function hopSamplesFor(sampleRate: number, quantum = 128): number {
    const ideal = sampleRate / TARGET_HOP_HZ;
    return Math.max(quantum, Math.round(ideal / quantum) * quantum);
}
