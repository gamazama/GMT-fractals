/**
 * CurvesFace — the channel graph over a gradient's base, shared by the Gradient Explorer's tray
 * (`gradient-explorer/v2/Tray.tsx`) and GMT's Gradient Studio
 * (`palette/components/GradientStudioPanel.tsx`). Moved here from the Explorer's Tray on
 * 2026-09-26, verbatim but for its input: it reads `CurvesFaceDerived` (base / final / ramp)
 * instead of the Explorer's `WorkingDerived`, which has those three fields and passes as is.
 * The curves themselves live in `generatorStore` (tracks, Detail, Smooth, the axes), which both
 * hosts share; BAKING them (on leaving the face) is the host's.
 *
 * The block below is the face's own record, written in the Explorer.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGeneratorStore, fitChannelsToTracks, prospectiveFitCurves, prospectiveFitFrames, readAdjustParamsNow, readSampledCurvesNow } from '../../store/generatorStore';
import { CURVE_SPACE_ORDER, curveSpaceKeys, toCurveChannels, type CurveSpace } from '../../core/curveSpaces';
import { BlendSpacePicker } from '../../../components/gradient/BlendSpacePicker';
import type { BlendColorSpace } from '../../../types/graphics';
import { ChannelGraphEditor } from '../ChannelGraphEditor';
import Slider from '../../../components/Slider';
import { buildGradientRamp, DEFAULT_SLOT_MODS, type Channels } from '../../core/generatorPipeline';
import type { RGB } from '../../core/oklab';
import { Act } from '../../../components/ui/Act';

/**
 * Curves over the WORKING base: the same channel graph editor the Generator uses, fed the
 * working pipeline's base. The prospective-fit ghost + ghost points use the Generator's
 * recipe, computed here because the base is no longer the A×B mix.
 */
/** What the face reads of the host's pipeline — `WorkingDerived` in the Explorer, the Studio's
 *  own derive in GMT. `base` is the channels the curves are fitted from, `final` the post-chain
 *  channels (the ghost with no live curves), `ramp` what the gradient looks like right now. */
export interface CurvesFaceDerived {
  base: Channels | null;
  final: Channels | null;
  ramp: RGB[] | null;
}

export const CurvesFace: React.FC<{ derived: CurvesFaceDerived; width: number; phone?: boolean }> = ({ derived, width, phone = false }) => {
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
      // 10 px on a desk, the size of the hero's blend chooser (HT-10) — at 8 px the two read as
      // the same control 49 px apart. The phone keeps it compact inside the track strip.
      compact={phone}
      // the quiet word "axes" before it, as the hero's row puts "blend" (owner, 5e), and a title
      // that is not the blend chooser's
      title="Curve axes"
      showNoun
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
