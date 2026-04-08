/**
 * Shader Validator — Live GLSL validation with web dashboard
 *
 * Runs all formula sources through the V3 pipeline, builds simulated engine
 * shaders, and validates GLSL. Results stream to a browser dashboard.
 *
 * Usage:
 *   npx tsx debug/shader-validator.mts              # Test all (DEC + frags + default)
 *   npx tsx debug/shader-validator.mts --quick      # Default + frags only (skip DEC)
 *   npx tsx debug/shader-validator.mts --frags      # Only .frag files
 *   npx tsx debug/shader-validator.mts --dec        # Only DEC formulas
 *   npx tsx debug/shader-validator.mts --webgl      # GPU compile validation (opens browser)
 *   npx tsx debug/shader-validator.mts de219        # Filter by name
 *
 * Results saved to: debug/shader-validator-results.jsonl
 *
 * --webgl mode:
 *   Phase 1: GLSL parse validation in Node.js (fast)
 *   Phase 2: WebGL2 GPU compilation in browser (catches type/dimension errors)
 *   Results include webglStatus: 'pass'|'fail' and webglError for failures
 *
 * Dashboard: http://localhost:3333
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@shaderfrog/glsl-parser';
import { detectFormulaV3, transformFormulaV3 } from '../features/fragmentarium_import/v3/compat.ts';
import { detectDECFormat } from '../features/fragmentarium_import/parsers/dec-detector.ts';
import { preprocessDEC } from '../features/fragmentarium_import/parsers/dec-preprocessor.ts';
import { DEC_FRACTALS } from '../features/fragmentarium_import/random-formulas.ts';
import type { TransformedFormulaV2 } from '../features/fragmentarium_import/types.ts';

// ─── CLI args ────────────────────────────────────────────────────────────────

const ONLY_FRAGS = process.argv.includes('--frags');
const ONLY_DEC   = process.argv.includes('--dec');
const QUICK      = process.argv.includes('--quick');  // default + frags only (skip DEC)
const WEBGL      = process.argv.includes('--webgl');  // enable WebGL GPU compile validation
const FILTER     = process.argv.slice(2).find(a => !a.startsWith('-'));
const PORT       = 3333;

// ─── Engine shader scaffold ──────────────────────────────────────────────────
// Mirrors the preview shader configuration: DE_MASTER with simplified lighting.
// This is what WebGL actually compiles when a formula is imported.

const ENGINE_SCAFFOLD = `#version 300 es
precision highp float;
precision highp int;

// ── Engine uniforms (DDFS) ──
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

// ── Engine defines ──
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
// NOTE: Phi and TWO_PI intentionally NOT #defined here — some formulas
// use 'Phi' as a variable name. These come from MathUtils.frag builtins
// which are injected per-formula when #include is detected.

// ── Engine helpers (stubs) ──
float getLength(vec3 p) { return length(p); }
void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}
vec3 applyPrecisionOffset(vec3 p, vec3 lo, vec3 hi) { return p + lo; }
void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {
    float r2 = dot(z, z);
    float t = clamp(fixedR / max(r2, minR), 1.0, fixedR / minR);
    z *= t; dz *= t;
}
void boxFold(inout vec3 z, inout float dz, float foldLimit) {
    z = clamp(z, -foldLimit, foldLimit) * 2.0 - z;
}
// frag_boxFold — NOT in scaffold; injected per-formula via FRAG_BUILTIN_FOLDS
// Rotation helpers — provided by engine (math.ts)
mat2 rotate2D(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
mat3 rotate3D(float a, vec3 v) { float c=cos(a),s=sin(a),t=1.0-c; vec3 n=normalize(v); return mat3(t*n.x*n.x+c,t*n.x*n.y-s*n.z,t*n.x*n.z+s*n.y,t*n.x*n.y+s*n.z,t*n.y*n.y+c,t*n.y*n.z-s*n.x,t*n.x*n.z-s*n.y,t*n.y*n.z+s*n.x,t*n.z*n.z+c); }
// NOTE: rotationMatrix3, rotationMatrix2, Rotate2D, rotationMatrixXYZ, rotationMatrix
// are NOT engine-provided — they come from FRAG_BUILTIN_ROTATIONS injected per-formula.

// ── Engine noise functions (from shaders/chunks/math.ts, LAYER3_ENABLED) ──
// These are always compiled in the real engine. Formulas that define their own
// overloads (e.g. mod289(vec2), permute(vec3)) will collide unless renamed.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) { return 0.0; } // stub — real impl in math.ts

// ── Coloring globals ──
vec4 g_orbitTrap = vec4(1e10);
float escape = 0.0;
// DEC/Shadertoy compatibility
#define time uTime

// ── Raytracer/include stubs (GMT provides its own raytracer, but formulas
//    may reference these from DE-Raytracer.frag includes) ──
uniform vec3 BackgroundColor;
uniform vec3 SpotLightPos;
uniform vec3 SpotLightDir;
uniform float subframe;
uniform vec2 iResolution;
uniform float iGlobalTime;
uniform float pixelSize;
uniform float rCoC;
uniform sampler2D frontbuffer;
vec3 from = vec3(0.0);
vec3 Dir = vec3(0.0, 0.0, 1.0);
vec2 coord = vec2(0.0);
float surface = 0.0;
float volume = 0.0;

// ═══════════════════════════════════════════════════════════════════════
// FORMULA CODE INJECTED HERE
// ═══════════════════════════════════════════════════════════════════════

{{FORMULA_UNIFORMS}}

{{FORMULA_FUNCTIONS}}

{{GET_DIST}}

// ═══════════════════════════════════════════════════════════════════════
// DE_MASTER (preview configuration — simplified lighting)
// ═══════════════════════════════════════════════════════════════════════

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

// ── Preview lighting (simplified N·L) ──
out vec4 fragColor;
void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec3 ro = uCameraPosition;
    vec3 rd = normalize(vec3(uv - 0.5, 1.0));
    float t = 0.0;
    for (int i = 0; i < 128; i++) {
        vec4 d = map(ro + rd * t);
        if (d.x < 0.001 || t > MAX_DIST) break;
        t += d.x;
    }
    float fog = exp(-t * 0.1);
    fragColor = vec4(vec3(fog), 1.0);
}
`;

// ─── Formula test sources ────────────────────────────────────────────────────

interface FormulaSource {
    name: string;
    category: 'default' | 'frag' | 'dec';
    source: string;
    /** Relative path within reference/Examples/ (frag only) */
    fragPath?: string;
}

