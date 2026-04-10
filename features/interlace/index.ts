
import * as THREE from 'three';
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { registry } from '../../engine/FractalRegistry';
import type { FormulaType } from '../../types';
import {
    rewriteFormulaFunction,
    rewriteLoopBody,
    rewriteLoopInit,
    rewritePreamble,
    buildInterlaceLoopGLSL,
    INTERLACE_UNIFORM_NAMES,
} from './glslRewriter';

export interface InterlaceState {
    // Compile-time (trigger recompile)
    interlaceCompiled: boolean;
    interlaceFormula: string;

    // Runtime (uniform-driven)
    interlaceEnabled: boolean;
    interlaceInterval: number;
    interlaceStartIter: number;

    // Secondary formula parameters
    interlaceParamA: number;
    interlaceParamB: number;
    interlaceParamC: number;
    interlaceParamD: number;
    interlaceParamE: number;
    interlaceParamF: number;
    interlaceVec2A: { x: number; y: number };
    interlaceVec2B: { x: number; y: number };
    interlaceVec2C: { x: number; y: number };
    interlaceVec3A: THREE.Vector3 | { x: number; y: number; z: number };
    interlaceVec3B: THREE.Vector3 | { x: number; y: number; z: number };
    interlaceVec3C: THREE.Vector3 | { x: number; y: number; z: number };
}

/**
 * Build the list of formula options for the dropdown.
 * Excludes Modular (not compatible with interlacing).
 */
function getFormulaOptions() {
    return registry.getAll()
        .filter(def => def.id !== 'Modular')
        .map(def => ({ label: def.name, value: def.id }));
}

/** Map interlace param keys to formula parameter IDs */
const INTERLACE_PARAM_MAP: Record<string, string> = {
    interlaceParamA: 'paramA', interlaceParamB: 'paramB', interlaceParamC: 'paramC',
    interlaceParamD: 'paramD', interlaceParamE: 'paramE', interlaceParamF: 'paramF',
    interlaceVec3A: 'vec3A', interlaceVec3B: 'vec3B', interlaceVec3C: 'vec3C',
    interlaceVec2A: 'vec2A', interlaceVec2B: 'vec2B', interlaceVec2C: 'vec2C',
};

/** Inverse: formula param ID → interlace state key */
const INTERLACE_PARAM_MAP_INVERSE: Record<string, string> = Object.fromEntries(
    Object.entries(INTERLACE_PARAM_MAP).map(([k, v]) => [v, k])
);

/** Build interlace param defaults from a secondary formula's parameter definitions */
function buildInterlaceDefaults(formulaId: string): Record<string, any> {
    const def = registry.get(formulaId as FormulaType);
    if (!def) return {};
    const result: Record<string, any> = {};
    for (const p of def.parameters) {
        if (!p) continue;
        const interlaceKey = INTERLACE_PARAM_MAP_INVERSE[p.id];
        if (interlaceKey !== undefined) {
            result[interlaceKey] = p.default;
        }
    }
    return result;
}

/** Look up the secondary formula's parameter definition for a given interlace param key */
function getFormulaParam(sliceState: any, interlaceKey: string) {
    const formulaId = sliceState?.interlaceFormula as string;
    if (!formulaId) return undefined;
    const def = registry.get(formulaId as FormulaType);
    if (!def) return undefined;
    const targetId = INTERLACE_PARAM_MAP[interlaceKey];
    return def.parameters.find(p => p && p.id === targetId) ?? undefined;
}

/** Dynamic config: mirrors the secondary formula's UI config for this param slot */
function makeDynamicConfig(interlaceKey: string) {
    return (sliceState: any) => {
        const fp = getFormulaParam(sliceState, interlaceKey);
        if (!fp) return undefined;
        const overrides: Record<string, any> = { label: fp.label };
        if (fp.min !== undefined) overrides.min = fp.min;
        if (fp.max !== undefined) overrides.max = fp.max;
        if (fp.step !== undefined) overrides.step = fp.step;
        if (fp.mode) overrides.mode = fp.mode;
        if (fp.scale) overrides.scale = fp.scale;
        if (fp.linkable !== undefined) overrides.linkable = fp.linkable;
        if (fp.options) overrides.options = fp.options;
        return overrides;
    };
}

/** Dynamic visibility: returns true only if the secondary formula uses this param slot */
function makeDynamicVisible(interlaceKey: string) {
    return (sliceState: any): boolean => {
        return !!getFormulaParam(sliceState, interlaceKey);
    };
}

