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
import { useGeneratorStore, useGeneratorDerived, genEdit, useGenParam } from '../store/generatorStore';
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../store/paletteEditorStore';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor';
import { applyEditorChange } from '../core/editorConfig';
import type { GradientConfig, GradientStop } from '../../types';
import { showToast } from '../../engine/store/toastStore';
import type { ChannelTracks } from './ChannelGraphEditor';
import { ChannelGraphEditor, CHANNEL_PLOT_INSET_LEFT, CHANNEL_PLOT_INSET_RIGHT } from './ChannelGraphEditor';
import { MixBlend } from './MixBlend';
import { CanonicalHero } from './CanonicalHero';
import { HeroSlot } from './HeroSlot';
// SourceRow and ColorBoxControls are LIFTED into their own modules (2026-09-03, GE v2 S3)
// so the v2 BuildStage can reuse them without a parallel copy — see those files' headers.
import { SourceRow } from './GeneratorSourceRow';
import { ColorBoxControls } from './ColorBoxControls';

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

// An empty editable track set — used to render the curve editor as a read-only SCOPE
// (dimmed, ghost-only) before any curves are fit, so the channels are always visible.
const EMPTY_TRACKS: ChannelTracks = {
  L: { id: 'L', type: 'float', label: 'Lightness', keyframes: [], color: '#22d3ee' },
  C: { id: 'C', type: 'float', label: 'Chroma', keyframes: [], color: '#a855f7' },
  h: { id: 'h', type: 'float', label: 'Hue', keyframes: [], color: '#22c55e' },
};

// --- ColorBox mode UI ------------------------------------------------------------

/** Segmented Mixer | ColorBox | Stops switch, bound to the hidden `generatorMode` DDFS
 *  param. The int ids are STABLE (0 = Mixer, 1 = ColorBox, 2 = Stops) — only the label
 *  changed (was "Mixed"); the `gen:mixed` step id stays for gradientTargets reveal compat. */
