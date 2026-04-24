
import { featureRegistry } from '../engine/FeatureSystem';

// GMT-only features
import { AtmosphereFeature } from './atmosphere/index';
import { DrosteFeature } from './droste';
import { MaterialFeature } from './materials';
import { TexturingFeature } from './texturing';
import { ColoringFeature } from './coloring';
import { GeometryFeature } from './geometry';
import { InterlaceFeature } from './interlace';
import { QualityFeature } from './quality';
import { CoreMathFeature } from './core_math';
import { LightingFeature } from './lighting/index';
import { LightSpheresFeature } from './lighting/light_spheres';
import { OpticsFeature } from './optics';
import { NavigationFeature } from './navigation';
import { DrawingFeature } from './drawing/index';
import { EngineSettingsFeature } from './engine/index';
import { AOFeature } from './ao/index';
import { ReflectionsFeature } from './reflections/index';
import { WaterPlaneFeature } from './water_plane';
import { CameraManagerFeature } from './camera_manager/index';
import { VolumetricFeature } from './volumetric/index';

// Shared features — import the engine-core copies directly. When
// createFeatureSlice later calls engine-core's registerFeatures(), each
// of these hits the `existing === def` fast-path (identical module
// identity) and no-ops silently. Prior approach was to carry GMT's
// own copies under engine-gmt/features/{post_effects,color_grading,…},
// which diff-identical to engine-core's but triggered 6 "Replacing
// definition for X" warnings — a subtle Map insertion-order change broke
// uToneMapping declaration during post-pass compile. Using the engine-
// core imports eliminates both issues.
import { PostEffectsFeature }  from '../../engine/features/post_effects';
import { ColorGradingFeature } from '../../engine/features/color_grading';
import { AudioFeature }        from '../../engine/features/audioMod';
import { ModulationFeature }   from '../../engine/features/modulation';
import { WebcamFeature }       from '../../engine/features/webcam';
import { DebugToolsFeature }   from '../../engine/features/debug_tools';

// --- REGISTER FEATURES ---
export const registerFeatures = () => {
    // Core
    featureRegistry.register(CoreMathFeature);
    featureRegistry.register(GeometryFeature);
    featureRegistry.register(InterlaceFeature);

    // Rendering & Shading
    featureRegistry.register(LightingFeature);
    featureRegistry.register(LightSpheresFeature); // dependsOn: ['lighting']
    featureRegistry.register(AOFeature);
    featureRegistry.register(ReflectionsFeature);
    featureRegistry.register(AtmosphereFeature);
    featureRegistry.register(VolumetricFeature);
    featureRegistry.register(MaterialFeature);
    featureRegistry.register(WaterPlaneFeature);
    featureRegistry.register(ColoringFeature);
    featureRegistry.register(TexturingFeature);
    featureRegistry.register(QualityFeature);

    // Post & Effects (engine-core-shared — same module identity).
    featureRegistry.register(DrosteFeature);
    featureRegistry.register(PostEffectsFeature);
    featureRegistry.register(ColorGradingFeature);

    // Scene
    featureRegistry.register(OpticsFeature);
    featureRegistry.register(NavigationFeature);
    featureRegistry.register(CameraManagerFeature);

    // Systems (engine-core-shared — same module identity).
    featureRegistry.register(AudioFeature);
    featureRegistry.register(DrawingFeature);
    featureRegistry.register(ModulationFeature);
    featureRegistry.register(WebcamFeature);
    featureRegistry.register(DebugToolsFeature);
    featureRegistry.register(EngineSettingsFeature);
};

// --- EXPORT TYPES ---
// `export type` (isolatedModules requirement). The 6 ids shared with
// engine-core re-export the state types from engine-core's canonical
// location — engine-gmt has no longer has local copies.
export type { AudioState }        from '../../engine/features/audioMod';
export type { ModulationState }   from '../../engine/features/modulation';
export type { WebcamState }       from '../../engine/features/webcam';
export type { DebugToolsState }   from '../../engine/features/debug_tools';
export type { PostEffectsState }  from '../../engine/features/post_effects';
export type { ColorGradingState } from '../../engine/features/color_grading';

export type { DrawingState } from './drawing/index';
export type { AOState } from './ao/index';
export type { ReflectionsState } from './reflections/index';
export type { NavigationState } from './navigation';
export type { OpticsState } from './optics';
export type { QualityState } from './quality';
export type { GeometryState } from './geometry';
export type { InterlaceState } from './interlace';
export type { ColoringState } from './coloring';
export type { TexturingState } from './texturing';
export type { MaterialState } from './materials';
export type { AtmosphereState } from './atmosphere/index';
export type { VolumetricState } from './volumetric/index';
export type { DrosteState } from './droste';
export type { LightingState } from './lighting/index';
export type { LightSpheresState } from './lighting/light_spheres';
export type { CoreMathState } from './core_math';
export type { WaterPlaneState } from './water_plane';
