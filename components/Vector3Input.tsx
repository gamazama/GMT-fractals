
import React, { useState, useRef, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import * as THREE from 'three';
import { KeyframeButton } from './KeyframeButton';
import { KeyStatus } from './Icons';
import { evaluateTrackValue } from '../utils/timelineUtils';

// --- PURE PRIMITIVES ---

const AXIS_CONFIG = [
    { label: 'X', color: 'bg-red-500', text: 'text-red-400', border: 'group-focus-within:border-red-500/50' },
    { label: 'Y', color: 'bg-green-500', text: 'text-green-400', border: 'group-focus-within:border-green-500/50' },
    { label: 'Z', color: 'bg-blue-500', text: 'text-blue-400', border: 'group-focus-within:border-blue-500/50' }
];

const VectorInputCell = ({ 
    axisIndex, 
    value, 
    min, 
    max, 
    step, 
    onUpdate, 
    onDragStart, 
    onDragEnd, 
    disabled 
}: {
    axisIndex: number,
    value: number,
    min: number,
    max: number,
    step: number,
    onUpdate: (val: number) => void,
    onDragStart: () => void,
    onDragEnd: () => void,
    disabled?: boolean
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Drag State
    const startX = useRef(0);
    const startVal = useRef(0);
    const hasMoved = useRef(false);
    
    const config = AXIS_CONFIG[axisIndex];
    
    let pct = 0;
    if (Number.isFinite(min) && Number.isFinite(max)) {
        const range = max - min;
        const safeVal = isNaN(value) ? min : value;
        pct = Math.min(100, Math.max(0, ((safeVal - min) / range) * 100));
    }

    const handleDown = (e: React.PointerEvent) => {
        if (disabled || isEditing) return;
        if (e.button !== 0) return; 
        
        e.preventDefault();
        e.stopPropagation();
        
        e.currentTarget.setPointerCapture(e.pointerId);
        
        startX.current = e.clientX;
        startVal.current = isNaN(value) ? 0 : value;
        hasMoved.current = false;
        
        onDragStart();
    };

    const handleMove = (e: React.PointerEvent) => {
        if (isEditing || disabled) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) > 2) hasMoved.current = true;
        
        if (!hasMoved.current && Math.abs(dx) < 2) return;

        e.preventDefault();
        e.stopPropagation();
        
        let range = (Number.isFinite(max) && Number.isFinite(min)) ? (max - min) : 10.0;
        let sensitivity = 0.005 * range; 
        
        if (e.shiftKey) sensitivity *= 10;
        if (e.altKey) sensitivity *= 0.1;
        
        let next = startVal.current + (dx * sensitivity);
        
        if (step) next = Math.round(next / step) * step;
        
        if (Number.isFinite(min) && Number.isFinite(max)) {
            next = Math.min(max, Math.max(min, next));
        }
        
        if (!isNaN(next)) {
            onUpdate(next);
        }
    };

    const handleUp = (e: React.PointerEvent) => {
        if (disabled || isEditing) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        
        onDragEnd();
        
        if (!hasMoved.current) {
            startEditing();
        }
        hasMoved.current = false;
        e.stopPropagation();
    };

    const startEditing = () => {
        setIsEditing(true);
        setInputValue(value.toFixed(4)); 
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            }
        }, 10);
    };

    const commitEdit = () => {
        const num = parseFloat(inputValue);
        if (!isNaN(num)) {
            // Trigger start/end for undo history wrapper
            onDragStart();
            onUpdate(num);
            onDragEnd();
        } else {
            // Restore visual
            onUpdate(value);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') setIsEditing(false);
        e.stopPropagation();
    };

    return (
        <div 
            className={`relative flex-1 h-6 bg-black/40 border border-white/10 rounded overflow-hidden group transition-colors ${config.border} ${disabled ? 'opacity-50 pointer-events-none' : 'hover:border-white/30'}`}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
        >
            {!isEditing && Number.isFinite(min) && Number.isFinite(max) && (
                <div 
                    className={`absolute top-0 bottom-0 left-0 opacity-20 transition-all duration-75 pointer-events-none ${config.color}`} 
                    style={{ width: `${pct}%` }} 
                />
            )}
            
            <div className={`absolute top-0 bottom-0 left-0 w-4 flex items-center justify-center border-r border-white/5 bg-white/5 pointer-events-none select-none`}>
                <span className={`text-[8px] font-black ${config.text}`}>{config.label}</span>
            </div>

            <div className="absolute inset-0 left-4 right-0 flex items-center">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full bg-black text-white text-[9px] font-mono px-2 outline-none border-none"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-end px-2 cursor-ew-resize">
                        <span className="text-[9px] font-mono text-gray-300 group-hover:text-white transition-colors select-none">
                            {value.toFixed(3)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface BaseVector3InputProps {
    label?: string;
    value: THREE.Vector3;
    onChange: (val: THREE.Vector3) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    convertRadToDeg?: boolean;
    // Callbacks
    onDragStart?: () => void;
    onDragEnd?: () => void;
    // Visual slots
    headerRight?: React.ReactNode;
}

export const BaseVector3Input: React.FC<BaseVector3InputProps> = ({ 
    label, value, onChange, min = -10000, max = 10000, step = 0.01, disabled = false, convertRadToDeg = false, onDragStart, onDragEnd, headerRight
}) => {
    // Local state for immediate visual feedback during drag
    const [localValue, setLocalValue] = useState(value || new THREE.Vector3(0,0,0));
    const isDragging = useRef(false);
    const dragStartSnapshot = useRef<THREE.Vector3 | null>(null);
    const D2R = Math.PI / 180;

    useEffect(() => {
        if (!isDragging.current && value) {
            setLocalValue(value.clone());
        }
    }, [value?.x, value?.y, value?.z]);

    const handleStart = () => {
        isDragging.current = true;
        dragStartSnapshot.current = localValue.clone();
        if (onDragStart) onDragStart();
    };

    const handleEnd = () => {
        dragStartSnapshot.current = null;
        isDragging.current = false;
        if (onDragEnd) onDragEnd();
    };

    const updateAxis = (axis: 'x'|'y'|'z', scalar: number) => {
        const base = dragStartSnapshot.current || localValue;
        const next = base.clone();
        next[axis] = scalar;
        
        setLocalValue(next); 
        
        if (convertRadToDeg) {
             const nextRad = next.clone();
             nextRad.x *= D2R;
             nextRad.y *= D2R;
             nextRad.z *= D2R;
             onChange(next); // Parent expects radians, but visual updates are degrees
        } else {
             onChange(next);
        }
    };

    return (
        <div className="flex flex-col gap-1 mb-2">
            {label && (
                <div className="flex justify-between items-end px-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">{label}</label>
                    {headerRight}
                </div>
            )}
            
            <div className="flex gap-1">
                <VectorInputCell 
                    axisIndex={0} 
                    value={localValue.x} 
                    min={min} max={max} step={step} 
                    onUpdate={(v) => updateAxis('x', v)}
                    onDragStart={handleStart} onDragEnd={handleEnd}
                    disabled={disabled}
                />
                <VectorInputCell 
                    axisIndex={1} 
                    value={localValue.y} 
                    min={min} max={max} step={step} 
                    onUpdate={(v) => updateAxis('y', v)}
                    onDragStart={handleStart} onDragEnd={handleEnd}
                    disabled={disabled}
                />
                <VectorInputCell 
                    axisIndex={2} 
                    value={localValue.z} 
                    min={min} max={max} step={step} 
                    onUpdate={(v) => updateAxis('z', v)}
                    onDragStart={handleStart} onDragEnd={handleEnd}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};

// --- CONNECTED WRAPPER ---

interface ConnectedVector3InputProps extends Omit<BaseVector3InputProps, 'onDragStart' | 'onDragEnd' | 'headerRight'> {
    interactionMode?: 'param' | 'camera';
    trackKeys?: string[];
    trackLabels?: string[];
}

export const Vector3Input: React.FC<ConnectedVector3InputProps> = ({
    interactionMode = 'param', trackKeys, trackLabels, ...props
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const { sequence, currentFrame, isPlaying, addTrack, addKeyframe, removeKeyframe, snapshot, isRecording } = useAnimationStore();
    
    // We need to access localValue inside the wrapper to record correct keyframe values
    // But localValue is inside BaseVector3Input.
    // Solution: We track the *last dispatched value* here or pass a callback to Base.
    // Let's use a ref to track the last value seen by onChange.
    const lastValueRef = useRef(props.value);
    
    const D2R = Math.PI / 180;

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
                    // Note: BaseVector3Input calls onChange with the value *it sends upstream*.
                    // If convertRadToDeg is true, BaseVector3Input sends Radians upstream.
                    // But if convertRadToDeg is true, BaseVector3Input *displays* Degrees.
                    // Wait, BaseVector3Input logic: "If converting, send Radians back to parent".
                    // So `props.onChange` receives Radians. 
                    // However, `Vector3Input` props usually assume `value` matches the store state (Radians).
                    // `addKeyframe` expects the value as it exists in the store (Radians).
                    // So `lastValueRef.current` (which comes from onChange) is already Radians.
                    // BUT: In the previous implementation, localValue was Degrees, and onEnd converted it.
                    // Here, we don't have access to localValue. 
                    // However, `onChange` updates the parent state, which updates `props.value`, which updates `lastValueRef`.
                    // So `lastValueRef` is accurate.
                    
                    // Actually, there's a subtle bug in the previous implementation:
                    // `onEnd` used `localValue` (Degrees) and multiplied by D2R.
                    // Now, `onChange` receives `next` (which is already multiplied by D2R if converting).
                    // So we can just use the value from onChange directly.
                    // Wait, `onChange` logic in Base:
                    // `onChange(next)` where `next` is Radians.
                    
                    addKeyframe(tid, currentFrame, val);
                }
            });
        }
        handleInteractionEnd();
    };

    // Intercept onChange to track value
    const handleChange = (v: THREE.Vector3) => {
        lastValueRef.current = v;
        props.onChange(v);
    };
    
    // --- Keyframe Status Logic ---
    const getKeyStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length !== 3) return 'none';
        
        let hasAnyTrack = false;
        let hasKeyAtFrame = false;
        let isDirty = false;
        const axes = ['x', 'y', 'z'] as const;
        
        // We use props.value as the source of truth for comparison
        // If convertRadToDeg is true, props.value is likely Radians (from store).
        // Timeline is also Radians.
        
        trackKeys.forEach((tid, i) => {
            const track = sequence.tracks[tid];
            if (track) {
                hasAnyTrack = true;
                const k = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
                
                if (k) hasKeyAtFrame = true;

                if (!isPlaying) {
                    let currentVal = props.value[axes[i]];
                    let timelineVal = 0;
                    
                    if (k) timelineVal = k.value;
                    else timelineVal = evaluateTrackValue(track.keyframes, currentFrame, false);
                    
                    // Direct comparison (Radians to Radians) should work if store is consistent
                    if (Math.abs(timelineVal - currentVal) > 0.05) {
                        isDirty = true;
                    }
                }
            }
        });

        if (!hasAnyTrack) return 'none';
        if (hasKeyAtFrame) return isDirty ? 'keyed-dirty' : 'keyed';
        return isDirty ? 'dirty' : 'partial';
    };
    
    const status = getKeyStatus();

    const handleKeyToggle = () => {
        if (!trackKeys) return;
        const axes = ['x', 'y', 'z'] as const;
        snapshot();
        
        if (status === 'keyed') {
            trackKeys.forEach(tid => {
                const track = sequence.tracks[tid];
                if (track) {
                    const k = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
                    if (k) removeKeyframe(tid, k.id);
                }
            });
        } else {
            trackKeys.forEach((tid, i) => {
                const label = trackLabels ? trackLabels[i] : tid;
                if (!sequence.tracks[tid]) addTrack(tid, label);
                
                let val = props.value[axes[i]];
                // Value is already in correct unit (Radians) if coming from store
                addKeyframe(tid, currentFrame, val);
            });
        }
    };

    const headerRight = trackKeys ? <KeyframeButton status={status} onClick={handleKeyToggle} /> : undefined;

    return (
        <BaseVector3Input 
            {...props} 
            onChange={handleChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            headerRight={headerRight}
        />
    );
};
