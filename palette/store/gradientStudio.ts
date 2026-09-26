/**
 * gradientStudio — GMT's GRADIENT STUDIO: one floating window that edits one gradient param at a
 * time with the Gradient Explorer's faces — Stops (the shared editor, larger), Curves, Adjust and
 * Paint (owner, 2026-09-26: "a popout which lets it float, and gives it the curves, adjust and
 * paint faces from gradient explorer"; one window, the sky gradient included).
 *
 * WHAT IT EDITS. A `StudioTarget` — a DDFS gradient param by `(featureId, paramKey)`, the identity
 * the editor already hands its header entrances. The popout on any full-chrome editor points the
 * Studio at that editor's param (`openGradientStudio`); the Studio reads the param from the engine
 * store and writes it through the feature's own setter, exactly as the inline editor's `onChange`
 * does (`AutoFeaturePanel.handleUpdate`), so the texture, undo and presets see an ordinary edit.
 * Nothing here names a GMT feature — any host with a gradient param and this installed gets it.
 *
 * THE FACES ARE THE EXPLORER'S, SHARED (not ported): `palette/components/faces/CurvesFace.tsx`,
 * `faces/AdjustFace.tsx` and `palette/components/paint/`. Their state is the stores they always
 * used — the dials are the `paletteGenerator` DDFS slice, the curves are `generatorStore`, the
 * painting is `paintStore` — and both hosts share those (never on the same page).
 *
 * A FACE IS PREVIEWED, AND BAKED WHEN YOU LEAVE IT (owner, 2026-09-26: "like gradient editor, lets
 * have it bake on close/apply (undoable)" — the Explorer's paradigm, "every application bakes a new
 * state and starts from fresh"):
 *   • While Curves / Adjust / Paint are live, the PARAM IS NOT WRITTEN. The fractal shows the
 *     result through a RENDER-ONLY preview (`previewGradient`: the param's own uniform, sent the
 *     buffer the setter would send), so the store — and therefore undo, a scene save and the
 *     inline editor — keep the gradient as it was. That is what makes the source of a live face
 *     simply "the param": an undo, or an edit in the sidebar editor while a face is open, changes
 *     the source and the preview follows it.
 *   • BAKE (`bakeStudio`) writes the result and resets the dials and curves in ONE `paramGroup` —
 *     one undo entry whose Ctrl+Z gives back the gradient AND the dials that made the result, so
 *     the face (if still open) shows the same preview again. Adjust's Apply, leaving Curves or
 *     Adjust by a tab, closing the Studio and pointing it at another gradient all bake. Paint's
 *     Apply is `commitPaint`, whose sink here writes the painted ramp (installed by
 *     `palette/installGradientStudio.ts`).
 *   • CANCEL (`cancelStudioFace`, Esc) is each face's own: Adjust's `resetAdjust`, Paint's
 *     `discardPaint`, and for an edited Curves the curves dropped in one entry.
 *   • An UNTOUCHED Curves fit is the source restated — leaving it drops the fit outside undo and
 *     bakes nothing (the Explorer's "peek"). Entering Curves fits OUTSIDE undo too, so looking in
 *     costs no undo step; the first curve edit's own bracket holds the fit as its "before".
 *
 * The output FORM follows ADR-0122 through the shared pipeline (`runWorkingPipeline`): a gradient
 * with stops keeps stops (fitted at the Detail budget), a ramp stays a ramp unless a cheap fit is
 * faithful, and Paint always lands a ramp (ADR-0129; owner, same day: "stops as a ramp is fine").
 * The param's own `colorSpace` is kept — a coloring layer is 'linear', the sky 'srgb', and the
 * pipeline works in display space whatever the texture hint says.
 *
 * @see palette/components/GradientStudioPanel.tsx (the window) · palette/installGradientStudio.ts
 * @see docs/adr/0111-working-pipeline-input-slot.md · docs/adr/0122-the-ramp-is-the-gradient.md
 * @see docs/adr/0129-the-paint-face-paints-a-ramp.md
 *
 * @assumption The render-only preview lasts until something re-sends the param's uniform — a
 *   setter call, a scene load, a shader rebuild that re-syncs every uniform. The panel re-sends the
 *   preview whenever its inputs change, but a rebuild with nothing else moving shows the stored
 *   gradient until the next change. Nothing tests this.
 */

