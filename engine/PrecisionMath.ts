
import * as THREE from 'three';
import { PreciseVector3, CameraState } from '../types';
import { Uniforms } from './UniformNames';

export class VirtualSpace {
    private offset: PreciseVector3;
    private _rotMatrix = new THREE.Matrix4();
    private _camRight = new THREE.Vector3();
    private _camUp = new THREE.Vector3();
    private _camForward = new THREE.Vector3();
    private _visualVector = new THREE.Vector3();
    private _quatInverse = new THREE.Quaternion();
    private _relativePos = new THREE.Vector3();
    public smoothedPos = new THREE.Vector3();
    public smoothedQuat = new THREE.Quaternion();
    public smoothedFov: number = 60.0;
    private prevOffsetState: PreciseVector3;
    private isLocked = false;
    private isFirstFrame = true;

    constructor(initial: PreciseVector3 = { x:0, y:0, z:0, xL:0, yL:0, zL:0 }) {
        this.offset = { ...initial };
        this.prevOffsetState = { ...initial };
    }

    public get state(): PreciseVector3 { return { ...this.offset }; }
    public set state(v: PreciseVector3) {
        this.offset = { ...v };
        VirtualSpace.normalize(this.offset);
    }

    public static split(val: number): { high: number, low: number } {
        const high = Math.fround(val);
        const low = val - high;
        return { high, low };
    }

    public static normalize(so: PreciseVector3) {
        const THRESHOLD = 0.5;
        if (Math.abs(so.xL) > THRESHOLD) { const shift = Math.floor(so.xL + 0.5); so.x += shift; so.xL -= shift; }
        if (Math.abs(so.yL) > THRESHOLD) { const shift = Math.floor(so.yL + 0.5); so.y += shift; so.yL -= shift; }
        if (Math.abs(so.zL) > THRESHOLD) { const shift = Math.floor(so.zL + 0.5); so.z += shift; so.zL -= shift; }
    }

    public setFromUnified(x: number, y: number, z: number) {
        const sX = VirtualSpace.split(x);
        const sY = VirtualSpace.split(y);
        const sZ = VirtualSpace.split(z);
        this.offset.x = sX.high; this.offset.xL = sX.low;
        this.offset.y = sY.high; this.offset.yL = sY.low;
        this.offset.z = sZ.high; this.offset.zL = sZ.low;
        VirtualSpace.normalize(this.offset);
    }

    public move(dx: number, dy: number, dz: number) {
        this.offset.xL += dx; this.offset.yL += dy; this.offset.zL += dz;
        VirtualSpace.normalize(this.offset);
    }

    public absorbCamera(cameraPosition: THREE.Vector3) {
        this.offset.xL += cameraPosition.x; this.offset.yL += cameraPosition.y; this.offset.zL += cameraPosition.z;
        VirtualSpace.normalize(this.offset);
    }
    
    public resetSmoothing() {
        this.isFirstFrame = true;
        this.prevOffsetState = { ...this.offset };
        this.isLocked = false;
    }
    
