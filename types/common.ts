
declare const __APP_VERSION__: string;

// FormulaType used to enumerate GMT's 42 native fractal formula IDs.
// The engine treats it as an opaque string tag; apps that want a strict
// union widen this via declaration merging.
export type FormulaType = string;
export type CameraMode = 'Orbit' | 'Fly';

/**
 * A JSON-serialisable value — the interchange type for the document-provider
 * registry (see store/documentRegistry.ts). Document snapshots are embedded
 * verbatim in saved scenes, so they must survive `JSON.stringify`/`parse`.
 */
export type JsonValue =
    | null
    | boolean
    | number
    | string
    | JsonValue[]
    | { [key: string]: JsonValue };

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