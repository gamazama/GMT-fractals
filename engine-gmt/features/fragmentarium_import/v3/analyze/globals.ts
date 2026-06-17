/**
 * V3 Global variable extraction.
 *
 * Classifies global-scope variable declarations into three categories:
 *   - computed:      has initializer referencing uniforms/functions (non-const in GLSL ES)
 *   - uninitialized: declared without initializer (e.g. `mat3 rot;`)
 *   - literalInit:   has literal initializer (e.g. `float l = 0.0;`)
 */

import type { GlobalAnalysis } from '../types';

const GLSL_TYPES = /^(?:vec4|vec3|vec2|float|int|bool|mat2|mat3|mat4)$/;

/** HLSL-style type aliases commonly used in Fragmentarium */
const TYPE_ALIASES: Record<string, string> = {
    float2: 'vec2', float3: 'vec3', float4: 'vec4',
    int2: 'ivec2', int3: 'ivec3', int4: 'ivec4',
    double: 'float',
};

/**
 * Extract and classify all global variable declarations from source.
 * Should be called on the CLEANED source (after macro expansion) so that
 * #define values like Phi are expanded in computed global expressions.
 */
export function extractGlobals(source: string): GlobalAnalysis {
    const computed: GlobalAnalysis['computed'] = [];
    const uninitialized: GlobalAnalysis['uninitialized'] = [];
    const literalInit: GlobalAnalysis['literalInit'] = [];

    const lines = source.split('\n');
    let braceDepth = 0;

    for (let rawLine of lines) {
        // Strip \r, block comments, and line comments before matching
        const line = rawLine.replace(/\r$/, '').replace(/\/\*.*?\*\//g, '').replace(/\/\/.*/, '').trimEnd();

        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        if (braceDepth > 0) continue;
        if (/\buniform\b/.test(line)) continue;

        // Declaration line: `type name = expr;` or `type a = expr, b = expr, c;`
        // Handles single, comma-separated with initializers, and mixed initialized/uninitialized.
        // Also handles `const type name = expr;` and HLSL-style aliases (float3, float4, etc.)
        const typeMatch = line.match(/^\s*(?:(?:const|varying|attribute)\s+)?(vec4|vec3|vec2|ivec[234]|float|int|bool|mat[234](?:x[234])?|float[234]|double)\s+(.+);\s*$/);
        if (typeMatch) {
            const type = TYPE_ALIASES[typeMatch[1]] || typeMatch[1];
            const declBody = typeMatch[2];

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

            for (const part of parts) {
                const initMatch = part.match(/^(\w+)\s*=\s*([\s\S]+)$/);
                if (initMatch) {
                    const name = initMatch[1];
                    const expr = initMatch[2].trim();
                    const isComputed = /[A-Z]\w*/.test(expr) || /\w+\s*\(/.test(expr);
                    if (isComputed) {
                        computed.push({ type, name, expression: expr });
                    } else {
                        literalInit.push({ type, name, expression: expr });
                    }
                } else if (/^\w+$/.test(part)) {
                    uninitialized.push({ type, name: part });
                }
            }
            continue;
        }
    }

    return { computed, uninitialized, literalInit };
}
