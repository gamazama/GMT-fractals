/**
 * Preset applier — translates a reference toy-fluid Preset into our
 * slice-separated DDFS store and dispatches the setters.
 *
 * The reference `toy-fluid/presets.ts` still ships in the engine repo
 * as the authoring source. We import its `Preset` data directly and
 * map every field onto the correct slice at apply time. This lets us
 * reuse the 7 curated presets without duplicating 500 lines of data.
 *
 * Each slice is updated with one setter call so DDFS only flushes once
 * per slice. After the dispatch, FluidToyApp's effects pick up the
 * changes and push them into FluidEngine via the established params
 * path. The caller is responsible for triggering `engine.resetFluid()`
 * alongside the apply (see PresetGrid).
 */

import type { Preset as RefPreset } from './data';
// NB: do NOT eagerly import `useEngineStore` here. Apply is reached
// transitively from registerFeatures.ts (via PresetGrid), and importing
// the store at module scope boots it before feature registrations
// complete — the registry freezes and every subsequent
// featureRegistry.register() throws. We grab the store at call time
// via the global __store handle the fractalStore sets up on boot.
import { featureRegistry } from '../../engine/FeatureSystem';
import { KIND_MODES } from '../features/julia';
import { FORCE_MODES, FORCE_SOURCES } from '../features/coupling';
import { COLOR_MAPPINGS, DYE_BLENDS, DYE_DECAY_MODES } from '../features/palette';
import { FLUID_STYLES, TONE_MAPPINGS } from '../features/postFx';
import { SHOW_MODES } from '../features/composite';

// Build a fresh slice object from the registered feature's param defaults.
// Merging this UNDER each preset's partial guarantees fields the preset
// omits get reset to their DDFS-authored default — otherwise switching
// preset A → B leaks any field B doesn't override. Enum defaults are
// already stored as indices in the param config, so no remapping needed.
const buildDefaultSlice = (featureId: string): Record<string, any> => {
    const feat = featureRegistry.get(featureId);
    if (!feat) return {};
    const out: Record<string, any> = {};
    for (const [key, param] of Object.entries(feat.params)) {
        const def = (param as any).default;
        if (def && typeof def === 'object' && !Array.isArray(def)) {
            out[key] = { ...def };
        } else if (Array.isArray(def)) {
            out[key] = [...def];
        } else {
            out[key] = def;
        }
    }
    return out;
};

// Look up a string value in an enum array; return undefined if absent
// so callers can skip assigning rather than falling back to index 0.
const idx = <T extends string>(arr: readonly T[], v: unknown): number | undefined => {
    if (typeof v !== 'string') return undefined;
    const i = arr.indexOf(v as T);
    return i >= 0 ? i : undefined;
};

const tupleToVec = (t: [number, number] | undefined) =>
    t ? { x: t[0], y: t[1] } : undefined;

const vec3FromTuple = (t: [number, number, number] | undefined) =>
    t ? { x: t[0], y: t[1], z: t[2] } : undefined;

