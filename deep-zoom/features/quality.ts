/**
 * deep-zoom/features/quality.ts — the DDFS feature `dzQuality` (dock tab Quality).
 *
 * PURPOSE
 *   How the picture is rendered, as opposed to what is drawn or how it is lit: the frame size, how
 *   close and how far rays go, how normals are found, the march, the still's accumulation, and one advanced
 *   lever (the depth caps on the frame size). Twelve params.
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate` — the engine does not draw this picture;
 *   the shell's host sync (BUILD-PLAN package S2-3, `deep-zoom/host/paramMap.ts`) pushes a changed
 *   value through these handles of `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     frameSize          api.setFrame(px)            floor 2, truncates
 *     detail             api.setSurf(mul)            clamps to 0.25..256
 *     normalDetail       api.setNormalDetail(d)      0 = as Detail
 *     reach              api.setReach(k)             k = reachToRenderer(index): 0, 1, 2
 *     normals            api.setNormalMode(m)        m = normalsToRenderer(index): 0..3. See pitfalls
 *     depthNormalRadius  api.setLook({ nrmTap })     depthNormalRadiusToRenderer(index): 1, 2, 3
 *     hitLanding         api.setLand(on)
 *     hitRefine          api.setHitRefine(n)
 *     accumulate         api.setAccum(on)
 *     actualPixels       no handle (`view1to1` is closure state in core.js) until module package M1
 *     stepSize           api.setStepRelax(r)         the march of the Mandelbox and KaliBox only (see pitfalls)
 *     resolutionCap      api.setCapRelax(m)          floor 1
 *   ENUMS. An enum param is a float holding the option's INDEX (`engine/defineEnumParam.ts`). The
 *   renderer wants its own value, which is not always the index, so each enum exports, beside its
 *   param: `X_OPTIONS` (option names, dropdown order), `X_RENDERER_VALUES` (the renderer's value
 *   for each option, same order — use `indexOf` on it to go from a renderer value back to an index)
 *   and `xToRenderer(index)` (index -> renderer value; floors, and an out-of-range or missing index
 *   gives the DEFAULT option, as `fromIndex` does). The param map imports these; it does not
 *   re-derive them.
 *   This file only declares. The integrator registers the feature (`registerFeatures.ts`), derives
 *   the slice type (`storeTypes.ts`: `SliceFromParams<typeof DzQualityFeature['params']>`) and
 *   places the rows (`panels.ts`).
 *
 * INVALIDATION
 *   Class A (the still restarts; cheap) for every param.
 *
 * PITFALLS
 *   - THREE THINGS WENT ON 2026-10-11, with the previous-generation marches (the owner: "Normals:
 *     Gradient - was superseded by the raymarch too"): the params `trueGradient` (True-gradient
 *     march) and `bla` (BLA: Off / Auto / On), and the fifth Normals option, Gradient (index 4).
 *     A scene, a scene PNG or a share link saved before that day may still carry them. The two
 *     keys are ignored (the loader reads declared params only, and the sync sends none else);
 *     Normals 4 loads as 4-tap, which is what it had been drawing since the ray march became the
 *     default: `normalsIndex` below, called on load by `deep-zoom/presetFields.ts`, and
 *     `normalsToRenderer` gives 4-tap for any index that names no option.
 *   - AND THE RAY MARCH SWITCH, THE SAME DAY (`rayMarch`, a boolean, on by default since
 *     2026-10-09). The ray march is the bulb's only program now: the renderer has no other march to
 *     switch to (the owner: "If the ray shader fails to build on a machine ... I wouldnt want an
 *     alternative based on that, rather an error"), and its skip table went with the page's
 *     program. A saved `rayMarch: false` is ignored like the keys above - the bulb is drawn by
 *     the ray march whatever a file says.
 *   - `stepSize` IS THE MANDELBOX'S ROW, AND KALIBOX'S (the same march, 2026-10-12). The ray march steps
 *     by its own estimate and has no step setting, so for the bulb the row would move nothing: it is
 *     shown only while the formula is not the bulb (`BOX_ONLY`, as bulb-only rows are hidden for the
 *     box). The value is kept and
 *     PUSHED whatever the formula, so the box marches by it the moment it is selected; a bulb
 *     scene's saved step size loads, shows nowhere and changes nothing.
 *   - `actualPixels` IS DECLARED BUT ITS ROW WAITS FOR M1. The id exists now so the slice key and
 *     saved scenes do not change when the handle lands. Until then the manifest keeps the row out
 *     (`excludeParams: ['actualPixels']` on the `dzQuality` item in `panels.ts`) — a row the
 *     renderer cannot honour is not shown. It is deliberately not `hidden: true` here: that would
 *     need a second edit of this file when M1 lands.
 *   - `normals`: `api.setNormalMode` does NOT restart the still (every other setter does). Follow
 *     it with an empty `api.setLook({})`, or the old still stays on screen.
 *   - `stepSize`: THE RENDERER'S OWN INITIAL VALUE IS 0, meaning "use 0.85" (grep `let stepRelax`,
 *     and `uStepRelax > 0.0 ? uStepRelax : 0.85` in the shader). The default here is 0.85, the
 *     same picture, because 0 is below the row's range. Anything that compares this default with
 *     the renderer must read the renderer the way its own panel row does:
 *     `stepRelax > 0 ? stepRelax : 0.85`.
 *   - `frameSize` is a REQUEST. The size drawn is `min(frameSize, cap)` in deep mode and the
 *     view's own size in f32 (grep `const longE =`); the cap is the view, then 1440 / 1080 / 720 px
 *     times `resolutionCap` below a depth of 1e-4 / 1e-12 / 1e-30. The drawn size is in
 *     `api.dz.telemetry().frameW / frameH` and is shown by a readout, never written back.
 *   - `resolutionCap` above 1 lets a deep frame run past the ~2 s GPU watchdog (grep `TDR guard`
 *     in core.js: a device reset, a frozen desktop). That is why it is `isAdvanced`.
 *   - NO PRECISION CONTROL (removed 2026-10-08, the owner: "can we do away with the f32 version").
 *     The shell starts the renderer with `mode: 'deep'` (host/moduleHost.ts, `shellOptions`): the
 *     deep path draws at every depth, and the f32 baseline shows only until the deep shader has
 *     compiled. A scene saved before that day may carry `dzQuality.precision`; it is ignored.
 *   - `detail` has a second writer: `api.dz.setView(view)` writes it from `view.surf`. A jump does
 *     not change the detail: the shell hands the renderer a view that carries the store's own
 *     value (`viewForHost` in deep-zoom/locations.ts), so the store stays the one owner.
 *   - `depthNormalRadius` is shown only while `normals` is Depth; its value is kept, and pushed,
 *     whatever `normals` is.
 *   - `reach` read back through `api.dz.settings().reach` is 1 for any custom `api.setMarch`
 *     combination (grep `const reachMode`): not a reliable echo once a developer lever was used.
 *   - WHY EVERY ENUM RESTATES `type: 'float'`. `defineEnumParam(...).config` is typed as the wide
 *     `ParamConfig`, whose `type` is the whole `ParamType` union, and `SliceFromParams` maps that
 *     to `any`. Restating the literal (the value `defineEnumParam` already produces, per its own
 *     `@assumption`) is what makes the slice key a `number`. The guard at the foot of the file goes
 *     red, naming the key, if one is left out.
 *   - No key may start with `is` (saved scenes and share links drop such keys), and no id may
 *     contain `rot`, `phase` or `twist` unless it is an angle (the timeline wraps those at 2 pi).
 *
 * @invariant No key of the `dzQuality` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` or `boolean` for all twelve keys — proven by: npm run typecheck ("Type
 *   '"reach"' does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the foot of
 *   this file). Falsified 2026-10-08: with `type: 'float'` removed from the `reach` entry, tsc
 *   reported exactly that line and key.
 * @assumption Every default, range and step here equals the renderer's own (read 2026-10-08 in
 *   core.js: `let frameLong`, `let surfMul`, `const march = {` against `const REACH`,
 *   `let normalMode`, `nrmTap: 1` in `const look = {`, `let landMode`, `let accumEnabled`,
 *   `let view1to1`, `let modeOverride`, `let stepRelax`, `let capRelax`, and the
 *   matching `CTLS` rows). No guard checks it yet; the stage-2 smoke step "every feature default
 *   equals the module's settings read at ready" is the intended proof. `api.dz.settings()` returns
 *   six of the twelve (frame, detail, reach, normals, land, accum); `api.look.nrmTap`,
 *   `api.normalDetail()` and `api.marchLevers()` (hit refine, step, cap) give five
 *   more (the rows of `deep-zoom/host/paramMap.ts`); actualPixels has no read-back at all until
 *   module package M1.
 * @invariant A Normals index that names no option (4, the retired Gradient) reaches the renderer
 *   as 4-tap — proven by: npm run check:deep-zoom-param-map ("push: Normals index 4 (Gradient, an
 *   option until 2026-10-11) reaches the renderer as 4-tap (2) ...", "retired: Normals has four
 *   options, and an index that names none ..."). Falsified 2026-10-11: `normalsToRenderer` made
 *   to hand the index through (`Math.floor(index ?? 2)`) -> those two lines red, the first with
 *   `setNormalMode(4)`.
 * @assumption A loaded scene that holds Normals 4 has it put back on 4-tap IN THE STORE (the row
 *   then shows 4-tap), and its `trueGradient` and `bla` keys never reach the store. Seen once in
 *   the app on 2026-10-11, with a scene file saved by the tree before the removal
 *   (debug/scratch/r7/old-scene.mts --load, git-ignored); no standing guard loads such a scene.
 * @assumption A loaded scene that holds `rayMarch: false` and a bulb's own `stepSize` draws the bulb
 *   by the ray march all the same: `rayMarch` never reaches the store, the step size does (it is
 *   the Mandelbox's param) and moves no pixel of the bulb, and neither row is on the tab. Seen once
 *   in the app on 2026-10-11 (debug/scratch/r7/old-scene-r7b.mts, git-ignored: that same scene file
 *   with the two values set by hand; the picture at the saved 0.35 and at 0.85 differ in 0.00 % of
 *   the pixels). The standing part of it: npm run smoke:deep-zoom, stage 2 ("Step size is NOT shown
 *   for the Mandelbulb", "and moves no ray of the bulb ...") - which loads no scene.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';
import { defineEnumParam } from '../../engine/defineEnumParam';
import { FORMULA_BULB } from './formula';

/* THE MANDELBOX DOES NOT USE THE RAY MARCH (2026-10-09; grep THE FORMULA SEAM in renderer/core.js): that is
   built on the bulb's power map. The box is drawn by a program of its own that steps by the page's rule, a
   multiple of the distance estimate - so Step size is the box's row, and the bulb, whose ray march has no step
   setting, is not offered a slider that does nothing. (Until 2026-10-11 the condition here was the other way
   round: `BULB_ONLY`, on the Ray march switch, which went that day.) The value is not touched by the formula.
   KaliBox (2026-10-12) is drawn by that program and that march too: the row shows for every formula but the bulb.
   `$dzFormula.kind` reads the other feature's slice (utils/paramConditions.ts). */
