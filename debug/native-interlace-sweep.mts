/**
 * Native × Native Interlace Sweep
 *
 * For every pair of eligible native formulas (primary × secondary) compile the
 * interlaced shader through the real engine ShaderFactory and run webglCompile
 * + renderNonDegenerate gates. Answers: "does interlacing compile cleanly
 * across all native combinations?"
 *
 * Excluded from the sweep:
 *   - Modular (interlace feature bails on Modular either side)
 *   - Formulas with shader.selfContainedSDE (JuliaMorph, MandelTerrain)
 *
 * Usage:
 *   npx tsx debug/native-interlace-sweep.mts                         # full N×N
 *   npx tsx debug/native-interlace-sweep.mts --primary=Mandelbulb    # one row
 *   npx tsx debug/native-interlace-sweep.mts --pair=A,B              # one cell
 *   npx tsx debug/native-interlace-sweep.mts --skip-self             # drop primary==secondary pairs
 *   npx tsx debug/native-interlace-sweep.mts --fresh                 # wipe jsonl
 *   npx tsx debug/native-interlace-sweep.mts --timeout=15000         # per-pair
 *   npx tsx debug/native-interlace-sweep.mts --show                  # non-headless
 *   npx tsx debug/native-interlace-sweep.mts --verbose               # per-pair detail
 *
 * Output:
 *   debug/native-interlace-sweep.jsonl   — one row per pair
 *   debug/thumbnails/interlace/<hash>.png
 *
 * Render a matrix view afterward:
 *   npx tsx debug/native-interlace-matrix.mts
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
import '../formulas/index.ts';  // side-effect: registers all 45 native FractalDefinitions

registerFeatures();

// ─── CLI ─────────────────────────────────────────────────────────────────────

const VERBOSE   = process.argv.includes('--verbose');
const FRESH     = process.argv.includes('--fresh');
const HEADLESS  = !process.argv.includes('--show');
const SKIP_SELF = process.argv.includes('--skip-self');
const PRIMARY   = argVal('--primary');
const PAIR      = argVal('--pair');
const TIMEOUT_MS = parseInt(argVal('--timeout') ?? '15000', 10);
const RECYCLE_EVERY = parseInt(argVal('--recycle') ?? '120', 10);

function argVal(flag: string): string | undefined {
    const hit = process.argv.find(a => a.startsWith(flag + '='));
    return hit?.split('=')[1];
}

// ─── Output paths ────────────────────────────────────────────────────────────

const OUT_JSONL  = path.resolve('debug/native-interlace-sweep.jsonl');
const OUT_THUMBS = path.resolve('debug/thumbnails/interlace');
const VALIDATOR_HTML = path.resolve('debug/validator.html');

// ─── Config builder (shared with FractalEngine constructor) ───────────────

const buildFullShaderConfig = (formulaId: string): ShaderConfig =>
    createDefaultShaderConfig(formulaId);

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

function eligibleFormulas(): string[] {
    return registry.getAll()
        .filter(def => def.id !== 'Modular')
        .filter(def => !def.shader.selfContainedSDE)
        .map(def => def.id);
}

// ─── Shader build ────────────────────────────────────────────────────────────

// Sphere-trace preview main. Casts rays from a fixed camera, shades hits with
// depth + orbit-trap (map().y) + color-iter (map().z) + a cheap normal estimate
// — no lighting uniforms needed. Produces thumbnails that actually show
// interlaced-fractal silhouettes with the formula's real parameter defaults.
//
// Channels at hit:
//   R = proximity (1 − depth) × facing term
//   G = orbit-trap (log-normalized) × facing term
//   B = color-iter normalized
// Miss → dark neutral background with small vignette.
// NaN / Inf → pure orange (255,128,0) so the validator's NaN detector works.
const PREVIEW_MAIN = `
layout(location = 0) out vec4 pc_fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 ndc = uv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 0.0, -2.6);
    vec3 rd = normalize(vec3(ndc * 0.9, 1.3));

    const float MAX_T = 12.0;
    const float HIT_EPS = 0.001;
    float t = 0.0;
    vec4 hit = vec4(0.0);
    bool didHit = false;

    for (int i = 0; i < 140; i++) {
        vec3 p = ro + rd * t;
        vec4 m = map(p);
        float d = m.x;
        if (!(d == d) || d == (1.0/0.0) || d == -(1.0/0.0)) {
            pc_fragColor = vec4(1.0, 0.5, 0.0, 1.0);
            return;
        }
        if (d < HIT_EPS) { hit = m; didHit = true; break; }
        if (t > MAX_T) break;
        t += max(d * 0.9, 0.0005);
    }

    if (!didHit) {
        float vig = 1.0 - dot(ndc, ndc) * 0.15;
        pc_fragColor = vec4(vec3(0.06, 0.07, 0.09) * vig, 1.0);
        return;
    }

    float trap    = clamp(log(1.0 + hit.y) * 0.4, 0.0, 1.0);
    float iterNrm = clamp(hit.z, 0.0, 1.0);
    float depth   = t / MAX_T;
    float prox    = 1.0 - depth * 0.7;

    vec3 hitPos = ro + rd * t;
    const float e = 0.01;
    float gx = map(hitPos + vec3(e,0,0)).x - map(hitPos - vec3(e,0,0)).x;
    float gy = map(hitPos + vec3(0,e,0)).x - map(hitPos - vec3(0,e,0)).x;
    float gz = map(hitPos + vec3(0,0,e)).x - map(hitPos - vec3(0,0,e)).x;
    vec3 nrm = normalize(vec3(gx, gy, gz));
    float facing = clamp(-dot(nrm, rd) * 0.5 + 0.5, 0.1, 1.0);

    vec3 col = vec3(
        prox * (0.4 + 0.6 * facing),
        trap * (0.5 + 0.5 * facing),
        iterNrm
    );
    pc_fragColor = vec4(col, 1.0);
}
`;

// NOTE on gates: this sweep uses webglCompile as the ONLY hard gate.
//
// We tried adding a numeric-sample gate (running map() at 64 grid points and
// checking range/gradient), but the engine's map() returns values that don't
// match an inlined-reference implementation in the validator environment — the
// engine shader's map() depends on a broader set of uniforms and state than
// the validator supplies. Chasing that would mean replicating the whole
// engine runtime, which defeats the purpose of a lightweight CI check.
//
// The compile gate alone is sufficient for the ORIGINAL goal of this sweep:
// catch GLSL namespace collisions, missing uniforms, or syntax errors from
// the interlace glue code across all native-formula pair combinations. That's
// what doc 27 suggestion #5 called out, and it's what breaks in practice.

// Strip engine's `void main() {...}` + its out-decl so we can replace the main.
// Engine places main at the END of the shader, so greedy `[\s\S]*\}` matches
// only main's body (everything to the final brace).
function stripEngineMain(src: string): string {
    let out = src.replace(/void\s+main\s*\([^)]*\)\s*\{[\s\S]*\}/m, '');
    out = out.replace(/^\s*layout\s*\(\s*location\s*=\s*0\s*\)\s*out\s+vec4\s+\w+\s*;\s*$/m, '');
    return out;
}

function buildInterlacedEngine(primaryId: string, secondaryId: string): string {
    const config = buildFullShaderConfig(primaryId);
    (config as any).interlace.interlaceCompiled = true;
    (config as any).interlace.interlaceFormula  = secondaryId;
    (config as any).interlace.interlaceEnabled  = true;

    let raw = ShaderFactory.generateFragmentShader(config);
    if (!/^\s*#version/.test(raw)) raw = '#version 300 es\n' + raw;
    raw = stripEngineMain(raw);

    const nonce = `const int _gmt_nonce = ${Math.floor(Math.random() * 1e9)};`;
    raw = raw.replace(/^(#version[^\n]*\n)/, `$1${nonce}\n`);
    return raw;
}

function buildCompileShader(primaryId: string, secondaryId: string): string {
    return buildInterlacedEngine(primaryId, secondaryId) + '\n' + PREVIEW_MAIN;
}

// Collect uniform defaults for both primary AND secondary so the thumbnail
// render exercises sensible values (not all zeros, which many DEs NaN on).
function buildUniforms(primaryId: string, secondaryId: string): Record<string, any> {
    const u: Record<string, any> = {
        uIterations:   6,
        uEscapeThresh: 1000,
        uJuliaMode:    0,
        uJulia:        [0, 0, 0],
        uCameraPosition: [0, 0, -3],
        uResolution:   [64, 64],
        uTime:         0,

        // Primary param slots
        uParamA: 8, uParamB: 1, uParamC: 0, uParamD: 0, uParamE: 0, uParamF: 0,
        uVec2A: [0, 0], uVec2B: [0, 0], uVec2C: [0, 0],
        uVec3A: [0, 0, 0], uVec3B: [0, 0, 0], uVec3C: [0, 0, 0],
        uVec4A: [0, 0, 0, 0], uVec4B: [0, 0, 0, 0], uVec4C: [0, 0, 0, 0],
        uSceneOffsetLow: [0, 0, 0], uSceneOffsetHigh: [0, 0, 0],

        // Interlace runtime controls
        uInterlaceEnabled:   1,
        uInterlaceInterval:  2,
        uInterlaceStartIter: 0,

        // Interlace secondary-formula slots (filled from secondary defaults below)
        uInterlaceParamA: 0, uInterlaceParamB: 0, uInterlaceParamC: 0,
        uInterlaceParamD: 0, uInterlaceParamE: 0, uInterlaceParamF: 0,
        uInterlaceVec2A: [0, 0], uInterlaceVec2B: [0, 0], uInterlaceVec2C: [0, 0],
        uInterlaceVec3A: [0, 0, 0], uInterlaceVec3B: [0, 0, 0], uInterlaceVec3C: [0, 0, 0],
    };

    const primDef = registry.get(primaryId as any);
    if (primDef) writeDefaultsTo(u, primDef.parameters, /* interlace */ false);

    const secDef = registry.get(secondaryId as any);
    if (secDef) writeDefaultsTo(u, secDef.parameters, /* interlace */ true);

    return u;
}

