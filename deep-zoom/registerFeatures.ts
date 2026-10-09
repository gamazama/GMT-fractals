/**
 * Side-effect registration for Deep Zoom.
 *
 * Imported at the top of deep-zoom/main.tsx. Every featureRegistry.register()
 * call happens here, before the engine store is constructed (the registry
 * freezes when the store is built, and a late registration throws in dev and
 * does nothing in a production build).
 *
 * Boot-order trap, the same one fluid-toy/registerFeatures.ts records: nothing
 * in this file may TOUCH the store (a first `useEngineStore` call builds it and
 * freezes the registries mid-register). Importing a module that imports
 * store/engineStore is harmless - the store is built on first use, grep
 * `ensureStore` there - and the palette suite below does. What must not happen
 * is a call: the My Gradients target reaches the store through the global
 * handle, at click time. A widget that reads the store registers in main.tsx,
 * after the installs.
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
 *   - The palette suite (stage 5, 2026-10-09), at the foot of this file: My
 *     Gradients, the Gradient Studio, and this app's one Destination.
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { DzFormulaFeature } from './features/formula';
import { DzQualityFeature } from './features/quality';
import { DzInspectFeature } from './features/inspect';
import { DzLightFeature } from './features/light';
import { DzColourFeature } from './features/colour';
import { DzCameraFeature, DZ_DEPTH_SCALE_OVERLAY } from './features/camera';
import { DepthScale } from './components/DepthScale';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { ModeNotice } from './components/ModeNotice';
import { IterationReadout, FrameReadout } from './components/Readouts';

// Type-only: declaration-merges the dz* slices into the store's type, so
// `useSlice('dzFormula')` and `setDzFormula(...)` are typed. No runtime content.
import './storeTypes';

// Formula — power, the two phase offsets, the iteration floor.
featureRegistry.register(DzFormulaFeature);

// Quality — frame size, detail, reach, normals, accumulation, and the
// advanced BLA / resolution-cap levers.
featureRegistry.register(DzQualityFeature);

// Inspect — the diagnostic channel and the compare split. Session-only.
featureRegistry.register(DzInspectFeature);

// Light — shading model, light type, the key light and the surface terms.
// What lights the picture until GMT's Light Studio takes over (stage L5).
featureRegistry.register(DzLightFeature);

// Colour — Plain / Gradient, the gradient, GMT's colouring mode number, scale.
featureRegistry.register(DzColourFeature);

// Panel widgets the manifest names (deep-zoom/panels.ts). Registered here, before the store
// is built, as fluid-toy does for its own.
featureRegistry.register(DzCameraFeature);

// The depth scale: the `camera` feature's viewport overlay, mounted by <FeatureOverlays />.
componentRegistry.register(DZ_DEPTH_SCALE_OVERLAY, DepthScale);
componentRegistry.register('dz-mode-notice', ModeNotice);
componentRegistry.register('dz-iteration-readout', IterationReadout);
componentRegistry.register('dz-frame-readout', FrameReadout);

// ── The palette suite (stage 5) ──────────────────────────────────────────────
// The same seam app-gmt and fluid-toy use: the My Gradients panel and its
// providers, the star in the gradient editor's header, the starter presets.
// Its generator / filters / image features come with it; the Studio's Adjust
// dials are the generator's, so they are wanted here, not carried for nothing.
import { registerPaletteUI } from '../palette/registerPaletteUI';
registerPaletteUI();

// The Gradient Studio — the Explorer's Curves / Adjust / Paint faces in a
// floating window, opened from the button beside the editor's star. After
// registerPaletteUI, so that button sits after the star. Its panel entry and
// close watcher are in setup.ts.
import { installGradientStudio } from '../palette/installGradientStudio';
installGradientStudio();

// Where a gradient from My Gradients lands: the surface's gradient. Forced to
// 'linear' whatever the favourite says (most are stored 'srgb'): the renderer
// lights the texel, as GMT's coloring layers do - THE GRADIENT in
// features/colour.ts. The same write leaves Plain, so the gradient is seen.
// The store is reached through the global handle, at click time (the header).
import { setFavientStudioAction } from '../palette/core/favientTargets';
import { registerSendTarget } from '../store/sendTargetRegistry';
import type { FavientDragPayload } from '../palette/core/favientDnd';
import type { GradientConfig } from '../types';
import { DZ_GRADIENT_PARAM } from './features/colour';
import { openExplorerFromDeepZoom } from './explorerTrip';

type StoreHandle = { getState: () => { setDzColour?: (patch: { gradient: GradientConfig; plain: boolean }) => void; setActiveTab?: (id: string) => void } };
const storeHandle = (): StoreHandle | undefined => (globalThis as { __engineStore?: StoreHandle }).__engineStore;

registerSendTarget<FavientDragPayload>({
    id: 'dz-gradient',
    label: 'Deep Zoom · Gradient',
    group: 'host',
    editsParam: DZ_GRADIENT_PARAM,
    apply: (p) => storeHandle()?.getState().setDzColour?.({ gradient: { ...p.config, colorSpace: 'linear' }, plain: false }),
    reveal: () => storeHandle()?.getState().setActiveTab?.('Colour'),
});

// The panel's Explorer button: the Gradient Explorer in a new tab, on this
// gradient, with a "Back to Deep Zoom" link (./explorerTrip).
setFavientStudioAction(openExplorerFromDeepZoom);
