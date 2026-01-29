
import * as THREE from 'three';
import { FractalEvents } from '../FractalEvents';

export interface MoveInputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    boost: boolean;
}

export interface JoystickInput {
    x: number;
    y: number;
}

export class CameraController {
    // Physics State
    private currentRotVelocity = new THREE.Vector3();
    private rollVelocity = 0;
    
    // Config
    private readonly ROTATION_SMOOTHING = 20.0;
    private readonly ROLL_SMOOTHING = 3.0; // Decay rate
    private readonly SENSITIVITY = 2.5;

    public reset() {
        this.currentRotVelocity.set(0, 0, 0);
        this.rollVelocity = 0;
    }

    private applyCurve(v: number): number {
        return Math.sign(v) * Math.pow(Math.abs(v), 2);
    }

    public update(
        camera: THREE.Camera,
        delta: number,
        inputs: {
            move: MoveInputState,
            look: JoystickInput,
            moveJoy: JoystickInput,
            isDragging: boolean,
            dragDelta: { x: number, y: number },
            invertY: boolean
        },
        settings: {
            baseSpeed: number,
            distEstimate: number,
            autoSlow: boolean
        }
    ): boolean {
        let didMove = false;

        // --- 1. LINEAR MOVEMENT ---
        const boost = inputs.move.boost ? 4.0 : 1.0;
        const targetSpeed = settings.autoSlow 
            ? Math.max(settings.distEstimate * settings.baseSpeed * boost, 1e-6) 
            : 2.0 * settings.baseSpeed * boost;

        const tv = new THREE.Vector3(0, 0, 0);
        
        // Keyboard
        if (inputs.move.forward) tv.z -= 1;
        if (inputs.move.backward) tv.z += 1;
        if (inputs.move.left) tv.x -= 1;
        if (inputs.move.right) tv.x += 1;
        if (inputs.move.up) tv.y += 1;
        if (inputs.move.down) tv.y -= 1;
        
        // Joystick
        const hasJoystickMove = Math.abs(inputs.moveJoy.x) > 0.01 || Math.abs(inputs.moveJoy.y) > 0.01;
        if (hasJoystickMove) { 
            tv.z -= this.applyCurve(inputs.moveJoy.y); 
            tv.x += this.applyCurve(inputs.moveJoy.x); 
        }

        if (tv.lengthSq() > 0) {
            // Apply Movement
            // Safety: Clamp delta to prevent massive jumps during lag spikes
            const safeDelta = Math.min(delta, 0.1);
            
            tv.normalize().multiplyScalar(targetSpeed * safeDelta);
            
            // Transform local direction to world space
            const mv = tv.clone().applyQuaternion(camera.quaternion);
            
            // Emit offset shift directly (Virtual Space logic)
            FractalEvents.emit('offset_shift', { x: mv.x, y: mv.y, z: mv.z });
            didMove = true;
        }

        // --- 2. ROTATIONAL MOVEMENT ---
        
        // Update Roll Momentum
        const targetRoll = inputs.move.rollLeft ? 1 : (inputs.move.rollRight ? -1 : 0);
        const rollAccel = targetRoll !== 0 ? 1.0 : this.ROLL_SMOOTHING;
        const rollFactor = 1.0 - Math.exp(-rollAccel * delta);
        
        this.rollVelocity += (targetRoll - this.rollVelocity) * rollFactor;
        if (targetRoll === 0 && Math.abs(this.rollVelocity) < 0.001) this.rollVelocity = 0;

        // Calculate Target Rotation Velocity
        const tr = new THREE.Vector3(0, 0, 0);
        const yFlip = inputs.invertY ? -1 : 1;
        const hasJoystickLook = Math.abs(inputs.look.x) > 0.01 || Math.abs(inputs.look.y) > 0.01;

        if (inputs.isDragging) {
            // Mouse Drag
            tr.y = -inputs.dragDelta.x * 2.0; 
            tr.x = inputs.dragDelta.y * 2.0 * yFlip; 
        } else if (hasJoystickLook) {
            // Joystick Look
            tr.y = -this.applyCurve(inputs.look.x) * 0.66;
            tr.x = this.applyCurve(inputs.look.y) * 0.66 * yFlip;
        }

        // Apply Roll
        tr.z = this.rollVelocity * 0.62;

        // Smoothing (Frame-rate independent)
        const safeDelta = Math.min(delta, 0.1);
        const rotSmoothFactor = 1.0 - Math.exp(-this.ROTATION_SMOOTHING * safeDelta);
        
        this.currentRotVelocity.lerp(tr, rotSmoothFactor);

        // Zero out to stop drift
        if (this.currentRotVelocity.lengthSq() < 1e-6) this.currentRotVelocity.set(0, 0, 0);

        // Apply to Camera
        if (this.currentRotVelocity.lengthSq() > 1e-8) {
            const v = this.currentRotVelocity;
            camera.rotateX(v.x * safeDelta * this.SENSITIVITY);
            camera.rotateY(v.y * safeDelta * this.SENSITIVITY);
            camera.rotateZ(v.z * safeDelta * this.SENSITIVITY);
            didMove = true;
        }

        return didMove;
    }
}
