/**
 * Modulation target routing — what CAN be modulated, and where the offset goes.
 *
 * Two halves of one question, kept in one pure module so the three consumers
 * cannot drift apart:
 *
 *   - `ParameterSelector` (what the picker offers)      → `isModulatable`
 *   - `AnimationSystem.tick` (where an offset is sent)  → `classifyModulationTarget`
 *   - `debug/test-modulation-coverage.mts` (the gate)   → both
 *
 * Before this module existed the picker's notion of "modulatable" and the
 * dispatcher's branch chain were independent code, and they disagreed: targets
 * were offered that no branch consumed, and a branch read
 * `lighting.light<i>_rotX` that nothing ever produced. The gate exists to keep
 * that from returning, and it can only work if it asks the SAME function the
 * tick asks.
 *
 * @invariant `classifyModulationTarget` must mirror the branch order in
 *   `AnimationSystem.tick`'s per-target loop EXACTLY — first match wins, and
 *   several branches swallow their whole prefix (a `camera.` target never
 *   reaches the scalar fallback even when it resolves to nothing). The tick
 *   calls this function to pick its branch rather than re-testing the
 *   predicates, so the mirror is enforced by construction.
 * @see docs/adr/0107-live-modulation-transport.md
 */

import { featureRegistry } from '../../FeatureSystem';
import { MAX_LIGHTS } from '../../../data/constants';
import { mappingForParam, mappingForVirtual, virtualScaleFor, LINEAR_CURVE, type TargetCurve } from './paramMapping';

/** Where a target's offset ends up. */
export type ModulationSink =
    /** Written as a shader uniform via `FRACTAL_EVENTS.UNIFORM`. */
    | 'uniform'
    /** Written into `engine.modulations`, consumed by `UniformManager.syncFrame`
     *  (rotation matrices, camera, packed light arrays). Reaches the worker on
     *  RENDER_TICK for live and EXPORT_RENDER_FRAME for export. */
    | 'engine-mods'
    /** Read straight off a feature slice that ships inside `renderState`, with
     *  `applyLiveMod` folding the modulation in before the post. Used where the
     *  worker consumes a param as plain state rather than as a uniform —
     *  `optics.camFov` (FractalEngine's target FOV) and `optics.orthoScale`
     *  (UniformManager's ortho frustum). */
    | 'render-state'
    /** Updates `liveModulations` — the slider moves, the image does not. A
     *  legitimate terminus for uniformless engine-fork apps that read the store
     *  directly (fluid-toy), and a BUG for any uniform-backed app. */
    | 'display-only'
    /** Nothing consumes it. Always a bug when the picker offers it. */
    | 'none';

export type ModulationBranch =
    | 'coloring'
    | 'julia'
    | 'camera'
    | 'geometryRotation'
    | 'lighting'
    | 'vecAxis'
    | 'scalar'
    | 'unresolved';

export interface ModulationRouting {
    branch: ModulationBranch;
    sink: ModulationSink;
    /** Uniform written when `sink === 'uniform'`. For a vec axis this is the
     *  axis-suffixed name (`uJuliaC_x`); the tick strips the suffix and
     *  composes all axes into one emit. */
    uniform?: string;
    /** True when the target resolved to a real DDFS param (scalar or vec axis). */
    ddfsResolved: boolean;
    /** Unmodulated value from the slice — the tick adds the offset to this.
     *  0 when the target doesn't resolve to a numeric DDFS param. */
    base: number;
    /** Param declared `noAccumReset`; its uniform write must not reset the
     *  accumulation buffer. */
    noAccumReset: boolean;
    /** Slider geometry for this target. Every applier composes through
     *  `composeModulatedValue(base, offset, curve)` so a curved param modulates
     *  with the same feel its slider drags with. Linear targets get
     *  `LINEAR_CURVE`, for which the compose is exactly `base + offset`. */
    curve: TargetCurve;
}

const COLORING_COMPOSITES = new Set([
    'coloring.repeats', 'coloring.phase', 'coloring.repeats2', 'coloring.phase2',
]);

/** Light props the lighting branch knows how to apply. */
export const LIGHT_PROPS = ['intensity', 'falloff', 'posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ'] as const;
export type LightProp = typeof LIGHT_PROPS[number];
const LIGHT_PROP_SET: ReadonlySet<string> = new Set(LIGHT_PROPS);

