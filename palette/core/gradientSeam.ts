/**
 * gradientSeam — the "feed it" output: turn a picked/built gradient into a GMT
 * GradientConfig and apply it to the fractal's colouring.
 *
 *   entryToGradientConfig — a catalog entry (preset = stops, loaded = ramp) → a GMT
 *     GradientConfig. Loaded entries carry only a 256-ramp, so they're fitted to stops
 *     via stopFit (the unified-HLC fitter) — exactly GMT's interchange representation.
 *   applyGradientConfig — set the coloring feature's gradient (layer 1 or 2). No-ops
 *     (returns false) when the host has no coloring feature, e.g. the standalone studio.
 */

import type { CatalogEntry } from './presetCatalog';
import type { GradientConfig } from '../../types';
import { fitRampToStops, bufferToRamp } from './stopFit';
import { useEngineStore } from '../../store/engineStore';

// maxStops headroom: banded palettes need a stop per band edge, so 32 left them as a
// smoothed approximation that didn't match the picked swatch. GMT's gradient system has
// no stop limit (any count bakes into the 256-texel DataTexture), so cap high.
const SEAM_MAX_STOPS = 128;

export const entryToGradientConfig = (entry: CatalogEntry): GradientConfig =>
  // colorSpace 'linear' → generateGradientTextureBuffer converts the sRGB stops to
  // LINEAR when baking the DataTexture, which is what the fractal shader expects.
  entry.stops && entry.stops.length
    ? { stops: entry.stops, colorSpace: 'linear', blendSpace: 'oklab' }
    : { ...fitRampToStops(bufferToRamp(entry.ramp), { targetDE: 0.02, maxStops: SEAM_MAX_STOPS }), colorSpace: 'linear' };

/** Apply a gradient to GMT's coloring feature. Layer 1 = `gradient`, 2 = `gradient2`.
 *  Returns false when no coloring feature is present (the studio has none). */
export const applyGradientConfig = (config: GradientConfig, layer: 1 | 2 = 1): boolean => {
  const st = useEngineStore.getState() as unknown as Record<string, unknown>;
  const setColoring = st.setColoring as ((u: Record<string, unknown>) => void) | undefined;
  if (typeof setColoring !== 'function') return false;
  setColoring({ [layer === 2 ? 'gradient2' : 'gradient']: config });
  return true;
};

/** Convenience: pick a catalog entry straight into the fractal's colour. */
export const applyEntryToColoring = (entry: CatalogEntry, layer: 1 | 2 = 1): boolean =>
  applyGradientConfig(entryToGradientConfig(entry), layer);

/**
 * Apply a gradient to GMT's environment (sky) gradient — `materials.envGradientStops`.
 * Forced to colorSpace 'srgb': the env gradient is a DISPLAYED sky colour (sampled
 * directly in the env shader, default-baked as srgb), unlike the LINEAR coloring
 * radiance. Returns false when the host has no materials feature (the studio has none).
 */
export const applyEnvGradient = (config: GradientConfig): boolean => {
  const st = useEngineStore.getState() as unknown as Record<string, unknown>;
  const setMaterials = st.setMaterials as ((u: Record<string, unknown>) => void) | undefined;
  if (typeof setMaterials !== 'function') return false;
  setMaterials({ envGradientStops: { ...config, colorSpace: 'srgb' } });
  return true;
};
