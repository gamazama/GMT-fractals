/**
 * deep-zoom/components/ScheduleTool.tsx - the Mandelbox's iteration schedule: the button on a row and the tool.
 *
 *   `dz-schedule-button`  a label suffix (panels.ts, `labelSuffixes`) on Scale, Min Radius, Folding Limit, Fixed
 *                         Radius, Pre-Rotation, Phase theta and phi and the Julia Constant. Lit while that row has a
 *                         rule in force. A click opens the tool on that row.
 *   `dz-schedule-tool`    the tool itself, a DraggableWindow: one tab a parameter, the graph of its value over the
 *                         iterations (the base dashed, the count in use marked), and its rules, each a card (keys,
 *                         switch, pattern; deep-zoom/boxSchedule.ts says what each does). The tabs come in three
 *                         groups: the box's four numbers, the Pre-Rotation, the bulb's phase and the Julia constant
 *                         (Julia mode only). Pre-Rotation and the Julia constant are ONE VEC3 each (the owner: "so they
 *                         can be keyed together"): a rule's value is (x, y, z), edited with the panel's own three-axis
 *                         control - one diamond keys its three tracks - and the graph draws three lines (x red, y green,
 *                         z blue). A widget at the foot of
 *                         the Formula tab, so ONE window serves the four buttons and keeps its place when another
 *                         row's button is pressed.
 *
 * THE SEAM: the rules are the store's (`dzFormula.boxSchedule`, features/formula.ts, THE ITERATION SCHEDULE); this
 * file only edits them, and the host compiles and sends them (host/looseParams.ts, THE SCHEDULE). Every edit is ONE
 * undo step: a click or a typed number is bracketed here (`beginParamTransaction`), a drag from its start to its
 * end. Which tab is open is not saved anywhere (`scheduleTool` below, a module value).
 *
 * THE VALUES ARE ANIMATABLE (deep-zoom/boxSchedule.ts): each rule's value, and each key's, carries the keyframe
 * diamond of its own track (ValueRow; the binder is registered below), and is auto-keyed while recording.
 *
 * PITFALLS
 *   - IT LIVES IN THE FORMULA TAB: the dock showing another tab unmounts it, and it closes. Escape closes it too
 *     (it holds nothing Escape could lose: every edit is already in the store).
 *   - The tool shows the groups of the formula drawn: the Mandelbox's (Box, Pre-Rotation, Julia constant) or the
 *     Mandelbulb's (Phase, Julia constant). KaliBox has no schedule; a switch to a formula a tab is not of closes it.
 *     The Mandelbulb's first schedule builds its renderer (the ray march's, about 15 s), the box's about 2 s.
 *   - The Julia constant's rules do nothing outside Julia mode; the tool says so, and keeps them.
 *   - A rule's value goes through the store's own hold for Scale (`validBoxScale`): the renderer cannot draw
 *     |scale| under 1.02.
 */
import React, { useMemo, useRef, useSyncExternalStore } from 'react';
import DraggableWindow from '../../components/DraggableWindow';
import Button from '../../components/Button';
import { BaseSlider } from '../../components/Slider';
import { KeyframeButton } from '../../components/KeyframeButton';
import { useTrackAnimation } from '../../hooks/useTrackAnimation';
import { binderRegistry } from '../../engine/animation/binderRegistry';
import { Icon } from '../../components/ui/Icon';
import { z } from '../../components/ui/zIndex';
import type { LabelSuffixProps } from '../../engine/PanelManifest';
import { useEngineStore } from '../../store/engineStore';
import { useDzTelemetry } from '../host/telemetry';
import { degreesMapping } from '../../components/inputs/primitives/FormatUtils';
import type { ValueMapping } from '../../components/inputs/primitives/FormatUtils';
import { DzFormulaFeature, FORMULA_BOX, FORMULA_BULB, validBoxScale } from '../features/formula';
import * as THREE from 'three';
import { Vector3Input } from '../../components/vector-input';
import type { BaseVectorInputProps } from '../../components/vector-input/types';
import {
    SCHEDULED_KEYS, SCHEDULED_PARAMS, SCHEDULE_GROUPS, SCHEDULE_ITERATIONS, VEC_AXES, comp, describeRule, isScheduled, isVecKey,
    isScheduledKey, newRule, scheduleValueAt, sortedKeys, SCHEDULE_TRACK_PREFIX, scheduleTrackId, parseScheduleTrackId,
    nextScheduleId, withScheduleIds, withScheduleValue,
} from '../boxSchedule';
import type { DzBoxSchedule, DzScheduleGroup, DzScheduleRule, DzScheduleRuleKind, DzScheduleValue, DzScheduledKey } from '../boxSchedule';

