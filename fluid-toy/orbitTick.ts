/**
 * orbitTick — continuous modulation driver for Julia c auto-orbit.
 *
 * Registered into TickRegistry's ANIMATE phase. Reads orbit + julia
 * slices each frame; when orbit.enabled, writes julia.juliaC along a
 * circular path around orbit.anchor at orbit.speed Hz with orbit.radius.
 *
 * Phase is seeded from the module-loaded timestamp so orbit starts at
 * a predictable angle. The tick is idempotent — calling it when orbit
 * is disabled is a no-op.
 */

import { registerTick, TICK_PHASE } from '../engine/TickRegistry';
import { useFractalStore } from '../store/fractalStore';

const BOOT_MS = performance.now();

let _unregister: (() => void) | null = null;

export const installOrbitTick = () => {
    if (_unregister) return;

    _unregister = registerTick('fluid-toy.orbit', TICK_PHASE.ANIMATE, () => {
        const state = useFractalStore.getState() as any;
        const orbit = state.orbit;
        if (!orbit?.enabled) return;

        const radius = orbit.radius ?? 0.1;
        const speed  = orbit.speed ?? 0.25;
        const anchor = orbit.anchor;
        const ax = anchor?.x ?? 0;
        const ay = anchor?.y ?? 0;

        const t = (performance.now() - BOOT_MS) / 1000;
        const phase = t * speed * 2 * Math.PI;
        const cx = ax + Math.cos(phase) * radius;
        const cy = ay + Math.sin(phase) * radius;

        // Write through the auto-generated setter so the store updates
        // drive FluidToyApp's juliaC-push useEffect and the FluidEngine
        // sees the new c each frame.
        state.setJulia({ juliaC: { x: cx, y: cy } });
    });
};

export const uninstallOrbitTick = () => {
    if (_unregister) { _unregister(); _unregister = null; }
};
