/**
 * V3 Code generation orchestrator.
 *
 * Consumes FormulaAnalysis + user selections (function, loopMode, params)
 * and produces GeneratedFormula.
 *
 * Pipeline: rename map → helpers → init → pre-loop → loop body → patterns → getDist → assemble
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import type { FormulaAnalysis, FunctionAnalysis, ImportedParam, GeneratedFormula, Result } from '../types';
import { buildRenameMap, buildHelperRenameMap, renameVariables, applyRenameToExpression } from './rename';
import { generateUniformDeclarations } from './uniforms';
import { extractLoopBody } from './loop-body';
import { generateGetDist, hasOutOfScopeRefs } from './get-dist';
import { preprocess } from '../analyze/preprocess';
import { generateFullDE } from './full-de';
import { generateInitCode, extractPreLoopDeclarations } from './init';
import {
    detectVec4Tracker, patchVec4Tracker,
    detectVec3WorkingVar, patchVec3Anchor,
    detectAccumulatorPattern,
    detectScalarDRAccumulator,
    fixIntFloatArithmetic,
} from './patterns';

// ============================================================================
// Comma-separated declaration handling
// ============================================================================

/**
 * Remove a single variable from a (possibly comma-separated) float declaration,
 * replacing it with a substitution string. Preserves sibling variables.
 *
 * E.g. removeVarFromDecl('float s=2., l=0.;', 's', 'dr = 2.;')
 *   → 'dr = 2.;\nfloat l = 0.;'
 *
 * E.g. removeVarFromDecl('float d=1.,a;', 'd', 'dr = 1.;')
 *   → 'dr = 1.;\nfloat a;'
 */
function removeVarFromDecl(decls: string, varName: string, replacement: string): string {
    // Try to find a float declaration line that contains this variable
    const floatDeclRx = new RegExp(`(\\bfloat\\s+)([^;]*\\b${varName}\\b[^;]*);`, 'g');
    let match: RegExpExecArray | null;
    let result = decls;
    let replaced = false;

    while ((match = floatDeclRx.exec(decls)) !== null) {
        const fullMatch = match[0];
        const declBody = match[2]; // everything between "float " and ";"

        // Split declarators on commas (respecting parentheses)
        const parts: string[] = [];
        let depth = 0, start = 0;
        for (let i = 0; i < declBody.length; i++) {
            if (declBody[i] === '(') depth++;
            else if (declBody[i] === ')') depth--;
            else if (declBody[i] === ',' && depth === 0) {
                parts.push(declBody.slice(start, i).trim());
                start = i + 1;
            }
        }
        parts.push(declBody.slice(start).trim());

        // Check if this declaration actually contains our variable
        const varIdx = parts.findIndex(p => new RegExp(`^${varName}\\b`).test(p.trim()));
        if (varIdx < 0) continue;

        // Remove the target variable, keep the rest
        const remaining = parts.filter((_, i) => i !== varIdx);
        const lines: string[] = [replacement];
        if (remaining.length > 0) {
            lines.push(`float ${remaining.join(', ')};`);
        }

        result = result.replace(fullMatch, lines.join('\n'));
        replaced = true;
        break;
    }

    // Fallback: simple regex if structured parse didn't match
    if (!replaced) {
        result = result.replace(
            new RegExp(`\\bfloat\\s+${varName}\\s*=\\s*[^;]+;`),
            replacement
        );
    }

    return result;
}

// ============================================================================
// Post-loop position modification detection
// ============================================================================

/**
 * Check if the DE function modifies the position variable BEFORE the loop starts.
 * Such modifications (e.g. `p.y+=1.4`, `p=abs(p)`, `p.xz=fract(p.xz)-.5`)
 * would run every iteration in per-iteration mode, but should only run once.
 * This is common in DEC fractals.
 */
