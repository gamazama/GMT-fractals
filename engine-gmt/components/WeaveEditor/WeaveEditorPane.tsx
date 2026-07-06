/**
 * WeaveEditorPane — the user-facing weaver (ADR-0089 P3/P4.3): author an N-slot
 * mode-0 weave over the MB3D formula library AND registered native / imported
 * formulas (native slots resolve through engine/weave/nativeResolver — P4.1),
 * see the iteration schedule live (LoopStrip), build → preview through the
 * fused-hybrid pipeline, keep editing.
 *
 * Slot sources (P4.3): the "+ Add formula" picker lists MB3D catalog entries +
 * registered native formulas + imported frag/DEC (nativeSlotCatalog). Formulas
 * the resolver can't weave (self-contained / modular) are GREYED with a hover
 * reason, never hidden. Native params auto-expose (no per-option bake UI). The
 * raw 438-thumbnail catalog is deferred (import via Workshop first); adopting
 * the full thumbnail FormulaPicker here is a P4-follow-up.
 *
 * Host-agnostic on purpose: pure props + module-scoped draft (the Workshop
 * pattern — survives modal close/reopen within a session). First mounted as a
 * tab in the Import Mandelbulb3D modal; panel promotion is a re-mount (P4).
 *
 * Design decisions (session doc, user-confirmed 2026-07-04):
 *  - Rebuilds preserve the current camera / lights / look (loadUserWeave).
 *  - Rows keep a STABLE color (colorIdx) so reordering doesn't repaint the strip.
 *  - "Repeat from here" (↻ per row) = MB3D's repeatFrom: earlier slots run once
 *    as an intro, the loop repeats from the marked slot.
 *  - Reorder is a drag handle (pointer-based, list-local — no native drag image).
 *  - Structure edits have editor-local undo/redo, separate from DDFS param undo.
 *  - Reordering while keyframed formula-param tracks exist shows a warning
 *    (packed lanes may retarget) — a transfer tool comes later.
 *  - Schedule kinds are a user choice: counts ("Sequence", baked LUT — structure
 *    edits rebuild) vs layered modulo ("Rhythm", up to 6 active slots: the first is
 *    the base, each further slot is an independent rhythm layer with its own
 *    interval / start / beats-cap on the DDFS `weave` feature — LIVE +
 *    keyframable, no rebuild; formula changes still rebuild. Layers are checked
 *    top to bottom, first beat wins — the ADR-0089 arbitration rule. A dense
 *    capped layer doubles as a sequence-style intro). Slot counts don't drive
 *    Rhythm; they only mark which slots are active, so the steppers dim.
 *  - weaveSource rides on the built def so the weave reopens for re-editing;
 *    imported MB3D scenes carry one too, so any loaded weave can be opened here.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CategoryPickerMenu } from '../../../components/CategoryPickerMenu';
import type { PickerCategory, PickerItem } from '../../../components/CategoryPickerMenu';
import { showToast } from '../../../engine/store/toastStore';
import { useEngineStore } from '../../../store/engineStore';
import { registry } from '../../engine/FractalRegistry';
import { buildBlockPlan } from '../../engine/weave/schedule';
import { BOUNDS, fitRhythmFromPlan, runsFromRhythm, rhythmPhase, planPhase, rhythmPreviewPlan, certify, planStructure, rhythmStructure } from '../../engine/weave/convert';
import { getMB3DCatalog, slotFromCatalogEntry } from '../../utils/mb3d/mb3dCatalog';
import type { CatalogEntry } from '../../utils/mb3d/mb3dCatalog';
import { loadUserWeave } from '../../utils/mb3d/loadMB3DScene';
import { transpileSlot, getSlotOptionMeta } from '../../utils/mb3d/slotTranspiler';
import type { SlotOptionMeta } from '../../utils/mb3d/slotTranspiler';
import { getNativeSlotCatalog, nativeSlotShell, nativeSlotReject, isNativeSlot } from '../../engine/weave/nativeSlotCatalog';
import { FOLD_OPTIONS } from '../../features/geometry/folds';
import { boxFoldFormulaId } from '../../formulas/boxFolds';
import { LaneAllocator } from '../../utils/uniformSlots';
import type { MB3DFormulaSlot } from '../../utils/mb3d/parseMB3D';
import type { FractalDefinition } from '../../types/fractal';
import Slider from '../../../components/Slider';
import { UndoIcon, RedoIcon, CloseIcon, DragHandleIcon, ResetIcon, PlusIcon } from '../../../components/Icons';
import { CaretRight, ChevronDown } from '../../../components/Icons2';
import { SectionLabel } from '../../../components/SectionLabel';
import { Stepper } from '../../../components/Stepper';
import { GenericToggleSwitch } from '../../../components/GenericToggleSwitch';
import { CompileBar } from '../../../components/CompileBar';
import { LoopStrip, SLOT_COLORS } from './LoopStrip';

type WeaveSource = NonNullable<FractalDefinition['weaveSource']>;

interface SlotRow {
    key: string;
    label: string;
    kind: 'intern' | 'decompiled' | 'native';
    ref: string | number;
    /** Stable color identity — survives reorder (user feedback 2026-07-04). */
    colorIdx: number;
    slot: MB3DFormulaSlot;
    /** Per-option expose/bake directives (true = baked literal, no slider lane),
     *  indexed by option index. Absent entries = auto-expose. */
    bake?: boolean[];
}

/** A LOOP DIVIDER (P4.7): the block of rows ending at `afterKey` (back to the
 *  previous divider, or the top) plays `repeat` times as intro; the rows after
 *  the LAST divider are the repeating cycle. Keyed by row so it survives reorder.
 *  A single divider with repeat 1 is exactly the old "repeat from here". */
interface WeaveDivider { afterKey: string; repeat: number; }

interface WeaveDraft {
    title: string;
    rows: SlotRow[];
    /** Loop dividers (Sequence mode). */
    dividers: WeaveDivider[];
    /** User's schedule choice. 'modulo' (Rhythm) only takes effect while 1–6 rows
     *  are active — otherwise the build falls back to counts (Sequence). */
    scheduleKind: 'counts' | 'modulo';
    /** Rhythm base row KEY (the tail formula left running when no layer fires) —
     *  an explicit ROLE, decoupled from row order (spec §7). Absent ⇒ first active
     *  row. Survives reorder like dividers. */
    baseKey?: string;
}

// Module-scoped draft — survives modal close/reopen within a session (the
// Workshop draft pattern; cleared on page reload). Used by the MODAL variant
// (an import-in-progress, decoupled from the loaded scene).
let weaveDraft: WeaveDraft | null = null;
// The PANEL variant (Formula-panel Weave section) instead mirrors the currently
// loaded formula: this per-formula cache preserves an in-progress edit across a
// collapse/expand of the SAME formula, while switching formulas/scenes shows the
// new formula's weave (a migrated hybrid like Bristorbrot shows its BoxFold
// weave). Keyed by formula id; session-scoped (cleared on reload).
const panelDraftCache = new Map<string, WeaveDraft>();
let rowSeq = 0;
const rowKey = () => `wrow${rowSeq++}`;

const cloneRows = (rows: SlotRow[]): SlotRow[] =>
    rows.map((r) => ({
        ...r,
        slot: { ...r.slot, optionTypes: [...r.slot.optionTypes], optionValues: [...r.slot.optionValues] },
        bake: r.bake ? [...r.bake] : undefined,
    }));
const cloneDraft = (d: WeaveDraft): WeaveDraft => ({
    title: d.title, rows: cloneRows(d.rows),
    dividers: (d.dividers ?? []).map((x) => ({ ...x })),
    scheduleKind: d.scheduleKind ?? 'counts',
    baseKey: d.baseKey,
});

const nextColorIdx = (rows: SlotRow[]): number => {
    const used = new Set(rows.map((r) => r.colorIdx));
    let ci = 0;
    while (used.has(ci)) ci++;
    return ci;
};

/** Options whose type can only be baked get a pre-set bake directive, so the rest
 *  of the slot's options can still expose (without directives one unmappable type
 *  makes bindOptions bail and the WHOLE slot bakes). */
