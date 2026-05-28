/**
 * Partial-load filter — lets the user choose which parts of a scene file
 * (PNG / GMF) actually get applied on Load, keeping the rest of the current
 * scene intact.
 *
 * Mirrors the New Scene wizard's per-group copy, but in reverse: instead of
 * building a fresh scene, it overlays the selected groups from the loaded
 * file onto a clone of the CURRENT scene's preset, then routes the merged
 * preset through the normal `loadScene` compile gate.
 *
 * The seven groups match the New Scene wizard's shading groups (so the mental
 * model is shared) plus Formula, Camera and Animation. "All on" is a plain
 * full load — the merge is skipped entirely.
 *
 * State is module-local (no store-schema changes — same ethos as
 * applyPartialPreset) and persisted to localStorage so the choice survives
 * reloads. The Load menu item subscribes via `subscribeLoadFilter` to
 * italicise its label when a filter is in effect.
 *
 * @see dev/components/LoadFilterPanel.tsx
 * @see dev/engine-gmt/utils/applyPartialPreset.ts
 */

import { useSyncExternalStore } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { loadSceneFile } from '../../engine/plugins/SceneIO';
import { applyPartialPreset } from './applyPartialPreset';
import { flushCameraToStore } from '../store/cameraSlice';
import type { Preset } from '../types/fractal';

export interface LoadFilter {
    /** formula id + params (coreMath) + geometry/interlace + graph/pipeline,
     *  plus the DE characterisation (quality.estimator/distanceMetric/deBailout) */
    formula: boolean;
    /** features.lighting + top-level lights[] */
    lighting: boolean;
    /** features.materials + ao + reflections */
    materials: boolean;
    /** features.atmosphere + volumetric */
    atmosphere: boolean;
    /** features.coloring + texturing — gradient / image surface colour */
    gradients: boolean;
    /** features.colorGrading + postEffects + droste (post-process effects) */
    color: boolean;
    /** camera pose + saved-camera library */
    camera: boolean;
    /** animation timeline (sequence + clips + duration) */
    animation: boolean;
}

export type LoadFilterGroup = keyof LoadFilter;

const DEFAULT_FILTER: LoadFilter = {
    formula: true,
    lighting: true,
    materials: true,
    atmosphere: true,
    gradients: true,
    color: true,
    camera: true,
    animation: true,
};

/** Feature-slice ids copied for each feature-backed group. Camera + animation
 *  groups live in top-level preset fields, handled separately in the merge. */
const GROUP_FEATURES: Record<'formula' | 'lighting' | 'materials' | 'atmosphere' | 'gradients' | 'color', string[]> = {
    formula: ['coreMath', 'geometry', 'interlace'],
    lighting: ['lighting'],
    materials: ['materials', 'ao', 'reflections'],
    atmosphere: ['atmosphere', 'volumetric'],
    gradients: ['coloring', 'texturing'],
    color: ['colorGrading', 'postEffects', 'droste'],
};

/** The five "look" groups — all backed purely by feature slices, so they can
 *  be applied surgically (live setters) without a full scene reload. Formula,
 *  camera and animation are excluded: they touch the formula id, camera pose
 *  or timeline and need the heavier loadScene path. */
const LOOK_GROUPS = ['lighting', 'materials', 'atmosphere', 'gradients', 'color'] as const;

const STORAGE_KEY = 'gmt.loadFilter';
const KEEP_KEY = 'gmt.loadFilter.keep';

// ── Module state + pub/sub ────────────────────────────────────────────────

function readPersisted(): LoadFilter {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_FILTER };
        const parsed = JSON.parse(raw) as Partial<LoadFilter>;
        // Merge over defaults so a newly-added group defaults to on even if
        // the persisted blob predates it.
        return { ...DEFAULT_FILTER, ...parsed };
    } catch {
        return { ...DEFAULT_FILTER };
    }
}

let _filter: LoadFilter = readPersisted();
// Whether the filter applies to the normal Load menu row (sticky). Off by
// default: the row does a plain full load and the chosen group toggles are
// merely remembered in the panel until the user opts in. The panel's own
// Load button always honours the toggles regardless.
let _keepOptions: boolean = (() => {
    try { return localStorage.getItem(KEEP_KEY) === '1'; } catch { return false; }
})();
let _panelOpen = false;
let _snapshot: { filter: LoadFilter; panelOpen: boolean; keepOptions: boolean } =
    { filter: _filter, panelOpen: _panelOpen, keepOptions: _keepOptions };

