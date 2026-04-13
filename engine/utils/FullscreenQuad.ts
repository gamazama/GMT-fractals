
import * as THREE from 'three';

/** Shared geometry for all fullscreen quads — never dispose this. */
const _sharedGeometry = new THREE.PlaneGeometry(2, 2);

export interface FullscreenPass {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    mesh: THREE.Mesh;
}

/**
 * Creates a fullscreen quad pass (scene + ortho camera + mesh).
 * All passes share a single PlaneGeometry instance to avoid redundant GPU uploads.
 *
 * @param material — optional initial material; can be swapped later via `pass.mesh.material = ...`
 */
export function createFullscreenPass(material?: THREE.Material): FullscreenPass {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mesh = new THREE.Mesh(_sharedGeometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { scene, camera, mesh };
}
