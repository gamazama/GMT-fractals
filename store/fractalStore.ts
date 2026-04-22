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
 * `useFractalStore` to `useEngineStore` once the downstream component sweep
 * is done. Keeping the old names for now to minimize churn while surgery
 * is in progress.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FractalStoreState, FractalActions, Preset } from '../types';
import { createUISlice } from './slices/uiSlice';
import { createRendererSlice } from './slices/rendererSlice';
import { createHistorySlice } from './slices/historySlice';
import { createFeatureSlice } from './createFeatureSlice';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { featureRegistry } from '../engine/FeatureSystem';
import { generateShareStringFromPreset } from '../utils/Sharing';
import { applyPresetState, sanitizeFeatureState } from '../utils/PresetLogic';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { animationEngine } from '../engine/AnimationEngine';
import '../features'; // Ensure features are registered

import { compileGate } from './CompileGate';

export const useFractalStore = create<FractalStoreState & FractalActions>()(subscribeWithSelector((set, get, api) => ({
    ...createUISlice(set, get, api),
    ...createRendererSlice(set, get, api),
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
        if (s.formula === f) return;

        if (!options.skipDefaultPreset) {
            get().resetParamHistory();
            set({ undoStack: [], redoStack: [] });
        }

        const currentName = s.projectSettings.name;
        let newName = currentName;
        if (currentName === s.formula || currentName === 'Untitled' || currentName === 'Custom Preset') {
            newName = f || 'Untitled';
        }

        set({ formula: f, projectSettings: { ...s.projectSettings, name: newName } });

        compileGate.queue("Loading Preview...", () => {
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { formula: f });
            get().handleInteractionEnd();
            engine.post({ type: 'CONFIG_DONE' });
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
        get().resetParamHistory();
        set({ formula: p.formula });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { formula: p.formula });

        let newName = p.name;
        if (!newName || newName === 'Untitled' || newName === 'Custom Preset') {
            newName = p.formula || 'Untitled';
        }

        set({ projectSettings: { name: newName, version: 0 }, lastSavedHash: null });
        applyPresetState(p, set as (partial: Record<string, unknown>) => void, get as unknown as () => Record<string, unknown>);

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
            p.cameraRot = s.cameraRot;
            p.targetDistance = s.targetDistance;
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

export const selectIsGlobalInteraction = (state: FractalStoreState) => {
    return state.isUserInteracting || state.interactionMode !== 'none';
};

/**
 * Canonical accessor for the render canvas's physical pixel dimensions.
 * Returns [widthPx, heightPx] in physical pixels.
 */
export const getCanvasPhysicalPixelSize = (state: FractalStoreState): [number, number] => {
    const dpr = state.dpr || 1;
    if (state.resolutionMode === 'Fixed') {
        return [
            Math.max(1, Math.floor(state.fixedResolution[0] * dpr)),
            Math.max(1, Math.floor(state.fixedResolution[1] * dpr)),
        ];
    }
    return state.canvasPixelSize;
};

export const selectMovementLock = (state: FractalStoreState) => {
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
export const getShaderConfigFromState = (state: FractalStoreState): any => {
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
export const bindStoreToEngine = () => {
    const s = useFractalStore.getState();

    // Connect AnimationEngine to stores (decoupled injection)
    animationEngine.connect((window as any).useAnimationStore, useFractalStore);

    engine.isPaused = s.isPaused;
    engine.setPreviewSampleCap(s.sampleCap);

    useFractalStore.subscribe(state => state.isPaused, (v) => { engine.isPaused = v; });
    useFractalStore.subscribe(state => state.sampleCap, (v) => { engine.setPreviewSampleCap(v); });
};

// Expose store on window for dev console access
if (typeof window !== 'undefined') {
    (window as any).__store = useFractalStore;
}
