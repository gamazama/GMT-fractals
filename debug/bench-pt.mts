/**
 * bench-pt.mts — path-tracing perf + quality validation harness.
 *
 * Drives the REAL bucket-export path (BucketRunner → GmtBucketHost →
 * exportMaterial readback) via window.runBucketRenderTest in
 * debug/render-harness.ts, so every measured pixel is exactly what a user's
 * exported PNG would contain.
 *
 * Suites:
 *   convergence  spp sweep vs a high-spp reference of the same scene+seed.
 *                Metrics are REFERENCE-RELATIVE (MSE/PSNR), not raw variance.
 *                Because the N-spp render's samples are the first N samples
 *                of the reference's M (deterministic Halton/blue-noise,
 *                FrameCount = accumulationCount during bucket renders), raw
 *                MSE understates noise by (1 - N/M); both raw and
 *                nested-corrected values are reported.
 *   seam         the same scene rendered 1×1-single-bucket (true reference),
 *                with internal GPU buckets, and as 2×2/3×3 image tiles — at
 *                MATCHED exact per-pixel spp — plus per-cause toggles
 *                (bloom, CA, natural-convergence). Seam metrics: boundary-band
 *                delta vs reference AND self-discontinuity step ratio.
 *   timing       render time × resolution (single-tile + tiled).
 *                ⚠ HEADLESS TIMING IS INDICATIVE ONLY (SwiftShader). Relative
 *                noise/seam metrics transfer to real GPUs; absolute ms do not.
 *
 * Usage:
 *   npm run bench:pt:with-server                  # one-command headless run (all suites)
 *   npm run bench:pt -- --suite=seam --quick      # needs vite on :5173 (or ENGINE_URL)
 *   npm run bench:pt:with-server -- --gpu         # REAL GPU (headed): absolute timing
 *                                                 # + visual sign-off. Run this on your
 *                                                 # own machine for the final verdict.
 * Flags:
 *   --suite=convergence,seam,seamconv,timing|all   (default all)
 *   --scenes=Claude[,Mandelbulb,...]   (default: Claude — see DEFAULT_SCENES note)
 *   --quick      calibration tier (~10 min headless, same structure)
 *   --full       GPU-rigor tier (384² ref-512spp convergence, 768² 64spp seams,
 *                timing to 4096²) — pair with --gpu; hours on SwiftShader
 *   --gpu        headed Chromium on the real GPU (no SwiftShader)
 *   --out=debug/pt-bench   output directory
 *   --port=5173  dev-server port (ENGINE_URL env wins)
 *
 * Outputs (under --out):
 *   results.csv   one row per render, all metrics
 *   results.json  full structured results (re-analysis)
 *   index.html    visual matrix: stitched PNG + ×8 diff heatmap + metrics
 *   *.png         stitched outputs + heatmaps
 *
 * Reproducibility notes:
 *   - Per-bucket sampling is deterministic: FrameCount = accumulationCount,
 *     Halton jitter + blue-noise LUT indexed by it. Same scene+config ⇒
 *     bit-identical output (verified per run; see `determinism` in results).
 *   - The browser is RESTARTED every ~10 renders: SwiftShader precision
 *     degrades after ~16 launches/long sessions (seen in prior sessions).
 */

import * as fs from 'fs';
import * as path from 'path';
import { deflateSync } from 'zlib';
import { chromium, type Browser, type Page } from 'playwright';
import { orbitCamera } from './opus-cam';

// ─── CLI ─────────────────────────────────────────────────────────────────────

function arg(flag: string, def?: string): string | undefined {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit ? hit.slice(flag.length + 1) : def;
}
const has = (f: string) => process.argv.includes(f);

const PORT = arg('--port', '5173')!;
const BASE_URL = process.env.ENGINE_URL ?? `http://localhost:${PORT}`;
const URL = `${BASE_URL}/render-harness.html`;
const OUT_DIR = path.resolve(arg('--out', 'debug/pt-bench')!);
const QUICK = has('--quick');
const FULL = has('--full');
const GPU = has('--gpu');
// Resume an interrupted/partial run: load existing results.json rows (filtered
// to the scenes + suites NOT being re-run) so an incremental suite adds to
// them instead of clobbering. Lets you measure conv+seam once, then append
// seamconv/timing without re-rendering the expensive (bit-reproducible) sweep.
const APPEND = has('--append');
const BACKEND = GPU ? 'gpu' : 'swiftshader';
const SUITES = (arg('--suite', 'all')!).split(',').map(s => s.trim());
const wantSuite = (s: string) => SUITES.includes('all') || SUITES.includes(s);

// ─── Fixed test scenes ───────────────────────────────────────────────────────
// PT (GI) forced on; bloom/CA controlled PER CASE — presets that ship bloom
// (KleinianMobius: 0.26) would otherwise contaminate the pure-noise
// measurements. Cameras are explicit ORBIT framings (origin-look-at via
// opus-cam) — formula defaultPreset cameras do NOT transfer to the harness
// (they render background-only fog; see project_opus_render_look_loop).
const PT_ON = { renderMode: 1.0, ptEnabled: true };
const SCENES: Record<string, { formula: string; over: Record<string, any>; cam: [number, number, number]; note: string }> = {
    Claude: {
        formula: 'Claude',
        over: { lighting: { ...PT_ON } },
        cam: [5, 30, 20],
        note: 'canonical PT noise case (GI + soft shadows)',
    },
    KleinianMobius: {
        formula: 'KleinianMobius',
        over: { lighting: { ...PT_ON } },
        cam: [6, 25, 15],
        note: 'PT + DoF 0.0145 preset; fine spiral detail; bloom-preset formula',
    },
    Mandelbulb: {
        formula: 'Mandelbulb',
        over: { lighting: { ...PT_ON } },
        cam: [3.5, 30, 25],
        note: 'PT on classic geometry — dark-background control (bloom-seam worst case)',
    },
};
// Default to ONE canonical scene. The render path under test (PT accumulation,
// bucket loop, post-process, stitch) is formula-INDEPENDENT — the DE math a
// formula swaps in never touches it — so a multi-formula sweep measures the
// same thing N times. The axis that DOES matter is scene CONTENT (dark vs
// frame-filling), which changes the per-tile bloom-seam severity; pass
// `--scenes=Claude,Mandelbulb` to cover the bright/dark contrast when needed.
const DEFAULT_SCENES = ['Claude'];
const SCENE_IDS = (arg('--scenes') ? arg('--scenes')!.split(',') : DEFAULT_SCENES)
    .filter(s => SCENES[s]);

