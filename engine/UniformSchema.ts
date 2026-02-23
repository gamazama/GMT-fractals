
import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import { featureRegistry } from './FeatureSystem';
import { registerFeatures } from '../features';

// Ensure features are registered before schema is built
registerFeatures();

export type GLSLType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' | 'mat3' | 'mat2';

export interface UniformDefinition {
    name: string;
    type: GLSLType;
    default: any;
    arraySize?: number; 
    precision?: 'highp' | 'mediump' | 'lowp';
    comment?: string;
}

// Base Schema (Pure Core)
// Only contains uniforms required by the RenderPipeline and Camera logic.
const BASE_SCHEMA: UniformDefinition[] = [
    // Core
    { name: Uniforms.Time, type: 'float', default: 0 },
    { name: Uniforms.FrameCount, type: 'int', default: 0 },
    { name: Uniforms.Resolution, type: 'vec2', default: new THREE.Vector2(100, 100) },
    
    // Precision & Scale
    { name: Uniforms.SceneOffsetHigh, type: 'vec3', default: new THREE.Vector3() },
    { name: Uniforms.SceneOffsetLow, type: 'vec3', default: new THREE.Vector3() },
    { name: Uniforms.CameraPosition, type: 'vec3', default: new THREE.Vector3() },
    { name: Uniforms.CamBasisX, type: 'vec3', default: new THREE.Vector3() },
    { name: Uniforms.CamBasisY, type: 'vec3', default: new THREE.Vector3() },
    { name: Uniforms.CamForward, type: 'vec3', default: new THREE.Vector3() },

    // Render Region (Core Viewport Feature)
    { name: Uniforms.RegionMin, type: 'vec2', default: new THREE.Vector2(0, 0) },
    { name: Uniforms.RegionMax, type: 'vec2', default: new THREE.Vector2(1, 1) },

    // Progressive / Pipeline
    { name: Uniforms.HistoryTexture, type: 'sampler2D', default: null },
    { name: Uniforms.BlendFactor, type: 'float', default: 1.0 },
    { name: Uniforms.ExtraSeed, type: 'float', default: 0.0 },
    { name: Uniforms.Jitter, type: 'vec2', default: new THREE.Vector2(0,0) },
    { name: Uniforms.BlueNoiseTexture, type: 'sampler2D', default: null },
     { name: Uniforms.BlueNoiseResolution, type: 'vec2', default: new THREE.Vector2(512, 512) }, // Blue noise texture is 512x512
    
    // Tools (Histogram)
    { name: Uniforms.HistogramLayer, type: 'int', default: 0 },
    
    // Export/Render Scale
    { name: Uniforms.InternalScale, type: 'float', default: 1.0 },

    // Optimizations (Shared by Geometry & Lighting)
    { name: Uniforms.PreRotMatrix, type: 'mat3', default: new THREE.Matrix3() },
    { name: Uniforms.EnvRotationMatrix, type: 'mat2', default: [1, 0, 0, 1] }, 
];

const featureUniforms = featureRegistry.getUniformDefinitions();

// Deduplicate in case a feature defines a uniform that's also in base (shouldn't happen with correct separation)
const existingNames = new Set(BASE_SCHEMA.map(u => u.name));
const uniqueFeatures = featureUniforms.filter(u => !existingNames.has(u.name));

export const UNIFORM_SCHEMA = [...BASE_SCHEMA, ...uniqueFeatures];

export const UNIFORM_DEFAULTS = UNIFORM_SCHEMA.reduce((acc, item) => {
    acc[item.name] = item.default;
    return acc;
}, {} as Record<string, any>);

export const createUniforms = () => {
    const uniforms: Record<string, { value: any }> = {};
    
    UNIFORM_SCHEMA.forEach(def => {
        let val = def.default;
        if (val && typeof val === 'object') {
            if (val.clone) val = val.clone();
            else if (Array.isArray(val)) val = val.map((v: any) => v.clone ? v.clone() : v);
            else if (val instanceof Float32Array) val = new Float32Array(val);
        }
        uniforms[def.name] = { value: val };
    });
    
    return uniforms;
};
