
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { KeyframeButton } from '../KeyframeButton';
import { KeyStatus } from '../Icons';
import { BaseVectorInput } from './BaseVectorInput';
import { ConnectedVectorInputProps } from './types';
import { evaluateTrackValue } from '../../utils/timelineUtils';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import type { Track, Keyframe } from '../../types/animation';

// --- CONNECTED VECTOR2 INPUT ---

interface Vector2InputProps extends Omit<ConnectedVectorInputProps, 'value' | 'onChange'> {
    value: THREE.Vector2;
    onChange: (val: THREE.Vector2) => void;
}

export const Vector2Input: React.FC<Vector2InputProps> = ({
    interactionMode = 'param',
    trackKeys,
    trackLabels,
    ...props
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const { sequence, isRecording, addTrack, addKeyframe, snapshot } = useAnimationStore();
    const lastValueRef = useRef(props.value);

    useEffect(() => {
        lastValueRef.current = props.value;
    }, [props.value?.x, props.value?.y]);

    const onDragStart = () => {
        handleInteractionStart(interactionMode);

        if (isRecording && trackKeys) {
            snapshot();
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    const label = trackLabels ? trackLabels[i] : tid;
                    if (!sequence.tracks[tid]) addTrack(tid, label);
                }
            });
        }
    };

    const onDragEnd = () => {
        if (isRecording && trackKeys) {
            const axes = ['x', 'y'] as const;
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    let val = lastValueRef.current[axes[i]];
                    addKeyframe(tid, Math.round(useAnimationStore.getState().currentFrame), val);
                }
            });
        }
        handleInteractionEnd();
    };

    const handleChange = (val: THREE.Vector2 | THREE.Vector3 | THREE.Vector4) => {
        lastValueRef.current = new THREE.Vector2(val.x, val.y);
        props.onChange(new THREE.Vector2(val.x, val.y));
    };

    // Determine keyframe status (with dirty detection matching useTrackAnimation)
    const getStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length === 0) return 'none';
        const frame = Math.round(useAnimationStore.getState().currentFrame);
        const axes = ['x', 'y'] as const;

        // Check if any track has keyframes at current frame
        let hasKey = false;
        let anyKeyDirty = false;
        trackKeys.forEach((tid, i) => {
            if (!tid) return;
            const track = sequence.tracks[tid] as Track | undefined;
            if (track) {
                const kf = track.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                if (kf) {
                    hasKey = true;
                    if (Math.abs(kf.value - lastValueRef.current[axes[i]]) > 0.0001) anyKeyDirty = true;
                }
            }
        });

        if (hasKey) return anyKeyDirty ? 'keyed-dirty' : 'keyed';

        // Check if any track exists — compare interpolated vs current
        const hasTrack = trackKeys.some(tid => tid && sequence.tracks[tid]);
        if (hasTrack) {
            const anyInterpolatedDirty = trackKeys.some((tid, i) => {
                if (!tid) return false;
                const track = sequence.tracks[tid] as Track | undefined;
                if (!track || track.keyframes.length === 0) return false;
                const interpolated = evaluateTrackValue(track.keyframes, frame, false);
                return Math.abs(interpolated - lastValueRef.current[axes[i]]) > 0.001;
            });
            return anyInterpolatedDirty ? 'dirty' : 'partial';
        }
        return 'none';
    };

    // Construct Header Right with Keyframe Button
    const headerRight = (!props.disabled) ? (
        <KeyframeButton
            status={getStatus()}
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y'] as const;
                const currentStatus = getStatus();
                snapshot();

                // Mirror useTrackAnimation: only remove when exactly 'keyed', otherwise add/overwrite
                if (currentStatus === 'keyed') {
                    trackKeys?.forEach((tid) => {
                        if (!tid) return;
                        const t = sequence.tracks[tid] as Track | undefined;
                        if (t) {
                            const kf = t.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                            if (kf) useAnimationStore.getState().removeKeyframe(tid, kf.id);
                        }
                    });
                } else {
                    trackKeys?.forEach((tid, i) => {
                        if (!tid) return;
                        if (!sequence.tracks[tid]) addTrack(tid, trackLabels ? trackLabels[i] : tid);
                        addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                    });
                    if (trackKeys?.[0]) FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackKeys[0]);
                }
            }}
        />
    ) : undefined;

    return (
        <BaseVectorInput
            {...props}
            value={props.value}
            onChange={handleChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            headerRight={headerRight}
            showDualAxisPads={true} // Vec2 shows XY pad between sliders
        />
    );
};