// ─── Suite parameters ────────────────────────────────────────────────────────
// Three tiers (calibrated against SwiftShader ≈ 1.5 s/sample at 256² for the
// Claude PT scene — a full-rigor suite is hours headless, minutes on a GPU):
//   quick   smoke/calibration (~10 min headless)
//   std     DEFAULT — headless budget (~40 min, canonical scene, all suites)
//   full    GPU rigor — use with --gpu on a real machine
const TIER: 'quick' | 'std' | 'full' = FULL ? 'full' : QUICK ? 'quick' : 'std';
const pick = <T,>(q: T, s: T, f: T): T => TIER === 'quick' ? q : TIER === 'std' ? s : f;

const CONV_SIZE = pick(256, 256, 384);
const CONV_SPP = pick([4, 16, 64], [4, 8, 16, 32, 64, 128], [4, 8, 16, 32, 64, 128, 256]);
const CONV_REF_SPP = pick(128, 256, 512);
const CONV_REPEAT_SPP = pick(16, 32, 32);      // rendered twice → determinism check

const SEAM_SIZE = pick(384, 384, 768);         // divisible by 2 and 3
const SEAM_SPP = pick(8, 24, 64);
const SEAM_NATURAL_CAP = SEAM_SPP * 4;
// Seam-vs-samples curve (canonical scene only). The high points are what
// "export spp" looks like — the verdict hinges on the seam there.
const SEAMCONV_SPP = pick([8, 32], [8, 32, 128], [8, 32, 128, 512]);

const TIMING_SIZES = pick([256, 512], [256, 512, 1024], [512, 1024, 2048, 4096]);
const TIMING_SPP = pick(8, 8, 16);

const RESTART_EVERY = 10;                      // renders per browser launch (SwiftShader degradation)
const RENDER_TIMEOUT_MS = 20 * 60 * 1000;

// ─── Browser session ─────────────────────────────────────────────────────────

let browser: Browser | null = null;
let page: Page | null = null;
let rendersThisLaunch = 0;
let pageErrors: string[] = [];

async function launchBrowser(): Promise<void> {
    await closeBrowser();
    browser = await chromium.launch(GPU
        ? { headless: false }
        : {
            args: [
                '--use-gl=angle',
                '--use-angle=swiftshader',
                '--enable-unsafe-swiftshader',
                '--ignore-gpu-blocklist',
                '--enable-webgl',
            ],
        });
    const ctx = await browser.newContext({ viewport: { width: 700, height: 700 } });
    page = await ctx.newPage();
    pageErrors = [];
    page.on('pageerror', e => pageErrors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (window as any).harnessReady === true, null, { timeout: 60000 });
    rendersThisLaunch = 0;
}

async function closeBrowser(): Promise<void> {
    if (browser) { await browser.close().catch(() => {}); browser = null; page = null; }
}

interface BucketResult {
    id: string; ok: boolean; error?: string;
    compileMs: number; renderMs: number; frames: number;
    width: number; height: number; tileCount: number;
    buckets: { tileIndex: number; bucketIndex: number; frames: number; samples: number }[];
    stitchedPNG?: string; rgbaBase64?: string; timeMs: number;
}

/** True for Playwright errors that mean the page/context died mid-evaluate
 *  (SwiftShader WebGL context loss under a very heavy single render, or an
 *  OOM in the headless process). A fresh browser + retry recovers. */
function isContextLoss(e: any): boolean {
    const m = String(e?.message ?? e);
    return /Execution context was destroyed|Target (page|, context or browser)? ?closed|crash|detached Frame|Session closed/i.test(m);
}

/**
 * Run one bucket render. `freshContext` forces a browser relaunch first —
 * used for the convergence REFERENCE (the single heaviest render of a run; a
 * stale SwiftShader context loses precision and can crash mid-render). On a
 * context-loss error we relaunch once and retry, since renders are
 * deterministic so the retry is bit-identical.
 */
async function renderBucket(spec: any, freshContext = false): Promise<BucketResult> {
    if (!page || freshContext || rendersThisLaunch >= RESTART_EVERY) await launchBrowser();
    for (let attempt = 0; attempt < 2; attempt++) {
        rendersThisLaunch++;
        try {
            const r: BucketResult = await page!.evaluate(
                (s) => (window as any).runBucketRenderTest(s), spec);
            if (!r.ok) {
                const errs = pageErrors.length ? `\npage errors:\n  ${pageErrors.join('\n  ')}` : '';
                throw new Error(`render failed [${spec.id}]: ${r.error}${errs}`);
            }
            return r;
        } catch (e) {
            if (isContextLoss(e) && attempt === 0) {
                log(`  ⚠ context lost on ${spec.id}, relaunching + retrying…`);
                await launchBrowser();
                continue;
            }
            throw e;
        }
    }
    throw new Error(`render failed [${spec.id}]: retries exhausted`);
}

