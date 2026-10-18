/**
 * deep-zoom/boxSchedule.ts - the Mandelbox's iteration schedule: rules that give a parameter another value at
 * chosen iterations, and what they compile to for the renderer. Pure: no store, no React, no renderer.
 *
 * WHAT IT IS
 *   A schedule changes Scale, Min Radius, Folding Limit, Fixed Radius, the Pre-Rotation's three angles, the
 *   Mandelbulb's two phase angles or (in Julia mode, either formula) the Julia constant's three coordinates at some
 *   iterations of the orbit and leaves
 *   the rest at the slider's value (the BASE). The iteration index is roughly depth: at the box's 2.6 to 3.1
 *   iterations a decade, a change at iteration k reshapes the picture from about 10^-(k/3) down and leaves
 *   everything shallower as it was. So a schedule makes a dive change its look as it goes.
 *   The store holds the rules (`dzFormula.boxSchedule`, features/formula.ts): one list per parameter, applied in
 *   order, a later rule winning on the iterations it touches. Three kinds:
 *     keys     values at chosen iterations, straight lines between; the base before the first key, the last
 *              key's value from it on
 *     switch   one value from an iteration on, back to the base at another (or never)
 *     pattern  one value on a repeating set: `width` iterations in a row every `every`, from `start`, until
 *              `until` (or never) - every 2nd, 2 on 2 off, ...
 *   A rule can be switched off (`off`) and keeps its numbers.
 *
 * THE SEAM
 *   `compileBoxSchedule` gives the renderer's table (`api.setBoxSchedule`, grep PER-ITERATION PARAMETERS in
 *   renderer/core.js): one entry an iteration, null or the renderer's names (scale, minR, fold, fixedR, rx, ry, rz,
 *   pt, pp, cx, cy, cz) for the
 *   values that differ from the base there; iterations past the table take the base. The host pushes it
 *   (host/looseParams.ts, the `schedule` push). The table does not depend on the base, so moving a slider
 *   sends no new table.
 *
 * PITFALLS
 *   - Open-ended rules (keys, a switch or a pattern with no end) fill the table to `SCHEDULE_ITERATIONS`, the
 *     box's own ceiling (500): beyond it no orbit runs.
 *   - A schedule moves the surface at every depth past the iterations it changes: a place saved without it is
 *     not on the scheduled shape (a place keeps its own: it holds the whole formula).
 *   - The renderer holds each entry to its limits as it holds a slider's (|scale| at least 1.02, Min Radius at
 *     most Fixed Radius): a key line from 2 to -2 passes the band at +-1.02.
 *   - No key here may start with `is`: saved scenes drop such keys (features/formula.ts, PITFALLS).
 */

/** The parameters that can be scheduled: the store's key, the renderer's name(s), the label, and the group of the
 *  tool's tabs. The Julia constant's three apply in Julia mode only (outside it no constant is added). */
export const SCHEDULED_PARAMS = {
    boxScale: { fields: ['scale'], label: 'Scale', group: 'box' },
    boxMinRadius: { fields: ['minR'], label: 'Min Radius', group: 'box' },
    boxFold: { fields: ['fold'], label: 'Folding Limit', group: 'box' },
    boxFixedRadius: { fields: ['fixedR'], label: 'Fixed Radius', group: 'box' },
    // ONE VEC3 (2026-10-18, the owner: "so they can be keyed together"): a rule's value is (x, y, z); its row in the
    // store is the composed one, and the slice's three scalars are the base (`baseFrom`)
    boxRotation: { fields: ['rx', 'ry', 'rz'], label: 'Pre-Rotation', group: 'rotation', baseFrom: ['boxRotX', 'boxRotY', 'boxRotZ'] },
    juliaConstant: { fields: ['cx', 'cy', 'cz'], label: 'Julia constant', group: 'julia', baseFrom: ['juliaX', 'juliaY', 'juliaZ'] },
    // the Mandelbulb's (2026-10-18; grep PER-ITERATION PARAMETERS, THE BULB in renderer/core.js)
    phaseTheta: { fields: ['pt'], label: 'Theta', group: 'phase' },
    phasePhi: { fields: ['pp'], label: 'Phi', group: 'phase' },
} as const;
export type DzScheduleGroup = (typeof SCHEDULED_PARAMS)[keyof typeof SCHEDULED_PARAMS]['group'];
/** The tool's groups, with the formulas each belongs to: the Julia constant is both formulas' (the table carries
 *  every formula's fields; each formula's renderer reads its own). */
