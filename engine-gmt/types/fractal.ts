import { FormulaType, CameraMode, PreciseVector3, CameraState } from './common';
import { LightParams } from './graphics';
import { AnimationParams, AnimationSequence } from './animation';
import { FractalGraph, PipelineNode } from './graph';
import type { CapabilitySet } from './capabilities';

export interface Preset {
  version?: number;
  name: string;
  formula: FormulaType;
  
  // --- CORE SYSTEMS ---
  /** Serialization-only. Absorbed into sceneOffset on load — NOT a runtime store field. */
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

  // Camera Manager — saved camera library
  savedCameras?: Array<CameraState & { id: string; label: string; optics?: any; thumbnail?: string }>;

  // --- GENERIC FEATURE STORAGE (Primary) ---
  // All module state lives here.
  features?: Record<string, any>;
}

export interface FractalParameter {
    label: string;
    id: 'paramA' | 'paramB' | 'paramC' | 'paramD' | 'paramE' | 'paramF' | 'vec2A' | 'vec2B' | 'vec2C' | 'vec3A' | 'vec3B' | 'vec3C' | 'vec4A' | 'vec4B' | 'vec4C';
    type?: 'float' | 'vec2' | 'vec3' | 'vec4';
    min: number;
    max: number;
    step: number;
    default: number | { x: number; y: number } | { x: number; y: number; z: number } | { x: number; y: number; z: number; w: number };
    scale?: 'linear' | 'log' | 'pi'; // Explicit UI scaling mode
    options?: { label: string; value: number }[];
    mode?: 'rotation' | 'direction' | 'axes' | 'toggle' | 'mixed'; // 'rotation' = Rodrigues (A/P/∠), 'direction' = azimuth/pitch, 'axes' = per-axis angles, 'toggle' = bool on/off, 'mixed' = toggle X + slider Y
    linkable?: boolean; // For vec3/vec2: enable axis linking (uniform scale)
}

export interface FractalDefinition {
    id: FormulaType;
    name: string;
    thumbnail?: string;
    shortDescription?: string;
    /** How Julia mode behaves in this formula. Used for UI labeling.
     * - 'julia': True Julia set (c is iteration constant)
     * - 'offset': c.xyz adds a constant translation (same as Shift)
     * - 'none': Formula doesn't use Julia/c at all
     */
    juliaType?: 'julia' | 'offset' | 'none';
    /** Optional tags for search/filter */
    tags?: string[];
    shader: {
        function: string;
        loopBody: string;
        loopInit?: string;
        getDist?: string;
        preamble?: string;           // Global code before functions (for pre-calculation)
        preambleVars?: string[];     // Names of mutable globals declared in preamble (for interlace renaming)
        /** @deprecated Since P8 of the capability protocol. Use the
         *  `iter:shared-rotation` token in `capabilities` instead. Retained
         *  only as an input to GMF backward-compat parsing and as runtime
         *  metadata read by some engine paths during the transition. */
        usesSharedRotation?: boolean;
        /** @deprecated Since P8 of the capability protocol. Use the
         *  `shape:self-contained` token in `capabilities` instead. Engine
         *  guards (SKIP_PRE_BAILOUT, no hybrid fold injection, no interlacing)
         *  continue to read this flag during the transition; will migrate
         *  to capability checks in a follow-up. */
        selfContainedSDE?: boolean;
        /** @deprecated Since P8 of the capability protocol. Use the
         *  `estimator:cutting-plane` token in `capabilities` instead. cp_*
         *  global emission is still gated on this flag at the engine boundary
         *  during the transition. */
        supportsCuttingPlane?: boolean;
        /** Capability tokens declared by this formula. Read by evaluateCompat()
         *  for feature gating. REQUIRED since P8 — FractalRegistry.register()
         *  throws if missing. The deriveLegacy shim is gone; native formulas
         *  declare via `new Set([...] satisfies Capability[])`, V3/V4 Workshop
         *  imports derive via fragmentarium_import/import-capabilities.ts at
         *  emit time, and GMF round-trip preserves the set via shaderMeta.
         *  @see dev/docs/gmt/35_Capability_Protocol.md */
        capabilities: CapabilitySet;
    };
    parameters: (FractalParameter | null)[];
    description?: string;
    defaultPreset: Partial<Preset>;
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