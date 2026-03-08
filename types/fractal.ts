import { FormulaType, CameraMode, PreciseVector3 } from './common';
import { LightParams } from './graphics';
import { AnimationParams, AnimationSequence } from './animation';
import { FractalGraph, PipelineNode } from './graph';

export interface Preset {
  version?: number;
  name: string;
  formula: FormulaType;
  
  // --- CORE SYSTEMS ---
  cameraPos?: { x: number, y: number, z: number };
  cameraRot?: { x: number, y: number, z: number, w: number }; 
  cameraFov?: number; // Kept for Scene restoration
  sceneOffset?: PreciseVector3;
  targetDistance?: number; 
  cameraMode?: CameraMode;
  
  // Arrays/Complex types not yet in DDFS
  lights?: LightParams[]; 
  animations?: AnimationParams[]; 
  
  // Modular System
  graph?: FractalGraph;
  pipeline?: PipelineNode[];
  
  // Animation System
  sequence?: AnimationSequence;
  duration?: number; 
  
  // Legacy root props used by RendererSlice/LightSlice logic
  renderMode?: 'Direct' | 'PathTracing';
  navigation?: { flySpeed: number, autoSlow: boolean };
  
  // Renderer settings (AA, etc) often stored here during preset save
  quality?: {
      aaMode?: any;
      aaLevel?: number;
      msaa?: number;
      accumulation?: boolean;
      [key: string]: any;
  };

  // --- GENERIC FEATURE STORAGE (Primary) ---
  // All module state lives here.
  features?: Record<string, any>; 
}

export interface FractalParameter {
    label: string;
    id: 'paramA' | 'paramB' | 'paramC' | 'paramD' | 'paramE' | 'paramF' | 'vec2A' | 'vec2B' | 'vec2C' | 'vec3A' | 'vec3B' | 'vec3C';
    type?: 'float' | 'vec2' | 'vec3';
    min: number;
    max: number;
    step: number;
    default: number | { x: number; y: number } | { x: number; y: number; z: number };
    scale?: 'linear' | 'log' | 'pi'; // Explicit UI scaling mode
    options?: { label: string; value: number }[];
    mode?: 'rotation'; // For vec3: use rotation mode (A/P/∠) instead of XYZ
    linkable?: boolean; // For vec3/vec2: enable axis linking (uniform scale)
}

export interface FractalDefinition {
    id: FormulaType;
    name: string;
    thumbnail?: string;
    shortDescription?: string;
    shader: {
        function: string;
        loopBody: string;
        loopInit?: string;
        getDist?: string;
        preamble?: string;  // Global code before functions (for pre-calculation)
    };
    parameters: (FractalParameter | null)[];
    description?: string;
    defaultPreset: Partial<Preset>;
    flags?: {
        coordinateMode?: 'Unified' | 'DataAware';
    };
    /** Present on runtime-imported formulas. Enables re-editing in the Workshop. */
    importSource?: {
        glsl: string;
        selectedFunction: string;
        loopMode: 'loop' | 'single';
        mappings: Array<{
            name: string;
            type: string;
            mappedSlot: string;
            fixedValue: string;
            uiMin: number;
            uiMax: number;
            uiStep: number;
            uiDefault: number | number[];
            isDegrees?: boolean;
        }>;
    };
}