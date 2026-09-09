/**
 * geometryModes — the three pure 2D geometry modes (Linear / Radial / Conic)
 * registered as `cpuField` modes, plus the live `fractal` mode as the `ownCanvas` escape
 * hatch (registered from its own module). These are the BUILTIN consumers of the mode
 * plug-in seam; the parallel streams (splitscreen-wipe / spline / liquify / parallax)
 * register alongside.
 *
 * Each geometry mode's `field` calls the pinned-pure `sampleGeometry`, so the determinism
 * harness keeps covering them unchanged; the compositor adds the dither tail. `paramFields`
 * declares the flat-optional `GeometryParams` the mode reads (with UI metadata) — the
 * on-screen handle layer (GeometryHandleLayer) drives these, and the ranges here stay the
 * single source of truth the handles clamp to (no duplicated min/max).
 *
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the contract)
 * @see palette/core/rampGeometry.ts (sampleGeometry + GEOM_DEFAULTS)
 * @see gradient-explorer/fullscreen/GeometryHandleLayer.tsx (the on-screen handles)
 */

import { sampleGeometry, GEOM_DEFAULTS, DEFAULT_BACKGROUND, type GeometryId } from '../../../palette/core/rampGeometry';
import type { FullscreenMode, FullscreenParamField } from '../modeRegistry';
import { GEOM_FRAG_BODY, GEOM_FRAG_UNIFORMS, GEOM_FRAG_UNIFORM_NAMES } from './geometryFrag';

/** `uGeomId` for each geometry — the shared fragment body switches on it. Order is the
 *  shader's, not the selector's; it exists only to pick a branch. */
const GEOM_GL_ID: Record<string, number> = { linear: 0, radial: 1, conic: 2 };

/** Push a geometry's params into the shared fragment program. Every value goes through the
 *  same `?? GEOM_DEFAULTS` resolution the CPU sampler uses, so the two paths cannot disagree
 *  about what an omitted key means. */
const setGeomUniforms = (
  id: GeometryId,
): NonNullable<FullscreenMode['setUniforms']> => (gl, loc, ctx) => {
  const P = ctx.params;
  const g = (k: keyof typeof GEOM_DEFAULTS): number => (P as Record<string, number | undefined>)[k] ?? GEOM_DEFAULTS[k];
  const u = (n: string) => loc(n);
  gl.uniform1i(u('uGeomId'), GEOM_GL_ID[id] ?? 0);
  gl.uniform2f(u('uLinear'), g('linearAngle'), g('linearBias'));
  gl.uniform4f(u('uRadial'), g('radialCx'), g('radialCy'), g('radialScale'), g('radialBias'));
  gl.uniform2f(u('uRadialSine'), g('radialSineAmp'), g('radialSineFreq'));
  gl.uniform4f(u('uConic'), g('conicAngle'), g('conicCx'), g('conicCy'), g('conicMirror'));
  gl.uniform3f(u('uConic2'), g('conicBiasA'), g('conicBiasB'), g('conicTwist'));
  gl.uniform3f(
    u('uBg'),
    DEFAULT_BACKGROUND.r / 255,
    DEFAULT_BACKGROUND.g / 255,
    DEFAULT_BACKGROUND.b / 255,
  );
};

/** A cpuField geometry mode: produces the pure position+coverage field via `sampleGeometry`;
 *  the compositor samples the LUT at the float position (smooth) + dithers. */
const geom = (
  id: GeometryId,
  label: string,
  paramFields: readonly FullscreenParamField[] = [],
  hint?: string,
): FullscreenMode => ({
  id,
  label,
  kind: 'cpuField',
  paramFields,
  hint,
  field: (ctx) => sampleGeometry(id, ctx.params, ctx.width, ctx.height),
  // The GPU fast path for live frames. The still image is still `field` + error diffusion;
  // this is what renders while anything is moving. @see modes/geometryFrag.ts
  fragBody: GEOM_FRAG_BODY,
  fragUniforms: GEOM_FRAG_UNIFORMS,
  uniformNames: GEOM_FRAG_UNIFORM_NAMES,
  setUniforms: setGeomUniforms(id),
});

