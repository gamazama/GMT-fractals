
import * as THREE from 'three';


// Generates a 128x128 RGBA noise texture or loads custom Base64
export const createBlueNoiseTexture = (): THREE.Texture => {
    // Load blue noise from PNG file in public folder
    const loader = new THREE.TextureLoader();
    try {
        const texture = loader.load('blueNoise.png');
        
        // Critical settings for Blue Noise:
        // Nearest Filter ensures we get exact noise values, not interpolated blurs
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = false; // Disable mipmaps to prevent blocky artifacts
        
        console.log('Blue noise texture loaded from PNG');
        return texture;
    } catch (error) {
        console.warn('Failed to load blue noise PNG, using procedural fallback:', error);
        
        // Fallback: Generate Procedural White/Blue-ish Noise
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
        texture.generateMipmaps = false; // Disable mipmaps
        texture.needsUpdate = true;
        
        return texture;
    }
};
