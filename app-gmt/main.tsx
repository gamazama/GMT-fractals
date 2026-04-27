/**
 * GMT App — entry point.
 *
 * Mirrors fluid-toy/main.tsx: register features + install plugins +
 * mount the app. The only GMT-specific parts are:
 *   1. `registerGmtFeatures()` registers the 26 DDFS features
 *   2. `installGmtRenderer({...})` boots the worker + renderer plugin
 *   3. Boot flow calls `gmtRenderer.boot(config, camera)` after the
 *      store has a valid formula + default preset seeded
 */

// Side-effect registrations — MUST be imported FIRST. ES module imports
// hoist, so any top-level statement here runs AFTER every import in the
// file has resolved. Some of those imports (AppGmt → engineStore) touch
// and freeze the feature registry, so registration HAS to be a
// side-effect import, not a plain function call below.
import './registerFeatures';

// Plugin preset fields (cameraRot, etc.) register into presetFieldRegistry.
import '../engine/plugins/camera/presetField';
// GMT-specific preset fields (lights top-level array) — must precede store init.
import '../engine-gmt/store/gmtPresetFields';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppGmt } from './AppGmt';
import { registerUI } from '../engine/features/ui';
import { registerGmtUi } from '../engine-gmt/features/ui';
import { installGmtCameraSlice } from '../engine-gmt/store/cameraSlice';
import { installGmtModularSlice } from '../engine-gmt/store/modularSlice';
import { installViewport, viewport } from '../engine/plugins/Viewport';
import { installTopBar } from '../engine/plugins/TopBar';
import { installPauseControls } from '../engine/plugins/topbar/PauseControls';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installModulation } from '../engine/animation/modulationTick';
import { installModulationUI, setLfoListConfig } from '../engine/components/modulation';
import { installShortcuts, shortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installCamera } from '../engine/plugins/Camera';
import { installGmtCameraBinders } from '../engine-gmt/animation/cameraBinders';
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';
import { useAnimationStore } from '../store/animationStore';
import { registerRenderPopup } from '../engine/animation/renderPopupRegistry';
import { RenderPopup } from '../engine-gmt/components/timeline/RenderPopup';
import { installMenu } from '../engine/plugins/Menu';
import { installHelp } from '../engine/plugins/Help';
import { prefetchHelpTopics } from '../data/help/registry';
import { installHud } from '../engine/plugins/Hud';
import { applyPanelManifest } from '../engine/PanelManifest';
import { GmtPanels } from '../engine-gmt/panels';
import { loadGMFScene, saveGMFScene } from '../engine-gmt/utils/FormulaFormat';
import { registry as gmtRegistry } from '../engine-gmt/engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { Preset } from '../types';

import {
    installGmtRenderer,
    gmtRenderer,
    getProxy,
} from '../engine-gmt';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { registerGmtTopbar } from '../engine-gmt/topbar';
import { useEngineStore, getShaderConfigFromState, setFormulaPresetResolver } from '../store/engineStore';
import { parseShareString } from '../utils/Sharing';
import { setFormulaParamResolver } from '../components/ParameterSelector';

// Dev-mode: unregister any stale service workers left by `npm run preview`.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length === 0) return;
        regs.forEach((r) => r.unregister());
        if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
        console.info('[dev] Cleared stale service worker + caches.');
    });
}

registerUI();

// GMT-specific widget + bespoke-panel registrations. Must come after
// the engine's registerUI() so it sees auto-feature-panel already
// registered, and before applyPanelManifest() (which references these
// componentIds for `component:` panels and `widgets:` slots).
registerGmtUi();

// GMT camera slice — savedCameras / undo / redo / addCamera / resetCamera.
// Patches the store with actions engine-core doesn't provide. Must land
// before any component that reads `state.savedCameras.length` (e.g.
// CameraManagerPanel).
installGmtCameraSlice();

// GMT modular slice — Modular formula's pipeline + graph state.
// Without this, switching to the Modular formula crashes FlowEditor
// on `state.graph.nodes` (undefined).
installGmtModularSlice();

// Install GMT's formula-preset resolver so engineStore.setFormula can
// hydrate the store with each formula's defaultPreset on switch.
// Decoupled via setFormulaPresetResolver — the engine core has no
// direct coupling to engine-gmt's FractalRegistry.
setFormulaPresetResolver((f) => registry.get(f)?.defaultPreset as any ?? null);

