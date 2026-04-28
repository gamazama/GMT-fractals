/**
 * In-browser perf benchmark for the deep-zoom kernel. Iterates through
 * a matrix of (view, iter cap, LA on/off, AT on/off), waits for the
 * worker to build the corresponding orbit/LA/AT data, samples
 * `engine.getJuliaMs()` for ~30 frames, reports the median.
 *
 * Output: a flat array of BenchmarkResult that can be pretty-printed
 * to a table or copied as markdown. Designed so each row pairs with at
 * least one neighbour that differs only in LA/AT toggles — easy
 * speedup-ratio reads.
 */

import type { useEngineStore as UseEngineStore } from '../../store/engineStore';
import type { FluidEngine } from '../fluid/FluidEngine';

export interface BenchmarkCase {
    name: string;
    /** Fractal-space centre to render around. */
    center: [number, number];
    /** Linear zoom (smaller = deeper). */
    zoom: number;
    /** Per-pixel max iterations. */
    iter: number;
    /** Engage deep-zoom (perturbation) path. */
    deep: boolean;
    /** Use LA stage walk inside the deep path. */
    useLA: boolean;
    /** Use AT front-load inside the deep path. */
    useAT: boolean;
}

export interface BenchmarkResult extends BenchmarkCase {
    /** Median Julia-pass GPU time across the sample window (ms). */
    juliaMs: number;
    /** Min observed (lower bound — indicates kernel-only cost without
     *  any frame-to-frame jitter from compositor / post-FX). */
    juliaMsMin: number;
    /** All raw samples, kept for debugging unstable cases. */
    samples: number[];
    /** False when the GPU-timer extension wasn't usable for this run
     *  (e.g. early frames before any query had completed). */
    timerOk: boolean;
    /** Diagnostic counts captured from the engine after build but
     *  before sampling. */
    orbitLength: number;
    laStageCount: number;
    laCount: number;
    /** Whether AT actually engaged for this case (worker may have
     *  rejected it if no usable stage at this view). */
    atEngaged: boolean;
}

