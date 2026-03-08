
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { KeyframeButton } from '../KeyframeButton';
import { KeyStatus } from '../Icons';
import { BaseVectorInput } from './BaseVectorInput';
import { ConnectedVectorInputProps } from './types';
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

    const handleChange = (val: THREE.Vector2 | THREE.Vector3) => {
        lastValueRef.current = new THREE.Vector2(val.x, val.y);
        props.onChange(new THREE.Vector2(val.x, val.y));
    };

    // Determine keyframe status
    const getStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length === 0) return 'none';
        const frame = Math.round(useAnimationStore.getState().currentFrame);
        
        // Check if any track has keyframes at current frame
        const hasKey = trackKeys.some(tid => {
            if (!tid) return false;
            const track = sequence.tracks[tid] as Track | undefined;
            return track && track.keyframes.some((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
        });
        
        if (hasKey) return 'keyed';
        
        // Check if any track exists
        const hasTrack = trackKeys.some(tid => tid && sequence.tracks[tid]);
        return hasTrack ? 'partial' : 'none';
    };

    // Construct Header Right with Keyframe Button
    const headerRight = (!props.disabled) ? (
        <KeyframeButton 
            status={getStatus()} 
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y'] as const;
                
                // Check if we should add or remove
                const track = trackKeys?.[0] ? sequence.tracks[trackKeys[0]] as Track | undefined : undefined;
                const hasKey = track && track.keyframes.some((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                
                trackKeys?.forEach((tid, i) => {
                    if (!tid) return;
                    if (hasKey) {
                        // Remove keyframe
                        const t = sequence.tracks[tid] as Track | undefined;
                        if (t) {
                            const keyframe = t.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                            if (keyframe) {
                                useAnimationStore.getState().removeKeyframe(tid, keyframe.id);
                            }
                        }
                    } else {
                        // Add keyframe
                        if (!sequence.tracks[tid]) {
                            const label = trackLabels ? trackLabels[i] : tid;
                            addTrack(tid, label);
                        }
                        addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                    }
                });
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

    const handleChange = (val: THREE.Vector2 | THREE.Vector3) => {
        lastValueRef.current = new THREE.Vector3(val.x, val.y, (val as THREE.Vector3).z ?? 0);
        props.onChange(new THREE.Vector3(val.x, val.y, (val as THREE.Vector3).z ?? 0));
    };

    // Determine keyframe status
    const getStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length === 0) return 'none';
        const frame = Math.round(useAnimationStore.getState().currentFrame);
        
        // Check if any track has keyframes at current frame
        const hasKey = trackKeys.some(tid => {
            if (!tid) return false;
            const track = sequence.tracks[tid] as Track | undefined;
            return track && track.keyframes.some((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
        });
        
        if (hasKey) return 'keyed';
        
        // Check if any track exists
        const hasTrack = trackKeys.some(tid => tid && sequence.tracks[tid]);
        return hasTrack ? 'partial' : 'none';
    };

    // Construct Header Right with Keyframe Button
    const headerRight = (!props.disabled) ? (
        <KeyframeButton 
            status={getStatus()} 
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y', 'z'] as const;
                
                // Check if we should add or remove
                const track = trackKeys?.[0] ? sequence.tracks[trackKeys[0]] as Track | undefined : undefined;
                const hasKey = track && track.keyframes.some((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                
                trackKeys?.forEach((tid, i) => {
                    if (!tid) return;
                    if (hasKey) {
                        // Remove keyframe
                        const t = sequence.tracks[tid] as Track | undefined;
                        if (t) {
                            const keyframe = t.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
                            if (keyframe) {
                                useAnimationStore.getState().removeKeyframe(tid, keyframe.id);
                            }
                        }
                    } else {
                        // Add keyframe
                        if (!sequence.tracks[tid]) {
                            const label = trackLabels ? trackLabels[i] : tid;
                            addTrack(tid, label);
                        }
                        addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                    }
                });
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