type Slice = Record<string, unknown> | undefined;

/**
 * Feature slices the host merges `liveModulations` into before shipping them in
 * `renderState` (see `applyLiveMod` in GmtRendererTickDriver). A uniformless
 * param on one of these still reaches the renderer.
 *
 * @invariant Adding a feature here is a CLAIM that the host actually merges it.
 *   The coverage gate trusts this set — listing a feature whose slice ships raw
 *   would mark dead targets as healthy.
 */
export const RENDER_STATE_MERGED_FEATURES: ReadonlySet<string> = new Set(['optics']);

/** Sink for a resolved DDFS param: a uniform if it declares one, else the
 *  renderState merge if its feature is shipped that way, else display-only. */
function ddfsSink(featureId: string, uniform: string | undefined): ModulationSink {
    if (uniform) return 'uniform';
    if (RENDER_STATE_MERGED_FEATURES.has(featureId)) return 'render-state';
    return 'display-only';
}

/**
 * Resolve a target string to the branch that will handle it and the sink that
 * branch writes to. Pure — reads the registry and a store snapshot, mutates
 * nothing.
 *
 * `storeState` is the engine store snapshot; slice presence is what gates the
 * GMT-specific branches, exactly as in the tick.
 */
export function classifyModulationTarget(
    targetKey: string,
    storeState: Record<string, unknown>,
): ModulationRouting {
    // --- DDFS resolution first: the tick computes this BEFORE its branch chain,
    //     because the recording path and the scalar fallback both need it.
    let uniform: string | undefined;
    let ddfsResolved = false;
    let base = 0;
    let noAccumReset = false;
    // Slider geometry, filled wherever a ParamConfig is found. Stays
    // LINEAR_CURVE for targets with no declared curve, which makes the compose
    // an exact `base + offset`.
    let curve: TargetCurve = LINEAR_CURVE;
    const curveFromConfig = (c: { scale?: unknown; min?: number; max?: number }): TargetCurve => ({
        mapping: mappingForParam(c as Parameters<typeof mappingForParam>[0]),
        min: c.min ?? 0,
        max: c.max ?? 1,
    });

    if (targetKey.includes('.')) {
        const [featureId, paramId] = targetKey.split('.');
        const feature = featureRegistry.get(featureId);
        const slice = storeState[featureId] as Slice;
        if (feature && slice) {
            const vectorMatch = paramId.match(/^(.+)_(x|y|z|w)$/);
            const vectorName = vectorMatch?.[1];
            const vecVal = vectorName ? (slice as Record<string, unknown>)[vectorName] : undefined;
            if (vectorMatch && vectorName && vecVal && typeof vecVal === 'object') {
                const paramConfig = feature.params[vectorName];
                if (paramConfig) {
                    base = (vecVal as Record<string, number>)[vectorMatch[2]] ?? 0;
                    curve = curveFromConfig(paramConfig);
                    if (paramConfig.uniform) uniform = `${paramConfig.uniform}_${vectorMatch[2]}`;
                    if (paramConfig.noAccumReset) noAccumReset = true;
                    ddfsResolved = true;
                }
            } else {
                const paramConfig = feature.params[paramId];
                if (paramConfig) {
                    const raw = (slice as Record<string, unknown>)[paramId];
                    if (typeof raw === 'number') base = raw;
                    curve = curveFromConfig(paramConfig);
                    if (paramConfig.uniform) uniform = paramConfig.uniform;
                    if (paramConfig.noAccumReset) noAccumReset = true;
                    ddfsResolved = true;
                }
            }
        }
    } else if (targetKey === 'iterations') {
        uniform = 'uIterations';
        base = ((storeState.coreMath as Record<string, number> | undefined)?.iterations) ?? 0;
        // Legacy bare alias for `coreMath.iterations` — take the same curve, or
        // the alias would modulate on a linear track while its canonical form
        // used the cube one.
        const cfg = featureRegistry.get('coreMath')?.params?.iterations;
        if (cfg) curve = curveFromConfig(cfg);
        ddfsResolved = true;
    } else if (targetKey.startsWith('param')) {
        uniform = 'u' + targetKey.charAt(0).toUpperCase() + targetKey.slice(1);
        base = ((storeState.coreMath as Record<string, number> | undefined)?.[targetKey]) ?? 0;
        const cfg = featureRegistry.get('coreMath')?.params?.[targetKey];
        if (cfg) curve = curveFromConfig(cfg);
        ddfsResolved = true;
    }

    // --- Branch chain. Order and fall-through must match the tick. ---

    // A. Coloring composites. Note the fall-through: a `coloring.` target that
    //    is NOT one of the four composites drops to the generic path below.
    if (targetKey.startsWith('coloring.') && storeState.coloring && COLORING_COMPOSITES.has(targetKey)) {
        return { branch: 'coloring', sink: 'uniform', uniform: undefined, ddfsResolved, base, noAccumReset, curve };
    }

    // B. Julia composite → uJulia. Swallows the whole prefix.
    if ((targetKey.startsWith('julia.') || targetKey.startsWith('geometry.julia')) && storeState.geometry) {
        return { branch: 'julia', sink: 'uniform', uniform: 'uJulia', ddfsResolved, base, noAccumReset, curve };
    }

    // C. Camera. Swallows the whole `camera.` prefix, including keys no
    //    consumer reads (only unified.*/rotation.* are applied).
    if (targetKey.startsWith('camera.')) {
        const applied = targetKey.startsWith('camera.unified') || targetKey.startsWith('camera.rotation');
        return { branch: 'camera', sink: applied ? 'engine-mods' : 'none', ddfsResolved, base, noAccumReset, curve };
    }

    // D. Geometry pre/post/world rotation → rotation matrices in syncFrame.
    if (
        (targetKey.startsWith('geometry.preRot')
            || targetKey.startsWith('geometry.postRot')
            || targetKey.startsWith('geometry.worldRot'))
        && storeState.geometry
    ) {
        // Only the per-axis scalars are read by UniformManager; the composed
        // vec3 widget (`preRot`) is not a target — the picker skips composeFrom
        // composites and the axis form has no reader.
        const applied = /^geometry\.(pre|post|world)Rot[XYZ]$/.test(targetKey);
        return { branch: 'geometryRotation', sink: applied ? 'engine-mods' : 'none', ddfsResolved, base, noAccumReset, curve };
    }

    // E. Light array. Swallows the whole `lighting.light` prefix.
    if (targetKey.startsWith('lighting.light')) {
        const match = targetKey.match(/^lighting\.light(\d+)_(\w+)$/);
        const idx = match ? parseInt(match[1], 10) : -1;
        const applied = !!match && idx >= 0 && idx < MAX_LIGHTS && LIGHT_PROP_SET.has(match[2]);
        if (applied) {
            // Light "Power" curves differ by TYPE (Sphere 0..10000 log1p vs
            // 0..100 sqrt for the rest), so the type has to come off the store.
            const lights = (storeState.lighting as { lights?: Array<{ type?: string }> } | undefined)?.lights;
            const lightType = lights?.[idx]?.type;
            const v = virtualScaleFor(targetKey, lightType);
            if (v) curve = { mapping: mappingForVirtual(targetKey, lightType), min: v.min, max: v.max };
        }
        return { branch: 'lighting', sink: applied ? 'engine-mods' : 'none', ddfsResolved, base, noAccumReset, curve };
    }

    // F. Vec axis on any feature.
    //
    // The regex alone claims the target: the tick's `return` sits OUTSIDE its
    // vec-object check, so an axis-shaped key whose slice holds no vector is
    // swallowed here and never reaches the scalar fallback. Mirrored rather
    // than corrected — see the quirk note below.
    const vectorMatch = targetKey.match(/^(\w+)\.([\w]+)_(x|y|z|w)$/);
    if (vectorMatch) {
        const slice = storeState[vectorMatch[1]] as Slice;
        const vec = slice ? (slice as Record<string, unknown>)[vectorMatch[2]] : undefined;
        const isVec = !!vec && typeof vec === 'object';
        return {
            branch: 'vecAxis',
            // No vector behind the name → the branch body is skipped entirely
            // and the target is dropped. A genuine scalar param named `foo_x`
            // would land here and silently never modulate. No shipped param
            // has that shape (the coverage gate asserts it), so this is a trap
            // for a future param name, not a live bug.
            sink: isVec ? ddfsSink(vectorMatch[1], uniform) : 'none',
            uniform: isVec ? uniform : undefined,
            ddfsResolved,
            base,
            noAccumReset,
            curve,
        };
    }

    // G. Scalar fallback.
    if (uniform || ddfsResolved) {
        return {
            branch: 'scalar',
            sink: ddfsSink(targetKey.split('.')[0], uniform),
            uniform,
            ddfsResolved,
            base,
            noAccumReset,
            curve,
        };
    }

    return { branch: 'unresolved', sink: 'none', ddfsResolved: false, base, noAccumReset, curve };
}

