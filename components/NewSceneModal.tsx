/**
 * New Scene wizard — single-screen composer for starting fresh.
 *
 * Triggered from the File menu's "New Scene" item. Lets the user pick a
 * formula and (in future iterations) optional setup (geometry, interlace
 * secondary, shading copy). Commits via engineStore.loadScene routing
 * through the existing compile gate.
 *
 * Build status: SHELL milestone — Formula section only. Geometry, Interlace,
 * Shading sections come in follow-ups per dev/plans/new-scene-spec.md.
 *
 * @see dev/plans/new-scene-spec.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useEngineStore } from '../store/engineStore';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { FormulaPicker } from '../engine-gmt/components/FormulaPicker/FormulaPicker';
import type { FormulaType } from '../engine-gmt/types';

export const NewSceneModal: React.FC = () => {
    const newSceneOpen = useEngineStore(s => (s as any).newSceneOpen as boolean);
    const closeNewScene = useEngineStore(s => (s as any).closeNewScene as () => void);
    const currentFormula = useEngineStore(s => s.formula);
    const loadScene = useEngineStore(s => (s as any).loadScene as (args: { preset: any }) => void);

    // Local composer state. Reset every time the modal opens (user starts fresh).
    const [pickedFormula, setPickedFormula] = useState<FormulaType | undefined>(undefined);

    useEffect(() => {
        if (newSceneOpen) setPickedFormula(currentFormula as FormulaType);
    }, [newSceneOpen, currentFormula]);

    // Esc to cancel — same affordance as the [Cancel] button.
    useEffect(() => {
        if (!newSceneOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeNewScene();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [newSceneOpen, closeNewScene]);

    const handleCreate = useCallback(() => {
        if (!pickedFormula) return;
        const def = registry.get(pickedFormula);
        if (!def) {
            console.warn(`[NewSceneModal] unknown formula '${pickedFormula}'`);
            return;
        }
        // Build target preset: start from the formula's defaultPreset, name as
        // "Untitled Scene". loadScene routes through the existing compile gate
        // (CONFIG → CONFIG_DONE) + camera teleport + history reset.
        // Geometry / Interlace / Shading-copy / animation reset / savedCameras
        // clearing come in follow-up sections per the spec.
        const targetPreset = {
            ...def.defaultPreset,
            name: 'Untitled Scene',
            version: 0,
        };
        loadScene({ preset: targetPreset });
        closeNewScene();
    }, [pickedFormula, loadScene, closeNewScene]);

    if (!newSceneOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-6"
            onClick={(e) => { if (e.target === e.currentTarget) closeNewScene(); }}
        >
            <div className="bg-neutral-900 border border-white/10 rounded-md shadow-2xl w-[720px] max-w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-gray-200 tracking-tight">New Scene</h2>
                    <button
                        onClick={closeNewScene}
                        className="text-gray-500 hover:text-gray-300 transition-colors text-[10px]"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Body — Formula section (more sections to come) */}
                <div className="flex-1 overflow-auto p-4">
                    <section>
                        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            Formula
                        </h3>
                        <div className="border border-white/5 rounded bg-white/[0.02]" style={{ height: 420 }}>
                            <FormulaPicker
                                variant="inline"
                                value={pickedFormula}
                                onCommit={(c) => {
                                    if (c.action === 'select') setPickedFormula(c.id as FormulaType);
                                    // 'launch' (Workshop): not relevant in this context. The
                                    // wizard hides specialEntries to avoid showing Workshop.
                                }}
                                specialEntries={['modular']}
                                showHoverPreview={true}
                            />
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-neutral-950">
                    <button
                        onClick={closeNewScene}
                        className="px-3 py-1 text-[10px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!pickedFormula}
                        className="px-3 py-1 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                        Create Scene
                    </button>
                </div>
            </div>
        </div>
    );
};
