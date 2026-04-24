/**
 * V4 Stage 4 — Slot assignment.
 *
 * Maps formula parameters to engine uniform slots:
 *   - scalar floats/ints/bools → uIterations (if named like iteration count)
 *                                 else paramA..F
 *   - vec2                      → vec2A..C
 *   - vec3 / color3             → vec3A..C
 *   - vec4 / color4             → vec4A..C
 *
 * When slot capacity is exceeded, overflow params get slot 'ignore' (fixed
 * at default). Returns the assignment + warnings.
 */

import type { ParamAnnotation } from '../types';

export interface SlotAssignment {
    /** paramName → slot (e.g. 'Scale' → 'paramA') or 'ignore' */
    byName: Record<string, string>;
    warnings: string[];
}

// ─── Special-name routing (matches V3's conventions) ───────────────────────
//
//  'builtin'     → engine's uIterations (no UI control; engine default)
//  'uJuliaMode'  → geometry.juliaMode (bool toggle → engine's uJuliaMode)
//  'uJulia'      → geometry.juliaX/Y/Z (vec3 coords → engine's uJulia)
//
// See features/fragmentarium_import/workshop/param-builder.ts.

/** Exact uniform names that signal "iteration count — route to engine's uIterations". */
const ITERATION_EXACT_NAMES = new Set([
    'Iterations', 'iterations',
    'MaxIterations', 'maxIterations', 'MAXITER', 'MaxIter', 'maxIter',
    'MaxSteps', 'maxSteps', 'MaxRaySteps', 'maxRaySteps',
    'Iter', 'iter', 'Iters', 'iters',
    'MI',           // Knighty convention
    'N', 'n',       // 2D/simple formulas
    'Steps', 'steps',
]);

/** Secondary iteration-name heuristic: any uniform whose name contains `iter` case-insensitively. */
function isIterationName(name: string): boolean {
    return ITERATION_EXACT_NAMES.has(name) || /iter/i.test(name);
}

/** Uniform names that signal "Julia toggle". */
const JULIA_MODE_NAMES = new Set(['Julia', 'DoJulia', 'JuliaV', 'julia', 'doJulia']);

/** Uniform names that signal "Julia coordinates / c-constant". */
const JULIA_COORD_NAMES = new Set(['JuliaC', 'JuliaValues', 'JuliaOffset', 'julia', 'juliaC']);

const FLOAT_SLOTS = ['paramA', 'paramB', 'paramC', 'paramD', 'paramE', 'paramF'];
const VEC2_SLOTS  = ['vec2A', 'vec2B', 'vec2C'];
const VEC3_SLOTS  = ['vec3A', 'vec3B', 'vec3C'];
const VEC4_SLOTS  = ['vec4A', 'vec4B', 'vec4C'];

export function assignSlots(parameters: ParamAnnotation[]): SlotAssignment {
    const byName: Record<string, string> = {};
    const warnings: string[] = [];

    const usedFloat = new Set<string>();
    const usedVec2  = new Set<string>();
    const usedVec3  = new Set<string>();
    const usedVec4  = new Set<string>();
    let iterationsUsed = false;

    function nextSlot(pool: string[], used: Set<string>, type: string, pname: string): string {
        for (const s of pool) {
            if (!used.has(s)) { used.add(s); return s; }
        }
        warnings.push(`slot pressure: '${pname}' (${type}) has no free slot in ${pool[0][0]}-pool; assigned 'ignore'`);
        return 'ignore';
    }

    for (const p of parameters) {
        if (byName[p.name]) continue; // dedup

        // Julia toggle (bool) → engine's uJuliaMode (→ geometry.juliaMode)
        if (p.type === 'bool' && JULIA_MODE_NAMES.has(p.name)) {
            byName[p.name] = 'uJuliaMode';
            continue;
        }

        // Julia coords (vec3/vec4) → engine's uJulia (→ geometry.juliaX/Y/Z)
        if ((p.type === 'vec3' || p.type === 'vec4') && JULIA_COORD_NAMES.has(p.name)) {
            byName[p.name] = 'uJulia';
            continue;
        }

        // Iteration count → engine's uIterations (no UI, engine-handled).
        // Uses V3's 'builtin' slot convention so buildFractalParams recognises it.
        if ((p.type === 'int' || p.type === 'float') && !iterationsUsed && isIterationName(p.name)) {
            byName[p.name] = 'builtin';
            iterationsUsed = true;
            continue;
        }

        switch (p.type) {
            case 'float':
            case 'int':
            case 'bool':
                byName[p.name] = nextSlot(FLOAT_SLOTS, usedFloat, p.type, p.name);
                break;
            case 'vec2':
                byName[p.name] = nextSlot(VEC2_SLOTS, usedVec2, 'vec2', p.name);
                break;
            case 'vec3':
            case 'color3':
                byName[p.name] = nextSlot(VEC3_SLOTS, usedVec3, p.type, p.name);
                break;
            case 'vec4':
            case 'color4':
                byName[p.name] = nextSlot(VEC4_SLOTS, usedVec4, p.type, p.name);
                break;
            case 'sampler2D':
                byName[p.name] = 'ignore';
                warnings.push(`sampler2D '${p.name}' — textures not supported in V4; param ignored`);
                break;
            default:
                byName[p.name] = 'ignore';
                warnings.push(`unknown param type '${p.type}' for '${p.name}'; assigned 'ignore'`);
        }
    }

    return { byName, warnings };
}
