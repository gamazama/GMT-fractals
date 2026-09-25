/**
 * rampMode — what the Stops editor (`components/AdvancedGradientEditor.tsx`) and its shared
 * menu (`gradientActions.ts`) do with a RAMP gradient (ADR-0122: `stops: []` + `ramp`, 256 sRGB
 * texels, no stop layer).
 *
 * The editor has two modes, decided by the VALUE it is handed and nothing else:
 *   - a STOP gradient (or a legacy bare `GradientStop[]`) — exactly the editor it always was;
 *   - a RAMP gradient — the bar paints the texels, there are no knots, no knot hit-testing, no
 *     selection marquee, no paste, no blend-space chooser (blend is inert on a ramp), and an
 *     "Add stops" action takes its place when the host can supply one.
 *
 * Every decision that mode makes is a pure function here, so a node harness can pin it without
 * mounting React: which affordances exist, what an edit emits, what the bar paints, and how the
 * menu's Invert acts on texels. The component reads these and adds only JSX.
 *
 * Integration seams:
 *   - "Add stops" reaches the fitter (which lives in `palette/`, which engine-core cannot import)
 *     through the editor's `onAddStops` prop, or failing that the `gradientStopFitter` slot the
 *     palette host fills in `registerPaletteUI`.
 *   - Colour reads go through `gradientDisplayRamp` (the one display reader, `utils/colorUtils`).
 *
 * Pitfalls:
 *   - An edit that emits NO stops on a ramp value must keep the ramp (`editorEmitConfig`). The
 *     editor's knot array is `[]` on a ramp, so an output-space toggle used to emit `{ stops: [] }`
 *     with no `ramp` — a config of neither form, which renders greyscale and is dropped at every
 *     load boundary.
 *   - `editorBarSource` must prefer the host's `previewRamp`, then a ramp-form `previewConfig` or
 *     value, and only then stops — a ramp config walked as stops paints black (strip chrome) or
 *     greyscale (full chrome).
 *
 * @invariant On a ramp value the editor offers no knots, no knot insertion, no selection marquee,
 *   no clipboard and no blend chooser; an empty-stop emit keeps the ramp; the bar paints the
 *   texels in both chromes; Invert reverses the texels; and a stop value is untouched by all of
 *   it — proven by: npm run test:gradient-rampmode ("ramp: no knots, no insertion, no marquee",
 *   "an output-space emit on a ramp keeps the ramp", "strip chrome paints the zebra's texels",
 *   "Invert on a ramp reverses the texels", "stop menu unchanged"). Falsified 2026-09-14, see the
 *   harness header.
 * @see docs/adr/0122-the-ramp-is-the-gradient.md
 */

import type { GradientConfig, GradientStop, ColorSpaceMode, BlendColorSpace } from '../../types';
import { isRampGradient, decodeRampBytes, encodeRampBuffer, RAMP_TEXELS } from '../../utils/gradientRamp';
import { gradientDisplayRamp, renderStopsToRamp, sampleSortedStops, type RGB } from '../../utils/colorUtils';

export type EditorValue = GradientStop[] | GradientConfig;
export type RampConfig = GradientConfig & { ramp: string };

/** The value as a ramp gradient, or null (a stop gradient, a legacy array, anything malformed). */
export const rampOfEditorValue = (value: EditorValue | null | undefined): RampConfig | null =>
  value && !Array.isArray(value) && isRampGradient(value) ? value : null;

export interface EditorAffordances {
  /** Knot markers and bias handles are drawn. */
  knots: boolean;
  /** A press on the knot track inserts a knot. */
  addKnot: boolean;
  /** A drag on the bar draws a selection rectangle (the host's marquee-escape drag is separate). */
  selectMarquee: boolean;
  /** The imperative handle may select / insert / recolour a knot (`selectAt`, `dropColourAt`),
   *  the knot track accepts a dropped colour, and the keyboard nudges / deletes a selection. */
  knotEdits: boolean;
  /** Copy Gradient / Paste Gradient. */
  clipboard: boolean;
  /** The blend-space chooser has something to act on. */
  blendSpace: boolean;
  /** Double / Distribute / Delete / Bias Handles in the menu. */
  stopActions: boolean;
  /** The "Add stops" action is offered. */
  addStops: boolean;
}

/**
 * What the editor lets a pointer do. `knotsStale` is the stop-mode rule the editor already had
 * (the bar shows something other than the knots — see `knotsStale` in the editor); on a stop
 * value this reproduces it exactly and adds nothing. `takenOver`: a host tool holds the bar and
 * the knot track (the editor's `stripTakeover`, GE v2's Paint face), so every knot gesture stands
 * down whatever the value is; the menu's document actions stay.
 */
export const editorAffordances = (o: { isRamp: boolean; knotsStale: boolean; canAddStops: boolean; takenOver?: boolean }): EditorAffordances => ({
  knots: !o.isRamp && !o.knotsStale && !o.takenOver,
  addKnot: !o.isRamp && !o.knotsStale && !o.takenOver,
  selectMarquee: !o.isRamp && !o.takenOver,
  knotEdits: !o.isRamp && !o.takenOver,
  clipboard: !o.isRamp,
  blendSpace: !o.isRamp,
  stopActions: !o.isRamp,
  addStops: o.isRamp && o.canAddStops,
});

/**
 * The config an edit emits. A stop edit emits the stops, as it always did. An edit that leaves
 * NO stops while the value is a ramp (the output-space toggle, a blend pick — the only things
 * that can run with an empty knot array) keeps the ramp and changes only the spaces.
 */
