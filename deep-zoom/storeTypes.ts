/**
 * Deep Zoom slice type augmentation.
 *
 * Declares each DDFS feature's slice shape into the engine's typed store
 * interface. Once imported, `useSlice('dzFormula')` returns a typed
 * `DzFormulaSlice`, not `any`, and `setDzQuality({ detail: 2 })` type-checks
 * its payload.
 *
 * Each slice type is `SliceFromParams<typeof FEATURE['params']>`, so adding a
 * param to a feature definition extends the typed shape with no second list
 * to keep in step. The feature files end with a guard that goes red if a
 * slice key ever degrades to `any` (grep `SliceIsTyped` in deep-zoom/features/).
 *
 * A pure type-declaration module: zero runtime content. It is pulled in by
 * `import './storeTypes'` in registerFeatures.ts (the app-gmt idiom), which is
 * also what makes it reachable for `npm run orphans`.
 *
 * The integrator of each stage adds that stage's store fields here when it
 * opens the stage (BUILD-PLAN, "Rules for every package"). Stage 1 has only
 * the five feature slices.
 */

import type { SliceFromParams } from '../engine/typedSlices';
import type { DzFormulaFeature } from './features/formula';
import type { DzQualityFeature } from './features/quality';
import type { DzInspectFeature } from './features/inspect';
import type { DzLightFeature }   from './features/light';
import type { DzColourFeature }  from './features/colour';
import type { DzCameraFeature }  from './features/camera';

export type DzFormulaSlice = SliceFromParams<typeof DzFormulaFeature['params']>;
export type DzQualitySlice = SliceFromParams<typeof DzQualityFeature['params']>;
export type DzInspectSlice = SliceFromParams<typeof DzInspectFeature['params']>;
export type DzLightSlice   = SliceFromParams<typeof DzLightFeature['params']>;
export type DzColourSlice  = SliceFromParams<typeof DzColourFeature['params']>;
export type DzCameraSlice  = SliceFromParams<typeof DzCameraFeature['params']>;

// Augment AppFeatureSlices so `useSlice('dzFormula')` is typed (engine-side
// hook contract).
declare module '../engine/typedSlices' {
    interface AppFeatureSlices {
        dzFormula: DzFormulaSlice;
        dzQuality: DzQualitySlice;
        dzInspect: DzInspectSlice;
        dzLight:   DzLightSlice;
        dzColour:  DzColourSlice;
        camera:    DzCameraSlice;
    }
}

// Augment FeatureStateMap so the main store's typed shape (EngineStoreState +
// the auto-generated `set<Feature>` actions) reflects these slices.
declare module '../engine/features/types' {
    interface FeatureStateMap {
        dzFormula: DzFormulaSlice;
        dzQuality: DzQualitySlice;
        dzInspect: DzInspectSlice;
        dzLight:   DzLightSlice;
        dzColour:  DzColourSlice;
        camera:    DzCameraSlice;
    }
}
