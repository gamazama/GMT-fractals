/**
 * generatorStore — the Generator's NON-DDFS state: source slot selection, the
 * channel-curve Track[] + curve-fit controls, the noise seed, and the chosen
 * export format. The scalar/bool DIALS live in the `paletteGenerator` DDFS
 * feature slice (so they render natively + ride undo/preset/animation); this
 * store holds only what scalar params can't (catalog refs, Track[]).
 *
 * `useGeneratorDerived()` reads BOTH sources (DDFS slice via useEngineStore +
 * this store) and runs the pure pipeline once, so the panel (export) and the
 * canvas (preview + curve editor) compute the same result.
 */

import { create } from 'zustand';
import { useMemo } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { renderStopsToRamp } from '../core/gmtGradient';
import { fitRampToStops } from '../core/stopFit';
import type { RGB } from '../core/oklab';
import type { GradientConfig } from '../../types';
import {
  decomposeRamp,
  buildGradientRamp,
  unwrapHue,
  smoothChannel,
  DEFAULT_GENERATOR_PARAMS,
  type GeneratorParams,
  type SlotModifiers,
  type Channels,
} from '../core/generatorPipeline';
import { rampToBezierTrack, trackToRamp } from '../core/channelCurve';
import { buildPresetCatalog, registerCustomRamp } from '../core/presetCatalog';
import { bufferToRamp } from '../core/stopFit';
import { GENERATOR_PARAM_DEFAULTS } from '../features/paletteGenerator';
import type { ChannelTracks } from '../components/ChannelGraphEditor';

/** Shape of the paletteGenerator DDFS slice (the dials). */
interface GeneratorSlice {
  aHueRotate: number; aChroma: number; aContrast: number; aReverse: boolean; aRepeats: number; aPhase: number; aMirror: boolean;
  bHueRotate: number; bChroma: number; bContrast: number; bReverse: boolean; bRepeats: number; bPhase: number; bMirror: boolean;
  mixL: number; mixC: number; mixH: number;
  hueRotate: number; chroma: number; contrast: number;
  bands: number; repeats: number; phase: number; mirror: boolean; reverse: boolean;
  noise: number; noiseFreq: number; noiseL: boolean; noiseC: boolean; noiseH: boolean;
}

const readSlice = (): GeneratorSlice => (useEngineStore.getState() as any).paletteGenerator as GeneratorSlice;
const setSlice = (patch: Partial<GeneratorSlice>) => {
  const set = (useEngineStore.getState() as any).setPaletteGenerator as ((p: Record<string, unknown>) => void) | undefined;
  set?.(patch);
};

const sliceToModsA = (s: GeneratorSlice): SlotModifiers => ({ hueRotate: s.aHueRotate, chroma: s.aChroma, contrast: s.aContrast, reverse: s.aReverse, repeats: s.aRepeats, phase: s.aPhase, mirror: s.aMirror });
const sliceToModsB = (s: GeneratorSlice): SlotModifiers => ({ hueRotate: s.bHueRotate, chroma: s.bChroma, contrast: s.bContrast, reverse: s.bReverse, repeats: s.bRepeats, phase: s.bPhase, mirror: s.bMirror });
const sliceToParams = (s: GeneratorSlice): GeneratorParams => ({
  mixL: s.mixL, mixC: s.mixC, mixH: s.mixH,
  reverse: s.reverse, bands: s.bands, repeats: s.repeats, phase: s.phase, mirror: s.mirror,
  hueRotate: s.hueRotate, chroma: s.chroma, contrast: s.contrast,
  noise: s.noise, noiseFreq: s.noiseFreq, noiseL: s.noiseL, noiseC: s.noiseC, noiseH: s.noiseH,
});

interface GeneratorState {
  slotA: number;
  slotB: number;
  tracks: ChannelTracks | null;
  curvesOn: boolean;
  detail: number;
  smooth: number;
  noiseSeed: number;
  exportFmt: string;

  setSlot: (which: 'A' | 'B', idx: number) => void;
  /** Register an arbitrary 256-RGB ramp as a custom source and load it into a slot
   *  (the img2grad → generator merge). Returns the catalog index used. */
  sendRampToSlot: (which: 'A' | 'B', ramp: RGB[], name: string) => number;
  setTracks: (tracks: ChannelTracks | null) => void;
  setCurvesOn: (on: boolean) => void;
  setDetail: (v: number) => void;
  setSmooth: (v: number) => void;
  reseedNoise: () => void;
  setExportFmt: (k: string) => void;
  swap: () => void;
  fitFromSource: () => void;
  resetCurves: () => void;
  resetAll: () => void;
}

const presetRamp = (idx: number): RGB[] => {
  const cat = buildPresetCatalog();
  const e = cat[Math.max(0, Math.min(cat.length - 1, idx))];
  // Preset entries carry stops (render exactly); ad-hoc custom-RGB entries carry
  // only a baked 256-texel ramp (img2grad / generator sends) — use it directly.
  if (e.stops && e.stops.length) return renderStopsToRamp(e.stops, 'oklab', 'srgb');
  return bufferToRamp(e.ramp);
};