// ── What the picker offers ──────────────────────────────────────────────────

interface ParamConfigLike {
    onUpdate?: string;
    composeFrom?: readonly string[];
    type?: string;
}

/**
 * Is a DDFS param offered as a modulation target?
 *
 * Deliberately does NOT require a `uniform`: engine-fork apps (fluid-toy)
 * consume `liveModulations` straight from the store, so a uniformless param is
 * a legitimate target there. For a uniform-backed app it is a `display-only`
 * sink, which the coverage gate reports per app rather than banning here.
 *
 * `composeFrom` composites are skipped because their component scalars are
 * offered individually — offering both would double-apply the offset.
 */
export function isModulatable(config: ParamConfigLike): boolean {
    if (config.onUpdate === 'compile') return false;
    if (config.composeFrom) return false;
    const type = config.type;
    return type === 'float' || type === 'int' || type === 'vec2' || type === 'vec3' || type === 'vec4';
}

/**
 * Features whose params are never offered as modulation targets — they are
 * tooling, capture and analysis surfaces rather than things you'd drive from a
 * signal. `audio` in particular must stay out: modulating the analyser that
 * produces the signal is a feedback loop.
 *
 * Kept here rather than in `ParameterSelector` so the coverage gate filters on
 * the same set the menu does; a target excluded from the menu can't be graded
 * as an unreachable link.
 */
