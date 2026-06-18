/**
 * Partial-load filter panel — a small non-blocking floating panel that lets
 * the user pick which parts of a scene file get applied on Load. Opened by
 * the gear icon on the File menu's Load row.
 *
 * Non-modal by design: no backdrop, the viewport stays interactive while it's
 * open. Dismissed via its × button or by clicking "Load…". Filter choices
 * persist (localStorage) and stay in effect for subsequent loads.
 *
 * @see dev/engine-gmt/utils/loadFilter.ts
 */

import React from 'react';
import { FloatingPanel, Z } from './ui';
import { GearIcon } from './Icons';
import {
    useLoadFilterState,
    setLoadFilterGroup,
    resetLoadFilter,
    openLoadFilterPanel,
    closeLoadFilterPanel,
    loadSceneWithFilter,
    isLoadFilterActive,
    isLoadFilterStuck,
    getKeepOptions,
    setKeepOptions,
    type LoadFilterGroup,
} from '../engine-gmt/utils/loadFilter';

/**
 * Custom File-menu Load row: clicking the label loads a file; the gear opens
 * the filter panel. Replaces engine-core's generic `LoadSceneMenuItem`
 * (registered with the same `'load'` id after installSceneIO, which overwrites
 * it). The row only loads through the filter when the user has ticked "keep
 * options" in the panel — otherwise it's a plain full load. The label goes
 * italic + `*` to signal when the sticky filter is in effect.
 */
export const LoadSceneFilterMenuItem: React.FC<{ close: () => void }> = ({ close }) => {
    useLoadFilterState(); // subscribe so the label re-renders live
    const stuck = isLoadFilterStuck();
    return (
        <div className="w-full flex items-center gap-1 px-2 py-1.5 rounded text-xs text-gray-300 hover:bg-white/10 transition-colors">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); loadSceneWithFilter(getKeepOptions()); close(); }}
                className={`flex-1 flex items-center min-w-0 text-left hover:text-white transition-colors ${stuck ? 'italic' : ''}`}
                title={stuck ? 'Loads only the kept parts — click the gear to change' : 'Load a scene file (PNG / GMF)'}
            >
                <span className="truncate">Load Scene (PNG/GMF){stuck ? ' *' : ''}</span>
            </button>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openLoadFilterPanel(); close(); }}
                className={`shrink-0 p-1 rounded transition-colors ${stuck ? 'text-cyan-300' : 'text-gray-500'} hover:text-cyan-300 hover:bg-white/10`}
                title="Choose which parts of the file to load"
                aria-label="Load options"
            >
                <GearIcon />
            </button>
        </div>
    );
};

const GROUPS: { id: LoadFilterGroup; label: string }[] = [
    { id: 'formula', label: 'Formula (+ geometry, interlace, DE)' },
    { id: 'lighting', label: 'Lighting + lights' },
    { id: 'materials', label: 'Materials, AO, reflections' },
    { id: 'atmosphere', label: 'Atmosphere, volumetric' },
    { id: 'gradients', label: 'Gradients' },
    { id: 'color', label: 'Grading, bloom' },
    { id: 'camera', label: 'Camera (pose + saved)' },
    { id: 'animation', label: 'Animation (timeline)' },
];

export const LoadFilterPanel: React.FC = () => {
    const { filter, panelOpen, keepOptions } = useLoadFilterState();

    if (!panelOpen) return null;

    const active = isLoadFilterActive();

    // Non-blocking, corner-anchored panel. Dismissal (outside-click + Escape)
    // is handled by FloatingPanel; we keep our own header so showClose is off.
    // Sits above the dock/topbar (same rung as a stacked modal).
    return (
        <FloatingPanel
            z={Z.modalNested}
            dismissOnOutside
            dismissOnEscape
            showClose={false}
            onClose={closeLoadFilterPanel}
            className="top-12 right-4 w-64 bg-neutral-900 border border-white/10 rounded-md shadow-2xl flex flex-col overflow-hidden"
            bodyClassName=""
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-300">
                    Load — which parts?
                </h3>
                <button
                    onClick={closeLoadFilterPanel}
                    className="text-gray-500 hover:text-gray-300 transition-colors text-[10px] leading-none"
                    aria-label="Close"
                >
                    ✕
                </button>
            </div>

            <div className="px-3 py-2 space-y-1.5">
                {GROUPS.map(g => (
                    <label
                        key={g.id}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={filter[g.id]}
                            onChange={e => setLoadFilterGroup(g.id, e.target.checked)}
                            className="w-3 h-3 accent-cyan-500"
                        />
                        <span className="text-[11px] text-gray-300">{g.label}</span>
                    </label>
                ))}
                <p className="text-[9px] text-gray-500 leading-snug pt-1">
                    {active
                        ? 'Unchecked parts keep their current values.'
                        : 'All parts on — a normal full load.'}
                </p>
            </div>

            <div className="px-3 py-2 border-t border-white/10">
                <label
                    className="flex items-center gap-2 cursor-pointer"
                    title="When on, the Load menu uses these toggles. When off, the menu does a full load and the toggles apply only to the button below."
                >
                    <input
                        type="checkbox"
                        checked={keepOptions}
                        onChange={e => setKeepOptions(e.target.checked)}
                        className="w-3 h-3 accent-cyan-500"
                    />
                    <span className="text-[11px] text-gray-300">Always filter</span>
                </label>
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-white/10 bg-neutral-950">
                <button
                    onClick={resetLoadFilter}
                    className="px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                >
                    Reset
                </button>
                <button
                    onClick={() => { loadSceneWithFilter(true); closeLoadFilterPanel(); }}
                    className="px-3 py-1 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
                >
                    Load…
                </button>
            </div>
        </FloatingPanel>
    );
};
