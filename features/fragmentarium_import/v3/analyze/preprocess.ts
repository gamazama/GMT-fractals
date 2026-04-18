/**
 * V3 Fragmentarium source preprocessor.
 *
 * Two responsibilities:
 *   1. Resolve #include directives by inlining builtin GLSL helpers
 *   2. Strip custom Fragmentarium syntax so the source is valid GLSL for AST parsing
 *
 * Include resolution happens FIRST so the AST parser never sees #include.
 */

import {
    FRAG_BUILTIN_ROTATIONS,
    FRAG_BUILTIN_MAT4,
    FRAG_BUILTIN_MATH,
    FRAG_BUILTIN_FOLDS,
    FRAG_BUILTIN_COMPLEX,
} from '../../parsers/builtins';

// ============================================================================
// Include resolution
// ============================================================================

/** Extract #include directives from source. */
export function extractIncludes(source: string): string[] {
    const includes: string[] = [];
    const re = /#include\s+["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(source)) !== null) includes.push(m[1]);
    return includes;
}

/** Resolve known Fragmentarium includes to inline GLSL. */
function resolveIncludes(includes: string[]): string {
    if (includes.length === 0) return '';
    const parts: string[] = [];
    const lower = includes.map(i => i.toLowerCase());

    if (lower.some(n => n.includes('mathutils'))) {
        parts.push(FRAG_BUILTIN_ROTATIONS);
        parts.push(FRAG_BUILTIN_MAT4);
        parts.push(FRAG_BUILTIN_MATH);
    }
    if (lower.some(n =>
        n.includes('de-raytracer') ||
        n.includes('de_raytracer') ||
        n.includes('mandelbox')
    )) {
        parts.push(FRAG_BUILTIN_FOLDS);
    }
    if (lower.some(n => n.includes('complex'))) {
        parts.push(FRAG_BUILTIN_COMPLEX);
    }

    return parts.join('\n');
}

// ============================================================================
// Syntax stripping
// ============================================================================

/**
 * Strip Fragmentarium-specific syntax that's not valid GLSL.
 * Strips: slider[...], checkbox[...], color[...], menu[...],
 *         #group, #preset blocks, #info, #camera, #include,
 *         computed globals at global scope, trailing }; patterns.
 *
 * Adds an orbitTrap stub so AST parsing succeeds when DE-Raytracer.frag is absent.
 */
interface StripResult {
    /** Source with globals preserved (for extractGlobals). */
    globalsSource: string;
    /** Source with globals stripped (for AST parsing). */
    cleanedSource: string;
}

