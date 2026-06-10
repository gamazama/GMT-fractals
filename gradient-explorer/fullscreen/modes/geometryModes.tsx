/**
 * geometryModes — the six pure 2D geometry modes (Linear / Radial / Conic / Arched /
 * S-curve / Randomized) registered as `cpuRaster` modes, plus the live `fractal` mode as
 * the `ownCanvas` escape hatch. These are the BUILTIN consumers of the mode plug-in seam;
 * the parallel streams (splitscreen-wipe / spline / liquify / parallax) register alongside.
 *
 * Each geometry mode's `raster` just calls the pinned-pure `renderGeometry`, so the
 * determinism harness keeps covering them unchanged; the compositor adds the dither tail.
 * `paramFields` declares the flat-optional `GeometryParams` the mode reads (with UI
 * metadata) — the polish wave wires sliders to these without touching the overlay core.
 *
 * @see gradient-explorer/fullscreen/modeRegistry.ts (the contract)
 * @see palette/core/rampGeometry.ts (renderGeometry + GEOM_DEFAULTS)
 */

import React from 'react';
import { sampleGeometry, GEOM_DEFAULTS, type GeometryId } from '../../../palette/core/rampGeometry';
import { rerollFullscreen, setFullscreenAmount, useFullscreenState } from '../../../palette/store/fullscreenStore';
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

/** Randomized-field controls — the self-contained `Controls` exemplar for the seam: it
 *  reads/writes ONLY the store + registry, so it drops into the overlay with no wiring. */
const RandomControls: React.FC = () => {
  const fs = useFullscreenState();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={rerollFullscreen}
        title="Re-roll the point field (new seed)"
        className="px-2.5 py-1 text-[12px] rounded-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        ⟳ Re-roll
      </button>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
        Amount
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={fs.amount}
          onChange={(e) => setFullscreenAmount(parseFloat(e.target.value))}
          className="w-28 accent-cyan-400"
          aria-label="Randomization amount"
        />
        <span className="tabular-nums w-7 text-right text-gray-500">{Math.round(fs.amount * 100)}</span>
      </label>
    </div>
  );
};

/** The builtin modes in selector order. Registered by `modes/index.ts`. */
export const BUILTIN_MODES: readonly FullscreenMode[] = [
  geom('linear', 'Linear'),
  geom('radial', 'Radial', [
    // ±2 (not ±1): the units are ISOTROPIC (half the SHORTER side), so on a wide stage the
    // horizontal edges sit at ±aspect (~±1.8 on 16:9) — ±1 would wall the centre dot at
    // ~56% of the way out. Defaults unchanged (the determinism pin cares about defaults).
    { key: 'radialCx', label: 'Centre X', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.radialCx },
    { key: 'radialCy', label: 'Centre Y', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.radialCy },
  ], 'drag the dot to move the centre · Esc to close'),
  geom('conic', 'Conic', [
    { key: 'conicAngle', label: 'Rotation', min: -Math.PI, max: Math.PI, step: 0.01, default: GEOM_DEFAULTS.conicAngle },
  ], 'drag the handle around the centre to rotate · Esc to close'),
  geom('arched', 'Arched', [
    { key: 'archR', label: 'Radius', min: 1, max: 4, step: 0.01, default: GEOM_DEFAULTS.archR },
    { key: 'archHalfWidth', label: 'Width', min: 0.05, max: 1, step: 0.01, default: GEOM_DEFAULTS.archHalfWidth },
    { key: 'archCy', label: 'Centre Y', min: 0.5, max: 2.5, step: 0.01, default: GEOM_DEFAULTS.archCy },
    { key: 'archSpan', label: 'Span', min: 0.3, max: 2.5, step: 0.01, default: GEOM_DEFAULTS.archSpan },
  ], 'drag the handles to shape the band · Esc to close'),
  geom('scurve', 'S-curve', [
    { key: 'scurveShape', label: 'Shape', min: -2, max: 2, step: 0.01, default: GEOM_DEFAULTS.scurveShape },
  ], 'drag the dot to bend the curve · Esc to close'),
  {
    ...geom('random', 'Randomized', [
      { key: 'amount', label: 'Amount', min: 0, max: 1, step: 0.01, default: GEOM_DEFAULTS.amount },
    ]),
    Controls: RandomControls,
  },
  // The live `fractal` mode (the `ownCanvas` escape hatch) is registered from its own module
  // (`modes/fractalMode.tsx`) via the generic `mount()` face — it owns its WebGL renderer, RAF,
  // gestures, knobs, and toolbar with zero overlay coupling. See `modes/index.ts`.
];
