/**
 * gradientEditorEntrance — a host-agnostic header-slot seam for the Stops editor
 * (`components/AdvancedGradientEditor.tsx`).
 *
 * The editor lives in engine-core, but app hosts want to hang an app-specific
 * affordance in its header — app-gmt + the Gradient Explorer mount the Favients
 * "saved gradients & presets" shelf entrance there. Engine-core can't import
 * `palette/` (that would invert the palette→engine dependency), so the host
 * REGISTERS the node here and the editor renders whatever is registered (or
 * nothing). This mirrors the existing `setFavientStudioAction` / favientTargets
 * pattern: engine defines the seam, the host populates it in its registration
 * step (`registerPaletteUI`).
 *
 * Side-effect-free at import; the setter touches no store, so it is safe to call
 * before `createEngineStore()` (the registries-freeze boundary).
 *
 * @invariant One slot, last-writer-wins. A host that never registers leaves the
 * editor header clean (e.g. fluid-toy, which has no Favients shelf).
 */

import type { ReactNode } from 'react';
import type { GradientConfig } from '../../types';

/** Live editor context handed to the entrance on every render. */
export interface GradientEditorEntranceContext {
  /** The editor's CURRENT gradient (stops + colour/blend space) — lets the entrance
   *  act on it (e.g. the Favients button adds it when the shelf is already open). */
  config: GradientConfig;
}

export interface GradientEditorEntrance {
  /** Stable id (for debugging / future multi-slot; currently a single slot). */
  id: string;
  /** Render the header affordance. Called on every editor render with the current
   *  gradient, so the host's component should be cheap / memo-friendly. */
  render: (ctx: GradientEditorEntranceContext) => ReactNode;
}

let _entrance: GradientEditorEntrance | null = null;
const _listeners = new Set<() => void>();

/** Register (or clear, with `null`) the editor's header entrance. */
export const setGradientEditorEntrance = (entrance: GradientEditorEntrance | null): void => {
  _entrance = entrance;
  _listeners.forEach((l) => l());
};

/** The currently registered entrance, or `null`. Stable reference between
 *  registrations, so it is a safe `useSyncExternalStore` snapshot. */
export const getGradientEditorEntrance = (): GradientEditorEntrance | null => _entrance;

/** Subscribe to entrance changes. Registration normally happens once at boot
 *  (pre-render), but the editor subscribes defensively in case a host registers
 *  late. Returns an unsubscribe. */
export const subscribeGradientEditorEntrance = (l: () => void): (() => void) => {
  _listeners.add(l);
  return () => {
    _listeners.delete(l);
  };
};
