/**
 * GPU-only shader benchmark for app-gmt.
 *
 * Boots a real instance of app-gmt in Playwright, subscribes to the engine's
 * SHADER_CODE + UNIFORM event stream to snapshot the live fragment shader and
 * uniform set after the first painted frame, then loads a bare WebGL2 harness
 * (shader-bench.html) that replays that snapshot, measuring GPU time per draw
 * via EXT_disjoint_timer_query_webgl2.
 *
 * Why this exists alongside bench-perf.mts: bench-perf measures the FULL
 * pipeline (React + Zustand + worker + GPU) — useful as a "user experience"
 * number but noisy for shader optimization because every layer adds latency.
 * This bench strips everything except the GLSL itself, so a regression here
 * is unambiguously a shader change.
 *
 * Why snapshot from the live engine instead of generating Node-side: the
 * engine's shader is built dynamically at runtime from live feature state,
 * mode toggles, and the active formula. Generating it Node-side from registry
 * defaults gives a *plausible* shader but not necessarily *the* shader the
 * user sees. Same problem with uniforms: UniformManager runs in the worker
 * with full Three.js context, and is impractical to replicate Node-side.
 * Snapshotting via the FRACTAL_EVENTS bus gives perfect fidelity for free.
 *
 * Coordination: acquires debug/.bench.lock so it can't run concurrently with
 * bench-perf (or any other GPU-heavy bench). Polite-wait by default.
 *
 *   Usage:
 *     npx tsx debug/bench-shader.mts
 *     npx tsx debug/bench-shader.mts --width=1920 --height=1080
 *     npx tsx debug/bench-shader.mts --warmup=120 --draws=480
 *     npx tsx debug/bench-shader.mts --no-wait              # fail if lock held
 *     npx tsx debug/bench-shader.mts --force                # steal a held lock
 *     npx tsx debug/bench-shader.mts --frag=path/to.frag    # override snapshot frag
 *     npx tsx debug/bench-shader.mts --snapshot-only        # capture & exit
 *     npx tsx debug/bench-shader.mts --use-snapshot=path.json  # skip live capture
 *
 * Output:
 *   debug/bench-shader-latest.json   — full data
 *   debug/bench-shader-<stamp>.json  — archive
 *   debug/bench-shader-snapshot.json — most recent live capture (cached)
 *   debug/bench-shader-refs/<label>.png — reference image
 */

import { chromium, type Browser } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import * as zlib from 'zlib';

import { acquireBenchLock } from './helpers/bench-lock.mts';

// ─── PNG metadata writer ─────────────────────────────────────────────────────
// PNG spec: text metadata is stored in `tEXt` chunks between IHDR and IEND.
// Each chunk is [length:4][type:4][data:length][crc:4]. tEXt data is
// keyword + null + text. We can append our chunks just before IEND so the
// images stay valid for any standard PNG reader (incl. browsers, image
// viewers, ExifTool — `exiftool image.png` will print all our metadata).
//
// Why bother: stamping timing + diff + optimization notes onto the PNG itself
// lets a future inspector tell at a glance which version of the bench / which
// shader produced the image, without needing to keep the JSON next to it.

function crc32(buf: Buffer): number {
    // Standard PNG CRC32 — Node's zlib.crc32 is exactly this.
    return zlib.crc32(buf);
}

function writeChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([length, typeBuf, data, crc]);
}

function makeTEXt(keyword: string, text: string): Buffer {
    // tEXt chunks are Latin-1; replace non-ASCII chars defensively.
    const safe = text.replace(/[^\x00-\xff]/g, '?');
    return writeChunk('tEXt', Buffer.concat([
        Buffer.from(keyword, 'latin1'),
        Buffer.from([0]),
        Buffer.from(safe, 'latin1'),
    ]));
}

