
import * as THREE from 'three';
import { ShaderConfig, ShaderFactory } from './ShaderFactory';
import { createUniforms } from './UniformSchema';
import { Uniforms, UniformName } from './UniformNames';
import { updateModularUniforms } from '../utils/GraphCompiler';
import { generateGradientTextureBuffer } from '../utils/colorUtils';
import { GradientStop, GradientConfig } from '../types';
import { VERTEX_SHADER } from '../shaders/chunks/vertex';
import { generatePostProcessFrag } from '../shaders/chunks/post_process';
import { FractalEvents } from './FractalEvents';
import { featureRegistry } from './FeatureSystem';
import { LightingState } from '../features/lighting';
import { createBlueNoiseTexture } from '../data/BlueNoiseData';

const cloneUniforms = (src: { [key: string]: THREE.IUniform }) => {
    const clone: { [key: string]: THREE.IUniform } = {};
    for (const key in src) {
        const val = src[key].value;
        if (val instanceof THREE.Vector2) clone[key] = { value: val.clone() };
        else if (val instanceof THREE.Vector3) clone[key] = { value: val.clone() };
        else if (val instanceof THREE.Color) clone[key] = { value: val.clone() };
        else if (val instanceof Float32Array) clone[key] = { value: new Float32Array(val) };
        else if (Array.isArray(val)) {
             clone[key] = { value: val.map((v: any) => v.clone ? v.clone() : v) };
        }
        else clone[key] = { value: val };
    }
    return clone;
};

