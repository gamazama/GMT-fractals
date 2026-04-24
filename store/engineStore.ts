/**
 * Primary Zustand store — composes the generic slices (UI, renderer, history,
 * feature-driven DDFS slices, animations) and exposes scene save/load +
 * URL-sharing actions.
 *
 * Nothing here assumes a fractal render pipeline. The `formula` field is an
 * opaque string that apps use as a tag for their active configuration (e.g.
 * a GMT plugin writes 'Mandelbulb', a toy-fluid plugin writes 'JuliaFluid').
 * Feature state is carried under `state[featureId]` and captured/restored
 * via the feature-registry iteration in PresetLogic.
 *
 * TODO (engine-extraction): rename this file to `engineStore.ts` and
 * `useEngineStore` to `useEngineStore` once the downstream component sweep
 * is done. Keeping the old names for now to minimize churn while surgery
 * is in progress.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { EngineStoreState, EngineActions, Preset } from '../types';
import { createUISlice } from './slices/uiSlice';
import { createRenderControlSlice } from './slices/renderControlSlice';
import { createViewportSlice } from './slices/viewportSlice';
import { createScalabilitySlice } from './slices/scalabilitySlice';
import { createHistorySlice } from './slices/historySlice';
import { createFeatureSlice } from './createFeatureSlice';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { featureRegistry } from '../engine/FeatureSystem';
import { applyMigrations } from '../engine/migrations';
import { generateShareStringFromPreset } from '../utils/Sharing';
import { applyPresetState, sanitizeFeatureState } from '../utils/PresetLogic';
import { presetFieldRegistry } from '../utils/PresetFieldRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { animationEngine } from '../engine/AnimationEngine';
import '../engine/features'; // Ensure features are registered

import { compileGate } from './CompileGate';

// App-registered resolver that returns a formula's defaultPreset by id.
// Engine core stays decoupled from any specific formula registry
// (engine-gmt has its own; a future app might use a different source).
// Register via `setFormulaPresetResolver(fn)` at boot; `setFormula`
// queries it on formula switch. Returns null when no resolver is
// installed or the id is unknown — in that case `setFormula` falls
// back to `{ formula: f }` with no feature hydration.
type FormulaPresetResolver = (formulaId: string) => Preset | null | undefined;
let _formulaPresetResolver: FormulaPresetResolver | null = null;
export const setFormulaPresetResolver = (fn: FormulaPresetResolver | null) => {
    _formulaPresetResolver = fn;
};

export const useEngineStore = create<EngineStoreState & EngineActions>()(subscribeWithSelector((set, get, api) => ({
    ...createUISlice(set, get, api),
    ...createRenderControlSlice(set, get, api),
    ...createViewportSlice(set, get, api),
    ...createScalabilitySlice(set, get),
    ...createHistorySlice(set, get, api),
    ...createFeatureSlice(set, get, api),

    // ── Engine-level scalar state (minimal) ──
    formula: '',
    projectSettings: { name: 'Untitled', version: 0 },
    lastSavedHash: null,

    animations: [],
    liveModulations: {},

    // ── Actions ──

    setFormula: (f: string, options: { skipDefaultPreset?: boolean } = {}) => {
        const s = get();
        if (s.formula === f && f !== 'Modular') return;

        if (!options.skipDefaultPreset) {
            get().resetParamHistory();
            // Clear camera undo/redo — old positions make no sense for new formula
            set({ undoStack: [], redoStack: [] });
        }

        const currentName = s.projectSettings.name;
        let newName = currentName;
        if (currentName === s.formula || currentName === 'Untitled' || currentName === 'Custom Preset') {
            newName = f || 'Untitled';
        }

        set({ formula: f, projectSettings: { ...s.projectSettings, name: newName } });

        compileGate.queue("Loading Preview...", () => {
            // Forward formula + optional Modular graph/pipeline to the worker.
            // `pipeline` and `graph` are GMT Modular-formula fields kept as
            // optional via `as any` — they don't exist on the root store type.
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, {
                formula: f,
                pipeline: (s as any).pipeline,
                graph: (s as any).graph,
            } as any);

            if (f !== 'Modular' && !options.skipDefaultPreset) {
                // Resolve the new formula's defaultPreset via the app-
                // registered resolver (engine-gmt installs one at boot
                // that pulls from its FractalRegistry). Clone so the
                // registry's canonical preset can't be mutated by the
                // engine-param-preservation pass below.
                const resolved = _formulaPresetResolver?.(f);
                const formulaPreset: Preset = resolved
                    ? JSON.parse(JSON.stringify(resolved))
                    : { formula: f };

                // Preserve compile-time engine params from current state when the
                // new preset doesn't specify them. Without this, switching
                // formulas resets user-chosen engine settings (maxSteps, estimator,
                // distance metric, etc.) every time.
                if (!formulaPreset.features) formulaPreset.features = {};
                const currentState = get();
                featureRegistry.getEngineFeatures().forEach((feat) => {
                    const currentSlice = (currentState as any)[feat.id];
                    if (!currentSlice) return;
                    const presetBlock = (formulaPreset.features as any)[feat.id] || {};
                    const engineParams: Record<string, any> = {};
                    const toggleParam = feat.engineConfig!.toggleParam;
                    if (currentSlice[toggleParam] !== undefined && presetBlock[toggleParam] === undefined) {
                        engineParams[toggleParam] = currentSlice[toggleParam];
                    }
                    Object.entries(feat.params).forEach(([key, config]) => {
                        if (
                            config.onUpdate === 'compile'
                            && currentSlice[key] !== undefined
                            && presetBlock[key] === undefined
                        ) {
                            engineParams[key] = currentSlice[key];
                        }
                    });
                    if (!(formulaPreset.features as any)[feat.id]) (formulaPreset.features as any)[feat.id] = {};
                    Object.assign((formulaPreset.features as any)[feat.id], engineParams);
                });

                const lockScene = (get() as any).lockSceneOnSwitch;
                if (lockScene) {
                    // Keep current scene state (optics, camera, lighting, …) and
                    // only adopt the new formula's coreMath + geometry.
                    const current = get().getPreset();
                    const mergedFeatures = { ...(current.features || {}) };
                    const newFeatures = (formulaPreset.features || {}) as any;
                    if (newFeatures.coreMath) (mergedFeatures as any).coreMath = newFeatures.coreMath;
                    if (newFeatures.geometry) (mergedFeatures as any).geometry = newFeatures.geometry;
                    const merged: Preset = { ...current, formula: f, features: mergedFeatures } as Preset;
                    get().loadPreset(merged);
                } else {
                    get().loadPreset(formulaPreset);
                }
            }

            get().handleInteractionEnd();

            // Tell the worker all CONFIGs have been sent — compile immediately.
            // Relies on engine-gmt/renderer/GmtRendererTickDriver bridging
            // CONFIG_DONE via FractalEvents to the real worker proxy.
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG_DONE, undefined);
        });
    },

    setProjectSettings: (s) => set((prev) => {
        const nextSettings = { ...prev.projectSettings, ...s };
        if (s.name && s.name !== prev.projectSettings.name) {
            nextSettings.version = 0;
            return { projectSettings: nextSettings, lastSavedHash: null };
        }
        return { projectSettings: nextSettings };
    }),

    prepareExport: () => {
        const s = get();
        const p = s.getPreset({ includeScene: true });
        const { version, name, ...content } = p as any;
        const currentHash = JSON.stringify(content);

        if (s.lastSavedHash === null || s.projectSettings.version === 0) {
            const nextVer = Math.max(1, s.projectSettings.version + 1);
            set({ projectSettings: { ...s.projectSettings, version: nextVer }, lastSavedHash: currentHash });
            return nextVer;
        }

        if (s.lastSavedHash !== currentHash) {
            const nextVer = s.projectSettings.version + 1;
            set({ projectSettings: { ...s.projectSettings, version: nextVer }, lastSavedHash: currentHash });
            return nextVer;
        }
        return s.projectSettings.version;
    },

    setAnimations: (v) => {
        const currentArr = get().animations;
        const nextArr = v.map((next) => {
            const current = currentArr.find(c => c.id === next.id);
            if (!current) return next;
            if (next.period !== current.period && next.period > 0) {
                const time = performance.now() / 1000;
                const newPhase = ((time / current.period) + current.phase - (time / next.period)) % 1.0;
                return { ...next, phase: (newPhase + 1.0) % 1.0 };
            }
            return next;
        });
        set({ animations: nextArr });
    },

    setLiveModulations: (v) => set({ liveModulations: v }),

    loadPreset: (p) => {
        // Run registered slice migrations BEFORE dispatching setters.
        // Mutates p in place; safe because the caller doesn't reuse it
        // and SceneFormat always hands us a fresh deserialized object.
        p = applyMigrations(p) as Preset;

        get().resetParamHistory();
        set({ formula: p.formula });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { formula: p.formula });

        let newName = p.name;
        if (!newName || newName === 'Untitled' || newName === 'Custom Preset') {
            newName = p.formula || 'Untitled';
        }

        set({ projectSettings: { name: newName, version: 0 }, lastSavedHash: null });
        applyPresetState(p, set as (partial: Record<string, unknown>) => void, get as unknown as () => Record<string, unknown>);

        // Emit CAMERA_TELEPORT so apps that drive a 3D camera (GMT-style
        // treadmill nav) warp the viewport to the loaded pose instead of
        // continuing to interpolate from the pre-load position. 2D / no-
        // camera apps ignore it. Preserves the preset's exact camera state.
        const loaded = get() as any;
        if (loaded.sceneOffset || loaded.cameraRot) {
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
                position: { x: 0, y: 0, z: 0 },
                rotation: loaded.cameraRot,
                sceneOffset: loaded.sceneOffset,
                targetDistance: loaded.targetDistance,
            } as any);
        }

        setTimeout(() => {
            const loadedState = get().getPreset({ includeScene: true });
            const { version, name, ...content } = loadedState as any;
            set({ lastSavedHash: JSON.stringify(content) });
        }, 50);
    },

    loadScene: ({ preset }: { def?: any; preset: Preset }) => {
        // Initial startup: hydrate store immediately, no spinner needed
        if (!engine.isBooted && !engine.bootSent) {
            get().loadPreset(preset);
            return;
        }

        compileGate.queue("Loading Preview...", () => {
            get().loadPreset(preset);
            engine.post({ type: 'CONFIG_DONE' });
        });
    },

    getPreset: (options) => {
        const s = get();

        const p: Preset = {
            version: s.projectSettings.version,
            name: s.projectSettings.name,
            formula: s.formula,
            features: {},
        };

        if (options?.includeScene !== false) {
            // Non-feature scene fields from the registry (cameraRot, targetDistance, …).
            Object.assign(p, presetFieldRegistry.serializeAll(s));
            p.lights = [];
        }

        // Feature state — generic iteration over the registry.
        for (const feat of featureRegistry.getAll()) {
            const sliceState = (s as any)[feat.id];
            if (sliceState) {
                if (!p.features) p.features = {};
                p.features![feat.id] = sanitizeFeatureState(sliceState);
            }
        }

        p.animations = s.animations;

        try {
            // @ts-expect-error — window global for cross-store access without import cycle
            const animStore = window.useAnimationStore?.getState?.();
            if (animStore) {
                p.sequence = animStore.sequence;
                p.duration = animStore.durationFrames;
            }
        } catch (e) {
            console.warn("Failed to save animation sequence:", e);
        }

        return p;
    },

    getShareString: (options) => {
        const p = get().getPreset({ includeScene: true });
        const advanced = get().advancedMode;
        return generateShareStringFromPreset(p, advanced, options);
    },
})));

export const selectIsGlobalInteraction = (state: EngineStoreState) => {
    return state.isUserInteracting || state.interactionMode !== 'none';
};

/**
 * Canonical accessor for the render canvas's physical pixel dimensions.
 * Returns [widthPx, heightPx] in physical pixels.
 */
