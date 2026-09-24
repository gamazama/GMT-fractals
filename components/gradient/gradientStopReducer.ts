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
 * (`ReduceStopsPopup`) is a stop-count slider over a PLAN, with `steps` as named quick picks, and
 * the editor pulls plans from `reduce` ONE `next()` PER MACROTASK, so a gradient of a hundred
 * stops (and the blend-mode search behind it) never freezes a frame. Apply emits the chosen
 * version through the editor's own `editAction` + `emitChange` — the same one undo step Invert
 * or Double Stops is, on whatever history the host brackets — blend mode included.
 *
 * Contract for a reducer (ADR-0128): called with a STOP gradient of three or more stops only (the
 * menu gates ramps and two-stop gradients before it gets here). Every plan it yields has a
 * version at EVERY count from `from − 1` down to 2 — the popup's slider can sit anywhere from the
 * first plan on — each with exactly that many stops and the input's `colorSpace`; `blendSpace` is
 * the input's unless `searchBlend` is on. `steps` maps every named amount to a count that never
 * rises from one amount to the next. The tolerances are the reducer's business — the editor
 * shows names and stop counts only. The last value it yields has `pending: false`.
 *
 * Side-effect-free at import; the setter touches no store, so it is safe to call before
 * `createEngineStore()`.
 *
 * @assumption One slot, last-writer-wins, and every in-tree host fills it through
 *   `registerPaletteUI`; the empty-slot path (no Reduce item) is unexercised.
 * @see components/gradient/gradientStopFitter.ts (the sibling seam, same shape)
 * @see palette/core/reduceStops.ts (the reducer, and the guard on its contract)
 * @see docs/adr/0128-reduce-stops-is-a-stop-count-axis.md
 */

import type { GradientConfig } from '../../types';
import { createSingleSlot } from '../../store/createSingleSlot';

/** One named amount of reduction — a quick pick in the popup. A NAME, never a description. */
export interface GradientReduceStepName {
  id: string;
  name: string;
}

/**
 * What the popup shows: the gradient at every stop count, and where each named amount lands.
 * A reducer yields a fresh one whenever it knows more (the search fills in behind the first).
 */
export interface GradientReducePlan {
  /** The input's stop count. */
  from: number;
  /** `byCount[k]`: the gradient with exactly k stops (2 ≤ k < from). Its `blendSpace` is the
   *  input's unless the search found a better description in another. */
  byCount: readonly (GradientConfig | undefined)[];
  /** Step id → the stop count that named amount lands on (`from`: it removes nothing). */
  steps: Readonly<Record<string, number>>;
  /** More is coming. */
  pending: boolean;
}

export interface GradientReduceOptions {
  /** Try the other blend modes too (the popup's "Try other blend modes"). */
  searchBlend: boolean;
}

export interface GradientStopReducer {
  /** The named amounts, tightest first. */
  steps: readonly GradientReduceStepName[];
  /** Plans for `config`, pulled one `next()` per macrotask; `null` = still working, nothing new. */
  reduce: (config: GradientConfig, opts: GradientReduceOptions) => Iterator<GradientReducePlan | null>;
}

const _slot = createSingleSlot<GradientStopReducer>();

/** Register (or clear, with `null`) the stop reducer. */
export const setGradientStopReducer = (reducer: GradientStopReducer | null): void => _slot.set(reducer);

/** The registered reducer, or `null`. Stable between registrations (a safe snapshot). */
export const getGradientStopReducer = (): GradientStopReducer | null => _slot.get();

/** Subscribe to registration changes. Returns an unsubscribe. */
export const subscribeGradientStopReducer = (l: () => void): (() => void) => _slot.subscribe(l);
