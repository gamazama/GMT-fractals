
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { FOLD_LIST, FOLD_OPTIONS, getFold } from './folds';
import { SHARED_TRANSFORMS_GLSL } from './transforms';

// Re-export types
export type { FoldDefinition } from './types';

export interface GeometryState {
    // Engine Master Switch (Container)
    applyTransformLogic: boolean;

    preRotEnabled: boolean;
    preRotX: number;
    preRotY: number;
    preRotZ: number;
    preRot: THREE.Vector3;
    postRotX: number;
    postRotY: number;
    postRotZ: number;
    postRot: THREE.Vector3;
    worldRotX: number;
    worldRotY: number;
    worldRotZ: number;
    worldRot: THREE.Vector3;

    // Global Modifiers
    burningEnabled: boolean;

    juliaMode: boolean;
    juliaX: number;
    juliaY: number;
    juliaZ: number;
    julia: THREE.Vector3;

    // Hybrid Box (compile-time gate)
    hybridCompiled: boolean;

    // Hybrid Box (runtime toggle)
    hybridMode: boolean;

    // Hybrid Box (compile-time config)
    hybridFoldType: number;
    hybridComplex: boolean;
    hybridPermute: number;

    // Hybrid Box (runtime)
    hybridIter: number;
    hybridScale: number;
    hybridScaleVary: number;
    hybridMinR: number;
    hybridFixedR: number;
    hybridFoldLimit: number;
    hybridFoldLimitVec: THREE.Vector3;
    hybridAddC: boolean;
    hybridSkip: number;
    hybridSwap: boolean;
    hybridShift: THREE.Vector3;
    hybridRot: THREE.Vector3;

    // Fold-type-specific
    hybridFoldingValue: THREE.Vector3;
    hybridKaliConstant: THREE.Vector3;
    hybridMengerOffset: THREE.Vector3;
    hybridMengerCenterZ: boolean;

    preRotMaster: boolean;
}

// --- C-axis permutation (compile-time swizzle) ---
const PERMUTE_SWIZZLES = ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx'];

function buildPermuteGLSL(mode: number): string {
    const sw = PERMUTE_SWIZZLES[mode] ?? 'xyz';
    if (sw === 'xyz') return 'vec3 c_perm = c.xyz;';
    return `vec3 c_perm = c.${sw};`;
}

// --- Build the shared formula_Hybrid GLSL ---
function buildHybridFunctions(permuteCode: string, rotMode: 'wrap' | 'post', selfContained = false): string {
    // 'wrap': rotate z before fold, un-rotate after (plane-reflection folds)
    // 'post': rotation applied after fold+sphereFold (translation-based folds like Kali)
    const rotPre = rotMode === 'wrap'
        ? `if (hybridHasRot) z3 = hybridRotMat * z3;`
        : '';
    const rotPostFold = rotMode === 'wrap'
        ? `if (hybridHasRot) z3 = transpose(hybridRotMat) * z3;`
        : '';
    const rotPostSphere = rotMode === 'post'
        ? `if (hybridHasRot) { z3 = hybridRotMat * z3; }`
        : '';

    return `
mat3 hybridRotMat;
bool hybridHasRot;

void initHybridTransform() {
    vec3 hr = uHybridRot;
    hybridHasRot = (abs(hr.x) + abs(hr.y) + abs(hr.z)) > 0.001;
    hybridRotMat = mat3(1.0);
    if (hybridHasRot) {
        float sx = sin(hr.x), cx = cos(hr.x);
        float sy = sin(hr.y), cy = cos(hr.y);
        float sz = sin(hr.z), cz = cos(hr.z);
        hybridRotMat = mat3(
            cy*cz, -cy*sz, sy,
            sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy,
            -cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy
        );
    }
}

void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 z3 = z.xyz;
    // Transform into fold space
    ${rotPre}
    z3 += uHybridShift;

    foldOperation(z3, dr, uHybridFoldLimitVec);

    // Transform back out of fold space
    z3 -= uHybridShift;
    ${rotPostFold}

    ${selfContained ? '// selfContained fold — scaling + DR handled inside foldOperation' : `
    sphereFold(z3, dr, uHybridMinR, uHybridFixedR);
    ${rotPostSphere}

    // Dynamic scale variation (Mandelbulber ABoxVaryScale)
    float s = uHybridScale + uHybridScaleVary * (abs(uHybridScale) - 1.0);
    z3 *= s;`}

    // C-axis permutation
    ${permuteCode}
    if (uHybridAddC > 0.5) z3 += c_perm;

    z.xyz = z3;
    ${selfContained ? '' : 'dr = dr * abs(s) + 1.0;'}
    trap = min(trap, getLength(z3));
}
`;
}

