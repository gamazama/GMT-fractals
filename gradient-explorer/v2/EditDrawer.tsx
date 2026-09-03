/**
 * EditDrawer — the full-width drawer under the hero (plans/ge-v2-design.md §6b): three
 * tabs, Stops & palette · Curves · Adjust. It replaces the old shell's right dock panel.
 *
 * Phase 1 skeleton:
 *   • Stops & palette — the palette rule + count are real; the stops editor is the shared
 *     AdvancedGradientEditor bound to paletteEditorStore once the working input is the
 *     stops document (the hero's bake). S2 lifts the per-stop inspector here.
 *   • Curves — Fit from source / on-off / Reset are real; the channel graph editor mounts
 *     here in S2 (it needs GeneratorStage's ghost + range plumbing lifted out first).
 *   • Adjust — the paletteGenerator Modify + Noise groups through AutoFeaturePanel. Note
 *     those groups carry `dynamicVisible: isMixed`, so they vanish while the Build recipe
 *     is ColorBox — S3 owns making Adjust source-independent.
 */

import React from 'react';
import AdvancedGradientEditor from '../../components/AdvancedGradientEditor';
import { AutoFeaturePanel } from '../../components/AutoFeaturePanel';
import { usePaletteEditorStore, editorEditStart, editorEditEnd, editorEdit } from '../../palette/store/paletteEditorStore';
import { applyEditorChange } from '../../palette/core/editorConfig';
import { useWorkingStore, type WorkingDerived } from '../../palette/store/workingStore';
import { useGeneratorStore } from '../../palette/store/generatorStore';
import { PALETTE_MAX, PALETTE_MIN, type PaletteRule } from '../../palette/core/paletteSample';

export type DrawerTab = 'stops' | 'curves' | 'adjust';
const TABS: { id: DrawerTab; label: string }[] = [
  { id: 'stops', label: 'Stops & palette' },
  { id: 'curves', label: 'Curves' },
  { id: 'adjust', label: 'Adjust' },
];
const RULES: { id: PaletteRule; label: string }[] = [
  { id: 'even', label: 'Even' },
  { id: 'stops', label: 'Stops' },
  { id: 'perceptual', label: 'Perceptual' },
];

const seg = (on: boolean): string =>
  `px-3 py-1 text-[13px] ${on ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`;
const btn = 'h-7 px-3 rounded-lg text-[12px] border border-line/20 text-fg hover:border-accent-400 hover:text-accent-300';

interface Props {
  tab: DrawerTab;
  onTab: (t: DrawerTab) => void;
  onClose: () => void;
  derived: WorkingDerived;
}

