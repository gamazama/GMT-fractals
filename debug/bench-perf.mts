/**
 * Deterministic perf benchmark for app-gmt.
 *
 * Boots app-gmt in headless Chromium at a pinned viewport / DPR, waits for a
 * deterministic boot signal (proxy ready + N accumulation frames), then runs
 * three scripted scenarios:
 *
 *   1. idle      — hold still for FRAMES_PER_SCENARIO RAFs
 *   2. mutation  — dispatch MUTATIONS_PER_SCENARIO setLiveModulations() calls,
 *                  one per RAF, to exercise the store-fanout path that
 *                  AutoFeaturePanel and DomOverlays subscribe to
 *   3. orbit     — scripted mouse drag of ORBIT_STEPS steps, exercises the
 *                  per-frame postMessage + serialization path
 *
 * Per scenario, captured metrics:
 *   - frame interval distribution (RAF dt array → fps p50 / p5)
 *   - long task count + total blocking time
 *   - Zustand setState notification count (proxy for "store fanout work")
 *   - Worker postMessage call count + total transferred bytes
 *   - JS heap delta (Chromium-only)
 *
 * Each scenario runs RUNS_PER_SCENARIO times. Output is the median of each
 * metric across runs (plus min/max). GPU timing is non-deterministic — pin
 * the viewport, run multiple times, and compare distributions, not single
 * numbers.
 *
 *   Usage:
 *     npx tsx debug/runWithServer.mts -- npx tsx debug/bench-perf.mts
 *   or with a pre-running dev server on :3400:
 *     npx tsx debug/bench-perf.mts
 *
 * Output: debug/bench-perf-latest.json (full data) + console summary.
 */

import { chromium, type Page } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { acquireBenchLock } from './helpers/bench-lock.mts';

// ─── tunables ──────────────────────────────────────────────────────────
const URL = process.env.ENGINE_URL
    ? `${process.env.ENGINE_URL}/app-gmt.html`
    : 'http://localhost:3400/app-gmt.html';
const VIEWPORT = { width: 1920, height: 1080 };
const DPR = 1;
const BOOT_TIMEOUT_MS = 30_000;
const BOOT_ACCUM_MIN = 20;         // wait until accumulationCount reaches this
const WARMUP_FRAMES = 60;          // discard before starting scenarios
const FRAMES_PER_SCENARIO = 240;   // ~4s at 60fps
const MUTATIONS_PER_SCENARIO = 120;
const ORBIT_STEPS = 120;
const RUNS_PER_SCENARIO = 3;
const OUTPUT_DIR = 'debug';

// ─── types ─────────────────────────────────────────────────────────────
interface ProfilerBucket {
    count: number;        // commit count for this Profiler id
    totalActualMs: number; // sum of actualDuration (work React did this commit)
    totalBaseMs: number;   // sum of baseDuration (worst-case render of subtree)
    maxActualMs: number;   // longest single commit
}

// Diff of THREE.WebGLRenderer.info + bench RT counters between scenario
// start and end. All fields are deltas, except `programs`/`textures`/
// `geometries` which are point-in-time totals at scenario end (per-frame
// allocation churn shows up as `frame`-normalized rate elsewhere).
interface RenderInfoDelta {
    calls: number;        // draw calls during scenario
    triangles: number;
    frames: number;       // GPU frames rendered
    readRenderTargetPixels: number;   // sync GPU stalls
    setRenderTargetSwitches: number;  // FBO binds
    programsAtEnd: number;
    texturesAtEnd: number;
    geometriesAtEnd: number;
}

interface ScenarioMetrics {
    durationMs: number;
    frameDts: number[];
    fpsP50: number;          // main-thread RAF rate
    fpsP5: number;
    workerFps: number;       // ACTUAL visible frame rate (worker FRAME_READY)
    accumDelta: number;      // accumulationCount progression
    coverage: number;        // fraction of viewport pixels covered by fractal (0..1)
    longTaskCount: number;
    longTaskTotalMs: number;
    storeNotifyCount: number;
    workerPostCount: number;
    workerPostBytes: number;
    heapDeltaMb: number;
    // Per-area React render attribution from <BenchProfiler> boundaries.
    // Map keyed by Profiler id (e.g. "TopBarHost", "Dock:left", "R3FCanvas").
    profilers: Record<string, ProfilerBucket>;
    // Worker-side renderer.info diff — exposes draw-call rate, RT
    // readback count, RT switch count attributable to this scenario.
    renderInfo: RenderInfoDelta;
}

interface ScenarioResult {
    name: string;
    runs: ScenarioMetrics[];
    median: ScenarioMetrics;
}

