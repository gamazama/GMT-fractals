/**
 * Shared types for the per-gesture handler files.
 *
 * `GestureCtx` is the bag of refs + callbacks that handlers need; passed
 * by the dispatcher in `handlers.ts` so each gesture stays a pure
 * function with no React or store-shape coupling.
 */

import type { FluidEngine } from '../../fluid/FluidEngine';
import type { PointerState, PendingView } from '../types';

export interface GestureCtx {
    canvas: HTMLCanvasElement;
    engineRef: React.RefObject<FluidEngine | null>;
    pendingViewRef: React.MutableRefObject<PendingView | null>;
    stateRef: React.MutableRefObject<PointerState>;
    handleInteractionStart: (mode?: 'camera' | 'param') => void;
    handleInteractionEnd: () => void;
}
