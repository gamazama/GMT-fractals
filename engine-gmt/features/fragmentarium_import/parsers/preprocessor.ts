/**
 * Fragmentarium source preprocessor.
 * Strips custom Fragmentarium syntax before AST parsing, and extracts
 * computed globals / global declarations that must be hoisted.
 */

import type { ComputedGlobal, GlobalDecl } from '../types';

/**
 * Collect computed globals — global variable declarations whose initialisers reference
 * Fragmentarium uniforms (capitalised names). These are invalid GLSL at global scope
 * (non-constant initialisers) and must be stripped before AST parsing. They are
 * re-injected later as local variable declarations inside the formula function.
 */
export function extractComputedGlobals(source: string): ComputedGlobal[] {
    const result: ComputedGlobal[] = [];
    const lines = source.split('\n');
    let braceDepth = 0;

    for (const line of lines) {
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth > 0) continue;

        const m = line.match(/^\s*(vec4|vec3|vec2|float|int|mat2|mat3|mat4)\s+(\w+)\s*=\s*([^;]+);/);
        if (!m) continue;

        const [, type, name, expr] = m;
        if (/[A-Z]\w*/.test(expr) || /\w+\s*\(/.test(expr)) {
            result.push({ type, name, expression: expr.trim() });
        }
    }
    return result;
}

/**
 * Collect uninitialized global declarations that must be hoisted into the formula
 * function as local variables so they work across iterations.
 * Example: mat3 rot;
 */
export function extractGlobalDeclarations(source: string): GlobalDecl[] {
    const result: GlobalDecl[] = [];
    const lines = source.split('\n');
    let braceDepth = 0;

    for (const line of lines) {
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth > 0) continue;
        if (/\buniform\b/.test(line)) continue;

        // Uninitialized globals: "mat3 rot;" or "float sc, sr;"
        const mUninit = line.match(/^\s*(mat2|mat3|mat4|vec2|vec3|vec4|float|int|bool)\s+([\w\s,]+);\s*$/);
        if (mUninit) {
            const names = mUninit[2].split(',').map(n => n.trim()).filter(n => /^\w+$/.test(n));
            for (const name of names) {
                result.push({ type: mUninit[1], name });
            }
            continue;
        }

        // Literal-initialized globals: "float l = 0.0;"
        // Only capture if expression has NO uppercase identifiers or function calls
        // (those are computed globals, handled by extractComputedGlobals).
        const mLit = line.match(/^\s*(vec4|vec3|vec2|float|int|bool)\s+(\w+)\s*=\s*([^;]+);\s*$/);
        if (mLit) {
            const [, type, name, expr] = mLit;
            if (/[A-Z]\w*/.test(expr) || /\w+\s*\(/.test(expr)) continue;
            result.push({ type, name, expression: expr.trim() });
        }
    }
    return result;
}

/**
 * Pre-process Fragmentarium source to remove custom syntax that's not valid GLSL.
 * Strips: slider[...] annotations, #group, #preset blocks, computed globals, #include.
 * Adds an orbitTrap stub so AST parsing succeeds even when DE-Raytracer.frag is absent.
 */
export function preprocessFragmentariumSource(source: string): string {
    let cleaned = source;

    cleaned = cleaned.replace(/\s*slider\[[^\]]+\];?/g, '');
    cleaned = cleaned.replace(/\s*checkbox\[[^\]]+\];?/g, '');
    cleaned = cleaned.replace(/\s*color\[[^\]]+\];?/g, '');
    cleaned = cleaned.replace(/\s*menu\[[^\]]+\];?/g, '');
    // Strip trailing ';' after '}' — C-compatible but invalid in GLSL ES (affects if-blocks and function closings)
    cleaned = cleaned.replace(/\}\s*;/g, '}');
    cleaned = cleaned.replace(/\s+\b(Locked|Unlocked)\b/g, '');
    cleaned = cleaned.replace(/^#group\s+.+$/gm, '');
    cleaned = cleaned.replace(/#preset\s+\w+[\s\S]*?#endpreset/g, '');
    cleaned = cleaned.replace(/^#info\s+.+$/gm, '');
    cleaned = cleaned.replace(/^#camera\s+.+$/gm, '');
    cleaned = cleaned.replace(/^#include\s+.+$/gm, '');

    // Strip computed globals at global scope only (scope-aware)
    {
        let depth = 0;
        const lines = cleaned.split('\n');
        const strippedLines: string[] = [];
        for (const line of lines) {
            depth += (line.match(/{/g) || []).length;
            depth -= (line.match(/}/g) || []).length;
            if (depth > 0) {
                strippedLines.push(line);
                continue;
            }
            const stripped = line.replace(
                /^(\s*(?:vec4|vec3|vec2|float|int|mat2|mat3|mat4)\s+\w+)\s*=\s*([^;]+);/,
                (match, decl, expr) => {
                    if (/[A-Z]\w*/.test(expr) || /\w+\s*\(/.test(expr)) {
                        return `${decl.trim()};  // computed global – re-injected as local`;
                    }
                    // Also strip literal-initialized globals (float l = 0.0; → float l;)
                    // so they don't conflict with the local declaration injected into the formula function.
                    return `${decl.trim()};  // literal global – re-injected as local`;
                }
            );
            strippedLines.push(stripped);
        }
        cleaned = strippedLines.join('\n');
    }

    if (/\borbitTrap\b/.test(cleaned) && !/\borbitTrap\s*;/.test(cleaned)) {
        cleaned = 'vec4 orbitTrap = vec4(10000.0);\n' + cleaned;
    }

    return cleaned;
}
