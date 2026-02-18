
import { FeatureDefinition } from '../engine/FeatureSystem';

export interface QualityState {
    engineQuality: boolean; // Master Anchor
    fudgeFactor: number;
    stepRelaxation: number; // New: Dynamic Fudge
    refinementSteps: number; // New: Edge Polish
    detail: number;
    pixelThreshold: number;
    maxSteps: number;
    compilerHardCap: number; 
    distanceMetric: number;
    precisionMode: number; // 0=High (Ray Epsilon), 1=Standard
    bufferPrecision: number; // 0=Float32, 1=HalfFloat16
    dynamicScaling: boolean;
    interactionDownsample: number;
    estimator: number; // 0=Log, 1=Linear, 2=Pseudo, 3=Dampened, 4=Linear2
    overstepTolerance: number; // Candidate Recovery Threshold
    physicsProbeMode: number; // 0=GPU Probe, 1=CPU Calculation, 2=Manual
    manualDistance: number; // Manual distance override when probe is disabled
}

export const QualityFeature: FeatureDefinition = {
    id: 'quality',
    shortId: 'q',
    name: 'Quality',
    category: 'Rendering',
    tabConfig: { label: 'Quality', componentId: 'panel-quality', order: 60 },
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
            type: 'int', default: 500, label: 'Hard Loop Cap', shortId: 'hc',
            min: 64, max: 2000, step: 1, group: 'engine_settings',
            ui: 'numeric',
            description: "Compile-time safety limit. Ray loop will never exceed this.",
            onUpdate: 'compile',
            noReset: true
        },
        precisionMode: {
            type: 'float', default: 0.0, label: 'Ray Precision', shortId: 'pm',
            group: 'engine_settings',
            options: [{ label: 'High (Desktop)', value: 0.0 }, { label: 'Standard (Mobile)', value: 1.0 }],
            description: 'Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.',
            onUpdate: 'compile',
            noReset: true
        },
        bufferPrecision: {
            type: 'float', default: 0.0, label: 'Texture Buffer', shortId: 'bp',
            group: 'engine_settings',
            options: [{ label: 'Float32 (HDR)', value: 0.0 }, { label: 'HalfFloat16', value: 1.0 }],
            description: 'Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.',
            onUpdate: 'compile',
            noReset: true
        },

        // --- RUNTIME (Quality Panel) ---
        maxSteps: { 
            type: 'int', default: 300, label: 'Max Ray Steps', shortId: 'ms', uniform: 'uMaxSteps', 
            min: 32, max: 2000, step: 1, group: 'kernel',
            description: 'Runtime limit. Rays stop after this many steps. Artistic tool for limiting depth.',
            isAdvanced: true
        },
        distanceMetric: { 
            type: 'float', default: 0.0, label: 'Distance Metric', shortId: 'dm', uniform: 'uDistanceMetric', 
            group: 'kernel', 
            options: [
                { label: 'Euclidean (Sphere)', value: 0.0 }, 
                { label: 'Chebyshev (Box)', value: 1.0 }, 
                { label: 'Manhattan (Diamond)', value: 2.0 }, 
                { label: 'Minkowski 4 (Rounded)', value: 3.0 }
            ],
            description: 'The shape of "distance". Changes the aesthetic of the fractal surface.'
        },
        estimator: {
            type: 'float', default: 0.0, label: 'Estimator', shortId: 'es', 
            group: 'kernel',
            options: [
                { label: 'Analytic (Log)', value: 0.0 },
                { label: 'Linear (Unit 1.0)', value: 1.0 },
                { label: 'Linear (Offset 2.0)', value: 4.0 },
                { label: 'Pseudo (Raw)', value: 2.0 },
                { label: 'Dampened', value: 3.0 }
            ],
            description: 'Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix.',
            onUpdate: 'compile',
            noReset: true,
            isAdvanced: true
        },
        fudgeFactor: { 
            type: 'float', default: 1.0, label: 'Slice Optimization', shortId: 'ff', uniform: 'uFudgeFactor', 
            min: 0.01, max: 1.0, step: 0.01, group: 'kernel', 
            description: 'Multiplies step size. Lower = Higher quality but slower. Set to < 0.2 for deep zooms.',
            format: (v) => v.toFixed(2)
        },
        stepRelaxation: { 
            type: 'float', default: 0.0, label: 'Step Relaxation', shortId: 'sr', uniform: 'uStepRelaxation', 
            min: 0.0, max: 1.0, step: 0.01, group: 'kernel', 
            description: 'Dynamic Step Size. 0 = Fixed Fudge. 1 = Variable (Fudge near surface, 1.0 in void). Saves steps.',
            isAdvanced: true
        },
        refinementSteps: { 
            type: 'int', default: 0, label: 'Edge Polish', shortId: 'rf', uniform: 'uRefinementSteps', 
            min: 0, max: 5, step: 1, group: 'kernel', 
            description: 'Extra micro-steps after hitting surface. Fixes slicing/banding artifacts.',
            isAdvanced: true
        },
        detail: { 
            type: 'float', default: 1.0, label: 'Ray detail', shortId: 'rd', uniform: 'uDetail', 
            min: 0.1, max: 10.0, step: 0.1, group: 'kernel' 
        },
        pixelThreshold: { 
            type: 'float', default: 0.5, label: 'Pixel threshold', shortId: 'pt', uniform: 'uPixelThreshold', 
            min: 0.1, max: 2.0, step: 0.1, group: 'kernel' 
        },
        overstepTolerance: { 
            type: 'float', default: 0.0, label: 'Overstep Fix', shortId: 'ot', uniform: 'uOverstepTolerance', 
            min: 0.0, max: 5.0, step: 0.1, group: 'kernel',
            description: "Recovers details missed by the raymarcher. 0=Off. Higher values fix more holes but may create noise.",
            isAdvanced: true
        },
        
        dynamicScaling: {
            type: 'boolean',
            default: false,
            label: 'Adaptive Resolution',
            shortId: 'ds',
            group: 'performance',
            noReset: true
        },
        interactionDownsample: {
            type: 'float',
            default: 2.0,
            label: 'Move Quality',
            shortId: 'id',
            min: 1.0, max: 4.0, step: 0.5,
            group: 'performance',
            condition: { param: 'dynamicScaling', bool: true },
            format: (v) => `1/${v}x`,
            noReset: true
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
            description: 'Manual distance value. Used for orbit control calculations.',
            format: (v) => v.toFixed(1),
            noReset: true
        }
    },
    inject: (builder, config) => {
        const state = config.quality as QualityState;
        // Inject MAX_HARD_ITERATIONS for all variants (Physics/Main/Histogram)
        // This controls the unrolled loop size in DE.ts
        const cap = state?.compilerHardCap || 500;
        builder.addDefine('MAX_HARD_ITERATIONS', Math.floor(cap).toString());
    }
};