// ─── Pixels + metrics ────────────────────────────────────────────────────────

interface Img { data: Buffer; w: number; h: number; }

function imgOf(r: BucketResult): Img {
    if (!r.rgbaBase64) throw new Error(`no pixels returned for ${r.id}`);
    return { data: Buffer.from(r.rgbaBase64, 'base64'), w: r.width, h: r.height };
}

interface MseStats {
    mseR: number; mseG: number; mseB: number; mse: number;
    rmse: number; psnr: number; maxAbs: number; identical: boolean;
}

function mseStats(a: Img, b: Img): MseStats {
    if (a.w !== b.w || a.h !== b.h) throw new Error('size mismatch');
    const n = a.w * a.h;
    let sR = 0, sG = 0, sB = 0, maxAbs = 0;
    for (let i = 0; i < n; i++) {
        const k = i * 4;
        const dR = a.data[k] - b.data[k];
        const dG = a.data[k + 1] - b.data[k + 1];
        const dB = a.data[k + 2] - b.data[k + 2];
        sR += dR * dR; sG += dG * dG; sB += dB * dB;
        const m = Math.max(Math.abs(dR), Math.abs(dG), Math.abs(dB));
        if (m > maxAbs) maxAbs = m;
    }
    const mseR = sR / n, mseG = sG / n, mseB = sB / n;
    const mse = (mseR + mseG + mseB) / 3;
    const rmse = Math.sqrt(mse);
    return {
        mseR, mseG, mseB, mse, rmse,
        psnr: mse === 0 ? Infinity : 20 * Math.log10(255 / rmse),
        maxAbs, identical: maxAbs === 0,
    };
}

function luma(d: Buffer, k: number): number {
    return 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
}

/** Interior seam-line positions (top-down pixel coords). A boundary at
 *  position p means the seam lies between column/row p-1 and p. */
interface Boundaries { cols: number[]; rows: number[]; }

/** Image-tile boundaries for a cols×rows grid over W×H (matches
 *  BucketRunner.start tile math: px = floor(c*W/cols); tile rows are GL
 *  bottom-up so a GL row boundary y maps to top-down position H - y). */
function tileBoundaries(W: number, H: number, cols: number, rows: number): Boundaries {
    const b: Boundaries = { cols: [], rows: [] };
    for (let c = 1; c < cols; c++) b.cols.push(Math.floor((c * W) / cols));
    for (let r = 1; r < rows; r++) b.rows.push(H - Math.floor((r * H) / rows));
    return b;
}

/** GPU-bucket boundaries inside a single 1×1 image tile (bucket grid is
 *  bucketSize-strided from the tile's GL bottom-left). */
function bucketBoundaries(W: number, H: number, bucketSize: number): Boundaries {
    const b: Boundaries = { cols: [], rows: [] };
    for (let x = bucketSize; x < W; x += bucketSize) b.cols.push(x);
    for (let y = bucketSize; y < H; y += bucketSize) b.rows.push(H - y);
    return b;
}

interface BandStats {
    bandMean: number; bandMax: number;
    interiorMean: number; interiorMax: number;
    seamExcess: number;          // bandMean - interiorMean (8-bit luma units)
    seamRatio: number;           // bandMean / interiorMean
}

/** Mean/max |Δluma| vs reference inside a ±band px zone around seam lines,
 *  compared to the same statistic outside the zone. The interior value is the
 *  comparison noise floor; a seam is only real if the band exceeds it. */
function bandStats(a: Img, ref: Img, bounds: Boundaries, band = 2): BandStats {
    const { w, h } = a;
    const inBand = (x: number, y: number) =>
        bounds.cols.some(c => x >= c - band && x < c + band) ||
        bounds.rows.some(r => y >= r - band && y < r + band);
    let bSum = 0, bN = 0, bMax = 0, iSum = 0, iN = 0, iMax = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const k = (y * w + x) * 4;
            const d = Math.abs(luma(a.data, k) - luma(ref.data, k));
            if (inBand(x, y)) { bSum += d; bN++; if (d > bMax) bMax = d; }
            else { iSum += d; iN++; if (d > iMax) iMax = d; }
        }
    }
    const bandMean = bN ? bSum / bN : 0;
    const interiorMean = iN ? iSum / iN : 0;
    return {
        bandMean, bandMax: bMax, interiorMean, interiorMax: iMax,
        seamExcess: bandMean - interiorMean,
        seamRatio: interiorMean > 0 ? bandMean / interiorMean : (bandMean > 0 ? Infinity : 1),
    };
}

interface StepStats { boundaryStep: number; interiorStep: number; stepRatio: number; }

/** Reference-free discontinuity: mean |luma step| ACROSS each seam line vs the
 *  mean step across all non-seam pixel columns/rows. Ratio ≈ 1 ⇒ the seam is
 *  statistically invisible inside the image itself. Robust on real-GPU runs
 *  where no headless reference exists. */
function stepStats(a: Img, bounds: Boundaries, guard = 3): StepStats {
    const { w, h, data } = a;
    let bSum = 0, bN = 0, iSum = 0, iN = 0;
    const nearCol = (x: number) => bounds.cols.some(c => Math.abs(x - c) <= guard);
    const nearRow = (y: number) => bounds.rows.some(r => Math.abs(y - r) <= guard);
    for (let y = 0; y < h; y++) {
        for (let x = 1; x < w; x++) {
            const k = (y * w + x) * 4;
            const step = Math.abs(luma(data, k) - luma(data, k - 4));
            if (bounds.cols.includes(x)) { bSum += step; bN++; }
            else if (!nearCol(x)) { iSum += step; iN++; }
        }
    }
    for (let x = 0; x < w; x++) {
        for (let y = 1; y < h; y++) {
            const k = (y * w + x) * 4;
            const step = Math.abs(luma(data, k) - luma(data, k - w * 4));
            if (bounds.rows.includes(y)) { bSum += step; bN++; }
            else if (!nearRow(y)) { iSum += step; iN++; }
        }
    }
    const boundaryStep = bN ? bSum / bN : 0;
    const interiorStep = iN ? iSum / iN : 0;
    return {
        boundaryStep, interiorStep,
        stepRatio: interiorStep > 0 ? boundaryStep / interiorStep : (boundaryStep > 0 ? Infinity : 1),
    };
}