const GeneratorModeToggle: React.FC = () => {
  const [mode, setMode] = useGenParam<number>('generatorMode');
  const m = mode ?? 0;
  const opts: { label: string; value: number; step: string; title: string }[] = [
    { label: 'Mixer', value: 0, step: 'gen:mixed', title: 'Blend two source gradients per channel' },
    { label: 'ColorBox', value: 1, step: 'gen:colorbox', title: 'Sweep each OKLCh channel start→end under an easing curve' },
    { label: 'Stops', value: 2, step: 'gen:stops', title: 'Hand-author the gradient stop by stop' },
  ];
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-fg-dim">Mode</span>
      <div className="flex rounded-sm overflow-hidden ring-1 ring-line/10">
        {opts.map((o) => (
          <button
            key={o.value}
            data-gx-step={o.step}
            onClick={() => m !== o.value && genEdit(() => setMode(o.value))}
            title={o.title}
            aria-pressed={m === o.value}
            className={`text-[11px] px-2.5 py-0.5 transition-colors ${
              m === o.value ? 'bg-accent-500/25 text-accent-300' : 'bg-line/[0.04] text-fg-muted hover:text-fg-secondary'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Stops mode (generatorMode === 2): mount the engine AdvancedGradientEditor (consumed
 *  AS-IS) bound to the SHARED stops document (paletteEditorStore) via its (d) undo seam.
 *  This is the one stops gradient in the studio — the same store the document-level dock
 *  controls (Blend / Output / Reset, now in the Generator tab) and the round-trip
 *  providers reference. Its edits become the generator RESULT ramp (useGeneratorDerived
 *  branches on mode === 'stops'); the result hero above shows that ramp. */
const GeneratorStopsControls: React.FC = () => {
  const config = usePaletteEditorStore((s) => s.config);
  const setConfig = usePaletteEditorStore((s) => s.setConfig);
  // Shared normaliser (object form, tolerating the legacy bare-array shape) so the rule
  // can't drift between this surface and any other host that mounts the editor.
  const onChange = (val: GradientStop[] | GradientConfig): void => setConfig(applyEditorChange(config, val));
  return (
    <AdvancedGradientEditor
      value={config}
      onChange={onChange}
      onEditStart={editorEditStart}
      onEditEnd={editorEditEnd}
      edit={editorEdit}
    />
  );
};

export const GeneratorStage: React.FC = () => {
  const { stripA, stripB, ramp, config, ghost, ghostPoints } = useGeneratorDerived();
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
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
  const resetMix = useGeneratorStore((s) => s.resetMix);
  const [genMode] = useGenParam<number>('generatorMode');
  const colorbox = (genMode ?? 0) === 1;
  const stops = (genMode ?? 0) === 2;

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
    <div ref={rootRef} className="flex-1 flex flex-col min-w-0 bg-surface-dock overflow-hidden">
      {/* Top: sources → blend → source → result, inset to line up with the graph PLOT
          below (so the gradients and the curve t-axis share a left/right edge). Takes
          the slack so the graph stays compact with no dead space under it. */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto pt-3 pb-2 flex flex-col gap-1.5 ${(tracks && !colorbox) || stops ? '' : 'justify-center'}`}
        style={{ paddingLeft: padLeft, paddingRight: padRight }}
      >
        <div className="flex items-center mb-0.5">
          <GeneratorModeToggle />
        </div>
        {stops ? (
          // Stops mode: the engine stop editor IS the authoring surface; its edits feed
          // the result hero below. data-gx-target="stops" anchors the canonical 'stops'
          // drop target here (reached via the Generator tab → Stops sub-mode reveal chain),
          // so a sent/dropped gradient lands on the shared stops document.
          <div data-gx-target="stops">
            <GeneratorStopsControls />
          </div>
        ) : colorbox ? (
          // data-gx-target="colorbox" anchors the ColorBox drop target here (reached via
          // the Generator tab → ColorBox sub-mode reveal chain).
          <div data-gx-target="colorbox">
            <ColorBoxControls />
          </div>
        ) : (
          <>
            {curvesOn && (
              <div className="text-[10px] text-accent-300/70 bg-accent-500/[0.06] border border-accent-500/20 rounded-sm px-2 py-1 mb-0.5">
                Curves drive the output — sources are locked. <span className="text-accent-300">Re-fit</span> or <span className="text-accent-300">Reset points</span> below to edit the sources again.
              </div>
            )}
            <SourceRow which="A" ramp={stripA} preset={slotA} height={40} dimmed={curvesOn} />
            {/* The L/C/h blend sits BETWEEN A and B as vertical sliders bridging A→B. */}
            <MixBlend onSwap={swap} onReset={resetMix} dimmed={curvesOn} />
            <SourceRow which="B" ramp={stripB} preset={slotB} height={40} dimmed={curvesOn} />
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

        {/* Result — the shared select/drag hero. Apply / Fullscreen / Send-to are the
            lower-centre bin dock now (click the strip to reveal it); the vertical-enlarge
            toggle is built into the hero now (shared + persisted across all modes). */}
        <div className="mt-1">
          {/* The curves-on caption lives with the SOURCES above (the fuller note at the
              SourceRow block) — not here, where on mobile the hero portals to the rail and
              would leave this line orphaned, pointing at a hero that isn't beside it. */}
          {/* HeroSlot: inline on desktop; portals into the mobile hero rail (the live
              result stays put while the curve graph + controls scroll). */}
          <HeroSlot>
            <CanonicalHero
              config={config}
              ramp={ramp}
              name="Generated"
              autoName
              source="Generator"
              mode="generator"
              trailing={<span className="text-[11px] text-fg-dim">{config.stops.length} stops</span>}
            />
          </HeroSlot>
        </div>
      </div>

      {/* Channel curve graph (full width) with its controls. Fixed-height at the bottom
          — the keyframe inspector is about as tall as the editor ever needs to be, so the
          slack goes to the gradients above rather than dead space below the graph.
          Mixer mode only: the curve editor shapes the two-source mix; ColorBox sweeps the
          channels directly and Stops authors the gradient explicitly, so neither has a
          curve surface. */}
      {!colorbox && !stops && (
      <div className="shrink-0 flex flex-col border-t border-line/10 bg-surface-dock">
        <div className="flex items-center gap-2 flex-wrap px-3 py-1.5 shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-fg-dim">Curves</span>
          <button
            onClick={commitFit}
            title={curvesOn ? 'Re-fit the curves from the source at the current detail/smooth — replaces the current curves (undoable)' : 'Decompose the current mix into editable Lightness / Chroma / Hue curves'}
            className="text-[11px] px-2 py-1 rounded-sm bg-accent-500/20 text-accent-300 hover:bg-accent-500/30"
          >
            {curvesOn ? 'Re-fit from source' : 'Fit from source'}
          </button>
          <button onClick={resetCurves} className="text-[11px] px-2 py-1 rounded-sm bg-line/[0.06] text-fg-tertiary hover:bg-line/10">
            Reset points
          </button>
          <label
            title={tracks ? 'Drive the output from the edited curves (sources are dimmed)' : 'Fit from source first to create editable curves'}
            className={`flex items-center gap-1.5 text-[11px] select-none ${tracks ? 'text-fg-tertiary cursor-pointer' : 'text-fg-faint cursor-not-allowed'}`}
          >
            <input type="checkbox" checked={curvesOn} disabled={!tracks} onChange={(e) => setCurvesOn(e.target.checked)} className="accent-accent-500 disabled:opacity-50" />
            use curves
          </label>
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            detail
            <input type="range" min={1} max={10} step={1} value={detail} onChange={(e) => setDetail(+e.target.value)} className="w-20 accent-accent-500" />
            <span className="w-4 text-fg-tertiary">{detail}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-fg-muted">
            smooth
            <input type="range" min={1} max={15} step={1} value={smooth} onChange={(e) => setSmooth(+e.target.value)} className="w-20 accent-accent-500" />
            <span className="w-4 text-fg-tertiary">{smooth}</span>
          </div>
        </div>
        {/* The editor is ALWAYS mounted: editable when curves exist, otherwise a dimmed
            read-only SCOPE that still shows the ghost (the result channels) so you can
            watch the Modify dials shape the gradient before fitting. Dimmed whenever the
            curves aren't driving the output.
            data-gx-target="curves" anchors the Curves drop target here (P2 N5): dropping /
            sending a gradient onto this editor decomposes it into editable L/C/h curves
            (gradientTargets → generatorStore.fitCurvesFromRamp). Mixed mode only — the
            div is absent in ColorBox, so the target reveals via tab:Generator → gen:mixed. */}
        <div
          ref={graphRef}
          data-gx-target="curves"
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
            ghostPoints={ghostPoints}
            interactive={!!tracks}
          />
          {!tracks && (
            <div className="absolute inset-x-0 bottom-1 text-center text-[10px] text-fg-dim pointer-events-none">
              Channel scope — <span className="text-accent-300">Fit from source</span> to make these curves editable.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default GeneratorStage;
