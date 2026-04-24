/**
 * Aggregate feature state + custom action maps.
 *
 * Apps/plugins that add their own features extend these via declaration
 * merging so the store's typed shape reflects the installed feature set
 * without this file needing edits.
 */

import type { ColorGradingState } from './color_grading';
import type { PostEffectsState } from './post_effects';
import type { AudioState } from './audioMod';
import type { ModulationState, ModulationActions, ModulationRule } from './modulation';
import type { WebcamState } from './webcam';
import type { DebugToolsState } from './debug_tools';

// Master state map — generic baseline. Apps/plugins declaration-merge
// to add their own feature state slots.
export interface FeatureStateMap {
    postEffects: PostEffectsState;
    colorGrading: ColorGradingState;
    audio: AudioState;
    modulation: ModulationState;
    webcam: WebcamState;
    debugTools: DebugToolsState;
}

// Master action map — for features that expose custom actions beyond
// the auto-generated `set<FeatureId>` setter.
export interface FeatureCustomActions extends ModulationActions {}

// Re-export helper types that UI components reference directly.
export type { ModulationRule };

// Backward-compat stub: downstream components still import DrawnShape.
// The drawing feature was removed during extraction; re-add the type
// if/when a drawing plugin is registered.
export type DrawnShape = unknown;

// Re-export feature states for external consumption.
export type {
    PostEffectsState,
    ColorGradingState,
    AudioState,
    ModulationState,
    WebcamState,
    DebugToolsState,
};