import { create } from 'zustand';
import { useEngineStore } from '../../store/engineStore';
import { featureRegistry } from '../../engine/FeatureSystem';
import { FractalEvents } from '../../engine/FractalEvents';
import { generateGradientTextureBuffer, gradientDisplayRamp } from '../../utils/colorUtils';
import type { GradientConfig, GradientStop } from '../../types';
import type { RGB } from '../core/oklab';
import { coerceGradientConfig } from '../core/editorConfig';
import { setGradientParamPreview } from '../../components/gradient/gradientParamPreview';
import { runWorkingPipeline, channelsOfConfig, isIdentityAdjust } from '../core/workingPipeline';
import type { Channels, GeneratorParams } from '../core/generatorPipeline';
import { DEFAULT_CURVE_SPACE } from '../core/curveSpaces';
import {
  useGeneratorStore,
  readAdjustParamsNow,
  readSampledCurvesNow,
  fitChannelsToTracks,
  setGeneratorSlice,
  MAIN_DEFAULTS,
} from './generatorStore';
import { paramEdit, paramGroup } from './paramUndoBracket';
import { commitPaint, discardPaint, hasPainting, endPaintSession } from './paintStore';

export type StudioFace = 'stops' | 'curves' | 'adjust' | 'paint';
export const STUDIO_FACES: { face: StudioFace; label: string; title: string }[] = [
  { face: 'stops', label: 'Stops', title: 'Edit the stops' },
  { face: 'curves', label: 'Curves', title: 'Shape the lightness, chroma and hue curves' },
  { face: 'adjust', label: 'Adjust', title: 'Hue, chroma, contrast, lightness, posterize, scale, mirror, phase, noise' },
  { face: 'paint', label: 'Paint', title: 'Paint on the gradient — brushes, blend modes, smudge, soften, sharpen, clone' },
];

/** A DDFS gradient param. */
export interface StudioTarget {
  featureId: string;
  paramKey: string;
}

/** The panel's manifest id (`installGradientStudio`'s `gradientStudioPanelEntry`). */
export const STUDIO_PANEL_ID = 'GradientStudio';

interface StudioState {
  target: StudioTarget | null;
  face: StudioFace;
}

export const useGradientStudio = create<StudioState>(() => ({ target: null, face: 'stops' }));

export const sameTarget = (a: StudioTarget | null | undefined, b: StudioTarget | null | undefined): boolean =>
  !!a && !!b && a.featureId === b.featureId && a.paramKey === b.paramKey;

// --- the param -----------------------------------------------------------------------------------

type AnyStore = Record<string, unknown>;

/** The param's raw value (a legacy stop array or a config), or undefined. */
export const readTargetRaw = (t: StudioTarget): GradientStop[] | GradientConfig | undefined =>
  ((useEngineStore.getState() as unknown as AnyStore)[t.featureId] as AnyStore | undefined)?.[t.paramKey] as GradientStop[] | GradientConfig | undefined;

/** A raw param value as a config of either form — a legacy stop array reads the way the editor
 *  reads it (sRGB, OkLCh blend), so a Studio write of it bakes the same texture. */
export const toStudioConfig = (raw: GradientStop[] | GradientConfig | undefined | null): GradientConfig | null => {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length ? { stops: raw, colorSpace: 'srgb', blendSpace: 'oklab' } : null;
  return coerceGradientConfig(raw);
};

export const readTargetConfig = (t: StudioTarget): GradientConfig | null => toStudioConfig(readTargetRaw(t));

/** Write the param through its feature's setter — the inline editor's route. */
export const writeTarget = (t: StudioTarget, config: GradientConfig | GradientStop[]): void => {
  const setter = (useEngineStore.getState() as unknown as Record<string, unknown>)[`set${t.featureId.charAt(0).toUpperCase()}${t.featureId.slice(1)}`];
  if (typeof setter === 'function') (setter as (p: Record<string, unknown>) => void)({ [t.paramKey]: config });
};

/**
 * RENDER-ONLY: send `config`'s texture to the param's uniform without touching the store — what
 * the setter's own emit does (grep `isGradientBuffer` in store/createFeatureSlice.ts) — and publish
 * it for the other surfaces that draw the param (`components/gradient/gradientParamPreview.ts`).
 * `null` re-sends the stored value and clears the published preview, i.e. ends a preview.
 */
