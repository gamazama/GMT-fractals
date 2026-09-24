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
 *     sliders, descriptions as tooltips, no keyframe diamonds (V4). Reworked 2026-09-13: a
 *     Lightness dial, Scale (continuous) with mirror tiles / reverse beside it, a text Reseed,
 *     the bins taking rows instead of squeezing, and Cancel / Apply in place of Reset all —
 *     see `AdjustFace`. There is no noise TYPE control: the pipeline has one kind of noise
 *     (seeded value noise, linearly resampled at Frequency — grep `seededNoise` in
 *     palette/core/generatorPipeline.ts), so there is nothing to choose.
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

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { useGeneratorStore, useGenParam, genEditStart, genEditEnd, fitChannelsToTracks, prospectiveFitCurves, prospectiveFitFrames, readAdjustParamsNow, readSampledCurvesNow } from '../../palette/store/generatorStore';
import { useEngineStore } from '../../store/engineStore';
import { CURVE_SPACE_ORDER, curveSpaceKeys, toCurveChannels, type CurveSpace } from '../../palette/core/curveSpaces';
import { BlendSpacePicker } from '../../components/gradient/BlendSpacePicker';
import type { BlendColorSpace } from '../../types/graphics';
import { ChannelGraphEditor } from '../../palette/components/ChannelGraphEditor';
import Slider from '../../components/Slider';
import { InputSkinProvider } from '../../components/inputs';
import { MixBandB } from './SourceBands';
import { buildGradientRamp, DEFAULT_SLOT_MODS, unwrapHue, type Channels, type GeneratorParams } from '../../palette/core/generatorPipeline';
import { isIdentityAdjust } from '../../palette/core/workingPipeline';
import { useWorkingStore, deriveWorkingNow, type WorkingDerived } from '../../palette/store/workingStore';
import { ExtractStage } from './ExtractStage';
import { Act } from './ui/Act';
import { Icon } from './ui/Icon';

export type TrayFace = 'mix' | 'image' | 'curves' | 'adjust' | 'inspector' | null;

