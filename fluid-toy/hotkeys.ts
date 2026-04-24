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
 *   O     = toggle auto-orbit
 *   Home  = recenter view (julia.center=[0,0], zoom=1.5)
 *
 * R requires an engine handle, so it takes an engineRef. All others
 * mutate store state only.
 *
 * H (toggle hints) lives in @engine/help — it's a generic shortcut,
 * not a fluid-toy concern.
 */

import type { FluidEngine } from './fluid/FluidEngine';
import { useEngineStore } from '../store/engineStore';
import { shortcuts } from '../engine/plugins/Shortcuts';

export const registerFluidToyHotkeys = (engineRef: React.RefObject<FluidEngine | null>) => {
    shortcuts.register({
        id: 'fluid-toy.pause',
        key: 'Space',
        description: 'Pause / resume the fluid simulation',
        category: 'Playback',
        handler: () => {
            const s = useEngineStore.getState() as any;
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
            const s = useEngineStore.getState() as any;
            s.setCoupling({ orbitEnabled: !s.coupling?.orbitEnabled });
        },
    });

    shortcuts.register({
        id: 'fluid-toy.home',
        key: 'Home',
        description: 'Recenter view (center=[0,0], zoom=1.5)',
        category: 'View',
        handler: () => {
            const s = useEngineStore.getState() as any;
            s.setJulia({ center: { x: 0, y: 0 }, zoom: 1.5 });
        },
    });

};
