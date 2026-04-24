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

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppGmt } from './AppGmt';
import { registerUI } from '../engine/features/ui';
import { registerGmtUi } from '../engine-gmt/features/ui';
import { installViewport, viewport } from '../engine/plugins/Viewport';
import { installTopBar } from '../engine/plugins/TopBar';
import { installPauseControls } from '../engine/plugins/topbar/PauseControls';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installModulation } from '../engine/animation/modulationTick';
import { installShortcuts, shortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installCamera } from '../engine/plugins/Camera';
import { installMenu } from '../engine/plugins/Menu';
import { installHelp } from '../engine/plugins/Help';
import { installHud } from '../engine/plugins/Hud';
import { applyPanelManifest } from '../engine/PanelManifest';
import { GmtPanels } from '../engine-gmt/panels';

import {
    installGmtRenderer,
    gmtRenderer,
    getProxy,
} from '../engine-gmt';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { registerGmtTopbar } from '../engine-gmt/topbar';
import { useEngineStore, getShaderConfigFromState, setFormulaPresetResolver } from '../store/engineStore';

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

// Install GMT's formula-preset resolver so engineStore.setFormula can
// hydrate the store with each formula's defaultPreset on switch.
// Decoupled via setFormulaPresetResolver — the engine core has no
// direct coupling to engine-gmt's FractalRegistry.
setFormulaPresetResolver((f) => registry.get(f)?.defaultPreset as any ?? null);

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

installTopBar();
installPauseControls();

installSceneIO({
    // The worker-owned canvas is the first <canvas> in the DOM — it's
    // mounted by GmtRendererCanvas before the R3F Canvas sibling.
    getCanvas: () => document.querySelector('canvas'),
});

installModulation();
installShortcuts();
installUndo();
installCamera();
installMenu();
installHelp();
installHud();

// GMT topbar content (System + Camera menus, Path Tracing toggle,
// Playing badge). Must come AFTER installMenu/installCamera so the
// registries they own exist. See engine-gmt/topbar.tsx for scope.
registerGmtTopbar({
    // Camera Manager panel crashes without GMT's cameraSlice (savedCameras
    // array + addCamera/deleteCamera/etc actions). Reinstate the
    // togglePanel call after porting cameraSlice from gmt-0.8.5.
    openCameraManager: () => console.info('[app-gmt] Camera Manager pending cameraSlice port'),
    // Formula Workshop is a Pass 4+ item.
    openFormulaWorkshop: () => console.info('[app-gmt] Formula Workshop pending port'),
});

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

// Hydrate store from Mandelbulb's defaultPreset. Mirrors GMT's
// useAppStartup — populates every DDFS slice (coloring, lighting,
// geometry, optics, quality, materials, …) plus scene fields
// (cameraRot, sceneOffset, targetDistance, cameraMode) via the
// presetFieldRegistry. Without this, getShaderConfigFromState
// reads undefined slices and the worker boots a half-formed shader.
const mandelbulbDef = registry.get('Mandelbulb');
if (mandelbulbDef?.defaultPreset) {
    useEngineStore.getState().loadScene({
        preset: JSON.parse(JSON.stringify(mandelbulbDef.defaultPreset)),
    });
} else {
    console.warn('[app-gmt] Mandelbulb default preset missing — worker may boot un-hydrated');
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
