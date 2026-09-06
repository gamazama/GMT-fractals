/**
 * SourceBands — the SOURCE half of the split hero (owner, 2026-09-03: "the source and
 * result language as a split hero could work for the curves mode too").
 *
 * The hero is the pipeline made visible (ADR-0111): whenever the pipeline is doing
 * something — a Mix, curves, Adjust, an image extraction — the ramp divides into a thin
 * SOURCE band on top and the RESULT band (the stops editor) under it; when it is the
 * identity the bands merge back into one ramp. This component is the top half:
 *
 *   Mix   — A band · the crossfade line (the operator) · B band. The bands are the two
 *           SLOTS: clicking one arms it so the next My Gradients / Browse pick fills it;
 *           the armed band carries the dashed outline the old slot rows had. The line
 *           between them drives Lightness / Chroma / Hue together, starting fully at A;
 *           the per-channel split lives on the Mix stage (MixBlend).
 *   other — one band: the pipeline INPUT (the picked gradient, the raw extracted ramp,
 *           the stops before Adjust) with its name. Never edited here, only seen.
 *
 * Knots and the palette belong to the result; nothing here is a stop.
 */

import React, { useMemo, useRef } from 'react';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { useGeneratorStore, useGeneratorDerived, useGenParam, slotSnapshot, setGeneratorSlice } from '../../palette/store/generatorStore';
import { paramEditStart, paramEditEnd } from '../../palette/store/paramUndoBracket';
import { buildGradientRamp, DEFAULT_SLOT_MODS, DEFAULT_GENERATOR_PARAMS } from '../../palette/core/generatorPipeline';
import { useArmedSlot, armSlot } from '../../palette/store/armedTarget';
import { gradientBarClass } from './ui/bar';
import type { WorkingDerived } from '../../palette/store/workingStore';

/** Band heights (px). Mix borrows a little: A + line + B = 36 over a 40 px result. */
export const SOURCE_BAND_H = 18;
export const MIX_BAND_H = 14;
export const MIX_LINE_H = 8;
export const mixSourceHeight = (): number => MIX_BAND_H * 2 + MIX_LINE_H;

const label = 'absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/90 drop-shadow-[0_0_2px_rgba(0,0,0,.9)] pointer-events-none select-none';

const SlotBand: React.FC<{ which: 'A' | 'B'; ramp: import('../../palette/core/oklab').RGB[]; name: string }> = ({ which, ramp, name }) => {
  const armed = useArmedSlot() === which;
  return (
    <button
      className={`relative w-full block overflow-hidden text-left ${gradientBarClass({ size: 'band', armed })}`}
      style={{ height: MIX_BAND_H }}
      title={armed ? `Slot ${which} takes the next pick (Esc cancels)` : `Slot ${which}: ${name} · click, then pick a gradient for it`}
      onClick={() => armSlot(armed ? null : which)}
    >
      <GradientStrip ramp={ramp} height={MIX_BAND_H} rounded={false} />
      <span className={label}>
        {which} · {name}
      </span>
    </button>
  );
};

/** The operator: one thin line from A to B driving mixL / mixC / mixH together. */
const Crossfade: React.FC = () => {
  const [mixL] = useGenParam<number>('mixL');
  const [mixC] = useGenParam<number>('mixC');
  const [mixH] = useGenParam<number>('mixH');
  const l = mixL ?? 0;
  const even = l === (mixC ?? 0) && l === (mixH ?? 0);
  const v = even ? l : ((mixL ?? 0) + (mixC ?? 0) + (mixH ?? 0)) / 3;
  const track = useRef<HTMLDivElement>(null);
  const setAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    const t = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
    const q = Math.round(t * 100) / 100;
    setGeneratorSlice({ mixL: q, mixC: q, mixH: q });
  };
  return (
    <div
      ref={track}
      className="relative w-full cursor-ew-resize touch-none"
      style={{ height: MIX_LINE_H }}
      title={even ? `${Math.round(v * 100)}% toward B · drag` : `Split by channel (L ${Math.round(l * 100)}% · C ${Math.round((mixC ?? 0) * 100)}% · h ${Math.round((mixH ?? 0) * 100)}%) · drag to blend all three`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        paramEditStart();
        setAt(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) setAt(e.clientX);
      }}
      onPointerUp={(e) => {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        paramEditEnd();
      }}
    >
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/25 rounded-full" />
      <div className="absolute top-1/2 -translate-y-1/2 h-[2px] bg-accent-300 rounded-full" style={{ left: 0, width: `${v * 100}%` }} />
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow ${even ? 'bg-accent-300' : 'bg-transparent'}`}
        style={{ left: `${v * 100}%` }}
      />
      <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 -translate-x-full pr-1.5 text-[11px] text-fg-dim select-none">A</span>
      <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 translate-x-full pl-1.5 text-[11px] text-fg-dim select-none">B</span>
    </div>
  );
};

const MixSources: React.FC = () => {
  const { stripA, stripB } = useGeneratorDerived();
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  return (
    <div className="flex flex-col">
      <SlotBand which="A" ramp={stripA} name={slotSnapshot(slotA).name} />
      <Crossfade />
      <SlotBand which="B" ramp={stripB} name={slotSnapshot(slotB).name} />
    </div>
  );
};

const sourceLabel = (d: WorkingDerived): string => {
  switch (d.input.kind) {
    case 'gradient':
      return d.input.name;
    case 'extract':
      return 'Image';
    case 'stops':
      return 'Stops';
    default:
      return 'Source';
  }
};

export const SourceBands: React.FC<{ derived: WorkingDerived }> = ({ derived }) => {
  const base = derived.base;
  const ramp = useMemo(
    () => (base ? buildGradientRamp(base, base, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, DEFAULT_GENERATOR_PARAMS, null, 1).ramp : []),
    [base],
  );
  if (derived.input.kind === 'build') return <MixSources />;
  if (!ramp.length) return null;
  return (
    <div className={`relative overflow-hidden ${gradientBarClass({ size: 'band' })}`} style={{ height: SOURCE_BAND_H }} title="The source this gradient is made from — the result is below it">
      <GradientStrip ramp={ramp} height={SOURCE_BAND_H} rounded={false} />
      <span className={label}>{sourceLabel(derived)}</span>
    </div>
  );
};

export default SourceBands;
