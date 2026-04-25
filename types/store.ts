
import { FormulaType, CameraMode, PreciseVector3, CameraState } from './common';
import { LfoTarget, AnimationParams } from './animation';
import { Preset, FractalDefinition } from './preset';
import { ContextMenuItem } from './help';
import type { FeatureStateMap, FeatureCustomActions, DrawnShape, ModulationRule } from '../engine/features/types';
import { LightParams } from './graphics';
import type { ScalabilityState, HardwareProfile } from './viewport';

// Optics was a fractal-leaning feature. Apps that need typed optics on
// saved cameras can declaration-merge to widen this opaque record.
type OpticsState = Record<string, unknown>;

// PanelId was a fixed union of GMT's panels. The engine treats it as a
// string tag so apps/add-ons can register any panel they need.
export type PanelId = string;

/** Canvas-gesture mode. Apps with domain-specific picks (e.g. a
 *  picker tool) widen this via declaration merging or carry the
 *  sub-state in their own feature slice. */
export type InteractionMode = 'none' | 'picking_focus' | 'picking_julia' | 'selecting_region' | 'selecting_preview';

export type CompositionOverlayType = 'none' | 'grid' | 'thirds' | 'golden' | 'spiral' | 'center' | 'diagonal' | 'safearea';

// Composition overlay settings (inspired by Blender/C4D)
export interface CompositionOverlaySettings {
    opacity: number;           // 0-1
    lineThickness: number;     // 0.5-3
    showCenterMark: boolean;
    showSafeAreas: boolean;    // Action/title safe zones
    color: string;             // CSS color
    // Grid settings
    gridDivisionsX: number;    // 2-16 divisions
    gridDivisionsY: number;    // 2-16 divisions
    // Spiral settings
    spiralRotation: number;    // 0-360 degrees
    spiralPositionX: number;   // 0-1 (0=left, 1=right)
    spiralPositionY: number;   // 0-1 (0=top, 1=bottom)
    spiralScale: number;       // 0.5-2.0
    spiralRatio: number;       // 1.0-2.0 (1.618 = golden ratio/phi)
}

// Export helper types for components
export type { DrawnShape, ModulationRule }; 

// --- AUTO GENERATED ACTIONS ---
type FeatureSetters = {
    [K in keyof FeatureStateMap as `set${Capitalize<string & K>}`]: (update: Partial<FeatureStateMap[K]>) => void;
};

/** Saved-camera library entry. The library is a generic state-library
 *  slice — the inner `state` payload holds the camera-specific fields
 *  (CameraState plus GMT optics). See engine-gmt/store/cameraSlice.ts
 *  for the install + capture/apply wiring. */
export interface SavedCameraPayload extends CameraState {
    optics: OpticsState;
}
export interface SavedCamera {
    id: string;
    label: string;
    thumbnail?: string;
    state: SavedCameraPayload;
    createdAt: number;
}

// --- NEW LAYOUT TYPES ---
export type DockZone = 'left' | 'right' | 'float';

export interface PanelState {
    id: PanelId;
    location: DockZone;
    isOpen: boolean; // For Float visibility OR Dock active tab logic
    order: number;
    isCore: boolean;
    floatPos?: { x: number, y: number };
    floatSize?: { width: number, height: number };
}

// --- MAIN STORE STATE ---
export interface EngineStoreState extends FeatureStateMap {
  formula: FormulaType;
  
  // Project Metadata
  projectSettings: {
      name: string;
      version: number;
  };
  
  // State Tracking for Smart Versioning
  lastSavedHash: string | null;

  dpr: number; 
  aaLevel: number; 
  msaaSamples: number; 
  aaMode: 'Off' | 'Auto' | 'Always';  
  accumulation: boolean; 
  previewMode: boolean;
  renderMode: 'Direct' | 'PathTracing';
  
  isPaused: boolean; // Manual pause
  sampleCap: number; // Stop accumulation after N samples
  
  isUserInteracting: boolean; // Global flag for slider/gizmo interaction

  // Active Viewport State
  // NOTE: cameraPos was removed — it was always (0,0,0) at runtime.
  // World position lives exclusively in sceneOffset. The field still exists
  // in the Preset type (types/fractal.ts) for backwards-compatible serialization;
  // PresetLogic absorbs it into sceneOffset on load.
  cameraRot: { x: number, y: number, z: number, w: number };
  targetDistance: number;

  // Camera Manager State
  savedCameras: SavedCamera[];
  activeCameraId: string | null;

