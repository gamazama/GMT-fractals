/**
 * GMT Render Harness — browser-side driver.
 *
 * Runs the real FractalEngine (Three.js + worker-less) in a standalone page
 * served by Vite dev server. Exposes `window.runRenderTest(spec)` for
 * Playwright / Node drivers to call.
 *
 * Design:
 *   - One FractalEngine instance per page load. Tests switch formula/config
 *     by emitting FRACTAL_EVENTS.CONFIG, which triggers the engine's normal
 *     compile pipeline (same code path as in-app).
 *   - Each test call:
 *       1) emits the full config (merged with formula's defaultPreset)
 *       2) positions camera per the preset
 *       3) awaits compile completion (IS_COMPILING=false event)
 *       4) renders N warmup frames (adaptive stabilization by default)
 *       5) renders M measurement frames, timing each
 *       6) captures a PNG snapshot
 *       7) returns compile-time + per-frame durations + thumbnail
 *
 * Not user-facing. Loaded via render-harness.html at project root.
 */

import * as THREE from 'three';
import { FractalEngine } from '../engine/FractalEngine';
import type { ShaderConfig } from '../engine/ShaderFactory';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { registry } from '../engine/FractalRegistry';
import { createDefaultShaderConfig } from '../engine/ConfigDefaults';
import { registerFeatures } from '../features';
import '../formulas';  // side-effect: registers all native FractalDefinitions

registerFeatures();

// ─── Types exposed to Playwright ─────────────────────────────────────────────

export interface TestSpec {
    id: string;
    formula: string;
    /** Deep-merged into the formula's defaultPreset features block. */
    configOverrides?: Record<string, any>;
    /** Override cameraPos/sceneOffset etc. (usually left as preset defaults). */
    cameraOverrides?: {
        pos?: [number, number, number];
        rot?: [number, number, number, number];
        targetDistance?: number;
    };
    /** 'single' = 8 render frames + snapshot (direct) or 32 (path-tracing).
     *  'perf' = warmup + measured frames for perf data. */
    mode: 'single' | 'perf';
    /** perf mode: adaptive warmup (default) or fixed frame count */
    warmup?: 'adaptive' | number;
    /** perf mode: how many frames to measure after warmup. Default 60. */
    measureFrames?: number;
    /** Canvas dimensions. Default 256×256. */
    size?: [number, number];
    /** Total timeout for this test in ms. Default 30000. */
    timeoutMs?: number;
    /** Output image format. 'png' (default) or 'jpeg' for gallery thumbnails. */
    imageFormat?: 'png' | 'jpeg';
    /** JPEG quality 0–1 (default 0.92). Ignored for PNG. */
    imageQuality?: number;
}

export interface TestResult {
    id: string;
    ok: boolean;
    error?: string;
    compile: {
        totalMs: number;           // config-emit → IS_COMPILING=false
        logPreviewMs?: number;     // parsed from engine's "[Compile] Two-stage" log
        logGpuMs?: number;
    };
    frames?: {
        warmupCount: number;
        measuredCount: number;
        /** ms per compute() call */
        frameMsP50: number;
        frameMsP95: number;
        frameMsMin: number;
        frameMsMax: number;
        samplesPerSec: number;     // 1000 / p50
    };
    render: {
        sigma: [number, number, number];
        nanFraction: number;
        nonBlackFraction: number;
    };
    thumbnailPNG?: string;           // data URL
    timeMs: number;
}

// ─── Engine boot (module-level, one-shot) ────────────────────────────────────

const statusEl = document.getElementById('status')!;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

function log(msg: string) {
    statusEl.textContent = msg;
    console.log('[harness] ' + msg);
}

log('creating WebGL2 renderer…');

// Mirror renderWorker.ts:setupEngine() — the only part of the app that
// actually boots the engine. Any deviation from this sequence silently breaks
// state sync (e.g. missing engine.state.optics → syncFrame returns early → no
// camera uniform updates → black output).
const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    depth: false,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
});
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(1);

const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
camera.position.set(0, 0, 0);                // canonical: world position lives in sceneOffset

const engine = new FractalEngine();
engine.registerCamera(camera);
engine.registerRenderer(renderer);
engine.mainUniforms.uInternalScale.value = 1;

log('engine created, ready for boot.');

