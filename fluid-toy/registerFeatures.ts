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
import { DyeFeature } from './features/dye';
import { FluidSimFeature } from './features/fluidSim';
import { SceneCameraFeature } from './features/sceneCamera';
import { OrbitFeature } from './features/orbit';
import { PostFxFeature } from './features/postFx';
import { CompositeFeature } from './features/composite';
import { BrushFeature } from './features/brush';
import { JuliaCPicker } from './components/JuliaCPicker';

// Components used by feature customUI slots must be registered before
// the registries freeze (i.e. before the store is constructed). Match
// the id to the customUI entry in the feature definition.
componentRegistry.register('julia-c-picker', JuliaCPicker as any);

// 3c: Julia/Mandelbrot fractal iteration params.
featureRegistry.register(JuliaFeature);

// 3d: Dye/palette params with gradient editor via DDFS gradient type.
featureRegistry.register(DyeFeature);

// 3e: Fluid-sim dynamics knobs (vorticity, pressure, forces, target
// resolution, force-mode dropdown). Uses numeric enum pattern for
// forceMode since DDFS param types don't include 'string' — app-side
// mapping via FORCE_MODES array.
featureRegistry.register(FluidSimFeature);

// 3e: 2D scene camera (pan + zoom). Parallel to fractal-toy's orbit
// camera. Both wait for the eventual @engine/camera plugin to unify.
featureRegistry.register(SceneCameraFeature);

// 3i: Auto-orbit for Julia c. DDFS params (enabled/radius/speed/anchor)
// drive a TickRegistry handler that rewrites julia.juliaC each frame
// when enabled. Modulation-style continuous driver, not keyframes.
featureRegistry.register(OrbitFeature);

// PostFX — tone mapping, exposure, vibrance, bloom, aberration,
// refraction, caustics, fluid style presets. Pure display-stage knobs.
featureRegistry.register(PostFxFeature);

// Composite — juliaMix + velocityViz balance controls.
featureRegistry.register(CompositeFeature);

// Brush — geometric + intensity knobs for left-drag splatting
// (size / strength / flow / spacing / jitter). Brush MODE
// (paint/erase/stamp/smudge) stays on the Dye feature.
featureRegistry.register(BrushFeature);
