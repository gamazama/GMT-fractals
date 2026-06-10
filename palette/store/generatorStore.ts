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
import { makeDefaultEditorConfig } from '../core/editorConfig';
import type { RGB } from '../core/oklab';
import type { GradientConfig } from '../../types';
import {
  decomposeRamp,
  buildGradientRamp,
  buildColorBoxRamp,
  applySlotMods,
  unwrapHue,
  smoothChannel,
  DEFAULT_GENERATOR_PARAMS,
  DEFAULT_COLORBOX_PARAMS,
  type GeneratorParams,
  type SlotModifiers,
  type ColorBoxParams,
  type Channels,
  type BuildResult,
} from '../core/generatorPipeline';
import { EASING_NAMES, type EasingName } from '../core/easings';
import { fitColorBoxToRamp } from '../core/colorBoxFit';
import { showToast } from '../../engine/store/toastStore';
import { rampToBezierTrack, trackToRamp } from '../core/channelCurve';
import { buildPresetCatalog, registerCustomRamp, registerCustomChannels } from '../core/presetCatalog';
import { bufferToRamp } from '../core/stopFit';
import { GENERATOR_PARAM_DEFAULTS } from '../features/paletteGenerator';
import type { ChannelTracks } from '../components/ChannelGraphEditor';
import { paramEditStart, paramEditEnd, paramEdit } from './paramUndoBracket';

/** Shape of the paletteGenerator DDFS slice (the dials). */
interface GeneratorSlice {
  /** 0 = mixer (two-source blend), 1 = colorbox (per-channel OKLCh sweep),
   *  2 = stops (hand-authored stop editor). The persisted int id is STABLE —
   *  never renumber (scene/preset compat); only the user-facing label is "Mixer". */
  generatorMode: number;
  aHueRotate: number; aChroma: number; aContrast: number; aReverse: boolean; aRepeats: number; aPhase: number; aMirror: boolean;
  bHueRotate: number; bChroma: number; bContrast: number; bReverse: boolean; bRepeats: number; bPhase: number; bMirror: boolean;
  mixL: number; mixC: number; mixH: number;
  hueRotate: number; chroma: number; contrast: number;
  bands: number; repeats: number; phase: number; mirror: boolean; reverse: boolean;
  noise: number; noiseFreq: number; noiseL: boolean; noiseC: boolean; noiseH: boolean;
  // ColorBox per-channel sweeps (start/end scalars + easing index into EASING_NAMES).
  cbLStart: number; cbLEnd: number; cbLEasing: number;
  cbCStart: number; cbCEnd: number; cbCEasing: number;
  cbHStart: number; cbHEnd: number; cbHEasing: number;
}

/** Three generator modes; the build call-site branches on the slice's generatorMode.
 *  The literal is 'mixer' (was 'mixed') to match the user-facing label — the persisted
 *  int id (0) is unchanged, so this is a code-clarity rename only, no scene migration. */
export type GeneratorMode = 'mixer' | 'colorbox' | 'stops';
export const generatorModeOf = (s: GeneratorSlice): GeneratorMode => {
  const m = s.generatorMode ?? 0;
  return m === 2 ? 'stops' : m === 1 ? 'colorbox' : 'mixer';
};

/** Map a stored easing index → EasingName (clamped; defaults to linear on garbage). */
const easingFromIndex = (i: number): EasingName => EASING_NAMES[i] ?? EASING_NAMES[0];
/** Inverse: EasingName → its stored index (0/linear if not found). */
const easingToIndex = (name: EasingName): number => {
  const i = EASING_NAMES.indexOf(name);
  return i < 0 ? 0 : i;
};

/** Flatten ColorBoxParams back onto the DDFS slice fields (inverse of sliceToColorBox). */
const colorBoxToSlice = (p: ColorBoxParams): Partial<GeneratorSlice> => ({
  cbLStart: p.L.start, cbLEnd: p.L.end, cbLEasing: easingToIndex(p.L.easing),
  cbCStart: p.C.start, cbCEnd: p.C.end, cbCEasing: easingToIndex(p.C.easing),
  cbHStart: p.h.start, cbHEnd: p.h.end, cbHEasing: easingToIndex(p.h.easing),
});

