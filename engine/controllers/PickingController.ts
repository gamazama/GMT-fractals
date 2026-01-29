
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

    /**
     * Renders a 1x1 pixel using the physics shader to measure distance at a specific screen coordinate.
     */
    public measureDistance(x: number, y: number, renderer: THREE.WebGLRenderer, camera: THREE.Camera): number {
        const phys = this.materials.physicsUniforms;
        const cam = camera as THREE.PerspectiveCamera;
        
        // Setup Raycaster for NDC calculation
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
        const dir = raycaster.ray.direction;
        
        // Update Physics Uniforms
        phys.uCamForward.value.copy(dir);
        phys.uCamBasisX.value.set(0, 0, 0);
        phys.uCamBasisY.value.set(0, 0, 0);
        
        // Sync precision offset
        this.virtualSpace.updateShaderUniforms(
            cam.position, 
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
        
        const cam = activeCamera as THREE.PerspectiveCamera;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cam);
        
        // Calculate Local Position relative to camera
        const localPos = new THREE.Vector3()
            .copy(raycaster.ray.origin)
            .add(raycaster.ray.direction.multiplyScalar(dist));
            
        // Convert to Unified Space (World Offset + Local)
        const offset = this.virtualSpace.state;
        const unifiedX = offset.x + offset.xL + localPos.x;
        const unifiedY = offset.y + offset.yL + localPos.y;
        const unifiedZ = offset.z + offset.zL + localPos.z;
        
        return new THREE.Vector3(unifiedX, unifiedY, unifiedZ);
    }
}
