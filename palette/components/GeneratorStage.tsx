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
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../store/paletteEditorStore';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor';
import { applyEditorChange } from '../core/editorConfig';
import type { GradientConfig, GradientStop } from '../../types';
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
import { CanonicalHero } from './CanonicalHero';
import { HeroSlot } from './HeroSlot';
import { setFavientDrag, beginCustomAvatarDrag } from '../core/favientDnd';
import { fitRampToStops } from '../core/stopFit';
import { favientSig } from '../store/favientsStore';
import { setDragOrigin } from '../store/dragVisual';
import { setHeroPick, setHeroDrag, useHeroPick, useActiveHeroMode, useHeroOptionsOpen } from '../store/heroSelection';

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

// One source slot — a CanonicalHero-style DRAG SOURCE + pick surface (P2 N4). Click PICKS
// the slot's gradient into the Generator surface's hero selection (opens the dock so it can
// be sent to another target — the other slot, Stops, Favients…); drag morphs the avatar out
// onto a target. It is ALSO the registered `gen-a`/`gen-b` DROP target — the canonical
// dropbox over `data-gx-target` (DropTargetLayer) handles drops, so the slot needs no
// bespoke drop wiring. The old click→catalog dropdown is GONE: sources are set by dragging /
// sending a gradient onto the slot (or via the Picker → Generator·A/B), per the canonical
// model. The slot-mod dials open from the ⚙ button to the right.
const SourceRow: React.FC<{
  which: 'A' | 'B';
  ramp: { r: number; g: number; b: number }[];
  preset: number;
  height: number;
  dimmed?: boolean;
}> = ({ which, ramp, preset, height, dimmed }) => {
  const name = useMemo(() => buildPresetCatalog()[preset]?.name ?? '—', [preset]);
  const targetId = which === 'A' ? 'gen-a' : 'gen-b';
  // The slot's current gradient as a config so it can be picked/dragged like any hero.
  // Derived from the displayed source ramp (covers both catalog presets and ramps loaded
  // via a drop); favientSig keys the pick so the selected ring is stable across renders.
  const config = useMemo(() => fitRampToStops(ramp, { maxStops: 24 }), [ramp]);
  const key = useMemo(() => favientSig(config), [config]);
  const payload = useMemo(() => ({ config, name, source: `Generator · ${which}` }), [config, name, which]);

  // Selected when this slot is the Generator surface's ACTIVE pick. The surface pick is
  // shared with the result hero (one per surface), so picking a slot deselects the result
  // and vice-versa — exactly one thing is "in hand" in the Generator at a time.
  const surfacePick = useHeroPick('generator');
  const activeMode = useActiveHeroMode();
  const optionsOpen = useHeroOptionsOpen();
  const selected = surfacePick?.key === key && activeMode === 'generator' && optionsOpen;

  return (
    // When curves drive the output the source is FROZEN: dimmed AND non-interactive
    // (pointer-events-none) so a click/drag that would silently do nothing can't read
    // as broken. The host shows a "bake/reset to edit sources" hint above.
    <div className={`relative min-w-0 transition-opacity ${dimmed ? 'opacity-40 pointer-events-none select-none' : ''}`} aria-disabled={dimmed || undefined}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[10px] uppercase tracking-wide text-fg-dim w-14 shrink-0">Source {which}</span>
        <span className="text-[11px] text-fg-secondary truncate">{name}</span>
        <span className="ml-auto text-[10px] shrink-0 text-fg-dim">click to select · drag to place</span>
      </div>
      {/* gradient (the pick/drag surface + gen-a/gen-b drop anchor) + the slot-mods trigger */}
      <div className="flex items-center gap-2">
        {/* data-gx-selectable: clicking the slot opens the dock without the global click-away
            closing it (same as CanonicalHero). draggable: morph an avatar out onto a target. */}
        <button
          data-gx-target={targetId}
          data-gx-selectable=""
          draggable
          onDragStart={(e) => {
            setFavientDrag(e.dataTransfer, payload);
            beginCustomAvatarDrag(e.dataTransfer);
            setDragOrigin(e.currentTarget.getBoundingClientRect()); // morph the avatar out of the strip
            setHeroDrag({ mode: 'generator', key, payload, selfTargetId: targetId });
          }}
          onClick={(e) => {
            setDragOrigin(e.currentTarget.getBoundingClientRect()); // in-hand avatar morphs from the strip
            setHeroPick({ mode: 'generator', key, payload, selfTargetId: targetId });
          }}
          title={`Source ${which} — click to select, drag onto a target, or drop a gradient here to load it`}
          className={`block flex-1 min-w-0 rounded-sm ring-1 transition cursor-grab active:cursor-grabbing ${
            selected ? 'ring-2 ring-accent-400' : 'ring-line/10 hover:ring-accent-500/40'
          }`}
        >
          <GradientStrip ramp={ramp} height={height} />
        </button>
        <GeneratorSlotMods which={which} />
      </div>
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
        className="ml-auto flex items-center gap-1.5 text-[11px] bg-surface-raised text-fg-secondary rounded-sm pl-1 pr-1.5 py-0.5 ring-1 ring-line/10 hover:ring-accent-500/40 transition"
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
  <div className="flex flex-col gap-1 rounded-md border border-line/10 bg-line/[0.02] p-2">
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wide text-fg-muted">{label}</span>
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
        <span className="text-[10px] uppercase tracking-wide text-fg-dim">Per-channel sweep</span>
        <button
          onClick={() => setPickOpen(true)}
          title="Approximate an existing gradient as ColorBox sweeps (the closest per-channel match)"
          className="ml-auto text-[11px] px-2 py-0.5 rounded-sm bg-line/[0.06] text-fg-tertiary hover:text-fg-secondary hover:bg-line/10 transition-colors"
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
