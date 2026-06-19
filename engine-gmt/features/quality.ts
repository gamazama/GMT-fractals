
import { FeatureDefinition } from '../engine/FeatureSystem';
import { DEFAULT_HARD_CAP } from '../../data/constants';
import { registry } from '../engine/FractalRegistry';

export interface QualityState {
    engineQuality: boolean; // Master Anchor
    fudgeFactor: number;
    stepJitter: number; // Stochastic step jitter strength
    detail: number;
    pixelThreshold: number;
    maxSteps: number;
    compilerHardCap: number;
    distanceMetric: number;
    precisionMode: number; // 0=High (Ray Epsilon), 1=Standard
    bufferPrecision: number; // 0=Float32, 1=HalfFloat16
    dynamicScaling: boolean;
    interactionDownsample: number;
    adaptiveTarget: number; // Smart adaptive target FPS (0=off, >0=auto-adjust)
    estimator: number; // 0=Log, 1=Linear, 2=Pseudo, 3=Dampened, 4=Linear2
    deBailout: number; // Absolute raymarch DE bailout radius² (uDeBailout)
    overstepTolerance: number; // Candidate Recovery Threshold
    physicsProbeMode: number; // 0=GPU Probe, 1=CPU Calculation, 2=Manual
    manualDistance: number; // Manual distance override when probe is disabled
}

