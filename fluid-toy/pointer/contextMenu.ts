/**
 * Right-click context menu for the fluid canvas.
 *
 * Reads the store at click-time so the handler stays stable across
 * prop changes and always reflects the current orbit / pause state.
 * Suppresses if the right-press upgraded to a pan drag.
 */

import { useEffect } from 'react';
import { useEngineStore } from '../../store/engineStore';
import type { ContextMenuItem } from '../../types/help';
import type { FluidEngine } from '../fluid/FluidEngine';
import type { PointerState } from './types';

export const useCanvasContextMenu = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    engineRef: React.RefObject<FluidEngine | null>,
    stateRef: React.MutableRefObject<PointerState>,
): void => {
    const openContextMenu = useEngineStore((s) => s.openContextMenu);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onMenu = (e: MouseEvent) => {
            e.preventDefault();
            const ps = stateRef.current;
            if (!ps) return;
            if (ps.rightDragged) {
                ps.rightDragged = false;
                return;
            }
            const s = useEngineStore.getState();
            const juliaC = s.julia?.juliaC;
            const orbitOn = !!s.coupling?.orbitEnabled;
            const paused = !!s.fluidSim?.paused;

            const items: ContextMenuItem[] = [
                {
                    label: `Copy Julia c (${juliaC?.x?.toFixed(3) ?? '?'}, ${juliaC?.y?.toFixed(3) ?? '?'})`,
                    action: () => {
                        if (!juliaC) return;
                        const txt = `${juliaC.x.toFixed(6)}, ${juliaC.y.toFixed(6)}`;
                        navigator.clipboard?.writeText(txt).catch(() => { /* clipboard unavailable */ });
                    },
                },
                {
                    label: paused ? 'Resume Sim' : 'Pause Sim',
                    action: () => { s.setFluidSim({ paused: !paused }); },
                },
                {
                    label: orbitOn ? 'Stop Auto Orbit' : 'Start Auto Orbit',
                    action: () => { s.setCoupling({ orbitEnabled: !orbitOn }); },
                },
                {
                    label: 'Recenter View',
                    action: () => { s.setJulia({ center: { x: 0, y: 0 }, zoom: 1.5 }); },
                },
                {
                    label: 'Reset Fluid Fields',
                    action: () => { engineRef.current?.resetFluid(); },
                },
            ];
            openContextMenu(e.clientX, e.clientY, items, ['ui.fluid-canvas']);
        };
        canvas.addEventListener('contextmenu', onMenu);
        return () => canvas.removeEventListener('contextmenu', onMenu);
    }, [canvasRef, engineRef, stateRef, openContextMenu]);
};