function stripFragSyntax(source: string): StripResult {
    let cleaned = source;

    // Strip annotation brackets
    cleaned = cleaned.replace(/\s*slider\[[^\]]+\];?/g, '');
    cleaned = cleaned.replace(/\s*checkbox\[[^\]]+\];?/g, '');
    cleaned = cleaned.replace(/\s*color\[[^\]]+\];?/g, '');
    cleaned = cleaned.replace(/\s*menu\[[^\]]+\];?/g, '');

    // Strip trailing ';' after '}' — C-compatible but invalid in GLSL ES
    cleaned = cleaned.replace(/\}\s*;/g, '}');
    cleaned = cleaned.replace(/\s+\b(Locked|Unlocked)\b/g, '');

    // Collapse doubled semicolons produced by annotation strips. Source like
    //   `uniform vec3 InvertC; slider[...] Locked;`
    // strips through `uniform vec3 InvertC; Locked;` → `uniform vec3 InvertC;;`
    // which @shaderfrog/glsl-parser rejects. Real WebGL drivers tolerate it,
    // but we need to produce parseable output. Safe because we never use `;;`
    // as a statement separator in legitimate GLSL.
    cleaned = cleaned.replace(/;(\s*;)+/g, ';');

    // Expand simple #define macros (value defines only, not function-like macros)
    // E.g. `#define M_PI 3.14159...` → replace all M_PI with the value
    const defines = new Map<string, string>();
    // Use [^\S\n] (whitespace excluding newline) to prevent \s from consuming \n
    // and accidentally capturing the next line as the macro value.
    cleaned = cleaned.replace(/^#define[^\S\n]+(\w+)[^\S\n]+(.+)$/gm, (_m, name, value) => {
        const trimmed = value.trim();
        // Only expand simple value defines (not function-like macros with parentheses in name)
        if (!/^\w+\s*\(/.test(name + '(') || !name.includes('(')) {
            defines.set(name, trimmed);
        }
        return ''; // strip the #define line
    });
    // Apply macro expansion (longer names first to avoid partial matches)
    const sortedDefines = Array.from(defines.entries()).sort((a, b) => b[0].length - a[0].length);
    for (const [name, value] of sortedDefines) {
        cleaned = cleaned.replace(new RegExp(`\\b${name}\\b`, 'g'), value);
    }

    // Strip directives
    cleaned = cleaned.replace(/^#group\s+.+$/gm, '');
    cleaned = cleaned.replace(/#preset\s+\w+[\s\S]*?#endpreset/g, '');
    cleaned = cleaned.replace(/^#info\s+.+$/gm, '');
    cleaned = cleaned.replace(/^#camera\s+.+$/gm, '');
    cleaned = cleaned.replace(/^#include\s+.+$/gm, '');
    // Fragmentarium-only blocks that aren't valid GLSL: vertex-shader block,
    // buffer-shader block, and #FragmentProgram pragma lines. Leaving these
    // in makes the AST parser crash on unexpected directives.
    cleaned = cleaned.replace(/#vertex\b[\s\S]*?#endvertex\b/g, '');
    cleaned = cleaned.replace(/#buffershader\b[\s\S]*?#endbuffershader\b/g, '');
    cleaned = cleaned.replace(/^#FragmentProgram\s+.+$/gm, '');
    // Reserved marker #defines that look like statements to the parser.
    cleaned = cleaned.replace(/^#define\s+(providesInit|providesColor|providesBackground|dontclearonchange|iterationsbetweenredraws|subframemax)\b[^\n]*$/gm, '');

    // Snapshot source BEFORE stripping computed globals — extractGlobals() needs
    // the initializer expressions intact to classify and re-inject them.
    const globalsSource = cleaned;

    // Strip computed globals at global scope only (scope-aware).
    // These have non-constant initializers (referencing uniforms or functions)
    // and are re-injected as locals later.
    {
        let depth = 0;
        const lines = cleaned.split('\n');
        const result: string[] = [];
        for (const line of lines) {
            depth += (line.match(/{/g) || []).length;
            depth -= (line.match(/}/g) || []).length;
            if (depth > 0) {
                result.push(line);
                continue;
            }
            const stripped = line.replace(
                /^(\s*(?:vec4|vec3|vec2|float|int|mat2|mat3|mat4)\s+\w+)\s*=\s*([^;]+);/,
                (match, decl, expr) => {
                    if (/[A-Z]\w*/.test(expr) || /\w+\s*\(/.test(expr)) {
                        return `${decl.trim()};  // computed global`;
                    }
                    return `${decl.trim()};  // literal global`;
                }
            );
            result.push(stripped);
        }
        cleaned = result.join('\n');
    }

    // Add orbitTrap stub if referenced but not declared
    if (/\borbitTrap\b/.test(cleaned) && !/\borbitTrap\s*;/.test(cleaned)) {
        cleaned = 'vec4 orbitTrap = vec4(10000.0);\n' + cleaned;
    }

    return { globalsSource, cleanedSource: cleaned };
}

// ============================================================================
// Public API
// ============================================================================

export interface PreprocessResult {
    /** Cleaned GLSL source ready for AST parsing. */
    cleanedSource: string;
    /** Source after macro expansion + annotation stripping, but BEFORE computed globals are stripped.
     *  Use this for extractGlobals() so initializer expressions are preserved. */
    globalsSource: string;
    /** Resolved include names (for warnings). */
    includes: string[];
    /** Inlined builtin GLSL code from includes. */
    builtinCode: string;
}

/**
 * Preprocess Fragmentarium source: resolve includes, strip custom syntax.
 * The returned `cleanedSource` is valid GLSL ready for AST parsing.
 */
export function preprocess(source: string): PreprocessResult {
    // Normalize CRLF → LF first. Windows \r\n breaks regex patterns using $
    // (in /m mode, $ matches before \n but after \r, so `.+$` captures across lines).
    source = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const includes = extractIncludes(source);
    const builtinCode = resolveIncludes(includes);
    const { cleanedSource, globalsSource } = stripFragSyntax(source);
    return { cleanedSource, globalsSource, includes, builtinCode };
}
