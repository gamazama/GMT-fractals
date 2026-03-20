
import * as THREE from 'three';
import { FeatureDefinition } from '../engine/FeatureSystem';
import { registry } from '../engine/FractalRegistry';
import { MAX_MODULAR_PARAMS } from '../data/constants';
import { compileGraph } from '../utils/GraphCompiler';
import { FormulaType } from '../types';
import { QualityState } from './quality';
import { Uniforms } from '../engine/UniformNames';

export interface CoreMathState {
    iterations: number;
    paramA: number;
    paramB: number;
    paramC: number;
    paramD: number;
    paramE: number;
    paramF: number;
    // NEW: Vector Parameters
    vec2A: { x: number; y: number };
    vec2B: { x: number; y: number };
    vec2C: { x: number; y: number };
    vec3A: { x: number; y: number; z: number } | THREE.Vector3;
    vec3B: { x: number; y: number; z: number } | THREE.Vector3;
    vec3C: { x: number; y: number; z: number } | THREE.Vector3;
    vec4A: { x: number; y: number; z: number; w: number } | THREE.Vector4;
    vec4B: { x: number; y: number; z: number; w: number } | THREE.Vector4;
    vec4C: { x: number; y: number; z: number; w: number } | THREE.Vector4;
}

// Generate optimized DE logic based on compile-time estimator type
const generateGetDist = (estimatorType: number) => {
    let mathLine = "d = 0.5 * log(max(r, 1.0e-5)) * r / dr_safe;"; // Default 0 (Analytic)

    // Optimized GPU math using log2 where possible
    if (estimatorType < 0.5) {
        // 0: Analytic (Log) - Standard for Power Fractals
        // d = 0.5 * r * log(r) / dr
        mathLine = `
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `;
    } else if (estimatorType < 1.5) {
        // 1: Linear (Fold 1.0) - Standard for Box/Menger
        // d = (r - 1.0) / dr
        mathLine = `d = (r - 1.0) / dr_safe;`;
    } else if (estimatorType < 2.5) {
        // 2: Pseudo (Raw) - Good for Artifacts
        // d = r / dr
        mathLine = `d = r / dr_safe;`;
    } else if (estimatorType < 3.5) {
        // 3: Dampened - Fix Slices
        // d = 0.5 * r * log(r) / (dr + K)
        mathLine = `
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `;
    } else {
        // 4: Linear (Fold 2.0) - Classic Menger offset
        // d = (r - 2.0) / dr
        mathLine = `d = (r - 2.0) / dr_safe;`;
    }

    return `
        vec2 getDist(float r, float dr, float iter, vec4 z) {
            float m2 = r * r;
            if (m2 < 1.0e-20) return vec2(0.0, iter);
            
            // Log Smoothing Calculation (Shared)
            // Guarded: Only calculate log smoothing if we have actually escaped (> 1.0)
            float smoothIter = iter;
            if (m2 > 1.0) {
                float threshLog = log2(max(uEscapeThresh, 1.1));
                smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
            }
            
            float d = 0.0;
            float dr_safe = max(abs(dr), 1.0e-20);
            
            ${mathLine}
            
            return vec2(d, smoothIter);
        }`;
};

