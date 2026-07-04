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
 *    edits rebuild) vs layered modulo ("Rhythm", 2–6 active slots: the first is
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
import { buildCountsPlan } from '../../engine/weave/schedule';
import { getMB3DCatalog, slotFromCatalogEntry } from '../../utils/mb3d/mb3dCatalog';
import type { CatalogEntry } from '../../utils/mb3d/mb3dCatalog';
import { loadUserWeave } from '../../utils/mb3d/loadMB3DScene';
import { transpileSlot, getSlotOptionMeta } from '../../utils/mb3d/slotTranspiler';
import type { SlotOptionMeta } from '../../utils/mb3d/slotTranspiler';
import { resolveNativeSlot } from '../../engine/weave/nativeResolver';
import { getNativeSlotCatalog, nativeSlotShell, isNativeSlot } from '../../engine/weave/nativeSlotCatalog';
import { LaneAllocator } from '../../utils/uniformSlots';
import type { MB3DFormulaSlot } from '../../utils/mb3d/parseMB3D';
import type { FractalDefinition } from '../../types/fractal';
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

interface WeaveDraft {
    title: string;
    rows: SlotRow[];
    /** Row key of the "repeat from here" marker; null = repeat the whole sequence. */
    repeatKey: string | null;
    /** User's schedule choice. 'modulo' (Rhythm) only takes effect while exactly
     *  2 rows are active — otherwise the build falls back to counts (Sequence). */
    scheduleKind: 'counts' | 'modulo';
}

// Module-scoped draft — survives modal close/reopen within a session (the
// Workshop draft pattern; cleared on page reload).
let weaveDraft: WeaveDraft | null = null;
let rowSeq = 0;
const rowKey = () => `wrow${rowSeq++}`;

const cloneRows = (rows: SlotRow[]): SlotRow[] =>
    rows.map((r) => ({
        ...r,
        slot: { ...r.slot, optionTypes: [...r.slot.optionTypes], optionValues: [...r.slot.optionValues] },
        bake: r.bake ? [...r.bake] : undefined,
    }));
const cloneDraft = (d: WeaveDraft): WeaveDraft => ({ title: d.title, rows: cloneRows(d.rows), repeatKey: d.repeatKey, scheduleKind: d.scheduleKind ?? 'counts' });

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
    const rows = ws.slots.map((s, i) => ({
        key: rowKey(),
        label: s.label,
        kind: s.kind,
        ref: s.ref,
        colorIdx: i,
        slot: { ...s.slot, optionTypes: [...s.slot.optionTypes], optionValues: [...s.slot.optionValues] },
        bake: s.bake ? [...s.bake] : undefined,
    }));
    const rf = ws.schedule.kind === 'counts' ? (ws.schedule.repeatFrom ?? 0) : 0;
    return { title: ws.title, rows, repeatKey: rows[rf]?.key ?? null, scheduleKind: ws.schedule.kind };
}

const DEFAULT_ITER_COUNT = 2;

/** Compact −/N/+ stepper for the live rhythm params (real-time friendly — the
 *  full GMT slider widgets arrive with the P4 panel promotion, where the DDFS
 *  params render through the standard panel primitives). */