// Intercept engine's "[Compile] Two-stage: …ms (..., gen=Xms, gpu=Yms)" log
// to pull stage timings. COMPILE_TIME event only fires when >100ms, so log
// parsing is the only way to capture preview/gpu splits on fast compiles.
let lastCompileLogParse: { previewMs?: number; gpuMs?: number } = {};
const origLog = console.log.bind(console);
console.log = (...args: any[]) => {
    origLog(...args);
    const msg = args[0];
    if (typeof msg === 'string' && msg.startsWith('[Compile] Two-stage:')) {
        const m = msg.match(/gen=(\d+)ms, gpu=(\d+)ms/);
        if (m) lastCompileLogParse = { previewMs: +m[1], gpuMs: +m[2] };
    }
};

// ─── Config building ─────────────────────────────────────────────────────────

/**
 * Build a fresh ShaderConfig with the formula's defaultPreset features applied,
 * then deep-merge configOverrides. Mirrors what the store does at runtime when
 * a scene is loaded.
 */
function buildConfigForTest(spec: TestSpec): ShaderConfig {
    const def = registry.get(spec.formula as any);
    if (!def) throw new Error(`formula not registered: ${spec.formula}`);

    // 1. Start with fresh feature defaults (shared with FractalEngine constructor)
    const cfg: any = createDefaultShaderConfig(spec.formula);

    // 2. Apply formula's defaultPreset features on top (brings camera-appropriate
    //    quality settings, iteration counts, coloring etc. that the formula expects)
    const presetFeatures = (def.defaultPreset as any)?.features ?? {};
    for (const [featId, featState] of Object.entries(presetFeatures)) {
        if (!cfg[featId]) continue;  // feature not registered
        Object.assign(cfg[featId], featState);
    }

    // 3. Apply test-case overrides (deep-merged per feature)
    if (spec.configOverrides) {
        for (const [featId, featState] of Object.entries(spec.configOverrides)) {
            if (!cfg[featId]) cfg[featId] = {};
            if (typeof featState === 'object' && featState !== null) {
                Object.assign(cfg[featId], featState);
            } else {
                cfg[featId] = featState;
            }
        }
    }

    return cfg as ShaderConfig;
}

function applyPresetCamera(spec: TestSpec) {
    const def = registry.get(spec.formula as any);
    const preset: any = def?.defaultPreset ?? {};
    const pos = spec.cameraOverrides?.pos ?? [
        preset.cameraPos?.x ?? 0,
        preset.cameraPos?.y ?? 0,
        preset.cameraPos?.z ?? 3,
    ];
    const rot = spec.cameraOverrides?.rot ?? [
        preset.cameraRot?.x ?? 0,
        preset.cameraRot?.y ?? 0,
        preset.cameraRot?.z ?? 0,
        preset.cameraRot?.w ?? 1,
    ];
    const targetDist = spec.cameraOverrides?.targetDistance ?? preset.targetDistance ?? 3;
    const sceneOffset = preset.sceneOffset ?? { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };

    camera.position.set(pos[0], pos[1], pos[2]);
    camera.quaternion.set(rot[0], rot[1], rot[2], rot[3]);
    camera.updateMatrixWorld();

    // Teleport triggers scene-offset absorption and accumulation reset
    FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
        position: { x: pos[0], y: pos[1], z: pos[2] },
        rotation: { x: rot[0], y: rot[1], z: rot[2], w: rot[3] },
        targetDistance: targetDist,
        sceneOffset,
    } as any);
}

// ─── Render-loop helpers ─────────────────────────────────────────────────────

function pctl(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.floor(sorted.length * p);
    return sorted[Math.min(sorted.length - 1, idx)];
}

async function nextFrame(): Promise<void> {
    return new Promise(r => requestAnimationFrame(() => r()));
}

/**
 * Adaptive warmup: render frames until the recent window's relative std dev
 * drops below threshold. Caps at maxFrames to avoid infinite loops.
 */
async function adaptiveWarmup(cam: THREE.PerspectiveCamera, maxFrames = 40): Promise<number> {
    const windowSize = 6;
    const stableThreshold = 0.15;  // relative stddev < 15% counts as stabilized
    const times: number[] = [];
    let count = 0;
    for (let i = 0; i < maxFrames; i++) {
        const t0 = performance.now();
        engine.syncCameraFromMatrix(cam);
        engine.update(cam, 1 / 60, (engine as any).state, false);
        engine.compute(renderer);
        await nextFrame();
        times.push(performance.now() - t0);
        count++;
        if (times.length >= windowSize) {
            const w = times.slice(-windowSize);
            const mean = w.reduce((s, x) => s + x, 0) / w.length;
            if (mean > 0) {
                const sd = Math.sqrt(w.reduce((s, x) => s + (x - mean) ** 2, 0) / w.length);
                if (sd / mean < stableThreshold) return count;
            }
        }
    }
    return count;
}

