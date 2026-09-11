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
 *
 * PHONE (Phase F, 2026-09-10). The tray is still HUNG FROM ITS TAB — same tongue, same
 * TUCK_PX clip, same z-30 — but it spans the shell (`left: 10; right: 10`) instead of
 * following the panel's left edge: at 390 px the panel-aligned box was 257 px wide and
 * every face overflowed it. Two more things follow from the width:
 *   • its HEIGHT is capped at `PHONE_MAX_FRACTION` of the room between the card's bottom
 *     and the viewport (measured, from `maxH` — the same "measure, don't guess a vh"
 *     rule `ExportMenu` learned) and it scrolls inside, so the wall is never wholly
 *     covered by the thing floating over it;
 *   • the faces re-flow to one column: Mix's sliders go full width, Adjust's three bins
 *     stack, Curves puts its controls above the plot, and the Image face grows the picture
 *     (see `ExtractStage`).
 * `ChannelGraphEditor` collapses its keyframe inspector to a rail below 560 px on its own
 * (grep `width < 560` there), so Curves needs nothing passed for that.
 *
 * The shadow rule this file obeys — a surface casts onto ground it floats over, never
 * onto chrome it is joined to, and a clip is the only guarantee:
 * @see docs/adr/0114-the-unified-shell-visual-language.md
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { useGeneratorStore, useGenParam, genEditStart, genEditEnd, prospectiveFitChannels, prospectiveFitFrames, readAdjustParamsNow } from '../../palette/store/generatorStore';
import { ChannelGraphEditor } from '../../palette/components/ChannelGraphEditor';
import Slider from '../../components/Slider';
import { InputSkinProvider } from '../../components/inputs';
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
  /** PHONE (Phase F): span the shell, cap the height, scroll inside, one column per face. */
  phone?: boolean;
  /** PHONE: the picture, handed to the Image face (the hero has no image column there). */
  imageSlot?: React.ReactNode;
}

/**
 * How far the tray's top edge tucks up UNDER the card, in px. One number, two uses, and
 * they must stay the same one: it is the tray's own `top` offset, and it is where the
 * shadow's clip begins. Clipping there puts the shadow's first pixel exactly on the line
 * where the card's band ends and the ground starts.
 */
const TUCK_PX = 11;

/** Phone: the tray's inset from each side of the shell. It is the hero band's own phone
 *  padding (`p-2` in WorkingHero — 10 on a wide screen, 8 here), because the tray hangs
 *  from the card and its sides must land on the card's: change one and change the other. */
const PHONE_INSET = 0;
/** Phone: the faces that take the WHOLE room below the card and hide the wall (owner,
 *  2026-09-11: "except for mix mode, the other tabs don't need the wall visible at all").
 *  Mix is the exception because the wall IS its picker for the other gradient. */
export const FULL_FACES: ReadonlySet<Exclude<TrayFace, null>> = new Set(['image', 'curves', 'adjust', 'inspector'] as const);
/** Phone: how much of the room BELOW the card the tray may take before it scrolls. Just
 *  over half — enough that a face is worth opening, little enough that the wall it floats
 *  over is still visibly there (which is the whole reason the tray floats). */
const PHONE_MAX_FRACTION = 0.55;

