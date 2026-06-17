
import React, { useState, useRef } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { useAnimationStore } from '../../../store/animationStore';
import { captureCameraKeyFrame } from '../../../engine/animation/cameraKeyRegistry';
import { getProxy } from '../../engine/worker/WorkerProxy';
const engine = getProxy();
import { FeatureComponentProps } from '../../../components/registry/ComponentRegistry';
import Histogram from '../../../components/Histogram';
import ToggleSwitch from '../../../components/ToggleSwitch';
import Slider from '../../../components/Slider';
import Button from '../../../components/Button';
import { Vector3Input } from '../../../components/vector-input';
import { LinkIcon } from '../../../components/Icons';
import * as THREE from 'three';
import { FractalEvents } from '../../../engine/FractalEvents';
import { AutoFeaturePanel } from '../../../components/AutoFeaturePanel';
import { CameraUtils } from '../../utils/CameraUtils';
import { getViewportCamera } from '../../../engine/worker/ViewportRefs';

// --- WIDGET 1: COLOR GRADING HISTOGRAM ---
export const ColorGradingHistogram: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const data = useEngineStore(s => s.sceneHistogramData);
    const trigger = useEngineStore(s => s.sceneHistogramTrigger); 
    const refresh = useEngineStore(s => s.refreshSceneHistogram);
    
    // Access Live Modulations
    const liveModulations = useEngineStore(s => s.liveModulations);
    
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
    
    const interactionMode = useEngineStore(s => s.interactionMode);
    const setInteractionMode = useEngineStore(s => s.setInteractionMode);
    const focusLock = useEngineStore(s => s.focusLock);
    const setFocusLock = useEngineStore(s => s.setFocusLock);

    const isPicking = interactionMode === 'picking_focus';

    const [dollyLocked, setDollyLocked] = useState(true);
    const dollyStartRef = useRef<any>(null);

    const isPerspective = Math.abs((camType ?? 0) - 0.0) < 0.1;

    const handleFocusLockToggle = (v: boolean) => {
        setFocusLock(v);
        // Immediately sync on enable
        if (v && engine.lastMeasuredDistance > 0) {
            setOptics({ dofFocus: engine.lastMeasuredDistance });
        }
    };

    // Capture the camera's current pose + measured surface distance, keyed
    // off the *current* FOV. Used both by the slider's drag-start hook
    // (stable reference for the duration of a drag) and inline at the top
    // of handleFovChange when no drag is in progress (typed input, keyboard,
    // animation scrub) — without the inline path, a stale ref from the last
    // drag would teleport the camera back to where that drag started.
    const captureDollyStart = (fovAtMoment: number) => {
        const cam = getViewportCamera();
        if (!cam) return null;

        const state = useEngineStore.getState();

        // Use center-screen surface distance (measured by worker every 3 frames).
        // Correct for both Orbit and Fly mode — actual distance to the
        // visible surface, not the orbit radius from origin.
        const probeDist = engine.lastMeasuredDistance;
        let dist = (probeDist > 0.0001 && probeDist < 900.0)
            ? probeDist
            : (state.targetDistance || 3.5);
        dist = Math.max(0.001, dist);

        const unifiedPos = CameraUtils.getUnifiedFromEngine();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

        return {
            fov: fovAtMoment,
            dist,
            unifiedPos: { x: unifiedPos.x, y: unifiedPos.y, z: unifiedPos.z },
            forward,
            quat: cam.quaternion.clone(),
        };
    };

    const handleDollyStart = () => {
        dollyStartRef.current = captureDollyStart(camFov ?? 60);
    };

    const handleDollyEnd = () => {
        // Clear so the next non-drag FOV change captures a fresh reference
        // instead of dollying from this drag's start position.
        dollyStartRef.current = null;
    };

    const handleFovChange = (newFov: number) => {
        const updates: any = { camFov: newFov };

        // Lazily capture if no drag is in progress — covers typed input,
        // keyboard increments, animation scrub. Uses the CURRENT FOV
        // (camFov) as the start so the dolly delta is computed against
        // the camera's current pose, not a stale earlier one.
        if (dollyLocked && !dollyStartRef.current) {
            dollyStartRef.current = captureDollyStart(camFov ?? 60);
        }

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
            useEngineStore.setState({ targetDistance: targetDist });
        }
        
        setOptics(updates);

        // --- KEYFRAME RECORDING FOR SIDE EFFECTS ---
        // (FOV slider handles its own keyframe, but we must handle Focus & Camera Move)
        const { isRecording, addKeyframe, addTrack, currentFrame, sequence, isPlaying } = useAnimationStore.getState();

        if (isRecording) {
            const interp: 'Linear' | 'Bezier' = isPlaying ? 'Linear' : 'Bezier';

            // 1. Record Focus Distance Change
            if (updates.dofFocus !== undefined) {
                 const tid = 'optics.dofFocus';
                 if (!sequence.tracks[tid]) addTrack(tid, 'Focus Distance');
                 addKeyframe(tid, currentFrame, updates.dofFocus, interp);
            }

            // 2. Record Camera Move (Dolly) — single capture path via
            //    cameraKeyRegistry; host-registered fn (engine-gmt's
            //    captureGmtCameraKeyFrame) reads sceneOffset + rotation.
            if (dollyLocked) {
                 captureCameraKeyFrame(currentFrame, { skipSnapshot: true, interpolation: interp });
            }
        }
    };

    const handleFovKeyToggle = () => {
        if (dollyLocked) {
            const { currentFrame, isPlaying } = useAnimationStore.getState();
            // Capture camera frame when keying FOV if locked, because the camera position is tied to the FOV
            captureCameraKeyFrame(currentFrame, { skipSnapshot: true, interpolation: isPlaying ? 'Linear' : 'Bezier' });
        }
    };

    return (
        <div className="flex flex-col">
            {isPerspective && (
                <div>
                     <Slider
                         label="Field of View"
                         value={camFov ?? 60}
                         min={10} max={150} step={1}
                         onChange={handleFovChange}
                         onDragStart={handleDollyStart}
                         onDragEnd={handleDollyEnd}
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

// --- WIDGET 2B: DOF FOCUS CONTROLS (Focus Lock & Pick) ---
export const OpticsDofControls: React.FC<FeatureComponentProps> = ({ sliceState, actions }) => {
    const setOptics = (actions as any).setOptics;
    const interactionMode = useEngineStore(s => s.interactionMode);
    const setInteractionMode = useEngineStore(s => s.setInteractionMode);
    const focusLock = useEngineStore(s => s.focusLock);
    const setFocusLock = useEngineStore(s => s.setFocusLock);
    const isPicking = interactionMode === 'picking_focus';

    const handleFocusLockToggle = (v: boolean) => {
        setFocusLock(v);
        if (v && engine.lastMeasuredDistance > 0) {
            setOptics({ dofFocus: engine.lastMeasuredDistance });
        }
    };

    return (
        <div className="grid grid-cols-2 gap-px p-px">
            <Button
                active={focusLock}
                onClick={() => handleFocusLockToggle(!focusLock)}
                label={focusLock ? "Lock On" : "Focus Lock"}
                variant="primary"
            />
            <Button
                active={isPicking}
                onClick={() => setInteractionMode(isPicking ? 'none' : 'picking_focus')}
                label={isPicking ? "Picking..." : "Pick Focus"}
                variant="success"
            />
        </div>
    );
};

// --- SHARED: CAMERA POSITION/ROTATION DISPLAY ---
// Used by both NavigationControls (Scene tab) and CameraManagerPanel
export const CameraPositionDisplay: React.FC = () => {
    const sceneOffset = useEngineStore(s => s.sceneOffset);
    const cameraRot = useEngineStore(s => s.cameraRot);

    // World position lives entirely in sceneOffset (camera is always at origin)
    const unified = CameraUtils.getUnifiedPosition({ x: 0, y: 0, z: 0 }, sceneOffset);
    const rotDeg = CameraUtils.getRotationDegrees(cameraRot);

    return (
        <>
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
                    trackKeys={['camera.rotation.x', 'camera.rotation.y', 'camera.rotation.z']}
                    trackLabels={['Rotation X', 'Rotation Y', 'Rotation Z']}
                    convertRadToDeg={true}
                />
            </div>
        </>
    );
};

// --- WIDGET 3: NAVIGATION CONTROLS ---
export const NavigationControls: React.FC<FeatureComponentProps> = () => {
    const cameraMode = useEngineStore(s => s.cameraMode);
    const setCameraMode = useEngineStore(s => s.setCameraMode);
    const optics = useEngineStore(s => s.optics);
    const isOrtho = optics && Math.abs(optics.camType - 1.0) < 0.1;

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

            <CameraPositionDisplay />
        </div>
    );
};
