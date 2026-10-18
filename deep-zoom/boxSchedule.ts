/**
 * deep-zoom/boxSchedule.ts - the Mandelbox's iteration schedule: rules that give a parameter another value at
 * chosen iterations, and what they compile to for the renderer. Pure: no store, no React, no renderer.
 *
 * WHAT IT IS
 *   A schedule changes Scale, Min Radius, Folding Limit, Fixed Radius, the Pre-Rotation's three angles or (in Julia
 *   mode) the Julia constant's three coordinates at some iterations of the orbit and leaves
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
 *   cx, cy, cz) for the
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

/** The parameters that can be scheduled: the store's key, the renderer's name, the label, and the group of the
 *  tool's tabs. The Julia constant's three apply in Julia mode only (outside it no constant is added). */
export const SCHEDULED_PARAMS = {
    boxScale: { field: 'scale', label: 'Scale', group: 'box' },
    boxMinRadius: { field: 'minR', label: 'Min Radius', group: 'box' },
    boxFold: { field: 'fold', label: 'Folding Limit', group: 'box' },
    boxFixedRadius: { field: 'fixedR', label: 'Fixed Radius', group: 'box' },
    boxRotX: { field: 'rx', label: 'X', group: 'rotation' },
    boxRotY: { field: 'ry', label: 'Y', group: 'rotation' },
    boxRotZ: { field: 'rz', label: 'Z', group: 'rotation' },
    juliaX: { field: 'cx', label: 'X', group: 'julia' },
    juliaY: { field: 'cy', label: 'Y', group: 'julia' },
    juliaZ: { field: 'cz', label: 'Z', group: 'julia' },
} as const;
export type DzScheduleGroup = (typeof SCHEDULED_PARAMS)[keyof typeof SCHEDULED_PARAMS]['group'];
export const SCHEDULE_GROUPS: Record<DzScheduleGroup, { label: string; row: string }> = {
    box: { label: 'Box', row: '' },
    rotation: { label: 'Pre-Rotation', row: 'boxRotation' },
    julia: { label: 'Julia constant', row: 'juliaConstant' },
};
/** The composed rows whose button opens a group (the row's key -> its first parameter). */
export const SCHEDULE_ROW_OPENS: Record<string, DzScheduledKey> = { boxRotation: 'boxRotX', juliaConstant: 'juliaX' };
export type DzScheduledKey = keyof typeof SCHEDULED_PARAMS;
export const SCHEDULED_KEYS = Object.keys(SCHEDULED_PARAMS) as DzScheduledKey[];
export const isScheduledKey = (key: string): key is DzScheduledKey => key in SCHEDULED_PARAMS;

/** The box's iteration ceiling (BOX_ITER_MAX in renderer/core.js): no orbit runs past it. */
export const SCHEDULE_ITERATIONS = 500;

export interface DzScheduleKey { at: number; value: number }
export type DzScheduleRule =
    | { kind: 'keys'; off?: boolean; keys: DzScheduleKey[] }
    | { kind: 'switch'; off?: boolean; at: number; until: number | null; value: number }
    | { kind: 'pattern'; off?: boolean; start: number; every: number; width: number; until: number | null; value: number };
export type DzScheduleRuleKind = DzScheduleRule['kind'];
/** The store's value: the rules of each scheduled parameter. An absent or empty list: that parameter is not scheduled. */
export type DzBoxSchedule = Partial<Record<DzScheduledKey, DzScheduleRule[]>>;
/** One entry of the renderer's table (`api.setBoxSchedule`). */
export type DzScheduleEntry = Partial<Record<(typeof SCHEDULED_PARAMS)[DzScheduledKey]['field'], number>> | null;

const int = (v: number, lo = 0): number => Math.max(lo, Math.min(SCHEDULE_ITERATIONS, Math.round(Number.isFinite(v) ? v : lo)));

/** The rule's value at iteration i, or undefined where it leaves the parameter alone. */
export function ruleValueAt(rule: DzScheduleRule, i: number): number | undefined {
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
        if (i < b.at) return b.at === a.at ? b.value : a.value + (b.value - a.value) * (i - a.at) / (b.at - a.at);
    }
    return keys[keys.length - 1].value;
}

/** The keys in order of iteration, each iteration a whole number (a later key at the same iteration wins). */
export function sortedKeys(keys: readonly DzScheduleKey[]): DzScheduleKey[] {
    return keys.map((k) => ({ at: int(k.at), value: k.value })).sort((a, b) => a.at - b.at);
}

/** The value a list of rules gives at iteration i: the last rule that touches i, else undefined (the base). */
export function scheduleValueAt(rules: readonly DzScheduleRule[] | undefined, i: number): number | undefined {
    let out: number | undefined;
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
            if (v !== undefined && Number.isFinite(v)) (entry ??= {})[SCHEDULED_PARAMS[key].field] = v;
        }
        table.push(entry);
        if (entry) last = i;
    }
    table.length = last + 1;
    return table.length ? table : null;
}

/** A new rule of a kind, its value(s) from the base and its iterations around `near` (the count in use). */
export function newRule(kind: DzScheduleRuleKind, base: number, near: number): DzScheduleRule {
    const at = Math.max(1, Math.round(near * 0.3));
    if (kind === 'switch') return { kind, at, until: null, value: base };
    if (kind === 'pattern') return { kind, start: 0, every: 2, width: 1, until: null, value: base };
    return { kind, keys: [{ at, value: base }, { at: Math.max(at + 1, Math.round(near * 0.7)), value: base }] };
}

/** The rule in words, for its card and a screen reader. */
export function describeRule(rule: DzScheduleRule, fmt: (v: number) => string): string {
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
