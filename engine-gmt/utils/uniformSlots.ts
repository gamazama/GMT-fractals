/**
 * Shared GMT uniform-slot vocabulary, accessor mapping, and occupancy algebra.
 *
 * GMT's `coreMath` feature exposes a FIXED pool of generic shader uniforms —
 * 6 scalars (`uParamA..F`), 3×vec2 (`uVec2A..C`), 3×vec3 (`uVec3A..C`), 3×vec4
 * (`uVec4A..C`) — declared in `engine-gmt/features/core_math.ts` and synced every
 * frame by UniformManager. An imported formula's parameters are mapped onto these
 * slots; when the named-scalar pool overflows, several scalars are packed into the
 * COMPONENTS of one vec uniform (`uVec4A.x`, `uVec4A.y`, …) so the idle vec lanes
 * carry the surplus instead of forcing the importer to bake literals.
 *
 * This module is the single source of truth for that vocabulary, consumed by BOTH
 * the Fragmentarium Formula Workshop (`features/fragmentarium_import/**`) and the
 * Mandelbulb3D importer (`utils/mb3d/**`):
 *  - {@link slotToUniform} — slot id → GPU accessor (`'vec3A.x'` → `'uVec3A.x'`).
 *  - the occupancy algebra ({@link getSlotOccupancy} / {@link componentSlotBase} /
 *    {@link buildOccupancyMap} / {@link isSlotConflict}) — which components of a base
 *    uniform a mapping occupies, used to grey out conflicting slots in the picker.
 *  - {@link LaneAllocator} — a dense scalar-lane cursor over the 24 packable scalar
 *    lanes (`paramA..F` → `uVec2*` components → `uVec4*` components) plus a separate
 *    vec3 pool, used by the MB3D cross-slot allocator to thread a distinct uniform to
 *    every slot's params.
 *  - {@link VecControlAccumulator} — THE component-packing kernel: folds params sharing
 *    a base vec uniform into ONE combined control + coreMath defaults. Consumed by both
 *    {@link ScalarParamPacker} (MB3D, allocator-driven) and the Workshop's
 *    `buildFractalParams` (mapping-driven).
 *  - {@link slotWriteValue} — the vec4-held-vec3 `w:0` write contract, shared by the
 *    packers and `FormulaParamsWidget`.
 *
 * Intentionally app-agnostic: no fractal-, Fragmentarium-, or MB3D-specific logic.
 * @see engine-gmt/features/core_math.ts (the uniform declarations these slots target)
 */

// ── Slot vocabulary ─────────────────────────────────────────────────────────

export const SCALAR_SLOTS = ['paramA', 'paramB', 'paramC', 'paramD', 'paramE', 'paramF'] as const;
export const VEC2_SLOTS   = ['vec2A', 'vec2B', 'vec2C'] as const;
export const VEC3_SLOTS   = ['vec3A', 'vec3B', 'vec3C'] as const;
export const VEC4_SLOTS   = ['vec4A', 'vec4B', 'vec4C'] as const;

