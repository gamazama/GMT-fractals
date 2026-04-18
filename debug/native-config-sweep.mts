/**
 * Native Formula × Engine Config Sweep
 *
 * For each eligible native formula, compile its shader through the real engine
 * ShaderFactory under a given feature-config mode, and gate on webglCompile.
 * Catches regressions from engine-feature changes (hybrid-box rewrite, global
 * uniform renames, new preamble injections) that would otherwise need a
 * per-formula click-through to find.
 *
 * Modes:
 *   baseline   — all features at defaults (no interlace, no hybrid). This is
 *                the "does the engine still compile formulas at all" check.
 *   hybrid     — hybridCompiled=true, hybridComplex=false (standard box fold)
 *   hybrid-adv — hybridCompiled=true, hybridComplex=true (interleaved mode)
 *
 * Usage:
 *   npx tsx debug/native-config-sweep.mts --mode=baseline --fresh
 *   npx tsx debug/native-config-sweep.mts --mode=hybrid --fresh
 *   npx tsx debug/native-config-sweep.mts --mode=hybrid-adv --fresh
 *   npx tsx debug/native-config-sweep.mts --mode=hybrid --formula=Mandelbulb  # single
 *   npx tsx debug/native-config-sweep.mts --mode=baseline --show --verbose
 *
 * Output:
 *   debug/native-config-sweep.jsonl   — one row per formula per run
 *   debug/thumbnails/config/<hash>.png
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { chromium, Browser, Page } from 'playwright';

import { registry } from '../engine/FractalRegistry.ts';
import { ShaderFactory } from '../engine/ShaderFactory.ts';
import type { ShaderConfig } from '../engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine/ConfigDefaults.ts';
import { registerFeatures } from '../features/index.ts';
import '../formulas/index.ts';

registerFeatures();

// ─── CLI ─────────────────────────────────────────────────────────────────────

const VERBOSE    = process.argv.includes('--verbose');
const FRESH      = process.argv.includes('--fresh');
const HEADLESS   = !process.argv.includes('--show');
const FORMULA    = argVal('--formula');
const MODE       = (argVal('--mode') ?? 'baseline') as Mode;
const TIMEOUT_MS = parseInt(argVal('--timeout') ?? '15000', 10);
const RECYCLE_EVERY = parseInt(argVal('--recycle') ?? '120', 10);

type Mode = 'baseline' | 'hybrid' | 'hybrid-adv';
const VALID_MODES: Mode[] = ['baseline', 'hybrid', 'hybrid-adv'];

if (!VALID_MODES.includes(MODE)) {
    console.error(`Invalid --mode=${MODE}. Must be one of: ${VALID_MODES.join(', ')}`);
    process.exit(1);
}

function argVal(flag: string): string | undefined {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit?.split('=')[1];
}

// ─── Output paths ────────────────────────────────────────────────────────────

const OUT_JSONL  = path.resolve('debug/native-config-sweep.jsonl');
const OUT_THUMBS = path.resolve('debug/thumbnails/config');
const VALIDATOR_HTML = path.resolve('debug/validator.html');

// ─── Config builder ──────────────────────────────────────────────────────────

const buildFullShaderConfig = (formulaId: string): ShaderConfig =>
    createDefaultShaderConfig(formulaId);

/** Apply mode-specific feature overrides to a freshly-built config. */
function applyModeOverrides(cfg: any, mode: Mode): void {
    if (mode === 'baseline') return;  // defaults
    if (mode === 'hybrid') {
        cfg.geometry.hybridCompiled = true;
        cfg.geometry.hybridComplex  = false;
        cfg.geometry.hybridMode     = true;  // activate at runtime too
    } else if (mode === 'hybrid-adv') {
        cfg.geometry.hybridCompiled = true;
        cfg.geometry.hybridComplex  = true;
        cfg.geometry.hybridMode     = true;
    }
}

// ─── Timeout helper ──────────────────────────────────────────────────────────

class TimeoutError extends Error { constructor(public ms: number) { super(`timeout ${ms}ms`); } }

function withTimeout<T>(p: Promise<T>, ms: number, label = 'op'): Promise<T> {
    let t: NodeJS.Timeout | null = null;
    const timeout = new Promise<never>((_, rej) => {
        t = setTimeout(() => rej(new TimeoutError(ms)), ms);
    });
    return Promise.race([p, timeout]).finally(() => { if (t) clearTimeout(t); }) as Promise<T>;
}

// ─── Eligibility ─────────────────────────────────────────────────────────────

/** Modular uses a separate shader pipeline not exercised by this sweep. All
 *  other natives are eligible. hybrid modes skip selfContainedSDE internally
 *  (they compile cleanly but hybrid has no effect). */
