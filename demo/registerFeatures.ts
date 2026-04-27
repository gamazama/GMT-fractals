/**
 * Side-effect registration for the Demo add-on.
 *
 * Imported for its side effect — registering the feature + overlay
 * component with the engine's registries. Safe to import at any time
 * because neither registry depends on the Zustand store.
 *
 * IMPORTANT: this module must be imported *before* anything imports
 * the store (`store/engineStore.ts`), otherwise the store's feature
 * slice is created before the Demo feature lands in the registry and
 * the demo state slice will be missing.
 *
 * The canonical way: `import './demo/registerFeatures';` at the top
 * of `index.tsx`, before `import App from './App'`.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { DemoFeature } from './DemoFeature';

// IMPORTANT: do NOT import DemoOverlay here. DemoOverlay reads the
// engine store via useLiveModulations / useEngineStore — pulling those
// into the import chain at registerFeatures time freezes the registry
// BEFORE this very line runs (createFeatureSlice freezes on first
// store touch). See `fluid-toy/README.md` § "deliberate weirdness" for
// the canonical write-up of this trap.
//
// Component registration is deferred to demo/setup.ts, which runs
// AFTER the store is created — by then the freeze has happened, but
// componentRegistry doesn't freeze, so adding entries is safe.
featureRegistry.register(DemoFeature);
