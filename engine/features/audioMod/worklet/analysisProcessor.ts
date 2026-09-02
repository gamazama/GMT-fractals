/**
 * analysisProcessor — the AudioWorklet shell.
 *
 * Deliberately thin. Everything numerically interesting lives in
 * `dsp/bandAnalyser.ts` and `dsp/spectrumFrame.ts`, which run in node and are
 * covered by `test:band-analyser` / `test:fft`. What is left here is the part
 * that can only exist on the audio thread: accumulate the render quanta,
 * decide when a hop has elapsed, batch the results out.
 *
 * That division is on purpose. Audio-thread code cannot be stepped through and
 * a glitch in it is audible, so as little logic as possible should live where
 * it cannot be tested.
 *
 * @assumption `process()` allocates NOTHING. Every buffer is sized at config
 *   time and reused. Allocation on the audio thread invites a GC pause, and a
 *   GC pause here is a click.
 * @assumption The batch is COPIED by structured clone rather than transferred.
 *   Transferring would neuter the staging buffer and force a fresh allocation
 *   per post — see the invariant above. ~2KB per post at 60Hz is a memcpy
 *   nobody will ever measure.
 * @assumption Input is summed to mono. The transport already asks for
 *   `channelCount: 1` on live capture, but decks are stereo, and analysing
 *   only the left channel would miss anything panned right.
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */

/// <reference lib="webworker" />

import { BandAnalyser, DEFAULT_SMOOTHING_TAU_SEC } from '../dsp/bandAnalyser';
import {
    ANALYSIS_PROCESSOR_NAME, POST_INTERVAL_SEC, MAX_SNAPSHOTS_PER_POST,
    hopSamplesFor,
    type AnalysisBatchMessage, type MainToWorklet,
} from './protocol';

// AudioWorklet globals. Not in lib.dom — the worklet scope is its own realm.
declare const sampleRate: number;
declare const currentTime: number;
declare const AudioWorkletProcessor: {
    new(): { readonly port: MessagePort };
};
declare function registerProcessor(name: string, ctor: unknown): void;

const DEFAULT_FFT_SIZE = 4096;
const DEFAULT_BANDS_PER_OCTAVE = 6;

class AnalysisProcessor extends AudioWorkletProcessor {
    private analyser: BandAnalyser;
    private hopSamples: number;
    private hopSec: number;

    /** Circular buffer of the most recent `fftSize` mono samples. */
    private ring: Float32Array;
    private ringWrite = 0;
    /** Linearised copy handed to the analyser — oldest sample first. */
    private linear: Float32Array;
    private sinceHop = 0;
    /** True once `fftSize` samples have been seen; before that the ring is
     *  part silence and would report a spurious fade-in. */
    private primed = false;
    private samplesSeen = 0;

    // Batching
    private staging!: Float32Array;
    private stagingTimes!: Float64Array;
    private stagingPeaks!: Float32Array;
    private staged = 0;
    private dropped = 0;
    private lastPost = 0;

    constructor() {
        super();
        this.analyser = new BandAnalyser({
            sampleRate,
            fftSize: DEFAULT_FFT_SIZE,
            bandsPerOctave: DEFAULT_BANDS_PER_OCTAVE,
            dbFloor: -90,
            dbCeiling: -10,
            tiltDbPerOct: 0,
            smoothingTauSec: DEFAULT_SMOOTHING_TAU_SEC,
        });
        this.hopSamples = hopSamplesFor(sampleRate);
        this.hopSec = this.hopSamples / sampleRate;
        this.ring = new Float32Array(DEFAULT_FFT_SIZE);
        this.linear = new Float32Array(DEFAULT_FFT_SIZE);
        this.allocStaging();

        this.port.onmessage = (e: MessageEvent<MainToWorklet>) => this.onMessage(e.data);
    }

    private allocStaging() {
        const n = this.analyser.bands.length;
        this.staging = new Float32Array(MAX_SNAPSHOTS_PER_POST * n * 2);
        this.stagingTimes = new Float64Array(MAX_SNAPSHOTS_PER_POST);
        this.stagingPeaks = new Float32Array(MAX_SNAPSHOTS_PER_POST);
        this.staged = 0;
    }