/** Read the ColorBox params off the DDFS slice (easing indices → names). Falls back
 *  to DEFAULT_COLORBOX_PARAMS per-field so a missing key (e.g. a pre-S7 persisted
 *  slice) can never feed `undefined` → NaN through the builder and black the ramp. */
const sliceToColorBox = (s: GeneratorSlice): ColorBoxParams => {
  const d = DEFAULT_COLORBOX_PARAMS;
  const num = (v: number | undefined, fallback: number) => (Number.isFinite(v) ? (v as number) : fallback);
  return {
    L: { start: num(s.cbLStart, d.L.start), end: num(s.cbLEnd, d.L.end), easing: easingFromIndex(s.cbLEasing ?? 0) },
    C: { start: num(s.cbCStart, d.C.start), end: num(s.cbCEnd, d.C.end), easing: easingFromIndex(s.cbCEasing ?? 0) },
    h: { start: num(s.cbHStart, d.h.start), end: num(s.cbHEnd, d.h.end), easing: easingFromIndex(s.cbHEasing ?? 0) },
  };
};

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
// The bracket primitives are shared with favients (paramUndoBracket) so the engine-store
// cast lives in one place; genEdit* stay exported as the generator's named entry points.
export const genEditStart = paramEditStart;
export const genEditEnd = paramEditEnd;
export const genEdit = paramEdit;

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
  /** Stops mode (generatorMode === 2): a hand-authored GradientConfig the engine
   *  AdvancedGradientEditor edits in place. NON-DDFS (a variable-length stop array),
   *  so it lives here and round-trips via the generator history + document providers
   *  — NOT shared with the studio's separate Stops MODE (paletteEditorStore). */
  stopsConfig: GradientConfig;

  setSlot: (which: 'A' | 'B', idx: number) => void;
  /** Register an arbitrary 256-RGB ramp as a custom source and load it into a slot
   *  (the img2grad → generator merge). Returns the catalog index used. */
  sendRampToSlot: (which: 'A' | 'B', ramp: RGB[], name: string) => number;
  setTracks: (tracks: ChannelTracks | null) => void;
  /** Stops mode onChange sink — commits the whole edited config. Bracketing for undo
   *  is the caller's job via the (d) seam (genEditStart/End/genEdit at the editor). */
  setStopsConfig: (config: GradientConfig) => void;
  setCurvesOn: (on: boolean) => void;
  setDetail: (v: number) => void;
  setSmooth: (v: number) => void;
  reseedNoise: () => void;
  setExportFmt: (k: string) => void;
  swap: () => void;
  fitFromSource: () => void;
  /** N5: decompose a dropped/sent gradient's 256-RGB ramp into editable L/C/h curves (the
   *  inverse of the editor) at the current detail/smooth, and switch curves ON so they
   *  immediately drive the output. The P2 select/drop path onto the Curves widget. One
   *  undo entry. */
  fitCurvesFromRamp: (ramp: RGB[]) => void;
  resetCurves: () => void;
  /** Reset the Mix channel (L/C/h) blend to defaults (0/0/0 = all source A). One undo entry. */
  resetMix: () => void;
  resetAll: () => void;
  /** Bake a slot's modifiers into a new source ramp + reset that slot's dials (picture unchanged). */
  bakeSlot: (which: 'A' | 'B') => void;
  /** Reset a slot's modifier dials to neutral. */
  resetSlot: (which: 'A' | 'B') => void;
  /** Bake the global Modify chain into the channel curves + reset the global dials. */
  bakeMainToCurve: () => void;
  /** Reset the global Modify + noise dials to neutral. */
  resetMainMods: () => void;
  /** ColorBox: approximate a catalog gradient as per-channel sweeps and load it into
   *  the ColorBox params (the interim "fit from a gradient" entry until P2's drop path). */
  fitColorBoxFromCatalog: (idx: number) => void;
  /** ColorBox: same fit from an arbitrary 256-RGB ramp — the P2 select/drop path (a
   *  gradient sent from any mode / Favients onto the ColorBox bin). One undo entry. */
  fitColorBoxFromRamp: (ramp: RGB[]) => void;
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

