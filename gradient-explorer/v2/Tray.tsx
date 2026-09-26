/**
 * Tray — the ONE surface under the hero card (Phase C, plans/ge-v2-unified-shell-plan.md §4;
 * the design record is plans/ge-v2-figma/trays-spec.md and the "GE v2 Tray" canvas).
 *
 * Mix · Image · Curves · Adjust · Paint · the stop inspector are six FACES of one thing: it hangs
 * from the card's bottom edge, inline with the gradient PANEL (its left edge follows the
 * panel's, so it never sits under the image column), floats OVER the wall (the wall and
 * the shelf never move — L6), one face open at a time, Esc cancels it. The tab row that
 * opens the five named faces is the ramp's control row in `WorkingHero` (the editor's
 * `stripAside`); the inspector has no tab — selecting a stop opens it and clearing the
 * selection closes it.
 *
 * What each face holds (the content inventory, trays-spec §4):
 *   • Mix (owner, 2026-09-07) — band B as a bar (the wall / shelf pick fills it; opening Mix
 *     arms it — the shell does that, see `openTray`) beside a column of the three L / C / h
 *     sliders, plain horizontal, always shown, with a LINK switch (off) that moves all three
 *     together, and Swap. Band A is the hero ramp's top half. Leaving Mix by a tab or a pick
 *     bakes the result (the shell's `use`) and the sources are gone; Esc cancels it instead.
 *   • Image (C.6, 2026-09-07, second take) — the PICTURE is the hero's slot, not the tray:
 *     the tray holds the method chips, the Path tools and the method's dials on the left
 *     (under the slot) and the colour cloud on the right (`ExtractStage`; the tools and
 *     cloud are portalled in by the slot's `ImageStage chrome="face"`). Spans from the
 *     card's left edge — the one face that grows to a pane.
 *   • Curves — the channel graph over the working base (moved here from the hero's expander).
 *     The face itself is `palette/components/faces/CurvesFace.tsx` since 2026-09-26, shared with
 *     GMT's Gradient Studio; so is Adjust's (`faces/AdjustFace.tsx`, its Apply is `applyAdjust`).
 *   • Adjust — three containers (owner, 2026-09-07): Hue rotate · Chroma · Contrast |
 *     Phase · Repeats · Posterize | Noise: Strength · Noise: Frequency · Targets. Standard GMT
 *     sliders, descriptions as tooltips, no keyframe diamonds (V4). Reworked 2026-09-13: a
 *     Lightness dial, Scale (continuous) with mirror tiles / reverse beside it, a text Reseed,
 *     the bins taking rows instead of squeezing, and Cancel / Apply in place of Reset all —
 *     see `AdjustFace`. There is no noise TYPE control: the pipeline has one kind of noise
 *     (seeded value noise, linearly resampled at Frequency — grep `seededNoise` in
 *     palette/core/generatorPipeline.ts), so there is nothing to choose.
 *   • Paint (2026-09-24) — the brush paints on the hero's bar itself (`palette/components/paint/PaintSurface`, laid over
 *     the Stops editor through its `stripTakeover` seam — no knots, no split); the tray holds the
 *     brush lane, the brushes and the picker (`palette/components/paint/PaintFace`). Leaving it applies
 *     the painting, Esc throws it away — @see palette/store/paintStore.
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
 * A DESK face has the same measured height cap since 2026-09-24 (L3), and scrolls inside it
 * only when it is taller — see `deskScroll`.
 * `ChannelGraphEditor` collapses its keyframe inspector to a rail below 560 px on its own
 * (grep `width < 560` there), so Curves needs nothing passed for that.
 *
 * The shadow rule this file obeys — a surface casts onto ground it floats over, never
 * onto chrome it is joined to, and a clip is the only guarantee:
 * @see docs/adr/0114-the-unified-shell-visual-language.md
 * @see docs/adr/0115-the-shell-on-a-phone.md
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useGeneratorStore, useGenParam, genEditStart, genEditEnd } from '../../palette/store/generatorStore';
import Slider from '../../components/Slider';
import { InputSkinProvider } from '../../components/inputs';
import { MixBandB } from './SourceBands';
import { useArmedSlot } from '../../palette/store/armedTarget';
import { useWorkingStore, deriveWorkingNow, type WorkingDerived } from '../../palette/store/workingStore';
import { ExtractStage } from './ExtractStage';
import { Act } from './ui/Act';
import { Icon } from './ui/Icon';
import { AdjustFace } from '../../palette/components/faces/AdjustFace';
import { CurvesFace } from '../../palette/components/faces/CurvesFace';
import { PaintFace } from '../../palette/components/paint/PaintFace';
import { rgbToHex } from '../../utils/colorUtils';

export type TrayFace = 'mix' | 'image' | 'curves' | 'adjust' | 'paint' | 'inspector' | null;

/** The faces with a tab, in tab order. Image's tab is shown only while a picture is loaded or its
 *  face is open (owner, 2026-09-25) — `WorkingHero` filters the row; the picture slot is the way in. */
