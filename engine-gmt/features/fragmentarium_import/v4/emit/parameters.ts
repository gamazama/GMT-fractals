/**
 * V4 Stage 4 — FractalParameter construction.
 *
 * Converts V4's ParamAnnotation (from preprocess) into the engine's
 * FractalParameter shape (types/fractal.ts), using the slot assignments
 * from emit/slots.ts.
 *
 * Handles the quirks:
 *   - bool → assigned to a param slot as 0/1 (fixedValue concept)
 *   - color3 → vec3 slot, with 0..1 range appropriate for colour
 *   - color4 → vec4 slot
 *   - isDegrees → scale: 'degrees' (not in FractalParameter.scale union but
 *     accepted by runtime per FormulaPanel.tsx)
 */

import type { FractalParameter } from '../../../../types/fractal';
import type { ParamAnnotation } from '../types';
import type { SlotAssignment } from './slots';

/** Convert a V4 ParamAnnotation to an engine FractalParameter.
 *  Returns null if the parameter has slot 'ignore' (not rendered as UI control).
 */
export function annotationToFractalParam(
    p: ParamAnnotation,
    slot: string,
): FractalParameter | null {
    if (slot === 'ignore' || slot === 'iterations') return null;

    const common = { label: p.tooltip || p.name };

    switch (p.type) {
        case 'float':
        case 'int': {
            const [min, def, max] = (p.range ?? [0, 0, 1]) as [number, number, number];
            const result: FractalParameter = {
                ...common,
                id: slot as FractalParameter['id'],
                type: 'float',
                min, max,
                step: p.type === 'int' ? 1 : (max - min) / 200 || 0.01,
                default: (p.defaultValue as number) ?? def,
            };
            if (p.isDegrees) (result as any).scale = 'degrees';
            return result;
        }
        case 'bool': {
            return {
                ...common,
                id: slot as FractalParameter['id'],
                type: 'float',
                min: 0, max: 1, step: 1,
                default: p.defaultValue === true ? 1 : 0,
                mode: 'toggle',
            };
        }
        case 'vec2': {
            const def = (p.defaultValue ?? (p.range?.[1] ?? [0, 0])) as number[];
            const [min, , max] = (p.range ?? [[-10, -10], def, [10, 10]]) as [number[], number[], number[]];
            return {
                ...common,
                id: slot as FractalParameter['id'],
                type: 'vec2',
                min: Math.min(...min), max: Math.max(...max),
                step: 0.001,
                default: { x: def[0], y: def[1] },
            };
        }
        case 'vec3':
        case 'color3': {
            const def = (p.defaultValue ?? (p.range?.[1] ?? [0, 0, 0])) as number[];
            const [min, , max] = (p.range ?? [[-10, -10, -10], def, [10, 10, 10]]) as [number[], number[], number[]];
            return {
                ...common,
                id: slot as FractalParameter['id'],
                type: 'vec3',
                min: Math.min(...min), max: Math.max(...max),
                step: 0.001,
                default: { x: def[0], y: def[1], z: def[2] },
            };
        }
        case 'vec4':
        case 'color4': {
            const def = (p.defaultValue ?? (p.range?.[1] ?? [0, 0, 0, 0])) as number[];
            const [min, , max] = (p.range ?? [[-10, -10, -10, -10], def, [10, 10, 10, 10]]) as [number[], number[], number[]];
            return {
                ...common,
                id: slot as FractalParameter['id'],
                type: 'vec4',
                min: Math.min(...min), max: Math.max(...max),
                step: 0.001,
                default: { x: def[0], y: def[1], z: def[2], w: def[3] },
            };
        }
        default:
            return null;
    }
}

/**
 * Build a defaultPreset partial from parameter defaults. This becomes
 * FractalDefinition.defaultPreset — stored on the definition so that
 * selecting the formula applies these values as initial uniforms.
 *
 * Engine feature ID for scalar/vector slot storage is `coreMath`, not `core`.
 * Vector defaults must be stored as `{x,y,...}` objects (matches native
 * formula convention in formulas/*.ts and what the store's loadPreset expects).
 */
export function buildDefaultPreset(
    parameters: ParamAnnotation[],
    slots: SlotAssignment,
): Record<string, any> {
    const coreMath: Record<string, any> = {};
    for (const p of parameters) {
        const slot = slots.byName[p.name];
        if (!slot || slot === 'ignore') continue;
        if (slot === 'iterations' && typeof p.defaultValue === 'number') {
            coreMath.iterations = p.defaultValue;
            continue;
        }
        if (p.defaultValue === undefined) continue;

        // Convert vector defaults from array to {x,y,z,w} object form.
        const def = p.defaultValue;
        if (Array.isArray(def)) {
            if (def.length === 2)      coreMath[slot] = { x: def[0], y: def[1] };
            else if (def.length === 3) coreMath[slot] = { x: def[0], y: def[1], z: def[2] };
            else if (def.length === 4) coreMath[slot] = { x: def[0], y: def[1], z: def[2], w: def[3] };
            else                       coreMath[slot] = def;  // unexpected arity — pass through
        } else if (typeof def === 'boolean') {
            coreMath[slot] = def ? 1 : 0;
        } else {
            coreMath[slot] = def;
        }
    }
    return { features: { coreMath } };
}
