
import React, { useRef, useState, useMemo } from 'react';
import { useFractalStore } from '../../../store/fractalStore';
import { useAnimationStore } from '../../../store/animationStore';
import { KeyframeButton } from '../../../components/KeyframeButton';
import { KeyStatus } from '../../../components/Icons';
import * as THREE from 'three';
import { evaluateTrackValue } from '../../../utils/timelineUtils';
import { DraggableNumber } from '../../../components/Slider';

interface LightDirectionControlProps {
    index: number;
    value: { x: number, y: number, z: number }; // Euler Radians (YXZ)
    onChange: (val: { x: number, y: number, z: number }) => void;
    isFixed?: boolean; // Headlamp mode
    // Supports either square size or explicit dimensions
    size?: number; 
    width?: number;
    height?: number;
}

export const LightDirectionControl: React.FC<LightDirectionControlProps> = ({ 
    index, 
    value, 
    onChange, 
    isFixed = false, 
    size = 140,
    width,
    height
}) => {
    // Visual Config
    const w = width || size;
    const h = height || size;
    
    const centerX = w / 2;
    const centerY = h / 2;
    
    // The "Ring" represents 90 degrees deviation.
    // We leave padding for the "Backlight" zone (90-180 degrees).
    // Elliptical radii
    const rx = w * 0.35;
    const ry = h * 0.35;
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Stores
    const { handleInteractionStart, handleInteractionEnd } = useFractalStore();
    const cameraRot = useFractalStore(s => s.cameraRot);
    const { sequence, currentFrame, isPlaying, addTrack, addKeyframe, removeKeyframe, snapshot, isRecording } = useAnimationStore();

    // --- MATH HELPERS ---

    // 1. Get Current Light Direction Vector (from Euler)
    const getBaseVector = () => {
        // Light default forward is (0,0,-1). 
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(value.x, value.y, value.z, 'YXZ'));
        return new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    };

    // 2. Map Direction to Screen Position (View Space Projection)
    const getHandlePosition = () => {
        const baseVec = getBaseVector();
        let viewSpaceVec = baseVec.clone();

        // If World Mode (!isFixed), we must transform the World Vector into Camera View Space
        if (!isFixed) {
             const camQ = new THREE.Quaternion(cameraRot.x, cameraRot.y, cameraRot.z, cameraRot.w);
             viewSpaceVec.applyQuaternion(camQ.clone().invert());
        }
        
        // Standard (0,0,-1) -> Angle to Forward is 0.
        const forward = new THREE.Vector3(0, 0, -1);
        const angle = viewSpaceVec.angleTo(forward); // 0 to PI
        
        // Map Angle to Radius (Normalized 0..1 at 90 degrees)
        const rNorm = angle / (Math.PI / 2);
        
        // Determine Angle on Screen (Phi)
        const phi = Math.atan2(viewSpaceVec.y, viewSpaceVec.x);
        
        // Elliptical Projection
        // x = -cos(phi) * rNorm * rx
        // y = sin(phi) * rNorm * ry
        const x = -Math.cos(phi) * rNorm * rx;
        const y = Math.sin(phi) * rNorm * ry;
        
        return { x: centerX + x, y: centerY + y, isBacklit: angle > (Math.PI/2) };
    };

    // 3. Map Screen Position to World Direction
    const updateFromPointer = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        
        const cx = rect.left + w / 2;
        const cy = rect.top + h / 2;
        
        const dx = clientX - cx;
        const dy = clientY - cy; 
        
        // Normalize coordinates to Unit Circle based on ellipse radii
        const nx = dx / rx;
        const ny = dy / ry;
        
        // Calculate Polar in normalized space
        const rNorm = Math.sqrt(nx*nx + ny*ny);
        const phi = Math.atan2(ny, nx);
        
        // Map Normalized Radius to Deviation Angle (Theta)
        // rNorm = 1.0 -> Theta = 90 deg
        const theta = rNorm * (Math.PI / 2);
        
        // Clamp to safe range (avoid exact 180 flip singularity)
        const safeTheta = Math.min(theta, Math.PI - 0.001);
        
        // Construct Local Vector (Relative to View)
        const sinT = Math.sin(safeTheta);
        // We use the phi calculated from the stretched coordinates to maintain visual alignment under mouse
        const viewSpaceDir = new THREE.Vector3(
            -sinT * Math.cos(phi), 
            sinT * Math.sin(phi),  
            -Math.cos(safeTheta)   
        );
        
        // Transform to Storage Space
        let finalDir = viewSpaceDir;

        if (!isFixed) {
            const camQ = new THREE.Quaternion(cameraRot.x, cameraRot.y, cameraRot.z, cameraRot.w);
            finalDir.applyQuaternion(camQ);
        }
        
        // Convert Vector to Euler
        const targetQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1), finalDir);
        const euler = new THREE.Euler().setFromQuaternion(targetQ, 'YXZ');
        
        onChange({ x: euler.x, y: euler.y, z: euler.z });
    };

    const handlePos = getHandlePosition();

    // --- INTERACTION HANDLERS ---

    const onPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleInteractionStart('param');
        setIsDragging(true);
        (e.target as Element).setPointerCapture(e.pointerId);
        
        // Immediate update on click
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        updateFromPointer(e.clientX, e.clientY);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            (e.target as Element).releasePointerCapture(e.pointerId);
            
            // Record if needed
            if (isRecording) {
                const idX = `lighting.light${index}_rotX`;
                const idY = `lighting.light${index}_rotY`;
                const idZ = `lighting.light${index}_rotZ`;
                if(!sequence.tracks[idX]) addTrack(idX, `Light ${index+1} Pitch`);
                if(!sequence.tracks[idY]) addTrack(idY, `Light ${index+1} Yaw`);
                if(!sequence.tracks[idZ]) addTrack(idZ, `Light ${index+1} Roll`); 
                
                addKeyframe(idX, currentFrame, value.x);
                addKeyframe(idY, currentFrame, value.y);
                addKeyframe(idZ, currentFrame, value.z);
            }
            handleInteractionEnd();
        }
    };

    // --- KEYFRAME STATUS ---
    const trackKeys = [`lighting.light${index}_rotX`, `lighting.light${index}_rotY`];
    const keyStatus: KeyStatus = (() => {
        let hasTrack = false;
        let hasKey = false;
        let isDirty = false;
        
        trackKeys.forEach((tid, i) => {
            const t = sequence.tracks[tid];
            if (t) {
                hasTrack = true;
                const k = t.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
                if (k) hasKey = true;
                
                if (!isPlaying) {
                    const curr = i === 0 ? value.x : value.y;
                    const target = k ? k.value : evaluateTrackValue(t.keyframes, currentFrame, i===0 || i===1); 
                    if (Math.abs(curr - target) > 0.001) isDirty = true;
                }
            }
        });
        
        if (!hasTrack) return 'none';
        if (hasKey) return isDirty ? 'keyed-dirty' : 'keyed';
        return isDirty ? 'dirty' : 'partial';
    })();

    const handleKeyToggle = () => {
        snapshot();
        if (keyStatus === 'keyed') {
            trackKeys.forEach(tid => {
                const t = sequence.tracks[tid];
                const k = t?.keyframes.find(k => Math.abs(k.frame - currentFrame) < 0.1);
                if (k) removeKeyframe(tid, k.id);
            });
        } else {
            trackKeys.forEach((tid, i) => {
                if (!sequence.tracks[tid]) addTrack(tid, i===0 ? `Light ${index+1} Pitch` : `Light ${index+1} Yaw`);
                addKeyframe(tid, currentFrame, i===0 ? value.x : value.y);
            });
        }
    };

    return (
        <div className="flex flex-col items-center mb-2">
            <div className="w-full flex justify-between items-center mb-1 px-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Heliotrope</label>
                <KeyframeButton status={keyStatus} onClick={handleKeyToggle} />
            </div>
            
            <div 
                ref={containerRef}
                className="relative cursor-crosshair touch-none rounded-[30px] border border-white/10 shadow-inner group overflow-hidden"
                style={{ 
                    width: w, 
                    height: h, 
                    background: 'radial-gradient(circle at center, #0f172a 0%, #020617 80%)' 
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                title={isFixed 
                    ? "Headlamp Mode: Light is attached to Camera. Center = Camera Forward." 
                    : "World Mode: Light is fixed in space. Center = Direction you are looking."
                }
            >
                {/* Zones */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    {/* The 90 Degree Ring (Ellipse) */}
                    <div className="border border-cyan-500 rounded-full" style={{ width: rx*2, height: ry*2 }} /> 
                    {/* Crosshairs */}
                    <div className="absolute w-full h-px bg-white/20" />
                    <div className="absolute h-full w-px bg-white/20" />
                </div>
                
                {/* Labels */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none">TOP</div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-600 font-bold pointer-events-none">BTM</div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none">L</div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 font-bold pointer-events-none">R</div>

                {/* Backlight Warning Zone */}
                <div 
                    className={`absolute inset-0 rounded-[30px] border-2 border-red-500/30 pointer-events-none transition-opacity duration-300 ${handlePos.isBacklit ? 'opacity-100 animate-pulse' : 'opacity-0'}`} 
                />

                {/* Sun Handle */}
                <div 
                    className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full shadow-[0_0_10px_white] pointer-events-none transition-transform duration-75 ${isDragging ? 'scale-125 bg-white' : 'bg-yellow-400'} ${handlePos.isBacklit ? 'border-2 border-red-500' : ''}`}
                    style={{ 
                        left: handlePos.x, 
                        top: handlePos.y 
                    }}
                />
            </div>
            
            <div className="flex gap-2 w-full mt-2 px-1">
                <div className="flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1">
                    <span className="text-[8px] text-gray-500 font-bold mr-2">Pitch</span>
                    <DraggableNumber 
                        value={value.x * 180 / Math.PI} 
                        onChange={(v) => onChange({ ...value, x: v * Math.PI / 180 })} 
                        step={1} 
                        min={-180} max={180}
                        overrideText={(value.x * 180 / Math.PI).toFixed(1) + '°'}
                        onDragStart={() => handleInteractionStart('param')}
                        onDragEnd={() => handleInteractionEnd()}
                    />
                </div>
                <div className="flex-1 bg-black/40 rounded border border-white/10 flex items-center px-2 py-1">
                    <span className="text-[8px] text-gray-500 font-bold mr-2">Yaw</span>
                    <DraggableNumber 
                        value={value.y * 180 / Math.PI} 
                        onChange={(v) => onChange({ ...value, y: v * Math.PI / 180 })} 
                        step={1} 
                        min={-180} max={180}
                        overrideText={(value.y * 180 / Math.PI).toFixed(1) + '°'}
                        onDragStart={() => handleInteractionStart('param')}
                        onDragEnd={() => handleInteractionEnd()}
                    />
                </div>
            </div>
        </div>
    );
};