function eligibleFormulas(): string[] {
    return registry.getAll()
        .filter(def => def.id !== 'Modular')
        .map(def => def.id);
}

// ─── Shader build ────────────────────────────────────────────────────────────

// DE-slice preview main. Samples map() across 2×2 axis-slice quadrants and
// encodes the full vec4 return:
//   R = orbit trap (log-normalized)
//   G = iteration count (0..1)
//   B = signed distance (banded, log scale)
// Known limitation: for most native formulas the engine's map() returns a
// constant value in the validator environment regardless of input position
// (because it depends on runtime state — camera, lighting, features — we
// don't supply). In those cases the thumbnail is uniform-colored; that's
// honest output, not a bug. Formulas where map() varies (~7/42, mostly
// polyhedra + JuliaMorph) show proper slice structure.
//
// NaN / Inf → pure orange (255,128,0) for validator's NaN detector.
const PREVIEW_MAIN = `
layout(location = 0) out vec4 pc_fragColor;

vec3 _cs_slicePos(vec2 uv) {
    vec2 q = step(vec2(0.5), uv);
    vec2 local = (fract(uv * 2.0) * 2.0 - 1.0) * 1.5;
    int qi = int(q.x) + int(q.y) * 2;
    if      (qi == 0) return vec3(local.x, local.y, 1.1);
    else if (qi == 1) return vec3(local.x, 1.1, local.y);
    else if (qi == 2) return vec3(1.1, local.x, local.y);
    else              return vec3(local.x, local.y, -1.1);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec3 p = _cs_slicePos(uv);
    vec4 m = map(p);
    float d = m.x;

    if (!(d == d) || d == (1.0/0.0) || d == -(1.0/0.0)) {
        pc_fragColor = vec4(1.0, 0.5, 0.0, 1.0);
        return;
    }

    float trapR = clamp(log(1.0 + m.y) * 0.12, 0.0, 1.0);
    float iterG = clamp(m.z, 0.0, 1.0);
    float sgn = d < 0.0 ? -1.0 : 1.0;
    float mag = log(1.0 + abs(d));
    float bands = fract(mag * 3.0);
    float depthB = clamp(0.5 + sgn * (0.3 + 0.2 * bands), 0.0, 1.0);
    float surface = smoothstep(0.03, 0.0, abs(d));

    vec3 col = vec3(trapR, iterG, depthB);
    col = mix(col, vec3(1.0, 1.0, 0.9), surface * 0.6);

    vec2 edge = abs(uv - 0.5) - 0.001;
    float line = 1.0 - smoothstep(0.0, 0.002, min(edge.x, edge.y));
    col = mix(col, vec3(0.3), line * 0.4);

    pc_fragColor = vec4(col, 1.0);
}
`;

function stripEngineMain(src: string): string {
    let out = src.replace(/void\s+main\s*\([^)]*\)\s*\{[\s\S]*\}/m, '');
    out = out.replace(/^\s*layout\s*\(\s*location\s*=\s*0\s*\)\s*out\s+vec4\s+\w+\s*;\s*$/m, '');
    return out;
}

