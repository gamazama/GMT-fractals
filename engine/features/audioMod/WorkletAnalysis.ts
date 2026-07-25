/**
 * WorkletAnalysis — main-thread receiver for the analysis worklet.
 *
 * The second producer for `filterBank`. It writes the SAME slots the
 * main-thread path writes (`levels`, `normalized`, `fluxRate`), so every
 * consumer — `ModulationEngine`, `AudioSpectrum`, the rule pipeline — is
 * unchanged and unaware of which backend is running. That is the whole point:
 * the A/B varies one thing.
 *
 * @invariant The band TABLE is built locally, never received. Both sides
 *   derive it from `(sampleRate, fftSize, bandsPerOctave)` via
 *   `bandMath.buildBandTable`, so `filterBank.rebuild()` here and the
 *   analyser's table in the worklet agree by construction. Shipping the table
 *   would create a second source of truth and a resize race.
 * @invariant Snapshots land in a BOUNDED ring. The worklet never stalls, so if
 *   the main thread does, its message queue delivers a burst — writing into a
 *   fixed ring means the burst costs O(ring), and the oldest entries (which
 *   nobody can use any more) fall out on their own.
 * @invariant Levels take the LATEST snapshot; flux takes the MAX since the last
 *   read. Levels are already smoothed at hop rate, so the newest value carries
 *   the gap. Flux is deliberately unsmoothed — it is an event measure, and
 *   averaging it across a gap would dilute one kick by the gap's length, so a
 *   max is the only aggregation that preserves "an onset happened".
 *
 * @see docs/adr/0110-audio-analysis-in-a-worklet.md
 */
import { filterBank } from './filterBank';
import { AutoGain } from './dsp/autoGain';
import { DEFAULT_SMOOTHING_TAU_SEC } from './dsp/bandAnalyser';
import {
    ANALYSIS_PROCESSOR_NAME,
    type AnalysisBatchMessage, type AnalysisConfigMessage,
} from './worklet/protocol';
import type { AnalysisBackend } from './analysisBackend';

/**
 * The processor URL, resolved lazily.
 *
 * @invariant This MUST stay a dynamic import. `?worker&url` is a Vite
 *   transform, and node cannot resolve it — a static import here made every
 *   test suite that transitively reaches this file die at parse time with
 *   "does not provide an export named 'default'". Deferring it to the moment
 *   the worklet actually loads keeps the module importable under tsx, which is
 *   how `test:audio-signal`, `test:session-hold` and the modulation gates run.
 */
const loadWorkletUrl = async (): Promise<string> => {
    const mod = await import('./worklet/analysisProcessor.ts?worker&url');
    return mod.default;
};

/** How much history to keep for the recorder's per-frame back-fill. At ~187
 *  hops/sec this is a little over two seconds — comfortably longer than the
 *  worst tick throttle (1Hz), which is the gap it exists to cover. */
const RING_SNAPSHOTS = 512;

export interface BandSnapshot {
    t: number;
    levels: Float32Array;
    flux: Float32Array;
    peak: number;
}

export class WorkletAnalysis implements AnalysisBackend {
    private ctx: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private agc = new AutoGain();
    private ready = false;
    private failed = false;

    private desiredFftSize = 4096;
    private dbFloor = -90;
    private dbCeiling = -10;
    private bandsPerOctave = 6;
    private tiltDbPerOct = 0;
    private smoothingTauSec = DEFAULT_SMOOTHING_TAU_SEC;

    // Bounded history ring.
    private ring: BandSnapshot[] = [];
    private ringWrite = 0;
    private ringCount = 0;
    /** Ring index already consumed by `takeMaxFlux`. */
    private fluxCursor = 0;
    private latest: BandSnapshot | null = null;
    private lastPeak = 0;
    private droppedTotal = 0;

    public get sampleRate(): number { return this.ctx?.sampleRate ?? 48000; }
    public get binWidthHz(): number { return this.sampleRate / this.desiredFftSize; }
    /** False until `addModule` resolves — the facade uses this to fall back. */
    public get isReady(): boolean { return this.ready; }
    public get hasFailed(): boolean { return this.failed; }

