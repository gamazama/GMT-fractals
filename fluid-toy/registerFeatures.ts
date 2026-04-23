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
import { JuliaFeature } from './features/julia';

// 3c: Julia/Mandelbrot fractal iteration params. FluidToyApp subscribes
// to the slice and pushes into FluidEngine.setParams — no inject()
// because FluidEngine owns its own GLSL pipeline.
featureRegistry.register(JuliaFeature);
