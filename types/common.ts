
declare const __APP_VERSION__: string;

// FormulaType used to enumerate GMT's 42 native fractal formula IDs.
// The engine treats it as an opaque string tag; apps that want a strict
// union widen this via declaration merging.
export type FormulaType = string;
export type CameraMode = 'Orbit' | 'Fly';

export interface PreciseVector3 {
    x: number;
    y: number;
    z: number;
    xL: number;
    yL: number;
    zL: number;
}

export interface CameraState {
    /** Local camera position — always (0,0,0) in canonical state; world position lives in sceneOffset */
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number, w: number };
    sceneOffset?: PreciseVector3;
    /** Surface distance from physics probe. Mode-agnostic — NOT orbit radius. */
    targetDistance?: number;
}