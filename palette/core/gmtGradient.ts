/**
 * Canonical gradient sampler — re-export of the engine-core sampler in
 * `utils/colorUtils.ts`.
 *
 * This file used to be a hand-maintained, BYTE-EXACT MIRROR of GMT's
 * `generateGradientTextureBuffer`, kept in sync by a regression harness
 * (`debug/test-palette-stopfit.mts`). That duplication was collapsed in P0a: the
 * engine sampler is now the single source of truth and the editor + palette consume
 * it directly, so there is exactly ONE sampler and it can no longer drift.
 *
 * `utils/colorUtils.ts` is pure (its only non-pure dependency, a dead THREE import,
 * was removed in the same change), so re-exporting from it keeps `palette/core/`'s
 * DOM-free / portable-library contract intact.
 *
 * Stable import path retained for existing palette consumers:
 *   `renderStopsToRamp` / `renderStopsToBuffer` / `sampleStops` / `sampleSortedStops` /
 *   `hexToRgb` / `rgbToHex`.
 *
 * Since ADR-0122 a gradient may be a RAMP (`stops: []` + `ramp`), so code that holds a whole
 * `GradientConfig` reads it through `renderGradientToRamp` / `gradientDisplayRamp`, never
 * `renderStopsToRamp(config.stops, …)` — on a ramp gradient that renders the greyscale fallback.
 * `renderStopsToRamp` stays for code that genuinely holds a stop LIST (the fitter, the editor).
 */

export {
  renderStopsToRamp,
  renderStopsToBuffer,
  renderGradientToRamp,
  gradientDisplayRamp,
  sampleStops,
  sampleSortedStops,
  hexToRgb,
  rgbToHex,
} from '../../utils/colorUtils';
export type { RGB } from './oklab';
