/**
 * wavePresets — the function tool's starting points, and the first thing in its head.
 *
 * A preset is a whole `WaveParams` bag plus the CHANNEL it belongs on (owner, 2026-09-12:
 * "preset carries its channel"). "Sequential lightness" is a meaningful named thing;
 * "a ramp on whatever you happened to have selected" is not — so applying one switches the
 * active channel to the one it names.
 *
 * The channel is named by ROLE, not by key, because the key depends on the authoring space:
 * lightness is `L` in OkLCh, `V` in HSV, `L*` in CIE LCh — and RGB has no lightness channel
 * at all, so a lightness preset is UNAVAILABLE there rather than silently landing on red.
 * Role `active` means the preset is a shape and genuinely does not care (Ripple, Grain).
 * @see palette/core/curveSpaces.ts (`channelForRole`)
 *
 * ── THERE IS NO EASING SHAPE, AND THAT IS THE POINT ──────────────────────────────────────
 * The standard Penner eases are in here as presets rather than as a sixth shape or a
 * 25-entry curve library, because `bias` ALREADY IS the thing they are (owner, 2026-09-12:
 * "we dont need easing we can build these waves from our existing biase skew and other
 * params"). Bias is a continuous gamma on position-within-cycle — `u**g` — and `inQuad`,
 * `inCubic`, `inQuart` are exactly γ = 2, 3, 4 of that same gamma. Naming 25 fixed points on
 * a dial that already moves continuously would add vocabulary and remove reach. The one ease
 * that is NOT a gamma is in-out, and that is a rising half-period of a sine, which the tool
 * already makes (`Sine` at wavelength 2, phase 0.75).
 *
 * Each preset's BUTTON is its own wave, traced by `waveValue` at 22 px and drawn in its
 * channel's colour (owner: "a preview of their wave shape instead of text"). So a preset
 * cannot advertise a shape it does not produce, and Sequential lightness vs Hue sweep — the
 * same sawtooth — are told apart by being cyan and green.
 */

import { DEFAULT_WAVE, type WaveParams } from './waveGen';
import type { ChannelRole } from './curveSpaces';

export interface WavePreset {
  id: string;
  /** Tooltip and accessible name. Never rendered as visible text — the glyph is the label. */
  label: string;
  /** Which channel this belongs on. `active` = leave the channel alone. */
  role: ChannelRole | 'active';
  /** Merged OVER the live params, so anything a preset does not mention is left as the user
   *  had it. The whole-gradient ones state `span` and `feather` explicitly because a
   *  monotone lightness path is a statement about the WHOLE ramp; the textures do not, so
   *  they land inside a span you already set. */
  params: Partial<WaveParams>;
}

/** A full-axis statement: one cycle, no feather, replacing whatever was there. */
const whole = (over: Partial<WaveParams>): Partial<WaveParams> => ({
  wavelength: 1,
  phase: 0,
  mode: 'replace',
  span: [0, 1],
  feather: [0, 0],
  amplitude: 0.4,
  offset: 0.55,
  bias: 1,
  skew: 1,
  ...over,
});

/**
 * `amplitude: 0.4, offset: 0.55` is not arbitrary: in `replace` mode the value is
 * `offset*range + wave*amplitude*range`, so those two put the ramp across 0.15..0.95 of the
 * channel — the working range a sequential colormap wants, off both the floor and the
 * ceiling where a screen has no headroom left.
 */
export const WAVE_PRESETS: WavePreset[] = [
  // ── whole-gradient lightness paths ────────────────────────────────────────────────────
  { id: 'linear', label: 'Linear rise (lightness)', role: 'lightness', params: whole({ shape: 'Sawtooth' }) },
  { id: 'ease-in', label: 'Ease in — slow start (lightness)', role: 'lightness', params: whole({ shape: 'Sawtooth', bias: 2.2 }) },
  { id: 'ease-out', label: 'Ease out — slow finish (lightness)', role: 'lightness', params: whole({ shape: 'Sawtooth', bias: 0.45 }) },
  // in-out is the one ease that is not a gamma: a RISING HALF-PERIOD of a sine. Wavelength 2
  // puts half a period across the axis; phase 0.75 starts it at the trough.
  { id: 'ease-in-out', label: 'Ease in-out (lightness)', role: 'lightness', params: whole({ shape: 'Sine', wavelength: 2, phase: 0.75 }) },
  { id: 'diverging', label: 'Diverging — light middle (lightness)', role: 'lightness', params: whole({ shape: 'Triangle' }) },
  { id: 'cyclic', label: 'Cyclic — ends meet (lightness)', role: 'lightness', params: whole({ shape: 'Sine', amplitude: 0.35 }) },
  { id: 'hue-sweep', label: 'Full hue sweep', role: 'hue', params: whole({ shape: 'Sawtooth', amplitude: 0.5, offset: 0.5 }) },

  // ── textures: they ride ON the curve, and inside whatever span is set ─────────────────
  // Each states `offset: 0.5` — dead centre, no DC shift. A texture that INHERITED the
  // offset would pick up 0.55 from any whole-gradient preset applied before it (those use
  // 0.55 to sit the ramp in 0.15..0.95) and quietly lift the whole channel by 5% of its
  // range. Measured 2026-09-12: applying Ripple, then Diverging, then Ripple again gave a
  // different gradient the second time. A preset must fully determine what it does, apart
  // from the span/feather it deliberately leaves alone.
  { id: 'ripple', label: 'Ripple', role: 'active', params: { shape: 'Sine', wavelength: 0.12, amplitude: 0.08, offset: 0.5, mode: 'add', bias: 1, skew: 1, phase: 0 } },
  { id: 'bands', label: 'Bands', role: 'active', params: { shape: 'Pulse', wavelength: 0.14, amplitude: 0.12, offset: 0.5, mode: 'add', bias: 1, skew: 1, phase: 0 } },
  { id: 'grain', label: 'Grain', role: 'active', params: { shape: 'Noise', wavelength: 0.03, amplitude: 0.06, offset: 0.5, mode: 'add', bias: 1, skew: 1, phase: 0 } },
  { id: 'vivid', label: 'Chroma pulse', role: 'chroma', params: { shape: 'Sine', wavelength: 0.22, amplitude: 0.22, offset: 0.5, mode: 'add', bias: 1, skew: 1, phase: 0 } },
];

/**
 * The params a preset would apply, resolved against the live ones. Exported so the glyph
 * renderer and the apply path trace the SAME wave — a button that draws something the click
 * does not produce is the failure mode this whole scheme exists to avoid.
 */
export const presetParams = (preset: WavePreset, live: WaveParams = DEFAULT_WAVE): WaveParams => ({
  ...live,
  ...preset.params,
  span: (preset.params.span ?? live.span).slice() as [number, number],
  feather: (preset.params.feather ?? live.feather).slice() as [number, number],
});