const BOX_ONLY = { param: '$dzFormula.kind', neq: FORMULA_BULB };

// ── Reach — how far a ray travels. core.js: `const REACH`, default `const march = {` = REACH[1].
export const REACH_OPTIONS = ['short', 'relaxed', 'full'] as const;
/** `api.setReach(k)`, in option order. */
export const REACH_RENDERER_VALUES = [0, 1, 2] as const;
const reachParam = defineEnumParam(REACH_OPTIONS, 'Reach', { defaultIndex: 1 });
export const reachToRenderer = (index: number | undefined) =>
    REACH_RENDERER_VALUES[REACH_OPTIONS.indexOf(reachParam.fromIndex(index))];

// ── Normals — core.js: `let normalMode = 2`. Until 2026-10-11 there was a fifth option, Gradient (index 4,
// renderer mode 4): see the header's pitfall. An index that names no option is the default, 4-tap.
export const NORMALS_OPTIONS = ['screen', '3-tap', '4-tap', 'depth'] as const;
/** `api.setNormalMode(m)`, in option order. */
export const NORMALS_RENDERER_VALUES = [0, 1, 2, 3] as const;
const normalsParam = defineEnumParam(NORMALS_OPTIONS, 'Normals', {
    defaultIndex: 2,
    optionLabels: { '3-tap': '3-tap', '4-tap': '4-tap' },
});
/** A stored Normals value as the index of an option: itself (floored), or 4-tap's for one that names none. */
export const normalsIndex = (index: number | undefined): number => NORMALS_OPTIONS.indexOf(normalsParam.fromIndex(index));
export const normalsToRenderer = (index: number | undefined) => NORMALS_RENDERER_VALUES[normalsIndex(index)];
/** The slice index of Normals = Depth, for the condition on `depthNormalRadius`. */
const NORMALS_DEPTH_INDEX = NORMALS_OPTIONS.indexOf('depth');