// ─── instrumentation injected into the page ───────────────────────────
// Runs before any app code via page.addInitScript. Sets up:
//   __bench.start() / .stop() — toggles capture
//   __bench.snapshot()        — returns metrics since start()
const initScript = `
(function() {
    const b = {
        capturing: false,
        startTs: 0,
        frameDts: [],
        lastFrameTs: 0,
        longTaskCount: 0,
        longTaskMs: 0,
        storeNotifyCount: 0,
        workerPostCount: 0,
        workerPostBytes: 0,
        workerPostBytesSampled: 0,
        workerPostSampleCount: 0,
        workerMsgCount: 0,
        workerFrameCount: 0,
        workerFrameTotal: 0,
        heapStart: 0,
        accumStart: 0,
        bootResolved: false,
        bootResolveFn: null,
        // Per-id React commit buckets. Populated by BenchProfiler's
        // onRender callback while capturing. Keyed by Profiler id.
        profilers: Object.create(null),
    };

    // Promise that resolves on the BOOT_FRAME_MIN'th FRAME_READY message.
    const bootReady = new Promise((resolve) => {
        if (b.bootResolved) resolve(undefined);
        else b.bootResolveFn = () => resolve(undefined);
    });

    // PerformanceObserver — long tasks (>50ms blocking on main thread).
    try {
        new PerformanceObserver((list) => {
            if (!b.capturing) return;
            for (const entry of list.getEntries()) {
                b.longTaskCount += 1;
                b.longTaskMs += entry.duration;
            }
        }).observe({ entryTypes: ['longtask'] });
    } catch (e) { /* longtask not supported in some headless modes */ }

    // RAF tap — record dt between frames during capture.
    const rafTap = (ts) => {
        if (b.capturing) {
            if (b.lastFrameTs !== 0) b.frameDts.push(ts - b.lastFrameTs);
            b.lastFrameTs = ts;
        }
        requestAnimationFrame(rafTap);
    };
    requestAnimationFrame(rafTap);

    // Patch Worker.postMessage so we count messages + payload bytes from any
    // worker the app spawns (the renderer + anything else).
    const OrigWorker = window.Worker;
    // Sample 1-in-N postMessage payloads with JSON.stringify to estimate
    // bytes. JSON.stringify on every post added 0.5fps overhead in the
    // previous bench; sampling at 1/16 keeps the cost in the noise while
    // still giving a usable byte estimate (avg × total). We multiply
    // sampled bytes-per-message back up in the snapshot.
    const POST_SAMPLE_PERIOD = 16;
    function PatchedWorker(...args) {
        const w = new OrigWorker(...args);
        const origPost = w.postMessage.bind(w);
        w.postMessage = function(msg, transfer) {
            if (b.capturing) {
                b.workerPostCount += 1;
                if ((b.workerPostCount & (POST_SAMPLE_PERIOD - 1)) === 0) {
                    // Cheap byte estimate: stringify size in chars, treat
                    // as bytes. Underestimates UTF-16 surrogate pairs but
                    // good enough for relative comparisons across runs.
                    try {
                        const s = JSON.stringify(msg);
                        if (s) {
                            b.workerPostBytesSampled += s.length;
                            b.workerPostSampleCount += 1;
                        }
                    } catch (_) { /* circular ref / transferable; skip */ }
                }
            }
            return transfer ? origPost(msg, transfer) : origPost(msg);
        };
        // Count incoming worker messages (FRAME_READY etc) — proxy for the
        // worker's actual paint rate, independent of accumulationCount which
        // resets on state changes. Also tracks total frames ever (separate
        // from the capturing-window counter) so the boot promise can resolve.
        w.addEventListener('message', (ev) => {
            const t = ev && ev.data && ev.data.type;
            const isFrame = t === 'FRAME_READY' || t === 'frame_ready';
            if (isFrame) b.workerFrameTotal += 1;
            if (b.capturing) {
                b.workerMsgCount += 1;
                if (isFrame) b.workerFrameCount += 1;
            }
            // Boot signal: keep in sync with BOOT_FRAME_MIN in the harness.
            if (isFrame && b.workerFrameTotal >= 3 && !b.bootResolved) {
                b.bootResolved = true;
                b.bootResolveFn && b.bootResolveFn();
            }
        });
        return w;
    }
    PatchedWorker.prototype = OrigWorker.prototype;
    window.Worker = PatchedWorker;

    // Hook the Zustand store after it mounts. Store is exposed at
    // window.__engineStore; subscribe to count notifications.
    let storeUnsub = null;
    const hookStore = () => {
        const s = window.__engineStore || window.__store;
        if (!s || typeof s.subscribe !== 'function') return false;
        storeUnsub = s.subscribe(() => { if (b.capturing) b.storeNotifyCount += 1; });
        return true;
    };
    const storeHookInterval = setInterval(() => {
        if (hookStore()) clearInterval(storeHookInterval);
    }, 50);

    const accumNow = () => (window.__gmtProxy && window.__gmtProxy.accumulationCount) || 0;

    // React Profiler onRender — invoked once per commit per <Profiler id>.
    // BenchProfiler reads this via window.__bench.onRender at render time
    // and only attaches it when present, so non-bench runs pay zero cost.
    // Args: (id, phase, actualDuration, baseDuration, startTime, commitTime).
    const onRender = (id, _phase, actualDuration, baseDuration) => {
        if (!b.capturing) return;
        let bucket = b.profilers[id];
        if (!bucket) {
            bucket = { count: 0, totalActualMs: 0, totalBaseMs: 0, maxActualMs: 0 };
            b.profilers[id] = bucket;
        }
        bucket.count += 1;
        bucket.totalActualMs += actualDuration;
        bucket.totalBaseMs += baseDuration;
        if (actualDuration > bucket.maxActualMs) bucket.maxActualMs = actualDuration;
    };

    window.__bench = {
        // Read at render time by BenchProfiler. Stable function reference
        // so React doesn't think the callback changed every render.
        onRender,
        start: () => {
            b.capturing = true;
            b.startTs = performance.now();
            b.frameDts = [];
            b.lastFrameTs = 0;
            b.longTaskCount = 0;
            b.longTaskMs = 0;
            b.storeNotifyCount = 0;
            b.workerPostCount = 0;
            b.workerPostBytes = 0;
            b.workerPostBytesSampled = 0;
            b.workerPostSampleCount = 0;
            b.workerMsgCount = 0;
            b.workerFrameCount = 0;
            b.profilers = Object.create(null);
            b.heapStart = (performance.memory && performance.memory.usedJSHeapSize) || 0;
            b.accumStart = accumNow();
        },
        stop: () => { b.capturing = false; },
        snapshot: () => {
            const heapEnd = (performance.memory && performance.memory.usedJSHeapSize) || 0;
            const accumDelta = accumNow() - b.accumStart;
            const dur = performance.now() - b.startTs;
            // Extrapolate total bytes from sampled posts. workerPostBytesSampled
            // is the sum of byte-sized messages, workerPostSampleCount how many
            // were measured, workerPostCount the total. Avg-times-count is a
            // standard sampling estimator — accurate to within ~5% at N>=20.
            const estimatedBytes = b.workerPostSampleCount > 0
                ? Math.round((b.workerPostBytesSampled / b.workerPostSampleCount) * b.workerPostCount)
                : 0;
            return {
                durationMs: dur,
                frameDts: b.frameDts.slice(),
                // Real visible-frame rate: count of FRAME_READY-typed worker
                // messages per second. Falls back to total worker msg count
                // if no message had type === 'FRAME_READY' (different worker
                // could use a different convention).
                workerFps: dur > 0
                    ? ((b.workerFrameCount || b.workerMsgCount) / (dur / 1000))
                    : 0,
                workerFrameCount: b.workerFrameCount,
                workerMsgCount: b.workerMsgCount,
                accumDelta,
                longTaskCount: b.longTaskCount,
                longTaskMs: b.longTaskMs,
                storeNotifyCount: b.storeNotifyCount,
                workerPostCount: b.workerPostCount,
                workerPostBytes: estimatedBytes,
                workerPostSampleCount: b.workerPostSampleCount,
                profilers: { ...b.profilers },
                heapDeltaMb: (heapEnd - b.heapStart) / (1024 * 1024),
            };
        },
        // Run RAF-paced mutations from the harness. Returns when count is reached.
        runMutations: async (count) => {
            const s = window.__engineStore || window.__store;
            if (!s) throw new Error('store not exposed on window');
            const setLive = s.getState().setLiveModulations;
            if (typeof setLive !== 'function') throw new Error('setLiveModulations missing');
            for (let i = 0; i < count; i++) {
                // Unique value per tick so React/Zustand can't elide.
                setLive({ __bench: i });
                await new Promise(requestAnimationFrame);
            }
        },
        // Wait for N RAF ticks — pure idle.
        waitFrames: async (count) => {
            for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
        },
        // Resolves once the worker has emitted BOOT_FRAME_MIN FRAME_READY
        // messages — i.e. the renderer is actually painting.
        waitForBoot: () => bootReady,
        bootFramesSeen: () => b.workerFrameTotal,
    };
})();
`;