export const QualityFeature: FeatureDefinition = {
    id: 'quality',
    shortId: 'q',
    name: 'Quality',
    category: 'Rendering',
    tabConfig: { label: 'Quality' },
    engineConfig: {
        toggleParam: 'engineQuality',
        mode: 'compile',
        label: 'Loop Limits & Precision',
        groupFilter: 'engine_settings'
    },
    params: {
        // --- MASTER ANCHOR ---
        engineQuality: {
            type: 'boolean', default: true, label: 'Quality Core', shortId: 'qc', group: 'main',
            noReset: true, hidden: true
        },

        // --- KERNEL (Engine Panel) ---
        compilerHardCap: {
            type: 'int', default: DEFAULT_HARD_CAP, label: 'Hard Loop Cap', shortId: 'hc',
            min: 64, max: DEFAULT_HARD_CAP, step: 1, group: 'engine_settings',
            ui: 'numeric',
            description: "Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",
            onUpdate: 'compile',
            noReset: true,
            userScoped: true,
            hidden: true  // Managed by Hardware Preferences modal (hardwareProfile.caps)
        },
        precisionMode: {
            type: 'float', default: 0.0, label: 'Ray Precision', shortId: 'pm',
            group: 'engine_settings',
            options: [{ label: 'High (Desktop)', value: 0.0 }, { label: 'Standard (Mobile)', value: 1.0 }],
            description: 'Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.',
            onUpdate: 'compile',
            noReset: true,
            userScoped: true,
            hidden: true  // Managed by Hardware Preferences modal (hardwareProfile.caps)
        },
        bufferPrecision: {
            type: 'float', default: 0.0, label: 'Texture Buffer', shortId: 'bp',
            group: 'engine_settings',
            options: [{ label: 'Float32 (HDR)', value: 0.0 }, { label: 'HalfFloat16', value: 1.0 }],
            description: 'Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.',
            onUpdate: 'compile',
            noReset: true,
            userScoped: true,
            hidden: true  // Managed by Hardware Preferences modal (hardwareProfile.caps)
        },

        // --- RUNTIME (Quality Panel) ---
        maxSteps: {
            type: 'int', default: 300, label: 'Max Ray Steps', shortId: 'ms', uniform: 'uMaxSteps',
            min: 32, max: DEFAULT_HARD_CAP, step: 1, group: 'kernel',
            description: 'Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth. Maximum is limited by Hard Loop Cap.',
            helpId: 'quality.steps',
            dynamicMaxRef: 'compilerHardCap'
        },
        distanceMetric: {
            type: 'float', default: 0.0, label: 'Distance Metric', shortId: 'dm', uniform: 'uDistanceMetric',
            group: 'metric',
            options: [
                { label: 'Euclidean (Sphere)', value: 0.0 },
                { label: 'Chebyshev (Box)', value: 1.0 },
                { label: 'Manhattan (Diamond)', value: 2.0 },
                { label: 'Minkowski 4 (Rounded)', value: 3.0 }
            ],
            description: 'The shape of "distance". Changes the aesthetic of the fractal surface.',
            helpId: 'quality.metric',
        },
        estimator: {
            type: 'float', default: 0.0, label: 'Estimator', shortId: 'es',
            group: 'metric',
            options: [
                { label: 'Analytic (Log)', value: 0.0 },
                { label: 'Linear (Unit 1.0)', value: 1.0 },
                { label: 'Linear (Offset 2.0)', value: 4.0 },
                { label: 'Pseudo (Raw)', value: 2.0 },
                { label: 'Dampened', value: 3.0 },
                {
                    label: 'Cutting Plane',
                    value: 5.0,
                    // Gray out unless either the current formula OR the active interlace
                    // secondary declares supportsCuttingPlane. Engine falls back to Linear
                    // if a user somehow forces this on a non-CP pair, so this is purely UX.
                    disabledIf: (state: any) => {
                        const primary = registry.get(state?.formula);
                        if (primary?.shader.supportsCuttingPlane) return false;
                        const il = state?.interlace;
                        if (il?.interlaceCompiled && il.interlaceFormula) {
                            const sec = registry.get(il.interlaceFormula);
                            if (sec?.shader.supportsCuttingPlane) return false;
                        }
                        return true;
                    },
                }
            ],
            description: 'Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix, Cutting Plane=Knighty fold-and-cut polyhedra.',
            helpId: 'quality.estimator',
            onUpdate: 'compile',
            noReset: true,
        },
        deBailout: {
            type: 'float', default: 100.0, label: 'DE Bailout', shortId: 'eb', uniform: 'uDeBailout',
            min: 1, max: 1000, step: 0.01, scale: 'log', group: 'metric',
            description: 'Radius² at which the raymarch DE stops iterating. High (default) keeps surfaces sharp and true to the boundary; low bails early, slicing the fractal into rounded shells (a stylistic effect). Fast-escaping formulas only respond near their structure scale.',
            helpId: 'quality.metric',
        },
        fudgeFactor: {
            type: 'float', default: 1.0, label: 'Slice Optimization', shortId: 'ff', uniform: 'uFudgeFactor',
            min: 0.01, max: 1.0, step: 0.01, group: 'kernel',
            description: 'Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.',
            helpId: 'quality.fudge',
            format: (v) => v.toFixed(2)
        },
        stepJitter: {
            type: 'float', default: 0.15, label: 'Step Jitter', shortId: 'sj', uniform: 'uStepJitter',
            min: 0.0, max: 1.0, step: 0.01, group: 'kernel',
            description: 'Stochastic step variation. Breaks banding artifacts. Higher = softer edges, artistic blur.',
            helpId: 'quality.jitter',
            format: (v: number) => v.toFixed(2)
        },
        detail: {
            type: 'float', default: 1.0, label: 'Ray detail', shortId: 'rd', uniform: 'uDetail',
            min: 0.1, max: 10.0, step: 0.1, group: 'kernel',
            description: 'Tightens the hit threshold; higher values resolve finer surface detail.',
            helpId: 'quality.detail',
        },
        pixelThreshold: {
            type: 'float', default: 0.5, label: 'Pixel threshold', shortId: 'pt', uniform: 'uPixelThreshold',
            min: 0.1, max: 2.0, step: 0.1, group: 'kernel',
            description: 'Pixel size at which a ray is considered to have hit the surface.',
            helpId: 'quality.threshold',
        },
        overstepTolerance: {
            type: 'float', default: 0.0, label: 'Overstep Fix', shortId: 'ot', uniform: 'uOverstepTolerance',
            min: 0.0, max: 1000.0, step: 0.1, scale: 'log', group: 'kernel',
            description: "Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise.",
            helpId: 'quality.fudge',
        },

        // Adaptive resolution is a user/device performance preference, not
        // scene content — `userScoped` keeps it from being overwritten when a
        // scene file or formula is loaded. See PresetLogic.applyPresetState.
        dynamicScaling: {
            type: 'boolean',
            default: true,
            label: 'Adaptive Resolution',
            shortId: 'ds',
            group: 'performance',
            noReset: true,
            userScoped: true,
            description: 'Drop resolution while moving and during slow frames; restore when idle.',
            helpId: 'quality.scale',
        },
        interactionDownsample: {
            type: 'float',
            default: 2.0,
            label: 'Move Quality',
            shortId: 'id',
            min: 1.0, max: 4.0, step: 0.5,
            group: 'performance',
            condition: { and: [{ param: 'dynamicScaling', bool: true }, { param: 'adaptiveTarget', eq: 0 }] },
            format: (v) => `1/${v}x`,
            noReset: true,
            userScoped: true,
            description: 'How aggressively to downscale resolution during camera movement.',
            helpId: 'quality.scale',
        },
        adaptiveTarget: {
            type: 'float',
            default: 30,
            label: 'Target FPS',
            shortId: 'at',
            min: 15, max: 60, step: 5,
            group: 'performance',
            condition: { param: 'dynamicScaling', bool: true },
            noReset: true,
            userScoped: true,
            description: 'Frame rate the adaptive resolver tries to maintain.',
            helpId: 'quality.scale',
        },
        physicsProbeMode: {
            type: 'float',
            default: 0.0,
            label: 'Distance Probe',
            shortId: 'dp',
            group: 'performance',
            isAdvanced: true,
            options: [
                { label: 'GPU Probe', value: 0.0 },
                { label: 'Manual', value: 2.0 }
            ],
            description: 'GPU Probe: Reads distance from render target. Manual: Fixed value for orbit control.',
            helpId: 'panel.quality',
            noReset: true
        },
        manualDistance: {
            type: 'float',
            default: 10.0,
            label: 'Manual Distance',
            shortId: 'md',
            min: 0.1, max: 1000.0, step: 0.1,
            group: 'performance',
            isAdvanced: true,
            parentId: 'physicsProbeMode',
            condition: { param: 'physicsProbeMode', eq: 2.0 },
            description: 'Manual distance value. Used for orbit control calculations.',
            helpId: 'panel.quality',
            format: (v) => v.toFixed(1),
            noReset: true
        }
    },
    inject: (builder, config) => {
        const state = config.quality as QualityState;
        // Inject MAX_HARD_ITERATIONS for all variants (Physics/Main/Histogram)
        // This controls the unrolled loop size in DE.ts
        const cap = state?.compilerHardCap || DEFAULT_HARD_CAP;
        builder.addDefine('MAX_HARD_ITERATIONS', Math.floor(cap).toString());
    }
};