/** Dispatch every slice update implied by a reference preset. */
export const applyRefPreset = (preset: RefPreset) => {
    const store = (globalThis as any).__store;
    if (!store) {
        console.warn('[applyRefPreset] store not ready — window.__store is undefined');
        return;
    }
    const s = store.getState();
    const p = preset.params;

    // ── Julia (Fractal tab) ─────────────────────────────────────────
    const julia: any = {};
    const kindIdx = idx(KIND_MODES, p.kind);
    if (kindIdx !== undefined) julia.kind = kindIdx;
    if (p.juliaC) julia.juliaC = tupleToVec(p.juliaC);
    if (p.center) {
        julia.center = tupleToVec(p.center);
        // Reset the DD pan-accumulator lo word — presets are authored
        // at shallow zoom where it's always (0, 0). Without this, an
        // applied preset would inherit any prior deep-zoom centerLow
        // and sit at a sub-ulp offset from the authored centre.
        julia.centerLow = { x: 0, y: 0 };
    }
    if (p.zoom !== undefined) julia.zoom = p.zoom;
    if (p.maxIter !== undefined) julia.maxIter = p.maxIter;
    if (p.power !== undefined) julia.power = p.power;
    s.setJulia({ ...buildDefaultSlice('julia'), ...julia });

    // ── Coupling (force law) ────────────────────────────────────────
    const coupling: any = {};
    const fmIdx = idx(FORCE_MODES, p.forceMode);
    if (fmIdx !== undefined) coupling.forceMode = fmIdx;
    const fsIdx = idx(FORCE_SOURCES, p.forceSource);
    if (fsIdx !== undefined) coupling.forceSource = fsIdx;
    if (p.forceGain    !== undefined) coupling.forceGain    = p.forceGain;
    if (p.interiorDamp !== undefined) coupling.interiorDamp = p.interiorDamp;
    if (p.forceCap     !== undefined) coupling.forceCap     = p.forceCap;
    if (p.edgeMargin   !== undefined) coupling.edgeMargin   = p.edgeMargin;
    s.setCoupling({ ...buildDefaultSlice('coupling'), ...coupling });

    // ── LFO modulation rules ────────────────────────────────────────
    // Replace any prior animations wholesale. Presets that wanted the
    // legacy auto-orbit behaviour now ship two Sine LFOs at 90° phase
    // on julia.juliaC_x / _y; AnimationSystem adds the offset to the
    // authored juliaC, so the orbit is relative to the current c base.
    if (typeof s.setAnimations === 'function') {
        s.setAnimations(preset.animations ?? []);
    }

    // ── Fluid sim (dynamics + dye-decay) ────────────────────────────
    const fs: any = {};
    if (p.vorticity         !== undefined) fs.vorticity         = p.vorticity;
    if (p.vorticityScale    !== undefined) fs.vorticityScale    = p.vorticityScale;
    if (p.dissipation       !== undefined) fs.dissipation       = p.dissipation;
    if (p.pressureIters     !== undefined) fs.pressureIters     = p.pressureIters;
    if (p.dyeInject         !== undefined) fs.dyeInject         = p.dyeInject;
    if (p.dyeDissipation    !== undefined) fs.dyeDissipation    = p.dyeDissipation;
    if (p.dyeChromaDecayHz  !== undefined) fs.dyeChromaDecayHz  = p.dyeChromaDecayHz;
    if (p.dyeSaturationBoost !== undefined) fs.dyeSaturationBoost = p.dyeSaturationBoost;
    const decayIdx = idx(DYE_DECAY_MODES, p.dyeDecayMode);
    if (decayIdx !== undefined) fs.dyeDecayMode = decayIdx;
    s.setFluidSim({ ...buildDefaultSlice('fluidSim'), ...fs });

    // ── Palette (colour mapping, gradient, trap, dye blend) ─────────
    const pa: any = {};
    const cmIdx = idx(COLOR_MAPPINGS, p.colorMapping);
    if (cmIdx !== undefined) pa.colorMapping = cmIdx;
    if (p.colorIter       !== undefined) pa.colorIter     = p.colorIter;
    if (p.gradientRepeat  !== undefined) pa.gradientRepeat = p.gradientRepeat;
    if (p.gradientPhase   !== undefined) pa.gradientPhase  = p.gradientPhase;
    if (p.trapCenter)                    pa.trapCenter     = tupleToVec(p.trapCenter);
    if (p.trapRadius      !== undefined) pa.trapRadius     = p.trapRadius;
    if (p.trapNormal)                    pa.trapNormal     = tupleToVec(p.trapNormal);
    if (p.trapOffset      !== undefined) pa.trapOffset     = p.trapOffset;
    if (p.stripeFreq      !== undefined) pa.stripeFreq     = p.stripeFreq;
    if (p.interiorColor)                 pa.interiorColor  = vec3FromTuple(p.interiorColor);
    const blendIdx = idx(DYE_BLENDS, p.dyeBlend);
    if (blendIdx !== undefined) pa.dyeBlend = blendIdx;
    if (preset.gradient) pa.gradient = preset.gradient;
    s.setPalette({ ...buildDefaultSlice('palette'), ...pa });

    // ── Collision (walls) ───────────────────────────────────────────
    // Always dispatch (even to disable) so swapping presets clears
    // prior wall state cleanly.
    const col: any = { enabled: !!p.collisionEnabled };
    if (preset.collisionGradient) col.gradient = preset.collisionGradient;
    s.setCollision({ ...buildDefaultSlice('collision'), ...col });

    // ── Post-FX ─────────────────────────────────────────────────────
    const pfx: any = {};
    const styleIdx = idx(FLUID_STYLES, p.fluidStyle);
    if (styleIdx !== undefined) pfx.fluidStyle = styleIdx;
    const toneIdx = idx(TONE_MAPPINGS, p.toneMapping);
    if (toneIdx !== undefined) pfx.toneMapping = toneIdx;
    if (p.exposure       !== undefined) pfx.exposure       = p.exposure;
    if (p.vibrance       !== undefined) pfx.vibrance       = p.vibrance;
    if (p.bloomAmount    !== undefined) pfx.bloomAmount    = p.bloomAmount;
    if (p.bloomThreshold !== undefined) pfx.bloomThreshold = p.bloomThreshold;
    if (p.aberration     !== undefined) pfx.aberration     = p.aberration;
    if (p.refraction     !== undefined) pfx.refraction     = p.refraction;
    if (p.refractSmooth  !== undefined) pfx.refractSmooth  = p.refractSmooth;
    if (p.caustics       !== undefined) pfx.caustics       = p.caustics;
    s.setPostFx({ ...buildDefaultSlice('postFx'), ...pfx });

    // ── Composite ───────────────────────────────────────────────────
    const comp: any = {};
    const showIdx = idx(SHOW_MODES, p.show);
    if (showIdx !== undefined) comp.show = showIdx;
    if (p.juliaMix    !== undefined) comp.juliaMix    = p.juliaMix;
    if (p.dyeMix      !== undefined) comp.dyeMix      = p.dyeMix;
    if (p.velocityViz !== undefined) comp.velocityViz = p.velocityViz;
    s.setComposite({ ...buildDefaultSlice('composite'), ...comp });

    // ── Engine-level toggles (renderControlSlice) ───────────────────
    // These aren't DDFS slices but live in the render-control top of
    // the store. The benchmark / isolation preset uses them to freeze
    // sim + disable TSAA so the kernel cost stands alone. We always
    // re-establish the sane defaults (paused = false, accumulation =
    // true) when applying a preset so a previously-loaded benchmark
    // preset doesn't leak its frozen state into the next load.
    if (typeof s.setIsPaused === 'function') {
        s.setIsPaused(p.paused ?? false);
    }
    if (typeof s.setAccumulation === 'function') {
        s.setAccumulation(p.accumulation ?? true);
    }
};