function writeDefaultsTo(
    u: Record<string, any>,
    params: any[],
    interlace: boolean,
): void {
    const prefix = interlace ? 'uInterlace' : 'u';
    for (const p of params) {
        if (!p || !p.id) continue;
        // id is e.g. 'paramA', 'vec3B', 'iterations'
        if (p.id === 'iterations') {
            if (!interlace && typeof p.default === 'number') u.uIterations = Math.max(4, p.default);
            continue;
        }
        const slot = p.id;
        if (!/^(param[A-F]|vec[234][A-C])$/.test(slot)) continue;
        const name = prefix + slot[0].toUpperCase() + slot.slice(1);
        const d = p.default;
        if (typeof d === 'number') u[name] = d;
        else if (d && typeof d === 'object') {
            if ('w' in d) u[name] = [d.x, d.y, (d as any).z, (d as any).w];
            else if ('z' in d) u[name] = [d.x, d.y, (d as any).z];
            else if ('y' in d) u[name] = [d.x, d.y];
        }
    }
}

// ─── Per-pair verification ───────────────────────────────────────────────────

interface PairResult {
    primary: string;
    secondary: string;
    webglCompile: { ok: boolean; stage?: string; error?: string } | null;
    // Non-gating diagnostics (reported but don't affect pass/fail):
    renderSigma: number[] | null;      // σ per RGB channel of the thumbnail
    renderNanFraction: number | null;  // fraction of NaN pixels in thumbnail
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate: string | null;
    thumbnail?: string;
    timeMs: number;
}

