/**
 * Main formula code generator.
 * Orchestrates all transform steps to produce the final GMT-compatible formula function.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import type { FragDocumentV2, FragUniform, ParamMappingV2, TransformedFormulaV2 } from '../types';
import { getBuiltinsForIncludes } from '../parsers/builtins';
import { renameVariables, buildDERenameMap, applyRenameToExpression, slotToUniform } from './variable-renamer';
import { transformTrapMinWithAST } from './loop-extractor';
import { detectAndApplyAccumulatorPattern } from './pattern-detector';
import { generateInitCode, extractPreLoopDeclarations } from './init-generator';

// ============================================================================
// Swizzle write normalization
// ============================================================================

/**
 * Expand non-monotonic swizzle write assignments that ANGLE/WebGL rejects as
 * "illegal vector field selection".
 * E.g., `v.zy = expr;` → `{ vec2 _swzy = expr; v.z = _swzy.x; v.y = _swzy.y; }`
 * Monotonic writes (v.xw, v.xy, v.xyz, etc.) pass through unchanged.
 */
function expandNonMonotonicSwizzleWrites(code: string): string {
    const COMP_IDX: Record<string, number> = { x: 0, y: 1, z: 2, w: 3 };
    const COMP_NAMES = ['x', 'y', 'z', 'w'];
    return code.replace(
        /\b(\w+)\.([xyzw]{2,4})\s*=\s*([^;{}\n]+);/g,
        (match, varName: string, swizzle: string, rhs: string) => {
            const comps = swizzle.split('');
            const indices = comps.map(c => COMP_IDX[c]);
            // Monotonic = each index strictly greater than the previous → valid lvalue in all drivers
            const isMonotonic = indices.every((idx, i) => i === 0 || idx > indices[i - 1]);
            if (isMonotonic) return match;
            // Expand to individual component assignments via a temp variable
            const n = comps.length;
            const vecType = n === 2 ? 'vec2' : n === 3 ? 'vec3' : 'vec4';
            const tmpVar = `_sw${swizzle}`;
            const parts = [`${vecType} ${tmpVar} = ${rhs.trim()}`];
            comps.forEach((c, i) => parts.push(`${varName}.${c} = ${tmpVar}.${COMP_NAMES[i]}`));
            return `{ ${parts.join('; ')}; }`;
        }
    );
}

// ============================================================================
// Template
// ============================================================================

const FORMULA_TEMPLATE = `{{HELPERS}}

void formula_{{NAME}}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 f_z = z.xyz;

{{INIT_CODE}}

{{LOOP_BODY}}

{{POST_LOOP_UPDATE}}    z.xyz = f_z;
}`;

// ============================================================================
// Uniform declarations
// ============================================================================

function formatGLSLLiteral(type: string, value: number | number[] | boolean | undefined): string | null {
    if (value === undefined) return null;
    const num = (v: unknown) => {
        const n = typeof v === 'number' ? v : 0;
        return n.toFixed(6);
    };
    if (type === 'bool') return String(!!value);
    if (type === 'int') return String(Math.round(Array.isArray(value) ? (value[0] as number) : (value as number)));
    if (type === 'float') return num(Array.isArray(value) ? value[0] : value);
    if (type === 'vec2') {
        const a = Array.isArray(value) ? value : [0, 0];
        return `vec2(${num(a[0])}, ${num(a[1])})`;
    }
    if (type === 'vec3') {
        const a = Array.isArray(value) ? value : [0, 0, 0];
        return `vec3(${num(a[0])}, ${num(a[1])}, ${num(a[2])})`;
    }
    if (type === 'vec4') {
        const a = Array.isArray(value) ? value : [0, 0, 0, 0];
        return `vec4(${num(a[0])}, ${num(a[1])}, ${num(a[2])}, ${num(a[3])})`;
    }
    return null;
}

