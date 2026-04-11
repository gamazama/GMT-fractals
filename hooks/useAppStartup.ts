
import { useRef, useEffect, useState, useCallback } from 'react';
import { useFractalStore, getShaderConfigFromState } from '../store/fractalStore';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { registry } from '../engine/FractalRegistry';
import { parseShareString } from '../utils/Sharing';
import type { Preset } from '../types';
import { detectHardwareProfileMainThread } from '../engine/HardwareDetection';

export const useAppStartup = (isSceneReady: boolean) => {
    const state = useFractalStore();

    const [startupMode, setStartupMode] = useState<'default' | 'url'>('default');
    const [isHydrated, setIsHydrated] = useState(false);
    const bootRequestedRef = useRef(false);
    const hydratedRef = useRef(false);

    // 1. STABLE BOOT FUNCTION
    const bootEngine = useCallback((force?: boolean) => {
        if (!force && (engine.isBooted || bootRequestedRef.current)) return;
        bootRequestedRef.current = true;

        try {
            // Short yield to let React flush any pending state updates from
            // loadScene before we read the store. The hydration gate in
            // LoadingScreen already ensures formulas are imported and URL
            // preset is applied before bootEngine is called.
            setTimeout(() => {
                const currentStore = useFractalStore.getState();
                const startConfig = getShaderConfigFromState(currentStore);
                // Camera is always at origin; world position lives in sceneOffset.
                const camRot = currentStore.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
                const camFov = (currentStore as any).optics?.camFov ?? 60;
                const initialCamera = {
                    position: [0, 0, 0] as [number, number, number],
                    quaternion: [camRot.x, camRot.y, camRot.z, camRot.w] as [number, number, number, number],
                    fov: camFov
                };
                engine.bootWithConfig(startConfig, initialCamera);

                // Push scene offset immediately — the treadmill engine keeps camera at
                // origin and uses sceneOffset for the real position. Without this, the
                // preview shader renders from the wrong viewpoint until onBooted fires.
                const offset = currentStore.sceneOffset;
                if (offset) {
                    const precise = {
                        x: offset.x, y: offset.y, z: offset.z,
                        xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0
                    };
                    engine.setShadowOffset(precise);
                    engine.post({ type: 'OFFSET_SET', offset: precise });
                }

                // NOTE: camera_teleport is NOT emitted here — this 50ms timer
                // fires before R3F's Navigation is guaranteed to be mounted.
                // Instead, WorkerTickScene emits the teleport after boot+compile
                // finishes, when Navigation is definitely listening.
            }, 50);
        } catch (e) {
            console.error("Critical Engine Boot Failure:", e);
            bootRequestedRef.current = false;
        }
    }, []);

    useEffect(() => {
        // Guard against React StrictMode re-running this effect.
        // loadScene is idempotent but wasteful — fires all feature setters twice.
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        // Formulas are loaded via dynamic import so they're in a separate chunk,
        // reducing the initial bundle size. Registration must complete before
        // loadScene() calls registry.get().
        import('../formulas').then(() => {
            // 2. Determine Initial Preset
            const hash = window.location.hash;
            let preset: Preset | null = null;

            if (hash && hash.startsWith('#s=')) {
                const stateStr = hash.slice(3);
                if (import.meta.env.DEV) console.log("App: Found shared state in URL. Parsing...");
                preset = parseShareString(stateStr);
                if (preset) {
                    setStartupMode('url');
                }
            }

            // If no URL or parse failed, use default for Mandelbulb
            if (!preset) {
                 const def = registry.get('Mandelbulb');
                 if (def && def.defaultPreset) {
                     preset = JSON.parse(JSON.stringify(def.defaultPreset)) as Preset;
                 }
            }

            // 3. Environment Optimizations — Non-destructive hardware detection
            //    The preset is loaded UNMODIFIED into the store (authored intent preserved).
            //    Hardware caps + viewport quality tiers are applied at getShaderConfigFromState().
            const hwProfile = detectHardwareProfileMainThread();
            state.setHardwareProfile(hwProfile);
            if (hwProfile.isMobile) {
                if (import.meta.env.DEV) console.log("App: Mobile detected. Setting Lite viewport quality.");
                state.applyScalabilityPreset('lite');
            }

            // 4. Load into Store (UI State) via unified loadScene path.
            //    loadScene detects the engine hasn't booted yet and skips CONFIG/OFFSET
            //    events (they would just queue and cause a redundant second compile).
            //    bootEngine() will push the full config + offset after the worker boots.
            if (preset) {
                if (import.meta.env.DEV) console.log("App: Hydrating Store from Preset...");
                state.loadScene({ preset });
            }

            // Signal that the store is hydrated — LoadingScreen gates boot on this
            // to avoid a race where bootEngine reads the store before formulas are
            // imported and the URL preset is applied.
            setIsHydrated(true);
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { startupMode, bootEngine, isHydrated };
};
