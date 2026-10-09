/**
 * deep-zoom/host/looseParams.ts - param ids in, the module's own setters out.
 *
 * PURPOSE
 *   The module has no "set this parameter by id" (that is module package M1). Until it does, this
 *   file is the list of which `api.*` setter carries which param, with the conversions from the
 *   store's values (option index, GMT mode number) to the renderer's. `paramMap.ts` says which
 *   push a param belongs to; the pushes are here.
 *
 * SEAMS
 *   - `createParamPusher(api)` is made once per host by `host/moduleHost.ts`. `push(patch)` takes
 *     store values by id; a value equal to the last one pushed is dropped, so the caller may send
 *     whole slices.
 *   - It starts from the feature defaults (`defaultParams()`), which are the module's own
 *     defaults, so a joint push (colour, light, phase) always has all its values.
 *
 * PITFALLS
 *   - NEVER send `api.setBla(true)` without the wait: it compiles the heavier shader on the main
 *     thread (renderer/index.ts header, BLOCKING COMPILES). "On" sends 'auto', waits until
 *     `api.compileMs().PB` is defined, then sends `true` - if the choice is still On by then. In
 *     a view where auto never builds that variant the wait does not end and the module stays on
 *     auto; the wait is a 250 ms timer and `dispose()` stops it.
 *   - `setColor(mode, scale)` and `setLight(mode, falloff)` ignore a falsy second argument and
 *     `setLight` reads a missing first one as Direct: both are always called with both values.
 *   - `setNormalMode` does not restart the still; the empty `setLook({})` after it does.
 *   - An id with no row, or a row with `group: null`, is not pushed. Unknown ids are named once.
 *   - THE FORMULA GOES FIRST. One `setFormula` carries the kind and the box's seven numbers, and
 *     it is sent before any other push of the same patch: `setIters` clamps to the ceiling of the
 *     formula IN FORCE (160 for the bulb, 500 for the box), so a box place's 300 iterations sent
 *     ahead of its formula would arrive as 160.
 *
 * @invariant A value reaches the module through the setter its row names, converted with the
 *   feature's own converter, and an unchanged value is not sent again - proven by:
 *   npx tsx debug/deep-zoom-checks/param-map.mts (the "push: ..." lines). Falsification record in
 *   that check's header.
 */
import type { DeepZoomApi } from '../renderer';
import type { DzParamId, DzParamValue, DzParams } from './DeepZoomHost';
import { DZ_PARAM_ROW_BY_ID, defaultParams, paramId } from './paramMap';
import type { DzPushGroup } from './paramMap';
import {
    reachToRenderer, normalsToRenderer, depthNormalRadiusToRenderer, blaToRenderer,
} from '../features/quality';
import { channelToRenderer, compareToRenderer } from '../features/inspect';
import { shadingToRenderer, lightTypeToRenderer } from '../features/light';
import { colourToRenderer } from '../features/colour';
import { formulaToRenderer, validBoxScale } from '../features/formula';

export interface ParamPusher {
    /** Store values by id. Unchanged values are dropped; each changed group is pushed once. */
    push(patch: DzParams): void;
    /** The values last pushed, by id (the defaults for anything never pushed). */
    values(): DzParams;
    dispose(): void;
}

/** How often the BLA "On" wait looks for the compiled variant. */
export const DZ_BLA_WAIT_MS = 250;

const BLA_ID = paramId('dzQuality', 'bla');

