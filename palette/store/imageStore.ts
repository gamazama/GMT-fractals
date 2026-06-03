/**
 * imageStore — the Image mode's NON-DDFS state: the ingested ImageModel (heavy
 * Float32 buffers + bins), the Trace path, a loading flag, and the export format.
 * The scalar/bool DIALS (mode, colours, saliency, golden-hour, per-mode params,
 * reverse) live in the `paletteImage` DDFS feature slice so they render natively +
 * ride undo/preset/animation — mirroring the Generator's split.
 *
 * `useImageDerived()` reads BOTH sources (DDFS slice via useEngineStore + this store)
 * and runs the pure img2grad pipeline once, so the canvas (result + cloud + pane) and
 * the dock extras (export + send-to-generator) compute the same ramp.
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { extract, IMG2GRAD_MODES, type Img2GradParams, type Img2GradResult } from '../core/img2grad';
import type { ImageModel, TracePath } from '../core/img2grad/common';

const DEFAULT_PATH: TracePath = { x0: 0.12, y0: 0.5, x1: 0.88, y1: 0.5 };

/** Shape of the paletteImage DDFS slice (the dials). */
interface ImageSlice {
  mode: number; // index into IMG2GRAD_MODES
  colours: number;
  saliency: number;
  goldenHour: number;
  spacing: number;
  reverse: boolean;
  tonalDetail: number;
  chromaBoost: number;
  bandWidth: number;
  smoothing: number;
  catmullRom: boolean;
}

export const IMAGE_PARAM_DEFAULTS: ImageSlice = {
  mode: 0,
  colours: 8,
  saliency: 0.45,
  goldenHour: 0,
  spacing: 0.35,
  reverse: false,
  tonalDetail: 48,
  chromaBoost: 1,
  bandWidth: 8,
  smoothing: 3,
  catmullRom: false,
};

const sliceToParams = (s: ImageSlice): Img2GradParams => ({
  mode: IMG2GRAD_MODES[s.mode] ?? 'distill',
  colours: s.colours,
  saliency: s.saliency,
  goldenHour: s.goldenHour,
  spacing: s.spacing,
  reverse: s.reverse,
  tonalDetail: s.tonalDetail,
  chromaBoost: s.chromaBoost,
  bandWidth: s.bandWidth,
  smoothing: s.smoothing,
  catmullRom: s.catmullRom,
});

interface ImageState {
  model: ImageModel | null;
  path: TracePath;
  loading: boolean;
  exportFmt: string;
  /** Display thumbnail of the source (set alongside the model). */
  thumb: HTMLCanvasElement | null;

  setModel: (model: ImageModel, thumb: HTMLCanvasElement | null) => void;
  setPath: (path: TracePath) => void;
  setLoading: (loading: boolean) => void;
  setExportFmt: (k: string) => void;
  reset: () => void;
}

export const useImageStore = create<ImageState>((set) => ({
  model: null,
  path: DEFAULT_PATH,
  loading: false,
  exportFmt: 'map',
  thumb: null,

  setModel: (model, thumb) => set({ model, thumb, loading: false }),
  setPath: (path) => set({ path }),
  setLoading: (loading) => set({ loading }),
  setExportFmt: (k) => set({ exportFmt: k }),
  reset: () => set({ model: null, thumb: null, path: DEFAULT_PATH, loading: false }),
}));

/** Read the paletteImage DDFS slice (with defaults fallback). */
export const useImageSlice = (): ImageSlice => {
  const raw = useEngineStore((s) => (s as Record<string, any>).paletteImage) as ImageSlice | undefined;
  return raw ?? IMAGE_PARAM_DEFAULTS;
};

/** Current resolved mode string (for the canvas mode tabs + trace gating). */
export const useImageMode = () => {
  const slice = useImageSlice();
  return IMG2GRAD_MODES[slice.mode] ?? 'distill';
};

/** Run the img2grad pipeline over the current model + slice + path (memoised). */
export const useImageDerived = (): Img2GradResult | null => {
  const slice = useImageSlice();
  const model = useImageStore((s) => s.model);
  const path = useImageStore((s) => s.path);
  const params = useMemo(() => sliceToParams(slice), [slice]);
  return useMemo(() => {
    if (!model) return null;
    return extract(model, path, params);
  }, [model, path, params]);
};

/** Bind a single paletteImage DDFS slice param (read/write), for canvas controls
 *  rendered outside AutoFeaturePanel (e.g. the mode tabs). */
export const useImageParam = <T,>(param: keyof ImageSlice): [T, (v: T) => void] => {
  const value = useEngineStore((s) => (s as Record<string, any>).paletteImage?.[param]) as T;
  const setValue = (v: T) => {
    const set = (useEngineStore.getState() as Record<string, any>).setPaletteImage as
      | ((p: Record<string, unknown>) => void)
      | undefined;
    set?.({ [param]: v });
  };
  return [value, setValue];
};