function buildShader(formulaId: string, mode: Mode): string {
    const config = buildFullShaderConfig(formulaId);
    applyModeOverrides(config, mode);

    let raw = ShaderFactory.generateFragmentShader(config);
    if (!/^\s*#version/.test(raw)) raw = '#version 300 es\n' + raw;
    raw = stripEngineMain(raw);
    raw += '\n' + PREVIEW_MAIN;

    const nonce = `const int _gmt_nonce = ${Math.floor(Math.random() * 1e9)};`;
    raw = raw.replace(/^(#version[^\n]*\n)/, `$1${nonce}\n`);
    return raw;
}

function buildUniforms(formulaId: string): Record<string, any> {
    // Use v4-verify's generic defaults (uParamA=1 not 8) — formula-specific
    // defaults (e.g. Mandelbulb paramA=8) produce degenerate DE output in the
    // validator environment because high power-values escape to infinity in a
    // single iteration and getDist returns near-constant values. Generic
    // uParamA=1 gives milder iteration that varies more meaningfully across
    // sample space.
    return {
        uIterations: 16, uEscapeThresh: 1000, uJuliaMode: 0, uJulia: [0, 0, 0],
        uCameraPosition: [0, 0, -3], uResolution: [64, 64], uTime: 0,

        uParamA: 1, uParamB: 1, uParamC: 0, uParamD: 0, uParamE: 0, uParamF: 0,
        uVec2A: [0, 0], uVec2B: [0, 0], uVec2C: [0, 0],
        uVec3A: [0, 0, 0], uVec3B: [0, 0, 0], uVec3C: [0, 0, 0],
        uVec4A: [0, 0, 0, 0], uVec4B: [0, 0, 0, 0], uVec4C: [0, 0, 0, 0],
        uSceneOffsetLow: [0, 0, 0], uSceneOffsetHigh: [0, 0, 0],

        // Hybrid box runtime defaults (consumed only when hybridCompiled=true)
        uHybrid: 1, uHybridIter: 2, uHybridScale: 2.0, uHybridScaleVary: 0,
        uHybridMinR: 0.5, uHybridFixedR: 1.0, uHybridFoldLimit: 1.0,
        uHybridFoldLimitVec: [1, 1, 1], uHybridShift: [0, 0, 0], uHybridRot: [0, 0, 0],
    };
}

// ─── Per-formula verification ────────────────────────────────────────────────

interface CaseResult {
    formula: string;
    mode: Mode;
    webglCompile: { ok: boolean; stage?: string; error?: string } | null;
    renderSigma: number[] | null;
    renderNanFraction: number | null;
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate: string | null;
    thumbnail?: string;
    timeMs: number;
}

async function verifyCase(page: Page, formulaId: string, mode: Mode): Promise<CaseResult> {
    const t0 = performance.now();
    const r: CaseResult = {
        formula: formulaId, mode,
        webglCompile: null, renderSigma: null, renderNanFraction: null,
        overall: 'skip', failFirstGate: null, timeMs: 0,
    };

    let compileShader: string;
    try {
        compileShader = buildShader(formulaId, mode);
    } catch (e: any) {
        r.overall = 'fail';
        r.failFirstGate = 'shaderFactory';
        r.webglCompile = { ok: false, stage: 'shaderFactory', error: (e?.message ?? String(e)).slice(0, 200) };
        r.timeMs = Math.round(performance.now() - t0);
        return r;
    }

    const uniforms = buildUniforms(formulaId);
    const dummySample = '#version 300 es\nprecision highp float; out vec4 fragColor; void main(){ fragColor = vec4(0); }';

    const browserResult: any = await withTimeout(
        page.evaluate(
            async ({ name, compileShader, sampleShader, uniforms }) =>
                await (window as any).runValidation({ name, compileShader, sampleShader, uniforms }),
            { name: `${formulaId}__${mode}`, compileShader, sampleShader: dummySample, uniforms },
        ),
        TIMEOUT_MS,
        `evaluate(${formulaId} / ${mode})`,
    );

    r.webglCompile      = browserResult.webglCompile;
    r.renderSigma       = browserResult.renderNonDegenerate?.sigma ?? null;
    r.renderNanFraction = browserResult.renderNonDegenerate?.nanFraction ?? null;

    r.overall = r.webglCompile?.ok ? 'pass' : 'fail';
    if (r.overall === 'fail') r.failFirstGate = 'webglCompile';

    if (browserResult.thumbnailPNG) {
        const hash = crypto.createHash('sha1')
            .update(`${formulaId}__${mode}`).digest('hex').slice(0, 10);
        const pngPath = path.join(OUT_THUMBS, `${hash}.png`);
        const base64 = browserResult.thumbnailPNG.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(pngPath, Buffer.from(base64, 'base64'));
        r.thumbnail = `thumbnails/config/${hash}.png`;
    }

    r.timeMs = Math.round(performance.now() - t0);
    return r;
}

// ─── Browser lifecycle ───────────────────────────────────────────────────────

async function launch(): Promise<Browser> {
    return await chromium.launch({
        headless: HEADLESS,
        args: [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
            '--enable-webgl',
        ],
        timeout: 30_000,
    });
}

async function openPage(browser: Browser): Promise<Page> {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    if (VERBOSE) {
        page.on('console', m => console.log(`  [browser ${m.type()}] ${m.text()}`));
        page.on('pageerror', e => console.log(`  [browser error] ${e.message}`));
    }
    const fileUrl = 'file://' + VALIDATOR_HTML.replace(/\\/g, '/');
    await page.goto(fileUrl, { timeout: 15_000 });
    await page.waitForFunction(
        () => (window as any).validatorReady === true || (window as any).validatorError,
        null, { timeout: 10_000 },
    );
    const herr = await page.evaluate(() => (window as any).validatorError);
    if (herr) throw new Error(`Validator harness error: ${herr}`);
    return page;
}

async function closePage(page: Page) {
    try { await withTimeout(page.close({ runBeforeUnload: false }), 3000); } catch {}
    try { await withTimeout(page.context().close(), 3000); } catch {}
}

async function forceBrowserClose(browser: Browser) {
    try { await withTimeout(browser.close(), 5000); return; } catch {}
    try { const proc = browser.process(); if (proc && !proc.killed) proc.kill('SIGKILL'); } catch {}
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    if (!fs.existsSync(OUT_THUMBS)) fs.mkdirSync(OUT_THUMBS, { recursive: true });

    const ids = eligibleFormulas();
    let cases: string[] = FORMULA ? [FORMULA] : ids;
    if (FORMULA && !ids.includes(FORMULA)) {
        console.error(`Unknown --formula=${FORMULA}. Eligible: ${ids.join(', ')}`);
        process.exit(1);
    }

    // Resume-skip by (formula, mode) key
    const done = new Set<string>();
    if (!FRESH && fs.existsSync(OUT_JSONL)) {
        for (const line of fs.readFileSync(OUT_JSONL, 'utf8').trim().split('\n').filter(Boolean)) {
            try { const r = JSON.parse(line); done.add(`${r.formula}__${r.mode}`); } catch {}
        }
        const before = cases.length;
        cases = cases.filter(f => !done.has(`${f}__${MODE}`));
        if (before > cases.length) console.log(`  --resume: skipping ${before - cases.length} already-tested cases`);
    } else {
        fs.writeFileSync(OUT_JSONL, '');
    }

    if (cases.length === 0) {
        console.log('  Nothing to do (use --fresh to re-run)');
        process.exit(0);
    }

    console.log(`\n  Native Config Sweep — mode: \x1b[36m${MODE}\x1b[0m`);
    console.log(`  ${cases.length} formula${cases.length === 1 ? '' : 's'} to test`);
    console.log(`  Output: ${OUT_JSONL}`);
    console.log(`  Thumbs: ${OUT_THUMBS}\n`);

    let browser = await launch();
    let page = await openPage(browser);

    let pass = 0, fail = 0, timeouts = 0;
    const failByGate: Record<string, number> = {};
    const start = performance.now();

    let aborted = false;
    process.on('SIGINT', () => { aborted = true; console.log('\n  [SIGINT] finishing current formula…'); });

    for (let i = 0; i < cases.length; i++) {
        if (aborted) break;
        const f = cases[i];

        let r: CaseResult;
        let recover: 'page' | null = null;
        try {
            r = await verifyCase(page, f, MODE);
        } catch (e: any) {
            const isTimeout = e instanceof TimeoutError;
            r = {
                formula: f, mode: MODE,
                webglCompile: null, renderSigma: null, renderNanFraction: null,
                overall: 'fail',
                failFirstGate: isTimeout ? 'timeout' : 'browserCrash',
                timeMs: isTimeout ? TIMEOUT_MS : 0,
            };
            if (isTimeout) timeouts++;
            recover = 'page';
        }

        if (r.overall === 'pass') pass++;
        else if (r.overall === 'fail') {
            fail++;
            if (r.failFirstGate) failByGate[r.failFirstGate] = (failByGate[r.failFirstGate] || 0) + 1;
        }

        fs.appendFileSync(OUT_JSONL, JSON.stringify(r) + '\n');

        const icon = r.overall === 'pass' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        const gateInfo = r.failFirstGate ? ` [\x1b[2m${r.failFirstGate}\x1b[0m]` : '';
        process.stdout.write(
            `  ${icon} [${(i+1).toString().padStart(3)}/${cases.length}] ${f.padEnd(32)} ${(r.timeMs+'ms').padStart(7)}${gateInfo}\n`,
        );
        if (VERBOSE && r.overall === 'fail') {
            const err = r.webglCompile?.error || '(no detail)';
            console.log(`      └── ${err.split('\n')[0].slice(0, 160)}`);
        }

        if (recover === 'page') {
            await closePage(page);
            page = await openPage(browser);
        } else if ((i + 1) % RECYCLE_EVERY === 0 && i + 1 < cases.length) {
            if (VERBOSE) console.log(`  [recycle] after ${RECYCLE_EVERY} formulas`);
            await closePage(page);
            page = await openPage(browser);
        }
    }

    await forceBrowserClose(browser);

    const totalSec = ((performance.now() - start) / 1000).toFixed(1);
    console.log(`\n  ────────────────────────────────────────`);
    console.log(
        `  mode=${MODE}  \x1b[32m${pass} pass\x1b[0m  \x1b[31m${fail} fail\x1b[0m`
        + (timeouts > 0 ? `  \x1b[33m(${timeouts} timeout)\x1b[0m` : '')
        + `  (${totalSec}s)`,
    );
    if (fail > 0) {
        console.log(`\n  Failures by gate:`);
        for (const [g, n] of Object.entries(failByGate).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${g.padEnd(28)} ${n}`);
        }
    }
    console.log(`\n  Results: ${OUT_JSONL}\n`);

    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
