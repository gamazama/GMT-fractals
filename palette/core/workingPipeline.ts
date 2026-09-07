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
 * Stops handling (June T5 decision): when the input already carries stops (`gradient` or
 * `stops`) AND the pipeline is the identity (no curves, Adjust at defaults), the config is
 * passed through VERBATIM and the ramp is rendered straight from those stops — so a picked
 * 4-stop favourite stays a 4-stop favourite instead of coming back as dozens of fitted knots.
 * Any real transform fits the output ramp to stops with the detail-scaled budget the
 * Generator uses.
 *
 * @see docs/adr/0111-working-pipeline-input-slot.md
 *
 * @invariant With `curves === null` and `isIdentityAdjust(params)`, `runWorkingPipeline`
 *   returns the `verbatim` config by identity (`===`) and a ramp equal to
 *   `renderStopsToRamp(verbatim…)` — proven by: `npx tsx debug/test-palette-working.mts`
 *   ("passthrough: config is the verbatim object", "passthrough: ramp is the direct render").
 */

import {
  buildGradientRamp,
  decomposeRamp,
  DEFAULT_SLOT_MODS,
  type Channels,
  type GeneratorParams,
} from './generatorPipeline';
import { renderStopsToRamp } from './gmtGradient';
import { fitRampToStops } from './stopFit';
import type { GradientConfig, GradientStop } from '../../types';
import type { RGB } from './oklab';

export type SeedStop = { position: number; interpolation?: GradientStop['interpolation'] };

export type WorkingInput =
  | { kind: 'empty' }
  /** `seeds`: the stops (position + interpolation) of the gradients being mixed (additive,
   *  2026-09-07) — the fit keeps them so a bake does not walk the stops; absent = the plain fit. */
  | { kind: 'build'; seeds?: SeedStop[] }
  | { kind: 'extract' }
  | { kind: 'gradient'; config: GradientConfig; name: string; source: string }
  | { kind: 'stops' };

export const WORKING_INPUT_KINDS = ['empty', 'build', 'extract', 'gradient', 'stops'] as const;

/** Adjust is the identity when every global modifier sits at its default. Noise at 0 makes
 *  its sub-dials irrelevant; bands ≤ 1 and repeats ≤ 1 are "off" by the pipeline's own rule. */
export const isIdentityAdjust = (p: GeneratorParams): boolean =>
  !p.reverse &&
  (p.bands | 0) <= 1 &&
  p.repeats <= 1 &&
  p.phase === 0 &&
  !p.mirror &&
  p.hueRotate === 0 &&
  p.chroma === 1 &&
  p.contrast === 1 &&
  p.noise === 0;

/**
 * Base channels of a stops config (rendered through the canonical sampler, then decomposed).
 * Always rendered in DISPLAY space ('srgb'): a config's `colorSpace` is a GMT texture hint
 * ('linear' means "the shader wants linear-light bytes"), and decomposing linear bytes as if
 * they were sRGB darkens everything downstream — the palette swatches read darker than the
 * editor strip, which renders display space itself (owner review 2026-09-03).
 */
export const channelsOfConfig = (c: GradientConfig): Channels =>
  decomposeRamp(renderStopsToRamp(c.stops, c.blendSpace, 'srgb'));

/** Base channels of a bare ramp (an Extract result, an imported file). */
export const channelsOfRamp = (ramp: RGB[]): Channels => decomposeRamp(ramp);

export interface WorkingDerivedCore {
  base: Channels;
  ramp: RGB[];
  /** Un-clipped post-chain channels (curve baking reads these, not the clipped ramp). */
  final: Channels;
  config: GradientConfig;
  /** True when the config is the verbatim input (identity pipeline over a stops input). */
  passthrough: boolean;
}

/** The stop budget the Generator uses: `detail` (2..10) buys fidelity. */
export const stopBudget = (detail: number): { targetDE: number; maxStops: number } => {
  const k = (11 - detail) / 3;
  return { targetDE: Math.max(0.004, 0.012 * k), maxStops: Math.round(32 + detail * 12) };
};

/**
 * Run the pipeline. `verbatim` is the input's own config when it has one (`gradient` /
 * `stops` kinds), else null; it is returned untouched when nothing would change it.
 */
export const runWorkingPipeline = (
  base: Channels,
  params: GeneratorParams,
  curves: Partial<Channels> | null,
  noiseSeed: number,
  detail: number,
  verbatim: GradientConfig | null,
  seedStops: SeedStop[] = [],
): WorkingDerivedCore => {
  const passthrough = !!verbatim && !curves && isIdentityAdjust(params);
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
      ramp: renderStopsToRamp(verbatim.stops, verbatim.blendSpace, 'srgb'),
      final: built.final,
      config: verbatim,
      passthrough: true,
    };
  }
  return { base, ramp: built.ramp, final: built.final, config: fitRampToStops(built.ramp, { ...stopBudget(detail), seedStops }), passthrough: false };
};