export const previewGradient = (t: StudioTarget, config: GradientConfig | null): void => {
  // every other surface that draws this param shows the preview too (the sidebar editor's bar, the
  // section header strip) — or it would disagree with the fractal until the bake
  setGradientParamPreview(t.featureId, t.paramKey, config);
  const def = featureRegistry.get(t.featureId)?.params?.[t.paramKey] as { uniform?: string; noAccumReset?: boolean } | undefined;
  if (!def?.uniform) return;
  const value = config ?? readTargetRaw(t);
  if (!value) return;
  FractalEvents.emit('uniform', { key: def.uniform, value: { isGradientBuffer: true, buffer: generateGradientTextureBuffer(value) }, noAccumReset: !!def.noAccumReset });
};

/** What the Studio calls the gradient it is on: the send target that edits it ("Coloring · Layer
 *  1"), else the param's own label, else its key. */
export const targetLabel = (t: StudioTarget, sendTargets: { label: string; editsParam?: StudioTarget }[]): string => {
  const st = sendTargets.find((s) => sameTarget(s.editsParam, t));
  if (st) return st.label;
  const def = featureRegistry.get(t.featureId);
  const p = def?.params?.[t.paramKey] as { label?: string } | undefined;
  return p?.label ? `${def?.name ?? t.featureId} · ${p.label}` : t.paramKey;
};

// --- the derive ----------------------------------------------------------------------------------

export interface StudioDerived {
  base: Channels;
  final: Channels;
  /** What the gradient looks like with the live face applied. */
  ramp: RGB[];
  /** `ramp` as a RAMP config in the param's colour space — the preview's texture, exact and cheap
   *  (no stop fit), or the source itself when nothing applies. */
  preview: GradientConfig;
  /** Nothing applies: the face would bake nothing. */
  passthrough: boolean;
}

/**
 * The live result over `src`. `fit` false (a preview) skips the stop fit: the pipeline's held-fit
 * path turns a held RAMP config into the live ramp for one encode (grep `recolourHeldFit`), which is
 * exact — so the preview is never the coarser knots a fit would give. `fit` true is the bake.
 */
const runStudio = (src: GradientConfig, params: GeneratorParams, curves: Partial<Channels> | null, fit: boolean) => {
  const g = useGeneratorStore.getState();
  const held: GradientConfig | null = fit ? null : { stops: [], ramp: '', colorSpace: src.colorSpace, blendSpace: src.blendSpace };
  return runWorkingPipeline(channelsOfConfig(src), params, curves, g.noiseSeed, g.detail, src, [], held, !g.tracksEdited);
};

export const deriveStudio = (src: GradientConfig, params: GeneratorParams, curves: Partial<Channels> | null): StudioDerived => {
  const core = runStudio(src, params, curves, false);
  const same = core.passthrough || core.restated;
  return { base: core.base, final: core.final, ramp: core.ramp, preview: same ? src : core.config, passthrough: same };
};

/** The source's display ramp (what Paint paints on). */
export const displayRampOf = (c: GradientConfig): RGB[] => gradientDisplayRamp(c);

// --- the faces -----------------------------------------------------------------------------------

/** Anything a bake would write: live curves, or dials off the identity. */
const pending = (): boolean => !!readSampledCurvesNow() || !isIdentityAdjust(readAdjustParamsNow());

/** The curves axes are not sticky — back to the default once no tracks are left (the Explorer's
 *  `resetBareCurveSpace`). */
const bareCurves = { tracks: null, curvesOn: false, tracksEdited: false, curveSpace: DEFAULT_CURVE_SPACE } as const;

/**
 * BAKE: the live Curves / Adjust result becomes the param, the dials reset and the curves go — one
 * undo entry. An untouched fit with the dials at rest bakes nothing and is dropped OUTSIDE undo (it
 * was fitted outside undo — see `enterCurves`). A no-op with nothing pending.
 */
export const bakeStudio = (): void => {
  const t = useGradientStudio.getState().target;
  const src = t && readTargetConfig(t);
  if (!t || !src || !pending()) return;
  const core = runStudio(src, readAdjustParamsNow(), readSampledCurvesNow(), true);
  if (core.passthrough || core.restated) {
    useGeneratorStore.setState(bareCurves);
    return;
  }
  const out: GradientConfig = { ...core.config, colorSpace: src.colorSpace };
  paramGroup(() => {
    writeTarget(t, out);
    setGeneratorSlice({ ...MAIN_DEFAULTS });
    useGeneratorStore.setState(bareCurves);
  });
};

