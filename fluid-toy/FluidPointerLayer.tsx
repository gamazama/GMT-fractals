/**
 * FluidPointerLayer — canvas pointer interaction for fluid-toy.
 *
 * Thin shell. Each gesture concern lives in its own file under
 * `pointer/`:
 *   types.ts        — PointerMode, PointerState, PendingView
 *   modifiers.ts    — useModifierKeys + precisionMultiplier (Shift/Alt)
 *   contextMenu.ts  — useCanvasContextMenu (right-click menu items)
 *   handlers.ts     — useCanvasPointerHandlers (down/move/up/wheel)
 *
 * Gestures, for reference:
 *   left-drag       — splat (force + dye, hue-cycled rainbow trail)
 *   right-drag      — pan the scene camera (grab-and-drag)
 *   right-click     — open canvas context menu (suppressed if drag)
 *   middle-drag     — smooth zoom anchored at the click-point
 *   wheel           — zoom anchored at the cursor
 *   B + left-drag   — resize brush (log-scaled horizontal sweep)
 *   C + left-drag   — drag Julia c
 *
 * Pan / middle-drag / wheel bypass the store during the gesture and
 * commit one setJulia at the end. See `handlers.ts` header for the
 * React-cascade rationale.
 */

import React, { useRef } from 'react';
import type { FluidEngine } from './fluid/FluidEngine';
import { createPointerState, type PointerState, type PendingView } from './pointer/types';
import { useModifierKeys } from './pointer/modifiers';
import { useCanvasContextMenu } from './pointer/contextMenu';
import { useCanvasPointerHandlers } from './pointer/handlers';

export interface FluidPointerLayerProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    engineRef: React.RefObject<FluidEngine | null>;
}

export const FluidPointerLayer: React.FC<FluidPointerLayerProps> = ({ canvasRef, engineRef }) => {
    const stateRef = useRef<PointerState>(createPointerState());
    const pendingViewRef = useRef<PendingView | null>(null);

    useModifierKeys();
    useCanvasContextMenu(canvasRef, engineRef, stateRef);
    useCanvasPointerHandlers(canvasRef, engineRef, stateRef, pendingViewRef);

    return null;
};
