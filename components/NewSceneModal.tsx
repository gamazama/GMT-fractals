/**
 * New Scene wizard — single-screen composer for starting fresh.
 *
 * Triggered from the File menu's "New Scene" item. Lets the user pick a
 * formula plus optional Geometry / Interlace / Shading layers, then commits
 * via engineStore.loadScene routing through the existing compile gate.
 *
 * Both Formula and Shading sections accept either a registered formula OR
 * a gallery scene (curated + my-submissions) as their source — scenes get
 * fetched + parsed on click and their full preset travels through. The
 * dice button bypasses the form and rolls a fresh random composition.
 *
 * @see dev/plans/new-scene-spec.md
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Z } from './ui';
import { useEngineStore } from '../store/engineStore';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { FormulaPicker } from '../engine-gmt/components/FormulaPicker/FormulaPicker';
import { useSceneGroups } from '../engine-gmt/components/FormulaPicker/useSceneGroups';
import { FOLD_OPTIONS } from '../engine-gmt/features/geometry/folds';
import { getGalleryItem, type GalleryItem } from '../engine-gmt/gallery/GalleryClient';
import { loadGMFScene } from '../engine-gmt/utils/FormulaFormat';
import { extractMetadata } from '../utils/pngMetadata';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { useAnimationStore } from '../store/animationStore';
import type { FormulaType, FractalDefinition } from '../engine-gmt/types';

interface GeometryState {
    hybridBox: boolean;
    /** Index into FOLD_OPTIONS — 0 = Standard fold (default). Only meaningful
     *  when hybridBox is true. */
    hybridFoldType: number;
    burningMode: boolean;
}

const GEOMETRY_DEFAULTS: GeometryState = {
    hybridBox: false,
    hybridFoldType: 0,
    burningMode: false,
};

/** Interlace state — picker-driven (no separate checkbox). `secondary === undefined`
 *  means "no interlace"; setting any formula id enables it. */
interface InterlaceState {
    secondary?: FormulaType;
}

const INTERLACE_DEFAULTS: InterlaceState = {
    secondary: undefined,
};

/** Shading source — either a registered formula (use its defaultPreset) or a
 *  scene loaded asynchronously from the gallery (fetch + parse + extract). */
type ShadingSource =
    | { kind: 'formula'; id: FormulaType; label: string }
    | {
        kind: 'scene';
        label: string;
        isLoading: boolean;
        error?: string;
        extracted?: { features: Record<string, any>; lights?: any[] };
    };

interface ShadingGroups {
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
}

interface ShadingState {
    source?: ShadingSource;
    groups: ShadingGroups;
}

const SHADING_GROUPS_ALL: ShadingGroups = {
    lighting: true,
    materials: true,
    atmosphere: true,
    gradients: true,
    color: true,
};

const SHADING_DEFAULTS: ShadingState = {
    source: undefined,
    groups: SHADING_GROUPS_ALL,
};

/** Per-group → feature-id mapping. Drives both UI and the override builder
 *  in handleCreate. `lighting` group ALSO governs the top-level lights[]
 *  array (handled separately since it's not a feature slice). */
const SHADING_GROUP_FEATURES: Record<keyof ShadingGroups, string[]> = {
    lighting: ['lighting'],
    materials: ['materials', 'ao', 'reflections'],
    atmosphere: ['atmosphere', 'volumetric'],
    gradients: ['coloring', 'texturing'],
    color: ['colorGrading', 'postEffects', 'droste'],
};

/** Flat list of every shading feature id — used by the dice path which copies
 *  all groups unconditionally. Derived from SHADING_GROUP_FEATURES so the two
 *  stay in sync automatically. */
const ALL_SHADING_FEATURE_IDS: readonly string[] = Object.values(SHADING_GROUP_FEATURES).flat();

/** Pick a uniformly random formula def from the registry, excluding Modular
 *  (graph-compiled, no formula params), Workshop launcher, anything in
 *  `exclude`, and anything that matches a shape token in `rejectShapes`.
 *  Returns undefined if no candidates qualify. Used by the wizard's dice. */
