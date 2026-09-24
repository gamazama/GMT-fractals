/**
 * WaveToolHead — the function tool's glyphs: presets, five shapes, three modes, ✓ and ✕. No
 * labels anywhere.
 *
 * THE ACTIVE-CHANNEL DOT IS NOT HERE. It moved into the plot's LEFT GUTTER and got smaller
 * (owner, 2026-09-12: "remove that colored circle in its toolbar - it can be smaller in the
 * left gutter of the curves canvas") — see `ChannelGraphEditor`, grep `data-gx-wave="channel"`.
 * It reads better there and it is not really a toolbar item: everything else in this row is
 * something you press, and the dot was the one thing that only told you something. In the
 * gutter it sits against the value axis it is the units of, and it gives the phone back the
 * 22 px it was costing.
 *
 * THE SHAPES AND THE MODES ARE `Segmented` (owner, 2026-09-12: "in general the switches need
 * to follow the same joined style as Even/Perceptual/Stops"). They were eight separately
 * bordered boxes with dividers between them, which read as eight buttons rather than two
 * questions with one answer each — and it was eight boxes because the joined style existed
 * only as a Tailwind string copied into two files, with nothing to reach for. It is a
 * component now, in `components/ui`, so the palette and the extract face share it.
 *
 * ON A PHONE THE SHAPES ARE ONE BUTTON that advances on tap (owner: "on mobile the wave types
 * for the function tool need to be switches on one button") — five glyphs is 170 px the head
 * does not have at 390. The modes stay a row: three is already narrow, and which of add /
 * replace / multiply is on is most of what the tool is doing, so it has to be readable at a
 * glance rather than one tap at a time.
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
 * PRESETS COME FIRST, in a DROPDOWN (owner, 2026-09-12: "the ui had no space for these - i
 * was thinking a Dropdown like we described before"). Eleven of them in a row was measured
 * at wider than the plot, and the scrolling that fixed the width took the mode glyphs out of
 * sight with it. One trigger, one menu — the same `ContextMenu` the blend chooser opens on a
 * coarse pointer, so this is the app's existing dialect rather than a new one.
 *
 * The menu keeps the preview (owner: "a preview of their wave shape instead of text"): each
 * row carries its own wave as an icon, traced by `waveValue` from that preset's params and
 * stroked in ITS CHANNEL'S COLOUR — which is what tells "sequential lightness" from "hue
 * sweep", the same sawtooth in cyan and green. The name rides beside it, which a row has
 * room for where a 28 px button did not. A preset whose channel the current space does not
 * have (any lightness preset in RGB) is not listed.
 *
 * THERE IS NO DICE. Reseeding moved onto the Noise glyph — clicking an ALREADY-ACTIVE shape
 * does that shape's own thing — which frees a permanent slot that meant something for one
 * shape in five, and costs no new width. On a phone the cycle button has no such click, so
 * `Segmented` fires the repeat on ARRIVAL: cycling onto Noise draws a fresh seed, and a lap
 * of the cycle is what a reseed costs there.
 *
 * STRENGTH is the one continuous control that is not a place on the plot. Every handle in
 * `WaveOverlay` moves something with a position (a span end, a crest, a period); "how much of
 * this do I take" has no position, so it is a small fader here rather than an eighth handle
 * competing for the canvas. Its fill IS its value, and the drag pill gives the number — the
 * same bargain every other glyph in this row makes: no label, a title, and the picture
 * carries the meaning.
 *
 * @see palette/core/wavePresets.ts · palette/core/waveGen.ts · palette/components/WaveOverlay.tsx
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_WAVE, WAVE_MODES, WAVE_SHAPES, waveValue, type WaveMode, type WaveParams, type WaveShape } from '../core/waveGen';
import { WAVE_PRESETS, presetParams, type WavePreset } from '../core/wavePresets';
import { ContextMenu } from '../../components/gradient/GradientContextMenu';
import { Segmented, type SegmentedOption } from '../../components/ui/Segmented';

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
  // `trace`'s second argument is a RANGE OF t, not a period count — and waveValue divides t
  // by the wavelength, so asking for "4" of a 0.12-wavelength texture drew 33 periods and the
  // glyph came out a solid block (seen in the browser, 2026-09-12). To show N periods the
  // range is N × the wavelength. Three periods, capped at the whole axis: a whole-gradient
  // preset (wavelength 1) shows its single period, and the ease-in-out (wavelength 2) shows
  // the rising half-period that IS its S-curve.
  acc[preset.id] = trace(p, Math.min(3 * p.wavelength, 1));
  return acc;
}, {} as Record<string, string>);

const MODE_GLYPH: Record<WaveMode, React.ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  replace: <rect x="5" y="5" width="14" height="14" rx="2" />,
  multiply: <path d="M6 6l12 12M18 6L6 18" />,
};
/** The bare word, for titles and the accessibility tree — the segment itself shows a glyph. */
const MODE_NAME: Record<WaveMode, string> = { add: 'Add', replace: 'Replace', multiply: 'Multiply' };
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
    className={`shrink-0 w-7 h-7 flex items-center justify-center rounded border transition-all ${
      active ? 'bg-accent-900/80 text-accent-300 border-accent-500/50' : 'bg-surface/80 text-fg-muted border-line/10 hover:text-fg'
    }`}
  >
    {children}
  </button>
);

