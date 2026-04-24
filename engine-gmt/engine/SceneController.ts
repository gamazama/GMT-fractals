
import * as THREE from 'three';
import { MaterialController } from './MaterialController';
import { createFullscreenPass } from './utils/FullscreenQuad';

export class SceneController {
    public mainScene: THREE.Scene;
    public mainCamera: THREE.OrthographicCamera;
    public mainMesh: THREE.Mesh;

    // Display Scene for Blitting to Screen
    public displayScene: THREE.Scene;
    public displayMesh: THREE.Mesh;

    public activeCamera: THREE.Camera | null = null;
    public fallbackCamera: THREE.PerspectiveCamera;

    constructor(materials: MaterialController) {
        // 1. Calculation Scene (Renders to FBO)
        const main = createFullscreenPass(materials.mainMaterial);
        this.mainScene = main.scene;
        this.mainCamera = main.camera;
        this.mainMesh = main.mesh;

        // 2. Display Scene (Renders to Screen)
        const display = createFullscreenPass(materials.displayMaterial);
        this.displayScene = display.scene;
        this.displayMesh = display.mesh;
        
        // 3. Dummy Camera
        this.fallbackCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.fallbackCamera.position.set(0, 0, 0);
    }
    
    public setMaterial(material: THREE.ShaderMaterial) {
        this.mainMesh.material = material;
    }
    
    public registerCamera(camera: THREE.Camera) {
        this.activeCamera = camera;
    }
    
    public getCamera(): THREE.Camera {
        return this.activeCamera || this.fallbackCamera;
    }
    
    public updateFallback(pos: THREE.Vector3, quat: THREE.Quaternion, fov: number, aspect: number) {
        this.fallbackCamera.position.copy(pos);
        this.fallbackCamera.quaternion.copy(quat);
        this.fallbackCamera.fov = fov;
        this.fallbackCamera.aspect = aspect;
        this.fallbackCamera.updateMatrixWorld();
    }
}
