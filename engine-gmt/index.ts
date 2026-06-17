/**
 * @engine-gmt — public API barrel.
 *
 * GMT rendering plugin library. Apps that want GMT-style raymarched
 * fractal rendering (Mandelbulb + 41 other formulas, path tracing, bucket
 * export, etc.) install from here. Not for use by fluid-toy / fractal-toy
 * — those are simpler apps with their own renderers.
 *
 * Import shape:
 *
 *   import {
 *       installGmtRenderer,
 *       gmtRenderer,
 *       GmtRendererCanvas,
 *       GmtRendererTickDriver,
 *   } from '@engine-gmt';
 *
 * Future (as phases land):
 *   - installGmtTick        (Phase F — AnimationSystem move from legacy-gmt)
 *   - registerGmtFeatures() (Phase E — coloring/atmosphere/materials/…)
 *   - registerGmtFormulas() (Phase D — 42 FractalDefinitions)
 */

export {
    installGmtRenderer,
    gmtRenderer,
    type InstallGmtRendererOptions,
} from './renderer/install';

export { GmtRendererCanvas } from './renderer/GmtRendererCanvas';
export { GmtRendererTickDriver } from './renderer/GmtRendererTickDriver';

// Re-export the proxy singleton factory so downstream code can grab it
// directly without knowing the internal file layout.
export { getProxy } from './engine/worker/WorkerProxy';

// Feature registration entry — apps call `registerGmtFeatures()` ONCE at
// module load (before the engine store is constructed) to register GMT's
// 26 DDFS features (coreMath, geometry, coloring, lighting, optics,
// materials, atmosphere, ao, quality, …). The store's createFeatureSlice
// picks them up automatically.
export { registerFeatures as registerGmtFeatures } from './features/index';

// Feature state types — apps wire typed-slice augmentations via these.
export type {
    CoreMathState, GeometryState, InterlaceState, LightingState, LightSpheresState,
    AOState, ReflectionsState, AtmosphereState, VolumetricState, MaterialState,
    WaterPlaneState, ColoringState, TexturingState, QualityState, DrosteState,
    PostEffectsState, ColorGradingState, OpticsState, NavigationState,
    AudioState, DrawingState, ModulationState, WebcamState, DebugToolsState,
} from './features/index';
