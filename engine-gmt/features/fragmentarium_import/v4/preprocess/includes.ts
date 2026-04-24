/**
 * V4 Stage 2 — Include inlining.
 *
 * Scans #include directives (before stripping) and appends the corresponding
 * builtin GLSL strings if the formula needs them. Reuses V3's curated builtin
 * bank in features/fragmentarium_import/parsers/builtins.ts.
 *
 * Non-recognised includes are tolerated silently — many formulas #include
 * environment/ray setup files whose contents we don't need (because GMT
 * provides its own lighting / raymarch).
 */

import {
    FRAG_BUILTIN_ROTATIONS,
    FRAG_BUILTIN_MAT4,
    FRAG_BUILTIN_MATH,
    FRAG_BUILTIN_FOLDS,
    FRAG_BUILTIN_COMPLEX,
} from '../../parsers/builtins';

/**
 * Inspect the ORIGINAL source for #include directives and return the
 * concatenated builtin GLSL to prepend. Call this BEFORE stripping #include
 * lines (strip.ts removes them).
 */
export function resolveIncludes(source: string): { builtinCode: string; included: string[] } {
    const included: string[] = [];
    const re = /^\s*#include\s+"([^"]+)"/gm;
    let m;
    while ((m = re.exec(source)) !== null) included.push(m[1]);

    if (included.length === 0) return { builtinCode: '', included };

    const lower = included.map(i => i.toLowerCase());
    const parts: string[] = [];

    if (lower.some(n => n.includes('mathutils'))) {
        parts.push(FRAG_BUILTIN_ROTATIONS, FRAG_BUILTIN_MAT4, FRAG_BUILTIN_MATH);
    }
    if (lower.some(n => n.includes('de-raytracer') || n.includes('de_raytracer') || n.includes('mandelbox'))) {
        parts.push(FRAG_BUILTIN_FOLDS);
    }
    if (lower.some(n => n.includes('complex'))) {
        parts.push(FRAG_BUILTIN_COMPLEX);
    }

    return { builtinCode: parts.join('\n'), included };
}

/**
 * Reference-based builtin injection: if the source uses Fragmentarium
 * ambient globals without having declared them, synthesize defines. Catches
 * formulas that rely on Fragmentarium's implicit environment.
 *
 * Corpus analysis shows these cover roughly 30 additional .frag files.
 */
export function injectFragMathDefinesIfReferenced(source: string): string {
    const defines: string[] = [];
    if (/\bPhi\b/.test(source) && !/#define\s+Phi\b/.test(source)) {
        defines.push('#define Phi 1.61803398874989');
    }
    if (/\bTWO_PI\b/.test(source) && !/#define\s+TWO_PI\b/.test(source)) {
        defines.push('#define TWO_PI 6.28318530717959');
    }
    if (/\bM_PI\b/.test(source) && !/#define\s+M_PI\b/.test(source)) {
        defines.push('#define M_PI 3.14159265358979');
    }
    // Fragmentarium provides `time` (float seconds) — engine uses `uTime`.
    // Only alias if the source doesn't declare `time` itself.
    if (/\btime\b/.test(source)
        && !/#define\s+time\b/.test(source)
        && !/\b(?:uniform|float|int)\s+time\b/.test(source)) {
        defines.push('#define time uTime');
    }
    // Fragmentarium's `iGlobalTime` is the same thing (Shadertoy compat).
    if (/\biGlobalTime\b/.test(source) && !/#define\s+iGlobalTime\b/.test(source)) {
        defines.push('#define iGlobalTime uTime');
    }
    return defines.length > 0 ? defines.join('\n') : '';
}
