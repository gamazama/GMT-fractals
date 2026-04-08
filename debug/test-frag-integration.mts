/**
 * Fragmentarium Importer — Integration Test Suite
 *
 * Full pipeline test: detect → transform → parameter build → shader assembly → GLSL validation.
 * Tests the entire import chain including simulated shader compilation context.
 *
 * Run:
 *   npx tsx debug/test-frag-integration.mts                    # All registered tests
 *   npx tsx debug/test-frag-integration.mts --discover         # Auto-discover all .frag files
 *   npx tsx debug/test-frag-integration.mts --random 10        # 10 random formulas
 *   npx tsx debug/test-frag-integration.mts --verbose          # Full GLSL output
 *   npx tsx debug/test-frag-integration.mts --json             # JSON report to stdout
 *   npx tsx debug/test-frag-integration.mts Menger             # Filter by name
 *   npx tsx debug/test-frag-integration.mts 3DickUlus/Magnet  # Filter by path fragment
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@shaderfrog/glsl-parser';
import { detectFormulaV3, transformFormulaV3 } from '../features/fragmentarium_import/v3/compat.ts';
import { buildFractalParams, filterDeadParams } from '../features/fragmentarium_import/workshop/param-builder.ts';
import { slotToUniform } from '../features/fragmentarium_import/transform/variable-renamer.ts';
import type { TransformedFormulaV2, FragDocumentV2, WorkshopParam } from '../features/fragmentarium_import/types.ts';

// ─── CLI args ────────────────────────────────────────────────────────────────

const VERBOSE  = process.argv.includes('--verbose');
const JSON_OUT = process.argv.includes('--json');
const DISCOVER = process.argv.includes('--discover');
const RANDOM_IDX = process.argv.indexOf('--random');
const RANDOM_N = RANDOM_IDX >= 0 ? parseInt(process.argv[RANDOM_IDX + 1] || '10', 10) : 0;
// Build a set of argv values to skip when searching for the name filter
const skipArgs = new Set(['--verbose', '--json', '--discover', '--random']);
if (RANDOM_IDX >= 0) skipArgs.add(String(RANDOM_N)); // skip the number after --random
// Filter supports: bare name ("Magnet"), path fragment ("3DickUlus/Magnet"), or partial match
const FILTER   = process.argv.slice(2).find(a =>
    !skipArgs.has(a) && !a.startsWith('-') && !a.includes('test-frag')
);

const REF  = 'features/fragmentarium_import/reference/Examples';
const ROOT = path.resolve('h:/GMT/gmt-0.8.5');

// ─── Formatting ──────────────────────────────────────────────────────────────

const c = {
    ok:   (s: string) => `\x1b[32m✓\x1b[0m  ${s}`,
    err:  (s: string) => `\x1b[31m✗\x1b[0m  ${s}`,
    wrn:  (s: string) => `\x1b[33m⚠\x1b[0m  ${s}`,
    glsl: (s: string) => `\x1b[35m⚡\x1b[0m  ${s}`,
    dim:  (s: string) => `\x1b[2m${s}\x1b[0m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

// ─── GLSL scope constants ────────────────────────────────────────────────────

const GLSL_BUILTINS = new Set([
    'abs','acos','all','any','asin','atan','ceil','clamp','cos','cross','degrees',
    'distance','dot','equal','exp','exp2','faceforward','floor','fract','gl_FragCoord',
    'greaterThan','greaterThanEqual','inversesqrt','length','lessThan','lessThanEqual',
    'log','log2','mat2','mat3','mat4','max','min','mix','mod','normalize','not',
    'notEqual','outerProduct','pow','radians','reflect','refract','sign','sin',
    'sinh','smoothstep','sqrt','step','tan','tanh','transpose',
    'bool','bvec2','bvec3','bvec4','float','int','ivec2','ivec3','ivec4',
    'uint','uvec2','uvec3','uvec4','vec2','vec3','vec4',
    'true','false','return',
]);
const GMT_GETDIST_SCOPE = new Set([
    'z','dr','r','iter','trap','c',
    'frag_cachedDist','frag_iterCount','frag_DE','g_orbitTrap',
]);

// ─── Engine uniform stubs (simulates what DDFS + ShaderBuilder provides) ─────

const ENGINE_UNIFORM_STUBS = `
// CoreMath uniforms (DDFS)
uniform float uIterations;
uniform float uParamA;
uniform float uParamB;
uniform float uParamC;
uniform float uParamD;
uniform float uParamE;
uniform float uParamF;
uniform vec2  uVec2A;
uniform vec2  uVec2B;
uniform vec2  uVec2C;
uniform vec3  uVec3A;
uniform vec3  uVec3B;
uniform vec3  uVec3C;
uniform vec4  uVec4A;
uniform vec4  uVec4B;
uniform vec4  uVec4C;
// Geometry uniforms
uniform vec3  uJulia;
uniform float uJuliaMode;
// Quality uniforms
uniform float uEscapeThresh;
uniform float uColorIter;
uniform float uColorMode;
uniform float uColorMode2;
uniform float uUseTexture;
uniform float uTextureModeU;
uniform float uTextureModeV;
// Scene
uniform vec3  uSceneOffsetLow;
uniform vec3  uSceneOffsetHigh;
// Engine defines
#define PI 3.14159265358979
#define TAU 6.28318530717959
#define INV_PI 0.31830988618379
#define INV_TAU 0.15915494309190
#define MAX_DIST 100.0
#define MISS_DIST 99.0
#define BOUNDING_RADIUS 20.0
#define MAX_HARD_ITERATIONS 500
// Engine helpers (stubs for parse validation)
float getLength(vec3 p) { return length(p); }
void applyPreRotation(inout vec3 p) {}
void applyPostRotation(inout vec3 p) {}
void applyWorldRotation(inout vec3 p) {}
vec3 applyPrecisionOffset(vec3 p, vec3 lo, vec3 hi) { return p; }
void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR) {}
void boxFold(inout vec3 z, inout float dz, float foldLimit) {}
void frag_boxFold(inout vec3 z, inout float dz, float foldLimit) {}
// Coloring preamble
vec4 g_orbitTrap = vec4(1e10);
float escape = 0.0;
// Common helpers used by DEC formulas
mat2 rotate2D(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
mat3 rotate3D(float a, vec3 v) { return mat3(1.0); }
`;

// ─── Build simulated full shader ─────────────────────────────────────────────

function buildSimulatedShader(result: TransformedFormulaV2): string {
    // Extract non-comment uniform declarations from result.uniforms
    const formulaUniforms = (result.uniforms || '')
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//'))
        .join('\n');

    // Build getDist function
    const getDist = result.getDist
        ? `vec2 getDist(float r, float dr, float iter, vec4 z) { ${result.getDist} }`
        : `vec2 getDist(float r, float dr, float iter, vec4 z) { return vec2(0.5 * r * log(r) / max(abs(dr), 1e-20), iter); }`;

    // Build map() that mirrors the engine's DE_MASTER structure
    const loopInit = result.loopInit || '';
    const loopBody = result.loopBody || '';

    const mapFunc = `
vec4 map(vec3 p) {
    vec3 p_fractal = applyPrecisionOffset(p, uSceneOffsetLow, uSceneOffsetHigh);
    applyWorldRotation(p_fractal);
    vec4 z = vec4(p_fractal, uParamB);
    vec4 c = mix(z, vec4(uJulia, uParamA), step(0.5, uJuliaMode));
    float dr = 1.0;
    float trap = 1e10;
    g_orbitTrap = vec4(1e10);
    float iter = 0.0;
    float smoothIter = 0.0;
    float decomp = 0.0;
    float lastLength = 0.0;
    bool decompCaptured = false;
    vec4 savedOrbitTrap = vec4(1e10);
    float savedTrap = 1e10;
    float savedIter = 0.0;
    bool escaped = false;
    float bailout = max(100.0, uEscapeThresh + 100.0);

    ${loopInit}

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= int(uIterations)) break;
        applyPreRotation(z.xyz);
        float r2_check = dot(z.xyz, z.xyz);
        if (r2_check > bailout) { escaped = true; break; }

        ${loopBody}

        applyPostRotation(z.xyz);
        iter += 1.0;
        float r2 = dot(z.xyz, z.xyz);
        g_orbitTrap = min(g_orbitTrap, abs(vec4(z.xyz, r2)));
        float colorGate = step(iter, uColorIter);
        savedOrbitTrap = mix(savedOrbitTrap, g_orbitTrap, colorGate);
        savedTrap = mix(savedTrap, trap, colorGate);
        savedIter = mix(savedIter, iter, colorGate);
        if (dr > 1.0e10 || r2 > bailout) { escaped = true; break; }
    }

    float r = getLength(z.xyz);
    float safeDr = max(abs(dr), 1.0e-10);
    vec2 distRes = getDist(r, safeDr, iter, z);
    float finalD = distRes.x;
    smoothIter = distRes.y;

    float useColorSnap = step(0.5, uColorIter);
    g_orbitTrap = mix(g_orbitTrap, savedOrbitTrap, useColorSnap);
    trap = mix(trap, savedTrap, useColorSnap);
    float colorIterNorm = mix(iter, savedIter, useColorSnap) / max(uIterations, 1.0);
    float outTrap = trap;
    return vec4(finalD, outTrap, colorIterNorm, decomp);
}
`;

    return [
        ENGINE_UNIFORM_STUBS,
        formulaUniforms,
        result.function,
        getDist,
        mapFunc,
    ].join('\n\n');
}

// ─── Validation ──────────────────────────────────────────────────────────────

interface ValidationResult {
    parseOk: boolean;
    parseError?: string;
    fullShader?: string;
    scopeIssues: string[];
    paramIssues: string[];
    qualitative: string[];
}

function validateFormula(
    result: TransformedFormulaV2,
    doc: FragDocumentV2,
    params: WorkshopParam[],
    formulaName: string,
): ValidationResult {
    const v: ValidationResult = {
        parseOk: true,
        scopeIssues: [],
        paramIssues: [],
        qualitative: [],
    };

    // ── Helper: strict parse capturing undeclared-variable warnings ─────────
    // Names provided by #define or engine context (parser can't expand preprocessor)
    const ENGINE_DEFINES = new Set([
        'MAX_HARD_ITERATIONS', 'PI', 'TAU', 'INV_PI', 'INV_TAU',
        'MAX_DIST', 'MISS_DIST', 'BOUNDING_RADIUS', 'M_PI', 'M_2PI', 'M_PI2',
    ]);
    const FATAL_WARN = [/Encountered undefined variable/, /Encountered undeclared type/];
    function strictParse(glsl: string): { ok: boolean; error?: string } {
        const warnings: string[] = [];
        const origWarn = console.warn;
        console.warn = (msg: string) => { warnings.push(String(msg)); };
        try {
            parse(glsl);
            const fatal = warnings.filter(w => {
                if (!FATAL_WARN.some(p => p.test(w))) return false;
                // Extract the identifier name and skip engine #defines
                const m = w.match(/"([^"]+)"/);
                if (m && ENGINE_DEFINES.has(m[1])) return false;
                return true;
            });
            if (fatal.length > 0) return { ok: false, error: `Undeclared identifiers: ${fatal.slice(0, 3).join('; ')}` };
            return { ok: true };
        } catch (e: any) {
            return { ok: false, error: (e?.message ?? String(e)).split('\n')[0].slice(0, 200) };
        } finally {
            console.warn = origWarn;
        }
    }

    // ── 1. GLSL parse check (formula code only — syntax errors) ────────────
    const uniformStubs = (result.uniforms || '')
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('//'))
        .join('\n');
    try {
        parse(uniformStubs + '\n' + result.function, { quiet: true });
    } catch (e: any) {
        v.parseOk = false;
        v.parseError = (e?.message ?? String(e)).split('\n')[0].slice(0, 200);
    }

    // ── 2. Full shader assembly strict check ─────────────────────────────────
    // Simulates what WebGL will see. Uses strict parse to catch undeclared
    // variables that the syntax-only check misses.
    if (v.parseOk) {
        const shaderCheck = strictParse(buildSimulatedShader(result));
        if (!shaderCheck.ok) {
            v.parseOk = false;
            v.parseError = `Full-shader: ${shaderCheck.error}`;
            try { v.fullShader = buildSimulatedShader(result); } catch {}
        }
    }

    // ── 3. getDist scope check ───────────────────────────────────────────────
    if (result.getDist) {
        const validInGetDist = new Set([...GLSL_BUILTINS, ...GMT_GETDIST_SCOPE]);
        for (const m of (result.uniforms ?? '').matchAll(/\bu_(\w+)\b/g)) {
            validInGetDist.add('u_' + m[1]);
        }
        for (const m of (result.uniforms ?? '').matchAll(/\b(u(?:Param|Vec2|Vec3|Vec4)[A-Z])\b/g)) {
            validInGetDist.add(m[1]);
        }
        validInGetDist.add('uIterations'); validInGetDist.add('uJulia'); validInGetDist.add('uJuliaMode');
        for (const h of doc.helperFunctions) validInGetDist.add(h.name);
        if (doc.deFunction) validInGetDist.add(doc.deFunction.name);
        for (const cg of doc.computedGlobals) validInGetDist.add(cg.name);
        for (const gd of doc.globalDecls) validInGetDist.add(gd.name);

        const expr = result.getDist.replace(/\breturn\s+vec2\s*\(/, '').replace(/,\s*iter\s*\)\s*;/, '');
        const exprNoSwizzle = expr.replace(/\.\w+/g, '');
        for (const m of exprNoSwizzle.matchAll(/\b([A-Z]\w*)\b/g)) validInGetDist.add(m[1]);

        const identifiers = new Set(
            Array.from(exprNoSwizzle.matchAll(/\b([a-zA-Z_]\w*)\b/g), m => m[1])
        );
        for (const id of identifiers) {
            if (!validInGetDist.has(id)) {
                v.scopeIssues.push(`getDist: '${id}' out of scope`);
            }
        }
    }

    // ── 4. Parameter validation ──────────────────────────────────────────────
    const allCode = (result.function || '') + '\n' + (result.loopBody || '') + '\n' + (result.getDist || '') + '\n' + (result.loopInit || '');
    const liveParams = filterDeadParams(params, allCode);
    try {
        const { uiParams, defaultPreset } = buildFractalParams(liveParams, formulaName);

        // Check: all params have valid ids
        const validIds = new Set([
            'paramA','paramB','paramC','paramD','paramE','paramF',
            'vec2A','vec2B','vec2C','vec3A','vec3B','vec3C',
            'vec4A','vec4B','vec4C',
        ]);
        for (const p of uiParams) {
            if (!validIds.has(p.id)) {
                v.paramIssues.push(`Invalid param id '${p.id}' for '${p.label}'`);
            }
            // Check for NaN/Infinity in defaults
            const def = p.default;
            if (typeof def === 'number' && (!isFinite(def) || isNaN(def))) {
                v.paramIssues.push(`NaN/Infinity default for '${p.label}'`);
            }
            if (def && typeof def === 'object') {
                for (const [k, val] of Object.entries(def)) {
                    if (typeof val === 'number' && (!isFinite(val) || isNaN(val))) {
                        v.paramIssues.push(`NaN/Infinity in ${p.label}.${k}`);
                    }
                }
            }
            // Check: min < max
            if (p.min >= p.max) {
                v.paramIssues.push(`Invalid range for '${p.label}': min=${p.min} >= max=${p.max}`);
            }
            // Check: step > 0
            if (p.step <= 0) {
                v.paramIssues.push(`Invalid step for '${p.label}': ${p.step}`);
            }
        }

        // Check: preset has coreMath block
        if (!defaultPreset?.features?.coreMath) {
            v.paramIssues.push('defaultPreset missing features.coreMath');
        }

        // Check: preset param values match uiParams defaults
        const cm = defaultPreset?.features?.coreMath;
        if (cm) {
            for (const p of uiParams) {
                const presetVal = cm[p.id];
                if (presetVal === undefined) {
                    v.paramIssues.push(`Preset missing value for '${p.id}'`);
                }
            }
        }
    } catch (e: any) {
        v.paramIssues.push(`buildFractalParams threw: ${e.message}`);
    }

    // ── 5. Param effectiveness: verify shader code actually uses each mapped uniform ──
    //
    // Categories:
    //   RENAME_FAIL  — original name still in generated code, but uniform wasn't renamed → importer bug
    //   FRAMEWORK    — Bailout/time/color uniforms the engine handles separately → expected, low priority
    //   UNUSED_SRC   — uniform declared in source but never used in DE body → source-level dead code
    //   DEAD_PARAM   — mapped but unreferenced for unknown reasons → needs investigation
    {
        const stripComments = (s: string) =>
            s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

        const allCode = stripComments([
            result.function || '',
            result.loopBody || '',
            result.getDist || '',
            result.loopInit || '',
            (result.uniforms || '').split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n'),
        ].join('\n'));

        // Known Fragmentarium framework params — engine handles these, not the formula
        const FRAMEWORK_PARAMS = new Set([
            'Bailout', 'BailoutRadius',         // engine controls bailout via iteration/escape
            'time',                              // animation time — not wired to formulas
            'ColorIterations',                   // orbit trap gate — engine has uColorIter
            'BackgroundColor', 'SpotLight', 'SpotLightDir',  // lighting/background
        ]);
        // Color annotation params are also framework (Fragmentarium coloring system)
        const COLOR_ANNOTATION_NAMES = new Set(
            doc.uniforms
                .filter(u => u.uiType === 'color')
                .map(u => u.name)
        );

        // Params used only in non-DE helpers (e.g. vec3 color()) are coloring/framework params
        // that GMT doesn't import — classify separately from real dead params
        const coloringHelperNames = new Set(
            doc.helperFunctions
                .filter(h => h.returnType === 'vec3' && /color/i.test(h.name))
                .map(h => h.name)
        );
        const coloringHelperBodies = stripComments(
            doc.helperFunctions
                .filter(h => coloringHelperNames.has(h.name))
                .map(h => h.body).join('\n')
        );

        // Original DE body (pre-transform) for checking rename failures — strip comments
        const originalDE = stripComments(doc.deFunction?.body || '');
        // Only include helpers that ARE imported (exclude coloring helpers)
        const originalHelpers = stripComments(
            doc.helperFunctions
                .filter(h => !coloringHelperNames.has(h.name))
                .map(h => h.body).join('\n')
        );
        const originalInit = stripComments(doc.initFunction?.body || '');
        const originalAll = originalDE + '\n' + originalHelpers + '\n' + originalInit;

        for (const p of liveParams) {
            if (p.mappedSlot === 'ignore' || p.mappedSlot === 'fixed' || p.mappedSlot === 'builtin') continue;
            if (p.mappedSlot === 'uJulia' || p.mappedSlot === 'uJuliaMode') continue;

            const uniformName = slotToUniform(p.mappedSlot);
            const baseName = uniformName.includes('.') ? uniformName.split('.')[0] : uniformName;

            if (allCode.includes(baseName)) continue; // uniform is used — all good

            // Uniform NOT found in generated code — classify why
            // Use word-boundary regex to avoid false matches (e.g. single-letter names like "F")
            const nameRe = new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
            const originalNameInGenerated = nameRe.test(allCode);
            const originalNameInSource = nameRe.test(originalAll);

            if (originalNameInGenerated) {
                // Original name is still in the generated code but wasn't renamed → BUG
                v.paramIssues.push(
                    `RENAME_FAIL: '${p.name}' → ${p.mappedSlot} (${baseName}) — ` +
                    `original name still in generated code, rename didn't happen`
                );
            } else if (FRAMEWORK_PARAMS.has(p.name) || COLOR_ANNOTATION_NAMES.has(p.name)) {
                // Known framework param — expected to be dead
                v.qualitative.push(
                    `FRAMEWORK: '${p.name}' → ${p.mappedSlot} — ` +
                    `Fragmentarium framework param (engine handles this separately)`
                );
            } else if (nameRe.test(coloringHelperBodies) && !originalNameInSource) {
                // Used only in a coloring helper (e.g. vec3 color()) that GMT doesn't import
                v.qualitative.push(
                    `FRAMEWORK: '${p.name}' → ${p.mappedSlot} — ` +
                    `used only in Fragmentarium coloring helper (GMT handles coloring separately)`
                );
            } else if (!originalNameInSource) {
                // Not used even in original source — dead code in the .frag itself
                v.qualitative.push(
                    `UNUSED_SRC: '${p.name}' → ${p.mappedSlot} — ` +
                    `declared but never used in original DE/helpers/init`
                );
            } else {
                // Used in original source, not a framework param, not a rename failure,
                // but somehow didn't make it into generated code → needs investigation
                v.paramIssues.push(
                    `DEAD_PARAM: '${p.name}' → ${p.mappedSlot} (${baseName}) — ` +
                    `used in source but missing from generated code`
                );
            }
        }
    }

    // ── 6. Qualitative checks ────────────────────────────────────────────────

    // Double-underscore in formula name
    const nameMatch = result.function.match(/void\s+(formula_\w+)/);
    if (nameMatch && nameMatch[1].includes('__')) {
        v.qualitative.push(`Reserved name: ${nameMatch[1]}`);
    }

    // Uninitialized globals at correct scope
    for (const gd of doc.globalDecls) {
        if (gd.expression !== undefined) continue;
        const declPattern = new RegExp(`^${gd.type}\\s+${gd.name}\\s*;`, 'm');
        if (!declPattern.test(result.function)) {
            v.qualitative.push(`Global '${gd.name}' not at global scope`);
        }
    }

    // Check for unrenamed Fragmentarium variables in output
    const fragVars = ['pos', 'DE', 'Iterations', 'Julia', 'JuliaC', 'orbitTrap'];
    const funcBody = result.function;
    for (const fv of fragVars) {
        // Only flag if it appears as an identifier (not inside a comment or string)
        const pattern = new RegExp(`(?<!\\w)${fv}(?!\\w)`, 'g');
        const noComments = funcBody.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        // Skip if it's a function definition name (float DE(...) is fine in helpers)
        const asParam = new RegExp(`\\b(float|void|vec[234])\\s+${fv}\\s*\\(`);
        if (pattern.test(noComments) && !asParam.test(noComments)) {
            // Exception: 'pos' in frag_DE parameter is fine
            if (fv === 'pos' && /frag_DE\s*\(\s*vec3\s+pos\s*\)/.test(funcBody)) continue;
            // Exception: 'Iterations' in comments
            if (fv === 'Iterations') continue;
            v.qualitative.push(`Possible unrenamed Frag variable: '${fv}'`);
        }
    }

    // Full-DE mode check
    const isFullDE = result.getDist === 'return vec2(frag_cachedDist, frag_iterCount);';
    if (isFullDE) {
        v.qualitative.push('Full-DE mode (no per-iteration engine control)');
    }

    // Check mapped param count vs slot count
    const mappedParams = params.filter(p =>
        p.mappedSlot !== 'ignore' && p.mappedSlot !== 'fixed' && p.mappedSlot !== 'builtin'
    );
    if (mappedParams.length === 0 && doc.uniforms.length > 0) {
        v.qualitative.push(`No params mapped (${doc.uniforms.length} uniforms detected but all ignored/builtin)`);
    }

    return v;
}

// ─── Test result type ────────────────────────────────────────────────────────

interface TestResult {
    label: string;
    file: string;
    status: 'pass' | 'fail' | 'warn';
    mode?: string;                  // 'loop' | 'single' | 'full-DE'
    paramCount?: number;
    warnings: string[];
    glslIssues: string[];
    paramIssues: string[];
    qualitative: string[];
    error?: string;
}

const results: TestResult[] = [];

// ─── Test runner ─────────────────────────────────────────────────────────────

function test(label: string, relPathOrSource: string, opts?: { inline?: boolean }): TestResult {
    let src: string;
    const result: TestResult = {
        label,
        file: opts?.inline ? '(inline)' : relPathOrSource,
        status: 'pass',
        warnings: [],
        glslIssues: [],
        paramIssues: [],
        qualitative: [],
    };

    if (opts?.inline) {
        src = relPathOrSource;
    } else {
        const absPath = path.join(ROOT, relPathOrSource);
        if (!fs.existsSync(absPath)) {
            result.status = 'fail';
            result.error = `File not found: ${relPathOrSource}`;
            results.push(result);
            if (!JSON_OUT) console.log(`\n─── ${label}\n${c.wrn(result.error)}`);
            return result;
        }
        src = fs.readFileSync(absPath, 'utf8');
    }

    const name = label.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    if (!JSON_OUT) console.log(`\n─── ${label}`);

    // 1. Detect (V3)
    const detected = detectFormulaV3(src, label);
    if ('error' in detected) {
        result.status = 'fail';
        result.error = `detect: ${detected.error}`;
        results.push(result);
        if (!JSON_OUT) console.log(c.err(result.error));
        return result;
    }

    const { doc, selectedFunction, loopMode, params, warnings: detectWarnings } = detected;
    result.warnings.push(...detectWarnings);

    // 2. Transform (V3)
    let transformed: TransformedFormulaV2;
    try {
        const t = transformFormulaV3(detected, selectedFunction, loopMode, name, params);
        if (!t) {
            result.status = 'fail';
            result.error = 'transformFormulaV3 returned null';
            results.push(result);
            if (!JSON_OUT) console.log(c.err(result.error));
            return result;
        }
        transformed = t;
    } catch (e: any) {
        result.status = 'fail';
        result.error = `transform threw: ${e.message ?? e}`;
        results.push(result);
        if (!JSON_OUT) console.log(c.err(result.error));
        return result;
    }

    result.warnings.push(...transformed.warnings);

    // 3. Validate
    const v = validateFormula(transformed, doc, params, name);

    // Determine mode
    const isFullDE = transformed.getDist === 'return vec2(frag_cachedDist, frag_iterCount);';
    result.mode = isFullDE ? 'full-DE' : loopMode;

    // Count mapped params
    result.paramCount = params.filter(p =>
        p.mappedSlot !== 'ignore' && p.mappedSlot !== 'fixed' && p.mappedSlot !== 'builtin'
    ).length;

    // Collect issues
    if (!v.parseOk) {
        result.glslIssues.push(`Parse error: ${v.parseError}`);
        // On full-shader parse failure, dump context around the error line
        if (v.fullShader && !JSON_OUT) {
            const lineMatch = v.parseError?.match(/line\s*(\d+)/i);
            if (lineMatch) {
                const errLine = parseInt(lineMatch[1], 10);
                const lines = v.fullShader.split('\n');
                const start = Math.max(0, errLine - 5);
                const end = Math.min(lines.length, errLine + 5);
                console.log(c.glsl(`   ─── shader context (line ${errLine}) ───`));
                for (let i = start; i < end; i++) {
                    const marker = i + 1 === errLine ? '>>>' : '   ';
                    console.log(`   ${marker} ${String(i + 1).padStart(4)}: ${lines[i]}`);
                }
            }
        }
    }
    result.glslIssues.push(...v.scopeIssues);
    result.paramIssues.push(...v.paramIssues);
    result.qualitative.push(...v.qualitative);

    // Determine status
    if (!v.parseOk || v.scopeIssues.length > 0 || v.paramIssues.length > 0) {
        result.status = 'warn';
    }

    results.push(result);

    // 4. Console output
    if (!JSON_OUT) {
        const li = doc.deFunction?.loopInfo;
        const loop = li ? `${li.type} counter=${li.counterVar ?? 'none'}` : 'no loop';
        const modeTag = isFullDE ? '\x1b[33m[full-DE]\x1b[0m' : `[${loop}]`;

        console.log(c.ok(`${selectedFunction}  ${modeTag}  params=${result.paramCount}`));

        // Param slots
        const slots = params
            .filter(p => p.mappedSlot !== 'ignore' && p.mappedSlot !== 'builtin')
            .map(p => `${p.name}→${p.mappedSlot}`);
        if (slots.length) console.log(c.dim(`   slots   : ${slots.join('  ')}`));

        // getDist
        console.log(c.dim(`   getDist : ${transformed.getDist ?? '(engine fallback)'}`));

        // Warnings
        for (const w of result.warnings) console.log(c.wrn(w));

        // Issues
        for (const i of result.glslIssues) console.log(c.glsl(i));
        for (const i of result.paramIssues) console.log(c.glsl(`param: ${i}`));
        for (const q of result.qualitative) {
            // Full-DE and no-params are informational, not warnings
            if (q.startsWith('Full-DE') || q.startsWith('No params')) {
                console.log(c.dim(`   info    : ${q}`));
            } else if (q.includes('parse failed')) {
                console.log(c.glsl(q));
            } else {
                console.log(c.dim(`   note    : ${q}`));
            }
        }

        if (VERBOSE) {
            console.log('\n--- UNIFORMS ---');
            console.log(transformed.uniforms);
            console.log('\n--- FUNCTION (truncated) ---');
            console.log(transformed.function?.substring(0, 1500));
            console.log('\n--- LOOP BODY ---');
            console.log(transformed.loopBody);
            console.log('---');
        }
    }

    return result;
}

// ─── Auto-discover .frag files ───────────────────────────────────────────────

function discoverFragFiles(dir: string): { label: string; relPath: string }[] {
    const found: { label: string; relPath: string }[] = [];
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) return found;

    function walk(d: string, prefix: string) {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                walk(path.join(d, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
            } else if (entry.name.endsWith('.frag') || entry.name.endsWith('.glsl')) {
                const relPath = path.join(dir, prefix, entry.name).replace(/\\/g, '/');
                const label = entry.name.replace(/\.(frag|glsl)$/, '');
                found.push({ label: `${prefix ? prefix + '/' : ''}${label}`, relPath });
            }
        }
    }

    walk(absDir, '');
    return found;
}

// ─── Test matrix (same as test-frag-importer.mts) ────────────────────────────

const REGISTERED_TESTS: { label: string; relPath: string }[] = [
    { label: 'Menger IFS (Tutorial 11)',  relPath: `${REF}/Tutorials/11 - Simple Distance Estimated 3D fractal.frag` },
    { label: 'Mandelbox',                 relPath: `${REF}/Historical 3D Fractals/Mandelbox.frag` },
    { label: 'Tetrahedron',               relPath: `${REF}/Kaleidoscopic IFS/Tetrahedron.frag` },
    { label: 'NewMenger',                 relPath: `${REF}/Kaleidoscopic IFS/NewMenger.frag` },
    { label: 'Menger Kali',               relPath: `${REF}/Kaleidoscopic IFS/Menger.frag` },
    { label: 'Octahedron',                relPath: `${REF}/Kaleidoscopic IFS/Octahedron.frag` },
    { label: 'Icosahedron',               relPath: `${REF}/Kaleidoscopic IFS/Icosahedron.frag` },
    { label: 'Dodecahedron',              relPath: `${REF}/Kaleidoscopic IFS/Dodecahedron.frag` },
    { label: 'KaliBox',                   relPath: `${REF}/Kali's Creations/Kalibox.frag` },
    { label: 'Treebroccoli',              relPath: `${REF}/Kali's Creations/Treebroccoli.frag` },
    { label: 'KboxExpSmooth',             relPath: `${REF}/Kali's Creations/KboxExpSmooth.frag` },
    { label: 'LivingKIFS',                relPath: `${REF}/Kali's Creations/LivingKIFS.frag` },
    { label: 'RotJulia',                  relPath: `${REF}/Kali's Creations/RotJulia.frag` },
    { label: 'Tutorial 12 (Mandelbulb)',  relPath: `${REF}/Tutorials/12 - Faster raytracing of 3D fractals.frag` },
    { label: 'AmazingSurface',            relPath: `${REF}/Kali's Creations/amazingsurface.frag` },
    { label: 'Mandelbulb (Historical)',   relPath: `${REF}/Historical 3D Fractals/Mandelbulb.frag` },
    { label: 'QuaternionJulia',           relPath: `${REF}/Historical 3D Fractals/QuaternionJulia.frag` },
    { label: 'PseudoKleinian',            relPath: `${REF}/Knighty Collection/PseudoKleinian.frag` },
    { label: 'MandalayBox',               relPath: `${REF}/Knighty Collection/MandalayBox.frag` },
    { label: 'PseudoKleinianMenger',      relPath: `${REF}/Knighty Collection/PseudoKleinianMenger.frag` },
    { label: 'BuffaloBulb',               relPath: `${REF}/3DickUlus/BuffaloBulb.frag` },
    { label: 'PetraBox',                  relPath: `${REF}/3DickUlus/PetraBox.frag` },
    { label: 'BioMorph',                  relPath: `${REF}/3DickUlus/BioMorph.frag` },
    { label: 'Pengbulb',                  relPath: `${REF}/3DickUlus/Pengbulb.frag` },
    { label: 'LionBulb',                  relPath: `${REF}/3DickUlus/LionBulb.frag` },
    { label: 'sinhJulia',                 relPath: `${REF}/3DickUlus/sinhJulia.frag` },
    { label: 'BioCube',                   relPath: `${REF}/DarkBeam/BioCube.frag` },
    { label: 'FoldcutToy',               relPath: `${REF}/DarkBeam/FoldcutToy.frag` },
    { label: 'RecFold',                   relPath: `${REF}/DarkBeam/RecFold.frag` },
    { label: 'PseudoKn4DQ',              relPath: `${REF}/Knighty Collection/PseudoKleinian_4D_Quaternion_Julia.frag` },
    { label: 'MengerSphere',             relPath: `${REF}/Knighty Collection/Menger_Sphere.frag` },
    { label: 'SphereTree',               relPath: `${REF}/TGlad/SphereTree.frag` },
    { label: 'Tetrahedral (TGlad)',      relPath: `${REF}/TGlad/Tetrahedral.frag` },
    { label: 'Mandelbulb (LoicVDB)',     relPath: `${REF}/LoicVDB/Mandelbulb.frag` },
    { label: 'MarbleMarcher',            relPath: `${REF}/LoicVDB/MarbleMarcher.frag` },
    { label: 'NewtonVarPower',           relPath: `${REF}/gannjondal/NewtonVarPower.frag` },
    { label: 'NewtonVarPowerSimplified', relPath: `${REF}/gannjondal/NewtonVarPowerSimplified.frag` },
    { label: 'NewtonRotFoldMenger',      relPath: `${REF}/gannjondal/NewtonVarPowerWithRotatdFoldAndMenger.frag` },
    { label: 'aboxMinR2Cuboid',          relPath: `${REF}/CozyG/aboxMinR2Cuboid-2.frag` },
    { label: 'abox_inCyl',              relPath: `${REF}/CozyG/abox_inCyl-10.frag` },
    { label: 'SphereSponge',            relPath: `${REF}/Experimental/SphereSponge.frag` },
    { label: 'Moebiusbulb',             relPath: `${REF}/Experimental/Moebiusbulb.frag` },
    { label: 'boxfold_kleinian',        relPath: `${REF}/Experimental/boxfold_kleinian.frag` },
    { label: 'BenesiFoldedMandelbulb',  relPath: `${REF}/Experimental/BenesiFoldedMandelbulb.frag` },
    { label: 'Mixed',                   relPath: `${REF}/Experimental/Mixed.frag` },
    { label: 'FoldCutPolyhedra',        relPath: `${REF}/Knighty Collection/Fold and Cut Polyhedra.frag` },
    { label: 'kosalos Apollonian',      relPath: `${REF}/kosalos/Apollonian.frag` },
    { label: 'kosalos KaliBox',         relPath: `${REF}/kosalos/KaliBox.frag` },
    { label: 'kosalos Kleinian',        relPath: `${REF}/kosalos/Kleinian.frag` },
    { label: 'kosalos Mandelbulb',      relPath: `${REF}/kosalos/Mandelbulb.frag` },
    { label: 'MixPinski',              relPath: `${REF}/mclarekin/darkbeam_MixPinski.frag` },
    { label: 'Mandelbulb_plus',         relPath: `${REF}/mclarekin/Mandelbulb_plus.frag` },
    { label: 'BenesiFoldedBulb',        relPath: `${REF}/Benesi/BenesiFoldedBulb.frag` },
    { label: 'BenesiPineFoldDE',        relPath: `${REF}/Benesi/BenesiPineFoldDE.frag` },
    { label: 'MengerSmooth',            relPath: `${REF}/Benesi/MengerSmooth.frag` },
    { label: 'MMM (3Dickulus)',         relPath: `${REF}/3DickUlus/MMM.frag` },
    { label: 'BurtsBisectorBulb',       relPath: `${REF}/3DickUlus/BurtsBisectorBulb.frag` },
    { label: 'HiddenBrotCos',           relPath: `${REF}/3DickUlus/HiddenBrotCos.frag` },
    { label: 'Menger11 (Kashaders)',    relPath: `${REF}/Kashaders/Fractals/KIFSandCO/Menger11.frag` },
    { label: 'CrossMenger (Kashaders)', relPath: `${REF}/Kashaders/Fractals/KIFSandCO/Cross-menger.frag` },
    { label: 'AnotherKoch3D',           relPath: `${REF}/Kashaders/Fractals/KIFSandCO/AnotherKoch3D.frag` },
    { label: 'Bulbox (Kashaders)',      relPath: `${REF}/Kashaders/Fractals/Mandos/hybrids/bulbox.frag` },
    { label: 'SimpleIFS-DE3D',          relPath: `${REF}/Kashaders/Fractals/IFS/SimpleIFS-DE3D-final.frag` },
    { label: 'Mandelbox DualNumbers',   relPath: `${REF}/Theory/Mandelbox - Dual Numbers DE.frag` },
];

// ─── Inline Tests (e.g. DEFAULT_SCRIPT from FormulaWorkshop) ─────────────────

// Full DEFAULT_SCRIPT from FormulaWorkshop.tsx — including the comment header
// that contains example uniform syntax (which should NOT be parsed as real uniforms)
const DEFAULT_MANDELBOX = `
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
`;

test('DEFAULT_SCRIPT (Mandelbox)', DEFAULT_MANDELBOX, { inline: true });

// ─── Main ────────────────────────────────────────────────────────────────────

let testList: { label: string; relPath: string }[];

// Auto-discover when --discover, --random, or a path-like filter is given
if (DISCOVER || RANDOM_N > 0 || (FILTER && (FILTER.includes('/') || FILTER.includes('\\')))) {
    testList = discoverFragFiles(REF);
    if (!JSON_OUT) console.log(c.cyan(`\nDiscovered ${testList.length} .frag files in ${REF}\n`));
} else {
    testList = REGISTERED_TESTS;
}

// Apply filter
if (FILTER) {
    testList = testList.filter(t => t.label.toLowerCase().includes(FILTER.toLowerCase()));
}

// Apply random selection
if (RANDOM_N > 0 && testList.length > RANDOM_N) {
    const shuffled = [...testList].sort(() => Math.random() - 0.5);
    testList = shuffled.slice(0, RANDOM_N);
    if (!JSON_OUT) console.log(c.cyan(`\nRandom selection: ${RANDOM_N} of ${shuffled.length} formulas\n`));
}

if (!JSON_OUT) {
    console.log(c.cyan(`\n═══ Formula Workshop Integration Test ═══`));
    console.log(c.dim(`  ${testList.length} formula(s) queued\n`));
}

for (const t of testList) {
    test(t.label, t.relPath);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

const passed    = results.filter(r => r.status === 'pass').length;
const warned    = results.filter(r => r.status === 'warn').length;
const failed    = results.filter(r => r.status === 'fail').length;
const fullDE    = results.filter(r => r.mode === 'full-DE').length;
const glslTotal = results.reduce((n, r) => n + r.glslIssues.length, 0);
const paramTotal= results.reduce((n, r) => n + r.paramIssues.length, 0);

if (JSON_OUT) {
    const report = {
        timestamp: new Date().toISOString(),
        total: results.length,
        passed,
        warned,
        failed,
        fullDE,
        glslIssues: glslTotal,
        paramIssues: paramTotal,
        results: results.map(r => ({
            label: r.label,
            file: r.file,
            status: r.status,
            mode: r.mode,
            paramCount: r.paramCount,
            error: r.error,
            warnings: r.warnings.length ? r.warnings : undefined,
            glslIssues: r.glslIssues.length ? r.glslIssues : undefined,
            paramIssues: r.paramIssues.length ? r.paramIssues : undefined,
            qualitative: r.qualitative.length ? r.qualitative : undefined,
        })),
    };
    console.log(JSON.stringify(report, null, 2));
} else {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${c.ok(`${passed} passed`)}  ${warned ? c.wrn(`${warned} warnings`) : ''}  ${failed ? c.err(`${failed} failed`) : ''}  (${results.length} total)`);
    if (fullDE > 0) console.log(c.dim(`  ${fullDE} formula(s) in full-DE mode`));
    if (glslTotal > 0) console.log(c.glsl(`${glslTotal} GLSL issue(s)`));
    if (paramTotal > 0) console.log(c.glsl(`${paramTotal} parameter issue(s)`));

    // List failures
    const failures = results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
        console.log(`\n  Failed:`);
        for (const f of failures) {
            console.log(`    ${c.err(f.label)}: ${f.error}`);
        }
    }

    // List GLSL issues
    const withGlsl = results.filter(r => r.glslIssues.length > 0);
    if (withGlsl.length > 0) {
        console.log(`\n  GLSL Issues:`);
        for (const r of withGlsl) {
            for (const i of r.glslIssues) {
                console.log(`    ${c.glsl(`${r.label}: ${i}`)}`);
            }
        }
    }

    // List param issues
    const withParam = results.filter(r => r.paramIssues.length > 0);
    if (withParam.length > 0) {
        console.log(`\n  Parameter Issues:`);
        for (const r of withParam) {
            for (const i of r.paramIssues) {
                console.log(`    ${c.glsl(`${r.label}: ${i}`)}`);
            }
        }
    }
}

// Exit code: non-zero if any failures
process.exit(failed > 0 ? 1 : 0);
