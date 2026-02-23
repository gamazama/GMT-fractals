
import * as THREE from 'three';
import { Uniforms } from '../engine/UniformNames';
import { engine } from '../engine/FractalEngine';


// Generates a 128x128 RGBA noise texture or loads custom Base64
export const createBlueNoiseTexture = (): THREE.Texture => {
    // Load blue noise from PNG file in public folder
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    
    try {
        const texture = loader.load(
            'blueNoise.png',
            (loadedTexture) => {
                console.log('Blue noise texture loaded successfully');
                const tex = loadedTexture as any;
                if (tex.image) {
                    console.log('Texture dimensions:', tex.image.width, 'x', tex.image.height);
                    // Immediately update the blue noise resolution uniform when texture loads
                    if (engine && engine.mainUniforms && engine.mainUniforms[Uniforms.BlueNoiseResolution]) {
                        engine.mainUniforms[Uniforms.BlueNoiseResolution].value.set(
                            tex.image.width || 128, 
                            tex.image.height || 128
                        );
                        console.log('Blue noise resolution uniform updated');
                    }
                }
            },
            undefined,
            (error) => {
                console.error('Blue noise texture loading failed:', error);
                // Fallback to procedural noise
                const size = 128;
                const data = new Uint8Array(size * size * 4);
                
                for (let i = 0; i < size * size * 4; i++) {
                    data[i] = Math.floor(Math.random() * 255);
                }
                
                const fallbackTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
                fallbackTexture.wrapS = THREE.RepeatWrapping;
                fallbackTexture.wrapT = THREE.RepeatWrapping;
                fallbackTexture.minFilter = THREE.NearestFilter;
                fallbackTexture.magFilter = THREE.NearestFilter;
                fallbackTexture.generateMipmaps = false;
                fallbackTexture.needsUpdate = true;
                
                return fallbackTexture;
            }
        );
        
        // Critical settings for Blue Noise:
        // Nearest Filter ensures we get exact noise values, not interpolated blurs
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = false; // Disable mipmaps to prevent blocky artifacts
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.format = THREE.RGBAFormat;
        texture.type = THREE.UnsignedByteType;
        
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
