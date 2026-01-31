
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FractalStoreState, FractalActions, Preset } from '../types';
import { createUISlice } from './slices/uiSlice';
import { createRendererSlice } from './slices/rendererSlice';
import { createCameraSlice } from './slices/cameraSlice';
import { createHistorySlice } from './slices/historySlice';
import { createFeatureSlice } from './createFeatureSlice';
import { engine } from '../engine/FractalEngine';
import { registry } from '../engine/FractalRegistry';
import { featureRegistry } from '../engine/FeatureSystem';
import { generateShareStringFromPreset, parseShareString } from '../utils/Sharing';
import { getFullDefaultPreset, applyPresetState } from '../utils/PresetLogic';
import { ShaderConfig } from '../engine/ShaderFactory';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { detectEngineProfile, ENGINE_PROFILES } from '../features/engine/profiles';
import { pipelineToGraph, isStructureEqual, isPipelineEqual, topologicalSort } from '../utils/graphAlg';
import { JULIA_REPEATER_PIPELINE } from '../data/initialPipelines';
import '../features'; // Ensure features are registered

export const useFractalStore = create<FractalStoreState & FractalActions>()(subscribeWithSelector((set, get, api) => ({
    ...createUISlice(set, get, api),
    ...createRendererSlice(set, get, api),
    ...createCameraSlice(set, get, api),
    ...createHistorySlice(set, get, api),
    ...createFeatureSlice(set, get, api),

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
            
            // Smart Profile Persistence
            const currentProfileKey = detectEngineProfile(get());
            if (currentProfileKey !== 'custom' && currentProfileKey !== 'balanced') {
                // @ts-ignore
                const profileConfig = ENGINE_PROFILES[currentProfileKey];
                if (profileConfig) {
                    if (!formulaPreset.features) formulaPreset.features = {};
                    Object.entries(profileConfig).forEach(([featId, params]) => {
                        if (!formulaPreset.features![featId]) formulaPreset.features![featId] = {};
                        Object.assign(formulaPreset.features![featId], params);
                    });
                }
            }

            const lockScene = get().lockSceneOnSwitch;
            
            if (lockScene) {
                const current = get().getPreset(); 
                
                // When locking scene, we keep the current environment (Lighting, Atmos, etc)
                // AND Gradients (Coloring, Texturing).
                // We MUST apply the new formula's math and geometry parameters.
                const mergedFeatures = { ...(current.features || {}) };
                const newFeatures = formulaPreset.features || {};
                
                if (newFeatures.coreMath) mergedFeatures.coreMath = newFeatures.coreMath;
                if (newFeatures.geometry) mergedFeatures.geometry = newFeatures.geometry;
                
                // NOTE: We do NOT copy coloring/texturing from newFeatures.
                // This preserves the current coloring setup from mergedFeatures (which came from current).

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
            // Preserve phase continuity if period changed
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
        applyPresetState(p, set, get);
        
        setTimeout(() => {
             const loadedState = get().getPreset({ includeScene: true });
             const { version, name, ...content } = loadedState as any;
             set({ lastSavedHash: JSON.stringify(content) });
        }, 50);
    },

    getPreset: (options) => {
        const s = get();
        // Access AnimationStore for sequence data
        
        const p: Preset = {
            version: s.projectSettings.version,
            name: s.projectSettings.name,
            formula: s.formula,
            features: {}
        };

        if (options?.includeScene !== false) {
             // Access Engine if possible for unified state, or Store fallbacks
             if (engine.activeCamera) {
                 const u = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, s.targetDistance);
                 p.cameraPos = u.position;
                 p.cameraRot = u.rotation;
                 p.sceneOffset = u.sceneOffset;
                 p.targetDistance = u.targetDistance;
             } else {
                 p.cameraPos = s.cameraPos;
                 p.cameraRot = s.cameraRot;
                 p.sceneOffset = s.sceneOffset;
                 p.targetDistance = s.targetDistance;
             }
             p.cameraMode = s.cameraMode;
             p.lights = []; // Legacy
             p.renderMode = s.renderMode;
             p.quality = { aaMode: s.aaMode, aaLevel: s.aaLevel, msaa: s.msaaSamples, accumulation: s.accumulation };
        }
        
        const features = featureRegistry.getAll();
        features.forEach(feat => {
             const sliceState = (s as any)[feat.id];
             if (sliceState) {
                 if (!p.features) p.features = {};
                 const clean: any = {};
                 Object.keys(sliceState).forEach(k => {
                     const v = sliceState[k];
                     if (v && typeof v === 'object' && v.isColor) clean[k] = '#' + v.getHexString();
                     else if (v && typeof v === 'object' && (v.isVector2 || v.isVector3)) {
                         clean[k] = { ...v };
                         delete clean[k].isVector2; delete clean[k].isVector3;
                     } else {
                         clean[k] = v;
                     }
                 });
                 p.features![feat.id] = clean;
             }
        });
        
        p.animations = s.animations;
        
        if (s.formula === 'Modular') {
            p.graph = s.graph;
            p.pipeline = s.pipeline;
        }

        try {
            // @ts-ignore
            const animStore = window.useAnimationStore?.getState?.() || require('../animationStore').useAnimationStore.getState();
            if (animStore) {
                p.sequence = animStore.sequence;
                p.duration = animStore.durationFrames;
            }
        } catch(e) {}

        return p;
    },
    
    getShareString: (options) => {
         const p = get().getPreset({ includeScene: true });
         const advanced = get().advancedMode;
         return generateShareStringFromPreset(p, advanced, options);
    },
    
    loadShareString: (str) => {
        const p = parseShareString(str);
        if (p) {
            get().loadPreset(p);
            return true;
        }
        return false;
    }

})));

