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
  applySlotMods,
  unwrapHue,
  smoothChannel,
  DEFAULT_GENERATOR_PARAMS,
  type GeneratorParams,
  type SlotModifiers,
  type Channels,
  type BuildResult,
} from '../core/generatorPipeline';
import { rampToBezierTrack, trackToRamp } from '../core/channelCurve';
import { buildPresetCatalog, registerCustomRamp, registerCustomChannels } from '../core/presetCatalog';
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

// --- Undo bracketing -------------------------------------------------------------
// Generator edits ride the engine's PARAM undo stack: the DDFS slice (mix/slot/global
// mods) is in the param snapshot already, and the non-DDFS state (slots, curve Track[],
// curvesOn, detail/smooth, seed) is captured via a history PROVIDER (registered in
// registerPaletteUI). Discrete actions self-bracket with genEdit(); continuous edits
// (curve drags, canvas sliders, the live re-fit) bracket at the UI via genEditStart/End.
const eng = () =>
  useEngineStore.getState() as unknown as { beginParamTransaction?: () => void; endParamTransaction?: () => void };
export const genEditStart = (): void => eng().beginParamTransaction?.();
export const genEditEnd = (): void => eng().endParamTransaction?.();
export const genEdit = (fn: () => void): void => {
  genEditStart();
  fn();
  genEditEnd();
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
  /** Bake a slot's modifiers into a new source ramp + reset that slot's dials (picture unchanged). */
  bakeSlot: (which: 'A' | 'B') => void;
  /** Reset a slot's modifier dials to neutral. */
  resetSlot: (which: 'A' | 'B') => void;
  /** Bake the global Modify chain into the channel curves + reset the global dials. */
  bakeMainToCurve: () => void;
  /** Reset the global Modify + noise dials to neutral. */
  resetMainMods: () => void;
}

const SLOT_DEFAULTS = (which: 'A' | 'B'): Partial<GeneratorSlice> => {
  const p = which.toLowerCase();
  return {
    [`${p}HueRotate`]: 0, [`${p}Chroma`]: 1, [`${p}Contrast`]: 1,
    [`${p}Reverse`]: false, [`${p}Repeats`]: 1, [`${p}Phase`]: 0, [`${p}Mirror`]: false,
  } as Partial<GeneratorSlice>;
};
const MAIN_DEFAULTS: Partial<GeneratorSlice> = {
  hueRotate: 0, chroma: 1, contrast: 1, bands: 0, repeats: 1, phase: 0, mirror: false, reverse: false, noise: 0,
};

const presetRamp = (idx: number): RGB[] => {
  const cat = buildPresetCatalog();
  const e = cat[Math.max(0, Math.min(cat.length - 1, idx))];
  // Preset entries carry stops (render exactly); ad-hoc custom-RGB entries carry
  // only a baked 256-texel ramp (img2grad / generator sends) — use it directly.
  if (e.stops && e.stops.length) return renderStopsToRamp(e.stops, 'oklab', 'srgb');
  return bufferToRamp(e.ramp);
};

/** A slot's source channels: un-clipped `channels` when a baked source carries them
 *  (preserves extremes), else decompose the slot's RGB ramp. */
const slotChannels = (idx: number): Channels => {
  const cat = buildPresetCatalog();
  const e = cat[Math.max(0, Math.min(cat.length - 1, idx))];
  if (e.channels) return { L: e.channels.L.slice(), C: e.channels.C.slice(), h: e.channels.h.slice() };
  return decomposeRamp(presetRamp(idx));
};

/** Pure derive of the post-mix base channels (for "fit from source"). */
const baseChannelsFrom = (slotA: number, slotB: number, seed: number): Channels => {
  const s = readSlice();
  return buildGradientRamp(slotChannels(slotA), slotChannels(slotB), sliceToModsA(s), sliceToModsB(s), sliceToParams(s), null, seed).base;
};

const sampleCurves = (tracks: ChannelTracks | null, on: boolean) =>
  on && tracks ? { L: trackToRamp(tracks.L), C: trackToRamp(tracks.C), h: trackToRamp(tracks.h) } : null;

