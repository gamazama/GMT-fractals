/**
 * MixBlend — the per-channel L/C/h blend, rendered as VERTICAL GMT sliders on the
 * CANVAS BETWEEN Source A (above) and Source B (below), so each slider bridges A→B
 * (top = all A / 0, bottom = all B / 1). mixL/mixC/mixH are hidden DDFS params (ride
 * undo/preset/animation); each binds via useGenParam, with its keyframe diamond to
 * the LEFT of the channel name.
 *
 * The control IS GMT's DraggableNumber (axis='y') — same scrub/click-to-edit/Shift-fast
 * feel as every GMT input — over a GMT-styled vertical track. 0..1 are SOFT bounds, so
 * you can drag/type PAST them to extrapolate beyond A or beyond B (no hard clamp).
 */

import React from 'react';
import { DraggableNumber } from '../../components/inputs/primitives';
import { KeyframeButton } from '../../components/KeyframeButton';
import { useTrackAnimation } from '../../hooks/useTrackAnimation';
import { useGenParam, genEditStart, genEditEnd } from '../store/generatorStore';

const HATCH = 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)';
// A faint top→bottom tint so the track reads directionally: empty at A (top), cyan toward
// B (bottom). Layered UNDER the hatch + the live fill, so it only hints the direction.
const DIR_TINT = 'linear-gradient(to bottom, rgba(34,211,238,0.0), rgba(34,211,238,0.10))';

/** Friendly readout of a 0..1 blend: "A" at the A end, "B" at the B end, otherwise the
 *  percentage of the way toward B. Extrapolated values (drag past the ends) read as
 *  signed/over-100 percents so the over-min/max behaviour stays legible, not clamped. */
const blendLabel = (v: number): string =>
  Math.abs(v) < 0.005 ? 'A' : Math.abs(v - 1) < 0.005 ? 'B' : `${Math.round(v * 100)}%`;

const VerticalMixSlider: React.FC<{ param: string; label: string; height: number }> = ({ param, label, height }) => {
  const [v, setV] = useGenParam<number>(param);
  const value = v ?? 0;
  const { status, toggleKey } = useTrackAnimation(`paletteGenerator.${param}`, value, label);
  const pct = Math.max(0, Math.min(100, value * 100)); // fill clamps for display; value may exceed

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        <KeyframeButton status={status} onClick={toggleKey} />
        <span className="text-[10px] text-gray-400">{label}</span>
      </div>
      <div
        className="relative w-9 rounded-sm overflow-hidden bg-white/[0.12]"
        style={{ height, backgroundImage: `${HATCH}, ${DIR_TINT}` }}
        title={`${label}: A (top) ↔ B (bottom) · drag past for beyond-A / beyond-B`}
      >
        {/* fill from the top (A = 0) down to the value — grows downward toward B */}
        <div className="absolute left-0 right-0 top-0 bg-cyan-500/25 pointer-events-none" style={{ height: `${pct}%` }} />
        <div className="absolute left-0 right-0 h-0.5 bg-white/70 pointer-events-none" style={{ top: `calc(${pct}% - 1px)` }} />
        {/* per-slider end-caps so each track independently reads top=A / bottom=B */}
        <span className="absolute top-0 left-0 right-0 text-center text-[8px] leading-tight text-white/40 pointer-events-none">A</span>
        <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] leading-tight text-white/40 pointer-events-none">B</span>
        {/* the GMT draggable number — vertical scrub + click-to-edit; no hard clamp */}
        <div className="absolute inset-0">
          <DraggableNumber value={value} onChange={setV} onDragStart={genEditStart} onDragEnd={genEditEnd} axis="y" step={0.01} min={0} max={1} defaultValue={0} />
        </div>
      </div>
      {/* live friendly readout: how far toward B (immediate drag feedback) */}
      <span className="text-[10px] tabular-nums text-cyan-300/80 leading-none">{blendLabel(value)}</span>
    </div>
  );
};

export const MixBlend: React.FC<{ onSwap: () => void; onReset?: () => void; height?: number; dimmed?: boolean }> = ({
  onSwap,
  onReset,
  height = 78,
  dimmed = false,
}) => (
  <div className={`flex flex-col items-center gap-1 py-1 transition-opacity ${dimmed ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={dimmed || undefined}>
    <div className="flex items-stretch justify-center gap-5">
      {/* A↔B end markers, aligned to the slider track */}
      <div className="flex flex-col justify-between items-end text-sm font-semibold uppercase tracking-wide text-gray-500 py-5">
        <span>A</span>
        <span>B</span>
      </div>
      <VerticalMixSlider param="mixL" label="Lightness" height={height} />
      <VerticalMixSlider param="mixC" label="Chroma" height={height} />
      <VerticalMixSlider param="mixH" label="Hue" height={height} />
      <div className="flex flex-col items-stretch justify-center gap-1">
        <button
          onClick={onSwap}
          title="Swap A and B"
          className="text-[11px] text-gray-300 px-2.5 py-1 rounded-sm bg-white/[0.06] hover:bg-white/10"
        >
          ⇅ Swap
        </button>
        {onReset && (
          <button
            onClick={onReset}
            title="Reset the Mix blend to all-A (Lightness / Chroma / Hue → A)"
            className="text-[11px] text-gray-300 px-2.5 py-1 rounded-sm bg-white/[0.06] hover:bg-white/10"
          >
            ↺ Reset
          </button>
        )}
      </div>
    </div>
    {/* one-line, child-simple explanation of what the three sliders do */}
    <span className="text-[10px] text-gray-500 text-center">
      Each slider blends that channel from <span className="text-gray-400">A (top)</span> to <span className="text-gray-400">B (bottom)</span>
    </span>
  </div>
);

export default MixBlend;
