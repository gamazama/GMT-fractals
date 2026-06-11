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
import { FractalEngine } from '../engine-gmt/engine/FractalEngine';
import type { ShaderConfig } from '../engine-gmt/engine/ShaderFactory';
import { FractalEvents, FRACTAL_EVENTS } from '../engine-gmt/engine/FractalEvents';
import { BucketRunner } from '../engine/export/BucketRunner';
import { bucketRenderer } from '../engine-gmt/engine/BucketRenderer';
import type { BucketRenderConfig } from '../engine-gmt/engine/BucketRenderer';
import { BloomPass } from '../engine-gmt/engine/BloomPass';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { createDefaultShaderConfig } from '../engine-gmt/engine/ConfigDefaults';
import { registerFeatures } from '../engine-gmt/features';
import '../engine-gmt/formulas';  // side-effect: registers all native FractalDefinitions

// Frag-import pipeline (mirrors FormulaWorkshop.buildAndRegister exactly).
import { detectFormulaV3, transformFormulaV3 } from '../engine-gmt/features/fragmentarium_import/v3/compat';
import { buildFractalParams } from '../engine-gmt/features/fragmentarium_import/workshop/param-builder';
import { deriveImportCapabilities } from '../engine-gmt/features/fragmentarium_import/import-capabilities';
import { processFormula as v4ProcessFormula } from '../engine-gmt/features/fragmentarium_import/v4';
import type { FractalDefinition } from '../engine-gmt/types';

registerFeatures();

/**
 * Build + register a FractalDefinition from raw .frag source, replicating
 * FormulaWorkshop's buildAndRegister (V3) / buildAndRegisterV4 (V4) paths.
 * Returns the registered id, or throws with a stage-tagged error.
 */
function buildFragDefinition(fragSource: string, id: string, name: string, pipeline: 'v3' | 'v4'): string {
    if (pipeline === 'v4') {
        const r: any = v4ProcessFormula(fragSource, name, id, name);
        if (!r.ok) throw new Error(`v4: ${r.error?.kind ?? ''}: ${r.error?.message ?? 'processFormula failed'}`);
        registry.register(r.value.definition);
        FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: r.value.definition.id, shader: r.value.definition.shader });
        return r.value.definition.id;
    }
    // V3 path
    const detected: any = detectFormulaV3(fragSource, name);
    if (detected.error) throw new Error(`v3-detect: ${detected.error}`);
    const { selectedFunction, loopMode, params } = detected;
    const result: any = transformFormulaV3(detected, selectedFunction, loopMode, name, params);
    if (!result) throw new Error('v3-transform: returned null');
    const { uiParams, defaultPreset } = buildFractalParams(params, id);
    const shaderGlsl = {
        function: (result.uniforms ? result.uniforms + '\n\n' : '') + result.function,
        loopBody: result.loopBody,
        getDist: result.getDist,
        loopInit: result.loopInit,
    };
    const isFullDe = result.mode === 'full-de';
    const def: FractalDefinition = {
        id: id as any,
        name,
        shader: {
            ...shaderGlsl,
            selfContainedSDE: isFullDe || undefined,
            capabilities: deriveImportCapabilities(shaderGlsl as any, isFullDe ? 'self-contained' : 'per-iteration'),
        } as any,
        parameters: uiParams,
        defaultPreset,
    };
    registry.register(def);
    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
    return id;
}

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
    const sceneOffset = (spec.cameraOverrides as any)?.sceneOffset ?? preset.sceneOffset ?? { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };

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

/**
 * Shared scene prep: config build → engine-state hydration → preset/override
 * camera → boot or CONFIG re-emit → compile completion. Used by runOne and
 * runBucketOne.
 *
 * Listener-first: a CONFIG that needs no rebuild (identical re-render — the
 * normal bench case) emits IS_COMPILING=false SYNCHRONOUSLY inside the emit
 * (FractalEngine.updateConfigInternal), so awaitCompile must be attached
 * BEFORE the emit or it hangs until timeout.
 */