/** The builtin modes in selector order. Registered by `modes/index.ts`. The live `fractal`
 *  mode (the `ownCanvas` escape hatch) registers from its own module (`modes/fractalMode.tsx`)
 *  via the generic `mount()` face — it owns its WebGL renderer, RAF, gestures, and toolbar
 *  with zero overlay coupling. */
export const BUILTIN_MODES: readonly FullscreenMode[] = [
  // Linear absorbed the old S-curve mode: it's a rotatable, eased gradient. Angle 0 + bias 0
  // is the legacy straight horizontal ramp (the determinism pin cares about defaults).
  geom('linear', 'Linear', [
    { key: 'linearAngle', label: 'Angle', min: -Math.PI, max: Math.PI, step: 0.01, default: GEOM_DEFAULTS.linearAngle },
    { key: 'linearBias', label: 'Bias', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.linearBias },
  ], 'drag the dot to bias the ramp · drag the outer dot to rotate · Esc to close'),
  geom('radial', 'Radial', [
    // ±2 (not ±1): the units are ISOTROPIC (half the SHORTER side), so on a wide stage the
    // horizontal edges sit at ±aspect (~±1.8 on 16:9) — ±1 would wall the centre dot at
    // ~56% of the way out. Defaults unchanged (the determinism pin cares about defaults).
    { key: 'radialCx', label: 'Centre X', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.radialCx },
    { key: 'radialCy', label: 'Centre Y', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.radialCy },
    { key: 'radialScale', label: 'Scale', min: 0.1, max: 3, step: 0.01, default: GEOM_DEFAULTS.radialScale },
    { key: 'radialBias', label: 'Bias', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.radialBias },
    // Waves: amplitude 0 is a plain circle, so the ring handle starts as a hint on the ring
    // and the count handle only appears once it is pulled. ±1 lets the reach pinch to zero
    // (a star) as well as swell. The count is CONTINUOUS with a soft notch in the handle
    // (grep `softNotch`), not stepped: a whole number of lobes closes seamlessly at the ±π
    // wrap and is where a drag naturally settles, but a fractional one — a flower with a cut
    // in it — is a picture you are allowed to ask for.
    { key: 'radialSineAmp', label: 'Waves', min: -1, max: 1, step: 0.01, default: GEOM_DEFAULTS.radialSineAmp },
    { key: 'radialSineFreq', label: 'Count', min: 2, max: 16, step: 0.01, default: GEOM_DEFAULTS.radialSineFreq },
  ], 'drag the centre · the ring sets the scale · the inner dot biases the falloff · pull the ring dot out for petals · Esc to close'),
  geom('conic', 'Conic', [
    { key: 'conicAngle', label: 'Rotation', min: -Math.PI, max: Math.PI, step: 0.01, default: GEOM_DEFAULTS.conicAngle },
    { key: 'conicCx', label: 'Centre X', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.conicCx },
    { key: 'conicCy', label: 'Centre Y', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.conicCy },
    // Mirror collapsed (0) by default → plain single-handle conic. Pulling the mirror handle
    // off the rotation handle grows it, reflecting the sweep (0→1→0, no hard seam). Max 0.5 =
    // a symmetric mirror (falling arc == rising arc).
    { key: 'conicMirror', label: 'Mirror', min: 0, max: 0.5, step: 0.01, default: GEOM_DEFAULTS.conicMirror },
    { key: 'conicBiasA', label: 'Bias A', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.conicBiasA },
    { key: 'conicBiasB', label: 'Bias B', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.conicBiasB },
    // Twist in TURNS at the log-spiral's unit radius. ±3 is three full winds before the
    // bands read as noise; the handle's own orbit is the control, so the range only has to
    // cover what stays legible.
    { key: 'conicTwist', label: 'Twist', min: -3, max: 3, step: 0.01, default: GEOM_DEFAULTS.conicTwist },
  ], 'drag the centre · spin the rotation handle · pull the mirror handle off it to reflect · orbit the outer dot to wind a spiral · Esc to close'),
];
