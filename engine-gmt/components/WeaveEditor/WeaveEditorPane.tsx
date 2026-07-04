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
 *  - Structure edits (add/remove/reorder/count) have editor-local undo/redo,
 *    separate from DDFS param undo.
 *  - Reordering slots while keyframed formula-param tracks exist shows a
 *    warning (packed lanes may retarget) — a transfer tool comes later.
 *  - Schedule kinds are a user choice: counts ("Sequence", baked) ships now;
 *    modulo ("Rhythm", live + keyframable) is rendered but arrives with its
 *    runtime uniforms.
 *  - weaveSource rides on the built def so the weave reopens for re-editing.
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

interface SlotRow {
    key: string;
    label: string;
    kind: 'intern' | 'decompiled';
    ref: string | number;
    slot: MB3DFormulaSlot;
}

interface WeaveDraft {
    title: string;
    rows: SlotRow[];
}

// Module-scoped draft — survives modal close/reopen within a session (the
// Workshop draft pattern; cleared on page reload).
let weaveDraft: WeaveDraft | null = null;
let rowSeq = 0;
const rowKey = () => `wrow${rowSeq++}`;

const cloneRows = (rows: SlotRow[]): SlotRow[] =>
    rows.map((r) => ({ ...r, slot: { ...r.slot, optionTypes: [...r.slot.optionTypes], optionValues: [...r.slot.optionValues] } }));

/** Hydrate rows from a reopened weave's persisted source. */
function rowsFromWeaveSource(ws: NonNullable<FractalDefinition['weaveSource']>): SlotRow[] {
    return ws.slots.map((s) => ({
        key: rowKey(),
        label: s.label,
        kind: s.kind,
        ref: s.ref,
        slot: { ...s.slot, optionTypes: [...s.slot.optionTypes], optionValues: [...s.slot.optionValues] },
    }));
}

const DEFAULT_ITER_COUNT = 2;