    public attach(ctx: AudioContext, tap: AudioNode): void {
        if (this.ctx) return;
        this.ctx = ctx;
        // Build the local table up front so `filterBank` is the right shape
        // before the first message lands.
        this.syncBankShape();
        void this.load(ctx, tap);
    }

    private async load(ctx: AudioContext, tap: AudioNode) {
        try {
            await ctx.audioWorklet.addModule(await loadWorkletUrl());
            const node = new AudioWorkletNode(ctx, ANALYSIS_PROCESSOR_NAME, {
                numberOfInputs: 1,
                numberOfOutputs: 0,
                channelCount: 2,
                channelCountMode: 'explicit',
                channelInterpretation: 'speakers',
            });
            node.port.onmessage = (e: MessageEvent<AnalysisBatchMessage>) => this.onBatch(e.data);
            tap.connect(node);
            this.node = node;
            this.ready = true;
            this.sendConfig();
        } catch (err) {
            // Not fatal: the facade keeps the AnalyserNode backend running.
            this.failed = true;
            console.warn('[audio] AudioWorklet analysis unavailable, staying on the AnalyserNode path', err);
        }
    }

    public detach(): void {
        try { this.node?.disconnect(); } catch { /* already gone */ }
        this.node = null;
        this.ctx = null;
        this.ready = false;
        this.ring = [];
        this.ringCount = 0;
        this.latest = null;
    }

    private sendConfig() {
        if (!this.node) return;
        const msg: AnalysisConfigMessage = {
            kind: 'config',
            fftSize: this.desiredFftSize,
            bandsPerOctave: this.bandsPerOctave,
            dbFloor: this.dbFloor,
            dbCeiling: this.dbCeiling,
            tiltDbPerOct: this.tiltDbPerOct,
            smoothingTauSec: this.smoothingTauSec,
        };
        this.node.port.postMessage(msg);
    }

    /** Keep `filterBank`'s geometry in step with what the worklet is using. */
    private syncBankShape() {
        const opts = {
            sampleRate: this.sampleRate,
            fftSize: this.desiredFftSize,
            bandsPerOctave: this.bandsPerOctave,
        };
        if (!filterBank.matches(opts)) {
            filterBank.rebuild(opts);
            // A reshape invalidates the ring: snapshot k means a different
            // frequency at a new band count.
            this.ring = [];
            this.ringWrite = 0;
            this.ringCount = 0;
            this.fluxCursor = 0;
            this.latest = null;
        }
    }

    private onBatch(msg: AnalysisBatchMessage) {
        if (!msg || msg.kind !== 'bands') return;
        if (msg.dropped) {
            this.droppedTotal += msg.dropped;
            console.warn(`[audio] worklet dropped ${msg.dropped} hops (${this.droppedTotal} total)`);
        }
        const n = msg.bandCount;
        // A batch from before a reshape landed — discard rather than write a
        // wrong-length snapshot into the ring.
        if (n !== filterBank.bands.length) return;

        for (let i = 0; i < msg.count; i++) {
            const base = i * n * 2;
            let slot = this.ring[this.ringWrite];
            if (!slot || slot.levels.length !== n) {
                slot = { t: 0, levels: new Float32Array(n), flux: new Float32Array(n), peak: 0 };
                this.ring[this.ringWrite] = slot;
            }
            slot.t = msg.times[i];
            slot.peak = msg.peaks[i];
            slot.levels.set(msg.data.subarray(base, base + n));
            slot.flux.set(msg.data.subarray(base + n, base + n * 2));

            this.latest = slot;
            this.ringWrite = (this.ringWrite + 1) % RING_SNAPSHOTS;
            if (this.ringCount < RING_SNAPSHOTS) this.ringCount++;
        }
    }

    // ── AnalysisBackend ─────────────────────────────────────────────────────

