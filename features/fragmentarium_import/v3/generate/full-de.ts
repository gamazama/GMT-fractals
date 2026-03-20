/**
 * V3 Full-DE fallback mode.
 *
 * When per-iteration splitting would break rendering (out-of-scope locals in getDist,
 * unbounded vec4 inversion), the entire DE runs in a single frag_DE() function.
 */

import { parse, generate } from '@shaderfrog/glsl-parser';
import type { FormulaAnalysis, FunctionAnalysis, ImportedParam, GeneratedFormula } from '../types';
import { renameVariables, applyRenameToExpression } from './rename';
import { expandSwizzleWrites, fixIntFloatArithmetic } from './patterns';

// ============================================================================
// Templates
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

// ============================================================================
// Helpers
// ============================================================================

/** Find the position variable in a full-DE body for orbit trap tracking. */
function findPositionVar(body: string): string {
    const vec4Match = body.match(/vec4\s+(\w+)\s*=\s*vec4\s*\(\s*f_z\b/);
    if (vec4Match) return vec4Match[1] + '.xyz';
    const vec3Match = body.match(/vec3\s+(\w+)\s*=\s*f_z\b/);
    if (vec3Match) return vec3Match[1];
    return 'f_z';
}

/** Inject orbit trap tracking and iteration counting into the main loop. */
function injectOrbitTracking(body: string, posExpr: string): string {
    const loopMatch = body.match(/(for|while)\s*\(/);
    if (!loopMatch || loopMatch.index === undefined) return body;

    let pos = loopMatch.index + loopMatch[0].length;
    let depth = 1;
    while (pos < body.length && depth > 0) {
        if (body[pos] === '(') depth++;
        else if (body[pos] === ')') depth--;
        pos++;
    }
    while (pos < body.length && /\s/.test(body[pos])) pos++;
    if (pos >= body.length || body[pos] !== '{') return body;

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

/**
 * Replace hardcoded integer loop limits with MAX_HARD_ITERATIONS + runtime uIterations break.
 */
function replaceHardcodedLoopLimit(body: string): { body: string; replaced: boolean; oldLimit?: string; counterVar?: string } {
    const forMatch = body.match(/for\s*\(\s*int\s+(\w+)\s*=\s*\d+\s*;\s*\1\s*<\s*(\d+)\s*;/);
    if (!forMatch) return { body, replaced: false };
    const counterVar = forMatch[1];
    const hardLimit = forMatch[2];
    if (parseInt(hardLimit, 10) < 4) return { body, replaced: false };

    let patched = body.replace(
        forMatch[0],
        forMatch[0].replace(new RegExp(`<\\s*${hardLimit}`), '< MAX_HARD_ITERATIONS')
    );
    const openBrace = patched.indexOf('{', patched.indexOf('MAX_HARD_ITERATIONS'));
    if (openBrace >= 0) {
        patched = patched.slice(0, openBrace + 1) +
            `\n        if (${counterVar} >= int(uIterations)) break;` +
            patched.slice(openBrace + 1);
    }
    return { body: patched, replaced: true, oldLimit: hardLimit, counterVar };
}

/**
 * Ensure the DE body has a return statement at the end (outside any block).
 * If the only return is inside a conditional (e.g. bailout `if(r2>B) { return r/Dd; }`),
 * the function falls through without returning — a GLSL compile error.
 *
 * Uses `length(f_z)` as the safe fallback — `f_z` is always in scope as the
 * frag_DE function parameter, unlike locally-scoped variables from the inner return.
 */
function ensureFallbackReturn(body: string): string {
    // Check if there's already a top-level return (outside any { } block)
    const lines = body.split('\n');
    let depth = 0;
    let hasTopLevelReturn = false;
    for (const line of lines) {
        for (const ch of line) {
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
        }
        if (depth === 0 && /\breturn\s+[^;]+;/.test(line)) {
            hasTopLevelReturn = true;
            break;
        }
    }
    if (hasTopLevelReturn) return body;

    // No top-level return. Add a safe fallback using f_z (always in scope).
    return body + '\n    return length(f_z);';
}

// ============================================================================
// Main full-DE generator
// ============================================================================

/**
 * Generate full-DE mode formula where the entire DE runs in one call.
 */
export function generateFullDE(
    deFunc: FunctionAnalysis,
    analysis: FormulaAnalysis,
    name: string,
    params: ImportedParam[],
    renameMap: Record<string, string>,
    helpersCode: string,
    uniformsCode: string,
): GeneratedFormula | null {
    // Sanitize formula name for GLSL identifier safety
    name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'imported';

    // Build the full DE body
    let deBody = deFunc.body.trim();
    if (deBody.startsWith('{') && deBody.endsWith('}')) {
        deBody = deBody.slice(1, -1).trim();
    }

    // Prepend computed globals (literal-initialized globals are at file scope now,
    // but we re-assign them here so each call resets to the initial value)
    const preamble: string[] = [];
    for (const gd of analysis.globals.literalInit) {
        preamble.push(`    ${gd.name} = ${gd.expression};`);
    }
    for (const cg of analysis.globals.computed) {
        const renamedExpr = applyRenameToExpression(cg.expression, renameMap);
        preamble.push(`    ${cg.name} = ${renamedExpr};`);
    }

    // Inline init() body
    if (analysis.init) {
        for (const stmt of analysis.init.statements) {
            // In full-DE mode, all init runs inside frag_DE — no frequency split needed
            if (stmt.code.trim()) preamble.push(`    ${stmt.code};`);
        }
    }

    const fullBody = preamble.join('\n') + '\n' + deBody;

    // AST rename the entire DE body
    let renamedBody: string;
    try {
        const wrapped = `float __frag_de_temp__(vec3 f_z) {\n${fullBody}\n}`;
        const ast = parse(wrapped, { quiet: true });
        renameVariables(ast, renameMap);
        const generated = generate(ast);
        const bodyMatch = generated.match(/float __frag_de_temp__\(vec3 f_z\)\s*\{([\s\S]*)\}/);
        renamedBody = bodyMatch ? bodyMatch[1] : fullBody;
    } catch (e) {
        renamedBody = applyRenameToExpression(fullBody, renameMap);
    }

    // Post-rename transforms
    // Strip local vec4 g_orbitTrap declarations — these shadow the engine global
    renamedBody = renamedBody.replace(/\bvec4\s+g_orbitTrap\b/g, 'g_orbitTrap');
    renamedBody = renamedBody.replace(/\bboxFold\b/g, 'frag_boxFold');
    // If frag_pos is used (parameter was copied to a working variable), declare it
    // as a const copy of the initial position so it survives mutation of f_z.
    // E.g. BuffaloBulb: `z += (Julia ? JuliaC : p)` — p must stay at the original pos.
    if (/\bfrag_pos\b/.test(renamedBody)) {
        renamedBody = '    vec3 frag_pos = f_z;\n' + renamedBody;
    }
    renamedBody = expandSwizzleWrites(renamedBody);

    // Fix variable redefinitions: the DE body may declare variables that conflict
    // with the frag_DE wrapper function parameter (f_z) or common names (dr).
    // Convert `vec3 f_z = expr;` → `f_z = expr;` (parameter already declared)
    renamedBody = renamedBody.replace(/\bvec3\s+f_z\s*=/g, 'f_z =');
    renamedBody = renamedBody.replace(/\bvec4\s+f_z\s*=/g, '{ vec4 f_z4 ='); // vec4 extension
    // Convert `vec3 f_z;` → remove (already declared as parameter)
    renamedBody = renamedBody.replace(/\bvec3\s+f_z\s*;/g, '');

    // Replace hardcoded loop limits
    const loopLimitResult = replaceHardcodedLoopLimit(renamedBody);
    if (loopLimitResult.replaced && loopLimitResult.oldLimit) {
        renamedBody = loopLimitResult.body.replace(
            new RegExp(`float\\s*\\(\\s*1\\s*-\\s*${loopLimitResult.oldLimit}\\s*\\)`, 'g'),
            'float(1 - int(uIterations))'
        );
    } else {
        renamedBody = loopLimitResult.body;
    }

    // Inject orbit trap tracking
    const posVar = findPositionVar(renamedBody);
    renamedBody = injectOrbitTracking(renamedBody, posVar);

    // Ensure frag_DE returns on all code paths.
    // If the only return is inside a conditional (e.g. bailout check), the function
    // may fall through without returning — a GLSL compile error.
    renamedBody = ensureFallbackReturn(renamedBody);

    // Strip g_orbitTrap declarations from helpers too
    helpersCode = helpersCode.replace(/\bvec4\s+g_orbitTrap\b/g, 'g_orbitTrap');

    const functionCode = FULL_DE_TEMPLATE
        .replace('{{HELPERS}}', helpersCode)
        .replace('{{NAME}}', name)
        .replace('{{DE_BODY}}', renamedBody);

    return {
        functionCode: fixIntFloatArithmetic(functionCode).replace(/\r/g, ''),
        uniformDeclarations: uniformsCode.replace(/\r/g, ''),
        loopBodyCall: `formula_${name}(z, dr, trap, c);`,
        getDist: 'return vec2(frag_cachedDist, frag_iterCount);',
        warnings: ['Using full-DE mode: formula runs complete DE internally (no per-iteration engine control)'],
        mode: 'full-de',
    };
}
