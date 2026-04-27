/**
 * orbitTick — sync auto-orbit DDFS state → the store's `animations` array.
 *
 * Auto-orbit lives on the CouplingFeature slice (orbitEnabled / orbitRadius
 * / orbitSpeed), co-located with the force-law knobs on the reference
 * toy-fluid's Coupling tab.
 *
 * This is the CORRECT way to drive a DDFS param with a continuous
 * oscillator: register LFO animations in the store, let the canonical
 * modulation tick (engine/animation/modulationTick.ts) process them
 * into liveModulations each frame, and have render-pushers read
 * liveModulations[target] with fallback to the base DDFS value.
 *
 * We subscribe to coupling slice changes and rewrite the animations
 * array accordingly. The subscriber is NOT in the render loop; it
 * fires only when orbit params change. The actual per-frame work
 * happens inside modulationEngine.updateOscillators.
 *
 * Two sine LFOs on julia.juliaC_x and julia.juliaC_y (the latter with
 * a 0.25 phase offset) give circular motion around the current juliaC
 * base position. No anchor param — the base IS the anchor. Slide juliaC
 * while orbit is on and the circle moves with it.
 */

import { useEngineStore } from '../store/engineStore';

const ORBIT_ID_X = 'fluid-toy.orbit.juliaC.x';
const ORBIT_ID_Y = 'fluid-toy.orbit.juliaC.y';

let _unsub: (() => void) | null = null;

/** Rewrite store.animations to match the current orbit state. Idempotent. */
const sync = () => {
    const state = useEngineStore.getState();
    const coupling = state.coupling;
    const all = state.animations ?? [];

    const others = all.filter((a) => a.id !== ORBIT_ID_X && a.id !== ORBIT_ID_Y);

    if (!coupling?.orbitEnabled) {
        if (others.length !== all.length) state.setAnimations(others);
        return;
    }

    const radius = coupling.orbitRadius ?? 0.1;
    const speedHz = Math.max(0.001, coupling.orbitSpeed ?? 0.25);
    const period = 1 / speedHz;

    const next = [
        ...others,
        { id: ORBIT_ID_X, target: 'julia.juliaC_x', shape: 'Sine' as const, period, phase: 0,    amplitude: radius, baseValue: 0, smoothing: 0, enabled: true },
        { id: ORBIT_ID_Y, target: 'julia.juliaC_y', shape: 'Sine' as const, period, phase: 0.25, amplitude: radius, baseValue: 0, smoothing: 0, enabled: true },
    ];
    state.setAnimations(next);
};

export const installOrbitSync = () => {
    if (_unsub) return;
    // Initial sync so boot-time orbit state takes effect.
    sync();
    // Subscribe to coupling slice changes.
    _unsub = useEngineStore.subscribe((s) => s.coupling, sync);
};

export const uninstallOrbitSync = () => {
    if (_unsub) { _unsub(); _unsub = null; }
};
