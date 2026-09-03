/**
 * BuildStage — the v2 MIX stage (plans/ge-v2-design.md §5.3; owner 2026-09-03).
 *
 * The recipe itself is drawn in the HERO: the A and B bands (the slots) with the crossfade
 * between them, over the result (gradient-explorer/v2/SourceBands.tsx). This stage is what
 * is left: one line — Swap, and "Split by channel", which opens the three per-channel
 * faders (`MixBlend`, the old Generator's) for A's lightness with B's colour and the like —
 * and then the Browse wall, so a pick for the armed band is right here. Sweep (ColorBox)
 * is gone from v2; `ColorBoxControls` stays for the old shell's GeneratorStage.
 *
 * On this tab a pick always fills a band: B unless A is armed (the shell's pick effect).
 *
 * @see plans/ge-v2-design.md §5.3
 */

import React, { useState } from 'react';
import { useGeneratorStore } from '../../palette/store/generatorStore';
import { MixBlend } from '../../palette/components/MixBlend';
import { useArmedSlot } from '../../palette/store/armedTarget';
import { BrowseStage } from './BrowseStage';

export const BuildStage: React.FC = () => {
  const swap = useGeneratorStore((s) => s.swap);
  const resetMix = useGeneratorStore((s) => s.resetMix);
  const armed = useArmedSlot();
  const [splitOpen, setSplitOpen] = useState(false);
  const btn = 'h-7 px-3 rounded-lg text-[12px] border border-line/20 text-fg hover:border-accent-400 hover:text-accent-300 transition-colors';

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 px-6 pb-2 flex items-center gap-2 flex-wrap">
        <button className={btn} onClick={swap} title="Swap A and B">
          ⇅ Swap
        </button>
        <button className={`${btn} ${splitOpen ? 'border-accent-400 text-accent-300' : ''}`} onClick={() => setSplitOpen((o) => !o)} title="Blend lightness, chroma and hue separately">
          Split by channel {splitOpen ? '▴' : '▾'}
        </button>
        <span className="text-[12px] text-fg-dim ml-2">
          {armed === 'A'
            ? 'Band A takes the next pick — from My Gradients below or the wall. Esc cancels.'
            : 'Picks fill band B. Click band A above to fill A instead. Drag the line between them to blend.'}
        </span>
      </div>
      {splitOpen && (
        <div className="shrink-0 px-6 pb-2">
          <MixBlend onSwap={swap} onReset={resetMix} height={60} />
        </div>
      )}
      <BrowseStage />
    </div>
  );
};

export default BuildStage;
