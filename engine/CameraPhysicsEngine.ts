
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { CameraController } from './controllers/CameraController';
import { InputManager } from './InputManager';
import { FractalEvents, FRACTAL_EVENTS } from './FractalEvents';
import { engine } from './FractalEngine';
import { useFractalStore } from '../store/fractalStore';
import { useAnimationStore } from '../store/animationStore';
import { CameraMode, CameraState } from '../types';

export class CameraPhysicsEngine {
    private camera: THREE.PerspectiveCamera | null = null;
    private domElement: HTMLElement | null = null;
    
    private orbitControls: OrbitControls | null = null;
    private flyController: CameraController;
    private inputManager: InputManager;
    
    // State
    private mode: CameraMode = 'Orbit';
    private isLocked: boolean = false;
    private distEstimate: number = 3.5;
    private zoomSensitivity: number = 1.0;
    
    // Internal Cache
    private lastPos = new THREE.Vector3();
    private lastRot = new THREE.Quaternion();
    private orbitTarget = new THREE.Vector3();

    constructor() {
        this.flyController = new CameraController();
        this.inputManager = new InputManager();
        
        // Listen for External Teleports (Undo/Presets) to sync orbit target
        FractalEvents.on(FRACTAL_EVENTS.CAMERA_TELEPORT, (s) => this.handleTeleport(s));
        FractalEvents.on(FRACTAL_EVENTS.CAMERA_SNAP, () => this.handleSnap());
    }

    public init(camera: THREE.Camera, domElement: HTMLElement) {
        this.camera = camera as THREE.PerspectiveCamera;
        this.domElement = domElement;
        
        this.inputManager.connect(domElement);
        
        // Init Orbit Controls (Disabled by default, enabled if mode=Orbit)
        this.orbitControls = new OrbitControls(this.camera, this.domElement);
        this.orbitControls.enableDamping = false;
        this.orbitControls.enableZoom = true;
        this.orbitControls.enabled = (this.mode === 'Orbit');
        
        // Initial Sync
        this.syncOrbitTarget();
        this.updateSettingsFromStore();
    }

    public dispose() {
        this.inputManager.disconnect();
        this.orbitControls?.dispose();
        this.orbitControls = null;
        this.camera = null;
    }
    
    public setMode(mode: CameraMode) {
        if (this.mode === mode) return;
        this.mode = mode;
        
        // Mode Switch Logic
        if (mode === 'Fly') {
            if (this.orbitControls) this.orbitControls.enabled = false;
            
            // Absorb offset for smooth fly transition
            if (this.camera) {
                FractalEvents.emit(FRACTAL_EVENTS.CAMERA_ABSORB, { camera: this.camera });
                // Reset local physics
                this.flyController.reset();
            }
        } else {
            if (this.orbitControls) {
                this.orbitControls.enabled = true;
                this.syncOrbitTarget();
            }
        }
    }
    
    public setLock(locked: boolean) {
        this.isLocked = locked;
        if (this.orbitControls) {
            this.orbitControls.enabled = !locked && (this.mode === 'Orbit');
        }
    }
    
    public setDistanceEstimate(d: number) {
        // Valid check
        if (d > 0 && d < 1000) {
            this.distEstimate = d;
            // Update Zoom Sensitivity dynamically
            if (this.camera && this.orbitControls) {
                 const dPivot = this.camera.position.distanceTo(this.orbitControls.target);
                 if (dPivot > 1e-8) {
                     this.zoomSensitivity = Math.max(0.001, (d / dPivot) * 1.25);
                 }
            }
        }
    }

    public update(delta: number) {
        if (!this.camera || !this.domElement) return;
        
        // 0. Update Settings
        this.updateSettingsFromStore();
        
        const inputs = this.inputManager.state;
        const isActive = this.inputManager.isActive();

        // 1. Handle Scroll (Speed / Zoom)
        if (inputs.scrollDelta !== 0) {
            this.handleScroll(inputs.scrollDelta);
            inputs.scrollDelta = 0; // Consume event
        }
        
        // 2. Physics Update
        if (!this.isLocked) {
            if (this.mode === 'Fly') {
                const store = useFractalStore.getState();
                const nav = store.navigation;
                
                this.flyController.update(
                    this.camera,
                    delta,
                    {
                        move: inputs.move,
                        look: inputs.joystickLook,
                        moveJoy: inputs.joystickMove,
                        isDragging: inputs.mouse.isDragging,
                        dragDelta: { x: inputs.mouse.deltaX, y: inputs.mouse.deltaY },
                        invertY: store.invertY
                    },
                    {
                        baseSpeed: nav.flySpeed,
                        distEstimate: this.distEstimate,
                        autoSlow: nav.autoSlow
                    }
                );
            } else if (this.mode === 'Orbit' && this.orbitControls) {
                // Apply Zoom Sensitivity
                this.orbitControls.zoomSpeed = this.zoomSensitivity;
                
                // Manual Roll support in Orbit Mode
                // OrbitControls handles position/quat, but we can pre-rotate UP vector
                const roll = (inputs.move.rollLeft ? 1 : 0) + (inputs.move.rollRight ? -1 : 0);
                if (roll !== 0) {
                    const fwd = new THREE.Vector3(); 
                    this.camera.getWorldDirection(fwd);
                    this.camera.up.applyAxisAngle(fwd, -roll * 2.0 * delta).normalize();
                }
                
                this.orbitControls.update();
                
                // Sync offset if Orbit moved center
                const shift = this.orbitControls.target.clone();
                if (shift.lengthSq() > 1e-12) {
                     FractalEvents.emit(FRACTAL_EVENTS.OFFSET_SHIFT, { x: shift.x, y: shift.y, z: shift.z });
                     this.camera.position.sub(shift);
                     this.camera.updateMatrixWorld();
                     this.orbitControls.target.set(0, 0, 0);
                }
            }
        }
        
        // 3. Check for Movement & Sync Store
        this.checkMovement(isActive);
    }
    