// Same pattern for the ParameterSelector dropdown: the stub registry
// in components/ParameterSelector.tsx hands back per-formula param
// metadata (authored labels, id list) when a resolver is installed.
// Lets the LFO/modulation target dropdown show "P-A: Power" instead
// of "Param A" for coreMath items.
setFormulaParamResolver((f) => registry.get(f) as any);

// @engine/viewport — GMT is CPU/GPU-heavy on path tracing; adaptive is
// crucial. Target 30 fps; allow deeper quality drops under load since
// Mandelbulb raymarch can be expensive at 1:1 DPR.
installViewport({
    enabled: true,
    targetFps: 30,
    minQuality: 0.35,
    interactionDownsample: 0.55,
    activityGraceMs: 100,
    alwaysActive: false, // GMT-style — settle to full-res on idle
});

// hideDefaults: registerGmtTopbar registers fps/adaptive/pause itself in
// the LEFT slot to match gmt-0.8.5's RenderTools layout, and the project
// name lives inside GmtLogo. installPauseControls is intentionally not
// called for the same reason.
installTopBar({ hideDefaults: true });

installSceneIO({
    // The worker-owned canvas is the first <canvas> in the DOM — it's
    // mounted by GmtRendererCanvas before the R3F Canvas sibling.
    // QuickPngButton auto-registers in the topbar when getCanvas is set.
    getCanvas: () => document.querySelector('canvas'),

    // GMT scene files are GMF: a wrapper carrying both the formula's
    // shader source AND the scene preset. The custom parser extracts
    // both, registers the embedded formula def if it isn't already in
    // the registry (so workshop saves and Fragmentarium imports load
    // cleanly even on a fresh runtime), then returns the preset for
    // engine-core's loadPreset to apply.
    parseScene: (content) => {
        const { def, preset } = loadGMFScene(content);
        if (def && !gmtRegistry.get(def.id)) {
            gmtRegistry.register(def);
            FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
                id: def.id,
                shader: def.shader,
            });
        }
        return preset;
    },

    // Saves go out as GMF so the round-trip preserves the formula's
    // shader. saveGMFScene falls back to plain JSON when the active
    // formula isn't in the registry (defensive — shouldn't happen for
    // GMT scenes, but matches gmt-0.8.5 behaviour).
    //
    // Cast: engine-core's Preset has `formula: string`; engine-gmt's
    // narrows to `FormulaType` (a known-formula union). The runtime
    // shapes are identical — saveGMFScene only reads `formula` to look
    // up the registry, which accepts any string.
    serializeScene: (preset: Preset) => saveGMFScene(preset as any),
});

installModulation();
// GMT's LFO defaults: a fresh LFO targets coreMath.paramA (the first
// formula param) so the user gets a visible reaction immediately
// after clicking "Add LFO". The default seedBaseValue handler already
// reads state.coreMath.paramA correctly via the generic `<fid>.<pid>`
// path, so no resolver override needed.
setLfoListConfig({ defaultTarget: 'coreMath.paramA' });
// engine-gmt/features/ui.tsx already registers `'lfo-list'` directly
// (it does the same registry calls as installModulationUI); this call
// is harmless (idempotent) and documents intent for the GMT app.
installModulationUI();
installShortcuts();
installUndo();
// hideShortcuts: GMT's camera state lives in the savedCameras state-library
// (installed by installGmtCameraSlice → installStateLibrary), which already
// owns Mod+1..9 / 1..9. Letting @engine/camera also register them creates
// a tie-break conflict that the dead-adapter handlers would silently win,
// since this install runs after the state-library's bindings.
installCamera({ hideShortcuts: true });
installMenu();
installHelp();
installHud();

// GMT camera animation binders — registers split-precision sceneOffset
// + Euler rotation track writers via the binderRegistry, plus pre/post
// scrub hooks that read the live camera and emit CAMERA_TELEPORT once
// per animated frame. Used to live inline inside AnimationEngine; moved
// out as part of F5 (see docs/engine/20_Fragility_Audit.md).
installGmtCameraBinders();

