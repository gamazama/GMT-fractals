/**
 * Side-effect registration for Fluid Toy.
 *
 * Imported at the top of fluid-toy/main.tsx. All featureRegistry.register()
 * and componentRegistry.register() calls happen here before the engine
 * store is constructed (and the registries are frozen).
 *
 * Features will land across phase-3 commits:
 *   3c  JuliaFeature
 *   3d  DyeFeature (uses AdvancedGradientEditor via DDFS gradient type)
 *   3e  FluidSimFeature + SceneCameraFeature
 */

import { featureRegistry } from '../engine/FeatureSystem';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { JuliaFeature } from './features/julia';
import { DeepZoomFeature } from './features/deepZoom';
import { CouplingFeature } from './features/coupling';
import { PaletteFeature } from './features/palette';
import { CollisionFeature } from './features/collision';
import { FluidSimFeature } from './features/fluidSim';
import { PresetsFeature } from './features/presets';
import { PresetGrid } from './components/PresetGrid';
import { PostFxFeature } from './features/postFx';
import { CompositeFeature } from './features/composite';
import { BrushFeature } from './features/brush';
import { JuliaCPicker } from './components/JuliaCPicker';
// Note: DeepZoomStatus imports useEngineStore — registering it via
// componentRegistry would freeze the registry pre-feature-registration
// (see README "boot-order trap"). It's mounted directly in
// FluidToyApp instead, where the store is already constructed.

// Components used by feature customUI slots must be registered before
// the registries freeze (i.e. before the store is constructed). Match
// the id to the customUI entry in the feature definition.
//
// Components referenced from the panel manifest by `component:` (e.g.
// `panel-views`) DO NOT need to be registered here — they don't touch
// the feature/component registries' frozen state. Register those in
// main.tsx after the store is constructed so their module-scope
// `useEngineStore` imports don't freeze the registry pre-registration.
componentRegistry.register('julia-c-picker', JuliaCPicker);
componentRegistry.register('preset-grid', PresetGrid);

// Fractal tab — kind, c, zoom, center, iter, power, plus the
// palette-bound params (hidden from this tab, surfaced in Palette).
featureRegistry.register(JuliaFeature);

// Deep Zoom tab — perturbation + LA scaffolding. Toggles only in
// phase 1; engine wires later. See plans/fluid-toy-deep-zoom.md.
featureRegistry.register(DeepZoomFeature);

// Coupling tab — force mode + intensity knobs. Absorbs the force* params
// from the pre-refactor FluidSim tab.
featureRegistry.register(CouplingFeature);

// Palette tab — gradient, colour mapping, trap geometry, colour iter,
// interior colour, dye blend. Absorbs the palette-bound iteration
// params that were previously hidden on JuliaFeature. Still carries
// (hidden) brushMode / dyeMix — those move to their own features on
// later tabs.
featureRegistry.register(PaletteFeature);

// Collision tab — enabled toggle + gradient + preview + independent
// repeat/phase. Absorbs the wall params previously hidden on Palette.
featureRegistry.register(CollisionFeature);

// Fluid tab — vorticity / dissipation / pressure / resolution / dt.
// Tab 3 of this restructure pass will absorb dye-inject + dye-decay.
featureRegistry.register(FluidSimFeature);

// (SceneCameraFeature retired — zoom + center moved onto JuliaFeature.)
// (OrbitFeature retired — auto-orbit is now two 90°-phase LFOs on
//  julia.juliaC_x/_y, authored via the Modulation panel; see coupling.ts.)

// PostFX — tone mapping, exposure, vibrance, bloom, aberration,
// refraction, caustics, fluid style presets. Pure display-stage knobs.
featureRegistry.register(PostFxFeature);

// Composite — juliaMix + velocityViz balance controls.
featureRegistry.register(CompositeFeature);

// Brush — geometric + intensity knobs for left-drag splatting
// (size / strength / flow / spacing / jitter). Brush MODE
// (paint/erase/stamp/smudge) stays on the Palette feature (hidden)
// until the FluidEngine brush overhaul (Tab 4 of restructure pass).
featureRegistry.register(BrushFeature);

// Presets — chip grid backed by the reference preset pack. Applying
// dispatches every affected slice setter via presets/apply.ts and
// resets the fluid fields via engineHandles.
featureRegistry.register(PresetsFeature);

// ── Favients (the cross-app gradient-favourites shelf) ───────────────────
// registerPaletteUI registers the `panel-favients` component + its history /
// document providers + the gradient-editor favourites entrance + seeds the
// starter presets. Same seam app-gmt uses. The shelf is host-agnostic; the
// host (here) declares where a picked favourite applies.
import { registerPaletteUI } from '../palette/registerPaletteUI';
registerPaletteUI();

// Where a favourite lands in fluid-toy: the Palette gradient, which colours
// both the fractal and the dye injected into the fluid. HOST-group send target
// — the shelf's "Destination" dropdown lists it; the payload carries the
// favourite's GradientConfig. We reach the store via the global handle (set
// after the engine store is constructed) rather than a static import, so this
// module doesn't pull useEngineStore into the registration chain and freeze the
// feature registry mid-register (see README "boot-order trap").
import { setFavientBrowseAction, setFavientStudioAction } from '../palette/core/favientTargets';
import { registerSendTarget } from '../store/sendTargetRegistry';
import type { FavientDragPayload } from '../palette/core/favientDnd';
registerSendTarget<FavientDragPayload>({
    id: 'palette-gradient',
    label: 'Palette (fractal + dye)',
    group: 'host',
    apply: (p) => {
        const store = (globalThis as { __engineStore?: { getState: () => { setPalette?: (u: { gradient: unknown }) => void } } }).__engineStore;
        store?.getState().setPalette?.({ gradient: { ...p.config } });
    },
});

// fluid-toy has no in-app Palette-Picker overlay, so the shelf's "Palettes"
// browse button has nothing to open — hide it. The studio button opens the
// standalone GMT Gradient Explorer (same origin) for richer authoring.
setFavientBrowseAction(null);
setFavientStudioAction(() => window.open('gradient-explorer.html', '_blank', 'noopener'));
