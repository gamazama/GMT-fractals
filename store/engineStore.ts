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

import { create, type StateCreator } from 'zustand';
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
// Eager import so the animation store's module is loaded before
// anything in this file (and the EngineBridge that calls
// bindStoreToEngine) tries to read it. Removes the need for the
// window.useAnimationStore handle that previously bridged the two
// stores at runtime — animationStore depends only on its own slice
// files, no cycle back into here.
import { useAnimationStore } from './animationStore';

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

// Store factory — slice composition + scalar state + actions. Pulled
// out of the eager `create()` call so the actual store construction
// can be deferred until first use. See `ensureStore()` below for the
// reason: production rollup chunking can evaluate this module before
// app-side registerFeatures.ts runs, which would freeze the feature
// registry too early. Lazy creation pushes the freeze to first store
// access (React render, a `getState()` call, etc.) — by which time
// every entry has finished its imperative registration phase.
const storeFactory: StateCreator<
    EngineStoreState & EngineActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    EngineStoreState & EngineActions
> = (set, get, api) => ({
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
            // resetParamHistory() → clearHistory() clears BOTH 'param' and
            // 'camera' scope transactions on the unified stack — old
            // camera positions make no sense for a new formula either.
            get().resetParamHistory();
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
        //
        // Also emit OFFSET_SET directly — Navigation's teleport handler
        // updates its local camera state but relies on the OFFSET_SET
        // bridge (engine-gmt/renderer/GmtRendererTickDriver) to push the
        // sceneOffset to the worker. Without this extra emit, the worker's
        // sceneOffset stays at the pre-load value until Navigation's
        // setSceneOffset runs (which it may not for programmatic loads).
        const loaded = get() as any;
        if (loaded.sceneOffset || loaded.cameraRot) {
            FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
                position: { x: 0, y: 0, z: 0 },
                rotation: loaded.cameraRot,
                sceneOffset: loaded.sceneOffset,
                targetDistance: loaded.targetDistance,
            } as any);
            if (loaded.sceneOffset) {
                FractalEvents.emit(FRACTAL_EVENTS.OFFSET_SET, loaded.sceneOffset as any);
            }
        }

        setTimeout(() => {
            const loadedState = get().getPreset({ includeScene: true });
            const { version, name, ...content } = loadedState as any;
            set({ lastSavedHash: JSON.stringify(content) });
        }, 50);
    },

    loadScene: ({ preset }: { def?: any; preset: Preset }) => {
        // Initial startup: hydrate store immediately, no spinner needed.
        // bootEngine() sends the full config in its INIT message.
        if (!engine.isBooted && !engine.bootSent) {
            get().loadPreset(preset);
            return;
        }

        // Post-boot: show spinner immediately, defer compile-triggering work
        // until after the browser paints so the spinner is visible before
        // the GPU-blocking preview compile starts on the worker.
        compileGate.queue("Loading Preview...", () => {
            // 1. Hydrate store. loadPreset emits CONFIG({formula}) and
            //    drives feature setters that may emit their own CONFIGs.
            get().loadPreset(preset);

            // 2. Full config flush — guarantees the worker recompiles with
            //    the COMPLETE picture (every feature slice + engine fields),
            //    not just the formula change. Without this, scenes loaded
            //    on a custom formula compile against the previous scene's
            //    feature state and render as a fallback sphere. Mirrors
            //    gmt-0.8.5's loadScene exactly.
            const fullConfig = getShaderConfigFromState(get());
            FractalEvents.emit(FRACTAL_EVENTS.CONFIG, fullConfig);

            // 3. Push offset to the worker so the first rendered frame
            //    after recompile uses the loaded viewpoint, not a stale
            //    pre-load offset that would persist until RENDER_TICK.
            const loaded = get() as any;
            const offset = loaded.sceneOffset;
            if (offset) {
                const precise = {
                    x: offset.x, y: offset.y, z: offset.z,
                    xL: offset.xL ?? 0, yL: offset.yL ?? 0, zL: offset.zL ?? 0,
                };
                engine.setShadowOffset(precise);
                engine.post({ type: 'OFFSET_SET', offset: precise });
            }

            // 4. Signal worker to flush queued CONFIGs and compile now,
            //    skipping the 200 ms scheduleCompile debounce.
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
            // Imported eagerly at module bottom (line ~383) — no cycle,
            // no window-handle indirection. animationStore depends on
            // its slice files; nothing in that subtree imports back
            // into engineStore.
            const animStore = useAnimationStore.getState();
            p.sequence = animStore.sequence;
            p.duration = animStore.durationFrames;
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
});

// Lazy store handle. The first call (selector hook OR static
// getState/setState/subscribe) instantiates zustand. Until then the
// feature registry stays unfrozen, so app-side registerFeatures.ts
// can finish even when rollup hoists this module above it in the
// production chunk graph.
// `create<T>()(...)` is curried, so `ReturnType<typeof create<T>>` is the
// inner builder, not the store. Derive the real store type from a thunk
// so the hook keeps its proper selector + subscribe overloads.
const _makeStore = () => create<EngineStoreState & EngineActions>()(subscribeWithSelector(storeFactory));
type EngineStore = ReturnType<typeof _makeStore>;
let _store: EngineStore | null = null;
const ensureStore = (): EngineStore => {
    if (!_store) _store = _makeStore();
    return _store;
};

// Hook surface: callable as a selector hook, plus the static methods
// zustand exposes (getState/setState/subscribe). Each method routes
// through ensureStore() so consumers see the real store the moment
// they actually use it.
const _hook = (selector?: any, equalityFn?: any) => (ensureStore() as any)(selector, equalityFn);
_hook.getState = () => ensureStore().getState();
_hook.setState = (...args: any[]) => (ensureStore().setState as any)(...args);
_hook.subscribe = (...args: any[]) => (ensureStore().subscribe as any)(...args);
export const useEngineStore = _hook as unknown as EngineStore;

// Publish the store handle on globalThis so modules that can't safely
// import it at module-load time (e.g. PanelManifest, which is reached
// from registry-touch code that runs BEFORE this file evaluates) can
// resolve it lazily at function-call time. See engine/PanelManifest.ts
// for the consumer-side rationale.
(globalThis as { __engineStore?: typeof useEngineStore }).__engineStore = useEngineStore;

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
 *
 * Accumulation state (`isPaused`, `sampleCap`) is wired in renderer
 * plugins via `installAccumulationBindings` against the renderer's
 * AccumulationController — see `engine-gmt/renderer/bindings.ts`.
 * That keeps the binding co-located with the controller it talks to.
 */
export const bindStoreToEngine = () => {
    // Connect AnimationEngine to stores (decoupled injection).
    // useAnimationStore is imported eagerly above (alongside the
    // other slices), no window-handle indirection needed.
    animationEngine.connect(useAnimationStore as any, useEngineStore);
};

// Expose store on window for dev console access
if (typeof window !== 'undefined') {
    (window as any).__store = useEngineStore;
}