export const editorEmitConfig = (
  stops: GradientStop[],
  colorSpace: ColorSpaceMode,
  blendSpace: BlendColorSpace,
  rampValue: RampConfig | null,
): GradientConfig =>
  rampValue && stops.length === 0
    ? { ...rampValue, stops: [], colorSpace, blendSpace }
    : { stops, colorSpace, blendSpace };

/** What the bar is painted from. */
export type BarSource = { kind: 'ramp'; texels: RGB[] } | { kind: 'stops'; stops: GradientStop[] };

/**
 * Pick the bar's source, in the editor's order of precedence:
 *   0. `stopsPreview` — stops the editor itself is PREVIEWING and has not committed (the Reduce
 *      stops popup's hovered / chosen amount, 2026-09-23). It outranks the host's previews: the
 *      user is looking at a candidate for THIS gradient and nothing else may paint over it;
 *   1. the host's `previewRamp` (strip chrome only — pass undefined for full chrome);
 *   2. a RAMP-form gradient on screen — `previewConfig` when given, else the value — as texels;
 *   3. stops: `previewConfig.stops` when given, else the editor's knots (what it always did).
 */
export const editorBarSource = (o: {
  stopsPreview?: GradientStop[] | null;
  previewRamp?: RGB[] | null;
  previewConfig?: GradientConfig;
  value: EditorValue;
  knots: GradientStop[];
}): BarSource => {
  if (o.stopsPreview && o.stopsPreview.length > 0) return { kind: 'stops', stops: o.stopsPreview };
  if (o.previewRamp && o.previewRamp.length > 1) return { kind: 'ramp', texels: o.previewRamp };
  const shown = o.previewConfig ?? (Array.isArray(o.value) ? null : o.value);
  if (shown && isRampGradient(shown)) return { kind: 'ramp', texels: gradientDisplayRamp(shown) };
  return { kind: 'stops', stops: o.previewConfig?.stops ?? o.knots };
};

/**
 * Strip chrome: one RGBA pixel per display column. A ramp upsamples NEAREST (1536 / 256 is a
 * clean 6 px run per texel, so a step edge stays hard); stops sample per pixel, sorted once.
 */
export const paintStripPixels = (width: number, src: BarSource, blend: BlendColorSpace): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(width * 4);
  if (src.kind === 'ramp') {
    const n = src.texels.length;
    for (let x = 0; x < width; x++) {
      const c = src.texels[Math.min(n - 1, Math.floor((x * n) / width))];
      out[x * 4] = c.r; out[x * 4 + 1] = c.g; out[x * 4 + 2] = c.b; out[x * 4 + 3] = 255;
    }
    return out;
  }
  const sorted = [...src.stops].sort((a, b) => a.position - b.position);
  for (let x = 0; x < width; x++) {
    // `sampleSortedStops`, NOT `sampleStops`: the latter copies and re-sorts per call.
    const c = sampleSortedStops(sorted, x / (width - 1), blend, 'srgb');
    out[x * 4] = c.r; out[x * 4 + 1] = c.g; out[x * 4 + 2] = c.b; out[x * 4 + 3] = 255;
  }
  return out;
};

/** Full chrome: the 256-texel canvas. A ramp is its texels (nearest-resampled if a host ever
 *  hands another length); stops are the engine sampler's ramp, as before. */
export const barTexels256 = (src: BarSource, blend: BlendColorSpace): RGB[] => {
  if (src.kind === 'stops') return renderStopsToRamp(src.stops, blend);
  const n = src.texels.length;
  if (n === RAMP_TEXELS) return src.texels;
  return Array.from({ length: RAMP_TEXELS }, (_, i) => src.texels[Math.min(n - 1, Math.floor((i * n) / RAMP_TEXELS))]);
};

/** The menu's Invert on a ramp: the texels in reverse order (texel 255 becomes texel 0). */
export const reverseRampGradient = (cfg: RampConfig): RampConfig => {
  const bytes = decodeRampBytes(cfg.ramp);
  if (!bytes) return cfg;
  const out = new Uint8Array(RAMP_TEXELS * 3);
  for (let i = 0; i < RAMP_TEXELS; i++) {
    const j = (RAMP_TEXELS - 1 - i) * 3;
    out[i * 3] = bytes[j]; out[i * 3 + 1] = bytes[j + 1]; out[i * 3 + 2] = bytes[j + 2];
  }
  return { ...cfg, stops: [], ramp: encodeRampBuffer(out, 3) };
};

/**
 * Do two configs describe the same gradient BODY (stops or ramp — not the spaces)? A ramp is
 * compared by its texel string; stops by position, colour, bias and interpolation, in order.
 * Two ramp gradients both have `stops: []`, so a stop-only comparison calls every pair equal.
 */
export const sameGradientBody = (a: GradientConfig, b: GradientConfig): boolean => {
  const as = Array.isArray(a.stops) ? a.stops : [];
  const bs = Array.isArray(b.stops) ? b.stops : [];
  if (as.length === 0 || bs.length === 0) return as.length === bs.length && (a.ramp ?? '') === (b.ramp ?? '');
  return as.length === bs.length && as.every((s, i) =>
    s.position === bs[i].position && s.color === bs[i].color &&
    (s.bias ?? 0.5) === (bs[i].bias ?? 0.5) && (s.interpolation ?? 'linear') === (bs[i].interpolation ?? 'linear'));
};
