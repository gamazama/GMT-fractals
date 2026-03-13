
import { useRef, useEffect, useState, useCallback } from 'react';
import { useFractalStore, getShaderConfigFromState } from '../store/fractalStore';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { registry } from '../engine/FractalRegistry';
import { parseShareString } from '../utils/Sharing';
import { Preset } from '../types';
import { ENGINE_PROFILES } from '../features/engine/profiles';

const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
};

export const useAppStartup = (isSceneReady: boolean) => {
    const state = useFractalStore();

    const [startupMode, setStartupMode] = useState<'default' | 'url'>('default');
    const bootRequestedRef = useRef(false);

    // 1. STABLE BOOT FUNCTION
    const bootEngine = useCallback((force?: boolean) => {
        if (!force && (engine.isBooted || bootRequestedRef.current)) return;
        bootRequestedRef.current = true;

        try {
            // Yield to allow other useEffects (e.g. useAppStartup's loadPreset)
            // to hydrate the store before we read it. Reading inside the callback
            // guarantees we get the fully-hydrated state, not default values.
            setTimeout(() => {
                const currentStore = useFractalStore.getState();
                const startConfig = getShaderConfigFromState(currentStore);
                const camPos = currentStore.cameraPos || { x: 0, y: 0, z: 3 };
                const camRot = currentStore.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
                const camFov = (currentStore as any).optics?.camFov ?? 60;
                const initialCamera = {
                    position: [camPos.x, camPos.y, camPos.z] as [number, number, number],
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
            }, 50);
        } catch (e) {
            console.error("Critical Engine Boot Failure:", e);
            bootRequestedRef.current = false;
        }
    }, []);

    useEffect(() => {
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

        // 3. Environment Optimizations (Mobile)
        if (preset && isMobileDevice()) {
             if (import.meta.env.DEV) console.log("App: Mobile detected. Enforcing Lite profile.");
             if (!preset.features) preset.features = {};
             const liteProfile = ENGINE_PROFILES.lite;

             Object.entries(liteProfile).forEach(([featureId, params]) => {
                 if (!preset!.features![featureId]) {
                     preset!.features![featureId] = {};
                 }
                 Object.assign(preset!.features![featureId], params);
             });
        }

        // 4. Load into Store (UI State)
        if (preset) {
            if (import.meta.env.DEV) console.log("App: Hydrating Store from Preset...");
            state.loadPreset(preset);
        }

        // Don't boot here — LoadingScreen will call bootEngine().
        // Chrome: boots immediately (async compile won't stall WebGL spinner).
        // Firefox: boots after cosmetic progress bar completes (synchronous compile
        // would freeze the UI via shared GPU process).
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { startupMode, bootEngine };
};
