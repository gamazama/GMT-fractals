
import { FormulaType, CameraMode, PreciseVector3, CameraState } from './common';
import { LfoTarget, AnimationParams } from './animation';
import { FractalGraph, PipelineNode } from './graph';
import { Preset } from './fractal';
import { ContextMenuItem } from './help';
import { FeatureStateMap, FeatureCustomActions, DrawnShape, ModulationRule } from '../features/types';
import { LightParams } from './graphics';

export type PanelId = 'Formula' | 'Graph' | 'Scene' | 'Light' | 'Shading' | 'Gradients' | 'Quality' | 'Audio' | 'Drawing' | 'Engine';

export type InteractionMode = 'none' | 'picking_focus' | 'picking_julia' | 'selecting_region';

// Export helper types for components
export { DrawnShape, ModulationRule }; 

// --- AUTO GENERATED ACTIONS ---
type FeatureSetters = {
    [K in keyof FeatureStateMap as `set${Capitalize<string & K>}`]: (update: Partial<FeatureStateMap[K]>) => void;
};

// --- MAIN STORE STATE ---
export interface FractalStoreState extends FeatureStateMap {
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

  cameraPos: { x: number, y: number, z: number };
  cameraRot: { x: number, y: number, z: number, w: number };
  targetDistance: number;

  isBucketRendering: boolean;
  bucketSize: number; 
  bucketUpscale: number; 
  convergenceThreshold: number; 

  advancedMode: boolean;
  showHints: boolean;
  debugMobileLayout: boolean; // New: Forces Mobile UI Layout
  isControlsMinimized: boolean;
  invertY: boolean;
  
  resolutionMode: 'Full' | 'Fixed';
  fixedResolution: [number, number]; 
  renderRegion: { minX: number, minY: number, maxX: number, maxY: number } | null; 
  isControlsDocked: boolean;
  isBroadcastMode: boolean;
  
  compilerHardCap: number;
  isExporting: boolean;

  lockSceneOnSwitch: boolean;
  exportIncludeScene: boolean;
  
  showLightGizmo: boolean;
  isGizmoDragging: boolean;
  draggedLightIndex: number | null;
  
  // Consolidated Interaction State
  interactionMode: InteractionMode;
  
  cameraMode: CameraMode; 
  sceneOffset: PreciseVector3;
  animations: AnimationParams[]; 
  liveModulations: Partial<Record<LfoTarget, number>>;
  
  histogramData: Float32Array | null;
  histogramAutoUpdate: boolean;
  histogramTrigger: number;
  histogramLayer: 0 | 1;
  histogramActiveCount: number; // Ref count for probe activation
  
  sceneHistogramData: Float32Array | null;
  sceneHistogramTrigger: number;
  sceneHistogramActiveCount: number; // Ref count
  
  undoStack: CameraState[];
  redoStack: CameraState[];
  interactionSnapshot: Partial<FractalStoreState> | null;
  
  // Missing properties added to match HistorySliceState
  paramUndoStack: Partial<FractalStoreState>[];
  paramRedoStack: Partial<FractalStoreState>[];

  graph: FractalGraph;
  pipeline: PipelineNode[]; 
  pipelineRevision: number;
  autoCompile: boolean;
  
  isTimelineHovered: boolean;
  
  tabSwitchCount: number;

  activeTab: PanelId;
  floatingTabs: PanelId[];

  helpWindow: { visible: boolean; activeTopicId: string | null; };
  contextMenu: { visible: boolean; x: number; y: number; items: ContextMenuItem[]; targetHelpIds: string[]; };
}

export type FractalState = FractalStoreState;

// --- ACTIONS INTERFACE ---
export interface FractalActions extends FeatureSetters, FeatureCustomActions {
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
    setBucketUpscale: (v: number) => void;
    setConvergenceThreshold: (v: number) => void;

    setAdvancedMode: (v: boolean) => void;
    setShowHints: (v: boolean) => void;
    setDebugMobileLayout: (v: boolean) => void;
    setIsControlsMinimized: (v: boolean) => void;
    setInvertY: (v: boolean) => void;
    
    setResolutionMode: (m: 'Full' | 'Fixed') => void;
    setFixedResolution: (w: number, h: number) => void;
    setRenderRegion: (r: { minX: number, minY: number, maxX: number, maxY: number } | null) => void;
    setIsControlsDocked: (v: boolean) => void;
    setIsBroadcastMode: (v: boolean) => void;

    setCompilerHardCap: (v: number) => void;
    setIsExporting: (v: boolean) => void;

    setLockSceneOnSwitch: (v: boolean) => void;
    setExportIncludeScene: (v: boolean) => void;
    
    setShowLightGizmo: (v: boolean) => void;
    setGizmoDragging: (v: boolean) => void;
    setDraggedLight: (index: number | null) => void;
    
    setInteractionMode: (mode: InteractionMode) => void;
    
    setCameraMode: (v: CameraMode) => void;
    setSceneOffset: (v: any) => void;
    setAnimations: (v: AnimationParams[]) => void; 
    setLiveModulations: (v: Partial<Record<LfoTarget, number>>) => void;
    setGraph: (g: FractalGraph) => void;
    setPipeline: (v: PipelineNode[]) => void;
    refreshPipeline: () => void;
    setAutoCompile: (v: boolean) => void;
    loadPreset: (p: Preset) => void;
    
    getPreset: (options?: { includeScene?: boolean }) => Preset; 
    getShareString: (options?: { includeAnimations?: boolean }) => string;
    loadShareString: (str: string) => boolean;
    
    setHistogramData: (d: Float32Array | null) => void;
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

    setActiveTab: (tab: PanelId) => void;
    floatTab: (tab: PanelId) => void;
    dockTab: (tab: PanelId) => void;

    resetCamera: () => void;
    // Updated signature to match HistorySliceActions and allow more flexible types
    handleInteractionStart: (mode?: 'camera' | 'param' | any) => void;
    handleInteractionEnd: () => void;
    undoCamera: () => void;
    redoCamera: () => void;
    undoParam: () => void;
    redoParam: () => void;
    resetParamHistory: () => void;

    openHelp: (topicId?: string) => void;
    closeHelp: () => void;
    openContextMenu: (x: number, y: number, items: ContextMenuItem[], targetHelpIds?: string[]) => void;
    closeContextMenu: () => void;
}
