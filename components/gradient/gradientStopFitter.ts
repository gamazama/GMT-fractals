/**
 * gradientStopFitter — a host-agnostic seam that lets the engine-core Stops editor
 * (`components/AdvancedGradientEditor.tsx`) turn a RAMP gradient (ADR-0122) into a stop gradient
 * when the user asks for "Add stops", without importing `palette/` (the fitter's home — that
 * would invert the palette→engine dependency).
 *
 * Who fills it: `palette/registerPaletteUI.ts`, with `addStopsToConfig` at the generator's Detail
 * budget — every host that mounts the palette suite (app-gmt, the Gradient Explorer, fluid-toy).
 *
 * Who reads it: the editor, ONLY when its host did not pass `onAddStops`. A host that owns a
 * document store with a richer action passes the prop instead (GE v2's hero folds the pipeline via
 * `workingStore.addStopsToWorking`; the old shell's Stops mode calls `paletteEditorStore.addStops`).
 * Without the prop the editor emits the fitter's result through its own `onChange`, inside its
 * `editAction` bracket — which is how app-gmt's DDFS gradient param (mounted by `AutoFeaturePanel`,
 * which wires nothing but `onChange`) gets Add stops as one param-undo step.
 *
 * Contract for a fitter: given a ramp gradient, return a STOP gradient with the same `colorSpace`.
 * It is called with ramp gradients only.
 *
 * Side-effect-free at import; the setter touches no store, so it is safe to call before
 * `createEngineStore()`.
 *
 * @assumption One slot, last-writer-wins; with no fitter and no `onAddStops` the editor shows no
 *   Add stops action. Every in-tree host registers one, so the empty path is unexercised.
 * @see components/gradient/gradientEditorEntrance.ts (the sibling header seam, same shape)
 */

import type { GradientConfig } from '../../types';
import { createSingleSlot } from '../../store/createSingleSlot';

export type GradientStopFitter = (rampGradient: GradientConfig) => GradientConfig;

const _slot = createSingleSlot<GradientStopFitter>();

/** Register (or clear, with `null`) the ramp → stops fitter. */
export const setGradientStopFitter = (fitter: GradientStopFitter | null): void => _slot.set(fitter);

/** The registered fitter, or `null`. Stable between registrations (a safe snapshot). */
export const getGradientStopFitter = (): GradientStopFitter | null => _slot.get();

/** Subscribe to registration changes. Returns an unsubscribe. */
export const subscribeGradientStopFitter = (l: () => void): (() => void) => _slot.subscribe(l);
