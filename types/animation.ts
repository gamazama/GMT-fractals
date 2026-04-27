
export type LfoShape = 'Sine' | 'Triangle' | 'Sawtooth' | 'Pulse' | 'Noise';
export type LfoTarget = string; // Feature-path string, e.g. `myFeature.paramA` or `myFeature.vec_x`

export type SoftSelectionType = 'Linear' | 'Dome' | 'Pinpoint' | 'S-Curve';
export type LoopMode = 'Loop' | 'Once' | 'PingPong';

export type TrackBehavior = 'Hold' | 'Loop' | 'PingPong' | 'Continue' | 'OffsetLoop';

export interface AnimationParams {
    id: string;
    enabled: boolean;
    target: LfoTarget;
    shape: LfoShape;
    period: number;
    /** Legacy "strength": peak waveform value × amplitude is applied as
     *  an offset on top of `baseValue`. Newer LFOs use `min` / `max`
     *  instead — see ModulationEngine which prefers min/max when
     *  defined and falls back to amplitude otherwise. Kept for preset
     *  back-compat. */
    amplitude: number;
    baseValue: number;
    phase: number;
    smoothing: number;
    pulseWidth?: number;
    /** Output range floor. When BOTH `min` and `max` are defined the
     *  engine maps the waveform into [min, max] directly (rawWave −1
     *  → min, +1 → max). Either undefined → fall back to `baseValue`
     *  ± `amplitude`. */
    min?: number;
    max?: number;
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
    postBehavior?: TrackBehavior;
}

export interface AnimationSequence {
    durationFrames: number;
    fps: number;
    tracks: Record<string, Track>;
}