function injectPngMetadata(pngBuf: Buffer, entries: Record<string, string>): Buffer {
    // PNG signature is 8 bytes; the IHDR chunk follows. We walk chunks until
    // we find IEND, then splice our tEXt chunks in just before it.
    if (pngBuf.length < 8 || pngBuf.readUInt32BE(0) !== 0x89504e47) {
        return pngBuf;  // not a PNG — return unmodified
    }
    let offset = 8;
    let iendStart = -1;
    while (offset + 8 < pngBuf.length) {
        const len = pngBuf.readUInt32BE(offset);
        const type = pngBuf.toString('ascii', offset + 4, offset + 8);
        if (type === 'IEND') { iendStart = offset; break; }
        offset += 12 + len;  // length(4) + type(4) + data(len) + crc(4)
    }
    if (iendStart < 0) return pngBuf;

    const chunks = Object.entries(entries).map(([k, v]) => makeTEXt(k, v));
    return Buffer.concat([
        pngBuf.subarray(0, iendStart),
        ...chunks,
        pngBuf.subarray(iendStart),
    ]);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
const argVal = (flag: string) => {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit?.split('=')[1];
};
const HAS = (flag: string) => process.argv.includes(flag);

// Standard 720p. The diff function handles size mismatches against the
// reference via canvas drawImage scaling, so the reference doesn't have to
// match exactly (slight resample is fine for relative-quality detection).
const WIDTH  = parseInt(argVal('--width')  ?? '1280', 10);
const HEIGHT = parseInt(argVal('--height') ?? '720',  10);
const REF_IMAGE_PATH = resolve('debug/bench-shader-refs/GMT_Mandelbulb_v1.png');
const WARMUP_DRAWS  = parseInt(argVal('--warmup') ?? '60',   10);
const MEASURE_DRAWS = parseInt(argVal('--draws')  ?? '240',  10);
const FRAG_OVERRIDE  = argVal('--frag');
const SNAPSHOT_ONLY  = HAS('--snapshot-only');
const USE_SNAPSHOT   = argVal('--use-snapshot');
const APP_TIMEOUT_MS = parseInt(argVal('--app-timeout') ?? '30000', 10);

// Scene overrides — modify the formula's defaultPreset before applying it,
// so the live snapshot captures a deliberately-tweaked scene. Useful for
// matrix benches across reflection modes / material variants.
//
//   --reflection-mode=off|env|raymarch       (default: leave alone — uses ENV)
//   --reflection-bounces=1..3                (raymarch only)
//   --material=default|matte|glossy|mirror   (presets that touch reflection,
//                                             specular, roughness, metallic)
const REFLECTION_MODE = argVal('--reflection-mode') ?? '';
const REFLECTION_BOUNCES = parseInt(argVal('--reflection-bounces') ?? '1', 10);
const MATERIAL_PRESET = argVal('--material') ?? '';
const SCENE_TAG = argVal('--tag') ?? '';   // appended to image filenames so
                                            // matrix runs don't overwrite

const APP_URL   = (process.env.ENGINE_URL ?? 'http://localhost:3400') + '/app-gmt.html';
const BENCH_URL = (process.env.ENGINE_URL ?? 'http://localhost:3400') + '/shader-bench.html';

const OUT_DIR        = resolve('debug');
const REFS_DIR       = resolve('debug/bench-shader-refs');
const SNAPSHOT_PATH  = resolve('debug/bench-shader-snapshot.json');

// ─── Reference image diff ────────────────────────────────────────────────────
//
// PNG decoder lite — we don't ship pako/pngjs. Instead, render both images on
// a Playwright page (it has Image + Canvas), read pixel data via getImageData,
// and compute MAE / RMSE / max-error / SSIM-lite. Run once at the end of a
// bench so we can tell numerically if the output is converging on the
// reference (GMT_Mandelbulb_v1.png).
//
// The diff is ground truth for "did my optimization break visual fidelity?"
// — combined with the timing it gives us both axes (perf vs. quality).
async function computeDiff(page: any, refPath: string, bench: { width: number; height: number; capturedDataUrl: string }) {
    const refDataUrl = `data:image/png;base64,${readFileSync(refPath).toString('base64')}`;
    // String-bodied evaluate to avoid tsx/esbuild's `__name(fn, …)` emit.
    const script = `(async (args) => {
        function load(url) {
            return new Promise(function (ok, err) {
                const img = new Image();
                img.onload = function () { ok(img); };
                img.onerror = err;
                img.src = url;
            });
        }
        const [refImg, benchImg] = await Promise.all([load(args.ref), load(args.bench)]);
        const W = args.w, H = args.h;
        function draw(img) {
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, W, H);
            return ctx.getImageData(0, 0, W, H).data;
        }
        const a = draw(refImg);
        const b = draw(benchImg);
        const diff = new Uint8ClampedArray(W * H * 4);
        let sumAbs = 0, sumSq = 0, maxErr = 0;
        // Per-region MAE — quadrants reveal localized regressions that an
        // overall mean would hide (e.g., normals affect a small lit patch
        // while the rest of the image stays bright).
        const regions = [0, 0, 0, 0];        // sumAbs per quadrant
        const regionPixels = [0, 0, 0, 0];   // pixel count per quadrant
        for (let p = 0; p < W * H; p++) {
            const i = p * 4;
            const x = p % W, y = Math.floor(p / W);
            const qx = x < W / 2 ? 0 : 1;
            const qy = y < H / 2 ? 0 : 2;
            const region = qx + qy;
            const refLuma   = (a[i] + a[i+1] + a[i+2]) / 3;
            const benchLuma = (b[i] + b[i+1] + b[i+2]) / 3;
            const delta = benchLuma - refLuma;
            const mag = Math.min(255, Math.abs(delta) * 4);
            diff[i + 0] = delta < 0 ? mag : 0;
            diff[i + 1] = delta > 0 ? mag : 0;
            diff[i + 2] = 0;
            diff[i + 3] = 255;
            for (let cc = 0; cc < 3; cc++) {
                const d = Math.abs(a[i + cc] - b[i + cc]);
                sumAbs += d; sumSq += d * d;
                if (d > maxErr) maxErr = d;
                regions[region] += d;
            }
            regionPixels[region] += 1;
        }
        const N = W * H * 3;
        const regionMae = regions.map((s, idx) => s / (regionPixels[idx] * 3));

        // Build a side-by-side composite (3W × H): reference | bench | diff.
        // One image to inspect instead of three. Adds 2px black gutters.
        const compW = W * 3 + 4;
        const composite = document.createElement('canvas');
        composite.width = compW; composite.height = H;
        const cctx = composite.getContext('2d');
        cctx.fillStyle = '#000'; cctx.fillRect(0, 0, compW, H);
        cctx.drawImage(refImg, 0, 0, W, H);
        cctx.drawImage(benchImg, W + 2, 0, W, H);
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = W; diffCanvas.height = H;
        diffCanvas.getContext('2d').putImageData(new ImageData(diff, W, H), 0, 0);
        cctx.drawImage(diffCanvas, W * 2 + 4, 0);
        // Label the panes (CSS-rendered text in the canvas)
        cctx.font = 'bold 18px monospace';
        cctx.fillStyle = '#0f0';
        cctx.fillText('REFERENCE', 8, 22);
        cctx.fillText('BENCH',     W + 10, 22);
        cctx.fillText('DIFF',      W * 2 + 12, 22);

        return {
            mae:  sumAbs / N,
            rmse: Math.sqrt(sumSq / N),
            maxErr: maxErr,
            regionMae,                                       // [TL, TR, BL, BR]
            diffDataUrl: diffCanvas.toDataURL('image/png'),
            compositeDataUrl: composite.toDataURL('image/png'),
        };
    })(${JSON.stringify({ ref: refDataUrl, bench: bench.capturedDataUrl, w: bench.width, h: bench.height })})`;
    return await page.evaluate(script);
}

// ─── Statistics ──────────────────────────────────────────────────────────────
const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
};
const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const stddev = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
};

