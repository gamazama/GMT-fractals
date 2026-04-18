/**
 * V4 Verification Harness — Playwright-driven, autonomous
 *
 * Runs Phase A verification gates (parse, webglCompile, sampleFinite,
 * sampleNonConstant, gradientFinite, renderNonDegenerate) against formulas.
 *
 * Usage:
 *   npx tsx debug/v4-verify.mts                           # All frag files
 *   npx tsx debug/v4-verify.mts Mandelbox                 # Filter by name
 *   npx tsx debug/v4-verify.mts --dec                     # DEC formulas only
 *   npx tsx debug/v4-verify.mts --frag                    # Frag files only
 *   npx tsx debug/v4-verify.mts --single default          # Default Mandelbox smoke test
 *   npx tsx debug/v4-verify.mts --verbose                 # Show per-formula details
 *
 * Outputs:
 *   debug/v4-verify-results.jsonl         # one row per formula, all gates
 *   debug/thumbnails/<hash>.png           # thumbnail renders (64×64)
 *
 * See docs/26_Formula_Workshop_V4_Plan.md §9 for gate definitions.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { chromium, Browser, Page } from 'playwright';
import { parse } from '@shaderfrog/glsl-parser';
import { detectFormulaV3, transformFormulaV3 } from '../features/fragmentarium_import/v3/compat.ts';
import { detectDECFormat } from '../features/fragmentarium_import/parsers/dec-detector.ts';
import { preprocessDEC } from '../features/fragmentarium_import/parsers/dec-preprocessor.ts';
import { DEC_FRACTALS } from '../features/fragmentarium_import/random-formulas.ts';
import type { TransformedFormulaV2 } from '../features/fragmentarium_import/types.ts';
import { processFormula as v4ProcessFormula } from '../features/fragmentarium_import/v4/index.ts';
import type { FractalDefinition } from '../types/fractal';
import { buildFractalParams } from '../features/fragmentarium_import/workshop/param-builder.ts';
import { registry } from '../engine/FractalRegistry.ts';
import { ShaderFactory } from '../engine/ShaderFactory.ts';
import type { ShaderConfig } from '../engine/ShaderFactory.ts';
import { createDefaultShaderConfig } from '../engine/ConfigDefaults.ts';
import { registerFeatures } from '../features/index.ts';
registerFeatures();  // populate featureRegistry so createDefaultShaderConfig has features to iterate

// ─── CLI ─────────────────────────────────────────────────────────────────────

const VERBOSE = process.argv.includes('--verbose');
const ONLY_DEC = process.argv.includes('--dec');
const ONLY_FRAG = process.argv.includes('--frag');
const SINGLE = process.argv.includes('--single') ? process.argv[process.argv.indexOf('--single') + 1] : undefined;
const FRESH = process.argv.includes('--fresh');
const HEADLESS = !process.argv.includes('--show');
const PIPELINE: 'v3' | 'v4' = (process.argv.find(a => a.startsWith('--pipeline='))?.split('=')[1] === 'v4' ? 'v4' : 'v3');
const TIMEOUT_MS = parseInt(
    process.argv.find(a => a.startsWith('--timeout='))?.split('=')[1] ?? '10000',
    10,
);
const RECYCLE_EVERY = parseInt(
    process.argv.find(a => a.startsWith('--recycle='))?.split('=')[1] ?? '100',
    10,
);
const MAX_CONSECUTIVE_FAILS = 3;  // after this many in-a-row timeouts, restart whole browser
const FILTER = process.argv.slice(2).find(a =>
    !a.startsWith('-') && a !== SINGLE
    && !a.startsWith('--timeout=') && !a.startsWith('--recycle=')
);

// ─── Timeout / robustness helpers ────────────────────────────────────────────

class TimeoutError extends Error { constructor(public ms: number) { super(`timeout after ${ms}ms`); } }

// ─── Build a full engine config (shared with FractalEngine) ──────────────────
// The `coloring` feature's preamble injection declares `g_orbitTrap` globally.
// Without a full per-feature config, ShaderFactory's feature injection skips
// half the preambles and imported formulas fail to compile. The helper in
// engine/ConfigDefaults.ts iterates the feature registry exactly like the
// engine constructor does.

const buildFullShaderConfig = (formulaId: string): ShaderConfig =>
    createDefaultShaderConfig(formulaId);

async function withTimeout<T>(promise: Promise<T>, ms: number, label = 'op'): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

const REF_DIR = path.resolve('features/fragmentarium_import/reference/Examples');
const OUT_JSONL = path.resolve('debug/v4-verify-results.jsonl');
const OUT_THUMBS = path.resolve('debug/thumbnails');
const VALIDATOR_HTML = path.resolve('debug/validator.html');

// ─── Shader scaffolds ────────────────────────────────────────────────────────

// Shared prelude: engine uniforms, helper stubs, global state.
// Mirrors debug/shader-validator.mts ENGINE_SCAFFOLD but abbreviated.
const SCAFFOLD_PRELUDE = `#version 300 es
precision highp float;
precision highp int;

uniform float uIterations;
uniform float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF;
uniform vec2  uVec2A, uVec2B, uVec2C;
uniform vec3  uVec3A, uVec3B, uVec3C;
uniform vec4  uVec4A, uVec4B, uVec4C;
uniform vec3  uJulia;
uniform float uJuliaMode;
uniform float uEscapeThresh, uColorIter, uColorMode;
uniform vec3  uSceneOffsetLow, uSceneOffsetHigh;
uniform vec3  uCameraPosition;
uniform vec2  uResolution;
uniform float uTime;

#define PI 3.14159265358979
#define TAU 6.28318530717959
#define INV_PI 0.31830988618379
#define INV_TAU 0.15915494309190
#define MAX_DIST 100.0
#define MISS_DIST 99.0
#define BOUNDING_RADIUS 20.0
#define MAX_HARD_ITERATIONS {{MAX_ITER}}
#define M_PI 3.14159265358979
#define M_2PI 6.28318530717959
#define M_PI2 1.57079632679490

float getLength(vec3 p) { return length(p); }
void  applyPreRotation(inout vec3 p) {}
void  applyPostRotation(inout vec3 p) {}
void  applyWorldRotation(inout vec3 p) {}
vec3  applyPrecisionOffset(vec3 p, vec3 lo, vec3 hi) { return p + lo; }
void  sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = dot(z, z);
    float t = clamp(fixedR / max(r2, minR), 1.0, fixedR / minR);
    z *= t; dz *= t;
}
void  boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
mat2 rotate2D(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
mat3 rotate3D(float a, vec3 v) { float c=cos(a),s=sin(a),t=1.0-c; vec3 n=normalize(v); return mat3(t*n.x*n.x+c,t*n.x*n.y-s*n.z,t*n.x*n.z+s*n.y,t*n.x*n.y+s*n.z,t*n.y*n.y+c,t*n.y*n.z-s*n.x,t*n.x*n.z-s*n.y,t*n.y*n.z+s*n.x,t*n.z*n.z+c); }

vec3  mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4  mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4  permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4  taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) { return 0.0; }

vec4  g_orbitTrap = vec4(1e10);
float escape = 0.0;
#define time uTime

uniform vec3  BackgroundColor;
uniform vec3  SpotLightPos;
uniform vec3  SpotLightDir;
uniform float subframe;
uniform vec2  iResolution;
uniform float iGlobalTime;
uniform float pixelSize;
uniform float rCoC;
uniform sampler2D frontbuffer;
vec3  from = vec3(0.0);
vec3  Dir  = vec3(0.0, 0.0, 1.0);
vec2  coord = vec2(0.0);
float surface = 0.0;
float volume  = 0.0;

{{FORMULA_UNIFORMS}}

{{FORMULA_FUNCTIONS}}

{{GET_DIST}}

vec4 map(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);
    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
    float dr = 1.0;
    float trap = 1e10;
    g_orbitTrap = vec4(1e10);
    float iter = 0.0;
    bool escaped = false;
    float bailout = max(100.0, uEscapeThresh + 100.0);

    {{LOOP_INIT}}

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;
        applyPreRotation(z.xyz);
        float r2_check = dot(z.xyz, z.xyz);
        if (r2_check > bailout) { escaped = true; break; }

        {{LOOP_BODY}}

        applyPostRotation(z.xyz);
        iter += 1.0;
        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));
        if (dr > 1.0e10 || r2 > bailout) { escaped = true; break; }
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);
    vec2 distRes = getDist(r, safeDr, iter, z);
    return vec4(distRes.x, trap, iter / max(uIterations, 1.0), 0.0);
}

out vec4 fragColor;
`;

// Preview main — DE-slice visualization (64×64).
// Instead of raymarching (which depends on camera framing hitting the fractal),
// directly sample the DE field on three axis slices arranged in a 2×2 grid:
//   top-left   XY slice (Z=0)    top-right  XZ slice (Y=0)
//   bottom-left YZ slice (X=0)   bottom-right XYZ diagonal slice
//
// Any formula with a non-constant DE field produces visible bands.
// This is a validation visualization, not an aesthetic render — but it's robust:
// camera framing, fractal scale, and iteration count don't determine whether
// variation appears. If map() varies across 3D space, the slice shows it.
const PREVIEW_MAIN = `
// Small irrational offsets avoid positions with any coord being exactly 0.
// Many fractal DEs divide by r² or dot(p,p) and NaN at axis-aligned points,
// but real camera rays never hit those exactly. The offsets mimic that.
const vec3 AXIS_EPS = vec3(0.017, 0.023, 0.031);

vec3 slicePos(vec2 uv) {
    // uv in 0..1, divide into 2x2 quadrants
    vec2 q = step(vec2(0.5), uv);               // quadrant flags (0 or 1)
    vec2 local = fract(uv * 2.0) * 2.0 - 1.0;   // -1..1 inside the quadrant
    local *= 2.0;                               // -2..2
    int qi = int(q.x) + int(q.y) * 2;           // 0:BL 1:BR 2:TL 3:TR
    vec3 p;
    if      (qi == 0) p = vec3(local, 0.0);                   // XY slice, Z=0
    else if (qi == 1) p = vec3(local.x, 0.0, local.y);        // XZ slice, Y=0
    else if (qi == 2) p = vec3(0.0, local);                   // YZ slice, X=0
    else              p = vec3(local.x, local.y, local.x*0.5);// diagonal slice
    return p + AXIS_EPS;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 p = slicePos(uv);

    float d = map(p).x;

    // If NaN/Inf, render pure orange (255,128,0) — unambiguously distinct
    // from any banding colour. Detector in JS keys on this exact hue.
    if (!(d == d) || d == (1.0/0.0) || d == -(1.0/0.0)) {
        fragColor = vec4(1.0, 0.5, 0.0, 1.0);
        return;
    }

    // Logarithmic banding: compresses huge DE range into visible variation.
    // Exterior (d > 0) → blue bands. Interior (d < 0) → green bands.
    // This keeps red/orange reserved for NaN (hue-distinct).
    float sgn = d < 0.0 ? -1.0 : 1.0;
    float mag = log(1.0 + abs(d));
    float bands = fract(mag * 3.0);
    float surface = smoothstep(0.02, 0.0, abs(d));  // highlight |d| ~ 0

    vec3 col = sgn > 0.0
        ? mix(vec3(0.05, 0.10, 0.20) + bands * vec3(0.4, 0.6, 0.9), vec3(1.0), surface)
        : mix(vec3(0.05, 0.25, 0.10) + bands * vec3(0.2, 0.9, 0.3), vec3(1.0), surface);

    // Faint quadrant divider lines so you can read the slice layout
    vec2 edge = abs(uv - 0.5) - 0.001;
    float line = 1.0 - smoothstep(0.0, 0.002, min(edge.x, edge.y));
    col = mix(col, vec3(0.4), line * 0.5);

    fragColor = vec4(col, 1.0);
}
`;

// Sample main — 64 deterministic sample points (8×8 FB).
// Arranged as a 4×4×4 grid with a small jitter to avoid exact-zero coordinates
// that can trigger divide-by-zero singularities.  Covers the same spatial
// region the preview slice visualizes, so sampleFinite correlates with
// renderNonDegenerate.  Writes vec4(distance, gradientMag, 0, 1) per sample.
const SAMPLE_MAIN = `
void main() {
    ivec2 xy = ivec2(gl_FragCoord.xy);        // 0..7 on 8×8 FB
    int idx = xy.y * 8 + xy.x;                // 0..63
    int ix = idx & 3;                         // 0..3
    int iy = (idx >> 2) & 3;                  // 0..3
    int iz = (idx >> 4) & 3;                  // 0..3
    // Grid positions in [-1.85, 1.85] with per-axis jitter
    vec4 axis_x = vec4(-1.83, -0.62,  0.65,  1.81);
    vec4 axis_y = vec4(-1.87, -0.68,  0.63,  1.85);
    vec4 axis_z = vec4(-1.84, -0.65,  0.61,  1.87);
    vec3 p = vec3(axis_x[ix], axis_y[iy], axis_z[iz]);

    float d = map(p).x;

    const float eps = 0.01;
    float gx = (map(p + vec3(eps,0,0)).x - map(p - vec3(eps,0,0)).x) / (2.0 * eps);
    float gy = (map(p + vec3(0,eps,0)).x - map(p - vec3(0,eps,0)).x) / (2.0 * eps);
    float gz = (map(p + vec3(0,0,eps)).x - map(p - vec3(0,0,eps)).x) / (2.0 * eps);
    float grad = length(vec3(gx, gy, gz));

    fragColor = vec4(d, grad, 0.0, 1.0);
}
`;

function buildShader(
    result: TransformedFormulaV2,
    mainBlock: string,
    maxIter: number,
): string {
    const formulaUniforms = (result.uniforms || '')
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//'))
        .join('\n');
    const getDist = result.getDist
        ? `vec2 getDist(float r, float dr, float iter, vec4 z) { ${result.getDist} }`
        : `vec2 getDist(float r, float dr, float iter, vec4 z) { return vec2(0.5 * r * log(r) / max(abs(dr), 1e-20), iter); }`;

    // Strip redeclared scaffold stubs to avoid redefinition errors
    let scaffold = SCAFFOLD_PRELUDE;
    const allCode = (formulaUniforms + '\n' + (result.function || '')).toLowerCase();
    const STUBS = ['iresolution', 'iglobaltime', 'pixelsize', 'rcoc', 'subframe', 'frontbuffer', 'backgroundcolor', 'spotlightpos', 'spotlightdir'];
    for (const v of STUBS) {
        if (allCode.includes(v.toLowerCase())) {
            scaffold = scaffold.replace(new RegExp(`^.*\\b${v}\\b.*$`, 'gmi'), `// (stripped: ${v})`);
        }
    }
    if (/\bfloat\s+escape\b/.test(allCode) || /\buniform\s+float\s+escape\b/.test(allCode)) {
        scaffold = scaffold.replace(/^float\s+escape\s*=\s*0\.0;$/m, '// (stripped: escape)');
    }

    const nonce = `const float _gmt_nonce = ${Math.random().toFixed(10)};`;
    return scaffold
        .replace('{{MAX_ITER}}', maxIter.toString())
        .replace('{{FORMULA_UNIFORMS}}', nonce + '\n' + formulaUniforms)
        .replace('{{FORMULA_FUNCTIONS}}', result.function || '')
        .replace('{{GET_DIST}}', getDist)
        .replace('{{LOOP_INIT}}', result.loopInit || '')
        .replace('{{LOOP_BODY}}', result.loopBody || '') + mainBlock;
}

// ─── Parse gate (Gate 1) ─────────────────────────────────────────────────────

const ENGINE_DEFINES = new Set([
    'MAX_HARD_ITERATIONS', 'PI', 'TAU', 'INV_PI', 'INV_TAU',
    'MAX_DIST', 'MISS_DIST', 'BOUNDING_RADIUS', 'M_PI', 'M_2PI', 'M_PI2',
    'Phi', 'TWO_PI',
    'gl_FragCoord', 'gl_FragColor', 'gl_Position', 'fragColor',
    'time', 'iGlobalTime',
    'subframe', 'rCoC', 'iResolution', 'pixelSize', 'frontbuffer',
    'BackgroundColor', 'SpotLightPos', 'SpotLightDir',
    'from', 'Dir', 'coord', 'surface', 'volume',
    'g_orbitTrap', 'escape',
]);

function parseGate(glsl: string): { ok: boolean; error?: string } {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => { warnings.push(String(msg)); };
    try {
        parse(glsl, { quiet: false });
        const fatal = warnings.filter(w => {
            if (!/Encountered (undefined variable|undeclared type)/.test(w)) return false;
            const m = w.match(/"([^"]+)"/);
            return !(m && ENGINE_DEFINES.has(m[1]));
        });
        if (fatal.length > 0) {
            return { ok: false, error: `Undeclared: ${fatal.slice(0, 2).join('; ').slice(0, 200)}` };
        }
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: (e?.message ?? String(e)).split('\n')[0].slice(0, 200) };
    } finally {
        console.warn = origWarn;
    }
}

// ─── Formula discovery ───────────────────────────────────────────────────────

interface FormulaSource {
    name: string;
    category: 'default' | 'frag' | 'dec';
    source: string;
    fragPath?: string;
}

function discoverFragFiles(): FormulaSource[] {
    const results: FormulaSource[] = [];
    function walk(dir: string) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.frag')) {
                const rel = path.relative(REF_DIR, full).replace(/\\/g, '/');
                results.push({
                    name: path.basename(entry.name, '.frag'),
                    category: 'frag',
                    source: fs.readFileSync(full, 'utf8'),
                    fragPath: rel,
                });
            }
        }
    }
    walk(REF_DIR);
    return results;
}

function getDefaultScript(): FormulaSource {
    return {
        name: 'default_mandelbox',
        category: 'default',
        source: `
uniform float Scale;    slider[-3.0, 2.0, 4.0]
uniform float MinRad2;  slider[0.01, 0.25, 1.0]
uniform vec3  Offset;   slider[(-2,-2,-2),(0,0,0),(2,2,2)]
uniform vec2  Warp;     slider[(-1,-1),(0,0),(1,1)]
uniform int   Folds;    slider[1, 6, 12]
uniform bool  Julia;    checkbox[false]

float DE(vec3 pos) {
    float minRad2 = clamp(MinRad2, 1.0e-9, 1.0);
    vec4 scale = vec4(Scale) / minRad2;
    float absScaleM1 = abs(Scale - 1.0);
    float absScale = abs(Scale);
    vec4 p = vec4(pos, 1.0), p0 = p;
    for (int i = 0; i < 12; i++) {
        p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;
        p.xy += Warp;
        float r2 = dot(p.xyz, p.xyz);
        p *= clamp(max(minRad2 / r2, minRad2), 0.0, 1.0);
        p = p * scale + p0;
        if (i < Folds) p.xyz += Offset;
    }
    return (length(p.xyz) - absScaleM1) / p.w - pow(absScale, float(1 - 12));
}
`,
    };
}

// ─── Single-formula pipeline ─────────────────────────────────────────────────

interface FormulaResult {
    name: string;
    category: string;
    fragPath?: string;
    parse: { ok: boolean; error?: string };
    v3Transform?: { ok: boolean; error?: string; mode?: string };
    webglCompile?: any;
    renderNonDegenerate?: any;
    sampleShaderCompile?: any;
    sampleFinite?: any;
    sampleNonConstant?: any;
    gradientFinite?: any;
    thumbnail?: string;
    overall: 'pass' | 'fail' | 'skip';
    failFirstGate?: string;
    timeMs: number;
}

async function verifyFormula(page: Page, src: FormulaSource, timeoutMs: number): Promise<FormulaResult> {
    const t0 = performance.now();
    const result: FormulaResult = {
        name: src.name,
        category: src.category,
        fragPath: src.fragPath,
        parse: { ok: false },
        overall: 'skip',
        timeMs: 0,
    };

    // ── Pipeline dispatch: V3 (legacy) vs V4 ────────────────────────────────
    let transformed: TransformedFormulaV2 | null = null;
    let v4Def: FractalDefinition | null = null;
    let detParams: Array<{ name: string; mappedSlot?: string; defaultValue?: any }> = [];

    if (PIPELINE === 'v4') {
        // V4: one unified pipeline (ingest → preprocess → analyze → emit).
        const r = v4ProcessFormula(src.source, src.name, src.name, src.name);
        if (!r.ok) {
            const kind = r.error.kind;
            // 2D / buffer / donotrun / providesColor etc. are categorical skips, not fails
            const isSkip = ['unsupported_render_model', 'donotrun', 'no_de_function',
                            'provides_color', 'provides_background', 'buffer_shader',
                            'vertex_shader', 'textures_unsupported'].includes(kind);
            result.v3Transform = { ok: false, error: `${kind}: ${r.error.message.slice(0, 120)}` };
            result.failFirstGate = 'v3Transform';
            result.overall = isSkip ? 'skip' : 'fail';
            result.timeMs = Math.round(performance.now() - t0);
            return result;
        }
        v4Def = r.value.definition;
        const v4Mode = v4Def.shader.selfContainedSDE ? 'v4-self-contained' : 'v4-per-iter';
        result.v3Transform = { ok: true, mode: v4Mode };

        // Adapt V4 FractalDefinition to TransformedFormulaV2-compatible shape
        // for the existing buildShader flow.
        transformed = {
            uniforms: '',  // V4 renames to engine slots, no extra uniform decls needed
            function: (v4Def.shader.preamble ?? '') + '\n\n' + v4Def.shader.function,
            loopBody: v4Def.shader.loopBody,
            loopInit: v4Def.shader.loopInit,
            getDist: v4Def.shader.getDist,
            warnings: r.value.warnings,
            mode: v4Mode as any,
        } as any;

        // Build detParams for uniform defaults (match V3's shape)
        detParams = v4Def.parameters.filter((p): p is NonNullable<typeof p> => p !== null).map(p => ({
            name: p.id,
            mappedSlot: p.id,
            defaultValue: typeof p.default === 'object' && p.default !== null
                ? ('w' in p.default
                    ? [p.default.x, p.default.y, (p.default as any).z, (p.default as any).w]
                    : 'z' in p.default
                        ? [p.default.x, p.default.y, (p.default as any).z]
                        : [p.default.x, p.default.y])
                : p.default,
        }));
    } else {
        // V3 path: detect → transform (existing)
        let processedSource = src.source;
        const decInfo = detectDECFormat(src.source);
        if (decInfo.isDEC && decInfo.confidence > 0.4) {
            try {
                processedSource = preprocessDEC(src.source).fragmentariumSource;
            } catch (e: any) {
                result.v3Transform = { ok: false, error: `DEC preprocess: ${e.message?.slice(0, 120)}` };
                result.failFirstGate = 'v3Transform';
                result.overall = 'fail';
                result.timeMs = Math.round(performance.now() - t0);
                return result;
            }
        }

        const det = detectFormulaV3(processedSource, src.name);
        if ('error' in det) {
            result.v3Transform = { ok: false, error: `detect: ${det.error}` };
            result.failFirstGate = 'v3Transform';
            result.overall = 'skip';
            result.timeMs = Math.round(performance.now() - t0);
            return result;
        }

        try {
            transformed = transformFormulaV3(det, det.selectedFunction, det.loopMode, src.name, det.params);
        } catch (e: any) {
            result.v3Transform = { ok: false, error: `transform threw: ${e.message?.slice(0, 120)}` };
            result.failFirstGate = 'v3Transform';
            result.overall = 'fail';
            result.timeMs = Math.round(performance.now() - t0);
            return result;
        }
        if (!transformed) {
            result.v3Transform = { ok: false, error: 'transform returned null' };
            result.failFirstGate = 'v3Transform';
            result.overall = 'fail';
            result.timeMs = Math.round(performance.now() - t0);
            return result;
        }
        const isFullDE = transformed.warnings?.some(w => w.includes('full-DE')) ?? false;
        result.v3Transform = { ok: true, mode: isFullDE ? 'full-DE' : 'per-iteration' };
        detParams = det.params as any;
    }

    // Gather uniform defaults from V3 param slot assignments.
    // Engine slots: uIterations, uParamA..F, uVec2A..C, uVec3A..C, uVec4A..C
    const uniforms: Record<string, number | number[] | boolean> = {
        uIterations:   16,
        uEscapeThresh: 1000,
        uJuliaMode:    0,
        uJulia:        [0, 0, 0],
        uCameraPosition:  [0, 0, -3],
        uResolution:   [64, 64],
        uParamA: 1, uParamB: 1, uParamC: 0, uParamD: 0, uParamE: 0, uParamF: 0,
        uVec2A: [0, 0], uVec2B: [0, 0], uVec2C: [0, 0],
        uVec3A: [0, 0, 0], uVec3B: [0, 0, 0], uVec3C: [0, 0, 0],
        uVec4A: [0, 0, 0, 0], uVec4B: [0, 0, 0, 0], uVec4C: [0, 0, 0, 0],
        uSceneOffsetLow: [0, 0, 0], uSceneOffsetHigh: [0, 0, 0],
    };
    let iterationsWasSet = false;
    for (const p of detParams) {
        const slot = p.mappedSlot as string;
        if (!slot || slot === 'ignore' || slot === 'builtin') continue;
        // Slot name → engine uniform name: 'paramA' → 'uParamA', 'vec3B' → 'uVec3B', etc.
        const uniName = 'u' + slot[0].toUpperCase() + slot.slice(1);
        if (slot === 'iterations') {
            uniforms.uIterations = Math.max(4, Number(p.defaultValue) || 16);
            iterationsWasSet = true;
        } else if (typeof p.defaultValue === 'number') {
            uniforms[uniName] = p.defaultValue;
        } else if (Array.isArray(p.defaultValue)) {
            uniforms[uniName] = p.defaultValue;
        } else if (typeof p.defaultValue === 'boolean') {
            uniforms[uniName] = p.defaultValue ? 1 : 0;
        }
    }

    // Match hardcoded `for (int i = 0; i < N; …)` patterns.
    // V3's full-DE mode rewrites such loops as `i < MAX_HARD_ITERATIONS` + an
    // `if (i >= int(uIterations)) break;` inside. So uIterations controls iteration
    // count at runtime. Authors calibrate DE stability for their specific N,
    // and running more iterations than N can drive the DE to NaN (classic
    // Mandelbox divergence). If the source has a hardcoded limit and no
    // explicit Iterations uniform, honour the hardcoded value.
    if (!iterationsWasSet) {
        const m = src.source.match(/for\s*\(\s*int\s+\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*(\d+)\s*;/);
        if (m) {
            const hardcoded = parseInt(m[1], 10);
            if (hardcoded >= 4 && hardcoded <= 200) {
                uniforms.uIterations = hardcoded;
            }
        }
    }

    // Build the two shaders.
    // Each shader needs a unique MAX_HARD_ITERATIONS to defeat driver shader cache.
    const iterBase = 500 - (Math.floor(Math.random() * 400));

    // Sample shader: lightweight scaffold, fast, checks DE numerical validity.
    const sampleShader = buildShader(transformed, SAMPLE_MAIN, iterBase + 1);

    // Compile shader: for BOTH V3 and V4, use the REAL engine ShaderFactory
    // path — same chain the Workshop uses at runtime. Prevents harness from
    // over-estimating by testing a simplified scaffold.
    let compileShader: string;

    // V3 path: mirror Workshop's buildAndRegister — synthesize a
    // FractalDefinition from the V3 transform, register, then ShaderFactory.
    if (PIPELINE !== 'v4' && transformed) {
        try {
            const mappings = (detParams as any[]).map(p => ({
                name: p.name, type: 'float', mappedSlot: p.mappedSlot ?? 'ignore',
                fixedValue: String(p.defaultValue ?? 0),
                uiMin: 0, uiMax: 1, uiStep: 0.01,
                uiDefault: p.defaultValue ?? 0,
            }));
            const { uiParams, defaultPreset } = buildFractalParams(mappings as any, src.name);
            const v3Def: FractalDefinition = {
                id: src.name as any,
                name: src.name,
                shader: {
                    function: (transformed.uniforms ? transformed.uniforms + '\n\n' : '') + transformed.function,
                    loopBody: transformed.loopBody,
                    getDist: transformed.getDist,
                    loopInit: transformed.loopInit,
                },
                parameters: uiParams,
                defaultPreset,
            };
            registry.register(v3Def);
            const config = buildFullShaderConfig(v3Def.id);
            let raw = ShaderFactory.generateFragmentShader(config);
            if (!/^\s*#version/.test(raw)) raw = '#version 300 es\n' + raw;
            const nonce = `const int _gmt_nonce = ${Math.floor(Math.random() * 1e9)};`;
            raw = raw.replace(/^(#version[^\n]*\n)/, `$1${nonce}\n`);
            compileShader = raw;
        } catch (e: any) {
            result.overall = 'fail';
            result.failFirstGate = 'webglCompile';
            result.webglCompile = {
                ok: false, stage: 'shaderFactory',
                error: `V3 ShaderFactory failed: ${(e?.message ?? String(e)).slice(0, 200)}`,
            };
            result.timeMs = Math.round(performance.now() - t0);
            return result;
        }
    } else if (PIPELINE === 'v4' && v4Def) {
        try {
            registry.register(v4Def);
            const config = buildFullShaderConfig(v4Def.id);
            let raw = ShaderFactory.generateFragmentShader(config);

            // ShaderFactory output does NOT include `#version 300 es` (the engine
            // relies on Three.js's material pipeline to prepend it). We must
            // add it here or WebGL treats the shader as ES 1.00.
            if (!/^\s*#version/.test(raw)) {
                raw = '#version 300 es\n' + raw;
            }

            // Unique nonce to defeat driver shader cache. ES 3.00 global-scope
            // float declarations need an explicit precision qualifier; int is
            // unambiguous so we use that.
            const nonce = `const int _gmt_nonce = ${Math.floor(Math.random() * 1e9)};`;
            raw = raw.replace(/^(#version[^\n]*\n)/, `$1${nonce}\n`);
            compileShader = raw;
        } catch (e: any) {
            result.overall = 'fail';
            result.failFirstGate = 'webglCompile';
            result.webglCompile = {
                ok: false, stage: 'shaderFactory',
                error: `ShaderFactory threw: ${(e?.message ?? String(e)).slice(0, 200)}`,
            };
            result.timeMs = Math.round(performance.now() - t0);
            return result;
        }
    } else {
        compileShader = buildShader(transformed, PREVIEW_MAIN, iterBase);
    }

    // Gate 1: parse — skip entirely. Both V3 and V4 now generate shaders via
    // the real ShaderFactory (~67KB multi-feature engine shader). The AST
    // parser can't handle engine-scale shaders reliably (false positives on
    // well-formed engine code). Browser webglCompile is the authoritative
    // check for actual GLSL validity.
    result.parse = { ok: true };

    // Gates 2–6: browser-side — wrapped in timeout so a hanging shader
    // compile or infinite-loop draw can't stall the whole run.
    // Callers must recover the page/browser if TimeoutError is thrown.
    const browserResult = await withTimeout(
        page.evaluate(async ({ name, compileShader, sampleShader, uniforms }) => {
            return await (window as any).runValidation({ name, compileShader, sampleShader, uniforms });
        }, { name: src.name, compileShader, sampleShader, uniforms }),
        timeoutMs,
        `evaluate(${src.name})`,
    );

    Object.assign(result, {
        webglCompile:        browserResult.webglCompile,
        renderNonDegenerate: browserResult.renderNonDegenerate,
        sampleShaderCompile: browserResult.sampleShaderCompile,
        sampleFinite:        browserResult.sampleFinite,
        sampleNonConstant:   browserResult.sampleNonConstant,
        gradientFinite:      browserResult.gradientFinite,
        overall:             browserResult.overall,
        failFirstGate:       browserResult.failFirstGate,
    });

    // Save thumbnail PNG for both passes and fails — failure thumbnails help
    // diagnose renderNonDegenerate rejections and compile-ok-but-broken formulas.
    if (browserResult.thumbnailPNG) {
        const hash = crypto.createHash('sha1').update(src.name).digest('hex').slice(0, 10);
        const pngPath = path.join(OUT_THUMBS, `${hash}.png`);
        const base64 = browserResult.thumbnailPNG.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(pngPath, Buffer.from(base64, 'base64'));
        result.thumbnail = `thumbnails/${hash}.png`;
    }

    result.timeMs = Math.round(performance.now() - t0);
    return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    // Collect sources
    let sources: FormulaSource[] = [];
    if (SINGLE === 'default' || !SINGLE) {
        if (!ONLY_DEC && !ONLY_FRAG) sources.push(getDefaultScript());
    }
    if (!ONLY_DEC && !SINGLE) sources.push(...discoverFragFiles());
    if (!ONLY_FRAG && !SINGLE) {
        sources.push(...DEC_FRACTALS.map(d => ({
            name: d.id, category: 'dec' as const, source: d.code,
        })));
    }

    if (FILTER) sources = sources.filter(s => s.name.toLowerCase().includes(FILTER.toLowerCase()));

    if (SINGLE && SINGLE !== 'default') {
        // Single-formula mode: look up by exact name
        sources = sources.filter(s => s.name === SINGLE);
        if (sources.length === 0) {
            // Try partial match
            const all = [getDefaultScript(), ...discoverFragFiles(), ...DEC_FRACTALS.map(d => ({ name: d.id, category: 'dec' as const, source: d.code }))];
            sources = all.filter(s => s.name.toLowerCase().includes(SINGLE.toLowerCase()));
        }
    }

    if (sources.length === 0) {
        console.error('No formulas matched filter');
        process.exit(1);
    }

    // Ensure output dirs
    if (!fs.existsSync(OUT_THUMBS)) fs.mkdirSync(OUT_THUMBS, { recursive: true });

    // Resume: skip formulas already in the jsonl unless --fresh
    const done = new Set<string>();
    if (!FRESH && fs.existsSync(OUT_JSONL)) {
        const existing = fs.readFileSync(OUT_JSONL, 'utf8').trim().split('\n').filter(Boolean);
        for (const line of existing) {
            try { done.add(JSON.parse(line).name); } catch {}
        }
        const before = sources.length;
        sources = sources.filter(s => !done.has(s.name));
        if (before > sources.length) {
            console.log(`  --resume: skipping ${before - sources.length} already-tested formula${before - sources.length === 1 ? '' : 's'}`);
        }
    } else {
        fs.writeFileSync(OUT_JSONL, '');
    }

    if (sources.length === 0) {
        console.log('  Nothing to do (all formulas already verified; use --fresh to re-run).');
        process.exit(0);
    }

    console.log(`\n  V4 Verify — ${sources.length} formula${sources.length > 1 ? 's' : ''} (timeout ${TIMEOUT_MS}ms, recycle every ${RECYCLE_EVERY})`);
    console.log(`  Output:  ${OUT_JSONL}`);
    console.log(`  Thumbs:  ${OUT_THUMBS}\n`);

    // ── Browser lifecycle helpers ──────────────────────────────────────────

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
            page.on('console', msg => console.log(`  [browser ${msg.type()}] ${msg.text()}`));
            page.on('pageerror', err => console.log(`  [browser error] ${err.message}`));
        }
        page.on('crash', () => console.log(`  [recovery] page.crash event`));

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

    async function closePage(page: Page): Promise<void> {
        // Force close — don't wait for in-flight GL work
        try { await withTimeout(page.close({ runBeforeUnload: false }), 3_000); } catch {}
        try { await withTimeout(page.context().close(), 3_000); } catch {}
    }

    async function forceBrowserClose(browser: Browser): Promise<void> {
        try { await withTimeout(browser.close(), 5_000); return; } catch {}
        // browser.close() hung — kill the process
        try {
            const proc = browser.process();
            if (proc && !proc.killed) proc.kill('SIGKILL');
        } catch {}
    }

    // ── Main loop with recovery ────────────────────────────────────────────

    let browser = await launch();
    let page = await openPage(browser);
    let consecutiveFailures = 0;

    let pass = 0, fail = 0, skip = 0, timeouts = 0;
    const startTime = performance.now();
    const failByGate: Record<string, number> = {};

    // Graceful shutdown on Ctrl+C — writes summary before exiting
    let aborted = false;
    process.on('SIGINT', () => { aborted = true; console.log('\n  [SIGINT] finishing current formula then exiting…'); });

    for (let i = 0; i < sources.length; i++) {
        if (aborted) break;
        const src = sources[i];

        let r: FormulaResult;
        let recoveryNeeded: 'page' | 'browser' | null = null;

        try {
            r = await verifyFormula(page, src, TIMEOUT_MS);
            consecutiveFailures = 0;
        } catch (e: any) {
            const isTimeout = e instanceof TimeoutError;
            r = {
                name: src.name,
                category: src.category,
                fragPath: src.fragPath,
                parse: { ok: false, error: isTimeout ? 'n/a (timeout before parse)' : e.message },
                overall: 'fail',
                failFirstGate: isTimeout ? 'timeout' : 'browserCrash',
                timeMs: isTimeout ? TIMEOUT_MS : 0,
            };
            if (isTimeout) timeouts++;
            consecutiveFailures++;
            recoveryNeeded = consecutiveFailures >= MAX_CONSECUTIVE_FAILS ? 'browser' : 'page';
        }

        // Tally
        if (r.overall === 'pass') pass++;
        else if (r.overall === 'fail') fail++;
        else skip++;
        if (r.overall === 'fail' && r.failFirstGate) {
            failByGate[r.failFirstGate] = (failByGate[r.failFirstGate] || 0) + 1;
        }

        fs.appendFileSync(OUT_JSONL, JSON.stringify(r) + '\n');

        const icon = r.overall === 'pass' ? '\x1b[32m✓\x1b[0m'
                   : r.overall === 'fail' ? '\x1b[31m✗\x1b[0m'
                   : '\x1b[2m○\x1b[0m';
        const gateInfo = r.failFirstGate ? ` [\x1b[31m${r.failFirstGate}\x1b[0m]` : '';
        process.stdout.write(`  ${icon} [${(i+1).toString().padStart(4)}/${sources.length}] ${r.name.padEnd(40)} ${(r.timeMs+'ms').padStart(7)}${gateInfo}\n`);

        if (VERBOSE && r.overall === 'fail') {
            const err = r.parse.error || r.webglCompile?.error || r.sampleShaderCompile?.error || (r.failFirstGate && (r as any)[r.failFirstGate]?.reason);
            if (err) console.log(`      └── ${err.split('\n')[0].slice(0, 120)}`);
        }

        // Recovery step
        if (recoveryNeeded === 'browser') {
            console.log(`  [recovery] restarting browser (${consecutiveFailures} consecutive failures)`);
            await forceBrowserClose(browser);
            browser = await launch();
            page = await openPage(browser);
            consecutiveFailures = 0;
        } else if (recoveryNeeded === 'page') {
            console.log(`  [recovery] recycling page (timeout on ${src.name})`);
            await closePage(page);
            page = await openPage(browser);
        } else if ((i + 1) % RECYCLE_EVERY === 0 && i + 1 < sources.length) {
            // Periodic GPU-memory hygiene
            if (VERBOSE) console.log(`  [recycle] after ${RECYCLE_EVERY} formulas`);
            await closePage(page);
            page = await openPage(browser);
        }
    }

    await forceBrowserClose(browser);

    const totalSec = ((performance.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  ────────────────────────────────────────`);
    console.log(`  \x1b[32m${pass} pass\x1b[0m  \x1b[31m${fail} fail\x1b[0m  \x1b[2m${skip} skip\x1b[0m`
              + (timeouts > 0 ? `  \x1b[33m(${timeouts} timeout${timeouts===1?'':'s'})\x1b[0m` : '')
              + `  (${totalSec}s)`);
    if (fail > 0) {
        console.log(`\n  Failures by first-failing gate:`);
        const sortedGates = Object.entries(failByGate).sort((a, b) => b[1] - a[1]);
        for (const [gate, count] of sortedGates) {
            console.log(`    ${gate.padEnd(28)} ${count}`);
        }
    }
    console.log(`\n  Results:    ${OUT_JSONL}`);
    console.log(`  Thumbnails: ${OUT_THUMBS}`);
    console.log(`  Re-run or resume: npx tsx debug/v4-verify.mts  (add --fresh to start over)\n`);

    process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
