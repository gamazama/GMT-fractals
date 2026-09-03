/**
 * WorkingHero — the ONE hero of the v2 shell, and it IS the stops editor (owner reviews
 * 2026-09-03; plans/ge-v2-design.md §5.1 revised, §6b, §12).
 *
 * Top to bottom inside the block:
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
 *   4. the expander: Curves (the channel graph editor over the working base) or Adjust
 *      (the Modify + Noise dials, standard GMT sliders). Same surface, no drawer.
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

import React, { useCallback, useMemo, useRef, useState } from 'react';
import AdvancedGradientEditor, { type AdvancedGradientEditorHandle } from '../../components/AdvancedGradientEditor';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { useWorkingStore, type WorkingDerived } from '../../palette/store/workingStore';
import { useFavientsStore, favientSig, isRecentGroup } from '../../palette/store/favientsStore';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../../palette/store/paletteEditorStore';
import { applyEditorChange } from '../../palette/core/editorConfig';
import { useGeneratorStore, prospectiveFitChannels, prospectiveFitFrames, readAdjustParamsNow } from '../../palette/store/generatorStore';
import { ChannelGraphEditor } from '../../palette/components/ChannelGraphEditor';
import { buildGradientRamp, DEFAULT_SLOT_MODS, unwrapHue, type Channels } from '../../palette/core/generatorPipeline';
import { PaletteRow } from './PaletteRow';
import { SourceBands, SOURCE_BAND_H, mixSourceHeight } from './SourceBands';
import type { RGB } from '../../palette/core/oklab';
import type { GradientConfig, GradientStop } from '../../types';
import type { SourceId } from './GradientExplorerV2App';

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

const chip = (on = false, tone: 'live' | 'edited' | 'star' | 'plain' = 'plain'): string => {
  const base = 'inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] whitespace-nowrap border transition-colors';
  if (tone === 'live') return `${base} text-[#86e3a6] border-[#86e3a6]/40`;
  if (tone === 'edited') return `${base} text-[#f3b562] border-[#f3b562]/40 cursor-pointer hover:border-[#f3b562]`;
  if (tone === 'star') return `${base} ${on ? 'text-[#f5c542] border-[#f5c542]' : 'text-fg-muted border-line/20 hover:text-fg hover:border-line/40'}`;
  return `${base} ${on ? 'text-accent-300 border-accent-400 bg-accent-400/10' : 'text-fg-muted border-line/20 hover:text-fg hover:border-line/40'}`;
};
const btn = (): string => 'h-7 px-3 rounded-lg text-[12px] border border-line/20 text-fg hover:border-accent-400 hover:text-accent-300 transition-colors';

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

type Expander = 'curves' | 'adjust' | null;

interface Props {
  derived: WorkingDerived;
  source: SourceId;
}

export const WorkingHero: React.FC<Props> = ({ derived, source }) => {
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const favients = useFavientsStore((s) => s.favients);
  const docConfig = usePaletteEditorStore((s) => s.config);
  const [expander, setExpander] = useState<Expander>(null);
  const [scrubT, setScrubT] = useState<number | null>(null);
  const [rampRef, rampW] = useWidth();
  const editorRef = useRef<AdvancedGradientEditorHandle>(null);

  const config = derived.config;
  // The split: Mix always (its source is two things); otherwise whenever the output is not
  // the input verbatim (curves on, Adjust off default, an image fit). Bake = passthrough
  // again = the bands merge.
  const split = derived.input.kind === 'build' || !derived.passthrough;
  const sourceH = derived.input.kind === 'build' ? mixSourceHeight() : SOURCE_BAND_H;
  const resultH = split ? (derived.input.kind === 'build' ? 40 : 42) : 60;
  const favOf = useMemo(() => {
    if (!config) return null;
    const sig = favientSig(config);
    // Kept = filed by the user. The Recent session entry always matches (it follows the
    // work), so it must not light the star.
    return favients.find((f) => !isRecentGroup(f.group) && favientSig(f.config) === sig) ?? null;
  }, [favients, config]);
  const paletteHex = useMemo(() => derived.palette.map((s) => hexOf(s.color)), [derived.palette]);

  if (!config || !derived.ramp) return null;

  const toggleStar = () => {
    const st = useFavientsStore.getState();
    if (favOf) {
      st.remove(favOf.id);
      return;
    }
    useWorkingStore.getState().syncRecent();
    st.add(config, derived.name, derived.input.kind === 'gradient' ? derived.input.source : 'Working');
  };

  // ── editor wiring ─────────────────────────────────────────────────────────────
  const editorValue: GradientConfig = derived.edited ? docConfig : config;
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

  const stateChip = derived.live ? (
    <span className={chip(false, 'live')}>● live from {source === 'build' ? 'Mix' : 'Image'}</span>
  ) : derived.edited ? (
    <button
      className={chip(false, 'edited')}
      title={bakedFrom ? 'Undo the bake and go back to the source that produced this gradient' : 'Edited stops'}
      onClick={() => useWorkingStore.getState().returnToSource()}
    >
      ◆ edited{bakedFrom ? ' · return to source' : ''}
    </button>
  ) : (
    <span className={chip(false, 'live')}>● working</span>
  );

  return (
    <section className="shrink-0 px-6 pt-3 pb-3 bg-surface-dock border-b border-line/10" data-gx-selectable>
      <div className="flex items-center gap-2.5 mb-2">
        <input
          className="bg-transparent border-0 outline-none text-[16px] font-semibold text-fg min-w-[80px] max-w-[40%]"
          value={derived.name}
          onChange={(e) => useWorkingStore.getState().setName(e.target.value)}
          title="Name"
        />
        {stateChip}
        <span className="flex-1" />
        {source === 'browse' && (
          <button
            className={chip()}
            title="Sort the wall by similarity to this gradient"
            onClick={() => setSimilarityAnchor({ config, name: derived.name })}
          >
            More like this
          </button>
        )}
        <button className={chip(!!favOf, 'star')} title={favOf ? 'Saved in My Gradients — click to remove' : 'Save to My Gradients'} onClick={toggleStar}>
          ★
        </button>
      </div>

      {/* 2. palette on top */}
      <PaletteRow
        palette={derived.palette}
        scale={Math.max(1, rampW - 16)}
        onScrub={setScrubT}
        onSelect={(_, t) => editorRef.current?.selectAt(t)}
        className="h-[34px] mb-1.5"
      />

      {/* 3. the ramp IS the stops editor — under the source band(s) while the pipeline is live */}
      <div ref={rampRef} className="relative">
        {split && (
          <div className="px-2 mb-px" style={{ minHeight: sourceH }}>
            <SourceBands derived={derived} />
          </div>
        )}
        <AdvancedGradientEditor
          ref={editorRef}
          chrome="strip"
          stripHeight={resultH}
          stripAside={
            <div className="flex flex-wrap gap-1.5">
              <button className={chip(expander === 'curves')} onClick={() => setExpander((e) => (e === 'curves' ? null : 'curves'))} title="Shape the lightness, chroma and hue curves">
                Curves {expander === 'curves' ? '▴' : '▾'}
              </button>
              <button className={chip(expander === 'adjust')} onClick={() => setExpander((e) => (e === 'adjust' ? null : 'adjust'))} title="Hue, chroma, contrast, posterize, repeats, phase, mirror, reverse, noise">
                Adjust {expander === 'adjust' ? '▴' : '▾'}
              </button>
            </div>
          }
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
            style={{ left: `calc(8px + ${scrubT} * (100% - 16px))`, top: split ? sourceH + 1 : 0, height: resultH }}
          />
        )}
      </div>

      {/* 4. the expanders */}
      {expander === 'curves' && <CurvesExpander derived={derived} width={rampW} />}
      {expander === 'adjust' && (
        <div className="mt-3 pt-3 border-t border-line/10 grid grid-cols-2 gap-x-7">
          {/* Modify/Noise carry `dynamicVisible: isMixed` (a Generator-era assumption:
              those dials hid whenever the recipe wasn't the two-source mix). Adjust
              belongs to WORKING here (§5.1), not to the Mix recipe, so it must stay
              visible whatever the recipe — ignoreDynamicVisible skips that gate for this
              mount only; the shared param definition (also read by GeneratorStage /
              app-gmt) is untouched. @see plans/ge-v2-design.md §12 item 4 */}
          <AutoFeaturePanel featureId="paletteGenerator" groupFilter="Modify" ignoreDynamicVisible />
          <AutoFeaturePanel featureId="paletteGenerator" groupFilter="Noise" ignoreDynamicVisible />
        </div>
      )}
    </section>
  );
};

