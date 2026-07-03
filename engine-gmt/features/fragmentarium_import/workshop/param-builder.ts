/**
 * Workshop parameter building utilities.
 * Converts detected Fragmentarium uniforms into GMT UI parameter definitions.
 */

import type { FragUniform, ParamMappingV2, WorkshopParam } from '../types';
import {
    slotToUniform, componentSlotBase, getSlotOccupancy, buildOccupancyMap, isSlotConflict,
    SCALAR_SLOTS, VEC2_SLOTS, VEC3_SLOTS, VEC4_SLOTS, VecControlAccumulator,
} from '../../../utils/uniformSlots';

// The slot vocabulary, accessor mapping, and occupancy algebra live in the shared
// `uniformSlots` module (consumed by both the Workshop and the MB3D importer). Re-export
// here so existing `from './workshop/param-builder'` imports keep resolving unchanged.
// @see engine-gmt/utils/uniformSlots.ts
export { slotToUniform, componentSlotBase, getSlotOccupancy, buildOccupancyMap, isSlotConflict };
export { SCALAR_SLOTS, VEC2_SLOTS, VEC3_SLOTS, VEC4_SLOTS };

// Component slots: pack multiple floats into a single vec2/vec3/vec4 control.
// Format: 'vec3A.x', 'vec3A.y', 'vec3A.z', 'vec2A.x', 'vec2A.y', etc.
export const VEC4_COMPONENTS = VEC4_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`, `${s}.z`, `${s}.w`]);
export const VEC3_COMPONENTS = VEC3_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`, `${s}.z`]);
export const VEC2_COMPONENTS = VEC2_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`]);

// Swizzle slots: pack vec2 params into partial vec3/vec4 slots.
export const VEC4_VEC2_SLOTS = VEC4_SLOTS.flatMap(s => [`${s}.xy`, `${s}.zw`]);
export const VEC3_VEC2_SLOTS = VEC3_SLOTS.flatMap(s => [`${s}.xy`]);

export function slotOptionsForType(type: WorkshopParam['type']): string[] {
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
export function groupedSlotOptions(type: WorkshopParam['type']): SlotGroup[] {
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
    if (u.type === 'vec4' || u.type === 'vec3' || u.type === 'vec2') {
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
        if ((VEC4_SLOTS   as readonly string[]).includes(slot)) return slot;
        // Component slots pass through as-is (e.g. 'vec3A.x', 'vec4A.w')
        if (VEC4_COMPONENTS.includes(slot) || VEC3_COMPONENTS.includes(slot) || VEC2_COMPONENTS.includes(slot)) return slot;
        if (slot.startsWith('u') && slot.length > 1) {
            const short = slot.charAt(1).toLowerCase() + slot.slice(2);
            if ((SCALAR_SLOTS as readonly string[]).includes(short)) return short;
            if ((VEC2_SLOTS   as readonly string[]).includes(short)) return short;
            if ((VEC3_SLOTS   as readonly string[]).includes(short)) return short;
            if ((VEC4_SLOTS   as readonly string[]).includes(short)) return short;
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

        // Normalize: ensure vec types always have array defaults, scalar types always have number defaults.
        // Prevents type mismatches when a preset provides a scalar for a vec uniform (or vice versa).
        if ((u.type === 'vec2' || u.type === 'vec3' || u.type === 'vec4') && !Array.isArray(uiDefault)) {
            const n = typeof uiDefault === 'number' ? uiDefault : 0;
            const len = u.type === 'vec2' ? 2 : u.type === 'vec3' ? 3 : 4;
            uiDefault = Array.from({ length: len }, () => n);
        } else if ((u.type === 'float' || u.type === 'int' || u.type === 'bool') && Array.isArray(uiDefault)) {
            uiDefault = uiDefault[0] ?? 0;
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
    // Collect unmapped bools to pack into vec3 component slots (3 bools per vec3)
    const unmappedBools: WorkshopParam[] = [];
    for (const p of params) {
        if (p.mappedSlot !== 'ignore') continue;
        if (p.type === 'vec4') {
            for (const s of VEC4_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        } else if (p.type === 'vec3') {
            let found = false;
            for (const s of VEC3_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); found = true; break; } }
            if (!found) for (const s of VEC4_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        } else if (p.type === 'vec2') {
            for (const s of VEC2_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        } else if (p.type === 'bool') {
            unmappedBools.push(p);
        } else if (p.type === 'float' || p.type === 'int') {
            for (const s of SCALAR_SLOTS) { if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; } }
        }
    }
    // Pack bools into vec3 component slots (GMT's bool system: 0.0/1.0 per component)
    if (unmappedBools.length > 0) {
        const COMPONENTS = ['x', 'y', 'z'] as const;
        let boolVecIdx = 0;
        let compIdx = 0;
        let currentVec: string | null = null;

        for (const p of unmappedBools) {
            if (!currentVec || compIdx >= 3) {
                currentVec = null;
                while (boolVecIdx < VEC3_SLOTS.length) {
                    const candidate = VEC3_SLOTS[boolVecIdx];
                    boolVecIdx++;
                    if (!usedSlots.has(candidate)) {
                        currentVec = candidate;
                        usedSlots.add(candidate);
                        compIdx = 0;
                        break;
                    }
                }
            }
            if (currentVec) {
                p.mappedSlot = `${currentVec}.${COMPONENTS[compIdx]}`;
                compIdx++;
            } else {
                // Fallback: scalar slot for remaining bools
                for (const s of SCALAR_SLOTS) {
                    if (!usedSlots.has(s)) { p.mappedSlot = s; usedSlots.add(s); break; }
                }
            }
        }
    }
    return params;
}

export function buildFractalParams(mappings: WorkshopParam[], formulaName: string) {
    const uiParams: any[] = [];
    const defaultPreset: any = {
        formula: formulaName,
        lights: [
            { type: 'Directional', position: { x: 0.5, y: 0.8, z: 1.5 }, rotation: { x: -0.3, y: 0.2, z: 0 }, color: '#ffffff', intensity: 1, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true },
            { type: 'Directional', position: { x: -0.8, y: -0.3, z: 1.0 }, rotation: { x: 0.1, y: -0.5, z: 0 }, color: '#b0c4ff', intensity: 0.4, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: false },
        ],
        features: {
            coreMath: { iterations: 15 },
            quality: { fudgeFactor: 0.75 },
            atmosphere: {
                fogNear: 0, fogFar: 5, fogColor: '#000000', fogDensity: 0,
                glowIntensity: 0.005, glowSharpness: 4, glowColor: '#ffffff', glowMode: false,
            },
            coloring: {
                gradient: [
                    { id: 'imp_0', position: 0,    color: '#1a1a2e', bias: 0.5, interpolation: 'linear' },
                    { id: 'imp_1', position: 0.2,  color: '#16213e', bias: 0.5, interpolation: 'linear' },
                    { id: 'imp_2', position: 0.4,  color: '#0f3460', bias: 0.5, interpolation: 'linear' },
                    { id: 'imp_3', position: 0.6,  color: '#e94560', bias: 0.5, interpolation: 'linear' },
                    { id: 'imp_4', position: 0.8,  color: '#f5a623', bias: 0.5, interpolation: 'linear' },
                    { id: 'imp_5', position: 1,    color: '#1a1a2e', bias: 0.5, interpolation: 'linear' },
                ],
            },
        },
    };

    // ── Generalized component packing ────────────────────────────────────────
    // Group ALL params that share a base slot (via component slots, swizzle slots,
    // or vec3-in-vec4 full-slot mapping). Emit one combined UI control per base.
    //
    // Handles: float+float→vec2, float×3→vec3, float×4→vec4, vec2+vec2→vec4,
    //          vec2+float→vec3, vec3+float→vec4, bool flags in vec3 components, etc.

    type CompEntry = { param: WorkshopParam; components: string[] };
    const packedBases = new Map<string, CompEntry[]>();

    for (const p of mappings) {
        if (p.mappedSlot === 'ignore' || p.mappedSlot === 'fixed' || p.mappedSlot === 'builtin') continue;
        const info = getSlotOccupancy(p.mappedSlot, p.type);
        if (!info) continue;
        // Only track as "packed" if it uses component/swizzle slots, or is vec3-in-vec4
        const isComponent = p.mappedSlot.includes('.');
        const isVec3InVec4 = p.type === 'vec3' && /^vec4[ABC]$/.test(p.mappedSlot);
        if (!isComponent && !isVec3InVec4) continue;
        if (!packedBases.has(info.base)) packedBases.set(info.base, []);
        packedBases.get(info.base)!.push({ param: p, components: info.components });
    }

    // The packing itself is the shared VecControlAccumulator kernel (label joining,
    // range widening, bool→toggle, vec4-held-vec3 typing) — same code the MB3D
    // ScalarParamPacker uses. @see engine-gmt/utils/uniformSlots.ts
    const componentPackedSlots = new Set<string>();
    const acc = new VecControlAccumulator(uiParams, defaultPreset.features.coreMath);
    for (const [base, entries] of packedBases) {
        if (entries.length === 0) continue;
        componentPackedSlots.add(base);
        for (const { param: p, components } of entries) {
            const defaults = Array.isArray(p.uiDefault) ? p.uiDefault : [typeof p.uiDefault === 'number' ? p.uiDefault : 0];
            acc.add(
                base, p.name, components,
                components.map((_, ci) => defaults[ci] ?? defaults[0] ?? 0),
                p.uiMin ?? -180, p.uiMax ?? 180, p.uiStep ?? 1,
                { isBool: p.type === 'bool', isVec3Param: p.type === 'vec3' && !p.mappedSlot.includes('.') },
            );
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
            const raw = Array.isArray(bools[i].uiDefault) ? (bools[i].uiDefault as number[])[0] : bools[i].uiDefault;
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
        // Skip params packed into vec component slots or vec3-in-vec4 (handled above)
        if (componentPackedSlots.has(componentSlotBase(p.mappedSlot) ?? p.mappedSlot)) continue;

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

        if ((VEC4_SLOTS as readonly string[]).includes(p.mappedSlot)) {
            // (vec3-in-vec4 params never reach here — packedBases catches them above and
            // the accumulator emits the vec3-typed control with .w pinned to 0.)
            const defs = Array.isArray(p.uiDefault) ? p.uiDefault : (typeof p.uiDefault === 'number' ? [p.uiDefault, p.uiDefault, p.uiDefault, p.uiDefault] : [0, 0, 0, 0]);
            const def4 = { x: defs[0] ?? 0, y: defs[1] ?? 0, z: defs[2] ?? 0, w: defs[3] ?? 0 };
            uiParams.push({ label: p.name, id: p.mappedSlot, type: 'vec4', min: p.uiMin, max: p.uiMax, step: p.uiStep, default: def4 });
            defaultPreset.features.coreMath[p.mappedSlot] = def4;
            continue;
        }

        if ((VEC3_SLOTS as readonly string[]).includes(p.mappedSlot)) {
            const defs = Array.isArray(p.uiDefault) ? p.uiDefault : (typeof p.uiDefault === 'number' ? [p.uiDefault, p.uiDefault, p.uiDefault] : [0, 0, 0]);
            const def3 = { x: defs[0] ?? 0, y: defs[1] ?? 0, z: defs[2] ?? 0 };
            uiParams.push({ label: p.name, id: p.mappedSlot, type: 'vec3', min: p.uiMin, max: p.uiMax, step: p.uiStep, default: def3 });
            defaultPreset.features.coreMath[p.mappedSlot] = def3;
            continue;
        }

        if ((VEC2_SLOTS as readonly string[]).includes(p.mappedSlot)) {
            const defs = Array.isArray(p.uiDefault) ? p.uiDefault : (typeof p.uiDefault === 'number' ? [p.uiDefault, p.uiDefault] : [0, 0]);
            const def2 = { x: defs[0] ?? 0, y: defs[1] ?? 0 };
            uiParams.push({ label: p.name, id: p.mappedSlot, type: 'vec2', min: p.uiMin, max: p.uiMax, step: p.uiStep, default: def2 });
            defaultPreset.features.coreMath[p.mappedSlot] = def2;
            continue;
        }

        const rawDef = Array.isArray(p.uiDefault) ? (p.uiDefault[0] || 0) : (p.uiDefault as number || 0);
        let min = p.uiMin, max = p.uiMax, step = p.uiStep, defaultVal = rawDef;
        // isDegrees: keep internal value in DEGREES (what the GLSL code expects).
        // Use scale='degrees' so FormulaPanel displays π notation while sending degrees to shader.
        uiParams.push({ label: p.name, id: p.mappedSlot, min, max, step, default: defaultVal, scale: p.isDegrees ? 'degrees' : undefined });
        defaultPreset.features.coreMath[p.mappedSlot] = defaultVal;
    }

    return { uiParams, defaultPreset };
}

/**
 * Mark params as 'ignore' when their mapped uniform isn't actually referenced
 * in the generated shader code. This prevents dead sliders in the UI for params
 * that come from Fragmentarium framework includes (DE-Raymarcher, BufferShader)
 * or color() functions that aren't part of the extracted DE formula.
 */
export function filterDeadParams(
    params: WorkshopParam[],
    generatedCode: string,
): WorkshopParam[] {
    // Strip comments so we don't match uniform names inside // or /* */ blocks
    const code = generatedCode
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    return params.map(p => {
        if (p.mappedSlot === 'ignore' || p.mappedSlot === 'fixed' || p.mappedSlot === 'builtin') return p;
        if (p.mappedSlot === 'uJuliaMode' || p.mappedSlot === 'uJulia') return p;

        const uniformName = slotToUniform(p.mappedSlot);
        // For component slots like uVec3A.x, check the base name uVec3A
        const baseName = uniformName.includes('.') ? uniformName.split('.')[0] : uniformName;
        if (!code.includes(baseName)) {
            return { ...p, mappedSlot: 'ignore' };
        }
        return p;
    });
}
