/**
 * V4 Stage 4 — formula_X wrapper builder.
 *
 * Emits the tiny adapter that wraps the user's DE function in GMT's
 * self-contained SDE convention:
 *
 *   void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c) {
 *       vec3 p = z.xyz;
 *       float de = frag_DE(p);
 *       // orbit trap
 *       trap = min(trap, (g_orbitTrap.w < 1e9) ? g_orbitTrap.w : dot(p, p));
 *       // decomposition angle packing (Style A — matches MandelTerrain)
 *       float ang = atan(p.y, p.x);
 *       float mag = abs(de);
 *       z = vec4(mag * cos(ang), mag * sin(ang), 0.0, 0.0);
 *       // dr left at engine-init value; iter-count coloring not available for imports
 *   }
 *
 * The engine's outer loop fires this formula once via `loopBody: 'formula_NAME(...); break;'`,
 * then reads getDist — which with Style A returns `vec2(r, dr)` where
 * `r = length(z.xyz) = mag = |de|`. This is the same pattern as native
 * MandelTerrain / JuliaMorph (Style A / Style B respectively).
 */

import type { DeFunction } from '../types';

export interface WrapperResult {
    /** The `formula_NAME` function GLSL. Append after the user's DE. */
    wrapperGlsl: string;
    /** The `loopBody` for FractalDefinition.shader.loopBody. */
    loopBody: string;
    /** The `getDist` expression (Style A). */
    getDist: string;
}

/** Sanitize formula name to be a valid GLSL identifier.
 *  GLSL forbids identifiers with consecutive `__` (reserved). */
export function sanitizeId(id: string): string {
    let cleaned = id.replace(/[^a-zA-Z0-9_]/g, '_')
                     .replace(/_+/g, '_')        // collapse consecutive underscores
                     .replace(/^_+|_+$/g, '');
    if (/^\d/.test(cleaned)) cleaned = 'imp_' + cleaned;
    return cleaned || 'imported';
}

/**
 * Build the formula_X wrapper. The DE function is called as-is, with whatever
 * name the analyzer picked (typically 'DE' or the first candidate).
 */
export function buildWrapper(selectedDE: DeFunction, formulaId: string): WrapperResult {
    const safeId = sanitizeId(formulaId);

    // The DE may return float, vec2, or vec4. We extract a scalar distance.
    // - float: use directly
    // - vec2: return.x is distance (common in shadertoy: vec2(dist, id))
    // - vec4: return.x is distance (less common)
    let extractDe: string;
    switch (selectedDE.returnType) {
        case 'vec2':
        case 'vec4':
            extractDe = `${selectedDE.returnType} _frag_result = ${selectedDE.name}(p);\n    float de = _frag_result.x;`;
            break;
        case 'float':
        default:
            extractDe = `float de = ${selectedDE.name}(p);`;
            break;
    }

    const wrapperGlsl = `
void formula_${safeId}(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 p = z.xyz;
    // Reset V4's orbit trap so each ray starts fresh (declared in preamble).
    _v4_orbitTrap = vec4(1e10);
    ${extractDe}

    // Publish V4's orbit trap into the engine global so coloring modes see it.
    g_orbitTrap = _v4_orbitTrap;

    // Orbit trap: use _v4_orbitTrap.w if formula wrote to it, else fallback to dot(p,p)
    float trapVal = (_v4_orbitTrap.w < 1.0e9) ? _v4_orbitTrap.w : dot(p, p);
    trap = min(trap, trapVal);

    // Decomposition angle encoding — preserves |de| in length(z.xyz)
    float _frag_ang = atan(p.y, p.x);
    float _frag_mag = abs(de);
    z = vec4(_frag_mag * cos(_frag_ang), _frag_mag * sin(_frag_ang), 0.0, 0.0);
}
`.trim();

    return {
        wrapperGlsl,
        loopBody: `formula_${safeId}(z, dr, trap, c); break;`,
        // Style A: r = length(z.xyz) = |de|; engine computes r for us.
        getDist: 'return vec2(r, dr);',
    };
}
