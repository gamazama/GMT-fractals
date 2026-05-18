/**
 * GMT-specific preset field registrations — side-effect only.
 *
 * Must be imported in main.tsx BEFORE any import that triggers store
 * construction (i.e. before component / store imports), exactly like
 * engine/plugins/camera/presetField.ts.
 *
 * Registers the top-level `lights` field: old-format presets (all formula
 * defaultPresets) store the lights array at preset.lights rather than
 * preset.features.lighting.lights. Without this handler applyPresetState
 * ignores it and DEFAULT_LIGHTS are used instead.
 */

import { presetFieldRegistry } from '../../utils/PresetFieldRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { normalizeLights } from '../features/lighting';

// Runs after applyPresetState, so this single handler covers both the legacy
// top-level `p.lights` and the modern `features.lighting.lights` path —
// normalizing either before any React render can read them.
presetFieldRegistry.register({
    key: 'lights',
    serialize: () => undefined,
    deserialize: (p: any, _set: any, getStore: any) => {
        const store = getStore?.();
        const setter = store?.setLighting;
        if (typeof setter !== 'function') return;

        const legacy = Array.isArray(p.lights) && p.lights.length > 0 ? p.lights : null;
        const current = Array.isArray(store?.lighting?.lights) ? store.lighting.lights : null;
        const source = legacy ?? current;
        if (!source) return;

        const normalized = normalizeLights(source);
        if (legacy || normalized !== current) {
            setter({ lights: normalized });
        }
    },
});

// Modular formula's node-graph pipeline. Without this, applyPresetState
// silently drops pipeline + graph on load — the worker keeps the default
// JULIA_REPEATER pipeline and the loaded scene renders blank (or the
// wrong shape) until the user touches the graph editor.
//
// Emitting CONFIG explicitly (mirroring modularSlice.setPipeline) is what
// guarantees the worker receives the loaded pipeline before the compile
// fires. Relying on loadScene's later getShaderConfigFromState flush
// alone races the formula-only CONFIG that loadPreset emits first —
// the early CONFIG would schedule a compile against the still-default
// pipeline, leaving the user with a fractal that renders default params
// until they hit recompile.
presetFieldRegistry.register({
    key: 'pipeline',
    serialize: () => undefined,
    deserialize: (p: any, set: any, getStore: any) => {
        if (!Array.isArray(p.pipeline)) return;
        const store = getStore();
        const nextRev = (store?.pipelineRevision ?? 0) + 1;
        const update: any = { pipeline: p.pipeline, pipelineRevision: nextRev };
        if (p.graph) update.graph = p.graph;
        set(update);
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, {
            pipeline: p.pipeline,
            graph: p.graph,
            pipelineRevision: nextRev,
        } as any);
    },
});
