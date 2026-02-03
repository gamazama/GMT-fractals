
import * as THREE from 'three';

// Generates a 128x128 RGBA noise texture for dithering
// Using DataTexture is more efficient than embedding a Base64 string in source code
export const createBlueNoiseTexture = (): THREE.Texture => {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size * size * 4; i++) {
        data[i] = Math.floor(Math.random() * 255);
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    
    return texture;
};
