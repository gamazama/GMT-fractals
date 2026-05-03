/**
 * bench-perf-timeline — UI perf bench specifically for the keyframe timeline.
 *
 * Boots app-gmt, opens the timeline, seeds a heavy keyframe sequence
 * (~thousands of keyframes across camera tracks), then runs scenarios in
 * both Dope Sheet and Graph modes:
 *
 *   - dope-idle / graph-idle    — view mounted, no input
 *   - dope-scrub / graph-scrub  — drag the playhead end-to-end
 *   - dope-zoom  / graph-zoom   — wheel zoom in then out
 *
 * Seed strategy: the first run records keyframes by playing the timeline
 * with auto-keyframe + recordCamera enabled while driving a mouse circle
 * for ~20 s, then dumps the resulting `sequence` to
 * `debug/bench-perf-timeline-seed.json`. Subsequent runs detect the
 * cache and inject the sequence directly via
 * `useAnimationStore.setState({ sequence })` — saves ~25 s per bench
 * invocation. Pass `--bench-record` to force a fresh recording (e.g.
 * after changing the recording cadence or fixing a binder bug).
 *
 * Output mirrors `bench-perf.mts`:
 *   debug/bench-perf-timeline-latest.json + timestamped archive
 *   debug/bench-perf-timeline-baseline.json (gitignored, manual)
 *
 *   Usage:
 *     npx tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts
 *     # or with vite already up on :3400:
 *     npx tsx debug/bench-perf-timeline.mts
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
const BOOT_ACCUM_MIN = 20;
const WARMUP_FRAMES = 60;
const FRAMES_PER_SCENARIO = 240;     // 4 s at 60 Hz
const SCRUB_STEPS = 120;
const ZOOM_STEPS = 60;
const RUNS_PER_SCENARIO = 3;
const OUTPUT_DIR = 'debug';
const SEED_PATH = join(OUTPUT_DIR, 'bench-perf-timeline-seed.json');
const SEED_DURATION_FRAMES = 600;
const SEED_RECORD_MS = 20_000;       // 20 s of mouse-record
// Heavy synthetic seed — for stress-testing UI cost when the user has
// recorded a lot. 1500 frames × 6 camera tracks ≈ user-reported stress.
const HEAVY_SEED_FRAMES = 1500;
const HEAVY_SEED_TRACK_IDS = [
    'camera.unified.x', 'camera.unified.y', 'camera.unified.z',
    'camera.unified.qx', 'camera.unified.qy', 'camera.unified.qz',
];

// ─── types (mirror bench-perf.mts so JSON output stays consistent) ────
interface ProfilerBucket {
    count: number;
    totalActualMs: number;
    totalBaseMs: number;
    maxActualMs: number;
}

interface RenderInfoDelta {
    calls: number;
    triangles: number;
    frames: number;
    readRenderTargetPixels: number;
    setRenderTargetSwitches: number;
    programsAtEnd: number;
    texturesAtEnd: number;
    geometriesAtEnd: number;
}

interface ScenarioMetrics {
    durationMs: number;
    frameDts: number[];
    fpsP50: number;
    fpsP5: number;
    workerFps: number;
    accumDelta: number;
    longTaskCount: number;
    longTaskTotalMs: number;
    storeNotifyCount: number;
    workerPostCount: number;
    workerPostBytes: number;
    heapDeltaMb: number;
    profilers: Record<string, ProfilerBucket>;
    renderInfo: RenderInfoDelta;
}

interface ScenarioResult {
    name: string;
    runs: ScenarioMetrics[];
    median: ScenarioMetrics;
}

// ─── instrumentation injected into the page (verbatim from bench-perf.mts) ─
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
        profilers: Object.create(null),
    };

    const bootReady = new Promise((resolve) => {
        if (b.bootResolved) resolve(undefined);
        else b.bootResolveFn = () => resolve(undefined);
    });

    try {
        new PerformanceObserver((list) => {
            if (!b.capturing) return;
            for (const entry of list.getEntries()) {
                b.longTaskCount += 1;
                b.longTaskMs += entry.duration;
            }
        }).observe({ entryTypes: ['longtask'] });
    } catch (e) {}

    const rafTap = (ts) => {
        if (b.capturing) {
            if (b.lastFrameTs !== 0) b.frameDts.push(ts - b.lastFrameTs);
            b.lastFrameTs = ts;
        }
        requestAnimationFrame(rafTap);
    };
    requestAnimationFrame(rafTap);

    const OrigWorker = window.Worker;
    const POST_SAMPLE_PERIOD = 16;
    function PatchedWorker(...args) {
        const w = new OrigWorker(...args);
        const origPost = w.postMessage.bind(w);
        w.postMessage = function(msg, transfer) {
            if (b.capturing) {
                b.workerPostCount += 1;
                if ((b.workerPostCount & (POST_SAMPLE_PERIOD - 1)) === 0) {
                    try {
                        const s = JSON.stringify(msg);
                        if (s) {
                            b.workerPostBytesSampled += s.length;
                            b.workerPostSampleCount += 1;
                        }
                    } catch (_) {}
                }
            }
            return transfer ? origPost(msg, transfer) : origPost(msg);
        };
        w.addEventListener('message', (ev) => {
            const t = ev && ev.data && ev.data.type;
            const isFrame = t === 'FRAME_READY' || t === 'frame_ready';
            if (isFrame) b.workerFrameTotal += 1;
            if (b.capturing) {
                b.workerMsgCount += 1;
                if (isFrame) b.workerFrameCount += 1;
            }
            if (isFrame && b.workerFrameTotal >= 3 && !b.bootResolved) {
                b.bootResolved = true;
                b.bootResolveFn && b.bootResolveFn();
            }
        });
        return w;
    }
    PatchedWorker.prototype = OrigWorker.prototype;
    window.Worker = PatchedWorker;

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
            const estimatedBytes = b.workerPostSampleCount > 0
                ? Math.round((b.workerPostBytesSampled / b.workerPostSampleCount) * b.workerPostCount)
                : 0;
            return {
                durationMs: dur,
                frameDts: b.frameDts.slice(),
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
        runMutations: async (count) => {
            const s = window.__engineStore || window.__store;
            if (!s) throw new Error('store not exposed on window');
            const setLive = s.getState().setLiveModulations;
            if (typeof setLive !== 'function') throw new Error('setLiveModulations missing');
            for (let i = 0; i < count; i++) {
                setLive({ __bench: i });
                await new Promise(requestAnimationFrame);
            }
        },
        waitFrames: async (count) => {
            for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
        },
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
        longTaskCount: snap.longTaskCount,
        longTaskTotalMs: snap.longTaskMs,
        storeNotifyCount: snap.storeNotifyCount,
        workerPostCount: snap.workerPostCount,
        workerPostBytes: snap.workerPostBytes,
        heapDeltaMb: snap.heapDeltaMb,
        profilers: snap.profilers || {},
        renderInfo: {
            calls: 0, triangles: 0, frames: 0,
            readRenderTargetPixels: 0, setRenderTargetSwitches: 0,
            programsAtEnd: 0, texturesAtEnd: 0, geometriesAtEnd: 0,
        },
    };
};

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

// ─── timeline-specific setup ───────────────────────────────────────────

/** Open the timeline by pressing 'T'. The TimelineHost shortcut handler
 *  toggles a local React useState — the only way to drive it from
 *  outside is to dispatch a key event. */