/** The four faces with a tab, in tab order. */
export const TRAY_TABS: { face: Exclude<TrayFace, null | 'inspector'>; label: string; title: string }[] = [
  { face: 'mix', label: 'Mix', title: 'Blend this gradient with another — pick the other one from the wall or My Gradients' },
  { face: 'image', label: 'Image', title: 'Extract a gradient from an image' },
  { face: 'curves', label: 'Curves', title: 'Shape the lightness, chroma and hue curves' },
  { face: 'adjust', label: 'Adjust', title: 'Hue, chroma, contrast, lightness, posterize, scale, mirror, phase, noise' },
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

/** The narrowest a bin may be before the face gives it a row of its own. MEASURED, not picked:
 *  the noise bin's Targets row is the widest thing any bin holds — "Targets" + the three chips
 *  is 250 px — plus the bin's 28 px of padding. At the old three-across layout a 767–800 px
 *  window gave each bin ~204 px and that row ran past its bin (measured 2026-09-13 at 800:
 *  the "hue" chip at x 716..760 in a bin ending at 759). */
const ADJUST_BIN_MIN = 280;
/** The gap between bins (`gap-3`) — part of the "do three fit" sum. */
const ADJUST_GAP = 12;

/**
 * THE ADJUST FACE — three bins of dials, and Cancel / Apply (owner, 2026-09-07; reworked
 * 2026-09-13). Modify/Noise carry `dynamicVisible: isMixed` (a Generator-era assumption);
 * Adjust belongs to WORKING, so `ignoreDynamicVisible` skips that gate for this mount only —
 * the shared param definition (also read by GeneratorStage / app-gmt) is untouched.
 * @see plans/ge-v2-design.md §12 item 4
 *
 *   • TONE — Hue rotate · Chroma × · Contrast · Lightness (an additive OkLab L offset,
 *     grep LIGHTNESS in palette/core/generatorPipeline.ts).
 *   • TILING — Posterize · Scale (the `repeats` key, continuous since 2026-09-13) with its
 *     mirror tiles / reverse toggles under it (the owner: mirror is a tiling control, so it sits
 *     next to Scale — the feature nests `palette-modify-toggles` under `repeats`) · Phase.
 *   • NOISE — Strength · Frequency · Targets, and a text RESEED at the bin's foot.
 *
 * ROWS, NOT SQUEEZE. The bins flow into as many columns as their content fits: three across
 * when the face has 3 × ADJUST_BIN_MIN, else two with the noise bin taking the full second
 * row, and one column on a phone. Measured from the face's own box (a ResizeObserver), because
 * the tray's width follows the panel's left edge, not the viewport.
 *
 * CANCEL / APPLY, NOT "RESET ALL" (owner, 2026-09-13: "this is the old paradigm which was
 * parametric — our current paradigm is destructive (with undo), so every application bakes a
 * new state and starts from fresh").
 *   • APPLY bakes the adjusted gradient into the working stops and resets the dials — the SAME
 *     bake a face-leave does (`beginEdit`, grep it in the shell's `openTray`), under the same
 *     guard, and it is one undo step because `beginEdit` brackets itself. The face stays open,
 *     so the next adjustment starts from the result. The noise is baked as it looks (the seed
 *     is in the derive). Frequency and Targets are left where they are, exactly as every other
 *     bake leaves them (MAIN_DEFAULTS): at Strength 0 they draw nothing, and a second reset
 *     could not share the bake's undo step (param brackets do not nest — the inner one pushes
 *     and clears the outer snapshot).
 *   • CANCEL discards the dials (`resetAdjust` — all three bins, Frequency and Targets
 *     included), one undo step, the stops untouched.
 *   • Both are unavailable while the dials draw nothing (`isIdentityAdjust`).
 * Closing the face still bakes, as it did before and as every face does — so Apply is "bake
 * and keep going", and closing is "bake and leave".
 */
const AdjustFace: React.FC<{ phone?: boolean }> = ({ phone = false }) => {
  const bin = 'min-w-0 rounded-[10px] bg-surface-viewport px-3.5 py-3';
  const reseedNoise = useGeneratorStore((s) => s.reseedNoise);
  const resetAdjust = useGeneratorStore((s) => s.resetAdjust);
  // Reseeding draws the same grain again from a new seed, so at Strength 0 it changes nothing
  // you can see — the button says so by being unavailable rather than by doing nothing.
  const noiseOn = useEngineStore((s) => ((s as unknown as { paletteGenerator?: { noise?: number } }).paletteGenerator?.noise ?? 0) > 0);
  // Whether the dials change the picture at all — the one condition both actions share. A
  // boolean selector, so a slider drag re-renders this only when it flips.
  const live = useEngineStore((s) => {
    const g = (s as unknown as { paletteGenerator?: GeneratorParams }).paletteGenerator;
    return !!g && !isIdentityAdjust(g);
  });
  const apply = useCallback(() => {
    const w = useWorkingStore.getState();
    const d = deriveWorkingNow();
    // the shell's leave-face guard, verbatim: nothing to fold, or a live source (Mix / Image
    // bake through `use` instead — and cannot be the input while this face is open)
    if (!d || d.passthrough || w.input.kind === 'build' || w.input.kind === 'extract') return;
    w.beginEdit();
  }, []);
  const [cols, setCols] = useState(phone ? 1 : 3);
  const roRef = useRef<ResizeObserver | null>(null);
  const measured = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    roRef.current = null;
    if (!el) return;
    const fit = (w: number) => setCols(phone ? 1 : w >= 3 * ADJUST_BIN_MIN + 2 * ADJUST_GAP ? 3 : w >= 2 * ADJUST_BIN_MIN + ADJUST_GAP ? 2 : 1);
    fit(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => fit(entries[0].contentRect.width));
    ro.observe(el);
    roRef.current = ro;
  }, [phone]);
  return (
    <div className="flex flex-col px-4 py-3 gap-3" data-gx-adjust data-gx-adjust-cols={cols}>
      <div ref={measured} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        <div className={bin} data-gx-adjust-bin="tone">
          <AutoFeaturePanel featureId="paletteGenerator" whitelistParams={['hueRotate', 'chroma', 'contrast', 'lightness']} hints="tooltip" keyframes={false} ignoreDynamicVisible />
        </div>
        <div className={bin} data-gx-adjust-bin="tiling">
          <AutoFeaturePanel featureId="paletteGenerator" whitelistParams={['bands', 'repeats', 'phase']} hints="tooltip" keyframes={false} ignoreDynamicVisible />
        </div>
        {/* two columns: the noise bin takes the whole second row rather than leaving a hole */}
        <div className={`${bin} flex flex-col`} style={cols === 2 ? { gridColumn: '1 / -1' } : undefined} data-gx-adjust-bin="noise">
          <AutoFeaturePanel
            featureId="paletteGenerator"
            groupFilter="Noise"
            labelOverrides={{ noise: 'Noise: Strength', noiseFreq: 'Noise: Frequency' }}
            hints="tooltip"
            keyframes={false}
            ignoreDynamicVisible
          />
          <div className="mt-auto pt-2 flex justify-end">
            <Act
              onClick={reseedNoise}
              disabled={!noiseOn}
              title={noiseOn ? 'The same grain, a new draw' : 'Turn Noise: Strength up first'}
              data-gx-adjust-reseed=""
            >
              Reseed
            </Act>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Act onClick={resetAdjust} disabled={!live} title="Put the dials back — the gradient stays as it is" data-gx-adjust-cancel="">
          Cancel
        </Act>
        <Act primary onClick={apply} disabled={!live} title="Make this the gradient and start the dials again (undo brings them back)" data-gx-adjust-apply="">
          Apply
        </Act>
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
  const space = useGeneratorStore((st) => st.curveSpace);

  // The ghost is built in OkLCh (the pipeline's space) and converted ONCE at the end into
  // the authoring space, so it shares the editable curve's axes and overlays it. That
  // conversion also does the unwrapping the old `unwrapHue` call did — for whichever
  // angular channel the space actually has, which for RGB and Oklab is none.
  const ghost = useMemo((): Record<string, number[]> | null => {
    if (!base) return null;
    let oklch: Channels | null;
    if (curvesOn && tracks) {
      oklch = buildGradientRamp(
        base,
        base,
        DEFAULT_SLOT_MODS,
        DEFAULT_SLOT_MODS,
        { ...readAdjustParamsNow(), mixL: 0, mixC: 0, mixH: 0 },
        prospectiveFitCurves(base, detail, smooth, space),
        noiseSeed,
      ).final;
    } else {
      oklch = derived.final ?? null;
    }
    if (!oklch) return null;
    const [a, b, c] = toCurveChannels(space, oklch);
    const keys = curveSpaceKeys(space);
    return { [keys[0]]: a, [keys[1]]: b, [keys[2]]: c };
  }, [base, curvesOn, tracks, detail, smooth, noiseSeed, derived.final, space]);
  const ghostPoints = useMemo(() => (base ? prospectiveFitFrames(base, detail, smooth, space) : null), [base, detail, smooth, space]);
  const g = useGeneratorStore.getState();
  // Detail / Smooth being dragged: the ghost layer shows itself (C.16)
  const [fitting, setFitting] = useState(false);
  /** the plot box's ResizeObserver, held so a re-mount disconnects the old one */
  const plotBoxRef = useRef<ResizeObserver | null>(null);
  // Fit on entry (C.4, owner: "curved mode should start fitting when we enter that mode"):
  // the face opens with the curves already editable. Leaving the face bakes (C.3) and
  // resets the tracks, so the next entry fits the baked gradient afresh.
  //
  // The second line is what makes the removed "Curves on / off" button safe (owner,
  // 2026-09-12: obsolete). `fitFromChannels` turns curves on itself, but tracks that
  // survive from elsewhere — the Generator dock in app-gmt shares this store and has its
  // own toggle — could arrive with `curvesOn` false, and with no button here the face
  // would show a plot that changes nothing and no way to say so. Entering the face means
  // editing the curves, so entering turns them on.
  //
  // Since 2026-09-24 the shell's tab switch does both of these FIRST, inside the click's undo
  // entry (grep `Curves opens on curves` in GradientExplorerV2App's `openTray`): done here, after
  // the face mounted, they were an entry made with the face already open, and its undo left the
  // face saying "Nothing to fit yet". This stays as the fallback for a face that mounts some other
  // way; on the tab route it finds the curves already there and does nothing.
  useEffect(() => {
    if (!tracks && base) g.fitFromChannels(base);
    else if (tracks && !curvesOn) g.setCurvesOn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PHONE: the plot loses 40 px so the controls above it and the wall below both stay
  // visible inside the tray's cap; the editor collapses its own inspector to a rail below
  // 560 px, so the whole width goes to the curve.
  // PHONE (owner, 2026-09-12): the plot's HEIGHT is no longer set from here — the editor
  // puts its track list and tools in strips above the curve and then draws the curve at 4:3
  // across whatever width it is given, so a fixed height would only fight the ratio. What is
  // set here is that width: the face's full bleed (`px-0`, hence `+ 32`) less a 6 px gutter
  // each side, which is the "min padding" the owner asked for.
  /**
   * THE SPACE CHOOSER, and its hover preview. The shared `BlendSpacePicker` previews a mode
   * by SHOWING it rather than by labelling it (which is why its labels carry no descriptors
   * — @see components/gradient/BlendSpacePicker.tsx). Here that means re-fitting the current
   * curve into the hovered space and drawing THAT: you can see whether RGB gives this
   * gradient a simpler line than OkLCh before you commit to redrawing in it.
   *
   * The preview is local and never written to the store — `onTracksChange` is a no-op while
   * one is showing, so a hover cannot edit the document.
   */
  const [previewSpace, setPreviewSpace] = useState<CurveSpace | null>(null);
  const shownSpace = previewSpace ?? space;
  const previewTracks = useMemo(() => {
    if (!previewSpace || !tracks) return null;
    // The LIVE curve, not the source: the owner's edits are what they expect to see redrawn.
    const live = readSampledCurvesNow() ?? base;
    return live ? fitChannelsToTracks(live, detail, smooth, previewSpace) : null;
  }, [previewSpace, tracks, detail, smooth, base]);
  const shownTracks = previewTracks ?? tracks;
  /**
   * WHERE it goes differs by pointer, because the control itself does. On a desk it expands
   * its five modes INLINE (that is what makes hover-preview possible), and the 112 px track
   * rail cannot hold them — measured: the list overflowed and clipped. So the desk puts it in
   * the controls row beside Detail and Smooth, which is the right company anyway: the space
   * is part of the fit recipe. A phone gets the same component's dropdown variant — one
   * compact button, no inline expansion — which fits the track strip fine, and the controls
   * row there is already 409 px of content in 363.
   */
  const spaceChooser = (
    <BlendSpacePicker
      value={space}
      order={CURVE_SPACE_ORDER as readonly BlendColorSpace[]}
      noun="axes"
      onSelect={(sp) => { setPreviewSpace(null); g.setCurveSpace(sp as CurveSpace, base); }}
      onPreview={(sp) => setPreviewSpace((sp as CurveSpace) ?? null)}
      compact
    />
  );

  const plotH = phone ? 320 : 240;
  const PHONE_SIDE_PAD = 6;
  /**
   * MEASURED, not derived from `width` (owner, 2026-09-12: the curve view "seems to be
   * cropping 255 so we have to zoom out to see that point", and "the keyframe inspector is
   * hidden so we cant open it" — one cause, this one).
   *
   * `width` is the RAMP's pixel width. The plot's box is this component's padded content
   * width, which is 32 px narrower on a desk (`px-4`) and was not a different number by
   * coincidence — measured 940 against 901. `ChannelGraphEditor` lays out sidebar + canvas +
   * inspector rail to whatever width it is handed, so being handed 39 px too many put the
   * canvas's right edge past the box: the t-axis end (frame 255) was clipped away, and the
   * canvas overflowed ON TOP of the inspector rail, where it swallowed its clicks —
   * `elementFromPoint` over the rail returned the canvas.
   *
   * So measure the box. A ResizeObserver rather than a second guess at the padding, because
   * the next person to change `px-4` will not think to come back here.
   */
  const [plotBoxW, setPlotBoxW] = useState(0);
  const plotBox = useCallback((el: HTMLDivElement | null) => {
    plotBoxRef.current?.disconnect();
    plotBoxRef.current = null;
    if (!el) return;
    setPlotBoxW(Math.round(el.getBoundingClientRect().width));
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => setPlotBoxW(Math.round(entries[0].contentRect.width)));
    ro.observe(el);
    plotBoxRef.current = ro;
  }, []);
  const plotW = phone ? width + 32 - PHONE_SIDE_PAD * 2 : plotBoxW || width;
  return (
    <div className={`flex flex-col gap-3 py-3 ${phone ? 'px-0' : 'px-4'}`}>
      <div className={`flex items-center gap-2 ${phone ? 'px-3 flex-nowrap' : 'flex-wrap'}`}>
        <Act disabled={!base} onClick={() => base && g.fitFromChannels(base)} title="Fit the curves from the source again (Detail and Smooth are the recipe; the faint ghost previews it)">
          Re-fit
        </Act>
        {/* the fit recipe; while either is being dragged the editor shows its ghost (C.16) */}
        {/* PHONE (owner, 2026-09-12): Re-fit, Detail and Smooth share ONE row — and the two
            sliders drop their VALUE WELLS to make it fit. Measured: a dense slider's floor is
            ~150 px (a 45 % label, a 64 px track, a 56 px fixed value cell), so Re-fit's 57
            plus two of them is 409 px of content in 363 and Detail's readout landed on
            Smooth's label. The 56 px cell is what the row cannot afford; the bar still says
            where the value is, and these two are small integers (owner: "I'd make the call
            that we don't need the textfields for these sliders"). Typing a value goes with
            it — the well is also the text field — which is the trade, on this screen only.

            THE NUMBER CAME BACK IN THE LABEL (owner, 2026-09-12: "the display is not
            showing"). Dropping the well took the value away entirely, and a bar alone does
            not read as a value — least of all Smooth, whose new default of 0 leaves the track
            EMPTY, so the control looked broken rather than merely terse. A one-or-two digit
            suffix inside the existing label costs ~14 px against the 56 the row could not
            afford, and the label is already `truncate` + `max-w-[45%]`, so it cannot push the
            track out. Typing a value is still desk-only, which was the accepted trade. */}
        <div className={phone ? 'flex-1 flex items-center gap-3 min-w-0' : 'contents'}>
          <div className={`${phone ? 'flex-1 min-w-0' : 'w-[170px] ml-2'}`}><Slider dense noValueField={phone} label="Detail" labelSuffix={phone ? <span className="tabular-nums text-fg">{detail}</span> : undefined} value={detail} min={2} max={10} step={1} onChange={(v) => g.setDetail(Math.round(v))} onDragStart={() => setFitting(true)} onDragEnd={() => setFitting(false)} /></div>
          <div className={phone ? 'flex-1 min-w-0' : 'w-[170px]'}><Slider dense noValueField={phone} label="Smooth" labelSuffix={phone ? <span className="tabular-nums text-fg">{smooth}</span> : undefined} value={smooth} min={0} max={10} step={1} onChange={(v) => g.setSmooth(Math.round(v))} onDragStart={() => setFitting(true)} onDragEnd={() => setFitting(false)} /></div>
        </div>
        {!phone && <div className="ml-auto flex items-center">{spaceChooser}</div>}
      </div>
      {shownTracks ? (
        <div
          ref={plotBox}
          className={`relative overflow-hidden ${phone ? '' : 'rounded-[10px]'}`}
          style={phone ? { paddingLeft: PHONE_SIDE_PAD, paddingRight: PHONE_SIDE_PAD } : { height: plotH }}
        >
          <ChannelGraphEditor
            tracks={shownTracks}
            onTracksChange={previewTracks ? () => {} : g.setTracks}
            width={plotW}
            height={plotH}
            phone={phone}
            previewRamp={derived.ramp ?? undefined}
            ghost={ghost}
            ghostPoints={ghostPoints}
            // the same scale fitChannelsToTracks applies, so the Pencil, the brush and the
            // wave simplify at the tolerance Detail is asking of the main fit
            epsScale={(11 - detail) / 3}
            ghostDefault={false}
            ghostActive={fitting}
            normalizeToggle={false}
            space={shownSpace}
            spaceChooser={phone ? spaceChooser : undefined}
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