export const MODULATION_EXCLUDED_FEATURES: ReadonlySet<string> = new Set([
    'audio', 'navigation', 'drawing', 'webcam', 'debugTools', 'shaderCompiler',
    'quality', 'reflections',
]);

const AXES_FOR: Record<string, readonly string[]> = {
    vec2: ['x', 'y'],
    vec3: ['x', 'y', 'z'],
    vec4: ['x', 'y', 'z', 'w'],
};

export interface EnumeratedTarget {
    target: string;
    featureId: string;
    paramKey: string;
    axis?: string;
    /** Non-DDFS targets synthesised by the picker (light array, camera). */
    virtual?: boolean;
}

/**
 * Every target the picker can offer, ignoring per-scene visibility
 * (`condition`, `dynamicVisible`, active-formula filtering). Superset by
 * design: the coverage gate wants to know that a target is routable at all,
 * not whether today's formula happens to show it.
 */
export function listModulatableTargets(): EnumeratedTarget[] {
    const out: EnumeratedTarget[] = [];

    for (const feat of featureRegistry.getAll()) {
        if (MODULATION_EXCLUDED_FEATURES.has(feat.id)) continue;
        for (const [key, config] of Object.entries(feat.params)) {
            if (!isModulatable(config as ParamConfigLike)) continue;
            const axes = AXES_FOR[(config as ParamConfigLike).type ?? ''];
            if (axes) {
                for (const axis of axes) {
                    out.push({ target: `${feat.id}.${key}_${axis}`, featureId: feat.id, paramKey: key, axis });
                }
            } else {
                out.push({ target: `${feat.id}.${key}`, featureId: feat.id, paramKey: key });
            }
        }
    }

    // Virtual expansions the picker synthesises for array-backed features.
    for (let i = 0; i < MAX_LIGHTS; i++) {
        for (const prop of LIGHT_PROPS) {
            out.push({ target: `lighting.light${i}_${prop}`, featureId: 'lighting', paramKey: `light${i}_${prop}`, virtual: true });
        }
    }
    for (const axis of ['x', 'y', 'z']) {
        out.push({ target: `camera.unified.${axis}`, featureId: 'camera', paramKey: `unified.${axis}`, virtual: true });
        out.push({ target: `camera.rotation.${axis}`, featureId: 'camera', paramKey: `rotation.${axis}`, virtual: true });
    }

    return out;
}
