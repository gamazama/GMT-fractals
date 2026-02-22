
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
     * Reads depth from the alpha channel at a specific screen coordinate.
     * Returns distance in world units, or -1 if no hit.
     * Averages depth values from a small neighborhood to reduce noise.
     */
    public measureDistance(x: number, y: number, renderer: THREE.WebGLRenderer, camera: THREE.Camera): number {
        // Convert NDC [-1, 1] to pixel coordinates
        const width = renderer.domElement.width;
        const height = renderer.domElement.height;
        const px = Math.floor((x + 1) * 0.5 * width);
        const py = Math.floor((1 - (y + 1) * 0.5) * height); // Flip Y
        
        const sampleSize = 3; // 3x3 neighborhood for averaging
        const halfSize = Math.floor(sampleSize / 2);
        let validDepthSum = 0;
        let validCount = 0;
        
        // Read pixels from the neighborhood
        for (let dx = -halfSize; dx <= halfSize; dx++) {
            for (let dy = -halfSize; dy <= halfSize; dy++) {
                const sampleX = px + dx;
                const sampleY = py + dy;
                
                // Ensure sample coordinates are within bounds
                if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
                    const pixelBuffer = new Float32Array(4);
                    if (this.pipeline.readPixels(renderer, sampleX, sampleY, 1, 1, pixelBuffer)) {
                        const depth = pixelBuffer[3];
                        
                        // With HalfFloat16 buffers, the alpha channel may have precision issues
                        // Check if depth is valid (positive, finite, and not sky)
                        if (isFinite(depth) && depth > 0 && depth < 1000.0) {
                            validDepthSum += depth;
                            validCount++;
                        }
                    }
                }
            }
        }
        
        // Return average of valid depth values or -1 if no valid samples
        return validCount > 0 ? validDepthSum / validCount : -1;
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
