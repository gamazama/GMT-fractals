import { CoreMathState } from './core_math';
import { GeometryState } from './geometry';
import { AtmosphereState } from './atmosphere';
import { MaterialState } from './materials';
import { TexturingState } from './texturing';
import { ColoringState } from './coloring';
import { QualityState } from './quality';
import { LightingState, LightingActions } from './lighting/index';
import { DrosteState } from './droste';
import { ColorGradingState } from './color_grading';
import { OpticsState } from './optics';
import { NavigationState } from './navigation';
import { AOState } from './ao/index'; 
import { WaterPlaneState } from './water_plane';

// Import Feature-Specific Types
import { AudioState } from './audioMod';
import { DrawingState, DrawingActions, DrawnShape } from './drawing';
import { ModulationState, ModulationActions, ModulationRule } from './modulation';
import { WebcamState } from './webcam';
import { DebugToolsState } from './debug_tools';

// 1. The Master State Map
export interface FeatureStateMap {
    coreMath: CoreMathState;
    geometry: GeometryState;
    atmosphere: AtmosphereState;
    ao: AOState; 
    materials: MaterialState;
    texturing: TexturingState;
    coloring: ColoringState;
    quality: QualityState;
    lighting: LightingState;
    droste: DrosteState;
    colorGrading: ColorGradingState;
    optics: OpticsState;
    navigation: NavigationState;
    audio: AudioState;
    drawing: DrawingState;
    modulation: ModulationState;
    webcam: WebcamState;
    debugTools: DebugToolsState;
    waterPlane: WaterPlaneState;
}

// 2. The Master Action Map
export interface FeatureCustomActions extends DrawingActions, ModulationActions, LightingActions {
}

// 3. Re-export Helper Types
export type { 
    DrawnShape,
    ModulationRule
};

// Re-export specific states using 'export type'
export type { 
    CoreMathState, GeometryState, AtmosphereState, AOState, MaterialState, TexturingState, 
    ColoringState, QualityState, LightingState, DrosteState, ColorGradingState, 
    OpticsState, NavigationState, AudioState, DrawingState, ModulationState, WebcamState, DebugToolsState, WaterPlaneState 
};