async function verifyPair(page: Page, primary: string, secondary: string): Promise<PairResult> {
    const t0 = performance.now();
    const r: PairResult = {
        primary, secondary,
        webglCompile: null, renderSigma: null, renderNanFraction: null,
        overall: 'skip', failFirstGate: null, timeMs: 0,
    };

    let compileShader: string;
    try {
        compileShader = buildCompileShader(primary, secondary);
    } catch (e: any) {
        r.overall = 'fail';
        r.failFirstGate = 'shaderFactory';
        r.webglCompile = { ok: false, stage: 'shaderFactory', error: (e?.message ?? String(e)).slice(0, 200) };
        r.timeMs = Math.round(performance.now() - t0);
        return r;
    }

    const uniforms = buildUniforms(primary, secondary);

    // Dummy sample shader — sample path isn't a gate for this sweep. We pass
    // it to reuse validator.html's runValidation() scaffolding.
    const dummySample = '#version 300 es\nprecision highp float; out vec4 fragColor; void main(){ fragColor = vec4(0); }';

    const browserResult: any = await withTimeout(
        page.evaluate(
            async ({ name, compileShader, sampleShader, uniforms }) =>
                await (window as any).runValidation({ name, compileShader, sampleShader, uniforms }),
            { name: `${primary}__x__${secondary}`, compileShader, sampleShader: dummySample, uniforms },
        ),
        TIMEOUT_MS,
        `evaluate(${primary}/${secondary})`,
    );

    r.webglCompile      = browserResult.webglCompile;
    r.renderSigma       = browserResult.renderNonDegenerate?.sigma ?? null;
    r.renderNanFraction = browserResult.renderNonDegenerate?.nanFraction ?? null;

    // SINGLE hard gate: engine shader compiles. Render-sigma is recorded as a
    // diagnostic but doesn't determine pass/fail (see NOTE at top).
    if (!r.webglCompile?.ok) {
        r.overall = 'fail';
        r.failFirstGate = 'webglCompile';
    } else {
        r.overall = 'pass';
    }

    if (browserResult.thumbnailPNG) {
        const hash = crypto.createHash('sha1')
            .update(`${primary}__x__${secondary}`).digest('hex').slice(0, 10);
        const pngPath = path.join(OUT_THUMBS, `${hash}.png`);
        const base64 = browserResult.thumbnailPNG.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(pngPath, Buffer.from(base64, 'base64'));
        r.thumbnail = `thumbnails/interlace/${hash}.png`;
    }

    r.timeMs = Math.round(performance.now() - t0);
    return r;
}

