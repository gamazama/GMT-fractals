/**
 * WorkletAnalysis — main-thread receiver for the analysis worklet.
 *
 * Fills `filterBank` — `levels`, `normalized`, `fluxRate` — from batches the
 * worklet posts. It briefly had a main-thread counterpart as the other arm of
 * an A/B (ADR-0110); that arm was concluded and deleted, and this is now the
 * only producer. `ModulationEngine` and `AudioSpectrum` read the bank exactly
 * as they did before either existed.
 *
 * @assumption The band TABLE is built locally, never received. Both sides
 *   derive it from `(sampleRate, fftSize, bandsPerOctave)` via
 *   `bandMath.buildBandTable`, so `filterBank.rebuild()` here and the
 *   analyser's table in the worklet agree by construction. Shipping the table
 *   would create a second source of truth and a resize race.
 * @invariant Snapshots land in a BOUNDED ring. The worklet never stalls, so if
 *   the main thread does, its message queue delivers a burst — writing into a
 *   fixed ring means the burst costs O(ring), and the oldest entries (which
 *   nobody can use any more) fall out on their own.
 *   — proven by: npm run test:worklet-analysis ("nearest to t=0 is hop 89 —
 *   the ring holds exactly 512, hops 1..88 are gone").
 * @invariant Levels take the LATEST snapshot; flux takes the MAX since the last
 *   read. Levels are already smoothed at hop rate, so the newest value carries
 *   the gap. Flux is deliberately unsmoothed — it is an event measure, and
 *   averaging it across a gap would dilute one kick by the gap's length, so a
 *   max is the only aggregation that preserves "an onset happened".
 *   — proven by: npm run test:worklet-analysis ("levels are hop 3's, not hop
 *   1's", "band A: max 30 in the middle hop, not the last hop's 7").
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
export const RING_SNAPSHOTS = 512;

/** The Detail setting the Response curve was calibrated against. Response's
 *  budget is measured from here, so 4096 reproduces the old tau exactly and
 *  every other Detail compensates around it. */
const REFERENCE_FFT_SIZE = 4096;

export interface BandSnapshot {
    t: number;
    levels: Float32Array;
    flux: Float32Array;
    peak: number;
}

export class WorkletAnalysis {
    private ctx: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private agc = new AutoGain();
    private failed = false;

    private desiredFftSize = 4096;
    private dbFloor = -90;
    private dbCeiling = -10;
    private bandsPerOctave = 6;
    private tiltDbPerOct = 0;
    private smoothingTauSec = DEFAULT_SMOOTHING_TAU_SEC;
    /** Raw 0..0.99 Response value; tau is derived from it AND fftSize. */
    private smoothingParam = 0.8;

    // Bounded history ring.
    private ring: BandSnapshot[] = [];
    private ringWrite = 0;
    private ringCount = 0;
    /** Hops written since `takeMaxFlux` last drained. A COUNT, not a ring
     *  index — an index difference modulo the ring aliases at exactly one lap
     *  (see `takeMaxFlux`). */
    private hopsSinceFluxRead = 0;
    private latest: BandSnapshot | null = null;
    private lastPeak = 0;
    private droppedTotal = 0;

