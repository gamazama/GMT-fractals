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

import { useEffect, type RefObject } from 'react';
import { useSlice, useLiveModulations } from '../engine/typedSlices';
import type { FluidEngine } from './fluid/FluidEngine';
import { syncJuliaToEngine } from './features/julia';
import { syncDeepZoomToEngine } from './features/deepZoom';
import { syncPaletteToEngine } from './features/palette';
import { syncCollisionToEngine } from './features/collision';
import { syncFluidSimToEngine } from './features/fluidSim';
import { syncPostFxToEngine } from './features/postFx';
import { syncCompositeToEngine } from './features/composite';

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

    useEffect(() => { const e = engineRef.current; if (e) syncJuliaToEngine(e, julia, liveMod); },     [julia, liveMod, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncDeepZoomToEngine(e, deepZoom, julia); }, [deepZoom, julia, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncPaletteToEngine(e, palette); },          [palette, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncCollisionToEngine(e, collision); },      [collision, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncFluidSimToEngine(e, fluidSim, coupling); }, [fluidSim, coupling, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncPostFxToEngine(e, postFx); },            [postFx, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncCompositeToEngine(e, composite); },      [composite, engineRef]);
};