export function WeaveEditorPane() {
    const store = useEngineStore() as any;

    const [draft, setDraft] = useState<WeaveDraft>(() => {
        if (weaveDraft && weaveDraft.rows.length > 0) return { title: weaveDraft.title, rows: cloneRows(weaveDraft.rows) };
        // Reopening a weave formula: hydrate from its persisted source.
        const ws = (registry.get(store.formula) as FractalDefinition | undefined)?.weaveSource;
        if (ws) return { title: ws.title, rows: rowsFromWeaveSource(ws) };
        return { title: 'My Weave', rows: [] };
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
    useEffect(() => () => { weaveDraft = { title: liveRef.current.title, rows: cloneRows(liveRef.current.rows) }; }, []);

    const commit = (next: WeaveDraft) => {
        past.current.push({ title: draft.title, rows: cloneRows(draft.rows) });
        if (past.current.length > 50) past.current.shift();
        future.current = [];
        setDraft(next);
    };
    const undo = () => {
        const prev = past.current.pop();
        if (!prev) return;
        future.current.push({ title: draft.title, rows: cloneRows(draft.rows) });
        setDraft(prev);
    };
    const redo = () => {
        const next = future.current.pop();
        if (!next) return;
        past.current.push({ title: draft.title, rows: cloneRows(draft.rows) });
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
    const move = (key: string, dir: -1 | 1) => {
        const i = draft.rows.findIndex((r) => r.key === key);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= draft.rows.length) return;
        const rows = [...draft.rows];
        [rows[i], rows[j]] = [rows[j], rows[i]];
        if (hasFormulaTracks()) setReorderWarn(true);
        commit({ ...draft, rows });
    };
    const remove = (key: string) => {
        if (hasFormulaTracks()) setReorderWarn(true);
        commit({ ...draft, rows: draft.rows.filter((r) => r.key !== key) });
    };

    // ── Live schedule preview ────────────────────────────────────────────────
    const iterCounts = draft.rows.map((r) => r.slot.iterCount);
    const activeCount = iterCounts.filter((n) => n > 0).length;
    const plan = useMemo(() => {
        if (activeCount === 0) return null;
        let endTo = iterCounts.length - 1;
        while (endTo > 0 && iterCounts[endTo] === 0) endTo--;
        return buildCountsPlan({ iterCounts, endTo, repeatFrom: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iterCounts.join(',')]);

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
            const weaveSource: FractalDefinition['weaveSource'] = {
                version: 1,
                title: draft.title,
                slots: draft.rows.map((r) => ({ label: r.label, kind: r.kind, ref: r.ref, slot: { ...r.slot } })),
                schedule: { kind: 'counts' },
            };
            const res = loadUserWeave(slots, draft.title || 'My Weave', weaveSource);
            if (!res.ok) {
                setStatus({ kind: 'error', text: res.reason || 'This weave is not supported.' });
                showToast(res.reason || 'Weave build failed.', 'error', 6000);
            } else {
                setReorderWarn(false);
                setStatus({ kind: 'ok', text: `Built ${res.summary}. Parameter sliders live in the Formula panel; camera and look kept.` });
                showToast(`Weave built: ${res.summary}`, 'info', 4000);
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setStatus({ kind: 'error', text: `Build failed: ${msg}` });
        } finally {
            setBusy(false);
        }
    };

    const clearAll = () => commit({ ...draft, rows: [] });

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            <p className="text-xs text-fg-muted leading-relaxed">
                Weave formulas across the iteration loop: each slot runs for its count of iterations, then the next
                takes over, repeating <span title="Repeating cycle">↻</span>. Pick from the MB3D library, set counts,
                and <strong className="text-fg">Build</strong> — your camera and look are kept between rebuilds.
            </p>

            {/* Title + undo/redo */}
            <div className="flex items-center gap-2">
                <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Weave name"
                    className="flex-1 rounded bg-surface-sunken border border-line/10 px-2 py-1 text-[11px] text-fg outline-none focus:border-accent-500/40"
                    spellCheck={false}
                />
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
                    <div key={r.key} className="flex items-center gap-1.5 rounded-lg border border-line/10 bg-surface-sunken/60 px-2 py-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SLOT_COLORS[i % SLOT_COLORS.length] }} />
                        <button onClick={(e) => openPicker(e, r.key)}
                            className="flex-1 text-left text-[11px] text-fg truncate hover:text-accent-300 transition-colors"
                            title={`Change formula (${r.label})`}>
                            {r.label}
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0" title="Iterations this slot runs per visit">
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
                        <button onClick={() => move(r.key, -1)} disabled={i === 0}
                            className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg disabled:opacity-30 transition-colors" title="Move up">↑</button>
                        <button onClick={() => move(r.key, +1)} disabled={i === draft.rows.length - 1}
                            className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-fg disabled:opacity-30 transition-colors" title="Move down">↓</button>
                        <button onClick={() => remove(r.key)}
                            className="w-5 h-5 text-[11px] rounded border bg-line/[0.04] border-line/15 text-fg-muted hover:text-red-300 transition-colors" title="Remove slot">×</button>
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
                            <button className="px-2 py-0.5 text-[10px] rounded border border-accent-500/40 bg-accent-500/10 text-accent-300" title="Baked iteration sequence — structure edits rebuild the shader">
                                Sequence
                            </button>
                            <button disabled
                                className="px-2 py-0.5 text-[10px] rounded border border-line/10 bg-line/[0.04] text-fg-tertiary opacity-50 cursor-not-allowed"
                                title="Live rhythm (every Nth iteration, keyframable, no rebuild) — arriving soon">
                                Rhythm
                            </button>
                        </div>
                    </div>
                    <LoopStrip plan={plan} labels={draft.rows.map((r) => r.label)} />
                    <p className="text-[10px] text-fg-tertiary">
                        cycle = {plan.cycleLen} iteration{plan.cycleLen === 1 ? '' : 's'}
                        {plan.introLen > 0 ? ` after ${plan.introLen} intro` : ''} · scene iterations set how many times it plays
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
