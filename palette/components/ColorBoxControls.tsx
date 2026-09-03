/**
 * ColorBoxControls — the ColorBox (v2: Sweep) per-channel L/C/h sweep controls, LIFTED
 * out of `GeneratorStage.tsx` (2026-09-03, GE v2 S3) so the v2 `BuildStage`'s Sweep
 * recipe can reuse it without a parallel copy. GeneratorStage keeps importing
 * `ColorBoxControls` from here — same component, same JSX — so its ColorBox mode
 * renders byte-for-byte as before.
 *
 * Per-channel L / C / h sweeps with colour-ramp tracks (the slider TRACK ITSELF shows
 * what the value does), an easing chooser per channel, and the interim
 * "Fit from gradient…" entry (GradientSourcePicker) that approximates an existing
 * gradient as ColorBox sweeps.
 */

import React, { useMemo, useState } from 'react';
import { useGenParam, genEdit, useGeneratorStore, useColorBoxParams } from '../store/generatorStore';
import { GenParamSlider } from './GenParamSlider';
import { easingThumb } from './easingThumb';
import { EasingPicker } from './EasingPicker';
import { EASING_NAMES } from '../core/easings';
import { oklabToRgbSafe } from '../core/oklab';
import { GradientSourcePicker } from './GradientSourcePicker';

const DEG2RAD_UI = Math.PI / 180;
const cssRgb = (c: { r: number; g: number; b: number }) => `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)})`;

/**
 * Build a CSS linear-gradient sweeping ONE OKLCh channel across its slider range while
 * holding the other two fixed — so the slider track itself shows what the value does
 * (a hue rainbow, a dark→light ramp, a grey→vivid ramp). Gamut-safe per stop.
 */
const channelGradient = (
  channel: 'L' | 'C' | 'h',
  range: { min: number; max: number },
  held: { L: number; C: number; h: number }, // h in degrees
  steps = 12,
): string => {
  const stops: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = range.min + ((range.max - range.min) * i) / steps;
    const L = channel === 'L' ? v : held.L;
    const C = channel === 'C' ? v : held.C;
    const hRad = (channel === 'h' ? v : held.h) * DEG2RAD_UI;
    stops.push(cssRgb(oklabToRgbSafe({ L: Math.max(0, Math.min(1, L)), a: C * Math.cos(hRad), b: C * Math.sin(hRad) })));
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
};

/** Easing-curve chooser bound to a cb*Easing int param (index into EASING_NAMES).
 *  Shows the current curve as a mini graph + name; click opens the visual EasingPicker
 *  (raw names like "inOutQuint" tell users nothing — the graph does). */
const EasingSelect: React.FC<{ param: string }> = ({ param }) => {
  const [v, setV] = useGenParam<number>(param);
  const idx = v ?? 0;
  const name = EASING_NAMES[idx] ?? EASING_NAMES[0];
  const [open, setOpen] = useState(false);
  const thumb = easingThumb(name, 28, 18);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={`Easing: ${name} — click to change`}
        className="ml-auto flex items-center gap-1.5 text-[11px] bg-surface-raised text-fg-secondary rounded-sm pl-1 pr-1.5 py-0.5 ring-1 ring-line/10 hover:ring-accent-500/40 transition"
      >
        {thumb && <img src={thumb} width={28} height={18} alt="" className="rounded-[1px]" />}
        <span className="truncate max-w-[88px]">{name}</span>
      </button>
      {open && <EasingPicker value={idx} onChange={(i) => genEdit(() => setV(i))} onClose={() => setOpen(false)} />}
    </>
  );
};

/** One OKLCh channel's sweep controls: start + end sliders (full GMT feel, keyframable)
 *  with a meaningful colour-ramp track, and the easing chooser. start/end/easing are all
 *  real DDFS params. `track` is the channel's colour ramp (shared by both sliders). */
const ColorBoxChannelRow: React.FC<{
  // Param-name letter — UPPERCASE (cbLStart / cbCStart / cbHStart) to match the keys
  // registered in paletteGenerator.ts and read in generatorStore.sliceToColorBox.
  ch: 'L' | 'C' | 'H';
  label: string;
  min: number;
  max: number;
  step: number;
  def: { start: number; end: number };
  track: string;
}> = ({ ch, label, min, max, step, def, track }) => (
  <div className="flex flex-col gap-1 rounded-md border border-line/10 bg-line/[0.02] p-2">
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-fg-muted">{label}</span>
      <EasingSelect param={`cb${ch}Easing`} />
    </div>
    <GenParamSlider param={`cb${ch}Start`} label="start" min={min} max={max} step={step} def={def.start} trackBackground={track} />
    <GenParamSlider param={`cb${ch}End`} label="end" min={min} max={max} step={step} def={def.end} trackBackground={track} />
  </div>
);

/** The ColorBox controls: per-channel L / C / h sweeps with colour-ramp tracks, plus the
 *  interim "Fit from gradient" entry (until P2's drag-drop). Shown on the canvas when the
 *  generator is in ColorBox mode (replaces the two-source Sources + Mix section). */
export const ColorBoxControls: React.FC = () => {
  const cb = useColorBoxParams();
  const fitFromCatalog = useGeneratorStore((s) => s.fitColorBoxFromCatalog);
  const [pickOpen, setPickOpen] = useState(false);

  // Each channel's track holds the OTHER two at the midpoint of their sweep, so the ramp
  // reads as "this channel, in the current colour family". Recomputed only on those mids.
  const midL = (cb.L.start + cb.L.end) / 2;
  const midC = (cb.C.start + cb.C.end) / 2;
  const midH = (cb.h.start + cb.h.end) / 2;
  const trackL = useMemo(() => channelGradient('L', { min: 0, max: 1 }, { L: 0, C: midC, h: midH }), [midC, midH]);
  const trackC = useMemo(() => channelGradient('C', { min: 0, max: 0.4 }, { L: midL, C: 0, h: midH }), [midL, midH]);
  const trackH = useMemo(() => channelGradient('h', { min: 0, max: 360 }, { L: midL, C: midC, h: 0 }), [midL, midC]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-fg-dim">Per-channel sweep</span>
        <button
          onClick={() => setPickOpen(true)}
          title="Approximate an existing gradient as ColorBox sweeps (the closest per-channel match)"
          className="ml-auto text-[11px] px-2 py-0.5 rounded-sm bg-line/[0.06] text-fg-tertiary hover:text-fg-secondary hover:bg-line/10 transition-colors"
        >
          Fit from gradient…
        </button>
      </div>
      <ColorBoxChannelRow ch="L" label="Lightness" min={0} max={1} step={0.005} def={{ start: 0.2, end: 0.92 }} track={trackL} />
      <ColorBoxChannelRow ch="C" label="Chroma" min={0} max={0.4} step={0.005} def={{ start: 0.12, end: 0.18 }} track={trackC} />
      <ColorBoxChannelRow ch="H" label="Hue°" min={0} max={360} step={1} def={{ start: 30, end: 290 }} track={trackH} />
      {pickOpen && (
        <GradientSourcePicker
          title="Fit ColorBox from…"
          value={-1}
          onChange={(idx) => fitFromCatalog(idx)}
          onClose={() => setPickOpen(false)}
        />
      )}
    </div>
  );
};

export default ColorBoxControls;
