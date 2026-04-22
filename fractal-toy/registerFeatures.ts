/**
 * Side-effect registration for Fractal Toy.
 *
 * Imported at the TOP of fractal-toy/main.tsx. All featureRegistry.register()
 * and componentRegistry.register() calls happen here, before the engine
 * store is constructed (and the registries are frozen).
 *
 * Features + components will land here across phase-1 commits:
 *   1b  (nothing yet — assembler tested with zero features)
 *   1c  MandelbulbFeature
 *   1d  CameraFeature + 'fractal-toy-canvas' viewport overlay
 *   1e  LightingFeature
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { MandelbulbFeature } from './features/mandelbulb';
import { CameraFeature } from './features/camera';

// 1c: the fractal formula. Injects GLSL via ShaderBuilder.addSection
// under the 'formulaFunction' and 'formulaCall' names that
// fractal-toy/shaderAssembler.ts reads back.
featureRegistry.register(MandelbulbFeature);

// 1d: orbit-style camera. Declares uniforms only — the pinhole-ray
// construction lives in the assembler, since camera math is pipeline
// level rather than per-formula.
featureRegistry.register(CameraFeature);