// ─── PNG encode (no deps) ────────────────────────────────────────────────────

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
}
function encodePNG(rgba: Buffer, w: number, h: number): Buffer {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
    const stride = w * 4;
    const raw = Buffer.alloc((stride + 1) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (stride + 1)] = 0; // filter: none
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', deflateSync(raw)),
        pngChunk('IEND', Buffer.alloc(0)),
    ]);
}

function saveDataUrlPNG(dataUrl: string, file: string): void {
    fs.writeFileSync(file, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
}

/** |a-ref| × gain heatmap (grayscale, alpha 255). */
function diffHeatmapPNG(a: Img, ref: Img, gain = 8): Buffer {
    const out = Buffer.alloc(a.w * a.h * 4);
    for (let i = 0; i < a.w * a.h; i++) {
        const k = i * 4;
        const d = Math.max(
            Math.abs(a.data[k] - ref.data[k]),
            Math.abs(a.data[k + 1] - ref.data[k + 1]),
            Math.abs(a.data[k + 2] - ref.data[k + 2]));
        const v = Math.min(255, d * gain);
        out[k] = v; out[k + 1] = v; out[k + 2] = v; out[k + 3] = 255;
    }
    return encodePNG(out, a.w, a.h);
}

// ─── Result collection ───────────────────────────────────────────────────────

interface Row {
    suite: string; scene: string; case: string; backend: string;
    width: number; height: number; tileCols: number; tileRows: number; bucketSize: number;
    sppMode: 'exact' | 'natural'; sppNominal: number;
    sppEffMin: number; sppEffMax: number; sppEffMean: number;
    renderMs: number; compileMs: number;
    ref: string;
    mse?: number; mseCorr?: number; psnr?: number; psnrCorr?: number; maxAbs?: number;
    bandMean?: number; bandMax?: number; interiorMean?: number; interiorMax?: number;
    seamExcess?: number; seamRatio?: number;
    boundaryStep?: number; interiorStep?: number; stepRatio?: number;
    /** stepRatio of the seam-free REFERENCE at the same line positions —
     *  the no-seam baseline (image content alone inflates stepRatio). */
    stepRatioRef?: number;
    identicalToRef?: boolean;
    png?: string; heatmap?: string;
    notes: string;
}
const rows: Row[] = [];
const extras: Record<string, any> = { backend: BACKEND, tier: '', scenes: SCENE_IDS };

/** Persist after every render — a browser crash 2 h into a SwiftShader run
 *  must not lose the rows already measured. */
function persistArtifacts(): void {
    writeCsv();
    writeHtml();
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ extras, rows }, null, 2));
}

function sppStats(r: BucketResult) {
    const s = r.buckets.map(b => b.samples).filter(v => v >= 0);
    if (!s.length) return { min: 0, max: 0, mean: 0 };
    return {
        min: Math.min(...s),
        max: Math.max(...s),
        mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1),
    };
}

function baseRow(suite: string, scene: string, caseId: string, spec: any, r: BucketResult,
    sppMode: 'exact' | 'natural', sppNominal: number): Row {
    const eff = sppStats(r);
    return {
        suite, scene, case: caseId, backend: BACKEND,
        width: r.width, height: r.height,
        tileCols: spec.tileCols, tileRows: spec.tileRows, bucketSize: spec.bucketSize,
        sppMode, sppNominal,
        sppEffMin: eff.min, sppEffMax: eff.max, sppEffMean: eff.mean,
        renderMs: r.renderMs, compileMs: r.compileMs,
        ref: '', notes: '',
    };
}

// ─── Suites ──────────────────────────────────────────────────────────────────

function sceneSpecBase(sceneId: string, extraOver: Record<string, any> = {}) {
    const sc = SCENES[sceneId];
    const over: Record<string, any> = JSON.parse(JSON.stringify(sc.over));
    for (const [feat, vals] of Object.entries(extraOver)) {
        over[feat] = { ...(over[feat] ?? {}), ...(vals as object) };
    }
    return {
        formula: sc.formula,
        configOverrides: over,
        cameraOverrides: orbitCamera(...sc.cam),
    };
}

const NO_POST = { postEffects: { bloomIntensity: 0, caStrength: 0 } };