// Unified selector for checking if the app is "Busy"
// Note: 'isGizmoDragging' is covered by 'isUserInteracting' because LightGizmo calls handleInteractionStart.
export const selectIsGlobalInteraction = (state: FractalStoreState) => {
    return state.isUserInteracting || 
           state.interactionMode !== 'none';
};

export const selectMovementLock = (state: FractalStoreState) => {
    if (state.isGizmoDragging || state.interactionMode !== 'none' || state.isExporting) return true;
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
        quality: state.quality,
    };
    
    const features = featureRegistry.getAll();
    features.forEach(feat => {
        const slice = (state as any)[feat.id];
        if (slice) {
            (config as any)[feat.id] = slice;
        }
    });
    
    return config;
}

export const bindStoreToEngine = () => {
    const s = useFractalStore.getState();
    const update = (partial: any) => engine.setRenderState(partial);
    
    update({
        isExporting: s.isExporting, 
        isBucketRendering: s.isBucketRendering,
        cameraMode: s.cameraMode,
        optics: s.optics,
        lighting: s.lighting,
        quality: s.quality,
        bucketConfig: {
            bucketSize: s.bucketSize,
            bucketUpscale: s.bucketUpscale,
            convergenceThreshold: s.convergenceThreshold,
            accumulation: s.accumulation
        }
    });
    
    // Initial sync of Pause state
    engine.isPaused = s.isPaused;
    engine.setPreviewSampleCap(s.sampleCap);

    FractalEvents.emit(FRACTAL_EVENTS.CONFIG, getShaderConfigFromState(s));

    useFractalStore.subscribe(state => state.isExporting, (v) => update({ isExporting: v }));
    useFractalStore.subscribe(state => state.isBucketRendering, (v) => update({ isBucketRendering: v }));
    useFractalStore.subscribe(state => state.cameraMode, (v) => update({ cameraMode: v }));
    useFractalStore.subscribe(state => state.optics, (v) => update({ optics: v }));
    useFractalStore.subscribe(state => state.lighting, (v) => update({ lighting: v }));
    useFractalStore.subscribe(state => state.quality, (v) => update({ quality: v })); 
    
    // Bind Pause/Cap
    useFractalStore.subscribe(state => state.isPaused, (v) => { engine.isPaused = v; });
    useFractalStore.subscribe(state => state.sampleCap, (v) => { engine.setPreviewSampleCap(v); });

    const syncBucketConfig = () => {
        const cs = useFractalStore.getState();
        update({ bucketConfig: { bucketSize: cs.bucketSize, bucketUpscale: cs.bucketUpscale, convergenceThreshold: cs.convergenceThreshold, accumulation: cs.accumulation } });
    };
    useFractalStore.subscribe(state => state.bucketSize, syncBucketConfig);
    useFractalStore.subscribe(state => state.bucketUpscale, syncBucketConfig);
    useFractalStore.subscribe(state => state.convergenceThreshold, syncBucketConfig);
    useFractalStore.subscribe(state => state.accumulation, syncBucketConfig);

    useFractalStore.subscribe(state => state.quality?.bufferPrecision, (v) => {
        if (engine.renderer) {
             const canvas = engine.renderer.domElement;
             engine.pipeline.resize(canvas.width, canvas.height);
        }
    });
    
    useFractalStore.subscribe(state => (state as any).lighting?.renderMode, (val) => {
        const mode = val === 1.0 ? 'PathTracing' : 'Direct';
        if (useFractalStore.getState().renderMode !== mode) {
            useFractalStore.setState({ renderMode: mode });
        }
    });

    FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, ({ isRendering }) => {
        useFractalStore.getState().setIsBucketRendering(isRendering);
    });
};
