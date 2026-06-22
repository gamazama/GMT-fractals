/**
 * GeneratorModifierActions — the actions for the global Modify + Noise mods, rendered
 * as a custom-UI block (`palette-modifier-actions`) at the bottom of the Generator dock
 * tab, directly under the Modify and Noise groups so they all read as one group:
 *   • Bake → curve — fold the global Modify chain into the L/C/h curves + reset the dials
 *   • Reset mods   — reset the global Modify + noise dials to neutral
 *   • Reseed       — new noise seed
 *
 * Actions live in the shared generatorStore (not the slice).
 */

import React from 'react';
import { useGeneratorStore } from '../store/generatorStore';

export const GeneratorModifierActions: React.FC = () => {
  const bakeMainToCurve = useGeneratorStore((s) => s.bakeMainToCurve);
  const resetMainMods = useGeneratorStore((s) => s.resetMainMods);
  const reseedNoise = useGeneratorStore((s) => s.reseedNoise);

  return (
    <div className="px-1 pt-2 mt-1 border-t border-line/10">
      <div className="text-[10px] uppercase tracking-wide text-fg-dim mb-1.5">Modifier actions</div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={bakeMainToCurve}
          title="Bake the global Modify chain into the L/C/h curves, then reset the dials (result unchanged)"
          className="flex-1 text-[11px] px-2 py-1 rounded-sm bg-accent-500/20 text-accent-300 hover:bg-accent-500/30"
        >
          Bake → curve
        </button>
        <button
          onClick={resetMainMods}
          title="Reset the global Modify + noise dials to neutral"
          className="flex-1 text-[11px] px-2 py-1 rounded-sm bg-line/[0.06] text-fg-secondary hover:bg-line/10"
        >
          Reset mods
        </button>
        <button
          onClick={reseedNoise}
          title="Generate a new noise seed"
          className="flex-1 text-[11px] px-2 py-1 rounded-sm bg-line/[0.06] text-fg-secondary hover:bg-line/10"
        >
          Reseed
        </button>
      </div>
    </div>
  );
};

export default GeneratorModifierActions;