export const InterlaceFeature: FeatureDefinition = {
    id: 'interlace',
    shortId: 'il',
    name: 'Formula Interlace',
    category: 'Formulas',
    dependsOn: ['coreMath', 'geometry'],

    engineConfig: {
        toggleParam: 'interlaceCompiled',
        mode: 'compile',
        label: 'Formula Interlacing',
        description: 'Alternate between two formulas per iteration (like Mandelbulber hybrid).',
        groupFilter: 'engine_settings'
    },

    panelConfig: {
        compileParam: 'interlaceCompiled',
        runtimeToggleParam: 'interlaceEnabled',
        compileSettingsParams: ['interlaceFormula'],
        runtimeGroup: 'interlace_runtime',
        label: 'Interlace',
        compileMessage: 'Compiling interlaced formula...',
    },

    // No extraUniforms needed — all interlace uniforms are declared via params with `uniform` field.
    // Using both would cause duplicate GLSL declarations (redefinition error).

    params: {
        // --- Engine Settings (Compile-Time) ---
        interlaceCompiled: {
            type: 'boolean', default: false, label: 'Formula Interlacing', shortId: 'ilc',
            group: 'engine_settings', ui: 'checkbox',
            description: 'Compiles a secondary formula into the shader for per-iteration alternation.',
            onUpdate: 'compile', noReset: true,
            estCompileMs: 1500
        },
        interlaceFormula: {
            type: 'float', default: 'Mandelbulb', label: 'Secondary Formula', shortId: 'ilf',
            group: 'engine_settings',
            get options() {
                return getFormulaOptions().map(o => ({ label: o.label, value: o.value, estCompileMs: 800 }));
            },
            description: 'Formula to alternate with the primary formula each iteration.',
            onUpdate: 'compile', noReset: true,
            condition: { param: 'interlaceCompiled', bool: true },
            // When the secondary formula changes, load its parameter defaults
            onSet: (newFormulaId: string) => buildInterlaceDefaults(newFormulaId),
        },

        // --- Runtime Controls ---
        interlaceEnabled: {
            type: 'boolean', default: false, label: 'Interlace Active', shortId: 'ile',
            uniform: 'uInterlaceEnabled', group: 'interlace_runtime', hidden: true,
        },
        interlaceInterval: {
            type: 'float', default: 2, label: 'Interval', shortId: 'ili',
            uniform: 'uInterlaceInterval', min: 1, max: 10, step: 1,
            group: 'interlace_runtime',
            description: 'Run secondary formula every N iterations.',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }]
        },
        interlaceStartIter: {
            type: 'float', default: 0, label: 'Start Iter', shortId: 'ils',
            uniform: 'uInterlaceStartIter', min: 0, max: 20, step: 1,
            group: 'interlace_runtime',
            description: 'First iteration where secondary formula runs.',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }]
        },

        // --- Secondary Formula Parameters (mapped to interlace uniforms) ---
        interlaceParamA: {
            type: 'float', default: 8.0, label: 'Param A', shortId: 'ila',
            uniform: 'uInterlaceParamA', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceParamA'),
            dynamicVisible: makeDynamicVisible('interlaceParamA'),
        },
        interlaceParamB: {
            type: 'float', default: 0, label: 'Param B', shortId: 'ilb',
            uniform: 'uInterlaceParamB', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceParamB'),
            dynamicVisible: makeDynamicVisible('interlaceParamB'),
        },
        interlaceParamC: {
            type: 'float', default: 0, label: 'Param C', shortId: 'ilc2',
            uniform: 'uInterlaceParamC', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceParamC'),
            dynamicVisible: makeDynamicVisible('interlaceParamC'),
        },
        interlaceParamD: {
            type: 'float', default: 0, label: 'Param D', shortId: 'ild',
            uniform: 'uInterlaceParamD', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceParamD'),
            dynamicVisible: makeDynamicVisible('interlaceParamD'),
        },
        interlaceParamE: {
            type: 'float', default: 0, label: 'Param E', shortId: 'ile2',
            uniform: 'uInterlaceParamE', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceParamE'),
            dynamicVisible: makeDynamicVisible('interlaceParamE'),
        },
        interlaceParamF: {
            type: 'float', default: 0, label: 'Param F', shortId: 'ilf2',
            uniform: 'uInterlaceParamF', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceParamF'),
            dynamicVisible: makeDynamicVisible('interlaceParamF'),
        },
        interlaceVec3A: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Vec3 A', shortId: 'ilv3a',
            uniform: 'uInterlaceVec3A', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceVec3A'),
            dynamicVisible: makeDynamicVisible('interlaceVec3A'),
        },
        interlaceVec3B: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Vec3 B', shortId: 'ilv3b',
            uniform: 'uInterlaceVec3B', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceVec3B'),
            dynamicVisible: makeDynamicVisible('interlaceVec3B'),
        },
        interlaceVec3C: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Vec3 C', shortId: 'ilv3c',
            uniform: 'uInterlaceVec3C', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceVec3C'),
            dynamicVisible: makeDynamicVisible('interlaceVec3C'),
        },
        interlaceVec2A: {
            type: 'vec2', default: { x: 0, y: 0 }, label: 'Vec2 A', shortId: 'ilv2a',
            uniform: 'uInterlaceVec2A', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceVec2A'),
            dynamicVisible: makeDynamicVisible('interlaceVec2A'),
        },
        interlaceVec2B: {
            type: 'vec2', default: { x: 0, y: 0 }, label: 'Vec2 B', shortId: 'ilv2b',
            uniform: 'uInterlaceVec2B', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceVec2B'),
            dynamicVisible: makeDynamicVisible('interlaceVec2B'),
        },
        interlaceVec2C: {
            type: 'vec2', default: { x: 0, y: 0 }, label: 'Vec2 C', shortId: 'ilv2c',
            uniform: 'uInterlaceVec2C', min: -10, max: 10, step: 0.001,
            group: 'interlace_runtime',
            condition: [{ param: 'interlaceCompiled', bool: true }, { param: 'interlaceEnabled', bool: true }],
            dynamicConfig: makeDynamicConfig('interlaceVec2C'),
            dynamicVisible: makeDynamicVisible('interlaceVec2C'),
        },
    },

    groups: {
        interlace_runtime: { label: 'Interlace Controls' },
    },

    inject: (builder, config, variant) => {
        const state = config.interlace as InterlaceState | undefined;
        if (!state?.interlaceCompiled) return;

        // Get the secondary formula
        const formulaId = state.interlaceFormula as FormulaType;
        if (!formulaId) return;

        // Don't interlace with Modular (incompatible)
        if (formulaId === 'Modular') return;
        // Don't interlace when primary IS Modular
        if (config.formula === 'Modular') return;

        const def = registry.get(formulaId);
        if (!def) return;

        // For Mesh variant: declare interlace uniforms via addUniform() since MESH_GLSL_UNIFORMS
        // only covers primary formula params. The main shader has these in the full UNIFORMS chunk.
        if (variant === 'Mesh') {
            for (const name of INTERLACE_UNIFORM_NAMES.scalars) builder.addUniform(name, 'float');
            for (const name of INTERLACE_UNIFORM_NAMES.vec2s)   builder.addUniform(name, 'vec2');
            for (const name of INTERLACE_UNIFORM_NAMES.vec3s)   builder.addUniform(name, 'vec3');
            for (const name of INTERLACE_UNIFORM_NAMES.vec4s)   builder.addUniform(name, 'vec4');
            builder.addUniform('uInterlaceEnabled',   'float');
            builder.addUniform('uInterlaceInterval',  'float');
            builder.addUniform('uInterlaceStartIter', 'float');
        }

        // 1. Inject preamble (if any) with prefixed variables
        if (def.shader.preamble) {
            const rewrittenPreamble = rewritePreamble(def.shader.preamble, def.id, def.shader.preambleVars);
            builder.addPreamble(rewrittenPreamble);
        }

        // 2. Inject the rewritten formula function
        const rewrittenFunction = rewriteFormulaFunction(def.shader.function, def.id, def.shader.preambleVars);
        builder.addFunction(rewrittenFunction);

        // 3. Build the interlace loop logic
        const rewrittenBody = rewriteLoopBody(def.shader.loopBody, def.id);

        // Build loopInit for the secondary formula
        let interlaceInit = '';
        if (def.shader.loopInit) {
            interlaceInit = rewriteLoopInit(def.shader.loopInit, def.id, def.shader.preambleVars);
        }

        const needsRotSwap = !!def.shader.usesSharedRotation;
        const { preLoop: hybridPreLoop, inLoop: hybridInLoop } = buildInterlaceLoopGLSL(
            rewrittenBody,
            interlaceInit,
            needsRotSwap,
        );

        builder.addHybridFold('', hybridPreLoop, hybridInLoop);
    }
};
