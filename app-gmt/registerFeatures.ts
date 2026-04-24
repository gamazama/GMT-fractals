/**
 * app-gmt/registerFeatures — side-effect registration.
 *
 * Imported FIRST in `main.tsx`. Runs feature + formula registration at
 * module-load time so the shared `featureRegistry` is fully populated
 * BEFORE any subsequent import transitively loads `engineStore`
 * (which freezes the registry via `createFeatureSlice`).
 *
 * Mirrors `fluid-toy/registerFeatures.ts` — same pattern, different
 * feature set.
 */

// 26 GMT DDFS features.
import { registerFeatures as registerGmtFeatures } from '../engine-gmt/features/index';
registerGmtFeatures();

// 42 fractal formulas — self-register into FractalRegistry on module
// load via their `index.ts` barrel.
import '../engine-gmt/formulas/index';

// Type-only: declaration-merges GMT DDFS slices into the root store
// type so verbatim-ported GMT code (Navigation.tsx, etc.) compiles.
import '../engine-gmt/storeTypes';