    public setSmoothing(_val: number): void {
        // The AnalyserNode's smoothingTimeConstant has no counterpart here: it
        // was applied per read CALL, which is the rate-dependence this backend
        // exists to remove. The panel's control maps onto `smoothingTauSec`,
        // set at config time; a runtime setter would imply the two are the same
        // knob, and they are not. @see AudioAnalysis's @invariant.
    }

    public setFftSize(size: number): void {
        const clamped = Math.max(32, Math.min(32768, 2 ** Math.round(Math.log2(size))));
        if (clamped === this.desiredFftSize) return;
        this.desiredFftSize = clamped;
        this.syncBankShape();
        this.sendConfig();
    }

    public setDecibelRange(floor: number, ceiling: number): void {
        this.dbFloor = Math.min(floor, ceiling - 10);
        this.dbCeiling = ceiling;
        this.sendConfig();
    }

    public update(
        agcEnabled = false,
        deltaSec = 1 / 60,
        bandsPerOctave = 6,
        normalizeBands = false,
        spectralTilt = 0,
    ): void {
        if (bandsPerOctave !== this.bandsPerOctave || spectralTilt !== this.tiltDbPerOct) {
            const reshaped = bandsPerOctave !== this.bandsPerOctave;
            this.bandsPerOctave = bandsPerOctave;
            this.tiltDbPerOct = spectralTilt;
            if (reshaped) this.syncBankShape();
            this.sendConfig();
        }

        const latest = this.latest;
        if (!latest) return;

        // Levels: newest snapshot. Already smoothed at hop rate, so it carries
        // the gap — see the class @invariant.
        filterBank.levels.set(latest.levels);
        this.lastPeak = latest.peak;

        // Per-band adaptive gain stays main-thread: it is an option that
        // defaults off (ADR-0105), and keeping it here means the worklet does
        // not carry a mode nobody uses.
        if (normalizeBands) filterBank.applyPeakFollower(deltaSec);
        else filterBank.syncFollowerToLevels();

        // Flux: MAX since the last read — see the class @invariant.
        this.takeMaxFlux(filterBank.fluxRate);

        this.agc.update(agcEnabled, latest.peak, deltaSec);
    }

    /** Drain unread snapshots into `out` as a per-band maximum. */
    private takeMaxFlux(out: Float32Array) {
        const n = out.length;
        out.fill(0);
        let idx = this.fluxCursor;
        // How many entries are unread, bounded by what the ring still holds.
        let unread = (this.ringWrite - idx + RING_SNAPSHOTS) % RING_SNAPSHOTS;
        if (unread === 0 && this.latest) unread = 0;
        if (unread > this.ringCount) unread = this.ringCount;

        for (let i = 0; i < unread; i++) {
            const s = this.ring[idx];
            if (s && s.flux.length === n) {
                for (let k = 0; k < n; k++) if (s.flux[k] > out[k]) out[k] = s.flux[k];
            }
            idx = (idx + 1) % RING_SNAPSHOTS;
        }
        this.fluxCursor = this.ringWrite;
    }

    /**
     * Snapshot nearest a given AudioContext time, for modulation recording's
     * per-frame back-fill. Null when the ring does not reach back that far.
     */
    public snapshotAt(t: number): BandSnapshot | null {
        if (this.ringCount === 0) return null;
        let best: BandSnapshot | null = null;
        let bestDt = Infinity;
        for (let i = 0; i < this.ringCount; i++) {
            const s = this.ring[(this.ringWrite - 1 - i + RING_SNAPSHOTS * 2) % RING_SNAPSHOTS];
            if (!s) continue;
            const dt = Math.abs(s.t - t);
            if (dt < bestDt) { bestDt = dt; best = s; }
        }
        return best;
    }

    /** Liveness signal only — the bin contents have no consumer. Returns the
     *  band levels so `AudioSpectrum` and `ModulationEngine`'s null checks read
     *  true once analysis is running. */
    public getRawData(): Float32Array | null {
        return this.latest ? filterBank.levels : null;
    }

    public getPeakLevel(): number { return this.lastPeak; }
    public getSignalGain(): number { return this.agc.value; }
}