    public updateSmoothing(targetCamera: THREE.Camera, targetFov: number, delta: number, isOrbit: boolean, snap: boolean, shouldSmooth: boolean) {
        if (!shouldSmooth && !snap && !this.isFirstFrame) {
            this.smoothedPos.copy(targetCamera.position);
            this.smoothedQuat.copy(targetCamera.quaternion);
            this.smoothedFov = targetFov;
            this.prevOffsetState = { ...this.offset };
            this.isLocked = true;
            return;
        }

        if (this.isFirstFrame || snap) {
            this.smoothedPos.copy(targetCamera.position);
            this.smoothedQuat.copy(targetCamera.quaternion);
            this.smoothedFov = targetFov;
            this.prevOffsetState = { ...this.offset };
            this.isFirstFrame = false;
            this.isLocked = false;
            return;
        }

        const cur = this.offset;
        const prev = this.prevOffsetState;
        
        if (prev.x !== cur.x || prev.y !== cur.y || prev.z !== cur.z ||
            prev.xL !== cur.xL || prev.yL !== cur.yL || prev.zL !== cur.zL) {
            
            const dx = (prev.x - cur.x) + (prev.xL - cur.xL);
            const dy = (prev.y - cur.y) + (prev.yL - cur.yL);
            const dz = (prev.z - cur.z) + (prev.zL - cur.zL);
            
            if (Math.abs(dx) > 10.0 || Math.abs(dy) > 10.0 || Math.abs(dz) > 10.0) {
                this.resetSmoothing();
                this.smoothedPos.copy(targetCamera.position);
                this.smoothedQuat.copy(targetCamera.quaternion);
                return;
            }

            this.smoothedPos.x += dx;
            this.smoothedPos.y += dy;
            this.smoothedPos.z += dz;
            this.prevOffsetState = { ...cur };
        }

        if (isOrbit) {
            this.smoothedPos.copy(targetCamera.position);
            this.smoothedQuat.copy(targetCamera.quaternion);
            this.smoothedFov = targetFov;
            // Sync offset state to prevent jumps when switching modes or shifting origin
            this.prevOffsetState = { ...this.offset };
        } else {
            const distSq = this.smoothedPos.distanceToSquared(targetCamera.position);
            const angleDiff = this.smoothedQuat.angleTo(targetCamera.quaternion);
            
            if (this.isLocked) { 
                if (distSq > 1.0e-18 || angleDiff > 1.0e-9) this.isLocked = false; 
            } else { 
                if (distSq < 1.0e-21 && angleDiff < 1.0e-11) this.isLocked = true; 
            }
            
            if (!this.isLocked) {
                const lambda = 40.0;
                const f = 1.0 - Math.exp(-lambda * delta);
                this.smoothedPos.lerp(targetCamera.position, f);
                this.smoothedQuat.slerp(targetCamera.quaternion, f);
                this.smoothedFov += (targetFov - this.smoothedFov) * f;
            } else {
                this.smoothedPos.copy(targetCamera.position);
                this.smoothedQuat.copy(targetCamera.quaternion);
                this.smoothedFov = targetFov;
            }
        }
    }

