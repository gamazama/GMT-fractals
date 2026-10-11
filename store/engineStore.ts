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
import { createInteractionSlice } from './slices/createInteractionSlice';
import { createScalabilitySlice } from './slices/scalabilitySlice';
import { createHistorySlice } from './slices/historySlice';
import { createFeatureSlice } from './createFeatureSlice';
import { getProxy } from '../engine/worker/WorkerProxy';
const engine = getProxy();

// ── Unsaved-work baseline (H4) ─────────────────────────────────────────────
// Camera framing (cameraRot / sceneOffset / targetDistance) is "view", not
// "content" — excluded from the dirty check so just orbiting doesn't mark the
// scene unsaved. Kept separate from lastSavedHash (versioning, camera included).
// Set on load + explicit save; null until the first baseline (so a booting
// app is never reported dirty).
const CAMERA_DIRTY_KEYS = ['cameraRot', 'sceneOffset', 'targetDistance'];
let _dirtyBaseline: string | null = null;
// Set by markSceneUnsaved: the scene reports dirty whatever its content, until the next
// markSceneSaved or loadPreset. For a scene restored from a copy that had unsaved changes —
// its load would otherwise make it the saved baseline and drop the leave-page prompt.
let _forcedDirty = false;
const _contentHashNoCamera = (s: { getPreset: (o?: { includeScene?: boolean }) => unknown }): string => {
    const clone = { ...(s.getPreset({ includeScene: true }) as Record<string, unknown>) };
    delete clone.version; delete clone.name;
    for (const k of CAMERA_DIRTY_KEYS) delete clone[k];
    return JSON.stringify(clone);
};

// ── What a render writes into the scene itself (the export version) ─────────
// `prepareExport` hands out the version a render's files are named by, and raises
// it when the scene differs from what it was at the last export. A render can
// itself write into the scene - a value it measures while it runs and locks a
// parameter to. That is not the user changing the scene; counted as one, every
// such render ends "changed", the next gets a new version, and a render that was
// cancelled can never find its own frames again to go on from.
//
// So a plugin DECLARES each place a render writes: a path into the preset
// (`getPreset`'s shape: 'features.<featureId>.<param>'), and the condition under
// which the render is the one writing it. While the condition holds, that path
// is left out of the version's comparison - and only then: with the condition
// off, a change there is the user's and counts as any other.
// Engine-core names no feature here; the app's plugin registers its own path at
// module load (grep `registerRunWrittenPath` for the callers).
//
// @assumption A declared path is left out of the comparison exactly while its
//   condition holds, so a render that only wrote there keeps its version, and
//   `peekExportVersion()` answers what `prepareExport()` would hand out without
//   taking it. No standing test reaches this: measured in the app with real
//   renders on 2026-10-11 (debug/scratch/gmt-export/gmt-sequence.mts,
//   git-ignored: a focus-locked render cancelled part-way, the version held
//   still across it, the next run found its frames).
type RunWrittenPath = { path: string; keys: string[]; when: (state: EngineStoreState & EngineActions) => boolean };
const _runWrittenPaths: RunWrittenPath[] = [];
/** Declare a preset path a render writes by itself, and when (see above). Registering
 *  a path again replaces its condition (a module evaluated twice). */
export const registerRunWrittenPath = (
    path: string,
    when: (state: EngineStoreState & EngineActions) => boolean = () => true,
): void => {
    const entry: RunWrittenPath = { path, keys: path.split('.').filter(Boolean), when };
    const at = _runWrittenPaths.findIndex((p) => p.path === path);
    if (at >= 0) _runWrittenPaths[at] = entry; else _runWrittenPaths.push(entry);
};
/** `obj` without the value at `keys`: copied along the path only, the original untouched.
 *  A path that is not there changes nothing. */
const _withoutPath = (obj: Record<string, unknown>, keys: string[]): Record<string, unknown> => {
    const [head, ...rest] = keys;
    if (head === undefined || !(head in obj)) return obj;
    const clone = { ...obj };
    if (rest.length === 0) { delete clone[head]; return clone; }
    const child = obj[head];
    if (!child || typeof child !== 'object' || Array.isArray(child)) return obj;
    clone[head] = _withoutPath(child as Record<string, unknown>, rest);
    return clone;
};
/** What the export version compares: the preset without its volatile {version, name}
 *  and without the paths a render is writing by itself just now. */
