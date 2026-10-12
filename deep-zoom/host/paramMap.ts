/**
 * deep-zoom/host/paramMap.ts - the one table between the shell's feature params and the renderer.
 *
 * PURPOSE
 *   One row per param of every `dz*` feature: its id (`<feature>.<key>`, the `DzParamId` the host
 *   takes), what the renderer redoes when it changes, which push sends it, and how its current
 *   value is read back out of the module. `looseParams.ts` holds the pushes; this file is data.
 *
 * SEAMS
 *   - `deep-zoom/useHostSync.ts` sends `host.setParams({ [id]: storeValue })` with the store's own
 *     values (an enum param is its option index, colour `mode` is GMT's number). Every conversion to
 *     the renderer's values happens under `host/`, through the converters the feature files export.
 *   - `host/moduleHost.ts` answers `getParams()` / `bootParams()` with `readParams(api)` merged
 *     over the module's own settings keys.
 *   - `debug/deep-zoom-checks/param-map.mts` compares this table with the registered features.
 *
 * PITFALLS
 *   - Some values travel together because the module's setter takes them together: colour
 *     (`plain`, `mode`, `scale` -> one `setColor`), light type and lamp falloff (one `setLight`),
 *     the two phase angles (one `setPhase`). A row's `group` says which push carries it.
 *   - The formula, the Julia switch, the Julia constant's three numbers, Burning with its mix and the box's seven are ONE push
 *     (`group: 'formula'`, one `setFormula`),
 *     and that push goes before every other push of the same patch: the renderer's iteration ceiling
 *     follows the formula (400 or 500), so an iteration count sent first would be cut to the old one.
 *   - `group: null` means no push of `looseParams.ts` carries the value: it is shell-only, it
 *     waits on a module change named in `why`, or (the gradient) it reaches the renderer by
 *     another member of the host, named in `why`. A row that waits must not be in a panel.
 *   - Invalidation class O rebuilds the reference orbit (heavy at depth): the sync gathers O pushes
 *     for one frame, so a moving slider is followed (`deep-zoom/useHostSync.ts`). A restarts the still. (A class C, "can block on a shader
 *     compile", had one row, `dzQuality.bla`; both went on 2026-10-11.)
 *
 * @invariant Every param of every registered `dz*` feature has exactly one row here, and every row
 *   names a real param - proven by: npx tsx debug/deep-zoom-checks/param-map.mts ("map: every
 *   feature param has a row", "map: every row names a real param"). Falsified 2026-10-08: one row
 *   deleted -> the first line red; one row's key misspelt -> both red.
 */
import type { DeepZoomApi } from '../renderer';
import type { DzParamId, DzParamValue, DzParams } from './DeepZoomHost';
import { DzFormulaFeature, FORMULA_OPTIONS } from '../features/formula';
import {
    DzQualityFeature, REACH_RENDERER_VALUES, NORMALS_RENDERER_VALUES, DEPTH_NORMAL_RADIUS_RENDERER_VALUES,
} from '../features/quality';
import { DzInspectFeature, CHANNEL_RENDERER_VALUES, COMPARE_RENDERER_VALUES } from '../features/inspect';
import { DzLightFeature, SHADING_RENDERER_VALUES, LIGHT_TYPE_RENDERER_VALUES } from '../features/light';
import { DzColourFeature, colourFromRenderer } from '../features/colour';

/** O orbit rebuild, A the still restarts, - nothing in the renderer. */
export type DzInvalidation = 'O' | 'A' | '-';

/** The pushes of `looseParams.ts`. `look` rows also name the field of `api.setLook`. */
export type DzPushGroup =
    | 'formula' | 'power' | 'phase' | 'iters' | 'autoIters'
    | 'frame' | 'detail' | 'normalDetail' | 'reach' | 'normals' | 'nrmTap' | 'land' | 'hitRefine' | 'accum'
    | 'stepRelax' | 'capRelax'
    | 'shading' | 'light' | 'look' | 'colour' | 'channel' | 'compare';

export interface DzParamRow {
    readonly feature: string;
    readonly key: string;
    readonly cls: DzInvalidation;
    readonly group: DzPushGroup | null;
    /** For `group: 'look'`: the field of the module's look record. */
    readonly look?: string;
    /** Why there is no push, when `group` is null. */
    readonly why?: string;
    /** The value as the STORE would hold it, read out of the module. Absent: no read-back. */
    readonly read?: (api: DeepZoomApi) => DzParamValue | undefined;
}

