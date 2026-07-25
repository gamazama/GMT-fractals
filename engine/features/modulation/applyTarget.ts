/**
 * The ONE modulation dispatcher: target + offset → the writes it produces.
 *
 * This logic used to exist three times — `AnimationSystem.tick` (live) and both
 * `exportModulations.ts` files (render export) each carried their own copy of
 * the same branch chain. They had already drifted, and every divergence was an
 * export that silently disagreed with the preview:
 *
 *   - the export copies matched vec axes with
 *     `^(coreMath|geometry)\.(vec[23][ABC])_(x|y|z)$`, so any other feature's
 *     vec, any vec4, and every `_w` axis were dropped;
 *   - they emitted each vec axis separately, so modulating X and Y of one vec
 *     made the second emit reset the first back to base — the exact bug fixed
 *     in the tick, and documented there, but never carried across;
 *   - they handled `geometry.preRot` but not `postRot` / `worldRot`;
 *   - their julia fallback tested `if (!juliaX)`, so an axis legitimately
 *     modulated TO zero was overwritten by the base;
 *   - they rebuilt uniform names by string-munging the param id instead of
 *     reading `paramConfig.uniform`.
 *
 * Callers differ only in HOW they deliver writes (the live tick emits through
 * `FRACTAL_EVENTS.UNIFORM`; export calls `engine.setUniform` directly) and in
 * what extra bookkeeping they do (recording, ownership tracking). So this
 * returns a PLAN rather than performing the writes, and each caller executes
 * it its own way.
 *
 * @invariant Pure. No event emits, no store writes, no proxy access — which is
 *   what lets `debug/test-modulation-parity.mts` run one plan and compare the
 *   two executions.
 * @invariant Branch order and fall-through mirror `classifyModulationTarget`;
 *   dispatch is on `routing.branch`, never on a re-tested prefix.
 * @see docs/adr/0109-one-modulation-dispatcher.md
 */

import * as THREE from 'three';
import { composeModulatedValue } from './paramMapping';
import type { ModulationRouting } from './targetRouting';

export interface ModulationUniformWrite {
    key: string;
    value: unknown;
    noAccumReset?: boolean;
}

export interface ModulationPlan {
    /** Shader uniforms to write. */
    uniforms: ModulationUniformWrite[];
    /** `engine.modulations` entries — offsets consumed by UniformManager.syncFrame. */
    engineMods: Array<[string, number]>;
    /** Value to publish at `liveModulations[targetKey]`, when this branch
     *  publishes one. Absent means "leave the map alone". */
    live?: number;
    /** Keyframes to capture while recording. Branch-normalised: the julia
     *  branch records under `geometry.juliaX` whatever alias was targeted. */
    records: Array<{ trackId: string; value: number }>;
}

/**
 * Cross-target state. A vec's axes and julia's components arrive as SEPARATE
 * targets, so their uniform can only be written once every target has been
 * seen — accumulate here, then `flushModulationComposites`.
 */
export interface CompositeAccumulator {
    vecEmits: Map<string, Record<string, number>>;
    julia: { dirty: boolean; x?: number; y?: number; z?: number };
}

export const newCompositeAccumulator = (): CompositeAccumulator => ({
    vecEmits: new Map(),
    julia: { dirty: false },
});

export interface PlanOptions {
    /** The tick replays a target that stopped being modulated (offset forced to
     *  0) so the uniform returns to base. Suppresses the live publish on the
     *  branches that drop a removed target from the map. */
    isRemoved?: boolean;
    /**
     * Recording only. Given a trackId and the branch's natural base, return the
     * CLEAN pre-recording base — otherwise each recorded frame would compound
     * the previous frame's modulation into the next one's base. Presence also
     * switches on `records`.
     */
    cleanBase?: (trackId: string, naturalBase: number) => number;
}

const RECORD_EPS = 0.000001;
const EMPTY_PLAN = (): ModulationPlan => ({ uniforms: [], engineMods: [], records: [] });

/**
 * Plan the writes for one modulated target.
 *
 * `comp` is mutated with any composite contribution; everything else comes back
 * in the returned plan.
 */