function discoverFragFiles(): FormulaSource[] {
    const refDir = path.resolve('features/fragmentarium_import/reference/Examples');
    const results: FormulaSource[] = [];

    function walk(dir: string) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.frag')) {
                const rel = path.relative(refDir, full).replace(/\\/g, '/');
                const name = path.basename(entry.name, '.frag');
                results.push({
                    name: `${name}`,
                    category: 'frag',
                    source: fs.readFileSync(full, 'utf8'),
                    fragPath: rel,
                });
            }
        }
    }
    walk(refDir);
    return results;
}

function getDefaultScript(): FormulaSource {
    return {
        name: 'DEFAULT_SCRIPT (Mandelbox)',
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

function getDECSources(): FormulaSource[] {
    return DEC_FRACTALS.map(d => ({
        name: d.id,
        category: 'dec' as const,
        source: d.code,
    }));
}

// ─── Test runner ─────────────────────────────────────────────────────────────

interface TestResult {
    name: string;
    category: string;
    status: 'pass' | 'fail' | 'skip' | 'running';
    mode?: string;
    error?: string;
    errorLine?: string;
    warnings?: string[];
    timeMs: number;
    paramCount?: number;
    /** Relative path within reference/Examples/ (frag only) */
    fragPath?: string;
    glsl?: string;  // Only sent for failures
}

function buildShader(result: TransformedFormulaV2): string {
    const formulaUniforms = (result.uniforms || '')
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//'))
        .join('\n');

    const getDist = result.getDist
        ? `vec2 getDist(float r, float dr, float iter, vec4 z) { ${result.getDist} }`
        : `vec2 getDist(float r, float dr, float iter, vec4 z) { return vec2(0.5 * r * log(r) / max(abs(dr), 1e-20), iter); }`;

    let scaffold = ENGINE_SCAFFOLD;

    // Strip scaffold stubs that the formula re-declares (prevents redefinition errors)
    const allCode = (formulaUniforms + '\n' + (result.function || '')).toLowerCase();
    const STUB_VARS = ['iResolution', 'iGlobalTime', 'pixelSize', 'rCoC', 'subframe', 'frontbuffer'];
    for (const v of STUB_VARS) {
        if (allCode.includes(v.toLowerCase())) {
            // Remove the scaffold line declaring this variable
            scaffold = scaffold.replace(new RegExp(`^.*\\b${v}\\b.*$`, 'gm'), `// (stripped: ${v} — formula provides its own)`);
        }
    }
    // 'escape' is special — it's a global float, not a uniform
    if (/\bfloat\s+escape\b/.test(allCode) || /\buniform\s+float\s+escape\b/.test(allCode)) {
        scaffold = scaffold.replace(/^float escape = 0\.0;$/m, '// (stripped: escape — formula provides its own)');
    }

    // Add a unique nonce to defeat GPU shader caching (Chrome caches aggressively)
    const nonce = `const float _gmt_nonce = ${Math.random().toFixed(10)};`;

    return scaffold
        .replace('{{MAX_ITER}}', '500')
        .replace('{{FORMULA_UNIFORMS}}', nonce + '\n' + formulaUniforms)
        .replace('{{FORMULA_FUNCTIONS}}', result.function || '')
        .replace('{{GET_DIST}}', getDist)
        .replace('{{LOOP_INIT}}', result.loopInit || '')
        .replace('{{LOOP_BODY}}', result.loopBody || '');
}

function validateGLSL(glsl: string): { ok: boolean; error?: string; line?: string } {
    // Names provided by #define (parser can't expand preprocessor)
    const ENGINE_DEFINES = new Set([
        'MAX_HARD_ITERATIONS', 'PI', 'TAU', 'INV_PI', 'INV_TAU',
        'MAX_DIST', 'MISS_DIST', 'BOUNDING_RADIUS', 'M_PI', 'M_2PI', 'M_PI2',
        'Phi', 'TWO_PI',
        'gl_FragCoord', 'gl_FragColor', 'gl_Position', 'fragColor',
        'time', 'iGlobalTime',  // #define time uTime — parser can't expand macros
        // Scaffold uniforms/globals that formulas may reference from raytracer includes
        'subframe', 'rCoC', 'iResolution', 'pixelSize', 'frontbuffer',
        'BackgroundColor', 'SpotLightPos', 'SpotLightDir',
        'from', 'Dir', 'coord', 'surface', 'volume',
        'g_orbitTrap', 'escape',
    ]);
    const FATAL_WARN = [/Encountered undefined variable/, /Encountered undeclared type/];

    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: string) => { warnings.push(String(msg)); };
    try {
        parse(glsl, { quiet: false });
        const fatal = warnings.filter(w => {
            if (!FATAL_WARN.some(p => p.test(w))) return false;
            const m = w.match(/"([^"]+)"/);
            if (m && ENGINE_DEFINES.has(m[1])) return false;
            return true;
        });
        if (fatal.length > 0) {
            return { ok: false, error: `Undeclared: ${fatal.slice(0, 3).join('; ')}` };
        }
        return { ok: true };
    } catch (e: any) {
        const msg = (e?.message ?? String(e));
        // Extract line info
        const lineMatch = msg.match(/(\d+)\s*\|/);
        return {
            ok: false,
            error: msg.split('\n')[0].slice(0, 200),
            line: lineMatch ? lineMatch[1] : undefined,
        };
    } finally {
        console.warn = origWarn;
    }
}