export const TRAY_TABS: { face: Exclude<TrayFace, null | 'inspector'>; label: string; title: string }[] = [
  { face: 'mix', label: 'Mix', title: 'Blend this gradient with another — pick the other one from the wall or My Gradients' },
  { face: 'image', label: 'Image', title: 'Extract a gradient from an image' },
  { face: 'curves', label: 'Curves', title: 'Shape the lightness, chroma and hue curves' },
  { face: 'adjust', label: 'Adjust', title: 'Hue, chroma, contrast, lightness, posterize, scale, mirror, phase, noise' },
  { face: 'paint', label: 'Paint', title: 'Paint on the gradient — brushes, blend modes, smudge, soften, sharpen, clone' },
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
   *  Image face ignores it and grows from the card's left edge — the one face that grows to a
   *  pane — no further right than `right`. */
  left: number;
  /** Right edge, as an inset from the hero band's right: the ☰ menu's right edge, which ends the
   *  control row the tray hangs from (HT-17 — before, a fixed 24 put it 3–11 px off both the ramp
   *  and the ☰). Every desk face stops there; the Image face uses it as a cap, not a stretch. */
  right?: number;
  /** PHONE (Phase F): span the shell, cap the height, scroll inside, one column per face. */
  phone?: boolean;
  /** PHONE: the picture, handed to the Image face (the hero has no image column there). */
  imageSlot?: React.ReactNode;
  /** Told where the tray sits whenever it is re-measured, and null when it closes (@see TrayBox). */
  onBox?: (box: TrayBox | null) => void;
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
export const FULL_FACES: ReadonlySet<Exclude<TrayFace, null>> = new Set(['image', 'curves', 'adjust', 'paint', 'inspector'] as const);
/** DESK: the faces that do not use the wall (owner, 2026-09-25: "all the faces except mix dont use
 *  the selection canvas"). While one is open the wall is DIM until it is clicked, and the wall's
 *  toolbar offers to hide it for every such face — the phone's `FULL_FACES` rule, as a switch.
 *  The stop inspector is left out on purpose: it opens and closes with every knot click, so a dim
 *  would flicker, and the ground is its click-away target (grep `onPointerDownCapture` in the shell).
 *  @see ./GradientExplorerV2App (`wallIdle`) */
export const WALL_IDLE_FACES: ReadonlySet<Exclude<TrayFace, null>> = new Set(['image', 'curves', 'adjust', 'paint'] as const);
/** Where the open tray sits on screen (viewport px), or null when it is closed — for things on the
 *  ground that must keep clear of it (the wall's tool column, which the Image face covers). */
export interface TrayBox { left: number; bottom: number }
/** Phone: how much of the room BELOW the card the tray may take before it scrolls. Just
 *  over half — enough that a face is worth opening, little enough that the wall it floats
 *  over is still visibly there (which is the whole reason the tray floats). */
const PHONE_MAX_FRACTION = 0.55;

export const Tray: React.FC<Props> = ({ face, derived, width, inspectorHostRef, imageCloudRef, imageToolsRef, left, right = 24, phone = false, imageSlot, onBox }) => {
  // The cap is MEASURED from where the tray actually starts, not guessed as a `vh`: the
  // hero's height moves with the source (a split ramp, a Mix band), so a fraction of the
  // viewport would be a ceiling on the wrong number — the mistake `ExportMenu`'s `maxH`
  // records. Re-measured on resize and whenever the face changes (the face is what makes
  // the tray tall enough to care).
  //
  // DESK (L3, 2026-09-24): the same measured cap — the room below the tray's top less 8 px —
  // and the face scrolls inside it ONLY when it is taller (`deskScroll`). The shell is
  // `overflow-hidden`, so before this a face taller than the room (Adjust in two columns
  // below ~1000 × 705) had its Apply / Cancel off the screen with no way to reach them. A face
  // that fits keeps the `contents` wrapper, i.e. lays out exactly as it did.
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Paint's picker offers the gradient's own colours as its palette row, as the stop inspector does
  const paletteHex = useMemo(() => derived.palette.map((sw) => rgbToHex(sw.color)), [derived.palette]);
  const [maxH, setMaxH] = useState<number>(0);
  const [deskScroll, setDeskScroll] = useState(false);
  const onBoxRef = useRef(onBox);
  onBoxRef.current = onBox;
  // The box is reported AFTER a measure has settled the height, one frame on, so a face whose cap
  // or scroll just changed is read at its new size rather than the one it is leaving.
  const reportBox = (): void => {
    requestAnimationFrame(() => {
      const r = rootRef.current;
      if (!r || r.hidden) return;
      const b = r.getBoundingClientRect();
      onBoxRef.current?.({ left: Math.round(b.left), bottom: Math.round(b.bottom) });
    });
  };
  useEffect(() => {
    if (face === null) {
      onBoxRef.current?.(null);
      return;
    }
    const measure = () => {
      reportBox();
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      const room = window.innerHeight - top;
      if (phone) {
        // Mix keeps the wall in view (its cap); every other face takes the whole room, since
        // the wall under it is hidden by the shell while it is open (FULL_FACES).
        setMaxH(Math.max(160, Math.round(FULL_FACES.has(face) ? room : room * PHONE_MAX_FRACTION)));
        return;
      }
      const cap = Math.max(160, Math.round(room - 8));
      setMaxH(cap);
      // The face's own height, whichever wrapper it is in: the children stack in both (as the
      // root's flex items under `contents`, which do not shrink below their content, or as
      // blocks in the scroller). +1 for the root's bottom border.
      const kids = Array.from(wrapRef.current?.children ?? []) as HTMLElement[];
      setDeskScroll(kids.reduce((h, k) => h + k.offsetHeight, 0) + 1 > cap);
    };
    measure();
    window.addEventListener('resize', measure);
    // The tray hangs from the hero band, and the band's height moves AFTER a face opens
    // (Curves shows the source band, Mix its bars): measured 2026-09-11, the Curves face
    // ran 17 px past the viewport because the cap was taken before the hero grew. So the
    // band's own size is observed and the cap re-measured whenever it changes — and on a
    // desk the face's own box too, since what decides the scroll there is its height.
    const band = rootRef.current?.parentElement ?? null;
    const ro = typeof ResizeObserver !== 'undefined' && band ? new ResizeObserver(measure) : null;
    if (ro && band) ro.observe(band);
    if (ro && !phone) for (const k of Array.from(wrapRef.current?.children ?? [])) ro.observe(k);
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
        : {
            top: `calc(100% - ${TUCK_PX}px)`,
            left: face === 'image' ? 10 : left,
            right: face === 'image' ? 'auto' : right,
            // Image hugs its content from the card's left edge, but no further right than the
            // other faces (L7): below ~910 px it ran off the window. Its dials give up the width.
            maxWidth: face === 'image' ? `calc(100% - ${10 + right}px)` : undefined,
            maxHeight: maxH || undefined,
          }
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
        exactly as they did before it existed — unless the face is taller than the room
        (`deskScroll`, L3), when it becomes the same scroller the phone has. */}
    <div ref={wrapRef} className={phone ? 'min-h-0 overflow-y-auto overflow-x-hidden mobile-scroll' : deskScroll ? 'min-h-0 overflow-y-auto overflow-x-hidden' : 'contents'} data-gx-tray-scroll={!phone && deskScroll ? '' : undefined}>
      {/* every slider in a face wears the v2 'soft' skin (C.8) — one context, no per-face
          wiring; the studio keeps the default */}
      <InputSkinProvider skin="soft">
        {face === 'mix' && <MixFace phone={phone} />}
        {face === 'image' && <ExtractStage cloudHostRef={imageCloudRef} toolsHostRef={imageToolsRef} slot={imageSlot} phone={phone} />}
        {face === 'curves' && <CurvesFace derived={derived} width={width} phone={phone} />}
        {face === 'adjust' && <AdjustFace phone={phone} onApply={applyAdjust} />}
        {face === 'paint' && <PaintFace phone={phone} palette={paletteHex} />}
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

/**
 * What the Mix face says while a bar is ARMED — the next pick fills it (L5 = HT-05). It lived
 * on a row above the ground, where the face itself covered it (only "Pick a gr…" showed) and
 * where it pushed the wall down 30 px each time Mix opened (L6: nothing pushes the ground). Here
 * it sits over the bar the pick fills, and only while that is true (`smoke:ge-tray` reads it).
 * "· Esc cancels" is true since the owner made Esc on a face its Cancel (2026-09-24, ASK-1; grep
 * `escapeFace` in the shell) — the same words as SourceBands' armed title, the only other place.
 */
const ARMED_CAPTION: Record<'A' | 'B', string> = {
  B: 'Pick a gradient to mix with · Esc cancels',
  A: 'Pick a gradient to replace this one · Esc cancels',
};

const MixFace: React.FC<{ phone?: boolean }> = ({ phone = false }) => {
  const armed = useArmedSlot();
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
      {/* the gradient you're mixing with — the bar the next pick fills; while armed, the one
          line saying so sits over it */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        {armed && <span className="text-[13px] text-gx-armed truncate" data-gx-armed-caption="">{ARMED_CAPTION[armed]}</span>}
        <MixBandB height={36} />
      </div>
      {/* the three channel blends, A (0) → B (1); Link moves them as one */}
      <div className={`${phone ? 'w-full' : 'w-[320px] shrink-0'} flex flex-col gap-0.5`}>
        {MIX_CHANNELS.map((c) => (
          <Slider key={c.param} dense label={c.label} value={values[c.param]} min={0} max={1} step={0.01} defaultValue={0} onChange={(v) => change(c.param, v)} onDragStart={genEditStart} onDragEnd={genEditEnd} />
        ))}
        <div className="flex items-center gap-1.5 pt-1">
          <Act active={linked} onClick={() => setLinked((l) => !l)} title="Move the three sliders together">
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

/**
 * The Adjust face's APPLY in the Explorer (the face itself is shared since 2026-09-26 —
 * `palette/components/faces/AdjustFace.tsx`): bake the adjusted gradient into the working stops and
 * reset the dials — the SAME bake a face-leave does (`beginEdit`, grep it in the shell's `openTray`),
 * under the same guard, one undo step because `beginEdit` brackets itself.
 */
const applyAdjust = (): void => {
  const w = useWorkingStore.getState();
  const d = deriveWorkingNow();
  // the shell's leave-face guard, verbatim: nothing to fold, or a live source (Mix / Image
  // bake through `use` instead — and cannot be the input while this face is open)
  if (!d || d.passthrough || w.input.kind === 'build' || w.input.kind === 'extract') return;
  w.beginEdit();
};

export default Tray;