// Simple string hash for checksums
const cyrb53 = (str: string, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export class MaterialController {
    // We maintain two main materials to allow instant switching
    public materialDirect: THREE.ShaderMaterial;
    public materialPT: THREE.ShaderMaterial;
    
    // Aux materials
    public histogramMaterial: THREE.ShaderMaterial;
    public displayMaterial: THREE.ShaderMaterial; 
    public exportMaterial: THREE.ShaderMaterial;  
    
    public mainUniforms: { [key: string]: THREE.IUniform };
    public histogramUniforms: { [key: string]: THREE.IUniform };
    
    // Cache to prevent redundant compiles
    private lastGeneratedFrag: string = "";
    private activeDirectChecksum: string = "";
    private activePTChecksum: string = "";
    
    private currentMode: 'Direct' | 'PathTracing' = 'Direct';
    
    // Lazy Compilation State
    private storedConfig: ShaderConfig | null = null;
    private directDirty: boolean = true;
    private ptDirty: boolean = true;
    
    constructor(initialConfig: ShaderConfig) {
        const baseUniforms = createUniforms();
        
        // Initialize Blue Noise Texture
        const blueNoiseTex = createBlueNoiseTexture();
        baseUniforms[Uniforms.BlueNoiseTexture].value = blueNoiseTex;

        this.mainUniforms = cloneUniforms(baseUniforms);
        this.histogramUniforms = cloneUniforms(baseUniforms);
        
        // Initialize both materials with placeholder shaders
        this.materialDirect = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: 'layout(location = 0) out vec4 pc_fragColor; void main() { pc_fragColor = vec4(0.0); }', 
            uniforms: this.mainUniforms,
            depthWrite: false, depthTest: false,
            blending: THREE.NoBlending,
            glslVersion: THREE.GLSL3 // WebGL 2 Support
        });

        this.materialPT = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: 'layout(location = 0) out vec4 pc_fragColor; void main() { pc_fragColor = vec4(0.0); }',
            uniforms: this.mainUniforms, // SHARE UNIFORMS
            depthWrite: false, depthTest: false,
            blending: THREE.NoBlending,
            glslVersion: THREE.GLSL3 // WebGL 2 Support
        });

        // Initialize Aux
        this.histogramMaterial = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: 'layout(location = 0) out vec4 pc_fragColor; void main() { pc_fragColor = vec4(0.0); }',
            uniforms: this.histogramUniforms,
            glslVersion: THREE.GLSL3
        });

        this.displayMaterial = this.createPostProcessMaterial(1.0);
        this.exportMaterial = this.createPostProcessMaterial(1.0);
        
        // Sync Initial Uniforms ONLY (No Shader Build)
        this.syncConfigUniforms(initialConfig);
        
        // Build histogram shader on initialization
        const configAux = { 
            ...initialConfig, 
            renderMode: 'Direct' as const,
            lighting: { ...(initialConfig.lighting || {}), renderMode: 0.0 }
        };
        this.histogramMaterial.fragmentShader = ShaderFactory.generateHistogramShader(configAux);
        this.histogramMaterial.needsUpdate = true;
    }
    
    // Legacy getter - returns active material
    public get mainMaterial() {
        return this.currentMode === 'PathTracing' ? this.materialPT : this.materialDirect;
    }

    public getMaterial(mode: 'Direct' | 'PathTracing') {
        console.log('getMaterial called with mode:', mode);
        console.log('directDirty:', this.directDirty);
        console.log('ptDirty:', this.ptDirty);
        console.log('Stack trace:', new Error().stack);
        
        this.currentMode = mode;
        
        // Lazy Load: If switching to a mode that is dirty, compile it now
        if (mode === 'Direct' && this.directDirty && this.storedConfig) {
            this.compileDirect(this.storedConfig);
        } else if (mode === 'PathTracing' && this.ptDirty && this.storedConfig) {
            this.compilePT(this.storedConfig);
        }
        
        return mode === 'PathTracing' ? this.materialPT : this.materialDirect;
    }
    
    private createPostProcessMaterial(encodeSRGB: number): THREE.ShaderMaterial {
        const uniforms: { [key: string]: THREE.IUniform } = {
            map: { value: null },
            uResolution: { value: new THREE.Vector2(1,1) },
            uEncodeOutput: { value: encodeSRGB }
        };

        // SHARED REFERENCE OPTIMIZATION:
        // Instead of creating new uniform objects, we share the references from mainUniforms.
        // This ensures that when UniformManager updates mainUniforms (e.g., uTime),
        // the PostProcess material sees the update instantly without manual syncing.
        for (const key in this.mainUniforms) {
            if (!uniforms[key]) {
                uniforms[key] = this.mainUniforms[key];
            }
        }

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: VERTEX_SHADER,
            fragmentShader: generatePostProcessFrag(), 
            depthTest: false,
            depthWrite: false,
            glslVersion: THREE.GLSL3
        });
    }

    public updatePostProcessUniforms(state: any) {
        [this.displayMaterial, this.exportMaterial].forEach(mat => {
            if (this.mainUniforms.uResolution.value) {
                mat.uniforms.uResolution.value.copy(this.mainUniforms.uResolution.value);
            }
        });
    }
    
    public getLastFrag(): string { return this.lastGeneratedFrag; }
    
    public updateConfig(config: ShaderConfig) {
        // Store config for lazy compilation of the other mode later
        this.storedConfig = config;

        const lighting = config.lighting as LightingState;
        // DDFS: renderMode from lighting slice (0=Direct, 1=PT)
        if (lighting && lighting.renderMode !== undefined) {
             this.currentMode = lighting.renderMode === 1.0 ? 'PathTracing' : 'Direct';
        } else {
             this.currentMode = config.renderMode || 'Direct';
        }

        // CRITICAL: Always compile shader with depth output enabled
        // This ensures the shader is compiled with the correct output configuration
        // from the beginning, preventing recompilation when physics probe reads depth
        const configWithDepth = {
            ...config,
            forceDepthOutput: true
        };

        // LAZY LOGIC: Only compile the ACTIVE shader. Mark other as dirty.
        if (this.currentMode === 'Direct') {
            this.compileDirect(configWithDepth);
            this.ptDirty = true;
        } else {
            this.compilePT(configWithDepth);
            this.directDirty = true;
        }

        // 3. Aux Shaders (Always Direct Mode logic, lighter)
        const configAux = { 
            ...config, 
            renderMode: 'Direct' as const,
            lighting: { ...(config.lighting || {}), renderMode: 0.0 }
        };
        
        this.histogramMaterial.fragmentShader = ShaderFactory.generateHistogramShader(configAux);
        this.histogramMaterial.needsUpdate = true;
        
        // Sync Uniforms from Config (Both Modular and Features)
        this.syncConfigUniforms(config);
    }
    
    private compileDirect(config: ShaderConfig) {
        const configDirect = { 
            ...config, 
            renderMode: 'Direct' as const,
            lighting: { ...(config.lighting || {}), renderMode: 0.0 } // Force DDFS value
        };
        const fragDirect = ShaderFactory.generateFragmentShader(configDirect);
        const checksum = cyrb53(fragDirect).toString(16);
        
        if (checksum !== this.activeDirectChecksum) {
            console.log('=== Shader Recompilation ===');
            console.log('Previous checksum:', this.activeDirectChecksum);
            console.log('New checksum:', checksum);
            console.log('Shader length:', fragDirect.length);
            console.log('Stack trace:', new Error().stack);
            
            this.materialDirect.fragmentShader = fragDirect;
            this.materialDirect.needsUpdate = true;
            this.activeDirectChecksum = checksum;
            
            console.log(`[Shader Generated] Direct | Hash: ${checksum.substring(0, 8)} | Size: ${(fragDirect.length/1024).toFixed(1)}kb`);
            FractalEvents.emit('shader_code', fragDirect);
        } else {
            console.log('=== Shader Unchanged ===');
        }
        this.lastGeneratedFrag = fragDirect;
        this.directDirty = false;
    }

    private compilePT(config: ShaderConfig) {
        const configPT = { 
            ...config, 
            renderMode: 'PathTracing' as const,
            lighting: { ...(config.lighting || {}), renderMode: 1.0 } // Force DDFS value
        };
        const fragPT = ShaderFactory.generateFragmentShader(configPT);
        const checksum = cyrb53(fragPT).toString(16);

        if (checksum !== this.activePTChecksum) {
            this.materialPT.fragmentShader = fragPT;
            this.materialPT.needsUpdate = true;
            this.activePTChecksum = checksum;
            
            console.log(`[Shader Generated] PathTracing | Hash: ${checksum.substring(0, 8)} | Size: ${(fragPT.length/1024).toFixed(1)}kb`);
            FractalEvents.emit('shader_code', fragPT);
        }
        this.lastGeneratedFrag = fragPT;
        this.ptDirty = false;
    }
    
    public setUniform(key: string, value: any) {
        let valToAssign = value;

        // Handle boolean values - convert to float for GLSL
        if (typeof value === 'boolean') {
            valToAssign = value ? 1.0 : 0.0;
        }

        // 1. Handle Gradient Buffer Optimization or Array of Stops
        if (value && value.isGradientBuffer) {
             const existingTex = this.mainUniforms[key]?.value;
             if (existingTex instanceof THREE.DataTexture) {
                 // Create new texture with updated data instead of modifying read-only property
                 const tex = new THREE.DataTexture(value.buffer as any, 256, 1, THREE.RGBAFormat);
                 tex.minFilter = THREE.LinearFilter;
                 tex.magFilter = THREE.LinearFilter;
                 tex.wrapS = THREE.RepeatWrapping;
                 tex.needsUpdate = true;
                 existingTex.dispose();
                 valToAssign = tex;
             } else {
                 const tex = new THREE.DataTexture(value.buffer as any, 256, 1, THREE.RGBAFormat);
                 tex.minFilter = THREE.LinearFilter;
                 tex.magFilter = THREE.LinearFilter;
                 tex.wrapS = THREE.RepeatWrapping;
                 tex.needsUpdate = true;
                 valToAssign = tex;
             }
        } else if (Array.isArray(value) && value.length > 0 && (value[0] as GradientStop).color) {
            // Auto-detect array of GradientStops and convert to buffer
            const buffer = generateGradientTextureBuffer(value);
            const existingTex = this.mainUniforms[key]?.value;
            if (existingTex instanceof THREE.DataTexture) {
                 // Create new texture with updated data instead of modifying read-only property
                 const tex = new THREE.DataTexture(buffer as any, 256, 1, THREE.RGBAFormat);
                 tex.minFilter = THREE.LinearFilter;
                 tex.magFilter = THREE.LinearFilter;
                 tex.wrapS = THREE.RepeatWrapping;
                 tex.needsUpdate = true;
                 existingTex.dispose();
                 valToAssign = tex;
             } else {
                 const tex = new THREE.DataTexture(buffer as any, 256, 1, THREE.RGBAFormat);
                 tex.minFilter = THREE.LinearFilter;
                 tex.magFilter = THREE.LinearFilter;
                 tex.wrapS = THREE.RepeatWrapping;
                 tex.needsUpdate = true;
                 valToAssign = tex;
             }
        }

        const targets = [
            this.mainUniforms, 
            this.histogramUniforms,
            this.displayMaterial.uniforms,
            this.exportMaterial.uniforms
        ];

        targets.forEach(s => {
            if (!s[key]) return;
            const cur = s[key].value;
            
            // Texture Management
            if (valToAssign instanceof THREE.Texture) {
                if (cur instanceof THREE.Texture && cur !== valToAssign) {
                    cur.dispose();
                }
                s[key].value = valToAssign;
                return;
            }

            // Robust update logic
            if (cur instanceof THREE.Vector3) {
                if (value instanceof THREE.Vector3) cur.copy(value);
                else if (typeof value === 'number') cur.setScalar(value);
            }
            else if (cur instanceof THREE.Vector2) {
                if (value instanceof THREE.Vector2) cur.copy(value);
            }
            else if (cur instanceof THREE.Color) {
                if (value instanceof THREE.Color) cur.copy(value);
                else cur.set(value); 
            }
            // CRITICAL: Matrix Support for AnimationSystem optimization
            else if (cur instanceof THREE.Matrix3 && value instanceof THREE.Matrix3) {
                 cur.copy(value);
            }
            else if (cur instanceof THREE.Matrix4 && value instanceof THREE.Matrix4) {
                 cur.copy(value);
            }
            else if (Array.isArray(cur) && Array.isArray(value)) {
                for(let i=0; i<cur.length; i++) {
                    if (value[i] === undefined) continue;
                    if (cur[i] instanceof THREE.Vector3) cur[i].copy(value[i]);
                    else if (cur[i] instanceof THREE.Color) cur[i].copy(value[i]);
                    else cur[i] = value[i];
                }
            } else {
                s[key].value = valToAssign;
            }
        });
    }
    
    public loadTexture(type: 'color' | 'env', dataUrl: string | null) {
        if (!dataUrl) {
            if (type === 'color') this.setUniform('uUseTexture', 0.0);
            return;
        }

        const loader = new THREE.TextureLoader();
        loader.load(dataUrl, (tex) => {
            tex.minFilter = THREE.LinearFilter; 
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;

            if (type === 'color') {
                tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
                this.setUniform('uTexture', tex);
                this.setUniform('uUseTexture', 1.0);
            } else {
                tex.mapping = THREE.EquirectangularReflectionMapping;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.generateMipmaps = true;
                this.setUniform(Uniforms.EnvMapTexture, tex);
            }
        });
    }
    
    public setGradient(stops: GradientStop[] | GradientConfig, layer: 1 | 2 | 3) {
        const buffer = generateGradientTextureBuffer(stops);
        
        let name: string = 'uGradientTexture';
        if (layer === 2) name = 'uGradientTexture2';
        if (layer === 3) name = 'uEnvGradient';
        
        this.setUniform(name, { isGradientBuffer: true, buffer });
    }
    
    public syncModularUniforms(pipeline: any[]) {
        const modularParams = this.mainUniforms[Uniforms.ModularParams].value as Float32Array;
        updateModularUniforms(pipeline, modularParams);
        
        (this.histogramUniforms[Uniforms.ModularParams].value as Float32Array).set(modularParams);
    }

    public syncConfigUniforms(config: ShaderConfig) {
        const features = featureRegistry.getAll();
        
        features.forEach(feat => {
            const featureData = (config as any)[feat.id];
            if (featureData) {
                Object.entries(feat.params).forEach(([key, paramConfig]) => {
                    if (paramConfig.uniform && featureData[key] !== undefined) {
                        this.setUniform(paramConfig.uniform, featureData[key]);
                    }
                });
            }
        });
        
        if (config.pipeline) {
            this.syncModularUniforms(config.pipeline);
        }
    }
}