export function planModulationTarget(
    targetKey: string,
    offset: number,
    storeState: Record<string, any>,
    routing: ModulationRouting,
    comp: CompositeAccumulator,
    opts: PlanOptions = {},
): ModulationPlan {
    const plan = EMPTY_PLAN();
    const { isRemoved = false, cleanBase } = opts;
    const recording = !!cleanBase;

    // Slider-space compose (ADR-0108). On a linear target this is `b + offset`.
    const mod = (b: number) => composeModulatedValue(b, offset, routing.curve);

    // Base for the generic branches. While recording, the clean pre-recording
    // value replaces the store's (already-modulated) one, and the frame is
    // captured. Gated on a real offset so an idle target isn't keyframed.
    let base = routing.base;
    if (recording && Math.abs(offset) > RECORD_EPS) {
        base = cleanBase!(targetKey, routing.base);
        plan.records.push({ trackId: targetKey, value: mod(base) });
    }

    switch (routing.branch) {
        // A. Coloring repeats/phase — scale and offset are derived, not direct.
        case 'coloring': {
            const c = storeState.coloring;
            if (!c) return plan;
            if (targetKey === 'coloring.repeats' || targetKey === 'coloring.repeats2') {
                const two = targetKey.endsWith('2');
                const repeats = two ? c.repeats2 : c.repeats;
                const scale = two ? c.scale2 : c.scale;
                if (Math.abs(repeats) > 0.001) {
                    const modulated = mod(base);
                    if (!isRemoved) plan.live = modulated;
                    // Preserve the authored scale:repeats ratio as repeats moves.
                    plan.uniforms.push({
                        key: two ? 'uColorScale2' : 'uColorScale',
                        value: modulated * (scale / base),
                    });
                }
                return plan;
            }
            // phase / phase2 — the live value tracks `phase`, but the uniform is
            // built from the separate `offset` field.
            const two = targetKey.endsWith('2');
            if (!isRemoved) plan.live = mod(base);
            plan.uniforms.push({
                key: two ? 'uColorOffset2' : 'uColorOffset',
                value: mod(two ? c.offset2 : c.offset),
            });
            return plan;
        }

        // B. Julia composite — three targets, one uJulia.
        case 'julia': {
            const g = storeState.geometry;
            // Deliberately the STORE base, not the recording clean base: the
            // julia branch has always recorded against the live value.
            const axis = targetKey.endsWith('juliaX') || targetKey.endsWith('x') ? 'x'
                : targetKey.endsWith('juliaY') || targetKey.endsWith('y') ? 'y'
                : targetKey.endsWith('juliaZ') || targetKey.endsWith('z') ? 'z'
                : null;
            comp.julia.dirty = true;
            if (!axis) return plan;
            const natural = g?.[`julia${axis.toUpperCase()}`] ?? 0;
            const value = mod(natural);
            comp.julia[axis] = value;
            plan.live = value;
            if (recording) plan.records.push({ trackId: `geometry.julia${axis.toUpperCase()}`, value });
            return plan;
        }

        // C. Camera — the OFFSET is what the worker consumes, and what the UI
        //    displays; there is no slice base to add it to.
        case 'camera': {
            const axis = targetKey.endsWith('x') ? 'x' : targetKey.endsWith('y') ? 'y'
                : targetKey.endsWith('z') ? 'z' : null;
            if (axis) {
                if (targetKey.startsWith('camera.unified')) plan.engineMods.push([`camera.unified.${axis}`, offset]);
                else if (targetKey.startsWith('camera.rotation')) plan.engineMods.push([`camera.rotation.${axis}`, offset]);
            }
            plan.live = offset;
            return plan;
        }

        // D. Geometry pre/post/world rotation — composed into matrices by
        //    UniformManager, so the OFFSET crosses and the base stays local.
        case 'geometryRotation': {
            plan.engineMods.push([targetKey, offset]);
            if (!isRemoved) plan.live = mod(base);
            return plan;
        }

        // E. Light array — not DDFS params, so the base comes off the element.
        case 'lighting': {
            const match = targetKey.match(/^lighting\.light(\d+)_(\w+)$/);
            if (!match) return plan;
            const l = storeState.lighting?.lights?.[parseInt(match[1], 10)];
            if (!l) return plan;
            const prop = match[2];
            // Must stay in step with LIGHT_PROPS in targetRouting.ts and with the
            // `modulations[...]` reads in UniformManager's light loop.
            const natural =
                prop === 'intensity' ? l.intensity
                : prop === 'falloff' ? l.falloff
                : prop === 'posX' ? l.position?.x
                : prop === 'posY' ? l.position?.y
                : prop === 'posZ' ? l.position?.z
                : prop === 'rotX' ? (l.rotation?.x ?? 0)
                : prop === 'rotY' ? (l.rotation?.y ?? 0)
                : prop === 'rotZ' ? (l.rotation?.z ?? 0)
                : undefined;
            if (natural === undefined) return plan;

            const b = recording ? cleanBase!(targetKey, natural) : natural;
            plan.live = mod(b);
            if (recording) plan.records.push({ trackId: targetKey, value: mod(b) });
            plan.engineMods.push([targetKey, offset]);
            return plan;
        }

        // F. Vec axis on any feature — accumulate, never emit per axis.
        case 'vecAxis': {
            const m = targetKey.match(/^(\w+)\.([\w]+)_(x|y|z|w)$/);
            if (!m) return plan;
            const vec = storeState[m[1]]?.[m[2]];
            if (!vec || typeof vec !== 'object') return plan;
            const axis = m[3] as 'x' | 'y' | 'z' | 'w';
            const natural = vec[axis] ?? 0;
            const finalVal = mod(natural);

            const b = recording ? cleanBase!(targetKey, natural) : natural;
            if (recording) plan.records.push({ trackId: targetKey, value: mod(b) });
            if (!isRemoved) plan.live = recording ? mod(b) : finalVal;

            // Each axis is its own target, so this branch runs once per modulated
            // axis. Cloning the base vec and emitting per axis meant the second
            // axis's emit reset the first back to base — modulating X and Y of
            // one vec silently dropped X. Compose all axes, emit once.
            const uniform = routing.uniform;
            if (uniform && uniform.endsWith(`_${axis}`)) {
                const baseUniform = uniform.replace(/_[xyzw]$/, '');
                let scratch = comp.vecEmits.get(baseUniform);
                if (!scratch) {
                    scratch = typeof vec.clone === 'function' ? vec.clone() : { ...vec };
                    comp.vecEmits.set(baseUniform, scratch!);
                }
                scratch![axis] = finalVal;
            }
            return plan;
        }

        // G. Scalar fallback — every remaining DDFS param.
        default: {
            if (!routing.uniform && !routing.ddfsResolved) return plan;
            const finalScalar = mod(base);
            if (!isRemoved) plan.live = finalScalar;
            if (routing.uniform) {
                plan.uniforms.push({ key: routing.uniform, value: finalScalar, noAccumReset: routing.noAccumReset });
            }
            return plan;
        }
    }
}

/**
 * Uniform writes for the composites, once every target has been planned.
 *
 * @invariant Must run AFTER the whole target loop. A vec's axes and julia's
 *   components are separate targets; emitting mid-loop is what dropped the
 *   earlier axes.
 */
export function flushModulationComposites(
    comp: CompositeAccumulator,
    storeState: Record<string, any>,
): ModulationUniformWrite[] {
    const out: ModulationUniformWrite[] = [];

    comp.vecEmits.forEach((composed, baseUniform) => out.push({ key: baseUniform, value: composed }));

    if (comp.julia.dirty) {
        const g = storeState.geometry;
        // `?? base` per axis, NOT a falsy test: an axis modulated exactly TO
        // zero is a real value and must not be replaced by the store's.
        out.push({
            key: 'uJulia',
            value: new THREE.Vector3(
                comp.julia.x ?? g?.juliaX ?? 0,
                comp.julia.y ?? g?.juliaY ?? 0,
                comp.julia.z ?? g?.juliaZ ?? 0,
            ),
        });
    }
    return out;
}
