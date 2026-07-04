/**
 * Pure MB3DScene synthesis — build a weave-able scene object from slots without
 * touching the store. Extracted from loadMB3DScene (which re-exports
 * `buildWeaveScene` for its existing callers) so store-free consumers — the
 * P4.4 legacy-save migration (utils/weaveMigration.ts), the render harness,
 * node test suites — can synthesize scenes without dragging in engineStore.
 */
import type { MB3DScene, MB3DAddon, MB3DFormulaSlot, MB3DHeader } from './parseMB3D';

export const DEFAULT_SYNTH_ITER = 32;

export function defaultHeader(): MB3DHeader {
    return {
        mandId: 0, width: 640, height: 480, iterations: DEFAULT_SYNTH_ITER, iOptions: 0, bNewOptions: 0,
        zoom: 1, fovY: 0, dZstart: 0, dZend: 0, midX: 0, midY: 0, midZ: 0, wRotX: 0, wRotY: 0, wRotZ: 0,
        hVGrads: [], // no nav matrix → mapMB3DCamera falls back to the centered default
        isJulia: false, jx: 0, jy: 0, jz: 0, jw: 0, m3dVersion: 18, tilingOptions: 0,
        // 0 → the scene-DE override in emitFusedHybrid is skipped; a standalone formula
        // keeps its own DE defaults (mapDEMeta) since there's no authored scene.
        rStop: 0, deStop: 0, zStepDiv: 0, stepsAfterDEStop: 0,
        // No authored lighting → empty lights makes mapMB3DLighting return nothing, so the
        // preset inherits DEFAULT_LIGHTS (mirrors hVGrads:[] → centered-camera fallback).
        lights: [], roughnessFactor: 0, tbpos: [], tbOptions: 0,
        ambCol: '', ambCol2: '', depthCol: '', depthCol2: '', dynFog: '', colStops: [],
    };
}

export function synthScene(slot: MB3DFormulaSlot, title: string): MB3DScene {
    const addon: MB3DAddon = {
        version: 0, options1: 0, options2: 0, options3: 0,
        formulaCount: 1, hybOpt1: 0, hybOpt2: 0, slots: [slot],
    };
    return { version: 18, header: defaultHeader(), addon, title, raw: new Uint8Array(0) };
}

/** Synthesize a multi-slot mode-0 weave scene from weaver-picked slots. endTo
 *  rides the mode-0 clamp in weaveSpecFromMB3D (last active slot); `repeatFrom`
 *  is MB3D's "repeat from here" nibble — earlier slots run once as an intro. */
export function buildWeaveScene(slots: MB3DFormulaSlot[], title: string, iterations?: number, repeatFrom = 0): MB3DScene {
    const header = defaultHeader();
    if (iterations && iterations > 0) header.iterations = iterations;
    const addon: MB3DAddon = {
        version: 0, options1: 0, options2: 0, options3: 0,
        formulaCount: slots.length, hybOpt1: (repeatFrom & 0xF) << 4, hybOpt2: 0, slots,
    };
    return { version: 18, header, addon, title, raw: new Uint8Array(0) };
}