/** Entering Curves: fit the param's gradient, OUTSIDE undo (no entry for looking in), or turn on
 *  curves that are already there. The face's own mount fit is the fallback and finds them. */
const enterCurves = (t: StudioTarget): void => {
  const src = readTargetConfig(t);
  const g = useGeneratorStore.getState();
  if (!g.tracks && src) useGeneratorStore.setState({ tracks: fitChannelsToTracks(channelsOfConfig(src), g.detail, g.smooth, g.curveSpace), curvesOn: true, tracksEdited: false });
  else if (g.tracks && !g.curvesOn) useGeneratorStore.setState({ curvesOn: true });
};

/** Leaving a face commits it: Paint applies, Curves / Adjust bake. */
const leaveFace = (face: StudioFace): void => {
  if (face === 'paint') {
    commitPaint();
    endPaintSession();
  } else if (face === 'curves' || face === 'adjust') bakeStudio();
};

/** Open a face (the same one again does nothing). The one you leave commits. */
export const setStudioFace = (next: StudioFace): void => {
  const { face, target } = useGradientStudio.getState();
  if (face === next) return;
  leaveFace(face);
  if (next === 'curves' && target) enterCurves(target);
  useGradientStudio.setState({ face: next });
};

/**
 * Esc on a face: that face's own cancel, then back to Stops. Adjust with dials moved → `resetAdjust`
 * (Adjust's Cancel, one entry); an EDITED Curves → the curves dropped (one entry); Paint with
 * strokes → `discardPaint` (nothing was written, no entry); anything untouched leaves as a tab does.
 */
export const cancelStudioFace = (): void => {
  const { face } = useGradientStudio.getState();
  const g = useGeneratorStore.getState();
  if (face === 'adjust' && !isIdentityAdjust(readAdjustParamsNow())) g.resetAdjust();
  else if (face === 'curves' && g.tracks && g.tracksEdited) paramEdit(() => useGeneratorStore.setState(bareCurves));
  else if (face === 'paint' && hasPainting()) discardPaint();
  setStudioFace('stops');
};

/** Point the Studio at `t` (committing the face on the old one) and show it. */
export const openGradientStudio = (t: StudioTarget, show: () => void): void => {
  const s = useGradientStudio.getState();
  if (!sameTarget(s.target, t)) {
    leaveFace(s.face);
    useGradientStudio.setState({ target: { featureId: t.featureId, paramKey: t.paramKey } });
    if (s.face === 'curves') enterCurves(t);
  }
  show();
};

/** The Studio window closed: commit the face and come back on Stops next time. */
export const closeGradientStudio = (): void => {
  leaveFace(useGradientStudio.getState().face);
  useGradientStudio.setState({ face: 'stops' });
};

// --- the window ----------------------------------------------------------------------------------

/** First-open width — the Curves plot and Adjust's three bins across want it. The height follows
 *  the card and its tray (the panel is bare chrome, `autoHeight`). */
const FIRST_WIDTH = 860;

type Panels = Record<string, { isOpen?: boolean; floatSize?: unknown }>;
type UiActions = {
  panels?: Panels;
  movePanel?: (id: string, zone: 'float' | 'left' | 'right') => void;
  togglePanel?: (id: string, open?: boolean) => void;
  setFloatPosition?: (id: string, x: number, y: number) => void;
  setFloatSize?: (id: string, w: number, h: number) => void;
};

/** Show the Studio. It only ever floats (bare chrome); the first time it opens FIRST_WIDTH wide,
 *  centred, near the top — the tray grows downwards from the card. */
const revealStudio = (): void => {
  const st = useEngineStore.getState() as unknown as UiActions;
  const placed = !!st.panels?.[STUDIO_PANEL_ID]?.floatSize;
  st.movePanel?.(STUDIO_PANEL_ID, 'float');
  if (!placed && typeof window !== 'undefined') {
    const w = Math.min(FIRST_WIDTH, window.innerWidth - 40);
    st.setFloatSize?.(STUDIO_PANEL_ID, w, 0);
    st.setFloatPosition?.(STUDIO_PANEL_ID, Math.max(20, Math.round((window.innerWidth - w) / 2)), 72);
  }
  st.togglePanel?.(STUDIO_PANEL_ID, true);
};

/** Point the Studio at a gradient param and show it — what the editor's popout does. */
export const openStudioOn = (t: StudioTarget): void => openGradientStudio(t, revealStudio);