  isBucketRendering: boolean;
  bucketSize: number;
  outputWidth: number;       // Bucket render output width in pixels
  outputHeight: number;      // Bucket render output height in pixels
  tileCols: number;          // Image-tile grid columns (1 = single image output)
  tileRows: number;          // Image-tile grid rows (1 = single image output)
  matchViewportAspect: boolean; // When true, W/H inputs preserve viewport ratio
  convergenceThreshold: number;
  samplesPerBucket: number;
  canvasPixelSize: [number, number]; // Physical pixel size of the post-sidebar canvas area. Read via getCanvasPhysicalPixelSize() in fractalStore.ts — do not read directly (Fixed-mode lag).

  advancedMode: boolean;
  showHints: boolean;
  debugMobileLayout: boolean; // New: Forces Mobile UI Layout
  // Deprecated UI Flags (Handled by PanelState now)
  // isControlsMinimized: boolean; 
  // isControlsDocked: boolean;
  
  invertY: boolean;
  
  resolutionMode: 'Full' | 'Fixed';
  fixedResolution: [number, number];

  // Adaptive viewport quality (phase 2b). Apps consume qualityFraction
  // as a hint on [minQuality, 1] — 1 = full quality, lower = reduce
  // internal resolution / sim grid / whatever the app's engine uses as
  // its quality knob. The plugin computes this from fpsSmoothed vs
  // adaptiveConfig.targetFps and isUserInteracting. See
  // docs/10_Viewport.md.
  qualityFraction: number;
  fps: number;               // last-sample instantaneous FPS
  fpsSmoothed: number;       // exponential smoothing, adaptive-loop driver
  adaptiveConfig: {
    enabled: boolean;
    targetFps: number;
    minQuality: number;          // floor for qualityFraction, i.e. 1 / maxScale
    interactionDownsample: number; // fraction of full quality used in manual mode
    /** Grace after last user activity during which adaptive keeps adjusting
     *  when the mouse is on canvas. Scales with render cost (slower renders
     *  get longer grace); this is the floor. */
    activityGraceMs: number;
    /** When true, adaptive is always on regardless of activity state — for
     *  apps with no "idle" moment (live sims like fluid-toy). When false,
     *  GMT-style: idle mouse on canvas → full-res to enjoy the result. */
    alwaysActive: boolean;
  };
  renderRegion: { minX: number, minY: number, maxX: number, maxY: number } | null;
  // Preview Region — export-resolution preview of a canvas slice. See docs/44_Preview_Region_Plan.md.
  // Truthy iff preview is active (`previewRegion !== null` == "previewing").
  previewRegion: { minX: number, minY: number, maxX: number, maxY: number } | null;
  
  isBroadcastMode: boolean;
  
  compilerHardCap: number;
  isExporting: boolean;
  adaptiveSuppressed: boolean;

  lockSceneOnSwitch: boolean;
  exportIncludeScene: boolean;
  
  showLightGizmo: boolean;
  isGizmoDragging: boolean;
  draggedLightIndex: string | null;
  openLightPopupIndex: number;  // -1 = no popup open
  shadowPanelOpen: boolean;
  vpQualityOpen: boolean;
  
  // Consolidated Interaction State
  interactionMode: InteractionMode;
  focusLock: boolean;
  
  cameraMode: CameraMode; 
  sceneOffset: PreciseVector3;
  animations: AnimationParams[]; 
  liveModulations: Partial<Record<LfoTarget, number>>;
  
  histogramData: Float32Array | null;
  histogramAutoUpdate: boolean;
  histogramTrigger: number;
  histogramLayer: 0 | 1;
  histogramActiveCount: number; // Ref count for probe activation
  histogramLoading: boolean;
  
  sceneHistogramData: Float32Array | null;
  sceneHistogramTrigger: number;
  sceneHistogramActiveCount: number; // Ref count
  
  // Unified transaction stack (see store/slices/historySlice.ts). Each
  // entry is a Transaction { scope, label?, diff, timestamp }. The scope
  // tag replaces the previous three-stack design (F2b). Kept typed as
  // any[] at the root to avoid a circular import with historySlice's
  // Transaction type declaration; historySlice re-narrows internally.
  undoStack: any[];
  redoStack: any[];
  interactionSnapshot: Partial<EngineStoreState> | null;
  interactionScope: string | null;

  // NOTE: Modular builder state (graph/pipeline/pipelineRevision/autoCompile)
  // was removed with the modular graph system. A future plugin that wants a
  // node-graph authoring surface should carry its state inside
  // `features[pluginId]` rather than at the root of EngineStoreState.

