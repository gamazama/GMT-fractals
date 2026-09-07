/**
 * Tray — the ONE surface under the hero card (Phase C, plans/ge-v2-unified-shell-plan.md §4;
 * the design record is plans/ge-v2-figma/trays-spec.md and the "GE v2 Tray" canvas).
 *
 * Mix · Image · Curves · Adjust · the stop inspector are five FACES of one thing: it hangs
 * from the card's bottom edge, inline with the gradient PANEL (its left edge follows the
 * panel's, so it never sits under the image column), floats OVER the wall (the wall and
 * the shelf never move — L6), one face open at a time, Esc closes it. The tab row that
 * opens the four named faces is the ramp's control row in `WorkingHero` (the editor's
 * `stripAside`); the inspector has no tab — selecting a stop opens it and clearing the
 * selection closes it.
 *
 * What each face holds (the content inventory, trays-spec §4):
 *   • Mix (owner, 2026-09-07) — band B as a bar (the wall / shelf pick fills it; opening Mix
 *     arms it — the shell does that, see `openTray`) beside a column of the three L / C / h
 *     sliders, plain horizontal, always shown, with a LINK switch (off) that moves all three
 *     together, and Swap. Band A is the hero ramp's top half. Leaving Mix bakes the result
 *     (the shell's `use`) and the sources are gone.
 *   • Image (C.6, 2026-09-07, second take) — the PICTURE is the hero's slot, not the tray:
 *     the tray holds the method chips, the Path tools and the method's dials on the left
 *     (under the slot) and the colour cloud on the right (`ExtractStage`; the tools and
 *     cloud are portalled in by the slot's `ImageStage chrome="face"`). Spans from the
 *     card's left edge — the one face that grows to a pane.
 *   • Curves — the channel graph over the working base (moved here from the hero's expander).
 *   • Adjust — three containers (owner, 2026-09-07): Hue rotate · Chroma · Contrast |
 *     Phase · Repeats · Posterize | Noise: Strength · Noise: Frequency · Targets. Standard GMT
 *     sliders, descriptions as tooltips, no keyframe diamonds (V4).
 *   • Inspector — a portal host: `AdvancedGradientEditor` renders its stop inspector (the
 *     colour picker + the collapsible position / bias / interpolation column) INTO
 *     `inspectorHostRef` when a stop is selected. The host element must exist whatever face
 *     is showing, so the tray stays mounted and hides with the `hidden` attribute.
 *
 * Sources are still `workingStore` inputs: the shell maps the Mix face to `build` and the
 * Image face to `extract` (opening one enters the source live, closing it commits with
 * `use`) — Phase B's tab semantics, re-hosted (P3).
 */

import React, { useMemo, useState } from 'react';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { useGeneratorStore, useGenParam, genEditStart, genEditEnd, prospectiveFitChannels, prospectiveFitFrames, readAdjustParamsNow } from '../../palette/store/generatorStore';
import { ChannelGraphEditor } from '../../palette/components/ChannelGraphEditor';
import Slider from '../../components/Slider';
import { MixBandB } from './SourceBands';
import { buildGradientRamp, DEFAULT_SLOT_MODS, unwrapHue, type Channels } from '../../palette/core/generatorPipeline';
import type { WorkingDerived } from '../../palette/store/workingStore';
import { ExtractStage } from './ExtractStage';
import { Act } from './ui/Act';
import { Icon } from './ui/Icon';

export type TrayFace = 'mix' | 'image' | 'curves' | 'adjust' | 'inspector' | null;

/** The four faces with a tab, in tab order. */
export const TRAY_TABS: { face: Exclude<TrayFace, null | 'inspector'>; label: string; title: string }[] = [
  { face: 'mix', label: 'Mix', title: 'Blend this gradient with another — pick the other one from the wall or My Gradients' },
  { face: 'image', label: 'Image', title: 'Extract a gradient from an image' },
  { face: 'curves', label: 'Curves', title: 'Shape the lightness, chroma and hue curves' },
  { face: 'adjust', label: 'Adjust', title: 'Hue, chroma, contrast, posterize, repeats, phase, noise' },
];

