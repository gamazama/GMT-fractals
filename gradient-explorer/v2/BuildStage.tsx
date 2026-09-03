/**
 * BuildStage — the v2 MIX source (plans/ge-v2-design.md §5.3; owner S3 review 2026-09-03:
 * "build would be — mix", Sweep scrapped).
 *
 * Source A / Source B (`SourceRow`, lifted out of GeneratorStage — see
 * `palette/components/GeneratorSourceRow.tsx`) with the three L/C/h blend sliders
 * (`MixBlend`) between them and Swap. The recipe is always the two-source mixer: the shell
 * writes `generatorMode = 0` on entering Mix, and there is no Sweep (ColorBox) here any
 * more — `ColorBoxControls` stays for the old shell's GeneratorStage.
 *
 * How the slots fill (owner): entering Mix puts the HERO's gradient into A and the most
 * recent OTHER My Gradients entry into B (falling back to whatever B held), and arms B, so
 * a bin click swaps B in; a Browse pick fills B once. Clicking a slot arms it explicitly
 * (`palette/store/armedTarget.ts`) — the same mechanism, no drop layer.
 *
 * NO hero (the Working hero above shows the result live — "live from Mix", §2), NO curve
 * editor (Shape lives on Working), NO Modify/Noise dials (Adjust lives on Working), no
 * Stops sub-mode, no export block, and no `data-gx-target` / `data-gx-step` anchors —
 * those stay in GeneratorStage for the old shell's GradientDropLayer, which the v2 shell
 * doesn't mount (registerFeatures.ts: NO registerGradientTargets).
 *
 * @see plans/ge-v2-design.md §5.3
 */

import React from 'react';
import { useGeneratorStore, useGeneratorDerived } from '../../palette/store/generatorStore';
import { SourceRow } from '../../palette/components/GeneratorSourceRow';
import { MixBlend } from '../../palette/components/MixBlend';
import { useArmedSlot, armSlot } from '../../palette/store/armedTarget';

export const BuildStage: React.FC = () => {
  // useGeneratorDerived also computes the curve/ghost/fitted-config scopes BuildStage
  // doesn't need — reused anyway rather than duplicating the per-slot ramp math
  // (stripA/stripB) into a second selector; see the file header on lift discipline.
  const { stripA, stripB } = useGeneratorDerived();
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  const swap = useGeneratorStore((s) => s.swap);
  const resetMix = useGeneratorStore((s) => s.resetMix);
  const armed = useArmedSlot();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-w-2xl">
        <SourceRow which="A" ramp={stripA} preset={slotA} height={48} onSlotClick={() => armSlot(armed === 'A' ? null : 'A')} armed={armed === 'A'} />
        <MixBlend onSwap={swap} onReset={resetMix} />
        <SourceRow which="B" ramp={stripB} preset={slotB} height={48} onSlotClick={() => armSlot(armed === 'B' ? null : 'B')} armed={armed === 'B'} />
      </div>
      <div className="text-[12px] text-fg-dim max-w-2xl">
        {armed
          ? `Slot ${armed} takes the next pick — click a gradient in My Gradients below, or go to Browse and pick one there. Esc cancels.`
          : 'Click a slot, then pick a gradient for it from My Gradients or Browse.'}
      </div>
    </div>
  );
};

export default BuildStage;
