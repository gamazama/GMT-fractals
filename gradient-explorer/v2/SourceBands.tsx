/**
 * SourceBands — the SOURCE half of the split hero (owner, 2026-09-03: "the source and
 * result language as a split hero could work for the curves mode too").
 *
 * The hero is the pipeline made visible (ADR-0111): whenever the pipeline is doing
 * something — a Mix, curves, Adjust, an image extraction — the ramp divides into a thin
 * SOURCE band on top and the RESULT band (the stops editor) under it; when it is the
 * identity the bands merge back into one ramp. This component is the top half:
 *
 *   Mix   — band A ALONE, the top half of the ramp, no label and no divider (owner,
 *           2026-09-07: "the hero ramp splits cleanly into two"; the result is the bottom
 *           half, the same total height as an unsplit ramp). Band B lives in the tray's
 *           Mix face (`MixBandB`, exported from here) with the three L / C / h sliders; the
 *           crossfade line is gone. Clicking a band arms it so the next My Gradients /
 *           Browse pick fills it; the armed band carries the dashed outline (V3).
 *   other — one band: the pipeline INPUT (the picked gradient, the raw extracted ramp,
 *           the stops before Adjust) with its name. Never edited here, only seen.
 *
 * Knots and the palette belong to the result; nothing here is a stop.
 */

import React, { useMemo } from 'react';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { useGeneratorStore, useGeneratorDerived, slotSnapshot } from '../../palette/store/generatorStore';
import { buildGradientRamp, DEFAULT_SLOT_MODS, DEFAULT_GENERATOR_PARAMS } from '../../palette/core/generatorPipeline';
import { useArmedSlot, armSlot } from '../../palette/store/armedTarget';
import { gradientBarClass } from './ui/bar';
import type { RGB } from '../../palette/core/oklab';

/** The strip chrome's bar language for the SOURCE half: 8 px gutters painted with the ramp's
 *  two end colours (the knots' room, so the gradient reads edge to edge) and rounded top
 *  corners — the result half under it rounds the bottom, so the two read as one bar. */
const SourceBar: React.FC<{ ramp: RGB[]; children: React.ReactNode }> = ({ ramp, children }) => {
  const first = ramp[0];
  const last = ramp[ramp.length - 1];
  const bg = first && last ? `linear-gradient(to right, rgb(${first.r} ${first.g} ${first.b}) 50%, rgb(${last.r} ${last.g} ${last.b}) 50%)` : undefined;
  return (
    <div className="rounded-t-[10px] overflow-hidden px-2" style={{ backgroundImage: bg }}>
      {children}
    </div>
  );
};
import type { WorkingDerived } from '../../palette/store/workingStore';

/** Band heights (px). Mix splits the 60 px ramp in two: 30 source (band A) over 30 result. */
export const SOURCE_BAND_H = 18;
export const MIX_SOURCE_H = 30;
export const MIX_RESULT_H = 30;
export const mixSourceHeight = (): number => MIX_SOURCE_H;

const label = 'absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/90 drop-shadow-[0_0_2px_rgba(0,0,0,.9)] pointer-events-none select-none';

/** One Mix slot as a bar: click arms it (the next pick fills it), armed = dashed violet.
 *  `clean` = the hero's band A: no hairline, square corners (it is the ramp's top half). */
const SlotBand: React.FC<{ which: 'A' | 'B'; ramp: import('../../palette/core/oklab').RGB[]; name: string; height: number; clean?: boolean; onClick?: () => void; title?: string }> = ({ which, ramp, name, height, clean = false, onClick, title }) => {
  const armed = useArmedSlot() === which;
  const cls = clean
    ? `relative w-full block overflow-hidden text-left ${armed ? 'outline outline-2 outline-dashed outline-gx-armed -outline-offset-2' : ''}`
    : `relative w-full block overflow-hidden text-left rounded-[10px] ${gradientBarClass({ size: 'band', armed })}`;
  return (
    <button
      className={cls}
      style={{ height }}
      data-gx-mix-band={which === 'A' ? 'this' : 'other'}
      title={title ?? (armed ? 'Takes the next pick — from the wall or My Gradients (Esc cancels)' : which === 'A' ? `${name} · click, then pick a gradient to replace it` : `Mixing with ${name} · click, then pick another`)}
      onClick={onClick ?? (() => armSlot(armed ? null : which))}
    >
      <GradientStrip ramp={ramp} height={height} rounded={false} />
    </button>
  );
};

/** The gradient you're mixing with, for the tray's Mix face — the bar the next pick fills.
 *  No A / B language anywhere (owner, 2026-09-07): the hero's top half is YOUR gradient, this
 *  bar is the OTHER one; `which` is only the store's slot name. */
export const MixBandB: React.FC<{ height?: number }> = ({ height = 36 }) => {
  const { stripB } = useGeneratorDerived();
  const slotB = useGeneratorStore((s) => s.slotB);
  return <SlotBand which="B" ramp={stripB} name={slotSnapshot(slotB).name} height={height} />;
};

/** The hero's top half in Mix: YOUR gradient. With the bake gesture (C.9) its click keeps
 *  it — cancels the mix — rather than arming it for a replacement pick (that gesture went
 *  with C.9; replace = cancel, then pick). */
const MixSources: React.FC<{ onKeepSource?: () => void }> = ({ onKeepSource }) => {
  const { stripA } = useGeneratorDerived();
  const slotA = useGeneratorStore((s) => s.slotA);
  const name = slotSnapshot(slotA).name;
  return (
    <SourceBar ramp={stripA}>
      <SlotBand
        which="A"
        ramp={stripA}
        name={name}
        height={MIX_SOURCE_H}
        clean
        onClick={onKeepSource}
        title={onKeepSource ? `${name} — keep it as it is: cancel the mix (the face closes)` : undefined}
      />
    </SourceBar>
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

export const SourceBands: React.FC<{ derived: WorkingDerived; onKeepSource?: () => void }> = ({ derived, onKeepSource }) => {
  const base = derived.base;
  const ramp = useMemo(
    () => (base ? buildGradientRamp(base, base, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, DEFAULT_GENERATOR_PARAMS, null, 1).ramp : []),
    [base],
  );
  if (derived.input.kind === 'build') return <MixSources onKeepSource={onKeepSource} />;
  if (!ramp.length) return null;
  const Tag = onKeepSource ? 'button' : 'div';
  return (
    <SourceBar ramp={ramp}>
      <Tag
        className="relative overflow-hidden w-full block text-left"
        style={{ height: SOURCE_BAND_H }}
        title={onKeepSource ? 'The source — click to keep it as it is: what the face did is dropped (the face closes)' : 'The source this gradient is made from — the result is below it'}
        onClick={onKeepSource}
      >
        <GradientStrip ramp={ramp} height={SOURCE_BAND_H} rounded={false} />
        <span className={label}>{sourceLabel(derived)}</span>
      </Tag>
    </SourceBar>
  );
};

export default SourceBands;
