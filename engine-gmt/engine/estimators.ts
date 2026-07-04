/**
 * The distance-estimator registry — single owner of GMT's DE estimator catalog.
 *
 * Each entry couples everything one estimator needs: its `quality.estimator` value +
 * dropdown label + UI availability predicate (`disabledIf`), and its compile-time
 * dispatch — either a `mathLine` spliced into the shared getDist template (scalar
 * estimators, bucketed by `below`), a full `body` replacing getDist (capability-gated
 * specials reading engine accumulators), or a `kernelGate` armed on the ShaderBuilder
 * (numeric DE). Adding an estimator = adding ONE entry here; quality.ts renders the
 * catalog and core_math.ts dispatches it.
 *
 * Dispatch semantics (faithful to the original threshold chain — the estimator is a
 * FLOAT param, so mid-values bucket by threshold, not equality):
 *  - specials are checked from the highest `threshold` down; a value above a special's
 *    threshold whose capability guard fails coerces to Linear (1.0) BEFORE lower
 *    checks run. @invariant This fallback is load-bearing: a forced est5/est6 on a
 *    formula lacking the cp_* or g_difsDE accumulators would otherwise emit
 *    undeclared identifiers and fail to compile.
 *  - scalar estimators bucket by `value < below`, first match wins.
 *
 * @see docs/adr/0085 (numeric DE) · quality.ts `estimator` param · core_math.ts
 */

import { registry } from './FractalRegistry';

/** Formula capabilities the special estimators require. `supportsCuttingPlane` is the
 *  PAIR capability (primary OR interlace secondary) — see pairHasCapability. */
export interface EstimatorCaps {
    supportsCuttingPlane: boolean;
    supportsDifs: boolean;
}

interface EstimatorEntry {
    id: string;
    /** quality.estimator dropdown value. */
    value: number;
    label: string;
    /** UX-only greying; the dispatch fallback below is the real guard. */
    disabledIf?: (state: any) => boolean;
    /** Scalar estimator: matches when estimatorType < below (walked in value order). */
    below?: number;
    /** Scalar estimator: GLSL spliced into the shared getDist template. */
    mathLine?: string;
    /** Special estimator: matches when estimatorType > threshold AND requires(caps). */
    threshold?: number;
    requires?: (caps: EstimatorCaps) => boolean;
    /** Special estimator: full getDist body (reads engine accumulators; no smooth-iter). */
    body?: string;
    /** Kernel-gated estimator: armed on the ShaderBuilder instead of a getDist body
     *  (matches when estimatorType > threshold). @see shaders/chunks/kernel.ts */
    kernelGate?: 'numericDE';
}

/** The catalog, in DROPDOWN DISPLAY ORDER (not value order — Linear 2.0 sits with its
 *  Linear sibling). Dispatch derives its own orderings below. */
