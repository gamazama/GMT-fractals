/**
 * gradientFavients — a host-agnostic seam that lets the engine-core Stops editor
 * (`components/AdvancedGradientEditor.tsx`) and its shared action list
 * (`gradientActions.ts`) SEND the current gradient to the Favients shelf without
 * importing `palette/` (that would invert the palette→engine dependency).
 *
 * The host registers a tiny bridge in its registration step (`registerPaletteUI`):
 *   - `add(config)`    — add the gradient to the shelf (the host names it via
 *                        `configToName` and DEDUPES against the content signature,
 *                        so a repeat add is a harmless no-op).
 *   - `isFav(config)`  — content-presence query, so the menu can reflect "already
 *                        saved" and the add stays idempotent.
 *
 * This mirrors the sibling `gradientEditorEntrance` / `favientTargets` seams: engine
 * defines the slot, the palette host populates it (every host that mounts the palette
 * suite via `registerPaletteUI` does). A host that never registers a bridge leaves the
 * "Send to Favients" action out of both menus.
 *
 * Side-effect-free at import; the setter touches no store, so it is safe to call
 * before `createEngineStore()` (the registries-freeze boundary).
 *
 * @invariant One slot, last-writer-wins.
 */

import type { GradientConfig } from '../../types';

export interface GradientFavientsBridge {
  /** Add the gradient to the Favients shelf. Host names + dedupes; a repeat add is a no-op. */
  add: (config: GradientConfig) => void;
  /** Whether this gradient is already on the shelf (by content signature). */
  isFav: (config: GradientConfig) => boolean;
}

let _bridge: GradientFavientsBridge | null = null;
const _listeners = new Set<() => void>();

/** Register (or clear, with `null`) the favients bridge. */
export const setGradientFavientsBridge = (bridge: GradientFavientsBridge | null): void => {
  _bridge = bridge;
  _listeners.forEach((l) => l());
};

/** The currently registered bridge, or `null`. Stable reference between
 *  registrations, so it is a safe `useSyncExternalStore` snapshot. */
export const getGradientFavientsBridge = (): GradientFavientsBridge | null => _bridge;

/** Subscribe to bridge changes (registration normally happens once at boot; the
 *  editor subscribes defensively in case a host registers late). Returns unsubscribe. */
export const subscribeGradientFavientsBridge = (l: () => void): (() => void) => {
  _listeners.add(l);
  return () => {
    _listeners.delete(l);
  };
};
