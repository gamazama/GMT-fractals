/**
 * workingPipeline — the pure core of the Gradient Explorer v2 "Working" gradient.
 *
 * v2 runs ONE pipeline over whatever gradient is in the working INPUT slot, whichever
 * source produced it (plans/ge-v2-design.md §2):
 *
 *     input (base channels) → Shape (curve override) → Adjust (global chain) → ramp / stops
 *
 * It is the existing generator pipeline with the two-source mix collapsed: `buildGradientRamp`
 * is called with the SAME channels in both slots and no slot modifiers, so the mix is the
 * identity and only the curve override + the global modifier chain act. `buildGradientRamp`
 * stays the only ramp path (the June invariant, unchanged).
 *
 * Inputs are represented by `WorkingInput`:
 *   • `empty`    — nothing yet (first load; the hero stays hidden until the first pick).
 *   • `build`    — live: the Build recipe base (post-mix / ColorBox), read by the store.
 *   • `extract`  — live: the Extract result ramp, read by the store.
 *   • `gradient` — a fixed gradient handed in by Use (Browse pick, a recent item, a share).
 *   • `stops`    — the editable stops document (paletteEditorStore) after a bake.
 * The store resolves each kind to base channels; this module only knows channels.
 *
 * Stops handling (June T5 decision): when the input already carries its own config (`gradient`
 * or `stops`) AND the pipeline is the identity (no curves, Adjust at defaults), the config is
 * passed through VERBATIM and the ramp is rendered straight from it — so a picked 4-stop
 * favourite stays a 4-stop favourite instead of coming back as dozens of fitted knots, and a
 * RAMP gradient (ADR-0122: `stops: []` + `ramp`) comes back as the same 256 texels.
 *
 * OUTPUT FORM under a real transform (ADR-0122 Decision 3). Which of the two config forms the
 * pipeline hands back is decided by what came IN, not by what came out:
 *   • the input HAD STOPS (a stop config, or a live Mix whose sources had stops → `seedStops`):
 *     it keeps a stop layer — `fitRampToStops` at the Detail budget, exactly as before. NOT
 *     `rampToGradientConfig(…, { cap: Infinity })`: that drops to a ramp the moment the fit runs
 *     out of budget, and "a gradient that already has stops keeps them" is the owner's rule.
 *   • it had none (a ramp gradient, Extract, a seedless Mix): an AUTOMATIC fit —
 *     `rampToGradientConfig` at the Detail budget under `STOP_LAYER_CAP`, so a cheap result
 *     gets stops and a dense one stays an exact ramp.
 * Adding stops to a ramp on purpose is not this path: `addStopsToConfig` below.
 *
 * The BASE is read through `gradientDisplayRamp`, never `config.stops`: the Curves face fits its
 * keys from this base, and before ADR-0122 a dense ramp's base was the render of its (failed)
 * stop fit — 8ZEBBOW2's Curves drew black although its real texels fit to ΔE 0.002.
 *
 * @see docs/adr/0111-working-pipeline-input-slot.md
 * @see docs/adr/0122-the-ramp-is-the-gradient.md
 *
 * @invariant With `curves === null` and `isIdentityAdjust(params)`, `runWorkingPipeline`
 *   returns the `verbatim` config by identity (`===`) and a ramp equal to
 *   `gradientDisplayRamp(verbatim)`, for BOTH config forms — proven by:
 *   `npx tsx debug/test-palette-working.mts` ("passthrough: config is the verbatim object",
 *   "passthrough: ramp is the direct render", "ramp passthrough: config is the verbatim ramp
 *   object", "ramp passthrough: ramp is the texels").
 * @invariant Under a real transform the output FORM follows the input: no stops and no seeds in
 *   → stops only when the fit finishes within min(Detail budget, STOP_LAYER_CAP), else the ramp;
 *   stops or seeds in → always stops, at most the Detail budget — proven by:
 *   `npx tsx debug/test-palette-working.mts` ("dense ramp + Adjust → a ramp", "cheap ramp +
 *   Adjust → stops", "stop input keeps stops past the cap", "stop input keeps stops when the
 *   budget runs out", "seeded Mix keeps stops past the cap").
 * @invariant A ramp gradient's base is its texels, so the Curves fit reproduces them — proven by:
 *   `npx tsx debug/test-palette-working.mts` ("Curves over a ramp zebra reproduces the texels").
 */

