
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore';
import { useAnimationStore } from '../../store/animationStore';
import { KeyframeButton } from '../KeyframeButton';
import { KeyStatus } from '../Icons';
import { BaseVectorInput } from './BaseVectorInput';
import { ConnectedVectorInputProps } from './types';
import { evaluateTrackValue } from '../../utils/timelineUtils';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { useInteractionGesture } from '../../engine/hooks/useInteractionDrag';
import { INTERACTION_SOURCES } from '../../engine-gmt/interaction/interactionSources';
import type { Track, Keyframe } from '../../types/animation';

// Shared keyframe deletes for the multi-track vector inputs. Delete-key /
// delete-track act on ALL axis tracks at once, mirroring the "set" click.
// One snapshot is taken only if something is actually removed.
type Sequence = { tracks: Record<string, Track> };

const deleteVecKeysAtFrame = (trackKeys: (string | undefined)[] | undefined, sequence: Sequence, frame: number) => {
    if (!trackKeys) return;
    const store = useAnimationStore.getState();
    let snapped = false;
    trackKeys.forEach((tid) => {
        if (!tid) return;
        const t = sequence.tracks[tid] as Track | undefined;
        const kf = t?.keyframes.find((k: Keyframe) => Math.abs(k.frame - frame) < 0.5);
        if (kf) {
            if (!snapped) { store.snapshot(); snapped = true; }
            store.removeKeyframe(tid, kf.id);
        }
    });
};