// --- Collect extra params from all fold types (with conditions) ---
function buildFoldExtraParams(): Record<string, any> {
    const params: Record<string, any> = {};
    FOLD_LIST.forEach((fold, index) => {
        if (fold.extraParams) {
            Object.entries(fold.extraParams).forEach(([key, config]) => {
                params[key] = {
                    ...config,
                    condition: [
                        { param: 'hybridCompiled', bool: true },
                        { param: 'hybridMode', bool: true },
                        { param: 'hybridFoldType', eq: index },
                    ]
                };
            });
        }
    });
    return params;
}

export const GeometryFeature: FeatureDefinition = {
    id: 'geometry',
    shortId: 'g',
    name: 'Geometry',
    category: 'Formulas',
    customUI: [
        {
            componentId: 'interaction-picker',
            group: 'julia',
            parentId: 'juliaMode',
            condition: { bool: true },
            props: {
                targetMode: 'picking_julia',
                label: 'Pick Coordinate',
                activeLabel: 'Cancel Picking',
                helpText: 'Click any point on the fractal surface to set Julia coordinates.',
                variant: 'primary'
            }
        },
        {
            componentId: 'julia-randomize',
            group: 'julia',
            parentId: 'juliaMode',
            condition: { bool: true },
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
            description: 'Compiles rotation matrix logic. Disable for speed.', onUpdate: 'compile', noReset: true,
            estCompileMs: 600
        },

        // Hybrid Box — compile-time shader gate (Engine Panel)
        hybridCompiled: {
            type: 'boolean', default: false, label: 'Hybrid Box Fold', shortId: 'hcm',
            group: 'engine_settings', ui: 'checkbox',
            description: 'Compiles hybrid box fold system into shader. Toggle effect on/off instantly from Formula panel.',
            onUpdate: 'compile', noReset: true,
            estCompileMs: 1200
        },

        // Hybrid Box — runtime toggle (instant on/off via uniform, hidden — controlled by HybridBoxSection)
        hybridMode: {
            type: 'boolean', default: false, label: 'Hybrid Active', shortId: 'hm',
            uniform: 'uHybrid', group: 'hybrid', hidden: true,
        },

        // Fold type selector (compile-time — shown in both Engine Panel AND hybrid UI)
        hybridFoldType: {
            type: 'float', default: 0, label: 'Fold Type', shortId: 'hft',
            group: 'engine_settings',
            options: FOLD_OPTIONS.map(o => ({ ...o, estCompileMs: 400 })),
            description: 'Box fold algorithm. Each type produces fundamentally different geometry.',
            onUpdate: 'compile', noReset: true,
            condition: { param: 'hybridCompiled', bool: true }
        },

        // Advanced Hybrid (compile-time interleaving)
        hybridComplex: {
            type: 'boolean', default: false, label: 'Interleaved Mode', shortId: 'hx',
            group: 'engine_settings', ui: 'checkbox',
            description: 'Interleaves fold with fractal formula (Box \u2192 Fractal \u2192 Box). Slow compile.',
            onUpdate: 'compile', noReset: true,
            estCompileMs: 1500,
            condition: { param: 'hybridCompiled', bool: true }
        },

        // C-axis permutation (compile-time)
        hybridPermute: {
            type: 'float', default: 0, label: 'Axis Permutation', shortId: 'hpe',
            group: 'engine_settings',
            options: [
                { label: 'XYZ (Default)', value: 0 },
                { label: 'XZY', value: 1 },
                { label: 'YXZ', value: 2 },
                { label: 'YZX', value: 3 },
                { label: 'ZXY', value: 4 },
                { label: 'ZYX', value: 5 },
            ],
            description: 'Permutes the constant (c) axis mapping. Changes fractal topology.',
            onUpdate: 'compile', noReset: true,
            condition: { param: 'hybridCompiled', bool: true }
        },

        // --- GLOBAL MODIFIERS (Runtime) ---
        burningEnabled: {
            type: 'boolean', default: false, label: 'Burning Mode', shortId: 'bm', group: 'burning',
            description: 'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',
            uniform: 'uBurningEnabled'
        },

        // --- HYBRID BOX RUNTIME PARAMS (visible when compiled AND active) ---
        hybridIter: { type: 'float', default: 2.0, label: 'Iterations', shortId: 'hi', uniform: 'uHybridIter', min: 0, max: 10, step: 1, group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },
        hybridFoldLimit: { type: 'float', default: 1.0, label: 'Fold Limit', shortId: 'hl', uniform: 'uHybridFoldLimit', min: 0.1, max: 2.0, step: 0.01, group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }], hidden: true },
        hybridFoldLimitVec: {
            type: 'vec3', default: new THREE.Vector3(1, 1, 1), label: 'Fold Limit',
            shortId: 'hlv', uniform: 'uHybridFoldLimitVec', min: 0.1, max: 3.0, step: 0.01,
            group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }, { param: 'hybridFoldType', lt: 4 }],
            linkable: true
        },
        hybridScale: { type: 'float', default: 2.0, label: 'Scale', shortId: 'hs', uniform: 'uHybridScale', min: 0.5, max: 3.0, step: 0.01, group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },
        hybridScaleVary: {
            type: 'float', default: 0.0, label: 'Scale Variation', shortId: 'hsv',
            uniform: 'uHybridScaleVary', min: -1.0, max: 1.0, step: 0.01,
            group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }],
            description: 'Dynamic scale feedback per iteration (ABoxVaryScale).'
        },
        hybridMinR: { type: 'float', default: 0.5, label: 'Min Radius', shortId: 'hn', uniform: 'uHybridMinR', min: 0.0, max: 1.5, step: 0.01, group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },
        hybridFixedR: { type: 'float', default: 1.0, label: 'Fixed Radius', shortId: 'hf', uniform: 'uHybridFixedR', min: 0.1, max: 3.0, step: 0.01, group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },
        hybridAddC: { type: 'boolean', default: false, label: 'Add Constant', shortId: 'hc', uniform: 'uHybridAddC', group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },

        // Hybrid Transform
        hybridShift: { type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Shift', shortId: 'hs2', uniform: 'uHybridShift', min: -2.0, max: 2.0, step: 0.01, group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },
        hybridRot: { type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Rotation', shortId: 'hr', uniform: 'uHybridRot', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', mode: 'rotation', group: 'hybrid', condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }] },

        // Fold-type-specific params (auto-injected from fold definitions, with eq conditions)
        ...buildFoldExtraParams(),

        // Interleaved Hybrid Options (compile-time — eliminate runtime branches)
        hybridSwap: {
            type: 'boolean', default: false, label: 'Swap Order', shortId: 'hw',
            group: 'engine_settings', ui: 'checkbox',
            description: 'Start with fractal formula instead of box fold.',
            onUpdate: 'compile', noReset: true,
            condition: [{ param: 'hybridCompiled', bool: true }, { param: 'hybridComplex', bool: true }]
        },
        hybridSkip: {
            type: 'int', default: 1, label: 'Hybrid Interval', shortId: 'hk', uniform: 'uHybridSkip', min: 1, max: 8, step: 1, group: 'hybrid',
            condition: [{ param: 'hybridComplex', bool: true }, { param: 'hybridCompiled', bool: true }, { param: 'hybridMode', bool: true }]
        },

        // --- LOCAL ROTATION (Runtime) ---
        preRotEnabled: {
            type: 'boolean',
            default: false,
            label: 'Local Rotation',
            shortId: 're',
            group: 'transform',
            condition: { param: 'preRotMaster', bool: true }
        },

        // Pre-rotation (before formula, inside loop)
        preRotX: { type: 'float', default: 0.0, label: 'Pre X', shortId: 'rx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        preRotY: { type: 'float', default: 0.0, label: 'Pre Y', shortId: 'ry', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        preRotZ: { type: 'float', default: 0.0, label: 'Pre Z', shortId: 'rz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        preRot: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Pre Rotation',
            composeFrom: ['preRotX', 'preRotY', 'preRotZ'],
            min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi',
            group: 'transform', parentId: 'preRotEnabled', condition: { bool: true },
        },
        // Post-rotation (after formula, inside loop)
        postRotX: { type: 'float', default: 0.0, label: 'Post X', shortId: 'qx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        postRotY: { type: 'float', default: 0.0, label: 'Post Y', shortId: 'qy', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        postRotZ: { type: 'float', default: 0.0, label: 'Post Z', shortId: 'qz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        postRot: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Post Rotation',
            composeFrom: ['postRotX', 'postRotY', 'postRotZ'],
            min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi',
            group: 'transform', parentId: 'preRotEnabled', condition: { bool: true },
        },
        // World-space rotation (outside loop, applied to p before iteration)
        worldRotX: { type: 'float', default: 0.0, label: 'World X', shortId: 'wx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        worldRotY: { type: 'float', default: 0.0, label: 'World Y', shortId: 'wy', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        worldRotZ: { type: 'float', default: 0.0, label: 'World Z', shortId: 'wz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        worldRot: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'World Rotation',
            composeFrom: ['worldRotX', 'worldRotY', 'worldRotZ'],
            min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi',
            group: 'transform', parentId: 'preRotEnabled', condition: { bool: true },
        },

        // --- JULIA SET ---
        juliaMode: {
            type: 'boolean', default: false, label: 'Julia Mode', shortId: 'jm', uniform: 'uJuliaMode', group: 'julia',
            description: 'Replaces the iterating variable with a fixed coordinate, producing connected Julia set slices.',
        },
        juliaX: { type: 'float', default: 0.0, label: 'Julia X', shortId: 'jx', min: -2.0, max: 2.0, step: 0.01, group: 'julia_params', condition: { param: 'juliaMode', bool: true }, hidden: true },
        juliaY: { type: 'float', default: 0.0, label: 'Julia Y', shortId: 'jy', min: -2.0, max: 2.0, step: 0.01, group: 'julia_params', condition: { param: 'juliaMode', bool: true }, hidden: true },
        juliaZ: { type: 'float', default: 0.0, label: 'Julia Z', shortId: 'jz', min: -2.0, max: 2.0, step: 0.01, group: 'julia_params', condition: { param: 'juliaMode', bool: true }, hidden: true },
        julia: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Julia Coordinate',
            uniform: 'uJulia', composeFrom: ['juliaX', 'juliaY', 'juliaZ'],
            min: -2.0, max: 2.0, step: 0.01,
            group: 'julia', parentId: 'juliaMode', condition: { bool: true },
        },
    },
    inject: (builder, config) => {
        const state = config.geometry as GeometryState;
        const isEnabled = state ? state.applyTransformLogic : true;

        if (isEnabled === false) {
            builder.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);
            return;
        }

        // 1. Rotation Logic
        const useRotation = state ? (state.preRotMaster !== false) : true;
        builder.setRotation(useRotation);

        // 1b. Shared transform utilities (twist, Rodrigues rotation)
        // Injected as preamble (stage 7) so they're available to formula functions (stage 8)
        builder.addPreamble(SHARED_TRANSFORMS_GLSL);

        // 2. Hybrid Box — compile-time gated by hybridCompiled
        const hybridCompiled = state?.hybridCompiled ?? false;

        if (!hybridCompiled) {
            // No hybrid — inject no-op stubs so shader compiles
            builder.addFunction(`void foldOperation(inout vec3 z, inout float dr, vec3 foldLimit) {}
void initHybridTransform() {}
void formula_Hybrid(inout vec4 z, inout float dr, inout float trap, vec4 c) {}`);
        } else {
            // Select fold type and inject its GLSL
            const foldTypeIndex = state?.hybridFoldType ?? 0;
            const fold = getFold(foldTypeIndex);
            builder.addFunction(fold.glsl);

            // Build and inject formula_Hybrid with permutation
            const permuteIndex = state?.hybridPermute ?? 0;
            const permuteCode = buildPermuteGLSL(permuteIndex);
            builder.addFunction(buildHybridFunctions(permuteCode, fold.rotMode ?? 'wrap', fold.selfContained ?? false));
        }

        let hybridPreLoop = "";
        let hybridInLoop = "";

        // --- BURNING MODE (Global Runtime) ---
        const formula = config.formula;
        if (formula !== 'MandelTerrain') {
            hybridInLoop += `z.xyz = mix(z.xyz, abs(z.xyz), step(0.5, uBurningEnabled));`;
        }

        if (hybridCompiled) {
            const isComplex = state && state.hybridComplex;

            if (!isComplex) {
                // Fast Path — pre-loop box fold iterations, guarded by runtime uniform
                hybridPreLoop += `
                if (uHybrid > 0.5) {
                    initHybridTransform();
                    int hLim = int(uHybridIter);
                    for(int i=0; i<16; i++) {
                        if (i >= hLim) break;
                        formula_Hybrid(z, dr, trap, c);
                    }
                }
                `;
            } else {
                // Interleaved Path — init + per-iteration fold, guarded by runtime uniform
                // Swap is baked at compile time to eliminate runtime branches
                const swapEnabled = state?.hybridSwap ?? false;

                hybridPreLoop += `if (uHybrid > 0.5) { initHybridTransform(); }\n`;

                hybridInLoop += `
                if (uHybrid > 0.5) {
                    int skip = int(uHybridSkip);
                    if (skip < 1) skip = 1;

                    if (i >= ${swapEnabled ? '1' : '0'}) {
                        int rel_i = i - ${swapEnabled ? '1' : '0'};

                        if ((rel_i % skip) == 0 && (rel_i / skip) < int(uHybridIter)) {
                            formula_Hybrid(z, dr, trap, c);
                            skipMainFormula = true;
                        }
                    }
                }
                `;
            }
        }

        builder.addHybridFold("", hybridPreLoop, hybridInLoop);
    }
};