function pickRandomNative(opts: {
    exclude?: Set<string>;
    rejectShapes?: Array<'shape:self-contained' | 'shape:modular'>;
} = {}): FractalDefinition | undefined {
    const exclude = opts.exclude ?? new Set();
    const rejectShapes = opts.rejectShapes ?? [];
    const candidates = registry.getAll().filter(def => {
        if (def.id === 'Modular') return false;
        if (exclude.has(def.id)) return false;
        const caps = def.shader.capabilities;
        for (const tok of rejectShapes) {
            if (caps?.has(tok)) return false;
        }
        return true;
    });
    if (candidates.length === 0) return undefined;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Fetch + parse a gallery item's full preset. Mirrors loadGalleryScene's
 *  fetch path (Phase 2 gmf_data column → Phase 1 PNG iTXt fallback) but
 *  skips the engine apply — we just want the data. Also returns the
 *  embedded FractalDefinition so the caller can register it if needed
 *  (e.g. when a scene references a Workshop import not yet in the registry). */
async function fetchScenePreset(item: GalleryItem): Promise<{
    def?: FractalDefinition;
    preset: any;
}> {
    let gmf: string | null = item.gmf_data ?? null;
    if (!gmf) {
        const full = await getGalleryItem(item.slug);
        gmf = full?.gmf_data ?? null;
    }
    if (!gmf) {
        // Phase 1 legacy row: extract from the PNG's iTXt chunk.
        const res = await fetch(item.image_url, { mode: 'cors' });
        if (!res.ok) throw new Error(`Failed to fetch scene image (${res.status})`);
        const blob = await res.blob();
        const file = new File([blob], 'gallery-scene.png', { type: 'image/png' });
        gmf = await extractMetadata(file, 'FractalData');
        if (!gmf) throw new Error('No scene data found in this image');
    }
    const { def, preset } = loadGMFScene(gmf);
    // Inject externalized env-map URL — matches loadGalleryScene's handling.
    if (item.sky_url && preset.features?.materials && typeof preset.features.materials === 'object') {
        preset.features.materials = { ...preset.features.materials, envMapData: item.sky_url };
    }
    return { def, preset };
}

export const NewSceneModal: React.FC = () => {
    const newSceneOpen = useEngineStore(s => (s as any).newSceneOpen as boolean);
    const closeNewScene = useEngineStore(s => (s as any).closeNewScene as () => void);
    const currentFormula = useEngineStore(s => s.formula);
    const loadScene = useEngineStore(s => (s as any).loadScene as (args: { preset: any }) => void);

    // Local composer state. Reset every time the modal opens (user starts fresh).
    const [pickedFormula, setPickedFormula] = useState<FormulaType | undefined>(undefined);
    // When the user picks a SCENE in the Formula section, we stash the scene's
    // full preset here. On Create it's used as the target preset's base
    // (replacing the formula's own defaultPreset) so all the scene's params
    // travel along. Cleared when the user picks a regular formula afterwards.
    const [formulaScenePreset, setFormulaScenePreset] = useState<any | undefined>(undefined);
    const [formulaSceneState, setFormulaSceneState] = useState<
        { label: string; isLoading: boolean; error?: string } | undefined
    >(undefined);
    const [geometry, setGeometry] = useState<GeometryState>(GEOMETRY_DEFAULTS);
    const [geometryOpen, setGeometryOpen] = useState(false);
    const [interlace, setInterlace] = useState<InterlaceState>(INTERLACE_DEFAULTS);
    const [interlaceOpen, setInterlaceOpen] = useState(false);
    const [shading, setShading] = useState<ShadingState>(SHADING_DEFAULTS);
    const [shadingOpen, setShadingOpen] = useState(false);
    // Dirty-state confirm — when Create is clicked on a scene with unsaved
    // changes, intercept with an inline confirmation. Cleared on modal open.
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    useEffect(() => {
        if (newSceneOpen) {
            setPickedFormula(currentFormula as FormulaType);
            setFormulaScenePreset(undefined);
            setFormulaSceneState(undefined);
            setGeometry(GEOMETRY_DEFAULTS);
            setGeometryOpen(false);
            setInterlace(INTERLACE_DEFAULTS);
            setInterlaceOpen(false);
            setShading(SHADING_DEFAULTS);
            setShadingOpen(false);
            setConfirmDiscard(false);
        }
    }, [newSceneOpen, currentFormula]);

    // ── Scene groups for both pickers ────────────────────────────────────────
    // Formula picker: picking a scene fetches + parses, sets the wizard's
    // pickedFormula to the scene's formula id, and stashes the full preset as
    // the target base. Wizard stays OPEN so the user can layer more wizard
    // overrides (geometry / interlace / shading) on top before Create.
    const formulaScenes = useSceneGroups({
        onPick: useCallback(async (item: GalleryItem) => {
            setFormulaSceneState({ label: item.title, isLoading: true });
            try {
                const { def, preset } = await fetchScenePreset(item);
                // Register the formula if it isn't already (Workshop imports
                // travel embedded in the scene's GMF and need to be in the
                // registry for the rest of the wizard to look them up).
                if (def && !registry.get(def.id)) {
                    registry.register(def);
                    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
                }
                const formulaId = (def?.id ?? preset?.formula) as FormulaType | undefined;
                if (formulaId) setPickedFormula(formulaId);
                setFormulaScenePreset(preset);
                setFormulaSceneState({ label: item.title, isLoading: false });
            } catch (err) {
                setFormulaSceneState({
                    label: item.title,
                    isLoading: false,
                    error: err instanceof Error ? err.message : String(err),
                });
                setFormulaScenePreset(undefined);
            }
        }, []),
    });
    // Shading picker: picking a scene fetches + parses + stashes the shading
    // bundle in wizard state without loading the scene. Applied to the target
    // preset on Create.
    const shadingScenes = useSceneGroups({
        onPick: useCallback(async (item: GalleryItem) => {
            setShading(s => ({
                ...s,
                source: { kind: 'scene', label: item.title, isLoading: true },
            }));
            try {
                const { preset } = await fetchScenePreset(item);
                const features = (preset.features ?? {}) as Record<string, any>;
                const lights = Array.isArray(preset.lights) ? preset.lights : undefined;
                setShading(s => ({
                    ...s,
                    source: { kind: 'scene', label: item.title, isLoading: false, extracted: { features, lights } },
                }));
            } catch (err) {
                setShading(s => ({
                    ...s,
                    source: {
                        kind: 'scene',
                        label: item.title,
                        isLoading: false,
                        error: err instanceof Error ? err.message : String(err),
                    },
                }));
            }
        }, []),
    });

    // ── Capability checks for Geometry section gating ────────────────────────
    // Geometry section only exposes COMPILE-TIME toggles — runtime params
    // (Julia mode, Local Rotation's runtime gate) load with defaults and the
    // user toggles them post-create from the panel.
    //
    // Per-section reject lists mirror panels.ts:
    //   Hybrid Box   rejects: ['shape:self-contained']
    //   Burning Mode no reject (works on all per P3 decision)
    // If panels.ts diverges, the test:compat snapshot catches the panel side;
    // wizard side needs a manual touch-up. Future: extract into a shared
    // constant keyed by section id to single-source the rules.
    const pickedDef = pickedFormula ? registry.get(pickedFormula) : undefined;
    const caps = pickedDef?.shader.capabilities;
    const isSelfContained = caps?.has('shape:self-contained') ?? false;
    const isModular = caps?.has('shape:modular') ?? false;
    const hybridBoxDisabled = isSelfContained;
    // Interlace: rejects both shape:self-contained AND shape:modular on EITHER
    // side (mirrors InterlaceFeature.requires.rejects in engine-gmt/features/
    // interlace/index.ts). When the primary trips a reject, the whole section
    // is disabled (no point picking a secondary). When primary is OK, the
    // secondary picker grays formulas in the same reject set.
    const interlaceDisabled = isSelfContained || isModular;
    const interlaceRejectedSecondaries = useMemo(() => {
        const set = new Set<string>();
        for (const def of registry.getAll()) {
            const c = def.shader.capabilities;
            if (c?.has('shape:self-contained') || c?.has('shape:modular')) {
                set.add(def.id);
            }
        }
        return set;
    }, []);

    const handleCreate = useCallback(() => {
        if (!pickedFormula) return;
        const def = registry.get(pickedFormula);
        if (!def) {
            console.warn(`[NewSceneModal] unknown formula '${pickedFormula}'`);
            return;
        }
        // Build target preset. Two base paths:
        // - Scene picked in Formula section → use the scene's full preset as
        //   the base (camera, params, features all travel along).
        // - Regular formula pick → use the formula's defaultPreset.
        // Wizard overrides (geometry / interlace / shading) then apply on top.
        // loadScene routes through the existing compile gate
        // (CONFIG → CONFIG_DONE) + camera teleport + history reset.

        // Geometry overrides — only applied when the section has non-default
        // values AND the toggle isn't disabled by protocol. Param names match
        // engine-gmt/features/geometry/index.ts (GeometryState interface).
        // We always set BOTH compile-gate and runtime-toggle params atomically
        // so the feature lands in a coherent state on first compile (matches
        // CompilableFeatureSection.handleCompile's atomic-flip convention).
        const geometryOverrides: Record<string, any> = {};
        if (geometry.hybridBox && !hybridBoxDisabled) {
            geometryOverrides.hybridCompiled = true;
            geometryOverrides.hybridMode = true;
            geometryOverrides.hybridFoldType = geometry.hybridFoldType;
            // applyTransformLogic is the master geometry switch — defaults true
            // but some formulas' defaultPresets may have flipped it. Force ON
            // so the geometry inject path runs.
            geometryOverrides.applyTransformLogic = true;
        }
        if (geometry.burningMode) {
            geometryOverrides.burningEnabled = true;
            geometryOverrides.burningRuntime = true;
        }

        // Interlace overrides — compile-time params only. Interval +
        // start-iter are left at defaults; user tunes runtime post-create.
        // interlaceEnabled runtime toggle is set ON so the user sees the
        // effect immediately on first render.
        const interlaceOverrides: Record<string, any> = {};
        if (interlace.secondary && !interlaceDisabled) {
            interlaceOverrides.interlaceCompiled = true;
            interlaceOverrides.interlaceEnabled = true;
            interlaceOverrides.interlaceFormula = interlace.secondary;
        }

        // Deep-clone the chosen base so wizard merges don't mutate the
        // registry's defaultPreset (shared singleton) or the scene's preset.
        const basePreset = formulaScenePreset ?? def.defaultPreset;
        const targetPreset: any = JSON.parse(JSON.stringify(basePreset ?? {}));
        targetPreset.formula = pickedFormula;
        targetPreset.name = 'Untitled Scene';
        targetPreset.version = 0;
        // Shading copy — collect feature slices + lights[] from the picked
        // source (formula's defaultPreset OR scene's extracted bundle), then
        // gate by enabled groups. Folded into the preset BEFORE loadScene so
        // the compile picks up shading-side compile-flagged toggles in the
        // same pass.
        const shadingOverrides: Record<string, any> = {};
        let sourceLights: any[] | undefined;
        let sourceFeatures: Record<string, any> | undefined;
        let sourceAllLights: any[] | undefined;
        if (shading.source) {
            if (shading.source.kind === 'formula' && shading.source.id !== pickedFormula) {
                const sourceDef = registry.get(shading.source.id);
                const sourcePreset = (sourceDef?.defaultPreset ?? {}) as Record<string, any>;
                sourceFeatures = (sourcePreset.features ?? {}) as Record<string, any>;
                sourceAllLights = Array.isArray(sourcePreset.lights) ? sourcePreset.lights : undefined;
            } else if (shading.source.kind === 'scene' && shading.source.extracted) {
                sourceFeatures = shading.source.extracted.features;
                sourceAllLights = shading.source.extracted.lights;
            }
        }

        if (sourceFeatures) {
            for (const [groupKey, enabled] of Object.entries(shading.groups) as [keyof ShadingGroups, boolean][]) {
                if (!enabled) continue;
                for (const featId of SHADING_GROUP_FEATURES[groupKey]) {
                    if (sourceFeatures[featId]) {
                        shadingOverrides[featId] = sourceFeatures[featId];
                    }
                }
            }
            // lights[] travels with the 'lighting' group — they're part of
            // the same look (shadow settings + the actual light fixtures).
            if (shading.groups.lighting && sourceAllLights) {
                sourceLights = sourceAllLights;
            }
        }

        const existingFeatures = (targetPreset.features ?? {}) as Record<string, any>;
        const hasAnyOverride =
            Object.keys(geometryOverrides).length > 0 ||
            Object.keys(interlaceOverrides).length > 0 ||
            Object.keys(shadingOverrides).length > 0;

        if (hasAnyOverride) {
            targetPreset.features = {
                ...existingFeatures,
                // Shading copies REPLACE the corresponding target slices wholesale.
                ...shadingOverrides,
            };
            if (Object.keys(geometryOverrides).length > 0) {
                targetPreset.features.geometry = {
                    ...(existingFeatures.geometry ?? {}),
                    ...geometryOverrides,
                };
            }
            if (Object.keys(interlaceOverrides).length > 0) {
                targetPreset.features.interlace = {
                    ...(existingFeatures.interlace ?? {}),
                    ...interlaceOverrides,
                };
            }
        }
        if (sourceLights) {
            // Light fixtures travel with the shading copy. Replace the target's
            // lights wholesale — partial-merge would mix two formulas' light
            // setups in incoherent ways.
            targetPreset.lights = sourceLights;
        }

        // New scene starts with a clean slate: empty saved-cameras library,
        // empty animation sequence + LFO array. lights[] travels from the
        // base preset (formula default or scene) unless overridden by the
        // shading copy's lighting group.
        targetPreset.savedCameras = [];
        targetPreset.animations = [];
        targetPreset.sequence = { durationFrames: 0, tracks: {} };
        targetPreset.duration = 0;

        loadScene({ preset: targetPreset });
        // Reset animation runtime state (the loadScene path applies
        // sequence + duration via setSequence, but doesn't touch currentFrame
        // or isPlaying). Stop any in-flight playback and rewind.
        try {
            useAnimationStore.setState({ currentFrame: 0, isPlaying: false });
        } catch { /* animationStore not available — non-fatal */ }
        closeNewScene();
    }, [pickedFormula, formulaScenePreset, geometry, interlace, shading, hybridBoxDisabled, interlaceDisabled, loadScene, closeNewScene]);

    // ── Dice: full random scene composition ──────────────────────────────────
    // Picks a random primary formula, copies shading from a different random
    // formula, and ~50% of the time interleaves with another random valid
    // secondary. Bypasses the wizard's local state — builds the preset
    // directly and commits.
    const doDiceCreate = useCallback(() => {
        const primaryDef = pickRandomNative();
        if (!primaryDef) {
            console.warn('[NewSceneModal] no formulas available for dice');
            return;
        }
        const shadingDef = pickRandomNative({ exclude: new Set([primaryDef.id]) });

        // Build base preset from primary formula
        const targetPreset: any = JSON.parse(JSON.stringify(primaryDef.defaultPreset ?? {}));
        targetPreset.formula = primaryDef.id;
        targetPreset.name = 'Untitled Scene';
        targetPreset.version = 0;
        targetPreset.savedCameras = [];
        targetPreset.animations = [];
        targetPreset.sequence = { durationFrames: 0, tracks: {} };
        targetPreset.duration = 0;

        // Shading — copy ALL groups from random source (no per-group opt-out
        // on dice; the user chose chaos).
        if (shadingDef) {
            const sourceFeatures = (shadingDef.defaultPreset?.features ?? {}) as Record<string, any>;
            const sourceLights = Array.isArray(shadingDef.defaultPreset?.lights)
                ? shadingDef.defaultPreset.lights
                : undefined;
            const existingFeatures = (targetPreset.features ?? {}) as Record<string, any>;
            targetPreset.features = { ...existingFeatures };
            for (const featId of ALL_SHADING_FEATURE_IDS) {
                if (sourceFeatures[featId]) {
                    targetPreset.features[featId] = sourceFeatures[featId];
                }
            }
            if (sourceLights) targetPreset.lights = sourceLights;
        }

        // Interlace — ~50% chance, only when primary supports it (not
        // self-contained or modular). Secondary must also support it.
        const primaryCaps = primaryDef.shader.capabilities;
        const primaryCanInterlace =
            !primaryCaps?.has('shape:self-contained') &&
            !primaryCaps?.has('shape:modular');
        if (primaryCanInterlace && Math.random() < 0.5) {
            const secondaryDef = pickRandomNative({
                exclude: new Set([primaryDef.id, ...(shadingDef ? [shadingDef.id] : [])]),
                rejectShapes: ['shape:self-contained', 'shape:modular'],
            });
            if (secondaryDef) {
                const existingFeatures = (targetPreset.features ?? {}) as Record<string, any>;
                targetPreset.features = {
                    ...existingFeatures,
                    interlace: {
                        ...(existingFeatures.interlace ?? {}),
                        interlaceCompiled: true,
                        interlaceEnabled: true,
                        interlaceFormula: secondaryDef.id,
                    },
                };
            }
        }

        loadScene({ preset: targetPreset });
        try {
            useAnimationStore.setState({ currentFrame: 0, isPlaying: false });
        } catch { /* non-fatal */ }
        closeNewScene();
    }, [loadScene, closeNewScene]);

    // Create button gating: requires a formula, and any in-flight async
    // scene extractions (Formula or Shading) must have finished without error.
    const canCreate = useMemo(() => {
        if (!pickedFormula) return false;
        if (formulaSceneState?.isLoading) return false;
        if (formulaSceneState?.error) return false;
        if (shading.source?.kind === 'scene') {
            if (shading.source.isLoading) return false;
            if (shading.source.error || !shading.source.extracted) return false;
        }
        return true;
    }, [pickedFormula, formulaSceneState, shading.source]);

    // Dirty check — Create on a dirty scene first asks for confirmation so
    // users don't discard unsaved work by accident. `paramUndoStack` grows
    // when the user changes any param since the last load/save; loadPreset
    // calls resetParamHistory which clears it, so the check below is "since
    // last load/save".
    const isSceneDirty = useEngineStore(s => ((s as any).paramUndoStack as unknown[] | undefined)?.length ? true : false);
    // Tracks which Create variant was requested when the discard-confirm
    // modal pops up, so the eventual "Discard & Create" button resumes the
    // right action.
    const [pendingAction, setPendingAction] = useState<'create' | 'dice'>('create');
    const handleCreateClicked = useCallback(() => {
        if (isSceneDirty) {
            setPendingAction('create');
            setConfirmDiscard(true);
            return;
        }
        handleCreate();
    }, [isSceneDirty, handleCreate]);
    const handleDiceClicked = useCallback(() => {
        if (isSceneDirty) {
            setPendingAction('dice');
            setConfirmDiscard(true);
            return;
        }
        doDiceCreate();
    }, [isSceneDirty, doDiceCreate]);

    if (!newSceneOpen) return null;

    return (
        <Modal onClose={closeNewScene} z={Z.modal} dismissOnBackdrop={false}>
            <div className="bg-neutral-900 border border-white/10 rounded-md shadow-2xl w-[min(720px,95vw)] max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h2 className="text-sm font-bold text-gray-200 tracking-tight">New Scene</h2>
                    <button
                        onClick={closeNewScene}
                        className="text-gray-500 hover:text-gray-300 transition-colors text-[10px]"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Body — composer sections */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    <section>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                Formula
                            </h3>
                            {formulaSceneState && (
                                <span className="text-[9px] text-gray-500">
                                    {formulaSceneState.isLoading
                                        ? `loading ${formulaSceneState.label}…`
                                        : formulaSceneState.error
                                            ? `error loading ${formulaSceneState.label}`
                                            : `using scene: ${formulaSceneState.label}`}
                                    {formulaScenePreset && !formulaSceneState.isLoading && !formulaSceneState.error && (
                                        <button
                                            onClick={() => {
                                                setFormulaScenePreset(undefined);
                                                setFormulaSceneState(undefined);
                                            }}
                                            className="ml-2 text-gray-500 hover:text-amber-400 px-1.5 py-0.5 rounded hover:bg-white/5"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </span>
                            )}
                        </div>
                        {formulaSceneState?.error && (
                            <p className="text-[9px] text-red-500/90 px-1 mb-1">
                                Couldn't load scene: {formulaSceneState.error}
                            </p>
                        )}
                        {/* No fixed height — FormulaPicker's InlineShell is
                         *  hardcoded to h-[400px] and ignores wrapper height.
                         *  Wrapper auto-fits around it. */}
                        <FormulaPicker
                            variant="inline"
                            value={pickedFormula}
                            onCommit={(c) => {
                                if (c.action === 'select') {
                                    setPickedFormula(c.id as FormulaType);
                                    // Clear any scene override — user wants this formula's defaults.
                                    setFormulaScenePreset(undefined);
                                    setFormulaSceneState(undefined);
                                }
                            }}
                            specialEntries={['modular']}
                            extraGroups={formulaScenes}
                            showHoverPreview={true}
                        />
                    </section>

                    <GeometrySection
                        state={geometry}
                        setState={setGeometry}
                        open={geometryOpen}
                        setOpen={setGeometryOpen}
                        hybridBoxDisabled={hybridBoxDisabled}
                        foldOptions={FOLD_OPTIONS}
                    />

                    <InterlaceSection
                        state={interlace}
                        setState={setInterlace}
                        open={interlaceOpen}
                        setOpen={setInterlaceOpen}
                        disabled={interlaceDisabled}
                        disabledReason={
                            isModular
                                ? 'Modular formulas use the graph editor instead.'
                                : 'Self-contained formulas own their full iteration loop.'
                        }
                        rejectedSecondaries={interlaceRejectedSecondaries}
                    />

                    <ShadingSection
                        state={shading}
                        setState={setShading}
                        open={shadingOpen}
                        setOpen={setShadingOpen}
                        primaryFormula={pickedFormula}
                        sceneGroups={shadingScenes}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 bg-neutral-950">
                    <button
                        onClick={closeNewScene}
                        className="px-3 py-1 text-[10px] font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDiceClicked}
                        title="Surprise me — random formula, shading, and maybe interlace"
                        className="px-2 py-1 text-[12px] font-bold bg-neutral-800 hover:bg-neutral-700 text-cyan-300 rounded transition-colors"
                    >
                        🎲
                    </button>
                    <button
                        onClick={handleCreateClicked}
                        disabled={!canCreate}
                        className="px-3 py-1 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded transition-colors"
                    >
                        Create Scene
                    </button>
                </div>
            </div>

            {/* Discard-changes confirmation. Shown only when the current scene
             *  has uncommitted param changes (paramUndoStack non-empty). User
             *  can cancel and save first via File → Save, or discard and
             *  proceed. We don't offer a Save-from-here button — keeps the
             *  flow shallow and avoids re-implementing the existing save UI. */}
            {confirmDiscard && (
                <Modal onClose={() => setConfirmDiscard(false)} z={Z.modalNested}>
                    <div className="bg-neutral-900 border border-amber-500/30 rounded-md shadow-2xl w-[420px] p-4 space-y-3">
                        <h3 className="text-[12px] font-bold text-amber-400">
                            Discard current scene?
                        </h3>
                        <p className="text-[11px] text-gray-300 leading-snug">
                            The current scene has unsaved changes. Creating a new scene
                            will discard them. Save first via <span className="text-gray-400">File → Save Scene</span> if you want to keep them.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                onClick={() => setConfirmDiscard(false)}
                                className="px-3 py-1 text-[10px] font-medium text-gray-300 hover:bg-white/5 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setConfirmDiscard(false);
                                    if (pendingAction === 'dice') doDiceCreate();
                                    else handleCreate();
                                    setPendingAction('create');
                                }}
                                className="px-3 py-1 text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
                            >
                                Discard &amp; Create
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </Modal>
    );
};

// ─── Geometry section ─────────────────────────────────────────────────────────

interface GeometrySectionProps {
    state: GeometryState;
    setState: React.Dispatch<React.SetStateAction<GeometryState>>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    hybridBoxDisabled: boolean;
    foldOptions: { label: string; value: number }[];
}

const GeometrySection: React.FC<GeometrySectionProps> = ({
    state, setState, open, setOpen, hybridBoxDisabled, foldOptions,
}) => {
    const activeCount = useMemo(() => {
        let n = 0;
        if (state.hybridBox && !hybridBoxDisabled) n++;
        if (state.burningMode) n++;
        return n;
    }, [state, hybridBoxDisabled]);

    return (
        <section className="border border-white/5 rounded bg-white/[0.02]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
            >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {open ? '▾' : '▸'} Geometry
                </span>
                <span className="text-[9px] text-gray-500">
                    {activeCount > 0 ? `${activeCount} enabled` : 'optional'}
                </span>
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-2">
                    <Toggle
                        label="Hybrid Box"
                        checked={state.hybridBox}
                        disabled={hybridBoxDisabled}
                        disabledReason="Not available — this formula owns its full iteration loop."
                        onChange={(v) => setState(s => ({ ...s, hybridBox: v }))}
                    />
                    {state.hybridBox && !hybridBoxDisabled && (
                        <div className="pl-5">
                            <label className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400">Fold type</span>
                                <select
                                    value={state.hybridFoldType}
                                    onChange={(e) => setState(s => ({ ...s, hybridFoldType: parseInt(e.target.value, 10) }))}
                                    className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-500"
                                >
                                    {foldOptions.map(o => (
                                        <option key={o.value} value={o.value} className="bg-[#111] text-gray-300">
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}
                    <Toggle
                        label="Burning Mode"
                        checked={state.burningMode}
                        onChange={(v) => setState(s => ({ ...s, burningMode: v }))}
                    />
                </div>
            )}
        </section>
    );
};

// ─── Interlace section ────────────────────────────────────────────────────────

interface InterlaceSectionProps {
    state: InterlaceState;
    setState: React.Dispatch<React.SetStateAction<InterlaceState>>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    disabled: boolean;
    disabledReason: string;
    rejectedSecondaries: Set<string>;
}

const InterlaceSection: React.FC<InterlaceSectionProps> = ({
    state, setState, open, setOpen, disabled, disabledReason, rejectedSecondaries,
}) => {
    const headerSubtitle = disabled
        ? 'not available'
        : state.secondary
            ? `paired with ${state.secondary}`
            : 'optional';

    return (
        <section className={`border border-white/5 rounded ${disabled ? 'bg-white/[0.01] opacity-50' : 'bg-white/[0.02]'}`}>
            <button
                onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                title={disabled ? disabledReason : undefined}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${disabled ? 'cursor-not-allowed' : 'hover:bg-white/[0.04]'}`}
            >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {!disabled && (open ? '▾' : '▸')} Interleave with second formula
                </span>
                <span className="text-[9px] text-gray-500">{headerSubtitle}</span>
            </button>
            {open && !disabled && (
                <div className="px-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                            Pick a secondary formula — selecting one enables interleave.
                        </span>
                        {state.secondary && (
                            <button
                                onClick={() => setState({ secondary: undefined })}
                                className="text-[10px] text-gray-500 hover:text-amber-400 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
                            >
                                Clear (none)
                            </button>
                        )}
                    </div>
                    {/* No fixed-height wrapper — picker's InlineShell is 400px. */}
                    <FormulaPicker
                        variant="inline"
                        value={state.secondary}
                        onCommit={(c) => {
                            if (c.action === 'select') {
                                setState({ secondary: c.id as FormulaType });
                            }
                        }}
                        specialEntries={[]}
                        disabledIds={rejectedSecondaries}
                        disabledReason={() => 'Not pairable as interlace secondary.'}
                        showHoverPreview={true}
                    />
                </div>
            )}
        </section>
    );
};

// ─── Shading section ──────────────────────────────────────────────────────────

interface ShadingSectionProps {
    state: ShadingState;
    setState: React.Dispatch<React.SetStateAction<ShadingState>>;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    primaryFormula?: FormulaType;
    sceneGroups: ReturnType<typeof useSceneGroups>;
}

const ShadingSection: React.FC<ShadingSectionProps> = ({
    state, setState, open, setOpen, primaryFormula, sceneGroups,
}) => {
    const primaryName = primaryFormula
        ? registry.get(primaryFormula)?.name ?? primaryFormula
        : 'formula';

    const headerSubtitle = (() => {
        if (!state.source) return `using ${primaryName} defaults`;
        if (state.source.kind === 'formula') {
            if (state.source.id === primaryFormula) return 'copying from itself (no-op)';
            return `copying from ${state.source.label}`;
        }
        // scene
        if (state.source.isLoading) return `loading ${state.source.label}…`;
        if (state.source.error) return `error loading ${state.source.label}`;
        return `copying from ${state.source.label}`;
    })();

    // Picker value: only relevant for formula-kind sources. Scene sources don't
    // round-trip through the picker's value/highlight mechanism.
    const pickerValue = state.source?.kind === 'formula' ? state.source.id : undefined;

    return (
        <section className="border border-white/5 rounded bg-white/[0.02]">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
            >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {open ? '▾' : '▸'} Shading style
                </span>
                <span className="text-[9px] text-gray-500">{headerSubtitle}</span>
            </button>
            {open && (
                <div className="px-3 pb-3 space-y-2">
                    {/* When a source is set, surface checkboxes + clear button at
                     *  the top so they're always visible. Picker stays accessible
                     *  below for source changes. */}
                    {state.source && (
                        <div className="bg-white/[0.04] border border-cyan-500/20 rounded p-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-300">
                                    {state.source.kind === 'scene' && state.source.isLoading
                                        ? `Loading ${state.source.label}…`
                                        : `Source: ${state.source.label}`}
                                </span>
                                <button
                                    onClick={() => setState(s => ({ ...s, source: undefined }))}
                                    className="text-[10px] text-gray-500 hover:text-amber-400 transition-colors px-2 py-0.5 rounded hover:bg-white/5"
                                >
                                    Clear (use defaults)
                                </button>
                            </div>
                            {state.source.kind === 'scene' && state.source.error && (
                                <p className="text-[9px] text-red-500/90">
                                    Couldn't extract shading: {state.source.error}
                                </p>
                            )}
                            <ShadingGroupsControl
                                groups={state.groups}
                                onChange={(g) => setState(s => ({ ...s, groups: g }))}
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                            {state.source
                                ? 'Change source — pick a different formula or scene.'
                                : 'Pick a formula or scene to copy lighting, materials, atmosphere, color.'}
                        </span>
                    </div>
                    {/* No fixed-height wrapper — picker's InlineShell is 400px. */}
                    <FormulaPicker
                        variant="inline"
                        value={pickerValue}
                        onCommit={(c) => {
                            if (c.action === 'select') {
                                const def = registry.get(c.id);
                                setState(s => ({
                                    ...s,
                                    source: {
                                        kind: 'formula',
                                        id: c.id as FormulaType,
                                        label: def?.name ?? c.id,
                                    },
                                }));
                            }
                        }}
                        specialEntries={[]}
                        extraGroups={sceneGroups}
                        showHoverPreview={true}
                    />
                </div>
            )}
        </section>
    );
};

// Per-group opt-in checkboxes. Lets the user pick which slices of the source
// shading actually overwrite the target's defaults. All-on matches the
// "full visual style transfer" semantic; un-checking lets the user keep
// (e.g.) the formula's own coloring but use the source's lighting.
const ShadingGroupsControl: React.FC<{
    groups: ShadingGroups;
    onChange: (g: ShadingGroups) => void;
}> = ({ groups, onChange }) => (
    <div className="pl-1 pt-1 space-y-1">
        <div className="text-[10px] text-gray-400">What to copy:</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <Toggle
                label="Lighting + lights"
                checked={groups.lighting}
                onChange={(v) => onChange({ ...groups, lighting: v })}
            />
            <Toggle
                label="Materials, AO, reflections"
                checked={groups.materials}
                onChange={(v) => onChange({ ...groups, materials: v })}
            />
            <Toggle
                label="Atmosphere, volumetric"
                checked={groups.atmosphere}
                onChange={(v) => onChange({ ...groups, atmosphere: v })}
            />
            <Toggle
                label="Gradients"
                checked={groups.gradients}
                onChange={(v) => onChange({ ...groups, gradients: v })}
            />
            <Toggle
                label="Grading, bloom"
                checked={groups.color}
                onChange={(v) => onChange({ ...groups, color: v })}
            />
        </div>
    </div>
);

// ─── Small primitives ─────────────────────────────────────────────────────────

const Toggle: React.FC<{
    label: string;
    checked: boolean;
    disabled?: boolean;
    disabledReason?: string;
    onChange: (v: boolean) => void;
}> = ({ label, checked, disabled, disabledReason, onChange }) => (
    <label
        className={`flex items-center gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        title={disabled ? disabledReason : undefined}
    >
        <input
            type="checkbox"
            checked={checked && !disabled}
            disabled={disabled}
            onChange={e => onChange(e.target.checked)}
            className="w-3 h-3 accent-cyan-500"
        />
        <span className="text-[11px] text-gray-300">{label}</span>
    </label>
);