// ─── helpers ───────────────────────────────────────────────────────────
const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
};

const median = (arr: number[]): number => percentile(arr, 50);

// Median-merge profiler buckets across runs. Per id, take the median of
// each scalar field. Ids missing from a run contribute zero for that run
// (the run never produced that commit), which is what we want for things
// like floating panels that mount/unmount across runs.
const mergeProfilers = (runs: ScenarioMetrics[]): Record<string, ProfilerBucket> => {
    const ids = new Set<string>();
    for (const r of runs) for (const k of Object.keys(r.profilers || {})) ids.add(k);
    const merged: Record<string, ProfilerBucket> = {};
    for (const id of ids) {
        const buckets = runs.map(r => r.profilers?.[id]);
        merged[id] = {
            count: median(buckets.map(b => b?.count ?? 0)),
            totalActualMs: median(buckets.map(b => b?.totalActualMs ?? 0)),
            totalBaseMs: median(buckets.map(b => b?.totalBaseMs ?? 0)),
            maxActualMs: median(buckets.map(b => b?.maxActualMs ?? 0)),
        };
    }
    return merged;
};

const summarise = (runs: ScenarioMetrics[]): ScenarioMetrics => ({
    durationMs: median(runs.map(r => r.durationMs)),
    frameDts: [],
    fpsP50: median(runs.map(r => r.fpsP50)),
    fpsP5: median(runs.map(r => r.fpsP5)),
    workerFps: median(runs.map(r => r.workerFps)),
    accumDelta: median(runs.map(r => r.accumDelta)),
    coverage: median(runs.map(r => r.coverage)),
    longTaskCount: median(runs.map(r => r.longTaskCount)),
    longTaskTotalMs: median(runs.map(r => r.longTaskTotalMs)),
    storeNotifyCount: median(runs.map(r => r.storeNotifyCount)),
    workerPostCount: median(runs.map(r => r.workerPostCount)),
    workerPostBytes: median(runs.map(r => r.workerPostBytes)),
    heapDeltaMb: median(runs.map(r => r.heapDeltaMb)),
    profilers: mergeProfilers(runs),
    renderInfo: {
        calls:                   median(runs.map(r => r.renderInfo.calls)),
        triangles:               median(runs.map(r => r.renderInfo.triangles)),
        frames:                  median(runs.map(r => r.renderInfo.frames)),
        readRenderTargetPixels:  median(runs.map(r => r.renderInfo.readRenderTargetPixels)),
        setRenderTargetSwitches: median(runs.map(r => r.renderInfo.setRenderTargetSwitches)),
        programsAtEnd:           median(runs.map(r => r.renderInfo.programsAtEnd)),
        texturesAtEnd:           median(runs.map(r => r.renderInfo.texturesAtEnd)),
        geometriesAtEnd:         median(runs.map(r => r.renderInfo.geometriesAtEnd)),
    },
});

const snapshotToMetrics = (snap: any): ScenarioMetrics => {
    const dts: number[] = snap.frameDts;
    const fpsList = dts.map(dt => dt > 0 ? 1000 / dt : 0);
    return {
        durationMs: snap.durationMs,
        frameDts: dts,
        fpsP50: percentile(fpsList, 50),
        fpsP5: percentile(fpsList, 5),
        workerFps: snap.workerFps,
        accumDelta: snap.accumDelta,
        coverage: 0, // populated separately via screenshot in runScenario()
        longTaskCount: snap.longTaskCount,
        longTaskTotalMs: snap.longTaskMs,
        storeNotifyCount: snap.storeNotifyCount,
        workerPostCount: snap.workerPostCount,
        workerPostBytes: snap.workerPostBytes,
        heapDeltaMb: snap.heapDeltaMb,
        profilers: snap.profilers || {},
        // Populated separately by the run-loop bookends; zero placeholder.
        renderInfo: {
            calls: 0, triangles: 0, frames: 0,
            readRenderTargetPixels: 0, setRenderTargetSwitches: 0,
            programsAtEnd: 0, texturesAtEnd: 0, geometriesAtEnd: 0,
        },
    };
};

