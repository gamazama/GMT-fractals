
import * as THREE from 'three';
import { engine } from '../engine/FractalEngine';
import { VirtualSpace } from '../engine/PrecisionMath';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { PreciseVector3 } from '../types';

/**
 * Centralized utility for handling Unified Camera Coordinates.
 * Bridges the gap between the "Split-Float" engine logic and the "Single-Vector" UI sliders.
 */
export const CameraUtils = {
    
    /**
     * Calculates the Unified Position (World Offset + Local Position).
     * Useful for UI sliders that need to show a single absolute coordinate.
     * 
     * @param localPos The local camera position (Three.js Vector3)
     * @param offset The high-precision scene offset
     */
    getUnifiedPosition: (localPos: {x:number, y:number, z:number}, offset: PreciseVector3): THREE.Vector3 => {
        return new THREE.Vector3(
            offset.x + offset.xL + localPos.x,
            offset.y + offset.yL + localPos.y,
            offset.z + offset.zL + localPos.z
        );
    },

    /**
     * Helper to get the current Unified Position directly from the Engine.
     * Use this in non-reactive contexts (Animation loop, Export).
     */
    getUnifiedFromEngine: (): THREE.Vector3 => {
        if (!engine.activeCamera) return new THREE.Vector3();
        return CameraUtils.getUnifiedPosition(engine.activeCamera.position, engine.sceneOffset);
    },

    /**
     * Helper to get the current Rotation directly from the Engine.
     * Bypasses the store's debounce lag during rapid interactions.
     */
    getRotationFromEngine: (): THREE.Quaternion => {
        if (engine.activeCamera) return engine.activeCamera.quaternion.clone();
        return new THREE.Quaternion();
    },

    /**
     * Helper to get the current Orbit Distance (Camera Local Length) directly from the Engine.
     * Returns null if camera is at origin (e.g. Fly Mode reset).
     */
    getDistanceFromEngine: (): number | null => {
        if (engine.activeCamera) {
             const len = engine.activeCamera.position.length();
             if (len > 0.001) return len;
        }
        return null;
    },

    /**
     * Converts a Quaternion to Euler Degrees for UI sliders.
     */
    getRotationDegrees: (quat: {x:number, y:number, z:number, w:number}): THREE.Vector3 => {
        const q = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
        const euler = new THREE.Euler().setFromQuaternion(q);
        return new THREE.Vector3(
            THREE.MathUtils.radToDeg(euler.x),
            THREE.MathUtils.radToDeg(euler.y),
            THREE.MathUtils.radToDeg(euler.z)
        );
    },

    /**
     * Teleports the camera to a specific Unified Coordinate.
     * Handles the complex logic of splitting the float into High/Low precision parts
     * and resetting the local camera to (0,0,0) (The Treadmill).
     * 
     * @param targetDistance Optional. Sets the Orbit Radius / Focus distance.
     */
    teleportPosition: (unified: THREE.Vector3, currentRot?: {x:number, y:number, z:number, w:number}, targetDistance?: number) => {
        // 1. Split the unified coordinate into High/Low components
        const sX = VirtualSpace.split(unified.x);
        const sY = VirtualSpace.split(unified.y);
        const sZ = VirtualSpace.split(unified.z);

        // 2. Prepare Payload
        // Note: We reset local position to 0,0,0 and put everything into offset
        const payload: any = {
            position: { x: 0, y: 0, z: 0 },
            sceneOffset: { 
                x: sX.high, y: sY.high, z: sZ.high, 
                xL: sX.low, yL: sY.low, zL: sZ.low 
            }
        };

        // 3. Preserve Rotation if not provided
        if (currentRot) {
            payload.rotation = currentRot;
        } else if (engine.activeCamera) {
            const q = engine.activeCamera.quaternion;
            payload.rotation = { x: q.x, y: q.y, z: q.z, w: q.w };
        }
        
        if (targetDistance !== undefined) {
            payload.targetDistance = targetDistance;
        }

        // 4. Emit Event
        FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, payload);
    },

    /**
     * Sets the camera rotation from Euler Degrees.
     */
    teleportRotation: (deg: THREE.Vector3) => {
        // 1. Safe Check
        if (isNaN(deg.x) || isNaN(deg.y) || isNaN(deg.z)) return;

        // 2. Convert to Quaternion
        const newEuler = new THREE.Euler(
            THREE.MathUtils.degToRad(deg.x),
            THREE.MathUtils.degToRad(deg.y),
            THREE.MathUtils.degToRad(deg.z)
        );
        const newQuat = new THREE.Quaternion().setFromEuler(newEuler);

        // 3. Get Current Unified Position to maintain it
        // We must re-submit the position because camera_teleport replaces the whole state
        const currentPos = CameraUtils.getUnifiedFromEngine();
        const sX = VirtualSpace.split(currentPos.x);
        const sY = VirtualSpace.split(currentPos.y);
        const sZ = VirtualSpace.split(currentPos.z);

        // 4. Emit
        FractalEvents.emit(FRACTAL_EVENTS.CAMERA_TELEPORT, {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w },
            sceneOffset: { 
                x: sX.high, y: sY.high, z: sZ.high, 
                xL: sX.low, yL: sY.low, zL: sZ.low 
            }
        });
    }
};
