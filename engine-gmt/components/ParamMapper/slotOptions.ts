/**
 * Slot-picker presentation vocabulary: which slots a param of a given GLSL type may
 * map to, how a slot id reads as a human label, and the <optgroup>-style grouping the
 * SlotPicker renders. Pure functions over the shared uniformSlots vocabulary — no
 * React, no store.
 *
 * Special (non-uniform) slots: 'ignore' (don't expose), 'fixed' (bake a literal),
 * 'builtin' (engine-handled, e.g. iteration count), 'uJulia' / 'uJuliaMode' (routed
 * to the geometry feature).
 */

import {
    componentSlotBase,
    SCALAR_SLOTS, VEC2_SLOTS, VEC3_SLOTS, VEC4_SLOTS,
    VEC4_COMPONENTS, VEC3_COMPONENTS, VEC2_COMPONENTS,
    VEC4_VEC2_SLOTS, VEC3_VEC2_SLOTS,
} from '../../utils/uniformSlots';

export function slotOptionsForType(type: string): string[] {
    switch (type) {
        case 'float':
        case 'int':  return ['ignore', 'fixed', ...SCALAR_SLOTS, ...VEC4_COMPONENTS, ...VEC3_COMPONENTS, ...VEC2_COMPONENTS];
        case 'vec2': return ['ignore', 'fixed', ...VEC2_SLOTS, ...VEC4_VEC2_SLOTS, ...VEC3_VEC2_SLOTS];
        case 'vec3': return ['ignore', 'fixed', ...VEC3_SLOTS, ...VEC4_SLOTS, 'uJulia'];
        case 'vec4': return ['ignore', 'fixed', ...VEC4_SLOTS];
        case 'bool': return ['ignore', 'fixed', 'uJuliaMode', ...SCALAR_SLOTS];
        default:     return ['ignore'];
    }
}

export function slotLabel(slot: string): string {
    if (slot === 'ignore')     return "Don't expose";
    if (slot === 'fixed')      return 'Fixed value';
    if (slot === 'uJulia')     return 'Julia coords';
    if (slot === 'uJuliaMode') return 'Julia toggle';
    if (slot === 'builtin')    return 'Engine built-in';
    // Component slot: 'vec3A.x' → 'vec3A · x'
    const base = componentSlotBase(slot);
    if (base) return `${base} · ${slot.slice(base.length + 1)}`;
    return slot;
}

export interface SlotGroup {
    label: string | null;  // null = ungrouped (top-level options like ignore/fixed)
    options: string[];
}

/** Return slot options organized into groups for <optgroup> rendering. */
export function groupedSlotOptions(type: string): SlotGroup[] {
    const top: SlotGroup = { label: null, options: ['ignore', 'fixed'] };
    switch (type) {
        case 'float':
        case 'int':
            return [
                top,
                { label: 'Scalars', options: [...SCALAR_SLOTS] },
                { label: 'vec4 components', options: [...VEC4_COMPONENTS] },
                { label: 'vec3 components', options: [...VEC3_COMPONENTS] },
                { label: 'vec2 components', options: [...VEC2_COMPONENTS] },
            ];
        case 'vec2':
            return [
                top,
                { label: 'Vec2 slots', options: [...VEC2_SLOTS] },
                { label: 'Pack in vec4', options: [...VEC4_VEC2_SLOTS] },
                { label: 'Pack in vec3', options: [...VEC3_VEC2_SLOTS] },
            ];
        case 'vec3':
            return [top, { label: 'Vec3 slots', options: [...VEC3_SLOTS, 'uJulia'] }, { label: 'Vec4 slots (.xyz)', options: [...VEC4_SLOTS] }];
        case 'vec4':
            return [top, { label: 'Vec4 slots', options: [...VEC4_SLOTS] }];
        case 'bool':
            return [top, { label: 'Special', options: ['uJuliaMode'] }, { label: 'Scalars (flag bits)', options: [...SCALAR_SLOTS] }];
        default:
            return [top];
    }
}