const deleteVecTracks = (trackKeys: (string | undefined)[] | undefined, sequence: Sequence) => {
    if (!trackKeys) return;
    const ids = trackKeys.filter((t): t is string => !!t && !!sequence.tracks[t]);
    if (ids.length) useAnimationStore.getState().removeTracks(ids);
};

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
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    // Session 'slider' anchored to the same param-transaction boundary (ADR-0061 P3b).
    const slider = useInteractionGesture(INTERACTION_SOURCES.slider);
    // Narrow per-field subs (no-op `set()` calls on animationStore happen at
    // RAF rate — destructuring useAnimationStore() makes every vector input
    // re-render every frame. See useTrackAnimation.ts for the same pattern.
    const sequence = useAnimationStore((s) => s.sequence);
    const isRecording = useAnimationStore((s) => s.isRecording);
    const addTrack    = useAnimationStore((s) => s.addTrack);
    const addKeyframe = useAnimationStore((s) => s.addKeyframe);
    const snapshot    = useAnimationStore((s) => s.snapshot);
    const lastValueRef = useRef(props.value);

    useEffect(() => {
        lastValueRef.current = props.value;
    }, [props.value?.x, props.value?.y]);

    const onDragStart = () => {
        handleInteractionStart(interactionMode);
        slider.begin();

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
        slider.end();
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
            label={props.label}
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y'] as const;
                if (getStatus() === 'keyed') return; // already keyed to current values
                snapshot();
                trackKeys?.forEach((tid, i) => {
                    if (!tid) return;
                    if (!sequence.tracks[tid]) addTrack(tid, trackLabels ? trackLabels[i] : tid);
                    addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                });
                if (trackKeys?.[0]) FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackKeys[0]);
            }}
            onDeleteKey={() => deleteVecKeysAtFrame(trackKeys, sequence, Math.round(useAnimationStore.getState().currentFrame))}
            onDeleteTrack={() => deleteVecTracks(trackKeys, sequence)}
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
    onGizmoToggle,
    gizmoActive,
    ...props
}) => {
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    // Session 'slider' anchored to the same param-transaction boundary (ADR-0061 P3b).
    const slider = useInteractionGesture(INTERACTION_SOURCES.slider);
    // Narrow per-field subs (no-op `set()` calls on animationStore happen at
    // RAF rate — destructuring useAnimationStore() makes every vector input
    // re-render every frame. See useTrackAnimation.ts for the same pattern.
    const sequence = useAnimationStore((s) => s.sequence);
    const isRecording = useAnimationStore((s) => s.isRecording);
    const addTrack    = useAnimationStore((s) => s.addTrack);
    const addKeyframe = useAnimationStore((s) => s.addKeyframe);
    const snapshot    = useAnimationStore((s) => s.snapshot);
    const lastValueRef = useRef(props.value);

    useEffect(() => {
        lastValueRef.current = props.value;
    }, [props.value?.x, props.value?.y, props.value?.z]);

    const onDragStart = () => {
        handleInteractionStart(interactionMode);
        slider.begin();

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
        slider.end();
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

    // Construct Header Right: optional canvas-gizmo toggle + Keyframe Button
    const headerRight = (!props.disabled) ? (
        <div className="flex items-center gap-1">
            {onGizmoToggle && (
                <button
                    title={gizmoActive ? 'Hide canvas rotation gizmo' : 'Show rotation gizmo on canvas'}
                    onClick={onGizmoToggle}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${
                        gizmoActive
                            ? 'text-accent-300 bg-accent-500/20'
                            : 'text-fg-faint hover:text-fg-secondary hover:bg-line/10'
                    }`}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <path d="M21 3v6h-6" />
                    </svg>
                </button>
            )}
            <KeyframeButton
                status={getStatus()}
                label={props.label}
                onClick={() => {
                    const frame = Math.round(useAnimationStore.getState().currentFrame);
                    const axes = ['x', 'y', 'z'] as const;
                    if (getStatus() === 'keyed') return; // already keyed to current values
                    snapshot();
                    trackKeys?.forEach((tid, i) => {
                        if (!tid) return;
                        if (!sequence.tracks[tid]) addTrack(tid, trackLabels ? trackLabels[i] : tid);
                        addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                    });
                    if (trackKeys?.[0]) FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackKeys[0]);
                }}
                onDeleteKey={() => deleteVecKeysAtFrame(trackKeys, sequence, Math.round(useAnimationStore.getState().currentFrame))}
                onDeleteTrack={() => deleteVecTracks(trackKeys, sequence)}
            />
        </div>
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
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    // Session 'slider' anchored to the same param-transaction boundary (ADR-0061 P3b).
    const slider = useInteractionGesture(INTERACTION_SOURCES.slider);
    // Narrow per-field subs (no-op `set()` calls on animationStore happen at
    // RAF rate — destructuring useAnimationStore() makes every vector input
    // re-render every frame. See useTrackAnimation.ts for the same pattern.
    const sequence = useAnimationStore((s) => s.sequence);
    const isRecording = useAnimationStore((s) => s.isRecording);
    const addTrack    = useAnimationStore((s) => s.addTrack);
    const addKeyframe = useAnimationStore((s) => s.addKeyframe);
    const snapshot    = useAnimationStore((s) => s.snapshot);
    const lastValueRef = useRef(props.value);

    useEffect(() => {
        lastValueRef.current = props.value;
    }, [props.value?.x, props.value?.y, props.value?.z, props.value?.w]);

    const onDragStart = () => {
        handleInteractionStart(interactionMode);
        slider.begin();

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
        slider.end();
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
            label={props.label}
            onClick={() => {
                const frame = Math.round(useAnimationStore.getState().currentFrame);
                const axes = ['x', 'y', 'z', 'w'] as const;
                if (getStatus() === 'keyed') return; // already keyed to current values
                snapshot();
                trackKeys?.forEach((tid, i) => {
                    if (!tid) return;
                    if (!sequence.tracks[tid]) addTrack(tid, trackLabels ? trackLabels[i] : tid);
                    addKeyframe(tid, frame, lastValueRef.current[axes[i]]);
                });
                if (trackKeys?.[0]) FractalEvents.emit(FRACTAL_EVENTS.TRACK_FOCUS, trackKeys[0]);
            }}
            onDeleteKey={() => deleteVecKeysAtFrame(trackKeys, sequence, Math.round(useAnimationStore.getState().currentFrame))}
            onDeleteTrack={() => deleteVecTracks(trackKeys, sequence)}
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
