
import { useRef, useEffect, useState, useCallback } from 'react';
import { useEngineStore, getShaderConfigFromState } from '../store/engineStore';
import { detectHardwareProfileMainThread } from '../engine/HardwareDetection';
import { compileGate } from '../store/CompileGate';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import type { ShaderConfig } from '../engine/ShaderFactory';

/**
 * Generic boot sequence.
 *
 * Does NOT hydrate the store — that is app-specific (which formula's
 * defaultPreset to load, which top-level slices to populate). Apps run
 * synchronous hydration at module load (before React mounts) so the
 * canvas's `initWorkerMode` reads a fully-populated state.
 *
 * This hook:
 *   1. Detects whether startup mode is `default` or `url` (from `#s=…`)
 *   2. Runs hardware detection on mount
 *   3. Marks `isHydrated = true` on mount (caller has already hydrated)
 *   4. Exposes `bootEngine` which routes through `compileGate.queue` so
 *      the CompilingIndicator's progress curve animates during the boot
 *      compile, and emits `compile_estimate` first so the curve uses
 *      the real estimate from `estimateCompileTime` rather than the
 *      indicator's 15s default.
 */
interface InitialCamera {
    position: [number, number, number];
    quaternion: [number, number, number, number];
    fov: number;
}

interface UseAppStartupOptions {
    /** Called inside the compileGate work closure to actually post BOOT
     *  to the renderer's worker. Apps wire `gmtRenderer.boot` here so
     *  the right proxy instance is used. */
    bootRenderer: (config: ShaderConfig, camera: InitialCamera) => void;
    /** Called after BOOT to push initial scene offset (treadmill engine).
     *  Apps that don't use sceneOffset can leave undefined. */
    pushOffset?: (offset: { x: number; y: number; z: number; xL: number; yL: number; zL: number }) => void;
    /** Returns whether boot has already been requested / completed.
     *  Used to short-circuit duplicate triggerBoot calls. */
    isBootedOrRequested?: () => boolean;
    /** Returns the expected boot-compile duration in ms. The value is
     *  emitted on `compile_estimate` so CompileProgressStore can project
     *  the bar over a realistic duration on the very first cycle. Apps
     *  pass `(state) => estimateCompileTime(state)` (engine-gmt) or any
     *  equivalent estimator. Optional — without it, the indicator falls
     *  back to its 15s default. */
    estimateBootCompileMs?: (state: any) => number;
}

export const useAppStartup = (_isSceneReady: boolean, options?: UseAppStartupOptions) => {
    const opts = options;
    const [startupMode] = useState<'default' | 'url'>(() => {
        if (typeof window === 'undefined') return 'default';
        return window.location.hash.startsWith('#s=') ? 'url' : 'default';
    });
    const [isHydrated, setIsHydrated] = useState(false);
    const bootRequestedRef = useRef(false);
    const hydratedRef = useRef(false);

    const bootEngine = useCallback((force?: boolean) => {
        if (!opts) return; // No-op when caller provides no boot wiring.
        if (!force) {
            if (bootRequestedRef.current) return;
            if (opts.isBootedOrRequested?.()) return;
        }
        bootRequestedRef.current = true;

        try {
            // 50ms yield: give React a chance to flush any pending state
            // updates from a just-completed loadScene before we read the
            // store. Mirrors stable's bootEngine.
            setTimeout(() => {
                const currentStore = useEngineStore.getState();
                const startConfig = getShaderConfigFromState(currentStore);
                const camRot = (currentStore as any).cameraRot || { x: 0, y: 0, z: 0, w: 1 };
                const camFov = (currentStore as any).optics?.camFov ?? 60;
                const initialCamera: InitialCamera = {
                    position: [0, 0, 0],
                    quaternion: [camRot.x, camRot.y, camRot.z, camRot.w],
                    fov: camFov,
                };
                const offset = (currentStore as any).sceneOffset;
                const precise = offset ? {
                    x: offset.x, y: offset.y, z: offset.z,
                    xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0,
                } : null;

                // Pre-emit the real estimate so CompilingIndicator's first
                // cycle uses it rather than the 15s default.
                if (opts.estimateBootCompileMs) {
                    FractalEvents.emit(
                        FRACTAL_EVENTS.COMPILE_ESTIMATE,
                        opts.estimateBootCompileMs(currentStore),
                    );
                }

                compileGate.queue('Compiling Shader...', () => {
                    opts.bootRenderer(startConfig, initialCamera);
                    if (precise && opts.pushOffset) {
                        opts.pushOffset(precise);
                    }
                });
            }, 50);
        } catch (e) {
            console.error("Critical Engine Boot Failure:", e);
            bootRequestedRef.current = false;
        }
    }, [opts]);

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        const hwProfile = detectHardwareProfileMainThread();
        const state = useEngineStore.getState();
        if ((state as any).setHardwareProfile) {
            (state as any).setHardwareProfile(hwProfile);
        }

        // Mobile auto-pick: downgrade scalability preset for first
        // paint. Compile times on mobile GPUs are 2–3× longer than
        // desktop, and `balanced` (the engine default) typically takes
        // ~10s. `fastest` lands at ~5s with path tracing still on.
        //
        // Only override the *default*: if the user previously chose a
        // different preset (preview/lite/full/ultra), we respect it.
        // Persisted-preset hydration runs before this hook.
        if (hwProfile.isMobile) {
            const current = (state as any).scalability?.activePreset;
            if (current === 'balanced' && (state as any).applyScalabilityPreset) {
                (state as any).applyScalabilityPreset('fastest');
            }
        }

        // Caller (e.g. app-gmt/main.tsx) hydrates the store synchronously
        // at module load before React renders. By the time this effect
        // runs we are already hydrated.
        setIsHydrated(true);
    }, []);

    return { startupMode, bootEngine, isHydrated };
};