    private onMessage(msg: MainToWorklet) {
        if (!msg || msg.kind !== 'config') return;
        const prevBands = this.analyser.bands.length;
        const prevFft = this.analyser.config.fftSize;

        this.analyser.reconfigure({
            sampleRate,
            fftSize: msg.fftSize,
            bandsPerOctave: msg.bandsPerOctave,
            dbFloor: msg.dbFloor,
            dbCeiling: msg.dbCeiling,
            tiltDbPerOct: msg.tiltDbPerOct,
            smoothingTauSec: msg.smoothingTauSec,
        });

        if (msg.fftSize !== prevFft) {
            // The ring's contents are meaningless at a new length; start over
            // rather than analyse a window that is part old-geometry audio.
            this.ring = new Float32Array(msg.fftSize);
            this.linear = new Float32Array(msg.fftSize);
            this.ringWrite = 0;
            this.samplesSeen = 0;
            this.primed = false;
        }
        if (this.analyser.bands.length !== prevBands) this.allocStaging();
    }

    process(inputs: Float32Array[][]): boolean {
        const chans = inputs[0];
        const ring = this.ring;
        const n = ring.length;

        // A disconnected input yields no channels. Feed silence so the ring
        // ages out real audio instead of freezing on the last frame.
        const frames = chans && chans.length > 0 ? chans[0].length : 128;
        const chanCount = chans ? chans.length : 0;

        let w = this.ringWrite;
        if (chanCount === 0) {
            for (let i = 0; i < frames; i++) {
                ring[w] = 0;
                if (++w === n) w = 0;
            }
        } else if (chanCount === 1) {
            const c0 = chans[0];
            for (let i = 0; i < frames; i++) {
                ring[w] = c0[i];
                if (++w === n) w = 0;
            }
        } else {
            const inv = 1 / chanCount;
            for (let i = 0; i < frames; i++) {
                let s = 0;
                for (let c = 0; c < chanCount; c++) s += chans[c][i];
                ring[w] = s * inv;
                if (++w === n) w = 0;
            }
        }
        this.ringWrite = w;

        this.samplesSeen += frames;
        if (!this.primed && this.samplesSeen >= n) this.primed = true;

        this.sinceHop += frames;
        if (this.sinceHop >= this.hopSamples) {
            this.sinceHop -= this.hopSamples;
            if (this.primed) this.runHop();
        }

        if (currentTime - this.lastPost >= POST_INTERVAL_SEC && this.staged > 0) {
            this.flush();
        }

        return true;
    }

    private runHop() {
        // Linearise oldest-first with two block copies rather than a modulo
        // per sample.
        const ring = this.ring;
        const w = this.ringWrite;
        const linear = this.linear;
        linear.set(ring.subarray(w));
        if (w > 0) linear.set(ring.subarray(0, w), ring.length - w);

        this.analyser.analyse(linear, this.hopSec);

        const bandCount = this.analyser.bands.length;
        if (this.staged >= MAX_SNAPSHOTS_PER_POST) {
            this.dropped++;
            return;
        }
        const base = this.staged * bandCount * 2;
        this.staging.set(this.analyser.levels, base);
        this.staging.set(this.analyser.flux, base + bandCount);
        this.stagingTimes[this.staged] = currentTime;
        this.stagingPeaks[this.staged] = this.analyser.peakLevel;
        this.staged++;
    }

    private flush() {
        const bandCount = this.analyser.bands.length;
        const msg: AnalysisBatchMessage = {
            kind: 'bands',
            bandCount,
            count: this.staged,
            times: this.stagingTimes.subarray(0, this.staged),
            peaks: this.stagingPeaks.subarray(0, this.staged),
            data: this.staging.subarray(0, this.staged * bandCount * 2),
            dropped: this.dropped,
        };
        // Structured clone copies the subarrays — see the class @invariant.
        this.port.postMessage(msg);
        this.staged = 0;
        this.dropped = 0;
        this.lastPost = currentTime;
    }
}

registerProcessor(ANALYSIS_PROCESSOR_NAME, AnalysisProcessor);
export {};