// Camera tracks the Key Cam button (in TimelineToolbar) captures into
// keyframes. Without this registration the button hides itself
// (tracks.length === 0 short-circuit). GMT's camera is split-precision
// sceneOffset (`camera.unified.{x,y,z}`) plus Euler rotation
// (`camera.rotation.{x,y,z}`) — same id strings the binders above own.
registerCameraKeyTracks([
    'camera.unified.x',
    'camera.unified.y',
    'camera.unified.z',
    'camera.rotation.x',
    'camera.rotation.y',
    'camera.rotation.z',
]);

// Register the GMT video-export popup. The shared TimelineToolbar's
// "Render" button (component-level visibility gated on a registered
// popup) shows once this fires and opens the popup on click. The
// popup itself drives mediabunny via WorkerExporter.
registerRenderPopup(RenderPopup);

// Warm the help-topics chunk on idle so the first ?-button click
// doesn't fall back to an empty topic map. Mirrors gmt-0.8.5's App.tsx.
prefetchHelpTopics();

// GMT topbar content (System + Camera menus, Path Tracing toggle,
// Playing badge). Must come AFTER installMenu/installCamera so the
// registries they own exist. See engine-gmt/topbar.tsx for scope.
registerGmtTopbar({
    openCameraManager: () => {
        useEngineStore.getState().togglePanel('Camera Manager', true);
    },
    openFormulaWorkshop: () => useEngineStore.getState().openWorkshop(),
});

// Dev-mode sanity check: every componentId referenced by a feature
// (viewportConfig, customUI[]) must resolve in the componentRegistry.
// Catches typos and missing registerUI / registerGmtUi entries at boot
// instead of "blank panel + silent fallback" at first render.
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
    // Lazy import to avoid widening the prod bundle with the validator path.
    void import('../engine/FeatureSystem').then(({ validateComponentRefs }) => {
        void import('../components/registry/ComponentRegistry').then(({ componentRegistry }) => {
            validateComponentRefs(componentRegistry);
        });
    });
}

// @engine-gmt/renderer — wire GMT-specific callbacks.
installGmtRenderer({
    onBooted: () => console.log('[app-gmt] renderer BOOTED'),
    onCrash:  (r) => console.error('[app-gmt] renderer CRASHED:', r),
});

// Tab → camera-mode toggle. The navigation HUD / Navigation.tsx read
// state.cameraMode and switch between Orbit and Fly behaviours.
shortcuts.register({
    id: 'gmt.toggleCameraMode',
    key: 'Tab',
    description: 'Toggle Orbit / Fly camera mode',
    category: 'Navigation',
    handler: () => {
        const cur = (useEngineStore.getState() as any).cameraMode ?? 'Orbit';
        useEngineStore.setState({ cameraMode: cur === 'Fly' ? 'Orbit' : 'Fly' } as any);
    },
});

// ` (Backquote) → toggle advanced mode. Matches GMT's tilde binding
// from useKeyboardShortcuts.ts:115. The Light + advanced-only manifest
// items (e.g. Camera & Navigation section) flip visibility from this.
shortcuts.register({
    id: 'gmt.toggleAdvancedMode',
    key: '`',
    description: 'Toggle Advanced Mode',
    category: 'View',
    handler: () => {
        const s = useEngineStore.getState() as any;
        s.setAdvancedMode?.(!s.advancedMode);
    },
});

// B → toggle broadcast (clean-feed) mode — hides chrome for screenshots
// / screen recording. Mirrors GMT's KeyB binding.
shortcuts.register({
    id: 'gmt.toggleBroadcastMode',
    key: 'b',
    description: 'Toggle Broadcast / Clean-Feed mode',
    category: 'View',
    handler: () => {
        const s = useEngineStore.getState() as any;
        s.setIsBroadcastMode?.(!s.isBroadcastMode);
    },
});

// Escape → exit any active interaction mode (pick focus, draw, etc.)
// and clear timeline selection. Mirrors GMT's Escape handler.
shortcuts.register({
    id: 'gmt.escapeInteraction',
    key: 'Escape',
    description: 'Exit interaction mode / deselect',
    category: 'View',
    handler: () => {
        const s = useEngineStore.getState() as any;
        if (s.isBroadcastMode) s.setIsBroadcastMode?.(false);
        if (s.interactionMode && s.interactionMode !== 'none') {
            s.setInteractionMode?.('none');
        }
        // Animation deselect — direct import; no window-handle needed
        // (F7 cleanup landed: animationStore is just a regular module).
        (useAnimationStore.getState() as any).deselectAll?.();
    },
});

