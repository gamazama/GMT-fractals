/**
 * GradientExplorerV2App — the streamlined shell (plans/ge-v2-design.md §6b, mock B).
 *
 * Top to bottom: a six-item top bar · the Working hero (hidden until the first pick) ·
 * the edit drawer (opens from the hero) · the stage with three source tabs · the silent
 * My Gradients row (hidden until Recent has something). No Dock, no side panel, no
 * timeline, no scene name.
 *
 * Source switching is where the pipeline rules live (§2):
 *   • entering Build / Extract sets the working INPUT to that live source;
 *   • LEAVING a live source commits its result as a fixed working gradient (and so lands it
 *     in Recent) — the hero keeps showing what you just made;
 *   • Browse never touches Working; a wall click is a candidate the hero previews.
 *
 * Phase 1 skeleton: the three stages are the EXISTING PickerStage / GeneratorStage /
 * ImageStage mounted as-is (each still carries its own per-mode hero from the old shell —
 * S1 / S3 strip those), and the bottom row is the existing FavientsPanel body. Variants,
 * Export and Share are placeholders until their pieces land.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { ToastHost } from '../../engine/components/ToastHost';
import { SettingsHost, SettingsButton } from '../../components/SettingsAccess';
import { GmtWordmark } from '../../engine-gmt/topbar/GmtWordmark';
import { showToast } from '../../engine/store/toastStore';
import { PickerStage } from '../PickerStage';
import { GeneratorStage } from '../../palette/components/GeneratorStage';
import { ImageStage } from '../../palette/components/ImageStage';
import { FavientsPanel } from '../../palette/components/FavientsPanel';
import { FullscreenGradientOverlay } from '../FullscreenGradientOverlay';
import { openFullscreen } from '../../palette/store/fullscreenStore';
import { useActiveHeroSelection, deselectActiveHero } from '../../palette/store/heroSelection';
import { useWorkingStore, useWorkingDerived, deriveWorkingNow, autoWorkingName } from '../../palette/store/workingStore';
import { useGeneratorStore } from '../../palette/store/generatorStore';
import { useFavientsStore } from '../../palette/store/favientsStore';
import { WorkingHero } from './WorkingHero';
import { EditDrawer, type DrawerTab } from './EditDrawer';
import { VariantsMenu } from './VariantsMenu';

export type SourceId = 'browse' | 'build' | 'extract';
const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'browse', label: 'Browse' },
  { id: 'build', label: 'Build' },
  { id: 'extract', label: 'Extract' },
];

const tb = 'h-8 px-3 rounded-lg text-[13px] text-fg-muted hover:text-fg hover:bg-white/5 transition-colors';

const workingNameNow = (): string => {
  const s = useWorkingStore.getState();
  return s.name ?? autoWorkingName(s.input, s.bakedFrom);
};

export const GradientExplorerV2App: React.FC = () => {
  const [source, setSourceState] = useState<SourceId>('browse');
  const [drawer, setDrawer] = useState<DrawerTab | null>(null);
  const [mineOpen, setMineOpen] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const derived = useWorkingDerived();
  const candidate = useActiveHeroSelection();
  const recentCount = useFavientsStore((s) => s.favients.length);

  const switchSource = useCallback(
    (next: SourceId) => {
      if (next === source) return;
      const w = useWorkingStore.getState();
      if ((source === 'build' || source === 'extract') && w.input.kind === source) {
        const d = deriveWorkingNow();
        if (d) w.use(d.config, workingNameNow(), source === 'build' ? 'Build' : 'Extract');
      }
      if (next === 'build') w.setInput({ kind: 'build' });
      else if (next === 'extract') w.setInput({ kind: 'extract' });
      deselectActiveHero();
      setSourceState(next);
    },
    [source],
  );

  const mixWith = useCallback(() => {
    const d = deriveWorkingNow();
    if (d) useGeneratorStore.getState().sendRampToSlot('A', d.ramp, workingNameNow());
    if (candidate) {
      const p = candidate.payload;
      useGeneratorStore.getState().sendRampToSlot('B', deriveRampOf(p.config), p.name);
      deselectActiveHero();
    }
    switchSource('build');
    showToast(candidate ? 'Blending A and B — drag the sliders' : 'Slot A is set — pick a gradient for B');
  }, [candidate, switchSource]);

  // Esc dismisses a candidate preview or closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (variantsOpen) setVariantsOpen(false);
      else if (candidate) deselectActiveHero();
      else if (drawer) setDrawer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [candidate, drawer, variantsOpen]);

  const undo = () => (useEngineStore.getState() as unknown as { undoParam?: () => void }).undoParam?.();
  const redo = () => (useEngineStore.getState() as unknown as { redoParam?: () => void }).redoParam?.();
  const wallpaper = () => {
    if (!derived.config) return showToast('Pick or build a gradient first');
    useWorkingStore.getState().collectCurrent();
    openFullscreen(derived.config, derived.name);
  };

  return (
    <div className="fixed inset-0 bg-black text-fg select-none flex flex-col overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* top bar */}
      <header className="h-12 shrink-0 flex items-center gap-1.5 px-4 bg-surface-dock border-b border-line/10">
        <a href="app-gmt.html" className="flex items-center gap-2 mr-auto no-underline" title="GMT">
          <GmtWordmark className="h-3.5 w-auto opacity-80" />
          <span className="text-[15px] font-semibold text-fg">Gradient Explorer</span>
          <span className="text-[11px] text-fg-dim border border-line/20 rounded px-1">next</span>
        </a>
        <button className={`${tb} w-8 px-0`} title="Undo (Ctrl+Z)" onClick={undo}>↶</button>
        <button className={`${tb} w-8 px-0`} title="Redo (Ctrl+Y)" onClick={redo}>↷</button>
        <button className={`${tb} ${variantsOpen ? 'text-fg bg-white/5' : ''}`} onClick={() => setVariantsOpen((o) => !o)} title="Snapshots of the whole studio — switch, or tween between two">
          Variants
        </button>
        <button className={tb} onClick={() => showToast('Share lands in Phase 2')}>Share</button>
        <button className={tb} onClick={() => showToast('The Export dialog lands in Phase 2')}>Export</button>
        <button className={`${tb} text-fg border border-line/20`} onClick={wallpaper}>Wallpaper</button>
        <SettingsButton />
      </header>

      <WorkingHero derived={derived} candidate={candidate} source={source} onEdit={() => setDrawer('stops')} onMixWith={mixWith} />
      {drawer && !derived.empty && <EditDrawer tab={drawer} onTab={setDrawer} onClose={() => setDrawer(null)} derived={derived} />}

      {/* stage */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <div className="shrink-0 flex items-center gap-2 px-6 py-2.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              className={`px-4 py-2 rounded-[10px] text-[15px] transition-colors ${source === s.id ? 'text-fg bg-white/[0.07]' : 'text-fg-muted hover:text-fg'}`}
              onClick={() => switchSource(s.id)}
              data-gx-mode-tab={s.id}
            >
              {s.label}
            </button>
          ))}
          {derived.empty && source === 'browse' && (
            <span className="ml-4 text-[12px] text-fg-dim">Click any gradient below. It previews above; Use it, mix it, or keep looking.</span>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col relative">
          {source === 'browse' && <PickerStage hideFavientsLink />}
          {source === 'build' && <GeneratorStage />}
          {source === 'extract' && <ImageStage />}
        </div>
      </div>

      {/* My Gradients — silent until there is something in it */}
      {recentCount > 0 && (
        <footer className="shrink-0 bg-surface-dock border-t border-line/10 flex flex-col" style={{ height: mineOpen ? 320 : 128 }}>
          <div className="flex items-center gap-3 px-6 pt-1.5 text-[12px] text-fg-dim">
            <b className="text-fg-muted font-semibold">My Gradients</b>
            <span>fills itself as you work · drag into a group to organise</span>
            <button className="ml-auto hover:text-fg" onClick={() => setMineOpen((o) => !o)}>
              {mineOpen ? '▾ less' : '▴ groups'}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <FavientsPanel />
          </div>
        </footer>
      )}

      {variantsOpen && <VariantsMenu derived={derived} onClose={() => setVariantsOpen(false)} />}
      <SettingsHost />
      <ToastHost />
      <FullscreenGradientOverlay />
    </div>
  );
};

/** Render a config to its ramp (for Mix with on a candidate). */
import { renderStopsToRamp } from '../../palette/core/gmtGradient';
import type { GradientConfig } from '../../types';
const deriveRampOf = (c: GradientConfig) => renderStopsToRamp(c.stops, c.blendSpace, c.colorSpace);

export default GradientExplorerV2App;
