
import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { FractalStoreState, FractalActions, PreciseVector3, CameraState, SavedCamera } from '../../types';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { engine } from '../../engine/FractalEngine';
import { registry } from '../../engine/FractalRegistry';
import { VirtualSpace } from '../../engine/PrecisionMath';
import { nanoid } from 'nanoid';

// Predefined Main Camera to ensure a valid slot exists on startup
const INITIAL_CAM: SavedCamera = {
    id: 'cam_main',
    label: 'Main Camera',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    sceneOffset: { x: 0, y: 0, z: 3.5, xL: 0, yL: 0, zL: 0 },
    targetDistance: 3.5,
    optics: { camType: 0, camFov: 60, orthoScale: 2, dofStrength: 0, dofFocus: 10 }
};

export type CameraSlice = Pick<FractalStoreState,
    'cameraMode' | 'sceneOffset' | 'undoStack' | 'redoStack' | 'cameraPos' | 'cameraRot' | 'targetDistance' |
    'savedCameras' | 'activeCameraId'
> & Pick<FractalActions,
    'setCameraMode' | 'setSceneOffset' | 'resetCamera' | 'undoCamera' | 'redoCamera' |
    'addCamera' | 'updateCamera' | 'deleteCamera' | 'selectCamera' 
>;

export const createCameraSlice: StateCreator<FractalStoreState & FractalActions, [["zustand/subscribeWithSelector", never]], [], CameraSlice> = (set, get) => ({
    cameraMode: 'Orbit', 
    sceneOffset: { x: 0, y: 0, z: 1, xL: 0, yL: 0, zL: -0.24751033974403658 },
    cameraPos: { x: 0, y: 0, z: 0 }, 
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
    targetDistance: 3.5,
    undoStack: [], redoStack: [],
    
    // Initialize with Main Camera
    savedCameras: [INITIAL_CAM],
    activeCameraId: 'cam_main',

    setCameraMode: (v) => set({ cameraMode: v }),
    
    setSceneOffset: (v) => {
        const precise: PreciseVector3 = {
            x: v.x, y: v.y, z: v.z,
            xL: (v as PreciseVector3).xL || 0,
            yL: (v as PreciseVector3).yL || 0,
            zL: (v as PreciseVector3).zL || 0
        };
        engine.virtualSpace.state = precise;
        set({ sceneOffset: engine.virtualSpace.state });
        FractalEvents.emit('offset_set', engine.virtualSpace.state);
    },

    // --- CAMERA MANAGER ACTIONS ---

    addCamera: (nameOverride?: string) => {
        const s = get();
        // Capture Unified State from Engine (Source of Truth)
        let unified: CameraState;
        
        if (engine.activeCamera) {
            unified = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, engine.lastMeasuredDistance);
        } else {
            unified = {
                position: s.cameraPos,
                rotation: s.cameraRot,
                sceneOffset: s.sceneOffset,
                targetDistance: s.targetDistance
            };
        }
        
        // We still capture optics state because it's part of the saved data, 
        // but we don't manipulate it.
        const optics = { ...(s as any).optics };
        
        const name = nameOverride || `Camera ${s.savedCameras.length + 1}`;

        const newCam: SavedCamera = {
            id: nanoid(),
            label: name,
            position: unified.position,
            rotation: unified.rotation,
            sceneOffset: unified.sceneOffset,
            targetDistance: unified.targetDistance,
            optics: optics 
        };

        set(state => ({
            savedCameras: [...state.savedCameras, newCam],
            activeCameraId: newCam.id
        }));
    },

    updateCamera: (id, updates) => {
        set(state => ({
            savedCameras: state.savedCameras.map(c => 
                c.id === id ? { ...c, ...updates } : c
            )
        }));
    },

    deleteCamera: (id) => {
        set(state => {
            const newCams = state.savedCameras.filter(c => c.id !== id);
            return {
                savedCameras: newCams,
                activeCameraId: state.activeCameraId === id ? null : state.activeCameraId
            };
        });
    },

    selectCamera: (id) => {
        const s = get();
        const oldId = s.activeCameraId;
        
        // Force-Save the OUTGOING camera state if needed
        if (oldId && engine.activeCamera) {
            const freshState = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, engine.lastMeasuredDistance);
            
            if (s.savedCameras.some(c => c.id === oldId)) {
                set(state => ({
                    savedCameras: state.savedCameras.map(c => 
                        c.id === oldId ? { 
                            ...c, 
                            position: freshState.position,
                            rotation: freshState.rotation,
                            sceneOffset: freshState.sceneOffset,
                            targetDistance: freshState.targetDistance
                        } : c
                    )
                }));
            }
        }

        if (id === null) {
            set({ activeCameraId: null });
            return;
        }
        
        // Refresh state
        const sAfterSave = get();
        const cam = sAfterSave.savedCameras.find(c => c.id === id);
        if (!cam) return;

        // 1. Teleport Engine (Unified State)
        if (engine.activeCamera) {
            engine.virtualSpace.applyCameraState(engine.activeCamera, cam);
            FractalEvents.emit('camera_teleport', cam);
        }

        // 2. Update Store
        set({
            activeCameraId: id,
            cameraPos: cam.position,
            cameraRot: cam.rotation,
            sceneOffset: cam.sceneOffset,
            targetDistance: cam.targetDistance || 3.5,
        });
        
        // 3. Dispatch Optics update if they differ
        // This keeps the slice decoupled: we assume the global store has a 'setOptics' action
        // from the Optics feature.
        if (cam.optics) {
            const setOptics = (s as any).setOptics;
            if (setOptics) setOptics(cam.optics);
        }
        
        engine.resetAccumulation();
    },

    // --- STANDARD ACTIONS ---

    resetCamera: () => { 
        set({ activeCameraId: null });
        
        const activeFormula = get().formula;
        const def = registry.get(activeFormula);
        const preset = def?.defaultPreset;
        
        // Defaults
        const defOffset = preset?.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        const defPos = preset?.cameraPos || { x: 0, y: 0, z: 3.5 }; 
        const defRot = preset?.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
        const defDist = preset?.targetDistance || 3.5;

        // Note: Optics reset is now handled by the UI or should be handled by a meta-action.
        // We strictly reset Transform here.

        const totalX = defOffset.x + defOffset.xL + defPos.x;
        const totalY = defOffset.y + defOffset.yL + defPos.y;
        const totalZ = defOffset.z + defOffset.zL + defPos.z;
        
        const sX = VirtualSpace.split(totalX);
        const sY = VirtualSpace.split(totalY);
        const sZ = VirtualSpace.split(totalZ);
        
        const newOffset = { 
            x: sX.high, y: sY.high, z: sZ.high, 
            xL: sX.low, yL: sY.low, zL: sZ.low 
        };

        get().setSceneOffset(newOffset); 
        set({ 
            cameraPos: { x: 0, y: 0, z: 0 }, 
            cameraRot: defRot, 
            targetDistance: defDist 
        });

        if (engine.activeCamera) { 
            engine.activeCamera.position.set(0, 0, 0); 
            engine.activeCamera.quaternion.set(defRot.x, defRot.y, defRot.z, defRot.w);
            engine.activeCamera.updateMatrixWorld();
            
            engine.virtualSpace.state = newOffset;
            
            const resetState: CameraState = {
                position: { x: 0, y: 0, z: 0 },
                rotation: defRot,
                sceneOffset: newOffset,
                targetDistance: defDist
            };
            
            FractalEvents.emit('reset_accum', undefined); 
            FractalEvents.emit('camera_teleport', resetState);
        }
    },

    undoCamera: () => { 
        const { undoStack, redoStack } = get(); 
        if (undoStack.length === 0) return; 
        
        const prev = undoStack[undoStack.length - 1]; 
        
        if (engine.activeCamera) { 
            const current = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, get().targetDistance);
            engine.virtualSpace.applyCameraState(engine.activeCamera, prev);
            
            if (prev.sceneOffset) {
                set({ sceneOffset: prev.sceneOffset });
            }
            
            set({ 
                cameraPos: prev.position,
                cameraRot: prev.rotation,
                targetDistance: prev.targetDistance || 3.5,
                redoStack: [...redoStack, current], 
                undoStack: undoStack.slice(0, -1) 
            }); 
            
            FractalEvents.emit('reset_accum', undefined); 
            FractalEvents.emit('camera_teleport', prev);
        } 
    },
    
    redoCamera: () => { 
        const { undoStack, redoStack } = get(); 
        if (redoStack.length === 0) return; 
        
        const next = redoStack[redoStack.length - 1]; 
        
        if (engine.activeCamera) { 
            const current = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera, get().targetDistance);
            engine.virtualSpace.applyCameraState(engine.activeCamera, next);
            
            if (next.sceneOffset) {
                set({ sceneOffset: next.sceneOffset });
            }

            set({ 
                cameraPos: next.position,
                cameraRot: next.rotation,
                targetDistance: next.targetDistance || 3.5,
                undoStack: [...undoStack, current], 
                redoStack: redoStack.slice(0, -1) 
            }); 
            
            FractalEvents.emit('reset_accum', undefined); 
            FractalEvents.emit('camera_teleport', next);
        } 
    }
});
