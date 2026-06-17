/**
 * V3 getDist expression generation.
 *
 * Transforms the DE function's return expression into a getDist body
 * suitable for GMT's `vec2 getDist(float r, float dr, float iter, vec4 z)`.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import type { FormulaAnalysis, FunctionAnalysis, ImportedParam } from '../types';
import { renameVariables, applyRenameToExpression, slotToUniform } from './rename';

// ============================================================================
// Scope analysis
// ============================================================================

const GLSL_SCOPE = new Set([
    // getDist parameters
    'r', 'dr', 'iter', 'z',
    // GLSL builtins
    'abs', 'acos', 'all', 'any', 'asin', 'atan', 'ceil', 'clamp', 'cos', 'cross', 'degrees',
    'distance', 'dot', 'equal', 'exp', 'exp2', 'faceforward', 'floor', 'fract',
    'greaterThan', 'greaterThanEqual', 'inversesqrt', 'length', 'lessThan', 'lessThanEqual',
    'log', 'log2', 'mat2', 'mat3', 'mat4', 'max', 'min', 'mix', 'mod', 'normalize', 'not',
    'notEqual', 'outerProduct', 'pow', 'radians', 'reflect', 'refract', 'sign', 'sin',
    'sinh', 'smoothstep', 'sqrt', 'step', 'tan', 'tanh', 'transpose',
    // types & keywords
    'bool', 'bvec2', 'bvec3', 'bvec4', 'float', 'int', 'ivec2', 'ivec3', 'ivec4',
    'uint', 'uvec2', 'uvec3', 'uvec4', 'vec2', 'vec3', 'vec4',
    'true', 'false', 'return', 'if', 'else', 'for', 'while',
    // GMT builtins always in scope
    'uIterations', 'uJulia', 'uJuliaMode', 'g_orbitTrap', 'frag_pos',
    'frag_cachedDist', 'frag_iterCount', 'frag_DE',
    // Engine constants / renamed variables that appear in getDist expressions
    'MAX_HARD_ITERATIONS', 'f_z', 'f_i',
]);

/**
 * Check if a getDist expression references variables that wouldn't be in scope.
 */
export function hasOutOfScopeRefs(
    getDistCode: string,
    analysis: FormulaAnalysis,
    params: ImportedParam[],
): boolean {
    const valid = new Set(GLSL_SCOPE);

    // Add uniform slot names
    for (const p of params) {
        if (p.slot && p.slot !== 'ignore' && p.slot !== 'fixed' && p.slot !== 'builtin' && p.slot !== '') {
            valid.add(slotToUniform(p.slot));
        }
    }
    // Add u_Name baked constants
    for (const p of params) valid.add(`u_${p.name}`);

    // Add function names
    for (const f of analysis.functions) valid.add(f.name);

    // Add globals
    for (const cg of analysis.globals.computed) valid.add(cg.name);
    for (const gd of analysis.globals.uninitialized) valid.add(gd.name);
    for (const gd of analysis.globals.literalInit) valid.add(gd.name);

    // Extract identifiers (strip swizzle/field access)
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
// getDist generation
// ============================================================================

/**
 * Generate getDist expression from the DE function's distance expression.
 *
 * @returns getDist code string (e.g. `return vec2(expr, iter);`) or undefined if not possible.
 */
export function generateGetDist(
    deFunc: FunctionAnalysis,
    analysis: FormulaAnalysis,
    renameMap: Record<string, string>,
    vec4Tracker: string | null,
    loopBody: string,
    scalarDRVar?: string | null,
): { getDist: string | undefined; warnings: string[] } {
    const warnings: string[] = [];

    if (!deFunc.distanceExpression) return { getDist: undefined, warnings };

    // Skip bool return expressions (providesInside formulas)
    if (/^(true|false)$/.test(deFunc.distanceExpression.trim())) {
        return { getDist: undefined, warnings };
    }

    try {
        const counterVar = deFunc.loop?.counterVar ?? null;
        const getDistRenameMap: Record<string, string> = {
            ...renameMap,
            'f_z': 'z.xyz',
            'f_i': 'int(iter)',
            'frag_pos': 'z.xyz',
        };
        if (counterVar) getDistRenameMap[counterVar] = 'int(iter)';
        if (vec4Tracker) getDistRenameMap[vec4Tracker] = 'z';
        if (scalarDRVar) getDistRenameMap[scalarDRVar] = 'dr';

        // Map globally-declared float variables that accumulate loop length to `r`
        for (const gd of analysis.globals.uninitialized) {
            if (gd.type !== 'float') continue;
            const lengthAssign = new RegExp(`\\b${gd.name}\\s*=\\s*length\\s*\\(`);
            if (lengthAssign.test(loopBody)) {
                getDistRenameMap[gd.name] = 'r';
            }
        }
        for (const gd of analysis.globals.literalInit) {
            if (gd.type !== 'float') continue;
            const lengthAssign = new RegExp(`\\b${gd.name}\\s*=\\s*length\\s*\\(`);
            if (lengthAssign.test(loopBody)) {
                getDistRenameMap[gd.name] = 'r';
            }
        }

        const distAst = parse(`void _temp() { float _d = ${deFunc.distanceExpression}; }`, { quiet: true });
        renameVariables(distAst, getDistRenameMap);
        const distCode = generate(distAst);
        const distMatch = distCode.match(/float _d = ([^;]+);/);
        let renamedExpr = distMatch ? distMatch[1] : deFunc.distanceExpression;

        renamedExpr = renamedExpr.replace(/\bf_z\b/g, 'z.xyz');
        renamedExpr = renamedExpr.replace(/\bf_i\b/g, 'int(iter)');

        // Inline computed globals
        if (analysis.globals.computed.length > 0) {
            const sorted = [...analysis.globals.computed].sort((a, b) => b.name.length - a.name.length);
            for (const cg of sorted) {
                const inlined = applyRenameToExpression(cg.expression, getDistRenameMap);
                renamedExpr = renamedExpr.replace(new RegExp(`\\b${cg.name}\\b`, 'g'), `(${inlined})`);
            }
        }

        if (vec4Tracker) renamedExpr = renamedExpr.replace(/\bz\.w\b/g, 'dr');

        renamedExpr = renamedExpr.replace(/\blength\s*\(\s*z\.xyz\s*\)/g, 'r');
        renamedExpr = renamedExpr.replace(/\blength\s*\(\s*z\s*\)/g, 'r');

        return { getDist: `return vec2(${renamedExpr}, iter);`, warnings };
    } catch (e) {
        warnings.push(`Failed to generate getDist: ${e}`);
        return { getDist: undefined, warnings };
    }
}
