// types.ts — Shared types for the mesh export pipeline
// GMT Fractal Explorer

import type { FractalDefinition } from '../../types/fractal';
import type { DCMeshResult } from '../algorithms/dc-core';

/** UI callback object — all pipeline UI interaction goes through this */
export interface PipelineCallbacks {
  setStatus: (msg: string) => void;
  setProgress: (pct: number) => void;
  setPhase: (name: string, pct: number) => void;
  log: (msg: string, type?: string) => void;
  memAlloc: (id: string, label: string, mb: number, color: string) => void;
  memFree: (id: string) => void;
  tick: () => Promise<void>;
  checkCancel: () => void;
  onSlicePreview?: (imageData: ImageData, width: number, height: number) => void;
  MEM_COLORS: Record<string, string>;
}

export interface MeshPipelineParams {
  N: number;
  iters: number;
  smoothPasses: number;
  useNewton: boolean;
  newtonSteps: number;
  smoothLambda: number;
  definition: FractalDefinition;
  formulaParams: Record<string, any>;
  power: number;
  deType: string;
  deSamples: number;
  zSubSlices: number;
  minFeatureSel: string;
  closingRadius: number;
  colorSamples: number;
  colorJitterMul: number;
  cavityFillMode: string;
  cavityFillLevel: number;
  gridMin: [number, number, number];
  gridMax: [number, number, number];
  boundsRange: number;
}

export interface MeshWithColors extends DCMeshResult {
  colors?: Uint8Array;
}

export interface PipelineTimings {
  total: number;
  sdf: number;
  coarse: number;
  fine: number;
  dc: number;
  newton: number;
  post: number;
  color: number;
}

export interface MeshPipelineResult {
  mesh: MeshWithColors | null;
  baseName: string;
  smoothingSkipped?: boolean;
  timings: PipelineTimings | null;
  useNarrowBand: boolean;
  gl: WebGL2RenderingContext | null;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}
