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

// Empty at 1a — scaffold only. Features are registered in subsequent commits.
export {};