// ── which tab is open: a module value, not saved ────────────────────────────────────────────────────────────
let openKey: DzScheduledKey | null = null;
const listeners = new Set<() => void>();
const scheduleTool = {
    open(key: DzScheduledKey | null) { openKey = key; listeners.forEach((l) => l()); },
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    get: () => openKey,
};
const useOpenKey = (): DzScheduledKey | null => useSyncExternalStore(scheduleTool.subscribe, scheduleTool.get);

// ── the store: one undo step an edit ────────────────────────────────────────────────────────────────────────
const scheduleNow = (): DzBoxSchedule => useEngineStore.getState().dzFormula.boxSchedule ?? {};
function writeRules(key: DzScheduledKey, rules: DzScheduleRule[]): void {
    const next: DzBoxSchedule = { ...scheduleNow() };
    if (rules.length) next[key] = rules; else delete next[key];
    useEngineStore.getState().setDzFormula({ boxSchedule: withScheduleIds(next) });   // every rule and key keeps an id (THE VALUES ARE ANIMATABLE)
}

/* THE VALUES ARE ANIMATABLE (deep-zoom/boxSchedule.ts): one binder for every schedule track, registered when this module
   loads (registerFeatures.ts imports it before the store is built). A track writes its rule's value (one axis of a
   vec3's) into the store as playback or a scrub moves - not an undo step, as no track write is. A track whose rule
   is gone writes nothing. */
binderRegistry.registerPrefix({
    prefix: SCHEDULE_TRACK_PREFIX,
    write: (id, v) => {
        const t = parseScheduleTrackId(id);
        if (!t) return;
        const next = withScheduleValue(scheduleNow(), t.key, t.ruleId, t.keyId, t.axis === undefined ? domainOf(t.key).hold(v) : v, t.axis);
        if (next) useEngineStore.getState().setDzFormula({ boxSchedule: next });
    },
});
/** A discrete edit (a click, a typed number): one undo step of its own. */
function commit(key: DzScheduledKey, rules: DzScheduleRule[]): void {
    const s = useEngineStore.getState();
    s.beginParamTransaction();
    try { writeRules(key, rules); } finally { useEngineStore.getState().endParamTransaction(); }
}

type Dom = { min: number; max: number; step: number; hold: (v: number) => number; fmt: (v: DzScheduleValue) => string; mapping?: ValueMapping; mode?: string; scale?: string };
/** The param's range, step, display and the value a rule may hold: a vec3's from its composed row (Pre-Rotation in
 *  degrees, as the row shows it; the store holds radians). */
