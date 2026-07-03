
import { FeatureDefinition } from '../engine/FeatureSystem';
import { DEFAULT_HARD_CAP, REFINE_HARD_CAP } from '../../data/constants';
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
    refineEnabled: boolean; // Post-hit surface refinement compile gate
    refineActive: boolean; // Surface-refinement instant runtime on/off (uRefineActive)
    refineSteps: number; // Surface-refinement bisection step count (runtime, live)
    numDEeps: number; // Numerical-DE magnitude calibration (MB3D dDEscale); probe is auto-derived
    mb3dFaithful: boolean; // MB3D-faithful marcher compile gate (importer-set for MB3D imports)
    mb3dStepDiv: number; // MB3D sZstepDiv → uMb3dStepDiv (faithful step divisor)
    mb3dDEsub: number; // MB3D msDEsub → uMb3dDEsub (faithful step safety-subtraction fraction)
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
            noAccumReset: true, hidden: true
        },

        // --- KERNEL (Engine Panel) ---
        compilerHardCap: {
            type: 'int', default: DEFAULT_HARD_CAP, label: 'Hard Loop Cap', shortId: 'hc',
            min: 64, max: DEFAULT_HARD_CAP, step: 1, group: 'engine_settings',
            ui: 'numeric',
            description: "Safety limit for ray/DE loops (MAX_HARD_ITERATIONS define). Requires recompile but does not affect compile time — ANGLE/D3D does not unroll define-bounded loops.",
            onUpdate: 'compile',
            noAccumReset: true,
            userScoped: true,
            hidden: true  // Managed by Hardware Preferences modal (hardwareProfile.caps)
        },
        precisionMode: {
            type: 'float', default: 0.0, label: 'Ray Precision', shortId: 'pm',
            group: 'engine_settings',
            options: [{ label: 'High (Desktop)', value: 0.0 }, { label: 'Standard (Mobile)', value: 1.0 }],
            description: 'Sets the minimum epsilon (ray hit distance). Standard prevents GPU hangs on mobile.',
            onUpdate: 'compile',
            noAccumReset: true,
            userScoped: true,
            hidden: true  // Managed by Hardware Preferences modal (hardwareProfile.caps)
        },
        bufferPrecision: {
            type: 'float', default: 0.0, label: 'Texture Buffer', shortId: 'bp',
            group: 'engine_settings',
            options: [{ label: 'Float32 (HDR)', value: 0.0 }, { label: 'HalfFloat16', value: 1.0 }],
            description: 'Controls render target bit-depth. 16-bit is faster and required on some mobile GPUs.',
            onUpdate: 'compile',
            noAccumReset: true,
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
                },
                {
                    // MB3D dIFS orbit-trap estimator — only valid on an imported dIFS
                    // scene (declares shader.supportsDifs + a g_difsDE preamble). Engine
                    // falls back to Linear on any other formula, so this is purely UX.
                    label: 'dIFS (Orbit Trap)',
                    value: 6.0,
                    disabledIf: (state: any) => !registry.get(state?.formula)?.shader.supportsDifs,
                },
                {
                    // Numerical (finite-difference) DE — the only estimator that needs NO
                    // analytic derivative. It re-iterates the orbit at perturbed seed points
                    // and estimates distance from the escape-radius gradient (port of MB3D
                    // CalcDEnoADE). For ANY formula whose analytic dr is missing or wrong:
                    // MB3D [CODE] hybrids, hard frag imports, hand-written formulas. ~4× the
                    // DE cost (re-iterates 3 extra orbits), so it recompiles + runs slower.
                    label: 'Numerical (Finite-Diff)',
                    value: 7.0,
                }
            ],
            description: 'Algorithm for calculating distance. Log=Smooth, Linear=Sharp/IFS, Pseudo=Artifact Fix, Cutting Plane=Knighty fold-and-cut polyhedra, Numerical=finite-difference (no analytic DE needed; ~4× slower, fixes formulas that render as dust/noise).',
            helpId: 'quality.estimator',
            onUpdate: 'compile',
            noAccumReset: true,
        },
        deBailout: {
            type: 'float', default: 100.0, label: 'DE Bailout', shortId: 'eb', uniform: 'uDeBailout',
            min: 1, max: 1.0e7, step: 0.01, scale: 'log', group: 'metric',
            description: 'Radius² at which the raymarch DE stops iterating. High keeps surfaces sharp and true to the boundary; low bails early, slicing the fractal into rounded shells. FOLD formulas (box/IFS) whose orbit oscillates back need a HIGH bailout to develop structure — MB3D imports map this from rStop² (often ~1e6). Fast-escaping formulas only respond near their structure scale.',
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
        // Numerical-DE SCALE (MB3D's dDEscale) — only used by the "Numerical (Finite-Diff)"
        // estimator. It calibrates the DE MAGNITUDE: DE = ln(R0)·dDEscale·e/(√ΣΔ(ln Rout)²+e·0.06).
        // MB3D derives dDEscale per-scene from the zoom/step; GMT exposes it as this knob. Too
        // high → the ray overshoots (misses the surface); too low → the ray converges slowly and
        // may hit the step budget (blank). The probe itself is auto-derived (zoom-scaled,
        // quality-param-free) and the estimate is probe-invariant, so THIS is the one numeric-DE
        // dial. Runtime (no recompile), harmless on other estimators (uniform unread). Default
        // 0.3 hits the true surface in ~36 steps at the default fudge/detail; the safe band is
        // wide (overshoots only above ~1.0 at fudge 1.0). @see docs/adr/0085.
        numDEeps: {
            type: 'float', default: 0.3, label: 'DE Scale', shortId: 'np', uniform: 'uNumDEeps',
            min: 0.001, max: 5.0, step: 0.001, scale: 'log', group: 'kernel',
            description: 'Magnitude calibration (MB3D dDEscale) for the Numerical (Finite-Diff) estimator. Too high overshoots/misses the surface; too low converges slowly and can exhaust the step budget (blank). ~0.2–0.5 works for the MB3D imports; if a scene reads as noise, lower Ray detail (~1.5) so the rougher numeric DE clears the hit threshold. The probe is auto-derived, so this is the main numeric-DE dial. Only affects that estimator.',
            helpId: 'quality.detail',
            format: (v: number) => v.toFixed(3),
            // Only relevant to the Numerical estimator — hide it for all the analytic ones.
            condition: { param: 'estimator', eq: 7.0 },
        },

        // Numerical-DE SMOOTHING — the primary-ray probe width for est7. The escape field is
        // CHAOTIC in deep (high-iteration) regions, so a narrow finite-difference probe is noisy:
        // as jitter/camera motion perturbs the sample by a sub-probe amount, the DE flips the ray
        // hit↔miss → deep sections flicker black (measured CV ≈ 0.45 at nC≈17 with a ×1 probe,
        // → 0.00 at ×3 — debug/sim-numeric-de4.mts). A wider probe averages that sub-footprint
        // chaos → a stable, flicker-free silhouette, at the cost of some deep-detail sharpness.
        // Lower toward 1.0 for maximum detail (accepts flicker); raise for a smoother, stable
        // surface. Runtime (no recompile); unread on other estimators. @see docs/adr/0085.
        numDESmooth: {
            type: 'float', default: 2.5, label: 'DE Smoothing', shortId: 'ns', uniform: 'uNumDESmooth',
            min: 1.0, max: 8.0, step: 0.1, group: 'kernel',
            description: 'Primary-ray probe width for the Numerical (Finite-Diff) estimator. The escape field is chaotic in deep/high-iteration regions, so a narrow probe (1.0) makes those sections flicker black under any motion. Wider = averages the sub-pixel chaos → a stable, flicker-free surface, trading a little deep-detail sharpness. Raise if deep sections shimmer/flicker; lower toward 1.0 for maximum detail. Only affects that estimator.',
            helpId: 'quality.detail',
            format: (v: number) => v.toFixed(1),
            condition: { param: 'estimator', eq: 7.0 },
        },

        // Post-hit SURFACE REFINEMENT. Sphere tracing accepts the first sample under
        // the hit threshold as-is; for a non-Lipschitz / over-estimating DE (some
        // hybrid / frag / MB3D imports) the ray overshoots a thin or discontinuous
        // surface and the accepted points scatter into "dust" instead of a coherent
        // face. This runs a damped binary search across the iso-surface at the first
        // hit — the coarse march only BRACKETS, then we bisect the ray parameter onto
        // the DE==eps crossing (MB3D's RMdoBinSearch shape, native to any formula).
        //
        // Surface refinement = a CompilableFeatureSection (the volumetric / Burning Mode
        // norm): a compile gate (refineEnabled) that compiles the loop in/out, a hidden
        // runtime toggle (refineActive) for instant on/off after compile, and the live
        // step count (refineSteps). Rendered via an override-mode `compilable` panel
        // item (panels.ts), NOT a plain feature whitelist. REFINE_HARD_CAP (8) bounds the
        // unrolled loop. @see docs/adr/0084.
        refineEnabled: {
            type: 'boolean', default: false, label: 'Surface Refinement', shortId: 'sre', group: 'refine',
            description: "Binary-searches the first ray hit onto the surface — resolves 'dust' from overshooting / discontinuous distance estimators (hard hybrid & imported formulas). Compiling it in/out recompiles; on/off + step count are live after.",
            helpId: 'quality.detail',
            onUpdate: 'compile',
            noAccumReset: true,
        },
        refineActive: {
            // Instant runtime on/off of the compiled loop (the CompilableFeatureSection
            // header toggle drives this once compiled). Hidden — surfaced by the section.
            type: 'boolean', default: false, label: 'Refine Active', shortId: 'sra', uniform: 'uRefineActive',
            group: 'refine', hidden: true,
        },
        refineSteps: {
            type: 'float', default: 4.0, label: 'Refine Steps', shortId: 'sr', uniform: 'uRefineSteps',
            min: 1.0, max: 8.0, step: 1.0, group: 'refine',
            description: 'Bisection steps at the hit — higher converges tighter onto the surface. Live (no recompile).',
            helpId: 'quality.detail',
            format: (v: number) => `${v.toFixed(0)} steps`,
        },

        // MB3D-FAITHFUL MARCHER. Imported MB3D scenes render with MB3D's actual march
        // convergence dynamics (overstep clamp + RSFmul damper + msDEsub safety-sub,
        // CalcThread.pas:196-230) instead of GMT's plain sphere step — what stops an
        // over-estimating fused DE from scattering thin surfaces into "dust". Compile-
        // gated (mb3dFaithful, importer-set); when off the kernel is byte-identical.
        // The two scalar uniforms carry the authored step params (no header parse beyond
        // what the importer already reads). @see docs/adr/0088.
        mb3dFaithful: {
            type: 'boolean', default: false, label: 'MB3D-Faithful March', shortId: 'm3f', group: 'kernel',
            description: "Use MB3D's own raymarch step (damped, Lipschitz-clamped, safety-subtracted) instead of GMT's plain sphere step — resolves overshoot 'dust' on hard hybrid / MB3D imports. Auto-enabled when you import a .m3p scene; toggle here to A/B against GMT's standard march. Recompiles in/out.",
            helpId: 'quality.estimator',
            onUpdate: 'compile',
            noAccumReset: true,
        },
        // Runtime tuning knobs for the faithful marcher, shown in the MB3D-Faithful
        // March section body (group 'mb3d_faithful') once it's compiled in. Live
        // (no recompile) — lower DE Sub if a conservative scene under-steps to empty.
        mb3dStepDiv: {
            type: 'float', default: 0.5, label: 'Step Div', shortId: 'm3s', uniform: 'uMb3dStepDiv',
            min: 0.01, max: 1.0, step: 0.01, group: 'mb3d_faithful',
            description: "MB3D sZstepDiv — step divisor for the faithful marcher (smaller = finer/slower). Authored from the scene; tweak to taste.",
            format: (v: number) => v.toFixed(2),
        },
        mb3dDEsub: {
            type: 'float', default: 0.0, label: 'DE Sub', shortId: 'm3d', uniform: 'uMb3dDEsub',
            min: 0.0, max: 0.9, step: 0.01, group: 'mb3d_faithful',
            description: "MB3D msDEsub — per-step DE safety-subtraction (0 unless the scene set iOptions bit 2). Higher = more cautious near surfaces; too high can under-step a scene to empty — lower it if a scene renders blank.",
            format: (v: number) => v.toFixed(2),
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
            noAccumReset: true,
            userScoped: true,
            hidden: true, // Backs the topbar "Dynamic Scale" toggle; the quality panel
                          // exposes the single "UI Responsiveness" slider instead.
            description: 'Drop resolution while moving and during slow frames; restore when idle.',
            helpId: 'quality.scale',
        },
        adaptiveTarget: {
            type: 'float',
            default: 30,
            label: 'UI Responsiveness',
            shortId: 'at',
            min: 0, max: 60, step: 5,
            group: 'performance',
            format: (v) => (v <= 0 ? 'Off' : `${v} fps`),
            noAccumReset: true,
            userScoped: true,
            description: 'Target frame rate the adaptive resolver + progressive banding hold during interaction. Higher = smoother UI (more downscaling/banding, less GPU load). 0 = off: full-resolution, un-banded frames — chugs the GPU for the fastest accumulation.',
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
            noAccumReset: true, preserveOnApply: true
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
            noAccumReset: true, preserveOnApply: true
        }
    },
    inject: (builder, config) => {
        const state = config.quality as QualityState;
        // Inject MAX_HARD_ITERATIONS for all variants (Physics/Main/Histogram)
        // This controls the unrolled loop size in DE.ts
        const cap = state?.compilerHardCap || DEFAULT_HARD_CAP;
        builder.addDefine('MAX_HARD_ITERATIONS', Math.floor(cap).toString());

        // Post-hit surface refinement (damped bisection). Compile-gated on the master
        // TOGGLE (refineEnabled), not the step count: only emit the REFINE_HARD_CAP
        // define + arm the trace-kernel loop when enabled. Off (default) → no define,
        // no GLSL, byte-identical shader, zero compile cost. The live step count
        // (uRefineSteps) tunes the loop at runtime without recompiling. @see docs/adr/0084.
        if (state?.refineEnabled) {
            builder.addDefine('REFINE_HARD_CAP', String(REFINE_HARD_CAP));
            builder.enableRefinement(true);
        }

        // MB3D-faithful marcher. Compile-gated on the importer-set toggle; off (default)
        // emits zero MB3D GLSL → byte-identical kernel. @see docs/adr/0088.
        if (state?.mb3dFaithful) {
            builder.enableMB3DFaithful(true);
        }
    }
};
