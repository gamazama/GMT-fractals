/**
 * Side-effect registration for Fluid Toy.
 *
 * Imported at the top of fluid-toy/main.tsx. All featureRegistry.register()
 * and componentRegistry.register() calls happen here before the engine
 * store is constructed (and the registries are frozen).
 *
 * Features will land across phase-3 commits:
 *   3c  JuliaFeature
 *   3d  DyeFeature (uses AdvancedGradientEditor via DDFS gradient type)
 *   3e  FluidSimFeature + SceneCameraFeature
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { JuliaFeature } from './features/julia';
import { DeepZoomFeature } from './features/deepZoom';
import { CouplingFeature } from './features/coupling';
import { PaletteFeature } from './features/palette';
import { CollisionFeature } from './features/collision';
import { FluidSimFeature } from './features/fluidSim';
import { PresetsFeature } from './features/presets';
import { PresetGrid } from './components/PresetGrid';
import { PostFxFeature } from './features/postFx';
import { CompositeFeature } from './features/composite';
import { BrushFeature } from './features/brush';
import { JuliaCPicker } from './components/JuliaCPicker';
// Note: DeepZoomStatus imports useEngineStore — registering it via
// componentRegistry would freeze the registry pre-feature-registration
// (see README "boot-order trap"). It's mounted directly in
// FluidToyApp instead, where the store is already constructed.

// Components used by feature customUI slots must be registered before
// the registries freeze (i.e. before the store is constructed). Match
// the id to the customUI entry in the feature definition.
//
// Components referenced from the panel manifest by `component:` (e.g.
// `panel-views`) DO NOT need to be registered here — they don't touch
// the feature/component registries' frozen state. Register those in
// main.tsx after the store is constructed so their module-scope
// `useEngineStore` imports don't freeze the registry pre-registration.
componentRegistry.register('julia-c-picker', JuliaCPicker);
componentRegistry.register('preset-grid', PresetGrid);

// Fractal tab — kind, c, zoom, center, iter, power, plus the
// palette-bound params (hidden from this tab, surfaced in Palette).
featureRegistry.register(JuliaFeature);

// Deep Zoom tab — perturbation + LA scaffolding. Toggles only in
// phase 1; engine wires later. See plans/fluid-toy-deep-zoom.md.
featureRegistry.register(DeepZoomFeature);

// Coupling tab — force mode + intensity knobs + auto-orbit subsection.
// Absorbs the pre-refactor split across FluidSim (force*) and Orbit.
featureRegistry.register(CouplingFeature);

// Palette tab — gradient, colour mapping, trap geometry, colour iter,
// interior colour, dye blend. Absorbs the palette-bound iteration
// params that were previously hidden on JuliaFeature. Still carries
// (hidden) brushMode / dyeMix — those move to their own features on
// later tabs.
featureRegistry.register(PaletteFeature);

// Collision tab — enabled toggle + gradient + preview + independent
// repeat/phase. Absorbs the wall params previously hidden on Palette.
featureRegistry.register(CollisionFeature);

// Fluid tab — vorticity / dissipation / pressure / resolution / dt.
// Tab 3 of this restructure pass will absorb dye-inject + dye-decay.
featureRegistry.register(FluidSimFeature);

// (SceneCameraFeature retired — zoom + center moved onto JuliaFeature.)
// (OrbitFeature retired — orbitEnabled/Radius/Speed moved onto CouplingFeature.)

// PostFX — tone mapping, exposure, vibrance, bloom, aberration,
// refraction, caustics, fluid style presets. Pure display-stage knobs.
featureRegistry.register(PostFxFeature);

// Composite — juliaMix + velocityViz balance controls.
featureRegistry.register(CompositeFeature);

// Brush — geometric + intensity knobs for left-drag splatting
// (size / strength / flow / spacing / jitter). Brush MODE
// (paint/erase/stamp/smudge) stays on the Palette feature (hidden)
// until the FluidEngine brush overhaul (Tab 4 of restructure pass).
featureRegistry.register(BrushFeature);

// Presets — chip grid backed by the reference preset pack. Applying
// dispatches every affected slice setter via presets/apply.ts and
// resets the fluid fields via engineHandles.
featureRegistry.register(PresetsFeature);
