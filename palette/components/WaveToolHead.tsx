/**
 * WaveToolHead — the function tool's glyphs: presets, the active-channel dot, five shapes,
 * three modes, ✓ and ✕. No labels anywhere.
 *
 * Placement (owner, 2026-09-12): "on mobile it can replace the graph's upper head type
 * section, on desktop it can just appear in the head as you have it there." So arming the
 * tool SWAPS the strip that already sits above the plot on a phone, and takes the floating
 * tool column's place on the desk. Either way it costs no space it did not already have.
 *
 * EVERY GLYPH HERE IS TRACED BY `waveValue` ITSELF — the shapes at two cycles across 22 px,
 * the presets from their own params. Not hand-authored icon paths. Two reasons, and the
 * second is the real one: they cannot drift from what the tool produces (add a shape or a
 * preset and its icon exists), and a picture of the wave needs no word beside it, which is
 * most of how this tool stays wordless.
 *
 * PRESETS COME FIRST (owner, 2026-09-12: "presets can come first and can be a preview of
 * their wave shape instead of text") — they are the starting points, so they are the first
 * thing the head offers. Each is drawn in ITS CHANNEL'S COLOUR, which is what tells
 * "sequential lightness" from "hue sweep": the same sawtooth, cyan and green. A preset whose
 * channel the current space does not have (any lightness preset in RGB) is not offered.
 *
 * THERE IS NO DICE. Reseeding moved onto the Noise glyph — clicking an ALREADY-ACTIVE shape
 * does that shape's own thing — which frees a permanent slot that meant something for one
 * shape in five, and costs no new width.
 *
 * @see palette/core/wavePresets.ts · palette/core/waveGen.ts · palette/components/WaveOverlay.tsx
 */

import React, { useMemo } from 'react';
import { DEFAULT_WAVE, WAVE_MODES, WAVE_SHAPES, waveValue, type WaveMode, type WaveParams, type WaveShape } from '../core/waveGen';
import { WAVE_PRESETS, presetParams, type WavePreset } from '../core/wavePresets';

/**
 * Trace a wave into a 22×18 box. `span` is how many periods to show: the shape buttons show
 * two (enough to read "this repeats"), a preset shows its own wavelength clamped so a
 * 0.03-wavelength grain does not alias into mush at 22 px.
 *
 * The amplitude is NORMALISED to fill the box rather than drawn to scale — at this size a
 * subtle ripple would be a flat line, and the glyph's job is SHAPE. The plot shows amount.
 */
const trace = (p: WaveParams, span: number): string => {
  const n = 40;
  const vals: number[] = [];
  for (let i = 0; i <= n; i++) vals.push(waveValue((i / n) * span, p));
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const mid = (lo + hi) / 2;
  const half = Math.max(1e-6, (hi - lo) / 2);
  let d = '';
  for (let i = 0; i <= n; i++) {
    d += (i ? 'L' : 'M') + (2 + (i / n) * 18).toFixed(1) + ' ' + (9 - ((vals[i] - mid) / half) * 5.5).toFixed(1);
  }
  return d;
};

/** Pre-traced once at module load — the paths are constant. Exported because the tool's own
 *  toolbar button wears the Sine one: an icon traced by the tool cannot promise a shape the
 *  tool does not make. */
export const SHAPE_PATHS: Record<WaveShape, string> = WAVE_SHAPES.reduce((acc, shape) => {
  acc[shape] = trace({ ...DEFAULT_WAVE, shape, wavelength: 1, phase: 0, seed: 7 }, 2);
  return acc;
}, {} as Record<WaveShape, string>);

