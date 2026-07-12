
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { SHARED_TRANSFORMS_GLSL } from './transforms';
import { registry } from '../../engine/FractalRegistry';

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
    burningRuntime: boolean;
    burningMix: number;

    juliaMode: boolean;
    juliaX: number;
    juliaY: number;
    juliaZ: number;
    julia: THREE.Vector3;

    preRotMaster: boolean;
}

export const GeometryFeature: FeatureDefinition = {
    id: 'geometry',
    shortId: 'g',
    name: 'Geometry',
    category: 'Formulas',
    // NOTE: no feature-level `requires` — geometry exposes multiple panel
    // sections (Burning Mode, Local Rotation, Julia/Offset) with independent
    // compat. Section-level rejects are declared in panels.ts where each
    // compilable surface is registered. Burning Mode gates on
    // `shape:self-contained` (inject() skips its per-iteration wiring for those
    // formulas); Local Rotation is formula-agnostic. (The legacy Hybrid Box fold
    // section retired in ADR-0089 P4.7 — folds are BoxFold weave slots now.)
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
            description: 'Master switch for geometry modifiers (Julia, Rotation, Burning).', noAccumReset: true, hidden: true
        },

        // --- ENGINE SETTINGS (Compiled) ---
        preRotMaster: {
            type: 'boolean', default: true, label: 'Enable Rotation', shortId: 'rm', group: 'engine_settings',
            ui: 'checkbox',
            description: 'Compiles rotation matrix logic. Disable for speed.', onUpdate: 'compile', noAccumReset: true,
            estCompileMs: 600
        },

        // --- GLOBAL MODIFIERS ---
        // Compile gate: with the burning line absent from DXBC when off,
        // ALU cost vanishes for non-burning scenes. When compiled in, the
        // inject emits a `mix(z, abs(z), uBurningRuntime * uBurningMix)`
        // so the runtime toggle + mix slider can fade burning in/out
        // without a recompile. Uniform `uBurningEnabled` is kept so
        // formulas like MandelTerrain that bind their own compile-time
        // burning logic continue to read it.
        burningEnabled: {
            type: 'boolean', default: false, label: 'Burning Mode', shortId: 'bm', group: 'burning',
            description: 'Applies absolute value to coordinates every iteration. Creates "Burning Ship" variations.',
            uniform: 'uBurningEnabled',
            onUpdate: 'compile', noAccumReset: true
        },
        // Runtime instant-toggle (hidden — controlled by the section header
        // once compiled). Default matches burningEnabled (false) so a fresh
        // scene or formula load shows the section as OFF, not as
        // "on but uncompiled, asking for recompile" — which also wedged
        // the toggle (val === isCompiled cleared pendingToggle while
        // sliceState.burningRuntime was still true). Compile sets both
        // gate + runtime in one atomic setter call (see handleCompile).
        burningRuntime: {
            type: 'boolean', default: false, label: 'Burning Active', shortId: 'br',
            uniform: 'uBurningRuntime', group: 'burning', hidden: true,
        },
        // Runtime mix amount — fades between original and abs() coordinates.
        burningMix: {
            type: 'float', default: 1.0, label: 'Mix', shortId: 'bmx',
            uniform: 'uBurningMix', min: 0.0, max: 1.0, step: 0.01,
            group: 'burning',
            condition: { param: 'burningEnabled', bool: true },
            description: 'Blend between original coordinates (0) and absolute-value coordinates (1).',
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
        preRotX: { type: 'float', default: 0.0, label: 'Pre Rotation X', shortId: 'rx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        preRotY: { type: 'float', default: 0.0, label: 'Pre Rotation Y', shortId: 'ry', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        preRotZ: { type: 'float', default: 0.0, label: 'Pre Rotation Z', shortId: 'rz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        preRot: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Pre Rotation',
            composeFrom: ['preRotX', 'preRotY', 'preRotZ'],
            min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi',
            group: 'transform', parentId: 'preRotEnabled', condition: { bool: true },
        },
        // Post-rotation (after formula, inside loop)
        postRotX: { type: 'float', default: 0.0, label: 'Post Rotation X', shortId: 'qx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        postRotY: { type: 'float', default: 0.0, label: 'Post Rotation Y', shortId: 'qy', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        postRotZ: { type: 'float', default: 0.0, label: 'Post Rotation Z', shortId: 'qz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        postRot: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Post Rotation',
            composeFrom: ['postRotX', 'postRotY', 'postRotZ'],
            min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi',
            group: 'transform', parentId: 'preRotEnabled', condition: { bool: true },
        },
        // World-space rotation (outside loop, applied to p before iteration)
        worldRotX: { type: 'float', default: 0.0, label: 'World Rotation X', shortId: 'wx', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        worldRotY: { type: 'float', default: 0.0, label: 'World Rotation Y', shortId: 'wy', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
        worldRotZ: { type: 'float', default: 0.0, label: 'World Rotation Z', shortId: 'wz', min: -Math.PI, max: Math.PI, step: 0.01, scale: 'pi', group: 'transform', parentId: 'preRotEnabled', condition: { bool: true }, hidden: true },
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

        if (isEnabled === false) return;

        // 1. Rotation Logic
        const useRotation = state ? (state.preRotMaster !== false) : true;
        builder.setRotation(useRotation);

        // 1b. Shared transform utilities (twist, Rodrigues rotation)
        // Injected as preamble (stage 7) so they're available to formula functions (stage 8)
        builder.addPreamble(SHARED_TRANSFORMS_GLSL);

        // --- BURNING MODE (Compile-gated, runtime mixable) ---
        // Compile gate keeps the line out of DXBC entirely when burning is
        // off. When compiled in, the runtime uniforms `uBurningRuntime`
        // (0/1 instant toggle) and `uBurningMix` (0–1 slider) fade the
        // effect without forcing another recompile. The ALU is one mix per
        // iter — acceptable cost paid only when the feature is compiled.
        const formula = config.formula as any;
        const isSelfContainedSDE = registry.get(formula)?.shader.capabilities?.has('shape:self-contained') ?? false;
        const burningOn = state?.burningEnabled ?? false;
        if (!isSelfContainedSDE && burningOn) {
            builder.addPerIterInject(`z.xyz = mix(z.xyz, abs(z.xyz), uBurningRuntime * uBurningMix);`);
        }
    }
};
