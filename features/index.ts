
import { featureRegistry } from '../engine/FeatureSystem';
import { AtmosphereFeature } from './atmosphere/index'; 
import { DrosteFeature } from './droste';
import { MaterialFeature } from './materials';
import { ColorGradingFeature } from './color_grading';
import { TexturingFeature } from './texturing';
import { ColoringFeature } from './coloring';
import { GeometryFeature } from './geometry';
import { QualityFeature } from './quality';
import { CoreMathFeature } from './core_math';
import { LightingFeature } from './lighting/index';
import { OpticsFeature } from './optics';
import { NavigationFeature } from './navigation';
import { AudioFeature } from './audioMod';
import { DrawingFeature } from './drawing/index';
import { ModulationFeature } from './modulation';
import { WebcamFeature } from './webcam';
import { DebugToolsFeature } from './debug_tools';
import { EngineSettingsFeature } from './engine/index';
import { AOFeature } from './ao/index';
import { ReflectionsFeature } from './reflections/index';
import { WaterPlaneFeature } from './water_plane';

// --- REGISTER FEATURES ---
export const registerFeatures = () => {
    // Core
    featureRegistry.register(CoreMathFeature);
    featureRegistry.register(GeometryFeature);
    
    // Rendering & Shading
    featureRegistry.register(LightingFeature);
    featureRegistry.register(AOFeature);
    featureRegistry.register(ReflectionsFeature);
    featureRegistry.register(AtmosphereFeature);
    featureRegistry.register(MaterialFeature);
    featureRegistry.register(WaterPlaneFeature);
    featureRegistry.register(ColoringFeature);
    featureRegistry.register(TexturingFeature);
    featureRegistry.register(QualityFeature);
    
    // Post & Effects
    featureRegistry.register(DrosteFeature);
    featureRegistry.register(ColorGradingFeature);
    
    // Scene
    featureRegistry.register(OpticsFeature);
    featureRegistry.register(NavigationFeature);
    
    // Systems
    featureRegistry.register(AudioFeature);
    featureRegistry.register(DrawingFeature);
    featureRegistry.register(ModulationFeature);
    featureRegistry.register(WebcamFeature);
    featureRegistry.register(DebugToolsFeature);
    featureRegistry.register(EngineSettingsFeature);
};

// --- EXPORT TYPES ---
// CRITICAL FIX: Use 'export type' for interfaces to prevent runtime import errors
export * from './audioMod';
export * from './drawing/index';
export * from './modulation';
export * from './webcam';
export * from './debug_tools';
export * from './ao/index';
export * from './reflections/index';
export type { NavigationState } from './navigation';
export type { OpticsState } from './optics';
export type { QualityState } from './quality';
export type { GeometryState } from './geometry';
export type { ColoringState } from './coloring';
export type { TexturingState } from './texturing';
export type { ColorGradingState } from './color_grading';
export type { MaterialState } from './materials';
export type { AtmosphereState } from './atmosphere/index'; 
export type { DrosteState } from './droste';
export type { LightingState } from './lighting/index';
export type { CoreMathState } from './core_math';
export type { WaterPlaneState } from './water_plane';