async function prepareScene(spec: TestSpec, timeoutMs: number): Promise<{ config: ShaderConfig; compileMs: number }> {
    const config = buildConfigForTest(spec);
    lastCompileLogParse = {};
    hydrateEngineState(config);
    applyPresetCamera(spec);
    engine.syncCameraFromMatrix(camera);

    const compileStart = performance.now();
    let compileDone: Promise<void>;
    if (!engineBooted) {
        engine.preloadConfig(config);
        engineBooted = true;
        compileDone = engine.awaitCompile(timeoutMs);
        engine.bootWithConfig(config);
    } else {
        compileDone = engine.awaitCompile(timeoutMs);
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, config);
    }
    await compileDone;
    engine.syncCameraFromMatrix(camera);
    return { config, compileMs: Math.round(performance.now() - compileStart) };
}

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
        stage = 'prepareScene';
        const { config, compileMs } = await prepareScene(spec, spec.timeoutMs ?? 30000);
        result.compile.totalMs = compileMs;
        result.compile.logPreviewMs = lastCompileLogParse.previewMs;
        result.compile.logGpuMs = lastCompileLogParse.gpuMs;

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

// Build a frag formula from source, register it, then render it like any native.
// spec adds { fragSource, pipeline } and uses spec.formula as the new id/name.
(window as any).runFragRenderTest = async (
    spec: TestSpec & { fragSource: string; pipeline?: 'v3' | 'v4' },
): Promise<TestResult> => {
    if (inflight) await inflight;
    const run = (async (): Promise<TestResult> => {
        const t0 = performance.now();
        try {
            if (!registry.get(spec.formula as any)) {
                buildFragDefinition(spec.fragSource, spec.formula, spec.formula, spec.pipeline ?? 'v3');
            }
        } catch (e: any) {
            return {
                id: spec.id, ok: false, error: `[stage=fragBuild] ${e?.message ?? String(e)}`,
                compile: { totalMs: 0 }, render: { sigma: [0, 0, 0], nanFraction: 0, nonBlackFraction: 0 },
                timeMs: Math.round(performance.now() - t0),
            };
        }
        return runOne(spec);
    })();
    inflight = run;
    try { return await run; }
    finally { inflight = null; }
};

// ─── PT bench: headless bucket-render driver (debug/bench-pt.mts) ────────────
//
// Drives the REAL export path (BucketRunner + GmtBucketHost + exportMaterial
// readback) headless, capturing the exact pixels a user's PNG would contain.
// Two debug-only prototype patches (TS `private` is compile-time only):
//   - saveImage: captures per-tile readback pixels instead of DOM-downloading.
//   - compositeCurrentBucket: records per-bucket effective sample counts
//     (pipeline.accumulationCount at composite time) — this is the
//     convergence-variance data the seam analysis needs.
// Both fall through to original behaviour when no capture is active.

interface CapturedTile {
    row: number; col: number;
    pixelX: number; pixelY: number;       // origin in full output, Y from bottom (GL convention)
    width: number; height: number;
    pixels: Uint8ClampedArray;            // top-down RGBA (readCompositePixels Y-flips)
}
interface BucketStat {
    tileIndex: number; bucketIndex: number;
    frames: number;                       // BucketRunner.bucketFrameCount at composite
    samples: number;                      // pipeline.accumulationCount at composite = true spp
}
let bucketCapture: { tiles: CapturedTile[]; buckets: BucketStat[] } | null = null;

const runnerProto = BucketRunner.prototype as any;
const origSaveImage = runnerProto.saveImage;
runnerProto.saveImage = function (readbackMat: THREE.ShaderMaterial) {
    if (!bucketCapture) return origSaveImage.call(this, readbackMat);
    const result = this.readCompositePixels(readbackMat);
    if (!result) return;
    const imgTile = this.imageTiles[this.currentImageTileIndex];
    bucketCapture.tiles.push({
        row: imgTile.row, col: imgTile.col,
        pixelX: imgTile.pixelX, pixelY: imgTile.pixelY,
        width: result.width, height: result.height,
        pixels: result.pixels,
    });
};
const origComposite = runnerProto.compositeCurrentBucket;
runnerProto.compositeCurrentBucket = function () {
    if (bucketCapture) {
        bucketCapture.buckets.push({
            tileIndex: this.currentImageTileIndex,
            bucketIndex: this.currentBucketIndex,
            frames: this.bucketFrameCount,
            samples: engine.pipeline?.accumulationCount ?? -1,
        });
    }
    return origComposite.call(this);
};

