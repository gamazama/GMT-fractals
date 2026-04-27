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
import { KIND_MODES } from '../features/julia';
import { FORCE_MODES } from '../features/coupling';
import { COLOR_MAPPINGS, DYE_BLENDS, DYE_DECAY_MODES } from '../features/palette';
import { FLUID_STYLES, TONE_MAPPINGS } from '../features/postFx';
import { SHOW_MODES } from '../features/composite';

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
    if (p.center) julia.center = tupleToVec(p.center);
    if (p.zoom !== undefined) julia.zoom = p.zoom;
    if (p.maxIter !== undefined) julia.maxIter = p.maxIter;
    if (p.power !== undefined) julia.power = p.power;
    if (Object.keys(julia).length > 0) s.setJulia(julia);

    // ── Coupling (force law + orbit) ────────────────────────────────
    const coupling: any = {};
    const fmIdx = idx(FORCE_MODES, p.forceMode);
    if (fmIdx !== undefined) coupling.forceMode = fmIdx;
    if (p.forceGain    !== undefined) coupling.forceGain    = p.forceGain;
    if (p.interiorDamp !== undefined) coupling.interiorDamp = p.interiorDamp;
    if (p.forceCap     !== undefined) coupling.forceCap     = p.forceCap;
    if (p.edgeMargin   !== undefined) coupling.edgeMargin   = p.edgeMargin;
    // Orbit block lives on the same slice as the coupling law. If the
    // preset omits orbit we explicitly disable it so swapping presets
    // doesn't leak prior orbit state.
    if (preset.orbit) {
        coupling.orbitEnabled = preset.orbit.enabled;
        coupling.orbitRadius  = preset.orbit.radius;
        coupling.orbitSpeed   = preset.orbit.speed;
    } else {
        coupling.orbitEnabled = false;
    }
    s.setCoupling(coupling);

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
    if (Object.keys(fs).length > 0) s.setFluidSim(fs);

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
    if (Object.keys(pa).length > 0) s.setPalette(pa);

    // ── Collision (walls) ───────────────────────────────────────────
    // Always dispatch (even to disable) so swapping presets clears
    // prior wall state cleanly.
    const col: any = { enabled: !!p.collisionEnabled };
    if (preset.collisionGradient) col.gradient = preset.collisionGradient;
    s.setCollision(col);

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
    if (Object.keys(pfx).length > 0) s.setPostFx(pfx);

    // ── Composite ───────────────────────────────────────────────────
    const comp: any = {};
    const showIdx = idx(SHOW_MODES, p.show);
    if (showIdx !== undefined) comp.show = showIdx;
    if (p.juliaMix    !== undefined) comp.juliaMix    = p.juliaMix;
    if (p.dyeMix      !== undefined) comp.dyeMix      = p.dyeMix;
    if (p.velocityViz !== undefined) comp.velocityViz = p.velocityViz;
    if (Object.keys(comp).length > 0) s.setComposite(comp);
};
