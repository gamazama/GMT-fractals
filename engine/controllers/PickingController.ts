
import * as THREE from 'three';
import { MaterialController } from '../MaterialController';
import { SceneController } from '../SceneController';
import { VirtualSpace } from '../PrecisionMath';
import { RenderPipeline } from '../RenderPipeline';

export class PickingController {
    private materials: MaterialController;
    private sceneCtrl: SceneController;
    private virtualSpace: VirtualSpace;
    private pipeline: RenderPipeline;

    constructor(materials: MaterialController, sceneCtrl: SceneController, virtualSpace: VirtualSpace, pipeline: RenderPipeline) {
        this.materials = materials;
        this.sceneCtrl = sceneCtrl;
        this.virtualSpace = virtualSpace;
        this.pipeline = pipeline;
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
     * Reads depth from MRT depth texture at a specific screen coordinate.
     * Returns distance in world units, or -1 if no hit.
     */
    public measureDistance(x: number, y: number, renderer: THREE.WebGLRenderer, camera: THREE.Camera): number {
        // Convert NDC [-1, 1] to pixel coordinates
        const width = renderer.domElement.width;
        const height = renderer.domElement.height;
        const px = Math.floor((x + 1) * 0.5 * width);
        const py = Math.floor((1 - (y + 1) * 0.5) * height); // Flip Y
        
        // Read depth from MRT depth texture
        const depthBuffer = new Float32Array(4);
        if (!this.pipeline.readDepthPixels(renderer, px, py, 1, 1, depthBuffer)) {
            return -1;
        }
        
        const depth = depthBuffer[0]; // Depth is in .r channel
        
        // Depth < 0 means sky/miss, depth > 0 means hit
        return (depth > 0 && depth < 1000.0) ? depth : -1;
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