/** Run the full pipeline (slot mods + mix + curves + global chain + noise). */
const fullResult = (slotA: number, slotB: number, curves: ReturnType<typeof sampleCurves>, seed: number): BuildResult => {
  const s = readSlice();
  return buildGradientRamp(slotChannels(slotA), slotChannels(slotB), sliceToModsA(s), sliceToModsB(s), sliceToParams(s), curves, seed);
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

  // Discrete actions self-bracket so each is one undo entry. setTracks / setDetail /
  // setSmooth are CONTINUOUS (curve drag / slider drag) — the UI brackets those.
  setSlot: (which, idx) => genEdit(() => set(which === 'A' ? { slotA: idx } : { slotB: idx })),
  sendRampToSlot: (which, ramp, name) => {
    const idx = registerCustomRamp(ramp, name);
    genEdit(() => set(which === 'A' ? { slotA: idx } : { slotB: idx }));
    return idx;
  },
  setTracks: (tracks) => set({ tracks }),
  setCurvesOn: (on) => genEdit(() => set((s) => ({ curvesOn: on && !!s.tracks }))),
  setDetail: (v) => set({ detail: v }),
  setSmooth: (v) => set({ smooth: v }),
  reseedNoise: () => genEdit(() => set((s) => ({ noiseSeed: s.noiseSeed + 1 }))),
  setExportFmt: (k) => set({ exportFmt: k }), // a UI pref, not undoable
  swap: () => genEdit(() => set((s) => ({ slotA: s.slotB, slotB: s.slotA }))),

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
  resetCurves: () => genEdit(() => set({ tracks: null, curvesOn: false })),
  resetAll: () =>
    genEdit(() => {
      setSlice({ ...GENERATOR_PARAM_DEFAULTS } as Partial<GeneratorSlice>);
      set({ tracks: null, curvesOn: false });
    }),

  bakeSlot: (which) =>
    genEdit(() => {
      const s = readSlice();
      const g = get();
      const idx = which === 'A' ? g.slotA : g.slotB;
      const mods = which === 'A' ? sliceToModsA(s) : sliceToModsB(s);
      // Fold the slot's modifiers into the source IN CHANNEL SPACE (no RGB round-trip),
      // so out-of-gamut / extreme bakes stay faithful; the swatch is clamped for display.
      const baked = applySlotMods(slotChannels(idx), mods);
      const newIdx = registerCustomChannels(baked, `Baked ${which}`);
      setSlice(SLOT_DEFAULTS(which));
      set(which === 'A' ? { slotA: newIdx } : { slotB: newIdx });
    }),
  resetSlot: (which) => genEdit(() => setSlice(SLOT_DEFAULTS(which))),

  bakeMainToCurve: () =>
    genEdit(() => {
      const g = get();
      // Fit the curves from the UN-CLIPPED post-global channels (not the gamut-clipped RGB
      // ramp), so the baked transform stays faithful even at extreme values; with the global
      // dials then reset the curve override reproduces the same result. detail sets eps.
      const ch = fullResult(g.slotA, g.slotB, sampleCurves(g.tracks, g.curvesOn), g.noiseSeed).final;
      const k = (11 - g.detail) / 3;
      set({
        tracks: {
          L: rampToBezierTrack(ch.L, 'L', 'Lightness', { eps: 0.01 * k }),
          C: rampToBezierTrack(ch.C, 'C', 'Chroma', { eps: 0.01 * k }),
          h: rampToBezierTrack(unwrapHue(ch.h), 'h', 'Hue', { eps: 0.06 * k }),
        },
        curvesOn: true,
      });
      setSlice(MAIN_DEFAULTS);
    }),
  resetMainMods: () => genEdit(() => setSlice(MAIN_DEFAULTS)),
}));

/**
 * History provider snapshot/restore for the generator's NON-DDFS state (the DDFS slice
 * is captured by the engine snapshot already). Registered in registerPaletteUI so the
 * param undo stack restores curves + slot selection + curve-fit dials. Tracks are plain
 * JSON (Keyframe[] objects) so the snapshot's structuredClone-via-JSON is lossless.
 */
export const captureGeneratorHistory = () => {
  const s = useGeneratorStore.getState();
  return { slotA: s.slotA, slotB: s.slotB, tracks: s.tracks, curvesOn: s.curvesOn, detail: s.detail, smooth: s.smooth, noiseSeed: s.noiseSeed };
};
export const restoreGeneratorHistory = (snap: unknown): void => {
  useGeneratorStore.setState({ ...(snap as Partial<ReturnType<typeof captureGeneratorHistory>>) });
};

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

  // Source channels — un-clipped when a baked slot carries them (else decomposed).
  const srcA = useMemo(() => slotChannels(slotA), [slotA]);
  const srcB = useMemo(() => slotChannels(slotB), [slotB]);

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
    // maxStops scales with the detail dial. The default cap (32) truncated rich
    // generated gradients (e.g. posterized / many-hue / noisy) so a favourited result
    // lost detail vs the live 256-step preview — let detail buy the fidelity it asks for.
    return fitRampToStops(built.ramp, { targetDE: Math.max(0.004, 0.012 * k), maxStops: Math.round(32 + detail * 12) });
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