/** Pure derive of the post-mix (or ColorBox) base channels (for "fit from source"). */
const baseChannelsFrom = (slotA: number, slotB: number, seed: number): Channels => {
  const s = readSlice();
  if (generatorModeOf(s) === 'colorbox') return buildColorBoxRamp(sliceToColorBox(s)).base;
  return buildGradientRamp(slotChannels(slotA), slotChannels(slotB), sliceToModsA(s), sliceToModsB(s), sliceToParams(s), null, seed).base;
};

const sampleCurves = (tracks: ChannelTracks | null, on: boolean) =>
  on && tracks ? { L: trackToRamp(tracks.L), C: trackToRamp(tracks.C), h: trackToRamp(tracks.h) } : null;

/**
 * The fit RECIPE: decompose a post-mix BASE into editable channel Tracks at the given
 * `detail` (Douglas-Peucker eps) + `smooth` (pre-smoothing window). Extracted so the
 * explicit "Fit from source" COMMIT and the non-destructive ghost PREVIEW share one
 * recipe — the faint ghost is therefore byte-faithful to what a bake will commit.
 * (Decision 3: detail/smooth = non-destructive, ghost-previewed, bake-to-commit.)
 */
const fitChannelsToTracks = (base: Channels, detail: number, smooth: number): ChannelTracks => {
  const k = (11 - detail) / 3;
  return {
    L: rampToBezierTrack(smoothChannel(base.L, smooth), 'L', 'Lightness', { eps: 0.01 * k }),
    C: rampToBezierTrack(smoothChannel(base.C, smooth), 'C', 'Chroma', { eps: 0.01 * k }),
    h: rampToBezierTrack(smoothChannel(unwrapHue(base.h), smooth), 'h', 'Hue', { eps: 0.06 * k }),
  };
};

/**
 * Sample the prospective fit back to 256-value channels — the data the editor paints
 * as the faint "source ghost" behind the editable bezier. Hue stays UNWRAPPED (the fit
 * runs on unwrapHue(base.h), and the editable h Track is unwrapped too) so the ghost
 * shares the h track's continuous space and lines up with it. Source = `base` (the
 * post-mix pre-curve channels) — the same input "Fit from source" commits from, so the
 * ghost previews exactly what a bake produces. (`final` is rejected: it is post-curve,
 * so it would fold the very edits you are comparing against back into the ghost.)
 */
export const prospectiveFitChannels = (base: Channels, detail: number, smooth: number): Channels => {
  const t = fitChannelsToTracks(base, detail, smooth);
  return { L: trackToRamp(t.L), C: trackToRamp(t.C), h: trackToRamp(t.h) };
};

/**
 * The prospective fit's KEYFRAME FRAMES per channel — the control-point positions a
 * "Fit / Re-fit from source" would create at the current detail/smooth. The editor
 * paints these as faint "ghost points" on the ghost curve so the detail slider (point
 * COUNT) and the smooth slider (point PLACEMENT) are legible at a glance: drag detail
 * → more/fewer dots; drag smooth → the dots shift. Frames are 0..CURVE_FRAMES (== the
 * 256-sample index), so the editor can read the ghost value straight off the frame.
 */
export const prospectiveFitFrames = (
  base: Channels,
  detail: number,
  smooth: number,
): Record<'L' | 'C' | 'h', number[]> => {
  const t = fitChannelsToTracks(base, detail, smooth);
  return {
    L: t.L.keyframes.map((k) => k.frame),
    C: t.C.keyframes.map((k) => k.frame),
    h: t.h.keyframes.map((k) => k.frame),
  };
};