async function measureFrames(cam: THREE.PerspectiveCamera, n: number): Promise<number[]> {
    const times: number[] = [];
    const gl = renderer.getContext();
    // Hoist readPixels scratch buffer outside the loop — allocated once,
    // reused per frame. readPixels of 1 pixel forces GPU→CPU sync so timing
    // captures actual render work rather than CPU queue-submit time.
    const syncPixel = new Uint8Array(4);
    for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        engine.syncCameraFromMatrix(cam);
        engine.update(cam, 1 / 60, (engine as any).state, false);
        engine.compute(renderer);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
        times.push(performance.now() - t0);
    }
    return times;
}

// ─── Snapshot analysis ───────────────────────────────────────────────────────

interface RenderStats {
    sigma: [number, number, number];
    nanFraction: number;
    nonBlackFraction: number;
}

async function captureAndAnalyze(format: 'png' | 'jpeg' = 'png', quality = 0.92): Promise<{ imageDataUrl: string; stats: RenderStats }> {
    // Pull from the engine's display pipeline (post-process, tone-mapped, sRGB-encoded).
    const blob = await engine.captureSnapshot();
    if (!blob) throw new Error('captureSnapshot returned null');
    const pngDataUrl = await blobToDataUrl(blob);

    // Analyze the snapshot at source resolution
    const img = new Image();
    img.src = pngDataUrl;
    await new Promise<void>(r => { img.onload = () => r(); });
    const w = img.width, h = img.height;
    const cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    const cctx = cvs.getContext('2d')!;
    cctx.drawImage(img, 0, 0);
    const data = cctx.getImageData(0, 0, w, h).data;

    let sumR = 0, sumG = 0, sumB = 0, n = w * h;
    let nanCount = 0, nonBlack = 0;
    for (let i = 0; i < n; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        sumR += r; sumG += g; sumB += b;
        // Orange-hue NaN sentinel (preview shader paints NaN pixels (255, 128, 0))
        if (r > 200 && g > 100 && g < 170 && b < 40) nanCount++;
        if (r > 3 || g > 3 || b > 3) nonBlack++;
    }
    const meanR = sumR / n, meanG = sumG / n, meanB = sumB / n;
    let varR = 0, varG = 0, varB = 0;
    for (let i = 0; i < n; i++) {
        varR += (data[i * 4]   - meanR) ** 2;
        varG += (data[i * 4+1] - meanG) ** 2;
        varB += (data[i * 4+2] - meanB) ** 2;
    }
    const stats: RenderStats = {
        sigma: [
            +Math.sqrt(varR / n).toFixed(2),
            +Math.sqrt(varG / n).toFixed(2),
            +Math.sqrt(varB / n).toFixed(2),
        ],
        nanFraction: +(nanCount / n).toFixed(3),
        nonBlackFraction: +(nonBlack / n).toFixed(3),
    };
    // Re-encode from the analysis canvas if JPEG requested. Gallery thumbs use
    // JPEG to match the existing public/thumbnails/fractal_*.jpg convention.
    const imageDataUrl = format === 'jpeg'
        ? cvs.toDataURL('image/jpeg', quality)
        : pngDataUrl;
    return { imageDataUrl, stats };
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
    });
}

// ─── Size change helper ──────────────────────────────────────────────────────

function resizeCanvas(w: number, h: number) {
    canvas.width = w;
    canvas.height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const u = engine.mainUniforms as any;
    if (u.uResolution) u.uResolution.value.set(w, h);
    if (engine.pipeline) engine.pipeline.resize(w, h);
}

/** Populate engine.state from a config object. Without this,
 *  FractalEngine.syncFrame short-circuits (`if (!state.optics && !state.lighting) return`)
 *  which means camera uniforms never update → pure-black renders. The app
 *  does this via EngineBridge's setRenderState calls. */
function hydrateEngineState(cfg: any) {
    engine.setRenderState({
        optics:   cfg.optics   ?? {},
        lighting: cfg.lighting ?? {},
        quality:  cfg.quality  ?? {},
        geometry: cfg.geometry ?? {},
    } as any);
}

// ─── Main entry: runRenderTest ───────────────────────────────────────────────

let engineBooted = false;
let inflight: Promise<TestResult> | null = null;

