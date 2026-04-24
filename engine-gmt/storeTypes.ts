/**
 * engine-gmt — store-type augmentations.
 *
 * Declaration-merges the GMT DDFS feature slices into the engine-core
 * `FeatureStateMap` so verbatim-ported GMT code (Navigation.tsx,
 * useInputController, usePhysicsProbe, future feature panels, …) can
 * read `useFractalStore(s => s.optics)` etc. and typecheck unchanged.
 *
 * Runtime side: `registerGmtFeatures()` (called at smoke / app boot)
 * registers these features with the SHARED `featureRegistry`, and
 * `createFeatureSlice` in engine-core's store builds live slices from
 * them. This file is purely a TYPE bridge — zero runtime cost.
 *
 * Import this file once from the app entry BEFORE the store is touched.
 * The smoke harness imports it via `_smoke-bootstrap.ts`. Mirrors
 * `fluid-toy/storeTypes.ts` for its own feature set.
 */

import type { OpticsState } from './features/optics';
import type { NavigationState } from './features/navigation';
import type { QualityState } from './features/quality';
import type { GeometryState } from './features/geometry';
import type { InterlaceState } from './features/interlace';
import type { ColoringState } from './features/coloring';
import type { TexturingState } from './features/texturing';
import type { MaterialState } from './features/materials';
import type { AtmosphereState } from './features/atmosphere/index';
import type { VolumetricState } from './features/volumetric/index';
import type { DrosteState } from './features/droste';
import type { LightingState } from './features/lighting/index';
import type { LightSpheresState } from './features/lighting/light_spheres';
import type { CoreMathState } from './features/core_math';
import type { WaterPlaneState } from './features/water_plane';
import type { AOState } from './features/ao/index';
import type { ReflectionsState } from './features/reflections/index';
import type { DrawingState } from './features/drawing/index';
import type { LightingActions } from './features/lighting/index';

declare module '../engine/features/types' {
    interface FeatureCustomActions extends LightingActions {}

    interface FeatureStateMap {
        coreMath:    CoreMathState;
        geometry:    GeometryState;
        interlace:   InterlaceState;
        lighting:    LightingState;
        lightSpheres: LightSpheresState;
        ao:          AOState;
        reflections: ReflectionsState;
        atmosphere:  AtmosphereState;
        volumetric:  VolumetricState;
        materials:   MaterialState;
        waterPlane:  WaterPlaneState;
        coloring:    ColoringState;
        texturing:   TexturingState;
        quality:     QualityState;
        droste:      DrosteState;
        optics:      OpticsState;
        navigation:  NavigationState;
        drawing:     DrawingState;
    }
}
