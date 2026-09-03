/**
 * WorkingHero — the ONE hero of the v2 shell, and it IS the stops editor (owner review
 * 2026-09-03; plans/ge-v2-design.md §5.1 revised, §6b).
 *
 * Top to bottom inside the block:
 *   1. name · state chip · Follow · Mix with · ★ · Curves ▾ · Adjust ▾
 *   2. the PALETTE ROW — draggable sample positions on top of the ramp (PaletteRow)
 *   3. the RAMP = the shared AdvancedGradientEditor in `strip` chrome: draggable stop knots,
 *      add on click, per-stop inspector (colour / interpolation / position / bias) right
 *      under it. The first edit on a live or picked input is the bake (workingStore.beginEdit).
 *   4. the preview row (a Browse candidate) with Use · Mix with · More like this · ★ · ✕
 *   5. the expander: Curves (the channel graph editor over the working base) or Adjust
 *      (the Modify + Noise dials, standard GMT sliders). Same surface, no drawer.
 *
 * States: hidden (nothing yet) · previewing (the first pick IS the hero) · working ·
 * live from Build/Extract · edited (return to source). Follow: while on and Browse is the
 * source, every candidate flows straight into Working through a plain setState (not
 * undoable, not collected).
 *
 * Editor wiring: while the input is NOT the stops document, the editor shows the derived
 * config (verbatim for a picked gradient, fitted for a live one) and the bracket hooks fold
 * it into the document on the first gesture; afterwards it edits paletteEditorStore through
 * the (d) seam (editorEditStart / editorEditEnd / editorEdit), exactly as the old Stops
 * sub-mode did. Stop ids are index-derived by the fitter, so the fold hands the editor the
 * same ids it already holds and a drag survives the swap.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { deselectActiveHero, type HeroSelection } from '../../palette/store/heroSelection';
import { useWorkingStore, type WorkingDerived } from '../../palette/store/workingStore';
import { useFavientsStore, favientSig } from '../../palette/store/favientsStore';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../../palette/store/paletteEditorStore';
import { applyEditorChange } from '../../palette/core/editorConfig';
import { useGeneratorStore, prospectiveFitChannels, prospectiveFitFrames, readAdjustParamsNow } from '../../palette/store/generatorStore';
import { ChannelGraphEditor } from '../../palette/components/ChannelGraphEditor';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import { swatchesAt } from '../../palette/core/paletteSample';
import { buildGradientRamp, DEFAULT_SLOT_MODS, unwrapHue, type Channels } from '../../palette/core/generatorPipeline';
import { showToast } from '../../engine/store/toastStore';
import { PaletteRow } from './PaletteRow';
import type { RGB } from '../../palette/core/oklab';
import type { GradientConfig, GradientStop } from '../../types';
import type { SourceId } from './GradientExplorerV2App';

const chip = (on = false, tone: 'live' | 'edited' | 'ghost' | 'star' | 'plain' = 'plain'): string => {
  const base = 'inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] whitespace-nowrap border transition-colors';
  if (tone === 'live') return `${base} text-[#86e3a6] border-[#86e3a6]/40`;
  if (tone === 'edited') return `${base} text-[#f3b562] border-[#f3b562]/40 cursor-pointer hover:border-[#f3b562]`;
  if (tone === 'ghost') return `${base} text-fg-dim border-transparent`;
  if (tone === 'star') return `${base} ${on ? 'text-[#f5c542] border-[#f5c542]' : 'text-fg-muted border-line/20 hover:text-fg hover:border-line/40'}`;
  return `${base} ${on ? 'text-accent-300 border-accent-400 bg-accent-400/10' : 'text-fg-muted border-line/20 hover:text-fg hover:border-line/40'}`;
};
const btn = (accent = false): string =>
  `h-7 px-3 rounded-lg text-[12px] border transition-colors ${
    accent ? 'bg-accent-400 text-black border-accent-400 font-semibold hover:brightness-110' : 'border-line/20 text-fg hover:border-accent-400 hover:text-accent-300'
  }`;

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
  candidate: HeroSelection | null;
  source: SourceId;
  onMixWith: () => void;
}

export const WorkingHero: React.FC<Props> = ({ derived, candidate, source, onMixWith }) => {
  const follow = useWorkingStore((s) => s.follow);
  const positions = useWorkingStore((s) => s.positions);
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const favients = useFavientsStore((s) => s.favients);
  const docConfig = usePaletteEditorStore((s) => s.config);
  const [expander, setExpander] = useState<Expander>(null);
  const [scrubT, setScrubT] = useState<number | null>(null);
  const [rampRef, rampW] = useWidth();
  const cand = candidate?.payload ?? null;
  const candKey = candidate?.key ?? null;
  const previewOnly = derived.empty && !!cand;

  // Follow: the Browse candidate flows straight into Working.
  useEffect(() => {
    if (!follow || source !== 'browse' || !cand) return;
    useWorkingStore.setState({
      input: { kind: 'gradient', config: JSON.parse(JSON.stringify(cand.config)) as GradientConfig, name: cand.name, source: cand.source ?? 'Browse' },
      bakedFrom: null,
      name: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, source, candKey]);

  // Display space: a catalog config may carry colorSpace 'linear' (a GMT texture hint), and
  // rendering with it yields linear-light bytes that read dark on screen. Swatches and
  // strips are display, so always render sRGB here (the pipeline does the same).
  const candRamp = useMemo(
    () => (cand ? renderStopsToRamp(cand.config.stops, cand.config.blendSpace, 'srgb') : null),
    [cand],
  );
  // A click on the swatch that already IS the working gradient would otherwise do nothing
  // visible; say so.
  useEffect(() => {
    if (!cand || previewOnly || follow) return;
    const inp = useWorkingStore.getState().input;
    if (inp.kind === 'gradient' && favientSig(inp.config) === favientSig(cand.config)) {
      showToast(`${cand.name} is already your working gradient`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candKey]);
  const mainConfig: GradientConfig | null = previewOnly ? cand!.config : derived.config;
  const mainRamp: RGB[] | null = previewOnly ? candRamp : derived.ramp;
  const mainName = previewOnly ? cand!.name : derived.name;
  const palette = useMemo(
    () => (previewOnly && candRamp ? swatchesAt(candRamp, positions) : derived.palette),
    [previewOnly, candRamp, positions, derived.palette],
  );
  const favOf = useMemo(() => {
    if (!mainConfig) return null;
    const sig = favientSig(mainConfig);
    return favients.find((f) => favientSig(f.config) === sig) ?? null;
  }, [favients, mainConfig]);

  if (!mainConfig || !mainRamp) return null;

  const input = derived.input;
  const showPreviewRow =
    !!cand &&
    !previewOnly &&
    !follow &&
    source === 'browse' &&
    !(input.kind === 'gradient' && favientSig(input.config) === favientSig(cand.config));

  const useCandidate = () => {
    if (!cand) return;
    useWorkingStore.getState().use(cand.config, cand.name, cand.source ?? 'Browse');
    deselectActiveHero();
    showToast(`${cand.name} is now your working gradient`);
  };
  const toggleStar = (config: GradientConfig, name: string, src: string) => {
    const st = useFavientsStore.getState();
    const sig = favientSig(config);
    const existing = st.favients.find((f) => favientSig(f.config) === sig);
    if (existing) st.remove(existing.id);
    else st.add(config, name, src);
  };

  // ── editor wiring ─────────────────────────────────────────────────────────────
  // The value the editor shows: the document once editing, else the derived config
  // (the fold hands the document the same stops). A candidate preview: the first gesture
  // Uses it, then folds.
  const editorValue: GradientConfig = derived.edited ? docConfig : mainConfig;
  const ensureEditing = () => {
    if (previewOnly) useCandidate();
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

  const stateChip = previewOnly ? (
    <span className={chip(false, 'ghost')}>previewing · Use to keep</span>
  ) : derived.live ? (
    <span className={chip(false, 'live')}>● live from {source === 'build' ? 'Build' : 'Extract'}</span>
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
          value={mainName}
          readOnly={previewOnly}
          onChange={(e) => useWorkingStore.getState().setName(e.target.value)}
          title="Name"
        />
        {stateChip}
        <span className="flex-1" />
        <button
          className={chip(follow)}
          title="Follow the Browse candidate through Curves and Adjust (browsing under Follow is not undoable)"
          onClick={() => useWorkingStore.getState().setFollow(!follow)}
        >
          ⛓ Follow
        </button>
        <button className={chip()} onClick={onMixWith} title="Put this gradient into Build slot A and pick another for B">
          Mix with…
        </button>
        <button
          className={chip(!!favOf, 'star')}
          title={favOf ? 'Saved in My Gradients — click to remove' : 'Save to My Gradients'}
          onClick={() => toggleStar(mainConfig, mainName, previewOnly ? cand!.source ?? 'Browse' : derived.input.kind)}
        >
          ★
        </button>
        <span className="w-px h-5 bg-line/20 mx-1" />
        <button className={chip(expander === 'curves')} onClick={() => setExpander((e) => (e === 'curves' ? null : 'curves'))} title="Shape the lightness, chroma and hue curves">
          Curves {expander === 'curves' ? '▴' : '▾'}
        </button>
        <button className={chip(expander === 'adjust')} onClick={() => setExpander((e) => (e === 'adjust' ? null : 'adjust'))} title="Hue, chroma, contrast, posterize, repeats, phase, mirror, reverse, noise">
          Adjust {expander === 'adjust' ? '▴' : '▾'}
        </button>
      </div>

      {/* 2. palette on top */}
      <PaletteRow palette={palette} scale={Math.max(1, rampW - 16)} readOnly={previewOnly} onScrub={setScrubT} className="h-[34px] mb-1.5" />

      {/* 3. the ramp IS the stops editor */}
      <div ref={rampRef} className="relative">
        <AdvancedGradientEditor
          chrome="strip"
          stripHeight={60}
          value={editorValue}
          onChange={onEditorChange}
          onEditStart={onEditorStart}
          onEditEnd={editorEditEnd}
          edit={onEditorEdit}
        />
        {scrubT != null && (
          <div
            className="absolute top-0 h-[60px] w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,.6)] pointer-events-none"
            style={{ left: `calc(8px + ${scrubT} * (100% - 16px))` }}
          />
        )}
      </div>

      {/* 4. the candidate preview row */}
      {showPreviewRow && cand && candRamp && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-line/20 grid grid-cols-[1fr_auto] gap-3.5 items-center">
          <div>
            <div className="text-[12px] text-fg-dim mb-1">
              Previewing <b className="text-fg font-semibold text-[13px]">{cand.name}</b> {cand.source ?? ''}
            </div>
            <GradientStrip ramp={candRamp} height={36} className="w-full block opacity-90" />
          </div>
          <div className="flex gap-1.5">
            <button className={btn(true)} onClick={useCandidate}>
              Use ↑
            </button>
            <button className={btn()} onClick={onMixWith} title="Mix the working gradient with this one">
              Mix with
            </button>
            <button
              className={btn()}
              title="Sort the wall by similarity to this gradient"
              onClick={() => setSimilarityAnchor({ config: cand.config, name: cand.name })}
            >
              More like this
            </button>
            <button className={btn()} onClick={() => toggleStar(cand.config, cand.name, cand.source ?? 'Browse')} title="Save to My Gradients">
              ★
            </button>
            <button className={btn()} onClick={() => deselectActiveHero()} title="Dismiss (Esc)">
              ✕
            </button>
          </div>
        </div>
      )}
      {previewOnly && (
        <div className="mt-2 flex gap-1.5 justify-end">
          <button className={btn(true)} onClick={useCandidate}>
            Use ↑
          </button>
          <button
            className={btn()}
            title="Sort the wall by similarity to this gradient"
            onClick={() => cand && setSimilarityAnchor({ config: cand.config, name: cand.name })}
          >
            More like this
          </button>
          <button className={btn()} onClick={() => deselectActiveHero()} title="Dismiss (Esc)">
            ✕
          </button>
        </div>
      )}

      {/* 5. the expanders */}
      {expander === 'curves' && !previewOnly && <CurvesExpander derived={derived} width={rampW} />}
      {expander === 'adjust' && !previewOnly && (
        <div className="mt-3 pt-3 border-t border-line/10 grid grid-cols-2 gap-x-7">
          <AutoFeaturePanel featureId="paletteGenerator" groupFilter="Modify" />
          <AutoFeaturePanel featureId="paletteGenerator" groupFilter="Noise" />
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
