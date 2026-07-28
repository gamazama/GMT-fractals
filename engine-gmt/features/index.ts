
import { featureRegistry } from '../engine/FeatureSystem';

// GMT-only features
import { AtmosphereFeature } from './atmosphere/index';
import { DrosteFeature } from './droste';
import { MaterialFeature } from './materials';
import { TexturingFeature } from './texturing';
import { ColoringFeature } from './coloring';
import { GeometryFeature } from './geometry';
import { WeaveFeature } from './weave';
import { QualityFeature } from './quality';
import { CoreMathFeature } from './core_math';
import { LightingFeature } from './lighting/index';
import { LightSpheresFeature } from './lighting/light_spheres';
import { OpticsFeature } from './optics';
import { NavigationFeature } from './navigation';
import { DrawingFeature } from './drawing/index';
import { RotationGizmoFeature } from './rotation_gizmo/index';
import { ShaderCompilerFeature } from './engine/index';
import { registerBoxFoldFormulas } from '../formulas/boxFolds';
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
/**
 * Boot-time registration entry — populates `featureRegistry` with 21 GMT-local
 * features + 6 engine-core features (imported by module identity), 27 total.
 * The engine-core six are exactly: postEffects, colorGrading, audio,
 * modulation, webcam, debugTools. Everything else registered below is
 * GMT-local — read the import path, not the section comment, before assuming
 * a def is shared.
 *
 * @invariant Registration ORDER matters. `LightSpheresFeature` MUST register
 * after `LightingFeature` (lighting declares the uniform arrays light_spheres
 * consumes); `LightSpheresFeature.dependsOn = ['lighting']` enforces it at
 * the FeatureSystem level.
 *
 * @invariant Engine-core features are imported BY MODULE IDENTITY from
 * `engine/features/*` — re-registration of the same ref short-circuits at
 * FeatureSystem (`existing === def`). Carrying GMT copies historically
 * produced 6 "Replacing definition" warnings AND broke `uToneMapping`
 * declaration order during post-pass compile. See ADR-0054 and the 26-34
 * line historical comment block above.
 */
export const registerFeatures = () => {
    // Core
    featureRegistry.register(CoreMathFeature);
    featureRegistry.register(GeometryFeature);
    featureRegistry.register(WeaveFeature);

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

    // Post & Effects. DrosteFeature is GMT-local (./droste); only the two
    // below are engine-core-shared by module identity.
    featureRegistry.register(DrosteFeature);
    featureRegistry.register(PostEffectsFeature);
    featureRegistry.register(ColorGradingFeature);

    // Scene
    featureRegistry.register(OpticsFeature);
    featureRegistry.register(NavigationFeature);
    featureRegistry.register(CameraManagerFeature);

    // Systems. Mixed: audio/modulation/webcam/debugTools are engine-core-shared
    // by module identity; drawing, rotationGizmo and shaderCompiler are
    // GMT-local (./drawing, ./rotation_gizmo, ./engine).
    featureRegistry.register(AudioFeature);
    featureRegistry.register(DrawingFeature);
    featureRegistry.register(RotationGizmoFeature);
    featureRegistry.register(ModulationFeature);
    featureRegistry.register(WebcamFeature);
    featureRegistry.register(DebugToolsFeature);
    featureRegistry.register(ShaderCompilerFeature);

    // BoxFold FORMULA defs (ADR-0089 P4.5): geometry's Hybrid Box fold step as
    // registered formulas, one per fold type — the weave slots the legacy
    // interleaved-mode migration targets (and picker entries for free). The
    // formula registry has no freeze, but registering here keeps every entry
    // (app, harness, sweep) consistent without touching formulas/index.ts.
    registerBoxFoldFormulas();
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
export type { WeaveState } from './weave';
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