import {
  buildGradientRamp,
  decomposeRamp,
  DEFAULT_SLOT_MODS,
  scaleOf,
  type Channels,
  type GeneratorParams,
} from './generatorPipeline';
import { gradientDisplayRamp, rgbToHex } from './gmtGradient';
import { fitRampToStops, rampToGradientConfig } from './stopFit';
import { encodeRamp } from '../../utils/gradientRamp';
import type { GradientConfig, GradientStop } from '../../types';
import type { RGB } from './oklab';
import type { CatalogOrigin } from './catalogOrigin';

export type SeedStop = { position: number; interpolation?: GradientStop['interpolation']; bias?: number };

export type WorkingInput =
  | { kind: 'empty' }
  /** `seeds`: the stops (position + interpolation) of the gradients being mixed (additive,
   *  2026-09-07) — the fit keeps them so a bake does not walk the stops; absent = the plain fit. */
  | { kind: 'build'; seeds?: SeedStop[] }
  | { kind: 'extract' }
  /** `origin`: the catalogue provenance a wall pick stamped (2026-09-13, additive) — honoured by
   *  an export only while the output still has the key it was stamped with. */
  | { kind: 'gradient'; config: GradientConfig; name: string; source: string; origin?: CatalogOrigin }
  | { kind: 'stops' };

export const WORKING_INPUT_KINDS = ['empty', 'build', 'extract', 'gradient', 'stops'] as const;

/** Adjust is the identity when every global modifier sits at its default. Noise at 0 makes
 *  its sub-dials irrelevant; bands ≤ 1 is "off" by the pipeline's own rule. Scale (`repeats`)
 *  is the identity at exactly 1 — since it went continuous (2026-09-13) a scale below 1 is a
 *  window onto the gradient, not "off" — and a value the pipeline reads as 1 (≤ 0, non-finite)
 *  counts too (`scaleOf`). */
export const isIdentityAdjust = (p: GeneratorParams): boolean =>
  !p.reverse &&
  (p.bands | 0) <= 1 &&
  scaleOf(p.repeats) === 1 &&
  (p.lightness ?? 0) === 0 &&
  p.phase === 0 &&
  !p.mirror &&
  p.hueRotate === 0 &&
  p.chroma === 1 &&
  p.contrast === 1 &&
  p.noise === 0;

/**
 * Base channels of a config of EITHER form: its display ramp (`gradientDisplayRamp` — a stop
 * gradient's render, a ramp gradient's texels), decomposed. Always DISPLAY space ('srgb'): a
 * config's `colorSpace` is a GMT texture hint ('linear' means "the shader wants linear-light
 * bytes"), and decomposing linear bytes as if they were sRGB darkens everything downstream —
 * the palette swatches read darker than the editor strip, which renders display space itself
 * (owner review 2026-09-03).
 */
export const channelsOfConfig = (c: GradientConfig): Channels => decomposeRamp(gradientDisplayRamp(c));

/** Base channels of a bare ramp (an Extract result, an imported file). */
export const channelsOfRamp = (ramp: RGB[]): Channels => decomposeRamp(ramp);

export interface WorkingDerivedCore {
  base: Channels;
  ramp: RGB[];
  /** Un-clipped post-chain channels (curve baking reads these, not the clipped ramp). */
  final: Channels;
  config: GradientConfig;
  /** True when the config is the verbatim input (identity pipeline over a `gradient` / `stops`
   *  input — either config form). */
  passthrough: boolean;
  /** True when the only thing live is an UNTOUCHED Curves fit over an input with its own config:
   *  `config` is that config (by identity), `ramp` is still the curves' own drawing. See
   *  `runWorkingPipeline`'s `curvesUntouched`. Never true together with `passthrough`. */
  restated: boolean;
}