// ── Depth normal radius — core.js: `nrmTap: 1` in `const look = {`; the renderer takes 1, 2 or 3.
export const DEPTH_NORMAL_RADIUS_OPTIONS = ['1', '2', '3'] as const;
/** `api.setLook({ nrmTap })`, in option order. Pixels, NOT the slice index. */
export const DEPTH_NORMAL_RADIUS_RENDERER_VALUES = [1, 2, 3] as const;
const depthNormalRadiusParam = defineEnumParam(DEPTH_NORMAL_RADIUS_OPTIONS, 'Depth normal radius', {
    defaultIndex: 0,
    optionLabels: { '1': '1 px', '2': '2 px', '3': '3 px' },
});
export const depthNormalRadiusToRenderer = (index: number | undefined) =>
    DEPTH_NORMAL_RADIUS_RENDERER_VALUES[DEPTH_NORMAL_RADIUS_OPTIONS.indexOf(depthNormalRadiusParam.fromIndex(index))];

export const DzQualityFeature = {
    id: 'dzQuality',
    name: 'Quality',
    category: 'Render',

    tabConfig: {
        label: 'Quality',
    },

    params: {
        frameSize: {
            type: 'int',
            default: 320, min: 240, max: 2560, step: 40,
            label: 'Frame size',
            format: (v) => `${Math.round(v)} px`,
            description: 'Long edge of the deep-mode frame, in pixels. The frame is scaled to fill the view. The size drawn can be lower: it is capped to the view, and to 1440, 1080 or 720 px as the zoom deepens.',
        },
        detail: {
            type: 'float',
            default: 1, min: 0.25, max: 32, step: 0.25,
            scale: 'log',
            label: 'Detail',
            description: 'How close rays get to the surface before they stop. Higher values need more march steps.',
        },
        normalDetail: {
            type: 'float',
            // An EXPERIMENT for the owner to fly (2026-10-09; grep THE LOOK LEVEL in renderer/core.js). He found
            // Detail 32 "too much in many instances, where it just makes the surface very rough". Detail does two
            // things through one number - how close rays stop, and how far apart the normal's taps stand. This row
            // gives the second a number of its own. 0 = the same as Detail (the page; nothing changes).
            default: 0, min: 0, max: 32, step: 0.25,
            label: 'Normal detail',
            format: (v) => (v <= 0 ? 'as Detail' : `${v.toFixed(2)}×`),
            description: 'How finely the surface is shaded, apart from how close rays stop. At 0 it follows Detail. Set below Detail, rays still stop as Detail says, so thin layers stay apart, but the surface is shaded as the lower value would shade it: calmer, less grain. Needs Normals: 4-tap.',
        },
        reach: {
            ...reachParam.config,
            type: 'float',
            description: 'How far a ray travels before it gives up. Short: 256 steps. Relaxed: 512 steps, with longer steps far from the camera. Full: 1024 steps.',
        },
        normals: {
            ...normalsParam.config,
            type: 'float',
            description: 'How the surface direction is found for shading. Screen and Depth read the rendered picture. 3-tap and 4-tap sample the distance estimate around each hit.',
        },
        depthNormalRadius: {
            ...depthNormalRadiusParam.config,
            type: 'float',
            condition: { param: 'normals', eq: NORMALS_DEPTH_INDEX },
            description: 'For Depth normals: how many pixels away the neighbours are read.',
        },
        hitLanding: {
            type: 'boolean',
            // ON, the owner's pick (2026-10-17, STREAMLINE.md F16, shown off | on at Arches and at
            // Slicing: "looks better on"). The module starts with it off (`let landMode = 0` in
            // renderer/core.js) and takes the store's value at ready (deep-zoom/useHostSync.ts).
            default: true,
            label: 'Hit landing',
            description: 'Places each surface hit on a fixed level of the distance estimate instead of where the last march step fell. Moves the surface by a fraction of a pixel.',
        },
        hitRefine: {
            type: 'int',
            // Off by default: with it on the picture is no longer the frozen page's. Measured
            // 2026-10-08 (grep HIT REFINE in renderer/core.js): 4 halvings take an ordinary
            // 1e-17 view from 9.9 % of pixels on the wrong surface to 0.9 %, at 1.44x the render
            // time; the owner's 2.76e-39 view needs Step size 0.5 as well (57 % -> 2.8 % with 3).
            default: 0, min: 0, max: 8, step: 1,
            label: 'Hit refine',
            format: (v) => (Math.round(v) === 0 ? 'off' : `${Math.round(v)}`),
            description: 'Halves each hit\'s last march step this many times, so the surface lands where it should instead of where the step fell. Removes cuts and terraced slices that show before the still has accumulated. Costs about a third more render time at 3 or 4. On the Mandelbox, where slices remain, lower Step size to 0.5 as well. Replaces Hit landing while it is on.',
        },
        stepSize: {
            type: 'float',
            // NOT advanced (the owner, 2026-10-08: "step size shouldn't be in advanced"). It sits
            // beside Hit refine because the two are used together.
            // SHOWN FOR THE MANDELBOX ONLY since 2026-10-11 (`BOX_ONLY` above): the bulb's ray march
            // does not read it. The numbers below were measured on the bulb under the page's march,
            // which is gone; they are why the range reaches down to 0.1.
            // The page's own control stopped at 0.85 (it was a speed lever). The range goes down to
            // 0.1 here because the distance estimate over-reads in places. Measured 2026-10-08 on
            // the owner's 2.76e-39 view, one sample, against a slow march: at 0.85, 57 % of the
            // pixels show a surface behind the right one (dark cuts); 0.5 leaves 15 %, 0.3 7 %,
            // and 0.5 with Hit refine 3 leaves 2.8 % at 1.4x the render time (0.2 alone: 2.4 % at
            // 2.6x). So the cure is Hit refine first, then this slider to 0.5.
            default: 0.85, min: 0.1, max: 2, step: 0.05,
            label: 'Step size',
            condition: BOX_ONLY,
            format: (v) => `${v.toFixed(2)}×`,
            description: 'The march step of the Mandelbox and of KaliBox, as a multiple of the distance estimate. Lower it to 0.5, with Hit refine on, where the surface shows dark cuts and slices: the estimate over-reads there and 0.85 steps through. Above 0.85 a ray takes fewer, longer steps and can pass through thin features. The Mandelbulb has no step setting: its ray march steps by how fast the orbit\'s escaping point moves along the ray.',
        },
        // NO `rayMarch` PARAM SINCE 2026-10-11 (see the header's pitfall). What it measured when it was a switch,
        // for the record (2026-10-09, the GPU, Detail 32, 16,384 rays a view, 17 views): rays more than 2 px of depth
        // from a careful march - 10.2 % with the page's default step, 2.0 % at Step size 0.42, 1.0 % with the ray
        // march (the power-2 place at 5e-20: 97.6 / 26.8 / 1.8 %); a 640 x 640 picture with 4-tap normals, mean of 11
        // views: 21.8 / 34.3 / 22.6 ms. The owner, having flown it: "lets make it the default for now, we can aim to
        // retire the others but lets keep them around a little while longer for reference" - and on 2026-10-11 retired them.
        accumulate: {
            type: 'boolean',
            default: true,
            label: 'Accumulate',
            description: 'While the view is still, averages up to 64 jittered samples into the picture.',
        },
        // Declared now, shown from module package M1: see the header. Until then `panels.ts` keeps
        // this row out with `excludeParams: ['actualPixels']`.
        actualPixels: {
            type: 'boolean',
            default: false,
            label: 'Actual pixels',
            description: 'Shows the frame at its true pixel size, centred, instead of scaled to fill the view.',
        },
        resolutionCap: {
            type: 'int',
            default: 1, min: 1, max: 8, step: 1,
            label: 'Resolution cap',
            isAdvanced: true,
            format: (v) => `${Math.round(v)}×`,
            description: 'Multiplies the frame-size caps that apply at depth (1440, 1080 and 720 px). Above 1, a deep frame can take longer than the 2 s GPU watchdog allows.',
        },
    },
} satisfies FeatureDefinition;

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
type SliceIsTyped = MustBeNever<AnyKeys<SliceFromParams<typeof DzQualityFeature['params']>>>;
