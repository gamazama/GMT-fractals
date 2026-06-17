/**
 * MixBlend — the per-channel L/C/h blend, rendered as VERTICAL sliders on the CANVAS
 * BETWEEN Source A (above) and Source B (below), so each slider bridges A→B (top = all
 * A / 0, bottom = all B / 1). Each has a big grabbable THUMB you slide between the A and
 * B ends — the child-simple affordance — on a track tinted toward B.
 *
 * mixL/mixC/mixH are hidden DDFS params (ride undo/preset/animation); each binds via
 * useGenParam, with its keyframe diamond to the LEFT of the channel name. The drag math
 * is GMT's DraggableNumber (axis='y') under the thumb — same scrub/click-to-edit/
 * Shift-fast/Alt-slow feel and 0..1 SOFT bounds (drag/type PAST to extrapolate beyond A
 * or B, no hard clamp). The thumb is a visual signifier; the DraggableNumber beneath it
 * captures the drag.
 */

import React from 'react';
import { DraggableNumber } from '../../components/inputs/primitives';
import { KeyframeButton } from '../../components/KeyframeButton';
import { useTrackAnimation } from '../../hooks/useTrackAnimation';
import { useGenParam, genEditStart, genEditEnd } from '../store/generatorStore';

const HATCH = 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 10px)';
// A faint top→bottom tint so the track reads directionally: empty at A (top), cyan
// toward B (bottom). Layered UNDER the hatch + the live fill.
const DIR_TINT = 'linear-gradient(to bottom, rgba(34,211,238,0.0), rgba(34,211,238,0.12))';

const VerticalMixSlider: React.FC<{ param: string; label: string; height: number }> = ({ param, label, height }) => {
  const [v, setV] = useGenParam<number>(param);
  const value = v ?? 0;
  const { status, toggleKey } = useTrackAnimation(`paletteGenerator.${param}`, value, label);
  const pct = Math.max(0, Math.min(100, value * 100)); // thumb/fill clamp for display; value may exceed

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-0.5">
        <KeyframeButton status={status} onClick={toggleKey} />
        <span className="text-[10px] text-gray-400">{label}</span>
      </div>
      <div
        className="relative w-9 rounded-sm overflow-visible bg-white/[0.12]"
        style={{ height, backgroundImage: `${HATCH}, ${DIR_TINT}` }}
        title={`${label}: grab the handle and slide A (top) ↔ B (bottom) · drag past for beyond-A / beyond-B`}
      >
        {/* fill from the top (A = 0) down to the value — grows downward toward B */}
        <div className="absolute left-0 right-0 top-0 rounded-t-sm bg-cyan-500/20 pointer-events-none" style={{ height: `${pct}%` }} />
        {/* the grabbable THUMB — a clear round handle the child slides between A and B */}
        <div
          className="absolute left-1/2 z-10 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-2 ring-cyan-500 pointer-events-none"
          style={{ top: `${pct}%` }}
        />
        {/* the GMT draggable number drives the value — vertical scrub + click-to-edit +
            Shift/Alt precision + soft bounds (no hard clamp), over the WHOLE track so a
            grab anywhere drags. Its number readout is blanked (format → '') so the thumb
            is the only visual; click-to-edit still shows the real value in its input. */}
        <div className="absolute inset-0 z-20">
          <DraggableNumber value={value} onChange={setV} onDragStart={genEditStart} onDragEnd={genEditEnd} axis="y" step={0.01} min={0} max={1} defaultValue={0} format={() => ''} />
        </div>
      </div>
    </div>
  );
};

export const MixBlend: React.FC<{ onSwap: () => void; onReset?: () => void; height?: number; dimmed?: boolean }> = ({
  onSwap,
  onReset,
  height = 78,
  dimmed = false,
}) => (
  <div className={`flex items-stretch justify-center gap-5 py-1 transition-opacity ${dimmed ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={dimmed || undefined}>
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
);

export default MixBlend;
