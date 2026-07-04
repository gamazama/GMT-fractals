
import * as THREE from 'three';
import { FeatureDefinition } from '../engine/FeatureSystem';
import { registry } from '../engine/FractalRegistry';
import { pairHasCapability } from '../engine/compat';
import { generateGetDist, isNumericDEEstimator } from '../engine/estimators';
import { MAX_MODULAR_PARAMS } from '../../data/constants';
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

// Engine-provided cutting-plane accumulator globals + init lines.
// Declared whenever a formula has shader.supportsCuttingPlane, regardless of estimator —
// the formula's writes need a target. When estimator != 5, the writes are dead code that
// the GLSL optimizer strips.
//
// MIRROR: keep in sync with `CP_PREAMBLE_GLOBALS` + the cp_* init line in
// `engine/SDFShaderBuilder.ts` (mesh export). Both paths must declare and
// initialize the same set of accumulators identically.
const CP_PREAMBLE = `
// --- Cutting-plane DE accumulators (engine-provided) ---
float cp_dmin;
float cp_scale;
float cp_trap;
`;
const CP_INIT = `
cp_dmin = -1e10;
cp_scale = 1.0;
cp_trap = 1e10;
`;

export const CoreMathFeature: FeatureDefinition = {
    id: 'coreMath',
    shortId: 'cm',
    name: 'Formula Math',
    category: 'Formulas',
    tabConfig: { label: 'Formula' },
    extraUniforms: [
        // backingOnly: Three.js uniform object always exists for syncModularUniforms(),
        // but GLSL declaration is injected conditionally in inject() only for Modular formula.
        { name: Uniforms.ModularParams, type: 'float', arraySize: MAX_MODULAR_PARAMS, default: new Float32Array(MAX_MODULAR_PARAMS), backingOnly: true }
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
    /**
     * @invariant The cutting-plane preamble globals (`cp_dmin/cp_scale/cp_trap`)
     * declared via `builder.addPreamble(CP_PREAMBLE)` MUST be kept in sync
     * with `engine/SDFShaderBuilder.ts`'s mirror — mesh-export coupling.
     * `addPreamble` dedupes by exact string, so identical declarations from
     * multiple call paths are safe; drift in the literal text breaks mesh
     * export silently. See ADR-0052 (and the inline MIRROR comment at line 107).
     *
     * @invariant Modular special-casing: when `formula === 'Modular'`,
     * CoreMath adds the `PIPELINE_REV` define (forces recompile on graph
     * structural edits), declares `uModularParams[MAX_MODULAR_PARAMS]`, calls
     * `compileGraph(pipeline, graph.edges)` to produce `formula_Modular()`,
     * and installs a `distOverride` short-circuit hook so SDF Primitive
     * nodes can break the iteration loop with `distOverride < 999.0`.
     */
    inject: (builder, config) => {
        const formula = config.formula as FormulaType;
        const quality = config.quality as QualityState;

        // 1. Modular pipeline revision (forces recompile when graph changes)
        if (formula === 'Modular') {
            builder.addDefine('PIPELINE_REV', (config.pipelineRevision || 0).toString());
            // Declare uModularParams only for Modular shaders (backing always exists via extraUniforms)
            builder.addUniform(Uniforms.ModularParams, 'float', MAX_MODULAR_PARAMS);
        }

        // 2. Analytic Opt-in: skip the pre-bailout distance check for formulas that
        //    manage their own iteration loop (selfContainedSDE).
        //    SELF_CONTAINED_SDE also gates off the outer-loop geometric-trap
        //    block in de.ts — these formulas run all fractal iterations
        //    inside the formula body and thread the trap through their own
        //    inner loop (see MandelTerrain's #ifdef TRAP_ENABLED block).
        //    Accumulating in the outer loop too would either no-op or mix
        //    coordinate systems (MandelTerrain projects c-plane to XZ).
        const def = registry.get(formula);
        if (def?.shader.selfContainedSDE) {
            builder.addDefine('SKIP_PRE_BAILOUT', '1');
            builder.addDefine('SELF_CONTAINED_SDE', '1');
        }

        // 3. Generate Code
        let functions = "";
        let loopBody = "";
        let loopInit = "";

        // Cutting-plane support is a formula capability. (The legacy interlace
        // PAIR check retired with the feature — ADR-0089 P4.4: a migrated
        // legacy pair is one fused def whose capability set already unions the
        // slots'. Single source of truth via the capability protocol — see
        // engine-gmt/engine/compat/pairHasCapability.ts; SDFShaderBuilder's
        // supportsCP delegates to the same function.)
        const pairSupportsCuttingPlane = def
            ? pairHasCapability(def, undefined, 'estimator:cutting-plane')
            : false;

        // Generate optimized getDist based on Quality Settings
        // Default to 0 (Analytic) if missing
        const estimatorType = quality?.estimator || 0;
        // dIFS (estimator 6): the MB3D importer sets shader.supportsDifs on a fused
        // dIFS scene; its preamble declares g_difsDE.
        const supportsDifs = !!def?.shader.supportsDifs;
        let getDistBody = generateGetDist(estimatorType, { supportsCuttingPlane: pairSupportsCuttingPlane, supportsDifs });

        // 7: Numerical (finite-difference) DE — no analytic dr needed. Arms the
        // escape-radius-gradient path in DE_MASTER (map()/mapDist() re-iterate
        // perturbed seeds). The getDist body above is dead code in this path (falls
        // back to Linear, unused). For any formula whose analytic DE is missing/wrong
        // (MB3D [CODE] hybrids, hard frag imports). @see docs/adr/0085.
        if (isNumericDEEstimator(estimatorType)) {
            builder.enableNumericDE(true);
            builder.addDefine('NUMERIC_DE', '1'); // material_eval uses numericNormal()
        }

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
            // Cutting-plane formulas: engine declares the cp_* accumulators and
            // initializes them. The formula's own loopBody writes to them; getDist
            // reads them iff estimator===5 (Cutting Plane). addPreamble
            // dedupes by exact string so duplicate calls are safe.
            if (pairSupportsCuttingPlane) {
                builder.addPreamble(CP_PREAMBLE);
                loopInit = CP_INIT + loopInit;
            }
            // Custom getDist override: Frags/legacy formulas + fused weave defs
            // (P4.4 lead-slot splice). Skipped when the CP estimator is
            // selected — engine's getDist takes precedence.
            if (def.shader.getDist && estimatorType < 4.5) {
                 getDistBody = `vec2 getDist(float r, float dr, float iter, vec4 z) { ${def.shader.getDist} }`;
            }
        }

        builder.addFunction(functions);
        builder.setFormula(loopBody, loopInit, getDistBody);
    }
};
