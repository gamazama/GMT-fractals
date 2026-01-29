
import React, { useState, useRef, useEffect } from 'react';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import * as THREE from 'three';
import { KeyframeButton } from './KeyframeButton';
import { KeyStatus } from './Icons';
import { evaluateTrackValue } from '../utils/timelineUtils';

interface Vector3InputProps {
    label?: string;
    value: THREE.Vector3;
    onChange: (val: THREE.Vector3) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    interactionMode?: 'param' | 'camera';
    trackKeys?: string[]; // IDs for X, Y, Z tracks
    trackLabels?: string[]; // Labels for X, Y, Z tracks
    convertRadToDeg?: boolean; // If true, displays Degrees but writes Radians to track/onChange
}

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

    // --- DRAG HANDLERS ---
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
            onUpdate(num);
        } else {
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

export const Vector3Input: React.FC<Vector3InputProps> = ({ 
    label, value, onChange, min = -10000, max = 10000, step = 0.01, disabled = false, interactionMode = 'param', trackKeys, trackLabels, convertRadToDeg = false
}) => {
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const { sequence, currentFrame, isPlaying, addTrack, addKeyframe, removeKeyframe, snapshot, isRecording } = useAnimationStore();
    
    // Local state for immediate visual feedback during drag
    const [localValue, setLocalValue] = useState(value || new THREE.Vector3(0,0,0));
    const isDragging = useRef(false);
    const dragStartSnapshot = useRef<THREE.Vector3 | null>(null);
    const D2R = Math.PI / 180;

    // Sync local state with props when NOT dragging
    useEffect(() => {
        if (!isDragging.current && value) {
            setLocalValue(value.clone());
        }
    }, [value?.x, value?.y, value?.z]);

    const onStart = () => {
        isDragging.current = true;
        dragStartSnapshot.current = localValue.clone();
        handleInteractionStart(interactionMode);
        
        // Auto-Key on Drag Start
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

    const onEnd = () => {
        // Record Keyframes using correct units (Radians if conversion active)
        if (isRecording && trackKeys) {
            const axes = ['x', 'y', 'z'] as const;
            trackKeys.forEach((tid, i) => {
                if (tid) {
                    let val = localValue[axes[i]];
                    // If visual was degrees, convert back to radians for storage
                    if (convertRadToDeg) val *= D2R;
                    addKeyframe(tid, currentFrame, val);
                }
            });
        }
        
        dragStartSnapshot.current = null;
        isDragging.current = false;
        handleInteractionEnd();
    };

    const updateAxis = (axis: 'x'|'y'|'z', scalar: number) => {
        const base = dragStartSnapshot.current || localValue;
        const next = base.clone();
        next[axis] = scalar;
        
        setLocalValue(next); // Update visual immediately
        
        // If converting, send Radians back to parent/engine
        if (convertRadToDeg) {
             // Create a radiants copy for the callback
             const nextRad = next.clone();
             nextRad.x *= D2R;
             nextRad.y *= D2R;
             nextRad.z *= D2R;
             // Only change the specific axis we touched to avoid precision drift on others?
             // No, standard clone/multiply is safer.
             onChange(next); // NavigationControls expects Degrees, it does conversion internally via CameraUtils
        } else {
             onChange(next);
        }
    };

    // --- Keyframe Logic ---
    const getKeyStatus = (): KeyStatus => {
        if (!trackKeys || trackKeys.length !== 3) return 'none';
        
        let hasAnyTrack = false;
        let hasKeyAtFrame = false;
        let isDirty = false;
        const axes = ['x', 'y', 'z'] as const;

        trackKeys.forEach((tid, i) => {
            const track = sequence.tracks[tid];
            if (track) {
                hasAnyTrack = true;
                const k = track.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
                
                if (k) hasKeyAtFrame = true;

                if (!isPlaying) {
                    let currentVal = localValue[axes[i]];
                    // Compare visual value vs track value
                    // Track is in Radians, Visual is Degrees
                    // Convert Track to Degrees for comparison
                    
                    let timelineVal = 0;
                    if (k) timelineVal = k.value;
                    else timelineVal = evaluateTrackValue(track.keyframes, currentFrame, false);
                    
                    // If we are displaying degrees, we must convert the track's radian value to degrees to compare
                    const trackValInVisualUnits = convertRadToDeg ? (timelineVal / D2R) : timelineVal;
                    
                    // Allow small tolerance
                    if (Math.abs(trackValInVisualUnits - currentVal) > 0.05) {
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
                
                let val = localValue[axes[i]];
                if (convertRadToDeg) val *= D2R;
                
                addKeyframe(tid, currentFrame, val);
            });
        }
    };

    return (
        <div className="flex flex-col gap-1 mb-2">
            {label && (
                <div className="flex justify-between items-end px-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider select-none">{label}</label>
                    {trackKeys && (
                        <KeyframeButton status={status} onClick={handleKeyToggle} />
                    )}
                </div>
            )}
            
            <div className="flex gap-1">
                <VectorInputCell 
                    axisIndex={0} 
                    value={localValue.x} 
                    min={min} max={max} step={step} 
                    onUpdate={(v) => updateAxis('x', v)}
                    onDragStart={onStart} onDragEnd={onEnd}
                    disabled={disabled}
                />
                <VectorInputCell 
                    axisIndex={1} 
                    value={localValue.y} 
                    min={min} max={max} step={step} 
                    onUpdate={(v) => updateAxis('y', v)}
                    onDragStart={onStart} onDragEnd={onEnd}
                    disabled={disabled}
                />
                <VectorInputCell 
                    axisIndex={2} 
                    value={localValue.z} 
                    min={min} max={max} step={step} 
                    onUpdate={(v) => updateAxis('z', v)}
                    onDragStart={onStart} onDragEnd={onEnd}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};