/**
 * A hairline between groups — DESKTOP ONLY. Three of them cost 39 px of a 375 px phone
 * (measured: the head's scroll width was 376 against 363 of room, so the ✓ and ✕ that END the
 * gesture were over the edge), and they were doing the least work in the row: since the
 * shapes and the modes became joined switches, the switch's own border is what says where one
 * question stops and the next begins. */
const Sep: React.FC<{ on?: boolean }> = ({ on = true }) =>
  on ? <span className="shrink-0 w-px h-4 bg-line/20 mx-1" /> : null;

/**
 * The strength fader: a 52 px track whose FILL is the value. No label and no number — the
 * drag reports into the editor's pill like every other gesture the tool has, and the title
 * says what it is for anyone who hovers. Pointer capture on the track, so a drag that leaves
 * it keeps working.
 */
const Strength: React.FC<{ value: number; onChange: (v: number) => void; onPill: (s: string | null) => void }> = ({ value, onChange, onPill }) => {
  const ref = useRef<HTMLDivElement>(null);
  const set = useCallback((clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return;
    const v = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(v);
    onPill(`strength ${Math.round(v * 100)}%`);
  }, [onChange, onPill]);
  return (
    <div
      ref={ref}
      data-gx-wave="strength"
      title={`Strength — how much of the filtered curve to take (${Math.round(value * 100)}%)`}
      aria-label="Strength"
      role="slider"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="shrink-0 relative w-[52px] h-7 rounded border border-line/15 bg-surface/80 overflow-hidden cursor-ew-resize"
      onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); e.preventDefault(); set(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons & 1) set(e.clientX); }}
      onPointerUp={() => onPill(null)}
      onPointerCancel={() => onPill(null)}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowLeft' ? -0.05 : e.key === 'ArrowRight' ? 0.05 : 0;
        if (d) { e.preventDefault(); onChange(Math.max(0, Math.min(1, value + d))); }
      }}
    >
      <div className="absolute inset-y-0 left-0 bg-accent-500/45 pointer-events-none" style={{ width: `${value * 100}%` }} />
      <div className="absolute inset-y-0 w-px bg-accent-300 pointer-events-none" style={{ left: `calc(${value * 100}% - 0.5px)` }} />
    </div>
  );
};

interface Props {
  shape: WaveShape;
  mode: WaveMode;
  onShape: (s: WaveShape) => void;
  onMode: (m: WaveMode) => void;
  /** Clicking the ALREADY-ACTIVE Noise glyph — the dice, without the slot. */
  onReseed: () => void;
  onPreset: (p: WavePreset) => void;
  strength: number;
  onStrength: (v: number) => void;
  /** The editor's drag readout — the fader borrows it rather than printing a number. */
  onPill: (s: string | null) => void;
  onCommit: () => void;
  onCancel: () => void;
  /** Collapse the shape switch to one cycling button — the phone layout. */
  phone?: boolean;
  /** Resolve a preset's role to a channel colour, or null when this space has no such
   *  channel (every lightness preset in RGB) — those are not offered at all. */
  presetColor: (p: WavePreset) => string | null;
}

