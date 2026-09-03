/**
 * BuildStage — the v2 Build source (plans/ge-v2-design.md §5.3).
 *
 * Recipe tabs Blend | Sweep, bound to the SAME `paletteGenerator.generatorMode` DDFS
 * param the old shell uses (0 = Blend/Mixer, 1 = Sweep/ColorBox — ids unchanged; value
 * 2, Stops, is never written from here and v2 offers no way back to it — the Stops
 * sub-mode folds into the Working hero instead, §2/§12).
 *
 *   Blend — Source A / Source B (`SourceRow`, lifted out of GeneratorStage — see
 *   `palette/components/GeneratorSourceRow.tsx`) with the three L/C/h blend sliders
 *   (`MixBlend`) between them and Swap.
 *   Sweep — the per-channel start/end/easing sweeps (`ColorBoxControls`, lifted the
 *   same way — see `palette/components/ColorBoxControls.tsx`).
 *
 * NO hero (the Working hero above shows the result live — "live from Build", §2), NO
 * curve editor (Shape lives on Working now), NO Modify/Noise dials (Adjust lives on
 * Working — §12 item 4), no Stops sub-mode, no export block, and no `data-gx-target` /
 * `data-gx-step` anchors — those stay in GeneratorStage for the old shell's
 * GradientDropLayer, which the v2 shell doesn't mount (registerFeatures.ts: NO
 * registerGradientTargets).
 *
 * Filling a slot: the old shell drags a gradient onto the gen-a/gen-b `data-gx-target`
 * anchors; v2 has no drop-target layer for that, so a slot click instead ARMS it
 * (`palette/store/armedTarget.ts`, plans/ge-v2-design.md §3 "armed targets") and the
 * next Browse / My Gradients pick fills it (`GradientExplorerV2App`'s pick effect) —
 * the same mechanism the Working hero's "Mix with…" uses to arm slot B.
 *
 * @see plans/ge-v2-design.md §5.3
 */

import React from 'react';
import { useGeneratorStore, useGeneratorDerived, useGenParam, genEdit } from '../../palette/store/generatorStore';
import { SourceRow } from '../../palette/components/GeneratorSourceRow';
import { MixBlend } from '../../palette/components/MixBlend';
import { ColorBoxControls } from '../../palette/components/ColorBoxControls';
import { useArmedSlot, armSlot } from '../../palette/store/armedTarget';

const RECIPES: { label: string; value: number; title: string }[] = [
  { label: 'Blend', value: 0, title: 'Blend two source gradients, per channel' },
  { label: 'Sweep', value: 1, title: 'Sweep lightness, chroma and hue start → end under an easing curve' },
];

const RecipeToggle: React.FC = () => {
  const [mode, setMode] = useGenParam<number>('generatorMode');
  const m = mode ?? 0;
  return (
    <div className="inline-flex rounded-[10px] overflow-hidden border border-line/20 shrink-0" role="tablist" aria-label="Build recipe">
      {RECIPES.map((r) => (
        <button
          key={r.value}
          onClick={() => m !== r.value && genEdit(() => setMode(r.value))}
          title={r.title}
          aria-pressed={m === r.value}
          className={`px-4 h-8 text-[13px] transition-colors ${
            m === r.value ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
};

export const BuildStage: React.FC = () => {
  // useGeneratorDerived also computes the curve/ghost/fitted-config scopes BuildStage
  // doesn't need — reused anyway rather than duplicating the per-slot ramp math
  // (stripA/stripB) into a second selector; see the file header on lift discipline.
  const { stripA, stripB } = useGeneratorDerived();
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  const swap = useGeneratorStore((s) => s.swap);
  const resetMix = useGeneratorStore((s) => s.resetMix);
  const [genMode] = useGenParam<number>('generatorMode');
  // generatorMode === 2 (Stops) is a value v2 never writes but could still see (a
  // shared document, or a scene saved from the old shell) — fall back to Blend rather
  // than showing a blank recipe.
  const sweep = (genMode ?? 0) === 1;
  const armed = useArmedSlot();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-3">
      <RecipeToggle />
      {sweep ? (
        <ColorBoxControls />
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl">
          <SourceRow which="A" ramp={stripA} preset={slotA} height={48} onSlotClick={() => armSlot('A')} armed={armed === 'A'} />
          <MixBlend onSwap={swap} onReset={resetMix} />
          <SourceRow which="B" ramp={stripB} preset={slotB} height={48} onSlotClick={() => armSlot('B')} armed={armed === 'B'} />
        </div>
      )}
    </div>
  );
};

export default BuildStage;