export const getCanvasPhysicalPixelSize = (state: EngineStoreState): [number, number] => {
    const dpr = state.dpr || 1;
    if (state.resolutionMode === 'Fixed') {
        return [
            Math.max(1, Math.floor(state.fixedResolution[0] * dpr)),
            Math.max(1, Math.floor(state.fixedResolution[1] * dpr)),
        ];
    }
    return state.canvasPixelSize;
};

export const selectMovementLock = (state: EngineStoreState) => {
    if (state.isGizmoDragging || state.interactionMode !== 'none' || state.isExporting || state.isBucketRendering) return true;
    const features = featureRegistry.getAll();
    for (const feat of features) {
        if (feat.interactionConfig?.blockCamera && feat.interactionConfig.activeParam) {
            const slice = (state as any)[feat.id];
            if (slice && slice[feat.interactionConfig.activeParam]) return true;
        }
    }
    return false;
};

/**
 * Builds a ShaderConfig snapshot from the current store state. Used by the
 * config manager and any render-engine plugin that needs to observe the
 * authoritative state as a flat config object.
 */
export const getShaderConfigFromState = (state: EngineStoreState): any => {
    const config: any = {
        formula: state.formula,
        msaaSamples: state.msaaSamples,
        previewMode: state.previewMode,
        renderMode: state.renderMode,
        compilerHardCap: state.compilerHardCap,
    };

    for (const feat of featureRegistry.getAll()) {
        const slice = (state as any)[feat.id];
        if (slice) {
            config[feat.id] = { ...slice };
        }
    }

    return config;
};

/**
 * Wires store subscriptions → worker proxy events at app boot.
 * Apps call this once after store construction.
 */
// Force-import the animation store at module load so its
// `window.useAnimationStore` side effect fires before EngineBridge's
// useEffect tries to read it. Without this, apps that only reach
// animationStore through a lazy-loaded Timeline would see a null
// animStore in animationEngine and playback would silently not work.
import { useAnimationStore } from './animationStore';

export const bindStoreToEngine = () => {
    const s = useEngineStore.getState();

    // Connect AnimationEngine to stores (decoupled injection).
    // window.useAnimationStore is set at module load of animationStore.ts;
    // our eager import above ensures it's populated before this runs.
    animationEngine.connect(useAnimationStore as any, useEngineStore);

    engine.isPaused = s.isPaused;
    engine.setPreviewSampleCap(s.sampleCap);

    useEngineStore.subscribe(state => state.isPaused, (v) => { engine.isPaused = v; });
    useEngineStore.subscribe(state => state.sampleCap, (v) => { engine.setPreviewSampleCap(v); });
};

// Expose store on window for dev console access
if (typeof window !== 'undefined') {
    (window as any).__store = useEngineStore;
}
