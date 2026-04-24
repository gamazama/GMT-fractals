/**
 * V3 Loop body extraction and transformation.
 *
 * Extracts the iteration loop body from a DE function, applies variable renaming,
 * orbit trap normalization, swizzle fixes, and boxFold renaming.
 */

import type { FunctionAnalysis } from '../types';
import { renameCodeBlock, applyRenameToExpression } from './rename';
import { transformTrapMin, expandSwizzleWrites } from './patterns';

/**
 * Extract and transform the loop body for per-iteration mode.
 *
 * @returns The transformed loop body code and any warnings.
 */
export function extractLoopBody(
    deFunc: FunctionAnalysis,
    renameMap: Record<string, string>,
): { loopBody: string; warnings: string[] } {
    const warnings: string[] = [];
    const counterVar = deFunc.loop?.counterVar ?? null;

    let loopBody: string;
    if (deFunc.loop) {
        loopBody = deFunc.loop.body.trim();
        if (loopBody.startsWith('{') && loopBody.endsWith('}')) {
            loopBody = loopBody.slice(1, -1).trim();
        }
        // Remove counter increment in while loops (engine handles iteration counting)
        if (counterVar && deFunc.loop.type === 'while') {
            loopBody = loopBody.replace(new RegExp(`\\b${counterVar}\\+\\+;?`, 'g'), '');
        }
        // Remove break statements (engine controls loop termination)
        loopBody = loopBody.replace(/\bbreak\s*;/g, '{ /* break removed */ }');

        // Append for-loop increment expression (e.g. `s *= e` from `for(...; s*=e)`)
        // Strip the counter increment (i++, ++i) since the engine handles iteration counting
        if (deFunc.loop.type === 'for' && deFunc.loop.increment) {
            let incr = deFunc.loop.increment.trim();
            // Remove counter increments (i++, ++i, i+=1)
            if (counterVar) {
                incr = incr
                    .replace(new RegExp(`\\b${counterVar}\\s*\\+\\+`, 'g'), '')
                    .replace(new RegExp(`\\+\\+\\s*${counterVar}`, 'g'), '')
                    .replace(new RegExp(`\\b${counterVar}\\s*\\+=\\s*1`, 'g'), '')
                    .trim();
            }
            // If there's remaining increment logic (comma-separated expressions),
            // append as a statement at the end of the loop body
            if (incr && !/^\s*$/.test(incr)) {
                // Clean up leading/trailing commas from removed counter increments
                incr = incr.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
                if (incr) {
                    loopBody = loopBody + `\n${incr};`;
                }
            }
        }
    } else {
        // No loop — use entire function body minus return statements
        loopBody = deFunc.body.replace(/return\s+[^;]+;/g, '').trim();
        if (loopBody.startsWith('{') && loopBody.endsWith('}')) {
            loopBody = loopBody.slice(1, -1).trim();
        }
    }

    // AST rename of loop body
    const renamed = renameCodeBlock(loopBody, renameMap);
    loopBody = renamed.code;
    if (!renamed.ok) {
        warnings.push('AST rename failed for loop body, using regex fallback');
    }

    // Transform orbit trap patterns
    loopBody = transformTrapMin(loopBody);

    // Rename boxFold → frag_boxFold (avoid collision with GMT's built-in)
    loopBody = loopBody.replace(/\bboxFold\b/g, 'frag_boxFold');

    // Expand non-monotonic swizzle writes
    loopBody = expandSwizzleWrites(loopBody);

    // Replace value-returning return statements with void return
    // (providesInside formulas return true/false, not distance)
    loopBody = loopBody.replace(/\breturn\s+[^;{]+;/g, 'return;');

    // Context-dependent replacement of frag_pos placeholder
    // Loop body refs → c.xyz (engine's constant: initial position or Julia constant)
    loopBody = loopBody.replace(/\bfrag_pos\b/g, 'c.xyz');

    // Fix declarations that shadow formula function parameters.
    // After rename, the body may have `vec3 f_z = ...` or `float dr = ...` which
    // conflict with the template's `inout vec4 z, inout float dr, inout float trap`.
    // Convert declarations to assignments for f_z, and rename `float dr` → `float frag_dr`.
    loopBody = loopBody.replace(/\bvec3\s+f_z\s*=/g, 'f_z =');
    loopBody = loopBody.replace(/\bvec3\s+f_z\s*;/g, '');

    return { loopBody, warnings };
}
