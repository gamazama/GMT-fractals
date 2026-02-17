
import React, { useState, useRef } from 'react';
import { useFractalStore } from '../../store/fractalStore';
import { useAnimationStore } from '../../store/animationStore';
import { engine } from '../../engine/FractalEngine';
import { FeatureComponentProps } from '../registry/ComponentRegistry';
import Histogram from '../Histogram';
import ToggleSwitch from '../ToggleSwitch';
import Slider from '../Slider';
import Button from '../Button';
import { Vector3Input } from '../Vector3Input';
import { LinkIcon } from '../Icons';
import * as THREE from 'three';
import { FractalEvents } from '../../engine/FractalEvents';
import { AutoFeaturePanel } from '../AutoFeaturePanel';
import { CameraUtils } from '../../utils/CameraUtils';

// --- WIDGET 1: COLOR GRADING HISTOGRAM ---
export const ColorGradingHistogram: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const data = useFractalStore(s => s.sceneHistogramData);
    const trigger = useFractalStore(s => s.sceneHistogramTrigger); 
    const refresh = useFractalStore(s => s.refreshSceneHistogram);
    
    // Access Live Modulations
    const liveModulations = useFractalStore(s => s.liveModulations);
    
    const { levelsMin, levelsMax, levelsGamma } = sliceState;
    const setColorGrading = (actions as any).setColorGrading;

    // Apply offsets if modulation is active
    const modMin = liveModulations?.['colorGrading.levelsMin'] ?? levelsMin;
    const modMax = liveModulations?.['colorGrading.levelsMax'] ?? levelsMax;
    const modGamma = liveModulations?.['colorGrading.levelsGamma'] ?? levelsGamma;

    return (
        <div className="mt-2 pt-2 border-t border-white/5">
             <Histogram 
                data={data}
                min={modMin ?? 0.0}
                max={modMax ?? 1.0}
                gamma={modGamma ?? 1.0}
                onChange={({ min, max, gamma }) => {
                    setColorGrading({ levelsMin: min, levelsMax: max, levelsGamma: gamma });
                }}
                onRefresh={refresh}
                height={40}
                fixedRange={{ min: 0.0, max: 1.0 }}
            />
        </div>
    );
};

// --- WIDGET 2: OPTICS CONTROLS (Focus & Dolly) ---
export const OpticsControls: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const { camFov, camType, dofStrength } = sliceState;
    const setOptics = (actions as any).setOptics;
    
    const interactionMode = useFractalStore(s => s.interactionMode);
    const setInteractionMode = useFractalStore(s => s.setInteractionMode);
    
    const isPicking = interactionMode === 'picking_focus';
    
    const [dollyLocked, setDollyLocked] = useState(true);
    const dollyStartRef = useRef<any>(null);

    const isPerspective = Math.abs((camType ?? 0) - 0.0) < 0.1;

    const handleAutoFocus = () => {
        if (engine.lastMeasuredDistance > 0) {
            setOptics({ dofFocus: engine.lastMeasuredDistance });
        }
    };

    const handleDollyStart = () => {
        if (!engine.activeCamera) return;
        
        const state = useFractalStore.getState();
        let dist = 3.5;

        // MODE-AWARE DISTANCE SELECTION
        // For initial lock, we prioritize physical radius for Orbit Mode stability
        if (state.cameraMode === 'Orbit') {
            const radius = engine.activeCamera.position.length();
            if (radius > 0.001) {
                dist = radius;
            } else {
                dist = state.targetDistance || 3.5;
            }
        } else {
            // In Fly Mode, use the visual surface distance (Probe).
            const probeDist = engine.lastMeasuredDistance;
            if (probeDist > 0.0001 && probeDist < 900.0) {
                dist = probeDist;
            } else {
                dist = state.targetDistance || 3.5;
            }
        }
        
        dist = Math.max(0.001, dist);

        // Use standard utility for Unified State reading
        const unifiedPos = CameraUtils.getUnifiedFromEngine();
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(engine.activeCamera.quaternion);
        
        dollyStartRef.current = {
            fov: camFov,
            dist: dist,
            unifiedPos: { x: unifiedPos.x, y: unifiedPos.y, z: unifiedPos.z },
            forward: forward,
            quat: engine.activeCamera.quaternion.clone()
        };
    };

    const handleFovChange = (newFov: number) => {
        const updates: any = { camFov: newFov };

        if (dollyLocked && dollyStartRef.current) {
            const { fov: startFov, dist: startDist, unifiedPos: startUnified, forward, quat } = dollyStartRef.current;
            const oldFovRad = THREE.MathUtils.degToRad(startFov);
            const newFovRad = THREE.MathUtils.degToRad(newFov);
            
            // Calculate new distance to keep subject size constant
            const ratio = Math.tan(oldFovRad / 2) / Math.tan(newFovRad / 2);
            const targetDist = startDist * ratio;
            
            // Move Amount = Old Distance - New Distance
            // Positive moveAmount means moving BACKWARDS (away from subject)
            // But we add scaled Forward vector. Forward is -Z (looking at subject).
            // So to move backward, we SUBTRACT forward * amount?
            // Let's trace:
            // startDist = 10. targetDist = 20. (Zooming In, need to move back)
            // moveAmount = 10 - 20 = -10.
            // newPos = start + forward * (-10). 
            // Forward points TO subject. Adding negative forward moves AWAY. Correct.
            
            const moveAmount = startDist - targetDist;
            const shift = forward.clone().multiplyScalar(moveAmount);
            
            // Also update Focus Distance to keep target in focus
            updates.dofFocus = targetDist;
            
            // --- UNIFIED TELEPORT LOGIC ---
            // We use the "Fly Mode" style teleport for BOTH modes.
            // This resets the local camera to (0,0,0) and updates the Scene Offset.
            // This prevents OrbitControls from fighting the position update.
            // We pass 'targetDist' so Navigation can re-sync the Orbit Pivot to the correct depth.
            
            const newPos = new THREE.Vector3(startUnified.x, startUnified.y, startUnified.z).add(shift);
            
            CameraUtils.teleportPosition(
                newPos, 
                { x: quat.x, y: quat.y, z: quat.z, w: quat.w },
                targetDist // Critical: Update Orbit Pivot Distance
            );
            
            // Sync Store immediately so UI doesn't lag
            useFractalStore.setState({ targetDistance: targetDist });
        }
        
        setOptics(updates);

        // --- KEYFRAME RECORDING FOR SIDE EFFECTS ---
        // (FOV slider handles its own keyframe, but we must handle Focus & Camera Move)
        const { isRecording, captureCameraFrame, addKeyframe, addTrack, currentFrame, sequence, isPlaying } = useAnimationStore.getState();
        
        if (isRecording) {
            const interp = isPlaying ? 'Linear' : 'Bezier';
            
            // 1. Record Focus Distance Change
            if (updates.dofFocus !== undefined) {
                 const tid = 'optics.dofFocus';
                 if (!sequence.tracks[tid]) addTrack(tid, 'Focus Distance');
                 addKeyframe(tid, currentFrame, updates.dofFocus, interp);
            }

            // 2. Record Camera Move (Dolly)
            if (dollyLocked) {
                 captureCameraFrame(currentFrame, true, interp);
            }
        }
    };

    const handleFovKeyToggle = () => {
        if (dollyLocked) {
            const { currentFrame, captureCameraFrame, isPlaying } = useAnimationStore.getState();
            // Capture camera frame when keying FOV if locked, because the camera position is tied to the FOV
            captureCameraFrame(currentFrame, true, isPlaying ? 'Linear' : 'Bezier');
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {(dofStrength > 0.000001) && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button onClick={handleAutoFocus} label="Auto-Centre" />
                    <Button 
                        active={isPicking}
                        onClick={() => setInteractionMode(isPicking ? 'none' : 'picking_focus')}
                        label={isPicking ? "Picking..." : "Pick Focus"}
                        variant="success"
                    />
                </div>
            )}
            
            {isPerspective && (
                <div>
                     <Slider
                         label="Field of View"
                         value={camFov ?? 60}
                         min={10} max={150} step={1}
                         onChange={handleFovChange}
                         onDragStart={handleDollyStart}
                         overrideInputText={`${Math.round(camFov ?? 60)}°`}
                         trackId="optics.camFov"
                         onKeyToggle={handleFovKeyToggle}
                     />
                     <div>
                        <ToggleSwitch 
                            label="Dolly Link"
                            icon={<LinkIcon active={dollyLocked} />}
                            value={dollyLocked}
                            onChange={(v) => setDollyLocked(v)}
                        />
                     </div>
                </div>
            )}
        </div>
    );
};

