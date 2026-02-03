
import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import { MAX_MODULAR_PARAMS, MAX_LIGHTS } from '../data/constants';
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

// Base Schema (Core Engine)
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

    // Render Region
    { name: Uniforms.RegionMin, type: 'vec2', default: new THREE.Vector2(0, 0) },
    { name: Uniforms.RegionMax, type: 'vec2', default: new THREE.Vector2(1, 1) },

    // Lights
    { name: Uniforms.LightCount, type: 'int', default: 0 },
    { name: Uniforms.LightPos, type: 'vec3', arraySize: MAX_LIGHTS, default: new Array(MAX_LIGHTS).fill(new THREE.Vector3()) },
    { name: Uniforms.LightColor, type: 'vec3', arraySize: MAX_LIGHTS, default: new Array(MAX_LIGHTS).fill(new THREE.Color(1,1,1)) },
    { name: Uniforms.LightIntensity, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
    { name: Uniforms.LightShadows, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
    { name: Uniforms.LightFalloff, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
    { name: Uniforms.LightFalloffType, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },

    // Progressive
    { name: Uniforms.HistoryTexture, type: 'sampler2D', default: null },
    { name: Uniforms.BlendFactor, type: 'float', default: 1.0 },
    { name: Uniforms.ExtraSeed, type: 'float', default: 0.0 },
    { name: Uniforms.Jitter, type: 'vec2', default: new THREE.Vector2(0,0) },
    { name: Uniforms.BlueNoiseTexture, type: 'sampler2D', default: null },

    // Modular
    { name: Uniforms.ModularParams, type: 'float', arraySize: MAX_MODULAR_PARAMS, default: new Float32Array(MAX_MODULAR_PARAMS) },
    
    // Environment
    { name: Uniforms.EnvMapTexture, type: 'sampler2D', default: null },
    { name: Uniforms.EnvRotationMatrix, type: 'mat2', default: [1, 0, 0, 1] }, // Identity 2x2

    // Tools
    { name: Uniforms.HistogramLayer, type: 'int', default: 0 },

    // Optimizations
    { name: Uniforms.PreRotMatrix, type: 'mat3', default: new THREE.Matrix3() },
];

const featureUniforms = featureRegistry.getUniformDefinitions();

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
