/**
 * fractalHandoff — carry a Gradient-Explorer fractal view into the Fluid Toy.
 *
 * Two transports, one payload:
 *   • PNG embed — the fullscreen fractal export writes a fluid-toy scene Preset into the
 *     PNG's SceneData chunk, so dropping that PNG on fluid-toy (its normal scene-load path)
 *     opens at the same view.
 *   • Live handoff — the "Open in Fluid Toy" button stashes the same Preset in localStorage
 *     and opens fluid-toy.html; fluid-toy reads + clears the key on boot.
 *
 * The Preset only carries the fractal (julia), its colouring (palette), and the deep-zoom
 * enable. fluid-toy fills every other feature from defaults on load — so it opens as a pure
 * fractal at this view with the sim off (the user can then switch the fluid on).
 *
 * @see gradient-explorer/fullscreen/modes/fractalMode.ts (getActiveFractalCoords)
 * @see fluid-toy/main.tsx (the boot-time handoff read)
 */

import type { GradientConfig } from '../types';
import type { Preset } from '../types/preset';
import type { FractalHandoffCoords } from './fullscreen/modes/fractalMode';

/** localStorage key for the live "Open in Fluid Toy" handoff (same-origin). */
export const FLUID_TOY_HANDOFF_KEY = 'gmt.fluidToy.incomingScene';

/** Build a fluid-toy-compatible scene Preset from a fractal view + the gradient that colours it. */
export const buildFluidToyScene = (
  coords: FractalHandoffCoords,
  gradient: GradientConfig | null,
  name: string,
): Preset => ({
  version: 1,
  name: name || 'Gradient Explorer fractal',
  // Opaque formula tag — fluid-toy ignores it (single fractal pipeline).
  formula: 'JuliaFluid',
  features: {
    julia: {
      // fluid-toy julia.kind: 0 = Julia, 1 = Mandelbrot.
      kind: coords.kind === 'julia' ? 0 : 1,
      juliaC: { x: coords.juliaC[0], y: coords.juliaC[1] },
      center: { x: coords.center[0], y: coords.center[1] },
      centerLow: { x: coords.centerLow[0], y: coords.centerLow[1] },
      zoom: coords.zoom,
      // Clamp into fluid-toy's julia.maxIter range (16..512).
      maxIter: Math.min(512, Math.max(16, Math.round(coords.maxIter))),
      power: coords.power,
    },
    palette: {
      colorMapping: coords.colorMapping,
      gradientRepeat: coords.gradientRepeat,
      gradientPhase: coords.gradientPhase,
      ...(gradient ? { gradient } : {}),
    },
    // Carry the deep-zoom enable so a deep GX view renders correctly in fluid-toy.
    deepZoom: { enabled: coords.deepZoom },
  },
} as unknown as Preset);

/** Hand the current fractal view to fluid-toy: stash the scene, open the app in a new tab. */
export const openInFluidToy = (
  coords: FractalHandoffCoords,
  gradient: GradientConfig | null,
  name: string,
): void => {
  try {
    localStorage.setItem(FLUID_TOY_HANDOFF_KEY, JSON.stringify(buildFluidToyScene(coords, gradient, name)));
  } catch {
    // localStorage full/unavailable — still open fluid-toy; it just won't preload the view.
  }
  window.open('fluid-toy.html', '_blank', 'noopener');
};
