/**
 * WaveToolHead — the function tool's eleven glyphs: the active-channel dot, five shapes,
 * three modes, the dice, ✓ and ✕. No labels anywhere.
 *
 * Placement (owner, 2026-09-12): "on mobile it can replace the graph's upper head type
 * section, on desktop it can just appear in the head as you have it there." So arming the
 * tool SWAPS the strip that already sits above the plot on a phone, and adds the same row
 * above the plot on the desk. Either way it costs no vertical space it did not already have
 * on the screen where space is scarce.
 *
 * THE SHAPE GLYPHS ARE DRAWN BY `waveValue` ITSELF, at two cycles across 22 px — not
 * hand-authored icon paths. Two reasons, and the second is the real one: they can never
 * drift from what the tool actually produces (add a shape to `WAVE_SHAPES` and its icon
 * exists), and a picture of the wave needs no word next to it, which is most of how this
 * tool stays wordless.
 *
 * @see palette/core/waveGen.ts · palette/components/WaveOverlay.tsx
 */

import React from 'react';
import { DEFAULT_WAVE, WAVE_MODES, WAVE_SHAPES, waveValue, type WaveMode, type WaveShape } from '../core/waveGen';

/** One shape, traced at two cycles across a 22×18 box. */
const shapeGlyph = (shape: WaveShape) => {
  const p = { ...DEFAULT_WAVE, shape, wavelength: 0.5, phase: 0, seed: 7 };
  let d = '';
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    d += (i ? 'L' : 'M') + (2 + t * 18).toFixed(1) + ' ' + (9 - waveValue(t, p) * 5.5).toFixed(1);
  }
  return d;
};

/** Pre-traced once at module load — the paths are constant. Exported because the tool's
 *  own toolbar button wears the Sine one: an icon traced by the tool cannot promise a shape
 *  the tool does not make. */
export const SHAPE_PATHS: Record<WaveShape, string> = WAVE_SHAPES.reduce(
  (acc, s) => { acc[s] = shapeGlyph(s); return acc; },
  {} as Record<WaveShape, string>,
);

const MODE_GLYPH: Record<WaveMode, React.ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  replace: <rect x="5" y="5" width="14" height="14" rx="2" />,
  multiply: <path d="M6 6l12 12M18 6L6 18" />,
};
const MODE_TITLE: Record<WaveMode, string> = {
  add: 'Add — the wave rides on top of the curve',
  replace: 'Replace — the wave becomes the curve, inside the span',
  multiply: 'Multiply — the wave scales the curve',
};

const Btn: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  tag?: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, tag, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    aria-pressed={active}
    data-gx-wave={tag}
    className={`w-7 h-6 flex items-center justify-center rounded border transition-all ${
      active ? 'bg-accent-900/80 text-accent-300 border-accent-500/50' : 'bg-surface/80 text-fg-muted border-line/10 hover:text-fg'
    }`}
  >
    {children}
  </button>
);

interface Props {
  shape: WaveShape;
  mode: WaveMode;
  onShape: (s: WaveShape) => void;
  onMode: (m: WaveMode) => void;
  onReseed: () => void;
  onCommit: () => void;
  onCancel: () => void;
  /** The channel being filtered — one at a time (owner), so this is a read-only dot, not
   *  a picker. The track list is where the channel is chosen. */
  channelColor: string;
  channelLabel: string;
}

export const WaveToolHead: React.FC<Props> = ({
  shape, mode, onShape, onMode, onReseed, onCommit, onCancel, channelColor, channelLabel,
}) => (
  <div
    className="w-full shrink-0 flex items-center gap-1 px-2 py-1 overflow-x-auto gx-rail-scroll border-b border-line/10 bg-surface-dock/95 backdrop-blur-sm"
    data-gx-wave="head"
  >
    <span
      className="shrink-0 w-3.5 h-3.5 rounded-full border"
      style={{ background: channelColor, borderColor: channelColor }}
      title={`Shaping ${channelLabel} — pick another channel in the track list`}
    />
    <span className="shrink-0 w-px h-4 bg-line/20 mx-1" />
    {WAVE_SHAPES.map((s) => (
      <Btn key={s} onClick={() => onShape(s)} active={shape === s} title={s} tag={`shape-${s.toLowerCase()}`}>
        <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
          <path d={SHAPE_PATHS[s]} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      </Btn>
    ))}
    <span className="shrink-0 w-px h-4 bg-line/20 mx-1" />
    {WAVE_MODES.map((m) => (
      <Btn key={m} onClick={() => onMode(m)} active={mode === m} title={MODE_TITLE[m]} tag={`mode-${m}`}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          {MODE_GLYPH[m]}
        </svg>
      </Btn>
    ))}
    {/* The dice only means anything for Noise; it stays put rather than appearing, so the
        row never reflows under the pointer mid-choice. */}
    <span className="shrink-0 w-px h-4 bg-line/20 mx-1" />
    <Btn onClick={onReseed} title="Another noise draw" tag="reseed">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    </Btn>
    <div className="ml-auto shrink-0 flex items-center gap-1 pl-2">
      <Btn onClick={onCommit} title="Bake the wave into the curve (Enter)" tag="commit">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </Btn>
      <Btn onClick={onCancel} title="Discard the wave (Esc)" tag="cancel">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </Btn>
    </div>
  </div>
);

export default WaveToolHead;
