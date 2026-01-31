
import * as THREE from 'three';
import { MaterialController } from './MaterialController';

export class SceneController {
    public mainScene: THREE.Scene;
    public mainCamera: THREE.OrthographicCamera;
    public mainMesh: THREE.Mesh;

    // New: Display Scene for Blitting to Screen
    public displayScene: THREE.Scene;
    public displayMesh: THREE.Mesh;

    public physicsRenderTarget: THREE.WebGLRenderTarget;
    public physicsScene: THREE.Scene;
    public physicsCamera: THREE.OrthographicCamera;
    public physicsMesh: THREE.Mesh;
    
    public activeCamera: THREE.Camera | null = null;
    public fallbackCamera: THREE.PerspectiveCamera;
    
    constructor(materials: MaterialController) {
        // 1. Calculation Scene (Renders to FBO)
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        
        this.mainMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materials.mainMaterial);
        this.mainMesh.frustumCulled = false;
        this.mainScene.add(this.mainMesh);

        // 2. Display Scene (Renders to Screen)
        this.displayScene = new THREE.Scene();
        this.displayMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materials.displayMaterial);
        this.displayMesh.frustumCulled = false;
        this.displayScene.add(this.displayMesh);

        // 3. Physics Scene (Distance Probing)
        this.physicsRenderTarget = new THREE.WebGLRenderTarget(4, 4, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType, 
        });
        this.physicsScene = new THREE.Scene();
        this.physicsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.physicsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), materials.physicsMaterial);
        this.physicsMesh.frustumCulled = false;
        this.physicsScene.add(this.physicsMesh);
        
        // 4. Dummy Camera
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