/** Pure derive of the post-mix base channels (for "fit from source"). */
const baseChannelsFrom = (slotA: number, slotB: number, seed: number): Channels => {
  const s = readSlice();
  const srcA = decomposeRamp(presetRamp(slotA));
  const srcB = decomposeRamp(presetRamp(slotB));
  return buildGradientRamp(srcA, srcB, sliceToModsA(s), sliceToModsB(s), sliceToParams(s), null, seed).base;
};

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  slotA: 4, // Turbo
  slotB: 5, // Inferno
  tracks: null,
  curvesOn: false,
  detail: 8,
  smooth: 5,
  noiseSeed: 1,
  exportFmt: 'map',

  setSlot: (which, idx) => set(which === 'A' ? { slotA: idx } : { slotB: idx }),
  sendRampToSlot: (which, ramp, name) => {
    const idx = registerCustomRamp(ramp, name);
    set(which === 'A' ? { slotA: idx } : { slotB: idx });
    return idx;
  },
  setTracks: (tracks) => set({ tracks }),
  setCurvesOn: (on) => set((s) => ({ curvesOn: on && !!s.tracks })),
  setDetail: (v) => set({ detail: v }),
  setSmooth: (v) => set({ smooth: v }),
  reseedNoise: () => set((s) => ({ noiseSeed: s.noiseSeed + 1 })),
  setExportFmt: (k) => set({ exportFmt: k }),
  swap: () => set((s) => ({ slotA: s.slotB, slotB: s.slotA })),

  fitFromSource: () => {
    const s = get();
    const k = (11 - s.detail) / 3;
    const base = baseChannelsFrom(s.slotA, s.slotB, s.noiseSeed);
    set({
      tracks: {
        L: rampToBezierTrack(smoothChannel(base.L, s.smooth), 'L', 'Lightness', { eps: 0.01 * k }),
        C: rampToBezierTrack(smoothChannel(base.C, s.smooth), 'C', 'Chroma', { eps: 0.01 * k }),
        h: rampToBezierTrack(smoothChannel(unwrapHue(base.h), s.smooth), 'h', 'Hue', { eps: 0.06 * k }),
      },
      curvesOn: true,
    });
  },
  resetCurves: () => set({ tracks: null, curvesOn: false }),
  resetAll: () => {
    setSlice({ ...GENERATOR_PARAM_DEFAULTS } as Partial<GeneratorSlice>);
    set({ tracks: null, curvesOn: false });
  },
}));

export interface GeneratorDerived {
  stripA: RGB[];
  stripB: RGB[];
  ramp: RGB[];
  base: Channels;
  config: GradientConfig;
}

/** Run the pipeline over the current DDFS slice + store state (memoized). */
export const useGeneratorDerived = (): GeneratorDerived => {
  const sliceRaw = useEngineStore((s) => (s as any).paletteGenerator) as GeneratorSlice | undefined;
  // Defensive: the slice is populated with param defaults at store build, but
  // fall back if a render slips in before that.
  const slice = sliceRaw ?? (GENERATOR_PARAM_DEFAULTS as unknown as GeneratorSlice);
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  const curvesOn = useGeneratorStore((s) => s.curvesOn);
  const tracks = useGeneratorStore((s) => s.tracks);
  const detail = useGeneratorStore((s) => s.detail);
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);

  const modsA = useMemo(() => sliceToModsA(slice), [slice]);
  const modsB = useMemo(() => sliceToModsB(slice), [slice]);
  const params = useMemo(() => sliceToParams(slice), [slice]);

  const rampA = useMemo(() => presetRamp(slotA), [slotA]);
  const rampB = useMemo(() => presetRamp(slotB), [slotB]);
  const srcA = useMemo(() => decomposeRamp(rampA), [rampA]);
  const srcB = useMemo(() => decomposeRamp(rampB), [rampB]);

  // Source previews show each slot with only its per-slot mods (no global chain).
  const stripA = useMemo(() => buildGradientRamp(srcA, srcA, modsA, modsA, DEFAULT_GENERATOR_PARAMS, null, 1).ramp, [srcA, modsA]);
  const stripB = useMemo(() => buildGradientRamp(srcB, srcB, modsB, modsB, DEFAULT_GENERATOR_PARAMS, null, 1).ramp, [srcB, modsB]);

  const sampledCurves = useMemo(() => {
    if (!curvesOn || !tracks) return null;
    return { L: trackToRamp(tracks.L), C: trackToRamp(tracks.C), h: trackToRamp(tracks.h) };
  }, [curvesOn, tracks]);

  const built = useMemo(
    () => buildGradientRamp(srcA, srcB, modsA, modsB, params, sampledCurves, noiseSeed),
    [srcA, srcB, modsA, modsB, params, sampledCurves, noiseSeed],
  );

  const config = useMemo(() => {
    const k = (11 - detail) / 3;
    return fitRampToStops(built.ramp, { targetDE: Math.max(0.004, 0.012 * k) });
  }, [built.ramp, detail]);

  return { stripA, stripB, ramp: built.ramp, base: built.base, config };
};

/** Catalog accessor for the source picker (memoised in presetCatalog). */
export { buildPresetCatalog };

/**
 * Bind a single paletteGenerator DDFS slice param for a control rendered OUTSIDE
 * AutoFeaturePanel (e.g. the per-slot mods on the canvas, the inline noise
 * toggles). The param stays a real DDFS param (rides undo/preset) — this just
 * reads/writes it. Returns [value, setValue].
 */
export const useGenParam = <T,>(param: string): [T, (v: T) => void] => {
  const value = useEngineStore((s) => (s as any).paletteGenerator?.[param]) as T;
  const setValue = (v: T) => {
    const set = (useEngineStore.getState() as any).setPaletteGenerator as ((p: Record<string, unknown>) => void) | undefined;
    set?.({ [param]: v });
  };
  return [value, setValue];
};
