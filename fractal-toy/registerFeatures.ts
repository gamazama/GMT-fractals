/**
 * Side-effect registration for Fractal Toy.
 *
 * Imported at the TOP of fractal-toy/main.tsx. All featureRegistry.register()
 * and formulaRegistry.register() calls happen here, before the engine
 * store is constructed (and the registries are frozen).
 *
 * Features are generic (camera, lighting). Formulas go through the
 * separate formulaRegistry: only one is active at a time, and
 * `registerFormula` auto-lifts the formula's params into the DDFS feature
 * registry so panels + preset round-trip come for free.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { registerFormula } from './renderer/formulaRegistry';
import { MandelbulbFormula } from './renderer/formulas/mandelbulb';
import { MandelboxFormula } from './renderer/formulas/mandelbox';
import { CameraFeature } from './features/camera';
import { LightingFeature } from './features/lighting';

// Formulas — registered first so the DDFS features they lift are
// available when setup.ts seeds the default layout.
registerFormula(MandelbulbFormula);
registerFormula(MandelboxFormula);

// Orbit camera — uniforms only; pinhole ray construction lives in the
// assembler because camera math is pipeline-level rather than per-formula.
featureRegistry.register(CameraFeature);

// Directional light + ambient + AO + albedo.
featureRegistry.register(LightingFeature);
