/**
 * Test case definitions for the render harness.
 *
 * Phase 1: correctness grid. 42 formulas, baseline mode only for now
 *   (hybrid/hybrid-adv/interlace modes are wired but commented pending
 *   formula-specific parameter presets). Each case renders 8 frames + PNG.
 * Phase 2: feature-axis sweep. 5 representative formulas × (shadow, reflection,
 *   atmosphere, quality, estimator, rayPrecision, bufferPrecision, hardLoopCap).
 * Phase 3: perf subset. 10 formulas with warmup + FPS measurement.
 */

import { registry } from '../engine/FractalRegistry';
import '../formulas';  // register natives

// ─── Shared helpers ──────────────────────────────────────────────────────────

export type TestMode = 'baseline' | 'hybrid' | 'hybrid-adv' | 'interlace';

export interface HarnessCase {
    id: string;
    formula: string;
    configOverrides: Record<string, any>;
    mode: 'single' | 'perf';
    axis?: string;           // phase-2 axis name (for grouping)
    axisValue?: string;      // phase-2 axis value
}

function eligibleFormulas(options: { includeModular?: boolean } = {}): string[] {
    return registry.getAll()
        .filter(d => options.includeModular ? true : d.id !== 'Modular')
        .map(d => d.id);
}

function applyModeOverrides(mode: TestMode, primary: string): Record<string, any> {
    if (mode === 'baseline') return {};
    if (mode === 'hybrid')     return { geometry: { hybridCompiled: true, hybridComplex: false, hybridMode: true } };
    if (mode === 'hybrid-adv') return { geometry: { hybridCompiled: true, hybridComplex: true,  hybridMode: true } };
    if (mode === 'interlace') {
        // Use Mandelbulb as default secondary; specific interlace pair sweeps are
        // in native-interlace-sweep.mts. Here we just test "this formula works as
        // primary with interlacing turned on."
        const secondary = primary === 'Mandelbulb' ? 'AmazingBox' : 'Mandelbulb';
        return {
            interlace: {
                interlaceCompiled: true,
                interlaceFormula: secondary,
                interlaceEnabled: true,
            },
        };
    }
    return {};
}

// ─── Phase 1: correctness grid ───────────────────────────────────────────────

export function phase1Cases(): HarnessCase[] {
    const cases: HarnessCase[] = [];
    // Baseline-only for now. hybrid / hybrid-adv / interlace modes produce
    // scrambled-looking renders because the parameter values we're feeding
    // aren't tuned to each formula. Re-enable once those parameter presets
    // are worked out. Until then, the existing compile-only sweeps (npm run
    // test:hybrid etc.) cover those paths at the GLSL level.
    const modes: TestMode[] = ['baseline'];
    for (const formulaId of eligibleFormulas()) {
        for (const mode of modes) {
            cases.push({
                id: `${formulaId}__${mode}`,
                formula: formulaId,
                configOverrides: applyModeOverrides(mode, formulaId),
                mode: 'single',
            });
        }
    }
    return cases;
}

// ─── Phase 2: feature-axis sweep ─────────────────────────────────────────────

const PHASE2_FORMULAS = ['Mandelbulb', 'AmazingBox', 'MengerSponge', 'Kleinian', 'MarbleMarcher'];

type AxisDef = {
    name: string;
    values: Array<{ label: string; override: Record<string, any> }>;
};

