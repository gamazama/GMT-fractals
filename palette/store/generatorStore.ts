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
import { renderStopsToRamp, renderGradientToRamp } from '../core/gmtGradient';
import { rampToGradientConfig } from '../core/stopFit';
import { usePaletteEditorStore } from './paletteEditorStore';
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
import { rampToBezierTrack, rampToSteppedTrack, flatRuns, trackToRamp } from '../core/channelCurve';
import { resolveKnotPlacement } from './curveFitPref';
import { buildPresetCatalog, registerCustomRamp, registerCustomChannels } from '../core/presetCatalog';
import { bufferToRamp } from '../core/stopFit';
import { GENERATOR_PARAM_DEFAULTS } from '../features/paletteGenerator';
import type { ChannelTracks } from '../components/ChannelGraphEditor';
import {
  CURVE_SPACE_ORDER,
  DEFAULT_CURVE_SPACE,
  curveSpace,
  curveSpaceKeys,
  fromCurveChannels,
  toCurveChannels,
  type CurveSpace,
} from '../core/curveSpaces';
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
  hueRotate: number; chroma: number; contrast: number; lightness: number;
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
/** Imperative read/write of the paletteGenerator DDFS slice for sibling stores (the v2
 *  Working pipeline resets the Adjust chain on bake). Same cast, one place. */
export const readGeneratorSlice = readSlice;
export const setGeneratorSlice = (patch: Partial<GeneratorSlice>): void => setSlice(patch);
export type { GeneratorSlice };
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
  hueRotate: s.hueRotate, chroma: s.chroma, contrast: s.contrast, lightness: s.lightness ?? 0,
  noise: s.noise, noiseFreq: s.noiseFreq, noiseL: s.noiseL, noiseC: s.noiseC, noiseH: s.noiseH,
});

