/**
 * Side-effect registration for the Demo add-on.
 *
 * Imported for its side effect — registering the feature + overlay
 * component with the engine's registries. Safe to import at any time
 * because neither registry depends on the Zustand store.
 *
 * IMPORTANT: this module must be imported *before* anything imports
 * the store (`store/fractalStore.ts`), otherwise the store's feature
 * slice is created before the Demo feature lands in the registry and
 * the demo state slice will be missing.
 *
 * The canonical way: `import './demo/registerFeatures';` at the top
 * of `index.tsx`, before `import App from './App'`.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { DemoFeature } from './DemoFeature';
import { DemoOverlay } from './DemoOverlay';

featureRegistry.register(DemoFeature);
componentRegistry.register('overlay-demo', DemoOverlay as any);