// ─── Live snapshot ───────────────────────────────────────────────────────────
//
// Snapshot shape:
//   {
//     fragSrc:  string,           // active fragment shader at frame >= 1
//     uniforms: { [name]: any },  // logical uniform values by name
//     formula:  string,           // formula id at snapshot time
//     captured: ISO timestamp
//   }
//
// We boot app-gmt, install listeners on FractalEvents BEFORE any engine code
// initializes (via addInitScript), wait for the first real painted frame
// (accumulationCount > 1 — same gate bench-perf uses), then read out the
// accumulated fragment + uniform table.

interface Snapshot {
    fragSrc: string;
    uniforms: Record<string, any>;
    formula: string;
    captured: string;
    width: number;
    height: number;
}

async function captureLiveSnapshot(): Promise<Snapshot> {
    console.log(`[bench-shader] capturing live snapshot from ${APP_URL}`);
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
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // Fail fast on page errors during snapshot capture. A TS/Vite syntax
    // error or shader-compile error here means we can't trust anything
    // downstream — better to abort cleanly than barrel ahead with a
    // stale or partial state.
    const pageErrors: string[] = [];
    let snapshotAbort: ((err: Error) => void) | null = null;
    page.on('pageerror', (e) => {
        pageErrors.push(e.message);
        console.error(`[bench-shader] PAGE ERROR (snapshot): ${e.message}`);
        if (snapshotAbort) snapshotAbort(new Error(`page error during snapshot: ${e.message}`));
    });
    page.on('console', (m) => {
        if (m.type() === 'error') {
            const t = m.text();
            // Filter noisy/expected console.error from feature warnings
            if (/CompileError|SyntaxError|Failed to fetch dynamically imported|HMR.*failed/i.test(t)) {
                console.error(`[bench-shader] CONSOLE ERROR (snapshot): ${t}`);
                if (snapshotAbort) snapshotAbort(new Error(`console error during snapshot: ${t}`));
            }
        }
    });

    // Wrap the snapshot capture in a race against the abort signal so we
    // exit immediately on error instead of timing out 30s later.
    const abortable = <T,>(p: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
        const prevAbort = snapshotAbort;
        snapshotAbort = (e) => { snapshotAbort = prevAbort; reject(e); };
        p.then(v => { snapshotAbort = prevAbort; resolve(v); },
               e => { snapshotAbort = prevAbort; reject(e); });
    });

    const bailIfErrors = (where: string) => {
        if (pageErrors.length > 0) {
            throw new Error(`bench aborted in ${where}: ${pageErrors.length} page error(s); first: ${pageErrors[0]}`);
        }
    };
    await abortable(page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: APP_TIMEOUT_MS }));
    bailIfErrors('post-goto');

    // Wait for the same boot gate bench-perf uses: shader compiled + worker
    // has actually painted a frame. Wrapped in `abortable` so a page error
    // (TS syntax error, vite HMR fail, GLSL compile error) bails immediately
    // instead of hanging until APP_TIMEOUT_MS.
    console.log('[bench-shader] waiting for engine boot…');
    await abortable(page.waitForFunction(
        `window.__gmtProxy
            && window.__gmtProxy.isBooted
            && window.__gmtProxy.hasCompiledShader
            && !window.__gmtProxy.isCompiling`,
        { timeout: APP_TIMEOUT_MS, polling: 100 },
    ));
    bailIfErrors('post-boot');
    const accumBaseline = await page.evaluate(`window.__gmtProxy.accumulationCount`) as number;
    console.log(`[bench-shader] compiled — waiting for first painted frame (accum > ${accumBaseline})…`);
    await abortable(page.waitForFunction(
        `window.__gmtProxy.accumulationCount > ${accumBaseline + 2}`,
        { timeout: APP_TIMEOUT_MS, polling: 50 },
    ));
    bailIfErrors('post-first-frame');

    // Camera spring + lighting state may continue to settle for a few frames
    // post-compile. Wait briefly so the snapshot reflects steady state.
    await page.evaluate(`new Promise(r => setTimeout(r, 500))`);

    // Force-apply the formula's defaultPreset to guarantee a known-good state
    // (lights, camera, materials) for the bench. Without this, the snapshot
    // depends on whatever the engine happened to load — which may be a
    // different scene from the formula author's intent. Doing this here means
    // the bench always measures THE canonical scene for whatever formula is
    // active, with exactly the lighting setup the formula was designed for.
    console.log('[bench-shader] applying formula defaultPreset…');
    const presetApplied = await page.evaluate((opts: {
        reflectionMode: string;
        reflectionBounces: number;
        materialPreset: string;
    }) => {
        const store = (window as any).__store;
        const reg = (window as any).__fractalRegistry;
        const state = store.getState();
        const formula = state.formula;
        const def = reg ? reg.get(formula) : null;
        const preset = def?.defaultPreset;
        if (!preset) return { ok: false, reason: 'no defaultPreset on formula def' };

        // Deep-clone the preset so we can tweak features without polluting the
        // formula def for subsequent runs in the same engine session.
        const p = JSON.parse(JSON.stringify(preset));
        p.features = p.features || {};

        // Reflection mode override: env / raymarch / off
        if (opts.reflectionMode) {
            const modeMap: Record<string, number> = { off: 0.0, env: 1.0, raymarch: 3.0 };
            const m = modeMap[opts.reflectionMode];
            if (m !== undefined) {
                p.features.reflections = p.features.reflections || {};
                p.features.reflections.enabled = true;
                p.features.reflections.reflectionMode = m;
                if (m === 3.0) {
                    p.features.reflections.bounces = opts.reflectionBounces;
                }
            }
        }

        // Material preset overrides — flips on the reflection slider so we
        // actually see a difference. The default Mandelbulb uses
        // reflection=0.2, roughness=0.75 which sits ABOVE the
        // uReflRoughnessCutoff threshold so reflections don't trace.
        if (opts.materialPreset) {
            p.features.materials = p.features.materials || {};
            const m = p.features.materials;
            switch (opts.materialPreset) {
                case 'matte':   m.reflection = 0.0; m.specular = 0.5; m.roughness = 0.95; m.metallic = 0.0; break;
                case 'glossy':  m.reflection = 0.5; m.specular = 1.0; m.roughness = 0.30; m.metallic = 0.3; break;
                case 'mirror':  m.reflection = 1.0; m.specular = 1.0; m.roughness = 0.05; m.metallic = 1.0; break;
                case 'default': /* leave preset alone */ break;
            }
        }

        state.loadPreset(p);

        // applyPresetState calls every feature's setter with FULL state, which
        // can result in a sequence of recompiles where the LAST one resets
        // mode-changing fields back to their preset values (the preset doesn't
        // typically include reflectionMode, so the setter sees defaults). To
        // make our overrides "stick", call the relevant setters AFTER
        // loadPreset to land the values on top.
        const setters = (window as any).__store.getState();
        if (opts.reflectionMode) {
            const modeMap: Record<string, number> = { off: 0.0, env: 1.0, raymarch: 3.0 };
            const m = modeMap[opts.reflectionMode];
            if (m !== undefined && setters.setReflections) {
                setters.setReflections({ enabled: true, reflectionMode: m, bounces: opts.reflectionBounces });
            }
        }
        if (opts.materialPreset && setters.setMaterials) {
            const matPresets: Record<string, any> = {
                matte:   { reflection: 0.0, specular: 0.5, roughness: 0.95, metallic: 0.0 },
                glossy:  { reflection: 0.5, specular: 1.0, roughness: 0.30, metallic: 0.3 },
                mirror:  { reflection: 1.0, specular: 1.0, roughness: 0.05, metallic: 1.0 },
            };
            const m = matPresets[opts.materialPreset];
            if (m) setters.setMaterials(m);
        }

        const after = (window as any).__store.getState();
        return {
            ok: true,
            formula,
            appliedReflectionMode: after.reflections?.reflectionMode ?? 'unset',
            appliedRoughness: after.materials?.roughness ?? 'unset',
            appliedReflection: after.materials?.reflection ?? 'unset',
        };
    }, { reflectionMode: REFLECTION_MODE, reflectionBounces: REFLECTION_BOUNCES, materialPreset: MATERIAL_PRESET });
    console.log(`[bench-shader] preset diag: applied=${JSON.stringify({ refl: presetApplied.appliedReflectionMode, rough: presetApplied.appliedRoughness, reflectionStrength: presetApplied.appliedReflection })}`);
    if (!presetApplied.ok) {
        console.log(`[bench-shader] WARNING: ${presetApplied.reason} — using whatever state the engine had`);
    } else {
        console.log(`[bench-shader] applied defaultPreset for ${presetApplied.formula} — waiting for compile to settle…`);

        // The preset path issues several state changes in quick succession
        // (loadPreset feature setters + our explicit reflection/material
        // overrides). Each can trigger a recompile. We wait for the engine
        // to be quiescent (not currently compiling, isBooted) for a sustained
        // window — this is more robust than waiting for a specific length
        // change because we don't know which of the multiple recompiles
        // produces our final target shader.
        await page.evaluate(async () => {
            const proxy = (window as any).__gmtProxy;
            const start = performance.now();
            const TIMEOUT = 25_000;
            const QUIET_MS = 1500;  // require this much continuous quiet
            let quietSince = -1;
            while (performance.now() - start < TIMEOUT) {
                const compiling = proxy.isCompiling;
                if (compiling) {
                    quietSince = -1;
                } else if (quietSince < 0) {
                    quietSince = performance.now();
                } else if (performance.now() - quietSince >= QUIET_MS) {
                    return;
                }
                await new Promise(r => setTimeout(r, 100));
            }
        });
        const after = await page.evaluate(`window.__gmtProxy.accumulationCount`) as number;
        await page.waitForFunction(
            `window.__gmtProxy.accumulationCount > ${after + 2}`,
            { timeout: APP_TIMEOUT_MS, polling: 50 },
        );
        await page.evaluate(`new Promise(r => setTimeout(r, 500))`);

        const lenAfter = await page.evaluate(async () => {
            const code = await (window as any).__gmtProxy.getCompiledFragmentShader();
            return code ? code.length : 0;
        }) as number;
        console.log(`[bench-shader] frag length after settling: ${lenAfter}`);
    }

    // Pull live shader + uniforms straight from the worker via the proxy's
    // request/response channel. Uniforms are pre-serialized worker-side
    // (see renderWorker.ts case 'GET_UNIFORMS_SNAPSHOT') — Three.js Vector3
    // → flat array, Matrix3 → { mat3 }, Texture → { __sampler } sentinel.
    const captured = await page.evaluate(async () => {
        const proxy = (window as any).__gmtProxy;
        const [fragSrc, uniforms] = await Promise.all([
            proxy.getCompiledFragmentShader(),
            proxy.getUniformsSnapshot(),
        ]);
        const formula = (window as any).__store?.getState?.()?.formula ?? '?';
        return { fragSrc, uniforms: uniforms ?? {}, formula };
    });

    await browser.close();

    if (!captured.fragSrc) {
        throw new Error('snapshot failed — no SHADER_CODE event was captured. Check that main.tsx exposes window.__fractalEvents.');
    }
    const uCount = Object.keys(captured.uniforms).length;
    if (uCount < 50) {
        throw new Error(`snapshot suspiciously small — only ${uCount} uniforms captured. Expected ~200+.`);
    }

    const snap: Snapshot = {
        fragSrc: captured.fragSrc,
        uniforms: captured.uniforms,
        formula: captured.formula,
        captured: new Date().toISOString(),
        width: WIDTH,
        height: HEIGHT,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snap, null, 2));
    console.log(`[bench-shader] snapshot: formula=${snap.formula}  frag=${snap.fragSrc.length}b  uniforms=${uCount}  → ${SNAPSHOT_PATH}`);

    if (pageErrors.length > 0) {
        console.log('[bench-shader] page errors during capture:');
        pageErrors.forEach((e) => console.log('  ', e));
    }
    return snap;
}