export const Tray: React.FC<Props> = ({ face, derived, width, inspectorHostRef, imageCloudRef, imageToolsRef, left, phone = false, imageSlot }) => {
  // The cap is MEASURED from where the tray actually starts, not guessed as a `vh`: the
  // hero's height moves with the source (a split ramp, a Mix band), so a fraction of the
  // viewport would be a ceiling on the wrong number — the mistake `ExportMenu`'s `maxH`
  // records. Re-measured on resize and whenever the face changes (the face is what makes
  // the tray tall enough to care).
  const rootRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState<number>(0);
  useEffect(() => {
    if (!phone || face === null) return;
    const measure = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      // Mix keeps the wall in view (its cap); every other face takes the whole room, since
      // the wall under it is hidden by the shell while it is open (FULL_FACES).
      const room = window.innerHeight - top;
      setMaxH(Math.max(160, Math.round(face !== null && FULL_FACES.has(face) ? room : room * PHONE_MAX_FRACTION)));
    };
    measure();
    window.addEventListener('resize', measure);
    // The tray hangs from the hero band, and the band's height moves AFTER a face opens
    // (Curves shows the source band, Mix its bars): measured 2026-09-11, the Curves face
    // ran 17 px past the viewport because the cap was taken before the hero grew. So the
    // band's own size is observed and the cap re-measured whenever it changes.
    const band = rootRef.current?.parentElement ?? null;
    const ro = typeof ResizeObserver !== 'undefined' && band ? new ResizeObserver(measure) : null;
    if (ro && band) ro.observe(band);
    return () => { window.removeEventListener('resize', measure); ro?.disconnect(); };
  }, [phone, face]);

  return (
  <div
    ref={rootRef}
    hidden={face === null}
    data-gx-tray-root=""
    data-gx-tray={face ?? undefined}
    className={`absolute z-30 flex flex-col bg-surface-section border border-t-0 border-line/20 ${phone ? 'rounded-none border-x-0' : 'rounded-b-[20px]'}`}
    style={
      phone
        ? { top: `calc(100% - ${TUCK_PX}px)`, left: PHONE_INSET, right: PHONE_INSET, maxHeight: maxH || undefined, height: face !== null && FULL_FACES.has(face) ? maxH || undefined : undefined }
        : { top: `calc(100% - ${TUCK_PX}px)`, left: face === 'image' ? 10 : left, right: face === 'image' ? 'auto' : 24 }
    }
  >
    {/* THE SHADOW, and where it is allowed to fall (owner, 2026-09-10). The tray floats
        over the GROUND — the set rail, the narrowing bar and the wall below them — and it
        casts the heaviest shadow in the shell because it hangs furthest off it. What it
        must NOT touch is the card: the tray is JOINED to the card's bottom (border-t-0),
        and the active tab's tongue bridges across that join (grep data-gx-tab-tongue in
        WorkingHero). A shadow there reads as the tray floating over its own tab.
        So it is CLIPPED at TUCK_PX, the line where the card's band ends. Clipped, not
        offset: a CSS shadow is a Gaussian and its tail runs past the blur/2 an offset can
        cancel, which is why dropping the ambient by 8 px narrowed the bleed onto the
        tongue without ending it.
        It rides its own element so the clip cannot reach the tray's CONTENT — a face's
        dropdowns and the inspector's picker overflow the box on purpose. `-inset-px` puts
        it on the border box, so the clip lines up with the root's own edges. The -64s let
        the key and the flanks run free; only the top is cut. */}
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-px rounded-b-[20px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65),0_0_28px_-6px_rgba(0,0,0,0.5)]"
      style={{ clipPath: `inset(${TUCK_PX}px -64px -64px -64px)` }}
    />
    {/* PHONE: the SCROLL lives here, not on the root. The root must keep `overflow:
        visible` — the shadow above rides an element that reaches outside the box, and a
        face's dropdowns and the inspector's colour picker overflow it on purpose. On
        desktop this is `display: contents`, i.e. not a box at all, so the faces lay out
        exactly as they did before it existed. */}
    <div className={phone ? 'min-h-0 overflow-y-auto overflow-x-hidden mobile-scroll' : 'contents'}>
      {/* every slider in a face wears the v2 'soft' skin (C.8) — one context, no per-face
          wiring; the studio keeps the default */}
      <InputSkinProvider skin="soft">
        {face === 'mix' && <MixFace phone={phone} />}
        {face === 'image' && <ExtractStage cloudHostRef={imageCloudRef} toolsHostRef={imageToolsRef} slot={imageSlot} phone={phone} />}
        {face === 'curves' && <CurvesFace derived={derived} width={width} phone={phone} />}
        {face === 'adjust' && <AdjustFace phone={phone} />}
      </InputSkinProvider>
      {/* the inspector host lives whatever the face — the editor portals into it */}
      <div ref={inspectorHostRef} hidden={face !== 'inspector'} className="px-4 py-3" />
    </div>
  </div>
  );
};

const MIX_CHANNELS: { param: 'mixL' | 'mixC' | 'mixH'; label: string }[] = [
  { param: 'mixL', label: 'Lightness' },
  { param: 'mixC', label: 'Chroma' },
  { param: 'mixH', label: 'Hue' },
];