  isTimelineHovered: boolean;
  
  tabSwitchCount: number;

  // --- NEW LAYOUT STATE ---
  panels: Record<string, PanelState>;
  leftDockSize: number;
  rightDockSize: number;
  isLeftDockCollapsed: boolean;
  isRightDockCollapsed: boolean;
  activeLeftTab: PanelId | null; // Calculated helper
  activeRightTab: PanelId | null; // Calculated helper
  draggingPanelId: string | null; // Global Drag State
  dragSnapshot: Record<string, PanelState> | null; // For canceling drags

  helpWindow: { visible: boolean; activeTopicId: string | null; };
  contextMenu: { visible: boolean; x: number; y: number; items: ContextMenuItem[]; targetHelpIds: string[]; };

  // Composition overlay for viewport
  compositionOverlay: CompositionOverlayType;
  compositionOverlaySettings: CompositionOverlaySettings;

  // Formula Workshop
  workshopOpen: boolean;
  workshopEditFormula: string | undefined;

  // Viewport Quality System
  scalability: ScalabilityState;
  hardwareProfile: HardwareProfile | null;

  // Tutorial System
  tutorialActive: boolean;
  tutorialLessonId: number | null;
  tutorialStepIndex: number;
  tutorialCompleted: number[];
}

export type EngineState = EngineStoreState;

// --- ACTIONS INTERFACE ---
export interface EngineActions extends FeatureSetters, FeatureCustomActions {
    setFormula: (f: FormulaType, options?: { skipDefaultPreset?: boolean }) => void;
    
    setProjectSettings: (s: Partial<{ name: string, version: number }>) => void;
    
    // Checks if state has changed since last save. Increments version if dirty. Returns active version.
    prepareExport: () => number;

    setDpr: (v: number) => void; 
    setAALevel: (v: number) => void;
    setMSAASamples: (v: number) => void;
    setAAMode: (v: any) => void;
    setAccumulation: (v: boolean) => void;
    setPreviewMode: (v: boolean) => void;
    setRenderMode: (v: 'Direct' | 'PathTracing') => void;
    setIsPaused: (v: boolean) => void;
    setSampleCap: (v: number) => void;
    
    setIsBucketRendering: (v: boolean) => void;
    setBucketSize: (v: number) => void;
    setOutputWidth: (v: number) => void;
    setOutputHeight: (v: number) => void;
    setTileCols: (v: number) => void;
    setTileRows: (v: number) => void;
    setMatchViewportAspect: (v: boolean) => void;
    setConvergenceThreshold: (v: number) => void;
    setSamplesPerBucket: (v: number) => void;
    setCanvasPixelSize: (w: number, h: number) => void;

    setAdvancedMode: (v: boolean) => void;
    setShowHints: (v: boolean) => void;
    setDebugMobileLayout: (v: boolean) => void;
    // setIsControlsMinimized: (v: boolean) => void; // Deprecated
    setInvertY: (v: boolean) => void;
    
    setResolutionMode: (m: 'Full' | 'Fixed') => void;
    setFixedResolution: (w: number, h: number) => void;
    setRenderRegion: (r: { minX: number, minY: number, maxX: number, maxY: number } | null) => void;
    setPreviewRegion: (r: { minX: number, minY: number, maxX: number, maxY: number } | null) => void;
    // setIsControlsDocked: (v: boolean) => void; // Deprecated
    setIsBroadcastMode: (v: boolean) => void;

    setIsExporting: (v: boolean) => void;
    setAdaptiveSuppressed: (v: boolean) => void;

    // Adaptive viewport (phase 2b). Apps call reportFps (or frameTick —
    // exposed on the plugin) per frame; the slice computes fps/fpsSmoothed
    // and ramps qualityFraction based on target FPS + interaction state
    // + grace period. See engine/plugins/Viewport.ts.
    reportFps: (fps: number) => void;
    holdAdaptive: (durationMs?: number) => void;
    setAdaptiveConfig: (cfg: Partial<EngineStoreState['adaptiveConfig']>) => void;

    setLockSceneOnSwitch: (v: boolean) => void;
    setExportIncludeScene: (v: boolean) => void;
    
    setShowLightGizmo: (v: boolean) => void;
    setGizmoDragging: (v: boolean) => void;
    setDraggedLight: (id: string | null) => void;
    setOpenLightPopupIndex: (index: number) => void;
    setShadowPanelOpen: (v: boolean) => void;
    setVpQualityOpen: (v: boolean) => void;

