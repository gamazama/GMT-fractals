/**
 * Workshop parameter building utilities.
 * Converts detected Fragmentarium uniforms into GMT UI parameter definitions.
 */

import type { FragUniform, ParamMappingV2, WorkshopParam } from '../types';

export const SCALAR_SLOTS = ['paramA', 'paramB', 'paramC', 'paramD', 'paramE', 'paramF'] as const;
export const VEC2_SLOTS   = ['vec2A', 'vec2B', 'vec2C'] as const;
export const VEC3_SLOTS   = ['vec3A', 'vec3B', 'vec3C'] as const;

// Component slots: pack multiple floats into a single vec2/vec3 control.
// Format: 'vec3A.x', 'vec3A.y', 'vec3A.z', 'vec2A.x', 'vec2A.y', etc.
export const VEC3_COMPONENTS = VEC3_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`, `${s}.z`]);
export const VEC2_COMPONENTS = VEC2_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`]);

/** Given a component slot like 'vec3A.x', return its base slot 'vec3A'. */
export function componentSlotBase(slot: string): string | null {
    const dot = slot.indexOf('.');
    return dot >= 0 ? slot.slice(0, dot) : null;
}

export function slotOptionsForType(type: WorkshopParam['type']): string[] {
    switch (type) {
        case 'float':
        case 'int':  return ['ignore', 'fixed', ...SCALAR_SLOTS, ...VEC3_COMPONENTS, ...VEC2_COMPONENTS];
        case 'vec2': return ['ignore', 'fixed', ...VEC2_SLOTS];
        case 'vec3': return ['ignore', 'fixed', ...VEC3_SLOTS, 'uJulia'];
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

export function defaultRangeForUniform(u: FragUniform): { min: number; max: number; step: number } {
    if (u.type === 'bool') return { min: 0, max: 1, step: 1 };
    if (u.type === 'int')  return { min: 0, max: 100, step: 1 };
    if (u.min !== undefined && u.max !== undefined) {
        return { min: u.min, max: u.max, step: u.step ?? 0.001 };
    }
    const def = u.default;
    const vals = Array.isArray(def) ? def : [typeof def === 'number' ? def : 0];
    const maxAbs = Math.max(...vals.map(v => Math.abs(v as number)));
    if (maxAbs === 0) return { min: 0, max: 10, step: 0.001 };
    if (u.type === 'vec3' || u.type === 'vec2') {
        const range = Math.max(maxAbs * 3, 5);
        return { min: -range, max: range, step: 0.001 };
    }
    return { min: 0, max: Math.max(maxAbs * 4, 10), step: 0.001 };
}

/** Fragmentarium uniforms that map to GMT engine internals — always builtin, never expose as sliders. */
const FRAG_ENGINE_BUILTINS = new Set(['Iterations', 'orbitTrap']);

export function autoSlotForUniform(autoMap: ParamMappingV2 | undefined, uniformName?: string): string {
    if (uniformName && FRAG_ENGINE_BUILTINS.has(uniformName)) return 'builtin';
    const slot = autoMap?.mappedSlot;
    if (slot) {
        if (slot === 'uIterations')           return 'builtin';
        if (slot === 'uJulia')                return 'uJulia';
        if (slot === 'uJuliaMode')            return 'uJuliaMode';
        if (slot === '(uJuliaMode > 0.5)')    return 'uJuliaMode'; // UNIFORM_MAP expression for bool toggles
        if ((SCALAR_SLOTS as readonly string[]).includes(slot)) return slot;
        if ((VEC2_SLOTS   as readonly string[]).includes(slot)) return slot;
        if ((VEC3_SLOTS   as readonly string[]).includes(slot)) return slot;
        // Component slots pass through as-is (e.g. 'vec3A.x')
        if (VEC3_COMPONENTS.includes(slot) || VEC2_COMPONENTS.includes(slot)) return slot;
        if (slot.startsWith('u') && slot.length > 1) {
            const short = slot.charAt(1).toLowerCase() + slot.slice(2);
            if ((SCALAR_SLOTS as readonly string[]).includes(short)) return short;
            if ((VEC2_SLOTS   as readonly string[]).includes(short)) return short;
            if ((VEC3_SLOTS   as readonly string[]).includes(short)) return short;
        }
    }
    return 'ignore';
}

export function buildWorkshopParams(
    uniforms: FragUniform[],
    autoMappings: ParamMappingV2[],
    firstPreset?: Record<string, string | number | number[] | boolean>,
): WorkshopParam[] {
    const params: WorkshopParam[] = uniforms.map(u => {
        const autoMap = autoMappings.find(m => m.name === u.name);
        const range = defaultRangeForUniform(u);

        let uiDefault: number | number[] = u.default ?? 0;
        if (firstPreset) {
            const pv = firstPreset[u.name];
            if (pv !== undefined) {
                if (Array.isArray(pv) && !(pv as any[]).some(isNaN)) {
                    uiDefault = pv as number[];
                } else if (typeof pv === 'boolean') {
                    uiDefault = pv ? 1 : 0;
                } else if (typeof pv === 'number') {
                    uiDefault = pv;
                } else if (typeof pv === 'string' && pv.includes(',')) {
                    const parts = pv.split(',').map(s => parseFloat(s.trim()));
                    if (!parts.some(isNaN)) uiDefault = parts;
                } else if (typeof pv === 'string' && pv.includes(' ')) {
                    // Space-separated vec (Fragmentarium native preset format)
                    const parts = pv.split(/\s+/).map(s => parseFloat(s));
                    if (!parts.some(isNaN)) uiDefault = parts;
                }
            }
        }

        return {
            name: u.name,
            type: u.type,
            mappedSlot: autoSlotForUniform(autoMap, u.name),
            fixedValue: '1.0',
            uiMin: range.min,
            uiMax: range.max,
            uiStep: range.step,
            uiDefault,
        };
    });

    // Track used scalar/vec slots. Component slots (vec3A.x) mark the base slot (vec3A) as used
    // so the auto-assigner doesn't double-assign the base vec to a vec3 uniform.
    const usedSlots = new Set(params.filter(p => p.mappedSlot !== 'ignore').map(p => {
        const base = componentSlotBase(p.mappedSlot);
        return base ?? p.mappedSlot;
    }));
    // Collect unmapped bools to pack into a single "flags" scalar slot
    const unmappedBools: WorkshopParam[] = [];
    for (const p of params) {
        if (p.mappedSlot !== 'ignore') continue;
        if (p.type === 'vec3') {
            for (const s of VEC3_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        } else if (p.type === 'vec2') {
            for (const s of VEC2_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        } else if (p.type === 'bool') {
            unmappedBools.push(p);
        } else if (p.type === 'float' || p.type === 'int') {
            for (const s of SCALAR_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        }
    }
    // Pack all unmapped bools into a shared scalar slot (bitfield flags)
    if (unmappedBools.length > 0) {
        let flagsSlot: string | null = null;
        for (const s of SCALAR_SLOTS) {
            if (!usedSlots.has(s)) { flagsSlot = s; usedSlots.add(s); break; }
        }
        if (flagsSlot) {
            for (const p of unmappedBools) {
                p.mappedSlot = flagsSlot;
            }
        }
    }
    return params;
}

export function buildFractalParams(mappings: WorkshopParam[], formulaName: string) {
    const uiParams: any[] = [];
    const defaultPreset: any = {
        formula: formulaName,
        features: { coreMath: { iterations: 15 } },
    };

    // Detect component-packed floats: multiple floats sharing a vec2/vec3 slot via component slots.
    // Emit a single vec2/vec3 slider for the base slot; skip individual params in the main loop.
    const componentPackedBases = new Map<string, { x?: WorkshopParam; y?: WorkshopParam; z?: WorkshopParam }>();
    for (const p of mappings) {
        const base = componentSlotBase(p.mappedSlot);
        if (!base) continue;
        const comp = p.mappedSlot.slice(base.length + 1) as 'x' | 'y' | 'z';
        if (!componentPackedBases.has(base)) componentPackedBases.set(base, {});
        componentPackedBases.get(base)![comp] = p;
    }
    const componentPackedSlots = new Set<string>();
    for (const [base, comps] of componentPackedBases) {
        componentPackedSlots.add(base); // skip individual param entries below
        const defX = typeof comps.x?.uiDefault === 'number' ? comps.x.uiDefault : (Array.isArray(comps.x?.uiDefault) ? (comps.x!.uiDefault as number[])[0] : 0);
        const defY = typeof comps.y?.uiDefault === 'number' ? comps.y.uiDefault : (Array.isArray(comps.y?.uiDefault) ? (comps.y!.uiDefault as number[])[0] : 0);
        const defZ = typeof comps.z?.uiDefault === 'number' ? comps.z.uiDefault : (Array.isArray(comps.z?.uiDefault) ? (comps.z!.uiDefault as number[])[0] : 0);
        const allMin = Math.min(comps.x?.uiMin ?? -180, comps.y?.uiMin ?? -180, comps.z?.uiMin ?? -180);
        const allMax = Math.max(comps.x?.uiMax ?? 180, comps.y?.uiMax ?? 180, comps.z?.uiMax ?? 180);
        const allStep = Math.min(comps.x?.uiStep ?? 1, comps.y?.uiStep ?? 1, comps.z?.uiStep ?? 1);
        const isVec2 = (VEC2_SLOTS as readonly string[]).includes(base);
        const label = [comps.x?.name, comps.y?.name, comps.z?.name].filter(Boolean).join(' | ');
        if (isVec2) {
            const def2 = { x: defX, y: defY };
            uiParams.push({ label, id: base, type: 'vec2', min: allMin, max: allMax, step: allStep, default: def2 });
            defaultPreset.features.coreMath[base] = def2;
        } else {
            const def3 = { x: defX, y: defY, z: defZ };
            uiParams.push({ label, id: base, type: 'vec3', min: allMin, max: allMax, step: allStep, default: def3 });
            defaultPreset.features.coreMath[base] = def3;
        }
    }

    // Detect bool flags: multiple bools sharing the same scalar slot
    const boolsPerSlot = new Map<string, WorkshopParam[]>();
    for (const p of mappings) {
        if (p.type === 'bool' && (SCALAR_SLOTS as readonly string[]).includes(p.mappedSlot)) {
            if (!boolsPerSlot.has(p.mappedSlot)) boolsPerSlot.set(p.mappedSlot, []);
            boolsPerSlot.get(p.mappedSlot)!.push(p);
        }
    }
    // Emit flags sliders (one per shared slot, skip individual bools in main loop)
    const flagsSlots = new Set<string>();
    for (const [slot, bools] of boolsPerSlot) {
        flagsSlots.add(slot);
        const maxVal = Math.pow(2, bools.length) - 1;
        let defaultVal = 0;
        for (let i = 0; i < bools.length; i++) {
            const raw = Array.isArray(bools[i].uiDefault) ? bools[i].uiDefault[0] : bools[i].uiDefault;
            if (raw) defaultVal |= (1 << i);
        }
        const label = bools.map(b => b.name).join(' | ');
        uiParams.push({ label, id: slot, min: 0, max: maxVal, step: 1, default: defaultVal });
        defaultPreset.features.coreMath[slot] = defaultVal;
    }

    for (const p of mappings) {
        if (p.mappedSlot === 'ignore' || p.mappedSlot === 'fixed' || p.mappedSlot === 'builtin') continue;
        // Skip bools handled as flags above
        if (flagsSlots.has(p.mappedSlot) && p.type === 'bool') continue;
        // Skip floats packed into vec component slots (handled above)
        if (componentPackedSlots.has(componentSlotBase(p.mappedSlot) ?? '')) continue;

        if (p.mappedSlot === 'uJulia') {
            const defs = Array.isArray(p.uiDefault) ? p.uiDefault : [0, 0, 0];
            defaultPreset.features.geometry = defaultPreset.features.geometry || {};
            defaultPreset.features.geometry.julia  = { x: defs[0] || 0, y: defs[1] || 0, z: defs[2] || 0 };
            defaultPreset.features.geometry.juliaX = defs[0] || 0;
            defaultPreset.features.geometry.juliaY = defs[1] || 0;
            defaultPreset.features.geometry.juliaZ = defs[2] || 0;
            continue;
        }

        if (p.mappedSlot === 'uJuliaMode') {
            defaultPreset.features.geometry = defaultPreset.features.geometry || {};
            const raw = Array.isArray(p.uiDefault) ? p.uiDefault[0] : p.uiDefault;
            defaultPreset.features.geometry.juliaMode = !!(raw);
            continue;
        }

        if ((VEC3_SLOTS as readonly string[]).includes(p.mappedSlot)) {
            const defs = Array.isArray(p.uiDefault) ? p.uiDefault : [0, 0, 0];
            const def3 = { x: defs[0] || 0, y: defs[1] || 0, z: defs[2] || 0 };
            uiParams.push({ label: p.name, id: p.mappedSlot, type: 'vec3', min: p.uiMin, max: p.uiMax, step: p.uiStep, default: def3 });
            defaultPreset.features.coreMath[p.mappedSlot] = def3;
            continue;
        }

        if ((VEC2_SLOTS as readonly string[]).includes(p.mappedSlot)) {
            const defs = Array.isArray(p.uiDefault) ? p.uiDefault : [0, 0];
            const def2 = { x: defs[0] || 0, y: defs[1] || 0 };
            uiParams.push({ label: p.name, id: p.mappedSlot, type: 'vec2', min: p.uiMin, max: p.uiMax, step: p.uiStep, default: def2 });
            defaultPreset.features.coreMath[p.mappedSlot] = def2;
            continue;
        }

        const rawDef = Array.isArray(p.uiDefault) ? (p.uiDefault[0] || 0) : (p.uiDefault as number || 0);
        let min = p.uiMin, max = p.uiMax, step = p.uiStep, defaultVal = rawDef;
        if (p.isDegrees) {
            min        = min        * Math.PI / 180;
            max        = max        * Math.PI / 180;
            step       = step       * Math.PI / 180;
            defaultVal = defaultVal * Math.PI / 180;
        }
        uiParams.push({ label: p.name, id: p.mappedSlot, min, max, step, default: defaultVal, scale: p.isDegrees ? 'pi' : undefined });
        defaultPreset.features.coreMath[p.mappedSlot] = defaultVal;
    }

    return { uiParams, defaultPreset };
}
