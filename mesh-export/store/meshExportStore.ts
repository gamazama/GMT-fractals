// meshExportStore.ts — Zustand store for the mesh export page
// Completely independent from the main app's fractalStore

import { create } from 'zustand';
import type { FractalDefinition } from '../../types/fractal';
import type { MeshWithColors, PipelineTimings } from '../pipeline/types';

// ============================================================================
// Types
// ============================================================================

export interface LogEntry {
  time: string;
  msg: string;
  type: string;
}

export interface MemoryBlock {
  id: string;
  label: string;
  mb: number;
  color: string;
  freed: boolean;
}

export interface MeshExportState {
  // Formula
  selectedFormulaId: string;
  loadedDefinition: FractalDefinition | null;
  formulaParams: Record<string, any>;

  // Pipeline config
  resolution: number;
  iters: number;
  deType: string;
  deSamples: number;
  zSubSlices: number;
  minFeature: string;
  cavityFill: string;
  closingRadius: number;
  newton: boolean;
  newtonSteps: number;
  smoothPasses: number;
  smoothLambda: number;
  colorSamples: number;
  colorJitter: number;
  exportFormat: string;

  // Bounding box
  bboxCenter: [number, number, number];
  bboxSize: [number, number, number];
  bboxLock: boolean;

  // Runtime state
  isRunning: boolean;
  isCancelled: boolean;
  progress: number;
  phaseProgress: number;
  phaseName: string;
  status: string;
  logEntries: LogEntry[];
  memoryBlocks: MemoryBlock[];

  // Result
  lastMesh: MeshWithColors | null;
  lastBaseName: string;
  lastBlob: Blob | null;
  lastFilename: string;
  lastTimings: PipelineTimings | null;
  smoothingSkipped: boolean;
  useNarrowBand: boolean;
  gl: WebGL2RenderingContext | null;
}

// ============================================================================
// Slice preview callback registry (outside Zustand to avoid re-renders)
// ============================================================================

let _slicePreviewCallback: ((imageData: ImageData, w: number, h: number) => void) | null = null;

/** Register a callback to receive slice preview updates (called by PreviewCanvas) */
export function registerSlicePreview(cb: (imageData: ImageData, w: number, h: number) => void): void {
  _slicePreviewCallback = cb;
}

/** Unregister the slice preview callback */
export function unregisterSlicePreview(): void {
  _slicePreviewCallback = null;
}

/** Send a slice preview update (called by pipeline callbacks) */
export function emitSlicePreview(imageData: ImageData, w: number, h: number): void {
  _slicePreviewCallback?.(imageData, w, h);
}

export interface MeshExportActions {
  // Formula
  setSelectedFormula: (id: string) => void;
  setLoadedDefinition: (def: FractalDefinition | null) => void;
  setFormulaParams: (params: Record<string, any>) => void;
  updateParam: (key: string, value: any) => void;

  // Pipeline config
  setResolution: (n: number) => void;
  setIters: (n: number) => void;
  setDeType: (t: string) => void;
  setDeSamples: (n: number) => void;
  setZSubSlices: (n: number) => void;
  setMinFeature: (v: string) => void;
  setCavityFill: (v: string) => void;
  setClosingRadius: (n: number) => void;
  setNewton: (on: boolean) => void;
  setNewtonSteps: (n: number) => void;
  setSmoothPasses: (n: number) => void;
  setSmoothLambda: (n: number) => void;
  setColorSamples: (n: number) => void;
  setColorJitter: (n: number) => void;
  setExportFormat: (f: string) => void;

  // Bounding box
  setBboxCenter: (c: [number, number, number]) => void;
  setBboxSize: (s: [number, number, number]) => void;
  setBboxLock: (locked: boolean) => void;
  resetBounds: () => void;

  // Runtime
  setRunning: (running: boolean) => void;
  setCancelled: (cancelled: boolean) => void;
  setProgress: (pct: number) => void;
  setPhase: (name: string, pct: number) => void;
  setStatus: (msg: string) => void;
  addLog: (msg: string, type?: string) => void;
  clearLog: () => void;
  memAlloc: (id: string, label: string, mb: number, color: string) => void;
  memFree: (id: string) => void;
  clearMemory: () => void;

  // Result
  setMesh: (mesh: MeshWithColors | null, baseName: string) => void;
  setTimings: (timings: PipelineTimings | null, smoothingSkipped: boolean, useNarrowBand: boolean) => void;
  setExportBlob: (blob: Blob | null, filename: string) => void;
  setGL: (gl: WebGL2RenderingContext | null) => void;
}

// ============================================================================
// Default state
// ============================================================================

const DEFAULT_BBOX_SIZE: [number, number, number] = [3, 3, 3];
const DEFAULT_BBOX_CENTER: [number, number, number] = [0, 0, 0];