const _exportContentHash = (s: EngineStoreState & EngineActions): string => {
    const { version: _version, name: _name, ...rest } = s.getPreset({ includeScene: true }) as unknown as Record<string, unknown>;
    let content: Record<string, unknown> = rest;
    for (const entry of _runWrittenPaths) if (entry.when(s)) content = _withoutPath(content, entry.keys);
    return JSON.stringify(content);
};
/** The version the next export gets, and whether that is a new one. Takes nothing. */
const _nextExportVersion = (s: EngineStoreState & EngineActions): { version: number; hash: string; raised: boolean } => {
    const hash = _exportContentHash(s);
    const version = s.projectSettings.version;
    if (s.lastSavedHash === null || version === 0) return { version: Math.max(1, version + 1), hash, raised: true };
    if (s.lastSavedHash !== hash) return { version: version + 1, hash, raised: true };
    return { version, hash, raised: false };
};

import { featureRegistry } from '../engine/FeatureSystem';
import { applyMigrations } from '../engine/migrations';
import { generateShareStringFromPreset } from '../utils/Sharing';
import { applyPresetState, sanitizeFeatureState } from '../utils/PresetLogic';
import { presetFieldRegistry } from '../utils/PresetFieldRegistry';
import { serializeDocuments, restoreDocuments } from './documentRegistry';
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