const openTimeline = async (page: Page) => {
    // Click the canvas first so keypresses route to it (not into a focused
    // input) — the boot sequence may leave focus on a slider.
    await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
    await page.evaluate(`window.__bench.waitFrames(2)`);
    await page.keyboard.press('t');
    // Timeline panel mounts via React.lazy → wait for its DOM marker.
    // Timeline.tsx renders a unique `__timelineSetMode` global on mount.
    await page.waitForFunction(
        `typeof window.__timelineSetMode === 'function'`,
        { timeout: 5_000, polling: 50 },
    );
};

const setTimelineMode = async (page: Page, mode: 'DopeSheet' | 'Graph') => {
    await page.evaluate((m: string) => {
        const setMode = (window as any).__timelineSetMode;
        if (typeof setMode === 'function') setMode(m);
    }, mode);
    await page.evaluate(`window.__bench.waitFrames(8)`);
};

/** Record a heavy keyframe sequence by playing the timeline with
 *  auto-keyframe + camera-record while orbiting the mouse. Slow (~25s)
 *  but produces a realistic-looking sequence. Result is cached on disk
 *  so subsequent runs skip this. */
const recordSeed = async (page: Page): Promise<any> => {
    console.log('[bench] recording seed (no cache; this is the slow path)…');
    // Configure playback for a single pass at SEED_DURATION_FRAMES.
    await page.evaluate((duration) => {
        const a = (window as any).useAnimationStore;
        if (!a) throw new Error('useAnimationStore not exposed on window');
        const s = a.getState();
        s.setLoopMode('Once');
        s.setDuration(duration);
        // Enable auto-keyframe (`isRecording`); recordCamera defaults true.
        if (!s.isRecording) s.toggleRecording();
        if (!s.recordCamera) s.toggleRecordCamera();
        s.seek(0);
    }, SEED_DURATION_FRAMES);

    // Position cursor at viewport center, press play, then drive a circular
    // mouse drag for SEED_RECORD_MS while keyframes record.
    const cx = VIEWPORT.width / 2;
    const cy = VIEWPORT.height / 2;
    await page.mouse.move(cx, cy);
    await page.evaluate(() => (window as any).useAnimationStore.getState().play());
    await page.mouse.down({ button: 'left' });

    const start = Date.now();
    let i = 0;
    while (Date.now() - start < SEED_RECORD_MS) {
        const t = (Date.now() - start) / 1000;
        const x = cx + Math.cos(t * 0.7) * 200;
        const y = cy + Math.sin(t * 0.9) * 140;
        await page.mouse.move(x, y, { steps: 1 });
        i++;
        // Yield occasionally so the animation tick has time to run.
        if (i % 4 === 0) await page.evaluate(`window.__bench.waitFrames(1)`);
    }
    await page.mouse.up({ button: 'left' });

    // Disable recording so post-seed setup doesn't accidentally append.
    await page.evaluate(() => {
        const a = (window as any).useAnimationStore;
        const s = a.getState();
        if (s.isRecording) s.toggleRecording();
        if (s.isPlaying) s.pause();
        s.seek(0);
    });
    await page.evaluate(`window.__bench.waitFrames(20)`);

    // Snapshot the resulting sequence for cache.
    const sequence = await page.evaluate(() => {
        const s = (window as any).useAnimationStore.getState();
        return s.sequence;
    });
    return sequence;
};

