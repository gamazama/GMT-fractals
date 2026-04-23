/**
 * orbitTick — sync orbit DDFS state → the store's `animations` array.
 *
 * This is the CORRECT way to drive a DDFS param with a continuous
 * oscillator: register LFO animations in the store, let the canonical
 * modulation tick (engine/animation/modulationTick.ts) process them
 * into liveModulations each frame, and have render-pushers read
 * liveModulations[target] with fallback to the base DDFS value.
 *
 * We subscribe to orbit slice changes and rewrite the animations
 * array accordingly. The subscriber is NOT in the render loop; it
 * fires only when orbit.enabled / radius / speed change. The actual
 * per-frame work happens inside modulationEngine.updateOscillators.
 *
 * Two sine LFOs on julia.juliaC.x and julia.juliaC.y (the latter with
 * a 0.25 phase offset) give circular motion around the current juliaC
 * base position. No anchor param — the base IS the anchor. Slide juliaC
 * while orbit is on and the circle moves with it.
 */

import { useFractalStore } from '../store/fractalStore';

const ORBIT_ID_X = 'fluid-toy.orbit.juliaC.x';
const ORBIT_ID_Y = 'fluid-toy.orbit.juliaC.y';

let _unsub: (() => void) | null = null;

/** Rewrite store.animations to match the current orbit state. Idempotent. */
const sync = () => {
    const state = useFractalStore.getState() as any;
    const orbit = state.orbit;
    const all = (state.animations ?? []) as any[];

    const others = all.filter((a) => a.id !== ORBIT_ID_X && a.id !== ORBIT_ID_Y);

    if (!orbit?.enabled) {
        if (others.length !== all.length) state.setAnimations(others);
        return;
    }

    const radius = orbit.radius ?? 0.1;
    const speedHz = Math.max(0.001, orbit.speed ?? 0.25);
    const period = 1 / speedHz;
    const commonShape = 'Sine';

    const next = [
        ...others,
        { id: ORBIT_ID_X, target: 'julia.juliaC.x', shape: commonShape, period, phase: 0,    amplitude: radius, smoothing: 0, enabled: true },
        { id: ORBIT_ID_Y, target: 'julia.juliaC.y', shape: commonShape, period, phase: 0.25, amplitude: radius, smoothing: 0, enabled: true },
    ];
    state.setAnimations(next);
};

export const installOrbitSync = () => {
    if (_unsub) return;
    // Initial sync so boot-time orbit state takes effect.
    sync();
    // Subscribe to orbit slice changes.
    _unsub = useFractalStore.subscribe((s: any) => s.orbit, sync);
};

export const uninstallOrbitSync = () => {
    if (_unsub) { _unsub(); _unsub = null; }
};