/** The stop budget the Generator uses: `detail` (2..10) buys fidelity. */
export const stopBudget = (detail: number): { targetDE: number; maxStops: number } => {
  const k = (11 - detail) / 3;
  return { targetDE: Math.max(0.004, 0.012 * k), maxStops: Math.round(32 + detail * 12) };
};

/**
 * A HELD fit, re-coloured from the live ramp: the same stops in the same places, carrying the
 * colours the gradient has right now.
 *
 * Holding the fit during a drag must not freeze the GRADIENT (owner, 2026-09-11: "the gradient
 * needs to respond live … it is only the knots build and fit that we don't need during a
 * drag"). Handing the held config straight back did freeze it, and in a way that looked like
 * half the app was broken: the palette swatches sample `ramp` and kept moving, while the hero's
 * bar paints from `config` — through `previewConfig` on an edited document, through `value`
 * otherwise — and so sat still.
 *
 * Re-colouring is the cheap half of a fit and the half that carries the motion. WHERE each stop
 * sits, and its bias and interpolation, are what the expensive refinement decides and what the
 * owner asked to defer; WHAT colour sits there is one array lookup. So the bar is exact at every
 * stop and interpolated between them by the same rules the last fit chose — visibly live,
 * a little coarser than the settled render, and replaced by a real fit on release.
 *
 * A held RAMP gradient (ADR-0122) has no stops to re-colour: it becomes the live ramp, which is
 * exact and costs one encode.
 *
 * Returns `held` ITSELF when no colour moved, so a bracket that opens without a value change
 * costs no re-render.
 */
const recolourHeldFit = (held: GradientConfig, ramp: RGB[]): GradientConfig => {
    if (ramp.length === 0) return held;
    if (held.stops.length === 0) {
        if (ramp.length !== 256) return held;
        const next = encodeRamp(ramp);
        return next === held.ramp ? held : { ...held, stops: [], ramp: next };
    }
    const last = ramp.length - 1;
    let changed = false;
    const stops = held.stops.map((s) => {
        const c = ramp[Math.round(Math.max(0, Math.min(1, s.position)) * last)];
        const color = rgbToHex(c);
        if (color === s.color) return s;
        changed = true;
        return { ...s, color };
    });
    return changed ? { ...held, stops } : held;
};

/**
 * The output config of a real transform, in the form ADR-0122 picks (see the file header).
 * `hadStops`: the input carried a stop layer — its own stops, or seeds from the gradients a Mix
 * blends. Exported for the harness.
 */
export const fitWorkingOutput = (ramp: RGB[], detail: number, hadStops: boolean, seedStops: SeedStop[] = []): GradientConfig =>
  hadStops
    ? fitRampToStops(ramp, { ...stopBudget(detail), seedStops, fitBias: true })
    : rampToGradientConfig(ramp, { ...stopBudget(detail), seedStops, fitBias: true });

/**
 * "Add stops" (ADR-0122 Decision 3) — the EXPLICIT, uncapped fit. A config that already has
 * stops comes back by identity; a ramp gradient is fitted at the Detail budget and always gets
 * stops: the user asked for them, so `STOP_LAYER_CAP` does not apply. Its `colorSpace` is kept (a
 * catalogue pick is 'linear', and adding knots must not change what the texture bakes); the fit
 * reads the DISPLAY ramp, as every palette fit does.
 */
export const addStopsToConfig = (config: GradientConfig, detail: number): GradientConfig => {
  if (config.stops.length > 0) return config;
  const fitted = fitRampToStops(gradientDisplayRamp(config), { ...stopBudget(detail), fitBias: true });
  return { ...fitted, colorSpace: config.colorSpace ?? 'srgb' };
};