const applySeed = async (page: Page, sequence: any, duration: number) => {
    await page.evaluate(({ duration, sequence: seq }) => {
        const a = (window as any).useAnimationStore;
        a.setState({
            sequence: seq,
            durationFrames: duration,
            currentFrame: 0,
            loopMode: 'Once',
            isRecording: false,
            isPlaying: false,
        });
    }, { duration, sequence });
};

/** Generate a heavy synthetic sequence in-process — no browser round-trip,
 *  no recording. 1500 frames × 6 camera tracks, every frame keyed, linear
 *  interpolation. Approximates the user's 1500-frame stress recording but
 *  produces deterministic data: y values trace overlapping sines so the
 *  Graph view has visible curves and the DopeSheet has a packed key wall. */
const synthHeavySeed = (): any => {
    const tracks: Record<string, any> = {};
    let kid = 0;
    const nextId = () => `synth-${(kid++).toString(36)}`;
    for (let t = 0; t < HEAVY_SEED_TRACK_IDS.length; t++) {
        const id = HEAVY_SEED_TRACK_IDS[t];
        const phase = (t / HEAVY_SEED_TRACK_IDS.length) * Math.PI * 2;
        const keyframes: any[] = [];
        for (let f = 0; f < HEAVY_SEED_FRAMES; f++) {
            keyframes.push({
                id: nextId(),
                frame: f,
                value: Math.sin(phase + (f / HEAVY_SEED_FRAMES) * Math.PI * 4) * 0.5,
                interpolation: 'Linear',
                autoTangent: false,
                brokenTangents: false,
            });
        }
        tracks[id] = { id, type: 'float', label: id, keyframes, hidden: false };
    }
    return { tracks };
};

const seedKeyframeStats = async (page: Page) => {
    return await page.evaluate(() => {
        const seq = (window as any).useAnimationStore.getState().sequence;
        const tracks = Object.values(seq.tracks) as any[];
        let total = 0;
        for (const t of tracks) total += t.keyframes.length;
        return { trackCount: tracks.length, keyframeCount: total };
    });
};