// Captures a screenshot of the page and computes the fraction of pixels
// that differ from the top-left "background" pixel. Round-trips the PNG
// through the page's Canvas API so we don't need a Node-side PNG decoder.
// Heavier fractal coverage (more SDF hits, longer ray walks) correlates
// with worker-fps drops, so this is a useful normalizer.
const measureCoverage = async (page: Page): Promise<number> => {
    const buf = await page.screenshot({ type: 'png', fullPage: false });
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    return await page.evaluate(async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        // Treat top-left as background reference. >8 per-channel delta = covered.
        const br = data[0], bg = data[1], bb = data[2];
        let covered = 0;
        const n = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
            if (dr * dr + dg * dg + db * db > 192) covered += 1;
        }
        return covered / n;
    }, dataUrl);
};

// Apply / restore quality settings for the stress scenario. Uses
// setQuality(partial) — the DDFS-derived setter exposed on the engine
// store (see app-gmt/tutorial/lessons.ts:132 for the same pattern).
// Earlier 0.3/800 only landed ~50fps. Heavier settings to actually
// produce a 20-30fps baseline and isolate UI cost from paint cost.
const STRESS_QUALITY = { fudgeFactor: 0.05, maxSteps: 1500 };
const applyStressQuality = async (page: Page) => {
    await page.evaluate((q) => {
        const s = (window as any).__engineStore || (window as any).__store;
        if (!s) throw new Error('store not exposed');
        const setQuality = s.getState().setQuality;
        if (typeof setQuality !== 'function') throw new Error('setQuality missing');
        // Stash defaults so we can restore.
        (window as any).__benchStashedQuality = { ...s.getState().quality };
        setQuality(q);
    }, STRESS_QUALITY);
    // Wait for the recompile (changing fudgeFactor/maxSteps may trigger one).
    // hasCompiledShader is sticky; the right gate is "not currently compiling".
    await page.waitForFunction(
        `!window.__gmtProxy.isCompiling`,
        { timeout: 30_000, polling: 100 },
    );
    // Let a few frames render at the new settings before measuring.
    await page.evaluate(`window.__bench.waitFrames(60)`);
};
const restoreQuality = async (page: Page) => {
    await page.evaluate(() => {
        const s = (window as any).__engineStore || (window as any).__store;
        const stashed = (window as any).__benchStashedQuality;
        if (s && stashed) s.getState().setQuality(stashed);
    });
    await page.waitForFunction(
        `!window.__gmtProxy.isCompiling`,
        { timeout: 30_000, polling: 100 },
    );
    // Stabilization wait — restoring quality alone isn't enough. The
    // worker may still have heavy frames in flight at the stress
    // settings, and the path tracer's accumulation buffer is full of
    // stress-era samples. Reset accum and wait for N new samples to
    // confirm the worker is back at baseline frame cost. Without this,
    // any scenario following stress measures contaminated state (was
    // showing idle ~45fps instead of ~58fps).
    await page.evaluate(`window.__gmtProxy.resetAccumulation && window.__gmtProxy.resetAccumulation()`);
    await page.waitForFunction(
        `window.__gmtProxy.accumulationCount >= 10`,
        { timeout: 5000, polling: 50 },
    ).catch(() => {});
};

// Snapshot the worker's renderer.info + bench RT counters via the proxy
// RPC. Returns null if the proxy/RPC isn't available (e.g. worker crashed
// or the build doesn't have GET_RENDER_INFO yet — bench gracefully
// degrades to zero deltas in that case rather than failing the scenario).
const fetchRenderInfo = async (page: Page): Promise<any | null> => {
    return await page.evaluate(async () => {
        const proxy = (window as any).__gmtProxy;
        if (!proxy || typeof proxy.getRenderInfo !== 'function') return null;
        try { return await proxy.getRenderInfo(); } catch { return null; }
    });
};

const diffRenderInfo = (start: any | null, end: any | null): RenderInfoDelta => {
    const z = (k: string) => (end?.[k] ?? 0) - (start?.[k] ?? 0);
    return {
        calls: z('calls'),
        triangles: z('triangles'),
        frames: z('frame'),
        readRenderTargetPixels: z('readRenderTargetPixels'),
        setRenderTargetSwitches: z('setRenderTargetSwitches'),
        programsAtEnd: end?.programs ?? 0,
        texturesAtEnd: end?.textures ?? 0,
        geometriesAtEnd: end?.geometries ?? 0,
    };
};

