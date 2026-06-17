
import type { CoreMathState } from './core_math';
import type { GeometryState } from './geometry';
import type { AtmosphereState } from './atmosphere';
import type { MaterialState } from './materials';
import type { TexturingState } from './texturing';
import type { ColoringState } from './coloring';
import type { QualityState } from './quality';
import type { LightingState, LightingActions } from './lighting/index';
import type { DrosteState } from './droste';
import type { OpticsState } from './optics';
import type { NavigationState } from './navigation';
import type { AOState } from './ao/index';
import type { WaterPlaneState } from './water_plane';

// Import Feature-Specific Types — 6 shared with engine-core resolve
// through the canonical engine-core paths (see features/index.ts).
import type { ColorGradingState } from '../../engine/features/color_grading';
import type { AudioState }        from '../../engine/features/audioMod';
import type { ModulationState, ModulationActions, ModulationRule } from '../../engine/features/modulation';
import type { WebcamState }       from '../../engine/features/webcam';
import type { DebugToolsState }   from '../../engine/features/debug_tools';
import type { DrawingState, DrawingActions, DrawnShape } from './drawing';

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
