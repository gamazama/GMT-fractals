/**
 * bench-audio-dsp — what one analysis hop costs on the audio thread.
 *
 * The worklet runs `BandAnalyser.analyse()` once per hop (256 samples at
 * 48 kHz ≈ 187.5 times a second) inside a single `process()` call, so the hop
 * has to fit in one render quantum: 128 samples = 2.667 ms. This times the hop
 * and its stages in node — same V8, same typed-array loops as the worklet — and
 * reports them against that budget.
 *
 *   npm run bench:audio-dsp
 *   npm run bench:audio-dsp -- --json            # machine-readable
 *   npm run bench:audio-dsp -- --gate            # exit 1 if any shipped setting exceeds GATE_PCT of the quantum
 *
 * Shipped settings: Detail 2048 / 4096 / 8192 (`audio.fftSize`), Band Width
 * 3 / 6 / 12 per octave. Sizes above 8192 are printed for headroom only —
 * `WorkletAnalysis.setFftSize` accepts up to 32768 but no UI offers it.
 *
 * Cross-check that node is a fair stand-in: a Chrome trace of the live worklet
 * at Detail 4096 showed the "Realtime AudioWorklet thread" 4.5 % busy; this
 * bench predicted 3.9 % (0.21 ms × 187.5 hops/s) on the same machine
 * (2026-10-04).
 *
 * Median of 7 timed batches after a JIT warm-up. Numbers move ±5 % run to run;
 * treat a smaller difference as noise.
 */
import { BandAnalyser, DEFAULT_SMOOTHING_TAU_SEC } from '../engine/features/audioMod/dsp/bandAnalyser';
import { SpectrumFrame } from '../engine/features/audioMod/dsp/spectrumFrame';
import { FFT } from '../engine/features/audioMod/dsp/fft';
import { hopSamplesFor } from '../engine/features/audioMod/worklet/protocol';

const SR = 48000;
const QUANTUM_MS = (128 / SR) * 1000;
const HOP = hopSamplesFor(SR);
const HOP_SEC = HOP / SR;
/** A shipped setting may use at most this much of one quantum. */
const GATE_PCT = 35;
const SHIPPED_FFT = new Set([2048, 4096, 8192]);

const JSON_OUT = process.argv.includes('--json');
const GATE = process.argv.includes('--gate');

/** Pink-ish noise plus two tones: every bin finite, like real music. */
const signal = (n: number) => {
    const x = new Float32Array(n);
    let b = 0;
    for (let i = 0; i < n; i++) {
        b = 0.98 * b + 0.02 * (Math.random() * 2 - 1);
        x[i] = b * 4 + 0.2 * Math.sin((2 * Math.PI * 110 * i) / SR) + 0.1 * Math.sin((2 * Math.PI * 3300 * i) / SR);
    }
    return x;
};

const time = (fn: () => void, iters: number) => {
    for (let i = 0; i < Math.min(iters, 400); i++) fn();
    const samples: number[] = [];
    for (let r = 0; r < 7; r++) {
        const t0 = performance.now();
        for (let i = 0; i < iters; i++) fn();
        samples.push((performance.now() - t0) / iters);
    }
    samples.sort((a, b) => a - b);
    return samples[3];
};

interface Row { fftSize: number; bandsPerOctave: number; bands: number; fftMs: number; frameMs: number; hopMs: number; pctOfQuantum: number; cpuPct: number; shipped: boolean }
const rows: Row[] = [];

for (const fftSize of [1024, 2048, 4096, 8192, 16384, 32768]) {
    for (const bpo of [3, 6, 12]) {
        const x = signal(fftSize);
        const iters = Math.max(40, Math.round(400000 / fftSize));

        const fft = new FFT(fftSize);
        const re = new Float32Array(fftSize), im = new Float32Array(fftSize);
        const fftMs = time(() => { re.set(x); im.fill(0); fft.transform(re, im); }, iters);

        const frame = new SpectrumFrame(fftSize);
        const frameMs = time(() => frame.analyse(x), iters);

        const an = new BandAnalyser({
            sampleRate: SR, fftSize, bandsPerOctave: bpo,
            dbFloor: -90, dbCeiling: -10, tiltDbPerOct: 3, smoothingTauSec: DEFAULT_SMOOTHING_TAU_SEC,
        });
        const hopMs = time(() => an.analyse(x, HOP_SEC), iters);

        rows.push({
            fftSize, bandsPerOctave: bpo, bands: an.bands.length, fftMs, frameMs, hopMs,
            pctOfQuantum: (hopMs / QUANTUM_MS) * 100, cpuPct: (hopMs / (HOP_SEC * 1000)) * 100,
            shipped: SHIPPED_FFT.has(fftSize),
        });
    }
}

if (JSON_OUT) {
    console.log(JSON.stringify({ node: process.version, sampleRate: SR, hopSamples: HOP, quantumMs: QUANTUM_MS, rows }, null, 1));
} else {
    console.log(`sample rate ${SR}   hop ${HOP} samples (${(1 / HOP_SEC).toFixed(1)}/s)   quantum budget ${QUANTUM_MS.toFixed(3)} ms   node ${process.version}\n`);
    console.log('  Detail  bands   fft only   frame → dB   full hop   % of quantum   audio-thread CPU');
    for (const r of rows) {
        console.log(
            `${r.shipped ? ' ' : '·'}${String(r.fftSize).padStart(7)}  ${String(r.bands).padStart(5)}  ${r.fftMs.toFixed(4).padStart(8)}ms  ${r.frameMs.toFixed(4).padStart(9)}ms  ${r.hopMs.toFixed(4).padStart(7)}ms  ${r.pctOfQuantum.toFixed(1).padStart(10)}%  ${r.cpuPct.toFixed(1).padStart(13)}%`,
        );
    }
    console.log('\n  · = not offered in the UI (headroom only).  "frame → dB" is SpectrumFrame.analyse alone; the hop no longer goes through dB.');
}

if (GATE) {
    const over = rows.filter(r => r.shipped && r.pctOfQuantum > GATE_PCT);
    if (over.length) {
        console.error(`\n✗ ${over.length} shipped setting(s) use more than ${GATE_PCT}% of the render quantum:`);
        for (const r of over) console.error(`   Detail ${r.fftSize}, ${r.bandsPerOctave}/oct: ${r.pctOfQuantum.toFixed(1)}%`);
        process.exit(1);
    }
    console.log(`\n✓ every shipped setting fits in ${GATE_PCT}% of the render quantum`);
}