/** Run the full pipeline: the two-source mix chain, or the ColorBox sweep. */
const fullResult = (slotA: number, slotB: number, curves: ReturnType<typeof sampleCurves>, seed: number): BuildResult => {
  const s = readSlice();
  if (generatorModeOf(s) === 'colorbox') return buildColorBoxRamp(sliceToColorBox(s));
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
  stopsConfig: makeDefaultEditorConfig(),

  // Discrete actions self-bracket so each is one undo entry. setTracks / setDetail /
  // setSmooth / setStopsConfig are CONTINUOUS (curve drag / slider drag / knot drag) —
  // the UI brackets those via genEditStart/End.
  setSlot: (which, idx) => genEdit(() => set(which === 'A' ? { slotA: idx } : { slotB: idx })),
  sendRampToSlot: (which, ramp, name) => {
    const idx = registerCustomRamp(ramp, name);
    genEdit(() => set(which === 'A' ? { slotA: idx } : { slotB: idx }));
    return idx;
  },
  setTracks: (tracks) => set({ tracks }),
  setStopsConfig: (stopsConfig) => set({ stopsConfig }),
  setCurvesOn: (on) => genEdit(() => set((s) => ({ curvesOn: on && !!s.tracks }))),
  setDetail: (v) => set({ detail: v }),
  setSmooth: (v) => set({ smooth: v }),
  reseedNoise: () => genEdit(() => set((s) => ({ noiseSeed: s.noiseSeed + 1 }))),
  setExportFmt: (k) => set({ exportFmt: k }), // a UI pref, not undoable
  swap: () => genEdit(() => set((s) => ({ slotA: s.slotB, slotB: s.slotA }))),

  fitFromSource: () => {
    const s = get();
    const base = baseChannelsFrom(s.slotA, s.slotB, s.noiseSeed);
    set({ tracks: fitChannelsToTracks(base, s.detail, s.smooth), curvesOn: true });
  },
  fitCurvesFromRamp: (ramp) =>
    genEdit(() => {
      // Decompose the dropped gradient into L/C/h channels, then fit editable bezier curves
      // at the current detail/smooth — the inverse of "Fit from source", but from any sent
      // gradient instead of the A/B mix (hue unwrapping happens inside fitChannelsToTracks).
      set({ tracks: fitChannelsToTracks(decomposeRamp(ramp), get().detail, get().smooth), curvesOn: true });
    }),
  resetCurves: () => genEdit(() => set({ tracks: null, curvesOn: false })),
  // Reset the Mix blend (mixL/mixC/mixH are DDFS params on the slice) to defaults —
  // 0/0/0 = all source A. Mirrors resetCurves: one genEdit() bracket = one undo entry.
  resetMix: () => genEdit(() => setSlice({ mixL: 0, mixC: 0, mixH: 0 })),
  resetAll: () =>
    genEdit(() => {
      // Reset every dial to defaults but STAY in the current mode (don't yank the
      // user out of ColorBox just for resetting its sweeps).
      setSlice({ ...GENERATOR_PARAM_DEFAULTS, generatorMode: readSlice().generatorMode } as Partial<GeneratorSlice>);
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

  fitColorBoxFromCatalog: (idx) => get().fitColorBoxFromRamp(presetRamp(idx)),
  fitColorBoxFromRamp: (ramp) =>
    genEdit(() => {
      const params = fitColorBoxToRamp(ramp);
      // Ensure we're in ColorBox mode and load the fitted sweeps (one undo entry).
      setSlice({ generatorMode: 1, ...colorBoxToSlice(params) } as Partial<GeneratorSlice>);
      showToast('ColorBox fitted from gradient — tweak the sweeps to taste', 'success');
    }),
}));

/** Live ColorBox params off the slice — for UI that reflects the current sweeps (e.g.
 *  the channel sliders' colour-ramp track backgrounds). */
export const useColorBoxParams = (): ColorBoxParams => {
  const slice = useEngineStore((s) => (s as any).paletteGenerator) as GeneratorSlice | undefined;
  return useMemo(() => sliceToColorBox(slice ?? (GENERATOR_PARAM_DEFAULTS as unknown as GeneratorSlice)), [slice]);
};