const _subs = new Set<() => void>();
function rebuildAndNotify() {
    _snapshot = { filter: _filter, panelOpen: _panelOpen, keepOptions: _keepOptions };
    _subs.forEach(fn => fn());
}

function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_filter)); }
    catch { /* private-mode / quota — non-fatal, filter still works in-session */ }
}

export function getLoadFilter(): LoadFilter { return _filter; }

export function setLoadFilterGroup(group: LoadFilterGroup, value: boolean): void {
    if (_filter[group] === value) return;
    _filter = { ..._filter, [group]: value };
    persist();
    rebuildAndNotify();
}

export function resetLoadFilter(): void {
    _filter = { ...DEFAULT_FILTER };
    persist();
    rebuildAndNotify();
}

export function getKeepOptions(): boolean { return _keepOptions; }

export function setKeepOptions(value: boolean): void {
    if (_keepOptions === value) return;
    _keepOptions = value;
    try { localStorage.setItem(KEEP_KEY, value ? '1' : '0'); } catch { /* non-fatal */ }
    rebuildAndNotify();
}

/** True when at least one group is excluded — used to decide whether a
 *  filtered load differs from a full load. */
export function isLoadFilterActive(): boolean {
    return (Object.keys(_filter) as LoadFilterGroup[]).some(k => !_filter[k]);
}

/** Whether the Load menu row should load through the filter — only when the
 *  user has opted to keep options AND at least one group is excluded. Drives
 *  the row's italic + `*` indicator. */
export function isLoadFilterStuck(): boolean {
    return _keepOptions && isLoadFilterActive();
}

export function openLoadFilterPanel(): void {
    if (_panelOpen) return;
    _panelOpen = true;
    rebuildAndNotify();
}

export function closeLoadFilterPanel(): void {
    if (!_panelOpen) return;
    _panelOpen = false;
    rebuildAndNotify();
}

function subscribe(cb: () => void): () => void {
    _subs.add(cb);
    return () => { _subs.delete(cb); };
}

function getSnapshot() { return _snapshot; }

/** React hook — re-renders on any filter or panel-open change. */
export function useLoadFilterState() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ── Merge ─────────────────────────────────────────────────────────────────

const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

/** Copy a feature slice from `file` onto `merged`. Absence in the file is
 *  meaningful — it means the feature was off in the saved scene, so we drop
 *  the slice (loadPreset then falls back to DDFS defaults = off) rather than
 *  keeping the current scene's slice. */
function copyFeature(merged: any, file: Preset, featId: string): void {
    const v = (file.features ?? {})[featId];
    if (v === undefined) {
        if (merged.features) delete merged.features[featId];
    } else {
        merged.features = merged.features ?? {};
        merged.features[featId] = v;
    }
}

/** Copy only the named params of a feature slice from `file` onto `merged`,
 *  leaving the rest of that feature at the current scene's values. Used for the
 *  formula's DE characterisation (estimator/metric/bailout) which lives in the
 *  shared `quality` feature alongside perf knobs we must NOT drag along. */
function copyFeatureParams(merged: any, file: Preset, featId: string, params: string[]): void {
    const src = (file.features ?? {})[featId];
    if (!src) return;
    merged.features = merged.features ?? {};
    const target = { ...(merged.features[featId] ?? {}) };
    for (const key of params) {
        if (src[key] !== undefined) target[key] = src[key];
    }
    merged.features[featId] = target;
}

/** The formula's distance-estimator characterisation — these define HOW the
 *  fractal renders, so they must travel with the formula on load. They live in
 *  the shared `quality` feature, so they're copied param-wise (not the whole
 *  slice, which also holds AA / accumulation / step caps). */
const FORMULA_QUALITY_PARAMS = ['estimator', 'distanceMetric', 'deBailout'];

/**
 * Build the preset to load: a clone of `current` with the selected groups
 * overlaid from `file`. Groups left unchecked keep the current scene's values.
 */
