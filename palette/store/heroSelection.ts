/**
 * heroSelection — the currently "selected" gradient, held as a transient module-level
 * store (mirrors `pickerSearch` / `fullscreenStore`: NOT DDFS, NOT persisted, no undo).
 *
 * This is the click-path twin of a drag-in-flight: clicking a gradient surface (a mode
 * result hero, the Picker preview) SELECTS it — which reveals the lower-centre bin dock
 * (DragWellsOverlay) so the user can click a destination bin (the same bins a drag drops
 * onto). Selecting is the "what do I want to do with this" gesture; the dock bins are the
 * "where". One active selection at a time across the studio.
 *
 * Why a module store rather than `useState` in each surface: the Picker held its selected
 * entry in local state, so the desktop↔mobile layout flip (which remounts the Picker
 * subtree) blanked the hero (the known resize state-loss bug). A transient external store
 * survives that remount exactly as `pickerSearch` does. It also lets the shell-level dock
 * (DragWellsOverlay, mounted once in GradientExplorerApp) read the selection without
 * prop-drilling through every mode.
 *
 * `mode` + `key` identify WHICH surface/item is selected, so only that surface draws its
 * selection ring (selection is per-mode, never a global highlight). `payload` is the
 * frozen `FavientDragPayload` the dock bins act on (same shape a drag carries).
 *
 * @see store/dropWellRegistry.ts / hooks/useDragInFlight.ts (the drag twin)
 * @see palette/store/pickerSearch.ts (the transient-store precedent)
 */

import { useSyncExternalStore } from 'react';
import type { FavientDragPayload } from '../core/favientDnd';

export type HeroMode = 'picker' | 'generator' | 'image' | 'stops' | 'favients';

export interface HeroSelection {
  /** Which surface owns the selection (so only it lights its ring). */
  mode: HeroMode;
  /** Stable identity within the mode — a catalog-entry id (Picker) or content
   *  signature (single-result heroes). Drives the ring + the Picker wall's selectedId. */
  key: string;
  /** The gradient the dock bins act on (config + name + provenance). */
  payload: FavientDragPayload;
}

let selection: HeroSelection | null = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const getSnapshot = (): HeroSelection | null => selection;

/** Select a gradient (replaces any prior selection; opens the bin dock). No-ops when
 *  the same item is re-selected (matches pickerSearch's identity guard) so re-picking
 *  an already-selected swatch doesn't re-render the whole dock + every hero. */
export const setHeroSelection = (sel: HeroSelection): void => {
  if (selection && selection.mode === sel.mode && selection.key === sel.key) return;
  selection = sel;
  listeners.forEach((l) => l());
};

/** Clear the selection (closes the bin dock). No-ops when nothing is selected. */
export const clearHeroSelection = (): void => {
  if (!selection) return;
  selection = null;
  listeners.forEach((l) => l());
};

export const getHeroSelection = (): HeroSelection | null => selection;

/** Subscribe a component to the active selection. */
export const useHeroSelection = (): HeroSelection | null =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
