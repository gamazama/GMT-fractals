/**
 * V3 Parameter slot assignment.
 *
 * Auto-assigns ImportedParam[] to available engine slots.
 * Overflow params are promoted to 'fixed' with their preset-resolved default
 * instead of silently dropped — the user sees them as fixed constants in the UI.
 */

import type { ImportedParam, GLSLType } from '../types';

// ============================================================================
// Slot definitions (same as V2 param-builder, exported for reuse)
// ============================================================================

export const SCALAR_SLOTS = ['paramA', 'paramB', 'paramC', 'paramD', 'paramE', 'paramF'] as const;
export const VEC2_SLOTS   = ['vec2A', 'vec2B', 'vec2C'] as const;
export const VEC3_SLOTS   = ['vec3A', 'vec3B', 'vec3C'] as const;
export const VEC4_SLOTS   = ['vec4A', 'vec4B', 'vec4C'] as const;

// ============================================================================
// Well-known Fragmentarium names → engine slots
// ============================================================================

/**
 * Standard Fragmentarium uniform names that map to well-known engine slots.
 * Each entry specifies the expected type(s) — the mapping only applies when the
 * param type matches, to avoid e.g. mapping `uniform vec3 Julia` (seed vector)
 * to uJuliaMode (a bool toggle).
 */
const WELL_KNOWN: Array<{ name: string; slot: string; types: string[] }> = [
    { name: 'Scale',           slot: 'paramA',     types: ['float'] },
    { name: 'Offset',          slot: 'vec3A',      types: ['vec3'] },
    { name: 'Julia',           slot: 'uJuliaMode', types: ['bool'] },
    { name: 'DoJulia',         slot: 'uJuliaMode', types: ['bool'] },
    { name: 'JuliaC',          slot: 'uJulia',     types: ['vec3'] },
    { name: 'JuliaValues',     slot: 'uJulia',     types: ['vec3'] },
    { name: 'Iterations',      slot: 'builtin',    types: ['int', 'float'] },
    { name: 'ColorIterations', slot: 'paramC',     types: ['int', 'float'] },
];

// ============================================================================
// Auto-assignment
// ============================================================================

function formatFixed(type: GLSLType, value: number | number[]): string {
    const num = (v: number) => v.toFixed(6);
    if (type === 'bool') return String(!!value);
    if (type === 'int') return String(Math.round(Array.isArray(value) ? value[0] : value));
    if (type === 'float') return num(Array.isArray(value) ? value[0] : (value as number));
    if (type === 'vec2') {
        const a = Array.isArray(value) ? value : [value, value];
        return `vec2(${num(a[0])}, ${num(a[1])})`;
    }
    if (type === 'vec3') {
        const a = Array.isArray(value) ? value : [value, value, value];
        return `vec3(${num(a[0])}, ${num(a[1])}, ${num(a[2])})`;
    }
    if (type === 'vec4') {
        const a = Array.isArray(value) ? value : [value, value, value, value];
        return `vec4(${num(a[0])}, ${num(a[1])}, ${num(a[2])}, ${num(a[3])})`;
    }
    return String(value);
}

/**
 * Auto-assign slots to ImportedParam[].
 *
 * Strategy:
 * 1. Apply well-known mappings (Scale → paramA, Offset → vec3A, etc.)
 * 2. Greedily assign remaining params to first available slot of matching type
 * 3. Pack bools into a shared scalar slot (bitfield)
 * 4. **Overflow → promote to 'fixed'** with preset-resolved default value
 *
 * Mutates the params in-place (sets .slot and .fixedValue).
 * Returns the same array for chaining.
 */
export function autoAssignSlots(params: ImportedParam[]): ImportedParam[] {
    const usedSlots = new Set<string>();

    // Pass 1: well-known names (only when type matches)
    for (const p of params) {
        if (p.slot && p.slot !== '') continue; // already assigned
        const known = WELL_KNOWN.find(w => w.name === p.name && w.types.includes(p.type));
        if (known) {
            p.slot = known.slot;
            if (known.slot !== 'builtin' && known.slot !== 'uJuliaMode' && known.slot !== 'uJulia') {
                usedSlots.add(known.slot);
            }
        }
    }

    // Pass 2: auto-assign by type (non-bool)
    const unmappedBools: ImportedParam[] = [];

    for (const p of params) {
        if (p.slot && p.slot !== '') continue;

        if (p.type === 'vec4') {
            const s = VEC4_SLOTS.find(s => !usedSlots.has(s));
            if (s) { p.slot = s; usedSlots.add(s); }
        } else if (p.type === 'vec3') {
            const s = VEC3_SLOTS.find(s => !usedSlots.has(s))
                   ?? VEC4_SLOTS.find(s => !usedSlots.has(s)); // overflow vec3 → vec4.xyz
            if (s) { p.slot = s; usedSlots.add(s); }
        } else if (p.type === 'vec2') {
            const s = VEC2_SLOTS.find(s => !usedSlots.has(s));
            if (s) { p.slot = s; usedSlots.add(s); }
        } else if (p.type === 'bool') {
            unmappedBools.push(p);
        } else { // float, int
            const s = SCALAR_SLOTS.find(s => !usedSlots.has(s));
            if (s) { p.slot = s; usedSlots.add(s); }
        }
    }

    // Pass 3: pack bools into vec3 component slots (3 bools per vec3)
    // GMT's bool system: vec3 slot with 0.0/1.0 per component, read via step(0.5, uVec3X.c)
    const COMPONENTS = ['x', 'y', 'z'] as const;
    let boolVecSlotIdx = 0;
    let boolComponentIdx = 0;
    let currentBoolVec: string | null = null;

    for (const p of unmappedBools) {
        // Find next available vec3 slot if needed
        if (!currentBoolVec || boolComponentIdx >= 3) {
            currentBoolVec = null;
            while (boolVecSlotIdx < VEC3_SLOTS.length) {
                const candidate = VEC3_SLOTS[boolVecSlotIdx];
                boolVecSlotIdx++;
                if (!usedSlots.has(candidate)) {
                    currentBoolVec = candidate;
                    usedSlots.add(candidate);
                    boolComponentIdx = 0;
                    break;
                }
            }
        }
        if (currentBoolVec) {
            p.slot = `${currentBoolVec}.${COMPONENTS[boolComponentIdx]}`;
            boolComponentIdx++;
        }
        // If no vec3 slots left, fall back to scalar slot
        else {
            const s = SCALAR_SLOTS.find(s => !usedSlots.has(s));
            if (s) { p.slot = s; usedSlots.add(s); }
        }
    }

    // Pass 4: promote overflow to 'fixed'
    for (const p of params) {
        if (p.slot && p.slot !== '') continue;
        p.slot = 'fixed';
        p.fixedValue = formatFixed(p.type, p.default);
    }

    return params;
}
