
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FractalStoreState, FractalActions, Preset } from '../types';
import type { FractalDefinition } from '../types/fractal';
import { createUISlice } from './slices/uiSlice';
import { createRendererSlice } from './slices/rendererSlice';
import { createCameraSlice } from './slices/cameraSlice';
import { createHistorySlice } from './slices/historySlice';
import { createFeatureSlice } from './createFeatureSlice';
import { createScalabilitySlice, bindGetShaderConfig } from './slices/scalabilitySlice';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();
import { registry } from '../engine/FractalRegistry';
import { featureRegistry } from '../engine/FeatureSystem';
import { generateShareStringFromPreset } from '../utils/Sharing';
import { getFullDefaultPreset, applyPresetState, sanitizeFeatureState } from '../utils/PresetLogic';
import type { ShaderConfig } from '../engine/ShaderFactory';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { animationEngine } from '../engine/AnimationEngine';
import { detectEngineProfile, ENGINE_PROFILES } from '../features/engine/profiles';
import { pipelineToGraph, isStructureEqual, isPipelineEqual, topologicalSort } from '../utils/graphAlg';
import { JULIA_REPEATER_PIPELINE } from '../data/initialPipelines';
import '../features'; // Ensure features are registered
import { PreciseVector3 } from '../types';
import { DEFAULT_HARD_CAP } from '../data/constants';
import { OpticsState } from '../features/optics';

