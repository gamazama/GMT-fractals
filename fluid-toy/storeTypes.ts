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

declare module '../engine/typedSlices' {
    interface AppFeatureSlices {
        julia:     SliceFromParams<typeof JuliaFeature['params']>;
        coupling:  SliceFromParams<typeof CouplingFeature['params']>;
        palette:   SliceFromParams<typeof PaletteFeature['params']>;
        collision: SliceFromParams<typeof CollisionFeature['params']>;
        fluidSim:  SliceFromParams<typeof FluidSimFeature['params']>;
        postFx:    SliceFromParams<typeof PostFxFeature['params']>;
        composite: SliceFromParams<typeof CompositeFeature['params']>;
        brush:     SliceFromParams<typeof BrushFeature['params']>;
    }
}