interface Props {
  face: TrayFace;
  derived: WorkingDerived;
  /** The ramp's pixel width (the curve editor draws at it). */
  width: number;
  /** Callback ref for the inspector's portal host — stable across faces. */
  inspectorHostRef: (el: HTMLDivElement | null) => void;
  /** Callback refs for the Image face's hosts — the colour cloud and the Path tools that the
   *  hero's picture portals in (C.6, second take). */
  imageCloudRef: (el: HTMLDivElement | null) => void;
  imageToolsRef: (el: HTMLDivElement | null) => void;
  /** Left edge in the hero band's coordinates: the PANEL's left past its corner radius
   *  (owner, 2026-09-07: inline with the gradient panel, not under the image column). The
   *  Image face ignores it and spans the full width — the one face that grows to a pane. */
  left: number;
}

export const Tray: React.FC<Props> = ({ face, derived, width, inspectorHostRef, imageCloudRef, imageToolsRef, left }) => (
  <div
    hidden={face === null}
    data-gx-tray-root=""
    data-gx-tray={face ?? undefined}
    className="absolute z-30 flex flex-col rounded-b-[20px] bg-surface-section border border-t-0 border-line/20 shadow-lg"
    style={{ top: 'calc(100% - 11px)', left: face === 'image' ? 10 : left, right: face === 'image' ? 'auto' : 24 }}
  >
    {face === 'mix' && <MixFace />}
    {face === 'image' && <ExtractStage cloudHostRef={imageCloudRef} toolsHostRef={imageToolsRef} />}
    {face === 'curves' && <CurvesFace derived={derived} width={width} />}
    {face === 'adjust' && <AdjustFace />}
    {/* the inspector host lives whatever the face — the editor portals into it */}
    <div ref={inspectorHostRef} hidden={face !== 'inspector'} className="px-4 py-3" />
  </div>
);

const MIX_CHANNELS: { param: 'mixL' | 'mixC' | 'mixH'; label: string }[] = [
  { param: 'mixL', label: 'Lightness' },
  { param: 'mixC', label: 'Chroma' },
  { param: 'mixH', label: 'Hue' },
];