export const WaveToolHead: React.FC<Props> = ({
  shape, mode, onShape, onMode, onReseed, onPreset, onCommit, onCancel,
  presetColor, strength, onStrength, onPill, phone = false,
}) => {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const shapeOptions = useMemo<SegmentedOption<WaveShape>[]>(
    () => WAVE_SHAPES.map((sh) => ({
      id: sh,
      name: sh,
      repeat: sh === 'Noise',
      repeatTitle: 'Noise — again for another draw',
      label: (
        <svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true">
          <path d={SHAPE_PATHS[sh]} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        </svg>
      ),
    })),
    [],
  );
  const modeOptions = useMemo<SegmentedOption<WaveMode>[]>(
    () => WAVE_MODES.map((m) => ({
      id: m,
      name: MODE_NAME[m],
      title: MODE_TITLE[m],
      label: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          {MODE_GLYPH[m]}
        </svg>
      ),
    })),
    [],
  );
  const presets = useMemo(
    () => WAVE_PRESETS.map((p) => ({ p, color: presetColor(p) })).filter((x) => x.color !== null),
    [presetColor],
  );
  return (
    <div
      className="w-full shrink-0 flex items-center gap-1 px-2 py-1 border-b border-line/10 bg-surface-dock/95 backdrop-blur-sm"
      data-gx-wave="head"
    >
      <button
        type="button"
        aria-expanded={!!menuAt}
        data-gx-wave="presets"
        title="Presets — a starting shape for this channel"
        className={`shrink-0 h-7 px-2 flex items-center gap-1 rounded border text-[11px] whitespace-nowrap transition-all ${
          menuAt ? 'bg-accent-900/80 text-accent-300 border-accent-500/50' : 'bg-surface/80 text-fg-muted border-line/10 hover:text-fg'
        }`}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setMenuAt(menuAt ? null : { x: r.left, y: r.bottom + 5 });
        }}
      >
        <svg width="20" height="14" viewBox="0 0 22 18" aria-hidden="true">
          <path d={PRESET_PATHS[presets[0]?.p.id] ?? SHAPE_PATHS.Sine} fill="none" stroke="currentColor" strokeWidth={1.6} />
        </svg>
        ▾
      </button>
      {menuAt && (
        <ContextMenu
          x={menuAt.x}
          y={menuAt.y}
          onClose={() => setMenuAt(null)}
          options={presets.flatMap(({ p, color }, i) => {
            const head = i === 0 || presets[i - 1].p.role !== p.role
              ? [{ isHeader: true, label: p.role === 'active' ? 'Texture' : `On ${p.role}` }]
              : [];
            return [
              ...head,
              {
                label: p.label,
                action: () => onPreset(p),
                icon: (
                  <svg width="24" height="16" viewBox="0 0 22 18" aria-hidden="true">
                    <path d={PRESET_PATHS[p.id]} fill="none" stroke={color ?? 'currentColor'} strokeWidth={1.7} strokeLinejoin="round" />
                  </svg>
                ),
              },
            ];
          })}
        />
      )}
      <Sep on={!phone} />
      <Segmented
        name="wave-shape"
        options={shapeOptions}
        value={shape}
        onChange={onShape}
        onRepeat={onReseed}
        cycle={phone}
        pad="px-1.5"
      />
      <Segmented name="wave-mode" options={modeOptions} value={mode} onChange={onMode} pad="px-1.5" className="ml-1" />
      <Sep on={!phone} />
      <Strength value={strength} onChange={onStrength} onPill={onPill} />
      <div className="shrink-0 flex items-center gap-1 pl-2 border-l border-line/10 ml-auto">
        <Btn onClick={onCommit} title="Apply the wave to the curve (Enter)" tag="commit">
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