// Component slots — pack multiple scalars into one vec uniform's components
// ('vec3A.x', 'vec4B.w', …) — and swizzle slots — pack vec2 params into halves
// of a vec3/vec4 ('vec4A.xy' / 'vec4A.zw' / 'vec3A.xy').
export const VEC4_COMPONENTS = VEC4_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`, `${s}.z`, `${s}.w`]);
export const VEC3_COMPONENTS = VEC3_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`, `${s}.z`]);
export const VEC2_COMPONENTS = VEC2_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`]);
export const VEC4_VEC2_SLOTS = VEC4_SLOTS.flatMap(s => [`${s}.xy`, `${s}.zw`]);
export const VEC3_VEC2_SLOTS = VEC3_SLOTS.flatMap(s => [`${s}.xy`]);

/** Every core slot id, in declaration order — the full per-slot vocabulary a
 *  native weave slot's BANK mirrors (6 scalars + 3 vec2 + 3 vec3 + 3 vec4). */
export const CORE_SLOTS = [...SCALAR_SLOTS, ...VEC2_SLOTS, ...VEC3_SLOTS, ...VEC4_SLOTS] as const;

/** Per-slot BANKS (ADR-0090): a native GMT formula woven as slot k presents its
 *  declared params VERBATIM on its own bank — the coreMath vocabulary duplicated
 *  under a `ws<k>` prefix. `WEAVE_BANK_COUNT` = the max weave slots (the MB3D
 *  addon table), so every active slot 0..5 has a private bank and native slots
 *  never share the coreMath dense pool with each other or with MB3D slots. */
export const WEAVE_BANK_COUNT = 6;

/** Bank state key for core slot id `slot` on bank `k` (`0`,`'paramA'` →
 *  `'ws0ParamA'`). The DDFS `weave` feature declares one param per key; the
 *  fused def's `parameters` reference them with `feature: 'weave'`. */
export function weaveBankKey(bank: number, slot: string): string {
    return `ws${bank}${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

/** GPU uniform accessor for a bank slot (`0`,`'paramA'` → `'uWs0ParamA'`) — the
 *  uniform the DDFS bank param declares and the resolver remaps `uParamA` to. */
export function weaveBankUniform(bank: number, slot: string): string {
    return slotToUniform(weaveBankKey(bank, slot));
}

/** Given a component slot like `'vec3A.x'` or `'vec4A.xy'`, return its base slot
 *  (`'vec3A'`), or `null` for a plain scalar / non-component slot. */
export function componentSlotBase(slot: string): string | null {
    const dot = slot.indexOf('.');
    return dot >= 0 ? slot.slice(0, dot) : null;
}

/** Convert a short slot id (`'vec3A'`, `'paramB'`, `'vec3A.x'`) to its GPU uniform
 *  accessor (`'uVec3A'`, `'uParamB'`, `'uVec3A.x'`). Already-`u`-prefixed names pass
 *  through unchanged. */
export function slotToUniform(slot: string): string {
    if (!slot || slot.startsWith('u')) return slot;
    const dot = slot.indexOf('.');
    if (dot >= 0) {
        const base = slot.slice(0, dot);
        const comp = slot.slice(dot); // includes the dot
        return 'u' + base.charAt(0).toUpperCase() + base.slice(1) + comp;
    }
    return 'u' + slot.charAt(0).toUpperCase() + slot.slice(1);
}

/**
 * Return which components of a base slot a given mapping occupies.
 * Handles: full slots (`vec3A` → xyz), component slots (`vec4A.x` → [x]),
 * swizzle slots (`vec4A.xy` → [x,y]), and vec3-in-vec4 (`vec4A` with type `vec3`
 * → [x,y,z]). Returns `null` for scalar / special slots.
 */
export function getSlotOccupancy(slot: string, paramType: string): { base: string; components: string[] } | null {
    // Swizzle or component slot: 'vec4A.xy', 'vec3A.x', etc.
    const dot = slot.indexOf('.');
    if (dot >= 0) {
        return { base: slot.slice(0, dot), components: [...slot.slice(dot + 1)] };
    }
    // Full vec slots
    if (/^vec4[ABC]$/.test(slot)) {
        return paramType === 'vec3'
            ? { base: slot, components: ['x', 'y', 'z'] }
            : { base: slot, components: ['x', 'y', 'z', 'w'] };
    }
    if (/^vec3[ABC]$/.test(slot)) {
        return paramType === 'vec2'
            ? { base: slot, components: ['x', 'y'] }
            : { base: slot, components: ['x', 'y', 'z'] };
    }
    if (/^vec2[ABC]$/.test(slot)) return { base: slot, components: ['x', 'y'] };
    // Scalar or special slot
    return null;
}

/** Minimal structural shape of a slot mapping — both WorkshopParam and any other
 *  importer's mapping satisfy this. */
export interface SlotMapping { mappedSlot: string; type: string; }

/**
 * Build a component occupancy map from mappings.
 * Returns base → Set of occupied component chars.
 */
export function buildOccupancyMap(mappings: SlotMapping[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const m of mappings) {
        if (m.mappedSlot === 'ignore' || m.mappedSlot === 'fixed' || m.mappedSlot === 'builtin') continue;
        const info = getSlotOccupancy(m.mappedSlot, m.type);
        if (!info) continue;
        if (!map.has(info.base)) map.set(info.base, new Set());
        for (const c of info.components) map.get(info.base)!.add(c);
    }
    return map;
}

/**
 * Check if a slot conflicts with already-occupied components.
 * Used by the SlotPicker to grey out unavailable slots.
 */
export function isSlotConflict(
    candidateSlot: string,
    candidateType: string,
    currentSlot: string,
    occupancyMap: Map<string, Set<string>>,
    scalarUsed: Set<string>,
): boolean {
    if (candidateSlot === currentSlot) return false;
    const info = getSlotOccupancy(candidateSlot, candidateType);
    if (!info) {
        // Scalar or special slot — exact match check
        return scalarUsed.has(candidateSlot);
    }
    // Get what's currently occupied on this base (excluding our own current slot's components)
    const occupied = occupancyMap.get(info.base);
    if (!occupied) return false;

    // Temporarily remove our own components to avoid self-conflict
    const currentInfo = getSlotOccupancy(currentSlot, candidateType);
    let ownComponents: string[] = [];
    if (currentInfo && currentInfo.base === info.base) {
        ownComponents = currentInfo.components;
    }

    return info.components.some(c => occupied.has(c) && !ownComponents.includes(c));
}

// ── Dense scalar-lane allocation ────────────────────────────────────────────

/** The 24 packable scalar lanes, in dense allocation order: the 6 named scalars,
 *  then the 6 `uVec2*` components, then the 12 `uVec4*` components. `uVec3*` is NOT
 *  here — it stays reserved for genuine vec3 params (rotations, X/Y/Z triples). The
 *  `uVec4*` units are SHARED with the vec3 pool (see {@link LaneAllocator.nextVec3}):
 *  scalars claim them low→high here, vec3-overflow claims whole units high→low. */
const SCALAR_LANES: string[] = [
    ...SCALAR_SLOTS,
    ...VEC2_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`]),
    ...VEC4_SLOTS.flatMap(s => [`${s}.x`, `${s}.y`, `${s}.z`, `${s}.w`]),
];
/** Scalar lanes before the shared uVec4 region (paramA..F + uVec2* comps). */
const FIXED_SCALAR_COUNT = SCALAR_SLOTS.length + VEC2_SLOTS.length * 2;
const VEC3_LANES: readonly string[] = VEC3_SLOTS;

type Axis = 'x' | 'y' | 'z' | 'w';

/** vec base id (`'vec2A'`, `'vec4B'`) → its GLSL component kind. */
export function vecKindOf(base: string): 'vec2' | 'vec3' | 'vec4' {
    return base.startsWith('vec2') ? 'vec2' : base.startsWith('vec4') ? 'vec4' : 'vec3';
}

function zeroVec(kind: 'vec2' | 'vec3' | 'vec4'): { x: number; y: number; z?: number; w?: number } {
    if (kind === 'vec2') return { x: 0, y: 0 };
    if (kind === 'vec4') return { x: 0, y: 0, z: 0, w: 0 };
    return { x: 0, y: 0, z: 0 };
}

/**
 * A dense cursor over GMT's packable uniform lanes. `nextScalar()` walks the scalar
 * lanes (`paramA..F` → `uVec2*` comps → `uVec4*` comps); `nextVec3()` walks the 3
 * genuine `uVec3*` units and then OVERFLOWS into `uVec4*` units as `.xyz` holders. A
 * single instance is threaded across every slot of a multi-slot hybrid so each slot's
 * params land on distinct uniforms; `fits()` reports whether any allocation overflowed.
 *
 * The 3 `uVec4*` units are a SHARED pool: scalar-packing claims their components from
 * the low end (A→B→C), vec3-overflow claims WHOLE units from the high end (C→B→A) — so
 * a scene can hold up to 3 vec3 units + 3 vec4-as-vec3 = 6 vec3-shaped params (when its
 * scalars stay within `paramA..F` + `uVec2*`). The two consumers meet in the middle and
 * overflow only when they genuinely collide (no bundled scene does).
 *
 * Call {@link startSlot} at the start of each slot in a multi-slot hybrid: it never
 * lets a vec uniform base be split across two slots (which would emit two params with
 * the same `id` and clobber each other's coreMath defaults). `paramA..F` are exempt —
 * they're independent scalars that multiple slots may share without collision.
 */
export class LaneAllocator {
    private s: number;
    private v: number;
    private vec3Vec4 = 0;   // uVec4* units claimed by vec3-overflow, from the high end (C→B→A)
    private overflowed = false;

    constructor(scalarStart = 0, vec3Start = 0) { this.s = scalarStart; this.v = vec3Start; }

    /** Number of `uVec4*` units scalar-packing has started using (from the low end). */
    private scalarVec4Used(): number { return Math.max(0, Math.ceil((this.s - FIXED_SCALAR_COUNT) / 4)); }

    /** Next dense scalar lane, or `null` if the scalar pool is exhausted — including a
     *  `uVec4*` lane whose unit has been claimed by vec3-overflow. `component` is set
     *  for vec-lane scalars. */
    nextScalar(): { accessor: string; coreKey: string; component: Axis | null } | null {
        if (this.s >= SCALAR_LANES.length) { this.overflowed = true; return null; }
        // A uVec4* lane is off-limits once its unit (low→high index) is claimed by vec3.
        if (this.s >= FIXED_SCALAR_COUNT) {
            const unitIdx = Math.floor((this.s - FIXED_SCALAR_COUNT) / 4);
            if (unitIdx >= VEC4_SLOTS.length - this.vec3Vec4) { this.overflowed = true; return null; }
        }
        const slot = SCALAR_LANES[this.s++];
        const base = componentSlotBase(slot);
        const component = base ? (slot.slice(slot.indexOf('.') + 1) as Axis) : null;
        return { accessor: slotToUniform(slot), coreKey: base ?? slot, component };
    }

    /** Next vec3-shaped unit: a genuine `uVec3*` first, then a `uVec4*` `.xyz` holder
     *  from the high end if one is free of scalar-packing. `null` when both are exhausted.
     *  `vec3Accessor` is the vec3-valued GLSL read (`uVec3A` or `uVec4A.xyz`);
     *  `componentBase` is the uniform whose `.x/.y/.z` carry the components. */
    nextVec3(): { id: string; vec3Accessor: string; componentBase: string } | null {
        if (this.v < VEC3_LANES.length) {
            const id = VEC3_LANES[this.v++];
            const u = slotToUniform(id);
            return { id, vec3Accessor: u, componentBase: u };
        }
        // Overflow into a uVec4* unit (.xyz) from the high end, if one is free of scalars.
        if (this.scalarVec4Used() + this.vec3Vec4 >= VEC4_SLOTS.length) { this.overflowed = true; return null; }
        const id = VEC4_SLOTS[VEC4_SLOTS.length - 1 - this.vec3Vec4]; // vec4C → vec4B → vec4A
        this.vec3Vec4++;
        const u = slotToUniform(id);
        return { id, vec3Accessor: `${u}.xyz`, componentBase: u };
    }

    /** Align the scalar cursor to a fresh vec base before a new slot allocates, so a
     *  vec uniform is never split across slots. No-op in the `paramA..F` region. */
    startSlot(): void {
        while (this.s > 0 && this.s < SCALAR_LANES.length) {
            const base = componentSlotBase(SCALAR_LANES[this.s]);
            if (!base) break;                                              // a paramA..F lane
            if (base !== componentSlotBase(SCALAR_LANES[this.s - 1])) break; // already at a base boundary
            this.s++;
        }
    }

    /** Budget gate: true while no allocation has overflowed its pool. */
    fits(): boolean { return !this.overflowed; }

    /** Diagnostics — scalar lanes / vec3-shaped units (incl. vec4 holders) consumed. */
    get scalarsUsed(): number { return this.s; }
    get vec3sUsed(): number { return this.v + this.vec3Vec4; }
}

/** A GMT formula parameter (slider) emitted by the packer — scalar or packed vec. */
export interface PackedParam {
    label: string;
    id: string;
    type?: 'vec2' | 'vec3' | 'vec4';
    min: number;
    max: number;
    step: number;
    default: number | { x: number; y: number; z?: number; w?: number };
    /** 'toggle': on/off rendering — per-component buttons on an all-bool vec base,
     *  or a segmented Off/On switch on a bool scalar lane. 'mixed': a vec2 whose
     *  x is a GATING bool and y a value it enables (toggle X + slider Y — only
     *  emitted when the bool's name declares gating semantics, since mixed greys
     *  the slider while the toggle is off). */
    mode?: 'toggle' | 'mixed';
}

/**
 * The vec4-held-vec3 write contract: a vec3 param stored in a `uVec4*` unit occupies
 * `.xyz` and must pin `.w` to 0 so the full vec4 uniform syncs cleanly. Returns the
 * coreMath-shaped value to store for a param value landing on `slotId`. Every writer
 * of a slot value (packers, widgets) routes through this instead of restating the rule.
 */
export function slotWriteValue(slotId: string, paramType: string | undefined, v: any): any {
    if (paramType === 'vec3' && /^vec4[ABC]$/.test(slotId)) return { x: v.x, y: v.y, z: v.z, w: 0 };
    return v;
}

/** One param's contribution to a combined vec control (see {@link VecControlAccumulator}). */
interface VecEntry {
    label: string;
    comps: readonly string[];
    min: number;
    max: number;
    step: number;
    isBool: boolean;
    /** Bool whose NAME declares gating semantics ("apply …", "use …", "enable …")
     *  — eligible to drive a vec2 'mixed' control (toggle X gates slider Y). */
    gates: boolean;
    isVec3Param: boolean;
}

/**
 * THE component-packing kernel: folds params that share a base vec uniform into ONE
 * combined control per base, plus the matching coreMath defaults. Shared by the MB3D
 * {@link ScalarParamPacker} (allocator-driven, one scalar at a time) and the Workshop's
 * `buildFractalParams` (mapping-driven, whole params at a time) — previously two
 * hand-mirrored implementations.
 *
 * Semantics (rebuilt from ALL entries on every {@link add}):
 *  - label: members joined with `" | "` in component order (x→w), consecutive
 *    components of one param collapsed to a single mention;
 *  - range: min/max widen across members, step narrows; all-bool bases clamp to
 *    0..1 step 1 (and a fully-bool vec3 base renders as toggles);
 *  - type: the base's own kind — EXCEPT a vec4 base whose sole occupant is a genuine
 *    vec3 param, which presents as a vec3 control (the vec4-held-vec3 contract:
 *    `.w` stays pinned to 0, see {@link slotWriteValue});
 *  - the control is created on first touch and pushed to `out` (display order follows
 *    first touch), then mutated in place.
 */
export class VecControlAccumulator {
    private byBase = new Map<string, { param: PackedParam; entries: VecEntry[] }>();

    constructor(
        private out: PackedParam[],
        private coreMath: Record<string, any>,
    ) {}

    /** Fold one param (its label, the components it occupies, per-component default
     *  values, and slider range) into the combined control for `base`. */
    add(
        base: string, label: string, comps: readonly string[], values: readonly number[],
        min: number, max: number, step: number,
        opts: { isBool?: boolean; gates?: boolean; isVec3Param?: boolean } = {},
    ): void {
        const kind = vecKindOf(base);
        let slot = this.byBase.get(base);
        if (!slot) {
            const param: PackedParam = { label, id: base, type: kind, min, max, step, default: zeroVec(kind) };
            slot = { param, entries: [] };
            this.byBase.set(base, slot);
            this.out.push(param);
            this.coreMath[base] = zeroVec(kind);
        }
        slot.entries.push({ label, comps, min, max, step, isBool: !!opts.isBool, gates: !!opts.gates, isVec3Param: !!opts.isVec3Param });

        comps.forEach((c, i) => {
            const v = values[i] ?? values[0] ?? 0;
            (slot!.param.default as any)[c] = v;
            this.coreMath[base][c] = v;
        });

        this.rebuild(kind, slot);
    }

    private rebuild(kind: 'vec2' | 'vec3' | 'vec4', slot: { param: PackedParam; entries: VecEntry[] }): void {
        const { param, entries } = slot;

        const labelByComp: Record<string, string> = {};
        for (const e of entries) for (const c of e.comps) labelByComp[c] = labelByComp[c] ?? e.label;
        const parts: string[] = [];
        const ALL = ['x', 'y', 'z', 'w'];
        for (let i = 0; i < ALL.length;) {
            const name = labelByComp[ALL[i]];
            if (!name) { i++; continue; }
            let j = i + 1;
            while (j < ALL.length && labelByComp[ALL[j]] === name) j++;
            parts.push(name);
            i = j;
        }
        param.label = parts.join(' | ');

        const allBools = entries.every(e => e.isBool);
        param.min = allBools ? 0 : Math.min(...entries.map(e => e.min));
        param.max = allBools ? 1 : Math.max(...entries.map(e => e.max));
        param.step = allBools ? 1 : Math.min(...entries.map(e => e.step));
        // Any FULLY-bool base renders as per-component toggles. A vec2 whose x is
        // a GATING bool ("apply …") over a continuous y renders as 'mixed'
        // (toggle X enables slider Y) — the gating check matters because mixed
        // greys the slider while the toggle is off, which would be wrong for two
        // unrelated params that merely share the lane.
        const boolAt = (c: string) => entries.some(e => e.comps.includes(c) && e.isBool);
        const gatesAt = (c: string) => entries.some(e => e.comps.includes(c) && e.gates);
        const hasComp = (c: string) => entries.some(e => e.comps.includes(c));
        if (allBools) param.mode = 'toggle';
        else if (kind === 'vec2' && gatesAt('x') && hasComp('y') && !boolAt('y')) param.mode = 'mixed';
        else delete param.mode;

        param.type = kind === 'vec4' && entries.length === 1 && entries[0].isVec3Param ? 'vec3' : kind;
    }
}

/**
 * Wraps a {@link LaneAllocator} and accumulates the slider schema + coreMath defaults
 * as a slot's options are packed. Scalars landing on `paramA..F` become individual
 * sliders; scalars landing on vec lanes — and whole vec3 units — are folded through the
 * shared {@link VecControlAccumulator}.
 *
 * One packer per slot; the underlying allocator is shared across slots.
 */
export class ScalarParamPacker {
    readonly params: PackedParam[] = [];
    readonly coreMath: Record<string, any> = {};
    private acc = new VecControlAccumulator(this.params, this.coreMath);

    constructor(private alloc: LaneAllocator) {}

    /** Allocate one scalar lane for an option, record its slider + default, and return
     *  the GLSL accessor for the binding — or `null` if the scalar pool overflowed.
     *  `opts.bool` marks a binary option (renders as a toggle — segmented Off/On on
     *  a paramA..F lane, per-component button in an all-bool vec pack); `opts.gates`
     *  marks a bool whose name declares gating semantics (vec2 'mixed' candidate). */
    scalar(label: string, value: number, min: number, max: number, step: number,
        opts?: { bool?: boolean; gates?: boolean }): string | null {
        const lane = this.alloc.nextScalar();
        if (!lane) return null;
        if (lane.component) {
            this.acc.add(lane.coreKey, label, [lane.component], [value], min, max, step,
                opts?.bool ? { isBool: true, gates: opts.gates } : {});
        } else {
            this.params.push({
                label, id: lane.coreKey, min, max, step, default: value,
                ...(opts?.bool ? { mode: 'toggle' as const } : {}),
            });
            this.coreMath[lane.coreKey] = value;
        }
        return lane.accessor;
    }

    /** Allocate one vec3-shaped unit (rotation / X-Y-Z triple), record its vec3 slider +
     *  default, and return the lane (vec3Accessor for a whole-vec3 read, componentBase for
     *  `.x/.y/.z` binds) — or `null` if both the vec3 pool and vec4 holders are full. A
     *  vec4-held vec3 occupies `.xyz`; its coreMath gets `w:0` so the vec4 syncs cleanly. */
    vec3(label: string, def: { x: number; y: number; z: number }, min: number, max: number, step: number): { id: string; vec3Accessor: string; componentBase: string } | null {
        const lane = this.alloc.nextVec3();
        if (!lane) return null;
        this.acc.add(lane.id, label, ['x', 'y', 'z'], [def.x, def.y, def.z], min, max, step, { isVec3Param: true });
        return lane;
    }
}
