// Shader Compiler — compile-time estimators.
//
// One source of per-switch cost truth: the DDFS `estCompileMs` annotations on
// feature params (features/*). Both estimators sum those through the SAME core
// (`sumParamCompileMs`), so the EnginePanel/ViewportQuality preview and the live
// compile-progress bar report the same number for the same config.
//
//   - estimateCompileTime(state)            — live store state (compile-progress).
//   - estimateShaderCompilerCompileTime(idx) — a tier selection (preview), via a
//       synthetic state = feature defaults + the selected tiers' overrides.
//
// BASE_COMPILE_MS (3600) = the calibrated core-trace cost after ADR-0076/0077.
// estCompileMs annotations recalibrated against measured cold data (L6 2026-06-19;
// ptEnabled re-measured 2026-06-20). The old monolithic ENGINE_PROFILES + the
// orphaned applyPreset action were retired here (ADR-0079) — Viewport Quality
// profiles (types/viewport.ts data, registered from engine-gmt) supersede them.
// @see docs/policy/shader-compile-optimization.md §2.5
// @see docs/adr/0079-shader-compiler-profile-seam.md

import { featureRegistry, type ParamConfig, type ParamOption } from '../../engine/FeatureSystem';
import { getShaderCompilerSubsystems } from '../../../types/viewport';

/** Core trace + always-present shading pipeline (no optional compile switches). */
export const BASE_COMPILE_MS = 3600;

/** Is this state rendering with the path tracer? Uses the RELIABLE top-level
 *  `renderMode` (string set by setRenderMode) — NOT the fragile `lighting.renderMode`
 *  float mirror, which isn't synced on a live render-mode toggle. */
const isPathTracing = (state: any): boolean =>
    state?.renderMode === 'PathTracing' || state?.renderMode === 1.0 || state?.lighting?.renderMode === 1.0;

/** The PT-family compile switches (ptEnabled + everything parented under it:
 *  ptReflMode, ptAreaLights, ptNEEAllLights, ptSobolBounce, …). MEASURED
 *  2026-06-20: these cost ~nothing in Direct render — the path-tracer GLSL only
 *  compiles when renderMode=PathTracing. So they're counted ONLY in PT, else
 *  Direct estimates were inflated by ~3.7s (ptEnabled 2.5s + ptReflMode 1.7s) for
 *  costs that never compiled. @see docs/adr/0079 */
const isPtFamily = (paramKey: string, pc: ParamConfig): boolean =>
    paramKey === 'ptEnabled' || (pc as any).parentId === 'ptEnabled';

/**
 * Sum the estCompileMs of every active compile switch in a state-like object.
 * Shared by both estimators — `state` can be the live store state or a synthetic
 * tier state. Booleans cost when truthy; dropdowns cost the matching option.
 * PT-family switches are skipped unless the state is in PT render mode.
 */
const sumParamCompileMs = (state: any): number => {
    const pt = isPathTracing(state);
    let total = 0;
    for (const feat of featureRegistry.getAll()) {
        const slice = state[feat.id];
        if (!slice) continue;

        for (const [paramKey, paramConfig] of Object.entries(feat.params)) {
            const pc = paramConfig as ParamConfig;
            if (!pc.onUpdate || pc.onUpdate !== 'compile') continue;
            // PT-family compiles only in PT render mode (free in Direct).
            if (!pt && isPtFamily(paramKey, pc)) continue;

            const value = slice[paramKey];

            if (pc.type === 'boolean' && value && pc.estCompileMs) {
                total += pc.estCompileMs;
            }

            if (pc.options) {
                const match = pc.options.find((o: ParamOption) => {
                    if (typeof o.value === 'number' && typeof value === 'number') {
                        return Math.abs(o.value - value) < 0.001;
                    }
                    return o.value === value;
                });
                if (match?.estCompileMs) total += match.estCompileMs;
            }
        }
    }
    return total;
};

/** Estimate compile time (ms) from the live store state. */
export const estimateCompileTime = (state: any): number =>
    BASE_COMPILE_MS + sumParamCompileMs(state);

/**
 * Estimate compile time (ms) for a Viewport-Quality tier selection, BEFORE it is
 * applied to the store. Builds a synthetic state from feature defaults + the
 * selected tiers' overrides and runs it through the same per-param summer, so the
 * preview matches `estimateCompileTime` for the resulting config. A tier's
 * optional `estCompileMs` is a small ADJUSTMENT for costs the per-param model
 * can't express (e.g. the Preview lighting tier stripping the PBR pipeline).
 */
export const estimateShaderCompilerCompileTime = (subsystems: Record<string, number>): number => {
    const state: Record<string, any> = {};
    for (const feat of featureRegistry.getAll()) {
        const slice: Record<string, any> = {};
        for (const [k, pc] of Object.entries(feat.params)) {
            slice[k] = (pc as ParamConfig).default;
        }
        state[feat.id] = slice;
    }

    let adjust = 0;
    for (const sub of getShaderCompilerSubsystems()) {
        const tier = sub.tiers[subsystems[sub.id] ?? 0];
        if (!tier) continue;
        for (const [featId, overrides] of Object.entries(tier.overrides)) {
            if (!state[featId]) state[featId] = {};
            Object.assign(state[featId], overrides);
        }
        if (tier.estCompileMs) adjust += tier.estCompileMs;
    }

    return BASE_COMPILE_MS + sumParamCompileMs(state) + adjust;
};
