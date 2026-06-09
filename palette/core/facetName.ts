/**
 * facetName — turn a gradient's perceptual facets into a short human-readable label.
 *
 * Frozen-ahead for P2: when a generated/extracted gradient is saved as a favourite (or
 * exported), we want a deterministic default name like "Warm Vivid" or "Cool Muted
 * Rainbow" instead of an opaque hash. This is the pure, deterministic core of that —
 * the favourite/extract naming flow in P2 wires it in. Kept DOM/THREE-free like the
 * rest of palette/core (the determinism suite covers this directory).
 *
 * Input: a `Facets` object (the 0..1 normalised axes from computeFacets — higher =
 * light / vivid / complex / rainbow / warm). The `Facets`-object seam is the clean one:
 * a caller that has already filtered/sorted by facets has the object in hand, and tests
 * stay independent of the OKLab maths. `rampToName` is a convenience for callers holding
 * only a ramp.
 *
 * Scheme (composed, in order, each part omitted when it falls in the "neutral" band):
 *   1. lightness qualifier — "Dark" (<0.3) / "Bright" (>0.72), else nothing
 *   2. warmth word        — "Warm" (>0.62) / "Cool" (<0.38), else "Neutral"
 *   3. intensity word     — "Vivid" (>0.6) / "Soft" (0.18..0.4) / "Muted" (<0.18) from chroma
 *   4. "Rainbow" suffix   — appended when rainbow > 0.6
 * Always total + non-empty: if every part lands neutral, falls back to "Neutral".
 */

import { computeFacets, type Facets } from './facets';
import { renderStopsToRamp } from './gmtGradient';
import type { RGB } from './oklab';
import type { GradientConfig } from '../../types';

// Thresholds — chosen against the catalog distribution the facets harness reports
// (lightness/chroma/warmth typically span ~0.2..0.85 across the real palettes).
const DARK_MAX = 0.3;
const BRIGHT_MIN = 0.72;
const COOL_MAX = 0.38;
const WARM_MIN = 0.62;
const MUTED_MAX = 0.18;
const SOFT_MAX = 0.4;
const VIVID_MIN = 0.6;
const RAINBOW_MIN = 0.6;

const lightnessWord = (l: number): string => (l < DARK_MAX ? 'Dark' : l > BRIGHT_MIN ? 'Bright' : '');

const warmthWord = (w: number): string => (w > WARM_MIN ? 'Warm' : w < COOL_MAX ? 'Cool' : '');

// Intensity from chroma. "Soft" sits between muted and vivid; the neutral mid-band
// (SOFT_MAX..VIVID_MIN) contributes no word so labels stay short.
const intensityWord = (c: number): string =>
  c < MUTED_MAX ? 'Muted' : c < SOFT_MAX ? 'Soft' : c > VIVID_MIN ? 'Vivid' : '';

/**
 * Compose a short 1-3 word (+ optional "Rainbow") label from perceptual facets.
 * Deterministic and total — always returns a non-empty string.
 */
export const facetsToName = (f: Facets): string => {
  const parts: string[] = [];
  const dark = lightnessWord(f.lightness);
  if (dark) parts.push(dark);

  const warm = warmthWord(f.warmth);
  if (warm) parts.push(warm);

  const intensity = intensityWord(f.chroma);
  if (intensity) parts.push(intensity);

  if (f.rainbow > RAINBOW_MIN) parts.push('Rainbow');

  return parts.length ? parts.join(' ') : 'Neutral';
};

/** Convenience for callers holding a 256-step ramp instead of precomputed facets. */
export const rampToName = (ramp: RGB[]): string => facetsToName(computeFacets(ramp));

/**
 * Auto-name a gradient CONFIG — render it to a ramp, then label by facets. This is the
 * default favourite name when a gradient is added without an explicit one, so the two
 * drag-to-Favients add paths (the `favients` send-target's flat-add and the panel's own
 * insert) name identically from one place.
 */
export const configToName = (config: GradientConfig): string =>
  rampToName(renderStopsToRamp(config.stops, config.blendSpace, config.colorSpace));
