/**
 * FluidToggleButton — the one-click "turn the fluid on" path.
 *
 * The toy boots as a pure fractal explorer: the sim is frozen
 * (fluidSim.paused) and the composite shows the Fractal layer only. This
 * topbar toggle is the simple way for a user to start the fluid and play
 * with it — flipping it ON unfreezes the sim AND switches the composite to
 * Mixed (fractal + dye); flipping it OFF freezes the sim and returns to the
 * clean Fractal view.
 *
 * "On" state tracks fluidSim.paused (sim running = on). Composite indices
 * are index-aligned with composite.ts SHOW_MODES: 0 = 'composite' (Mixed),
 * 1 = 'julia' (Fractal).
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useSlice } from '../../engine/typedSlices';
import { TopBarToggle } from '../../components/TopBarToggle';

const SHOW_MIXED = 0;
const SHOW_FRACTAL = 1;

export const FluidToggleButton: React.FC = () => {
    const paused = useSlice('fluidSim').paused;
    const on = !paused;

    const toggle = () => {
        const s = useEngineStore.getState() as unknown as {
            handleInteractionStart?: (k: string) => void;
            handleInteractionEnd?: () => void;
            setFluidSim?: (u: Record<string, unknown>) => void;
            setComposite?: (u: Record<string, unknown>) => void;
        };
        s.handleInteractionStart?.('param');
        if (on) {
            // Freeze the sim and return to the clean fractal view.
            s.setFluidSim?.({ paused: true });
            s.setComposite?.({ show: SHOW_FRACTAL });
        } else {
            // Start the sim and reveal it (Mixed = fractal + dye).
            s.setFluidSim?.({ paused: false });
            s.setComposite?.({ show: SHOW_MIXED });
        }
        s.handleInteractionEnd?.();
    };

    return (
        <TopBarToggle
            active={on}
            onClick={toggle}
            title={on ? 'Fluid simulation is running — click to freeze (pure fractal)' : 'Start the fluid simulation and play with it'}
            className="border"
            activeClassName="text-cyan-300 bg-cyan-900/30 border-cyan-500/40"
            inactiveClassName="text-gray-400 border-white/10 hover:text-white hover:border-cyan-500/40"
            icon={
                /* water-drop glyph */
                <svg width="13" height="13" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.5C12 2.5 5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5z" />
                </svg>
            }
            label={`Fluid ${on ? 'On' : 'Off'}`}
        />
    );
};

export default FluidToggleButton;