/**
 * History provider snapshot/restore for the generator's NON-DDFS state (the DDFS slice
 * is captured by the engine snapshot already). Registered in registerPaletteUI so the
 * param undo stack restores curves + slot selection + curve-fit dials. Tracks are plain
 * JSON (Keyframe[] objects) so the snapshot's structuredClone-via-JSON is lossless.
 */
export const captureGeneratorHistory = () => {
  const s = useGeneratorStore.getState();
  return { slotA: s.slotA, slotB: s.slotB, tracks: s.tracks, curvesOn: s.curvesOn, detail: s.detail, smooth: s.smooth, noiseSeed: s.noiseSeed, stopsConfig: s.stopsConfig };
};
export const restoreGeneratorHistory = (snap: unknown): void => {
  useGeneratorStore.setState({ ...(snap as Partial<ReturnType<typeof captureGeneratorHistory>>) });
};

/**
 * Resolve a slot to its 256-RGB ramp + display name — the CATALOG-INDEPENDENT
 * representation the scene document stores. A slot is a catalog INDEX in-memory (fine for
 * same-session undo), but that index is meaningless across a reload: the ad-hoc catalog
 * (img2grad sends, bakes, drag-drops) isn't persisted, so a saved index would point at a
 * different gradient — or nothing. Saving the resolved ramp and re-registering it on load
 * (registerCustomRamp) makes the slot restore exactly, regardless of catalog state.
 * (Now that slot selection is drag-drop, there is no name/preset reference to save.)
 */
export const slotSnapshot = (idx: number): { ramp: RGB[]; name: string } => {
  const cat = buildPresetCatalog();
  const i = Math.max(0, Math.min(cat.length - 1, idx));
  return { ramp: presetRamp(idx), name: cat[i]?.name ?? `Slot ${idx}` };
};