const StopsTab: React.FC<{ derived: WorkingDerived }> = ({ derived }) => {
  const rule = useWorkingStore((s) => s.rule);
  const count = useWorkingStore((s) => s.count);
  const bakedFrom = useWorkingStore((s) => s.bakedFrom);
  const config = usePaletteEditorStore((s) => s.config);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3.5 flex-wrap">
        <span className="text-[12px] text-fg-dim">Palette from</span>
        <div className="inline-flex border border-line/20 rounded-lg overflow-hidden">
          {RULES.map((r) => (
            <button key={r.id} className={seg(rule === r.id)} onClick={() => useWorkingStore.getState().setRule(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={PALETTE_MIN}
          max={PALETTE_MAX}
          value={count}
          disabled={rule === 'stops'}
          onChange={(e) => useWorkingStore.getState().setCount(Number(e.target.value))}
          className="w-14 h-7 bg-surface-section border border-line/20 rounded-md text-fg text-center disabled:opacity-40"
        />
        <span className="text-[12px] text-fg-dim">colours · click a swatch on the hero to copy its hex</span>
      </div>
      {derived.edited ? (
        <div>
          <AdvancedGradientEditor
            value={config}
            onChange={(val) => usePaletteEditorStore.getState().setConfig(applyEditorChange(config, val))}
            onEditStart={editorEditStart}
            onEditEnd={editorEditEnd}
            edit={editorEdit}
          />
          {bakedFrom && (
            <div className="mt-2 text-[12px] text-fg-dim">
              These stops were baked from {bakedFrom.input.kind === 'build' ? 'Build' : bakedFrom.input.kind === 'extract' ? 'Extract' : bakedFrom.name ?? 'a picked gradient'}.{' '}
              <button className="text-accent-300 underline" onClick={() => useWorkingStore.getState().returnToSource()}>
                Return to source
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-[12px] text-fg-dim">
          The stops you see on the hero follow the source live.{' '}
          <button className={btn} onClick={() => useWorkingStore.getState().beginEdit()} disabled={derived.empty}>
            Edit stops
          </button>{' '}
          bakes them into an editable document; Shape and Adjust fold in and reset.
        </div>
      )}
    </div>
  );
};

const CurvesTab: React.FC<{ derived: WorkingDerived }> = ({ derived }) => {
  const curvesOn = useGeneratorStore((s) => s.curvesOn);
  const tracks = useGeneratorStore((s) => s.tracks);
  const detail = useGeneratorStore((s) => s.detail);
  const smooth = useGeneratorStore((s) => s.smooth);
  const g = useGeneratorStore.getState();
  return (
    <div className="flex flex-col gap-3">
      <div className="h-[150px] rounded-lg bg-surface-section border border-line/10 flex items-center justify-center text-[12px] text-fg-dim">
        {tracks ? `curves ${curvesOn ? 'on' : 'off'} · the channel graph editor mounts here in S2` : 'no curves yet · Fit from source to start shaping'}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button className={btn} disabled={!derived.base} onClick={() => derived.base && g.fitFromChannels(derived.base)}>
          Fit from source
        </button>
        <button className={btn} disabled={!tracks} onClick={() => g.setCurvesOn(!curvesOn)}>
          {curvesOn ? 'Turn curves off' : 'Turn curves on'}
        </button>
        <button className={btn} disabled={!tracks} onClick={() => g.resetCurves()}>
          Reset
        </button>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted">
          Detail <input type="range" min={2} max={10} value={detail} onChange={(e) => g.setDetail(Number(e.target.value))} /> {detail}
        </label>
        <label className="flex items-center gap-2 text-[12px] text-fg-muted">
          Smooth <input type="range" min={0} max={10} value={smooth} onChange={(e) => g.setSmooth(Number(e.target.value))} /> {smooth}
        </label>
      </div>
      <div className="text-[12px] text-fg-dim">Detail and Smooth are the fit recipe. Edited points are never re-fit without asking.</div>
    </div>
  );
};

const AdjustTab: React.FC = () => (
  <div className="grid grid-cols-2 gap-x-7">
    <AutoFeaturePanel featureId="paletteGenerator" groupFilter="Modify" variant="dense" />
    <AutoFeaturePanel featureId="paletteGenerator" groupFilter="Noise" variant="dense" />
  </div>
);

export const EditDrawer: React.FC<Props> = ({ tab, onTab, onClose, derived }) => (
  <section className="shrink-0 bg-surface-section border-b border-line/10 px-6 pt-2.5 pb-3.5 max-h-[45vh] overflow-y-auto custom-scroll">
    <div className="flex items-center gap-1 mb-2.5">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`px-3 py-1.5 rounded-lg text-[13px] ${tab === t.id ? 'bg-accent-400/15 text-accent-300' : 'text-fg-muted hover:text-fg'}`}
          onClick={() => onTab(t.id)}
        >
          {t.label}
        </button>
      ))}
      <button className="ml-auto text-[12px] text-fg-dim hover:text-fg" onClick={onClose}>
        ✕ close
      </button>
    </div>
    {tab === 'stops' && <StopsTab derived={derived} />}
    {tab === 'curves' && <CurvesTab derived={derived} />}
    {tab === 'adjust' && <AdjustTab />}
  </section>
);
