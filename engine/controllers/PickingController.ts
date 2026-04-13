
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
        const py = Math.floor((y + 1) * 0.5 * height); // GL y=0 is bottom, NDC y=-1 is bottom — no flip needed
        
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
    /**
     * Single-pixel depth read — faster variant for continuous drag operations.
     * Skips the 3x3 averaging neighborhood (9 readPixels → 1).
     */
    public measureDistanceFast(x: number, y: number, renderer: THREE.WebGLRenderer, _camera: THREE.Camera): number {
        const width = renderer.domElement.width;
        const height = renderer.domElement.height;
        const px = Math.floor((x + 1) * 0.5 * width);
        const py = Math.floor((y + 1) * 0.5 * height);

        if (px < 0 || px >= width || py < 0 || py >= height) return -1;

        const pixelBuffer = new Float32Array(4);
        if (this.pipeline.readPixels(renderer, px, py, 1, 1, pixelBuffer)) {
            const depth = pixelBuffer[3];
            if (isFinite(depth) && depth > 0 && depth < 1000.0) return depth;
        }
        return -1;
    }

    private _pickFromDist(x: number, y: number, dist: number, camera: THREE.Camera): THREE.Vector3 | null {
        if (dist <= 0 || dist >= 1000.0) return null;

        const ray = this.getRay(x, y, camera);
        const localPos = new THREE.Vector3()
            .copy(ray.origin)
            .add(ray.direction.multiplyScalar(dist));

        const offset = this.virtualSpace.state;
        return new THREE.Vector3(
            offset.x + offset.xL + localPos.x,
            offset.y + offset.yL + localPos.y,
            offset.z + offset.zL + localPos.z
        );
    }

    public pickWorldPosition(x: number, y: number, renderer: THREE.WebGLRenderer, activeCamera: THREE.Camera): THREE.Vector3 | null {
        return this._pickFromDist(x, y, this.measureDistance(x, y, renderer, activeCamera), activeCamera);
    }

    /** Fast variant — single-pixel read, suitable for continuous drag. */
    public pickWorldPositionFast(x: number, y: number, renderer: THREE.WebGLRenderer, activeCamera: THREE.Camera): THREE.Vector3 | null {
        return this._pickFromDist(x, y, this.measureDistanceFast(x, y, renderer, activeCamera), activeCamera);
    }
}