async function suiteConvergence(sceneId: string): Promise<void> {
    const suite = 'convergence';
    log(`\n━━ convergence: ${sceneId} (${CONV_SIZE}², ref ${CONV_REF_SPP}spp) ━━`);

    // The nested-sample correction below is valid ONLY when the N-spp render's
    // samples are the first N of the reference's M — which holds iff both are a
    // SINGLE GPU bucket (per-bucket accumulationCount drives the Halton/blue-
    // noise index; multiple buckets restart the sequence). bucketSize ≥
    // CONV_SIZE and a 1×1 tile grid guarantee that. Fail loud if a future edit
    // breaks the invariant rather than silently emitting wrong mseCorr.
    if (CONV_REF_SPP <= Math.max(...CONV_SPP)) {
        throw new Error(`convergence: ref spp (${CONV_REF_SPP}) must exceed every sweep point — correction needs M>N`);
    }

    const mk = (spp: number, tag: string) => ({
        id: `conv-${sceneId}-${tag}`,
        ...sceneSpecBase(sceneId, NO_POST),
        outputWidth: CONV_SIZE, outputHeight: CONV_SIZE,
        tileCols: 1, tileRows: 1, bucketSize: CONV_SIZE,  // single bucket — see correction note
        samplesPerPixel: spp,
        viewport: [512, 512], timeoutMs: RENDER_TIMEOUT_MS,
    });

    const ref = await renderBucket(mk(CONV_REF_SPP, `ref${CONV_REF_SPP}`), true);
    // The reference is the single heaviest render; a SwiftShader context that
    // has just done it is prone to loss on the NEXT evaluate (observed:
    // 256spp/256² returned fine, then the following render crashed). Retire
    // the context now so the sweep starts fresh instead of eating a failed
    // first attempt.
    await closeBrowser();
    const refImg = imgOf(ref);
    saveDataUrlPNG(ref.stitchedPNG!, path.join(OUT_DIR, `conv_${sceneId}_ref${CONV_REF_SPP}.png`));
    const refRow = baseRow(suite, sceneId, `ref-${CONV_REF_SPP}spp`, mk(CONV_REF_SPP, ''), ref, 'exact', CONV_REF_SPP);
    refRow.png = `conv_${sceneId}_ref${CONV_REF_SPP}.png`;
    refRow.notes = 'reference';
    rows.push(refRow);
    persistArtifacts();
    log(`  ref ${CONV_REF_SPP}spp: ${ref.renderMs}ms (compile ${ref.compileMs}ms)`);

    for (const spp of CONV_SPP) {
        const r = await renderBucket(mk(spp, `${spp}spp`));
        const img = imgOf(r);
        const m = mseStats(img, refImg);
        // Nested-sample correction: the N-spp pixels are the first N of the
        // reference's M samples ⇒ E[MSE_raw] = σ²(1/N − 1/M) = MSE_true·(1−N/M).
        // Approximate (tone-map is non-linear), but bounds the bias direction.
        const corr = 1 - spp / CONV_REF_SPP;          // >0, enforced by the guard above
        const mseCorr = m.mse / corr;
        const row = baseRow(suite, sceneId, `${spp}spp`, mk(spp, ''), r, 'exact', spp);
        row.ref = `ref-${CONV_REF_SPP}spp`;
        row.mse = +m.mse.toFixed(4); row.mseCorr = +mseCorr.toFixed(4);
        row.psnr = +m.psnr.toFixed(2);
        // Guard mseCorr==0 (an N-spp render identical to the reference) → PSNR
        // is +Inf by definition; toFixed(Infinity) would serialize as null.
        row.psnrCorr = mseCorr === 0 ? Infinity : +(20 * Math.log10(255 / Math.sqrt(mseCorr))).toFixed(2);
        row.maxAbs = m.maxAbs;
        const png = `conv_${sceneId}_${spp}spp.png`;
        saveDataUrlPNG(r.stitchedPNG!, path.join(OUT_DIR, png));
        row.png = png;
        const hm = `conv_${sceneId}_${spp}spp_diff.png`;
        fs.writeFileSync(path.join(OUT_DIR, hm), diffHeatmapPNG(img, refImg));
        row.heatmap = hm;
        rows.push(row);
        log(`  ${String(spp).padStart(3)}spp: PSNR ${row.psnr}dB (corr ${row.psnrCorr}dB) rmse ${m.rmse.toFixed(2)} max ${m.maxAbs}  [${r.renderMs}ms]`);

        if (spp === CONV_REPEAT_SPP) {
            const r2 = await renderBucket({ ...mk(spp, `${spp}spp-repeat`), returnPNG: false });
            const same = Buffer.compare(imgOf(r2).data, img.data) === 0;
            extras[`determinism_${sceneId}`] = same;
            log(`  determinism @${spp}spp: ${same ? 'BIT-IDENTICAL ✓' : 'DIFFERS ✗'}`);
            const dRow = baseRow(suite, sceneId, `${spp}spp-repeat`, mk(spp, ''), r2, 'exact', spp);
            dRow.ref = `${spp}spp`;
            dRow.identicalToRef = same;
            dRow.notes = 'determinism check (same config re-run)';
            rows.push(dRow);
        }
        persistArtifacts();
    }
}

interface SeamCase {
    id: string;
    tileCols: number; tileRows: number; bucketSize: number;
    natural?: boolean;
    post?: Record<string, any>;
    ref: string;                 // case id of the reference render
    note: string;
}

