/**
 * geometryModes — the four pure 2D geometry modes (Linear / Radial / Conic / Arched)
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

import { sampleGeometry, GEOM_DEFAULTS, type GeometryId } from '../../../palette/core/rampGeometry';
import type { FullscreenMode, FullscreenParamField } from '../modeRegistry';

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
  ], 'drag the centre · the ring sets the scale · the inner dot biases the falloff · Esc to close'),
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
  ], 'drag the centre · spin the rotation handle · pull the mirror handle off it to reflect · Esc to close'),
  geom('arched', 'Arched', [
    { key: 'archR', label: 'Radius', min: 1, max: 4, step: 0.01, default: GEOM_DEFAULTS.archR },
    // Width can fill the stage (isotropic half-units; 3 is well past the long edge). The
    // width handle pins inside the stage when the band overshoots the selection.
    { key: 'archHalfWidth', label: 'Width', min: 0.05, max: 3, step: 0.01, default: GEOM_DEFAULTS.archHalfWidth },
    { key: 'archCy', label: 'Centre Y', min: 0.5, max: 2.5, step: 0.01, default: GEOM_DEFAULTS.archCy },
    { key: 'archSpan', label: 'Span', min: 0.3, max: 2.5, step: 0.01, default: GEOM_DEFAULTS.archSpan },
    { key: 'archCurve', label: 'Curvature', min: -0.3, max: 0.3, step: 0.005, default: GEOM_DEFAULTS.archCurve },
  ], 'drag the handles to shape the band · the curvature handle bends the spine · Esc to close'),
];
