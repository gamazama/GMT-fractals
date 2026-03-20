/**
 * V3 Init statement analysis with frequency classification.
 *
 * Classifies init() statements and computed globals into:
 *   - 'once':      depends only on uniforms → can be computed once per shader compile
 *   - 'per-pixel': depends on position (f_z, pos, z, p) → must run per pixel
 *
 * This is improvement #1 from the approved list: "Split init() into one-time vs per-iteration."
 * In V2, rotation matrices are recomputed 100x/pixel for no reason because all init code
 * runs per-iteration. V3 classifies by dependency analysis.
 */

import type { InitAnalysis, InitStatement, InitFrequency, GlobalAnalysis } from '../types';

/** Identifiers that indicate per-pixel dependency. */
const PER_PIXEL_DEPS = new Set([
    'f_z', 'frag_pos', 'z', 'pos', 'p',      // position variables
    'gl_FragCoord',                              // pixel coordinate
]);

/** Extract all identifiers from a GLSL statement. */
function extractIdentifiers(code: string): string[] {
    // Strip string-like content and swizzle/field access
    const stripped = code.replace(/\.\w+/g, '');
    const matches = stripped.matchAll(/\b([a-zA-Z_]\w*)\b/g);
    return Array.from(matches, m => m[1]);
}

/** GLSL keywords and type names that should not count as dependencies. */
const GLSL_KEYWORDS = new Set([
    'float', 'int', 'bool', 'vec2', 'vec3', 'vec4', 'mat2', 'mat3', 'mat4',
    'void', 'const', 'if', 'else', 'for', 'while', 'return', 'break', 'continue',
    'true', 'false', 'inout', 'in', 'out',
    // Common GLSL builtins
    'abs', 'acos', 'asin', 'atan', 'ceil', 'clamp', 'cos', 'cross', 'degrees',
    'distance', 'dot', 'exp', 'exp2', 'floor', 'fract', 'inversesqrt', 'length',
    'log', 'log2', 'max', 'min', 'mix', 'mod', 'normalize', 'pow', 'radians',
    'reflect', 'refract', 'sign', 'sin', 'smoothstep', 'sqrt', 'step', 'tan',
    'transpose',
]);

/**
 * Classify a single init statement by its dependencies.
 *
 * @param code      The GLSL statement (without trailing semicolon)
 * @param paramNames Set of known uniform/parameter names
 * @returns frequency and dependency list
 */
function classifyStatement(code: string, paramNames: Set<string>): { frequency: InitFrequency; dependencies: string[] } {
    const identifiers = extractIdentifiers(code);
    const dependencies: string[] = [];
    let frequency: InitFrequency = 'once';

    for (const id of identifiers) {
        if (GLSL_KEYWORDS.has(id)) continue;

        if (PER_PIXEL_DEPS.has(id)) {
            frequency = 'per-pixel';
            dependencies.push(id);
        } else if (paramNames.has(id)) {
            dependencies.push(id);
        }
    }

    return { frequency, dependencies: [...new Set(dependencies)] };
}

/**
 * Analyze init() function body and computed globals, classifying each
 * statement by execution frequency.
 *
 * @param initBody     The init() function body (between braces), or null
 * @param globals      Global analysis results (computed globals become init statements)
 * @param paramNames   Set of known uniform/parameter names
 */
export function analyzeInit(
    initBody: string | null,
    globals: GlobalAnalysis,
    paramNames: Set<string>,
): InitAnalysis | null {
    const statements: InitStatement[] = [];

    // 1. Literal-initialized globals → per-pixel (reset each iteration to preserve semantics)
    for (const g of globals.literalInit) {
        const code = `${g.type} ${g.name} = ${g.expression}`;
        statements.push({
            code,
            frequency: 'per-pixel',  // must reset each iteration
            dependencies: [],
        });
    }

    // 2. Computed globals → classify by dependency
    for (const cg of globals.computed) {
        const code = `${cg.type} ${cg.name} = ${cg.expression}`;
        const { frequency, dependencies } = classifyStatement(code, paramNames);
        statements.push({ code, frequency, dependencies });
    }

    // 3. init() body statements
    if (initBody) {
        let body = initBody.trim();
        if (body.startsWith('{') && body.endsWith('}')) {
            body = body.slice(1, -1).trim();
        }
        if (body) {
            // Split on semicolons (respecting braces)
            const stmts = splitStatements(body);
            for (const stmt of stmts) {
                const trimmed = stmt.trim();
                if (!trimmed) continue;
                const { frequency, dependencies } = classifyStatement(trimmed, paramNames);
                statements.push({ code: trimmed, frequency, dependencies });
            }
        }
    }

    return statements.length > 0 ? { statements } : null;
}

/**
 * Split GLSL code into statements, respecting brace nesting.
 * Handles if-blocks, for-loops inside init() body.
 */
function splitStatements(code: string): string[] {
    const statements: string[] = [];
    let depth = 0;
    let current = '';

    for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        if (ch === ';' && depth === 0) {
            statements.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    // Trailing content (no semicolon — e.g. closing brace of compound statement)
    if (current.trim()) statements.push(current.trim());

    return statements;
}