interface GeneratorState {
  slotA: number;
  slotB: number;
  tracks: ChannelTracks | null;
  curvesOn: boolean;
  /** WHICH three axes the curves are drawn along. Authoring only — the pipeline stays
   *  OkLCh and the conversion happens at `sampleCurves`. @see palette/core/curveSpaces.ts */
  curveSpace: CurveSpace;
  /** The tracks have been EDITED since they were fitted (a drag, the pencil, the brush, a
   *  key added). An untouched fit is the source restated, so leaving the Curves face with
   *  it must not bake — it just clears (v2, C.4 follow-up 2026-09-07 evening) — and while it
   *  is live the working output config is the input's own, not a re-fit (2026-09-23, grep
   *  `curvesUntouched` in palette/core/workingPipeline.ts). It rides the undo capture WITH the
   *  tracks, but never makes an entry on its own (2026-09-24, grep `generatorChangeOf`). */
  tracksEdited: boolean;
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
  /** Switch the authoring space. The tracks RE-FIT from the given base, because a bezier in
   *  L/C/h has no counterpart in R/G/B — one re-fit, one undo entry. */
  setCurveSpace: (space: CurveSpace, base: Channels | null) => void;
  setDetail: (v: number) => void;
  setSmooth: (v: number) => void;
  reseedNoise: () => void;
  setExportFmt: (k: string) => void;
  swap: () => void;
  fitFromSource: () => void;
  /** N5: decompose a dropped/sent gradient's 256-RGB ramp into editable L/C/h curves (the
   *  inverse of the editor) at the current detail/smooth, and switch curves ON so they
   *  immediately drive the output. The P2 select/drop path onto the Curves widget. One
   *  undo entry. Hand it the gradient's TRUE ramp — `gradientDisplayRamp(config)`, never a
   *  render of `config.stops`, which is a greyscale fallback on a RAMP gradient (ADR-0122). */
  fitCurvesFromRamp: (ramp: RGB[]) => void;
  /** Fit editable curves from ANY base channels at the current detail/smooth (the v2
   *  Working pipeline fits from its own input, which need not be the A/B mix). The v2 Curves
   *  face passes the Working base, which `channelsOfConfig` reads from the display ramp — so
   *  a ramp gradient's curves fit its 256 texels, not a stop fit of them. */
  fitFromChannels: (base: Channels) => void;
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
  /** Reset every control GE v2's ADJUST face shows — {@link ADJUST_FACE_DEFAULTS} — and
   *  nothing else. One undo entry. */
  resetAdjust: () => void;
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
/** Both slots' modifiers at neutral — the fourteen `aHueRotate` … `bMirror` params. GE v2 has
 *  no UI for them (owner, 2026-09-13: Mix is streamlined into the destructive flow), so its Mix
 *  entry puts them here rather than let a value from elsewhere apply unseen — grep
 *  `SLOT_MOD_DEFAULTS` in gradient-explorer/v2/GradientExplorerV2App.tsx. */
export const SLOT_MOD_DEFAULTS: Partial<GeneratorSlice> = { ...SLOT_DEFAULTS('A'), ...SLOT_DEFAULTS('B') };
export const MAIN_DEFAULTS: Partial<GeneratorSlice> = {
  hueRotate: 0, chroma: 1, contrast: 1, lightness: 0, bands: 0, repeats: 1, phase: 0, mirror: false, reverse: false, noise: 0,
};
/**
 * What GE v2's Adjust face's CANCEL puts back (owner, 2026-09-13 — it was "Reset all" until the
 * same day's Cancel / Apply rework): every control in its three bins, and nothing outside them.
 * That is {@link MAIN_DEFAULTS} PLUS the noise sub-dials — Frequency and the three Targets —
 * which MAIN_DEFAULTS leaves out on purpose: a bake (Apply, or closing the face) resets the
 * chain to the identity, and at Strength 0 those sub-dials change nothing, so they persist
 * there. A Cancel that left a visible Frequency slider where it was would not have discarded
 * the change, so this is its own set rather than `resetMainMods` (which also stays
 * as it is for app-gmt's Generator dock, grep `GeneratorModifierActions`). The four values it
 * adds come from the feature's own defaults table, not retyped. It does NOT reset the noise SEED (not
 * a control), the Mix blend, the slot modifiers, the curves or the stops.
 */
export const ADJUST_FACE_DEFAULTS: Partial<GeneratorSlice> = {
  ...MAIN_DEFAULTS,
  noiseFreq: GENERATOR_PARAM_DEFAULTS.noiseFreq as number,
  noiseL: GENERATOR_PARAM_DEFAULTS.noiseL as boolean,
  noiseC: GENERATOR_PARAM_DEFAULTS.noiseC as boolean,
  noiseH: GENERATOR_PARAM_DEFAULTS.noiseH as boolean,
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
/** Pure: the Build recipe base (post-mix, pre-curve; or the ColorBox base) for an explicit slice. */
export const baseFromSlice = (s: GeneratorSlice, slotA: number, slotB: number, seed: number): Channels => {
  if (generatorModeOf(s) === 'colorbox') return buildColorBoxRamp(sliceToColorBox(s)).base;
  return buildGradientRamp(slotChannels(slotA), slotChannels(slotB), sliceToModsA(s), sliceToModsB(s), sliceToParams(s), null, seed).base;
};
/** Imperative: the Build recipe base for the LIVE slice (the v2 Working pipeline folds from it). */
export const buildBaseNow = (): Channels => {
  const g = useGeneratorStore.getState();
  return baseFromSlice(readSlice(), g.slotA, g.slotB, g.noiseSeed);
};
const baseChannelsFrom = (slotA: number, slotB: number, seed: number): Channels => {
  const s = readSlice();
  if (generatorModeOf(s) === 'colorbox') return buildColorBoxRamp(sliceToColorBox(s)).base;
  return buildGradientRamp(slotChannels(slotA), slotChannels(slotB), sliceToModsA(s), sliceToModsB(s), sliceToParams(s), null, seed).base;
};

/**
 * THE conversion seam. Tracks are authored in whatever space the owner picked; the pipeline
 * is OkLCh. This is the single place the two meet — sample the three tracks in their own
 * space, convert once, hand OkLCh to `buildGradientRamp` exactly as before. Nothing
 * downstream knows a space exists.
 *
 * Returns null when the space's keys are not all present, which happens legitimately for one
 * render after a space switch (the tracks are the old space's until the re-fit lands). Null
 * means "no curve override", i.e. the mix shows through — the right thing to draw for a
 * frame, and never a throw.
 */
export const sampleCurves = (tracks: ChannelTracks | null, on: boolean, space: CurveSpace) => {
  if (!on || !tracks) return null;
  const [k0, k1, k2] = curveSpaceKeys(space);
  if (!tracks[k0] || !tracks[k1] || !tracks[k2]) return null;
  return fromCurveChannels(space, trackToRamp(tracks[k0]), trackToRamp(tracks[k1]), trackToRamp(tracks[k2]));
};

/**
 * The fit RECIPE: decompose a post-mix BASE into editable channel Tracks at the given
 * `detail` (Douglas-Peucker eps) + `smooth` (pre-smoothing window). Extracted so the
 * explicit "Fit from source" COMMIT and the non-destructive ghost PREVIEW share one
 * recipe — the faint ghost is therefore byte-faithful to what a bake will commit.
 * (Decision 3: detail/smooth = non-destructive, ghost-previewed, bake-to-commit.)
 */
export const fitChannelsToTracks = (base: Channels, detail: number, smooth: number, space: CurveSpace): ChannelTracks => {
  const k = (11 - detail) / 3;
  const def = curveSpace(space);
  // Into the AUTHORING space (angular channels unwrapped there, not here — a space may have
  // none, or its angle may not be OkLCh's h).
  const chans = toCurveChannels(space, base);
  // A banded source keeps its bands (C.4): its runs become Step keys, and Smooth is not
  // applied (it would blur the very edges the holds reproduce). Smooth ramps: as before.
  // Detail decides how SMALL a band still counts as one (10 → every 2-texel run; 2 → only
  // runs of 10+), so the ghost answers the dial on a banded source too (owner, 2026-09-07
  // evening: the ghost "needs to update when the slider moves").
  const runs = flatRuns(chans, Math.round(2 + (10 - detail)));
  const sm = runs.length ? 0 : smooth;
  const out: ChannelTracks = {};
  // eps comes off the CHANNEL, not the space: CIE L* spans 100 where Oklab L spans 1, and
  // one number for both would mean one Detail setting buying 100x the keys.
  const placement = resolveKnotPlacement();
  def.channels.forEach((c, i) => {
    out[c.key] = rampToSteppedTrack(smoothChannel(chans[i], sm), runs, c.key, c.label, { eps: c.eps * k, placement });
  });
  return out;
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
export const prospectiveFitChannels = (base: Channels, detail: number, smooth: number, space: CurveSpace): Record<string, number[]> => {
  const t = fitChannelsToTracks(base, detail, smooth, space);
  const out: Record<string, number[]> = {};
  // Keyed by the SPACE's channel keys, and left in the space's units: the ghost has to share
  // the editable curve's axes or the two stop overlaying and Detail / Smooth read as noise.
  for (const key of Object.keys(t)) out[key] = trackToRamp(t[key]);
  return out;
};

/**
 * The prospective fit as an OkLCh CURVE OVERRIDE — what `buildGradientRamp` wants, as
 * against {@link prospectiveFitChannels}, which returns the same fit in the EDITING space
 * for the ghost to draw. Two readers of one fit, and they genuinely need different spaces:
 * the pipeline only speaks OkLCh, the plot only draws the space the owner picked.
 */
export const prospectiveFitCurves = (base: Channels, detail: number, smooth: number, space: CurveSpace): Channels => {
  const t = fitChannelsToTracks(base, detail, smooth, space);
  const [k0, k1, k2] = curveSpaceKeys(space);
  return fromCurveChannels(space, trackToRamp(t[k0]), trackToRamp(t[k1]), trackToRamp(t[k2]));
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
  space: CurveSpace,
): Record<string, number[]> => {
  const t = fitChannelsToTracks(base, detail, smooth, space);
  const out: Record<string, number[]> = {};
  for (const key of Object.keys(t)) out[key] = t[key].keyframes.map((k) => k.frame);
  return out;
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
  curveSpace: DEFAULT_CURVE_SPACE,
  tracksEdited: false,
  detail: 8,
  // 0, not the 5 this shipped with (owner, 2026-09-12: "smooth can be 0 by default"). The
  // pre-smoothing pass existed to keep the old Catmull-Rom fit from sagging on an 8-bit
  // staircase; the fit solves its tangents against the samples now, so blurring the source
  // before fitting only costs fidelity. Measured over the 25 presets: with smooth 5 on, three
  // of them could not reach OKLab ΔE 0.02 at ANY Detail setting. The dial still works for
  // anyone who wants a deliberately softer curve.
  smooth: 0,
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
  setTracks: (tracks) => set({ tracks, tracksEdited: true }),
  setCurvesOn: (on) => genEdit(() => set((s) => ({ curvesOn: on && !!s.tracks }))),
  setCurveSpace: (space, base) =>
    genEdit(() =>
      set((s) => {
        if (space === s.curveSpace || !CURVE_SPACE_ORDER.includes(space)) return {};
        // No tracks yet: the space is all there is to change, and the next fit uses it.
        if (!s.tracks || !base) return { curveSpace: space };
        // With tracks, the switch must carry the CURRENT curve across, not the source: the
        // owner's edits are what they expect to see redrawn on the new axes. Sampling the
        // live tracks back through the old space gives exactly that.
        const live = sampleCurves(s.tracks, true, s.curveSpace) ?? base;
        return { curveSpace: space, tracks: fitChannelsToTracks(live, s.detail, s.smooth, space), curvesOn: true };
      }),
    ),
  setDetail: (v) => set({ detail: v }),
  setSmooth: (v) => set({ smooth: v }),
  reseedNoise: () => genEdit(() => set((s) => ({ noiseSeed: s.noiseSeed + 1 }))),
  setExportFmt: (k) => set({ exportFmt: k }), // a UI pref, not undoable
  swap: () => genEdit(() => set((s) => ({ slotA: s.slotB, slotB: s.slotA }))),

  fitFromSource: () => {
    const s = get();
    const base = baseChannelsFrom(s.slotA, s.slotB, s.noiseSeed);
    set({ tracks: fitChannelsToTracks(base, s.detail, s.smooth, s.curveSpace), curvesOn: true });
  },
  fitCurvesFromRamp: (ramp) =>
    genEdit(() => {
      // Decompose the dropped gradient into L/C/h channels, then fit editable bezier curves
      // at the current detail/smooth — the inverse of "Fit from source", but from any sent
      // gradient instead of the A/B mix (hue unwrapping happens inside fitChannelsToTracks).
      set({ tracks: fitChannelsToTracks(decomposeRamp(ramp), get().detail, get().smooth, get().curveSpace), curvesOn: true });
    }),
  fitFromChannels: (base) => genEdit(() => set({ tracks: fitChannelsToTracks(base, get().detail, get().smooth, get().curveSpace), curvesOn: true, tracksEdited: false })),
  resetCurves: () => genEdit(() => set({ tracks: null, curvesOn: false, tracksEdited: false })),
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
      const ch = fullResult(g.slotA, g.slotB, sampleCurves(g.tracks, g.curvesOn, g.curveSpace), g.noiseSeed).final;
      const k = (11 - g.detail) / 3;
      // Into the ACTIVE authoring space, with each channel's own eps — a bake while the
      // owner is drawing in RGB must hand back RGB curves, not L/C/h ones.
      const chans = toCurveChannels(g.curveSpace, ch);
      const tracks: ChannelTracks = {};
      const placement = resolveKnotPlacement();
      curveSpace(g.curveSpace).channels.forEach((c, i) => {
        tracks[c.key] = rampToBezierTrack(chans[i], c.key, c.label, { eps: c.eps * k, placement });
      });
      set({ tracks, curvesOn: true });
      setSlice(MAIN_DEFAULTS);
    }),
  resetMainMods: () => genEdit(() => setSlice(MAIN_DEFAULTS)),
  resetAdjust: () => genEdit(() => setSlice(ADJUST_FACE_DEFAULTS)),

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
 *
 * `tracksEdited` RIDES WITH THE TRACKS (2026-09-24). It was left out of the capture — not by a
 * decision anyone wrote down — so an undo that brought back EDITED curves (edit, pick another
 * gradient, Ctrl+Z) left the flag the pick had reset: the curves read as an untouched fit,
 * leaving the Curves face cleared them instead of baking them, and the output was the input's
 * own config (`curvesUntouched` in palette/core/workingPipeline.ts) so the edits did not even
 * show in it. Redo had the mirror fault: a fresh fit brought back reading as edited.
 *
 * But the flag must not MAKE an entry: a cancelled Curves wave writes the tracks back unchanged
 * and flips the flag on the way (`setTracks` sets it), and an entry holding that flip alone is
 * exactly what smoke:ge-wave [7] / [7b] / [7c] forbid. So the provider declares
 * {@link generatorChangeOf} — the capture minus the flag — as what decides whether a bracket
 * changed anything, and every entry that is pushed still stores and restores the flag.
 *
 * @invariant an undo or redo that puts curves back puts back the `tracksEdited` they had, and
 *   a bracket whose only change is that flag pushes no entry — proven by: `npx tsx
 *   debug/test-palette-working.mts` [15] ("edit → pick → Ctrl+Z: the edited curves come back AS
 *   EDITED", "… → Ctrl+Y: B's fresh fit comes back untouched", "a gesture that writes the curves
 *   back unchanged leaves NO undo entry") and `npm run smoke:ge-tray` [18d] ("the edited curves
 *   came back reading as untouched", "closing the face after the undo did not bake the edits").
 *   Falsified 2026-09-24: the flag dropped from the capture → 9 red in [15] and [18d] red; the
 *   provider registered without `changeOf`, `changeOf` returning the whole capture, and the
 *   history slice comparing raw captures → each 1 red, [15]'s no-entry check.
 */
export const captureGeneratorHistory = () => {
  const s = useGeneratorStore.getState();
  return { slotA: s.slotA, slotB: s.slotB, tracks: s.tracks, curvesOn: s.curvesOn, curveSpace: s.curveSpace, tracksEdited: s.tracksEdited, detail: s.detail, smooth: s.smooth, noiseSeed: s.noiseSeed };
};
export const restoreGeneratorHistory = (snap: unknown): void => {
  useGeneratorStore.setState({ ...(snap as Partial<ReturnType<typeof captureGeneratorHistory>>) });
};
/** The generator capture minus `tracksEdited` — the provider's `changeOf` (see the history
 *  slice's `HistoryProvider`): the flag is restored with an entry, never the reason for one. */
export const generatorChangeOf = (snap: unknown): unknown => {
  if (!snap || typeof snap !== 'object') return snap;
  const { tracksEdited: _flag, ...rest } = snap as Record<string, unknown>;
  return rest;
};
/** The one registration (registerPaletteUI, and the node harnesses that mirror it). */
export const generatorHistoryProvider = { capture: captureGeneratorHistory, restore: restoreGeneratorHistory, changeOf: generatorChangeOf };

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
   * IN THE AUTHORING SPACE and keyed by its channel keys, with any angular channel
   * unwrapped — it is drawn on the editor's axes, so it has to share them. Tracks the
   * Modify dials and is defined even with curves off (then it is the live result). With
   * curves ON it is built from the PROSPECTIVE fit instead of the committed curve, so
   * detail/smooth preview a re-fit before any bake.
   */
  ghost: Record<string, number[]>;
  /**
   * Per-channel prospective-fit keyframe FRAMES at the current detail/smooth — the
   * editor draws these as faint "ghost points" on the ghost curve to explain those two
   * sliders. Null in ColorBox (no curve-fit layer). (See prospectiveFitFrames.)
   */
  ghostPoints: Record<string, number[]> | null;
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
  const space = useGeneratorStore((s) => s.curveSpace);
  const tracks = useGeneratorStore((s) => s.tracks);
  const detail = useGeneratorStore((s) => s.detail);
  const smooth = useGeneratorStore((s) => s.smooth);
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);
  // Stops mode shares the engine stops document (paletteEditorStore) — the same gradient
  // the editor on the canvas edits — so the Generator's Stops mode and the round-trip
  // providers ('paletteEditor' history + 'stops' document) all reference one source.
  const stopsConfig = usePaletteEditorStore((s) => s.config);

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
    return buildGradientRamp(srcA, srcB, modsA, modsB, params, prospectiveFitCurves(base, detail, smooth, space), noiseSeed).final;
  }, [mode, curvesOn, hasTracks, base, detail, smooth, srcA, srcB, modsA, modsB, params, noiseSeed, space]);
  const liveGhost = built.final;
  // When the override supersedes (curves on), the ghost is referentially stable across
  // keyframe edits (which only churn `built`/`liveGhost`), so trackRanges doesn't rebuild.
  // ONE conversion, at the end: the ghost is drawn on the editor's axes, so it must live in
  // the authoring space or it stops overlaying the curve it is there to be compared with.
  // (This also subsumes the old `unwrapHue` — `toCurveChannels` unwraps whatever angular
  // channel the space actually has, which for RGB and Oklab is none.)
  const oklchGhost = overrideGhost ?? liveGhost;
  const ghost = useMemo(() => {
    const [a, b, c] = toCurveChannels(space, oklchGhost);
    const keys = curveSpaceKeys(space);
    return { [keys[0]]: a, [keys[1]]: b, [keys[2]]: c } as Record<string, number[]>;
  }, [space, oklchGhost]);

  // Ghost POINTS — the control-point frames a re-fit would place at the current
  // detail/smooth. Keyed only on the fit's real inputs (NOT tracks/built) so editing
  // keyframes doesn't re-run the Douglas-Peucker fit each drag frame. Null in ColorBox.
  const ghostPoints = useMemo(
    () => (mode === 'colorbox' ? null : prospectiveFitFrames(base, detail, smooth, space)),
    [mode, base, detail, smooth, space],
  );

  const mixedConfig = useMemo(() => {
    // Stops mode supplies its own config (stopsConfig below), so the costly ramp→stops
    // fit here is wasted — skip it. (The mix/colorbox memos above still run; they're
    // cheap and stay memoized while editing stops. Only this Douglas-Peucker fit is
    // worth gating.) Returns null in stops mode; the result branch picks stopsConfig.
    if (mode === 'stops') return null;
    const k = (11 - detail) / 3;
    // maxStops scales with the detail dial. The default cap (32) truncated rich
    // generated gradients (e.g. posterized / many-hue / noisy) so a favourited result
    // lost detail vs the live 256-step preview — let detail buy the fidelity it asks for.
    // An AUTOMATIC fit (ADR-0122): stops only when they finish within min(that budget,
    // STOP_LAYER_CAP); a dense result stays an exact RAMP gradient instead of a truncated fit.
    return rampToGradientConfig(built.ramp, { targetDE: Math.max(0.004, 0.012 * k), maxStops: Math.round(32 + detail * 12) });
  }, [mode, built.ramp, detail]);

  // Stops mode: the RESULT is the hand-authored stops, rendered through the canonical
  // sampler (byte-exact with the texture bake), and the config IS the edited gradient
  // (no fit round-trip needed — it already carries stops). The mix/colorbox pipeline
  // above still runs but its ramp/config are superseded here. base/ghost/ghostPoints
  // are mix-only scopes and go unused (the Stops UI has no curve editor).
  const stopsRamp = useMemo(
    // Either form: the shared document may hold a RAMP gradient (ADR-0122), whose `stops` is [].
    () => (mode === 'stops' ? renderGradientToRamp(stopsConfig) : null),
    [mode, stopsConfig],
  );

  return {
    stripA,
    stripB,
    ramp: stopsRamp ?? built.ramp,
    base,
    ghost,
    ghostPoints,
    config: mode === 'stops' ? stopsConfig : (mixedConfig ?? stopsConfig),
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

// --- v2 Working pipeline seams -------------------------------------------------------
// The Gradient Explorer v2 hero runs ONE pipeline over whatever gradient is in its input
// slot (see palette/core/workingPipeline.ts): Build is just one producer of that input.
// These hooks expose the three pieces the Working derive needs from this store without
// duplicating the slice plumbing above. They subscribe (hooks), so a v2 shell re-renders
// on the same edits the old GeneratorStage does.

/** The Build recipe result the v2 Working pipeline consumes when its input is `build`:
 *  post-mix / pre-curve channels (or the ColorBox base). Memoized on its real inputs. */
export const useBuildBase = (): Channels => {
  const sliceRaw = useEngineStore((s) => (s as any).paletteGenerator) as GeneratorSlice | undefined;
  const slice = sliceRaw ?? (GENERATOR_PARAM_DEFAULTS as unknown as GeneratorSlice);
  const slotA = useGeneratorStore((s) => s.slotA);
  const slotB = useGeneratorStore((s) => s.slotB);
  const noiseSeed = useGeneratorStore((s) => s.noiseSeed);
  return useMemo(() => baseFromSlice(slice, slotA, slotB, noiseSeed), [slice, slotA, slotB, noiseSeed]);
};

/** The Adjust chain (the global modifier params) read off the DDFS slice. The mix
 *  fields ride along but the Working pipeline zeroes them (A === B there). */
export const useAdjustParams = (): GeneratorParams => {
  const sliceRaw = useEngineStore((s) => (s as any).paletteGenerator) as GeneratorSlice | undefined;
  const slice = sliceRaw ?? (GENERATOR_PARAM_DEFAULTS as unknown as GeneratorSlice);
  return useMemo(() => sliceToParams(slice), [slice]);
};
export const readAdjustParamsNow = (): GeneratorParams => sliceToParams(readSlice());

/** The Shape override: the edited channel curves sampled to 256 values, or null when off. */
export const useSampledCurves = (): ReturnType<typeof sampleCurves> => {
  const curvesOn = useGeneratorStore((s) => s.curvesOn);
  const space = useGeneratorStore((s) => s.curveSpace);
  const tracks = useGeneratorStore((s) => s.tracks);
  return useMemo(() => sampleCurves(tracks, curvesOn, space), [tracks, curvesOn, space]);
};
export const readSampledCurvesNow = (): ReturnType<typeof sampleCurves> => {
  const g = useGeneratorStore.getState();
  return sampleCurves(g.tracks, g.curvesOn, g.curveSpace);
};