// ─── scenarios ─────────────────────────────────────────────────────────
const runIdle = async (page: Page): Promise<ScenarioMetrics> => {
    await page.evaluate(`window.__bench.start()`);
    await page.evaluate(`window.__bench.waitFrames(${FRAMES_PER_SCENARIO})`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

/** Drive the playhead from 0 → durationFrames. Mirrors what
 *  TimelineRuler.handleScrubStart does on a real mouse-drag: seek() into
 *  the store AND call animationEngine.scrub(f) to evaluate keyframes
 *  through the binders so the camera/uniforms actually follow the
 *  playhead. The seek-only path was leaving the picture frozen during
 *  scrub, undercounting cost in the camera-binder + worker-tick path. */
const runScrub = async (page: Page): Promise<ScenarioMetrics> => {
    await page.evaluate(`window.__bench.start()`);
    await page.evaluate(`(async () => {
        const a = window.useAnimationStore;
        const eng = window.__animEngine;
        const dur = a.getState().durationFrames;
        const STEPS = ${SCRUB_STEPS};
        for (let i = 0; i <= STEPS; i++) {
            const f = (i / STEPS) * dur;
            a.getState().seek(f);
            if (eng && typeof eng.scrub === 'function') eng.scrub(f);
            await new Promise(requestAnimationFrame);
        }
    })()`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

/** Real playback: toggle isPlaying=true and let AnimationEngine.tick drive
 *  currentFrame via the TickRegistry. Captures `FRAMES_PER_SCENARIO` RAFs
 *  of work, then pauses + seeks back to 0. This is the path the user
 *  reported stuttering on with 1500-keyframe sequences. */
const runPlay = async (page: Page): Promise<ScenarioMetrics> => {
    await page.evaluate(() => {
        const a = (window as any).useAnimationStore;
        a.getState().seek(0);
        a.getState().play();
    });
    await page.evaluate(`window.__bench.start()`);
    await page.evaluate(`window.__bench.waitFrames(${FRAMES_PER_SCENARIO})`);
    await page.evaluate(`window.__bench.stop()`);
    const m = snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
    await page.evaluate(() => {
        const a = (window as any).useAnimationStore;
        a.getState().pause();
        a.getState().seek(0);
    });
    await page.evaluate(`window.__bench.waitFrames(20)`);
    return m;
};

/** Programmatically select a single track via setTrackSelection. The user
 *  reported "selecting takes long, then hangs between interactions" with a
 *  450-frame track — measures the burst cost of the resulting re-render
 *  cascade. Run a few selection toggles in sequence to detect O(n²) behavior. */
const runSelectTrack = async (page: Page): Promise<ScenarioMetrics> => {
    // Pre-collect track ids in deterministic order.
    const trackIds: string[] = await page.evaluate(() => {
        const seq = (window as any).useAnimationStore.getState().sequence;
        return Object.keys(seq.tracks);
    });
    if (trackIds.length === 0) {
        // Empty timeline — nothing to measure; return an empty snapshot.
        await page.evaluate(`window.__bench.start()`);
        await page.evaluate(`window.__bench.waitFrames(${FRAMES_PER_SCENARIO})`);
        await page.evaluate(`window.__bench.stop()`);
        return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
    }
    await page.evaluate(`window.__bench.start()`);
    // Toggle through each track, then back to none. Lets us observe both
    // the "first selection" cost AND the per-toggle cost when state is hot.
    await page.evaluate(`(async (ids) => {
        const a = window.useAnimationStore;
        for (const id of ids) {
            a.getState().setTrackSelection(id);
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
        }
        a.getState().deselectAll && a.getState().deselectAll();
        await new Promise(requestAnimationFrame);
    })(${JSON.stringify(trackIds)})`);
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

/** Wheel-zoom at the timeline's center: in ZOOM_STEPS, then back out.
 *  Targets the timeline panel's content area; the actual mapping from
 *  wheel deltas to frameWidth is owned by the panel's onWheel handlers. */
const runZoom = async (page: Page): Promise<ScenarioMetrics> => {
    // Timeline panel is anchored to the bottom — center of timeline is
    // around 80% down the viewport (panel height ~250px on 1080p).
    const tx = VIEWPORT.width / 2;
    const ty = VIEWPORT.height - 130;
    await page.mouse.move(tx, ty);
    await page.evaluate(`window.__bench.start()`);
    for (let i = 0; i < ZOOM_STEPS; i++) {
        await page.mouse.wheel(0, -120); // ctrl-less wheel; Timeline maps to zoom
        await page.evaluate(`window.__bench.waitFrames(1)`);
    }
    for (let i = 0; i < ZOOM_STEPS; i++) {
        await page.mouse.wheel(0, 120);
        await page.evaluate(`window.__bench.waitFrames(1)`);
    }
    await page.evaluate(`window.__bench.stop()`);
    return snapshotToMetrics(await page.evaluate(`window.__bench.snapshot()`));
};

// ─── main ──────────────────────────────────────────────────────────────
async function main() {
    const releaseLock = await acquireBenchLock('bench-perf-timeline', {
        wait: !process.argv.includes('--no-wait'),
        force: process.argv.includes('--force'),
    });
    const forceRecord = process.argv.includes('--bench-record');
    const heavySeed   = process.argv.includes('--seed=heavy');

    try {
    console.log(`[bench] launching chromium → ${URL}`);
    console.log(`[bench] viewport=${VIEWPORT.width}x${VIEWPORT.height} dpr=${DPR}`);
    console.log(`[bench] runs=${RUNS_PER_SCENARIO} idle=${FRAMES_PER_SCENARIO}f scrub=${SCRUB_STEPS} zoom=2x${ZOOM_STEPS}`);

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
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

    console.log(`[bench] waiting for boot (accumulationCount >= ${BOOT_ACCUM_MIN})…`);
    await page.waitForFunction(
        `window.__gmtProxy && window.__gmtProxy.accumulationCount >= ${BOOT_ACCUM_MIN}`,
        { timeout: BOOT_TIMEOUT_MS, polling: 100 },
    );
    await page.waitForFunction(
        `!document.querySelector('h1[class*="text-7xl"]')`,
        { timeout: BOOT_TIMEOUT_MS, polling: 100 },
    );
    console.log(`[bench] boot ok`);

    // ─── Open timeline + seed keyframes ─────────────────────────────
    await openTimeline(page);
    console.log(`[bench] timeline open`);

    let sequence: any = null;
    let seedDuration = SEED_DURATION_FRAMES;
    if (heavySeed) {
        sequence = synthHeavySeed();
        seedDuration = HEAVY_SEED_FRAMES;
        await applySeed(page, sequence, seedDuration);
        console.log(`[bench] using synthetic heavy seed (${HEAVY_SEED_FRAMES} frames × ${HEAVY_SEED_TRACK_IDS.length} tracks)`);
    } else {
        if (!forceRecord && existsSync(SEED_PATH)) {
            try {
                sequence = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
                console.log(`[bench] using cached seed: ${SEED_PATH}`);
            } catch (e) {
                console.warn(`[bench] failed to read seed cache (${(e as Error).message}); re-recording`);
                sequence = null;
            }
        }
        if (!sequence) {
            sequence = await recordSeed(page);
            writeFileSync(SEED_PATH, JSON.stringify(sequence));
            console.log(`[bench] wrote seed cache: ${SEED_PATH}`);
        } else {
            await applySeed(page, sequence, seedDuration);
        }
    }
    const stats = await seedKeyframeStats(page);
    console.log(`[bench] seeded ${stats.trackCount} tracks / ${stats.keyframeCount} keyframes`);

    // Warm-up.
    await page.evaluate(`window.__bench.waitFrames(${WARMUP_FRAMES})`);

    interface Scenario {
        name: string;
        mode: 'DopeSheet' | 'Graph';
        fn: (p: Page) => Promise<ScenarioMetrics>;
    }
    const scenarios: Scenario[] = [
        // Dope sheet first — the default mode, simplest geometry.
        { name: 'dope-idle',         mode: 'DopeSheet', fn: runIdle },
        { name: 'dope-scrub',        mode: 'DopeSheet', fn: runScrub },
        { name: 'dope-play',         mode: 'DopeSheet', fn: runPlay },
        { name: 'dope-zoom',         mode: 'DopeSheet', fn: runZoom },
        { name: 'dope-select-track', mode: 'DopeSheet', fn: runSelectTrack },
        // Graph mode — canvas-rendered curves, expected to be more
        // expensive per visible track. Mode switch is itself measured
        // implicitly (cost shows up in setMode + first render of Graph).
        { name: 'graph-idle',         mode: 'Graph', fn: runIdle },
        { name: 'graph-scrub',        mode: 'Graph', fn: runScrub },
        { name: 'graph-play',         mode: 'Graph', fn: runPlay },
        { name: 'graph-zoom',         mode: 'Graph', fn: runZoom },
        { name: 'graph-select-track', mode: 'Graph', fn: runSelectTrack },
    ];

    const results: ScenarioResult[] = [];
    let currentMode: 'DopeSheet' | 'Graph' = 'DopeSheet';
    for (const sc of scenarios) {
        if (sc.mode !== currentMode) {
            await setTimelineMode(page, sc.mode);
            currentMode = sc.mode;
        }
        console.log(`\n[bench] scenario: ${sc.name} (${sc.mode})`);
        const runs: ScenarioMetrics[] = [];
        for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
            // Reset playhead to 0 for determinism between runs.
            await page.evaluate(() => {
                const a = (window as any).useAnimationStore;
                if (a) a.getState().seek(0);
            });
            await page.evaluate(`(typeof gc === 'function') && gc()`).catch(() => {});
            await page.evaluate(`window.__bench.waitFrames(20)`);
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
        const summary = summarise(runs);
        results.push({ name: sc.name, runs, median: summary });

        const wkrFpsMin = Math.min(...runs.map(r => r.workerFps));
        const wkrFpsMax = Math.max(...runs.map(r => r.workerFps));
        console.log(
            `  ${runs.length}/${RUNS_PER_SCENARIO} runs: ` +
            `wkrFps=${summary.workerFps.toFixed(1)} (${wkrFpsMin.toFixed(1)}-${wkrFpsMax.toFixed(1)})  ` +
            `main p5=${summary.fpsP5.toFixed(1)}  ` +
            `notify=${summary.storeNotifyCount}  ` +
            `posts=${summary.workerPostCount}  ` +
            `longTask=${summary.longTaskCount}(${summary.longTaskTotalMs.toFixed(0)}ms)`,
        );
        const ri = summary.renderInfo;
        if (ri.frames > 0) {
            const callsPerFrame  = ri.frames > 0 ? (ri.calls / ri.frames).toFixed(1) : '0';
            const switchPerFrame = ri.frames > 0 ? (ri.setRenderTargetSwitches / ri.frames).toFixed(1) : '0';
            console.log(
                `    gpu: frames=${ri.frames}  draws=${ri.calls} (${callsPerFrame}/f)  ` +
                `rtSwitch=${ri.setRenderTargetSwitches} (${switchPerFrame}/f)  ` +
                `readPx=${ri.readRenderTargetPixels}`,
            );
        }
        const hot = Object.entries(summary.profilers)
            .map(([id, b]) => ({ id, ...b }))
            .filter(b => b.totalActualMs > 0.05)
            .sort((a, b) => b.totalActualMs - a.totalActualMs)
            .slice(0, 3);
        if (hot.length > 0) {
            const line = hot.map(h => `${h.id} ${h.totalActualMs.toFixed(1)}ms/${h.count}c`).join('  ');
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
        seedStats: stats,
        config: {
            warmupFrames: WARMUP_FRAMES,
            framesPerScenario: FRAMES_PER_SCENARIO,
            scrubSteps: SCRUB_STEPS,
            zoomSteps: ZOOM_STEPS,
            runsPerScenario: RUNS_PER_SCENARIO,
            seedDurationFrames: SEED_DURATION_FRAMES,
            seedRecordMs: SEED_RECORD_MS,
        },
        results,
        pageErrors,
    };

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const latest  = join(OUTPUT_DIR, 'bench-perf-timeline-latest.json');
    const archive = join(OUTPUT_DIR, `bench-perf-timeline-${stamp}.json`);
    writeFileSync(latest, JSON.stringify(out, null, 2));
    writeFileSync(archive, JSON.stringify(out, null, 2));

    // ─── console summary ────────────────────────────────────────────
    console.log('\n══ SUMMARY (median across runs) ══');
    console.log('scenario     | wkrFps  | mainFps p50 | mainFps p5 | longTasks (ms)  | store.notify | worker posts');
    console.log('-------------|---------|-------------|------------|-----------------|--------------|-------------');
    for (const r of results) {
        const m = r.median;
        const row =
            `${r.name.padEnd(12)} | ` +
            `${m.workerFps.toFixed(1).padStart(7)} | ` +
            `${m.fpsP50.toFixed(1).padStart(11)} | ` +
            `${m.fpsP5.toFixed(1).padStart(10)} | ` +
            `${(m.longTaskCount + ' (' + m.longTaskTotalMs.toFixed(0) + ')').padStart(15)} | ` +
            `${String(m.storeNotifyCount).padStart(12)} | ` +
            `${String(m.workerPostCount).padStart(12)}`;
        console.log(row);
    }

    // Per-area React table — sort ids by max-totalActual across scenarios.
    const allIds = new Set<string>();
    for (const r of results) for (const id of Object.keys(r.median.profilers)) allIds.add(id);
    if (allIds.size > 0) {
        const idMaxCost = (id: string) => Math.max(
            ...results.map(r => r.median.profilers[id]?.totalActualMs ?? 0),
        );
        const sortedIds = [...allIds].sort((a, b) => idMaxCost(b) - idMaxCost(a));
        console.log('\n══ REACT ATTRIBUTION (median totalActualMs / commit count, per scenario) ══');
        const idCol = Math.min(36, Math.max(...sortedIds.map(id => id.length)) + 1);
        const header = 'profiler id'.padEnd(idCol) +
            results.map(r => r.name.padStart(13)).join('');
        console.log(header);
        console.log('-'.repeat(header.length));
        for (const id of sortedIds) {
            const cells = results.map(r => {
                const b = r.median.profilers[id];
                if (!b || b.totalActualMs < 0.01) return '-'.padStart(13);
                return `${b.totalActualMs.toFixed(1)}/${b.count}`.padStart(13);
            }).join('');
            console.log(id.padEnd(idCol) + cells);
        }
    }

    // ─── auto-diff vs baseline ──────────────────────────────────────
    const baselinePath = join(OUTPUT_DIR, 'bench-perf-timeline-baseline.json');
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
            }
            const specs: Spec[] = [
                { key: 'wkrFps',     pick: m => m.workerFps,        betterIsHigher: true,  warnPct: 5,  failPct: 10 },
                { key: 'mainP5',     pick: m => m.fpsP5,            betterIsHigher: true,  warnPct: 8,  failPct: 15 },
                { key: 'notify',     pick: m => m.storeNotifyCount, betterIsHigher: false, warnPct: 10, failPct: 25 },
                { key: 'posts',      pick: m => m.workerPostCount,  betterIsHigher: false, warnPct: 10, failPct: 25 },
                { key: 'longTaskMs', pick: m => m.longTaskTotalMs,  betterIsHigher: false, warnPct: 25, failPct: 50 },
            ];
            const verdict = (delta: number, sp: Spec) => {
                if (delta === 0) return { tag: '✓', bad: false };
                const dirBad = sp.betterIsHigher ? delta < 0 : delta > 0;
                const absPct = Math.abs(delta);
                if (dirBad && absPct >= sp.failPct) return { tag: 'FAIL', bad: true };
                if (dirBad && absPct >= sp.warnPct) return { tag: 'WARN', bad: true };
                return { tag: '✓', bad: false };
            };
            const fmtPct = (delta: number) => (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
            console.log('\n══ DIFF vs baseline ══');
            console.log(`baseline: ${baseline.timestamp}`);
            const header = 'scenario     ' + specs.map(s => s.key.padStart(13)).join('');
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
                    const cur = sp.pick(r.median) ?? 0;
                    const bs  = sp.pick(base.median) ?? 0;
                    if (bs === 0 && cur === 0) return 'n/a'.padStart(13);
                    const delta = bs === 0 ? 100 : ((cur - bs) / bs) * 100;
                    const v = verdict(delta, sp);
                    if (v.tag === 'FAIL') anyFail = true;
                    return `${fmtPct(delta)} ${v.tag}`.padStart(13);
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
        console.log(`        cp debug/bench-perf-timeline-latest.json debug/bench-perf-timeline-baseline.json`);
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