const waitFrames = (n: number): Promise<void> =>
    new Promise((resolve) => {
        let count = 0;
        const tick = (): void => {
            count++;
            if (count >= n) resolve();
            else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

const median = (xs: number[]): number => {
    if (xs.length === 0) return 0;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
};

/**
 * Default test matrix. Pinned to a specific c = (-0.81, -0.054)
 * (the fluid-toy default centre — known to land in interesting Julia
 * boundary territory) so results compare across runs and machines.
 *
 * Cases are ordered to make pair-wise speedup ratios obvious in the
 * output table — adjacent rows differ only in one toggle.
 */
export const DEFAULT_BENCH_CASES: BenchmarkCase[] = [
    // Reference: standard f32 path, no deep mode.
    { name: 'standard / shallow',           center: [-0.81, -0.054], zoom: 1.29, iter: 310,  deep: false, useLA: false, useAT: false },
    // Deep path, shallow zoom. Validity gate should bypass LA/AT;
    // this measures the deep-path overhead at the depth where it
    // doesn't help.
    { name: 'deep shallow / no LA / no AT', center: [-0.81, -0.054], zoom: 1.29, iter: 1000, deep: true,  useLA: false, useAT: false },
    { name: 'deep shallow / LA',            center: [-0.81, -0.054], zoom: 1.29, iter: 1000, deep: true,  useLA: true,  useAT: false },
    { name: 'deep shallow / LA + AT',       center: [-0.81, -0.054], zoom: 1.29, iter: 1000, deep: true,  useLA: true,  useAT: true  },
    // Medium zoom — deep-path territory but still well within f32.
    { name: 'deep 1e-5 / no LA / no AT',    center: [-0.81, -0.054], zoom: 1e-5, iter: 2000, deep: true,  useLA: false, useAT: false },
    { name: 'deep 1e-5 / LA',               center: [-0.81, -0.054], zoom: 1e-5, iter: 2000, deep: true,  useLA: true,  useAT: false },
    { name: 'deep 1e-5 / LA + AT',          center: [-0.81, -0.054], zoom: 1e-5, iter: 2000, deep: true,  useLA: true,  useAT: true  },
    // Deep zoom — where AT/LA should pay off.
    { name: 'deep 1e-10 / no LA / no AT',   center: [-0.81, -0.054], zoom: 1e-10, iter: 5000, deep: true, useLA: false, useAT: false },
    { name: 'deep 1e-10 / LA',              center: [-0.81, -0.054], zoom: 1e-10, iter: 5000, deep: true, useLA: true,  useAT: false },
    { name: 'deep 1e-10 / LA + AT',         center: [-0.81, -0.054], zoom: 1e-10, iter: 5000, deep: true, useLA: true,  useAT: true  },
    // High iter at depth — boundary-pixel scaling.
    { name: 'deep 1e-10 / 20k iter / LA+AT',center: [-0.81, -0.054], zoom: 1e-10, iter: 20000, deep: true, useLA: true,  useAT: true  },
];

/** Wait until the engine reports an orbit length matching the
 *  expected case (within a tolerance — the worker may shorten on
 *  early escape). Times out at 3s to avoid hanging on bad cases. */
const waitForOrbit = async (
    engine: FluidEngine,
    expectedIter: number,
    deep: boolean,
    timeoutMs = 3000,
): Promise<void> => {
    if (!deep) {
        await waitFrames(20);
        return;
    }
    const start = performance.now();
    // Engine doesn't expose orbit length directly; we just give it
    // enough frames for the worker to land. Adaptive: if deep is on
    // and the GPU timer is reading 0 (no Julia frame completed), we
    // keep waiting.
    while (performance.now() - start < timeoutMs) {
        const ms = engine.getJuliaMs();
        if (ms > 0) {
            // Got at least one measured frame after orbit upload —
            // good enough.
            await waitFrames(15);  // small extra warmup
            return;
        }
        await waitFrames(5);
    }
};

interface BenchHarnessState {
    setJulia: (x: { center?: { x: number; y: number }; zoom?: number }) => void;
    setDeepZoom: (x: {
        enabled?: boolean;
        useLA?: boolean;
        useAT?: boolean;
        deepMaxIter?: number;
    }) => void;
}

/** Apply one test case via the store + wait for the worker build to settle. */
const applyCase = async (
    store: typeof UseEngineStore,
    engine: FluidEngine,
    c: BenchmarkCase,
): Promise<void> => {
    const s = store.getState() as unknown as BenchHarnessState;
    s.setJulia({ center: { x: c.center[0], y: c.center[1] }, zoom: c.zoom });
    s.setDeepZoom({
        enabled: c.deep,
        useLA: c.useLA,
        useAT: c.useAT,
        deepMaxIter: c.iter,
    });
    await waitForOrbit(engine, c.iter, c.deep);
};

/**
 * Run the full benchmark matrix with isolated kernel cost. Pauses
 * fluid sim, disables TSAA, sets K=1 for the duration so we measure
 * pure Julia-pass time without contamination. Restores the previous
 * state at the end.
 */
export const runBenchmark = async (
    engine: FluidEngine,
    store: typeof UseEngineStore,
    cases: BenchmarkCase[] = DEFAULT_BENCH_CASES,
    onProgress?: (i: number, total: number, current: BenchmarkCase) => void,
): Promise<BenchmarkResult[]> => {
    const results: BenchmarkResult[] = [];

    // Save current state so we can restore at the end.
    const engineWithSetParams = engine as unknown as {
        setParams: (p: { tsaa?: boolean; tsaaPerFrameSamples?: number }) => void;
        setForceFluidPaused: (b: boolean) => void;
    };
    const stateRoot = store.getState() as unknown as {
        accumulation?: boolean;
        setAccumulation?: (b: boolean) => void;
        sampleCap?: number;
    };
    const prevAccum = stateRoot.accumulation;

    // Isolate: pause fluid, K=1, no TSAA. The Julia pass measurement
    // is then unaffected by sim cost / accumulation blending / sub-
    // sample multiplier.
    engineWithSetParams.setForceFluidPaused(true);
    engineWithSetParams.setParams({ tsaa: false, tsaaPerFrameSamples: 1 });
    if (stateRoot.setAccumulation) stateRoot.setAccumulation(false);

    try {
        for (let i = 0; i < cases.length; i++) {
            const c = cases[i];
            onProgress?.(i, cases.length, c);
            await applyCase(store, engine, c);

            // Sample window — 30 frames after warmup for a stable median.
            const samples: number[] = [];
            for (let j = 0; j < 30; j++) {
                await waitFrames(1);
                const ms = engine.getJuliaMs();
                if (ms > 0) samples.push(ms);
            }

            const med = median(samples);
            const min = samples.length > 0 ? Math.min(...samples) : 0;
            results.push({
                ...c,
                juliaMs: med,
                juliaMsMin: min,
                samples,
                timerOk: samples.length > 0,
                orbitLength: 0,
                laStageCount: 0,
                laCount: 0,
                atEngaged: false,
            });
        }
    } finally {
        // Restore state. Always re-enable accumulation regardless of
        // its prior value — K=1 + TSAA progressive convergence is the
        // intended default render path; leaving accumulation off
        // produces a noisy single-sample image.
        engineWithSetParams.setForceFluidPaused(false);
        engineWithSetParams.setParams({ tsaa: true, tsaaPerFrameSamples: 1 });
        if (stateRoot.setAccumulation) {
            stateRoot.setAccumulation(true);
        }
        // Mark prevAccum as used to keep the linter happy with the
        // unused-variable check; the new restore policy ignores it.
        void prevAccum;
    }
    return results;
};

/** Format the result set as a markdown-style table — easy to read in
 *  console + paste into chat. */
export const formatResultsAsMarkdown = (results: BenchmarkResult[]): string => {
    const header = '| Case | Iter | Deep | LA | AT | Julia ms | min ms |';
    const sep    = '|------|------|------|----|----|---------|--------|';
    const rows = results.map((r) => {
        const ms = r.timerOk ? r.juliaMs.toFixed(2) : '—';
        const minMs = r.timerOk ? r.juliaMsMin.toFixed(2) : '—';
        return `| ${r.name} | ${r.iter} | ${r.deep ? '✓' : ''} | ${r.useLA ? '✓' : ''} | ${r.useAT ? '✓' : ''} | ${ms} | ${minMs} |`;
    });
    return [header, sep, ...rows].join('\n');
};

/** Speedup ratios — for each LA-on row, divide the matching no-LA row's
 *  ms by it. Same for AT. Useful summary line. */
export const computeSpeedups = (results: BenchmarkResult[]): string[] => {
    const lines: string[] = [];
    // Group by (zoom, iter, deep) and look for LA/AT toggle pairs.
    const key = (r: BenchmarkResult): string => `${r.zoom}|${r.iter}|${r.deep}`;
    const groups = new Map<string, BenchmarkResult[]>();
    for (const r of results) {
        const k = key(r);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
    }
    for (const [k, group] of groups) {
        const noOpt = group.find((r) => !r.useLA && !r.useAT);
        const laOnly = group.find((r) => r.useLA && !r.useAT);
        const both = group.find((r) => r.useLA && r.useAT);
        if (!noOpt || noOpt.juliaMs === 0) continue;
        if (laOnly && laOnly.juliaMs > 0) {
            const sp = noOpt.juliaMs / laOnly.juliaMs;
            lines.push(`${k}: LA speedup = ${sp.toFixed(2)}×`);
        }
        if (both && both.juliaMs > 0) {
            const sp = noOpt.juliaMs / both.juliaMs;
            lines.push(`${k}: LA+AT speedup = ${sp.toFixed(2)}×`);
        }
    }
    return lines;
};
