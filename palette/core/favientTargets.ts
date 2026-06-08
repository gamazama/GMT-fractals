/**
 * favientTargets — the registry of "where a favourite applies". Each host populates
 * this at boot: the GMT Gradient Explorer registers the generator slots; app-gmt registers
 * its coloring layers. The Favients panel reads it for the "Applying to ▾" dropdown
 * and for drag-and-drop, so one panel component works in every host without knowing
 * what the host can do with a gradient.
 *
 * Host-agnostic + side-effect-free at import: hosts call registerFavientTarget() in
 * their own registration step (same place as registerPaletteUI / panel manifest).
 */

import type { GradientConfig } from '../../types';

export interface FavientTarget {
  /** Stable id (persisted as the user's selected target). */
  id: string;
  /** Dropdown label, e.g. "Generator · Slot A". */
  label: string;
  /** Apply this gradient to the target. `name` is the favourite's display name
   *  (used where the target wants a label, e.g. a generator slot). */
  apply: (config: GradientConfig, name: string) => void;
}

const _targets: FavientTarget[] = [];
const _listeners = new Set<() => void>();

/** Register an apply target (idempotent by id — re-registering replaces). */
export const registerFavientTarget = (t: FavientTarget): void => {
  const i = _targets.findIndex((x) => x.id === t.id);
  if (i >= 0) _targets[i] = t;
  else _targets.push(t);
  _listeners.forEach((l) => l());
};

export const getFavientTargets = (): FavientTarget[] => _targets;

export const getFavientTarget = (id: string | null | undefined): FavientTarget | undefined =>
  id ? _targets.find((t) => t.id === id) : undefined;

/** Subscribe to target-list changes (targets usually register before first render,
 *  but the panel subscribes defensively in case a host registers later). */
export const subscribeFavientTargets = (l: () => void): (() => void) => {
  _listeners.add(l);
  return () => {
    _listeners.delete(l);
  };
};

// --- "select mode" (host capability) — a host that provides a select→reveal→place dock
// (the Gradient Explorer's GradientDropLayer) sets this so the Favients panel flips a
// swatch CLICK from immediate apply to SELECT (pick → enlarge → dock), and hides its
// "Destination" dropdown (the dock supersedes it). Hosts WITHOUT a dock (app-gmt, which
// applies favourites straight to its coloring layers via the dropdown) leave it false. ---
let _selectMode = false;

export const setFavientSelectMode = (on: boolean): void => {
  if (_selectMode === on) return;
  _selectMode = on;
  _listeners.forEach((l) => l());
};

export const getFavientSelectMode = (): boolean => _selectMode;

// --- "browse palettes" action (host-specific) — drives the Favients header's Palettes
// button. Studio switches to the Picker tab; app-gmt opens the Palettes overlay. ---
let _browse: (() => void) | null = null;

export const setFavientBrowseAction = (fn: (() => void) | null): void => {
  _browse = fn;
  _listeners.forEach((l) => l());
};

export const getFavientBrowseAction = (): (() => void) | null => _browse;

// --- "open GMT Gradient Explorer" action (host-specific) — drives the Favients header's
// studio-launch button. Registered only where launching the standalone explorer makes
// sense (app-gmt); unset inside the explorer itself, so the button hides there. ---
let _studio: (() => void) | null = null;

export const setFavientStudioAction = (fn: (() => void) | null): void => {
  _studio = fn;
  _listeners.forEach((l) => l());
};

export const getFavientStudioAction = (): (() => void) | null => _studio;