async function suiteSeam(sceneId: string): Promise<void> {
    const suite = 'seam';
    const S = SEAM_SIZE;
    log(`\n━━ seam: ${sceneId} (${S}², ${SEAM_SPP}spp matched) ━━`);

    const BLOOM = { postEffects: { bloomIntensity: 0.4, caStrength: 0 } };
    const CA = { postEffects: { bloomIntensity: 0, caStrength: 1.5 } };

    const cases: SeamCase[] = [
        { id: 'ref-single', tileCols: 1, tileRows: 1, bucketSize: S, post: NO_POST, ref: '', note: 'no buckets, no tiles, no post — ground truth' },
        { id: 'ref-bloom', tileCols: 1, tileRows: 1, bucketSize: S, post: BLOOM, ref: '', note: 'single-pass reference WITH bloom' },
        { id: 'ref-ca', tileCols: 1, tileRows: 1, bucketSize: S, post: CA, ref: '', note: 'single-pass reference WITH chromatic aberration' },
        { id: 'gpu-buckets', tileCols: 1, tileRows: 1, bucketSize: S / 3, post: NO_POST, ref: 'ref-single', note: '3×3 internal GPU buckets, one PNG — isolates bucket seams' },
        { id: 'tiled-2x2', tileCols: 2, tileRows: 2, bucketSize: S, post: NO_POST, ref: 'ref-single', note: '2×2 image tiles, post off — isolates tiling itself' },
        { id: 'tiled-3x3', tileCols: 3, tileRows: 3, bucketSize: S, post: NO_POST, ref: 'ref-single', note: '3×3 image tiles, post off' },
        { id: 'tiled-bloom', tileCols: 2, tileRows: 2, bucketSize: S, post: BLOOM, ref: 'ref-bloom', note: 'per-tile bloom — the documented main seam' },
        { id: 'tiled-ca', tileCols: 2, tileRows: 2, bucketSize: S, post: CA, ref: 'ref-ca', note: 'per-tile chromatic aberration' },
        { id: 'tiled-natural', tileCols: 2, tileRows: 2, bucketSize: S, post: NO_POST, natural: true, ref: 'ref-single', note: 'natural convergence (today\'s behaviour) — convergence-variance seams' },
        { id: 'gpu-natural', tileCols: 1, tileRows: 1, bucketSize: S / 3, post: NO_POST, natural: true, ref: 'ref-single', note: 'natural convergence across GPU buckets' },
    ];

    const imgs: Record<string, Img> = {};

    for (const c of cases) {
        const spec: any = {
            id: `seam-${sceneId}-${c.id}`,
            ...sceneSpecBase(sceneId, c.post),
            outputWidth: S, outputHeight: S,
            tileCols: c.tileCols, tileRows: c.tileRows, bucketSize: c.bucketSize,
            viewport: [512, 512], timeoutMs: RENDER_TIMEOUT_MS,
        };
        if (c.natural) {
            // "natural" cases now just run every bucket to the cap — bucket render no
            // longer has per-bucket convergence early-out, so there is no convergence
            // variance to measure (that seam source is gone by construction).
            spec.maxSamplesPerBucket = SEAM_NATURAL_CAP;
        } else {
            spec.samplesPerPixel = SEAM_SPP;
        }
        const r = await renderBucket(spec);
        const img = imgOf(r);
        imgs[c.id] = img;

        const row = baseRow(suite, sceneId, c.id, spec, r,
            c.natural ? 'natural' : 'exact', c.natural ? SEAM_NATURAL_CAP : SEAM_SPP);
        row.ref = c.ref;
        row.notes = c.note;

        const png = `seam_${sceneId}_${c.id}.png`;
        saveDataUrlPNG(r.stitchedPNG!, path.join(OUT_DIR, png));
        row.png = png;

        // Seam-line set this case can produce: image-tile boundaries and/or
        // internal GPU-bucket boundaries.
        const bounds: Boundaries = { cols: [], rows: [] };
        if (c.tileCols > 1 || c.tileRows > 1) {
            const tb = tileBoundaries(S, S, c.tileCols, c.tileRows);
            bounds.cols.push(...tb.cols); bounds.rows.push(...tb.rows);
        }
        if (c.bucketSize < S) {
            const bb = bucketBoundaries(S, S, c.bucketSize);
            bounds.cols.push(...bb.cols.filter(x => !bounds.cols.includes(x)));
            bounds.rows.push(...bb.rows.filter(y => !bounds.rows.includes(y)));
        }

        if (c.ref && imgs[c.ref]) {
            const ref = imgs[c.ref];
            const m = mseStats(img, ref);
            row.mse = +m.mse.toFixed(4); row.psnr = +m.psnr.toFixed(2); row.maxAbs = m.maxAbs;
            row.identicalToRef = m.identical;
            if (bounds.cols.length || bounds.rows.length) {
                const b = bandStats(img, ref, bounds);
                row.bandMean = +b.bandMean.toFixed(4); row.bandMax = +b.bandMax.toFixed(2);
                row.interiorMean = +b.interiorMean.toFixed(4); row.interiorMax = +b.interiorMax.toFixed(2);
                row.seamExcess = +b.seamExcess.toFixed(4); row.seamRatio = +b.seamRatio.toFixed(3);
            }
            const hm = `seam_${sceneId}_${c.id}_diff.png`;
            fs.writeFileSync(path.join(OUT_DIR, hm), diffHeatmapPNG(img, ref));
            row.heatmap = hm;
        }
        if (bounds.cols.length || bounds.rows.length) {
            const st = stepStats(img, bounds);
            row.boundaryStep = +st.boundaryStep.toFixed(4);
            row.interiorStep = +st.interiorStep.toFixed(4);
            row.stepRatio = +st.stepRatio.toFixed(3);
            // Baseline: the SAME lines measured on the seam-free reference —
            // image content (edges, gradients) inflates stepRatio even with
            // no seam, so the honest signal is stepRatio relative to this.
            if (c.ref && imgs[c.ref]) {
                const sr = stepStats(imgs[c.ref], bounds);
                row.stepRatioRef = +sr.stepRatio.toFixed(3);
            }
        }
        rows.push(row);
        persistArtifacts();
        const seam = row.seamRatio !== undefined ? ` seamRatio ${row.seamRatio} (excess ${row.seamExcess})` : '';
        const step = row.stepRatio !== undefined ? ` stepRatio ${row.stepRatio}` : '';
        const ident = row.identicalToRef ? ' BIT-IDENTICAL✓' : '';
        log(`  ${c.id.padEnd(14)} psnr ${row.psnr ?? '—'}${seam}${step}${ident}  spp ${row.sppEffMin}-${row.sppEffMax}  [${r.renderMs}ms]`);
    }
}

