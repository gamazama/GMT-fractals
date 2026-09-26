/**
 * gradientEditorEntrance — a host-agnostic header-slot seam for the Stops editor
 * (`components/AdvancedGradientEditor.tsx`).
 *
 * The editor lives in engine-core, but app hosts want to hang an app-specific
 * affordance in its header — all three palette hosts (app-gmt, the Gradient
 * Explorer, fluid-toy) mount the Favients "saved gradients & presets" shelf
 * entrance there. Engine-core can't import
 * `palette/` (that would invert the palette→engine dependency), so the host
 * REGISTERS the node here and the editor renders whatever is registered (or
 * nothing). This mirrors the existing `setFavientStudioAction` / favientTargets
 * pattern: engine defines the seam, the host populates it in its registration
 * step (`registerPaletteUI`).
 *
 * Side-effect-free at import; the setter touches no store, so it is safe to call
 * before `createEngineStore()` (the registries-freeze boundary).
 *
 * SEVERAL ENTRANCES, IN REGISTRATION ORDER (2026-09-26). It was one slot, last-writer-wins, until
 * app-gmt's Gradient Studio added a second affordance beside the Favients star (the popout,
 * `palette/components/GradientStudioEntrance.tsx`, registered by `palette/installGradientStudio.ts`
 * — app-gmt only, so fluid-toy and the Explorer keep the star alone). Keyed by `id`: registering an
 * id again replaces that entrance in place (HMR, a re-run registration), `clear…(id)` removes it.
 * The editor renders every entrance, in order, handed the same context.
 *
 * @assumption Registration order is render order and a re-registered id keeps its place — the
 *   `Map` insertion order `createListRegistry` builds its snapshot from. No guard reaches this
 *   file (`grep -rl gradientEditorEntrance debug/` is empty), so nothing would go red if either half
 *   broke; `npm run smoke:gradient-studio` does click the popout, which proves only that it renders.
 */

import type { ReactNode } from 'react';
import type { GradientConfig } from '../../types';
import { createListRegistry } from '../../store/createListRegistry';

/** Live editor context handed to the entrance on every render. */
export interface GradientEditorEntranceContext {
  /** The editor's CURRENT gradient (stops + colour/blend space) — lets the entrance
   *  act on it (e.g. the Favients button adds it when the shelf is already open). */
  config: GradientConfig;
  /** Generic identity of the DDFS param this editor edits, when mounted inside a
   *  feature panel (AutoFeaturePanel passes it). Absent for standalone editors (the
   *  Gradient Explorer / Generator stage). Lets the host map the editor to a Favients
   *  send target — e.g. the star pointing the "Destination" dropdown at this section. */
  featureId?: string;
  paramKey?: string;
  /** Which surface the editor is mounted in, when its host says (`AdvancedGradientEditor`'s
   *  `entranceHost`). The Gradient Studio passes `'studio'`, so its own popout hides itself there;
   *  absent everywhere else. */
  host?: string;
}

export interface GradientEditorEntrance {
  /** Stable id — the registry key (a second registration under it replaces the first). */
  id: string;
  /** Render the header affordance. Called on every editor render with the current
   *  gradient, so the host's component should be cheap / memo-friendly. */
  render: (ctx: GradientEditorEntranceContext) => ReactNode;
}

const _registry = createListRegistry<GradientEditorEntrance>();

/** Register an entrance (replacing any under the same id). Returns an unregister. */
export const setGradientEditorEntrance = (entrance: GradientEditorEntrance): (() => void) => _registry.register(entrance);

/** Remove the entrance registered under `id`, if any. */
export const clearGradientEditorEntrance = (id: string): void => _registry.unregister(id);

/** Every registered entrance, in registration order. Stable reference between registrations,
 *  so it is a safe `useSyncExternalStore` snapshot. */
export const getGradientEditorEntrances = (): GradientEditorEntrance[] => _registry.getAll();

/** Subscribe to entrance changes. Registration normally happens once at boot
 *  (pre-render), but the editor subscribes defensively in case a host registers
 *  late. Returns an unsubscribe. */
export const subscribeGradientEditorEntrance = (l: () => void): (() => void) => _registry.subscribe(l);