const MixFace: React.FC<{ phone?: boolean }> = ({ phone = false }) => {
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
    /* PHONE: the bar and the three sliders stack — 320 px of slider beside a bar needs a
       card this shell does not have at 390 (the two overlapped, measured Phase F). */
    <div className={`flex gap-4 px-4 py-3 ${phone ? 'flex-col' : 'items-stretch'}`}>
      {/* the gradient you're mixing with — the bar the next pick fills */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <MixBandB height={36} />
      </div>
      {/* the three channel blends, A (0) → B (1); Link moves them as one */}
      <div className={`${phone ? 'w-full' : 'w-[320px] shrink-0'} flex flex-col gap-0.5`}>
        {MIX_CHANNELS.map((c) => (
          <Slider key={c.param} dense label={c.label} value={values[c.param]} min={0} max={1} step={0.01} defaultValue={0} onChange={(v) => change(c.param, v)} onDragStart={genEditStart} onDragEnd={genEditEnd} />
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
const AdjustFace: React.FC<{ phone?: boolean }> = ({ phone = false }) => {
  const bin = 'flex-1 min-w-0 rounded-[10px] bg-surface-viewport px-3.5 py-3';
  return (
    /* PHONE: the three bins STACK. Side by side they are ~110 px each at 390, which puts a
       slider's label on top of its own number — the tray scrolls instead. */
    <div className={`flex gap-3 px-4 py-3 ${phone ? 'flex-col' : 'items-stretch'}`}>
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
const CurvesFace: React.FC<{ derived: WorkingDerived; width: number; phone?: boolean }> = ({ derived, width, phone = false }) => {
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
  // Detail / Smooth being dragged: the ghost layer shows itself (C.16)
  const [fitting, setFitting] = useState(false);
  // Fit on entry (C.4, owner: "curved mode should start fitting when we enter that mode"):
  // the face opens with the curves already editable. Leaving the face bakes (C.3) and
  // resets the tracks, so the next entry fits the baked gradient afresh.
  useEffect(() => {
    if (!tracks && base) g.fitFromChannels(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PHONE: the plot loses 40 px so the controls above it and the wall below both stay
  // visible inside the tray's cap; the editor collapses its own inspector to a rail below
  // 560 px, so the whole width goes to the curve.
  const plotH = phone ? 200 : 240;
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Act disabled={!base} onClick={() => base && g.fitFromChannels(base)} title="Fit the curves from the source again (Detail and Smooth are the recipe; the faint ghost previews it)">
          Re-fit
        </Act>
        <Act disabled={!tracks} onClick={() => g.setCurvesOn(!curvesOn)}>
          {curvesOn ? 'Curves on' : 'Curves off'}
        </Act>
        <Act disabled={!tracks} onClick={() => g.resetCurves()}>
          Reset
        </Act>
        {/* the fit recipe; while either is being dragged the editor shows its ghost (C.16) */}
        <div className={`${phone ? 'w-full' : 'w-[170px] ml-2'}`}><Slider dense label="Detail" value={detail} min={2} max={10} step={1} onChange={(v) => g.setDetail(Math.round(v))} onDragStart={() => setFitting(true)} onDragEnd={() => setFitting(false)} /></div>
        <div className={phone ? 'w-full' : 'w-[170px]'}><Slider dense label="Smooth" value={smooth} min={0} max={10} step={1} onChange={(v) => g.setSmooth(Math.round(v))} onDragStart={() => setFitting(true)} onDragEnd={() => setFitting(false)} /></div>
      </div>
      {tracks ? (
        <div className="relative rounded-[10px] overflow-hidden" style={{ height: plotH }}>
          <ChannelGraphEditor
            tracks={tracks}
            onTracksChange={g.setTracks}
            width={width}
            height={plotH}
            previewRamp={derived.ramp ?? undefined}
            ghost={ghost}
            ghostPoints={ghostPoints}
            ghostDefault={false}
            ghostActive={fitting}
            normalizeToggle={false}
            interactive
          />
        </div>
      ) : (
        <div className="h-[120px] rounded-[10px] bg-surface-viewport flex items-center justify-center text-[13px] text-fg-muted">
          Nothing to fit yet — pick a gradient.
        </div>
      )}
    </div>
  );
};

export default Tray;