/** The features this table covers, by id. Their `params[key].default` are the pusher's start values. */
export const DZ_PARAM_FEATURES = {
    dzFormula: DzFormulaFeature,
    dzQuality: DzQualityFeature,
    dzInspect: DzInspectFeature,
    dzLight: DzLightFeature,
    dzColour: DzColourFeature,
} as const;

export const paramId = (feature: string, key: string): DzParamId => `${feature}.${key}`;

const indexIn = (values: readonly unknown[], v: unknown): number | undefined => {
    const i = values.indexOf(v);
    return i < 0 ? undefined : i;
};
const lookNumber = (api: DeepZoomApi, field: string): number | undefined => {
    const v = api.look[field];
    return typeof v === 'number' ? v : undefined;
};
const look = (key: string, field: string): DzParamRow => ({
    feature: 'dzLight', key, cls: 'A', group: 'look', look: field, read: (api) => lookNumber(api, field),
});

/** One of the values `api.setFormula` takes, read back as the store would hold it. */
const box = (key: string, read: (f: ReturnType<DeepZoomApi['formula']>) => DzParamValue | undefined): DzParamRow => ({
    feature: 'dzFormula', key, cls: 'O', group: 'formula', read: (api) => read(api.formula()),
});

export const DZ_PARAM_ROWS: readonly DzParamRow[] = [
    // ── dzFormula: every change rebuilds the reference orbit ──
    box('kind', (f) => indexIn(FORMULA_OPTIONS, f.kind)),
    box('boxScale', (f) => f.scale),
    box('boxMinRadius', (f) => f.minR),
    box('boxFold', (f) => f.fold),
    box('boxFixedRadius', (f) => f.fixedR),
    box('boxRotX', (f) => f.rot[0]),
    box('boxRotY', (f) => f.rot[1]),
    box('boxRotZ', (f) => f.rot[2]),
    // The Julia switch rides in the same call. So does its constant as numbers, but only when the three differ from
    // what the renderer holds: the exact constant travels with the view (looseParams.ts, THE CONSTANT).
    box('juliaMode', (f) => f.julia),
    box('juliaX', (f) => f.cNum[0]),
    box('juliaY', (f) => f.cNum[1]),
    box('juliaZ', (f) => f.cNum[2]),
    // Burning and its mix, the bulb's, ride in that call as well (renderer/core.js, BURNING).
    box('burning', (f) => f.burning),
    box('burningMix', (f) => f.burnMix),
    { feature: 'dzFormula', key: 'juliaConstant', cls: '-', group: null, why: 'a composed row with no state of its own: juliaX, juliaY and juliaZ carry the value' },
    { feature: 'dzFormula', key: 'boxRotation', cls: '-', group: null, why: 'a composed row with no state of its own: boxRotX, boxRotY and boxRotZ carry the value' },
    { feature: 'dzFormula', key: 'power', cls: 'O', group: 'power', read: (api) => api.dz.settings().power },
    { feature: 'dzFormula', key: 'phaseTheta', cls: 'O', group: 'phase', read: (api) => api.dz.settings().phase[0] },
    { feature: 'dzFormula', key: 'phasePhi', cls: 'O', group: 'phase', read: (api) => api.dz.settings().phase[1] },
    // No read-back: with auto iterations on the module raises its own count with depth, so its
    // live number (telemetry `iters`) is not the floor the store holds.
    { feature: 'dzFormula', key: 'iterations', cls: 'O', group: 'iters' },
    { feature: 'dzFormula', key: 'autoIterations', cls: '-', group: 'autoIters', read: (api) => api.autoIters() },

    // ── dzQuality ──
    { feature: 'dzQuality', key: 'frameSize', cls: 'A', group: 'frame', read: (api) => api.dz.settings().frame },
    { feature: 'dzQuality', key: 'detail', cls: 'A', group: 'detail', read: (api) => api.dz.settings().detail },
    { feature: 'dzQuality', key: 'normalDetail', cls: 'A', group: 'normalDetail', read: (api) => api.normalDetail() },
    { feature: 'dzQuality', key: 'reach', cls: 'A', group: 'reach', read: (api) => indexIn(REACH_RENDERER_VALUES, api.dz.settings().reach) },
    { feature: 'dzQuality', key: 'normals', cls: 'A', group: 'normals', read: (api) => indexIn(NORMALS_RENDERER_VALUES, api.dz.settings().normals) },
    { feature: 'dzQuality', key: 'depthNormalRadius', cls: 'A', group: 'nrmTap', read: (api) => indexIn(DEPTH_NORMAL_RADIUS_RENDERER_VALUES, api.look.nrmTap) },
    { feature: 'dzQuality', key: 'hitLanding', cls: 'A', group: 'land', read: (api) => api.dz.settings().land },
    { feature: 'dzQuality', key: 'hitRefine', cls: 'A', group: 'hitRefine', read: (api) => api.marchLevers().hitRefine },
    // (no `rayMarch` row since 2026-10-11: the switch went, the ray march is the bulb's only program)
    { feature: 'dzQuality', key: 'accumulate', cls: 'A', group: 'accum', read: (api) => api.dz.settings().accum },
    { feature: 'dzQuality', key: 'actualPixels', cls: 'A', group: null, why: 'the module has no setter for its 1:1 view, and the shell has no centring style for it yet' },
    // The module's raw value 0 means "the default 0.85". The Mandelbox's march reads it; the bulb's ray march does not.
    { feature: 'dzQuality', key: 'stepSize', cls: 'A', group: 'stepRelax', read: (api) => { const r = api.marchLevers().stepRelax; return r > 0 ? r : 0.85; } },
    { feature: 'dzQuality', key: 'resolutionCap', cls: 'A', group: 'capRelax', read: (api) => api.marchLevers().capRelax },

    // ── dzInspect ──
    { feature: 'dzInspect', key: 'channel', cls: 'A', group: 'channel', read: (api) => indexIn(CHANNEL_RENDERER_VALUES, api.look.view) },
    { feature: 'dzInspect', key: 'compare', cls: 'A', group: 'compare', read: (api) => indexIn(COMPARE_RENDERER_VALUES, api.look.compare) },
    { feature: 'dzInspect', key: 'overlays', cls: '-', group: null, why: 'shell-only: which overlays the shell draws' },

    // ── dzLight ──
    { feature: 'dzLight', key: 'shading', cls: 'A', group: 'shading', read: (api) => indexIn(SHADING_RENDERER_VALUES, api.dz.settings().lookMode) },
    { feature: 'dzLight', key: 'lightType', cls: 'A', group: 'light', read: (api) => indexIn(LIGHT_TYPE_RENDERER_VALUES, api.dz.settings().light) },
    { feature: 'dzLight', key: 'lampFalloff', cls: 'A', group: 'light', read: (api) => api.dz.settings().falloff },
    look('keyElevation', 'keyElev'),
    look('keyTurn', 'keyTurn'),
    look('lightTint', 'tint'),
    look('shadows', 'shadow'),
    look('occlusion', 'ao'),
    look('occlusionRadius', 'aoRadius'),
    look('occlusionSamples', 'aoTaps'),
    look('sky', 'sky'),
    look('roughness', 'rough'),
    look('haze', 'haze'),

    // ── dzColour: three values, one `setColor` ──
    { feature: 'dzColour', key: 'plain', cls: 'A', group: 'colour', read: (api) => colourFromRenderer(api.dz.settings().color).plain },
    // No read-back while Plain: the module's one number cannot say which mapping is waiting.
    { feature: 'dzColour', key: 'mode', cls: 'A', group: 'colour', read: (api) => { const c = colourFromRenderer(api.dz.settings().color); return c.plain ? undefined : c.mode; } },
    { feature: 'dzColour', key: 'scale', cls: 'A', group: 'colour', read: (api) => api.dz.settings().cscale },
    // Not a number, so not a push of looseParams.ts: it goes as 256 texels through the host's own
    // member, and a tool's render-only preview goes the same way without the store holding it.
    { feature: 'dzColour', key: 'gradient', cls: 'A', group: null, why: 'sent as texels by deep-zoom/GradientSync.tsx through host.setGradientRamp' },
];

export const DZ_PARAM_ROW_BY_ID: ReadonlyMap<DzParamId, DzParamRow> =
    new Map(DZ_PARAM_ROWS.map((row) => [paramId(row.feature, row.key), row]));

/** Every mapped param at its feature default, by id. */
export function defaultParams(): Record<DzParamId, DzParamValue> {
    const out: Record<DzParamId, DzParamValue> = {};
    for (const [feature, def] of Object.entries(DZ_PARAM_FEATURES)) {
        // The feature objects are `satisfies FeatureDefinition`; here only `default` is read.
        for (const [key, config] of Object.entries(def.params as Record<string, { default?: unknown }>)) {
            out[paramId(feature, key)] = config.default as DzParamValue;
        }
    }
    return out;
}

/** What the module holds now, as the store would hold it, for every row that can be read back. */
export function readParams(api: DeepZoomApi): DzParams {
    const out: DzParams = {};
    for (const row of DZ_PARAM_ROWS) {
        const v = row.read?.(api);
        if (v !== undefined) out[paramId(row.feature, row.key)] = v;
    }
    return out;
}
