
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
    /** App-specific mobile hardware tuning, invoked once on a mobile device
     *  after the generic preset/adaptive overrides. Keeps engine-core
     *  domain-agnostic: GMT uses this to disable its path-tracer capability
     *  (too heavy for mobile GPUs); other apps tune their own params or omit
     *  it. Receives the live store state and the detected hardware profile. */
    applyMobileCaps?: (state: any, profile: { isMobile: boolean; tier: string }) => void;
}

/**
 * `isStartupReady` (formerly `isHydrated`) — the rising edge that triggers
 * boot from LoadingScreen. Named for what it actually signals: the
 * mount-effect ran, hardware detection applied, mobile preset overrides
 * applied, store is safe to read. The store itself is hydrated synchronously
 * by the app's main.tsx before React renders — this flag is "post-mount
 * setup done."
 */
export const useAppStartup = (options?: UseAppStartupOptions) => {
    const opts = options;
    const [startupMode] = useState<'default' | 'url'>(() => {
        if (typeof window === 'undefined') return 'default';
        return window.location.hash.startsWith('#s=') ? 'url' : 'default';
    });
    const [isStartupReady, setIsStartupReady] = useState(false);
    const bootRequestedRef = useRef(false);
    const hydratedRef = useRef(false);

    /**
     * @invariant Re-entrancy guard: `bootRequestedRef` blocks double-fire
     *   unless `force=true`. Formula switches + file loads pass force=true.
     * @invariant 50 ms `setTimeout` yields a React tick so any in-flight
     *   `loadScene` writes settle before the worker reads `ShaderConfig`.
     *   DO NOT remove without revisiting LoadingScreen's
     *   `handleSelectFormula → bootEngineRef.current(true)` race.
     * @see app-gmt/LoadingScreen.tsx [isHydrated] effect for the trigger.
     */
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

        // GPU-crash safe mode: if the render worker lost its WebGL context last
        // session (WorkerProxy sets this flag on CONTEXT_LOST), the persisted
        // scene is too heavy for this device — reloading straight back into it
        // re-crashes the GPU and the screen comes up black. Force the lightest
        // scalability preset for this boot so the recovery render is cheap, and
        // clear the flag (one-shot — normal presets resume next launch).
        let gpuCrashRecovery = false;
        try { gpuCrashRecovery = sessionStorage.getItem('gmt.gpuCrashed') === '1'; } catch { /* private mode */ }
        if (gpuCrashRecovery) {
            try { sessionStorage.removeItem('gmt.gpuCrashed'); } catch { /* ignore */ }
            if ((state as any).applyScalabilityPreset) {
                (state as any).applyScalabilityPreset('fastest');
            }
        }

        // Mobile auto-pick: downgrade scalability preset for first paint.
        // Compile times on mobile GPUs are 2–3× longer than desktop, and
        // `balanced` (the engine default) typically takes ~10s. `fastest` is
        // much cheaper. Only override the *default*: if the user previously
        // chose a different preset (preview/full/ultra), we respect it.
        // Persisted-preset hydration runs before this hook.
        //
        // Mobile also applies any app-specific hardware caps via the
        // `applyMobileCaps` seam (e.g. GMT disables its path-tracer capability,
        // far too heavy for mobile GPUs). Engine-core stays domain-agnostic —
        // the app owns which params to tune.
        if (hwProfile.isMobile) {
            const current = (state as any).scalability?.activePreset;
            if (current === 'balanced' && (state as any).applyScalabilityPreset) {
                (state as any).applyScalabilityPreset('fastest');
            }
            opts?.applyMobileCaps?.(state, hwProfile);
        }

        // Mobile mid- and low-tier devices: default adaptive resolution to
        // SMART mode targeting 60 fps. This previously forced MANUAL mode
        // (adaptiveTarget: 0) because FPS-targeted scaling oscillated on
        // mobile — but that predates two fixes: the 6× mobile downscale
        // ceiling (ADR-0024) and seed-from-cost engagement, which together
        // let smart mode reach a high target without the ramp/oscillation.
        // Manual mode, capped at the interactionDownsample factor, couldn't
        // downsample far enough on a retina phone (the 6× ceiling only
        // applies in smart mode). High-tier mobile already keeps full adaptive.
        //
        // First-run default only: applied when Target FPS is still the engine
        // default (30), unset, or the old forced manual value (0 — never a real
        // user choice, so migrate it). An explicit user-chosen target is kept.
        if (hwProfile.isMobile && hwProfile.tier !== 'high') {
            const setQuality = (state as any).setQuality;
            const at = (state as any).quality?.adaptiveTarget;
            if (setQuality && (at === undefined || at === 0 || at === 30)) {
                setQuality({ dynamicScaling: true, adaptiveTarget: 60 });
            }
        }

        // Caller (e.g. app-gmt/main.tsx) hydrates the store synchronously
        // at module load before React renders. By the time this effect
        // runs we are already hydrated — flip the rising-edge signal that
        // LoadingScreen watches to trigger boot.
        setIsStartupReady(true);
    }, []);

    return { startupMode, bootEngine, isStartupReady };
};