export const SCHEDULE_GROUPS: Record<DzScheduleGroup, { label: string; formulas: readonly ('box' | 'bulb')[] }> = {
    box: { label: 'Box', formulas: ['box'] },
    rotation: { label: 'Pre-Rotation', formulas: ['box'] },
    phase: { label: 'Phase', formulas: ['bulb'] },
    julia: { label: 'Julia constant', formulas: ['box', 'bulb'] },
};
export type DzScheduledKey = keyof typeof SCHEDULED_PARAMS;
export const SCHEDULED_KEYS = Object.keys(SCHEDULED_PARAMS) as DzScheduledKey[];
export const isScheduledKey = (key: string): key is DzScheduledKey => key in SCHEDULED_PARAMS;
/** True for a parameter whose value is three numbers (x, y, z). */
export const isVecKey = (key: DzScheduledKey): boolean => SCHEDULED_PARAMS[key].fields.length === 3;
/** The axes of a vec3 parameter, for its tracks and its graph's three lines. */
export const VEC_AXES = ['x', 'y', 'z'] as const;

/** The box's iteration ceiling (BOX_ITER_MAX in renderer/core.js): no orbit runs past it. */
export const SCHEDULE_ITERATIONS = 500;

/** A rule's value: one number, or three (x, y, z) for a vec3 parameter. */
export type DzScheduleValue = number | readonly number[];
/** `id`: stable within the schedule (THE VALUES ARE ANIMATABLE): a keyframe track is bound to it, not to a position. */
export interface DzScheduleKey { at: number; value: DzScheduleValue; id?: number }
export type DzScheduleRule =
    | { kind: 'keys'; id?: number; off?: boolean; keys: DzScheduleKey[] }
    | { kind: 'switch'; id?: number; off?: boolean; at: number; until: number | null; value: DzScheduleValue }
    | { kind: 'pattern'; id?: number; off?: boolean; start: number; every: number; width: number; until: number | null; value: DzScheduleValue };
export type DzScheduleRuleKind = DzScheduleRule['kind'];
/** The store's value: the rules of each scheduled parameter. An absent or empty list: that parameter is not scheduled. */
export type DzBoxSchedule = Partial<Record<DzScheduledKey, DzScheduleRule[]>>;
type Field = (typeof SCHEDULED_PARAMS)[DzScheduledKey]['fields'][number];
/** One entry of the renderer's table (`api.setBoxSchedule`). */
export type DzScheduleEntry = Partial<Record<Field, number>> | null;

const int = (v: number, lo = 0): number => Math.max(lo, Math.min(SCHEDULE_ITERATIONS, Math.round(Number.isFinite(v) ? v : lo)));
/** a value's component j (a number is its own every component) */
export const comp = (v: DzScheduleValue, j: number): number => (typeof v === 'number' ? v : v[j] ?? 0);
const lerp = (a: DzScheduleValue, b: DzScheduleValue, f: number): DzScheduleValue =>
    (typeof a === 'number' && typeof b === 'number' ? a + (b - a) * f : [0, 1, 2].map((j) => comp(a, j) + (comp(b, j) - comp(a, j)) * f));

/** The rule's value at iteration i, or undefined where it leaves the parameter alone. */
export function ruleValueAt(rule: DzScheduleRule, i: number): DzScheduleValue | undefined {
    if (rule.off) return undefined;
    if (rule.kind === 'switch') return i >= int(rule.at) && (rule.until === null || i < int(rule.until)) ? rule.value : undefined;
    if (rule.kind === 'pattern') {
        const start = int(rule.start), every = int(rule.every, 1), width = int(rule.width, 1);
        if (i < start || (rule.until !== null && i >= int(rule.until))) return undefined;
        return (i - start) % every < width ? rule.value : undefined;
    }
    const keys = sortedKeys(rule.keys);
    if (!keys.length || i < keys[0].at) return undefined;
    for (let k = 1; k < keys.length; k++) {
        const a = keys[k - 1], b = keys[k];
        if (i < b.at) return b.at === a.at ? b.value : lerp(a.value, b.value, (i - a.at) / (b.at - a.at));
    }
    return keys[keys.length - 1].value;
}

