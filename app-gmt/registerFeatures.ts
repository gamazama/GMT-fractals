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

// Palette tools (picker/generator/image) — features + custom-UI components. The
// Picker's "apply" seam (palette/core/gradientSeam) sets the coloring gradient.
import { registerPaletteUI } from '../palette/registerPaletteUI';
registerPaletteUI();

// Favients (the cross-app gradient-favourites shelf) apply targets for app-gmt: a
// favourite click/drop lands on a fractal COLORING layer via the gradient seam.
import { registerFavientTarget } from '../palette/core/favientTargets';
import { applyGradientConfig } from '../palette/core/gradientSeam';
registerFavientTarget({ id: 'coloring-1', label: 'Coloring · Layer 1', apply: (c) => applyGradientConfig(c, 1) });
registerFavientTarget({ id: 'coloring-2', label: 'Coloring · Layer 2', apply: (c) => applyGradientConfig(c, 2) });

// One-time import of the legacy saved-gradient library into Favients (no data loss).
import { migrateSavedGradientsToFavients } from './favientsMigration';
migrateSavedGradientsToFavients();

// 42 fractal formulas — self-register into FractalRegistry on module
// load via their `index.ts` barrel.
import '../engine-gmt/formulas/index';

// Type-only: declaration-merges GMT DDFS slices into the root store
// type so verbatim-ported GMT code (Navigation.tsx, etc.) compiles.
import '../engine-gmt/storeTypes';
