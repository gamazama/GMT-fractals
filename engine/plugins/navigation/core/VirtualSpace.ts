/**
 * @engine/navigation/VirtualSpace — split-float "treadmill" for camera
 * positioning at arbitrary depth.
 *
 * Generic raymarch-camera infrastructure, not GMT-specific: any renderer
 * that wants precision-preserving deep zooms benefits. The fractal is
 * *moved* via a high-precision `sceneOffset` (split into `high` and `low`
 * parts), while the rendered camera stays near the origin — preserving
 * float32 precision in the shader's primary-ray math.
 *
 * Moved from `engine-gmt/engine/PrecisionMath.ts` during the Stage-1
 * navigation extraction (2026-04-24). The only GMT-specific wire —
 * `Uniforms.CamPosHigh/Low` uniform writes — now happens in
 * `engine-gmt/plugins/navigation/bindings.ts`, not here. Apps without
 * those uniforms (fluid-toy, fractal-toy) use VirtualSpace purely for
 * offset bookkeeping and smoothing.
 *
 * Canonical state invariants (see `docs/gmt/01_System_Architecture.md#6`):
 *   - `camera.position === (0,0,0)` except during an active orbit drag
 *   - `sceneOffset` holds world position at high precision
 *   - `targetDistance` is physics-probed surface distance (never orbit
 *     radius) — used by HUD and fly-speed scaling
 */

import * as THREE from 'three';
import { PreciseVector3, CameraState } from '../../../../types/common';

export class VirtualSpace {
    private offset: PreciseVector3;
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

    public updateSmoothing(targetCamera: THREE.Camera, targetFov: number, delta: number, snap: boolean, shouldSmooth: boolean) {
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

        // Unified smoothing for both Orbit and Fly modes.
        // Position is smoothed via lerp to absorb offset-shift integer jumps.
        // Quaternion and FOV are copied directly — rotation lag would desync
        // the rendered image from the R3F camera, breaking gizmo overlays.
        const distSq = this.smoothedPos.distanceToSquared(targetCamera.position);

        if (this.isLocked) {
            if (distSq > 1.0e-18) this.isLocked = false;
        } else {
            if (distSq < 1.0e-21) this.isLocked = true;
        }

        if (!this.isLocked) {
            const lambda = 40.0;
            const f = 1.0 - Math.exp(-lambda * delta);
            this.smoothedPos.lerp(targetCamera.position, f);
        } else {
            this.smoothedPos.copy(targetCamera.position);
        }
        this.smoothedQuat.copy(targetCamera.quaternion);
        this.smoothedFov = targetFov;
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

    /**
     * Compute split-float camera position for shader uniforms. Callers
     * that speak GMT's shader contract write the two vec3s into
     * `uCamPosHigh`/`uCamPosLow`; apps using other uniform names pack
     * them into whatever uniforms their shader expects.
     */
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
        const lightDir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(currentRot.x, currentRot.y, currentRot.z, 'YXZ'));
        if (wasFixed) {
            lightDir.applyQuaternion(camera.quaternion);
        } else {
            lightDir.applyQuaternion(camera.quaternion.clone().invert());
        }
        const targetQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), lightDir);
        const e = new THREE.Euler().setFromQuaternion(targetQ, 'YXZ');
        return { x: e.x, y: e.y, z: e.z };
    }
}