export function generateUniformDeclarations(uniforms: FragUniform[], mappings: ParamMappingV2[]): string {
    const declarations: string[] = [];
    for (const uniform of uniforms) {
        const mapping = mappings.find(m => m.name === uniform.name);
        if (mapping) {
            if (mapping.mappedSlot === 'fixed' && mapping.fixedValue !== undefined) {
                let fv = mapping.fixedValue;
                if (mapping.type === 'bool') fv = (parseFloat(fv) !== 0 || fv === 'true') ? 'true' : 'false';
                if (mapping.type === 'int') fv = String(Math.round(parseFloat(fv) || 0));
                declarations.push(`const ${mapping.type} u_${uniform.name} = ${fv};`);
            } else if (mapping.mappedSlot && mapping.mappedSlot !== 'ignore' && mapping.mappedSlot !== 'builtin' && mapping.mappedSlot !== 'fixed') {
                declarations.push(`// ${uniform.name} -> ${slotToUniform(mapping.mappedSlot)}`);
            } else {
                // ignore, builtin, fixed-without-value, or empty slot → bake as const from default
                const glslDefault = formatGLSLLiteral(uniform.type, uniform.default);
                if (glslDefault !== null) {
                    declarations.push(`const ${uniform.type} u_${uniform.name} = ${glslDefault};`);
                } else {
                    declarations.push(`uniform ${uniform.type} u_${uniform.name};`);
                }
            }
        } else {
            declarations.push(`uniform ${uniform.type} u_${uniform.name};`);
        }
    }
    return declarations.join('\n');
}

// ============================================================================
// Main transform
// ============================================================================