// ─── Bench run ───────────────────────────────────────────────────────────────
async function runBench(snap: Snapshot, fragOverride: string | null) {
    let fragSrc = fragOverride ?? snap.fragSrc;
    let fragSource = fragOverride ? `file:${FRAG_OVERRIDE}` : `live:${snap.formula}`;

    // Engine emits the body without #version; the WebGL2 harness needs
    // `#version 300 es` as the very first line.
    if (!fragSrc.trimStart().startsWith('#version')) {
        fragSrc = '#version 300 es\n' + fragSrc;
    }

    const fragHash = createHash('sha256').update(fragSrc).digest('hex').slice(0, 16);
    const lineCount = fragSrc.split('\n').length;
    console.log(`[bench-shader] frag sha256:${fragHash}  ${lineCount} lines  source=${fragSource}`);

    // Prepare uniforms. The serialize step in captureLiveSnapshot already
    // converted Three.js types to plain shapes; here we update uResolution
    // to match the bench's viewport, and force per-frame uniforms (uTime,
    // uFrameCount, uJitter) to deterministic values for reproducibility.
    const uniforms: Record<string, any> = { ...snap.uniforms };
    uniforms.uResolution = [WIDTH, HEIGHT];
    uniforms.uFullOutputResolution = [WIDTH, HEIGHT];
    uniforms.uTime = 0.0;
    uniforms.uFrameCount = { int: 0 };
    uniforms.uJitter = [0, 0];
    uniforms.uBlendFactor = 1.0;  // 100% fresh pixel — ignore (dummy) history

    // Lights come straight from the snapshot (the formula's defaultPreset).
    // Stochastic shadow noise is converged by the accumulation pass that
    // runs AFTER the timing draws — see shader-bench.html → run() →
    // accumDraws phase. Single-frame timing measures real shader cost; the
    // saved image is the multi-frame average so it matches what the engine
    // produces with TAA.

    // --no-shadows: diagnostic to verify whether shadow march is the cause
    // of the over-darkened result. Disables shadows entirely so each light's
    // contribution is just NdotL × intensity × attenuation.
    if (HAS('--no-shadows')) {
        uniforms.uShadows = 0.0;
    }
    // --no-env: zero env contribution to isolate direct light paths.
    if (HAS('--no-env')) {
        uniforms.uEnvStrengthSlider = 0.0;
        uniforms.uEnvStrength = 0.0;
    }

    // The snapshotted camera basis was scaled by the engine's internal
    // render aspect ratio (e.g. 888×664 = 1.337). Rescaling uCamBasisX so
    // its magnitude is `basisY_magnitude * benchAspect` keeps the vertical
    // FOV identical and pins the horizontal FOV to the bench viewport,
    // preventing the bulb from looking stretched square-to-wide.
    const bX = snap.uniforms.uCamBasisX as number[] | undefined;
    const bY = snap.uniforms.uCamBasisY as number[] | undefined;
    if (Array.isArray(bX) && Array.isArray(bY) && bX.length === 3 && bY.length === 3) {
        const yMag = Math.hypot(bY[0], bY[1], bY[2]);
        const xMag = Math.hypot(bX[0], bX[1], bX[2]);
        const benchAspect = WIDTH / HEIGHT;
        const targetXMag = yMag * benchAspect;
        if (xMag > 1e-9) {
            const scale = targetXMag / xMag;
            uniforms.uCamBasisX = [bX[0] * scale, bX[1] * scale, bX[2] * scale];
        }
    }

    // Strip __sampler markers — the harness binds dummies via getActiveUniform
    // walk for any sampler the program declares.
    for (const [k, v] of Object.entries(uniforms)) {
        if (v && typeof v === 'object' && (v as any).__sampler) delete uniforms[k];
    }

    console.log(`[bench-shader] launching chromium → ${BENCH_URL}`);
    console.log(`[bench-shader] viewport=${WIDTH}x${HEIGHT}  warmup=${WARMUP_DRAWS}  draws=${MEASURE_DRAWS}\n`);

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
        viewport: { width: WIDTH, height: HEIGHT },
        deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    // Fail fast on page errors during bench execution. A GLSL compile error
    // or harness JS error here means the timing data would be garbage, or
    // we'd hang waiting on a never-arriving promise.
    const pageErrors: string[] = [];
    let benchAbort: ((err: Error) => void) | null = null;
    page.on('pageerror', (e) => {
        pageErrors.push(e.message);
        console.error(`[bench-shader] PAGE ERROR (bench): ${e.message}`);
        if (benchAbort) benchAbort(new Error(`page error during bench: ${e.message}`));
    });
    page.on('console',   (m) => {
        const t = m.text();
        if (t.includes('[shader-bench]')) console.log(`  ${t}`);
        // shader-bench.html logs compile failures via console.error as well.
        if (m.type() === 'error' && /compile failed|link failed|ReferenceError|TypeError/i.test(t)) {
            console.error(`[bench-shader] CONSOLE ERROR (bench): ${t}`);
            if (benchAbort) benchAbort(new Error(`console error during bench: ${t}`));
        }
    });
    const benchAbortable = <T,>(p: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
        const prev = benchAbort;
        benchAbort = (e) => { benchAbort = prev; reject(e); };
        p.then(v => { benchAbort = prev; resolve(v); },
               e => { benchAbort = prev; reject(e); });
    });

    await benchAbortable(page.goto(BENCH_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }));
    await benchAbortable(page.waitForFunction(`window.__shaderBench && window.__shaderBench.ready`, { timeout: 10_000 }));

    const result = await benchAbortable(page.evaluate(async (cfg) => {
        return await (window as any).__shaderBench.run(cfg);
    }, {
        fragSrc,
        width: WIDTH,
        height: HEIGHT,
        uniforms,
        warmupDraws: WARMUP_DRAWS,
        measureDraws: MEASURE_DRAWS,
    }));

    // Compute reference-image diff before the browser closes — we reuse the
    // bench page's Image / Canvas APIs to decode PNGs (no Node-side decoder).
    //
    // Suppress the diff when the run uses scene overrides — those render
    // different scenes intentionally, so comparing to the default-scene
    // reference produces meaningless "FAIL" verdicts. Users still get the
    // bench image saved for visual inspection; they just don't get a diff
    // metric until a per-scene reference is established.
    const isSceneVariant = !!(REFLECTION_MODE || MATERIAL_PRESET);
    let diff: { mae: number; rmse: number; maxErr: number; diffDataUrl: string } | null = null;
    if (isSceneVariant) {
        console.log(`[bench-shader] skipping diff: scene overrides active (refl=${REFLECTION_MODE || 'default'}, mat=${MATERIAL_PRESET || 'default'}) — reference is calibrated for the default scene only`);
    } else if (existsSync(REF_IMAGE_PATH) && typeof result.captured === 'string') {
        try {
            diff = await computeDiff(page, REF_IMAGE_PATH, {
                width: WIDTH, height: HEIGHT, capturedDataUrl: result.captured,
            });
        } catch (e: any) {
            console.log(`[bench-shader] diff failed: ${e?.message ?? e}`);
        }
    } else if (!existsSync(REF_IMAGE_PATH)) {
        console.log(`[bench-shader] no reference image at ${REF_IMAGE_PATH} — skipping diff. ` +
            `Drop a reference PNG there to enable quality regression detection.`);
    }

    await browser.close();

    // ─── Reduce ─────────────────────────────────────────────────────────
    const t = result.timingsUs as number[];
    const stats = {
        samples:    t.length,
        meanUs:     mean(t),
        stddevUs:   stddev(t),
        p5Us:       percentile(t, 5),
        p50Us:      percentile(t, 50),
        p95Us:      percentile(t, 95),
        minUs:      t.length ? Math.min(...t) : 0,
        maxUs:      t.length ? Math.max(...t) : 0,
    };
    const pixels = WIDTH * HEIGHT;
    const perPixelNs = stats.p50Us * 1000 / pixels;

    // Build the metadata block we'll embed in both bench + diff PNGs. tEXt
    // chunks survive PNG re-encoders that don't strip metadata; ExifTool reads
    // them out as `exiftool image.png`. Order matters for human-readability:
    // headline numbers first, then provenance.
    const stampNice = new Date().toISOString();
    const fpsTheoretical = (1e6 / stats.p50Us).toFixed(1);
    const pngMeta: Record<string, string> = {
        // Description / Software / Comment are conventional PNG keywords —
        // appear in standard image-property dialogs across OSes.
        'Software':    `gmt bench-shader (commit ${fragHash})`,
        // Note: tEXt is Latin-1; using ASCII 'us' instead of µ to avoid
        // mojibake when read by tools that don't preserve high bytes.
        'Description': `${snap.formula} bench @ ${WIDTH}x${HEIGHT} - p50 ${stats.p50Us.toFixed(0)}us (${fpsTheoretical} fps), MAE ${diff ? diff.mae.toFixed(2) : 'n/a'}/255 vs reference`,
        'Comment':     [
            `Mandelbulb default preset, 3 point lights, accumulated 256 frames (Halton 2,3 jitter).`,
            `Optimizations applied:`,
            `(1) 3-tap forward-difference normal — audit T1#2, neutral on shadow-dominated scene;`,
            `(2) shadow saturation early-out in GetSoftShadow — exit when res < 0.005 since output is clamp(res,0,1) after a min() accumulator (-13% measured);`,
            `(3) cached trig terms in formula_Mandelbulb — audit T1#3, eliminates one redundant sin(theta);`,
            `(4) reflection refinement uses DE_Dist instead of full DE — saves the orbit-trap recompute when the trap data isn't needed for color sampling (-11% GPU and -10% compile on raymarch mode);`,
            `(5) MAX_REFL_STEPS lowered 256→128 to match user slider max — neutral but cleaner.`,
            `Tonemap: ACES (Narkowicz) + sRGB 2.2 in JS post-pass.`,
            `Lights: snapshot's defaultPreset point lights via worker GET_UNIFORMS_SNAPSHOT.`,
        ].join(' '),
        // Structured metrics — easier to grep with `exiftool -GMT*` etc.
        'GMT.timestamp':        stampNice,
        'GMT.adapter':          `${result.adapter.vendor} | ${result.adapter.renderer}`,
        'GMT.formula':          snap.formula,
        'GMT.viewport':         `${WIDTH}x${HEIGHT}`,
        'GMT.frag.hash':        fragHash,
        'GMT.frag.bytes':       String(fragSrc.length),
        'GMT.frag.lines':       String(lineCount),
        'GMT.timing.p50us':     stats.p50Us.toFixed(2),
        'GMT.timing.p5us':      stats.p5Us.toFixed(2),
        'GMT.timing.p95us':     stats.p95Us.toFixed(2),
        'GMT.timing.meanus':    stats.meanUs.toFixed(2),
        'GMT.timing.stddevus':  stats.stddevUs.toFixed(2),
        'GMT.timing.fps_max':   fpsTheoretical,
        'GMT.timing.perpixel_ns': perPixelNs.toFixed(3),
        'GMT.config.draws':     String(MEASURE_DRAWS),
        'GMT.config.warmup':    String(WARMUP_DRAWS),
        'GMT.uniforms.applied': String((result.appliedUniforms ?? []).length),
        'GMT.uniforms.stripped':String((result.missingUniforms ?? []).length),
        'GMT.compile.totalms':  result.compileTiming ? result.compileTiming.totalMs.toFixed(1) : 'n/a',
        'GMT.compile.shaderms': result.compileTiming ? result.compileTiming.compileMs.toFixed(1) : 'n/a',
        'GMT.compile.linkms':   result.compileTiming ? result.compileTiming.linkMs.toFixed(1) : 'n/a',
        'GMT.scene.refl_mode':  REFLECTION_MODE || '(default)',
        'GMT.scene.material':   MATERIAL_PRESET || '(default)',
        'GMT.scene.tag':        SCENE_TAG || '(none)',
        'GMT.diff.mae':         diff ? diff.mae.toFixed(3) : 'n/a',
        'GMT.diff.rmse':        diff ? diff.rmse.toFixed(3) : 'n/a',
        'GMT.diff.max':         diff ? String(diff.maxErr) : 'n/a',
    };

    // Save reference image with embedded metadata. Tag suffix lets matrix
    // runs save side-by-side images without overwriting each other.
    mkdirSync(REFS_DIR, { recursive: true });
    const tagSuffix = SCENE_TAG ? `-${SCENE_TAG}` : '';
    const refLabel = (fragOverride ? `custom-${fragHash}` : snap.formula) + tagSuffix;
    const refPath = join(REFS_DIR, `${refLabel}-${WIDTH}x${HEIGHT}.png`);
    if (typeof result.captured === 'string' && result.captured.startsWith('data:image/png;base64,')) {
        const b64 = result.captured.slice('data:image/png;base64,'.length);
        const png = Buffer.from(b64, 'base64');
        writeFileSync(refPath, injectPngMetadata(png, pngMeta));
    }

    // Save diff visualization with same metadata + role tag.
    let diffImagePath: string | null = null;
    let compositeImagePath: string | null = null;
    if (diff && diff.diffDataUrl.startsWith('data:image/png;base64,')) {
        diffImagePath = join(REFS_DIR, `${refLabel}-${WIDTH}x${HEIGHT}-diff.png`);
        const b64 = diff.diffDataUrl.slice('data:image/png;base64,'.length);
        const png = Buffer.from(b64, 'base64');
        writeFileSync(diffImagePath, injectPngMetadata(png, {
            ...pngMeta,
            'Description': `${pngMeta.Description} — DIFF (red=bench darker, green=bench brighter)`,
            'GMT.image.role': 'diff-vs-' + REF_IMAGE_PATH.split(/[\\/]/).pop(),
        }));
    }
    // Save side-by-side composite (reference | bench | diff) — one inspection
    // image. Useful for quickly verifying that an optimization didn't change
    // the output, especially for invasive refactors where small visual shifts
    // could be missed by the MAE alone.
    if (diff && (diff as any).compositeDataUrl?.startsWith('data:image/png;base64,')) {
        compositeImagePath = join(REFS_DIR, `${refLabel}-${WIDTH}x${HEIGHT}-compare.png`);
        const b64 = (diff as any).compositeDataUrl.slice('data:image/png;base64,'.length);
        const png = Buffer.from(b64, 'base64');
        writeFileSync(compositeImagePath, injectPngMetadata(png, {
            ...pngMeta,
            'Description': `${pngMeta.Description} — REFERENCE | BENCH | DIFF (3 panes)`,
            'GMT.image.role': 'compare-vs-' + REF_IMAGE_PATH.split(/[\\/]/).pop(),
        }));
    }

    // Output JSON
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = {
        timestamp:        stamp,
        appUrl:           APP_URL,
        benchUrl:         BENCH_URL,
        viewport:         { width: WIDTH, height: HEIGHT },
        adapter:          result.adapter,
        fragSource,
        fragHash,
        fragBytes:        fragSrc.length,
        fragLines:        lineCount,
        snapshotFormula:  snap.formula,
        snapshotCaptured: snap.captured,
        config:           { warmupDraws: WARMUP_DRAWS, measureDraws: MEASURE_DRAWS },
        stats,
        perPixelNs,
        disjointBatches:  result.disjointBatches,
        appliedUniforms:  (result.appliedUniforms ?? []).length,
        strippedUniforms: result.missingUniforms ?? [],
        timingsUs:        t,
        compileTiming:    result.compileTiming ?? null,
        scene:            { reflectionMode: REFLECTION_MODE || null, material: MATERIAL_PRESET || null, tag: SCENE_TAG || null, reflectionBounces: REFLECTION_BOUNCES },
        pageErrors,
        refImage:         refPath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''),
        diff: diff ? { mae: diff.mae, rmse: diff.rmse, maxErr: diff.maxErr } : null,
        diffImage:        diffImagePath?.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '') ?? null,
    };

    mkdirSync(OUT_DIR, { recursive: true });
    const latest  = join(OUT_DIR, 'bench-shader-latest.json');
    const archive = join(OUT_DIR, `bench-shader-${stamp}.json`);
    writeFileSync(latest,  JSON.stringify(out, null, 2));
    writeFileSync(archive, JSON.stringify(out, null, 2));

    // ─── Console summary ────────────────────────────────────────────────
    console.log('\n══ SHADER BENCH SUMMARY ══');
    console.log(`adapter:        ${result.adapter.vendor} | ${result.adapter.renderer}`);
    console.log(`shader:         ${fragSource}  (${fragSrc.length} bytes, ${lineCount} lines)`);
    console.log(`viewport:       ${WIDTH}×${HEIGHT}  (${pixels.toLocaleString()} pixels)`);
    console.log(`samples:        ${stats.samples}  (${result.disjointBatches} disjoint, discarded)`);
    console.log('');
    console.log(`GPU time / draw:`);
    console.log(`  median (p50): ${stats.p50Us.toFixed(1).padStart(8)} µs    (${(1e6 / stats.p50Us).toFixed(1)} fps theoretical max)`);
    console.log(`  p5 / p95:     ${stats.p5Us.toFixed(1).padStart(8)} µs / ${stats.p95Us.toFixed(1)} µs`);
    console.log(`  mean ± σ:     ${stats.meanUs.toFixed(1).padStart(8)} µs ± ${stats.stddevUs.toFixed(2)} µs`);
    console.log(`  min / max:    ${stats.minUs.toFixed(1).padStart(8)} µs / ${stats.maxUs.toFixed(1)} µs`);
    console.log('');
    console.log(`per-pixel cost: ${perPixelNs.toFixed(2)} ns`);
    console.log(`uniforms:       ${out.appliedUniforms} applied, ${out.strippedUniforms.length} stripped (likely dead in this shader)`);
    if (result.compileTiming) {
        console.log(`compile:        ${result.compileTiming.totalMs.toFixed(0)}ms total  (${result.compileTiming.compileMs.toFixed(0)}ms compile + ${result.compileTiming.linkMs.toFixed(0)}ms link/sync)`);
    }
    if (REFLECTION_MODE || MATERIAL_PRESET) {
        console.log(`scene overrides: reflection=${REFLECTION_MODE || 'default'}  material=${MATERIAL_PRESET || 'default'}`);
    }
    console.log('');
    if (diff) {
        // Quality thresholds. Calibrated against accumulation noise floor
        // observed at MAE 0.00 / max 5 baseline. A change is:
        //   PASS  — MAE ≤ 0.5  AND max ≤ 8   (within accumulation noise)
        //   WARN  — MAE ≤ 2.0  AND max ≤ 32  (small drift; eyeball compare image)
        //   FAIL  — anything more (likely a real visual regression)
        const isPass = diff.mae <= 0.5 && diff.maxErr <= 8;
        const isWarn = !isPass && diff.mae <= 2.0 && diff.maxErr <= 32;
        const verdict = isPass ? '\x1b[32mPASS\x1b[0m' : isWarn ? '\x1b[33mWARN\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
        const reg: number[] = (diff as any).regionMae ?? [];
        console.log(`reference diff vs ${REF_IMAGE_PATH.split(/[\\/]/).pop()}: ${verdict}`);
        console.log(`  mean abs err: ${diff.mae.toFixed(2)} / 255    (${(diff.mae / 2.55).toFixed(2)}%)`);
        console.log(`  rmse:         ${diff.rmse.toFixed(2)} / 255`);
        console.log(`  max:          ${diff.maxErr} / 255`);
        if (reg.length === 4) {
            console.log(`  region MAE:   TL=${reg[0].toFixed(2)} TR=${reg[1].toFixed(2)} BL=${reg[2].toFixed(2)} BR=${reg[3].toFixed(2)}`);
        }
        if (diffImagePath)      console.log(`  diff image:   ${diffImagePath}`);
        if (compositeImagePath) console.log(`  3-up compare: ${compositeImagePath}`);
        console.log('');
    }
    console.log(`bench image:    ${refPath}`);
    console.log(`wrote:          ${latest}`);
    console.log(`wrote:          ${archive}`);

    if (pageErrors.length > 0) {
        console.log('\n[bench-shader] page errors during run:');
        pageErrors.forEach((e) => console.log('  ', e));
    }

    if (result.disjointBatches > MEASURE_DRAWS * 0.1) {
        console.log(`\n[bench-shader] WARNING: ${result.disjointBatches}/${MEASURE_DRAWS} draws had GPU disjoint flag set. ` +
            'GPU was preempted (browser background, OS compositor, or another GPU process) — ' +
            'numbers may not be reliable. Re-run with the bench window foregrounded.');
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
    const releaseLock = await acquireBenchLock('bench-shader', {
        wait:  !HAS('--no-wait'),
        force: HAS('--force'),
    });

    try {
        let snap: Snapshot;
        if (USE_SNAPSHOT) {
            console.log(`[bench-shader] loading cached snapshot: ${USE_SNAPSHOT}`);
            snap = JSON.parse(readFileSync(resolve(USE_SNAPSHOT), 'utf8')) as Snapshot;
        } else {
            snap = await captureLiveSnapshot();
            if (SNAPSHOT_ONLY) {
                console.log('[bench-shader] --snapshot-only: capture done, exiting.');
                return;
            }
        }
        await runBench(snap, FRAG_OVERRIDE ? readFileSync(resolve(FRAG_OVERRIDE), 'utf8') : null);
    } finally {
        releaseLock();
    }
}

main().catch((e) => {
    console.error('[bench-shader] FAILED:', e);
    process.exit(1);
});