/**
 * Seam-vs-samples: the decision-critical curve. Renders tiled-2×2 and its
 * matched 1×1 reference at several spp, post off AND with bloom, and reports
 * seamExcess(spp). A noise-phase seam (jitter-decorrelation at tile edges)
 * falls as ~1/√spp → vanishes at export spp; a structural seam (per-tile
 * bloom black-bleed) PLATEAUS. The shape of these two curves is the verdict.
 */
async function suiteSeamConv(sceneId: string): Promise<void> {
    const suite = 'seamconv';
    const S = SEAM_SIZE;
    const bounds = tileBoundaries(S, S, 2, 2);
    log(`\n━━ seamconv: ${sceneId} (${S}², 2×2, spp ${SEAMCONV_SPP.join('/')}) — does the tile seam converge away? ━━`);

    const variants = [
        { tag: 'nopost', post: NO_POST, note: 'tile seam, post off (expect ~1/√spp → 0)' },
        { tag: 'bloom', post: { postEffects: { bloomIntensity: 0.4, caStrength: 0 } }, note: 'tile seam WITH per-tile bloom (expect plateau)' },
    ];

    for (const v of variants) {
        for (const spp of SEAMCONV_SPP) {
            const base = (tiles: number, id: string) => ({
                id: `seamconv-${sceneId}-${v.tag}-${spp}-${id}`,
                ...sceneSpecBase(sceneId, v.post),
                outputWidth: S, outputHeight: S,
                tileCols: tiles, tileRows: tiles, bucketSize: S,
                samplesPerPixel: spp,
                viewport: [512, 512], timeoutMs: RENDER_TIMEOUT_MS,
                returnPNG: false,        // curve only — heatmaps come from the seam suite
            });
            const refR = await renderBucket(base(1, 'ref'));
            const tileR = await renderBucket(base(2, 'tiled'));
            const refImg = imgOf(refR), tileImg = imgOf(tileR);
            const m = mseStats(tileImg, refImg);
            const b = bandStats(tileImg, refImg, bounds);
            const st = stepStats(tileImg, bounds);
            const stRef = stepStats(refImg, bounds);

            const row = baseRow(suite, sceneId, `${v.tag}-${spp}spp`, base(2, ''), tileR, 'exact', spp);
            row.ref = `${v.tag}-${spp}spp-ref`;
            row.psnr = +m.psnr.toFixed(2); row.maxAbs = m.maxAbs;
            row.bandMean = +b.bandMean.toFixed(4); row.interiorMean = +b.interiorMean.toFixed(4);
            row.seamExcess = +b.seamExcess.toFixed(4); row.seamRatio = +b.seamRatio.toFixed(3);
            row.stepRatio = +st.stepRatio.toFixed(3); row.stepRatioRef = +stRef.stepRatio.toFixed(3);
            row.notes = v.note;
            rows.push(row);
            persistArtifacts();
            log(`  ${v.tag.padEnd(7)} ${String(spp).padStart(3)}spp: seamExcess ${row.seamExcess}  stepRatio ${row.stepRatio} (ref ${row.stepRatioRef})  psnr ${row.psnr}  [${refR.renderMs + tileR.renderMs}ms]`);
        }
    }
}