    public getUnifiedCameraState(camera: THREE.Camera, targetDistance: number): CameraState {
        const unifiedOffset = { ...this.offset };
        unifiedOffset.xL += camera.position.x;
        unifiedOffset.yL += camera.position.y;
        unifiedOffset.zL += camera.position.z;
        VirtualSpace.normalize(unifiedOffset);

        return {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w },
            sceneOffset: unifiedOffset,
            targetDistance: targetDistance > 0 ? targetDistance : 3.5
        };
    }
    
    public applyCameraState(camera: THREE.Camera, state: CameraState) {
        if (state.sceneOffset) {
            const baked = { ...state.sceneOffset };
            baked.xL += state.position.x;
            baked.yL += state.position.y;
            baked.zL += state.position.z;
            this.state = baked;
        }
        
        const rot = state.rotation;
        const qx = rot.x ?? (rot as any)._x ?? 0;
        const qy = rot.y ?? (rot as any)._y ?? 0;
        const qz = rot.z ?? (rot as any)._z ?? 0;
        const qw = rot.w ?? (rot as any)._w ?? 1;

        camera.position.set(0, 0, 0);
        camera.quaternion.set(qx, qy, qz, qw).normalize();
        
        const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        camera.up.copy(currentUp);

        camera.updateMatrixWorld();
        this.resetSmoothing();
        this.smoothedPos.set(0, 0, 0);
        this.smoothedQuat.copy(camera.quaternion);
    }

    public updateShaderUniforms(cameraPosition: THREE.Vector3, uniformHigh: THREE.Vector3, uniformLow: THREE.Vector3) {
        const totalX = this.offset.x + this.offset.xL + cameraPosition.x;
        const totalY = this.offset.y + this.offset.yL + cameraPosition.y;
        const totalZ = this.offset.z + this.offset.zL + cameraPosition.z;
        const highX = Math.fround(totalX);
        const highY = Math.fround(totalY);
        const highZ = Math.fround(totalZ);
        uniformHigh.set(highX, highY, highZ);
        uniformLow.set(totalX - highX, totalY - highY, totalZ - highZ);
    }

    public updateCameraBasis(camera: THREE.Camera, uniforms: { [key: string]: THREE.IUniform }, params?: { isOrtho: boolean, orthoScale: number }) {
        const cam = camera as THREE.PerspectiveCamera;
        this._rotMatrix.makeRotationFromQuaternion(cam.quaternion);
        const e = this._rotMatrix.elements;
        this._camRight.set(e[0], e[1], e[2]);
        this._camUp.set(e[4], e[5], e[6]);
        this._camForward.set(-e[8], -e[9], -e[10]);
        let width = 1.0; let height = 1.0;
        if (params && params.isOrtho) { height = params.orthoScale / 2.0; width = height * cam.aspect; }
        else { const tanFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5); height = tanFov; width = height * cam.aspect; }
        uniforms[Uniforms.CamBasisX].value.copy(this._camRight).multiplyScalar(width);
        uniforms[Uniforms.CamBasisY].value.copy(this._camUp).multiplyScalar(height);
        uniforms[Uniforms.CamForward].value.copy(this._camForward);
        uniforms[Uniforms.CameraPosition].value.set(0, 0, 0);
    }

    public getLightShaderVector(lightPos: {x:number, y:number, z:number}, isFixed: boolean, camera: THREE.Camera, targetVec: THREE.Vector3) {
        const so = this.offset;
        if (isFixed) {
            this._relativePos.set(lightPos.x, lightPos.y, lightPos.z).applyQuaternion(camera.quaternion);
            targetVec.copy(this._relativePos);
        } else {
            targetVec.set(
                lightPos.x - (so.x + so.xL) - camera.position.x,
                lightPos.y - (so.y + so.yL) - camera.position.y,
                lightPos.z - (so.z + so.zL) - camera.position.z
            );
        }
    }

    public resolveRealWorldPosition(currentPos: {x:number, y:number, z:number}, wasFixed: boolean, camera: THREE.Camera): {x:number, y:number, z:number} {
        const so = this.offset;
        if (wasFixed) {
            // Headlamp -> World
            this._visualVector.set(currentPos.x, currentPos.y, currentPos.z).applyQuaternion(camera.quaternion);
            return { 
                x: camera.position.x + this._visualVector.x + (so.x + so.xL),
                y: camera.position.y + this._visualVector.y + (so.y + so.yL),
                z: camera.position.z + this._visualVector.z + (so.z + so.zL) 
            };
        } else {
            // World -> Headlamp
            this._visualVector.set(
                currentPos.x - (so.x + so.xL) - camera.position.x,
                currentPos.y - (so.y + so.yL) - camera.position.y,
                currentPos.z - (so.z + so.zL) - camera.position.z
            );
            this._quatInverse.copy(camera.quaternion).invert();
            this._visualVector.applyQuaternion(this._quatInverse);
            return { x: this._visualVector.x, y: this._visualVector.y, z: this._visualVector.z };
        }
    }

    public resolveRealWorldRotation(currentRot: {x:number, y:number, z:number}, wasFixed: boolean, camera: THREE.Camera): {x:number, y:number, z:number} {
        // 1. Convert Euler to Vector direction (Standard Forward 0,0,-1)
        const lightDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(currentRot.x, currentRot.y, currentRot.z, 'YXZ'));
        
        // 2. Transform the Vector between Spaces
        if (wasFixed) {
            // Headlamp -> World
            // WorldDir = CameraRot * LocalDir
            lightDir.applyQuaternion(camera.quaternion);
        } else {
            // World -> Headlamp
            // LocalDir = Inverse(CameraRot) * WorldDir
            lightDir.applyQuaternion(camera.quaternion.clone().invert());
        }

        // 3. Convert Vector back to Euler
        // Find rotation R such that R * (0,0,-1) = newDir
        const targetQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), lightDir);
        const e = new THREE.Euler().setFromQuaternion(targetQ, 'YXZ');
        
        return { x: e.x, y: e.y, z: e.z };
    }
}