// Camera move undo/redo — Ctrl+Shift+Z / Ctrl+Shift+Y. Distinct from
// the engine's generic Ctrl+Z unified undo (which captures param
// changes); these specifically roll back sceneOffset + rotation moves
// recorded by the camera plugin.
//
// Priority override: engine-core's Undo plugin also binds `Mod+Shift+Z`
// as the Mac-redo alias (`redo.global.shift`). Both register at scope
// 'global', priority 0, so the resolver tie-breaks on insertion order
// — engine-plugin shortcuts register first and would steal the binding.
// Setting priority 10 here lets the camera-undo win cleanly. GMT's UX
// contract is "Ctrl+Shift+Z is camera-undo, full stop"; the Mac-redo
// alias is intentionally suppressed here. Mod+Y still does redo.
shortcuts.register({
    id: 'gmt.undoCameraMove',
    key: 'Ctrl+Shift+Z',
    priority: 10,
    description: 'Undo last camera movement',
    category: 'Navigation',
    handler: () => { (useEngineStore.getState() as any).undoCamera?.(); },
});
shortcuts.register({
    id: 'gmt.redoCameraMove',
    key: 'Ctrl+Shift+Y',
    priority: 10,
    description: 'Redo last camera movement',
    category: 'Navigation',
    handler: () => { (useEngineStore.getState() as any).redoCamera?.(); },
});

// Hydrate store from either a shared URL (#s=...) or the current
// formula's defaultPreset. Mirrors GMT's useAppStartup — populates
// every DDFS slice + scene fields via the presetFieldRegistry.
// Without this, getShaderConfigFromState reads undefined slices and
// the worker boots a half-formed shader.
let bootPreset: any = null;
const hash = typeof window !== 'undefined' ? window.location.hash : '';
if (hash.startsWith('#s=')) {
    try {
        bootPreset = parseShareString(hash.slice(3));
        if (bootPreset) console.info('[app-gmt] Loaded scene from share URL');
    } catch (err) {
        console.error('[app-gmt] Share URL parse failed:', err);
    }
}
if (!bootPreset) {
    const mandelbulbDef = registry.get('Mandelbulb');
    bootPreset = mandelbulbDef?.defaultPreset
        ? JSON.parse(JSON.stringify(mandelbulbDef.defaultPreset))
        : null;
}
if (bootPreset) {
    // loadScene fires CAMERA_TELEPORT — installGmtCameraSlice's listener
    // stashes it on proxy.pendingTeleport for GmtRendererTickDriver to
    // replay once the worker is boot-ready.
    useEngineStore.getState().loadScene({ preset: bootPreset });
} else {
    console.warn('[app-gmt] No boot preset available — worker may boot un-hydrated');
}

applyPanelManifest(GmtPanels);

// Boot the renderer after React has a chance to mount GmtRendererCanvas
// (which calls proxy.initWorkerMode). The 100ms delay mirrors GMT's
// useAppStartup.
setTimeout(() => {
    const state = useEngineStore.getState();
    const config = getShaderConfigFromState(state);
    const camRot = (state as any).cameraRot || { x: 0, y: 0, z: 0, w: 1 };
    const camFov = (state as any).optics?.camFov ?? 60;
    gmtRenderer.boot(config, {
        position: [0, 0, 0],
        quaternion: [camRot.x, camRot.y, camRot.z, camRot.w],
        fov: camFov,
    });

    // Push scene offset to the worker immediately after BOOT — treadmill
    // keeps camera at origin and uses sceneOffset for world position.
    // Without this, the first frame renders from the wrong viewpoint
    // until Navigation fires its own teleport. Mirrors GMT's useAppStartup.
    const proxy = getProxy();
    const offset = (state as any).sceneOffset;
    if (offset) {
        const precise = {
            x: offset.x, y: offset.y, z: offset.z,
            xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0,
        };
        proxy.setShadowOffset(precise);
        proxy.post({ type: 'OFFSET_SET', offset: precise });
    }
}, 100);

// Expose for dev-tools probing.
if (typeof window !== 'undefined') {
    (window as any).__store = useEngineStore;
    (window as any).__gmtProxy = getProxy();
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <AppGmt />
    </React.StrictMode>,
);
