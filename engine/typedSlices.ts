/**
 * @engine/typed-slices — typed accessors for DDFS feature slices.
 *
 * DDFS auto-generates store state under `state[featureId]` and setters
 * under `state[setFeatureId]`. The store itself is untyped in those
 * shapes, so direct access degenerates to `any`:
 *
 *     const b = useEngineStore((s: any) => s.brush);     // any
 *     (state as any).setBrush({ size: 0.2 });              // any
 *
 * This module is a declaration-merging target. Apps extend the
 * `AppFeatureSlices` interface with their feature shapes:
 *
 *     // fluid-toy/storeTypes.ts
 *     declare module '@engine/typed-slices' {
 *         interface AppFeatureSlices {
 *             brush: {
 *                 size: number;
 *                 mode: number;
 *                 particleEmitter: boolean;
 *                 // ...
 *             };
 *             julia: { juliaC: { x: number; y: number }; maxIter: number; zoom: number; ... };
 *         }
 *     }
 *
 * Then the app gets typed access via the helpers below. The engine
 * doesn't need to know about fluid-toy's slice shapes — each app owns
 * its own augmentation.
 *
 * Why declaration merging instead of inferring from FeatureDefinition:
 * full inference would need each feature file to carry a generic
 * `FeatureDefinition<typeof MyParams>` and the chain of typings all
 * the way into zustand's create() — doable but heavy. Declaration
 * merging is pragmatic: one interface per feature, written once,
 * updated when params change (TypeScript catches drift when setters
 * get called with new fields).
 */

import { useEngineStore } from '../store/engineStore';
import type { ParamConfig } from './FeatureSystem';
import type { GradientConfig } from '../types';
import type { LfoTarget } from '../types/animation';

/**
 * Infer a TypeScript shape from a DDFS `params` record. Maps each
 * param's `type` to its runtime representation so `SliceFromParams<typeof
 * MyFeature.params>` reconstructs the slice shape without the app
 * having to repeat it.
 *
 * Fallback to `any` for param types we haven't mapped yet — `image`
 * and `complex` are rare and their exact shape is plugin-specific.
 */
type ParamValue<P extends ParamConfig> =
    P['type'] extends 'float' | 'int' ? number :
    P['type'] extends 'boolean' ? boolean :
    P['type'] extends 'vec2'    ? { x: number; y: number } :
    P['type'] extends 'vec3'    ? { x: number; y: number; z: number } :
    P['type'] extends 'vec4'    ? { x: number; y: number; z: number; w: number } :
    P['type'] extends 'color'   ? { r: number; g: number; b: number } :
    P['type'] extends 'gradient' ? GradientConfig :
    any;

/** Helper: `SliceFromParams<typeof MyFeature.params>` reconstructs the
 *  typed slice shape from a DDFS params record. */
export type SliceFromParams<P extends Record<string, ParamConfig>> = {
    [K in keyof P]: ParamValue<P[K]>;
};

/** Declaration-merging target. Apps augment this via `declare module`. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppFeatureSlices {}

/** All slice ids the app has typed. String-literal union. */
export type AppSliceId = keyof AppFeatureSlices;

/**
 * Subscribe to a typed feature slice — zustand hook with the result
 * typed to the augmented interface. Returns the whole slice; use
 * selector-style reads (`useSlice('brush').size`) or split into
 * multiple calls when you want finer granularity.
 */
export const useSlice = <K extends AppSliceId>(id: K): AppFeatureSlices[K] => {
    return useEngineStore((s: any) => s[id]) as AppFeatureSlices[K];
};

/**
 * Read a slice imperatively — for event handlers / RAF loops where
 * the React hook isn't appropriate. Returns the current snapshot,
 * not a subscription.
 */
export const getSlice = <K extends AppSliceId>(id: K): AppFeatureSlices[K] => {
    return (useEngineStore.getState() as any)[id] as AppFeatureSlices[K];
};

/**
 * Write a partial patch to a slice via its auto-generated setter.
 * The setter name is derived by convention (`setJulia` for id `julia`).
 * A missing setter logs a warning and no-ops — useful for HMR where
 * the setter may have been renamed upstream.
 */
export const setSlice = <K extends AppSliceId>(
    id: K,
    patch: Partial<AppFeatureSlices[K]>,
): void => {
    const setterName = `set${String(id).charAt(0).toUpperCase() + String(id).slice(1)}`;
    const state = useEngineStore.getState() as any;
    const setter = state[setterName];
    if (typeof setter !== 'function') {
        console.warn(`[typedSlices] no "${setterName}" on store for slice "${String(id)}"`);
        return;
    }
    setter(patch);
};

// Stable empty fallback for the liveModulations selector. Module-level
// so it's the same reference across renders — using `?? {}` inline in a
// selector would create a fresh object every eval and defeat zustand's
// reference-equality re-render gate, forcing the consumer component to
// re-render on every store update.
const EMPTY_LIVE_MODS: Readonly<Partial<Record<LfoTarget, number>>> = Object.freeze({});

/**
 * Subscribe to the live-modulations map (base + LFO/audio/rule offsets
 * the modulation tick writes each frame). Stable empty fallback baked in
 * so consumers don't have to remember the `?? {}` footgun.
 *
 * Read pattern: `liveMod[target] ?? base` — the live value always wins
 * when present, otherwise fall back to the slice's authored value.
 */
export const useLiveModulations = (): Partial<Record<LfoTarget, number>> => {
    return useEngineStore((s) => s.liveModulations ?? EMPTY_LIVE_MODS);
};

/**
 * Subscribe imperatively to slice changes (for use in non-React code
 * — orbit ticks, brush RAF loops, etc.). Returns an unsubscribe fn.
 *
 * Uses zustand's subscribe with a selector so the callback fires only
 * when the slice reference actually changes.
 */
export const subscribeSlice = <K extends AppSliceId>(
    id: K,
    listener: (next: AppFeatureSlices[K], prev: AppFeatureSlices[K]) => void,
): (() => void) => {
    return useEngineStore.subscribe(
        (s: any) => s[id] as AppFeatureSlices[K],
        listener,
    );
};