function domainOf(key: DzScheduledKey): Dom {
    const c = DzFormulaFeature.params[key] as { min: number; max: number; step: number; scale?: string; mode?: string };
    const hold = (v: number): number => (key === 'boxScale' ? validBoxScale(v) : v);
    const one = groupOf(key) === 'rotation' ? (v: number) => `${(v * 180 / Math.PI).toFixed(1)}°` : (v: number) => v.toFixed(Math.max(0, Math.ceil(-Math.log10(c.step))));
    const fmt = (v: DzScheduleValue): string => (typeof v === 'number' ? one(v) : `(${[0, 1, 2].map((j) => one(comp(v, j))).join(', ')})`);
    return { min: c.min, max: c.max, step: c.step, hold, fmt, mapping: groupOf(key) === 'rotation' && !isVecKey(key) ? degreesMapping : undefined, mode: c.mode, scale: c.scale };
}
const groupOf = (key: DzScheduledKey): DzScheduleGroup => SCHEDULED_PARAMS[key].group;
const keysOf = (group: DzScheduleGroup): DzScheduledKey[] => SCHEDULED_KEYS.filter((k) => groupOf(k) === group);
const titleOf = (key: DzScheduledKey): string => (groupOf(key) === 'phase' ? `Phase ${SCHEDULED_PARAMS[key].label}` : SCHEDULED_PARAMS[key].label);
/** The base (the row's own value): the slice's three scalars for a vec3. */
const baseOf = (key: DzScheduledKey, f: Record<string, unknown>): DzScheduleValue => {
    const p = SCHEDULED_PARAMS[key] as { baseFrom?: readonly string[] };
    return p.baseFrom ? p.baseFrom.map((k) => Number(f[k] ?? 0)) : Number(f[key] ?? 0);
};
/** The formula the store draws, as the groups name it: the box, the bulb, or neither (KaliBox has no schedule). */
const useScheduleFormula = (): 'box' | 'bulb' | null => useEngineStore((s) => (s.dzFormula.kind === FORMULA_BOX ? 'box' : s.dzFormula.kind === FORMULA_BULB ? 'bulb' : null));
const groupsOf = (f: 'box' | 'bulb'): DzScheduleGroup[] => (Object.keys(SCHEDULE_GROUPS) as DzScheduleGroup[]).filter((g) => SCHEDULE_GROUPS[g].formulas.includes(f));

// ── the button on a row ─────────────────────────────────────────────────────────────────────────────────────
export const ScheduleButton: React.FC<LabelSuffixProps> = ({ paramKey }) => {
    const key: DzScheduledKey | null = isScheduledKey(paramKey) ? paramKey : null;
    const on = useEngineStore((s) => !!key && isScheduled(s.dzFormula.boxSchedule?.[key]));
    const formula = useScheduleFormula();
    const open = useOpenKey();
    if (!key || !formula || !SCHEDULE_GROUPS[groupOf(key)].formulas.includes(formula)) return null;
    const mine = open === key, label = titleOf(key);
    return (
        <button type="button" data-dz-schedule-button={paramKey}
            // pointer-events-auto: a slider's label is `pointer-events: none` (it must not catch the track's drag)
            className={`pointer-events-auto inline-flex items-center align-middle ml-1 rounded-sm p-px ${on ? 'text-accent-300' : 'text-fg-faint hover:text-fg-secondary'} ${mine ? 'bg-accent-900/60' : ''}`}
            aria-pressed={mine}
            title={on ? `${label} is scheduled: other values at some iterations. Click to edit the schedule.` : `Give ${label} other values at chosen iterations (deeper detail comes from later iterations)`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); scheduleTool.open(mine ? null : key); }}>
            <Icon name="schedule" size={12} />
        </button>
    );
};

