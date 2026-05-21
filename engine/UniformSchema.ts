/**
 * @invariant Importing this module triggers `registerFeatures()` at top
 *   level — even a types-only import. The merge filters feature-vs-base
 *   name collisions SILENTLY (no warning); feature-vs-feature collisions
 *   go last-feature-wins via `UNIFORM_DEFAULTS` reduce.
 */

import * as THREE from 'three';
import { Uniforms } from './UniformNames';
import { featureRegistry } from './FeatureSystem';
import { registerFeatures } from './features';

// Ensure features are registered before schema is built
registerFeatures();

export type GLSLType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' | 'mat3' | 'mat2';

export interface UniformDefinition {
    name: string;
    type: GLSLType;
    default: any;
    arraySize?: number;
    comment?: string;
    /** If true, creates the Three.js uniform backing but skips GLSL declaration.
     *  Use for uniforms that are only needed for specific formula variants (e.g. Modular).
     *
     *  @enforcement `shaders/chunks/uniforms.ts` (and its engine-gmt
     *    mirror) is the SOLE enforcement site — skips GLSL declaration
     *    emit when true. `ShaderBuilder.buildUniformsBlock` and
     *    `createUniforms` ignore this flag. */
    backingOnly?: boolean;
}

// Base Schema — three categories:
//   1. True engine core: time, resolution, camera basis, pipeline (history/blend/jitter).
//   2. Tool/export slots that no-op at defaults (image-tile, histogram layer,
//      output-pass A/B/depth, region rect). Live here so apps don't have to
//      re-declare them per feature.
//   3. CPU-derived caches of feature uniforms (pre/post/world rot matrices,
//      env rotation, fog linear, pixel-size base). Computed once on CPU to
//      avoid per-fragment work; the feature still owns the source-of-truth.
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

    // Image-Tile Export (bucket render tiling; all defaults produce identical behavior to untiled render)
    { name: Uniforms.ImageTileOrigin, type: 'vec2', default: new THREE.Vector2(0, 0) },
    { name: Uniforms.ImageTileSize, type: 'vec2', default: new THREE.Vector2(1, 1) },
    { name: Uniforms.FullOutputResolution, type: 'vec2', default: new THREE.Vector2(100, 100) },
    { name: Uniforms.TilePixelOrigin, type: 'vec2', default: new THREE.Vector2(0, 0) },

    // Progressive / Pipeline
    { name: Uniforms.HistoryTexture, type: 'sampler2D', default: null },
    { name: Uniforms.BlendFactor, type: 'float', default: 1.0 },
    { name: Uniforms.Jitter, type: 'vec2', default: new THREE.Vector2(0,0) },
    { name: Uniforms.BlueNoiseTexture, type: 'sampler2D', default: null },
     { name: Uniforms.BlueNoiseResolution, type: 'vec2', default: new THREE.Vector2(128, 128) }, // Blue noise texture is 128x128 (updated on load via MaterialController callback)
    
    // Tools (Histogram)
    { name: Uniforms.HistogramLayer, type: 'int', default: 0 },
    
    // Export/Render Scale
    { name: Uniforms.InternalScale, type: 'float', default: 1.0 },
    { name: Uniforms.PixelSizeBase, type: 'float', default: 0.01, comment: 'CPU: length(uCamBasisY)/resolution.y*2, avoids per-fragment sqrt' },

    // Multi-pass export (WorkerExporter drives these per session; harmless no-op at defaults).
    { name: Uniforms.OutputPass, type: 'float', default: 0.0, comment: '0=beauty, 1=alpha, 2=depth' },
    { name: Uniforms.DepthMin, type: 'float', default: 0.0 },
    { name: Uniforms.DepthMax, type: 'float', default: 5.0 },

    // Optimizations (Shared by Geometry & Lighting)
    { name: Uniforms.PreRotMatrix, type: 'mat3', default: new THREE.Matrix3() },
    { name: Uniforms.PostRotMatrix, type: 'mat3', default: new THREE.Matrix3() },
    { name: Uniforms.WorldRotMatrix, type: 'mat3', default: new THREE.Matrix3() },
    { name: Uniforms.EnvRotationMatrix, type: 'mat2', default: [1, 0, 0, 1] },
    { name: Uniforms.FogColorLinear, type: 'vec3', default: new THREE.Vector3(0, 0, 0), comment: 'CPU: InverseACESFilm(uFogColor)' },
];

const featureUniforms = featureRegistry.getUniformDefinitions();

// Collision detection at module-load time. Two failure modes the naming
// convention alone can't catch:
//   1. A feature redeclares a base-schema name (e.g. `uTime`).
//   2. Two features collide on a name (last registered would silently win
//      `UNIFORM_DEFAULTS`'s reduce).
// Both cases throw on first import so the breakage is loud and immediate
// instead of presenting as a mysterious wrong-default at render time.
const baseNames = new Set(BASE_SCHEMA.map(u => u.name));
const baseCollisions = featureUniforms.filter(u => baseNames.has(u.name)).map(u => u.name);
if (baseCollisions.length > 0) {
    throw new Error(
        `[UniformSchema] Feature uniform(s) shadow base schema: ${baseCollisions.join(', ')}. ` +
        `Rename in the feature def or remove the base entry.`
    );
}
const seenFeatureNames = new Set<string>();
const featureCollisions: string[] = [];
for (const u of featureUniforms) {
    if (seenFeatureNames.has(u.name)) featureCollisions.push(u.name);
    else seenFeatureNames.add(u.name);
}
if (featureCollisions.length > 0) {
    throw new Error(
        `[UniformSchema] Two features declare the same uniform: ${featureCollisions.join(', ')}. ` +
        `Rename one in its feature def.`
    );
}

export const UNIFORM_SCHEMA = [...BASE_SCHEMA, ...featureUniforms];

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