function runTest(src: FormulaSource): TestResult {
    const start = performance.now();

    try {
        // Preprocess DEC if needed
        let processedSource = src.source;
        const decResult = detectDECFormat(src.source);
        if (decResult.isDEC && decResult.confidence > 0.4) {
            const preprocessed = preprocessDEC(src.source);
            processedSource = preprocessed.fragmentariumSource;
        }

        // V3 detection
        const det = detectFormulaV3(processedSource, src.name);
        if ('error' in det) {
            return {
                name: src.name, category: src.category, status: 'skip',
                error: det.error, timeMs: performance.now() - start,
            };
        }

        // V3 transform
        const result = transformFormulaV3(
            det, det.selectedFunction, det.loopMode, src.name, det.params
        );
        if (!result) {
            return {
                name: src.name, category: src.category, status: 'fail',
                error: 'Transform returned null', timeMs: performance.now() - start,
            };
        }

        // Build full shader and validate
        const fullShader = buildShader(result);
        const validation = validateGLSL(fullShader);

        if (!validation.ok) {
            // Extract context around error line
            let errorLine: string | undefined;
            if (validation.line) {
                const lines = fullShader.split('\n');
                const lineNum = parseInt(validation.line, 10);
                const start = Math.max(0, lineNum - 3);
                const end = Math.min(lines.length, lineNum + 2);
                errorLine = lines.slice(start, end)
                    .map((l, i) => `${start + i + 1}${start + i + 1 === lineNum ? '>' : ' '} ${l}`)
                    .join('\n');
            }

            return {
                name: src.name, category: src.category, status: 'fail',
                mode: result.warnings?.find(w => w.includes('full-DE')) ? 'full-DE' : 'per-iter',
                error: validation.error,
                errorLine,
                warnings: result.warnings,
                timeMs: performance.now() - start,
                paramCount: det.params.length,
                glsl: fullShader,
            };
        }

        return {
            name: src.name, category: src.category, status: 'pass',
            mode: result.warnings?.find(w => w.includes('full-DE')) ? 'full-DE' : 'per-iter',
            warnings: result.warnings?.filter(w => !w.includes('full-DE')),
            timeMs: performance.now() - start,
            paramCount: det.params.length,
            glsl: fullShader,  // for WebGL compile check
        };
    } catch (e: any) {
        return {
            name: src.name, category: src.category, status: 'fail',
            error: `Exception: ${e.message?.slice(0, 200)}`,
            timeMs: performance.now() - start,
        };
    }
}