export const CoreMathFeature: FeatureDefinition = {
    id: 'coreMath',
    shortId: 'cm',
    name: 'Formula Math',
    category: 'Formulas',
    tabConfig: { label: 'Formula', componentId: 'panel-formula', order: 10 },
    extraUniforms: [
        { name: Uniforms.ModularParams, type: 'float', arraySize: MAX_MODULAR_PARAMS, default: new Float32Array(MAX_MODULAR_PARAMS) }
    ],
    params: {
        iterations: { type: 'float', default: 16, label: 'Iterations', shortId: 'it', uniform: 'uIterations', min: 1, max: 500, step: 1, group: 'main' },
        paramA: { type: 'float', default: 8.0, label: 'Param A', shortId: 'pa', uniform: 'uParamA', min: -10, max: 10, step: 0.001, group: 'params' },
        paramB: { type: 'float', default: 0.0, label: 'Param B', shortId: 'pb', uniform: 'uParamB', min: -10, max: 10, step: 0.001, group: 'params' },
        paramC: { type: 'float', default: 0.0, label: 'Param C', shortId: 'pc', uniform: 'uParamC', min: -10, max: 10, step: 0.001, group: 'params' },
        paramD: { type: 'float', default: 0.0, label: 'Param D', shortId: 'pd', uniform: 'uParamD', min: -10, max: 10, step: 0.001, group: 'params' },
        paramE: { type: 'float', default: 0.0, label: 'Param E', shortId: 'pe', uniform: 'uParamE', min: -10, max: 10, step: 0.001, group: 'params' },
        paramF: { type: 'float', default: 0.0, label: 'Param F', shortId: 'pf', uniform: 'uParamF', min: -10, max: 10, step: 0.001, group: 'params' },
        // NEW: Vector Parameters
        vec2A: { type: 'vec2', default: { x: 0, y: 0 }, label: 'Vec2 A', shortId: 'v2a', uniform: 'uVec2A', min: -10, max: 10, step: 0.001, group: 'params' },
        vec2B: { type: 'vec2', default: { x: 0, y: 0 }, label: 'Vec2 B', shortId: 'v2b', uniform: 'uVec2B', min: -10, max: 10, step: 0.001, group: 'params' },
        vec2C: { type: 'vec2', default: { x: 0, y: 0 }, label: 'Vec2 C', shortId: 'v2c', uniform: 'uVec2C', min: -10, max: 10, step: 0.001, group: 'params' },
        vec3A: { type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Vec3 A', shortId: 'v3a', uniform: 'uVec3A', min: -10, max: 10, step: 0.001, group: 'params' },
        vec3B: { type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Vec3 B', shortId: 'v3b', uniform: 'uVec3B', min: -10, max: 10, step: 0.001, group: 'params' },
        vec3C: { type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Vec3 C', shortId: 'v3c', uniform: 'uVec3C', min: -10, max: 10, step: 0.001, group: 'params' },
        vec4A: { type: 'vec4', default: new THREE.Vector4(0, 0, 0, 0), label: 'Vec4 A', shortId: 'v4a', uniform: 'uVec4A', min: -10, max: 10, step: 0.001, group: 'params' },
        vec4B: { type: 'vec4', default: new THREE.Vector4(0, 0, 0, 0), label: 'Vec4 B', shortId: 'v4b', uniform: 'uVec4B', min: -10, max: 10, step: 0.001, group: 'params' },
        vec4C: { type: 'vec4', default: new THREE.Vector4(0, 0, 0, 0), label: 'Vec4 C', shortId: 'v4c', uniform: 'uVec4C', min: -10, max: 10, step: 0.001, group: 'params' }
    },
    inject: (builder, config) => {
        const formula = config.formula as FormulaType;
        const quality = config.quality as QualityState;
        
        // 1. Modular pipeline revision (forces recompile when graph changes)
        if (formula === 'Modular') {
            builder.addDefine('PIPELINE_REV', (config.pipelineRevision || 0).toString());
        }

        // 2. Analytic Opt-in
        if (['JuliaMorph', 'MandelTerrain'].includes(formula)) {
            builder.addDefine('SKIP_PRE_BAILOUT', '1');
        }

        // 3. Generate Code
        const def = registry.get(formula);
        let functions = "";
        let loopBody = "";
        let loopInit = "";
        
        // Generate optimized getDist based on Quality Settings
        // Default to 0 (Analytic) if missing
        const estimatorType = quality?.estimator || 0;
        let getDistBody = generateGetDist(estimatorType);

        if (formula === 'Modular') {
            const modularCode = compileGraph(config.pipeline || [], config.graph?.edges || []);
            functions += modularCode + "\n";
            loopBody = `formula_Modular(z, dr, trap, distOverride, c, i);`;
            builder.setDistOverride({
                init: 'float distOverride = 1e10;',
                inLoopFull: 'if (distOverride < 999.0) { escaped = true; break; }',
                inLoopGeom: 'if (distOverride < 999.0) break;',
                postFull: 'if (distOverride < 999.0) { finalD = distOverride; smoothIter = iter; }',
                postGeom: 'if (distOverride < 999.0) finalD = distOverride;',
            });
            // Modular also uses Dynamic DE Logic
        } else if (def) {
            functions += def.shader.function + "\n";
            loopBody = def.shader.loopBody;
            loopInit = def.shader.loopInit || "";
            // Inject preamble if present (for pre-calculation at global scope)
            if (def.shader.preamble) {
                builder.addPreamble(def.shader.preamble);
            }
            // Use custom getDist if defined, else use dynamic
            if (def.shader.getDist) {
                 getDistBody = `vec2 getDist(float r, float dr, float iter, vec4 z) { ${def.shader.getDist} }`;
            }
        }

        builder.addFunction(functions);
        builder.setFormula(loopBody, loopInit, getDistBody);
    }
};
