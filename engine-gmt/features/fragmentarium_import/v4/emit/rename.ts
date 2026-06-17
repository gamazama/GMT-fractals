/**
 * V4 Stage 4 — Identifier renaming for emission.
 *
 * Narrow renames only — V4 preserves DE bodies verbatim except for:
 *   1. Parameter name → slot uniform (Scale → uParamA)
 *   2. Engine-colliding function names (map, mod289, etc.) → frag_NAME
 *   3. orbitTrap → g_orbitTrap (engine global used for trap coloring)
 *
 * Everything else passes through untouched, which is the whole point of V4.
 */

import type { ParamAnnotation } from '../types';
import type { SlotAssignment } from './slots';

/** Engine function names that collide with likely Fragmentarium helpers.
 *  When a helper in the source has the same name, we rename the helper to
 *  frag_NAME to avoid redefinition/overload issues. */
const ENGINE_COLLISIONS = new Set([
    'map',         // engine's vec4 map(vec3) — DE orchestrator
    'mapDist',     // engine's geometry-only estimator
    'DE',          // engine's vec4 DE(vec3) — public coloring wrapper at shader bottom
    'DE_',         // engine's float DE_(...) — geometry variant
    'getDist',     // engine's vec2 getDist(...) — injected per formula
    'mod289',      // engine has vec3/vec4 overloads (math.ts)
    'permute',     // engine noise helper
    'taylorInvSqrt',
    'snoise',      // engine noise stub
]);

/** GLSL ES 3.0 built-ins that were absent in ES 1.0 — Fragmentarium formulas
 *  targeting ES 1.0 may define their own versions which would collide. */
const GLSL3_BUILTINS = new Set([
    'round', 'roundEven', 'trunc', 'isnan', 'isinf', 'fma',
    'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
]);

export interface RenameMap {
    /** uniform name → slot uniform name (Scale → uParamA) */
    params: Record<string, string>;
    /** function name → renamed function name (map → frag_map) */
    functions: Record<string, string>;
}

function slotToUniform(slot: string): string {
    if (slot === 'ignore' || slot === 'iterations') return ''; // iterations handled specially
    return 'u' + slot[0].toUpperCase() + slot.slice(1);
}

export function buildRenameMap(
    parameters: ParamAnnotation[],
    slots: SlotAssignment,
    /** Names of ALL user-defined functions (helpers + selected DE). The DE
     *  itself often collides (e.g. engine's `vec4 DE(vec3 p_ray)` wrapper). */
    allFunctionNames: string[],
): RenameMap {
    const params: Record<string, string> = {};
    const functions: Record<string, string> = {};

    for (const p of parameters) {
        const slot = slots.byName[p.name];
        if (!slot || slot === 'ignore') continue;

        // Engine builtins (V3 convention)
        if (slot === 'builtin') {
            // Iteration count → engine's uIterations (always float in engine).
            params[p.name] = p.type === 'int' ? 'int(uIterations)' : 'uIterations';
            continue;
        }
        if (slot === 'uJuliaMode') {
            // Bool context: `if (Julia)` → `if ((uJuliaMode > 0.5))`. Parenthesised
            // so it composes with `&&`/`||` correctly.
            params[p.name] = '(uJuliaMode > 0.5)';
            continue;
        }
        if (slot === 'uJulia') {
            // Vec3 constant — no wrap needed.
            params[p.name] = 'uJulia';
            continue;
        }

        const uniName = slotToUniform(slot);
        // Engine slots are ALL float-typed (uParamA..F are floats). Wrap per
        // original param type so downstream GLSL type-checks:
        //   int   loop bound:  i < Folds          →  i < int(uParamA)
        //   bool  conditional: if (Julia)          →  if ((uParamA > 0.5))
        //   float:             anything            →  uParamA  (no wrap)
        //   vec*:              always typed right  →  uVec3A   (no wrap)
        if (p.type === 'int') {
            params[p.name] = `int(${uniName})`;
        } else if (p.type === 'bool') {
            params[p.name] = `(${uniName} > 0.5)`;
        } else {
            params[p.name] = uniName;
        }
    }

    for (const name of allFunctionNames) {
        if (ENGINE_COLLISIONS.has(name) || GLSL3_BUILTINS.has(name)) {
            functions[name] = `frag_${name}`;
        }
    }

    return { params, functions };
}

/** Word-boundary identifier replace. */
function renameIdentifier(code: string, from: string, to: string): string {
    const re = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    return code.replace(re, to);
}

/**
 * Apply a rename map to a block of GLSL code. Renames are applied in order
 * and use word boundaries to avoid partial matches (e.g. `Scale2` shouldn't
 * be rewritten when renaming `Scale`).
 *
 * Renames orbitTrap → g_orbitTrap (engine convention) regardless of rename map.
 */
export function applyRenames(code: string, map: RenameMap): string {
    let out = code;

    // Longest-first to avoid prefix collisions
    const paramKeys = Object.keys(map.params).sort((a, b) => b.length - a.length);
    for (const from of paramKeys) {
        out = renameIdentifier(out, from, map.params[from]);
    }

    const fnKeys = Object.keys(map.functions).sort((a, b) => b.length - a.length);
    for (const from of fnKeys) {
        out = renameIdentifier(out, from, map.functions[from]);
    }

    // orbitTrap → _v4_orbitTrap (V4-owned global declared in preamble).
    // Why not g_orbitTrap directly? The engine's coloring feature declares
    // `vec4 g_orbitTrap` LATE in the preamble section (after formula preamble).
    // References from V4 helpers would appear at global scope BEFORE the
    // declaration, which GLSL ES 3.00 forbids (variables need prior decl).
    // `_v4_orbitTrap` is declared at the TOP of V4's preamble so helpers can
    // safely reference it; the wrapper copies it into g_orbitTrap at the end
    // so engine coloring modes still read the final trap value.
    out = renameIdentifier(out, 'orbitTrap', '_v4_orbitTrap');
    // Strip any local `vec4 _v4_orbitTrap ...` declarations (formula may
    // declare its own local `vec4 orbitTrap = vec4(10000.0);` — would shadow
    // our global).
    out = out.replace(/\bvec4\s+_v4_orbitTrap\b/g, '_v4_orbitTrap');

    return out;
}
