
import { StateCreator } from 'zustand';
import * as THREE from 'three';
import { FractalStoreState, FractalActions, PreciseVector3, CameraState } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { engine } from '../../engine/FractalEngine';
import { registry } from '../../engine/FractalRegistry';

export type CameraSlice = Pick<FractalStoreState,
    'cameraMode' | 'sceneOffset' | 'undoStack' | 'redoStack' | 'cameraPos' | 'cameraRot' | 'targetDistance'
> & Pick<FractalActions,
    'setCameraMode' | 'setSceneOffset' | 'resetCamera' | 'undoCamera' | 'redoCamera'
>;

export const createCameraSlice: StateCreator<FractalStoreState & FractalActions, [["zustand/subscribeWithSelector", never]], [], CameraSlice> = (set, get) => ({
    cameraMode: 'Orbit', 
    sceneOffset: { x: 0, y: 0, z: 1, xL: 0, yL: 0, zL: -0.24751033974403658 },
    cameraPos: { x: 0, y: 0, z: 0 }, // DEFAULT TO ORIGIN
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
    targetDistance: 3.5,
    undoStack: [], redoStack: [],

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

    resetCamera: () => { 
        // Fetch default settings for current formula to restore correct centering
        const activeFormula = get().formula;
        const def = registry.get(activeFormula);
        const preset = def?.defaultPreset;
        
        const defOffset = preset?.sceneOffset || { x: 0, y: 0, z: 0, xL: 0, yL: 0, zL: 0 };
        get().setSceneOffset(defOffset); 
        
        if (engine.activeCamera) { 
            const defPos = preset?.cameraPos || { x: 0, y: 0, z: 0 }; 
            const defRot = preset?.cameraRot || { x: 0, y: 0, z: 0, w: 1 };
            const defDist = preset?.targetDistance || 3.5;

            set({ cameraPos: defPos, cameraRot: defRot, targetDistance: defDist });

            engine.activeCamera.position.set(defPos.x, defPos.y, defPos.z); 
            engine.activeCamera.quaternion.set(defRot.x, defRot.y, defRot.z, defRot.w);
            
            const resetState = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera);
            FractalEvents.emit('reset_accum', undefined); 
            FractalEvents.emit('camera_teleport', resetState);
        } 
    },

    undoCamera: () => { 
        const { undoStack, redoStack } = get(); 
        if (undoStack.length === 0) return; 
        
        const prev = undoStack[undoStack.length - 1]; 
        
        if (engine.activeCamera) { 
            const current = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera);
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
            const current = engine.virtualSpace.getUnifiedCameraState(engine.activeCamera);
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