// --- CONNECTED VECTOR3 INPUT ---

interface Vector3InputProps extends Omit<ConnectedVectorInputProps, 'value' | 'onChange'> {
    value: THREE.Vector3;
    onChange: (val: THREE.Vector3) => void;
}


export const Vector3Input: React.FC<Vector3InputProps> = ({
    interactionMode = 'param',
    trackKeys,
    trackLabels,
    ...props
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const { sequence, isRecording, addTrack, addKeyframe, snapshot } = useAnimationStore();
    const lastValueRef = useRef(props.value);

    useEffect(() => {
        lastValueRef.current = props.value;
    }, [props.value?.x, props.value?.y, props.value?.z]);

    const onDragStart = () => {
        handleInteractionStart(interactionMode);

        if (isRecording && trackKeys) {
            snapshot();
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    const label = trackLabels ? trackLabels[i] : tid;
                    if (!sequence.tracks[tid]) addTrack(tid, label);
                }
            });
        }
    };

    const onDragEnd = () => {
        if (isRecording && trackKeys) {
            const axes = ['x', 'y', 'z'] as const;
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    let val = lastValueRef.current[axes[i]];
                    addKeyframe(tid, Math.round(useAnimationStore.getState().currentFrame), val);
                }
            });
        }
        handleInteractionEnd();
    };

    const handleChange = (val: THREE.Vector2 | THREE.Vector3 | THREE.Vector4) => {
        lastValueRef.current = new THREE.Vector3(val.x, val.y, (val as THREE.Vector3).z ?? 0);
        props.onChange(new THREE.Vector3(val.x, val.y, (val as THREE.Vector3).z ?? 0));
    };

    // Determine keyframe status (with dirty detection matching useTrackAnimation)
    const getStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length === 0) return 'none';
        const frame = Math.round(useAnimationStore.getState().currentFrame);
        const axes = ['x', 'y', 'z'] as const;

        // Check if any track has keyframes at current frame
        let hasKey = false;
        let anyKeyDirty = false;
        trackKeys.forEach((tid, i) => {
            if (!tid) return;
            const track = sequence.tracks[tid] as Track | undefined;
            if (track) {
                const kf = track.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                if (kf) {
                    hasKey = true;
                    if (Math.abs(kf.value - lastValueRef.current[axes[i]]) > 0.0001) anyKeyDirty = true;
                }
            }
        });

        if (hasKey) return anyKeyDirty ? 'keyed-dirty' : 'keyed';

        // Check if any track exists — compare interpolated vs current
        const hasTrack = trackKeys.some(tid => tid && sequence.tracks[tid]);
        if (hasTrack) {
            const anyInterpolatedDirty = trackKeys.some((tid, i) => {
                if (!tid) return false;
                const track = sequence.tracks[tid] as Track | undefined;
                if (!track || track.keyframes.length === 0) return false;
                const interpolated = evaluateTrackValue(track.keyframes, frame, false);
                return Math.abs(interpolated - lastValueRef.current[axes[i]]) > 0.001;
            });
            return anyInterpolatedDirty ? 'dirty' : 'partial';
        }
        return 'none';
    };

    // Construct Header Right with Keyframe Button
    const headerRight = (!props.disabled) ? (
        <KeyframeButton
            status={getStatus()}
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y', 'z'] as const;
                const currentStatus = getStatus();
                snapshot();

                // Mirror useTrackAnimation: only remove when exactly 'keyed', otherwise add/overwrite
                if (currentStatus === 'keyed') {
                    trackKeys?.forEach((tid) => {
                        if (!tid) return;
                        const t = sequence.tracks[tid] as Track | undefined;
                        if (t) {
                            const kf = t.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                            if (kf) useAnimationStore.getState().removeKeyframe(tid, kf.id);
                        }
                    });
                } else {
                    trackKeys?.forEach((tid, i) => {
                        if (!tid) return;
                        if (!sequence.tracks[tid]) addTrack(tid, trackLabels ? trackLabels[i] : tid);
                        addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                    });
                    if (trackKeys?.[0]) FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackKeys[0]);
                }
            }}
        />
    ) : undefined;

    return (
        <BaseVectorInput
            {...props}
            value={props.value}
            onChange={handleChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            headerRight={headerRight}
            showDualAxisPads={true}
        />
    );
};