export function buildFilteredPreset(current: Preset, file: Preset, filter: LoadFilter): Preset {
    const merged: any = deepClone(current);
    merged.features = merged.features ?? {};

    if (filter.formula) {
        merged.formula = file.formula;
        // Modular graph travels with the formula; clear it for native files so
        // a Modular→native load doesn't leave a stale graph behind.
        merged.graph = file.graph;
        merged.pipeline = file.pipeline;
        for (const featId of GROUP_FEATURES.formula) copyFeature(merged, file, featId);
        // DE estimator / distance metric / bailout characterise how this
        // formula renders — bring them along, but not the rest of `quality`.
        copyFeatureParams(merged, file, 'quality', FORMULA_QUALITY_PARAMS);
    }

    for (const group of LOOK_GROUPS) {
        if (!filter[group]) continue;
        for (const featId of GROUP_FEATURES[group]) copyFeature(merged, file, featId);
    }
    // lights[] fixtures travel with the lighting group. The live lights array
    // lives inside features.lighting (copied above); the top-level lights[] is
    // legacy/empty for modern saves but copied here so older files still work.
    if (filter.lighting && file.lights?.length) merged.lights = deepClone(file.lights);

    if (filter.camera) {
        merged.cameraPos = file.cameraPos;
        merged.cameraRot = file.cameraRot;
        merged.cameraFov = file.cameraFov;
        merged.sceneOffset = file.sceneOffset;
        merged.targetDistance = file.targetDistance;
        merged.cameraMode = file.cameraMode;
        merged.savedCameras = file.savedCameras ? deepClone(file.savedCameras) : undefined;
    }

    if (filter.animation) {
        merged.animations = file.animations ? deepClone(file.animations) : undefined;
        merged.sequence = file.sequence ? deepClone(file.sequence) : undefined;
        merged.duration = file.duration;
    }

    return merged as Preset;
}

// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Open a file picker and load the chosen scene. Shared by the Load menu row
 * and the panel's Load button.
 *
 * @param useFilter When false (or no group is excluded) the file loads in
 *   full, ignoring the panel toggles. The menu row passes `getKeepOptions()`
 *   so a full load is the default unless the user opted to keep options; the
 *   panel's Load button passes `true` to always honour the toggles.
 *
 * Filtered regimes:
 *  - Look-only (formula/camera/animation all OFF) → surgical: push just the
 *    selected feature slices onto the live store via applyPartialPreset. No
 *    scene reload, so the formula, distance estimator, render settings and
 *    camera are left completely untouched — nothing jumps or recompiles
 *    beyond the copied slices' own compile-flagged params.
 *  - Structural (formula/camera/animation involved) → merge a clone of the
 *    current scene with the selected groups from the file and `loadScene`
 *    it. Camera is flushed first so the teleport lands on the live pose when
 *    Camera is left unticked.
 */
export function loadSceneWithFilter(useFilter: boolean): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,.gmf,image/png';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = async () => {
        const file = input.files?.[0];
        input.remove();
        if (!file) return;
        let filePreset: Preset | null;
        try {
            filePreset = (await loadSceneFile(file)) as Preset | null;
        } catch (err) {
            console.warn('[loadFilter] failed to parse scene file', err);
            return;
        }
        if (!filePreset) {
            console.warn('[loadFilter] could not parse scene from', file.name);
            return;
        }
        const store = useEngineStore.getState() as any;
        const filter = getLoadFilter();

        if (!useFilter || !isLoadFilterActive()) {
            store.loadScene({ preset: filePreset });
            return;
        }

        const structural = filter.formula || filter.camera || filter.animation;
        if (!structural) {
            // Look-only: apply just the selected feature slices live. The whole
            // file slice (incl. noReset params like the lights array) replaces
            // the live one; params absent from the file fall back to defaults.
            const featureIds: string[] = [];
            for (const group of LOOK_GROUPS) {
                if (filter[group]) featureIds.push(...GROUP_FEATURES[group]);
            }
            if (featureIds.length) {
                applyPartialPreset({ source: filePreset, featureIds, respectNoReset: false });
            }
            return;
        }

        // Structural change — flush the live camera so a teleport (fired
        // unconditionally by loadPreset) lands on the current pose rather than
        // a stale debounced sample when Camera is unticked.
        flushCameraToStore();
        const current = store.getPreset({ includeScene: true }) as Preset;
        const merged = buildFilteredPreset(current, filePreset, filter);
        store.loadScene({ preset: merged });
    };
    input.click();
}