function hasPreLoopPositionMods(deFunc: FunctionAnalysis): boolean {
    if (!deFunc.loop) return false;

    let body = deFunc.body.trim();
    if (body.startsWith('{') && body.endsWith('}')) {
        body = body.slice(1, -1).trim();
    }

    const loopMatch = body.match(/\bfor\s*\(|\bwhile\s*\(/);
    if (!loopMatch || loopMatch.index === undefined) return false;

    const preLoop = body.slice(0, loopMatch.index).trim();
    if (!preLoop) return false;

    const posVar = deFunc.parameters[0]?.name;
    if (!posVar) return false;

    // Match in-place mutations: p = abs(p), p.y += 1.4, p.xz = fract(p.xz)
    // But NOT declarations: vec3 p = pos (which is a copy, not a mutation)
    const posAssign = new RegExp(`(?<!vec[234]\\s+)\\b${posVar}\\b(?:\\.[xyzwrgba]+)?\\s*[-+*/]?=`);
    return posAssign.test(preLoop);
}

/**
 * Check if the DE function modifies the position variable between the loop end
 * and the return statement. Such modifications (e.g. `p/=s`, `p-=clamp(...)`)
 * are lost in per-iteration mode because getDist only sees the loop-final position.
 */
function hasPostLoopPositionMods(deFunc: FunctionAnalysis): boolean {
    if (!deFunc.loop) return false;

    let body = deFunc.body.trim();
    if (body.startsWith('{') && body.endsWith('}')) {
        body = body.slice(1, -1).trim();
    }

    // Find the loop body in the function body, then extract everything after it
    const loopBody = deFunc.loop.body;
    const loopIdx = body.lastIndexOf(loopBody);
    if (loopIdx < 0) return false;

    const afterLoop = body.slice(loopIdx + loopBody.length);

    // Strip the return statement — we only care about modifications before it
    const withoutReturn = afterLoop.replace(/\breturn\b[^;]*;/g, '');

    // Check if the position parameter is assigned after the loop
    const posVar = deFunc.parameters[0]?.name;
    if (!posVar) return false;

    // Match: p = ..., p /= ..., p -= ..., p *= ..., p += ..., p.xyz = ..., p.x = ...
    const posAssign = new RegExp(`\\b${posVar}\\b(?:\\.[xyzwrgba]+)?\\s*[-+*/]?=`);
    return posAssign.test(withoutReturn);
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
// Main generator
// ============================================================================

/**
 * Generate GMT-compatible formula code from a FormulaAnalysis.
 *
 * @param analysis      The analysis result from analyzeSource()
 * @param selectedFunc  Name of the function to use as DE
 * @param loopMode      'loop' to extract loop body, 'single' to use whole function
 * @param name          Formula name (used in formula_NAME)
 * @param params        ImportedParam[] with user-assigned slots
 */
export function generateFormula(
    analysis: FormulaAnalysis,
    selectedFunc: string,
    loopMode: 'loop' | 'single',
    name: string,
    params: ImportedParam[],
): Result<GeneratedFormula> {
    // Sanitize formula name for GLSL identifier safety
    name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'imported';

    // Find the selected DE function
    let deFunc = analysis.functions.find(f => f.name === selectedFunc);
    if (!deFunc) {
        return { ok: false, error: `Function '${selectedFunc}' not found`, stage: 'function-selection' };
    }

    // If single mode, strip loop info
    if (loopMode === 'single') {
        deFunc = { ...deFunc, loop: null };
    }

    const warnings: string[] = [];
    const renameMap = buildRenameMap(deFunc, params);

    // GLSL ES 3.0 built-in functions that were absent in ES 1.0.
    // Fragmentarium formulas (targeting ES 1.0) may define their own versions.
    // Redefining them in ES 3.0 is a compile error — rename to frag_NAME.
    const GLSL3_BUILTINS = new Set(['round', 'roundEven', 'trunc', 'isnan', 'isinf', 'fma',
        'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh']);
    for (const helper of analysis.functions) {
        if (GLSL3_BUILTINS.has(helper.name)) {
            renameMap[helper.name] = `frag_${helper.name}`;
        }
    }

    // Engine-provided functions (from shaders/chunks/math.ts and de.ts).
    // Only rename when the formula defines a function with the SAME name AND a
    // colliding signature (same param types, or same name + incompatible return type).
    // GLSL ES 3.0 supports overloading, so different param types can coexist.
    //
    // Engine signatures:
    //   math.ts: vec3 mod289(vec3), vec4 mod289(vec4), vec4 permute(vec4),
    //            vec4 taylorInvSqrt(vec4), float snoise(vec3)
    //   de.ts:   vec4 map(vec3), float mapDist(vec3)
    const ENGINE_SIGS: Array<{ name: string; paramTypes: string[] }> = [
        { name: 'mod289',          paramTypes: ['vec3'] },
        { name: 'mod289',          paramTypes: ['vec4'] },
        { name: 'permute',         paramTypes: ['vec4'] },
        { name: 'taylorInvSqrt',   paramTypes: ['vec4'] },
        { name: 'snoise',          paramTypes: ['vec3'] },
        { name: 'map',             paramTypes: ['vec3'] },  // vec4 map(vec3) — different return type still collides
        { name: 'mapDist',         paramTypes: ['vec3'] },
    ];
    const engineCollisionNames = new Set<string>();
    for (const helper of analysis.functions) {
        if (renameMap[helper.name]) continue;
        const helperParamTypes = helper.parameters.map(p => p.type.trim());
        for (const sig of ENGINE_SIGS) {
            if (helper.name === sig.name &&
                helperParamTypes.length === sig.paramTypes.length &&
                helperParamTypes.every((t, i) => t === sig.paramTypes[i])) {
                engineCollisionNames.add(helper.name);
                break;
            }
        }
    }
    for (const name of engineCollisionNames) {
        renameMap[name] = `frag_${name}`;
    }

    // Detect local variables in DE body that shadow formula template parameters
    // with incompatible types. E.g. `vec2 c = p4.zw;` shadows `vec4 c` from template.
    // Rename to frag_<name> so the local and template parameter don't collide.
    const TEMPLATE_SHADOW_CHECK = ['c']; // z/dr/trap handled by FORMULA_PARAMS filter
    for (const paramName of TEMPLATE_SHADOW_CHECK) {
        if (renameMap[paramName]) continue;
        const localDeclRx = new RegExp(`\\b(?:float|int|vec[234]|mat[234]|bool)\\s+${paramName}\\b`);
        if (localDeclRx.test(deFunc.body)) {
            renameMap[paramName] = `frag_${paramName}`;
        }
    }

    // ── Build helpers code ──
    let helpersCode = '';

    // Builtin code from includes (already resolved in preprocessing,
    // but we need it in the generated output).
    // Skip builtin functions that the formula already defines to avoid redefinition errors.
    // BUT: if the formula's version is being renamed (e.g. mod289 → frag_mod289),
    // keep the builtin — the renamed formula version won't collide with it.
    const { builtinCode } = preprocess(analysis.source);
    if (builtinCode.trim()) {
        // Only consider formula functions that are NOT being renamed as collisions
        const formulaFuncNames = new Set(
            analysis.functions.map(f => f.name).filter(name => !renameMap[name])
        );
        // Filter out duplicate function definitions using brace-depth tracking.
        // Walk the builtin code line-by-line, detect function signatures,
        // and skip entire function bodies when the name collides.
        const builtinLines = builtinCode.split('\n');
        const filteredLines: string[] = [];
        let skipDepth = 0;  // > 0 means we're inside a function we're skipping
        let skipping = false;
        const funcSigRe = /^((?:float|vec[234]|mat[234]|void|int|bool)\s+(\w+)\s*\()/;

        for (const line of builtinLines) {
            if (!skipping) {
                const sigMatch = line.match(funcSigRe);
                if (sigMatch && formulaFuncNames.has(sigMatch[2])) {
                    // Start skipping this function
                    skipping = true;
                    skipDepth = 0;
                    warnings.push(`Skipped builtin '${sigMatch[2]}' — formula defines its own`);
                    // Count braces on this line
                    for (const ch of line) {
                        if (ch === '{') skipDepth++;
                        else if (ch === '}') skipDepth--;
                    }
                    if (skipDepth <= 0) skipping = false;
                    continue;
                }
                filteredLines.push(line);
            } else {
                // Inside a skipped function — track brace depth
                for (const ch of line) {
                    if (ch === '{') skipDepth++;
                    else if (ch === '}') skipDepth--;
                }
                if (skipDepth <= 0) skipping = false;
            }
        }
        const filteredBuiltin = filteredLines.join('\n');
        if (filteredBuiltin.trim()) helpersCode += filteredBuiltin + '\n';
    }

    // Uninitialized global declarations at global scope
    for (const gd of analysis.globals.uninitialized) {
        helpersCode += `${gd.type} ${gd.name};\n`;
    }
    // Literal-initialized globals at global scope (helpers may reference these)
    for (const gd of analysis.globals.literalInit) {
        helpersCode += `${gd.type} ${gd.name} = ${gd.expression};\n`;
    }
    // Computed globals declared at global scope (uninitialized, assigned in formula body)
    for (const cg of analysis.globals.computed) {
        helpersCode += `${cg.type} ${cg.name};\n`;
    }

    // Helper functions (everything except the selected DE and init)
    // Use a helper-safe rename map that excludes DE position variable renames
    // (pos→f_z, z→f_z) — helpers have their own local parameters with those names.
    const helperRenameMap = buildHelperRenameMap(deFunc, params, renameMap);
    for (const helper of analysis.functions) {
        if (helper.name === selectedFunc) continue;
        try {
            const helperAst = parse(helper.raw, { quiet: true });
            renameVariables(helperAst, helperRenameMap);
            helpersCode += generate(helperAst) + '\n';
        } catch (e) {
            warnings.push(`Failed to transform helper function ${helper.name}: ${e}`);
            helpersCode += helper.raw + '\n';
        }
    }

    // ── Uniform declarations ──
    let uniformsCode = generateUniformDeclarations(params);

    // Inject common Fragmentarium math defines when the formula uses them
    // (normally provided by MathUtils.frag #include, but not in our builtin subset)
    const allFormulaCode = helpersCode + '\n' + deFunc.body;
    const FRAG_MATH_DEFINES: Array<[RegExp, string]> = [
        [/\bPhi\b/, '#define Phi 1.61803398874989'],
        [/\bTWO_PI\b/, '#define TWO_PI 6.28318530717959'],
    ];
    for (const [pattern, define] of FRAG_MATH_DEFINES) {
        if (pattern.test(allFormulaCode)) {
            uniformsCode = define + '\n' + uniformsCode;
        }
    }

    // ── Loop body extraction + transformation ──
    const { loopBody: rawLoopBody, warnings: loopWarnings } = extractLoopBody(deFunc, renameMap);
    let loopBody = rawLoopBody;
    warnings.push(...loopWarnings);

    // ── Collect variables declared in loop body to avoid redefinition ──
    // Global literal-init variables (e.g. `int i = 0;`, `float useScale = 0.0;`) become
    // init code, but if the loop body re-declares them, we get GLSL redefinition errors.
    const loopDeclaredVars = new Set<string>();
    for (const m of loopBody.matchAll(/\b(?:float|int|vec[234]|mat[234]|bool)\s+(\w+)/g)) {
        loopDeclaredVars.add(m[1]);
    }
    if (deFunc.loop?.counterVar) loopDeclaredVars.add(deFunc.loop.counterVar);

    // ── Init code (split by frequency) ──
    const initSplit = generateInitCode(analysis, renameMap, loopDeclaredVars);
    let baseInit = initSplit.perPixel.replace(/\bfrag_pos\b/g, 'f_z');
    let onceInit = initSplit.once.replace(/\bfrag_pos\b/g, 'f_z');

    let preLoopDecls = extractPreLoopDeclarations(deFunc, renameMap, warnings);
    preLoopDecls = preLoopDecls.replace(/\bfrag_pos\b/g, 'f_z');

    // Prepend for-loop counter init decl
    const counterInitDecl = deFunc.loop?.counterInitDecl;
    if (counterInitDecl && deFunc.loop?.type === 'for') {
        const renamedDecl = applyRenameToExpression(counterInitDecl, renameMap);
        preLoopDecls = `    ${renamedDecl};\n` + preLoopDecls;
    }

    // ── Vec4 tracker detection ──
    const { trackerVar: vec4Tracker } = detectVec4Tracker(preLoopDecls);
    if (vec4Tracker) {
        const patched = patchVec4Tracker(preLoopDecls, loopBody, vec4Tracker);
        preLoopDecls = patched.preLoopDecls;
        loopBody = patched.loopBody;
    }

    // ── Vec3 working variable detection ──
    let vec3WorkingVar: string | null = null;
    if (!vec4Tracker) {
        vec3WorkingVar = detectVec3WorkingVar(preLoopDecls);
        if (vec3WorkingVar) {
            preLoopDecls = patchVec3Anchor(preLoopDecls, vec3WorkingVar);
        }
    }

    // ── Accumulator pattern detection (NewMenger-style) ──
    let loopInitCode: string | undefined;
    let isAccumulator = false;
    if (!vec4Tracker && deFunc.distanceExpression) {
        const accumResult = detectAccumulatorPattern({
            distVar: deFunc.distanceExpression,
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

    // ── Scalar DR accumulator detection ──
    // Detects `float s = 1.0; ... s *= k; ... return length(p)/s;`
    // Maps the scalar to `dr` so the engine tracks it across iterations.
    let scalarDRVar: string | null = null;
    if (!vec4Tracker && !isAccumulator) {
        const drResult = detectScalarDRAccumulator(preLoopDecls, loopBody, deFunc.distanceExpression);
        if (drResult.drVar) {
            scalarDRVar = drResult.drVar;
            // Remove the DR var from pre-loop declarations, preserving other
            // variables in the same comma-separated declaration.
            // E.g. `float s=2., l=0.;` with drVar='s' → `dr = 2.;\nfloat l = 0.;`
            preLoopDecls = removeVarFromDecl(preLoopDecls, drResult.drVar, `dr = ${drResult.initExpr};`);
            // Replace the variable with `dr` in both pre-loop decls and loop body
            const drRenameRx = new RegExp(`\\b${drResult.drVar}\\b`, 'g');
            preLoopDecls = preLoopDecls.replace(drRenameRx, 'dr');
            loopBody = loopBody.replace(drRenameRx, 'dr');
        }
    }

    // ── Orbit trap ──
    // Strip local vec4 g_orbitTrap declarations — these shadow the engine global
    // and prevent coloring from working. After rename (orbitTrap→g_orbitTrap),
    // declarations like `vec4 g_orbitTrap = vec4(10000.0);` become local shadows.
    // Convert to assignment so the engine global is updated instead.
    const stripOrbitTrapDecl = (code: string) =>
        code.replace(/\bvec4\s+g_orbitTrap\b/g, 'g_orbitTrap');
    helpersCode = stripOrbitTrapDecl(helpersCode);
    loopBody = stripOrbitTrapDecl(loopBody);
    preLoopDecls = stripOrbitTrapDecl(preLoopDecls);
    baseInit = stripOrbitTrapDecl(baseInit);

    const usesOrbitTrap = helpersCode.includes('g_orbitTrap') || loopBody.includes('g_orbitTrap');
    // Always extract trap from orbit — if formula uses g_orbitTrap, extract from that;
    // otherwise provide a default trap (distance to origin) so coloring always works.
    const orbitTrapExtract = usesOrbitTrap
        ? `    trap = min(trap, length(g_orbitTrap.xyz));\n`
        : `    trap = min(trap, dot(f_z, f_z));\n`;

    // ── Assemble init code ──
    const initParts = [baseInit, preLoopDecls].filter(s => s.trim().length > 0);
    const initCode = initParts.map(s =>
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

    // ── getDist generation ──
    let getDistCode: string | undefined;
    if (isAccumulator) {
        getDistCode = 'return vec2(dr, iter);';
    } else {
        const gdResult = generateGetDist(deFunc, analysis, renameMap, vec4Tracker, loopBody, scalarDRVar);
        getDistCode = gdResult.getDist;
        warnings.push(...gdResult.warnings);
    }

    // ── Full-DE fallback checks ──

    // Check -1: Pre-loop code contains `return <value>;` statements.
    // These come from early-return branches in the DE body (e.g. BuffaloBulb's
    // `if(UseDeltaDE) { ... return 0.5 * r * log(r)/dr; }` before the main loop).
    // In per-iteration mode the pre-loop code lives inside `void formula_*()`,
    // where `return <value>` is a GLSL error.
    {
        const preLoopCode = initCode + '\n' + preLoopDecls;
        // Match `return <expr>;` but not bare `return;` (which is valid in void)
        if (/\breturn\s+[^;]+;/.test(preLoopCode)) {
            const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
            if (fullDE) return { ok: true, value: fullDE };
        }
    }

    // Check 0: No-loop formulas that call helper functions (delta-DE, complex DE)
    // These run the entire DE once per pixel; per-iteration mode is meaningless.
    if (!deFunc.loop) {
        const helperNames = analysis.functions.filter(f => f.name !== selectedFunc).map(f => f.name);
        const bodyCallsHelper = helperNames.some(h => new RegExp(`\\b${h}\\s*\\(`).test(deFunc.body));
        if (bodyCallsHelper) {
            const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
            if (fullDE) return { ok: true, value: fullDE };
        }
    }

    // Check 1: getDist references out-of-scope locals
    if (getDistCode && hasOutOfScopeRefs(getDistCode, analysis, params)) {
        const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
        if (fullDE) return { ok: true, value: fullDE };
        warnings.push('Full-DE fallback failed; getDist may reference out-of-scope variables');
    }

    // Check 1b: No-loop formulas where the body declares locals that shadow getDist
    // params ('r', 'dr'). These locals have formula-specific meaning, not engine meaning.
    if (!deFunc.loop && getDistCode) {
        const bodyDeclaresRorDR = /\bfloat\s+(?:r|dr)\b/.test(loopBody);
        if (bodyDeclaresRorDR) {
            const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
            if (fullDE) return { ok: true, value: fullDE };
        }
    }

    // Check 2: Unbounded vec4 inversion pattern
    if (vec4Tracker && getDistCode) {
        const rawBody = deFunc.loop?.body ?? deFunc.body;
        const hasDotDivision = /\/\s*dot\s*\(/.test(rawBody);
        const hasClamped = /clamp\s*\(\s*dot\s*\(/.test(rawBody);
        if (hasDotDivision && !hasClamped) {
            const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
            if (fullDE) return { ok: true, value: fullDE };
        }
    }

    // Check 3: Loop body uses counter variable for iteration-dependent logic
    // (e.g. `if (i == iterA)` — conditional transforms on specific iterations).
    // Per-iteration mode always has i=0, so these comparisons are broken.
    if (deFunc.loop?.counterVar) {
        const cv = deFunc.loop.counterVar;
        // Strip the standard ColorIterations pattern (i < int(uParamC)) — it's benign with i=0
        const stripped = loopBody
            .replace(new RegExp(`\\b${cv}\\s*<\\s*int\\(uParamC\\)`, 'g'), '')
            .replace(new RegExp(`\\b${cv}\\s*<\\s*int\\(uIterations\\)`, 'g'), '');
        // If counter still appears in the remaining loop body, it's used for
        // iteration-dependent logic that per-iteration mode can't provide.
        if (new RegExp(`\\b${cv}\\b`).test(stripped)) {
            const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
            if (fullDE) return { ok: true, value: fullDE };
        }
    }

    // Check 4: Post-loop position modifications (p/=s, p-=clamp(...), etc.)
    // These transforms are lost in per-iteration mode since getDist only sees
    // the loop's final position, not the post-loop adjusted position.
    if (hasPostLoopPositionMods(deFunc)) {
        const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
        if (fullDE) return { ok: true, value: fullDE };
    }

    // Check 5: Pre-loop position modifications (p.y+=1.4, p=abs(p), etc.)
    // In per-iteration mode these run every iteration, but should run once.
    // Common in DEC fractals with pre-loop transforms.
    if (hasPreLoopPositionMods(deFunc)) {
        const fullDE = generateFullDE(deFunc, analysis, name, params, renameMap, helpersCode, uniformsCode);
        if (fullDE) return { ok: true, value: fullDE };
    }

    // ── Merge once-per-pixel init into loopInit ──
    const loopInitParts = [onceInit, loopInitCode].filter(s => s?.trim());
    const finalLoopInit = loopInitParts.length > 0 ? loopInitParts.join('\n') : undefined;

    return {
        ok: true,
        value: {
            functionCode: fixIntFloatArithmetic(functionCode).replace(/\r/g, ''),
            uniformDeclarations: uniformsCode.replace(/\r/g, ''),
            loopBodyCall,
            getDist: getDistCode,
            loopInit: finalLoopInit?.replace(/\r/g, ''),
            warnings,
            mode: 'per-iteration',
        },
    };
}
