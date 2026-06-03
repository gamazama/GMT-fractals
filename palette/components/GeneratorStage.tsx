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
import { useGeneratorStore, useGeneratorDerived } from '../store/generatorStore';
import { buildPresetCatalog } from '../core/presetCatalog';
import { ChannelGraphEditor } from './ChannelGraphEditor';
import { GradientStrip } from './GradientStrip';
import { GradientSourcePicker } from './GradientSourcePicker';
import { GeneratorSlotMods } from './GeneratorSlotMods';
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

// One source: its gradient (click to open the searchable picker) with the slot's
// modifiers right beside it.
const SourceRow: React.FC<{
  which: 'A' | 'B';
  ramp: { r: number; g: number; b: number }[];
  preset: number;
  onPick: (idx: number) => void;
}> = ({ which, ramp, preset, onPick }) => {
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
    <div className="flex gap-3 items-start">
      {/* Gradient + name (click to change; drop a favourite here to load it) */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 w-14">Source {which}</span>
          <span className="text-[11px] text-gray-400 truncate">{name}</span>
          <span className="ml-auto text-[10px] text-gray-600">{dropping ? 'drop to load' : 'click to change'}</span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          onDragOver={onDragOver}
          onDragLeave={() => setDropping(false)}
          onDrop={onDrop}
          className={`block w-full rounded-sm ring-1 transition ${dropping ? 'ring-amber-300/80 ring-2' : 'ring-white/10 hover:ring-cyan-500/40'}`}
        >
          <GradientStrip ramp={ramp} height={56} />
        </button>
        {open && <GradientSourcePicker title={`Source ${which}`} value={preset} onChange={onPick} onClose={() => setOpen(false)} placement="left" />}
      </div>
      {/* Slot modifiers, beside the gradient */}
      <div className="w-52 shrink-0 pt-5">
        <GeneratorSlotMods which={which} />
      </div>
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

  const { ref: graphRef, w: graphW, h: graphH } = useContainerSize();

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
      {/* Upper ~2/3: sources at top, result vertically centred */}
      <div className="flex-[2] min-h-0 overflow-y-auto flex flex-col px-5 pt-4">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-2 shrink-0">
          <SourceRow which="A" ramp={stripA} preset={slotA} onPick={(i) => setSlot('A', i)} />
          <div className="flex justify-center">
            <button onClick={swap} title="Swap A/B" className="text-[11px] text-gray-300 px-2 py-0.5 rounded-sm bg-white/[0.06] hover:bg-white/10">
              ⇅ Swap A/B
            </button>
          </div>
          <SourceRow which="B" ramp={stripB} preset={slotB} onPick={(i) => setSlot('B', i)} />
        </div>

        {/* Result — vertically centred in the remaining space, bordered */}
        <div className="flex-1 min-h-0 flex items-center py-4">
          <div className="w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-400">Result</div>
                <FavStar config={config} name="Generated" source="Generator" />
              </div>
              <div className="text-[11px] text-gray-500">{config.stops.length} stops</div>
            </div>
            <div className="rounded-md border border-white/15 bg-black/30 p-2 shadow-lg">
              <GradientStrip ramp={ramp} height={104} />
            </div>
          </div>
        </div>
      </div>

      {/* Lower ~1/3: channel curve graph (full width) with centred controls */}
      <div className="flex-[1] min-h-0 flex flex-col border-t border-white/10 bg-zinc-950">
        <div className="flex items-center justify-center gap-3 flex-wrap px-5 py-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">Channel curves</span>
          <button onClick={fitFromSource} className="text-[11px] px-2 py-1 rounded-sm bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30">
            Fit from source
          </button>
          <button onClick={resetCurves} className="text-[11px] px-2 py-1 rounded-sm bg-white/[0.06] text-gray-300 hover:bg-white/10">
            Reset points
          </button>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={curvesOn} onChange={(e) => setCurvesOn(e.target.checked)} className="accent-cyan-500" />
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
        <div ref={graphRef} className="flex-1 min-h-0 overflow-hidden">
          {tracks ? (
            <ChannelGraphEditor tracks={tracks} onTracksChange={setTracks} width={graphW} height={graphH} previewRamp={ramp} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-[11px] text-gray-500">
              No curves yet — click <span className="text-cyan-300 mx-1">Fit from source</span> to decompose the current mix into editable
              L / C / h curves.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratorStage;
