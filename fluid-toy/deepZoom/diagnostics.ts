/**
 * Tiny pub/sub for deep-zoom diagnostics — used by the floating
 * status overlay to display the latest worker build stats. Lives
 * outside the Zustand store on purpose: the orbit + LA build is a
 * non-store side-effect (driven by useEffect with worker promises),
 * not modelled state. Pushing through the store would either pollute
 * the persisted state or require a non-persistent slice — both worse
 * than a small subscription primitive.
 */

import { useEffect, useState } from 'react';

export interface DeepZoomDiag {
    orbitLength: number;
    precisionBits: number;
    orbitBuildMs: number;
    laStageCount: number;
    laCount: number;
    laBuildMs: number;
    laStagesPerLevel: number[];  // macroItCount per stage
    /** Latest smoothed GPU time (ms) for the Julia render pass, or 0
     *  when the timer extension is unavailable. Polled from
     *  FluidEngine each frame; surfaced for A/B testing toggles. */
    juliaMs: number;
}

const EMPTY: DeepZoomDiag = {
    orbitLength: 0,
    precisionBits: 0,
    orbitBuildMs: 0,
    laStageCount: 0,
    laCount: 0,
    laBuildMs: 0,
    laStagesPerLevel: [],
    juliaMs: 0,
};

let current: DeepZoomDiag = EMPTY;
const listeners = new Set<(d: DeepZoomDiag) => void>();

export const setDeepZoomDiag = (d: DeepZoomDiag): void => {
    current = d;
    listeners.forEach((l) => l(d));
};

/** Update only the GPU timer reading without disturbing the rest of
 *  the diag. Called from FluidToyApp's RAF tick. */
export const setDeepZoomJuliaMs = (ms: number): void => {
    if (Math.abs(current.juliaMs - ms) < 0.05) return;  // tiny-change skip
    current = { ...current, juliaMs: ms };
    listeners.forEach((l) => l(current));
};

export const clearDeepZoomDiag = (): void => {
    setDeepZoomDiag(EMPTY);
};

export const useDeepZoomDiag = (): DeepZoomDiag => {
    const [d, setD] = useState<DeepZoomDiag>(current);
    useEffect(() => {
        listeners.add(setD);
        return () => { listeners.delete(setD); };
    }, []);
    return d;
};
