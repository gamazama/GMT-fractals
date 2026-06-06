/**
 * GeneratorStage — the Generator mode's CANVAS (centre stage).
 *
 * Layout (per the user's note):
 *   • Source A and Source B stacked on top of each other, ABOVE the result.
 *     Click a source strip to open the searchable gradient picker; a swap button
 *     sits between them.
 *   • The result gradient is centred with a border.
 *   • The channel-curve editor spans the FULL stage width below, with its fit
 *     controls (the "curves UI" lives on the canvas, not the panel).
 *
 * The dials live in the Generator dock tab (DDFS params); this surface shows what
 * they produce. Both read the shared generatorStore + the paletteGenerator slice
 * via useGeneratorDerived.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useGeneratorStore, useGeneratorDerived, genEdit, useGenParam, useColorBoxParams } from '../store/generatorStore';
import { EASING_NAMES } from '../core/easings';
import { oklabToRgbSafe } from '../core/oklab';
import { GenParamSlider } from './GenParamSlider';
import { easingThumb } from './easingThumb';
import { EasingPicker } from './EasingPicker';
import { showToast } from '../../engine/store/toastStore';
import type { ChannelTracks } from './ChannelGraphEditor';
import { buildPresetCatalog } from '../core/presetCatalog';
import { ChannelGraphEditor, CHANNEL_PLOT_INSET_LEFT, CHANNEL_PLOT_INSET_RIGHT } from './ChannelGraphEditor';
import { GradientStrip } from './GradientStrip';
import { GradientSourcePicker } from './GradientSourcePicker';
import { GeneratorSlotMods } from './GeneratorSlotMods';
import { MixBlend } from './MixBlend';
import { FavStar } from './FavStar';
import { readFavientDrag, FAVIENT_DND_MIME } from '../core/favientDnd';
import { renderStopsToRamp } from '../core/gmtGradient';
import { openFullscreen } from '../store/fullscreenStore';

const useContainerSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 240 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(120, el.clientHeight) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
};

// One source: its gradient (click to open the searchable picker). The slot's modifiers
// open in a semi-floating panel from the ⚙ button (so they don't expand the layout).
const SourceRow: React.FC<{
  which: 'A' | 'B';
  ramp: { r: number; g: number; b: number }[];
  preset: number;
  onPick: (idx: number) => void;
  height: number;
  dimmed?: boolean;
}> = ({ which, ramp, preset, onPick, height, dimmed }) => {
  const [open, setOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const sendRampToSlot = useGeneratorStore((s) => s.sendRampToSlot);
  const name = useMemo(() => buildPresetCatalog()[preset]?.name ?? '—', [preset]);

  const onDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(FAVIENT_DND_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dropping) setDropping(true);
  };
  const onDrop = (e: React.DragEvent) => {
    const p = readFavientDrag(e.dataTransfer);
    setDropping(false);
    if (!p) return;
    e.preventDefault();
    sendRampToSlot(which, renderStopsToRamp(p.config.stops, p.config.blendSpace, p.config.colorSpace), p.name);
  };

  return (
    // When curves drive the output the source is FROZEN: dimmed AND non-interactive
    // (pointer-events-none) so a click/drag that would silently do nothing can't read
    // as broken. The host shows a "bake/reset to edit sources" hint above.
    <div className={`relative min-w-0 transition-opacity ${dimmed ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={dimmed || undefined}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 w-14 shrink-0">Source {which}</span>
        <span className="text-[11px] text-gray-200 truncate">{name}</span>
        <span className={`ml-auto text-[10px] shrink-0 transition-colors ${dropping ? 'text-amber-300/90' : 'text-gray-500'}`}>{dropping ? 'drop to load' : 'click to change'}</span>
      </div>
      {/* gradient + the slot-mods trigger to its RIGHT (panel opens into the gutter) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          onDragOver={onDragOver}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
          title={`Source ${which} — click to change, or drop a favourite here`}
          className={`block flex-1 min-w-0 rounded-sm ring-1 transition ${dropping ? 'ring-amber-300/80 ring-2' : 'ring-white/10 hover:ring-cyan-500/40'}`}
        >
          <GradientStrip ramp={ramp} height={height} />
        </button>
        <GeneratorSlotMods which={which} />
      </div>
      {open && <GradientSourcePicker title={`Source ${which}`} value={preset} onChange={onPick} onClose={() => setOpen(false)} />}
    </div>
  );
};

// An empty editable track set — used to render the curve editor as a read-only SCOPE
// (dimmed, ghost-only) before any curves are fit, so the channels are always visible.
const EMPTY_TRACKS: ChannelTracks = {
  L: { id: 'L', type: 'float', label: 'Lightness', keyframes: [], color: '#22d3ee' },
  C: { id: 'C', type: 'float', label: 'Chroma', keyframes: [], color: '#a855f7' },
  h: { id: 'h', type: 'float', label: 'Hue', keyframes: [], color: '#22c55e' },
};

// --- ColorBox mode UI ------------------------------------------------------------

/** Segmented Mixed | ColorBox switch, bound to the hidden `generatorMode` DDFS param. */
const GeneratorModeToggle: React.FC = () => {
  const [mode, setMode] = useGenParam<number>('generatorMode');
  const m = mode ?? 0;
  const opts: { label: string; value: number; title: string }[] = [
    { label: 'Mixed', value: 0, title: 'Blend two source gradients per channel' },
    { label: 'ColorBox', value: 1, title: 'Sweep each OKLCh channel start→end under an easing curve' },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">Mode</span>
      <div className="flex rounded-sm overflow-hidden ring-1 ring-white/10">
        {opts.map((o) => (
          <button
            key={o.value}
            onClick={() => m !== o.value && genEdit(() => setMode(o.value))}
            title={o.title}
            aria-pressed={m === o.value}
            className={`text-[11px] px-2.5 py-0.5 transition-colors ${
              m === o.value ? 'bg-cyan-500/25 text-cyan-100' : 'bg-white/[0.04] text-gray-400 hover:text-gray-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
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
        className="ml-auto flex items-center gap-1.5 text-[11px] bg-zinc-800 text-gray-200 rounded-sm pl-1 pr-1.5 py-0.5 ring-1 ring-white/10 hover:ring-cyan-500/40 transition"
      >
        {thumb && <img src={thumb} width={28} height={18} alt="" className="rounded-[1px]" />}
        <span className="truncate max-w-[88px]">{name}</span>
      </button>
      {open && <EasingPicker value={idx} onChange={(i) => genEdit(() => setV(i))} onClose={() => setOpen(false)} />}
    </>
  );
};

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
  <div className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.02] p-2">
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
      <EasingSelect param={`cb${ch}Easing`} />
    </div>
    <GenParamSlider param={`cb${ch}Start`} label="start" min={min} max={max} step={step} def={def.start} trackBackground={track} />
    <GenParamSlider param={`cb${ch}End`} label="end" min={min} max={max} step={step} def={def.end} trackBackground={track} />
  </div>
);

/** The ColorBox controls: per-channel L / C / h sweeps with colour-ramp tracks, plus the
 *  interim "Fit from gradient" entry (until P2's drag-drop). Shown on the canvas when the
 *  generator is in ColorBox mode (replaces the two-source Sources + Mix section). */
const ColorBoxControls: React.FC = () => {
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
        <span className="text-[10px] uppercase tracking-wide text-gray-500">Per-channel sweep</span>
        <button
          onClick={() => setPickOpen(true)}
          title="Approximate an existing gradient as ColorBox sweeps (the closest per-channel match)"
          className="ml-auto text-[11px] px-2 py-0.5 rounded-sm bg-white/[0.06] text-gray-300 hover:text-gray-100 hover:bg-white/10 transition-colors"
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

export const GeneratorStage: React.FC = () => {
  const { stripA, stripB, ramp, config, ghost } = useGeneratorDerived();
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  const setSlot = useGeneratorStore((s) => s.setSlot);
  const swap = useGeneratorStore((s) => s.swap);
  const tracks = useGeneratorStore((s) => s.tracks);
  const setTracks = useGeneratorStore((s) => s.setTracks);
  const curvesOn = useGeneratorStore((s) => s.curvesOn);
  const setCurvesOn = useGeneratorStore((s) => s.setCurvesOn);
  const detail = useGeneratorStore((s) => s.detail);
  const setDetail = useGeneratorStore((s) => s.setDetail);
  const smooth = useGeneratorStore((s) => s.smooth);
  const setSmooth = useGeneratorStore((s) => s.setSmooth);
  const fitFromSource = useGeneratorStore((s) => s.fitFromSource);
  const resetCurves = useGeneratorStore((s) => s.resetCurves);
  const [resultTall, setResultTall] = useState(false);
  const [genMode] = useGenParam<number>('generatorMode');
  const colorbox = (genMode ?? 0) === 1;

  // Decision 3: detail/smooth are NON-DESTRUCTIVE. They no longer schedule a live re-fit
  // (which silently discarded hand-edited keyframes). Instead they drive the faint dashed
  // GHOST (the result scope the editor paints behind the live curve — see
  // useGeneratorDerived), so the user previews what a re-fit WOULD commit before committing
  // it. Track replacement happens only on an explicit "Fit / Re-fit from source".
  // Explicit commit of the prospective fit → the editable curves (one undo entry). When
  // it overwrites existing curves it warns (the previous edits are replaced but undoable).
  const commitFit = () => {
    // Any existing tracks get replaced (fitFromSource is unconditional), even if curves
    // were toggled off but kept — so warn on tracks presence, not just curvesOn.
    const overwrote = !!tracks;
    genEdit(fitFromSource);
    showToast(
      overwrote ? 'Curves re-fit from source — previous edits replaced (Ctrl+Z to undo)' : 'Curves fit from source',
      overwrote ? 'warning' : 'success',
    );
  };

  const { ref: graphRef, w: graphW, h: graphH } = useContainerSize();
  // The gradients above the curve editor are inset to line up with its plot area
  // (track sidebar + inspector). On a narrow stage (phone) those desktop insets
  // (~400px) exceed the whole width and crush the strips — fall back to a small
  // padding so the gradients use the full width instead.
  const { ref: rootRef, w: stageW } = useContainerSize();
  const tightInset = stageW < CHANNEL_PLOT_INSET_LEFT + CHANNEL_PLOT_INSET_RIGHT + 140;
  const padLeft = tightInset ? 12 : CHANNEL_PLOT_INSET_LEFT;
  const padRight = tightInset ? 12 : CHANNEL_PLOT_INSET_RIGHT;

  return (
    <div ref={rootRef} className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
      {/* Top: sources → blend → source → result, inset to line up with the graph PLOT
          below (so the gradients and the curve t-axis share a left/right edge). Takes
          the slack so the graph stays compact with no dead space under it. */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto pt-3 pb-2 flex flex-col gap-1.5 ${tracks && !colorbox ? '' : 'justify-center'}`}
        style={{ paddingLeft: padLeft, paddingRight: padRight }}
      >
        <div className="flex items-center mb-0.5">
          <GeneratorModeToggle />
        </div>
        {colorbox ? (
          <ColorBoxControls />
        ) : (
          <>
            {curvesOn && (
              <div className="text-[10px] text-cyan-300/70 bg-cyan-500/[0.06] border border-cyan-500/20 rounded-sm px-2 py-1 mb-0.5">
                Curves drive the output — sources are locked. <span className="text-cyan-200">Re-fit</span> or <span className="text-cyan-200">Reset points</span> below to edit the sources again.
              </div>
            )}
            <SourceRow which="A" ramp={stripA} preset={slotA} onPick={(i) => setSlot('A', i)} height={40} dimmed={curvesOn} />
            {/* The L/C/h blend sits BETWEEN A and B as vertical sliders bridging A→B. */}
            <MixBlend onSwap={swap} dimmed={curvesOn} />
            <SourceRow which="B" ramp={stripB} preset={slotB} onPick={(i) => setSlot('B', i)} height={40} dimmed={curvesOn} />
          </>
        )}

        {/* When curves drive the output the A/B sources are de-emphasised, so let the
            result glide down to sit beside the curve editor. The spacer grows via an
            animatable max-height (flex-grow can't transition smoothly as the sole
            grower); the negative margin cancels the parent gap when collapsed so the
            curves-off layout is unchanged. */}
        <div
          aria-hidden
          className="transition-[max-height] duration-300 ease-out"
          style={{ flexGrow: 1, flexBasis: 0, maxHeight: curvesOn ? 800 : 0, marginBottom: -6 }}
        />

        {/* Result — same width as the graph plot, no bordered holder */}
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-xs text-gray-400 shrink-0">Result</div>
              <FavStar config={config} name="Generated" source="Generator" />
              {curvesOn && !colorbox && <span className="text-[10px] text-cyan-400/70 truncate">curves drive output — Re-fit / Reset points to edit sources</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-gray-500">{config.stops.length} stops</span>
              <button
                onClick={() => openFullscreen(config, 'Generated')}
                title="Open the fullscreen config gallery"
                aria-label="Open fullscreen preview"
                className="text-[11px] px-1.5 py-0.5 rounded-sm bg-white/[0.06] text-gray-400 hover:text-gray-200 transition-colors"
              >
                ⛶
              </button>
              <button
                onClick={() => setResultTall((t) => !t)}
                title={resultTall ? 'Shrink result' : 'Enlarge result'}
                aria-label="Toggle result height"
                aria-pressed={resultTall}
                className={`text-[11px] px-1.5 py-0.5 rounded-sm transition-colors ${resultTall ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/[0.06] text-gray-400 hover:text-gray-200'}`}
              >
                ⬍
              </button>
            </div>
          </div>
          <GradientStrip ramp={ramp} height={resultTall ? 96 : 44} />
        </div>
      </div>

      {/* Channel curve graph (full width) with its controls. Fixed-height at the bottom
          — the keyframe inspector is about as tall as the editor ever needs to be, so the
          slack goes to the gradients above rather than dead space below the graph.
          Mixed mode only: the curve editor shapes the two-source mix; ColorBox sweeps the
          channels directly, so it has no curve surface. */}
      {!colorbox && (
      <div className="shrink-0 flex flex-col border-t border-white/10 bg-zinc-950">
        <div className="flex items-center gap-2 flex-wrap px-3 py-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Curves</span>
          <button
            onClick={commitFit}
            title={curvesOn ? 'Re-fit the curves from the source at the current detail/smooth — replaces the current curves (undoable)' : 'Decompose the current mix into editable Lightness / Chroma / Hue curves'}
            className="text-[11px] px-2 py-1 rounded-sm bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
          >
            {curvesOn ? 'Re-fit from source' : 'Fit from source'}
          </button>
          <button onClick={resetCurves} className="text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-300 hover:bg-white/10">
            Reset points
          </button>
          <label
            title={tracks ? 'Drive the output from the edited curves (sources are dimmed)' : 'Fit from source first to create editable curves'}
            className={`flex items-center gap-1.5 text-[11px] select-none ${tracks ? 'text-gray-300 cursor-pointer' : 'text-gray-600 cursor-not-allowed'}`}
          >
            <input type="checkbox" checked={curvesOn} disabled={!tracks} onChange={(e) => setCurvesOn(e.target.checked)} className="accent-cyan-500 disabled:opacity-50" />
            use curves
          </label>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            detail
            <input type="range" min={1} max={10} step={1} value={detail} onChange={(e) => setDetail(+e.target.value)} className="w-20 accent-cyan-500" />
            <span className="w-4 text-gray-300">{detail}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            smooth
            <input type="range" min={1} max={15} step={1} value={smooth} onChange={(e) => setSmooth(+e.target.value)} className="w-20 accent-cyan-500" />
            <span className="w-4 text-gray-300">{smooth}</span>
          </div>
        </div>
        {/* The editor is ALWAYS mounted: editable when curves exist, otherwise a dimmed
            read-only SCOPE that still shows the ghost (the result channels) so you can
            watch the Modify dials shape the gradient before fitting. Dimmed whenever the
            curves aren't driving the output. */}
        <div
          ref={graphRef}
          className={`relative overflow-hidden transition-opacity ${curvesOn ? '' : 'opacity-50'}`}
          style={{ height: curvesOn || tracks ? 264 : 200 }}
        >
          <ChannelGraphEditor
            tracks={tracks ?? EMPTY_TRACKS}
            onTracksChange={setTracks}
            width={graphW}
            height={graphH}
            previewRamp={ramp}
            ghost={ghost}
            interactive={!!tracks}
          />
          {!tracks && (
            <div className="absolute inset-x-0 bottom-1 text-center text-[10px] text-gray-500 pointer-events-none">
              Channel scope — <span className="text-cyan-300">Fit from source</span> to make these curves editable.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default GeneratorStage;
