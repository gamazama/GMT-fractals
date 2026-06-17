// Typed feature accessors. Replace the `(state as any).setX(...)`
// pattern with `setFeature(MyFeature, { ... })` — the patch shape is
// inferred from MyFeature's params, autocomplete works, no casts.
//
// Requires features to be declared via `defineFeature(...)` so the
// param literal types survive (a plain `: FeatureDefinition` annotation
// erases them).
//
//   export const DemoFeature = defineFeature({
//       id: 'demo',
//       params: {
//           color: { type: 'color', default: '#22d3ee', label: 'Color' },
//           size:  { type: 'float', default: 120, label: 'Size', min: 20, max: 400, step: 1 },
//       },
//       ...
//   });
//
//   setFeature(DemoFeature, { color: '#fff' });   // typed
//   const { size } = getFeature(DemoFeature);     // typed

import { useEngineStore } from '../../store/engineStore';
import type { FeatureDefinition, ParamConfig, ParamType } from '../FeatureSystem';

// Maps a ParamType string to the JS value shape `setFeature` expects.
// Composite param types ('gradient', 'image', 'complex') stay `any`
// because their slice shape is feature-specific.
type ParamValueByType = {
    float:    number;
    int:      number;
    boolean:  boolean;
    color:    string;
    vec2:     { x: number; y: number };
    vec3:     { x: number; y: number; z: number };
    vec4:     { x: number; y: number; z: number; w: number };
    gradient: any;
    image:    any;
    complex:  any;
};

type ValueOfParam<P extends ParamConfig> = P['type'] extends keyof ParamValueByType
    ? ParamValueByType[P['type']]
    : unknown;

export type FeatureState<F extends { params: Record<string, ParamConfig> }> = {
    [K in keyof F['params']]: ValueOfParam<F['params'][K]>;
};

// Identity helper that preserves the `params` literal types. Replaces
// the previous pattern `export const DemoFeature: FeatureDefinition`,
// which widened param types to ParamType and lost the per-key value
// shape used by setFeature/getFeature.
export const defineFeature = <P extends Record<string, ParamConfig>>(
    def: Omit<FeatureDefinition, 'params'> & { params: P },
): typeof def => def;

/**
 * @invariant Setter naming is a load-bearing string convention:
 *   `'set' + capitalized feature.id` (e.g. `setAudio`, `setPostEffects`).
 *   Not type-enforced. A boot-order bug where `setFeature()` runs before
 *   the feature's slice has been registered into the store will hit the
 *   dev-only `console.warn` at line ~68 — silent in production. The same
 *   convention is consumed by store auto-wiring and by
 *   `CompilableFeatureSection`. See q-013 carry-in.
 */
const setterName = (id: string): string =>
    `set${id.charAt(0).toUpperCase()}${id.slice(1)}`;

export const setFeature = <F extends { id: string; params: Record<string, ParamConfig> }>(
    feature: F,
    patch: Partial<FeatureState<F>>,
): void => {
    const state = useEngineStore.getState() as unknown as Record<string, unknown>;
    const setter = state[setterName(feature.id)];
    if (typeof setter === 'function') {
        (setter as (p: unknown) => void)(patch);
    } else if (import.meta.env.DEV) {
        console.warn(`[setFeature] no setter "${setterName(feature.id)}" — was "${feature.id}" registered before the store was created?`);
    }
};

export const getFeature = <F extends { id: string; params: Record<string, ParamConfig> }>(
    feature: F,
): FeatureState<F> => {
    const state = useEngineStore.getState() as unknown as Record<string, unknown>;
    return state[feature.id] as FeatureState<F>;
};

// Re-export ParamType so feature files can import everything from one
// place when needed.
export type { ParamType };
