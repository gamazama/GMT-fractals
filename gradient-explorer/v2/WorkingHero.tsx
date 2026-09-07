/**
 * WorkingHero — the ONE hero of the v2 shell, and it IS the stops editor (owner reviews
 * 2026-09-03; plans/ge-v2-design.md §5.1 revised, §6b, §12).
 *
 * Phase B (2026-09-06, plans/ge-v2-unified-shell-plan.md §4) made it the three-column band
 * of mock C. The owner's Figma pass (2026-09-07, "Hero v3 (agreed)" in the GE v2 Hero file;
 * plans/ge-v2-figma/hero-spec.md §7a) reshaped it into a CARD:
 *
 *   • the band (`surface-raised`) holds one card, radius 32, 10 px inset; the 24 px gutter
 *     (V7) is kept INSIDE it (10 + 1 + 13). Two columns, not three:
 *   • SOURCE — the `ImageSlot` (L3: the image is reached into, never switched to). Slim
 *     while empty, a card-tall square once an image is loaded. Phase C turns its click
 *     from a tab switch into a tray.
 *   • the PANEL — radius 20 on the wall's own ground (`surface-viewport`): a header strip
 *     (name · state · More like this · the four USE icons), the palette, the ramp, the
 *     expanders. The USE column and both zone labels are gone — the card's shape does the
 *     grouping (owner: the less text on screen, the better). Keep · Share · Export ·
 *     Wallpaper are icon `Act`s at the header's right edge (L2); the shell still owns
 *     what they DO (P3).
 *
 * Surfaces map the Figma ladder (band > card > panel, three clear steps) onto the tokens
 * the running scheme already generates: raised > section > viewport. The Figma hexes are
 * lighter than the app's — see hero-spec.md §7b.
 *
 * Two behaviours the band carries:
 *
 *   • **L8 — the hero never unmounts once it exists.** An empty source (the Image tab with
 *     no image, a Mix with nothing in it) keeps the LAST gradient on the ramp — shown, not
 *     editable, since there is no live document behind it — with an empty source band
 *     saying what is missing. The previous working gradient is one undo away through
 *     workingStore, unchanged. Guarded by `npm run smoke:ge-hero`.
 *   • **L9's quiet hero is GONE** (owner, 2026-09-07: no source hiding when the pointer is
 *     over the wall). The hero is the same whatever the pointer does.
 *
 * Top to bottom inside the WORK column:
 *   1. name · state chip · More like this · ★  (Mix is a source tab, not a button here —
 *      owner: less UI is more likely to be clicked than advertising in a busy one)
 *   2. the PALETTE ROW — draggable sample positions on top of the ramp (PaletteRow). A click
 *      on a swatch selects its stop in the editor (creating one if there is none), so the
 *      palette and the stops are one thing seen twice — owner review 2026-09-03.
 *   3. the RAMP — SPLIT whenever the pipeline is doing something (owner, 2026-09-03: "the
 *      source and result language as a split hero"): a thin SOURCE band on top
 *      (SourceBands: the picked gradient / the raw image ramp / the stops before Adjust; in
 *      Mix it is A · crossfade · B, the two bands being the armable slots) and the RESULT
 *      band under it, which is the shared AdvancedGradientEditor in `strip` chrome: draggable stop knots,
 *      add on click, right-click menu, per-stop colour picker under it whose Palette row IS
 *      the working palette (one palette, not two). Its inspector's left column carries our
 *      Curves ▾ / Adjust ▾ toggles (`stripAside`) beside the editor's own blend / output /
 *      menu items — no separate bar. The first gesture on a live or picked input is the bake
 *      (workingStore.beginEdit).
 *   4. the TRAY (Phase C, 2026-09-07 — `Tray.tsx`): one surface hanging from the card's
 *      bottom edge over the wall, one face at a time — Mix · Image · Curves · Adjust from
 *      the tab row in the ramp's control row, the stop inspector from a stop selection.
 *      The shell owns which face is open (`tray` / `onTray`), since Mix and Image are
 *      sources; the hero only hosts it. Nothing here pushes the wall any more.
 *
 * There is no previewing state and no preview row any more: a Browse or shelf click IS a
 * Use (the shell does it), the previous working gradient is one undo step away, and the
 * first ramp gesture edits. States: hidden (nothing yet) · working · live from Mix /
 * Image · edited (return to source).
 *
 * Editor wiring: while the input is NOT the stops document, the editor shows the derived
 * config (verbatim for a picked gradient, fitted for a live one) and the bracket hooks fold
 * it into the document on the first gesture; afterwards it edits paletteEditorStore through
 * the (d) seam (editorEditStart / editorEditEnd / editorEdit). Stop ids are index-derived by
 * the fitter, so the fold hands the editor the same ids it already holds.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdvancedGradientEditor, { type AdvancedGradientEditorHandle } from '../../components/AdvancedGradientEditor';
import { useWorkingStore, type WorkingDerived } from '../../palette/store/workingStore';
import { useFavientsStore, favientSig, isRecentGroup } from '../../palette/store/favientsStore';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../../palette/store/paletteEditorStore';
import { applyEditorChange } from '../../palette/core/editorConfig';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { PaletteRow } from './PaletteRow';
import { ImageSlot } from './ImageSlot';
import { SourceBands, SOURCE_BAND_H, MIX_RESULT_H, mixSourceHeight } from './SourceBands';
import { Tray, TRAY_TABS, type TrayFace } from './Tray';
import { Act } from './ui/Act';
import { StateChip } from './ui/StateChip';
import { Icon } from './ui/Icon';
import { Floating } from './ui/Floating';
import { runExport, useRecentExports, exportActionLabel } from './exportActions';
import type { RGB } from '../../palette/core/oklab';
import type { GradientConfig, GradientStop } from '../../types';
import type { SourceId } from './GradientExplorerV2App';

/** The gradient panel's corner radius (px) — `rounded-[20px]` on the panel below. */
const PANEL_RADIUS = 20;

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Measure an element's width (for the palette drag scale and the curve editor). A callback
 *  ref, not an effect: the hero mounts its ramp AFTER the first render (it is hidden until a
 *  pick), so an effect with an empty dep list would observe nothing and the width would stay
 *  at its seed — which is exactly the "squashed curves" the owner saw. */
