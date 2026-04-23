/**
 * @engine — defineEnumParam: DDFS helper for numeric-index enums.
 *
 * The string-array + index-map shape has shown up four-plus times
 * (FORCE_MODES, KIND_MODES, BRUSH_MODES, plus pending COLOR_MAPPING,
 * TONE_MAPPING, DYE_BLEND, DYE_DECAY). The pattern:
 *
 *   const FOO_MODES = ['a', 'b', 'c'] as const;
 *   type FooMode = typeof FOO_MODES[number];
 *   // feature:
 *   params: { foo: { type: 'float', default: 0, label: '…',
 *                    options: [{ label: 'A', value: 0 }, …] } }
 *   // app-side map:
 *   const fooStr = FOO_MODES[Math.floor(feature.foo ?? 0)] ?? FOO_MODES[0];
 *   engine.setParams({ foo: fooStr });
 *
 * Every use rewrote those same three moving parts. This helper lets
 * a feature declare the enum once and get back (a) the DDFS param
 * config, (b) the index→string resolver, and (c) the canonical values
 * tuple for any other consumer. It's deliberately generic — no
 * fluid-toy knowledge, no GMT knowledge, nothing but the DDFS
 * enum-with-string-backing shape. Apps that need different UX (custom
 * labels per option, hotkey hints, etc.) widen through `optionLabels`
 * or compose their own config.
 */

import type { ParamConfig } from './FeatureSystem';

export interface EnumParam<Values extends readonly string[]> {
    /** DDFS param config — pass directly into a feature's `params`. */
    config: ParamConfig;
    /** Resolve a numeric index (from the DDFS slice) to its string value.
     *  Clamps + falls back to the default for undefined / out-of-range. */
    fromIndex: (idx: number | undefined) => Values[number];
    /** The original values tuple, for consumers that want the typed string set. */
    values: Values;
}

export interface DefineEnumParamOptions<Values extends readonly string[]> {
    /** Index of the default value in `values`. Defaults to 0. */
    defaultIndex?: number;
    /** Override the dropdown label for a specific value. Defaults to
     *  capitalize(value) — e.g. 'paint' → 'Paint'. */
    optionLabels?: Partial<Record<Values[number], string>>;
    /** Any extra DDFS config fields to merge onto the generated param
     *  (e.g. `description`, `shortId`, `uniform`). */
    extra?: Partial<ParamConfig>;
}

const toTitle = (s: string): string =>
    s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');

/**
 * Define a DDFS enum param backed by a const tuple of string values.
 *
 * ```ts
 * const forceModes = defineEnumParam(
 *     ['gradient', 'curl', 'iterate', 'c-track', 'hue'] as const,
 *     'Force Mode',
 * );
 *
 * // In the feature:
 * params: {
 *     forceMode: forceModes.config,
 *     ...
 * }
 *
 * // In the app wiring:
 * engine.setParams({
 *     forceMode: forceModes.fromIndex(fluidSim.forceMode),
 * });
 * ```
 */
export const defineEnumParam = <Values extends readonly string[]>(
    values: Values,
    label: string,
    options: DefineEnumParamOptions<Values> = {},
): EnumParam<Values> => {
    const defaultIndex = options.defaultIndex ?? 0;
    const configOptions = values.map((v, i) => ({
        label: options.optionLabels?.[v as Values[number]] ?? toTitle(v),
        value: i,
    }));
    const config: ParamConfig = {
        type: 'float',
        default: defaultIndex,
        label,
        options: configOptions,
        ...options.extra,
    };
    const fromIndex = (idx: number | undefined): Values[number] => {
        const rounded = Math.floor(idx ?? defaultIndex);
        if (rounded < 0 || rounded >= values.length || Number.isNaN(rounded)) {
            return values[defaultIndex];
        }
        return values[rounded];
    };
    return { config, fromIndex, values };
};