/** The keys in order of iteration, each iteration a whole number (a later key at the same iteration wins). */
export function sortedKeys(keys: readonly DzScheduleKey[]): DzScheduleKey[] {
    return keys.map((k) => ({ ...k, at: int(k.at) })).sort((a, b) => a.at - b.at);
}

/** The value a list of rules gives at iteration i: the last rule that touches i, else undefined (the base). */
export function scheduleValueAt(rules: readonly DzScheduleRule[] | undefined, i: number): DzScheduleValue | undefined {
    let out: DzScheduleValue | undefined;
    for (const rule of rules ?? []) { const v = ruleValueAt(rule, i); if (v !== undefined) out = v; }
    return out;
}

/** The first iteration past every iteration the rules touch (SCHEDULE_ITERATIONS when one has no end); 0 for none. */
export function scheduleEnd(rules: readonly DzScheduleRule[] | undefined): number {
    let end = 0;
    for (const rule of rules ?? []) {
        if (rule.off) continue;
        if (rule.kind === 'keys') { if (rule.keys.length) end = SCHEDULE_ITERATIONS; }
        else end = Math.max(end, rule.until === null ? SCHEDULE_ITERATIONS : int(rule.until));
    }
    return end;
}

/** True when any rule of the parameter is in force. */
export const isScheduled = (rules: readonly DzScheduleRule[] | undefined): boolean => scheduleEnd(rules) > 0;

/** The renderer's table for a schedule (see THE SEAM), or null when nothing is scheduled. */
export function compileBoxSchedule(schedule: DzBoxSchedule | null | undefined): DzScheduleEntry[] | null {
    if (!schedule) return null;
    let len = 0;
    for (const key of SCHEDULED_KEYS) len = Math.max(len, scheduleEnd(schedule[key]));
    const table: DzScheduleEntry[] = [];
    let last = -1;
    for (let i = 0; i < len; i++) {
        let entry: Record<string, number> | null = null;
        for (const key of SCHEDULED_KEYS) {
            const v = scheduleValueAt(schedule[key], i);
            if (v === undefined) continue;
            SCHEDULED_PARAMS[key].fields.forEach((f, j) => { const x = comp(v, j); if (Number.isFinite(x)) (entry ??= {})[f] = x; });
        }
        table.push(entry);
        if (entry) last = i;
    }
    table.length = last + 1;
    return table.length ? table : null;
}

/** A new rule of a kind, its value(s) from the base and its iterations around `near` (the count in use); its ids
 *  from `id` up (nextScheduleId). */
export function newRule(kind: DzScheduleRuleKind, base: DzScheduleValue, near: number, id = 1): DzScheduleRule {
    const at = Math.max(1, Math.round(near * 0.3));
    if (kind === 'switch') return { kind, id, at, until: null, value: base };
    if (kind === 'pattern') return { kind, id, start: 0, every: 2, width: 1, until: null, value: base };
    return { kind, id, keys: [{ at, value: base, id: id + 1 }, { at: Math.max(at + 1, Math.round(near * 0.7)), value: base, id: id + 2 }] };
}

/* ════════ THE VALUES ARE ANIMATABLE (2026-10-18) ════════
   Each rule's value (a key's value, for a keys rule) can be keyframed like a slider: its track id is
   `dzSchedule.<param>.r<rule id>` (`.k<key id>` for a key; then `.x` / `.y` / `.z` for a vec3's three tracks, keyed
   together by one diamond as a vec3 row's are), bound by one prefix binder (binderRegistry.registerPrefix,
   components/ScheduleTool.tsx) that writes the value into the store's rules. The ids are stable: a rule or key keeps
   its id when others are added, removed or sorted, so its track stays its own. A track whose rule is gone writes
   nothing. The track id holds the param's name, so a rotation's and a phase's track is interpolated as an angle
   (grep isRotationTrack), as theirs should be. */
export const SCHEDULE_TRACK_PREFIX = 'dzSchedule.';
export const scheduleTrackId = (key: DzScheduledKey, ruleId: number, keyId?: number, axis?: number): string =>
    `${SCHEDULE_TRACK_PREFIX}${key}.r${ruleId}${keyId === undefined ? '' : `.k${keyId}`}${axis === undefined ? '' : `.${VEC_AXES[axis]}`}`;
