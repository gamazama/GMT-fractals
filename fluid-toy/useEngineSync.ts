/**
 * One hook that pushes every fluid-toy DDFS slice into the engine.
 *
 * Each feature owns its `sync<X>ToEngine` function (features/<x>.ts);
 * this hook is the single place that reads slices via `useSlice`, mints
 * the per-slice useEffects, and dispatches.
 *
 * Pulled out of FluidToyApp so the app shell doesn't carry a wall of
 * near-identical effects, and so adding a new feature is a one-line
 * addition here rather than a fresh useEffect mixed in among the
 * orbit-rebuild / render-control / resize effects.
 */

import { useEffect, useMemo, type RefObject } from 'react';
import { useSlice, useLiveModulations, applyLiveMod } from '../engine/typedSlices';
import type { FluidEngine } from './fluid/FluidEngine';
import { syncDeepZoomToEngine } from './features/deepZoom';
import { syncPaletteToEngine } from './features/palette';
import { syncCollisionToEngine } from './features/collision';
import { syncFluidSimToEngine } from './features/fluidSim';
import { syncPostFxToEngine } from './features/postFx';
import { syncCompositeToEngine } from './features/composite';
import { syncJuliaToEngine, syncJuliaCToEngine } from './features/julia';

export const useEngineSync = (engineRef: RefObject<FluidEngine | null>): void => {
    const julia     = useSlice('julia');
    const deepZoom  = useSlice('deepZoom');
    const coupling  = useSlice('coupling');
    const palette   = useSlice('palette');
    const collision = useSlice('collision');
    const fluidSim  = useSlice('fluidSim');
    const postFx    = useSlice('postFx');
    const composite = useSlice('composite');
    const liveMod   = useLiveModulations();

    // Modulation merge: AnimationSystem writes the resolved
    // (slice-base + offset) value into liveModulations for every
    // active LFO / audio / rule target. fluid-toy's setParams pipeline
    // doesn't have GLSL-uniform-backed params (the way GMT does, where
    // emitUniform pushes the modulated value straight to the shader),
    // so the merge happens here: each slice gets a per-frame
    // modulated copy that the sync functions push into engine.params.
    // applyLiveMod returns the original slice reference unchanged when
    // no modulation touches the slice, so syncs only re-fire when the
    // user mutates the slice OR an active LFO drives one of its keys.
    const couplingMod  = useMemo(() => applyLiveMod(coupling,  'coupling',  liveMod), [coupling,  liveMod]);
    const paletteMod   = useMemo(() => applyLiveMod(palette,   'palette',   liveMod), [palette,   liveMod]);
    const collisionMod = useMemo(() => applyLiveMod(collision, 'collision', liveMod), [collision, liveMod]);
    const fluidSimMod  = useMemo(() => applyLiveMod(fluidSim,  'fluidSim',  liveMod), [fluidSim,  liveMod]);
    const postFxMod    = useMemo(() => applyLiveMod(postFx,    'postFx',    liveMod), [postFx,    liveMod]);
    const compositeMod = useMemo(() => applyLiveMod(composite, 'composite', liveMod), [composite, liveMod]);

    // Slice-driven sync: pushes the WHOLE julia slice (incl. center / zoom)
    // when the slice changes. Critically, this useEffect does NOT depend
    // on liveMod — modulation ticks would otherwise refire it every frame
    // and clobber gesture-set engine.params.center/zoom with stale store
    // values during pan/zoom.
    useEffect(() => { const e = engineRef.current; if (e) syncJuliaToEngine(e, julia, liveMod); },     [julia, engineRef]);  // eslint-disable-line react-hooks/exhaustive-deps
    // Modulation-driven sync: rewrites only juliaC each time liveMod
    // changes, so auto-orbit / audio-reactive modulation drives the
    // fractal continuously without touching the gesture-owned view.
    useEffect(() => { const e = engineRef.current; if (e) syncJuliaCToEngine(e, julia, liveMod); },    [julia, liveMod, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncDeepZoomToEngine(e, deepZoom, julia); }, [deepZoom, julia, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncPaletteToEngine(e, paletteMod); },          [paletteMod, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncCollisionToEngine(e, collisionMod); },      [collisionMod, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncFluidSimToEngine(e, fluidSimMod, couplingMod); }, [fluidSimMod, couplingMod, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncPostFxToEngine(e, postFxMod); },            [postFxMod, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncCompositeToEngine(e, compositeMod); },      [compositeMod, engineRef]);
};
