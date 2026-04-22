/**
 * Feature registration entry point.
 *
 * Registers the generic (non-fractal) features that survived the engine
 * extraction. A future app or plugin (e.g. GMT raymarching) will register
 * its own features on top of these via `featureRegistry.register(MyFeature)`.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { PostEffectsFeature } from './post_effects';
import { ColorGradingFeature } from './color_grading';
import { AudioFeature } from './audioMod';
import { ModulationFeature } from './modulation';
import { WebcamFeature } from './webcam';
import { DebugToolsFeature } from './debug_tools';

export const registerFeatures = () => {
    // Post & Effects
    featureRegistry.register(PostEffectsFeature);
    featureRegistry.register(ColorGradingFeature);

    // Systems
    featureRegistry.register(AudioFeature);
    featureRegistry.register(ModulationFeature);
    featureRegistry.register(WebcamFeature);
    featureRegistry.register(DebugToolsFeature);
};

// --- Type exports (use `export type` to prevent runtime import errors
// under isolatedModules; see CLAUDE.md) ---
export * from './audioMod';
export * from './modulation';
export * from './webcam';
export * from './debug_tools';
