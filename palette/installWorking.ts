/**
 * installWorking — register the v2 Working gradient with the engine's undo + Save/Load
 * registries, and wire its Recent collector. Called by a host's side-effect
 * `registerFeatures.ts` AFTER registerPaletteUI() and BEFORE the store is constructed
 * (both registries are Maps keyed by id and idempotent, so ordering only matters for the
 * freeze). Today only the Gradient Explorer v2 shell calls it; app-gmt and fluid-toy keep
 * the old per-mode heroes and never construct a working input.
 *
 * Kept out of registerPaletteUI on purpose: that seam is shared by three hosts, and a
 * `working` document in their scene files would be dead weight.
 */

import { registerHistoryProvider } from '../store/slices/historySlice';
import { registerDocumentProvider } from '../store/documentRegistry';
import {
  captureWorkingHistory,
  restoreWorkingHistory,
  serializeWorkingDocument,
  restoreWorkingDocument,
  setRecentCollector,
  setRecentUpdater,
  type RecentCollector,
  type RecentUpdater,
} from './store/workingStore';

export const installWorking = (opts: { collectRecent?: RecentCollector; updateRecent?: RecentUpdater } = {}): void => {
  // Undo: `setInput` / `use` / `beginEdit` / `returnToSource` each bracket one paramEdit;
  // this provider is what the bracket snapshots.
  registerHistoryProvider('working', { capture: captureWorkingHistory, restore: restoreWorkingHistory });
  // Save/Load + variants: the input slot + name + fold memory ride the scene document.
  registerDocumentProvider('working', { serialize: serializeWorkingDocument, restore: restoreWorkingDocument });
  if (opts.collectRecent) setRecentCollector(opts.collectRecent);
  if (opts.updateRecent) setRecentUpdater(opts.updateRecent);
};