// Mirror renderWorker: clear the engine flag when the runner reports done,
// and give the host a BloomPass so the bloom branch of the readback material
// is exercised (the worker creates one at INIT).
FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data: any) => {
    if (!data.isRendering) (engine as any).state.isBucketRendering = false;
});
bucketRenderer.setBloomPass(new BloomPass());

export interface BucketTestSpec {
    id: string;
    formula: string;
    configOverrides?: Record<string, any>;
    cameraOverrides?: TestSpec['cameraOverrides'];
    outputWidth: number;
    outputHeight: number;
    tileCols: number;
    tileRows: number;
    /** GPU bucket (VRAM tile) size in px. Default 512. */
    bucketSize?: number;
    /** Exact-spp mode: every bucket renders exactly this many samples/pixel.
     *  Threshold is pinned to 0 so convergence never fires early; the cap is
     *  spp+1 because BucketRunner composites on the update() tick BEFORE the
     *  frame that would render sample N; the bucket loop additionally skips
     *  the compute on bucket-transition frames so non-first buckets don't
     *  pick up an orphan extra sample. Verified via BucketStat.samples. */
    samplesPerPixel?: number;
    /** Natural-convergence mode (used when samplesPerPixel is unset):
     *  threshold is the UI percent value, cap is maxSamplesPerBucket. */
    convergenceThreshold?: number;
    maxSamplesPerBucket?: number;
    /** Canvas ("viewport") size — affects the bloom-at-viewport-res branch
     *  exactly like a real export from a window. Default 512×512. */
    viewport?: [number, number];
    timeoutMs?: number;
    /** Return the stitched image as raw RGBA (base64) for metric computation. */
    returnPixels?: boolean;
    /** Return the stitched image as a PNG data URL for artifacts. */
    returnPNG?: boolean;
}

export interface BucketTestResult {
    id: string;
    ok: boolean;
    error?: string;
    compileMs: number;
    renderMs: number;          // bucket loop wall time (excludes compile)
    frames: number;            // total engine frames driven
    width: number;
    height: number;
    tileCount: number;
    buckets: BucketStat[];
    stitchedPNG?: string;      // data URL
    rgbaBase64?: string;       // top-down RGBA of the stitched output
    timeMs: number;
}

function uint8ToBase64(data: Uint8ClampedArray): string {
    let s = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < data.length; i += CHUNK) {
        s += String.fromCharCode.apply(null, data.subarray(i, i + CHUNK) as unknown as number[]);
    }
    return btoa(s);
}