    private handleScroll(delta: number) {
        const state = useFractalStore.getState();
        // Ortho Mode
        if (state.optics.camType === 1.0) {
             const next = state.optics.orthoScale * (1 + delta * -0.1);
             state.setOptics({ orthoScale: Math.max(1e-5, next) });
             return;
        }
        
        // Fly Speed
        if (this.mode === 'Fly') {
            const current = state.navigation.flySpeed;
            const step = current < 0.05 ? 0.005 : 0.02;
            const next = Math.max(0.001, Math.min(1.0, current + (delta * -1 * step)));
            state.setNavigation({ flySpeed: next });
        }
    }

    private updateSettingsFromStore() {
        const state = useFractalStore.getState();
        const animState = useAnimationStore.getState();
        
        // Sync Mode
        if (state.cameraMode !== this.mode) {
            this.setMode(state.cameraMode);
        }
        
        // Check Locks
        const isLocked = state.isGizmoDragging || state.isPickingFocus || state.isSelectingRegion || state.isPickingJulia;
        const isAnimLocked = (animState.isPlaying && (!animState.isRecording || !animState.recordCamera)) || animState.isScrubbing;
        
        this.setLock(isLocked || isAnimLocked);
    }

    private syncOrbitTarget(distOverride?: number) {
        if (!this.camera || !this.orbitControls) return;
        
        this.camera.updateMatrixWorld();
        // Sync UP to remove roll drift
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.camera.up.copy(currentUp);

        let dist = distOverride || this.distEstimate;
        // Safety Fallback
        if (dist <= 1e-7 || dist > 1000.0) dist = useFractalStore.getState().targetDistance || 3.5;
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.orbitControls.target.copy(this.camera.position).addScaledVector(forward, dist);
        this.orbitControls.update();
    }
    
    private handleTeleport(s: CameraState) {
        this.flyController.reset();
        if (this.mode === 'Orbit') {
            this.syncOrbitTarget(s.targetDistance);
        }
    }
    
    private handleSnap() {
        if (this.mode === 'Orbit') this.syncOrbitTarget();
        else if (this.mode === 'Fly' && this.camera) {
             FractalEvents.emit(FRACTAL_EVENTS.CAMERA_ABSORB, { camera: this.camera });
        }
    }
    
    private checkMovement(isActive: boolean) {
        if (!this.camera) return;
        
        const posChanged = this.camera.position.distanceToSquared(this.lastPos) > 1e-12;
        const rotChanged = this.camera.quaternion.angleTo(this.lastRot) > 1e-11;
        
        // Sync Engine interaction flag
        if (isActive || posChanged || rotChanged) {
             engine.update(this.camera, 0, {}, true); // Mark interacting=true
             
             // Update Store (Throttled by React, but we push values)
             // We can use a timeout to not spam Zustand
             // For now, let's just update refs in engine if needed or let the existing loop handle it?
             // Actually Navigation.tsx used to do useFractalStore.setState. We should do that here but throttled.
        } else {
             engine.update(this.camera, 0, {}, false);
        }
        
        // Record Keys
        const animState = useAnimationStore.getState();
        if (isActive && (posChanged || rotChanged) && animState.isRecording && animState.recordCamera) {
            animState.captureCameraFrame(animState.currentFrame, true, animState.isPlaying ? 'Linear' : 'Bezier');
        }
        
        this.lastPos.copy(this.camera.position);
        this.lastRot.copy(this.camera.quaternion);
        
        // Tell UI we are interacting (for HUD visibility)
        animState.setIsCameraInteracting(isActive);
    }
}

export const cameraPhysicsEngine = new CameraPhysicsEngine();
