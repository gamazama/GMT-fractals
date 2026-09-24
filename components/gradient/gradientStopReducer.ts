/**
 * gradientStopReducer — a host-agnostic seam that lets the engine-core Stops editor
 * (`components/AdvancedGradientEditor.tsx`) offer "Reduce stops…" without importing `palette/`
 * (the reducer's home — that would invert the palette→engine dependency). The sibling of
 * `gradientStopFitter.ts`, same shape.
 *
 * Who fills it: `palette/registerPaletteUI.ts`, with `palette/core/reduceStops.ts` — every host
 * that mounts the palette suite (app-gmt, the Gradient Explorer, fluid-toy). With the slot empty
 * the editor's menu has no Reduce item at all.
 *
 * Who reads it: the editor. Its menu shows "Reduce Stops…" while the slot is filled; the popup
 * (`ReduceStopsPopup`) names `steps` and the editor pulls results from `reduce` ONE PER MACROTASK,
 * so a gradient of a hundred stops fills the popup in over a few frames instead of freezing one.
 * Apply emits the chosen result through the editor's own `editAction` + `emitChange` — the same
 * one undo step Invert or Double Stops is, on whatever history the host brackets.
 *
 * Contract for a reducer: called with a STOP gradient of three or more stops only (the menu
 * gates ramps and two-stop gradients before it gets here). `reduce` yields one result per entry
 * of `steps`, in that order; each keeps the input's `colorSpace` and `blendSpace`, never has more
 * stops than the input or than the result before it, and describes the same gradient within the
 * step's tolerance. The tolerances are the reducer's business — the editor shows names and stop
 * counts only.
 *
 * Side-effect-free at import; the setter touches no store, so it is safe to call before
 * `createEngineStore()`.
 *
 * @assumption One slot, last-writer-wins, and every in-tree host fills it through
 *   `registerPaletteUI`; the empty-slot path (no Reduce item) is unexercised.
 * @see components/gradient/gradientStopFitter.ts (the sibling seam, same shape)
 * @see palette/core/reduceStops.ts (the reducer, and the guard on its contract)
 */

import type { GradientConfig } from '../../types';
import { createSingleSlot } from '../../store/createSingleSlot';

/** One named amount of reduction — the popup's option. A NAME, never a description. */
export interface GradientReduceStepName {
  id: string;
  name: string;
}

/** One step's answer: the reduced gradient (the input's spaces, fewer or equal stops). */
export interface GradientReduceResult {
  id: string;
  config: GradientConfig;
}

export interface GradientStopReducer {
  /** The named amounts, tightest first. */
  steps: readonly GradientReduceStepName[];
  /** The results for `config`, one per `next()`, in `steps` order. */
  reduce: (config: GradientConfig) => Iterator<GradientReduceResult>;
}

const _slot = createSingleSlot<GradientStopReducer>();

/** Register (or clear, with `null`) the stop reducer. */
export const setGradientStopReducer = (reducer: GradientStopReducer | null): void => _slot.set(reducer);

/** The registered reducer, or `null`. Stable between registrations (a safe snapshot). */
export const getGradientStopReducer = (): GradientStopReducer | null => _slot.get();

/** Subscribe to registration changes. Returns an unsubscribe. */
export const subscribeGradientStopReducer = (l: () => void): (() => void) => _slot.subscribe(l);
