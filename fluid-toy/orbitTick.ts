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
 * Two sine LFOs on julia.juliaC_x and julia.juliaC_y (the latter with
 * a 0.25 phase offset) give circular motion around the current juliaC
 * base position. No anchor param — the base IS the anchor. Slide juliaC
 * while orbit is on and the circle moves with it.
 *
 * Target IDs use GMT's UNDERSCORE form (`featureId.param_<axis>`) so
 * AnimationSystem.tsx's base-value resolver finds the vec component
 * through the generic DDFS lookup — AutoFeaturePanel uses the same
 * form for its live-value readout, so both read the same liveModulation
 * keys.
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
        { id: ORBIT_ID_X, target: 'julia.juliaC_x', shape: commonShape, period, phase: 0,    amplitude: radius, smoothing: 0, enabled: true },
        { id: ORBIT_ID_Y, target: 'julia.juliaC_y', shape: commonShape, period, phase: 0.25, amplitude: radius, smoothing: 0, enabled: true },
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
