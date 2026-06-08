/**
 * heroSelection — the per-surface "current pick" model for the Gradient Explorer. Each
 * gradient surface (Picker / Generator / Image / Stops / Favients) keeps its OWN sticky
 * pick, so selecting a favourite never disturbs the Picker's hero and vice-versa — the
 * surfaces are fully independent. ONE pick at a time is ACTIVE (the last one clicked): it
 * drives the dock + the active glow. Transient (NOT DDFS / NOT persisted / no undo); a
 * pick survives the Picker's desktop↔mobile remount exactly as pickerSearch does.
 *
 *   • `picks[mode]`  — that surface's sticky pick (drives its hero + wall/swatch enlarge).
 *   • `active`       — which surface's pick is "in hand" (the dock acts on `picks[active]`).
 *   • `optionsOpen`  — whether the dock + drop targets are shown.
 *
 * Deselect (empty-wall click / Esc) clears the ACTIVE state (the wall/swatch enlarge, gated
 * on `active`, + the dock) but KEEPS every surface's pick — the hero never blanks. See
 * `plans/p2-a-picker-interaction.md`.
 *
 * @invariant `key` MUST fully determine `payload` + `selfTargetId`: the identity guards
 *   below early-return on a `(mode,key)` match, so varying payload for the same key would
 *   leave a silently stale dock.
 * @see palette/store/pickerSearch.ts (the transient-store precedent)
 */

import { useSyncExternalStore } from 'react';
import type { FavientDragPayload } from '../core/favientDnd';

export type HeroMode = 'picker' | 'generator' | 'image' | 'stops' | 'favients';

export interface HeroSelection {
  /** Which surface owns this pick. */
  mode: HeroMode;
  /** Stable identity within the mode — a catalog-entry id (Picker) or content signature
   *  (single-result heroes). Drives the surface's treatment + the wall's selectedId. */
  key: string;
  /** The gradient the dock targets act on (config + name + provenance). */
  payload: FavientDragPayload;
  /** When this gradient IS a drop target's content (e.g. the Stops hero), that target's id
   *  — so the dock self-filters it (you don't drop a gradient onto itself). */
  selfTargetId?: string;
}

let picks: Partial<Record<HeroMode, HeroSelection>> = {};
let active: HeroMode | null = null;
let optionsOpen = false;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((l) => l());
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

const sameItem = (a: HeroSelection | undefined, b: HeroSelection): boolean =>
  !!a && a.mode === b.mode && a.key === b.key;

/**
 * PICK (the click path): set the surface's pick, make it active, and open the dock.
 * Re-picking the same item while it's already active with the dock open is a no-op (avoids
 * churning the dock + every hero); re-picking while the dock is closed re-opens it.
 */
export const setHeroPick = (sel: HeroSelection): void => {
  if (active === sel.mode && sameItem(picks[sel.mode], sel) && optionsOpen) return;
  if (!sameItem(picks[sel.mode], sel)) picks = { ...picks, [sel.mode]: sel };
  active = sel.mode;
  optionsOpen = true;
  emit();
};

/**
 * Set the pick for a DRAG (the drag image needs a ramp + the source stays lit). Makes the
 * surface active but does NOT force the dock open — a drag lights the targets via
 * useDragInFlight regardless.
 */
export const setHeroDrag = (sel: HeroSelection): void => {
  if (active === sel.mode && sameItem(picks[sel.mode], sel)) return;
  if (!sameItem(picks[sel.mode], sel)) picks = { ...picks, [sel.mode]: sel };
  active = sel.mode;
  emit();
};

/** Close the dock — KEEPS every surface's pick (apply / drop / a deliberate dismiss). */
export const closeHeroOptions = (): void => {
  if (!optionsOpen) return;
  optionsOpen = false;
  emit();
};

/**
 * DESELECT (empty-wall click / Esc): clear the ACTIVE highlight (the wall/swatch enlarge,
 * which is gated on `active`) + close the dock — but KEEP every surface's pick, so the
 * hero NEVER blanks (it shows the last picked gradient until a different one is picked).
 */
export const deselectActiveHero = (): void => {
  if (active === null && !optionsOpen) return;
  active = null;
  optionsOpen = false;
  emit();
};

const activeSelection = (): HeroSelection | null => (active !== null ? picks[active] ?? null : null);

/** A surface's own sticky pick (drives its hero + enlarge). Stable ref when unchanged, so
 *  updating one surface doesn't re-render the others. */
export const useHeroPick = (mode: HeroMode): HeroSelection | null =>
  useSyncExternalStore(subscribe, () => picks[mode] ?? null, () => picks[mode] ?? null);

/** The pick the dock acts on (the active surface's pick). */
export const useActiveHeroSelection = (): HeroSelection | null =>
  useSyncExternalStore(subscribe, activeSelection, activeSelection);

/** Which surface is active — distinguishes the active glow from a dormant (still-shown) pick. */
export const useActiveHeroMode = (): HeroMode | null =>
  useSyncExternalStore(subscribe, () => active, () => active);

/** Whether the dock + drop targets are shown. */
export const useHeroOptionsOpen = (): boolean =>
  useSyncExternalStore(subscribe, () => optionsOpen, () => optionsOpen);