// ============================================================================
// Store
// ============================================================================

function timeStr(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export const useMeshExportStore = create<MeshExportState & MeshExportActions>()((set, get) => ({
  // Formula
  selectedFormulaId: 'Mandelbulb',
  loadedDefinition: null,
  formulaParams: {},

  // Pipeline config
  resolution: 512,
  iters: 12,
  deType: 'auto',
  deSamples: 2,
  zSubSlices: 4,
  minFeature: 'auto',
  cavityFill: '2',
  closingRadius: 0,
  newton: true,
  newtonSteps: 6,
  smoothPasses: 3,
  smoothLambda: 0.5,
  colorSamples: 8,
  colorJitter: 0.5,
  exportFormat: 'glb',

  // Bounding box
  bboxCenter: DEFAULT_BBOX_CENTER,
  bboxSize: DEFAULT_BBOX_SIZE,
  bboxLock: true,

  // Runtime
  isRunning: false,
  isCancelled: false,
  progress: 0,
  phaseProgress: 0,
  phaseName: '',
  status: '',
  logEntries: [],
  memoryBlocks: [],

  // Result
  lastMesh: null,
  lastBaseName: '',
  lastBlob: null,
  lastFilename: '',
  lastTimings: null,
  smoothingSkipped: false,
  useNarrowBand: false,
  gl: null,

  // === Actions ===

  // Formula
  setSelectedFormula: (id) => set({ selectedFormulaId: id }),
  setLoadedDefinition: (def) => set({ loadedDefinition: def }),
  setFormulaParams: (params) => set({ formulaParams: params }),
  updateParam: (key, value) => set((s) => ({
    formulaParams: { ...s.formulaParams, [key]: value },
  })),

  // Pipeline config
  setResolution: (n) => set({ resolution: n }),
  setIters: (n) => set({ iters: n }),
  setDeType: (t) => set({ deType: t }),
  setDeSamples: (n) => set({ deSamples: n }),
  setZSubSlices: (n) => set({ zSubSlices: n }),
  setMinFeature: (v) => set({ minFeature: v }),
  setCavityFill: (v) => set({ cavityFill: v }),
  setClosingRadius: (n) => set({ closingRadius: n }),
  setNewton: (on) => set({ newton: on }),
  setNewtonSteps: (n) => set({ newtonSteps: n }),
  setSmoothPasses: (n) => set({ smoothPasses: n }),
  setSmoothLambda: (n) => set({ smoothLambda: n }),
  setColorSamples: (n) => set({ colorSamples: n }),
  setColorJitter: (n) => set({ colorJitter: n }),
  setExportFormat: (f) => set({ exportFormat: f }),

  // Bounding box
  setBboxCenter: (c) => set({ bboxCenter: c }),
  setBboxSize: (s) => set({ bboxSize: s }),
  setBboxLock: (locked) => set({ bboxLock: locked }),
  resetBounds: () => set({ bboxCenter: [...DEFAULT_BBOX_CENTER] as [number, number, number], bboxSize: [...DEFAULT_BBOX_SIZE] as [number, number, number] }),

  // Runtime
  setRunning: (running) => set({ isRunning: running }),
  setCancelled: (cancelled) => set({ isCancelled: cancelled }),
  setProgress: (pct) => set({ progress: pct }),
  setPhase: (name, pct) => set({ phaseName: name, phaseProgress: pct }),
  setStatus: (msg) => set({ status: msg }),
  addLog: (msg, type = 'info') => set((s) => ({
    logEntries: [...s.logEntries, { time: timeStr(), msg, type }],
  })),
  clearLog: () => set({ logEntries: [] }),
  memAlloc: (id, label, mb, color) => set((s) => {
    const existing = s.memoryBlocks.findIndex((b) => b.id === id);
    const blocks = [...s.memoryBlocks];
    if (existing >= 0) {
      blocks[existing] = { id, label, mb, color, freed: false };
    } else {
      blocks.push({ id, label, mb, color, freed: false });
    }
    return { memoryBlocks: blocks };
  }),
  memFree: (id) => set((s) => ({
    memoryBlocks: s.memoryBlocks.map((b) => b.id === id ? { ...b, freed: true } : b),
  })),
  clearMemory: () => set({ memoryBlocks: [] }),

  // Result
  setMesh: (mesh, baseName) => set({ lastMesh: mesh, lastBaseName: baseName }),
  setTimings: (timings, smoothingSkipped, useNarrowBand) => set({ lastTimings: timings, smoothingSkipped, useNarrowBand }),
  setExportBlob: (blob, filename) => set({ lastBlob: blob, lastFilename: filename }),
  setGL: (gl) => set({ gl }),
}));
