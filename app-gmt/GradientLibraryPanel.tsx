/**
 * GradientLibraryPanel — app-gmt shell over the generic StateLibraryPanel primitive for
 * the saved-gradient ("favourites") library. Reads the savedGradients slice + actions
 * installed by installGradientLibrary() and renders the list (thumbnail + rename +
 * reorder + delete) plus a "Save current gradient" button that snapshots the live
 * coloring gradient. Selecting a row re-applies that gradient to the fractal.
 *
 * Embedded in the Palette Picker overlay sidebar (below the Quality filters), so saving
 * a freshly-picked gradient and recalling favourites happen in the same surface.
 */

import React from 'react';
import { useEngineStore } from '../store/engineStore';
import { StateLibraryPanel } from '../components/StateLibraryPanel';
import type { StateSnapshot } from '../engine/store/createStateLibrarySlice';
import { isGradientModified } from './gradientLibrary';
import type { GradientConfig } from '../types';

type Snap = StateSnapshot<GradientConfig>;
type Store = Record<string, unknown>;
const fn = (s: Store, k: string) => s[k] as ((...a: unknown[]) => unknown) | undefined;

export const GradientLibraryPanel: React.FC = () => {
  const snapshots = useEngineStore((s) => (s as unknown as Store).savedGradients as Snap[] | undefined) ?? [];
  const activeId = useEngineStore((s) => (s as unknown as Store).activeGradientId as string | null) ?? null;
  // Subscribe to the live coloring gradient so the "modified" marker re-evaluates when
  // the applied colour changes (isGradientModified diffs the snapshot against it).
  useEngineStore((s) => ((s as unknown as Store).coloring as { gradient?: unknown } | undefined)?.gradient);

  const act = (k: string, ...args: unknown[]) => fn(useEngineStore.getState() as unknown as Store, k)?.(...args);

  return (
    <div className="border-t border-white/10">
      <div className="px-2 pt-2 pb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">Saved gradients</span>
        <button
          onClick={() => act('addGradient')}
          title="Save the current gradient to your favourites"
          className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-600/80 hover:bg-cyan-500 text-white transition-colors"
        >
          + Save current
        </button>
      </div>
      <StateLibraryPanel<GradientConfig>
        snapshots={snapshots}
        activeId={activeId}
        onSelect={(id) => act('selectGradient', id)}
        onRename={(id, label) => act('updateGradient', id, { label })}
        onUpdate={(id) => act('updateGradient', id)}
        onDuplicate={(id) => act('duplicateGradient', id)}
        onDelete={(id) => act('deleteGradient', id)}
        onReorder={(from, to) => act('reorderGradients', from, to)}
        isModified={(snap) => isGradientModified(snap.state)}
        emptyState="No saved gradients yet — pick one, then “Save current”."
        slotHintPrefix={null}
        className="flex flex-col"
      />
    </div>
  );
};

export default GradientLibraryPanel;
