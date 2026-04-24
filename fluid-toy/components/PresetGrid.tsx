/**
 * PresetGrid — chip grid for the Presets tab.
 *
 * Each chip corresponds to one of the 7 curated reference presets in
 * `toy-fluid/presets.ts`. Clicking applies the preset by dispatching
 * every affected slice setter (see `presets/apply.ts`), then resets
 * the fluid fields so the new parameters start from a clean grid.
 *
 * The engine handle reaches us via a small `engineHandles` registry
 * populated by FluidToyApp — we can't use context because DDFS
 * customUI components mount inside AutoFeaturePanel, which lives in
 * a sibling subtree.
 */

import React from 'react';
import { PRESETS } from '../presets/data';
import { applyRefPreset } from '../presets/apply';
import { appEngine } from '../engineHandles';

export const PresetGrid: React.FC = () => {
    return (
        <div className="flex flex-col gap-3 py-2">
            <div className="text-[10px] text-gray-500 leading-snug">
                Each preset is a curated fractal ↔ fluid coupling. Applying one resets the grid and restores known params.
            </div>
            <div className="grid grid-cols-2 gap-1">
                {PRESETS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        title={p.desc}
                        onClick={() => {
                            applyRefPreset(p);
                            // Fluid fields (dye + velocity) get cleared so the
                            // new preset doesn't inherit stale texture state.
                            appEngine.ref.current?.resetFluid();
                        }}
                        className="px-2 py-1 text-[10px] rounded border bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-colors text-left"
                    >
                        {p.name}
                    </button>
                ))}
            </div>
        </div>
    );
};
