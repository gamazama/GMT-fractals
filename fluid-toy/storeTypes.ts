/**
 * Fluid-toy slice type augmentation.
 *
 * Declares each DDFS feature's slice shape into the engine's typed
 * store interface. Once imported, `useSlice('julia')` returns a fully
 * typed `JuliaSlice`, not `any`. `setSlice('brush', { size: 0.2 })`
 * type-checks its payload against `BrushSlice`.
 *
 * Each slice type uses `SliceFromParams<typeof FEATURE.params>` so
 * adding a new param to a FeatureDefinition automatically extends the
 * typed shape. No second source of truth to keep in sync.
 *
 * Import this file once from the app entry (`main.tsx` already
 * imports `./registerFeatures` which runs before the store boots —
 * this file rides alongside as a pure type-declaration module; zero
 * runtime cost).
 */

import type { SliceFromParams } from '../engine/typedSlices';
import type { JuliaFeature }      from './features/julia';
import type { CouplingFeature }   from './features/coupling';
import type { PaletteFeature }    from './features/palette';
import type { CollisionFeature }  from './features/collision';
import type { FluidSimFeature }   from './features/fluidSim';
import type { PostFxFeature }     from './features/postFx';
import type { CompositeFeature }  from './features/composite';
import type { BrushFeature }      from './features/brush';

export type JuliaSlice     = SliceFromParams<typeof JuliaFeature['params']>;
export type CouplingSlice  = SliceFromParams<typeof CouplingFeature['params']>;
export type PaletteSlice   = SliceFromParams<typeof PaletteFeature['params']>;
export type CollisionSlice = SliceFromParams<typeof CollisionFeature['params']>;
export type FluidSimSlice  = SliceFromParams<typeof FluidSimFeature['params']>;
export type PostFxSlice    = SliceFromParams<typeof PostFxFeature['params']>;
export type CompositeSlice = SliceFromParams<typeof CompositeFeature['params']>;
export type BrushSlice     = SliceFromParams<typeof BrushFeature['params']>;

// Augment AppFeatureSlices so `useSlice('julia')` is typed (engine-side
// hook contract).
declare module '../engine/typedSlices' {
    interface AppFeatureSlices {
        julia:     JuliaSlice;
        coupling:  CouplingSlice;
        palette:   PaletteSlice;
        collision: CollisionSlice;
        fluidSim:  FluidSimSlice;
        postFx:    PostFxSlice;
        composite: CompositeSlice;
        brush:     BrushSlice;
    }
}

// Augment FeatureStateMap so the main store's typed shape
// (EngineStoreState + auto-generated `set<Feature>` actions) reflects
// fluid-toy's slices. This is what kills the `(getState() as any).setBrush`
// pattern across the app.
declare module '../engine/features/types' {
    interface FeatureStateMap {
        julia:     JuliaSlice;
        coupling:  CouplingSlice;
        palette:   PaletteSlice;
        collision: CollisionSlice;
        fluidSim:  FluidSimSlice;
        postFx:    PostFxSlice;
        composite: CompositeSlice;
        brush:     BrushSlice;
    }
}