async function suiteTiming(sceneId: string): Promise<void> {
    const suite = 'timing';
    log(`\n━━ timing: ${sceneId} (${TIMING_SPP}spp, sizes ${TIMING_SIZES.join('/')}) — ${BACKEND === 'gpu' ? 'REAL GPU' : '⚠ SWIFTSHADER, INDICATIVE ONLY'} ━━`);
    for (const size of TIMING_SIZES) {
        for (const tiles of [1, 2]) {
            const spec: any = {
                id: `timing-${sceneId}-${size}-${tiles}x${tiles}`,
                ...sceneSpecBase(sceneId, NO_POST),
                outputWidth: size, outputHeight: size,
                tileCols: tiles, tileRows: tiles, bucketSize: 512,
                samplesPerPixel: TIMING_SPP,
                viewport: [512, 512], timeoutMs: RENDER_TIMEOUT_MS,
                returnPixels: false, returnPNG: false,
            };
            const r = await renderBucket(spec);
            const row = baseRow(suite, sceneId, `${size}px-${tiles}x${tiles}`, spec, r, 'exact', TIMING_SPP);
            const mpx = (size * size) / 1e6;
            row.notes = `${(r.renderMs / (mpx * TIMING_SPP)).toFixed(1)} ms/(Mpx·spp); ${BACKEND === 'gpu' ? 'real GPU' : 'HEADLESS-INDICATIVE ONLY'}`;
            rows.push(row);
            persistArtifacts();
            log(`  ${size}px ${tiles}×${tiles}: ${r.renderMs}ms  (${row.notes})`);
        }
    }
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

const CSV_COLS: (keyof Row)[] = [
    'suite', 'scene', 'case', 'backend', 'width', 'height', 'tileCols', 'tileRows', 'bucketSize',
    'sppMode', 'sppNominal', 'sppEffMin', 'sppEffMax', 'sppEffMean',
    'renderMs', 'compileMs', 'ref',
    'mse', 'mseCorr', 'psnr', 'psnrCorr', 'maxAbs',
    'bandMean', 'bandMax', 'interiorMean', 'interiorMax', 'seamExcess', 'seamRatio',
    'boundaryStep', 'interiorStep', 'stepRatio', 'stepRatioRef', 'identicalToRef', 'notes',
];

function writeCsv(): void {
    const esc = (v: any) => v === undefined || v === null ? ''
        : (typeof v === 'string' && (v.includes(',') || v.includes('"')))
            ? `"${v.replace(/"/g, '""')}"` : String(v);
    const lines = [CSV_COLS.join(',')];
    for (const r of rows) lines.push(CSV_COLS.map(c => esc(r[c])).join(','));
    fs.writeFileSync(path.join(OUT_DIR, 'results.csv'), lines.join('\n') + '\n');
}

function writeHtml(): void {
    const bySuite: Record<string, Row[]> = {};
    for (const r of rows) (bySuite[r.suite] ??= []).push(r);
    const cell = (r: Row) => `
      <div class="card">
        <h4>${r.scene} · ${r.case}</h4>
        ${r.png ? `<a href="${r.png}"><img src="${r.png}" loading="lazy"></a>` : '<div class="nopng">timing only</div>'}
        ${r.heatmap ? `<a href="${r.heatmap}"><img src="${r.heatmap}" loading="lazy" title="|diff vs ${r.ref}| × 8"></a>` : ''}
        <table>
          ${r.psnr !== undefined ? `<tr><td>PSNR vs ${r.ref}</td><td>${r.psnr} dB${r.psnrCorr ? ` (corr ${r.psnrCorr})` : ''}</td></tr>` : ''}
          ${r.maxAbs !== undefined ? `<tr><td>max |Δ|</td><td>${r.maxAbs}</td></tr>` : ''}
          ${r.seamRatio !== undefined ? `<tr><td>seam band/interior</td><td>${r.seamRatio} (excess ${r.seamExcess})</td></tr>` : ''}
          ${r.stepRatio !== undefined ? `<tr><td>step ratio (self)</td><td>${r.stepRatio}${r.stepRatioRef !== undefined ? ` vs ref ${r.stepRatioRef}` : ''}</td></tr>` : ''}
          ${r.identicalToRef !== undefined ? `<tr><td>bit-identical</td><td>${r.identicalToRef ? '✓ YES' : 'no'}</td></tr>` : ''}
          <tr><td>spp</td><td>${r.sppMode} ${r.sppNominal} (eff ${r.sppEffMin}–${r.sppEffMax})</td></tr>
          <tr><td>render</td><td>${r.renderMs} ms${r.backend === 'swiftshader' ? ' ⚠ headless' : ''}</td></tr>
          <tr><td>grid</td><td>${r.tileCols}×${r.tileRows} tiles · bucket ${r.bucketSize}px</td></tr>
        </table>
        <p class="note">${r.notes}</p>
      </div>`;
    const html = `<!doctype html><meta charset="utf-8"><title>PT bench — ${new Date().toISOString().slice(0, 10)} (${BACKEND})</title>
<style>
 body{background:#14161a;color:#cfd3da;font:13px system-ui;margin:20px}
 h2{border-bottom:1px solid #333;padding-bottom:4px}
 .grid{display:flex;flex-wrap:wrap;gap:14px}
 .card{background:#1c1f25;border:1px solid #2a2e36;border-radius:6px;padding:10px;width:300px}
 .card img{width:140px;image-rendering:pixelated;margin-right:4px;border:1px solid #333}
 .card h4{margin:0 0 6px}
 table{font-size:12px;border-collapse:collapse;margin-top:4px}
 td{padding:1px 8px 1px 0;vertical-align:top}
 td:first-child{color:#8b93a1}
 .note{color:#8b93a1;font-size:11px;margin:6px 0 0}
 .banner{background:#3a2d12;border:1px solid #6b541f;padding:8px 12px;border-radius:6px;margin-bottom:16px}
 .nopng{width:140px;height:60px;display:inline-block;color:#555}
</style>
<h1>PT validation bench — ${BACKEND}${QUICK ? ' (quick)' : ''}</h1>
<div class="banner">${BACKEND === 'swiftshader'
        ? '⚠ Headless SwiftShader run: noise/seam metrics are GPU-robust (relative); absolute render times are INDICATIVE ONLY. Re-run with <code>--gpu</code> for real timing + visual sign-off.'
        : 'Real-GPU run: timings are real; compare seam/step ratios against the headless run.'}</div>
${Object.entries(bySuite).map(([s, rs]) =>
        `<h2>${s}</h2><div class="grid">${rs.map(cell).join('')}</div>`).join('')}
`;
    fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(msg); }

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const t0 = Date.now();
    extras.tier = TIER;
    log(`PT bench → ${OUT_DIR}  [backend=${BACKEND}, tier=${TIER}] scenes=${SCENE_IDS.join(',')}`);
    log(`harness: ${URL}`);

    // --append: keep prior rows for suites we are NOT re-running this pass, so an
    // incremental run (e.g. only seamconv+timing) merges with an earlier
    // conv+seam pass instead of overwriting it.
    if (APPEND) {
        const prev = path.join(OUT_DIR, 'results.json');
        if (fs.existsSync(prev)) {
            const kept = (JSON.parse(fs.readFileSync(prev, 'utf8')).rows as Row[])
                .filter(r => !wantSuite(r.suite));
            rows.push(...kept);
            log(`append: kept ${kept.length} prior rows from suites [${[...new Set(kept.map(r => r.suite))].join(',') || 'none'}]`);
        }
    }

    try {
        for (const sceneId of SCENE_IDS) {
            if (wantSuite('convergence')) await suiteConvergence(sceneId);
            if (wantSuite('seam')) await suiteSeam(sceneId);
        }
        // Seam-vs-spp + timing run on the canonical scene only (SCENE_IDS[0]).
        if (wantSuite('seamconv')) await suiteSeamConv(SCENE_IDS[0]);
        if (wantSuite('timing')) await suiteTiming(SCENE_IDS[0]);
    } finally {
        await closeBrowser();
    }

    extras.totalMinutes = +((Date.now() - t0) / 60000).toFixed(1);
    persistArtifacts();
    log(`\nDone in ${extras.totalMinutes} min. Artifacts: ${path.join(OUT_DIR, 'results.csv')}, index.html, results.json`);
}

main().catch(async e => {
    console.error(e);
    await closeBrowser();
    process.exit(1);
});