// ── the graph: one line, or three (x red, y green, z blue) for a vec3 ────────────────────────────────────────
const GW = 360, GH = 96;
const AXIS_LINE = ['text-red-400', 'text-green-400', 'text-blue-400'];
const Graph: React.FC<{ rules: DzScheduleRule[] | undefined; base: DzScheduleValue; n: number; inUse: number; fmt: (v: DzScheduleValue) => string }> = ({ rules, base, n, inUse, fmt }) => {
    const lines = typeof base === 'number' ? 1 : 3;
    const values = useMemo(() => Array.from({ length: n + 1 }, (_, i) => scheduleValueAt(rules, i) ?? base), [rules, base, n]);
    const all: number[] = []; for (const v of values) for (let j = 0; j < lines; j++) all.push(comp(v, j)); for (let j = 0; j < lines; j++) all.push(comp(base, j));
    const vLo = Math.min(...all), vHi = Math.max(...all), flat = vHi - vLo < 1e-9;
    let lo = flat ? vLo - 0.5 : vLo, hi = flat ? vHi + 0.5 : vHi;
    const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
    const x = (i: number) => (i / n) * GW, y = (v: number) => GH - ((v - lo) / (hi - lo)) * GH;
    const path = (j: number) => { let d = ''; values.forEach((v, i) => { d += `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(comp(v, j)).toFixed(1)}H${x(i + 1).toFixed(1)}`; }); return d; };
    return (
        <div data-dz-schedule-graph className="rounded border border-line/10 bg-surface-inset">
            <svg viewBox={`0 0 ${GW} ${GH}`} width="100%" height={GH} preserveAspectRatio="none" className="block">
                {Array.from({ length: lines }, (_, j) => (
                    <line key={`b${j}`} x1={0} x2={GW} y1={y(comp(base, j))} y2={y(comp(base, j))} stroke="currentColor" className={lines === 1 ? 'text-fg-faint' : `${AXIS_LINE[j]} opacity-40`} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                ))}
                {inUse > 0 && inUse <= n && <line x1={x(inUse)} x2={x(inUse)} y1={0} y2={GH} stroke="currentColor" className="text-warn/60" vectorEffect="non-scaling-stroke" />}
                {Array.from({ length: lines }, (_, j) => (
                    <path key={`v${j}`} d={path(j)} fill="none" stroke="currentColor" className={lines === 1 ? 'text-accent-300' : AXIS_LINE[j]} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                ))}
            </svg>
            <div className="flex justify-between px-1 pb-0.5 text-[9px] tabular-nums text-fg-faint">
                <span>iteration 0</span>
                <span>{lines === 1 && !flat ? `${fmt(vLo)} to ${fmt(vHi)} · ` : ''}base {fmt(base)}{inUse > 0 ? ` · in use ${inUse}` : ''}</span>
                <span>{n}</span>
            </div>
        </div>
    );
};

// ── one rule ────────────────────────────────────────────────────────────────────────────────────────────────
const KIND_LABEL: Record<DzScheduleRuleKind, string> = { keys: 'Keys', switch: 'Switch', pattern: 'Pattern' };

/** A rule's value: the slider with its keyframe diamond (the track of that rule or key), auto-keyed while recording. */
const ValueRow: React.FC<{ paramKey: DzScheduledKey; label: string; trackLabel: string; trackId: string | undefined; value: number; set: (v: number) => void; drag: { onDragStart: () => void; onDragEnd: () => void } }> =
    ({ paramKey, label, trackLabel, trackId, value, set, drag }) => {
    const dom = domainOf(paramKey);
    const k = useTrackAnimation(trackId, value, trackLabel);
    return (
        <BaseSlider label={label} value={value} min={dom.min} max={dom.max} step={dom.step} mapping={dom.mapping} mapTextInput={!!dom.mapping}
            headerRight={trackId ? <KeyframeButton status={k.status} label={trackLabel} onClick={k.setKey} onDeleteKey={k.deleteKey} onDeleteTrack={k.deleteTrack} /> : undefined}
            onDragStart={() => { drag.onDragStart(); k.autoKeyOnDragStart(); }} onDragEnd={drag.onDragEnd}
            onChange={(v) => { const h = dom.hold(v); set(h); k.autoKeyOnChange(h); }} />
    );
};
/** A vec3 rule's value: the panel's own three-axis control, whose one diamond keys the three tracks together and
 *  which brackets its own drag as one undo step (a typed number is one step here). */
const VecValueRow: React.FC<{ paramKey: DzScheduledKey; label: string; trackLabel: string; trackBase: ((axis: number) => string) | undefined; value: DzScheduleValue; set: (v: number[]) => void }> =
    ({ paramKey, label, trackLabel, trackBase, value, set }) => {
    const dom = domainOf(paramKey);
    return (
        <Vector3Input label={label} value={new THREE.Vector3(comp(value, 0), comp(value, 1), comp(value, 2))} min={dom.min} max={dom.max} step={dom.step}
            mode={dom.mode as BaseVectorInputProps['mode']} scale={dom.scale as BaseVectorInputProps['scale']}
            trackKeys={trackBase ? [0, 1, 2].map(trackBase) : undefined} trackLabels={VEC_AXES.map((a) => `${trackLabel} ${a.toUpperCase()}`)}
            onChange={(v) => set([v.x, v.y, v.z])} />
    );
};

