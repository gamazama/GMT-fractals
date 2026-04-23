/**
 * Fluid-toy hotkeys via @engine/shortcuts.
 *
 * All registrations go through the plugin's register API. None of these
 * keys are fluid-specific enough to warrant engine plumbing — they're
 * app-level shortcuts that happen to ride on shared infrastructure.
 *
 * Canonical fluid-toy hotkeys (from the original prototype):
 *   Space = pause / unpause the sim (flip fluidSim.paused)
 *   R     = reset fluid fields (dye + velocity → zero; FluidEngine.resetFluid)
 *   H     = toggle hint visibility
 *   O     = toggle auto-orbit
 *   Home  = recenter view (sceneCamera.center=[0,0], zoom=1.5)
 *
 * R requires an engine handle, so it takes an engineRef. All others
 * mutate store state only.
 */

import type { FluidEngine } from './fluid/FluidEngine';
import { useFractalStore } from '../store/fractalStore';
import { shortcuts } from '../engine/plugins/Shortcuts';

export const registerFluidToyHotkeys = (engineRef: React.RefObject<FluidEngine | null>) => {
    shortcuts.register({
        id: 'fluid-toy.pause',
        key: 'Space',
        description: 'Pause / resume the fluid simulation',
        category: 'Playback',
        handler: () => {
            const s = useFractalStore.getState() as any;
            s.setFluidSim({ paused: !s.fluidSim?.paused });
        },
    });

    shortcuts.register({
        id: 'fluid-toy.reset',
        key: 'R',
        description: 'Reset fluid fields (dye + velocity → zero)',
        category: 'Playback',
        handler: () => { engineRef.current?.resetFluid(); },
    });

    shortcuts.register({
        id: 'fluid-toy.orbit-toggle',
        key: 'O',
        description: 'Toggle Julia-c auto-orbit',
        category: 'Simulation',
        handler: () => {
            const s = useFractalStore.getState() as any;
            s.setOrbit({ enabled: !s.orbit?.enabled });
        },
    });

    shortcuts.register({
        id: 'fluid-toy.home',
        key: 'Home',
        description: 'Recenter view (center=[0,0], zoom=1.5)',
        category: 'View',
        handler: () => {
            const s = useFractalStore.getState() as any;
            s.setSceneCamera({ center: { x: 0, y: 0 }, zoom: 1.5 });
        },
    });

    // H — hint toggle. Fluid-toy has no per-control hints yet, so this
    // is a placeholder that logs; when hints land, this flips a store
    // field the hint UI reads.
    shortcuts.register({
        id: 'fluid-toy.hints-toggle',
        key: 'H',
        description: 'Toggle hint visibility (no-op until hints land)',
        category: 'UI',
        handler: () => { /* TODO: when hint system lands */ },
    });
};
