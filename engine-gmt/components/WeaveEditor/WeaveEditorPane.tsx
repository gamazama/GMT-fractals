/**
 * WeaveEditorPane — the user-facing weaver (ADR-0089 P3): author an N-slot
 * mode-0 weave over the MB3D formula library, see the iteration schedule live
 * (LoopStrip), build → preview through the fused-hybrid pipeline, keep editing.
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
import type { MB3DFormulaSlot } from '../../utils/mb3d/parseMB3D';
import type { FractalDefinition } from '../../types/fractal';
import { LoopStrip, SLOT_COLORS } from './LoopStrip';

type WeaveSource = NonNullable<FractalDefinition['weaveSource']>;

interface SlotRow {
    key: string;
    label: string;
    kind: 'intern' | 'decompiled';
    ref: string | number;
    /** Stable color identity — survives reorder (user feedback 2026-07-04). */
    colorIdx: number;
    slot: MB3DFormulaSlot;
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
    rows.map((r) => ({ ...r, slot: { ...r.slot, optionTypes: [...r.slot.optionTypes], optionValues: [...r.slot.optionValues] } }));
const cloneDraft = (d: WeaveDraft): WeaveDraft => ({ title: d.title, rows: cloneRows(d.rows), repeatKey: d.repeatKey, scheduleKind: d.scheduleKind ?? 'counts' });

const nextColorIdx = (rows: SlotRow[]): number => {
    const used = new Set(rows.map((r) => r.colorIdx));
    let ci = 0;
    while (used.has(ci)) ci++;
    return ci;
};

/** Hydrate a draft from a weave formula's persisted source. */
function draftFromWeaveSource(ws: WeaveSource): WeaveDraft {
    const rows = ws.slots.map((s, i) => ({
        key: rowKey(),
        label: s.label,
        kind: s.kind,
        ref: s.ref,
        colorIdx: i,
        slot: { ...s.slot, optionTypes: [...s.slot.optionTypes], optionValues: [...s.slot.optionValues] },
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

    // ── Catalog picker (CategoryPickerMenu over the MB3D library) ────────────
    const catalog = useMemo(() => getMB3DCatalog(), []);
    const entryByKey = useMemo(() => {
        const m = new Map<string, CatalogEntry>();
        for (const g of catalog) for (const e of g.entries) m.set(`${e.kind}:${e.ref}`, e);
        return m;
    }, [catalog]);
    const pickerCategories: PickerCategory[] = useMemo(
        () => catalog.map((g) => ({ id: g.category, name: g.category })),
        [catalog],
    );
    const pickerItems = (catId: string): PickerItem[] =>
        (catalog.find((g) => g.category === catId)?.entries ?? []).map((e) => ({
            key: `${e.kind}:${e.ref}`,
            label: e.label,
        }));

    const openPicker = (ev: React.MouseEvent, replaceKey?: string) => {
        const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
        setPicker({ x: rect.left, y: rect.bottom + 4, right: rect.right, replaceKey });
    };

    const onPick = (key: string) => {
        const entry = entryByKey.get(key);
        setPicker(null);
        if (!entry) return;
        if (picker?.replaceKey) {
            commit({
                ...draft,
                rows: draft.rows.map((r) => r.key === picker.replaceKey
                    ? { ...r, label: entry.label, kind: entry.kind, ref: entry.ref, slot: slotFromCatalogEntry(entry, r.slot.iterCount) }
                    : r),
            });
        } else {
            const row: SlotRow = {
                key: rowKey(),
                label: entry.label,
                kind: entry.kind,
                ref: entry.ref,
                colorIdx: nextColorIdx(draft.rows),
                slot: slotFromCatalogEntry(entry, DEFAULT_ITER_COUNT),
            };
            commit({ ...draft, rows: [...draft.rows, row] });
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
                slots: draft.rows.map((r) => ({ label: r.label, kind: r.kind, ref: r.ref, slot: { ...r.slot } })),
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
                takes over, repeating <span title="Repeating cycle">↻</span>. Pick from the MB3D library, set counts,
                and <strong className="text-fg">Build</strong> — your camera and look are kept between rebuilds.
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
                        No slots yet — add a base fractal (box, bulb, IFS), then layer transforms or a second fractal.
                    </p>
                )}
                {draft.rows.map((r, i) => (
                    <div
                        key={r.key}
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
                        <button onClick={() => remove(r.key)}
                            className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-red-300 transition-colors shrink-0" title="Remove slot">×</button>
                    </div>
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

            {/* Build */}
            <div className="flex items-center justify-end gap-2">
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
