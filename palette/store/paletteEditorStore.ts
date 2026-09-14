/**
 * paletteEditorStore — the Stops mode's edited GradientConfig (stops + blend +
 * colorSpace), held as NON-DDFS zustand state.
 *
 * Why not a DDFS feature slice: a GradientConfig is a structured document (a
 * variable-length stop array with per-stop colour/bias/interpolation), not a set
 * of scalar dials — exactly the shape DDFS params can't hold. So it lives here
 * and rides the engine machinery through two registered providers (both wired in
 * registerPaletteUI):
 *   • HISTORY provider 'paletteEditor' → stop edits ride Ctrl+Z. The engine
 *     editor brackets each gesture via the (d) seam (onEditStart/onEditEnd/edit),
 *     which we point at the shared paramUndoBracket — so a continuous knot drag is
 *     ONE undo entry alongside the DDFS param stack.
 *   • DOCUMENT provider 'stops' → the config round-trips through Save/Load (W8).
 *
 * The store PERSISTS across mode switches (module-scoped, like the generator's
 * slots); it resets only via `reset()` (the dock's "Reset to default" / a fresh
 * scene). The transient editor UI (selection, marquee, expand) stays local to
 * AdvancedGradientEditor — only the committed config lives here.
 *
 * One-ramp seam: the editor's value IS the gradient. A BARE inbound ramp (future
 * "send to Stops") is turned into a config EXACTLY ONCE via `loadRamp`; there is no
 * second ramp→stops path on the render side.
 *
 * Either config FORM (ADR-0122). The document may hold a RAMP gradient (`stops: []` +
 * `ramp`) — the GE v2 hero bakes a dense pipeline output into it as-is, and `loadRamp`
 * keeps a sample set that will not fit cheaply as one. `addStops` is the explicit
 * conversion (uncapped, at a Detail budget); `setConfig` normalises so a stale `ramp` never
 * rides a stop gradient; the restore gate is `coerceGradientConfig`, which accepts both forms.
 *
 * WHO READS THIS STORE: the old shell's Generator Stops mode (`GeneratorStage`'s
 * `GeneratorStopsControls`) and the GE v2 hero once the working input is `stops`
 * (`WorkingHero`'s `editorValue`). app-gmt's gradient param editor does NOT — it edits the
 * DDFS param value through `AutoFeaturePanel`. The v2 hero's Add stops is
 * `workingStore.addStopsToWorking`, not `addStops` here: it must also fold the pipeline.
 *
 * @see palette/core/editorConfig.ts (pure validator/serialiser shared by both providers)
 * @see components/AdvancedGradientEditor.tsx (the engine editor, mounted by EditorStage)
 */

import { create } from 'zustand';
import type { GradientConfig, JsonValue } from '../../types';
import type { RGB } from '../core/oklab';
import { rampToGradientConfig } from '../core/stopFit';
import { makeDefaultEditorConfig, coerceGradientConfig, serializeEditorConfig } from '../core/editorConfig';
import { addStopsToConfig } from '../core/workingPipeline';
import { normalizeGradientConfig } from '../../utils/gradientRamp';
import { paramEditStart, paramEditEnd, paramEdit } from './paramUndoBracket';

// (d) seam: the editor brackets its mutations into ONE engine PARAM-undo entry
// via these. They're the shared paramUndoBracket primitives (begin/end snapshot
// every history provider, incl. this store's), exported under editor-named entry
// points so the wiring reads clearly at the EditorStage call site. genEdit* in
// generatorStore are the exact same primitives — one bracket implementation.
export const editorEditStart = paramEditStart;
export const editorEditEnd = paramEditEnd;
export const editorEdit = paramEdit;

interface PaletteEditorState {
    config: GradientConfig;
    /** The editor's onChange sink — commits the whole config (the editor emits a
     *  full GradientConfig; bracketing for undo is the caller's job via the (d) seam). */
    setConfig: (config: GradientConfig) => void;
    /** Reset to the default gradient (dock "Reset", fresh scene). */
    reset: () => void;
    /** One-ramp seam: a BARE 256-RGB ramp becomes the document ONCE (future send-to-Stops) —
     *  stops when it fits within `maxStops` (and `STOP_LAYER_CAP`), else a ramp gradient. */
    loadRamp: (ramp: RGB[], maxStops?: number) => void;
    /** "Add stops" on a RAMP document: fit it at the Detail budget (`detail`, 2..10 — pass the
     *  generator's), uncapped, always stops. No-op on a stop document. ONE undo entry (it
     *  self-brackets). */
    addStops: (detail?: number) => void;
}

export const usePaletteEditorStore = create<PaletteEditorState>((set, get) => ({
    config: makeDefaultEditorConfig(),
    setConfig: (config) => set({ config: normalizeGradientConfig(config) }),
    reset: () => set({ config: makeDefaultEditorConfig() }),
    loadRamp: (ramp, maxStops = 24) => set({ config: rampToGradientConfig(ramp, { maxStops }) }),
    addStops: (detail = 8) => {
        const cur = get().config;
        const next = addStopsToConfig(cur, detail);
        if (next === cur) return;
        paramEdit(() => set({ config: next }));
    },
}));

// --- Provider pair (history + document share one capture/restore) -----------------
// Both registries take a {serialize/capture, restore} pair. The capture and the
// restore are identical for undo and scene-I/O — capture = clone the config,
// restore = validate-then-set — so we register the SAME two functions in both.
// restore goes through coerceGradientConfig so a malformed scene document (or any
// garbage) is a safe no-op, never a crash or a wrecked editor.

/** serialize() / capture() — the current config as a JSON-value document. */
export const captureEditorConfig = (): JsonValue =>
    serializeEditorConfig(usePaletteEditorStore.getState().config);

/** restore(snap) — validate + apply a snapshot (undo step or loaded scene doc). */
export const applyEditorConfig = (snap: unknown): void => {
    const cfg = coerceGradientConfig(snap);
    if (cfg) usePaletteEditorStore.setState({ config: cfg });
};