// --- WIDGET 3: NAVIGATION CONTROLS ---
export const NavigationControls: React.FC<FeatureComponentProps> = () => {
    // Connect to Root Store State
    const cameraMode = useFractalStore(s => s.cameraMode);
    const sceneOffset = useFractalStore(s => s.sceneOffset);
    const cameraPos = useFractalStore(s => s.cameraPos);
    const cameraRot = useFractalStore(s => s.cameraRot);
    
    const setCameraMode = useFractalStore(s => s.setCameraMode);
    const optics = useFractalStore(s => s.optics);
    const isOrtho = optics && Math.abs(optics.camType - 1.0) < 0.1;

    // Use Utility to calculate Unified Coords and Rotations for display
    const unified = CameraUtils.getUnifiedPosition(cameraPos, sceneOffset);
    const rotDeg = CameraUtils.getRotationDegrees(cameraRot);

    return (
        <div className="flex flex-col gap-3">
             <div className={isOrtho ? 'opacity-50 pointer-events-none' : ''}>
                <ToggleSwitch 
                    value={cameraMode}
                    onChange={(v) => setCameraMode(v as any)}
                    options={[
                        { label: 'Orbit', value: 'Orbit' },
                        { label: 'Fly', value: 'Fly' }
                    ]}
                />
                {isOrtho && <p className="text-[9px] text-gray-500 mt-1 text-center">Fly Mode disabled in Orthographic view</p>}
            </div>
            
            {cameraMode === 'Fly' && (
                <AutoFeaturePanel featureId="navigation" groupFilter="movement" />
            )}

            <div data-help-id="cam.position">
                <Vector3Input
                    label="Absolute Position"
                    value={unified}
                    onChange={(v) => CameraUtils.teleportPosition(v)}
                    step={0.1}
                    min={-Infinity}
                    max={Infinity}
                    interactionMode="camera"
                    trackKeys={['camera.unified.x', 'camera.unified.y', 'camera.unified.z']}
                    trackLabels={['Position X', 'Position Y', 'Position Z']}
                />
            </div>
            
            <div data-help-id="cam.rotation">
                <Vector3Input
                    label="Rotation (Degrees)"
                    value={rotDeg}
                    onChange={CameraUtils.teleportRotation}
                    step={1}
                    min={-180}
                    max={180}
                    interactionMode="camera"
                    // Pass the track keys for recording
                    trackKeys={['camera.rotation.x', 'camera.rotation.y', 'camera.rotation.z']}
                    trackLabels={['Rotation X', 'Rotation Y', 'Rotation Z']}
                    // Critical: Enable conversion so UI shows Degrees but Store gets Radians
                    convertRadToDeg={true}
                />
            </div>
        </div>
    );
};
