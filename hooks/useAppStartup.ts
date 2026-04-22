
import { useRef, useEffect, useState, useCallback } from 'react';
import { useFractalStore, getShaderConfigFromState } from '../store/fractalStore';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { parseShareString } from '../utils/Sharing';
import type { Preset } from '../types';
import { detectHardwareProfileMainThread } from '../engine/HardwareDetection';

/**
 * Generic boot sequence.
 *
 * Does not assume a fractal registry or a formulas bundle. Apps that need
 * to seed an initial scene register a side-effect `initializer` callback
 * via module-level import before rendering, or wire their own startup hook.
 *
 * The hook:
 *   1. Parses a `#s=<state>` URL fragment into a Preset if present
 *   2. Runs hardware detection
 *   3. Calls `loadScene` on any preset found (no-op if none)
 *   4. Exposes `bootEngine` which apps call to complete boot when the
 *      display layer is ready
 */
export const useAppStartup = (_isSceneReady: boolean) => {
    const state = useFractalStore();

    const [startupMode, setStartupMode] = useState<'default' | 'url'>('default');
    const [isHydrated, setIsHydrated] = useState(false);
    const bootRequestedRef = useRef(false);
    const hydratedRef = useRef(false);

    const bootEngine = useCallback((force?: boolean) => {
        if (!force && (engine.isBooted || bootRequestedRef.current)) return;
        bootRequestedRef.current = true;

        try {
            setTimeout(() => {
                const currentStore = useFractalStore.getState();
                const startConfig = getShaderConfigFromState(currentStore);
                const camRot = currentStore.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
                const camFov = (currentStore as any).optics?.camFov ?? 60;
                const initialCamera = {
                    position: [0, 0, 0] as [number, number, number],
                    quaternion: [camRot.x, camRot.y, camRot.z, camRot.w] as [number, number, number, number],
                    fov: camFov,
                };
                engine.bootWithConfig(startConfig, initialCamera);
            }, 50);
        } catch (e) {
            console.error("Critical Engine Boot Failure:", e);
            bootRequestedRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        const hash = window.location.hash;
        let preset: Preset | null = null;

        if (hash && hash.startsWith('#s=')) {
            const stateStr = hash.slice(3);
            preset = parseShareString(stateStr);
            if (preset) setStartupMode('url');
        }

        const hwProfile = detectHardwareProfileMainThread();
        // Hardware profile setter was added by the deleted scalability slice.
        // Apps that want tier-based quality presets re-install the setter.
        if ((state as any).setHardwareProfile) {
            (state as any).setHardwareProfile(hwProfile);
        }

        if (preset) {
            state.loadScene({ preset });
        }

        setIsHydrated(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { startupMode, bootEngine, isHydrated };
};