export const useFractalStore = create<FractalStoreState & FractalActions>()(subscribeWithSelector((set, get, api) => ({
    ...createUISlice(set, get, api),
    ...createRendererSlice(set, get, api),
    ...createCameraSlice(set, get, api),
    ...createHistorySlice(set, get, api),
    ...createFeatureSlice(set, get, api),
    ...createScalabilitySlice(set, get),

    // Initial State not covered by slices
    formula: 'Mandelbulb',
    pipeline: JULIA_REPEATER_PIPELINE,
    pipelineRevision: 1,
    graph: pipelineToGraph(JULIA_REPEATER_PIPELINE),
    projectSettings: { name: 'Mandelbulb', version: 0 },
    lastSavedHash: null,
    
    animations: [],
    liveModulations: {},

    // Actions
    setFormula: (f, options: { skipDefaultPreset?: boolean } = {}) => {
        const s = get();
        const currentFormula = s.formula;
        if (currentFormula === f && f !== 'Modular') return;
        
        if (!options.skipDefaultPreset) {
            get().resetParamHistory();
            // Clear camera undo/redo — old positions make no sense for new formula
            set({ undoStack: [], redoStack: [] });
        }

        const currentName = s.projectSettings.name;
        let newName = currentName;
        if (currentName === currentFormula || currentName === 'Untitled' || currentName === 'Custom Preset') {
            newName = f;
        }

        set({ formula: f, projectSettings: { ...s.projectSettings, name: newName } });
        
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { 
            formula: f,
            pipeline: s.pipeline,
            graph: s.graph
        });
        
        if (f !== 'Modular' && !options.skipDefaultPreset) {
            const def = registry.get(f);
            const formulaPreset: Preset = (def && def.defaultPreset) ? JSON.parse(JSON.stringify(def.defaultPreset)) : { formula: f };
            
            // Preserve compile-time engine params from current state, but only when
            // the formula preset doesn't specify its own values. Formula presets contain
            // tuned engine settings (estimator, distanceMetric, etc.) that must not be
            // overwritten by the previous formula's state.
            if (!formulaPreset.features) formulaPreset.features = {};
            const currentState = get();
            featureRegistry.getEngineFeatures().forEach(feat => {
                const currentSlice = (currentState as any)[feat.id];
                if (!currentSlice) return;
                const presetBlock = formulaPreset.features![feat.id] || {};
                const engineParams: Record<string, any> = {};
                // Preserve the master toggle only if the preset doesn't set it
                const toggleParam = feat.engineConfig!.toggleParam;
                if (currentSlice[toggleParam] !== undefined && presetBlock[toggleParam] === undefined) {
                    engineParams[toggleParam] = currentSlice[toggleParam];
                }
                // Preserve compile-time params only if the preset doesn't set them
                Object.entries(feat.params).forEach(([key, config]) => {
                    if (config.onUpdate === 'compile' && currentSlice[key] !== undefined && presetBlock[key] === undefined) {
                        engineParams[key] = currentSlice[key];
                    }
                });
                if (!formulaPreset.features![feat.id]) formulaPreset.features![feat.id] = {};
                Object.assign(formulaPreset.features![feat.id], engineParams);
            });

            const lockScene = get().lockSceneOnSwitch;
            
            if (lockScene) {
                const current = get().getPreset(); 
                
                const mergedFeatures = { ...(current.features || {}) };
                const newFeatures = formulaPreset.features || {};
                
                if (newFeatures.coreMath) mergedFeatures.coreMath = newFeatures.coreMath;
                if (newFeatures.geometry) mergedFeatures.geometry = newFeatures.geometry;
                
                const merged: any = {
                    ...current, 
                    formula: f,
                    features: mergedFeatures
                };
                
                get().loadPreset(merged as Preset);
            } else {
                get().loadPreset(formulaPreset as Preset);
            }
        }
        
        get().handleInteractionEnd();
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

    setGraph: (g) => {
        const sortedPipeline = topologicalSort(g.nodes, g.edges);
        const s = get();
        if (!isStructureEqual(s.pipeline, sortedPipeline)) {
            if (s.autoCompile) {
                const nextRev = s.pipelineRevision + 1;
                set({ graph: g, pipeline: sortedPipeline, pipelineRevision: nextRev });
                FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sortedPipeline, graph: g, pipelineRevision: nextRev });
            } else set({ graph: g });
        } else {
            if (!isPipelineEqual(s.pipeline, sortedPipeline)) {
                set({ graph: g, pipeline: sortedPipeline });
                FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sortedPipeline });
            } else set({ graph: g });
        }
    },

    setPipeline: (p) => {
        const nextRev = get().pipelineRevision + 1;
        const newGraph = pipelineToGraph(p);
        set({ pipeline: p, graph: newGraph, pipelineRevision: nextRev });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: p, graph: newGraph, pipelineRevision: nextRev });
    },

    refreshPipeline: () => {
         const s = get();
         const sorted = topologicalSort(s.graph.nodes, s.graph.edges);
         const nextRev = s.pipelineRevision + 1;
         set({ pipeline: sorted, pipelineRevision: nextRev });
         FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { pipeline: sorted, graph: s.graph, pipelineRevision: nextRev });
    },

    loadPreset: (p) => {
        // Legacy: handle embedded _formulaDef from old JSON presets
        if ((p as any)._formulaDef && !registry.get(p.formula)) {
            registry.register((p as any)._formulaDef);
        }

        get().resetParamHistory();
        const def = registry.get(p.formula);
        const normalizedFormula = def ? def.id : p.formula;
        
        set({ formula: normalizedFormula });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { formula: normalizedFormula });

        let newName = p.name;
        if (!newName || newName === 'Untitled' || newName === 'Custom Preset') {
            newName = normalizedFormula;
        }
        
        set({ projectSettings: { name: newName, version: 0 }, lastSavedHash: null });
        applyPresetState(p, set as (partial: Record<string, unknown>) => void, get as unknown as () => Record<string, unknown>);
        
        setTimeout(() => {
             const loadedState = get().getPreset({ includeScene: true });
             const { version, name, ...content } = loadedState as any;
             set({ lastSavedHash: JSON.stringify(content) });
        }, 50);
    },

    loadScene: ({ def, preset }: { def?: FractalDefinition; preset: Preset }) => {
        // 1. Register formula on main thread + worker (before any CONFIG events)
        if (def) {
            if (!registry.get(def.id)) {
                registry.register(def);
            }
            // Always push to worker — idempotent, ensures worker-side registry
            // has the shader before any CONFIG triggers a rebuild.
            FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
        }

        // 2. Hydrate store — setter chain emits per-feature CONFIG events that
        //    ConfigManager diffs individually (compile-time vs runtime).
        get().loadPreset(preset);

        // If the engine hasn't booted yet (initial startup), skip the CONFIG
        // flush and OFFSET push — bootEngine() will send the full config + offset
        // as part of the BOOT message, and any CONFIG events from the setter chain
        // above just queue up as redundant work that causes a double compile.
        if (!engine.isBooted && !engine.bootSent) {
            return;
        }

        // 3. Full config flush — guarantees the worker sees the complete picture.
        //    The setter chain sends partial CONFIGs per-feature; ConfigManager
        //    was already updated incrementally, so this flush is usually a no-op.
        //    But it catches edge cases: params missing from the old config (first
        //    load of a feature), or setters that were skipped because the feature
        //    wasn't registered at applyPresetState time.
        const fullConfig = getShaderConfigFromState(get());
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, fullConfig);

        // 4. Push offset to worker — ensures the first rendered frame after
        //    recompilation uses the correct viewpoint, not a stale offset that
        //    would persist until the next RENDER_TICK arrives.
        const offset = get().sceneOffset;
        if (offset) {
            const precise = {
                x: offset.x, y: offset.y, z: offset.z,
                xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0
            };
            engine.setShadowOffset(precise);
            engine.post({ type: 'OFFSET_SET', offset: precise });
        }
    },

    getPreset: (options) => {
        const s = get();
        
        const p: Preset = {
            version: s.projectSettings.version,
            name: s.projectSettings.name,
            formula: s.formula,
            features: {}
        };

        if (options?.includeScene !== false) {
             // cameraPos is always (0,0,0) — world position lives in sceneOffset.
             // We write it to the preset for backwards compatibility with older versions.
             p.cameraPos = { x: 0, y: 0, z: 0 };
             if (engine.activeCamera && engine.virtualSpace) {
                 const u = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, s.targetDistance);
                 p.cameraRot = u.rotation;
                 p.sceneOffset = u.sceneOffset;
                 p.targetDistance = u.targetDistance;
             } else {
                 p.cameraRot = s.cameraRot;
                 p.sceneOffset = s.sceneOffset;
                 p.targetDistance = s.targetDistance;
             }
             p.cameraMode = s.cameraMode;
             p.lights = []; 
             p.renderMode = s.renderMode;
             p.quality = { aaMode: s.aaMode, aaLevel: s.aaLevel, msaa: s.msaaSamples, accumulation: s.accumulation };
        }
        
        const features = featureRegistry.getAll();
        features.forEach(feat => {
             const sliceState = (s as any)[feat.id];
             if (sliceState) {
                 if (!p.features) p.features = {};
                 p.features![feat.id] = sanitizeFeatureState(sliceState);
             }
        });
        
        p.animations = s.animations;

        // Save camera library (strip thumbnails to keep size manageable in presets)
        if (s.savedCameras.length > 0) {
            p.savedCameras = s.savedCameras.map(c => ({
                id: c.id,
                label: c.label,
                position: c.position,
                rotation: c.rotation,
                sceneOffset: c.sceneOffset,
                targetDistance: c.targetDistance,
                optics: c.optics
            }));
        }
        
        if (s.formula === 'Modular') {
            p.graph = s.graph;
            p.pipeline = s.pipeline;
        }

        try {
            // @ts-expect-error — window global for cross-store access without import cycle
            const animStore = window.useAnimationStore?.getState?.();
            if (animStore) {
                p.sequence = animStore.sequence;
                p.duration = animStore.durationFrames;
            }
        } catch(e) {
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
    return state.isUserInteracting || 
           state.interactionMode !== 'none';
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

export const getShaderConfigFromState = (state: FractalStoreState): ShaderConfig => {
    // ── STAGE 1: Build from authored state ──────────────────
    const config: ShaderConfig = {
        formula: state.formula,
        pipeline: state.pipeline,
        pipelineRevision: state.pipelineRevision,
        graph: state.graph,
        msaaSamples: state.msaaSamples,
        previewMode: state.previewMode,
        renderMode: state.renderMode,
        compilerHardCap: state.compilerHardCap,
        shadows: true,
        quality: { ...state.quality },  // Shallow clone — stage 2/3 may mutate
    };

    const features = featureRegistry.getAll();
    features.forEach(feat => {
        const slice = (state as any)[feat.id];
        if (slice) {
            (config as any)[feat.id] = { ...slice };
        }
    });

    // Stage 2 (subsystem tier overrides) is no longer needed here —
    // tier overrides are written directly to the store via feature setters
    // in scalabilitySlice.applyTierOverrides(). The store always reflects
    // the actual compiled state.

    // ── STAGE 3: Apply hardware caps (unconditional ceiling) ─
    if (state.hardwareProfile) {
        const hw = state.hardwareProfile;
        const q = (config as any).quality;
        if (q) {
            // Higher value = lower capability, so take the max (most constrained)
            q.precisionMode = Math.max(q.precisionMode ?? 0, hw.caps.precisionMode);
            q.bufferPrecision = Math.max(q.bufferPrecision ?? 0, hw.caps.bufferPrecision);
            // Hard cap: take the min (device ceiling)
            q.compilerHardCap = Math.min(q.compilerHardCap ?? DEFAULT_HARD_CAP, hw.caps.compilerHardCap);
        }
        config.compilerHardCap = (config as any).quality?.compilerHardCap ?? config.compilerHardCap;
    }

    return config;
}

// Late-bind into the scalability slice so its actions can flush CONFIG
// without a circular import (fractalStore → scalabilitySlice → fractalStore).
bindGetShaderConfig(getShaderConfigFromState);

export const bindStoreToEngine = () => {
    const s = useFractalStore.getState();

    // Connect AnimationEngine to stores (decoupled injection — engine never imports stores directly)
    animationEngine.connect((window as any).useAnimationStore, useFractalStore);

    // Push initial state via proxy methods
    engine.isPaused = s.isPaused;
    engine.setPreviewSampleCap(s.sampleCap);

    // NOTE: Do NOT emit CONFIG here — the worker already receives the initial config
    // via the INIT message. A redundant CONFIG would trigger a second scheduleCompile()
    // that races with the boot compile, potentially causing generation-counter cancellation
    // where IS_COMPILING false is never emitted and BOOTED never fires.

    // After boot, sync offset state (not carried in BOOT config).
    // Uniforms + gradients are already synced by performCompilation() → syncConfigUniforms().
    engine.onBooted = () => {
        const current = useFractalStore.getState();
        const offset = current.sceneOffset;
        if (offset) {
            const precise = {
                x: offset.x, y: offset.y, z: offset.z,
                xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0
            };
            engine.setShadowOffset(precise);
            engine.post({ type: 'OFFSET_SET', offset: precise });
        }
        // Sync sample cap — the initial SET_SAMPLE_CAP may have been lost
        // if it arrived before the worker engine was created.
        engine.setPreviewSampleCap(current.sampleCap);
    };

    // State subscriptions that work through proxy methods or events.
    // Render state (cameraMode, optics, lighting, quality, geometry) is sent
    // to the worker via RENDER_TICK messages from WorkerTickScene each frame.
    useFractalStore.subscribe(state => state.isPaused, (v) => { engine.isPaused = v; });
    useFractalStore.subscribe(state => state.sampleCap, (v) => { engine.setPreviewSampleCap(v); });

    // Camera saves are explicit — user clicks "Update Camera" in the Camera Manager panel.
    // No auto-sync subscription: saved cameras preserve their original state until manually updated.

    // Sync renderMode UI state when lighting.renderMode changes (compile-time toggle)
    useFractalStore.subscribe(state => (state as any).lighting?.renderMode, (val) => {
        if (val === undefined) return; // Feature not yet initialized
        const mode = val === 1.0 ? 'PathTracing' : 'Direct';
        if (useFractalStore.getState().renderMode !== mode) {
            useFractalStore.setState({ renderMode: mode });
        }
    });

    // Auto-adjust orthoScale when switching from Perspective → Ortho
    // so the fractal stays roughly the same size on screen.
    // orthoScale = surfaceDist * tan(fov/2)  matches the perspective vertical extent.
    // Skip when restoring a saved camera (activeCameraId is set) — saved cameras
    // have their own orthoScale that should be preserved.
    let prevCamType: number | undefined;
    useFractalStore.subscribe(state => state.optics?.camType, (camType) => {
        if (camType === undefined) return;
        const wasPerspective = prevCamType !== undefined && prevCamType < 0.5;
        const isNowOrtho = camType > 0.5 && camType < 1.5;

        if (wasPerspective && isNowOrtho) {
            const s = useFractalStore.getState();
            // Don't auto-adjust when restoring a saved camera — it has its own orthoScale
            if (!s.activeCameraId) {
                const fov = s.optics?.camFov || 60;
                let dist = engine.lastMeasuredDistance;
                if (!dist || dist >= 1000 || dist <= 0) dist = s.targetDistance || 3.5;
                const scale = dist * Math.tan(fov * Math.PI / 360);
                const setOptics = (s as any).setOptics;
                if (typeof setOptics === 'function') {
                    setOptics({ orthoScale: scale });
                }
            }
        }
        prevCamType = camType;
    });

    FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, ({ isRendering }) => {
        const s = useFractalStore.getState();
        s.setIsBucketRendering(isRendering);
        // Piggyback on isExporting to lock UI (camera, panels, resize).
        // The worker's own engine.state.isExporting stays false so compute() keeps running.
        s.setIsExporting(isRendering);
    });
};

// Expose store on window for dev console access
if (typeof window !== 'undefined') {
    (window as any).__store = useFractalStore;
}