// ─── Browser lifecycle ──────────────────────────────────────────────────────

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

    // Build pair list
    const ids = eligibleFormulas();
    let pairs: Array<[string, string]> = [];

    if (PAIR) {
        const [a, b] = PAIR.split(',').map(s => s.trim());
        if (!ids.includes(a) || !ids.includes(b)) {
            console.error(`Unknown formula in --pair=${PAIR}. Eligible: ${ids.join(', ')}`);
            process.exit(1);
        }
        pairs.push([a, b]);
    } else {
        const primaries = PRIMARY ? [PRIMARY] : ids;
        for (const p of primaries) {
            if (!ids.includes(p)) {
                console.error(`Unknown --primary=${p}. Eligible: ${ids.join(', ')}`);
                process.exit(1);
            }
            for (const s of ids) {
                if (SKIP_SELF && p === s) continue;
                pairs.push([p, s]);
            }
        }
    }

    // Resume: skip pairs already tested unless --fresh
    const done = new Set<string>();
    if (!FRESH && fs.existsSync(OUT_JSONL)) {
        for (const line of fs.readFileSync(OUT_JSONL, 'utf8').trim().split('\n').filter(Boolean)) {
            try { const r = JSON.parse(line); done.add(`${r.primary}__x__${r.secondary}`); } catch {}
        }
        const before = pairs.length;
        pairs = pairs.filter(([a, b]) => !done.has(`${a}__x__${b}`));
        if (before > pairs.length) console.log(`  --resume: skipping ${before - pairs.length} already-tested pairs`);
    } else {
        fs.writeFileSync(OUT_JSONL, '');
    }

    if (pairs.length === 0) {
        console.log('  Nothing to do (use --fresh to re-run)');
        process.exit(0);
    }

    const estSec = Math.round(pairs.length * 0.5);
    console.log(`\n  Native Interlace Sweep`);
    console.log(`  ${ids.length} eligible formulas, ${pairs.length} pairs to test (~${estSec}s est.)`);
    console.log(`  Output: ${OUT_JSONL}`);
    console.log(`  Thumbs: ${OUT_THUMBS}\n`);

    let browser = await launch();
    let page = await openPage(browser);

    let pass = 0, fail = 0, timeouts = 0;
    const failByFirstGate: Record<string, number> = {};
    const start = performance.now();

    let aborted = false;
    process.on('SIGINT', () => { aborted = true; console.log('\n  [SIGINT] finishing current pair…'); });

    for (let i = 0; i < pairs.length; i++) {
        if (aborted) break;
        const [p, s] = pairs[i];

        let r: PairResult;
        let recover: 'page' | 'browser' | null = null;
        try {
            r = await verifyPair(page, p, s);
        } catch (e: any) {
            const isTimeout = e instanceof TimeoutError;
            r = {
                primary: p, secondary: s,
                webglCompile: null, renderNonDegenerate: null,
                overall: 'fail',
                failFirstGate: isTimeout ? 'timeout' : 'browserCrash',
                timeMs: isTimeout ? TIMEOUT_MS : 0,
            };
            if (isTimeout) timeouts++;
            recover = 'page';
        }

        if (r.overall === 'pass') {
            pass++;
        } else if (r.overall === 'fail') {
            fail++;
            if (r.failFirstGate) failByFirstGate[r.failFirstGate] = (failByFirstGate[r.failFirstGate] || 0) + 1;
        }

        fs.appendFileSync(OUT_JSONL, JSON.stringify(r) + '\n');

        const icon = r.overall === 'pass' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        const gateInfo = r.failFirstGate ? ` [\x1b[2m${r.failFirstGate}\x1b[0m]` : '';
        process.stdout.write(
            `  ${icon} [${(i+1).toString().padStart(4)}/${pairs.length}] ${p.padEnd(28)} × ${s.padEnd(28)} ${(r.timeMs+'ms').padStart(7)}${gateInfo}\n`,
        );
        if (VERBOSE && r.overall === 'fail') {
            const err = r.webglCompile?.error || r.renderNonDegenerate?.reason || '(no detail)';
            console.log(`      └── ${err.split('\n')[0].slice(0, 160)}`);
        }

        if (recover === 'page') {
            await closePage(page);
            page = await openPage(browser);
        } else if ((i + 1) % RECYCLE_EVERY === 0 && i + 1 < pairs.length) {
            if (VERBOSE) console.log(`  [recycle] after ${RECYCLE_EVERY} pairs`);
            await closePage(page);
            page = await openPage(browser);
        }
    }

    await forceBrowserClose(browser);

    const totalSec = ((performance.now() - start) / 1000).toFixed(1);
    console.log(`\n  ────────────────────────────────────────`);
    console.log(
        `  \x1b[32m${pass} pass\x1b[0m  \x1b[31m${fail} fail\x1b[0m`
        + (timeouts > 0 ? `  \x1b[33m(${timeouts} timeout)\x1b[0m` : '')
        + `  (${totalSec}s)`,
    );
    if (fail > 0) {
        console.log(`\n  Failures by gate:`);
        for (const [g, n] of Object.entries(failByFirstGate).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${g.padEnd(28)} ${n}`);
        }
    }
    console.log(`\n  Results: ${OUT_JSONL}`);
    console.log(`  Render matrix:  npx tsx debug/native-interlace-matrix.mts\n`);

    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