// App-registered estimator that returns ms for compiling the shader
// implied by the given store state. Called before each `compileGate.queue`
// call inside store actions so the unified `CompileProgressStore` can
// project the bar over a realistic duration. The estimator lives in
// app-specific code (engine-gmt's `estimateCompileTime`) rather than
// engine core. Returns 0 when no estimator is installed; the gate then
// uses the last-known estimate (or its default).
type CompileEstimator = (state: any) => number;
let _compileEstimator: CompileEstimator | null = null;
export const setCompileEstimator = (fn: CompileEstimator | null) => {
    _compileEstimator = fn;
};
const refreshCompileEstimate = (state: any) => {
    if (!_compileEstimator) return;
    FractalEvents.emit(FRACTAL_EVENTS.COMPILE_ESTIMATE, _compileEstimator(state));
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
    ...createInteractionSlice(set, get, api),
    ...createScalabilitySlice(set, get),
    ...createHistorySlice(set, get, api),
    ...createFeatureSlice(set, get, api),

    // ── Engine-level scalar state (minimal) ──
    formula: '',
    projectSettings: { name: 'Untitled', version: 0, author: '' },
    lastSavedHash: null,

    animations: [],
    lfosEnabled: true,
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

        refreshCompileEstimate(get());
        compileGate.queue("Compiling Shader...", () => {
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

    // The version this export's files are named by. Raised (and the scene as it
    // stands remembered) when there was no export yet or the scene has changed
    // since the last one; what a render writes into the scene by itself is not a
    // change (`registerRunWrittenPath`, above).
    prepareExport: () => {
        const s = get();
        const next = _nextExportVersion(s);
        if (next.raised) set({ projectSettings: { ...s.projectSettings, version: next.version }, lastSavedHash: next.hash });
        return next.version;
    },

    // The version `prepareExport()` would hand out now, WITHOUT taking it: for a
    // runner that has to know the name its files will get before it is sure there
    // will be a run at all (it may ask first, and the answer may be "cancel" -
    // which must not leave a version behind with no file to show for it).
    peekExportVersion: () => _nextExportVersion(get()).version,

    // ── Unsaved-work tracking (H4) ─────────────────────────────────────
    // Hash mirrors prepareExport's: getPreset minus the volatile {version,
    // name}. lastSavedHash is the baseline set on load / export / explicit
    // save; a differing current hash means there are unsaved edits.
    isSceneDirty: () => {
        if (_forcedDirty) return true;
        if (_dirtyBaseline === null) return false; // no baseline yet (booting) — don't nag
        return _contentHashNoCamera(get()) !== _dirtyBaseline;
    },

    // Mark the current (camera-excluded) state as the saved baseline so an
    // explicit Save Scene / Load clears the dirty flag.
    markSceneSaved: () => { _forcedDirty = false; _dirtyBaseline = _contentHashNoCamera(get()); },

    // Report dirty until the next save or load. Call it AFTER the load that restored
    // the scene: loadPreset clears it synchronously at its start, and a boot-time
    // loadScene runs loadPreset synchronously (app-gmt/main.tsx, the `?from=gx` restore).
    // A coarse flag rather than a carried baseline: undoing every edit afterwards still
    // reads as unsaved — the safe direction for a leave-page prompt.
    markSceneUnsaved: () => { _forcedDirty = true; },

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

    setLfosEnabled: (v) => set({ lfosEnabled: v }),

    setLiveModulations: (v) => set({ liveModulations: v }),

    loadPreset: (p) => {
        // Run registered slice migrations BEFORE dispatching setters.
        // Mutates p in place; safe because the caller doesn't reuse it
        // and SceneFormat always hands us a fresh deserialized object.
        p = applyMigrations(p) as Preset;

        // A loaded scene starts from its own baseline (set below, after the load settles).
        _forcedDirty = false;
        get().resetParamHistory();
        set({ formula: p.formula });
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { formula: p.formula });

        let newName = p.name;
        if (!newName || newName === 'Untitled' || newName === 'Custom Preset') {
            newName = p.formula || 'Untitled';
        }

        set({ projectSettings: { name: newName, version: 0, author: p.author ?? '' }, lastSavedHash: null });
        applyPresetState(p, set as (partial: Record<string, unknown>) => void, get as unknown as () => Record<string, unknown>);

        // Restore non-DDFS document snapshots (W8). No-op when the scene predates
        // the `documents` key (legacy/back-compat) or carries garbage — each
        // provider validates its own snapshot. Favients' provider auto-appends
        // new gradients here (palette owns that UX; the engine stays generic).
        restoreDocuments(p.documents);

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
            set({ lastSavedHash: _exportContentHash(get()) });   // the one rule `prepareExport` compares by
            _dirtyBaseline = _contentHashNoCamera(get()); // unsaved-work baseline (camera-excluded)
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
        // Estimate is computed from the about-to-be-loaded preset, not the
        // current state — apply preset to a temp clone or simply estimate
        // post-load. Cheaper to just refresh after loadPreset runs inside
        // the work closure; for now we approximate from current state.
        refreshCompileEstimate(get());
        compileGate.queue("Compiling Shader...", () => {
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
        // Only serialize when set — keeps GMF byte-clean for legacy scenes
        // and round-trips through unchanged.
        if (s.projectSettings.author) p.author = s.projectSettings.author;

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
        p.lfosEnabled = s.lfosEnabled;

        // Non-DDFS document snapshots (W8). Opt-in: only the file/PNG/autosave
        // save paths request this (see SceneIO), so the dirty-hash + share-string
        // paths — which call getPreset without the flag — stay unaffected (a
        // share URL must not carry the user's whole favients library, and
        // favouriting a gradient must not mark the current scene dirty). Omit the
        // key entirely when empty to keep legacy/no-provider files byte-clean.
        if (options?.includeDocuments) {
            const documents = serializeDocuments();
            if (Object.keys(documents).length > 0) p.documents = documents;
        }

        try {
            // Imported eagerly at module bottom (line ~383) — no cycle,
            // no window-handle indirection. animationStore depends on
            // its slice files; nothing in that subtree imports back
            // into engineStore.
            const animStore = useAnimationStore.getState();
            p.sequence = animStore.sequence;
            p.duration = animStore.durationFrames;
            p.fps = animStore.fps;     // both of the above are in frames: the rate is what makes them a length
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

// Peek that returns the underlying store ONLY if already instantiated.
// Calling `useEngineStore.getState()` would itself trigger ensureStore()
// and freeze the feature registry — so pre-boot consumers (PanelManifest's
// addPanel during registerFormula) need a way to ask "is the store live
// yet?" without materialising it. Returns null until the first legitimate
// hook call instantiates `_store`.
(globalThis as { __engineStorePeek?: () => EngineStore | null }).__engineStorePeek = () => _store;

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

export const selectMovementLock = (state: EngineStoreState & EngineActions) => {
    // ADR-0061 P5 — the gizmo-drag check is an orthogonal PERMISSION axis (a
    // gizmo handle drag must lock camera movement so dragging a light doesn't
    // also orbit). Its INPUT moved from the removed `isGizmoDragging` flag to the
    // unified InteractionSession `gizmo` source. `getInteractionSources()` reads
    // the HARD-active set (no debounce tail) — matching the old flag's immediate
    // on/off — from the module ref; the coarse reactive `interacting` boolean
    // flips on the same gizmo edges (single pointer → no other source masks it),
    // so a `useStore(selectMovementLock)` subscriber re-evaluates at drag start
    // and end. (`'gizmo'` is a literal here, not the engine-gmt token import, to
    // keep this engine-core selector free of an app-layer dependency; the session
    // token type is an open string by design — ADR-0059.)
    if (state.getInteractionSources().has('gizmo') || state.interactionMode !== 'none' || state.isExporting || state.isBucketRendering) return true;
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

    // GMT Modular fields — top-level state, not features. Carrying these in
    // the config flush is what lets ConfigManager see a pipelineRevision bump
    // on scene load and trigger a rebuild; without them the loaded pipeline
    // never reaches the worker.
    const s = state as any;
    if (s.pipeline)                     config.pipeline         = s.pipeline;
    if (s.graph)                        config.graph            = s.graph;
    if (s.pipelineRevision !== undefined) config.pipelineRevision = s.pipelineRevision;

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