const useWidth = (): [(el: HTMLDivElement | null) => void, number] => {
  const [w, setW] = useState(640);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    const update = () => setW(Math.max(200, el.clientWidth));
    update();
    ro.current = new ResizeObserver(update);
    ro.current.observe(el);
  }, []);
  return [ref, w];
};

interface Props {
  derived: WorkingDerived;
  source: SourceId;
  /** Which tray face is open (Phase C) — the shell owns it, since Mix / Image are sources. */
  tray: TrayFace;
  /** Open a face (the same face again closes it); `null` closes. */
  onTray: (face: TrayFace) => void;
  /** Cancel the open face — back to what was there before it (C.3 / C.9: the state chip on
   *  a live face, and a click on the ramp's SOURCE half while a face is open). */
  onCancelFace: () => void;
  /** Bake the open face's result (C.9: a click on the ramp's RESULT half) — the face closes
   *  and its transformations reset; the stops are the result. */
  onBake: () => void;
  onShare: () => void;
  onExport: () => void;
  onWallpaper: () => void;
  exportOpen: boolean;
  /** Export's popover, anchored inside the use cluster. */
  exportMenu?: React.ReactNode;
}

export const WorkingHero: React.FC<Props> = ({ derived, source, tray, onTray, onCancelFace, onBake, onShare, onExport, onWallpaper, exportOpen, exportMenu }) => {
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const liveFrom = useWorkingStore((s) => s.liveFrom);
  const favients = useFavientsStore((s) => s.favients);
  const docConfig = usePaletteEditorStore((s) => s.config);
  const [rampRef, rampW] = useWidth();
  const editorRef = useRef<AdvancedGradientEditorHandle>(null);
  // The tray's left edge = the panel's left edge PLUS the panel's corner radius (owner,
  // 2026-09-07: "include the corner radius too"), i.e. where the panel's flat bottom edge
  // begins. Measured, not computed: the slot column is 45 px empty and a card-tall square
  // once an image is in.
  // A CALLBACK ref, not an effect: the hero renders nothing until the first pick, so an
  // effect with an empty dep list would run before the panel exists and never again (it
  // did — the 85 px default was right only by coincidence).
  const [panelLeft, setPanelLeft] = useState(85);
  // …and the panel's HEIGHT is the card's: the picture in the slot is sized from it (the slot
  // must never size the card — measuring the slot's own column fed back and crept: 302, 327…).
  const [panelH, setPanelH] = useState(200);
  const panelRo = useRef<ResizeObserver | null>(null);
  const panelRef = useCallback((el: HTMLDivElement | null) => {
    panelRo.current?.disconnect();
    panelRo.current = null;
    if (!el) return;
    const band = el.closest('[data-gx-hero]') as HTMLElement | null;
    const update = () => {
      if (!band) return;
      setPanelLeft(Math.round(el.getBoundingClientRect().left - band.getBoundingClientRect().left) + PANEL_RADIUS);
      setPanelH(Math.round(el.getBoundingClientRect().height));
    };
    update();
    panelRo.current = new ResizeObserver(update);
    panelRo.current.observe(el);
    if (band) panelRo.current.observe(band);
  }, []);
  // The tray's inspector face is a portal host the editor renders its stop inspector into;
  // a stop selection opens that face, clearing it closes it, and the shell's Esc order closes
  // it by clearing the selection (the effect below).
  const [inspectorEl, setInspectorEl] = useState<HTMLDivElement | null>(null);
  // The Image face's hosts: the picture lives in the slot; its tools and colour cloud
  // portal into the tray (C.6, second take).
  const [imageCloudEl, setImageCloudEl] = useState<HTMLDivElement | null>(null);
  const [imageToolsEl, setImageToolsEl] = useState<HTMLDivElement | null>(null);
  const trayRef = useRef<TrayFace>(tray);
  trayRef.current = tray;
  const selectionCount = useRef(0);
  const onSelectionChange = useCallback(
    (n: number) => {
      selectionCount.current = n;
      if (n > 0 && trayRef.current !== 'inspector') onTray('inspector');
      else if (n === 0 && trayRef.current === 'inspector') onTray(null);
    },
    [onTray],
  );
  useEffect(() => {
    if (tray !== 'inspector' && selectionCount.current > 0) editorRef.current?.clearSelection();
  }, [tray]);
  const [scrubT, setScrubT] = useState<number | null>(null);

  // L8 — the hero never unmounts once it exists. An empty source (the Image tab with no
  // image, a Mix with nothing in it) used to return null and take the whole hero with it.
  // Instead the LAST gradient the pipeline produced stays on the ramp (it is also one undo
  // away in workingStore) and the source half says what is missing. Refs, not state: this
  // is a memory of the render, and re-rendering because of it would be a loop.
  const lastGood = useRef<{ config: GradientConfig; ramp: RGB[] } | null>(null);
  if (derived.config && derived.ramp) lastGood.current = { config: derived.config, ramp: derived.ramp };
  const emptySource = !derived.config || !derived.ramp;
  const shown = emptySource ? lastGood.current : { config: derived.config!, ramp: derived.ramp! };

  const config = derived.config;
  // The split: Mix always (its source is two things); otherwise whenever the output is not
  // the input verbatim (curves on, Adjust off default, an image fit). Bake = passthrough
  // again = the bands merge.
  const split = derived.input.kind === 'build' || !derived.passthrough;
  // THE BAKE GESTURE (C.9, owner 2026-09-07 evening): while a face is open and the ramp is
  // split, the two halves are the controls — the top (source) half click keeps the source
  // (cancel), the bottom (result) half click bakes the result. The face closes either way
  // and its transformations reset. Instant hints on hover (HalfHint), no delay.
  const gesture = split && !!tray && tray !== 'inspector';
  // Is the loaded image still WHAT YOU SEE? Live from Image, yes; baked from Image and
  // untouched (leaving the face bakes; that alone must not shrink the picture — owner,
  // 2026-09-07: "only after an adjustment, to avoid jarring"), yes; a new pick, a stop
  // edit, a dial in another face — no: the picture greys and shrinks (ImageSlot `dim`).
  const imageIsTheGradient = useMemo((): boolean => {
    const input = derived.input;
    if (input.kind === 'extract') return true;
    if (input.kind === 'gradient') return input.source === 'Image' && derived.passthrough;
    if (input.kind === 'stops' && bakedFrom?.input.kind === 'gradient' && bakedFrom.input.source === 'Image') {
      const a = bakedFrom.input.config.stops;
      const b = docConfig.stops;
      return derived.passthrough && a.length === b.length && a.every((s, i) => s.position === b[i].position && s.color === b[i].color && (s.bias ?? 0.5) === (b[i].bias ?? 0.5) && (s.interpolation ?? 'linear') === (b[i].interpolation ?? 'linear'));
    }
    return false;
  }, [derived.input, derived.passthrough, bakedFrom, docConfig]);
  // Mix: the ramp splits CLEANLY in two — band A over the result, 30 + 30, no divider
  // (owner, 2026-09-07); the other split states keep the thin labelled source band.
  const mix = derived.input.kind === 'build';
  const sourceH = mix ? mixSourceHeight() : SOURCE_BAND_H;
  const resultH = split ? (mix ? MIX_RESULT_H : 42) : 60;
  const favOf = useMemo(() => {
    const c = derived.config ?? lastGood.current?.config;
    if (!c) return null;
    const sig = favientSig(c);
    // Kept = filed by the user. The Recent session entry always matches (it follows the
    // work), so it must not light the star.
    return favients.find((f) => !isRecentGroup(f.group) && favientSig(f.config) === sig) ?? null;
  }, [favients, config, derived.config]);
  const paletteHex = useMemo(() => derived.palette.map((s) => hexOf(s.color)), [derived.palette]);

  // L9 — before the first pick there is no hero at all; that state is unchanged.
  if (!shown) return null;

  const toggleStar = () => {
    const st = useFavientsStore.getState();
    if (favOf) {
      st.remove(favOf.id);
      return;
    }
    useWorkingStore.getState().syncRecent();
    st.add(shown.config, derived.name, derived.input.kind === 'gradient' ? derived.input.source : 'Working');
  };

  // ── editor wiring ─────────────────────────────────────────────────────────────
  // Only reached with a live source (an empty one shows a plain strip, not the editor).
  const editorValue: GradientConfig = derived.edited ? docConfig : (config ?? shown.config);
  const ensureEditing = () => {
    if (useWorkingStore.getState().input.kind !== 'stops') useWorkingStore.getState().beginEdit();
  };
  const onEditorStart = () => {
    ensureEditing();
    editorEditStart();
  };
  const onEditorEdit = (mutate: () => void) => {
    ensureEditing();
    editorEdit(mutate);
  };
  const onEditorChange = (val: GradientConfig | GradientStop[]) => {
    ensureEditing();
    const cur = usePaletteEditorStore.getState().config;
    usePaletteEditorStore.getState().setConfig(applyEditorChange(cur, val));
  };
  // The state reads inline in the heading bar (V3 as amended by Phase A iteration 1); an
  // empty source has no state of its own — the source band says what is missing instead.
  // Bake and cancel are ONE mechanism, and the chip is it (C.3): a live face bakes when it
  // closes; clicking the chip cancels it instead — back to what was working before. An
  // edited bake's chip returns to its source the same way.
  const liveName = source === 'build' ? 'Mix' : 'Image';
  const stateChip = emptySource ? null : derived.live ? (
    <StateChip
      kind="live"
      variant="inline"
      title={liveFrom ? `Cancel ${liveName}: go back to the gradient you had before it (closing the face keeps the result)` : undefined}
      onClick={liveFrom ? onCancelFace : undefined}
      data-gx-state="live"
    >
      live from {liveName}{liveFrom ? ' · cancel' : ''}
    </StateChip>
  ) : derived.edited ? (
    <StateChip
      kind="edited"
      variant="inline"
      title={bakedFrom ? 'Undo the bake and go back to the source that produced this gradient' : 'Edited stops'}
      onClick={bakedFrom ? () => useWorkingStore.getState().returnToSource() : undefined}
      data-gx-state="edited"
    >
      editing{bakedFrom ? ' · return to source' : ''}
    </StateChip>
  ) : (
    <StateChip kind="picked" variant="inline" title="A preview: click the same gradient again, or edit a stop, to keep it" data-gx-state="preview">preview</StateChip>
  );

  // What the EMPTY source band says (L8): the source is selected but has nothing in it.
  const emptyText =
    derived.input.kind === 'extract'
      ? 'image · drop one on the slot'
      : derived.input.kind === 'build'
        ? 'Mix · pick B from the wall or the shelf'
        : 'no source · pick a gradient below';

  return (
    <section
      className="relative shrink-0 p-2.5 bg-surface-raised border-b border-line/10"
      data-gx-hero
      data-gx-selectable
    >
      {/* the CARD — radius 20 (same as the panel, owner 2026-09-07), one object, inset 10 px in the band, and the PANEL flush with the card's top / right / bottom (owner,
          2026-09-07); the 24 px gutter is 10 (band) + 1 (card border) + 13 */}
      {/* a LEFT-ALIGNED tray (Image) grows out of the card's left edge: no bottom-left corner
          then (owner, 2026-09-07) */}
      <div className={`grid gap-4 pl-[13px] rounded-[20px] bg-surface-section border border-line/20 overflow-hidden ${tray === 'image' ? 'rounded-bl-none' : ''}`} style={{ gridTemplateColumns: 'auto minmax(0,1fr)' }}>
        {/* SOURCE — the image slot (L3). Slim while empty; a square as tall as the card
            once an image is in. It never moves and never unmounts. */}
        <div className="flex flex-col justify-center py-4">
          <ImageSlot
            active={source === 'extract'}
            dim={!imageIsTheGradient && tray !== 'image'}
            bigH={panelH - 32}
            onClick={() => onTray('image')}
            cloudHost={imageCloudEl}
            toolsHost={imageToolsEl}
            handles={tray === 'image'}
          />
        </div>

        {/* the PANEL — header strip, palette, ramp, expanders; the gradient's own ground */}
        <div ref={panelRef} className="min-w-0 flex flex-col rounded-[20px] bg-surface-viewport overflow-hidden">
          {/* Owner, 2026-09-06 / 07: the name is the HEADER of the panel — one object with
              the ramp beneath it — the state reads inline, and the outputs (Keep · Share ·
              Export · Wallpaper) sit at its right edge as icons (L2), no use column. */}
          <div className="flex items-center gap-1.5 h-[42px] px-4 bg-surface-raised">
            {/* the name HUGS its text (a mirror span sizes the grid cell; the input fills it)
                instead of clipping at a fixed width — owner, 2026-09-07 */}
            <span className="inline-grid min-w-[40px] max-w-[60%] text-[18px] font-semibold">
              <span className="invisible col-start-1 row-start-1 whitespace-pre pr-0.5" aria-hidden>{derived.name || ' '}</span>
              <input
                size={1}
                className="col-start-1 row-start-1 w-full min-w-0 bg-transparent border-0 outline-none text-fg"
                value={derived.name}
                onChange={(e) => useWorkingStore.getState().setName(e.target.value)}
                title="Name"
              />
            </span>
            {stateChip && <span className="ml-2 inline-flex">{stateChip}</span>}
            <span className="flex-1" />
            {source === 'browse' && !emptySource && (
              <Act className="mr-1" title="Sort the wall by similarity to this gradient" onClick={() => setSimilarityAnchor({ config: shown.config, name: derived.name })}>
                More like this
              </Act>
            )}
            {/* USE — the shell still owns what these DO (P3). Export's full window hangs
                off the BAND (below), outside the card's clip; its icon carries the flyout. */}
            <div className="flex items-center gap-1.5">
              <Act icon active={!!favOf} className={favOf ? 'text-warn' : ''} onClick={toggleStar} title={favOf ? 'Saved in My Gradients — click to remove' : 'Keep — save to My Gradients'}>
                <Icon name="heart" size={15} />
              </Act>
              <Act icon onClick={onShare} title="Share — copy a link that opens this gradient">
                <Icon name="share" size={15} />
              </Act>
              <ExportButton open={exportOpen} onOpen={onExport} ramp={shown.ramp} name={derived.name} />
              <Act icon onClick={onWallpaper} title="Wallpaper — fill the screen with it">
                <Icon name="fullscreen" size={15} />
              </Act>
            </div>
          </div>

          <div className="px-4 pt-4 pb-2 flex flex-col">
            {/* the palette on top of the ramp — hidden only while the source is empty (there
                is nothing live to sample from) */}
            {!emptySource && (
              <PaletteRow
                palette={derived.palette}
                scale={Math.max(1, rampW - 16)}
                onScrub={setScrubT}
                onSelect={(_, t) => editorRef.current?.selectAt(t)}
                className="h-9 mb-3"
              />
            )}

            {/* the ramp IS the stops editor — under the source band(s) while the pipeline is
                live. With an EMPTY source it is the last gradient, shown but not editable:
                there is no live document behind it until a source is back (L8). No hairline
                and no hover outline here (owner, 2026-09-07: the border was unnecessary) —
                the editor's strip chrome paints its own rounded, edge-filled bar. */}
            <div ref={rampRef} className="relative rounded-[10px]">
              {emptySource ? (
                <>
                  <div className="px-2 mb-px">
                    <div
                      className="flex items-center px-2 rounded border border-dashed border-line/40 text-[11px] text-fg-muted"
                      style={{ height: SOURCE_BAND_H }}
                      title="This source has nothing in it yet — the ramp below is the gradient you were last working on"
                    >
                      {emptyText}
                    </div>
                  </div>
                  <GradientStrip ramp={shown.ramp} height={42} className="w-full block" />
                </>
              ) : (
                <>
                  {/* the SOURCE half: the same bar language as the result under it — the 8 px
                      gutters painted with its end colours and the top corners rounded, so the two
                      halves read as one bar (owner, 2026-09-07) */}
                  {split && (
                    <div className={`relative group/src ${mix ? '' : 'mb-px'}`} style={{ minHeight: sourceH }} data-gx-source-half={gesture ? 'cancel' : undefined}>
                      <SourceBands derived={derived} onKeepSource={gesture ? onCancelFace : undefined} />
                      {gesture && <HalfHint className="group-hover/src:opacity-100">Keep the source · cancel</HalfHint>}
                    </div>
                  )}
                  <AdvancedGradientEditor
                    ref={editorRef}
                    chrome="strip"
                    stripHeight={resultH}
                    stripCorners={split ? 'bottom' : 'all'}
                    onStripClick={gesture ? onBake : undefined}
                    stripTitle={gesture ? 'Keep this result — bake it into the stops (the face closes)' : undefined}
                    stripHint={gesture ? <HalfHint className="group-hover/strip:opacity-100">Keep this result · bake</HalfHint> : undefined}
                    stripAside={
                      /* the TRAY'S TAB ROW (Phase C): the four named faces; the open one is
                         accent ("this one", V3) and clicks closed */
                      <div className="flex flex-wrap gap-1.5">
                        {TRAY_TABS.map((t) => (
                          <Act
                            key={t.face}
                            active={tray === t.face}
                            className={tray === t.face ? 'text-accent-300' : ''}
                            onClick={() => onTray(t.face)}
                            title={t.title}
                            data-gx-tray-tab={t.face}
                          >
                            {t.label} <Icon name={tray === t.face ? 'chevronUp' : 'chevronDown'} />
                          </Act>
                        ))}
                      </div>
                    }
                    inspectorHost={inspectorEl}
                    onSelectionChange={onSelectionChange}
                    value={editorValue}
                    onChange={onEditorChange}
                    onEditStart={onEditorStart}
                    onEditEnd={editorEditEnd}
                    edit={onEditorEdit}
                    pickerPalette={paletteHex}
                  />
                  {scrubT != null && (
                    <div
                      className="absolute w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,.6)] pointer-events-none"
                      style={{ left: `calc(8px + ${scrubT} * (100% - 16px))`, top: split ? sourceH + (mix ? 0 : 1) : 0, height: resultH }}
                    />
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
      {/* the TRAY (Phase C): one surface under the card, one face at a time */}
      <Tray face={tray} derived={derived} width={rampW} inspectorHostRef={setInspectorEl} imageCloudRef={setImageCloudEl} imageToolsRef={setImageToolsEl} left={panelLeft} />
      {exportMenu}
    </section>
  );
};

/** The instant hover hint on a ramp half (C.9) — a small pill at the half's right edge,
 *  shown by the parent's group-hover class, never in the way of the pointer. */
const HalfHint: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <span
    className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 h-5 inline-flex items-center rounded-full bg-black/70 text-white text-[11px] whitespace-nowrap pointer-events-none opacity-0 transition-none z-20 ${className}`}
  >
    {children}
  </span>
);

/**
 * The Export icon. A click opens the full window (`ExportMenu`, all formats). HOVER shows
 * the last three exports as one-click rows (owner, 2026-09-07: "a small on-hover dropdown
 * with their most recent export types"); nothing shows until there is a recent. The
 * flyout is `fixed`, measured off the button, because everything inside the card is
 * clipped by it.
 */
const ExportButton: React.FC<{ open: boolean; onOpen: () => void; ramp: RGB[]; name: string }> = ({ open, onOpen, ramp, name }) => {
  const recents = useRecentExports();
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number | null>(null);
  const enter = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setHover(true);
  };
  const leave = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHover(false), 150);
  };
  const show = hover && !open && recents.length > 0 && pos;
  return (
    <div ref={btn} className="flex" onPointerEnter={enter} onPointerLeave={leave}>
      <Act icon active={open} onClick={onOpen} title="Export — copy or download this gradient in a file format">
        <Icon name="download" size={15} />
      </Act>
      {show && (
        <Floating className="fixed z-40 p-1 flex flex-col min-w-[180px]" style={{ top: pos.top, right: pos.right }} data-gx-export-recent>
          {recents.map((a) => (
            <button
              key={exportActionLabel(a)}
              type="button"
              className="text-left text-[13px] text-fg px-2 py-1 rounded-lg hover:bg-line/10 whitespace-nowrap"
              onClick={() => {
                runExport(a, ramp, name);
                setHover(false);
              }}
            >
              {exportActionLabel(a)}
            </button>
          ))}
          <button type="button" className="text-left text-[13px] text-fg-muted hover:text-fg px-2 py-1 rounded-lg hover:bg-line/10" onClick={onOpen}>
            All formats…
          </button>
        </Floating>
      )}
    </div>
  );
};

