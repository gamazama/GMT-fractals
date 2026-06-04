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
import { useGeneratorStore, useGeneratorDerived, genEdit } from '../store/generatorStore';
import { buildPresetCatalog } from '../core/presetCatalog';
import { ChannelGraphEditor, CHANNEL_PLOT_INSET_LEFT, CHANNEL_PLOT_INSET_RIGHT } from './ChannelGraphEditor';
import { GradientStrip } from './GradientStrip';
import { GradientSourcePicker } from './GradientSourcePicker';
import { GeneratorSlotMods } from './GeneratorSlotMods';
import { MixBlend } from './MixBlend';
import { FavStar } from './FavStar';
import { readFavientDrag, FAVIENT_DND_MIME } from '../core/favientDnd';
import { renderStopsToRamp } from '../core/gmtGradient';

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
    <div className={`relative min-w-0 transition-opacity ${dimmed ? 'opacity-40' : ''}`}>
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
      {open && <GradientSourcePicker title={`Source ${which}`} value={preset} onChange={onPick} onClose={() => setOpen(false)} placement="left" />}
    </div>
  );
};

export const GeneratorStage: React.FC = () => {
  const { stripA, stripB, ramp, config } = useGeneratorDerived();
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

  // Live re-fit: while curves are ON, dragging detail/smooth re-runs the fit (debounced),
  // so the channel curves re-shape as you drag instead of only on "Fit from source".
  // We track the last-seen detail|smooth so the effect ignores the curvesOn flip itself
  // (Fit already produced those curves) and only re-fits on a genuine slider change.
  const fitRef = useRef(fitFromSource);
  fitRef.current = fitFromSource;
  const lastFitKey = useRef<string | null>(null);
  useEffect(() => {
    const key = `${detail}|${smooth}`;
    if (!curvesOn) { lastFitKey.current = key; return; } // nothing to fit when curves are off
    if (lastFitKey.current === key) return; // unchanged (e.g. the Fit that turned curves on)
    lastFitKey.current = key;
    const t = window.setTimeout(() => genEdit(() => fitRef.current()), 120);
    return () => window.clearTimeout(t);
  }, [detail, smooth, curvesOn]);

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
        className={`flex-1 min-h-0 overflow-y-auto pt-3 pb-2 flex flex-col gap-1.5 ${tracks ? '' : 'justify-center'}`}
        style={{ paddingLeft: padLeft, paddingRight: padRight }}
      >
        <SourceRow which="A" ramp={stripA} preset={slotA} onPick={(i) => setSlot('A', i)} height={40} dimmed={curvesOn} />
        {/* The L/C/h blend sits BETWEEN A and B as vertical sliders bridging A→B. */}
        <MixBlend onSwap={swap} dimmed={curvesOn} />
        <SourceRow which="B" ramp={stripB} preset={slotB} onPick={(i) => setSlot('B', i)} height={40} dimmed={curvesOn} />

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
              {curvesOn && <span className="text-[10px] text-cyan-400/70 truncate">curves drive the output — sources dimmed</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-gray-500">{config.stops.length} stops</span>
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
          slack goes to the gradients above rather than dead space below the graph. */}
      <div className="shrink-0 flex flex-col border-t border-white/10 bg-zinc-950">
        <div className="flex items-center gap-2 flex-wrap px-3 py-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Curves</span>
          <button onClick={() => genEdit(fitFromSource)} className="text-[11px] px-2 py-1 rounded-sm bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30">
            Fit from source
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
        <div
          ref={graphRef}
          className={`overflow-hidden transition-opacity ${tracks && !curvesOn ? 'opacity-50' : ''}`}
          style={{ height: tracks ? 264 : 84 }}
        >
          {tracks ? (
            <ChannelGraphEditor tracks={tracks} onTracksChange={setTracks} width={graphW} height={graphH} previewRamp={ramp} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-500 px-4">
              No curves yet — click <span className="text-cyan-300 mx-1">Fit from source</span> to decompose the current mix into editable
              Lightness / Chroma / Hue curves.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratorStage;
