/**
 * Init code generation.
 * Produces the per-iteration preamble that is emitted inside the formula function body.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import type { DEFunctionInfo, FragDocumentV2 } from '../types';
import { renameVariables, applyRenameToExpression } from './variable-renamer';

/**
 * Generate initialization code for the formula.
 * Emits (in order):
 *   1. Literal-initialized global declarations as locals ("float l = 0.0;")
 *      Uninitialized globals ("mat3 rot;") are kept at global scope in code-generator
 *      so helper functions can see them — only the init() assignment goes here.
 *   2. Computed global declarations with renamed uniform refs
 *   3. Inlined init() function body
 */
export function generateInitCode(doc: FragDocumentV2, renameMap: Record<string, string>): string {
    const initLines: string[] = [];

    // 1. Literal-initialized globals only — re-declared as locals so they reset each iteration.
    // Uninitialized globals (mat3 rot; etc.) are emitted at global scope by the code generator.
    for (const gd of doc.globalDecls) {
        if (gd.expression !== undefined) {
            initLines.push(`    ${gd.type} ${gd.name} = ${gd.expression};`);
        }
    }

    // 2. Computed globals re-declared as local variables
    for (const cg of doc.computedGlobals) {
        const renamedExpr = applyRenameToExpression(cg.expression, renameMap);
        initLines.push(`    ${cg.type} ${cg.name} = ${renamedExpr};`);
    }

    // 3. Inline init() function body if present
    if (doc.initFunction) {
        try {
            const initAst = parse(`void __init_temp__() ${doc.initFunction.body}`);
            renameVariables(initAst, renameMap);
            let initCode = generate(initAst);
            const firstBrace = initCode.indexOf('{');
            const lastBrace = initCode.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                initCode = initCode.slice(firstBrace + 1, lastBrace).trim();
            }
            if (initCode) {
                if (doc.globalDecls.length > 0 || doc.computedGlobals.length > 0) {
                    initLines.push('    // init():');
                }
                const indented = initCode.split('\n').map(l => '    ' + l.trim()).join('\n');
                initLines.push(indented);
            }
        } catch (e) {
            console.warn('Failed to transform init() function:', e);
            let cleaned = doc.initFunction.body.trim();
            if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
                cleaned = cleaned.slice(1, -1).trim();
            }
            if (cleaned) {
                initLines.push('    // init() (untransformed):');
                initLines.push(cleaned.split('\n').map(l => '    ' + l.trim()).join('\n'));
            }
        }
    }

    return initLines.join('\n');
}

/**
 * Extract variable declarations that appear before the first loop in the DE
 * function body. These become init code inside the GMT formula function.
 */
export function extractPreLoopDeclarations(
    deFunc: DEFunctionInfo,
    renameMap: Record<string, string>,
    warnings: string[]
): string {
    let body = deFunc.body.trim();
    if (body.startsWith('{') && body.endsWith('}')) {
        body = body.slice(1, -1).trim();
    }

    const loopMatch = body.match(/\bfor\s*\(|\bwhile\s*\(/);
    if (!loopMatch || loopMatch.index === undefined) return '';

    const preLoop = body.slice(0, loopMatch.index).trim();
    if (!preLoop) return '';

    let renamed = preLoop;
    try {
        const wrapped = `void __preinit__() {\n${preLoop}\n}`;
        const ast = parse(wrapped);
        renameVariables(ast, renameMap);
        const generated = generate(ast);
        const bodyMatch = generated.match(/void __preinit__\(\)\s*\{([\s\S]*)\}/);
        if (bodyMatch) renamed = bodyMatch[1].trim();
    } catch (e) {
        warnings.push(`Pre-loop rename failed, using raw declarations: ${e}`);
    }

    const FORMULA_PARAMS = new Set(['z', 'dr', 'trap', 'c', 'f_z']);
    const kept: string[] = [];
    for (const raw of renamed.split(';')) {
        const stmt = raw.trim();
        if (!stmt) continue;
        if (/\bvec[234]\s+f_z\b/.test(stmt)) continue;
        const declNameMatch = stmt.match(/\b(?:float|vec[234]|mat[234]|int|bool)\s+(\w+)/);
        if (declNameMatch && FORMULA_PARAMS.has(declNameMatch[1])) continue;
        kept.push(stmt + ';');
    }

    return kept.join('\n');
}