function MiniStep({ value, set, title }: { value: number; set: (n: number) => void; title: string }) {
    return (
        <span className="flex items-center gap-0.5 shrink-0" title={title}>
            <button onClick={() => set(value - 1)}
                className="w-4 h-4 text-[10px] leading-none rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg transition-colors">−</button>
            <input value={value} onChange={(e) => set(parseInt(e.target.value, 10) || 0)}
                className="w-7 text-center rounded bg-surface-sunken border border-line/10 py-0.5 text-[11px] text-fg outline-none focus:border-accent-500/40" />
            <button onClick={() => set(value + 1)}
                className="w-4 h-4 text-[10px] leading-none rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg transition-colors">+</button>
        </span>
    );
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

export function WeaveEditorPane() {
    const store = useEngineStore() as any;

    const [draft, setDraft] = useState<WeaveDraft>(() => {
        if (weaveDraft && weaveDraft.rows.length > 0) return cloneDraft(weaveDraft);
        // Reopening a weave formula: hydrate from its persisted source.
        const ws = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
        if (ws) return draftFromWeaveSource(ws);
        return { title: 'My Weave', rows: [], repeatKey: null, scheduleKind: 'counts' };
    });
    const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
    const [reorderWarn, setReorderWarn] = useState(false);
    const [picker, setPicker] = useState<{ x: number; y: number; right: number; replaceKey?: string } | null>(null);
    const [busy, setBusy] = useState(false);

    // Editor-local structure undo (separate from DDFS param undo by design).
    const past = useRef<WeaveDraft[]>([]);
    const future = useRef<WeaveDraft[]>([]);

    // Snapshot the draft to module scope on unmount (modal close).
    const liveRef = useRef(draft);
    liveRef.current = draft;
    useEffect(() => () => { weaveDraft = cloneDraft(liveRef.current); }, []);

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
    const pickerCategories: PickerCategory[] = useMemo(
        () => [
            ...catalog.map((g) => ({ id: `mb3d:${g.category}`, name: g.category })),
            ...nativeCatalog.map((g) => ({ id: `nat:${g.category}`, name: `Native · ${g.category}` })),
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
            commit({ ...draft, rows: [...draft.rows, built] });
        }
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
            repeatKey: draft.repeatKey === key ? null : draft.repeatKey,
        });
    };
    const setRepeat = (key: string) => {
        const idx = draft.rows.findIndex((r) => r.key === key);
        commit({ ...draft, repeatKey: idx <= 0 ? null : key });
    };

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
    // uses (multi-slot path), recomputed when the draft changes. Single-slot builds
    // use fixed uParam* lanes instead of the allocator, so report the param count.
    const meter = useMemo(() => {
        const active = draft.rows.filter((r) => r.slot.iterCount > 0);
        if (active.length === 0) return null;
        // Native rows dry-run through the SAME LaneAllocator via the native
        // resolver (walking def.parameters); MB3D rows through the transpiler.
        const nativeParamCount = (r: SlotRow, k: number, alloc?: LaneAllocator): number | false => {
            const def = registry.get(String(r.ref)) as FractalDefinition | undefined;
            if (!def) return false;
            const res = resolveNativeSlot(def, k, `probe${k}`, alloc ? { alloc } : { parametric: true });
            if (!res.ok || res.paramOk === false) return false;
            return res.params.length;
        };
        try {
            if (active.length === 1) {
                const r = active[0];
                if (isNativeSlot(r.slot)) {
                    const n = nativeParamCount(r, 0);
                    return { single: n === false ? 0 : n };
                }
                const t = transpileSlot(r.slot, 0, 'probe0', { parametric: true, bake: r.bake });
                return { single: t.params?.length ?? 0 };
            }
            if (active.some((r) => r.slot.formulaIndex === 2)) {
                return { note: '4D (Quaternion) hybrids bake parameters' };
            }
            const alloc = new LaneAllocator();
            let ok = true;
            active.forEach((r, k) => {
                alloc.startSlot();
                if (isNativeSlot(r.slot)) {
                    if (nativeParamCount(r, k, alloc) === false) ok = false;
                } else if (transpileSlot(r.slot, k, `probe${k}`, { alloc, bake: r.bake }).paramOk === false) {
                    ok = false;
                }
            });
            return { scalars: alloc.scalarsUsed, vec3s: alloc.vec3sUsed, fits: ok && alloc.fits() };
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
    const rhythmOk = activeCount >= 2 && activeCount <= 6;
    const rhythm = draft.scheduleKind === 'modulo' && rhythmOk;
    const activeRowIdx = draft.rows.map((r, i) => (r.slot.iterCount > 0 ? i : -1)).filter((i) => i >= 0);
    const clampI = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n) || 0));
    const layerVal = (k: number) => ({
        interval: Math.max(1, clampI(store.weave?.[`weaveInterval${k}`] ?? 2, 1, 32)),
        start: clampI(store.weave?.[`weaveStartIter${k}`] ?? 0, 0, 64),
        beats: clampI(store.weave?.[`weaveBeats${k}`] ?? 0, 0, 64),
    });
    const setLayerVal = (k: number, field: 'weaveInterval' | 'weaveStartIter' | 'weaveBeats', n: number) =>
        store.setWeave?.({ [`${field}${k}`]: field === 'weaveInterval' ? Math.max(1, clampI(n, 1, 32)) : clampI(n, 0, 64) });
    const rowColor = (i: number) => SLOT_COLORS[(draft.rows[i]?.colorIdx ?? 0) % SLOT_COLORS.length];

    // ── Live schedule preview ────────────────────────────────────────────────
    const repeatIdx = useMemo(() => {
        if (activeCount === 0) return 0;
        let endTo = iterCounts.length - 1;
        while (endTo > 0 && iterCounts[endTo] === 0) endTo--;
        let rf = draft.repeatKey ? draft.rows.findIndex((r) => r.key === draft.repeatKey) : 0;
        if (rf < 0) rf = 0;
        rf = Math.min(rf, endTo);
        while (rf > 0 && iterCounts[rf] <= 0) rf--;
        return rf;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iterCounts.join(','), draft.repeatKey, draft.rows.map((r) => r.key).join(',')]);
    const plan = useMemo(() => {
        if (activeCount === 0) return null;
        let endTo = iterCounts.length - 1;
        while (endTo > 0 && iterCounts[endTo] === 0) endTo--;
        return buildCountsPlan({ iterCounts, endTo, repeatFrom: repeatIdx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iterCounts.join(','), repeatIdx]);

    // Rhythm plan for the LoopStrip: mirror the layered phase fn in JS (pure — no
    // compile; recomputed per render, trivially cheap). Layers are checked in row
    // order, first beat wins; the base fills the rest. Beats caps make the layered
    // schedule non-periodic in general, so the strip shows the exact first
    // iterations (introLen = full length ⇒ no faded-repeat tail).
    const rhythmPlan = (() => {
        if (!rhythm) return null;
        const layers = activeRowIdx.slice(1).map((rowIdx, j) => ({ rowIdx, ...layerVal(j + 1) }));
        const order: number[] = [];
        for (let i = 0; i < 96; i++) {
            let s = activeRowIdx[0];
            for (const L of layers) {
                const rel = i - L.start;
                if (rel >= 0 && rel % L.interval === 0 && (L.beats <= 0 || rel / L.interval < L.beats)) { s = L.rowIdx; break; }
            }
            order.push(s);
        }
        return { order, introLen: order.length, cycleLen: 1, endTo: 0, repeatFrom: 0, nHybrid: iterCounts, hasSilent: false };
    })();

    // ── Build ────────────────────────────────────────────────────────────────
    const build = () => {
        if (activeCount === 0) {
            showToast('Add at least one formula with iterations > 0.', 'warning', 4000);
            return;
        }
        setBusy(true);
        setStatus(null);
        try {
            const slots = draft.rows.map((r) => ({ ...r.slot, optionTypes: [...r.slot.optionTypes], optionValues: [...r.slot.optionValues] }));
            const weaveSource: WeaveSource = {
                version: 1,
                title: draft.title,
                slots: draft.rows.map((r) => ({
                    label: r.label, kind: r.kind, ref: r.ref, slot: { ...r.slot },
                    ...(r.bake?.some(Boolean) ? { bake: Array.from(r.bake, Boolean) } : {}),
                })),
                // Rhythm persists the built per-layer snapshot; the live values stay
                // on the DDFS weave feature (and ride presets/GMF as feature state).
                schedule: rhythm
                    ? {
                        kind: 'modulo',
                        layers: activeRowIdx.slice(1).map((_, j) => {
                            const v = layerVal(j + 1);
                            return { interval: v.interval, startIter: v.start, ...(v.beats > 0 ? { beats: v.beats } : {}) };
                        }),
                    }
                    : { kind: 'counts', repeatFrom: repeatIdx },
            };
            const res = loadUserWeave(slots, draft.title || 'My Weave', weaveSource, repeatIdx);
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

    const clearAll = () => commit({ ...draft, rows: [], repeatKey: null, scheduleKind: 'counts' });

    // "Open current weave" — the active formula carries a weaveSource (a built
    // weave, an imported MB3D scene, or a loaded GMF) that differs from the draft.
    const currentWs = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
    const openCurrent = () => {
        if (!currentWs) return;
        commit(draftFromWeaveSource(currentWs));
        setStatus(null);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            <p className="text-xs text-fg-muted leading-relaxed">
                Weave formulas across the iteration loop: each slot runs for its count of iterations, then the next
                takes over, repeating <span title="Repeating cycle">↻</span>. Pick from the MB3D library or a native /
                imported formula, set counts, and <strong className="text-fg">Build</strong> — your camera and look are
                kept between rebuilds.
            </p>

            {/* Title + open-current + undo/redo */}
            <div className="flex items-center gap-2">
                <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Weave name"
                    className="flex-1 rounded bg-surface-sunken border border-line/10 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent-500/40"
                    spellCheck={false}
                />
                {currentWs && (
                    <button onClick={openCurrent}
                        className="px-2 py-1 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-accent-500/40 transition-colors"
                        title={`Load the active formula's weave ("${currentWs.title}") into the editor`}>
                        ⧉ Open current
                    </button>
                )}
                <button onClick={undo} disabled={past.current.length === 0}
                    className="px-2 py-1 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted transition-colors"
                    title="Undo structure edit">↶</button>
                <button onClick={redo} disabled={future.current.length === 0}
                    className="px-2 py-1 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg disabled:opacity-40 disabled:hover:text-fg-muted transition-colors"
                    title="Redo structure edit">↷</button>
            </div>

            {/* Slot rows */}
            <div className="space-y-1.5">
                {draft.rows.length === 0 && (
                    <p className="text-[11px] text-fg-tertiary border border-dashed border-line/15 rounded-lg px-3 py-4 text-center">
                        No slots yet — add a base fractal (box, bulb, IFS) from the MB3D library or a native / imported
                        formula, then layer transforms or a second fractal.
                    </p>
                )}
                {draft.rows.map((r, i) => (
                    <React.Fragment key={r.key}>
                    <div
                        ref={(el) => { if (el) rowRefs.current.set(r.key, el); else rowRefs.current.delete(r.key); }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${
                            dragKey === r.key ? 'border-accent-500/40 bg-accent-500/10' : 'border-line/10 bg-surface-sunken/60'
                        }`}
                    >
                        <span
                            onPointerDown={(e) => onHandleDown(e, r.key)}
                            onPointerMove={(e) => onHandleMove(e, r.key)}
                            onPointerUp={(e) => onHandleUp(e, r.key)}
                            className="cursor-grab active:cursor-grabbing touch-none select-none text-fg-tertiary hover:text-fg-muted px-0.5 shrink-0"
                            title="Drag to reorder"
                        >≡</span>
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SLOT_COLORS[r.colorIdx % SLOT_COLORS.length] }} />
                        <button onClick={(e) => openPicker(e, r.key)}
                            className="flex-1 text-left text-[11px] text-fg truncate hover:text-accent-300 transition-colors"
                            title={`Change formula (${r.label})`}>
                            {r.label}
                        </button>
                        <button
                            onClick={() => setRepeat(r.key)}
                            disabled={rhythm}
                            className={`w-5 h-5 text-[11px] rounded border shrink-0 transition-colors ${rhythm ? 'opacity-30 cursor-not-allowed ' : ''}${
                                i === repeatIdx && i > 0
                                    ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                                    : (draft.repeatKey === null && i === 0)
                                        ? 'border-line/10 bg-line/[0.02] text-fg-tertiary/50'
                                        : 'border-line/15 bg-line/[0.04] text-fg-tertiary hover:text-fg-muted'
                            }`}
                            title={rhythm
                                ? 'Repeat-from doesn’t apply to Rhythm — the modulo beat drives the schedule'
                                : 'Repeat from here — earlier slots run once as an intro; the loop repeats from this slot (MB3D’s Repeat From)'}
                        >↻</button>
                        <div className={`flex items-center gap-0.5 shrink-0 ${rhythm ? 'opacity-40' : ''}`}
                            title={rhythm
                                ? 'Counts don’t drive Rhythm — a slot is active while its count is above 0'
                                : 'Iterations this slot runs per visit'}>
                            <button onClick={() => setIter(r.key, r.slot.iterCount - 1)}
                                className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg transition-colors">−</button>
                            <input
                                value={r.slot.iterCount}
                                onChange={(e) => setIter(r.key, parseInt(e.target.value, 10) || 0)}
                                className="w-8 text-center rounded bg-surface-sunken border border-line/10 py-0.5 text-[11px] text-fg outline-none focus:border-accent-500/40"
                            />
                            <button onClick={() => setIter(r.key, r.slot.iterCount + 1)}
                                className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg transition-colors">+</button>
                        </div>
                        <button onClick={() => setExpandedKey(expandedKey === r.key ? null : r.key)}
                            className={`w-5 h-5 text-[11px] rounded border shrink-0 transition-colors ${expandedKey === r.key
                                ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                                : 'bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg'}`}
                            title={isNativeSlot(r.slot)
                                ? 'Parameters — auto-exposed as sliders (details)'
                                : 'Parameters — edit values, choose live slider vs fixed literal'}>{expandedKey === r.key ? '▾' : '▸'}</button>
                        <button onClick={() => remove(r.key)}
                            className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-red-300 transition-colors shrink-0" title="Remove slot">×</button>
                    </div>
                    {expandedKey === r.key && isNativeSlot(r.slot) && (
                        <div className="ml-6 rounded-lg border border-line/10 bg-surface-sunken/40 px-2 py-1.5 space-y-1 text-[10px] text-fg-tertiary leading-relaxed">
                            <p>
                                A native formula's parameters <strong className="text-fg-muted">auto-expose</strong> as
                                sliders in the Formula panel — they share the same lane budget as the other slots and
                                bake automatically only if the pool overflows (no per-parameter toggle here).
                            </p>
                            <p>
                                This formula's own distance estimator isn't spliced into the weave — if the surface
                                looks wrong, pick an estimator in the <strong className="text-fg-muted">Quality</strong> panel.
                            </p>
                        </div>
                    )}
                    {expandedKey === r.key && !isNativeSlot(r.slot) && (() => {
                        const meta = getSlotOptionMeta(r.slot);
                        if (meta.length === 0) {
                            return <p className="ml-6 text-[10px] text-fg-tertiary px-2">This formula has no editable parameters.</p>;
                        }
                        const defs = rowDefaults(r);
                        return (
                            <div className="ml-6 rounded-lg border border-line/10 bg-surface-sunken/40 px-2 py-1.5 space-y-1">
                                {meta.map((m) => {
                                    const baked = !!r.bake?.[m.index];
                                    const vals = Array.from({ length: m.span }, (_, j) => r.slot.optionValues[m.index + j] ?? 0);
                                    const defVals = Array.from({ length: m.span }, (_, j) => defs[m.index + j] ?? 0);
                                    const dirty = vals.some((v, j) => v !== defVals[j]);
                                    return (
                                        <div key={m.index} className="flex items-center gap-1.5 text-[11px] text-fg-muted flex-wrap">
                                            <span className="flex-1 min-w-[80px] truncate text-fg" title={m.name}>{m.name}</span>
                                            {vals.map((v, j) => (
                                                <OptValInput key={j} value={v} onCommit={(n) => {
                                                    const nv = [...vals]; nv[j] = n; setOptionValues(r.key, m.index, nv);
                                                }} />
                                            ))}
                                            <button onClick={() => setOptionValues(r.key, m.index, defVals)}
                                                disabled={!dirty}
                                                className={`w-5 h-5 text-[11px] rounded border shrink-0 transition-colors ${dirty
                                                    ? 'bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg'
                                                    : 'opacity-0 pointer-events-none border-transparent'}`}
                                                title={`Reset to default (${defVals.join(', ')})`}>↺</button>
                                            {m.exposable ? (
                                                <button onClick={() => toggleBake(r.key, m)}
                                                    className={`w-11 px-1.5 py-0.5 text-[10px] rounded border shrink-0 transition-colors ${!baked
                                                        ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                                                        : 'border-line/15 bg-line/[0.04] text-fg-tertiary hover:text-fg-muted'}`}
                                                    title={baked
                                                        ? 'Fixed: baked into the shader as a literal — uses no slider lane. Click to expose as a live slider'
                                                        : 'Live: exposed as a slider in the Formula panel — uses uniform lanes. Click to bake as a fixed literal'}>
                                                    {baked ? 'fixed' : 'live'}
                                                </button>
                                            ) : (
                                                <span className="w-11 px-1.5 py-0.5 text-[10px] text-center rounded border border-line/10 text-fg-tertiary/60 shrink-0"
                                                    title="This option type always bakes (angle / matrix / derived constant — it has no live-uniform mapping)">fixed</span>
                                            )}
                                        </div>
                                    );
                                })}
                                <p className="text-[10px] text-fg-tertiary">
                                    value edits and live/fixed toggles apply on Build · fixing a value frees slider lanes
                                </p>
                            </div>
                        );
                    })()}
                    </React.Fragment>
                ))}
                <div className="flex items-center gap-2">
                    <button onClick={(e) => openPicker(e)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg hover:border-accent-500/40 hover:bg-accent-500/10 transition-colors">
                        + Add formula
                    </button>
                    {draft.rows.length > 0 && (
                        <button onClick={clearAll}
                            className="px-2 py-1 text-[10px] rounded border bg-line/[0.04] border-line/10 text-fg-tertiary hover:text-fg-muted transition-colors">
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Schedule */}
            {plan && (
                <div className="rounded-lg border border-line/10 bg-surface-sunken/40 px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-fg-tertiary">Iteration schedule</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => draft.scheduleKind !== 'counts' && commit({ ...draft, scheduleKind: 'counts' })}
                                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${!rhythm
                                    ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                                    : 'border-line/15 bg-line/[0.04] text-fg-tertiary hover:text-fg-muted'}`}
                                title="Baked iteration sequence — exact per-slot counts; structure edits rebuild the shader">
                                Sequence
                            </button>
                            <button
                                disabled={!rhythmOk && draft.scheduleKind !== 'modulo'}
                                onClick={() => draft.scheduleKind !== 'modulo' && commit({ ...draft, scheduleKind: 'modulo' })}
                                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${rhythm
                                    ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                                    : rhythmOk
                                        ? 'border-line/15 bg-line/[0.04] text-fg-tertiary hover:text-fg-muted'
                                        : 'border-line/10 bg-line/[0.04] text-fg-tertiary opacity-50 cursor-not-allowed'}`}
                                title={rhythmOk || draft.scheduleKind === 'modulo'
                                    ? 'Live rhythm — the first slot is the base; every other slot is an independent layer running every Nth iteration. Interval / start / beats are keyframable and apply instantly (no rebuild); costs a little performance'
                                    : 'Rhythm needs 2–6 active formula slots'}>
                                Rhythm
                            </button>
                        </div>
                    </div>
                    {draft.scheduleKind === 'modulo' && !rhythmOk && (
                        <p className="text-[10px] text-amber-300/80">
                            Rhythm needs 2–6 active slots ({activeCount} now) — building as Sequence until then.
                        </p>
                    )}
                    {rhythm && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: rowColor(activeRowIdx[0]) }} />
                                <span className="truncate text-fg max-w-[110px]">{draft.rows[activeRowIdx[0]]?.label}</span>
                                <span className="text-[10px] text-fg-tertiary">— base, runs when no layer beats</span>
                            </div>
                            {activeRowIdx.slice(1).map((rowIdx, j) => {
                                const k = j + 1;
                                const v = layerVal(k);
                                return (
                                    <div key={draft.rows[rowIdx].key} className="flex items-center gap-1.5 text-[11px] text-fg-muted flex-wrap">
                                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: rowColor(rowIdx) }} />
                                        <span className="truncate text-fg max-w-[110px]">{draft.rows[rowIdx].label}</span>
                                        <span className="text-fg-tertiary">every</span>
                                        <MiniStep value={v.interval} set={(n) => setLayerVal(k, 'weaveInterval', n)}
                                            title="Run this layer every N iterations — live, keyframable, no rebuild" />
                                        <span className="text-fg-tertiary">from</span>
                                        <MiniStep value={v.start} set={(n) => setLayerVal(k, 'weaveStartIter', n)}
                                            title="First iteration where this layer runs — live, keyframable, no rebuild" />
                                        <span className="text-fg-tertiary">beats</span>
                                        <MiniStep value={v.beats} set={(n) => setLayerVal(k, 'weaveBeats', n)}
                                            title="Stop after this many beats (0 = endless). A dense capped layer works as an intro sequence — live, no rebuild" />
                                    </div>
                                );
                            })}
                            <p className="text-[10px] text-fg-tertiary">
                                layers are checked top to bottom — the first beat wins · live, no rebuild; formula changes still rebuild
                            </p>
                        </div>
                    )}
                    <LoopStrip
                        plan={rhythm && rhythmPlan ? rhythmPlan : plan}
                        labels={draft.rows.map((r) => r.label)}
                        colors={draft.rows.map((r) => SLOT_COLORS[r.colorIdx % SLOT_COLORS.length])}
                        totalIterations={store.coreMath?.iterations}
                    />
                    <p className="text-[10px] text-fg-tertiary">
                        {rhythm
                            ? <>{activeCount - 1} rhythm layer{activeCount === 2 ? '' : 's'} over {draft.rows[activeRowIdx[0]]?.label} · scene iterations: {store.coreMath?.iterations ?? '—'}</>
                            : <>cycle = {plan.cycleLen} iteration{plan.cycleLen === 1 ? '' : 's'}
                                {plan.introLen > 0 ? ` after ${plan.introLen} intro` : ''} · faded blocks repeat · scene iterations: {store.coreMath?.iterations ?? '—'}</>}
                    </p>
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

            {/* Build + live lane-budget meter */}
            <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] ${meter && 'fits' in meter && !meter.fits ? 'text-amber-300/90' : 'text-fg-tertiary'}`}
                    title="Live-slider budget: 24 scalar lanes (paramA–F + vec2/vec4 components) and 6 vec3 units are shared by all slots' exposed parameters. Over budget → every parameter bakes; fix values to fit.">
                    {meter === null ? '' :
                        'single' in meter ? `${meter.single} parameter slider${meter.single === 1 ? '' : 's'}` :
                        'note' in meter ? meter.note :
                        `${meter.scalars}/24 lanes · ${meter.vec3s}/6 vec3 — ${meter.fits ? 'live sliders' : 'over budget: parameters bake'}`}
                </span>
                <button onClick={build} disabled={busy || activeCount === 0}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-accent-600 hover:bg-accent-500 text-white border border-accent-500/50 disabled:opacity-40 transition-colors"
                    title="Compile the weave and preview it — keeps your camera and look">
                    {busy ? 'Building…' : 'Build & Preview'}
                </button>
            </div>

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
        </div>
    );
}
