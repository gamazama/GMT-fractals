/**
 * GeneratorSlotMods — the per-slot source modifiers (hue / chroma / contrast /
 * reverse), rendered on the CANVAS next to each source gradient (not in the dock
 * panel). The four values are hidden DDFS params on paletteGenerator
 * (a/bHueRotate, a/bChroma, a/bContrast, a/bReverse) so they still ride
 * undo/preset; this binds them via useGenParam. Compact inline layout to sit
 * beside the strip.
 */

import React, { useState } from 'react';
import { ScalarInput } from '../../components/inputs/ScalarInput';
import { InlineToggleButtons } from './InlineToggleButtons';
import { useGenParam } from '../store/generatorStore';

const CompactMod: React.FC<{ param: string; label: string; min: number; max: number; step: number; def: number }> = ({
  param,
  label,
  min,
  max,
  step,
  def,
}) => {
  const [v, setV] = useGenParam<number>(param);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 w-12 shrink-0">{label}</span>
      <ScalarInput
        value={v ?? def}
        onChange={setV}
        min={min}
        max={max}
        step={step}
        defaultValue={def}
        variant="compact"
        className="flex-1"
      />
    </div>
  );
};

export const GeneratorSlotMods: React.FC<{ which: 'A' | 'B' }> = ({ which }) => {
  const p = which.toLowerCase();
  const [rev, setRev] = useGenParam<boolean>(`${p}Reverse`);
  const [mir, setMir] = useGenParam<boolean>(`${p}Mirror`);
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500 hover:text-gray-300 self-start"
      >
        <span className="inline-block w-3 text-center">{open ? '▾' : '▸'}</span>
        Slot {which} mods
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          <CompactMod param={`${p}HueRotate`} label="hue" min={-180} max={180} step={1} def={0} />
          <CompactMod param={`${p}Chroma`} label="chroma" min={0} max={2.5} step={0.01} def={1} />
          <CompactMod param={`${p}Contrast`} label="contrast" min={0.2} max={2.5} step={0.01} def={1} />
          <CompactMod param={`${p}Repeats`} label="repeats" min={1} max={8} step={1} def={1} />
          <CompactMod param={`${p}Phase`} label="phase" min={0} max={1} step={0.01} def={0} />
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