export function generateFormulaCode(
    doc: FragDocumentV2,
    name: string,
    mappings: ParamMappingV2[]
): TransformedFormulaV2 {
    const warnings: string[] = [];

    if (!doc.deFunction) {
        throw new Error('No DE function found in document');
    }

    const renameMap = buildDERenameMap(doc.deFunction, doc.uniforms, mappings);

    let helpersCode = '';
    if (doc.includes.length > 0) {
        const builtins = getBuiltinsForIncludes(doc.includes);
        if (builtins.trim()) helpersCode += builtins + '\n';
    }

    // Emit uninitialized global declarations at global scope so helper functions can reference them.
    // (e.g. "mat3 rot;" used by both the DE loop and a Coloring helper function.)
    // Literal-initialized globals (float l = 0.0;) are re-injected as locals in the formula function.
    for (const gd of doc.globalDecls) {
        if (gd.expression === undefined) {
            helpersCode += `${gd.type} ${gd.name};\n`;
        }
    }

    // Emit computed globals at global scope (uninitialized) so helper functions can read them.
    // Computed globals are expressions like "float angleXY = anglXY * M_PI_180;" that reference
    // uniforms — they can't be initialised at global scope in GLSL ES, so they're declared here
    // and assigned inside the formula/DE function body before any helper that needs them.
    for (const cg of doc.computedGlobals) {
        helpersCode += `${cg.type} ${cg.name};\n`;
    }

    for (const helper of doc.helperFunctions) {
        try {
            const helperAst = parse(helper.raw);
            renameVariables(helperAst, renameMap);
            helpersCode += generate(helperAst) + '\n';
        } catch (e) {
            warnings.push(`Failed to transform helper function ${helper.name}: ${e}`);
            helpersCode += helper.raw + '\n';
        }
    }

    const counterVar = doc.deFunction.loopInfo?.counterVar ?? null;

    let loopBody: string;
    if (doc.deFunction.loopInfo) {
        loopBody = doc.deFunction.loopInfo.body.trim();
        if (loopBody.startsWith('{') && loopBody.endsWith('}')) {
            loopBody = loopBody.slice(1, -1).trim();
        }
        if (counterVar && doc.deFunction.loopInfo.type === 'while') {
            loopBody = loopBody.replace(new RegExp(`\\b${counterVar}\\+\\+;?`, 'g'), '');
        }
        loopBody = loopBody.replace(/\bbreak\s*;/g, '{ /* break removed */ }');
    } else {
        loopBody = doc.deFunction.body.replace(/return\s+[^;]+;/g, '').trim();
        if (loopBody.startsWith('{') && loopBody.endsWith('}')) {
            loopBody = loopBody.slice(1, -1).trim();
        }
    }

    // AST rename of loop body
    try {
        const wrappedBody = `void __gmt_temp__() {\n${loopBody}\n}`;
        const loopAst = parse(wrappedBody);
        renameVariables(loopAst, renameMap);
        const tempCode = generate(loopAst);
        const bodyMatch = tempCode.match(/void __gmt_temp__\(\)\s*\{([\s\S]*)\}/);
        if (bodyMatch) {
            loopBody = bodyMatch[1].trim();
        } else {
            warnings.push('Could not extract renamed loop body — using unrenamed version');
        }
    } catch (e) {
        warnings.push(`AST rename failed for loop body: ${e}`);
    }

    loopBody = transformTrapMinWithAST(loopBody);
    loopBody = loopBody.replace(/\bboxFold\b/g, 'frag_boxFold');
    loopBody = expandNonMonotonicSwizzleWrites(loopBody);

    // Replace value-returning `return` statements in the loop body with void `return;`.
    // Fragmentarium formulas using #define providesInside have a bool return type (return
    // true/false for inside/outside). When the loop body is extracted into a void formula
    // function, these become compile errors. Replace with early-exit `return;`.
    loopBody = loopBody.replace(/\breturn\s+[^;{]+;/g, 'return;');

    // Context-dependent replacement of frag_pos placeholder.
    // When the DE parameter (e.g. 'pos') is copied to a working variable (e.g. 'vec3 z = pos'),
    // pre-loop refs should use f_z (current position from engine), but loop body refs should
    // use c.xyz (engine's Mandelbrot constant: initial position in normal mode, Julia in Julia mode).
    // This prevents "z += pos" from becoming "f_z += f_z" (self-doubling).
    loopBody = loopBody.replace(/\bfrag_pos\b/g, 'c.xyz');

    const uniformsCode = generateUniformDeclarations(doc.uniforms, mappings);
    let baseInit = generateInitCode(doc, renameMap);
    baseInit = baseInit.replace(/\bfrag_pos\b/g, 'f_z');
    let preLoopDecls = extractPreLoopDeclarations(doc.deFunction, renameMap, warnings);
    preLoopDecls = preLoopDecls.replace(/\bfrag_pos\b/g, 'f_z');

    // Prepend for-loop counter init decl
    const counterInitDecl = doc.deFunction.loopInfo?.counterInitDecl;
    if (counterInitDecl && doc.deFunction.loopInfo?.type === 'for') {
        const renamedDecl = applyRenameToExpression(counterInitDecl, renameMap);
        preLoopDecls = `    ${renamedDecl};\n` + preLoopDecls;
    }

    // Detect vec4 position tracker.
    // Only treat as a DR tracker if the initial w-component is ≥ 0.5 (i.e. starts at 1.0, not 0.0).
    // This prevents quaternion formulas (vec4 p = vec4(pos, 0.0)) from being misidentified.
    const _vec4TrackerMatchA = preLoopDecls.match(/\bvec4\s+(\w+)\s*=\s*vec4\s*\(\s*f_z\s*,\s*([\d.eE+-]+)\s*\)/);
    const vec4TrackerMatchA = (_vec4TrackerMatchA && parseFloat(_vec4TrackerMatchA[2]) >= 0.5) ? _vec4TrackerMatchA : null;
    const _vec4TrackerMatchB = !vec4TrackerMatchA ? preLoopDecls.match(/\b(\w+)\s*=\s*vec4\s*\(\s*f_z\s*,\s*([\d.eE+-]+)\s*\)/) : null;
    const vec4TrackerMatchB = (_vec4TrackerMatchB && parseFloat(_vec4TrackerMatchB[2]) >= 0.5) ? _vec4TrackerMatchB : null;
    const vec4TrackerMatchC = (!vec4TrackerMatchA && !vec4TrackerMatchB) ? preLoopDecls.match(/\b(\w+)\.xyz\s*=\s*f_z\s*;/) : null;

    const vec4TrackerSplit = !vec4TrackerMatchA && (vec4TrackerMatchB || vec4TrackerMatchC);
    const vec4Tracker = vec4TrackerMatchA
        ? vec4TrackerMatchA[1]
        : (vec4TrackerMatchB ? vec4TrackerMatchB[1] : (vec4TrackerMatchC ? vec4TrackerMatchC[1] : null));

    // Patch p.w initialization to use `dr` instead of a literal 1.0.
    // This applies to ALL vec4 tracker patterns (A, B, C):
    //   Pattern A: vec4 p = vec4(f_z, 1.0)  →  vec4 p = vec4(f_z, dr)
    //   Pattern B: p = vec4(f_z, 1.0)       →  p = vec4(f_z, dr)
    //   Pattern C: p.w = 1.0;               →  p.w = dr;
    // Without this, p.w resets to 1.0 on every formula call, losing the
    // accumulated DR product across iterations and breaking getDist.
    if (vec4Tracker) {
        const fixWInit = (s: string) => s
            .replace(
                new RegExp(`\\b${vec4Tracker}\\s*=\\s*vec4\\s*\\(\\s*f_z\\s*,\\s*[\\d.]+\\s*\\)`, 'g'),
                `${vec4Tracker} = vec4(f_z, dr)`
            )
            .replace(
                new RegExp(`\\b${vec4Tracker}\\.w\\s*=\\s*[\\d.]+\\s*;`, 'g'),
                `${vec4Tracker}.w = dr;`
            );
        preLoopDecls = fixWInit(preLoopDecls);
        loopBody = fixWInit(loopBody);

        // Fix the "p0 = p" anchor pattern. In Fragmentarium, p0 is initialized once to the
        // initial position (vec4(pos, 1.0)) and used as the constant additive term each fold.
        // In GMT's per-iteration call model p0 would otherwise get re-initialized to the
        // current (already-modified) position on every engine iteration, corrupting the fold.
        // Replace any copy of the tracker in preLoopDecls with vec4(c.xyz, 1.0):
        //   vec4 p0 = p;   OR   ..., p0 = p;
        // c.xyz is GMT's constant initial position (or julia constant in julia mode).
        preLoopDecls = preLoopDecls.replace(
            new RegExp(`\\b(vec4\\s+)?(\\w+)\\s*=\\s*${vec4Tracker}\\b(?=\\s*[,;])`, 'g'),
            (match, typePrefix, varName) => {
                if (varName === vec4Tracker) return match;
                return `${typePrefix ?? ''}${varName} = vec4(c.xyz, 1.0)`;
            }
        );
    }

    // Detect vec3 working variable: `vec3 p = f_z` (or multi-decl `vec3 p = f_z, p0 = ...`).
    // If present, the loop body works on `p` instead of `f_z`, so we must write back after each iteration.
    let vec3WorkingVar: string | null = null;
    if (!vec4Tracker) {
        const vec3Match = preLoopDecls.match(/\bvec3\s+(\w+)\s*=\s*f_z\b/);
        if (vec3Match && vec3Match[1] !== 'f_z') {
            vec3WorkingVar = vec3Match[1];

            // Same anchor fix as vec4: if `p0 = <workingVar>` appears, replace with `c.xyz`
            // so the Julia constant doesn't get re-initialized each iteration.
            preLoopDecls = preLoopDecls.replace(
                new RegExp(`\\b(vec3\\s+)?(\\w+)\\s*=\\s*${vec3WorkingVar}\\b(?=\\s*[,;])`, 'g'),
                (match, typePrefix, varName) => {
                    if (varName === vec3WorkingVar) return match;
                    return `${typePrefix ?? ''}${varName} = c.xyz`;
                }
            );
        }
    }

    // Detect max-accumulator pattern (NewMenger-style)
    let loopInitCode: string | undefined;
    let isAccumulator = false;
    if (!vec4Tracker && doc.deFunction.distanceExpression) {
        const accumResult = detectAndApplyAccumulatorPattern({
            distVar: doc.deFunction.distanceExpression,
            preLoopDecls,
            loopBody,
        });
        if (accumResult.isAccumulator) {
            isAccumulator = true;
            loopInitCode = accumResult.loopInit;
            preLoopDecls = accumResult.newPreLoopDecls!;
            loopBody = accumResult.newLoopBody!;
        }
    }

    // Orbit trap: Fragmentarium orbitTrap → renamed to g_orbitTrap (engine global).
    // The engine declares and resets g_orbitTrap in map(), so no local declaration needed.
    const usesOrbitTrap = helpersCode.includes('g_orbitTrap') || loopBody.includes('g_orbitTrap');
    const orbitTrapInit = '';
    const orbitTrapExtract = usesOrbitTrap
        ? `    trap = min(trap, length(g_orbitTrap.xyz));\n`
        : '';

    const initParts = [baseInit, preLoopDecls].filter(s => s.trim().length > 0);
    const initCode = orbitTrapInit + initParts.map(s =>
        s.split('\n').map((l: string) => '    ' + l).join('\n')
    ).join('\n');

    const postLoopUpdate = (vec4Tracker
        ? `    f_z = ${vec4Tracker}.xyz;\n    dr = ${vec4Tracker}.w;\n`
        : (vec3WorkingVar
            ? `    f_z = ${vec3WorkingVar};\n`
            : '')) + orbitTrapExtract;

    const functionCode = FORMULA_TEMPLATE
        .replace('{{HELPERS}}', helpersCode)
        .replace('{{NAME}}', name)
        .replace('{{INIT_CODE}}', initCode)
        .replace('{{LOOP_BODY}}', loopBody.split('\n').map(l => '    ' + l).join('\n'))
        .replace('{{POST_LOOP_UPDATE}}', postLoopUpdate);

    const loopBodyCall = `formula_${name}(z, dr, trap, c);`;

    let getDistCode: string | undefined;
    if (isAccumulator) {
        getDistCode = 'return vec2(dr, iter);';
    } else if (doc.deFunction.distanceExpression &&
               !/^(true|false)$/.test(doc.deFunction.distanceExpression.trim())) {
        // Skip getDist when the return expression is a bool literal (providesInside formulas
        // like RotJulia return true/false, not a distance value).
        try {
            const getDistRenameMap: Record<string, string> = {
                ...renameMap,
                'f_z': 'z.xyz',
                'f_i': 'int(iter)',
                'frag_pos': 'z.xyz', // DE parameter in getDist scope
            };
            if (counterVar) getDistRenameMap[counterVar] = 'int(iter)';
            if (vec4Tracker) getDistRenameMap[vec4Tracker] = 'z';

            // Map globally-declared float variables that accumulate loop length to `r`.
            // Pattern: "varName = length(...)" in the loop body means varName holds the
            // final position magnitude, which equals r in getDist scope.
            for (const gd of doc.globalDecls) {
                if (gd.type !== 'float') continue;
                const lengthAssign = new RegExp(`\\b${gd.name}\\s*=\\s*length\\s*\\(`);
                if (lengthAssign.test(loopBody)) {
                    getDistRenameMap[gd.name] = 'r';
                }
            }

            const distAst = parse(`void _temp() { float _d = ${doc.deFunction.distanceExpression}; }`);
            renameVariables(distAst, getDistRenameMap);
            const distCode = generate(distAst);
            const distMatch = distCode.match(/float _d = ([^;]+);/);
            let renamedExpr = distMatch ? distMatch[1] : doc.deFunction.distanceExpression;

            renamedExpr = renamedExpr.replace(/\bf_z\b/g, 'z.xyz');
            renamedExpr = renamedExpr.replace(/\bf_i\b/g, 'int(iter)');

            if (doc.computedGlobals.length > 0) {
                const sortedGlobals = [...doc.computedGlobals].sort((a, b) => b.name.length - a.name.length);
                for (const cg of sortedGlobals) {
                    const inlined = applyRenameToExpression(cg.expression, getDistRenameMap);
                    renamedExpr = renamedExpr.replace(new RegExp(`\\b${cg.name}\\b`, 'g'), `(${inlined})`);
                }
            }

            if (vec4Tracker) renamedExpr = renamedExpr.replace(/\bz\.w\b/g, 'dr');

            renamedExpr = renamedExpr.replace(/\blength\s*\(\s*z\.xyz\s*\)/g, 'r');
            renamedExpr = renamedExpr.replace(/\blength\s*\(\s*z\s*\)/g, 'r');
            getDistCode = `return vec2(${renamedExpr}, iter);`;
        } catch (e) {
            warnings.push(`Failed to generate getDist: ${e}`);
        }
    }

    // ── Full-DE fallback checks ───────────────────────────────────────────────
    // Fall back to full-DE mode when per-iteration splitting would break rendering.

    // Check 1: getDist references out-of-scope locals.
    if (getDistCode && hasOutOfScopeRefs(getDistCode, doc, renameMap, mappings)) {
        const fullDE = generateFullDEMode(doc, name, mappings, renameMap, helpersCode, uniformsCode, warnings);
        if (fullDE) return fullDE;
        warnings.push('Full-DE fallback failed; getDist may reference out-of-scope variables');
    }

    // Check 2: Unbounded vec4 inversion pattern.
    // Formulas like `p *= factor/dot(p.xyz, p.xyz)` produce huge dr values on intermediate
    // iterations when dot→0. The engine's `dr > 1e10` bailout prematurely exits the loop,
    // leaving getDist with incomplete state (renders as a ball). Mandelbox-style formulas
    // avoid this by clamping: `clamp(dot, minRad, 1.0)`. When unclamped, use full-DE mode.
    if (vec4Tracker && getDistCode) {
        const rawBody = doc.deFunction.loopInfo?.body ?? doc.deFunction.body;
        const hasDotDivision = /\/\s*dot\s*\(/.test(rawBody);
        const hasClamped = /clamp\s*\(\s*dot\s*\(/.test(rawBody);
        if (hasDotDivision && !hasClamped) {
            const fullDE = generateFullDEMode(doc, name, mappings, renameMap, helpersCode, uniformsCode, warnings);
            if (fullDE) return fullDE;
        }
    }

    return {
        function: functionCode,
        uniforms: uniformsCode,
        loopBody: loopBodyCall,
        getDist: getDistCode,
        loopInit: loopInitCode,
        warnings
    };
}

// ============================================================================
// Scope analysis
// ============================================================================

const GLSL_SCOPE = new Set([
    // getDist parameters
    'r', 'dr', 'iter', 'z',
    // GLSL builtins
    'abs','acos','all','any','asin','atan','ceil','clamp','cos','cross','degrees',
    'distance','dot','equal','exp','exp2','faceforward','floor','fract',
    'greaterThan','greaterThanEqual','inversesqrt','length','lessThan','lessThanEqual',
    'log','log2','mat2','mat3','mat4','max','min','mix','mod','normalize','not',
    'notEqual','outerProduct','pow','radians','reflect','refract','sign','sin',
    'sinh','smoothstep','sqrt','step','tan','tanh','transpose',
    // types & keywords
    'bool','bvec2','bvec3','bvec4','float','int','ivec2','ivec3','ivec4',
    'uint','uvec2','uvec3','uvec4','vec2','vec3','vec4',
    'true','false','return','if','else','for','while',
    // GMT builtins always in scope
    'uIterations','uJulia','uJuliaMode','g_orbitTrap','frag_pos','frag_cachedDist','frag_iterCount',
]);

function hasOutOfScopeRefs(
    getDistCode: string,
    doc: FragDocumentV2,
    renameMap: Record<string, string>,
    mappings: ParamMappingV2[]
): boolean {
    const valid = new Set(GLSL_SCOPE);

    // Add uniform slot names
    for (const m of mappings) {
        if (m.mappedSlot && m.mappedSlot !== 'ignore' && m.mappedSlot !== 'fixed' && m.mappedSlot !== 'builtin') {
            valid.add(slotToUniform(m.mappedSlot));
        }
    }
    // Add u_Name baked constants
    for (const u of doc.uniforms) valid.add(`u_${u.name}`);

    // Add helper function names
    for (const h of doc.helperFunctions) valid.add(h.name);
    if (doc.deFunction) valid.add(doc.deFunction.name);

    // Add computed globals and global decls
    for (const cg of doc.computedGlobals) valid.add(cg.name);
    for (const gd of doc.globalDecls) valid.add(gd.name);

    // Strip swizzle/field access, extract identifiers
    const stripped = getDistCode.replace(/\.\w+/g, '');
    const identifiers = new Set(
        Array.from(stripped.matchAll(/\b([a-zA-Z_]\w*)\b/g), m => m[1])
    );

    for (const id of identifiers) {
        if (!valid.has(id)) return true;
    }
    return false;
}

// ============================================================================
// Full-DE mode: keep entire DE as a self-contained helper
// ============================================================================

const FULL_DE_TEMPLATE = `{{HELPERS}}

float frag_cachedDist;
float frag_iterCount;

float frag_DE(vec3 f_z) {
    frag_iterCount = 0.0;
{{DE_BODY}}
}

void formula_{{NAME}}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    frag_cachedDist = frag_DE(z.xyz);
    trap = min(trap, length(g_orbitTrap.xyz));
    // Force engine bailout after this single call
    z = vec4(1e10, 1e10, 1e10, 1.0);
}`;

/**
 * Detect the primary position variable in a full-DE body.
 * Looks for vec4/vec3 assigned from f_z (the DE function parameter).
 */
function findFullDEPositionVar(body: string): string {
    // vec4 p = vec4(f_z, ...) → p.xyz
    const vec4Match = body.match(/vec4\s+(\w+)\s*=\s*vec4\s*\(\s*f_z\b/);
    if (vec4Match) return vec4Match[1] + '.xyz';
    // vec3 p = f_z → p
    const vec3Match = body.match(/vec3\s+(\w+)\s*=\s*f_z\b/);
    if (vec3Match) return vec3Match[1];
    // Fall back to f_z itself
    return 'f_z';
}

/**
 * Inject orbit trap tracking and iteration counting into the main loop
 * of a full-DE function body. This enables coloring modes (orbit trap,
 * iterations) that otherwise have no data in full-DE mode.
 */
function injectOrbitTracking(body: string, posExpr: string): string {
    // Find the first for/while loop
    const loopMatch = body.match(/(for|while)\s*\(/);
    if (!loopMatch || loopMatch.index === undefined) return body;

    // Find the opening brace of the loop body
    let pos = loopMatch.index + loopMatch[0].length;
    // Skip past the loop condition (balanced parens)
    let depth = 1;
    while (pos < body.length && depth > 0) {
        if (body[pos] === '(') depth++;
        else if (body[pos] === ')') depth--;
        pos++;
    }
    // Skip whitespace to find the opening brace
    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (pos >= body.length || body[pos] !== '{') return body;

    // Find the matching closing brace
    const bodyStart = pos + 1;
    depth = 1;
    pos = bodyStart;
    while (pos < body.length && depth > 0) {
        if (body[pos] === '{') depth++;
        else if (body[pos] === '}') depth--;
        pos++;
    }
    const closingBrace = pos - 1;

    const injection = `\n        g_orbitTrap = min(g_orbitTrap, abs(vec4(${posExpr}, dot(${posExpr}, ${posExpr}))));\n        frag_iterCount += 1.0;\n    `;

    return body.slice(0, closingBrace) + injection + body.slice(closingBrace);
}

function generateFullDEMode(
    doc: FragDocumentV2,
    name: string,
    mappings: ParamMappingV2[],
    renameMap: Record<string, string>,
    helpersCode: string,
    uniformsCode: string,
    warnings: string[],
): TransformedFormulaV2 | null {
    if (!doc.deFunction) return null;

    // Build the full DE body with variable renaming
    let deBody = doc.deFunction.body.trim();
    if (deBody.startsWith('{') && deBody.endsWith('}')) {
        deBody = deBody.slice(1, -1).trim();
    }

    // Prepend computed globals and literal-initialized global decls as locals inside frag_DE.
    // Uninitialized globals (mat3 rot; etc.) are already at global scope via helpersCode.
    const preamble: string[] = [];
    for (const gd of doc.globalDecls) {
        if (gd.expression !== undefined) {
            preamble.push(`    ${gd.type} ${gd.name} = ${gd.expression};`);
        }
        // uninitialized globals are global scope — no local redeclaration needed
    }
    for (const cg of doc.computedGlobals) {
        const renamedExpr = applyRenameToExpression(cg.expression, renameMap);
        // Assign to already-declared global (no type keyword) so helper functions that read
        // these globals (e.g. Rotate() reading angleXY) see the uniform-driven values.
        preamble.push(`    ${cg.name} = ${renamedExpr};`);
    }

    // Inline init() body
    if (doc.initFunction) {
        let initBody = doc.initFunction.body.trim();
        if (initBody.startsWith('{') && initBody.endsWith('}')) {
            initBody = initBody.slice(1, -1).trim();
        }
        if (initBody) preamble.push(initBody);
    }

    const fullBody = preamble.join('\n') + '\n' + deBody;

    // AST rename the entire DE body
    let renamedBody: string;
    try {
        const wrapped = `float __frag_de_temp__(vec3 f_z) {\n${fullBody}\n}`;
        const ast = parse(wrapped);
        renameVariables(ast, renameMap);
        const generated = generate(ast);
        const bodyMatch = generated.match(/float __frag_de_temp__\(vec3 f_z\)\s*\{([\s\S]*)\}/);
        renamedBody = bodyMatch ? bodyMatch[1] : fullBody;
    } catch (e) {
        warnings.push(`Full-DE AST rename failed: ${e}`);
        renamedBody = applyRenameToExpression(fullBody, renameMap);
    }

    // Replace boxFold with frag_boxFold
    renamedBody = renamedBody.replace(/\bboxFold\b/g, 'frag_boxFold');
    // In full-DE mode the entire DE runs in one call — frag_pos is the function parameter f_z
    renamedBody = renamedBody.replace(/\bfrag_pos\b/g, 'f_z');
    renamedBody = expandNonMonotonicSwizzleWrites(renamedBody);

    // Inject orbit trap tracking + iteration counter into the formula's internal loop
    const posVar = findFullDEPositionVar(renamedBody);
    renamedBody = injectOrbitTracking(renamedBody, posVar);

    const functionCode = FULL_DE_TEMPLATE
        .replace('{{HELPERS}}', helpersCode)
        .replace('{{NAME}}', name)
        .replace('{{DE_BODY}}', renamedBody);

    warnings.push('Using full-DE mode: formula runs complete DE internally (no per-iteration engine control)');

    return {
        function: functionCode,
        uniforms: uniformsCode,
        loopBody: `formula_${name}(z, dr, trap, c);`,
        getDist: 'return vec2(frag_cachedDist, frag_iterCount);',
        warnings,
    };
}