const MixFace: React.FC = () => {
  const swap = useGeneratorStore((s) => s.swap);
  const [mixL, setL] = useGenParam<number>('mixL');
  const [mixC, setC] = useGenParam<number>('mixC');
  const [mixH, setH] = useGenParam<number>('mixH');
  const [linked, setLinked] = useState(false);
  const values = { mixL: mixL ?? 0, mixC: mixC ?? 0, mixH: mixH ?? 0 };
  const setters = { mixL: setL, mixC: setC, mixH: setH };
  const change = (param: 'mixL' | 'mixC' | 'mixH', v: number) => {
    if (linked) {
      setL(v);
      setC(v);
      setH(v);
    } else setters[param](v);
  };
  return (
    <div className="flex items-stretch gap-4 px-4 py-3">
      {/* the gradient you're mixing with — the bar the next pick fills */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <MixBandB height={36} />
      </div>
      {/* the three channel blends, A (0) → B (1); Link moves them as one */}
      <div className="w-[320px] shrink-0 flex flex-col gap-0.5">
        {MIX_CHANNELS.map((c) => (
          <Slider key={c.param} label={c.label} value={values[c.param]} min={0} max={1} step={0.01} onChange={(v) => change(c.param, v)} onDragStart={genEditStart} onDragEnd={genEditEnd} />
        ))}
        <div className="flex items-center gap-1.5 pt-1">
          <Act active={linked} className={linked ? 'text-accent-300' : ''} onClick={() => setLinked((l) => !l)} title="Move the three sliders together">
            Link
          </Act>
          <Act onClick={swap} title="Swap the two gradients">
            <Icon name="swap" /> Swap
          </Act>
        </div>
      </div>
    </div>
  );
};

/** Modify + Noise as three containers (owner, 2026-09-07). Modify/Noise carry
 *  `dynamicVisible: isMixed` (a Generator-era assumption); Adjust belongs to WORKING, so
 *  `ignoreDynamicVisible` skips that gate for this mount only — the shared param definition
 *  (also read by GeneratorStage / app-gmt) is untouched. @see plans/ge-v2-design.md §12 item 4 */
const AdjustFace: React.FC = () => {
  const bin = 'flex-1 min-w-0 rounded-[10px] bg-surface-viewport px-3.5 py-3';
  return (
    <div className="flex items-stretch gap-3 px-4 py-3">
      <div className={bin}>
        <AutoFeaturePanel featureId="paletteGenerator" whitelistParams={['hueRotate', 'chroma', 'contrast']} hints="tooltip" keyframes={false} ignoreDynamicVisible />
      </div>
      <div className={bin}>
        <AutoFeaturePanel featureId="paletteGenerator" whitelistParams={['phase', 'repeats', 'bands']} hints="tooltip" keyframes={false} ignoreDynamicVisible />
      </div>
      <div className={bin}>
        <AutoFeaturePanel
          featureId="paletteGenerator"
          groupFilter="Noise"
          labelOverrides={{ noise: 'Noise: Strength', noiseFreq: 'Noise: Frequency' }}
          hints="tooltip"
          keyframes={false}
          ignoreDynamicVisible
        />
      </div>
    </div>
  );
};

/**
 * Curves over the WORKING base: the same channel graph editor the Generator uses, fed the
 * working pipeline's base. The prospective-fit ghost + ghost points use the Generator's
 * recipe, computed here because the base is no longer the A×B mix.
 */
const CurvesFace: React.FC<{ derived: WorkingDerived; width: number }> = ({ derived, width }) => {
  const tracks = useGeneratorStore((s) => s.tracks);
  const curvesOn = useGeneratorStore((s) => s.curvesOn);
  const detail = useGeneratorStore((s) => s.detail);
  const smooth = useGeneratorStore((s) => s.smooth);
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);
  const base = derived.base;

  const ghost = useMemo((): Channels | null => {
    if (!base) return null;
    if (curvesOn && tracks) {
      const f = buildGradientRamp(
        base,
        base,
        DEFAULT_SLOT_MODS,
        DEFAULT_SLOT_MODS,
        { ...readAdjustParamsNow(), mixL: 0, mixC: 0, mixH: 0 },
        prospectiveFitChannels(base, detail, smooth),
        noiseSeed,
      ).final;
      return { L: f.L, C: f.C, h: unwrapHue(f.h) };
    }
    return derived.final ? { L: derived.final.L, C: derived.final.C, h: unwrapHue(derived.final.h) } : null;
  }, [base, curvesOn, tracks, detail, smooth, noiseSeed, derived.final]);
  const ghostPoints = useMemo(() => (base ? prospectiveFitFrames(base, detail, smooth) : null), [base, detail, smooth]);
  const g = useGeneratorStore.getState();

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Act disabled={!base} onClick={() => base && g.fitFromChannels(base)} title="Fit editable curves from the current gradient">
          {tracks ? 'Re-fit from source' : 'Fit from source'}
        </Act>
        <Act disabled={!tracks} onClick={() => g.setCurvesOn(!curvesOn)}>
          {curvesOn ? 'Curves on' : 'Curves off'}
        </Act>
        <Act disabled={!tracks} onClick={() => g.resetCurves()}>
          Reset
        </Act>
        <label className="flex items-center gap-2 text-[13px] text-fg-muted ml-2">
          Detail <input type="range" min={2} max={10} value={detail} onChange={(e) => g.setDetail(Number(e.target.value))} /> {detail}
        </label>
        <label className="flex items-center gap-2 text-[13px] text-fg-muted">
          Smooth <input type="range" min={0} max={10} value={smooth} onChange={(e) => g.setSmooth(Number(e.target.value))} /> {smooth}
        </label>
        <span className="text-[13px] text-fg-muted ml-auto">Detail and Smooth are the fit recipe; the faint ghost previews a re-fit.</span>
      </div>
      {tracks ? (
        <div className="relative rounded-[10px] overflow-hidden" style={{ height: 240 }}>
          <ChannelGraphEditor
            tracks={tracks}
            onTracksChange={g.setTracks}
            width={width}
            height={240}
            previewRamp={derived.ramp ?? undefined}
            ghost={ghost}
            ghostPoints={ghostPoints}
            interactive
          />
        </div>
      ) : (
        <div className="h-[120px] rounded-[10px] bg-surface-viewport flex items-center justify-center text-[13px] text-fg-muted">
          Fit from source to make the lightness, chroma and hue curves editable.
        </div>
      )}
    </div>
  );
};

export default Tray;