/** A preset's glyph traces the preset's OWN params, so the button is a true preview. */
const PRESET_PATHS: Record<string, string> = WAVE_PRESETS.reduce((acc, preset) => {
  const p = presetParams(preset);
  // One wavelength's worth, but never more than four periods — a fine grain would otherwise
  // be thirty periods of noise in 18 px of height.
  acc[preset.id] = trace(p, Math.min(4, 1 / Math.max(0.25, p.wavelength)));
  return acc;
}, {} as Record<string, string>);

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
    className={`shrink-0 w-7 h-6 flex items-center justify-center rounded border transition-all ${
      active ? 'bg-accent-900/80 text-accent-300 border-accent-500/50' : 'bg-surface/80 text-fg-muted border-line/10 hover:text-fg'
    }`}
  >
    {children}
  </button>
);

const Sep = () => <span className="shrink-0 w-px h-4 bg-line/20 mx-1" />;

interface Props {
  shape: WaveShape;
  mode: WaveMode;
  onShape: (s: WaveShape) => void;
  onMode: (m: WaveMode) => void;
  /** Clicking the ALREADY-ACTIVE Noise glyph — the dice, without the slot. */
  onReseed: () => void;
  onPreset: (p: WavePreset) => void;
  onCommit: () => void;
  onCancel: () => void;
  /** The channel being filtered — one at a time (owner), so this is a read-only dot. */
  channelColor: string;
  channelLabel: string;
  /** Resolve a preset's role to a channel colour, or null when this space has no such
   *  channel (every lightness preset in RGB) — those are not offered at all. */
  presetColor: (p: WavePreset) => string | null;
}

export const WaveToolHead: React.FC<Props> = ({
  shape, mode, onShape, onMode, onReseed, onPreset, onCommit, onCancel,
  channelColor, channelLabel, presetColor,
}) => {
  const presets = useMemo(
    () => WAVE_PRESETS.map((p) => ({ p, color: presetColor(p) })).filter((x) => x.color !== null),
    [presetColor],
  );
  return (
    <div
      className="w-full shrink-0 flex items-center gap-1 px-2 py-1 border-b border-line/10 bg-surface-dock/95 backdrop-blur-sm"
      data-gx-wave="head"
    >
      {/* ONLY THE PRESETS SCROLL, and everything else is pinned. Two browser findings, both
          2026-09-12: an `ml-auto` inside a scrolling flex container pushes ✓ / ✕ to the end
          of the SCROLL width rather than the visible edge, so the buttons that END the
          gesture went off-screen; and with eleven presets in one scrolling row the MODE
          glyphs went with them, leaving no way to see whether the wave was adding or
          replacing — which is most of what it does. The presets are a gallery you browse;
          the controls are state you must be able to read at a glance. */}
      <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto gx-rail-scroll">
      {presets.map(({ p, color }) => (
        <Btn key={p.id} onClick={() => onPreset(p)} title={p.label} tag={`preset-${p.id}`}>
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
            <path d={PRESET_PATHS[p.id]} fill="none" stroke={color ?? 'currentColor'} strokeWidth={1.6} strokeLinejoin="round" />
          </svg>
        </Btn>
      ))}
      </div>
      <Sep />
      <span
        className="shrink-0 w-3.5 h-3.5 rounded-full border"
        style={{ background: channelColor, borderColor: channelColor }}
        title={`Shaping ${channelLabel} — pick another channel in the track list`}
      />
      <Sep />
      {WAVE_SHAPES.map((s) => (
        <Btn
          key={s}
          onClick={() => (shape === s && s === 'Noise' ? onReseed() : onShape(s))}
          active={shape === s}
          title={shape === s && s === 'Noise' ? 'Noise — click again for another draw' : s}
          tag={`shape-${s.toLowerCase()}`}
        >
          <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
            <path d={SHAPE_PATHS[s]} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
        </Btn>
      ))}
      <Sep />
      {WAVE_MODES.map((m) => (
        <Btn key={m} onClick={() => onMode(m)} active={mode === m} title={MODE_TITLE[m]} tag={`mode-${m}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            {MODE_GLYPH[m]}
          </svg>
        </Btn>
      ))}
      <div className="shrink-0 flex items-center gap-1 pl-2 border-l border-line/10 ml-1">
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
};

export default WaveToolHead;
