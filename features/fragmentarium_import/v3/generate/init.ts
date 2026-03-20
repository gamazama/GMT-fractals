/**
 * V3 Init code emission.
 *
 * Splits initialization code by frequency:
 *   - 'once' code → emitted as loopInit (runs once per pixel, before iteration loop)
 *   - 'per-pixel' code → emitted inside formula function body (runs every iteration)
 *
 * This is improvement #1: rotation matrices, precomputed values from uniforms, etc.
 * are computed once per pixel instead of 100x per pixel.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import type { FormulaAnalysis, FunctionAnalysis, InitFrequency } from '../types';
import { renameVariables, applyRenameToExpression } from './rename';

/** Identifiers that indicate per-pixel dependency. */
const PER_PIXEL_DEPS = new Set([
    'f_z', 'frag_pos', 'z', 'pos', 'p',
    'gl_FragCoord',
]);

/** Classify a computed global by checking if its expression references per-pixel state. */
function classifyExpression(expr: string): InitFrequency {
    const stripped = expr.replace(/\.\w+/g, '');
    const ids = Array.from(stripped.matchAll(/\b([a-zA-Z_]\w*)\b/g), m => m[1]);
    for (const id of ids) {
        if (PER_PIXEL_DEPS.has(id)) return 'per-pixel';
    }
    return 'once';
}

export interface SplitInitResult {
    /** Code for inside formula function body (per-iteration). */
    perPixel: string;
    /** Code for loopInit (once per pixel, before iteration loop). */
    once: string;
}

/**
 * Generate initialization code from analysis results, split by frequency.
 *
 * 'once' code goes to loopInit (before the iteration loop, outside the formula function).
 * 'per-pixel' code stays inside the formula function body.
 *
 * Emits (in order):
 *   1. Literal-initialized globals as locals → per-pixel (must reset each call)
 *   2. Computed globals with renamed uniform refs → classified by dependency
 *   3. Inlined init() function body → classified by dependency
 */
export function generateInitCode(
    analysis: FormulaAnalysis,
    renameMap: Record<string, string>,
    loopDeclaredVars?: Set<string>,
): SplitInitResult {
    const perPixelLines: string[] = [];
    const onceLines: string[] = [];

    // 1. Literal-initialized globals → per-pixel (reset each iteration)
    // These are declared at file scope; here we re-assign to reset each call.
    // Skip globals whose names are re-declared in the loop body or as the loop counter.
    for (const gd of analysis.globals.literalInit) {
        if (loopDeclaredVars?.has(gd.name)) continue;
        perPixelLines.push(`    ${gd.name} = ${gd.expression};`);
    }

    // 2. Computed globals → classify by dependency
    for (const cg of analysis.globals.computed) {
        const renamedExpr = applyRenameToExpression(cg.expression, renameMap);
        const freq = classifyExpression(cg.expression);
        if (freq === 'once') {
            // Goes to loopInit — declared at global scope, assigned once per pixel
            onceLines.push(`${cg.name} = ${renamedExpr};`);
        } else {
            perPixelLines.push(`    ${cg.type} ${cg.name} = ${renamedExpr};`);
        }
    }

    // 3. init() body — classify each statement
    if (analysis.init) {
        const initFunc = findInitBody(analysis);
        if (initFunc) {
            try {
                const initAst = parse(`void __init_temp__() ${initFunc}`, { quiet: true });
                renameVariables(initAst, renameMap);
                let initCode = generate(initAst);
                const firstBrace = initCode.indexOf('{');
                const lastBrace = initCode.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    initCode = initCode.slice(firstBrace + 1, lastBrace).trim();
                }
                if (initCode) {
                    // Classify the init() body as a whole — if any statement depends
                    // on per-pixel state, the whole block goes per-pixel (because
                    // statements may depend on each other)
                    const freq = classifyExpression(initCode);
                    if (freq === 'once') {
                        onceLines.push(initCode);
                    } else {
                        if (perPixelLines.length > 0) perPixelLines.push('    // init():');
                        const indented = initCode.split('\n').map(l => '    ' + l.trim()).join('\n');
                        perPixelLines.push(indented);
                    }
                }
            } catch (e) {
                // Fallback: emit raw as per-pixel
                let cleaned = initFunc.trim();
                if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
                    cleaned = cleaned.slice(1, -1).trim();
                }
                if (cleaned) {
                    perPixelLines.push('    // init() (untransformed):');
                    perPixelLines.push(cleaned.split('\n').map(l => '    ' + l.trim()).join('\n'));
                }
            }
        }
    }

    return {
        perPixel: perPixelLines.join('\n'),
        once: onceLines.join('\n'),
    };
}

/**
 * Find the raw init() function body from the analysis source.
 * We need this because InitAnalysis flattens everything into statements.
 */
function findInitBody(analysis: FormulaAnalysis): string | null {
    // Re-extract from cleaned source. This is a bit redundant but keeps
    // the init emission independent of the analysis ordering.
    const source = analysis.source;
    const match = source.match(/void\s+init\s*\(\s*\)\s*(\{[\s\S]*?\n\})/);
    if (match) return match[1];
    return null;
}

/**
 * Extract variable declarations that appear before the first loop in the DE body.
 * These become init code inside the GMT formula function.
 */
export function extractPreLoopDeclarations(
    deFunc: FunctionAnalysis,
    renameMap: Record<string, string>,
    warnings: string[],
): string {
    let body = deFunc.body.trim();
    if (body.startsWith('{') && body.endsWith('}')) {
        body = body.slice(1, -1).trim();
    }

    const loopMatch = body.match(/\bfor\s*\(|\bwhile\s*\(/);
    if (!loopMatch || loopMatch.index === undefined) return '';

    const preLoop = body.slice(0, loopMatch.index).trim();
    if (!preLoop) return '';

    // AST rename
    let renamed = preLoop;
    try {
        const wrapped = `void __preinit__() {\n${preLoop}\n}`;
        const ast = parse(wrapped, { quiet: true });
        renameVariables(ast, renameMap);
        const generated = generate(ast);
        const bodyMatch = generated.match(/void __preinit__\(\)\s*\{([\s\S]*)\}/);
        if (bodyMatch) renamed = bodyMatch[1].trim();
    } catch (e) {
        warnings.push(`Pre-loop rename failed, using raw declarations: ${e}`);
    }

    // Filter out declarations that shadow formula function parameters
    const FORMULA_PARAMS = new Set(['z', 'dr', 'trap', 'c', 'f_z']);
    const kept: string[] = [];
    for (const raw of renamed.split(';')) {
        const stmt = raw.trim();
        if (!stmt) continue;
        // vec3 f_z = <expr> → convert to assignment (template already declares vec3 f_z)
        const fzInitMatch = stmt.match(/\bvec[234]\s+f_z\s*=\s*([\s\S]+)/);
        if (fzInitMatch) {
            kept.push(`f_z = ${fzInitMatch[1].trim()};`);
            continue;
        }
        const declNameMatch = stmt.match(/\b(?:float|vec[234]|mat[234]|int|bool)\s+(\w+)/);
        if (declNameMatch && FORMULA_PARAMS.has(declNameMatch[1])) continue;
        kept.push(stmt + ';');
    }

    return kept.join('\n');
}
