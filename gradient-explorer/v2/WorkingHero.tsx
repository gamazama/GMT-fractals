/**
 * WorkingHero — the ONE hero of the v2 shell (plans/ge-v2-design.md §5.1, §6b).
 *
 * States, in the order a user meets them:
 *   • hidden          — nothing picked yet and no live source (first load).
 *   • previewing      — the first pick IS the hero: "previewing · Use to keep".
 *   • working         — a committed gradient; later Browse picks appear as a dashed
 *                       PREVIEW ROW beneath it with Use / Mix with / star / dismiss.
 *   • live from …     — the input follows Build / Extract.
 *   • edited          — the input is the stops document (after a bake); the chip offers
 *                       "return to source".
 *
 * Follow (chip): while on and Browse is the source, every candidate flows straight into
 * Working — a plain setState, so browsing under Follow is neither undoable nor collected.
 *
 * Phase 1 skeleton: the ramp strip, stop handles (click = start editing), the palette row
 * (click = copy hex) and the actions are real; drag-to-reposition, the per-stop inspector
 * and drag-a-swatch-onto-the-ramp are S2.
 */

import React, { useEffect, useMemo } from 'react';
import { deselectActiveHero, type HeroSelection } from '../../palette/store/heroSelection';
import { useWorkingStore, type WorkingDerived } from '../../palette/store/workingStore';
import { useFavientsStore, favientSig } from '../../palette/store/favientsStore';
import { setSimilarityAnchor } from '../../palette/store/pickerSimilarity';
import { GradientStrip } from '../../palette/components/GradientStrip';
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import { samplePalette } from '../../palette/core/paletteSample';
import { showToast } from '../../engine/store/toastStore';
import type { RGB } from '../../palette/core/oklab';
import type { GradientConfig } from '../../types';
import type { SourceId } from './GradientExplorerV2App';

const hexOf = (c: RGB): string =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

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

interface Props {
  derived: WorkingDerived;
  candidate: HeroSelection | null;
  source: SourceId;
  /** Open the edit drawer (a stop handle or the ramp was clicked). */
  onEdit: () => void;
  onMixWith: () => void;
}

export const WorkingHero: React.FC<Props> = ({ derived, candidate, source, onEdit, onMixWith }) => {
  const follow = useWorkingStore((s) => s.follow);
  const rule = useWorkingStore((s) => s.rule);
  const count = useWorkingStore((s) => s.count);
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const favients = useFavientsStore((s) => s.favients);
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

  const candRamp = useMemo(
    () => (cand ? renderStopsToRamp(cand.config.stops, cand.config.blendSpace, cand.config.colorSpace) : null),
    [cand],
  );
  const mainConfig: GradientConfig | null = previewOnly ? cand!.config : derived.config;
  const mainRamp: RGB[] | null = previewOnly ? candRamp : derived.ramp;
  const mainName = previewOnly ? cand!.name : derived.name;
  const palette = useMemo(
    () => (previewOnly && candRamp ? samplePalette(candRamp, rule, count, cand!.config) : derived.palette),
    [previewOnly, candRamp, rule, count, cand, derived.palette],
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
  const startEditing = () => {
    if (previewOnly) useCandidate();
    useWorkingStore.getState().beginEdit();
    onEdit();
  };
  const copyHex = (hex: string) => {
    try {
      void navigator.clipboard?.writeText(hex);
    } catch {
      /* clipboard may be unavailable; the toast still shows the value */
    }
    showToast(`copied ${hex}`);
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
          title="Follow the Browse candidate through Shape and Adjust (browsing under Follow is not undoable)"
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
      </div>

      <div className="relative group cursor-pointer" onClick={startEditing} title="Click to edit stops, curves and adjustments">
        <GradientStrip ramp={mainRamp} height={60} className="w-full block" />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-white bg-black/50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          click to edit
        </span>
      </div>
      <div className="relative h-3.5">
        {mainConfig.stops.map((s, i) => (
          <div
            key={s.id ?? i}
            className="absolute top-[1px] w-[11px] h-[11px] -translate-x-1/2 rotate-45 border-2 border-white rounded-[2px] shadow-[0_0_0_1px_#000] cursor-ew-resize"
            style={{ left: `${Math.max(0, Math.min(1, s.position)) * 100}%`, background: s.color }}
            title={`stop ${i + 1} · ${Math.round(s.position * 100)}%`}
            onClick={(e) => {
              e.stopPropagation();
              startEditing();
            }}
          />
        ))}
      </div>
      <div className="flex gap-1.5 h-[34px] mt-0.5">
        {palette.map((sw, i) => {
          const hex = hexOf(sw.color);
          return (
            <button
              key={i}
              className="flex-1 rounded-md border border-black/40 hover:outline hover:outline-2 hover:outline-white relative"
              style={{ background: hex }}
              title={`${hex} · click to copy`}
              onClick={() => copyHex(hex)}
            />
          );
        })}
      </div>

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
            <button
              className={btn()}
              onClick={() => {
                onMixWith();
              }}
              title="Mix the working gradient with this one"
            >
              Mix with
            </button>
            {/* S1: re-sort the Browse wall by ramp distance to this candidate. */}
            <button
              className={btn()}
              onClick={() => setSimilarityAnchor({ config: cand.config, name: cand.name })}
              title="Re-sort the wall with the gradients closest to this one first"
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
          <button className={btn()} onClick={() => deselectActiveHero()} title="Dismiss (Esc)">
            ✕
          </button>
        </div>
      )}
    </section>
  );
};
