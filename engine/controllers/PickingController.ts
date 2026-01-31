
import * as THREE from 'three';
import { MaterialController } from '../MaterialController';
import { SceneController } from '../SceneController';
import { VirtualSpace } from '../PrecisionMath';

export class PickingController {
    private materials: MaterialController;
    private sceneCtrl: SceneController;
    private virtualSpace: VirtualSpace;

    constructor(materials: MaterialController, sceneCtrl: SceneController, virtualSpace: VirtualSpace) {
        this.materials = materials;
        this.sceneCtrl = sceneCtrl;
        this.virtualSpace = virtualSpace;
    }

    private getRay(x: number, y: number, camera: THREE.Camera): THREE.Ray {
        const camType = this.materials.mainUniforms.uCamType.value;
        const cam = camera as THREE.PerspectiveCamera;
        
        if (camType > 1.5) {
            // Equirectangular (Skybox)
            // x, y are NDC [-1, 1]
            const lambda = x * Math.PI; 
            const phi = y * (Math.PI / 2);
            const cPhi = Math.cos(phi);
            
            // Match shader logic:
            // vec3 localRd = vec3(sin(lambda) * cPhi, sin(phi), -cos(lambda) * cPhi);
            const localDir = new THREE.Vector3(
                Math.sin(lambda) * cPhi,
                Math.sin(phi),
                -Math.cos(lambda) * cPhi
            );
            
            // Rotate by camera orientation
            localDir.applyQuaternion(cam.quaternion);
            
            return new THREE.Ray(cam.position.clone(), localDir.normalize());
        } else {
            // Perspective / Orthographic (Handled by Raycaster)
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
            return raycaster.ray;
        }
    }

    /**
     * Renders a 1x1 pixel using the physics shader to measure distance at a specific screen coordinate.
     */
    public measureDistance(x: number, y: number, renderer: THREE.WebGLRenderer, camera: THREE.Camera): number {
        const phys = this.materials.physicsUniforms;
        
        // Get Ray (Supports Perspective, Ortho, and Skybox)
        const ray = this.getRay(x, y, camera);
        
        // Update Physics Uniforms
        phys.uCamForward.value.copy(ray.direction);
        phys.uCamBasisX.value.set(0, 0, 0);
        phys.uCamBasisY.value.set(0, 0, 0);
        
        // Sync precision offset
        this.virtualSpace.updateShaderUniforms(
            ray.origin, 
            phys.uSceneOffsetHigh.value, 
            phys.uSceneOffsetLow.value
        );
        
        phys.uCameraPosition.value.set(0, 0, 0);
        
        // Render
        const originalTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.sceneCtrl.physicsRenderTarget);
        renderer.clear();
        renderer.render(this.sceneCtrl.physicsScene, this.sceneCtrl.physicsCamera);
        
        // Read
        const pixels = new Float32Array(4);
        renderer.readRenderTargetPixels(this.sceneCtrl.physicsRenderTarget, 0, 0, 1, 1, pixels);
        renderer.setRenderTarget(originalTarget);
        
        const dist = pixels[0];
        // Shader returns -1.0 for sky/miss, or > 0 for hit
        return (dist > 0 && dist < 1000.0) ? dist : -1;
    }
    
    /**
     * converts a 2D screen point (NDC) into a 3D Unified World Coordinate.
     */
    public pickWorldPosition(x: number, y: number, renderer: THREE.WebGLRenderer, activeCamera: THREE.Camera): THREE.Vector3 | null {
        const dist = this.measureDistance(x, y, renderer, activeCamera);
        
        if (dist <= 0 || dist >= 1000.0) return null;
        
        // Reconstruct ray to find hit point relative to camera
        const ray = this.getRay(x, y, activeCamera);
        
        // Calculate Local Position relative to camera
        const localPos = new THREE.Vector3()
            .copy(ray.origin)
            .add(ray.direction.multiplyScalar(dist));
            
        // Convert to Unified Space (World Offset + Local)
        const offset = this.virtualSpace.state;
        const unifiedX = offset.x + offset.xL + localPos.x;
        const unifiedY = offset.y + offset.yL + localPos.y;
        const unifiedZ = offset.z + offset.zL + localPos.z;
        
        return new THREE.Vector3(unifiedX, unifiedY, unifiedZ);
    }
}