export function parseScheduleTrackId(id: string): { key: DzScheduledKey; ruleId: number; keyId?: number; axis?: number } | null {
    const m = /^dzSchedule\.(\w+)\.r(\d+)(?:\.k(\d+))?(?:\.([xyz]))?$/.exec(id);
    if (!m || !isScheduledKey(m[1])) return null;
    return { key: m[1], ruleId: Number(m[2]), ...(m[3] !== undefined ? { keyId: Number(m[3]) } : {}), ...(m[4] !== undefined ? { axis: VEC_AXES.indexOf(m[4] as 'x') } : {}) };
}
/** One more than the largest id in the schedule. */
export function nextScheduleId(schedule: DzBoxSchedule | null | undefined): number {
    let mx = 0;
    for (const key of SCHEDULED_KEYS) for (const r of schedule?.[key] ?? []) {
        mx = Math.max(mx, r.id ?? 0);
        if (r.kind === 'keys') for (const k of r.keys) mx = Math.max(mx, k.id ?? 0);
    }
    return mx + 1;
}
/** The schedule with an id on every rule and key that has none (rules made before the ids), or itself when all have one. */
export function withScheduleIds(schedule: DzBoxSchedule): DzBoxSchedule {
    let next = nextScheduleId(schedule), changed = false;
    const out: DzBoxSchedule = {};
    for (const key of SCHEDULED_KEYS) {
        const rules = schedule[key];
        if (!rules) continue;
        out[key] = rules.map((r) => {
            let rr = r;
            if (rr.id === undefined) { rr = { ...rr, id: next++ }; changed = true; }
            if (rr.kind === 'keys' && rr.keys.some((k) => k.id === undefined)) { rr = { ...rr, keys: rr.keys.map((k) => (k.id === undefined ? { ...k, id: next++ } : k)) }; changed = true; }
            return rr;
        });
    }
    return changed ? out : schedule;
}
/** a value with component `axis` set to v (the whole value when axis is undefined) */
const setComp = (old: DzScheduleValue, axis: number | undefined, v: number): DzScheduleValue =>
    (axis === undefined || typeof old === 'number' ? v : old.map((x, j) => (j === axis ? v : x)));
/** The schedule with one value set (a track's write: one component of a vec3), or null when that rule or key is not
 *  in it, or holds that value already. */
export function withScheduleValue(schedule: DzBoxSchedule, key: DzScheduledKey, ruleId: number, keyId: number | undefined, v: number, axis?: number): DzBoxSchedule | null {
    const rules = schedule[key];
    if (!rules) return null;
    let hit = false;
    const next = rules.map((r) => {
        if (r.id !== ruleId) return r;
        if (r.kind === 'keys') {
            if (keyId === undefined) return r;
            return { ...r, keys: r.keys.map((k) => { if (k.id !== keyId) return k; const nv = setComp(k.value, axis, v); hit = hit || comp(nv, axis ?? 0) !== comp(k.value, axis ?? 0); return { ...k, value: nv }; }) };
        }
        if (keyId !== undefined) return r;
        const nv = setComp(r.value, axis, v);
        hit = comp(nv, axis ?? 0) !== comp(r.value, axis ?? 0);
        return { ...r, value: nv };
    });
    return hit ? { ...schedule, [key]: next } : null;
}

/** The rule in words, for its card and a screen reader. */
export function describeRule(rule: DzScheduleRule, fmt: (v: DzScheduleValue) => string): string {
    if (rule.kind === 'switch') return `${fmt(rule.value)} from iteration ${int(rule.at)}${rule.until === null ? ' on' : `, base again at ${int(rule.until)}`}`;
    if (rule.kind === 'pattern') {
        const width = int(rule.width, 1), every = int(rule.every, 1);
        const which = width === 1 ? (every === 1 ? 'every iteration' : `every ${ordinal(every)} iteration`) : `${width} of every ${every} iterations`;
        return `${fmt(rule.value)} on ${which} from ${int(rule.start)}${rule.until === null ? '' : ` until ${int(rule.until)}`}`;
    }
    const keys = sortedKeys(rule.keys);
    if (!keys.length) return 'no keys';
    return keys.map((k) => `${fmt(k.value)} at ${k.at}`).join(', ');
}
const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
