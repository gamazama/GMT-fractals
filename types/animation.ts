
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
    /** Strength offsets applied to baseValue. Output is
     *  `baseValue + lerp(min, max, (rawWave + 1) / 2)` —
     *  rawWave=−1 hits `baseValue + min`, rawWave=+1 hits
     *  `baseValue + max`. min < 0 lets the LFO push the param
     *  below baseValue. Both undefined → engine falls back to
     *  symmetric `± amplitude`. Asymmetric ranges are first-class
     *  (e.g. min=−0.5, max=2 for a "kick up but barely dip" feel). */
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
    /**
     * Optional Maya/Blender-style tangent constraint:
     *   - undefined / 'Aligned' (default): direction locked across the key, each handle
     *     keeps its own length. Drag-mirror preserves the other side's magnitude.
     *   - 'Unified': direction AND length locked. Dragging one handle mirrors length too.
     *   - (broken keys use the brokenTangents flag instead.)
     */
    tangentMode?: 'Aligned' | 'Unified';
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