async function runBucketOne(spec: BucketTestSpec): Promise<BucketTestResult> {
    const t0 = performance.now();
    const [vw, vh] = spec.viewport ?? [512, 512];
    resizeCanvas(vw, vh);

    const result: BucketTestResult = {
        id: spec.id, ok: false, compileMs: 0, renderMs: 0, frames: 0,
        width: spec.outputWidth, height: spec.outputHeight,
        tileCount: 0, buckets: [], timeMs: 0,
    };

    let stage = 'start';
    try {
        stage = 'prepareScene';
        const { compileMs } = await prepareScene(
            spec as unknown as TestSpec, spec.timeoutMs ?? 60000);
        result.compileMs = compileMs;

        // Settle frames: let lazy GL state (blue-noise LUT upload etc.) land
        // before the measured bucket loop starts.
        stage = 'settleFrames';
        for (let i = 0; i < 4; i++) {
            engine.update(camera, 1 / 60, (engine as any).state, false);
            engine.compute(renderer);
            await nextFrame();
        }

        stage = 'bucketStart';
        const exact = spec.samplesPerPixel !== undefined;
        const bConfig: BucketRenderConfig = {
            bucketSize: spec.bucketSize ?? 512,
            outputWidth: spec.outputWidth,
            outputHeight: spec.outputHeight,
            tileCols: spec.tileCols,
            tileRows: spec.tileRows,
            // Exact mode: threshold 0 can never beat the (strictly positive)
            // convergence measure, so every bucket runs to the cap.
            convergenceThreshold: exact ? 0 : (spec.convergenceThreshold ?? 0.25),
            accumulation: true,
            samplesPerBucket: exact ? spec.samplesPerPixel! + 1 : (spec.maxSamplesPerBucket ?? 1024),
            includeGmfData: false,
        };
        bucketCapture = { tiles: [], buckets: [] };
        // Mirror renderWorker BUCKET_START: state.bucketConfig must match the
        // started config — engine.update() feeds it back via updateConfig()
        // every frame, so a stale default here would overwrite the threshold/cap.
        (engine as any).state.bucketConfig = { ...bConfig };
        (engine as any).state.isBucketRendering = true;
        bucketRenderer.start(true, bConfig);

        stage = 'bucketLoop';
        const renderStart = performance.now();
        const deadline = renderStart + (spec.timeoutMs ?? 600000);
        let frames = 0;
        let compositesSeen = 0;
        while (bucketRenderer.getIsRunning()) {
            if (performance.now() > deadline) {
                bucketRenderer.stop();
                (engine as any).state.isBucketRendering = false;
                throw new Error(`bucket render timeout after ${frames} frames`);
            }
            engine.update(camera, 1 / 60, (engine as any).state, false);
            // Skip the compute on bucket-transition frames: the runner
            // composites + advances during update(), and rendering into the
            // freshly-reset accumulator on the SAME frame would give every
            // non-first bucket one extra sample (spp+1 vs spp for the first —
            // sampling is deterministic by accumulation index, so dropping
            // the orphan sample keeps per-bucket spp uniform without
            // changing which samples are drawn).
            const advanced = bucketCapture!.buckets.length !== compositesSeen;
            compositesSeen = bucketCapture!.buckets.length;
            if (!advanced) engine.compute(renderer);
            frames++;
            await nextFrame();
        }
        (engine as any).state.isBucketRendering = false;
        result.renderMs = Math.round(performance.now() - renderStart);
        result.frames = frames;

        // Stitch tiles into one top-down canvas. Tile pixelY is from the
        // BOTTOM of the full output (GL convention); tile pixel buffers are
        // already top-down.
        stage = 'stitch';
        const W = spec.outputWidth, H = spec.outputHeight;
        const cvs = document.createElement('canvas');
        cvs.width = W; cvs.height = H;
        const ctx = cvs.getContext('2d')!;
        for (const t of bucketCapture.tiles) {
            const img = new ImageData(t.pixels as unknown as Uint8ClampedArray<ArrayBuffer>, t.width, t.height);
            ctx.putImageData(img, t.pixelX, H - t.pixelY - t.height);
        }
        result.tileCount = bucketCapture.tiles.length;
        result.buckets = bucketCapture.buckets;
        if (spec.returnPNG !== false) result.stitchedPNG = cvs.toDataURL('image/png');
        if (spec.returnPixels !== false) {
            result.rgbaBase64 = uint8ToBase64(ctx.getImageData(0, 0, W, H).data);
        }
        result.ok = true;
    } catch (e: any) {
        const stack = e?.stack ? String(e.stack).split('\n').slice(0, 5).join(' | ') : '';
        result.error = `[stage=${stage}] ${e?.message ?? String(e)} ${stack ? '\nstack: ' + stack : ''}`;
        // Never leave a wedged bucket session behind for the next test.
        if (bucketRenderer.getIsRunning()) bucketRenderer.stop();
        (engine as any).state.isBucketRendering = false;
    } finally {
        bucketCapture = null;
    }

    result.timeMs = Math.round(performance.now() - t0);
    return result;
}

(window as any).runBucketRenderTest = async (spec: BucketTestSpec): Promise<BucketTestResult> => {
    if (inflight) await inflight;
    const run = runBucketOne(spec);
    inflight = run as unknown as Promise<TestResult>;
    try { return await run; }
    finally { inflight = null; }
};

(window as any).harnessReady = true;
log('ready — window.runRenderTest(spec) + runFragRenderTest(spec) + runBucketRenderTest(spec) exposed.');