async function runOne(spec: TestSpec): Promise<TestResult> {
    const t0 = performance.now();
    const [w, h] = spec.size ?? [256, 256];
    resizeCanvas(w, h);

    const result: TestResult = {
        id: spec.id,
        ok: false,
        compile: { totalMs: 0 },
        render: { sigma: [0, 0, 0], nanFraction: 0, nonBlackFraction: 0 },
        timeMs: 0,
    };

    // `stage` annotates each step so crashes report which phase they happened
    // in ("[stage=renderFrames] ..."), pinpointing where engine state sync
    // drifts if a formula's preset has an unexpected shape.
    let stage = 'start';
    try {
        stage = 'buildConfig';
        const config = buildConfigForTest(spec);
        lastCompileLogParse = {};

        // Mirror renderWorker's sequence: preloadConfig → engine.state hydration
        // → camera uniform sync → bootWithConfig (or CONFIG re-emit).
        stage = 'hydrateEngineState';
        hydrateEngineState(config);
        stage = 'applyPresetCamera';
        applyPresetCamera(spec);
        stage = 'syncCameraToUniforms';
        engine.syncCameraFromMatrix(camera);

        const compileStart = performance.now();
        stage = 'bootOrConfig';
        if (!engineBooted) {
            engine.preloadConfig(config);
            engineBooted = true;
            engine.bootWithConfig(config);
        } else {
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, config);
            if (!engine.isCompiling) {
                (engine as any).scheduleCompile?.();
            }
        }

        stage = 'awaitCompile';
        await engine.awaitCompile(spec.timeoutMs ?? 30000);
        result.compile.totalMs = Math.round(performance.now() - compileStart);
        result.compile.logPreviewMs = lastCompileLogParse.previewMs;
        result.compile.logGpuMs = lastCompileLogParse.gpuMs;

        stage = 'syncCamera-postCompile';
        engine.syncCameraFromMatrix(camera);

        // Render: mode-dependent
        if (spec.mode === 'single') {
            stage = 'renderFrames';
            const n = (config as any).lighting?.renderMode === 1.0 ? 32 : 8;
            for (let i = 0; i < n; i++) {
                engine.syncCameraFromMatrix(camera);
                engine.update(camera, 1 / 60, (engine as any).state, false);
                engine.compute(renderer);
                await nextFrame();
            }
        } else {
            // perf mode: warmup then measure
            let warmupCount = 0;
            if (spec.warmup === 'adaptive' || spec.warmup === undefined) {
                warmupCount = await adaptiveWarmup(camera);
            } else {
                warmupCount = spec.warmup;
                for (let i = 0; i < warmupCount; i++) {
                    engine.update(camera, 1 / 60, (engine as any).state, false);
                    engine.compute(renderer);
                    await nextFrame();
                }
            }
            const times = await measureFrames(camera, spec.measureFrames ?? 60);
            const sorted = [...times].sort((a, b) => a - b);
            const p50 = pctl(sorted, 0.5);
            result.frames = {
                warmupCount,
                measuredCount: times.length,
                frameMsP50: +p50.toFixed(3),
                frameMsP95: +pctl(sorted, 0.95).toFixed(3),
                frameMsMin: +sorted[0].toFixed(3),
                frameMsMax: +sorted[sorted.length - 1].toFixed(3),
                samplesPerSec: p50 > 0 ? +(1000 / p50).toFixed(1) : 0,
            };
        }

        stage = 'captureAndAnalyze';
        const { imageDataUrl, stats } = await captureAndAnalyze(spec.imageFormat ?? 'png', spec.imageQuality ?? 0.92);
        result.render = stats;
        result.thumbnailPNG = imageDataUrl;
        result.ok = true;
    } catch (e: any) {
        const stack = e?.stack ? String(e.stack).split('\n').slice(0, 5).join(' | ') : '';
        result.error = `[stage=${stage}] ${e?.message ?? String(e)} ${stack ? '\nstack: ' + stack : ''}`;
    }

    result.timeMs = Math.round(performance.now() - t0);
    return result;
}

// Queue runs sequentially — the engine's compile path isn't re-entrant.
(window as any).runRenderTest = async (spec: TestSpec): Promise<TestResult> => {
    if (inflight) await inflight;
    inflight = runOne(spec);
    try { return await inflight; }
    finally { inflight = null; }
};

(window as any).harnessReady = true;
log('ready — window.runRenderTest(spec) exposed.');
