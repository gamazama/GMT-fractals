/**
 * Canonical param → display-curve resolution.
 *
 * ONE source for "what curve does this param's slider use". Three consumers,
 * and the third is why this module exists rather than each widget keeping its
 * own closure:
 *
 *   - `AutoFeaturePanel` — DDFS-driven sliders
 *   - hand-built widgets — FormulaParamsWidget, LightPanelControls, LightControls
 *   - the MODULATION compose path — composes offsets in display space so a fixed
 *     Gain moves a param by a fixed fraction of its slider travel
 *
 * Before this, curves lived in per-widget module constants. Lighting defined
 * POWER / POWER_SPHERE / RANGE identically in TWO files, and `coreMath.iterations`
 * had a pow-3 curve that existed only inside FormulaParamsWidget — invisible to
 * everything else, modulation included. A curve the modulation path cannot see is
 * a param that modulates with the wrong feel.
 *
 * @invariant A param's curve must be resolvable from DDFS config (`scale`) or
 *   from `VIRTUAL_TARGET_SCALES` for non-DDFS targets. Do NOT reintroduce a
 *   widget-local `createXMapping(...)` constant — `debug/test-param-mapping.mts`
 *   fails on new ones, and modulation would silently skip that param.
 * @see docs/adr/0108-modulation-in-slider-space.md
 */

import type { ParamConfig, ScaleType } from '../../FeatureSystem';
import {
    createLogMapping,
    createLog1pMapping,
    createPowMapping,
    piUnitMapping,
    type ValueMapping,
} from '../../../components/inputs/primitives/FormatUtils';

/**
 * Curves that are genuinely NON-LINEAR, i.e. the ones modulation has to
 * compensate for. `pi` is a unit relabel (v / π) and `linear` is the identity —
 * composing an offset in their display space is the same as composing it in
 * value space, so they are deliberately excluded and take the cheap path.
 */
const CURVED_SCALES: ReadonlySet<ScaleType> = new Set<ScaleType>([
    'log', 'log1p', 'square', 'cube', 'root',
]);

export const isCurvedScale = (scale?: ScaleType): boolean =>
    !!scale && CURVED_SCALES.has(scale);

/**
 * Build the ValueMapping for a scale + range. Returns `undefined` for linear
 * (the widgets' "no mapping" case).
 *
 * `log1p` ignores `min` by construction — it spans `[0, max]` and reaches an
 * exact 0 with no reserved band, which is the whole reason it exists.
 */
export function mappingForScale(
    scale: ScaleType | undefined,
    min: number,
    max: number,
    opts?: { reserveZero?: boolean },
): ValueMapping | undefined {
    switch (scale) {
        case 'pi':     return piUnitMapping;
        case 'log':    return createLogMapping(min, max, opts);
        case 'log1p':  return createLog1pMapping(max);
        case 'square': return createPowMapping(min, max, 2);
        case 'cube':   return createPowMapping(min, max, 3);
        case 'root':   return createPowMapping(min, max, 0.5);
        default:       return undefined;
    }
}

/** Resolve the curve for a DDFS param from its config. */
export function mappingForParam(config: ParamConfig): ValueMapping | undefined {
    return mappingForScale(config.scale, config.min ?? 0, config.max ?? 1);
}

// ── Non-DDFS ("virtual") targets ────────────────────────────────────────────

export interface VirtualScale {
    scale: ScaleType;
    min: number;
    max: number;
    reserveZero?: boolean;
}

/**
 * Curves for modulation targets that are NOT DDFS params and so have no
 * `ParamConfig` to carry a `scale`. The light array is the whole population:
 * `lighting.light<i>_<prop>` addresses an element of `lighting.lights[]`.
 *
 * Keyed by the LIGHT_PROPS name. `intensity` is resolved dynamically (it
 * depends on the light's type) — see `virtualScaleFor`.
 */
const LIGHT_SCALES: Record<string, VirtualScale> = {
    // "Range"/falloff 0..100, reaches 0.
    falloff: { scale: 'log1p', min: 0, max: 100 },
    // Position + rotation tracks are linear; listed as linear rather than
    // omitted so a reader can see they were considered, not forgotten.
    posX: { scale: 'linear', min: -10, max: 10 },
    posY: { scale: 'linear', min: -10, max: 10 },
    posZ: { scale: 'linear', min: -10, max: 10 },
    rotX: { scale: 'linear', min: -Math.PI, max: Math.PI },
    rotY: { scale: 'linear', min: -Math.PI, max: Math.PI },
    rotZ: { scale: 'linear', min: -Math.PI, max: Math.PI },
};

/** Sphere lights' "Power" runs 0..10000; every other type 0..100 with a sqrt feel. */
const INTENSITY_SPHERE: VirtualScale = { scale: 'log1p', min: 0, max: 10000 };
const INTENSITY_OTHER: VirtualScale = { scale: 'square', min: 0, max: 100 };

/** Light "Radius" — floors at 0.0001, no hard 0. */
export const LIGHT_RADIUS_SCALE: VirtualScale =
    { scale: 'log', min: 0.0001, max: 5, reserveZero: false };

/**
 * Curve for a virtual (non-DDFS) modulation target, or `undefined` when the
 * target isn't one.
 *
 * @param lightType the `type` of the addressed light, when known. Intensity's
 *   curve differs by type, and reading it from the store snapshot is what lets
 *   a Sphere light's 0..10000 track compensate differently from a Point's
 *   0..100 — the same asymmetry the two light widgets already encode.
 */
export function virtualScaleFor(target: string, lightType?: string): VirtualScale | undefined {
    const m = target.match(/^lighting\.light(\d+)_(\w+)$/);
    if (!m) return undefined;
    const prop = m[2];
    if (prop === 'intensity') {
        return lightType === 'Sphere' ? INTENSITY_SPHERE : INTENSITY_OTHER;
    }
    return LIGHT_SCALES[prop];
}

/** Build the mapping for a virtual target in one call. */
export function mappingForVirtual(target: string, lightType?: string): ValueMapping | undefined {
    const v = virtualScaleFor(target, lightType);
    if (!v) return undefined;
    return mappingForScale(v.scale, v.min, v.max, { reserveZero: v.reserveZero });
}