    setInteractionMode: (mode: InteractionMode) => void;
    setFocusLock: (v: boolean) => void;
    
    setCameraMode: (v: CameraMode) => void;
    setSceneOffset: (v: any) => void;
    setAnimations: (v: AnimationParams[]) => void;
    setLiveModulations: (v: Partial<Record<LfoTarget, number>>) => void;
    // Modular builder actions were removed with the graph system; if a
    // future plugin needs setGraph/setPipeline/refreshPipeline, it adds
    // them via store extension (Zustand slice composition).
    loadPreset: (p: Preset) => void;
    loadScene: (args: { def?: FractalDefinition; preset: Preset }) => void;

    getPreset: (options?: { includeScene?: boolean }) => Preset;
    getShareString: (options?: { includeAnimations?: boolean }) => string;
    
    setHistogramData: (d: Float32Array | null) => void;
    setHistogramLoading: (v: boolean) => void;
    setHistogramAutoUpdate: (v: boolean) => void;
    refreshHistogram: () => void;
    setHistogramLayer: (v: 0 | 1) => void;
    
    registerHistogram: () => void;
    unregisterHistogram: () => void;
    registerSceneHistogram: () => void;
    unregisterSceneHistogram: () => void;
    
    setSceneHistogramData: (d: Float32Array | null) => void;
    refreshSceneHistogram: () => void;
    
    setIsTimelineHovered: (v: boolean) => void;
    
    incrementTabSwitchCount: () => void;

    // --- NEW LAYOUT ACTIONS ---
    movePanel: (id: string, targetZone: DockZone, order?: number) => void;
    reorderPanel: (draggingId: string, targetId: string) => void; // New Action
    togglePanel: (id: string, forceState?: boolean) => void; // Toggle Open/Closed
    setDockSize: (side: 'left' | 'right', size: number) => void;
    setDockCollapsed: (side: 'left' | 'right', collapsed: boolean) => void;
    setFloatPosition: (id: string, x: number, y: number) => void;
    setFloatSize: (id: string, w: number, h: number) => void;
    startPanelDrag: (id: string) => void;
    endPanelDrag: () => void;
    cancelPanelDrag: () => void;
    
    // Legacy mapping (Aliases for compatibility during refactor)
    setActiveTab: (tab: PanelId) => void; // Maps to opening a tab in its dock
    floatTab: (tab: PanelId) => void; // Maps to movePanel(id, 'float')
    dockTab: (tab: PanelId) => void; // Maps to movePanel(id, 'right')

    resetCamera: () => void;
    
    updateCamera: (id: string, updates: Partial<SavedCamera>) => void;
    deleteCamera: (id: string) => void;
    reorderCameras: (fromIndex: number, toIndex: number) => void;

    // Camera Manager (orchestration — composes primitives + events + optics)
    addCamera: (nameOverride?: string) => void;
    selectCamera: (id: string | null) => void;
    duplicateCamera: (id: string) => void;
    saveToSlot: (slotIndex: number) => void;

    handleInteractionStart: (mode?: 'camera' | 'param' | any) => void;
    handleInteractionEnd: () => void;

    // Unified undo API (see historySlice).
    undo: (scope?: string) => boolean;
    redo: (scope?: string) => boolean;
    canUndo: (scope?: string) => boolean;
    canRedo: (scope?: string) => boolean;
    peekUndo: (scope?: string) => any | null;
    peekRedo: (scope?: string) => any | null;
    clearHistory: () => void;

    // Backward-compat shims — delegate to undo(scope)/redo(scope).
    undoCamera: () => void;
    redoCamera: () => void;
    undoParam: () => void;
    redoParam: () => void;
    resetParamHistory: () => void;

    openHelp: (topicId?: string) => void;
    closeHelp: () => void;
    openContextMenu: (x: number, y: number, items: ContextMenuItem[], targetHelpIds?: string[]) => void;
    closeContextMenu: () => void;

    openWorkshop: (editFormula?: string) => void;
    closeWorkshop: () => void;

    // Composition overlay
    setCompositionOverlay: (type: CompositionOverlayType) => void;
    setCompositionOverlaySettings: (settings: Partial<CompositionOverlaySettings>) => void;

    // Viewport Quality System
    applyScalabilityPreset: (presetId: string) => void;
    setSubsystemTier: (subsystemId: string, tier: number) => void;
    setHardwareProfile: (profile: HardwareProfile) => void;

    // Tutorial System
    startTutorial: (lessonId: number) => void;
    advanceTutorialStep: () => void;
    skipTutorial: () => void;
    completeTutorial: () => void;
}
