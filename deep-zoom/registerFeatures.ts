/**
 * Side-effect registration for Deep Zoom.
 *
 * Imported at the top of deep-zoom/main.tsx. Every featureRegistry.register()
 * call happens here, before the engine store is constructed (the registry
 * freezes when the store is built, and a late registration throws in dev and
 * does nothing in a production build).
 *
 * Boot-order trap, the same one fluid-toy/registerFeatures.ts records: this
 * file must import NOTHING that imports store/engineStore. A widget that reads
 * the store registers in main.tsx, after the installs.
 *
 * What is registered and what is not, as of stage 1:
 *   - The five look features are REGISTERED but have NO PANEL and NO SINK yet.
 *     Their slices exist in the store (so presets, undo and keyframes already
 *     carry them), nothing draws a row for them and nothing pushes a value to
 *     the renderer: `host.setParam` is a no-op until deep-zoom/host/looseParams.ts
 *     (BUILD-PLAN package S2-3). The dock tabs arrive in stage 2 (panels.ts).
 *   - `registerFeatures()` of engine/features/index.ts is NOT called, as in the
 *     sibling shells: PostEffects and ColorGrading are shader uniforms of a
 *     picture the engine does not draw here, Audio and Webcam feed Modulation,
 *     which this app does not install.
 *   - No palette UI, no send target, no custom widget: stage 5 and stage 2.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { DzFormulaFeature } from './features/formula';
import { DzQualityFeature } from './features/quality';
import { DzInspectFeature } from './features/inspect';
import { DzLightFeature } from './features/light';
import { DzColourFeature } from './features/colour';

// Type-only: declaration-merges the dz* slices into the store's type, so
// `useSlice('dzFormula')` and `setDzFormula(...)` are typed. No runtime content.
import './storeTypes';

// Formula — power, the two phase offsets, the iteration floor.
featureRegistry.register(DzFormulaFeature);

// Quality — frame size, detail, reach, normals, accumulation, and the
// advanced precision / BLA / step levers.
featureRegistry.register(DzQualityFeature);

// Inspect — the diagnostic channel and the compare split. Session-only.
featureRegistry.register(DzInspectFeature);

// Light — shading model, light type, the key light and the surface terms.
// What lights the picture until GMT's Light Studio takes over (stage L5).
featureRegistry.register(DzLightFeature);

// Colour — Plain / Palette, GMT's colouring mode number, scale.
featureRegistry.register(DzColourFeature);