function defaultBake(slot: MB3DFormulaSlot): boolean[] | undefined {
    const bake: boolean[] = [];
    let any = false;
    for (const m of getSlotOptionMeta(slot)) {
        if (m.exposable) continue;
        any = true;
        for (let j = 0; j < m.span; j++) bake[m.index + j] = true;
    }
    return any ? bake : undefined;
}

/** Hydrate a draft from a weave formula's persisted source. */
function draftFromWeaveSource(ws: WeaveSource): WeaveDraft {
    const rows: SlotRow[] = ws.slots.map((s, i) => ({
        key: rowKey(),
        label: s.label,
        kind: s.kind,
        ref: s.ref,
        colorIdx: i,
        slot: { ...s.slot, optionTypes: [...s.slot.optionTypes], optionValues: [...s.slot.optionValues] },
        bake: s.bake ? [...s.bake] : undefined,
    }));
    // Counts → hydrate loop dividers from `breaks`, else synthesize one from
    // repeatFrom (a single divider after row repeatFrom−1, repeat 1).
    const dividers: WeaveDivider[] = [];
    if (ws.schedule.kind === 'counts') {
        const breaks = ws.schedule.breaks;
        if (breaks?.length) {
            for (const b of breaks) if (rows[b.afterRow]) dividers.push({ afterKey: rows[b.afterRow].key, repeat: Math.max(1, b.repeat) });
        } else {
            const rf = ws.schedule.repeatFrom ?? 0;
            if (rf > 0 && rows[rf - 1]) dividers.push({ afterKey: rows[rf - 1].key, repeat: 1 });
        }
    }
    const baseKey = ws.schedule.kind === 'modulo' && ws.schedule.baseRow !== undefined
        ? rows[ws.schedule.baseRow]?.key : undefined;
    return { title: ws.title, rows, dividers, scheduleKind: ws.schedule.kind, baseKey };
}

const DEFAULT_ITER_COUNT = 2;

/** Build slot 0 from a registered formula id — used to seed a fresh weave from
 *  the scene's current formula (the Formula-panel section's "+ Add formula"
 *  entry). Returns null for formulas the resolver can't weave. */
function seedRowFromFormula(id: string): SlotRow | null {
    const def = registry.get(id) as FractalDefinition | undefined;
    if (!def || nativeSlotReject(def)) return null;
    return {
        key: rowKey(), label: def.name ?? id, kind: 'native', ref: id, colorIdx: 0,
        slot: nativeSlotShell(id, DEFAULT_ITER_COUNT),
    };
}

export interface WeaveEditorPaneProps {
    /** 'modal' (default) keeps the full editor chrome; 'panel' trims the intro
     *  prose for the Formula-panel Weave section (ADR-0089 P4.7). */
    variant?: 'modal' | 'panel';
    /** When starting fresh (no module draft, active formula isn't a weave),
     *  pre-seed slot 0 with this formula id so the user weaves their current
     *  formula with others. Ignored if it can't weave. */
    seedFormulaId?: string;
}

/** Float input that commits on blur/Enter (keeps partial typing like "1." alive
 *  and gives one editor-undo step per edit, not per keystroke). */
function OptValInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
    const [text, setText] = useState<string | null>(null);
    return (
        <input
            value={text ?? String(value)}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
                if (text !== null) {
                    const n = parseFloat(text);
                    if (isFinite(n) && n !== value) onCommit(n);
                    setText(null);
                }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
            className="w-14 text-center rounded bg-surface-sunken border border-line/10 py-0.5 text-[11px] text-fg outline-none focus:border-accent-500/40"
        />
    );
}

/** Auto-name a weave from its active formulas ("ABox × Menger 3 × Koch"),
 *  shortened to fit. Used whenever the user leaves the name field empty. */
function autoTitleOf(rows: SlotRow[]): string {
    const short = (l: string) => l.replace(/\s*\(.*?\)\s*/g, ' ').replace(/^_/, '').trim();
    const act = rows.filter((r) => r.slot.iterCount > 0).map((r) => short(r.label));
    if (act.length === 0) return 'My Weave';
    let t = act.join(' × ');
    if (t.length > 34) t = act.map((l) => l.split(/\s+/)[0]).join(' × ');
    if (t.length > 34) t = t.slice(0, 33) + '…';
    return t;
}

