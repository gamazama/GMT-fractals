import { featureRegistry } from '../engine/FeatureSystem';
import { DemoFeature } from './DemoFeature';

// Side-effect import. Must run BEFORE anything touches the engine
// store (createFeatureSlice freezes the registry on first store
// access). Canonical pattern: `import './demo/registerFeatures'` at
// the top of `index.tsx`, before any module that pulls in the store.
//
// Don't import DemoOverlay here — it reads useEngineStore via
// useLiveModulations, which would freeze the registry mid-import.
// Component registration is deferred to setup.ts.
featureRegistry.register(DemoFeature);