/**
 * Run the pipeline. `verbatim` is the input's own config when it has one (`gradient` /
 * `stops` kinds), else null; it is returned untouched when nothing would change it. Whether a
 * real transform's output keeps stops is read from `verbatim` and `seedStops` — see
 * `fitWorkingOutput`.
 *
 * AN UNTOUCHED CURVES FIT IS THE SOURCE RESTATED (`curvesUntouched`, the generator store's
 * `!tracksEdited`). Opening the Curves face fits keys to the gradient; until one is edited,
 * leaving the face drops the fit and bakes nothing (the shell's `openTray`). But the fit is
 * lossy, and re-fitting its drawing back into stops gives a PARAPHRASE of the gradient's stops,
 * not the stops — measured 2026-09-23 on the catalogue's `thamesville-00`: two of five knots one
 * level off and a bias 0.5 → 0.35. Handing that paraphrase out as `config` made every consumer
 * treat an untouched visit as a new gradient: the hero's stops editor swapped knot lists on the
 * way in and out of the face, so a stop selected with Curves open was dropped the moment the face
 * went (`smoke:ge-tray` [14], red once a catalogue change put a picked preview under the wall
 * click before it — over an edited stops document the hero never shows the output's knots, so
 * it had passed); `beginEdit` baked the paraphrase; Recent rewrote its copy of the gradient.
 * So with Adjust at identity and the fit untouched, `config` is `verbatim` itself and `restated`
 * says so; `ramp` stays the curves' drawing (the bar and the swatches show the face live, the
 * split and the bake / cancel halves are unchanged).
 *
 * @invariant With `isIdentityAdjust(params)`, live curves and `curvesUntouched`, the config is
 *   `verbatim` by identity and `restated` is set; the same curves EDITED (or with Adjust off
 *   identity) give a fitted config instead — proven by: `npx tsx debug/test-palette-working.mts`
 *   ("restated: an untouched fit hands back the input's own config", "restated: an edited fit is
 *   a fitted config"). The wiring (the store passes `!tracksEdited`, `beginEdit` folds a clone)
 *   is the same harness's store half ("restated: beginEdit folds the gradient's own stops") and,
 *   in the browser, `npm run smoke:ge-tray` [14] ("could not get back to the inspector").
 */
export const runWorkingPipeline = (
  base: Channels,
  params: GeneratorParams,
  curves: Partial<Channels> | null,
  noiseSeed: number,
  detail: number,
  verbatim: GradientConfig | null,
  seedStops: SeedStop[] = [],
  /** A previous fit to REUSE instead of fitting (a slider is mid-drag — see useWorkingDerived).
   *  Its stops are re-coloured from the live ramp, never handed back verbatim: the positions
   *  are what we are deferring, the colours are what makes the bar move. See `recolourHeldFit`. */
  holdFit?: GradientConfig | null,
  /** The curves are a fit nobody has edited yet (see above): with Adjust at identity the output
   *  config is `verbatim`, not a re-fit of their drawing. */
  curvesUntouched = false): WorkingDerivedCore => {
  const identity = isIdentityAdjust(params);
  const passthrough = !!verbatim && !curves && identity;
  const restated = !!verbatim && !!curves && curvesUntouched && identity;
  const built = buildGradientRamp(
    base,
    base,
    DEFAULT_SLOT_MODS,
    DEFAULT_SLOT_MODS,
    { ...params, mixL: 0, mixC: 0, mixH: 0 },
    curves,
    noiseSeed,
  );
  if (passthrough && verbatim) {
    return {
      base,
      ramp: gradientDisplayRamp(verbatim),
      final: built.final,
      config: verbatim,
      passthrough: true,
      restated: false,
    };
  }
  if (restated && verbatim) return { base, ramp: built.ramp, final: built.final, config: verbatim, passthrough: false, restated: true };
  return {
    base,
    ramp: built.ramp,
    final: built.final,
    config: holdFit
      ? recolourHeldFit(holdFit, built.ramp)
      : fitWorkingOutput(built.ramp, detail, (!!verbatim && verbatim.stops.length > 0) || seedStops.length > 0, seedStops),
    passthrough: false,
    restated: false,
  };
};
