
import { FeatureDefinition } from '../engine/FeatureSystem';
import * as THREE from 'three';

export interface GeometryState {
    // Engine Master Switch (Container)
    applyTransformLogic: boolean;

    preRotEnabled: boolean;
    preRotY: number;
    preRotX: number;
    preRotZ: number;
    preRot: THREE.Vector3;
    
    // Global Modifiers
    burningEnabled: boolean;

    juliaMode: boolean;
    juliaX: number;
    juliaY: number;
    juliaZ: number;
    julia: THREE.Vector3;
    
    hybridMode: boolean;
    hybridIter: number;
    hybridScale: number;
    hybridMinR: number;
    hybridFixedR: number;
    hybridFoldLimit: number;
    hybridAddC: boolean;
    hybridComplex: boolean;
    hybridProtect: boolean;
    hybridSkip: number;
    hybridSwap: boolean;
    preRotMaster: boolean;
}

const HYBRID_FUNCTIONS = `
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
    boxFold(z3, dr, uHybridFoldLimit); 
    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    z3 *= uHybridScale;
    if (uHybridAddC > 0.5) z3 += c.xyz;
    z.xyz = z3;
    dr = dr * abs(uHybridScale) + 1.0;
    trap = min(trap, getLength(z3));
}
`;

export const GeometryFeature: FeatureDefinition = {
    id: 'geometry',
    shortId: 'g',
    name: 'Geometry',
    category: 'Formulas',
    customUI: [
        {
            componentId: 'julia-picker',
            group: 'julia',
            condition: { param: 'juliaMode', bool: true }
        }
    ],
    engineConfig: {
        toggleParam: 'applyTransformLogic',
        mode: 'compile',
        label: 'Geometry Modifiers',
        groupFilter: 'engine_settings'
    },
    params: {
        // --- MASTER CONTAINER SWITCH ---
        applyTransformLogic: {
            type: 'boolean', default: true, label: 'Geometry Engine', shortId: 'gt', group: 'main',
            description: 'Master switch for geometry modifiers (Julia, Rotation, Hybrid).', noReset: true, hidden: true
        },

        // --- ENGINE SETTINGS (Compiled) ---
        preRotMaster: {
            type: 'boolean', default: true, label: 'Enable Rotation', shortId: 'rm', group: 'engine_settings',
            ui: 'checkbox',
            description: 'Compiles rotation matrix logic. Disable for speed.', onUpdate: 'compile', noReset: true
        },
        hybridComplex: { 
            type: 'boolean', default: false, label: 'Advanced Hybrid', shortId: 'hx', uniform: 'uHybridComplex', group: 'engine_settings',
            ui: 'checkbox',
            description: 'Enables interleaved folding (Box -> Fractal -> Box). Slow compile.', onUpdate: 'compile', noReset: true 
        },

        // --- GLOBAL MODIFIERS (Runtime) ---
        burningEnabled: { 
            type: 'boolean', default: false, label: 'Burning Mode', shortId: 'bm', uniform: 'uBurningEnabled', group: 'transform', 
            description: 'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.'
        },

        // --- HYBRID (Runtime) ---
        hybridMode: { type: 'boolean', default: false, label: 'Hybrid (Box Mode)', shortId: 'hm', uniform: 'uHybrid', group: 'hybrid' },
        hybridIter: { type: 'float', default: 2.0, label: 'Iterations', shortId: 'hi', uniform: 'uHybridIter', min: 0, max: 10, step: 1, group: 'hybrid', condition: { param: 'hybridMode', bool: true } },
        hybridFoldLimit: { type: 'float', default: 1.0, label: 'Fold Limit', shortId: 'hl', uniform: 'uHybridFoldLimit', min: 0.1, max: 2.0, step: 0.01, group: 'hybrid', condition: { param: 'hybridMode', bool: true } },
        hybridScale: { type: 'float', default: 2.0, label: 'Scale', shortId: 'hs', uniform: 'uHybridScale', min: 1.0, max: 3.0, step: 0.01, group: 'hybrid', condition: { param: 'hybridMode', bool: true } },
        hybridMinR: { type: 'float', default: 0.5, label: 'Min Radius', shortId: 'hn', uniform: 'uHybridMinR', min: 0.0, max: 1.5, step: 0.01, group: 'hybrid', condition: { param: 'hybridMode', bool: true } },
        hybridFixedR: { type: 'float', default: 1.0, label: 'Fixed Radius', shortId: 'hf', uniform: 'uHybridFixedR', min: 0.1, max: 3.0, step: 0.01, group: 'hybrid', condition: { param: 'hybridMode', bool: true } },
        hybridAddC: { type: 'boolean', default: false, label: 'Add Constant', shortId: 'hc', uniform: 'uHybridAddC', group: 'hybrid', condition: { param: 'hybridMode', bool: true } },
        
        // Advanced Hybrid Options
        hybridProtect: { 
            type: 'boolean', default: true, label: 'Protect Axis', shortId: 'hp', uniform: 'uHybridProtect', group: 'hybrid', 
            condition: [{ param: 'hybridComplex', bool: true }, { param: 'hybridMode', bool: true }]
        },
        hybridSwap: { 
            type: 'boolean', default: false, label: 'Swap Order', shortId: 'hw', uniform: 'uHybridSwap', group: 'hybrid', 
            condition: [{ param: 'hybridComplex', bool: true }, { param: 'hybridMode', bool: true }]
        },
        hybridSkip: { 
            type: 'int', default: 1, label: 'Hybrid Interval', shortId: 'hk', uniform: 'uHybridSkip', min: 1, max: 8, step: 1, group: 'hybrid', 
            condition: [{ param: 'hybridComplex', bool: true }, { param: 'hybridMode', bool: true }]
        },

        // --- LOCAL ROTATION (Runtime) ---
        preRotEnabled: {
            type: 'boolean',
            default: false,
            label: 'Local Rotation',
            shortId: 're',
            uniform: 'uPreRotEnabled',
            group: 'transform',
            condition: { param: 'preRotMaster', bool: true }
        },
        preRotY: { type: 'float', default: 0.0, label: 'Spin Y', shortId: 'ry', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true } },
        preRotX: { type: 'float', default: 0.0, label: 'Spin X', shortId: 'rx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true } },
        preRotZ: { type: 'float', default: 0.0, label: 'Spin Z', shortId: 'rz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true } },
        
        preRot: { type: 'vec3', default: new THREE.Vector3(0,0,0), label: 'Pre Rotation', composeFrom: ['preRotX', 'preRotY', 'preRotZ'], hidden: true },

        // --- JULIA SET ---
        juliaMode: { type: 'boolean', default: false, label: 'Julia Mode', shortId: 'jm', uniform: 'uJuliaMode', group: 'julia' },
        juliaX: { type: 'float', default: 0.0, label: 'Julia X', shortId: 'jx', min: -2.0, max: 2.0, step: 0.01, group: 'julia_params', condition: { param: 'juliaMode', bool: true } },
        juliaY: { type: 'float', default: 0.0, label: 'Julia Y', shortId: 'jy', min: -2.0, max: 2.0, step: 0.01, group: 'julia_params', condition: { param: 'juliaMode', bool: true } },
        juliaZ: { type: 'float', default: 0.0, label: 'Julia Z', shortId: 'jz', min: -2.0, max: 2.0, step: 0.01, group: 'julia_params', condition: { param: 'juliaMode', bool: true } },
        julia: { type: 'vec3', default: new THREE.Vector3(0,0,0), label: 'Julia Vector', uniform: 'uJulia', composeFrom: ['juliaX', 'juliaY', 'juliaZ'], hidden: true },
    },
    inject: (builder, config) => {
        const state = config.geometry as GeometryState;
        const isEnabled = state ? state.applyTransformLogic : true;
        
        if (isEnabled === false) {
             builder.addFunction(`void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);
             return;
        }

        // 1. Rotation Logic
        const useRotation = state ? (state.preRotMaster !== false) : true;
        builder.setRotation(useRotation);

        // 2. Hybrid Logic
        builder.addFunction(HYBRID_FUNCTIONS);

        let hybridPreLoop = "";
        let hybridInLoop = "";

        // --- BURNING MODE (Global) ---
        const formula = config.formula;
        if (formula !== 'MandelTerrain') {
            hybridInLoop += `
            if (uBurningEnabled > 0.5) {
                z.xyz = abs(z.xyz);
            }
            `;
        }

        const isComplex = state && state.hybridComplex;

        if (!isComplex) {
            // Fast Path
            hybridPreLoop = `
            if (uHybrid > 0.5) {
                int hLim = int(uHybridIter);
                for(int i=0; i<16; i++) {
                    if (i >= hLim) break;
                    formula_Hybrid(z, dr, trap, c);
                }
            }
            `;
        } else {
             // Complex Path
             hybridInLoop += `
             if (uHybrid > 0.5) {
                int startI = (uHybridSwap > 0.5) ? 1 : 0;
                int skip = int(uHybridSkip);
                if (skip < 1) skip = 1; 
                
                if (i >= startI) {
                    int rel_i = i - startI;
                    
                    if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                        
                        if (uHybridProtect > 0.5 && rotated) {
                            unapplyLocalRotation(z.xyz);
                            rotated = false;
                        }
                        
                        formula_Hybrid(z, dr, trap, c);
                        skipMainFormula = true;
                    }
                }
             }
             `;
        }
        
        builder.addHybrid("", hybridPreLoop, hybridInLoop);
    }
};
