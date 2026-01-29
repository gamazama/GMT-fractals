
export type LfoShape = 'Sine' | 'Triangle' | 'Sawtooth' | 'Pulse' | 'Noise';
export type LfoTarget = string; // E.g. 'coreMath.paramA', 'geometry.juliaX'

export type SoftSelectionType = 'Linear' | 'Dome' | 'Pinpoint' | 'S-Curve';
export type LoopMode = 'Loop' | 'Once' | 'PingPong';

export interface AnimationParams {
    id: string;
    enabled: boolean;
    target: LfoTarget;
    shape: LfoShape;
    period: number;
    amplitude: number;
    baseValue: number;
    phase: number;
    smoothing: number;
    pulseWidth?: number;
}

export interface BezierHandle {
    x: number;
    y: number;
}

export interface Keyframe {
    id: string;
    frame: number;
    value: number;
    interpolation: 'Step' | 'Linear' | 'Bezier';
    leftTangent?: BezierHandle;
    rightTangent?: BezierHandle;
    brokenTangents?: boolean;
    autoTangent?: boolean;
}

export interface Track {
    id: string;
    type: 'float';
    label: string;
    keyframes: Keyframe[];
    color?: string;
    hidden?: boolean;
    locked?: boolean;
}

export interface AnimationSequence {
    durationFrames: number;
    fps: number;
    tracks: Record<string, Track>;
}