    public get sampleRate(): number { return this.ctx?.sampleRate ?? 48000; }
    public get binWidthHz(): number { return this.sampleRate / this.desiredFftSize; }
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
            this.sendConfig();
        } catch (err) {
            // No fallback by design — the panel surfaces `hasFailed` instead.
            // A silent downgrade would hide whichever bug caused this.
            this.failed = true;
            console.error('[audio] AudioWorklet analysis failed to load — audio modulation will not run', err);
        }
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
            this.hopsSinceFluxRead = 0;
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
            this.hopsSinceFluxRead++;
        }
    }

    // ── Public surface ─────────────────────────────────────────────────────

    /**
     * The panel's 0..0.99 Response control.
     *
     * `AnalyserNode.smoothingTimeConstant` was a per-CALL coefficient, so its
     * effective time constant moved with how often the caller read — the
     * rate-dependence this backend exists to remove. The control is still the
     * useful knob, so it maps through the relation that gave the old value its
     * meaning: `tau = -dt / ln(s)` at dt = 1/60, the rate it was tuned at.
     *
     * @assumption Response and Detail share ONE latency budget instead of
     *   stacking. The FFT window is itself a smoother — a 4096 window averages
     *   85ms of audio and lands its energy centroid ~43ms in the past — so
     *   adding a 75ms one-pole on top used to make ~118ms of total lag, and
     *   RAISING Detail for bass resolution silently made the rig sluggish.
     *
     *   Response now names the TOTAL response time. The window's contribution
     *   is subtracted from it, so the smoother only makes up the difference:
     *   at Detail 8192 (85ms of window) the one-pole nearly disappears, and at
     *   2048 it does more. Total response stays put, and the two controls
     *   become what they claim to be — one sets speed, the other sets frequency
     *   resolution.
     * @invariant Calibrated so Detail 4096 reproduces the previous tau exactly.
     *   Nothing changes for anyone on the default; the coupling only shows up
     *   when Detail moves. `test:band-analyser` [8] pins both ends.
     */
    public setSmoothing(val: number): void {
        this.smoothingParam = Math.max(0, Math.min(0.99, val));
        this.recomputeTau();
        this.sendConfig();
    }

    /** Half a window of group delay, in seconds — what the FFT costs before
     *  any smoothing is applied. */
    private windowLagSec(fftSize: number): number {
        return (fftSize / 2) / this.sampleRate;
    }

    private recomputeTau(): void {
        const s = this.smoothingParam;
        if (s <= 0) { this.smoothingTauSec = 0; return; }
        // The tau this control used to mean, plus the window it was implicitly
        // sitting on top of — that sum is the total the user actually dialled.
        const budget = -(1 / 60) / Math.log(s) + this.windowLagSec(REFERENCE_FFT_SIZE);
        this.smoothingTauSec = Math.max(0, budget - this.windowLagSec(this.desiredFftSize));
    }

    public setFftSize(size: number): void {
        const clamped = Math.max(32, Math.min(32768, 2 ** Math.round(Math.log2(size))));
        if (clamped === this.desiredFftSize) return;
        this.desiredFftSize = clamped;
        // Detail moved, so the window's share of the response budget moved —
        // see `recomputeTau`'s @invariant on setSmoothing.
        this.recomputeTau();
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

    /**
     * Drain unread snapshots into `out` as a per-band maximum.
     *
     * `unread` is a COUNT of hops written since the last drain, clamped to
     * what the ring still holds, and the walk starts that many entries behind
     * the write index. It used to be a ring-index difference,
     * `(ringWrite - cursor + RING) % RING`, and that ALIASED at exactly one
     * lap: 0 both when nothing is unread and when the writer has lapped the
     * reader by exactly RING_SNAPSHOTS hops, so a whole ring of onsets drained
     * as nothing. The overnight audit (cycle 4) measured it against this
     * class: 512 unread hops all carrying flux 30 produced a max `fluxRate` of
     * 0. Reachability was narrow — a ~2.73s main-thread stall landing on an
     * exact multiple of 512 hops — but ADR-0110 names long tick stalls as
     * precisely the scenario this receiver exists to survive. Past a lap it
     * was also partial: at 600 unread it walked only the 88 hops written after
     * the lap and skipped the 424 older ones the ring still held. Both
     * resolved 2026-09-02 (audit item L769); `test:worklet-analysis` [6] and
     * [7] pin them. A dead line — `if (unread === 0 && this.latest) unread =
     * 0;` — sat here as the only in-tree trace that the hole had been noticed;
     * the guard is that trace now, so it went with the fix.
     *
     * Two shortcuts that were NOT the fix, kept because the guard proves them
     * wrong: `unread = ringCount` when the difference reads 0 cannot tell an
     * idle tick from a full lap, so it re-drains the whole ring on every tick
     * with nothing new (measured: the idle tick after a full-ring drain read
     * 30); `unread = 1` reads `ring[ringWrite]`, which is the OLDEST survivor
     * — the slot about to be overwritten — not the newest (measured: an onset
     * in the newest hop alone still read 0).
     *
     * The routine no-new-snapshot tick is an HONEST zero, not a dropped
     * transient: the onset was delivered at full max on the tick its batch
     * landed, and `ModulationEngine`'s per-rule attack/decay envelope carries
     * the pulse forward across ticks. Batches arrive at ~53/s, so zero-drain
     * ticks are routine (~12% at 60Hz, ~63% at 144Hz), not a smell.
     *
     * @invariant Flux is the per-band MAX over every hop written since the
     *   last drain that the ring still holds — at exactly one lap and beyond
     *   it — and a tick with nothing new reads 0.
     *   — proven by: npm run test:worklet-analysis ("512 unread hops of flux
     *   30 drain as 30, not 0", "an onset at hop 200 (held, older than the
     *   lap) is seen after 600 unread hops", "no new snapshot → fluxRate is 0
     *   everywhere").
     */
    private takeMaxFlux(out: Float32Array) {
        const n = out.length;
        out.fill(0);
        // Past a full lap the oldest hops have been overwritten; only the
        // newest `ringCount` are still there to read.
        const unread = Math.min(this.hopsSinceFluxRead, this.ringCount);
        // Oldest unread entry. `unread <= RING_SNAPSHOTS`, so one added ring
        // length keeps the operand non-negative.
        let idx = (this.ringWrite - unread + RING_SNAPSHOTS) % RING_SNAPSHOTS;
        for (let i = 0; i < unread; i++) {
            const s = this.ring[idx];
            if (s && s.flux.length === n) {
                for (let k = 0; k < n; k++) if (s.flux[k] > out[k]) out[k] = s.flux[k];
            }
            idx = (idx + 1) % RING_SNAPSHOTS;
        }
        this.hopsSinceFluxRead = 0;
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

    /**
     * Write the snapshot nearest `t` into `filterBank`, for modulation
     * recording's per-frame back-fill. Returns false when the ring does not
     * reach back that far, so the caller can stop rather than fill with
     * whatever the oldest entry happens to be.
     *
     * @invariant Does NOT touch the AGC or the flux read mark
     *   (`hopsSinceFluxRead`). This is a rewind for one frame's capture, not a
     *   tick — advancing either would corrupt the live path's state, and
     *   `takeMaxFlux` would then skip snapshots the real read still needs.
     *   — proven by (the flux half): npm run test:worklet-analysis ("the live
     *   tick still drains all three hops — the back-fill moved no cursor").
     */
    public applySnapshotAt(t: number, maxAgeSec: number): boolean {
        const s = this.snapshotAt(t);
        if (!s || Math.abs(s.t - t) > maxAgeSec) return false;
        if (s.levels.length !== filterBank.levels.length) return false;
        filterBank.levels.set(s.levels);
        filterBank.normalized.set(s.levels);
        filterBank.fluxRate.set(s.flux);
        return true;
    }

    /** True once at least one snapshot has arrived. Replaces `getRawData()`,
     *  which returned a bin array both callers only null-checked. */
    public hasSignal(): boolean { return this.latest !== null; }

    public getPeakLevel(): number { return this.lastPeak; }
    public getSignalGain(): number { return this.agc.value; }
}