/**
 * Curves over the WORKING base: the same channel graph editor the Generator uses, fed the
 * working pipeline's base. The prospective-fit ghost + ghost points use the Generator's
 * recipe, computed here because the base is no longer the A×B mix.
 */
const CurvesExpander: React.FC<{ derived: WorkingDerived; width: number }> = ({ derived, width }) => {
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
    <div className="mt-3 pt-3 border-t border-line/10">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <button className={btn()} disabled={!base} onClick={() => base && g.fitFromChannels(base)} title="Fit editable curves from the current gradient">
          {tracks ? 'Re-fit from source' : 'Fit from source'}
        </button>
        <button className={btn()} disabled={!tracks} onClick={() => g.setCurvesOn(!curvesOn)}>
          {curvesOn ? 'Curves on' : 'Curves off'}
        </button>
        <button className={btn()} disabled={!tracks} onClick={() => g.resetCurves()}>
          Reset
        </button>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted ml-2">
          Detail <input type="range" min={2} max={10} value={detail} onChange={(e) => g.setDetail(Number(e.target.value))} /> {detail}
        </label>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted">
          Smooth <input type="range" min={0} max={10} value={smooth} onChange={(e) => g.setSmooth(Number(e.target.value))} /> {smooth}
        </label>
        <span className="text-[11px] text-fg-dim ml-auto">Detail and Smooth are the fit recipe; the faint ghost previews a re-fit.</span>
      </div>
      {tracks ? (
        <div className="relative" style={{ height: 240 }}>
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
        <div className="h-[120px] rounded-lg bg-surface-section border border-line/10 flex items-center justify-center text-[12px] text-fg-dim">
          Fit from source to make the lightness, chroma and hue curves editable.
        </div>
      )}
    </div>
  );
};