// ─── SSE server ──────────────────────────────────────────────────────────────

const DASHBOARD_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GMT Shader Validator</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Consolas', 'Monaco', monospace; background: #0d1117; color: #c9d1d9; padding: 20px; }
  h1 { color: #58a6ff; margin-bottom: 4px; font-size: 20px; }
  .subtitle { color: #8b949e; margin-bottom: 16px; font-size: 13px; }
  .stats { display: flex; gap: 24px; margin-bottom: 16px; font-size: 14px; }
  .stats .pass { color: #3fb950; } .stats .fail { color: #f85149; }
  .stats .skip { color: #8b949e; } .stats .time { color: #d2a8ff; }
  .progress { height: 4px; background: #21262d; border-radius: 2px; margin-bottom: 16px; overflow: hidden; }
  .progress-bar { height: 100%; background: #58a6ff; transition: width 0.3s; }
  .filters { margin-bottom: 12px; display: flex; gap: 8px; }
  .filters button { padding: 4px 12px; border: 1px solid #30363d; background: #161b22; color: #c9d1d9;
    border-radius: 4px; cursor: pointer; font-size: 12px; font-family: inherit; }
  .filters button.active { border-color: #58a6ff; color: #58a6ff; }
  .filters button:hover { border-color: #58a6ff; }
  .results { display: flex; flex-direction: column; gap: 2px; }
  .result { display: flex; align-items: flex-start; gap: 8px; padding: 4px 8px; border-radius: 4px;
    font-size: 13px; line-height: 1.5; }
  .result:hover { background: #161b22; }
  .result.fail { background: #1a0a0a; }
  .result .icon { flex-shrink: 0; width: 16px; text-align: center; }
  .result .name { min-width: 260px; color: #c9d1d9; }
  .result .cat { min-width: 50px; color: #8b949e; font-size: 11px; }
  .result .mode { min-width: 60px; color: #7ee787; font-size: 11px; }
  .result .time { min-width: 50px; color: #8b949e; font-size: 11px; text-align: right; }
  .result .error { color: #f85149; font-size: 12px; margin-top: 2px; }
  .result .context { color: #8b949e; font-size: 11px; white-space: pre; margin-top: 4px;
    background: #161b22; padding: 4px 8px; border-radius: 3px; overflow-x: auto; }
  .result .warnings { color: #d29922; font-size: 11px; }
  .hidden { display: none !important; }
  .running .icon { animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  .webgl-status { margin-top: 12px; padding: 8px; border: 1px solid #30363d; border-radius: 4px;
    font-size: 12px; color: #8b949e; }
  .webgl-status.compiling { border-color: #58a6ff; color: #58a6ff; }
  .webgl-status.done { border-color: #3fb950; color: #3fb950; }
  .webgl-status.error { border-color: #f85149; color: #f85149; }
  .webgl-fail { color: #f85149; }
  .webgl-pass { color: #3fb950; }
</style>
</head>
<body>
<h1>GMT Shader Validator</h1>
<div class="subtitle">GLSL parse validation + WebGL compile check</div>

<div class="stats">
  <span>Total: <strong id="total">0</strong></span>
  <span class="pass">Pass: <strong id="passed">0</strong></span>
  <span class="fail">Fail: <strong id="failed">0</strong></span>
  <span class="skip">Skip: <strong id="skipped">0</strong></span>
  <span class="time">Time: <strong id="elapsed">0</strong>s</span>
</div>
<div class="progress"><div class="progress-bar" id="bar" style="width:0%"></div></div>

<div class="filters">
  <button class="active" data-filter="all">All</button>
  <button data-filter="fail">Failures</button>
  <button data-filter="default">Default</button>
  <button data-filter="frag">Frag</button>
  <button data-filter="dec">DEC</button>
</div>

<div id="webgl-box" class="webgl-status">WebGL compile: waiting for parse results...</div>
<div id="results" class="results"></div>

<script>
const results = document.getElementById('results');
const bar = document.getElementById('bar');
const els = { total: document.getElementById('total'), passed: document.getElementById('passed'),
  failed: document.getElementById('failed'), skipped: document.getElementById('skipped'),
  elapsed: document.getElementById('elapsed') };
let counts = { total: 0, pass: 0, fail: 0, skip: 0 };
let startTime = Date.now();
let activeFilter = 'all';
const allResults = [];
const failedShaders = []; // { name, glsl } for WebGL compile

// Filters
document.querySelector('.filters').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    activeFilter = e.target.dataset.filter;
    document.querySelectorAll('.filters button').forEach(b => b.classList.toggle('active', b.dataset.filter === activeFilter));
    allResults.forEach(el => {
        const cat = el.dataset.category;
        const status = el.dataset.status;
        const show = activeFilter === 'all' || activeFilter === cat || (activeFilter === 'fail' && status === 'fail');
        el.classList.toggle('hidden', !show);
    });
});

// SSE stream
const evtSource = new EventSource('/stream');
evtSource.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.type === 'total') {
        counts.total = d.count;
        els.total.textContent = d.count;
        return;
    }
    if (d.type === 'done') {
        evtSource.close();
        bar.style.background = counts.fail > 0 ? '#f85149' : '#3fb950';
        bar.style.width = '100%';
        // Start WebGL compile check
        runWebGLValidation();
        return;
    }
    if (d.type !== 'result') return;
    const r = d.result;

    if (r.status === 'pass') counts.pass++;
    else if (r.status === 'fail') counts.fail++;
    else if (r.status === 'skip') counts.skip++;

    els.passed.textContent = counts.pass;
    els.failed.textContent = counts.fail;
    els.skipped.textContent = counts.skip;
    els.elapsed.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
    const progress = (counts.pass + counts.fail + counts.skip) / counts.total * 100;
    bar.style.width = progress + '%';

    const icon = r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '○';
    const iconColor = r.status === 'pass' ? '#3fb950' : r.status === 'fail' ? '#f85149' : '#8b949e';

    const div = document.createElement('div');
    div.className = 'result ' + r.status;
    div.dataset.category = r.category;
    div.dataset.status = r.status;
    const show = activeFilter === 'all' || activeFilter === r.category || (activeFilter === 'fail' && r.status === 'fail');
    if (!show) div.classList.add('hidden');

    let html = '<span class="icon" style="color:' + iconColor + '">' + icon + '</span>'
        + '<span class="name">' + esc(r.name) + '</span>'
        + '<span class="cat">' + r.category + '</span>'
        + '<span class="mode">' + (r.mode || '') + '</span>'
        + '<span class="time">' + r.timeMs.toFixed(0) + 'ms</span>';

    if (r.error) {
        html += '<div class="error">' + esc(r.error) + '</div>';
    }
    if (r.errorLine) {
        html += '<pre class="context">' + esc(r.errorLine) + '</pre>';
    }
    if (r.warnings && r.warnings.length > 0) {
        html += '<div class="warnings">' + r.warnings.map(w => '⚠ ' + esc(w)).join('<br>') + '</div>';
    }
    div.innerHTML = html;
    // Failures at top
    if (r.status === 'fail') results.prepend(div);
    else results.appendChild(div);
    allResults.push(div);

    // Collect failed shaders for WebGL
    if (r.glsl) failedShaders.push({ name: r.name, glsl: r.glsl });
};

function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }

// ─── WebGL compile validation ──────────────────────────────────────────────
async function runWebGLValidation() {
    const box = document.getElementById('webgl-box');
    box.className = 'webgl-status compiling';
    box.textContent = 'WebGL compile: loading shaders...';

    try {
        const resp = await fetch('/all-shaders');
        const allShaders = await resp.json();

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) { box.textContent = 'WebGL2 not available'; box.className = 'webgl-status error'; return; }

        let webglFails = 0;
        let webglPass = 0;
        const vertSrc = '#version 300 es\\nin vec4 position;\\nvoid main(){gl_Position=position;}';
        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, vertSrc);
        gl.compileShader(vertShader);

        // Process one at a time — shaders can take 10s+ each on GPU
        for (let i = 0; i < allShaders.length; i++) {
            const { name, glsl } = allShaders[i];
            box.textContent = 'WebGL compile: ' + (i + 1) + '/' + allShaders.length + ' — ' + name + '...';
            // Yield to browser so UI updates and user can close tab to abort
            await new Promise(r => setTimeout(r, 10));

            const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragShader, glsl);
            gl.compileShader(fragShader);
            const ok = gl.getShaderParameter(fragShader, gl.COMPILE_STATUS);

            const errorLog = ok ? null : (gl.getShaderInfoLog(fragShader) || 'compile failed');

            // Post result back to server for JSONL recording
            fetch('/webgl-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'result',
                    name,
                    status: ok ? 'pass' : 'fail',
                    error: errorLog ? errorLog.split('\\n').slice(0, 5).join('\\n') : undefined,
                }),
            }).catch(() => {});

            if (!ok) {
                webglFails++;
                const existingDiv = allResults.find(d => d.querySelector('.name')?.textContent === name);
                if (existingDiv) {
                    existingDiv.classList.add('fail');
                    existingDiv.dataset.status = 'fail';
                    const errDiv = document.createElement('div');
                    errDiv.className = 'error webgl-fail';
                    errDiv.textContent = '🔴 WebGL: ' + errorLog.split('\\n')[0];
                    existingDiv.appendChild(errDiv);
                    results.prepend(existingDiv);
                } else {
                    const div = document.createElement('div');
                    div.className = 'result fail';
                    div.dataset.category = 'webgl';
                    div.dataset.status = 'fail';
                    div.innerHTML = '<span class="icon" style="color:#f85149">✗</span>'
                        + '<span class="name">' + esc(name) + '</span>'
                        + '<span class="cat">webgl</span>'
                        + '<div class="error webgl-fail">🔴 WebGL: ' + esc(errorLog.split('\\n')[0]) + '</div>';
                    results.prepend(div);
                    allResults.push(div);
                }
            } else {
                webglPass++;
                const existingDiv = allResults.find(d => d.querySelector('.name')?.textContent === name);
                if (existingDiv && existingDiv.dataset.status === 'pass') {
                    const check = existingDiv.querySelector('.icon');
                    if (check) check.textContent = '✓✓';
                }
            }
            gl.deleteShader(fragShader);
        }
        gl.deleteShader(vertShader);

        box.className = webglFails > 0 ? 'webgl-status error' : 'webgl-status done';
        box.innerHTML = 'WebGL compile: <span class="webgl-pass">' + webglPass + ' pass</span>'
            + (webglFails > 0 ? ', <span class="webgl-fail">' + webglFails + ' fail</span>' : '')
            + ' / ' + allShaders.length + ' total';

        if (webglFails > 0) {
            counts.fail += webglFails;
            els.failed.textContent = counts.fail;
        }

        // Signal server that WebGL phase is done
        fetch('/webgl-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'done', pass: webglPass, fail: webglFails }),
        }).catch(() => {});
    } catch (e) {
        box.textContent = 'WebGL check error: ' + e.message;
        box.className = 'webgl-status error';
    }
}
</script>
</body>
</html>`;

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    // Collect sources
    const sources: FormulaSource[] = [];

    if (!ONLY_DEC && !ONLY_FRAGS) sources.push(getDefaultScript());
    if (!ONLY_DEC) sources.push(...discoverFragFiles());
    if (!ONLY_FRAGS && !QUICK) sources.push(...getDECSources());

    // Apply filter
    let filtered = FILTER
        ? sources.filter(s => s.name.toLowerCase().includes(FILTER.toLowerCase()))
        : sources;

    // --resume: skip formulas already in the JSONL (for interrupted runs)
    const RESUME = process.argv.includes('--resume');
    if (RESUME) {
        const outputPath = path.resolve('debug/shader-validator-results.jsonl');
        if (fs.existsSync(outputPath)) {
            const existing = fs.readFileSync(outputPath, 'utf8').trim().split('\n').filter(Boolean);
            const done = new Set(existing.map(l => { try { return JSON.parse(l).name; } catch { return ''; } }));
            const before = filtered.length;
            filtered = filtered.filter(s => !done.has(s.name));
            console.log(`  --resume: skipping ${before - filtered.length} already-tested formulas`);
        }
    }

    const NO_SERVER = !WEBGL && (process.argv.includes('--no-server') || filtered.length <= 5);
    const outputPath = path.resolve('debug/shader-validator-results.jsonl');

    console.log(`\n  Shader Validator: ${filtered.length} formulas to test`);
    console.log(`  Categories: ${sources.filter(s => s.category === 'default').length} default, ${sources.filter(s => s.category === 'frag').length} frag, ${sources.filter(s => s.category === 'dec').length} DEC`);
    console.log(`  Output: ${outputPath}`);

    // Clear output file (unless resuming — append to existing)
    if (!RESUME) fs.writeFileSync(outputPath, '');

    // Store for SSE + WebGL endpoint
    let sseClients: http.ServerResponse[] = [];
    const allShaders: { name: string; glsl: string }[] = [];
    let testsDone = false;

    function broadcast(data: any) {
        const msg = `data: ${JSON.stringify(data)}\n\n`;
        for (const client of sseClients) {
            try { client.write(msg); } catch {}
        }
    }

    // WebGL results tracking
    const webglResults = new Map<string, { status: string; error?: string }>();
    let webglDone = false;
    let webglResolve: (() => void) | null = null;
    const webglPromise = new Promise<void>(r => { webglResolve = r; });

    // HTTP server (optional — skip for small runs without --webgl)
    if (!NO_SERVER || WEBGL) {
        const server = http.createServer((req, res) => {
            if (req.url === '/stream') {
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                });
                sseClients.push(res);
                res.write(`data: ${JSON.stringify({ type: 'total', count: filtered.length })}\n\n`);
                if (testsDone) {
                    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
                }
                req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
                return;
            }
            if (req.url === '/all-shaders') {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache',
                });
                res.end(JSON.stringify(allShaders));
                return;
            }
            // WebGL result POST-back from browser
            if (req.url === '/webgl-result' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        if (data.type === 'result') {
                            webglResults.set(data.name, { status: data.status, error: data.error });
                            const wP = [...webglResults.values()].filter(r => r.status === 'pass').length;
                            const wF = [...webglResults.values()].filter(r => r.status === 'fail').length;
                            const icon = data.status === 'pass' ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
                            process.stdout.write(`  WebGL ${icon} ${data.name.padEnd(40)} (${wP}p/${wF}f/${webglResults.size})\n`);
                            // Flush to disk every 10 results for resume-safety
                            if (webglResults.size % 10 === 0) {
                                const combinedPath = path.resolve('debug/shader-validator-results.jsonl');
                                try {
                                    const existingLines = fs.readFileSync(combinedPath, 'utf8').trim().split('\n').filter(Boolean);
                                    const updatedLines = existingLines.map(line => {
                                        const entry = JSON.parse(line);
                                        const wgl = webglResults.get(entry.name);
                                        if (wgl) {
                                            entry.webglStatus = wgl.status;
                                            if (wgl.error) entry.webglError = wgl.error;
                                            // Don't overwrite status — keep GLSL result separate from WebGL
                                        // webglStatus/webglError are the authoritative WebGL fields
                                        }
                                        return JSON.stringify(entry);
                                    });
                                    fs.writeFileSync(combinedPath, updatedLines.join('\n') + '\n');
                                } catch {}
                            }
                        } else if (data.type === 'done') {
                            webglDone = true;
                            // Write combined results
                            const combinedPath = path.resolve('debug/shader-validator-results.jsonl');
                            const existingLines = fs.readFileSync(combinedPath, 'utf8').trim().split('\n').filter(Boolean);
                            const updatedLines = existingLines.map(line => {
                                const entry = JSON.parse(line);
                                const wgl = webglResults.get(entry.name);
                                if (wgl) {
                                    entry.webglStatus = wgl.status;
                                    if (wgl.error) entry.webglError = wgl.error;
                                    // Don't overwrite status — keep GLSL result separate from WebGL
                                    // webglStatus/webglError are the authoritative WebGL fields
                                }
                                return JSON.stringify(entry);
                            });
                            fs.writeFileSync(combinedPath, updatedLines.join('\n') + '\n');

                            const wglPass = [...webglResults.values()].filter(r => r.status === 'pass').length;
                            const wglFail = [...webglResults.values()].filter(r => r.status === 'fail').length;
                            console.log(`\n  \x1b[36mWebGL compile:\x1b[0m \x1b[32m${wglPass} pass\x1b[0m  \x1b[31m${wglFail} fail\x1b[0m  (${webglResults.size} total)`);
                            if (wglFail > 0) {
                                console.log(`  WebGL failures:`);
                                for (const [name, r] of webglResults) {
                                    if (r.status === 'fail') console.log(`    \x1b[31m✗\x1b[0m ${name}: ${r.error?.slice(0, 100)}`);
                                }
                            }
                            console.log(`  Results updated: ${combinedPath}`);
                            console.log(`\n  \x1b[33m📝 Remember to update debug/VALIDATOR_NOTES.md with these findings!\x1b[0m`);
                            if (webglResolve) webglResolve();
                        }
                    } catch {}
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('{"ok":true}');
                });
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
            res.end(DASHBOARD_HTML);
        });
        server.listen(PORT, () => {
            console.log(`  Dashboard: \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
        });
        await new Promise(r => setTimeout(r, 100));
    }
    console.log('');

    // Run tests — async with yields so the HTTP server can respond
    let passed = 0, failed = 0, skipped = 0;
    const startTime = performance.now();
    const TEST_TIMEOUT_MS = 5000;

    for (let idx = 0; idx < filtered.length; idx++) {
        const src = filtered[idx];

        // Run test with timeout to catch hangs
        let result: TestResult;
        try {
            const testPromise = new Promise<TestResult>((resolve) => {
                resolve(runTest(src));
            });
            const timeoutPromise = new Promise<TestResult>((_, reject) => {
                setTimeout(() => reject(new Error('Test timed out (5s)')), TEST_TIMEOUT_MS);
            });
            result = await Promise.race([testPromise, timeoutPromise]);
        } catch (e: any) {
            result = {
                name: src.name, category: src.category, status: 'fail',
                error: e.message, timeMs: TEST_TIMEOUT_MS,
            };
        }

        // Attach fragPath for frag formulas (needed for passing-formulas.ts)
        if (src.fragPath) result.fragPath = src.fragPath;

        if (result.status === 'pass') passed++;
        else if (result.status === 'fail') failed++;
        else skipped++;

        // Collect shader for WebGL compile check
        // Replace MAX_HARD_ITERATIONS with a unique value per shader to defeat GPU cache
        if (result.glsl) {
            const uniqueIter = 500 - allShaders.length;  // 500, 499, 498, ...
            const webglGlsl = result.glsl.replace(
                '#define MAX_HARD_ITERATIONS 500',
                `#define MAX_HARD_ITERATIONS ${uniqueIter}`
            );
            allShaders.push({ name: src.name, glsl: webglGlsl });
        }

        // Stream result to JSONL file immediately (no GLSL blob)
        const { glsl: _glsl, ...savedResult } = result;
        fs.appendFileSync(outputPath, JSON.stringify(savedResult) + '\n');

        // SSE broadcast (no GLSL for passes)
        const sseResult = { ...result };
        if (sseResult.status === 'pass') delete sseResult.glsl;
        broadcast({ type: 'result', result: sseResult });

        // Console output
        const icon = result.status === 'pass' ? '\x1b[32m✓\x1b[0m' : result.status === 'fail' ? '\x1b[31m✗\x1b[0m' : '\x1b[2m○\x1b[0m';
        const time = result.timeMs.toFixed(0).padStart(4) + 'ms';
        process.stdout.write(`  ${icon} ${result.name.padEnd(40)} ${time}`);
        if (result.error) process.stdout.write(`  ${result.error.slice(0, 80)}`);
        process.stdout.write('\n');

        // Yield to event loop so HTTP server can respond
        if (!NO_SERVER) await new Promise(r => setTimeout(r, 0));
    }

    testsDone = true;
    broadcast({ type: 'done' });

    const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  ────────────────────────────────────────`);
    console.log(`  \x1b[32m${passed} pass\x1b[0m  \x1b[31m${failed} fail\x1b[0m  \x1b[2m${skipped} skip\x1b[0m  (${totalTime}s)`);
    console.log(`  Results: ${outputPath}`);

    if (WEBGL) {
        console.log(`\n  \x1b[36mPhase 2: WebGL GPU compilation\x1b[0m`);
        console.log(`  Opening browser for GPU validation...`);
        console.log(`  (${allShaders.length} shaders to compile — ~10s each, Ctrl+C to stop)\n`);
        // Auto-open browser
        const { exec } = await import('child_process');
        const url = `http://localhost:${PORT}`;
        if (process.platform === 'win32') exec(`start ${url}`);
        else if (process.platform === 'darwin') exec(`open ${url}`);
        else exec(`xdg-open ${url}`);
        // Wait for WebGL results to come back
        await webglPromise;
        console.log(`\n  \x1b[33m📝 Remember to update debug/VALIDATOR_NOTES.md with these findings!\x1b[0m`);
        console.log(`\n  Done. Ctrl+C to exit.\n`);
    } else if (NO_SERVER) {
        process.exit(0);
    } else {
        console.log(`  WebGL compile check available at \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
        console.log(`  Press Ctrl+C to stop\n`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
