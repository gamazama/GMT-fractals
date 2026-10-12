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
 *   - NOTHING HERE SENDS `api.setBla`, `api.setJacobian` OR `api.setRayMarch` ANY MORE (2026-10-11):
 *     the shell's BLA, True-gradient march and Ray march settings went with the previous-generation
 *     marches (the module has lost the first two setters, and the ray march is its only program
 *     for the bulb, on from the start with what this file used to send: bits 5, factor 1, floor
 *     256, line 2 - grep `let rayAsk` in renderer/core.js). A `dzQuality.bla`,
 *     `dzQuality.trueGradient` or `dzQuality.rayMarch` from an older scene has no row and is not
 *     pushed.
 *   - `stepRelax` IS PUSHED WHATEVER THE FORMULA, though its row shows for the Mandelbox only
 *     (features/quality.ts, `BOX_ONLY`): the bulb's ray march does not read it, and the box must
 *     find it in force the moment it is selected.
 *   - `setColor(mode, scale)` and `setLight(mode, falloff)` ignore a falsy second argument and
 *     `setLight` reads a missing first one as Direct: both are always called with both values.
 *   - `setNormalMode` does not restart the still; the empty `setLook({})` after it does.
 *   - An id with no row, or a row with `group: null`, is not pushed. Unknown ids are named once.
 *   - THE FORMULA GOES FIRST. One `setFormula` carries the kind, the Julia switch, Burning and its mix, the box's seven numbers and
 *     (see THE CONSTANT) sometimes the Julia constant, and
 *     it is sent before any other push of the same patch: `setIters` clamps to the ceiling of the
 *     formula IN FORCE (400 for the bulb, 500 for the box), so a box place's 450 iterations sent
 *     ahead of its formula would arrive as 400.
 *   - THE CONSTANT (2026-10-12). The Julia constant has two writings: the renderer's own, exact
 *     (three 256-bit numbers that arrive as strings with a VIEW), and the store's three doubles
 *     (`dzFormula.juliaX` / `Y` / `Z`, the Constant row). The doubles must never overwrite the
 *     strings merely by being pushed, so the formula push carries `c`:
 *       - not at all, while the three rows equal the renderer's constant read back as doubles
 *         (`api.formula().cNum`). A deep constant that came with a view stays as it came;
 *       - as the exact STRINGS, when the rows equal the doubles of a constant that came with a
 *         view before (the last `EXACT_CONSTANTS_KEPT`, noted by `constantArrived()`, which
 *         `host/moduleHost.ts` calls from `setView`). That is an undo of a drag: the rows go back
 *         onto the old doubles, and the old 77 digits come back with them;
 *       - as the three numbers otherwise: a row was dragged, typed or keyframed.
 *     Two exact constants with the same three doubles: the later one is the one remembered.
 *
 * @invariant A value reaches the module through the setter its row names, converted with the
 *   feature's own converter, and an unchanged value is not sent again - proven by:
 *   npx tsx debug/deep-zoom-checks/param-map.mts (the "push: ..." lines). Falsification record in
 *   that check's header.
 * @invariant Rows that equal the renderer's constant send no constant, and rows put back onto the
 *   doubles of a constant that came with a view send that constant's strings - proven by: npm run
 *   check:deep-zoom-param-map ("constant: rows that equal what the renderer holds send no
 *   constant ...", "constant: rows put back onto a constant that came with a view send its exact
 *   strings ..."). Falsification record in that check's header (2026-10-12, the Constant row).
 * @invariant Burning and its mix reach the module in the formula's own call, as `burning` and `burnMix` - proven
 *   by: npm run check:deep-zoom-param-map ("push: Burning and its mix go as setFormula(kind, { ..., burning:
 *   true, burnMix: 0.5 }), one call and nothing else"). Falsified 2026-10-12: the `burning` line of the push
 *   left out -> 7 red (the record is in that check's header).
 * @assumption Only the last `EXACT_CONSTANTS_KEPT` are remembered, the oldest forgotten first: the
 *   check has a line for it ("constant: the ninth ..."), not broken on purpose.
 */
import type { DeepZoomApi } from '../renderer';
import type { DzParamId, DzParamValue, DzParams } from './DeepZoomHost';
import { DZ_PARAM_ROW_BY_ID, defaultParams, paramId } from './paramMap';
import type { DzPushGroup } from './paramMap';
import { reachToRenderer, normalsToRenderer, depthNormalRadiusToRenderer } from '../features/quality';
import { channelToRenderer, compareToRenderer } from '../features/inspect';
import { shadingToRenderer, lightTypeToRenderer } from '../features/light';
import { colourToRenderer } from '../features/colour';
import { formulaToRenderer, validBoxScale } from '../features/formula';

export interface ParamPusher {
    /** Store values by id. Unchanged values are dropped; each changed group is pushed once. */
    push(patch: DzParams): void;
    /** The values last pushed, by id (the defaults for anything never pushed). */
    values(): DzParams;
    /** A view has just brought the renderer a Julia constant: remember it, exact (see THE CONSTANT). */
    constantArrived(): void;
    dispose(): void;
}

/** How many constants that came with a view are remembered exact (see THE CONSTANT). */
export const EXACT_CONSTANTS_KEPT = 8;

type Triple<T> = [T, T, T];
const sameNumbers = (a: readonly number[], b: readonly number[]): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export function createParamPusher(api: DeepZoomApi): ParamPusher {
    const v = defaultParams();
    const pushed = new Set<DzParamId>();
    const unknownSaid = new Set<DzParamId>();
    /** Constants that came with a view, the newest last: their strings, and the doubles they read as. */
    const exact: Array<{ c: Triple<string>; num: Triple<number> }> = [];
    let disposed = false;

    const num = (feature: string, key: string): number => v[paramId(feature, key)] as number;
    const flag = (feature: string, key: string): boolean => !!v[paramId(feature, key)];

    /** The `c` of a formula push: none, a remembered constant's strings, or the rows' numbers (see THE CONSTANT). */
    const constant = (): { c?: Triple<string> | Triple<number> } => {
        const rows: Triple<number> = [num('dzFormula', 'juliaX'), num('dzFormula', 'juliaY'), num('dzFormula', 'juliaZ')];
        if (sameNumbers(rows, api.formula().cNum)) return {};
        const known = exact.find((e) => sameNumbers(e.num, rows));
        return { c: known ? known.c : rows };
    };

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
            julia: flag('dzFormula', 'juliaMode'),
            burning: flag('dzFormula', 'burning'),
            burnMix: num('dzFormula', 'burningMix'),
            ...constant(),                             // only when the rows say another constant than the renderer holds
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
        accum: () => api.setAccum(flag('dzQuality', 'accumulate')),
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
        constantArrived() {
            if (disposed) return;
            const held = api.formula();
            const at = exact.findIndex((e) => sameNumbers(e.num, held.cNum));
            if (at >= 0) exact.splice(at, 1);
            exact.push({ c: held.c, num: held.cNum });
            if (exact.length > EXACT_CONSTANTS_KEPT) exact.shift();
        },
        dispose() {
            disposed = true;
        },
    };
}
