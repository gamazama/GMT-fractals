/**
 * GeneratorSlotMods — the per-slot source modifiers (hue / chroma / contrast /
 * repeats / phase / reverse / mirror). Rendered as a small ⚙ trigger on the source
 * row that opens a SEMI-FLOATING panel beside the gradient (absolute-positioned, so
 * it never expands the layout). The panel uses the SAME full GenParamSlider the dock
 * uses, with keyframe diamonds, plus Bake (fold mods into the source ramp + reset)
 * and Reset buttons. The values are hidden DDFS params (ride undo/preset/animation).
 */

import React, { useEffect, useRef, useState } from 'react';
import { InlineToggleButtons } from './InlineToggleButtons';
import { GenParamSlider } from './GenParamSlider';
import { useGenParam, useGeneratorStore } from '../store/generatorStore';

export const GeneratorSlotMods: React.FC<{ which: 'A' | 'B' }> = ({ which }) => {
  const p = which.toLowerCase();
  const [rev, setRev] = useGenParam<boolean>(`${p}Reverse`);
  const [mir, setMir] = useGenParam<boolean>(`${p}Mirror`);
  const bakeSlot = useGeneratorStore((s) => s.bakeSlot);
  const resetSlot = useGeneratorStore((s) => s.resetSlot);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Slot ${which} modifiers`}
        className={`text-[10px] px-1.5 py-0.5 rounded-sm transition-colors ${
          open ? 'bg-cyan-500/25 text-cyan-100' : 'bg-white/[0.06] text-gray-400 hover:text-gray-200'
        }`}
      >
        ⚙ mods
      </button>
      {open && (
        <div className="absolute left-full top-0 ml-2 z-30 w-56 rounded-md border border-white/15 bg-zinc-900/95 backdrop-blur-sm shadow-xl p-2 flex flex-col gap-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[10px] uppercase tracking-wide text-gray-500">Slot {which}</span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => bakeSlot(which)}
                title="Bake the modifiers into the source ramp and reset the dials"
                className="text-[10px] px-1.5 py-0.5 rounded-sm bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
              >
                Bake
              </button>
              <button
                onClick={() => resetSlot(which)}
                title="Reset the slot modifiers to neutral"
                className="text-[10px] px-1.5 py-0.5 rounded-sm bg-white/[0.06] text-gray-300 hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </div>
          <GenParamSlider param={`${p}HueRotate`} label="Hue rotate" min={-180} max={180} step={1} def={0} />
          <GenParamSlider param={`${p}Chroma`} label="Chroma" min={0} max={2.5} step={0.01} def={1} />
          <GenParamSlider param={`${p}Contrast`} label="Contrast" min={0.2} max={2.5} step={0.01} def={1} />
          <GenParamSlider param={`${p}Repeats`} label="Repeats" min={1} max={8} step={1} def={1} />
          <GenParamSlider param={`${p}Phase`} label="Phase" min={0} max={1} step={0.01} def={0} />
          <InlineToggleButtons
            items={[
              { key: 'rev', label: 'reverse', active: !!rev },
              { key: 'mir', label: 'mirror', active: !!mir },
            ]}
            onToggle={(k) => (k === 'rev' ? setRev(!rev) : setMir(!mir))}
          />
        </div>
      )}
    </div>
  );
};

export default GeneratorSlotMods;