// Feature axis values. All overrides are partial — merged into the preset.
// Uses real feature IDs + param names from features/*.ts.
const AXES: AxisDef[] = [
    {
        name: 'shadow',
        values: [
            { label: 'off',  override: { lighting: { shadows: false } } },
            { label: 'hard', override: { lighting: { shadows: true, shadowSoftness: 0 } } },
            { label: 'soft', override: { lighting: { shadows: true, shadowSoftness: 16 } } },
            { label: 'full', override: { lighting: { shadows: true, shadowSoftness: 32, shadowIntensity: 1 } } },
        ],
    },
    {
        name: 'reflection',
        values: [
            { label: 'off',      override: { materials: { reflection: 0, useEnvMap: false } } },
            { label: 'env',      override: { materials: { reflection: 0.5, useEnvMap: true,  envSource: 1 } } },
            { label: 'raymarch', override: { reflections: { reflectionEnabled: true, reflectionBounces: 1 } } },
            { label: 'full',     override: { reflections: { reflectionEnabled: true, reflectionBounces: 3 } } },
        ],
    },
    {
        name: 'atmosphere',
        values: [
            { label: 'off',    override: { atmosphere: { fogDensity: 0, glowIntensity: 0 } } },
            { label: 'fast',   override: { atmosphere: { fogDensity: 0.1, glowIntensity: 0 } } },
            { label: 'color',  override: { atmosphere: { fogDensity: 0.3, fogColor: '#446688' } } },
            { label: 'volume', override: { volumetric: { volumetricEnabled: true, volumetricSteps: 32 } } },
        ],
    },
    {
        name: 'quality',
        values: [
            { label: 'draft',    override: { quality: { detail: 0.6, fudgeFactor: 0.8,  pixelThreshold: 0.5, maxSteps: 100 } } },
            { label: 'standard', override: { quality: { detail: 1.0, fudgeFactor: 1.0,  pixelThreshold: 0.2, maxSteps: 300 } } },
            { label: 'high',     override: { quality: { detail: 1.5, fudgeFactor: 1.2,  pixelThreshold: 0.1, maxSteps: 500 } } },
            { label: 'ultra',    override: { quality: { detail: 2.0, fudgeFactor: 1.5,  pixelThreshold: 0.05, maxSteps: 800 } } },
        ],
    },
    {
        name: 'estimator',
        values: [
            { label: '0', override: { quality: { estimator: 0 } } },
            { label: '1', override: { quality: { estimator: 1 } } },
            { label: '2', override: { quality: { estimator: 2 } } },
        ],
    },
    {
        name: 'rayPrecision',
        values: [
            { label: 'single', override: { quality: { precisionMode: 0 } } },
            { label: 'double', override: { quality: { precisionMode: 1 } } },
        ],
    },
    {
        name: 'bufferPrecision',
        values: [
            { label: 'float32', override: { quality: { bufferPrecision: 0 } } },
            { label: 'half16',  override: { quality: { bufferPrecision: 1 } } },
        ],
    },
    {
        name: 'hardLoopCap',
        values: [
            { label: 'low',  override: { compilerHardCap: 500 } },
            { label: 'std',  override: { compilerHardCap: 2000 } },
        ],
    },
];

export function phase2Cases(): HarnessCase[] {
    const cases: HarnessCase[] = [];
    for (const formula of PHASE2_FORMULAS) {
        for (const axis of AXES) {
            for (const v of axis.values) {
                cases.push({
                    id: `${formula}__${axis.name}=${v.label}`,
                    formula,
                    configOverrides: v.override,
                    mode: 'single',
                    axis: axis.name,
                    axisValue: v.label,
                });
            }
        }
    }
    return cases;
}

// ─── Phase 3: perf subset ────────────────────────────────────────────────────

const PHASE3_FORMULAS = [
    'Mandelbulb', 'AmazingBox', 'MengerSponge', 'Kleinian', 'MarbleMarcher',
    'KaliBox', 'MixPinski', 'Mandelbar3D', 'Quaternion', 'Dodecahedron',
];

export function phase3Cases(): HarnessCase[] {
    const cases: HarnessCase[] = [];
    // Baseline-only until hybrid/interlace param presets are tuned. Re-enable
    // those modes once they produce coherent renders.
    const modes: TestMode[] = ['baseline'];
    for (const formula of PHASE3_FORMULAS) {
        for (const mode of modes) {
            cases.push({
                id: `${formula}__${mode}__perf`,
                formula,
                configOverrides: applyModeOverrides(mode, formula),
                mode: 'perf',
            });
        }
    }
    return cases;
}