// ─── scenarios ─────────────────────────────────────────────────────────
const runIdle = async (page: Page): Promise<ScenarioMetrics> => {
    await page.evaluate(`window.__bench.start()`);
    await page.evaluate(`window.__bench.waitFrames(${FRAMES_PER_SCENARIO})`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

const runMutation = async (page: Page): Promise<ScenarioMetrics> => {
    await page.evaluate(`window.__bench.start()`);
    await page.evaluate(`window.__bench.runMutations(${MUTATIONS_PER_SCENARIO})`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

// Slider scenario — simulates the real "user drags a slider" path: each
// onChange writes a real DDFS uniform-mode param via the store's auto-
// derived setter, firing UNIFORM event → worker setUniform → RESET_ACCUM.
// This is the actual hot path for UI lag during interaction; cf.
// `mutation` which is a synthetic store-fanout test only.
//
// Sweeps `stepJitter` rather than `fudgeFactor` because stress-slider
// stacks this on top of stress quality (which pins fudgeFactor at 0.05);
// using a different param keeps the two controls orthogonal.
const runSlider = async (page: Page): Promise<ScenarioMetrics> => {
    await page.evaluate(`window.__bench.start()`);
    await page.evaluate(`(async () => {
        const s = window.__engineStore || window.__store;
        const setQuality = s.getState().setQuality;
        const STEPS = 120;
        for (let i = 0; i < STEPS; i++) {
            const t = i / (STEPS - 1);
            const v = 0.05 + 0.5 * Math.abs(Math.sin(t * Math.PI));
            setQuality({ stepJitter: v });
            await new Promise(requestAnimationFrame);
        }
    })()`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

const runOrbit = async (page: Page): Promise<ScenarioMetrics> => {
    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2;
    await page.mouse.move(cx, cy);
    await page.evaluate(`window.__bench.start()`);
    await page.mouse.down({ button: 'left' });
    for (let i = 1; i <= ORBIT_STEPS; i++) {
        const t = i / ORBIT_STEPS;
        const x = cx + Math.cos(t * Math.PI * 2) * 120;
        const y = cy + Math.sin(t * Math.PI * 2) * 80;
        await page.mouse.move(x, y, { steps: 1 });
    }
    await page.mouse.up({ button: 'left' });
    // Let a few post-release frames flow before stopping capture.
    await page.evaluate(`window.__bench.waitFrames(20)`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

// ─── main ──────────────────────────────────────────────────────────────
async function main() {
    // Cross-process GPU lock — prevents two headed Chrome benches running
    // WebGL on the same GPU (shared command queue, shared compositor)
    // from corrupting each other's timing. Default is "queue politely
    // behind any running bench"; --no-wait fails fast, --force steals.
    const releaseLock = await acquireBenchLock('bench-perf', {
        wait: !process.argv.includes('--no-wait'),
        force: process.argv.includes('--force'),
    });

    try {
    // Rough up-front timing estimate so the user can correlate the 30s
    // mid-bench silence with what the bench is actually doing. Each run
    // adds: pre-run reset+GC (~1s) + scenario duration + screenshot+coverage
    // (~0.5s). Scenarios at 60fps: idle 4s, mutation 2s, orbit ~2s.
    const totalRuns = RUNS_PER_SCENARIO * 6;
    const estSeconds = Math.round(BOOT_TIMEOUT_MS / 4_000) + totalRuns * 5;
    console.log(`[bench] launching chromium → ${URL}`);
    console.log(`[bench] viewport=${VIEWPORT.width}x${VIEWPORT.height} dpr=${DPR}`);
    console.log(`[bench] runs=${RUNS_PER_SCENARIO} idle=${FRAMES_PER_SCENARIO}f mut=${MUTATIONS_PER_SCENARIO} orbit=${ORBIT_STEPS}`);
    console.log(`[bench] est total time ~${estSeconds}s (boot + 12 runs)\n`);

    const browser = await chromium.launch({
        // Real desktop Chrome (not the bundled Chromium) — matches the
        // user's actual runtime characteristics: same V8 build, same GPU
        // driver path, same Skia. Headed window so the GPU process behaves
        // the same as a normal user session (some compositor paths are
        // headless-only and skew timing).
        channel: 'chrome',
        headless: false,
        // Anti-throttle flags: keep rendering at full speed even if the
        // window loses focus or is occluded behind the terminal.
        // --enable-precise-memory-info gives accurate performance.memory.
        // --js-flags=--expose-gc lets us force GC between runs.
        // NOTE: NOT passing --disable-gpu-vsync / --disable-frame-rate-limit.
        // In a headed Chrome window those flags cause GPU/compositor queue
        // contention (uncapped GPU vs vsynced compositor), tanking visible
        // fps to <1. The 60Hz cap is a feature here — fps p50 reflects the
        // user's actual experience.
        args: [
            '--enable-precise-memory-info',
            '--js-flags=--expose-gc',
            '--disable-blink-features=AutomationControlled',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-background-timer-throttling',
        ],
    });
    const ctx = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: DPR,
    });
    const page = await ctx.newPage();
    await page.addInitScript(initScript);

    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });

    // Boot signal — three gates, each event-driven where possible:
    //
    //   1. `proxy.isBooted` — worker received its BOOTED message.
    //   2. `proxy.hasCompiledShader && !proxy.isCompiling` — at least one
    //      compile has completed and we're not in the middle of another.
    //      `!isCompiling` ALONE is insufficient: it's transiently true
    //      between BOOTED and the worker firing COMPILING(true), before
    //      any shader has compiled. `hasCompiledShader` only flips true
    //      on COMPILING(false), so it's the canonical "ready" flag.
    //   3. accumulationCount has advanced by ≥30 since gate 2 fired —
    //      the render loop is producing real frames at steady state.
    //      Required because FRAME_READY messages are metadata only
    //      (bitmap:null; canvas presents via transferControlToOffscreen),
    //      so they can dispatch before the GPU has actually painted
    //      anything visible. accumulationCount only advances when the
    //      worker has computed and submitted real samples.
    //
    // Boot signal — two gates:
    //
    //   1. accumulationCount >= BOOT_ACCUM_MIN. The worker only advances
    //      this counter after computing and submitting a real sample
    //      pass; it stays at 0 through page-load, worker spawn, BOOTED,
    //      and shader compile, then climbs once steady-state rendering
    //      starts. So a single threshold subsumes "isBooted",
    //      "hasCompiledShader", "!isCompiling", and "frames are actually
    //      flowing." Cleanest signal we have.
    //
    //   2. LoadingScreen DOM is gone. The loading screen has its own
    //      gate (cp.phase==='done' + isReady prop + 800ms fade) and
    //      while it's mounted at z-100 it occludes the canvas — input
    //      goes to the overlay, and the user's reported "still
    //      waiting" symptom is exactly this. Detected via the GMT
    //      wordmark <h1.text-7xl> which only the loading screen
    //      renders.
    //
    console.log(`[bench] waiting for boot (accumulationCount >= ${BOOT_ACCUM_MIN})…`);
    const bootStart = Date.now();
    await page.waitForFunction(
        `window.__gmtProxy && window.__gmtProxy.accumulationCount >= ${BOOT_ACCUM_MIN}`,
        { timeout: BOOT_TIMEOUT_MS, polling: 100 },
    );
    const accumMs = Date.now() - bootStart;
    console.log(`[bench] accum gate ok in ${accumMs}ms — waiting for LoadingScreen to dismiss…`);
    await page.waitForFunction(
        `!document.querySelector('h1[class*="text-7xl"]')`,
        { timeout: BOOT_TIMEOUT_MS, polling: 100 },
    );
    const finalAccum = await page.evaluate(`window.__gmtProxy.accumulationCount`);
    console.log(`[bench] boot ok (accum=${finalAccum}, total ${Date.now() - bootStart}ms)`);

    // Probe whether a store-level `resetCamera` action is exposed — the
    // state-library bundle in cameraSlice.ts registers it and it walks
    // the active formula's defaultPreset back into live state. Without
    // a reset between runs, orbit-style scenarios accumulate rotation
    // and metrics drift run-to-run.
    const hasResetCamera = await page.evaluate(`
        !!(window.__engineStore || window.__store) &&
        typeof ((window.__engineStore || window.__store).getState().resetCamera) === 'function'
    `) as boolean;
    if (!hasResetCamera) console.warn('[bench] no resetCamera() on store — orbit runs may drift');

    // Warm-up — JIT, lazy plugin init, etc.
    await page.evaluate(`window.__bench.waitFrames(${WARMUP_FRAMES})`);

    interface Scenario {
        name: string;
        fn: (p: Page) => Promise<ScenarioMetrics>;
        setup?: (p: Page) => Promise<void>;
        teardown?: (p: Page) => Promise<void>;
    }
    const scenarios: Scenario[] = [
        // Order is deliberate. Reasons, in priority:
        //
        //   1. Visible motion first. Orbit is the first scenario the user
        //      sees — bench looks responsive right after boot, not "hung".
        //   2. All default-quality scenarios before stress. Stress quality
        //      contaminates later scenarios even after teardown (path
        //      tracer state, queued worker frames). Easier to clean up
        //      once at the end than between every transition.
        //   3. Within each tier, visible (orbit/slider) before silent
        //      (idle/mutation) so console output and on-screen motion
        //      stay aligned.
        //
        // Tier 1 — default quality, the happy-path baseline.
        { name: 'orbit', fn: runOrbit },
        { name: 'slider', fn: runSlider },
        { name: 'idle', fn: runIdle },
        { name: 'mutation', fn: runMutation },
        // Tier 2 — stress quality (fudgeFactor 0.05, maxSteps 1500).
        // Targets ~20-30fps paint so UI cost shows up as a stutter
        // regression on top instead of being hidden by the 60Hz cap.
        {
            name: 'stress-orbit',
            fn: runOrbit,
            setup: applyStressQuality,
            teardown: restoreQuality,
        },
        // Worst-case for UI responsiveness: every onChange has to wait
        // on a slow worker frame. Most likely to expose the P0 findings
        // (full-store fanout, per-frame postMessage path).
        {
            name: 'stress-slider',
            fn: runSlider,
            setup: applyStressQuality,
            teardown: restoreQuality,
        },
    ];

    const results: ScenarioResult[] = [];
    for (const sc of scenarios) {
        console.log(`\n[bench] scenario: ${sc.name}`);
        if (sc.setup) await sc.setup(page);
        const runs: ScenarioMetrics[] = [];
        for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
            // Reset the camera to its boot pose so each run has the same
            // starting state. Required for orbit/stress-orbit determinism;
            // harmless for idle/mutation. resetCamera() emits the same
            // CAMERA_TELEPORT + RESET_ACCUM the engine uses for preset
            // loads, so the path tracer also discards stale samples.
            if (hasResetCamera) {
                await page.evaluate(`(window.__engineStore || window.__store).getState().resetCamera()`);
                // resetCamera fires RESET_ACCUM which zeroes accumulationCount.
                // Wait until it ABSOLUTE-reaches a small steady-state count —
                // do NOT use `accumBefore + N`, that's pre-reset and never
                // hits (caused 5s/run × 12 runs = 60s dead wait).
                await page.waitForFunction(
                    `window.__gmtProxy.accumulationCount >= 5`,
                    { timeout: 3000, polling: 50 },
                ).catch(() => {});
            }
            // Force GC between runs if exposed, then a few idle frames to settle.
            await page.evaluate(`(typeof gc === 'function') && gc()`).catch(() => {});
            await page.evaluate(`window.__bench.waitFrames(30)`);
            // RenderInfo bookends the scenario: diff = scenario-attributable
            // GPU work. Fetch is async and serialised against the worker's
            // message queue, so bracketing the scenario fn (not the snapshot
            // which excludes setup/teardown) gives the cleanest attribution.
            const riStart = await fetchRenderInfo(page);
            let m: ScenarioMetrics;
            try {
                m = await sc.fn(page);
            } catch (e) {
                console.log(`  run ${i + 1}/${RUNS_PER_SCENARIO}: FAILED — ${(e as Error).message}`);
                continue;
            }
            const riEnd = await fetchRenderInfo(page);
            m.renderInfo = diffRenderInfo(riStart, riEnd);
            runs.push(m);
        }
        // Capture coverage ONCE per scenario at the end — same scene
        // across runs after camera reset, so per-run sampling was just
        // noise. Saves ~1.5s per scenario.
        const coverage = await measureCoverage(page);
        runs.forEach((r) => { r.coverage = coverage; });
        if (sc.teardown) await sc.teardown(page);
        const summary = summarise(runs);
        results.push({ name: sc.name, runs, median: summary });
        // Compact one-line scenario summary — all per-run detail is
        // available in the JSON output, so console doesn't need it.
        const wkrFpsMin = Math.min(...runs.map(r => r.workerFps));
        const wkrFpsMax = Math.max(...runs.map(r => r.workerFps));
        console.log(
            `  ${runs.length}/${RUNS_PER_SCENARIO} runs: ` +
            `wkrFps=${summary.workerFps.toFixed(1)} (${wkrFpsMin.toFixed(1)}-${wkrFpsMax.toFixed(1)})  ` +
            `main p5=${summary.fpsP5.toFixed(1)}  ` +
            `cov=${(coverage * 100).toFixed(1)}%  ` +
            `notify=${summary.storeNotifyCount}  ` +
            `posts=${summary.workerPostCount}`,
        );
        const ri = summary.renderInfo;
        if (ri.frames > 0 || ri.readRenderTargetPixels > 0 || ri.setRenderTargetSwitches > 0) {
            // calls/frame and rt-switches/frame are the two key per-frame
            // ratios — a baseline app should be ~1 RT-switch per frame
            // (canvas only). Anything higher hints at extra passes.
            const callsPerFrame  = ri.frames > 0 ? (ri.calls / ri.frames).toFixed(1) : '0';
            const switchPerFrame = ri.frames > 0 ? (ri.setRenderTargetSwitches / ri.frames).toFixed(1) : '0';
            console.log(
                `    gpu: frames=${ri.frames}  draws=${ri.calls} (${callsPerFrame}/f)  ` +
                `rtSwitch=${ri.setRenderTargetSwitches} (${switchPerFrame}/f)  ` +
                `readPx=${ri.readRenderTargetPixels}  ` +
                `tex=${ri.texturesAtEnd} prog=${ri.programsAtEnd}`,
            );
        }
        // Top-3 React hotspots by total actual time. Quick at-a-glance
        // signal for "which UI area dominated this scenario."
        const hot = Object.entries(summary.profilers)
            .map(([id, b]) => ({ id, ...b }))
            .filter(b => b.totalActualMs > 0.05)
            .sort((a, b) => b.totalActualMs - a.totalActualMs)
            .slice(0, 3);
        if (hot.length > 0) {
            const line = hot.map(h =>
                `${h.id} ${h.totalActualMs.toFixed(1)}ms/${h.count}c`,
            ).join('  ');
            console.log(`    react: ${line}`);
        }
    }

    await browser.close();

    // ─── output ─────────────────────────────────────────────────────────
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = {
        timestamp: stamp,
        url: URL,
        viewport: VIEWPORT,
        dpr: DPR,
        config: {
            warmupFrames: WARMUP_FRAMES,
            framesPerScenario: FRAMES_PER_SCENARIO,
            mutationsPerScenario: MUTATIONS_PER_SCENARIO,
            orbitSteps: ORBIT_STEPS,
            runsPerScenario: RUNS_PER_SCENARIO,
        },
        results,
        pageErrors,
    };

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const latest = join(OUTPUT_DIR, 'bench-perf-latest.json');
    const archive = join(OUTPUT_DIR, `bench-perf-${stamp}.json`);
    writeFileSync(latest, JSON.stringify(out, null, 2));
    writeFileSync(archive, JSON.stringify(out, null, 2));

    // ─── console summary ────────────────────────────────────────────────
    console.log('\n══ SUMMARY (median across runs) ══');
    console.log(
        'scenario     | wkrFps  | mainFps p50 | mainFps p5 | cov %  | longTasks (ms)  | store.notify | worker posts | heapΔ mb',
    );
    console.log(
        '-------------|---------|-------------|------------|--------|-----------------|--------------|--------------|---------',
    );
    for (const r of results) {
        const m = r.median;
        const row =
            `${r.name.padEnd(12)} | ` +
            `${m.workerFps.toFixed(1).padStart(7)} | ` +
            `${m.fpsP50.toFixed(1).padStart(11)} | ` +
            `${m.fpsP5.toFixed(1).padStart(10)} | ` +
            `${(m.coverage * 100).toFixed(1).padStart(6)} | ` +
            `${(m.longTaskCount + ' (' + m.longTaskTotalMs.toFixed(0) + ')').padStart(15)} | ` +
            `${String(m.storeNotifyCount).padStart(12)} | ` +
            `${String(m.workerPostCount).padStart(12)} | ` +
            `${m.heapDeltaMb.toFixed(1).padStart(7)}`;
        console.log(row);
    }
    // ─── per-area React attribution table ─────────────────────────────
    // Pivots profiler buckets into a per-id × per-scenario matrix so a
    // single component's cost across scenarios is one row. Reading top-
    // down: which area is hot? Reading left-to-right: under what kind
    // of interaction does it spike?
    const allIds = new Set<string>();
    for (const r of results) for (const id of Object.keys(r.median.profilers)) allIds.add(id);
    if (allIds.size > 0) {
        // Sort ids by max-totalActual across all scenarios, descending.
        const idMaxCost = (id: string) => Math.max(
            ...results.map(r => r.median.profilers[id]?.totalActualMs ?? 0),
        );
        const sortedIds = [...allIds].sort((a, b) => idMaxCost(b) - idMaxCost(a));
        console.log('\n══ REACT ATTRIBUTION (median totalActualMs / commit count, per scenario) ══');
        const idCol = Math.min(28, Math.max(...sortedIds.map(id => id.length)) + 1);
        const header = 'profiler id'.padEnd(idCol) +
            results.map(r => r.name.padStart(14)).join('');
        console.log(header);
        console.log('-'.repeat(header.length));
        for (const id of sortedIds) {
            const cells = results.map(r => {
                const b = r.median.profilers[id];
                if (!b || b.totalActualMs < 0.01) return '-'.padStart(14);
                return `${b.totalActualMs.toFixed(1)}/${b.count}`.padStart(14);
            }).join('');
            console.log(id.padEnd(idCol) + cells);
        }
    }

    // ─── auto-diff vs baseline ────────────────────────────────────────
    // Compares the run we just did against debug/bench-perf-baseline.json
    // (saved manually by re-running the bench and `cp latest baseline`).
    // Per metric, a delta beyond ±warn% is a WARN, beyond ±fail% is a FAIL.
    // Direction matters: fps drops are bad (negative is fail), notify
    // counts up are bad (positive is fail). Encoded in `betterIsHigher`.
    //
    // RT-switch counts (and readPixels) get a strict 0 tolerance — any
    // increase is a FAIL because they correlate with extra GPU passes
    // that shouldn't sneak in unannounced. The user's "navigation 2nd
    // render target" concern lives here.
    const baselinePath = join(OUTPUT_DIR, 'bench-perf-baseline.json');
    if (existsSync(baselinePath)) {
        try {
            const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
            const baseByName = new Map<string, ScenarioResult>(
                (baseline.results as ScenarioResult[]).map(r => [r.name, r])
            );
            interface Spec {
                key: string;
                pick: (m: ScenarioMetrics) => number;
                betterIsHigher: boolean;
                warnPct: number;
                failPct: number;
                strictNoIncrease?: boolean; // ignore pct, fail on any positive delta
            }
            const specs: Spec[] = [
                { key: 'wkrFps',     pick: m => m.workerFps,                       betterIsHigher: true,  warnPct: 5,  failPct: 10 },
                { key: 'mainP5',     pick: m => m.fpsP5,                           betterIsHigher: true,  warnPct: 8,  failPct: 15 },
                { key: 'notify',     pick: m => m.storeNotifyCount,                betterIsHigher: false, warnPct: 10, failPct: 25 },
                { key: 'posts',      pick: m => m.workerPostCount,                 betterIsHigher: false, warnPct: 10, failPct: 25 },
                { key: 'longTaskMs', pick: m => m.longTaskTotalMs,                 betterIsHigher: false, warnPct: 25, failPct: 50 },
                { key: 'rtSwitch',   pick: m => m.renderInfo.setRenderTargetSwitches, betterIsHigher: false, warnPct: 0, failPct: 0, strictNoIncrease: true },
                { key: 'readPx',     pick: m => m.renderInfo.readRenderTargetPixels,  betterIsHigher: false, warnPct: 0, failPct: 0, strictNoIncrease: true },
                { key: 'draws',      pick: m => m.renderInfo.calls,                betterIsHigher: false, warnPct: 10, failPct: 25 },
            ];
            const verdict = (delta: number, sp: Spec): { tag: string; bad: boolean } => {
                if (sp.strictNoIncrease) return delta > 0 ? { tag: 'FAIL', bad: true } : { tag: '✓', bad: false };
                if (delta === 0) return { tag: '✓', bad: false };
                const dirBad = sp.betterIsHigher ? delta < 0 : delta > 0;
                const absPct = Math.abs(delta);
                if (dirBad && absPct >= sp.failPct) return { tag: 'FAIL', bad: true };
                if (dirBad && absPct >= sp.warnPct) return { tag: 'WARN', bad: true };
                return { tag: '✓', bad: false };
            };
            const fmtPct = (delta: number) => (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';

            console.log('\n══ DIFF vs baseline (negative-is-better metrics get + when worse) ══');
            console.log(`baseline: ${baseline.timestamp}`);
            const header = 'scenario     ' + specs.map(s => s.key.padStart(12)).join('');
            console.log(header);
            console.log('-'.repeat(header.length));
            let anyFail = false;
            for (const r of results) {
                const base = baseByName.get(r.name);
                if (!base) {
                    console.log(`${r.name.padEnd(12)}  (no baseline entry)`);
                    continue;
                }
                const cells = specs.map(sp => {
                    let cur: number, bs: number;
                    try { cur = sp.pick(r.median) ?? 0; } catch { cur = 0; }
                    try { bs = sp.pick(base.median) ?? 0; } catch { bs = 0; }
                    // Baseline pre-dates this metric — show "n/a" rather
                    // than fabricating a 100% regression on a missing field.
                    if (bs === 0 && cur === 0) {
                        return 'n/a'.padStart(12);
                    }
                    const delta = sp.strictNoIncrease ? (cur - bs)
                        : (bs === 0 ? 100 : ((cur - bs) / bs) * 100);
                    const v = verdict(delta, sp);
                    if (v.tag === 'FAIL') anyFail = true;
                    const txt = sp.strictNoIncrease ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)} ${v.tag}`
                        : `${fmtPct(delta)} ${v.tag}`;
                    return txt.padStart(12);
                }).join('');
                console.log(r.name.padEnd(12) + ' ' + cells);
            }
            if (anyFail && process.argv.includes('--gate')) {
                console.error('\n[bench] FAIL — regression detected vs baseline (--gate)');
                process.exitCode = 2;
            }
        } catch (e) {
            console.warn(`[bench] baseline diff skipped: ${(e as Error).message}`);
        }
    } else {
        console.log(`\n[bench] no baseline at ${baselinePath} — skipping diff. Save current as baseline:`);
        console.log(`        cp debug/bench-perf-latest.json debug/bench-perf-baseline.json`);
    }

    console.log(`\n[bench] wrote ${latest}`);
    console.log(`[bench] wrote ${archive}`);

    if (pageErrors.length > 0) {
        console.log('\n[bench] page errors during run:');
        pageErrors.forEach((e) => console.log('  ', e));
    }
    } finally {
        releaseLock();
    }
}

main().catch((e) => {
    console.error('[bench] FAILED:', e);
    process.exit(1);
});