export function WeaveEditorPane({ variant = 'modal', seedFormulaId }: WeaveEditorPaneProps = {}) {
    const store = useEngineStore() as any;

    // The formula this pane instance hydrated for. WeaveSection keys the panel
    // pane by formula, so this is fixed for the instance's life — the correct
    // per-formula cache key on unmount (store.formula may already point at the
    // NEXT formula by the time this instance's cleanup runs).
    const mountedFormula = useRef<string>(store.formula);

    const [draft, setDraft] = useState<WeaveDraft>(() => {
        // Panel variant MIRRORS the current formula. A per-formula cache keeps an
        // in-progress edit across a collapse/expand of the SAME formula; a miss
        // hydrates from the formula's weaveSource (a weave, or a migrated hybrid
        // like Bristorbrot), else seeds the single formula. Ignores the modal's
        // `weaveDraft` on purpose — the panel tracks the scene, not an import.
        if (variant === 'panel') {
            const cached = panelDraftCache.get(store.formula);
            if (cached) return cloneDraft(cached);
            const ws = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
            if (ws) return draftFromWeaveSource(ws);
            if (seedFormulaId) {
                const seed = seedRowFromFormula(seedFormulaId);
                if (seed) return { title: '', rows: [seed], dividers: [], scheduleKind: 'counts' };
            }
            return { title: '', rows: [], dividers: [], scheduleKind: 'counts' };
        }
        // Modal variant: import-in-progress draft, decoupled from store.formula.
        if (weaveDraft && weaveDraft.rows.length > 0) return cloneDraft(weaveDraft);
        // Reopening a weave formula: hydrate from its persisted source.
        const ws = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
        if (ws) return draftFromWeaveSource(ws);
        // Fresh weave off a single formula: seed slot 0 with it, so the first
        // "+ Add formula" pick becomes slot 1 (weave-the-current-formula).
        if (seedFormulaId) {
            const seed = seedRowFromFormula(seedFormulaId);
            if (seed) return { title: '', rows: [seed], dividers: [], scheduleKind: 'counts' };
        }
        // Empty title = auto-name from the formula mix (autoTitleOf) until the
        // user types their own.
        return { title: '', rows: [], dividers: [], scheduleKind: 'counts' };
    });
    const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
    const [reorderWarn, setReorderWarn] = useState(false);
    const [picker, setPicker] = useState<{ x: number; y: number; right: number; replaceKey?: string } | null>(null);
    const [busy, setBusy] = useState(false);

    // Editor-local structure undo (separate from DDFS param undo by design).
    const past = useRef<WeaveDraft[]>([]);
    const future = useRef<WeaveDraft[]>([]);

    // Snapshot the draft on unmount: the panel caches per-formula (so a collapse/
    // expand of the same formula restores the edit, while switching formulas shows
    // the new one); the modal snapshots its single import draft.
    const liveRef = useRef(draft);
    liveRef.current = draft;
    useEffect(() => () => {
        if (variant === 'panel') panelDraftCache.set(mountedFormula.current, cloneDraft(liveRef.current));
        else weaveDraft = cloneDraft(liveRef.current);
    }, []);

    const commit = (next: WeaveDraft) => {
        past.current.push(cloneDraft(draft));
        if (past.current.length > 50) past.current.shift();
        future.current = [];
        setDraft(next);
    };
    const undo = () => {
        const prev = past.current.pop();
        if (!prev) return;
        future.current.push(cloneDraft(draft));
        setDraft(prev);
    };
    const redo = () => {
        const next = future.current.pop();
        if (!next) return;
        past.current.push(cloneDraft(draft));
        setDraft(next);
    };

    // ── Slot-source picker (CategoryPickerMenu) ──────────────────────────────
    // Two sources: the MB3D catalog (intern + decompiled slots) and REGISTERED
    // native / imported formulas (P4.3, engine-driven staging — the picker lists
    // what the resolver can weave; rejects are greyed, never hidden). Category
    // ids are prefixed so the two source namespaces never collide.
    // TODO(P4-follow-up): adopt the full thumbnail <FormulaPicker> here (native +
    // 438-catalog with previews + disabledIds greying) — v1 keeps the lightweight
    // menu for parity with today's editor (owner call 2026-07-04).
    const catalog = useMemo(() => getMB3DCatalog(), []);
    const nativeCatalog = useMemo(() => getNativeSlotCatalog(), []);
    const entryByKey = useMemo(() => {
        const m = new Map<string, CatalogEntry>();
        for (const g of catalog) for (const e of g.entries) m.set(`${e.kind}:${e.ref}`, e);
        return m;
    }, [catalog]);
    // MB3D groups get an "MB3D ·" prefix and native/imported groups a "GMT ·"
    // prefix, so the two source namespaces read as distinct provenances in the
    // category column (the id prefixes already keep them from colliding).
    const pickerCategories: PickerCategory[] = useMemo(
        () => [
            ...catalog.map((g) => ({ id: `mb3d:${g.category}`, name: `MB3D · ${g.category}` })),
            ...nativeCatalog.map((g) => ({ id: `nat:${g.category}`, name: `GMT · ${g.category}` })),
        ],
        [catalog, nativeCatalog],
    );
    const pickerItems = (catId: string): PickerItem[] => {
        if (catId.startsWith('nat:')) {
            const name = catId.slice(4);
            return (nativeCatalog.find((g) => g.category === name)?.entries ?? []).map((e) => ({
                key: `native:${e.id}`,
                label: e.label,
                disabled: !!e.disabledReason,
                disabledSuffix: e.disabledReason ? '— can’t weave' : undefined,
                description: e.disabledReason ?? e.label,
            }));
        }
        const name = catId.startsWith('mb3d:') ? catId.slice(5) : catId;
        return (catalog.find((g) => g.category === name)?.entries ?? []).map((e) => ({
            key: `${e.kind}:${e.ref}`,
            label: e.label,
        }));
    };

    const openPicker = (ev: React.MouseEvent, replaceKey?: string) => {
        const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
        setPicker({ x: rect.left, y: rect.bottom + 4, right: rect.right, replaceKey });
    };

    /** Build a fresh SlotRow (native or MB3D) for a picked key at the given color. */
    const rowFromKey = (key: string, colorIdx: number, iterCount: number): SlotRow | null => {
        if (key.startsWith('native:')) {
            const id = key.slice(7);
            const def = registry.get(id) as FractalDefinition | undefined;
            if (!def) return null;
            // Native params auto-expose (resolver-driven); no MB3D bake directives.
            return {
                key: rowKey(), label: def.name ?? id, kind: 'native', ref: id, colorIdx,
                slot: nativeSlotShell(id, iterCount),
            };
        }
        const entry = entryByKey.get(key);
        if (!entry) return null;
        const slot = slotFromCatalogEntry(entry, iterCount);
        return { key: rowKey(), label: entry.label, kind: entry.kind, ref: entry.ref, colorIdx, slot, bake: defaultBake(slot) };
    };

    const onPick = (key: string) => {
        setPicker(null);
        if (picker?.replaceKey) {
            const target = draft.rows.find((r) => r.key === picker.replaceKey);
            if (!target) return;
            const built = rowFromKey(key, target.colorIdx, target.slot.iterCount);
            if (!built) return;
            // Keep the original row key so reorder/undo identity is stable.
            commit({
                ...draft,
                rows: draft.rows.map((r) => (r.key === picker.replaceKey ? { ...built, key: r.key } : r)),
            });
        } else {
            const built = rowFromKey(key, nextColorIdx(draft.rows), DEFAULT_ITER_COUNT);
            if (!built) return;
            // Rhythm-layer timing defaults (start = k, every 1, 2 beats) come from the
            // weave feature's per-index param defaults — see engine-gmt/features/weave.ts.
            commit({ ...draft, rows: [...draft.rows, built] });
        }
    };

    // ── Hybrid Box presets (P4.7 item 3) ─────────────────────────────────────
    // The seven FOLD_LIST folds are registered BoxFold formulas (P4.5); this is
    // the curated, friendly entry into them — the classic Hybrid Box, now a
    // weave slot. Adds a configured BoxFold slot (its defaults + counts of 2).
    // FOLD_OPTIONS values are stable fold-type codes, not list positions.
    const [hbPicker, setHbPicker] = useState<{ x: number; y: number; right: number } | null>(null);
    const openHbPicker = (ev: React.MouseEvent) => {
        const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
        setHbPicker({ x: rect.left, y: rect.bottom + 4, right: rect.right });
    };
    const hbItems = (): PickerItem[] =>
        FOLD_OPTIONS.map((o) => ({
            key: `fold:${o.value}`,
            label: o.label,
            description: `Add the ${o.label} box fold as a weave slot`,
        }));
    const addFoldPreset = (key: string) => {
        setHbPicker(null);
        const foldType = parseInt(key.slice(5), 10); // 'fold:<code>'
        if (!Number.isFinite(foldType)) return;
        const foldId = boxFoldFormulaId(foldType);
        if (!foldId) return;
        const built = rowFromKey(`native:${foldId}`, nextColorIdx(draft.rows), DEFAULT_ITER_COUNT);
        if (!built) return;
        // Sequence mode: the fold is the classic pre-fold — put it in the FIRST slot
        // and drop a loop divider right after it, so the box block plays as intro and
        // the original formulas become the repeating cycle.
        if (draft.scheduleKind !== 'modulo') {
            commit({
                ...draft,
                rows: [built, ...draft.rows],
                dividers: [...draft.dividers.filter((d) => d.afterKey !== built.key), { afterKey: built.key, repeat: 1 }],
            });
            return;
        }
        const newRows = [...draft.rows, built];
        commit({ ...draft, rows: newRows });
        // The Hybrid Box fold runs from iteration 0 (the classic pre-fold): give the
        // new layer start 0, and if another layer already sits at 0 push every other
        // layer +1 so the fold owns iteration 0 alone.
        const active = newRows.map((r, i) => (r.slot.iterCount > 0 ? i : -1)).filter((i) => i >= 0);
        const bIdx = draft.baseKey ? newRows.findIndex((r) => r.key === draft.baseKey && r.slot.iterCount > 0) : -1;
        const base = bIdx >= 0 ? bIdx : active[0];
        const layers = active.filter((i) => i !== base);
        const boxPos = layers.indexOf(newRows.length - 1);
        if (boxPos < 0) return;
        const layerStarts = layers.map((_, p) => layerVal(p + 1).start); // read once (layerVal clamps per call)
        const collide = layerStarts.some((s, p) => p !== boxPos && s === 0);
        // Own iteration 0, every iteration, one beat — and write interval/beats
        // explicitly so a stale uniform at this layer index can't leak in (0,2,0 bug).
        const writes: Record<string, number> = {
            [`weaveStartIter${boxPos + 1}`]: 0,
            [`weaveInterval${boxPos + 1}`]: 1,
            [`weaveBeats${boxPos + 1}`]: 1,
        };
        if (collide) layerStarts.forEach((s, p) => { if (p !== boxPos) writes[`weaveStartIter${p + 1}`] = s + 1; });
        store.setWeave?.(writes);
    };

    // ── Row edits ─────────────────────────────────────────────────────────────
    const setIter = (key: string, iterCount: number) => {
        const n = Math.max(0, Math.min(64, Math.round(iterCount)));
        commit({ ...draft, rows: draft.rows.map((r) => (r.key === key ? { ...r, slot: { ...r.slot, iterCount: n } } : r)) });
    };
    const hasFormulaTracks = () =>
        (store.animations ?? []).some((a: any) => a.enabled && typeof a.target === 'string' && a.target.startsWith('coreMath.'));
    const remove = (key: string) => {
        if (hasFormulaTracks()) setReorderWarn(true);
        commit({
            ...draft,
            rows: draft.rows.filter((r) => r.key !== key),
            dividers: draft.dividers.filter((d) => d.afterKey !== key),
        });
    };
    // ── Loop dividers (P4.7) — the block ending at a row plays ×repeat as intro;
    // the rows after the last divider are the repeating cycle.
    const addDivider = (afterKey: string) =>
        commit({ ...draft, dividers: [...draft.dividers.filter((d) => d.afterKey !== afterKey), { afterKey, repeat: 1 }] });
    const removeDivider = (afterKey: string) =>
        commit({ ...draft, dividers: draft.dividers.filter((d) => d.afterKey !== afterKey) });
    const setDividerRepeat = (afterKey: string, repeat: number) =>
        commit({ ...draft, dividers: draft.dividers.map((d) => (d.afterKey === afterKey ? { ...d, repeat: Math.max(1, repeat) } : d)) });

    // ── Per-slot param customization (P3b Task 2) ────────────────────────────
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const setOptionValues = (key: string, index: number, vals: number[]) => {
        commit({
            ...draft,
            rows: draft.rows.map((r) => {
                if (r.key !== key) return r;
                const optionValues = [...r.slot.optionValues];
                vals.forEach((v, j) => { optionValues[index + j] = v; });
                return { ...r, slot: { ...r.slot, optionValues } };
            }),
        });
    };
    const toggleBake = (key: string, m: SlotOptionMeta) => {
        commit({
            ...draft,
            rows: draft.rows.map((r) => {
                if (r.key !== key) return r;
                const bake = r.bake ? [...r.bake] : [];
                const next = !bake[m.index];
                for (let j = 0; j < m.span; j++) bake[m.index + j] = next;
                return { ...r, bake };
            }),
        });
    };
    const rowDefaults = (r: SlotRow): number[] => {
        const e = entryByKey.get(`${r.kind}:${r.ref}`);
        return e ? slotFromCatalogEntry(e).optionValues : [...r.slot.optionValues];
    };

    // Live lane-budget meter: a pure dry-run through the same allocator the build
    // uses, recomputed when the draft changes. NATIVE rows use their own per-slot
    // BANKS (ADR-0090) — always live, never consuming the shared coreMath pool — so
    // the meter reports ONLY the MB3D dense pool (24 scalar lanes / 6 vec3 units).
    // A native-only weave has no pool to meter (every param is live).
    const meter = useMemo(() => {
        const active = draft.rows.filter((r) => r.slot.iterCount > 0);
        if (active.length === 0) return null;
        const mb3d = active.filter((r) => !isNativeSlot(r.slot));
        const natives = active.length - mb3d.length;
        try {
            // No MB3D slots: every active row is a native on its own bank → all live.
            if (mb3d.length === 0) return { allNative: natives };
            // A single MB3D slot owns the whole coreMath pool at fixed uParam* lanes.
            if (mb3d.length === 1) {
                const t = transpileSlot(mb3d[0].slot, 0, 'probe0', { parametric: true, bake: mb3d[0].bake });
                return { single: t.params?.length ?? 0, natives };
            }
            if (mb3d.some((r) => r.slot.formulaIndex === 2)) {
                return { note: '4D (Quaternion) hybrids bake parameters', natives };
            }
            const alloc = new LaneAllocator();
            let ok = true;
            mb3d.forEach((r, k) => {
                alloc.startSlot();
                if (transpileSlot(r.slot, k, `probe${k}`, { alloc, bake: r.bake }).paramOk === false) ok = false;
            });
            return { scalars: alloc.scalarsUsed, vec3s: alloc.vec3sUsed, fits: ok && alloc.fits(), natives };
        } catch {
            return null;
        }
    }, [draft.rows]);

    // ── Drag-handle reorder (pointer-based, list-local) ──────────────────────
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const [dragKey, setDragKey] = useState<string | null>(null);
    const dragBase = useRef<WeaveDraft | null>(null);

    const onHandleDown = (e: React.PointerEvent, key: string) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragBase.current = cloneDraft(draft);
        setDragKey(key);
    };
    const onHandleMove = (e: React.PointerEvent, key: string) => {
        if (dragKey !== key) return;
        const from = draft.rows.findIndex((r) => r.key === key);
        if (from < 0) return;
        let to = from;
        draft.rows.forEach((r, idx) => {
            if (idx === from) return;
            const el = rowRefs.current.get(r.key);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            if (e.clientY > rect.top && e.clientY < rect.bottom) to = idx;
        });
        if (to !== from) {
            const rows = [...draft.rows];
            const [moved] = rows.splice(from, 1);
            rows.splice(to, 0, moved);
            setDraft({ ...draft, rows }); // transient — committed once on release
        }
    };
    const onHandleUp = (_e: React.PointerEvent, key: string) => {
        if (dragKey !== key) return;
        setDragKey(null);
        const base = dragBase.current;
        dragBase.current = null;
        if (base && base.rows.map((r) => r.key).join() !== draft.rows.map((r) => r.key).join()) {
            // One undo step for the whole drag.
            past.current.push(base);
            if (past.current.length > 50) past.current.shift();
            future.current = [];
            if (hasFormulaTracks()) setReorderWarn(true);
        }
    };

    // ── Rhythm (layered modulo) schedule state — lives on the DDFS `weave`
    // feature so it is LIVE (uniform-driven, no rebuild) and keyframable. The
    // editor is just a view over store.weave; the DDFS auto-setter writes it.
    // Active rows in row order: [0] = base, [1..] = rhythm layers (layer k = position).
    const iterCounts = draft.rows.map((r) => r.slot.iterCount);
    const activeCount = iterCounts.filter((n) => n > 0).length;
    // Rhythm is selectable with a single active slot (base only, zero layers) so the
    // mode can be chosen before adding more formulas; the hard ceiling is 6 (MAX_ROWS).
    const rhythmOk = activeCount >= 1 && activeCount <= 6;
    const rhythm = draft.scheduleKind === 'modulo' && rhythmOk;
    const activeRowIdx = draft.rows.map((r, i) => (r.slot.iterCount > 0 ? i : -1)).filter((i) => i >= 0);
    // Rhythm base (spec §7): an explicit row (draft.baseKey), else the first active
    // row (back-compat). Layers = the OTHER active rows in row order; layer j (1-based)
    // ↔ uWeave*{j} ↔ layerRowIdx[j-1].
    const baseRowIdx = (() => {
        if (draft.baseKey) { const i = draft.rows.findIndex((r) => r.key === draft.baseKey); if (i >= 0 && draft.rows[i].slot.iterCount > 0) return i; }
        return activeRowIdx[0] ?? -1;
    })();
    const layerRowIdx = activeRowIdx.filter((i) => i !== baseRowIdx);
    const clampI = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n) || 0));
    // Read-clamps import BOUNDS (convert.ts) — a fitter honouring different bounds
    // than the clamp would silently corrupt one conversion direction (spec §5.2).
    // The `?? interval 1 / start k / beats 2` fallbacks mirror the weave feature's
    // per-index param defaults (engine-gmt/features/weave.ts) — keep them in sync.
    const layerVal = (k: number) => ({
        interval: Math.max(1, clampI(store.weave?.[`weaveInterval${k}`] ?? 1, 1, BOUNDS.INTERVAL_MAX)),
        start: clampI(store.weave?.[`weaveStartIter${k}`] ?? k, 0, BOUNDS.START_MAX),
        beats: clampI(store.weave?.[`weaveBeats${k}`] ?? 2, 0, BOUNDS.BEATS_MAX),
    });
    const setLayerVal = (k: number, field: 'weaveInterval' | 'weaveStartIter' | 'weaveBeats', n: number) =>
        store.setWeave?.({ [`${field}${k}`]:
            field === 'weaveInterval' ? Math.max(1, clampI(n, 1, BOUNDS.INTERVAL_MAX))
            : field === 'weaveBeats' ? clampI(n, 0, BOUNDS.BEATS_MAX)
            : clampI(n, 0, BOUNDS.START_MAX) });

    // ── Live schedule preview ────────────────────────────────────────────────
    // Loop dividers → { afterRow index, repeat }, in row order, for buildBlockPlan
    // + the emit. A divider on a since-removed row is dropped.
    const dividerRows = useMemo(
        () => draft.dividers
            .map((d) => ({ afterRow: draft.rows.findIndex((r) => r.key === d.afterKey), repeat: d.repeat }))
            .filter((d) => d.afterRow >= 0)
            .sort((a, b) => a.afterRow - b.afterRow),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [draft.dividers, draft.rows.map((r) => r.key).join(',')],
    );
    // repeatFrom (the nibble + weaveSource back-compat) = start of the cycle =
    // the last divider's row + 1.
    const repeatIdx = dividerRows.length ? dividerRows[dividerRows.length - 1].afterRow + 1 : 0;
    const plan = useMemo(() => {
        if (activeCount === 0) return null;
        return buildBlockPlan({ iterCounts: draft.rows.map((r) => r.slot.iterCount), dividers: dividerRows });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iterCounts.join(','), dividerRows, activeCount]);

    // Rhythm plan for the LoopStrip: mirror the layered phase fn in JS (pure — no
    // compile; recomputed per render, trivially cheap). Layers are checked in row
    // order, first beat wins; the base fills the rest. Beats caps make the layered
    // schedule non-periodic in general, so the strip shows the exact first
    // iterations (introLen = full length ⇒ no faded-repeat tail).
    const rhythmPlan = rhythm
        ? rhythmPreviewPlan(layerRowIdx.map((_, j) => layerVal(j + 1)), baseRowIdx, layerRowIdx, iterCounts)
        : null;

    // ── Sequence ↔ Rhythm conversion (pattern-preserving; engine/weave/convert.ts).
    // Both toggles convert the CURRENT LUT into the target mode's params EXACTLY, or
    // flip mode without writes + a one-line reason (never approximate). Idempotence
    // is checked first so an untouched round-trip is lossless. @see the logic spec.
    const hasRhythmTracks = () =>
        (store.animations ?? []).some((a: any) => a.enabled && typeof a.target === 'string'
            && /^weave\.weave(Interval|StartIter|Beats)\d/.test(a.target));
    const rowLabel = (i: number) => draft.rows[i]?.label ?? `slot ${i + 1}`;

    const makeBase = (key: string) => {
        // Overrule the elected base. Re-maps layer→uniform indices, so if rhythm
        // timing is keyframed, warn like a reorder (same retarget policy, spec §7.3).
        if (draft.baseKey === key) return;
        if (hasRhythmTracks()) setReorderWarn(true);
        commit({ ...draft, baseKey: key });
    };

    const toRhythm = () => {
        if (draft.scheduleKind === 'modulo') return;
        // No plan (0 active): the toggle just marks intent — build falls back to
        // Sequence until 1–6 slots are active. Nothing to convert yet.
        if (!plan || !rhythmOk) { commit({ ...draft, scheduleKind: 'modulo' }); return; }
        const curLayers = layerRowIdx.map((_, j) => layerVal(j + 1));
        if (certify(planPhase(plan), planStructure(plan), rhythmPhase(curLayers, baseRowIdx, layerRowIdx), rhythmStructure(curLayers)).equal) {
            commit({ ...draft, scheduleKind: 'modulo' });
            setStatus({ kind: 'ok', text: 'Rhythm — same pattern (kept your timing).' });
            return;
        }
        const res = fitRhythmFromPlan(plan, activeRowIdx, rowLabel);
        if (!res.ok) {
            commit({ ...draft, scheduleKind: 'modulo' });
            setStatus({ kind: 'error', text: `Switched to Rhythm — kept your existing timing. ${res.reason}` });
            return;
        }
        // Layer values are in the elected base's NON-base row order → uWeave*{m+1}.
        const writes: Record<string, number> = {};
        res.layers.forEach((L, m) => {
            const k = m + 1;
            writes[`weaveInterval${k}`] = L.interval;
            writes[`weaveStartIter${k}`] = L.start;
            writes[`weaveBeats${k}`] = L.beats; // write beats even when 0 — stale beats corrupt the pattern
        });
        const warned = hasRhythmTracks();
        store.setWeave?.(writes);                                                            // rhythm params → DDFS undo home
        commit({ ...draft, scheduleKind: 'modulo', baseKey: draft.rows[res.baseRow]?.key }); // one editor commit
        const baseNote = res.baseRow !== activeRowIdx[0] ? ` "${rowLabel(res.baseRow)}" is the base.` : '';
        setStatus({ kind: 'ok', text: `Converted to Rhythm — same pattern, now live.${baseNote}${warned ? ' (Overwrote keyframed rhythm timing.)' : ''}` });
    };

    const toSequence = () => {
        if (draft.scheduleKind === 'counts') return;
        if (!rhythmOk) { commit({ ...draft, scheduleKind: 'counts' }); return; }
        const layers = layerRowIdx.map((_, j) => layerVal(j + 1));
        if (plan && certify(rhythmPhase(layers, baseRowIdx, layerRowIdx), rhythmStructure(layers), planPhase(plan), planStructure(plan)).equal) {
            commit({ ...draft, scheduleKind: 'counts' });
            setStatus({ kind: 'ok', text: 'Sequence — same pattern (kept your rows).' });
            return;
        }
        const res = runsFromRhythm(layers, baseRowIdx, layerRowIdx, rowLabel);
        if (!res.ok) {
            commit({ ...draft, scheduleKind: 'counts' });
            setStatus({ kind: 'error', text: `Switched to Sequence — kept your existing rows. ${res.reason}` });
            return;
        }
        // Materialize runs → rows (reuse a row on first use, deep-clone after) + one
        // intro divider; iterCount = run length. Rows land in LUT order, so the base
        // clears — Sequence has no base (spec §7.4).
        const runs = [...res.introRuns, ...res.cycleRuns];
        const used = new Set<number>();
        const newRows: SlotRow[] = [];
        for (const run of runs) {
            const src = draft.rows[run.rowIdx];
            const first = !used.has(run.rowIdx);
            used.add(run.rowIdx);
            newRows.push({
                ...src,
                key: first ? src.key : rowKey(),
                colorIdx: first ? src.colorIdx : nextColorIdx(newRows),
                slot: { ...src.slot, optionTypes: [...src.slot.optionTypes], optionValues: [...src.slot.optionValues], iterCount: run.count },
                bake: src.bake ? [...src.bake] : undefined,
            });
        }
        const dividers: WeaveDivider[] = res.introRuns.length
            ? [{ afterKey: newRows[res.introRuns.length - 1].key, repeat: 1 }]
            : [];
        const warned = hasRhythmTracks();
        commit({ ...draft, rows: newRows, dividers, scheduleKind: 'counts', baseKey: undefined });
        setStatus({ kind: 'ok', text: `Converted to Sequence — same pattern, now baked.${warned ? ' (Rhythm was animated; baked the current values.)' : ''}` });
    };

    // ── Build ────────────────────────────────────────────────────────────────
    const build = () => {
        if (activeCount === 0) {
            showToast('Add at least one formula with iterations > 0.', 'warning', 4000);
            return;
        }
        setBusy(true);
        setStatus(null);
        try {
            // Slots keep their RAW counts; loop dividers (breaks) carry the block
            // structure — buildBlockPlan expands them at emit.
            const slots = draft.rows.map((r) => ({ ...r.slot, optionTypes: [...r.slot.optionTypes], optionValues: [...r.slot.optionValues] }));
            const title = draft.title.trim() || autoTitleOf(draft.rows);
            const weaveSource: WeaveSource = {
                version: 1,
                title,
                slots: draft.rows.map((r) => ({
                    label: r.label, kind: r.kind, ref: r.ref, slot: { ...r.slot },
                    ...(r.bake?.some(Boolean) ? { bake: Array.from(r.bake, Boolean) } : {}),
                })),
                // Rhythm persists the built per-layer snapshot; the live values stay
                // on the DDFS weave feature (and ride presets/GMF as feature state).
                schedule: rhythm
                    ? {
                        kind: 'modulo',
                        // Explicit base only when non-default (spec §7); absent ⇒ first
                        // active slot, so default-base builds stay byte-identical.
                        ...(baseRowIdx !== activeRowIdx[0] ? { baseRow: baseRowIdx } : {}),
                        layers: layerRowIdx.map((_, j) => {
                            const v = layerVal(j + 1);
                            return { interval: v.interval, startIter: v.start, ...(v.beats > 0 ? { beats: v.beats } : {}) };
                        }),
                    }
                    : { kind: 'counts', repeatFrom: repeatIdx, ...(dividerRows.length ? { breaks: dividerRows.map((d) => ({ afterRow: d.afterRow, repeat: d.repeat })) } : {}) },
            };
            const res = loadUserWeave(slots, title, weaveSource, repeatIdx);
            if (!res.ok) {
                setStatus({ kind: 'error', text: res.reason || 'This weave is not supported.' });
                showToast(res.reason || 'Weave build failed.', 'error', 6000);
            } else {
                setReorderWarn(false);
                setStatus({
                    kind: 'ok',
                    text: rhythm
                        ? `Built ${res.summary}. Rhythm layers are live now — tweak interval/start/beats without rebuilding. Camera and look kept.`
                        : `Built ${res.summary}. Parameter sliders live in the Formula panel; camera and look kept.`,
                });
                showToast(`Weave built: ${res.summary}`, 'info', 4000);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatus({ kind: 'error', text: `Build failed: ${msg}` });
        } finally {
            setBusy(false);
        }
    };

    const clearAll = () => commit({ ...draft, rows: [], dividers: [], scheduleKind: 'counts' });

    // "Restore current" — reset the draft back to mirror the currently loaded
    // formula: its weaveSource if it carries one (a built weave / imported scene),
    // else seed slot 0 with the plain formula. Same logic as the initial hydrate.
    const restoreCurrent = () => {
        const ws = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
        if (ws) { commit(draftFromWeaveSource(ws)); setStatus(null); return; }
        const seed = seedRowFromFormula(store.formula);
        commit({ ...draft, rows: seed ? [seed] : [], dividers: [], scheduleKind: 'counts' });
        setStatus(null);
    };

    // "Open current weave" — the active formula carries a weaveSource (a built
    // weave, an imported MB3D scene, or a loaded GMF) that differs from the draft.
    const currentWs = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
    const openCurrent = () => {
        if (!currentWs) return;
        commit(draftFromWeaveSource(currentWs));
        setStatus(null);
    };

    // Un-built structural changes → the compile bar goes amber (mirrors the app's
    // Compile/Recompile). Only STRUCTURE needs a Build — slots / order / counts /
    // schedule kind / bake / repeat. Rhythm interval-start-beats and the enable
    // gate are LIVE (store.weave, no rebuild) so they never mark dirty. Derived
    // by comparing the draft to the active formula's persisted weave, so a Build
    // (which registers that weave) clears it automatically.
    const sigOf = (slots: { ref: string | number; kind: string; slot: MB3DFormulaSlot; bake?: boolean[] }[]) =>
        slots.map((s) => ({
            ref: s.ref, kind: s.kind, iter: s.slot.iterCount, ov: s.slot.optionValues,
            bake: s.bake && s.bake.some(Boolean) ? s.bake.map(Boolean) : null,
        }));
    // Normalize a counts schedule's loop structure to `[[afterRow, repeat], …]`
    // (breaks, or a single divider synthesized from repeatFrom) for comparison.
    const normBreaks = (sched: any): [number, number][] | null =>
        sched.kind !== 'counts' ? null
            : sched.breaks?.length ? sched.breaks.map((b: any) => [b.afterRow, b.repeat] as [number, number])
                : sched.repeatFrom ? [[sched.repeatFrom - 1, 1]] : [];
    const dirty = (() => {
        if (!currentWs) return activeCount > 0;
        const draftSig = JSON.stringify({
            slots: sigOf(draft.rows),
            kind: rhythm ? 'modulo' : 'counts',
            breaks: rhythm ? null : dividerRows.map((d) => [d.afterRow, d.repeat]),
        });
        const liveSig = JSON.stringify({
            slots: sigOf(currentWs.slots),
            kind: currentWs.schedule.kind,
            breaks: normBreaks(currentWs.schedule),
        });
        return draftSig !== liveSig;
    })();

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            {variant !== 'panel' && (
                <p className="text-xs text-fg-muted leading-relaxed">
                    Weave formulas across the iteration loop: each slot runs for its count of iterations, then the next
                    takes over, repeating <span title="Repeating cycle">↻</span>. Pick from the MB3D library or a native /
                    imported formula, set counts, and <strong className="text-fg">Build</strong> — your camera and look are
                    kept between rebuilds.
                </p>
            )}

            {/* Title + open-current + undo/redo */}
            <div className="flex items-center gap-2">
                <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder={autoTitleOf(draft.rows)}
                    title="Weave name — leave empty to name it after its formula mix"
                    className="flex-1 rounded bg-surface-sunken border border-line/10 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent-500/40 placeholder:text-fg-tertiary"
                    spellCheck={false}
                />
                {currentWs && (
                    <button onClick={openCurrent}
                        className="t-btn-sm t-btn-default shrink-0"
                        title={`Load the active formula's weave ("${currentWs.title}") into the editor`}>
                        Open current
                    </button>
                )}
                <button onClick={undo} disabled={past.current.length === 0}
                    className="icon-btn shrink-0" title="Undo structure edit"><UndoIcon /></button>
                <button onClick={redo} disabled={future.current.length === 0}
                    className="icon-btn shrink-0" title="Redo structure edit"><RedoIcon /></button>
            </div>

            {/* Hybrid Box presets — on its own, right-aligned above the rows.
                Add / Restore / Clear live in the slim footer card under the rows. */}
            <div className="flex items-center">
                <button onClick={openHbPicker}
                    className="t-btn-sm t-btn-default ml-auto"
                    title="Add a classic Hybrid Box fold as a weave slot — the retired Hybrid Box, as presets">
                    Hybrid Box <ChevronDown size={9} />
                </button>
            </div>

            {/* Slot rows — two lines each: [handle · color · chevron · name · ×]
                then [iterations + (Sequence: repeat) / (Rhythm: role + timing)]. */}
            <div className="space-y-1.5">
                {draft.rows.length === 0 && (
                    <p className="text-[11px] text-fg-tertiary border border-dashed border-line/15 rounded-lg px-3 py-4 text-center">
                        No formulas yet — add a base fractal (box, bulb, IFS), then layer a transform or a second
                        fractal to weave them across the iteration loop.
                    </p>
                )}
                {draft.rows.map((r, i) => {
                    const isExpanded = expandedKey === r.key;
                    // Rhythm role: baseRowIdx = base (explicit, spec §7); each other
                    // active row is a layer, keyed by its position among non-base rows.
                    const activePos = activeRowIdx.indexOf(i);
                    const isBase = rhythm && i === baseRowIdx;
                    const layerPos = rhythm ? layerRowIdx.indexOf(i) : -1;
                    const layerK = layerPos >= 0 ? layerPos + 1 : 0;
                    const lv = layerK ? layerVal(layerK) : null;
                    return (
                    <React.Fragment key={r.key}>
                    <div
                        ref={(el) => { if (el) rowRefs.current.set(r.key, el); else rowRefs.current.delete(r.key); }}
                        className={`rounded-lg border px-2 py-1.5 transition-colors ${
                            dragKey === r.key ? 'border-accent-500/40 bg-accent-500/10' : 'border-line/10 bg-surface-sunken/60'
                        }`}
                    >
                        {/* Line 1 — handle · color · chevron · name · remove */}
                        <div className="flex items-center gap-1.5">
                            <span
                                onPointerDown={(e) => onHandleDown(e, r.key)}
                                onPointerMove={(e) => onHandleMove(e, r.key)}
                                onPointerUp={(e) => onHandleUp(e, r.key)}
                                className="cursor-grab active:cursor-grabbing touch-none select-none text-fg-tertiary hover:text-fg-muted px-0.5 shrink-0 flex items-center"
                                title="Drag to reorder"
                            ><DragHandleIcon /></span>
                            <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SLOT_COLORS[r.colorIdx % SLOT_COLORS.length] }} />
                            <button onClick={() => setExpandedKey(isExpanded ? null : r.key)}
                                className="shrink-0 w-3 flex items-center justify-center text-fg-tertiary hover:text-fg transition-colors"
                                title="Parameters and per-layer timing"><CaretRight className={`w-2 h-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
                            <button onClick={(e) => openPicker(e, r.key)}
                                className="flex-1 text-left text-[11px] text-fg truncate hover:text-accent-300 transition-colors"
                                title={`Change formula (${r.label})`}>
                                {r.label}
                            </button>
                            <button onClick={() => remove(r.key)}
                                className="icon-btn icon-btn-danger shrink-0" title="Remove formula"><CloseIcon /></button>
                        </div>

                        {/* Line 2 — Sequence: iterations · Rhythm: role + compact timing */}
                        <div className="flex items-center gap-1.5 mt-1 pl-6 flex-wrap">
                            {!rhythm ? (
                                <div className="flex items-center gap-1 shrink-0" title="Iterations this formula runs each time it's scheduled">
                                    <Stepper value={r.slot.iterCount} min={0} onChange={(n) => setIter(r.key, n)} />
                                    <span className="text-[10px] text-fg-tertiary">iter</span>
                                </div>
                            ) : isBase ? (
                                <span className="text-[10px] text-fg-tertiary shrink-0" title="The base runs on every iteration no rhythm layer claims.">base</span>
                            ) : layerK > 0 && lv ? (
                                <>
                                    {dirty ? (
                                        <div className="flex items-center gap-2 text-[10px] text-fg-tertiary flex-wrap"
                                            title="Layer timing — set here before Build; after Build the live keyframable sliders appear under the schedule.">
                                            <Stepper label="start" value={lv.start} min={0} onChange={(n) => setLayerVal(layerK, 'weaveStartIter', n)} />
                                            <Stepper label="every" value={lv.interval} min={1} onChange={(n) => setLayerVal(layerK, 'weaveInterval', n)} />
                                            <Stepper label="beats" value={lv.beats} min={0} onChange={(n) => setLayerVal(layerK, 'weaveBeats', n)} />
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-fg-tertiary shrink-0" title="Live timing — edit with the keyframable sliders under the schedule below.">
                                            every {lv.interval} · from {lv.start}{lv.beats > 0 ? ` · ${lv.beats} beats` : ''}
                                        </span>
                                    )}
                                    <button onClick={() => makeBase(r.key)}
                                        className="text-[9px] text-fg-tertiary/60 hover:text-accent-300 transition-colors shrink-0 ml-auto"
                                        title="Make this the rhythm base — the formula left running when no layer fires">
                                        make base
                                    </button>
                                </>
                            ) : activePos < 0 ? (
                                <span className="text-[10px] text-fg-tertiary/50 shrink-0">inactive</span>
                            ) : null}
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="ml-6 rounded-lg border border-line/10 bg-surface-sunken/40 px-2 py-1.5 space-y-2">
                            {/* Parameters (rhythm timing lives in line 2 before Build,
                                and as live keyframable sliders under the schedule after). */}
                            {isNativeSlot(r.slot) ? (
                                <div className="text-[10px] text-fg-tertiary leading-relaxed space-y-1">
                                    <p>This formula's parameters are the sliders in the panel above — always live, nothing to set up here.</p>
                                    {store.showHints && (
                                        <p>If the surface looks wrong, choose a different estimator <strong className="text-fg-muted">below</strong>.</p>
                                    )}
                                </div>
                            ) : (() => {
                                const meta = getSlotOptionMeta(r.slot);
                                if (meta.length === 0) {
                                    return <p className="text-[10px] text-fg-tertiary">This formula has no editable parameters.</p>;
                                }
                                const defs = rowDefaults(r);
                                return (
                                    <div className="space-y-1">
                                        {meta.map((m) => {
                                            const baked = !!r.bake?.[m.index];
                                            const vals = Array.from({ length: m.span }, (_, j) => r.slot.optionValues[m.index + j] ?? 0);
                                            const defVals = Array.from({ length: m.span }, (_, j) => defs[m.index + j] ?? 0);
                                            const isDirty = vals.some((v, j) => v !== defVals[j]);
                                            return (
                                                <div key={m.index} className="flex items-center gap-1.5 text-[11px] text-fg-muted flex-wrap">
                                                    <span className="flex-1 min-w-[80px] truncate text-fg" title={m.name}>{m.name}</span>
                                                    {vals.map((v, j) => (
                                                        <OptValInput key={j} value={v} onCommit={(n) => {
                                                            const nv = [...vals]; nv[j] = n; setOptionValues(r.key, m.index, nv);
                                                        }} />
                                                    ))}
                                                    <button onClick={() => setOptionValues(r.key, m.index, defVals)}
                                                        disabled={!isDirty}
                                                        className={`shrink-0 transition-colors ${isDirty
                                                            ? 'icon-btn'
                                                            : 'opacity-0 pointer-events-none'}`}
                                                        title={`Reset to default (${defVals.join(', ')})`}><ResetIcon /></button>
                                                    {m.exposable ? (
                                                        <button onClick={() => toggleBake(r.key, m)}
                                                            className={`w-11 px-1.5 py-0.5 text-[10px] rounded border shrink-0 transition-colors ${!baked
                                                                ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                                                                : 'border-line/15 bg-line/[0.04] text-fg-tertiary hover:text-fg-muted'}`}
                                                            title={baked
                                                                ? 'Fixed: baked into the shader — uses no slider lane. Click to make it a live slider'
                                                                : 'Live: shows as a slider in the panel above. Click to bake it as a fixed value'}>
                                                            {baked ? 'fixed' : 'live'}
                                                        </button>
                                                    ) : (
                                                        <span className="w-11 px-1.5 py-0.5 text-[10px] text-center rounded border border-line/10 text-fg-tertiary/60 shrink-0"
                                                            title="This value is always fixed (angle / matrix / derived constant — it has no live-uniform mapping)">fixed</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {store.showHints && (
                                            <p className="text-[10px] text-fg-tertiary">
                                                Changes apply when you Build. Fixing a value keeps it out of the live sliders.
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                    {/* Loop divider after this row (Sequence) — the block above plays
                        ×repeat as intro, the rows below loop. Only where active rows
                        follow (there's a cycle to hand off to). */}
                    {!rhythm && draft.rows.slice(i + 1).some((rr) => rr.slot.iterCount > 0) && (() => {
                        const divider = draft.dividers.find((d) => d.afterKey === r.key);
                        return divider ? (
                            <div className="flex items-center gap-1.5 pl-6 py-0.5" title="Loop divider — the block above plays this many times as an intro, then the rows below loop.">
                                <span className="flex-1 border-t border-dashed border-accent-500/40" />
                                <span className="text-[10px] text-accent-300 shrink-0">↻ plays ×</span>
                                <input value={divider.repeat} inputMode="numeric"
                                    onChange={(e) => setDividerRepeat(r.key, parseInt(e.target.value, 10) || 1)}
                                    className="w-8 text-center rounded bg-surface-sunken border border-accent-500/30 py-0.5 text-[11px] text-accent-200 outline-none focus:border-accent-500/60" />
                                <button onClick={() => removeDivider(r.key)}
                                    className="icon-btn icon-btn-danger shrink-0" title="Remove loop divider"><CloseIcon /></button>
                                <span className="flex-1 border-t border-dashed border-accent-500/40" />
                            </div>
                        ) : (
                            <button onClick={() => addDivider(r.key)}
                                className="w-full flex items-center gap-1.5 pl-6 py-0.5 text-[9px] text-fg-tertiary/40 hover:text-accent-300 transition-colors group"
                                title="Insert a loop divider — the block above plays N times as an intro, then the rows below loop.">
                                <span className="flex-1 border-t border-dashed border-line/10 group-hover:border-accent-500/30" />
                                <span className="shrink-0">+ loop</span>
                                <span className="flex-1 border-t border-dashed border-line/10 group-hover:border-accent-500/30" />
                            </button>
                        );
                    })()}
                    </React.Fragment>
                    );
                })}

                {/* Add / Restore current / Clear — slim card joined under the rows. */}
                <div className="rounded-lg border border-line/10 bg-surface-sunken/60 px-2 py-1.5 flex items-center gap-2">
                    <button onClick={(e) => openPicker(e)} className="t-btn-sm t-btn-default">
                        <PlusIcon /> Add formula
                    </button>
                    <button onClick={restoreCurrent} className="t-btn-sm t-btn-default"
                        title="Reset the weave back to the currently loaded formula">
                        <ResetIcon /> Restore current
                    </button>
                    {draft.rows.length > 0 && (
                        <button onClick={clearAll} className="t-btn-sm t-btn-default ml-auto">
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Schedule */}
            {plan && (
                <div className="rounded-lg border border-line/10 bg-surface-sunken/40 px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <SectionLabel variant="secondary">Iteration schedule</SectionLabel>
                        {/* Whole-weave enable — deliberately LOW-PROFILE (a compat/
                            migration affordance, not a hero control; ADR-0089 P4.4).
                            Live DDFS state (uWeaveEnabled) — applies to weaves built
                            here (and migrated legacy scenes), no rebuild needed. */}
                        <label className="flex items-center gap-1 text-[10px] text-fg-tertiary hover:text-fg-muted cursor-pointer select-none"
                            title="Whole-weave enable — off renders the base formula only (all layers dormant). Live and keyframable; applies to weaves built here. Imported scenes gain it on rebuild.">
                            <input type="checkbox"
                                checked={store.weave?.weaveEnabled ?? true}
                                onChange={(e) => store.setWeave?.({ weaveEnabled: e.target.checked })}
                                className="w-3 h-3 accent-accent-500" />
                            active
                        </label>
                    </div>
                    {/* Sequence (baked counts) vs Rhythm (live layered modulo) — the
                        canonical segmented toggle, matching the Quality panel's engine
                        switch. Clicking converts the current pattern exactly (convert.ts). */}
                    <GenericToggleSwitch<'counts' | 'modulo'>
                        value={rhythm ? 'modulo' : 'counts'}
                        onChange={(v) => (v === 'modulo' ? toRhythm() : toSequence())}
                        options={[
                            { label: 'Sequence', value: 'counts', tooltip: 'Baked iteration sequence — exact per-slot counts; structure edits rebuild the shader' },
                            {
                                label: 'Rhythm', value: 'modulo',
                                disabled: !rhythmOk && draft.scheduleKind !== 'modulo',
                                tooltip: rhythmOk || draft.scheduleKind === 'modulo'
                                    ? 'Live rhythm — the first slot is the base; every other slot is an independent layer running every Nth iteration. Interval / start / beats are keyframable and apply instantly (no rebuild); costs a little performance'
                                    : 'Rhythm supports up to 6 active formula slots',
                            },
                        ]}
                    />
                    {draft.scheduleKind === 'modulo' && !rhythmOk && (
                        <p className="text-[10px] text-amber-300/80">
                            Rhythm supports up to 6 active formulas ({activeCount} now) — building as Sequence until then.
                        </p>
                    )}
                    <LoopStrip
                        plan={rhythm && rhythmPlan ? rhythmPlan : plan}
                        labels={draft.rows.map((r) => r.label)}
                        colors={draft.rows.map((r) => SLOT_COLORS[r.colorIdx % SLOT_COLORS.length])}
                        totalIterations={store.coreMath?.iterations}
                    />
                    {store.showHints && (
                        <p className="text-[10px] text-fg-tertiary">
                            {rhythm
                                ? <>{activeCount - 1} rhythm layer{activeCount === 2 ? '' : 's'} over {draft.rows[activeRowIdx[0]]?.label} · scene iterations: {store.coreMath?.iterations ?? '—'}</>
                                : <>cycle = {plan.cycleLen} iteration{plan.cycleLen === 1 ? '' : 's'}
                                    {plan.introLen > 0 ? ` after ${plan.introLen} intro` : ''} · faded blocks repeat · scene iterations: {store.coreMath?.iterations ?? '—'}</>}
                        </p>
                    )}

                    {/* Live keyframable rhythm sliders — appear AFTER Build (the weave is
                        live), grouped per formula. Before Build, the compact start/every/
                        beats controls in the rows above set the initial timing; these
                        keyframe it live (no rebuild). */}
                    {rhythm && !dirty && layerRowIdx.length > 0 && (
                        <div className="pt-1.5 mt-0.5 space-y-2 border-t border-line/10">
                            <SectionLabel variant="secondary">Live rhythm — keyframable</SectionLabel>
                            {layerRowIdx.map((rowIdx, j) => {
                                const k = j + 1;
                                const v = layerVal(k);
                                return (
                                    <div key={draft.rows[rowIdx].key} className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                            <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SLOT_COLORS[(draft.rows[rowIdx]?.colorIdx ?? 0) % SLOT_COLORS.length] }} />
                                            <span className="truncate text-fg">{draft.rows[rowIdx]?.label}</span>
                                        </div>
                                        <Slider label="Start" value={v.start} min={0} max={8} step={1} className="-mx-3"
                                            onChange={(n) => setLayerVal(k, 'weaveStartIter', n)} defaultValue={k}
                                            trackId={`weave.weaveStartIter${k}`} liveValue={store.liveModulations?.[`weave.weaveStartIter${k}`]} />
                                        <Slider label="Interval" value={v.interval} min={1} max={8} step={1} className="-mx-3"
                                            onChange={(n) => setLayerVal(k, 'weaveInterval', n)} defaultValue={1}
                                            trackId={`weave.weaveInterval${k}`} liveValue={store.liveModulations?.[`weave.weaveInterval${k}`]} />
                                        <Slider label="Beats (0 = endless)" value={v.beats} min={0} max={8} step={1} className="-mx-3"
                                            onChange={(n) => setLayerVal(k, 'weaveBeats', n)} defaultValue={2}
                                            trackId={`weave.weaveBeats${k}`} liveValue={store.liveModulations?.[`weave.weaveBeats${k}`]} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {reorderWarn && (
                <div className="flex items-start gap-2 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-200">
                    <p className="leading-relaxed">
                        You have keyframed formula parameters — changing slot structure can shift which slot a
                        parameter lane belongs to. Check your animation tracks after rebuilding.
                    </p>
                </div>
            )}

            {status && (
                <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${status.kind === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
                    <p className="leading-relaxed">{status.text}</p>
                </div>
            )}

            {/* Live lane-budget meter (MB3D dense pool) */}
            {meter !== null && (
                <p className={`text-[10px] px-0.5 ${'fits' in meter && !meter.fits ? 'text-amber-300/90' : 'text-fg-tertiary'}`}
                    title="Live-slider budget: native formulas get their own per-formula parameter banks (always live). MB3D formulas share 24 scalar lanes (paramA–F + vec2/vec4 components) + 6 vec3 units; over that budget their parameters bake.">
                    {'allNative' in meter ? `${meter.allNative} native formula${meter.allNative === 1 ? '' : 's'} — parameters always live` :
                        (() => {
                            const nativeSuffix = (meter as any).natives ? ` · +${(meter as any).natives} native live` : '';
                            return 'single' in meter ? `${meter.single} MB3D parameter slider${meter.single === 1 ? '' : 's'}${nativeSuffix}` :
                                'note' in meter ? `${meter.note}${nativeSuffix}` :
                                `MB3D ${meter.scalars}/24 lanes · ${meter.vec3s}/6 vec3 — ${meter.fits ? 'live sliders' : 'over budget: parameters bake'}${nativeSuffix}`;
                        })()}
                </p>
            )}

            {/* Build — the app's standard compile bar. Amber (warn) with the
                compile button while there are un-built structural changes;
                quiet "weave is live" once built (like Compile → compiled). */}
            {dirty ? (
                <CompileBar
                    message="Build to apply"
                    buttonLabel={busy ? 'Building…' : 'Build'}
                    disabled={busy || activeCount === 0}
                    onCompile={build}
                />
            ) : (
                <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[9px] font-bold text-fg-tertiary">✓ weave is live</span>
                    <button onClick={build} disabled={busy || activeCount === 0}
                        className="t-btn-sm t-btn-default"
                        title="Rebuild the weave (keeps your camera and look)">
                        {busy ? 'Building…' : 'Rebuild'}
                    </button>
                </div>
            )}

            {picker && (
                <CategoryPickerMenu
                    x={picker.x} y={picker.y}
                    anchorRight={picker.right}
                    categories={pickerCategories}
                    getItems={pickerItems}
                    onSelect={onPick}
                    onClose={() => setPicker(null)}
                    categoryWidth={130}
                    itemWidth={210}
                />
            )}

            {hbPicker && (
                <CategoryPickerMenu
                    x={hbPicker.x} y={hbPicker.y}
                    anchorRight={hbPicker.right}
                    categories={[{ id: 'hb', name: 'Hybrid Box folds', highlight: true }]}
                    getItems={hbItems}
                    onSelect={addFoldPreset}
                    onClose={() => setHbPicker(null)}
                    categoryWidth={140}
                    itemWidth={220}
                />
            )}
        </div>
    );
}