export interface GeneratorDerived {
  stripA: RGB[];
  stripB: RGB[];
  ramp: RGB[];
  base: Channels;
  /**
   * The editor's "ghost" scope: the RESULT output channels (post-global Modify chain),
   * hue unwrapped. Tracks the Modify dials and is defined even with curves off (then it
   * is the live result). With curves ON it is built from the PROSPECTIVE fit instead of
   * the committed curve, so detail/smooth preview a re-fit before any bake.
   */
  ghost: Channels;
  /**
   * Per-channel prospective-fit keyframe FRAMES at the current detail/smooth — the
   * editor draws these as faint "ghost points" on the ghost curve to explain those two
   * sliders. Null in ColorBox (no curve-fit layer). (See prospectiveFitFrames.)
   */
  ghostPoints: Record<'L' | 'C' | 'h', number[]> | null;
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
  const smooth = useGeneratorStore((s) => s.smooth);
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);
  const stopsConfig = useGeneratorStore((s) => s.stopsConfig);

  const mode = generatorModeOf(slice);
  const modsA = useMemo(() => sliceToModsA(slice), [slice]);
  const modsB = useMemo(() => sliceToModsB(slice), [slice]);
  const params = useMemo(() => sliceToParams(slice), [slice]);
  const cbParams = useMemo(() => sliceToColorBox(slice), [slice]);

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
    () =>
      mode === 'colorbox'
        ? buildColorBoxRamp(cbParams)
        : buildGradientRamp(srcA, srcB, modsA, modsB, params, sampledCurves, noiseSeed),
    [mode, cbParams, srcA, srcB, modsA, modsB, params, sampledCurves, noiseSeed],
  );

  // `base` (post-mix, pre-curve channels) feeds the curve-fit AND the editor's ghost
  // preview. Memoize it on its REAL inputs (sources + slot mods + mix) — not via
  // built.base, whose object identity churns on every keyframe edit (sampledCurves
  // changes) even though base is curve-independent. A stable identity keeps the ghost's
  // prospective fit (Douglas-Peucker + bezier resample) from recomputing each drag frame.
  const base = useMemo(
    // ColorBox has no curve/mix layer, so `built.base` IS this value — reuse it rather
    // than building the ramp a second time. `built` is computed just above (so it's
    // fresh this render) and read directly; it is deliberately NOT in the deps — adding
    // it would rebuild the MIXED curve-fit source on every keyframe drag (built churns
    // via sampledCurves). `cbParams` IS in the deps, which is the only input the colorbox
    // branch depends on; same cbParams ⇒ same built.base content regardless of identity.
    () =>
      mode === 'colorbox'
        ? built.base
        : buildGradientRamp(srcA, srcB, modsA, modsB, params, null, 1).base,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, cbParams, srcA, srcB, modsA, modsB, params],
  );

  // The editor's ghost scope: the post-global RESULT channels (so it follows the Modify
  // chain), hue unwrapped. Curves ON → build from the PROSPECTIVE fit so detail/smooth
  // preview a re-fit; curves OFF → the live result. The expensive override build (DP fit +
  // pipeline) is its OWN memo keyed only on its real inputs (NOT tracks/built), so editing
  // keyframes — which churns `built` — doesn't re-run the fit every drag frame.
  const hasTracks = !!tracks;
  // Note: `unwrapHue` runs on the override's already-unwrapped prospective-fit hue (it was
  // fit from unwrapHue(base.h)); that's self-consistent — unwrap of a continuous array just
  // re-bases it — and any extra divergence from the editable h track under a steep curve is
  // expected. It also unwraps the curves-OFF live hue, which genuinely needs it.
  const overrideGhost = useMemo(() => {
    // The prospective-fit override is a MIXED-pipeline concept (it re-runs the mix
    // chain with the fitted curves). ColorBox has no curve override, so fall through
    // to the live ghost (built.final) there.
    if (mode === 'colorbox' || !curvesOn || !hasTracks) return null;
    const f = buildGradientRamp(srcA, srcB, modsA, modsB, params, prospectiveFitChannels(base, detail, smooth), noiseSeed).final;
    return { L: f.L, C: f.C, h: unwrapHue(f.h) };
  }, [mode, curvesOn, hasTracks, base, detail, smooth, srcA, srcB, modsA, modsB, params, noiseSeed]);
  const liveGhost = useMemo(() => ({ L: built.final.L, C: built.final.C, h: unwrapHue(built.final.h) }), [built]);
  // When the override supersedes (curves on), the ghost is referentially stable across
  // keyframe edits (which only churn `built`/`liveGhost`), so trackRanges doesn't rebuild.
  const ghost = overrideGhost ?? liveGhost;

  // Ghost POINTS — the control-point frames a re-fit would place at the current
  // detail/smooth. Keyed only on the fit's real inputs (NOT tracks/built) so editing
  // keyframes doesn't re-run the Douglas-Peucker fit each drag frame. Null in ColorBox.
  const ghostPoints = useMemo(
    () => (mode === 'colorbox' ? null : prospectiveFitFrames(base, detail, smooth)),
    [mode, base, detail, smooth],
  );

  const mixedConfig = useMemo(() => {
    const k = (11 - detail) / 3;
    // maxStops scales with the detail dial. The default cap (32) truncated rich
    // generated gradients (e.g. posterized / many-hue / noisy) so a favourited result
    // lost detail vs the live 256-step preview — let detail buy the fidelity it asks for.
    return fitRampToStops(built.ramp, { targetDE: Math.max(0.004, 0.012 * k), maxStops: Math.round(32 + detail * 12) });
  }, [built.ramp, detail]);

  // Stops mode: the RESULT is the hand-authored stops, rendered through the canonical
  // sampler (byte-exact with the texture bake), and the config IS the edited gradient
  // (no fit round-trip needed — it already carries stops). The mix/colorbox pipeline
  // above still runs but its ramp/config are superseded here. base/ghost/ghostPoints
  // are mix-only scopes and go unused (the Stops UI has no curve editor).
  const stopsRamp = useMemo(
    () => (mode === 'stops' ? renderStopsToRamp(stopsConfig.stops, stopsConfig.blendSpace, stopsConfig.colorSpace) : null),
    [mode, stopsConfig],
  );

  return {
    stripA,
    stripB,
    ramp: stopsRamp ?? built.ramp,
    base,
    ghost,
    ghostPoints,
    config: mode === 'stops' ? stopsConfig : mixedConfig,
  };
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