export function createParamPusher(api: DeepZoomApi): ParamPusher {
    const v = defaultParams();
    const pushed = new Set<DzParamId>();
    const unknownSaid = new Set<DzParamId>();
    let blaTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const num = (feature: string, key: string): number => v[paramId(feature, key)] as number;
    const flag = (feature: string, key: string): boolean => !!v[paramId(feature, key)];

    function stopBlaWait(): void {
        if (blaTimer !== null) { clearInterval(blaTimer); blaTimer = null; }
    }

    function pushBla(): void {
        stopBlaWait();
        const want = blaToRenderer(num('dzQuality', 'bla'));
        if (want !== true) { api.setBla(want); return; }
        api.setBla('auto');
        blaTimer = setInterval(() => {
            if (api.compileMs().PB === undefined) return;
            stopBlaWait();
            if (blaToRenderer(v[BLA_ID] as number) === true) api.setBla(true);
        }, DZ_BLA_WAIT_MS);
    }

    /** One push per group; `look` is called per field. */
    const PUSH: Record<Exclude<DzPushGroup, 'look'>, () => void> = {
        // The store keeps the scale out of the band the renderer cannot draw (deep-zoom/boxScale.ts); `validBoxScale`
        // here is for a value that did not come through the store (a host caller, a check).
        formula: () => api.setFormula(formulaToRenderer(num('dzFormula', 'kind')), {
            scale: validBoxScale(num('dzFormula', 'boxScale')),
            minR: num('dzFormula', 'boxMinRadius'),
            fold: num('dzFormula', 'boxFold'),
            fixedR: num('dzFormula', 'boxFixedRadius'),
            rot: [num('dzFormula', 'boxRotX'), num('dzFormula', 'boxRotY'), num('dzFormula', 'boxRotZ')],
        }),
        power: () => api.setPower(num('dzFormula', 'power')),
        phase: () => api.setPhase(num('dzFormula', 'phaseTheta'), num('dzFormula', 'phasePhi')),
        iters: () => api.setIters(num('dzFormula', 'iterations')),
        autoIters: () => api.setAutoIters(flag('dzFormula', 'autoIterations')),
        frame: () => api.setFrame(num('dzQuality', 'frameSize')),
        detail: () => api.setSurf(num('dzQuality', 'detail')),
        normalDetail: () => api.setNormalDetail(num('dzQuality', 'normalDetail')),
        reach: () => api.setReach(reachToRenderer(num('dzQuality', 'reach'))),
        normals: () => { api.setNormalMode(normalsToRenderer(num('dzQuality', 'normals'))); api.setLook({}); },
        nrmTap: () => api.setLook({ nrmTap: depthNormalRadiusToRenderer(num('dzQuality', 'depthNormalRadius')) }),
        land: () => api.setLand(flag('dzQuality', 'hitLanding')),
        hitRefine: () => api.setHitRefine(num('dzQuality', 'hitRefine')),
        jacobian: () => api.setJacobian(flag('dzQuality', 'trueGradient') ? 1 : 0),   // 1 = step by the smaller estimate; the gradient NORMAL is Normals: Gradient (setNormalMode 4)
        // bits 5 = step by the ray estimate + orbits resumed along the ray; the longer step of THE LINE AGAINST THE
        // BALL is taken (allowance twice the bend measure); the hit test stays the page's, with a creep floor of
        // 1/256 of a display pixel (grep both names in renderer/core.js)
        rayMarch: () => api.setRayMarch(flag('dzQuality', 'rayMarch') ? 5 : 0, { factor: 1, floor: 256, line: 2 }),
        accum: () => api.setAccum(flag('dzQuality', 'accumulate')),
        bla: pushBla,
        stepRelax: () => api.setStepRelax(num('dzQuality', 'stepSize')),
        capRelax: () => api.setCapRelax(num('dzQuality', 'resolutionCap')),
        shading: () => api.setLook({ mode: shadingToRenderer(num('dzLight', 'shading')) }),
        light: () => api.setLight(lightTypeToRenderer(num('dzLight', 'lightType')), num('dzLight', 'lampFalloff')),
        colour: () => api.setColor(colourToRenderer(flag('dzColour', 'plain'), num('dzColour', 'mode')), num('dzColour', 'scale')),
        channel: () => api.setLook({ view: channelToRenderer(num('dzInspect', 'channel')) }),
        compare: () => api.setLook({ compare: compareToRenderer(num('dzInspect', 'compare')) }),
    };

    return {
        push(patch) {
            if (disposed) return;
            const groups = new Set<Exclude<DzPushGroup, 'look'>>();
            const lookFields: Record<string, unknown> = {};
            let anyLook = false;
            for (const [id, value] of Object.entries(patch)) {
                if (value === undefined) continue;
                const row = DZ_PARAM_ROW_BY_ID.get(id);
                if (!row) {
                    if (!unknownSaid.has(id)) { unknownSaid.add(id); console.warn(`[deep-zoom] no param map row for "${id}" (deep-zoom/host/paramMap.ts)`); }
                    continue;
                }
                if (pushed.has(id) && Object.is(v[id], value)) continue;
                v[id] = value as DzParamValue;
                pushed.add(id);
                if (row.group === null) continue;
                if (row.group === 'look') { lookFields[row.look as string] = value; anyLook = true; }
                else groups.add(row.group);
            }
            if (groups.delete('formula')) PUSH.formula();          // first: see THE FORMULA GOES FIRST
            for (const group of groups) PUSH[group]();
            if (anyLook) api.setLook(lookFields);
        },
        values: () => ({ ...v }),
        dispose() {
            disposed = true;
            stopBlaWait();
        },
    };
}
