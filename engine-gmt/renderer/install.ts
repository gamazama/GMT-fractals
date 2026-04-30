/**
 * @engine-gmt/renderer — install function + imperative handle.
 *
 * The GMT renderer is a Web Worker that owns OffscreenCanvas + a full
 * THREE.js WebGLRenderer + FractalEngine. This install function is the
 * single entry-point an app uses to plug it in. It does three things:
 *
 *   1. Instantiates the WorkerProxy singleton (idempotent — getProxy() is
 *      cached). UI code that imports getProxy() from anywhere downstream
 *      connects to the same instance.
 *   2. Exposes imperative handles (boot, getCanvas, proxy) for the app's
 *      boot sequence — see useAppStartup equivalent in GMT.
 *   3. Later (Phase F): registers the GMT-specific DDFS slices (optics,
 *      lighting, quality, geometry, coloring, …) and the rendererSlice
 *      that currently lives in legacy-gmt/.
 *
 * The actual canvas + engine lifetime is owned by <GmtRendererCanvas />
 * (direct port of WorkerDisplay.tsx). Per-frame dispatch is owned by
 * <GmtRendererTickDriver /> (direct port of WorkerTickScene.tsx). Apps
 * place both in their React tree — the canvas is a sibling of the R3F
 * <Canvas>, the tick driver sits INSIDE it (uses useFrame).
 *
 * Swap to a different renderer (fluid-toy, fractal-toy, future mesh-
 * viewer): apps import a different plugin's install + components. The
 * plugin contract is intentionally the same shape across renderers.
 */

import type { ShaderConfig } from '../engine/ShaderFactory';
import { getProxy } from '../engine/worker/WorkerProxy';
import { setProxy as setEngineProxy } from '../../engine/worker/WorkerProxy';
import { bindGmtRenderer } from './bindings';
import { useEngineStore } from '../../store/engineStore';

export interface InstallGmtRendererOptions {
    /** Called when the worker finishes BOOT (compile + BOOTED reply).
     *  Apps typically use this to transition from LoadingScreen → live
     *  viewport. */
    onBooted?: () => void;
    /** Called on worker crash — main thread can display a recovery UI. */
    onCrash?: (reason: string) => void;
}

let _installed = false;

/**
 * One-time install. Apps call this at module load before any component
 * that accesses getProxy() mounts. Idempotent — safe to call twice (for
 * HMR recovery).
 */
export const installGmtRenderer = (options: InstallGmtRendererOptions = {}): void => {
    if (_installed) return;
    _installed = true;

    const proxy = getProxy();

    // Register the GMT proxy as the engine-shared singleton so generic
    // dev/ code (engineStore, components, hooks) sees the same booted
    // state as engine-gmt code. Without this, the engine/ stub and
    // engine-gmt's real proxy were two different singletons — generic
    // code saw `isBooted = false` forever while the GMT worker was live.
    setEngineProxy(proxy as any);

    // Wrap the app's onBooted with a re-push of accumulation state.
    // The store's initial sampleCap / isPaused values are pushed via
    // `installAccumulationBindings`, but those messages can arrive at
    // the worker before its FractalEngine has been created (in which
    // case `engine?.setPreviewSampleCap()` is a silent no-op). Re-push
    // here once the worker reports BOOTED so accumulation respects the
    // store's initial cap from the very first frame.
    proxy.onBooted = () => {
        const s = useEngineStore.getState();
        proxy.isPaused = s.isPaused;
        proxy.setPreviewSampleCap(s.sampleCap);
        if (options.onBooted) options.onBooted();
    };
    if (options.onCrash)  proxy.onCrash  = options.onCrash;

    // Bridge generic renderControlSlice state → GMT worker / feature
    // side effects (MSAA config, renderMode lighting, region uniforms).
    // See engine-gmt/renderer/bindings.ts for the wiring details.
    bindGmtRenderer();
};

/**
 * Imperative handle for the app's boot sequence. The typical flow:
 *
 *   1. <GmtRendererCanvas /> mounts → `proxy.initWorkerMode(canvas, ...)`
 *      is called, worker is created, OffscreenCanvas transferred.
 *   2. App's hydration settles (URL parse, preset load, store populated).
 *   3. App calls `gmtRenderer.boot(shaderConfig, initialCamera)` →
 *      proxy.bootWithConfig() → worker runs setupEngine() + compile.
 *   4. <GmtRendererTickDriver /> (mounted inside R3F Canvas) begins
 *      sending RENDER_TICK every frame.
 */
export const gmtRenderer = {
    /** The WorkerProxy singleton. Downstream code also gets it via
     *  getProxy() — both return the same instance. */
    get proxy() { return getProxy(); },

    /** Fire the BOOT message with the initial config + camera. Should
     *  only be called AFTER <GmtRendererCanvas /> has called initWorkerMode
     *  (the canvas is transferred, the worker has replied READY). Apps
     *  usually delegate this timing to useAppStartup. */
    boot(config: ShaderConfig, initialCamera?: { position: [number, number, number]; quaternion: [number, number, number, number]; fov: number }) {
        getProxy().bootWithConfig(config, initialCamera);
    },

    /** Terminate the worker and tear down shadow state. Apps call this
     *  on catastrophic error or for a deliberate restart. */
    terminate() {
        getProxy().terminateWorker();
    },
};