// --- CONNECTED VECTOR4 INPUT ---

interface Vector4InputProps extends Omit<ConnectedVectorInputProps, 'value' | 'onChange'> {
    value: THREE.Vector4;
    onChange: (val: THREE.Vector4) => void;
}

export const Vector4Input: React.FC<Vector4InputProps> = ({
    interactionMode = 'param',
    trackKeys,
    trackLabels,
    ...props
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const { sequence, isRecording, addTrack, addKeyframe, snapshot } = useAnimationStore();
    const lastValueRef = useRef(props.value);

    useEffect(() => {
        lastValueRef.current = props.value;
    }, [props.value?.x, props.value?.y, props.value?.z, props.value?.w]);

    const onDragStart = () => {
        handleInteractionStart(interactionMode);

        if (isRecording && trackKeys) {
            snapshot();
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    const label = trackLabels ? trackLabels[i] : tid;
                    if (!sequence.tracks[tid]) addTrack(tid, label);
                }
            });
        }
    };

    const onDragEnd = () => {
        if (isRecording && trackKeys) {
            const axes = ['x', 'y', 'z', 'w'] as const;
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    let val = lastValueRef.current[axes[i]];
                    addKeyframe(tid, Math.round(useAnimationStore.getState().currentFrame), val);
                }
            });
        }
        handleInteractionEnd();
    };

    const handleChange = (val: THREE.Vector2 | THREE.Vector3 | THREE.Vector4) => {
        const v4 = val as THREE.Vector4;
        lastValueRef.current = new THREE.Vector4(v4.x, v4.y, v4.z ?? 0, v4.w ?? 0);
        props.onChange(lastValueRef.current);
    };

    // Determine keyframe status
    const getStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length === 0) return 'none';
        const frame = Math.round(useAnimationStore.getState().currentFrame);
        const axes = ['x', 'y', 'z', 'w'] as const;

        let hasKey = false;
        let anyKeyDirty = false;
        trackKeys.forEach((tid, i) => {
            if (!tid) return;
            const track = sequence.tracks[tid] as Track | undefined;
            if (track) {
                const kf = track.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                if (kf) {
                    hasKey = true;
                    if (Math.abs(kf.value - lastValueRef.current[axes[i]]) > 0.0001) anyKeyDirty = true;
                }
            }
        });

        if (hasKey) return anyKeyDirty ? 'keyed-dirty' : 'keyed';

        const hasTrack = trackKeys.some(tid => tid && sequence.tracks[tid]);
        if (hasTrack) {
            const anyInterpolatedDirty = trackKeys.some((tid, i) => {
                if (!tid) return false;
                const track = sequence.tracks[tid] as Track | undefined;
                if (!track || track.keyframes.length === 0) return false;
                const interpolated = evaluateTrackValue(track.keyframes, frame, false);
                return Math.abs(interpolated - lastValueRef.current[axes[i]]) > 0.001;
            });
            return anyInterpolatedDirty ? 'dirty' : 'partial';
        }
        return 'none';
    };

    const headerRight = (!props.disabled) ? (
        <KeyframeButton
            status={getStatus()}
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y', 'z', 'w'] as const;
                const currentStatus = getStatus();
                snapshot();

                if (currentStatus === 'keyed') {
                    trackKeys?.forEach((tid) => {
                        if (!tid) return;
                        const t = sequence.tracks[tid] as Track | undefined;
                        if (t) {
                            const kf = t.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                            if (kf) useAnimationStore.getState().removeKeyframe(tid, kf.id);
                        }
                    });
                } else {
                    trackKeys?.forEach((tid, i) => {
                        if (!tid) return;
                        if (!sequence.tracks[tid]) addTrack(tid, trackLabels ? trackLabels[i] : tid);
                        addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                    });
                    if (trackKeys?.[0]) FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackKeys[0]);
                }
            }}
        />
    ) : undefined;

    return (
        <BaseVectorInput
            {...props}
            value={props.value}
            onChange={handleChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            headerRight={headerRight}
            showDualAxisPads={true}
        />
    );
};

// Re-export base components for advanced use cases
export { BaseVectorInput } from './BaseVectorInput';
export { VectorAxisCell } from './VectorAxisCell';
export { DualAxisPad } from './DualAxisPad';
export { RotationHeliotrope } from './RotationHeliotrope';
export * from './types';