export const ESTIMATORS: EstimatorEntry[] = [
    {
        id: 'analyticLog', value: 0.0, label: 'Analytic (Log)',
        // 0: Analytic (Log) - Standard for Power Fractals — d = 0.5 * r * log(r) / dr
        below: 0.5,
        mathLine: `
        float logR2 = log2(m2);
        // 0.5 * ln(2) / 2 ≈ 0.17328679 — converts log2(r²) to 0.5*r*ln(r) for DE formula
        d = 0.17328679 * logR2 * r / dr_safe;
        `,
    },
    {
        id: 'linearUnit', value: 1.0, label: 'Linear (Unit 1.0)',
        // 1: Linear (Fold 1.0) - Standard for Box/Menger — d = (r - 1.0) / dr
        below: 1.5,
        mathLine: `d = (r - 1.0) / dr_safe;`,
    },
    {
        id: 'linearOffset2', value: 4.0, label: 'Linear (Offset 2.0)',
        // 4: Linear (Fold 2.0) - Classic Menger offset — d = (r - 2.0) / dr
        below: Infinity,
        mathLine: `d = (r - 2.0) / dr_safe;`,
    },
    {
        id: 'pseudoRaw', value: 2.0, label: 'Pseudo (Raw)',
        // 2: Pseudo (Raw) - Good for Artifacts — d = r / dr
        below: 2.5,
        mathLine: `d = r / dr_safe;`,
    },
    {
        id: 'dampened', value: 3.0, label: 'Dampened',
        // 3: Dampened - Fix Slices — d = 0.5 * r * log(r) / (dr + K)
        below: 3.5,
        mathLine: `
        float logR2 = log2(m2);
        // 0.5 * ln(2) ≈ 0.34657359 — converts log2(r²) to r*ln(r), then halved by dampening term
        d = 0.34657359 * logR2 * r / (dr_safe + 8.0);
        `,
    },
    {
        id: 'cuttingPlane', value: 5.0, label: 'Cutting Plane',
        // Knighty fold-and-cut. Reads engine-provided cp_dmin/cp_trap accumulators
        // (declared only when the formula pair has shader.supportsCuttingPlane).
        threshold: 4.5,
        requires: (caps) => caps.supportsCuttingPlane,
        body: `
        vec2 getDist(float r, float dr, float iter, vec4 z) {
            return vec2(abs(cp_dmin), cp_trap);
        }`,
        // Gray out unless the current formula declares supportsCuttingPlane
        // (a migrated legacy pair is one fused def whose capabilities union
        // the slots' — ADR-0089 P4.4). Engine falls back to Linear if forced
        // on a non-CP formula, so this is purely UX.
        disabledIf: (state: any) => !registry.get(state?.formula)?.shader.supportsCuttingPlane,
    },
    {
        id: 'difs', value: 6.0, label: 'dIFS (Orbit Trap)',
        // MB3D orbit-trap IFS — reads the engine-provided g_difsDE accumulator, the
        // running minimum over the orbit of mb3dRout/mb3dVary, written each iteration
        // by an MB3D-imported fused dIFS formula (g_difsDE declared in its preamble,
        // init in loopInit). Mirrors MB3D's doHybridIFS3D (formulas.pas:3210). The
        // 5.5 threshold sits ABOVE cuttingPlane's 4.5 — dispatch checks high→low, so
        // est6 can never be coerced into the CP body.
        threshold: 5.5,
        requires: (caps) => caps.supportsDifs,
        body: `
        vec2 getDist(float r, float dr, float iter, vec4 z) {
            return vec2(g_difsDE, iter);
        }`,
        // Only valid on an imported dIFS scene (declares shader.supportsDifs + a
        // g_difsDE preamble). Engine falls back to Linear on any other formula.
        disabledIf: (state: any) => !registry.get(state?.formula)?.shader.supportsDifs,
    },
    {
        id: 'numeric', value: 7.0, label: 'Numerical (Finite-Diff)',
        // The only estimator that needs NO analytic derivative: re-iterates the orbit
        // at perturbed seed points and estimates distance from the escape-radius
        // gradient (port of MB3D CalcDEnoADE). For ANY formula whose analytic dr is
        // missing or wrong: MB3D [CODE] hybrids, hard frag imports, hand-written
        // formulas. ~4× the DE cost. Armed as a kernel gate, not a getDist body —
        // the getDist emitted alongside is dead code on this path. @see docs/adr/0085
        threshold: 6.5,
        kernelGate: 'numericDE',
    },
];

/** Dropdown options for quality.ts — the catalog's UI face. */
export const ESTIMATOR_OPTIONS = ESTIMATORS.map(({ label, value, disabledIf }) =>
    disabledIf ? { label, value, disabledIf } : { label, value });

/** True when `estimatorType` arms the numeric-DE kernel gate (est7). */
export function isNumericDEEstimator(estimatorType: number): boolean {
    return ESTIMATORS.some(e => e.kernelGate === 'numericDE' && e.threshold !== undefined && estimatorType > e.threshold);
}

// Dispatch orderings (derived once): specials high→low threshold; scalars low→high bucket.
const SPECIALS = ESTIMATORS.filter(e => e.body !== undefined)
    .sort((a, b) => b.threshold! - a.threshold!);
const SCALARS = ESTIMATORS.filter(e => e.mathLine !== undefined)
    .sort((a, b) => a.below! - b.below!);

/** Generate the compile-time getDist GLSL for an estimator value + formula caps. */
export function generateGetDist(estimatorType: number, caps: EstimatorCaps): string {
    for (const s of SPECIALS) {
        if (estimatorType > s.threshold!) {
            if (s.requires!(caps)) return s.body!;
            estimatorType = 1.0; // unmet capability → Linear (the load-bearing fallback)
        }
    }

    const mathLine = (SCALARS.find(e => estimatorType < e.below!) ?? SCALARS[SCALARS.length - 1]).mathLine!;

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
}