const RuleCard: React.FC<{ paramKey: DzScheduledKey; index: number; rules: DzScheduleRule[]; n: number }> = ({ paramKey, index, rules, n }) => {
    const rule = rules[index], dom = domainOf(paramKey), vec = isVecKey(paramKey);
    const dragging = useRef(false);
    /** Replace this rule; a drag writes as it goes and is one undo step from its start to its end (the vec3 control's
     *  drag is bracketed by the control itself: isUserInteracting) */
    const put = (next: DzScheduleRule) => {
        const all = rules.map((r, i) => (i === index ? next : r));
        if (dragging.current || useEngineStore.getState().isUserInteracting) writeRules(paramKey, all); else commit(paramKey, all);
    };
    const drag = {
        onDragStart: () => { dragging.current = true; useEngineStore.getState().beginParamTransaction(); },
        onDragEnd: () => { dragging.current = false; useEngineStore.getState().endParamTransaction(); },
    };
    const iterMax = Math.max(n, 20);
    const iter = (label: string, value: number, set: (v: number) => void) => (
        <BaseSlider label={label} value={value} min={0} max={iterMax} step={1} hardMin={0} hardMax={SCHEDULE_ITERATIONS} {...drag}
            onChange={(v) => set(Math.round(v))} />
    );
    const ruleName = `${titleOf(paramKey)} · ${KIND_LABEL[rule.kind]} ${index + 1}`;
    const val = (label: string, value: DzScheduleValue, set: (v: DzScheduleValue) => void, keyId?: number, keyAt?: number) => {
        const trackLabel = keyAt === undefined ? ruleName : `${ruleName}, key at ${keyAt}`;
        if (vec) return <VecValueRow paramKey={paramKey} label={label} value={value} set={set} trackLabel={trackLabel}
            trackBase={rule.id === undefined ? undefined : (axis) => scheduleTrackId(paramKey, rule.id!, keyId, axis)} />;
        return <ValueRow paramKey={paramKey} label={label} value={comp(value, 0)} set={set} drag={drag}
            trackId={rule.id === undefined ? undefined : scheduleTrackId(paramKey, rule.id, keyId)} trackLabel={trackLabel} />;
    };
    const ends = (until: number | null, from: number, set: (u: number | null) => void) => (
        <div className="space-y-1">
            <label className="flex items-center gap-1.5 t-label cursor-pointer">
                <input type="checkbox" checked={until !== null} onChange={(e) => set(e.target.checked ? Math.min(SCHEDULE_ITERATIONS, from + 10) : null)} />
                Back to the base at an iteration
            </label>
            {until !== null && iter('Base again at', until, (v) => set(Math.max(v, from + 1)))}
        </div>
    );
    return (
        <div data-dz-schedule-rule={rule.kind} className={`rounded border border-line/10 p-1.5 space-y-1.5 ${rule.off ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-1.5">
                <input type="checkbox" checked={!rule.off} title="In force" onChange={(e) => put({ ...rule, off: !e.target.checked })} />
                <span className="t-label text-fg-secondary">{KIND_LABEL[rule.kind]}</span>
                <span className="flex-1 min-w-0 truncate text-fg-faint" title={describeRule(rule, dom.fmt)}>{describeRule(rule, dom.fmt)}</span>
                <button type="button" className="text-fg-faint hover:text-danger p-px" title="Remove this rule"
                    onClick={() => commit(paramKey, rules.filter((_, i) => i !== index))}><Icon name="trash" size={12} /></button>
            </div>
            {rule.kind === 'switch' && <>
                {iter('From iteration', rule.at, (v) => put({ ...rule, at: v, until: rule.until === null ? null : Math.max(rule.until, v + 1) }))}
                {val('Value', rule.value, (v) => put({ ...rule, value: v }))}
                {ends(rule.until, rule.at, (u) => put({ ...rule, until: u }))}
            </>}
            {rule.kind === 'pattern' && <>
                {iter('From iteration', rule.start, (v) => put({ ...rule, start: v }))}
                {iter('Every', rule.every, (v) => put({ ...rule, every: Math.max(1, v), width: Math.min(rule.width, Math.max(1, v)) }))}
                {iter('In a row', rule.width, (v) => put({ ...rule, width: Math.max(1, Math.min(v, rule.every)) }))}
                {val('Value', rule.value, (v) => put({ ...rule, value: v }))}
                {ends(rule.until, rule.start, (u) => put({ ...rule, until: u }))}
            </>}
            {rule.kind === 'keys' && <>
                {sortedKeys(rule.keys).map((k, ki, all) => (
                    <div key={ki} data-dz-schedule-key className={vec ? 'space-y-1' : 'flex items-end gap-1'}>
                        <div className={vec ? 'flex items-end gap-1' : 'w-[42%]'}>
                            <div className="flex-1">{iter(`Key ${ki + 1} at`, k.at, (v) => put({ ...rule, keys: all.map((o, j) => (j === ki ? { ...o, at: v } : o)) }))}</div>
                            {vec && <button type="button" className="text-fg-faint hover:text-danger p-px mb-1" title="Remove this key" disabled={all.length < 2}
                                onClick={() => put({ ...rule, keys: all.filter((_, j) => j !== ki) })}><Icon name="close" size={10} /></button>}
                        </div>
                        <div className="flex-1">{val('Value', k.value, (v) => put({ ...rule, keys: all.map((o, j) => (j === ki ? { ...o, value: v } : o)) }), k.id, k.at)}</div>
                        {!vec && <button type="button" className="text-fg-faint hover:text-danger p-px mb-1" title="Remove this key" disabled={all.length < 2}
                            onClick={() => put({ ...rule, keys: all.filter((_, j) => j !== ki) })}><Icon name="close" size={10} /></button>}
                    </div>
                ))}
                <Button size="small" label="Add key" icon={<Icon name="plus" size={10} />} onClick={() => {
                    const all = sortedKeys(rule.keys), last = all[all.length - 1];
                    put({ ...rule, keys: [...all, { at: Math.min(SCHEDULE_ITERATIONS, (last?.at ?? 0) + 10), value: last?.value ?? 0, id: nextScheduleId(scheduleNow()) }] });
                }} />
                <div className="text-fg-faint">The base before the first key; the last key's value from it on. Straight lines between keys.</div>
            </>}
        </div>
    );
};

// ── the tool ────────────────────────────────────────────────────────────────────────────────────────────────
export const ScheduleTool: React.FC = () => {
    const key = useOpenKey();
    const formula = useScheduleFormula();
    const juliaMode = useEngineStore((s) => s.dzFormula.juliaMode);
    const schedule = useEngineStore((s) => s.dzFormula.boxSchedule);
    const baseText = useEngineStore((s) => (key ? JSON.stringify(baseOf(key, s.dzFormula as unknown as Record<string, unknown>)) : '0'));   // a vec3's base as text: one stable value for the selector
    const base = useMemo<DzScheduleValue>(() => JSON.parse(baseText), [baseText]);
    const inUse = useDzTelemetry((t) => t.iters);
    if (!key || !formula || !SCHEDULE_GROUPS[groupOf(key)].formulas.includes(formula)) return null;
    const rules = schedule?.[key] ?? [], dom = domainOf(key), label = titleOf(key), group = groupOf(key);
    // The graph's reach: past the last iteration a rule names and the count in use, at least 20.
    let reach = Math.max(20, inUse + 4);
    for (const r of rules) {
        if (r.kind === 'switch') reach = Math.max(reach, r.at + 8, (r.until ?? 0) + 8);
        else if (r.kind === 'pattern') reach = Math.max(reach, r.start + 3 * r.every, (r.until ?? 0) + 8);
        else for (const k of r.keys) reach = Math.max(reach, k.at + 8);
    }
    const n = Math.min(SCHEDULE_ITERATIONS, reach);
    const add = (kind: DzScheduleRuleKind) => commit(key, [...rules, newRule(kind, base, inUse || 40, nextScheduleId(schedule))]);
    return (
        <DraggableWindow title={`Iteration schedule: ${label}`} onClose={() => scheduleTool.open(null)} dismissOnEscape
            initialPos={{ x: 340, y: 72 }} zIndex={z('tool')} initialSize={{ width: 400, height: Math.max(380, Math.min(720, window.innerHeight - 110)) }}>
            <div data-dz-schedule-tool={key} className="flex flex-col h-full text-[10px] text-fg-tertiary">
                {/* the groups, then (where a group has more than one) its parameters; a dot on whatever holds a rule */}
                <div className="flex gap-1 px-2 pt-2">
                    {groupsOf(formula).map((g) => (
                        <Button key={g} size="small" active={g === group} data-dz-schedule-group={g} onClick={() => scheduleTool.open(keysOf(g)[0])}
                            label={`${SCHEDULE_GROUPS[g].label}${keysOf(g).some((k) => isScheduled(schedule?.[k])) ? ' •' : ''}`} />
                    ))}
                </div>
                {keysOf(group).length > 1 && (
                    <div className="flex gap-1 px-2 pt-1 pb-1">
                        {keysOf(group).map((k) => (
                            <Button key={k} size="small" active={k === key} data-dz-schedule-tab={k} onClick={() => scheduleTool.open(k)}
                                label={`${SCHEDULED_PARAMS[k].label}${isScheduled(schedule?.[k]) ? ' •' : ''}`} />
                        ))}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scroll px-2 pb-2 pt-1 space-y-2">
                    {group === 'julia' && !juliaMode && (
                        <div data-dz-schedule-julia-off className="text-warn">Julia mode is off: no constant is added, so these rules do nothing until it is on. They are kept.</div>
                    )}
                    <Graph rules={rules} base={base} n={n} inUse={inUse} fmt={dom.fmt} />
                    {rules.length === 0 && (
                        <div className="text-fg-faint">
                            No rules: {label} is {dom.fmt(base)} (the row) at every iteration. Add a rule to give it other values at chosen
                            iterations. Later iterations shape deeper detail (about three iterations a decade of zoom), so the picture
                            changes from the depth a rule starts at and stays as it was above it.
                        </div>
                    )}
                    {rules.map((_, i) => <RuleCard key={i} paramKey={key} index={i} rules={rules} n={n} />)}
                    <div className="flex items-center gap-1 pt-0.5">
                        <span className="t-label mr-1">Add</span>
                        <Button size="small" label="Keys" data-dz-schedule-add="keys" title="Values at chosen iterations, with straight lines between" onClick={() => add('keys')} />
                        <Button size="small" label="Switch" data-dz-schedule-add="switch" title="One value from an iteration on (and back to the base at another, if you like)" onClick={() => add('switch')} />
                        <Button size="small" label="Pattern" data-dz-schedule-add="pattern" title="One value on a repeating set of iterations: every 2nd, 2 on 2 off, ..." onClick={() => add('pattern')} />
                        <span className="flex-1" />
                        {rules.length > 0 && <Button size="small" variant="danger" label="Clear" title={`Remove every rule of ${label}`} onClick={() => commit(key, [])} />}
                    </div>
                    <div className="text-fg-faint border-t border-line/10 pt-1.5">
                        Later rules win where they overlap. A schedule moves the surface below the depth it starts at, so a place
                        saved without it may show empty space; a place saved with it keeps it. The first schedule builds its renderer, a few seconds.
                    </div>
                </div>
            </div>
        </DraggableWindow>
    );
};
