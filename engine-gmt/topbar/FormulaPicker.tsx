/**
 * FormulaPicker — topbar dropdown listing the 42 FractalDefinitions
 * from engine-gmt's FractalRegistry. Click an entry to fire the full
 * `setFormula` pipeline (see store/engineStore.ts): clone defaultPreset,
 * preserve compile-time engine params, load into store, kick a recompile
 * gated by CompileGate.
 *
 * Minimal for now — a button showing the current formula name + a
 * popover with a type-to-filter list. Thumbnails are intentionally
 * skipped to keep this first pass small; GMT's LoadingScreen had a
 * richer hover-preview that can land later.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { registry } from '../engine/FractalRegistry';
import { ChevronDown } from '../../components/Icons';

export const FormulaPicker: React.FC = () => {
    const formula = useEngineStore((s) => s.formula);
    const setFormula = useEngineStore((s) => s.setFormula);

    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Registry populated at module-load; re-read when the popover opens
    // in case dynamic registrations happen later (fractal-toy pattern).
    const allFormulas = useMemo(() => registry.getAll(), [open]);

    const matches = useMemo(() => {
        if (!filter) return allFormulas;
        const q = filter.toLowerCase();
        return allFormulas.filter(
            (f) =>
                f.id.toLowerCase().includes(q)
                || f.name.toLowerCase().includes(q)
                || f.tags?.some((t) => t.toLowerCase().includes(q)),
        );
    }, [allFormulas, filter]);

    useEffect(() => {
        if (!open) return;
        // Focus the filter input on open for keyboard-first workflow.
        const id = setTimeout(() => inputRef.current?.focus(), 10);
        const handler = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
                setFilter('');
            }
        };
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setOpen(false); setFilter(''); }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', keyHandler);
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', keyHandler);
        };
    }, [open]);

    const pick = (id: string) => {
        setFormula(id);
        setOpen(false);
        setFilter('');
    };

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                title="Switch formula"
                className={`flex items-center gap-1 text-[11px] font-bold transition-colors border-b border-dashed pb-0.5 ${
                    open
                        ? 'text-cyan-300 border-cyan-500/60'
                        : 'text-cyan-400 border-cyan-500/30 hover:text-white hover:border-cyan-400'
                }`}
            >
                <span>[{formula || '—'}]</span>
                <span className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                </span>
            </button>

            {open && (
                <div
                    className="absolute top-full left-0 mt-2 w-72 bg-black/95 border border-white/15 rounded-lg shadow-2xl z-50 p-1 flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filter…"
                        className="w-full bg-black/60 border border-white/10 rounded text-xs px-2 py-1.5 mb-1 text-gray-200 placeholder-gray-600 outline-none focus:border-cyan-500/40"
                    />
                    <div className="max-h-80 overflow-y-auto custom-scroll">
                        {matches.length === 0 && (
                            <div className="px-2 py-2 text-[10px] text-gray-600 italic">No match.</div>
                        )}
                        {matches.map((f) => {
                            const active = f.id === formula;
                            return (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => pick(f.id)}
                                    className={`w-full flex items-baseline justify-between gap-2 px-2 py-1.5 text-left rounded hover:bg-white/10 text-xs transition-colors ${
                                        active ? 'text-cyan-300 bg-cyan-900/20' : 'text-gray-300 hover:text-white'
                                    }`}
                                >
                                    <span className="truncate font-medium">{f.name}</span>
                                    <span className="text-[9px] text-gray-600 font-mono">{f.id}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
