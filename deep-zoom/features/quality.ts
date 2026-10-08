/**
 * deep-zoom/features/quality.ts — the DDFS feature `dzQuality` (dock tab Quality).
 *
 * PURPOSE
 *   How the picture is rendered, as opposed to what is drawn or how it is lit: the frame size, how
 *   close and how far rays go, how normals are found, the march step, the still's accumulation, and three advanced
 *   levers (precision path, BLA, march step, the depth caps on the frame size). Twelve params.
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate` — the engine does not draw this picture;
 *   the shell's host sync (BUILD-PLAN package S2-3, `deep-zoom/host/paramMap.ts`) pushes a changed
 *   value through these handles of `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     frameSize          api.setFrame(px)            floor 2, truncates
 *     detail             api.setSurf(mul)            clamps to 0.25..256
 *     reach              api.setReach(k)             k = reachToRenderer(index): 0, 1, 2
 *     normals            api.setNormalMode(m)        m = normalsToRenderer(index): 0..3. See pitfalls
 *     depthNormalRadius  api.setLook({ nrmTap })     depthNormalRadiusToRenderer(index): 1, 2, 3
 *     hitLanding         api.setLand(on)
 *     accumulate         api.setAccum(on)
 *     actualPixels       no handle (`view1to1` is closure state in core.js) until module package M1
 *     precision          api.setMode(mode)           precisionToRenderer(index): 'auto' | 'deep' | 'f32'
 *     bla                api.setBla(v)               blaToRenderer(index): false | 'auto' | true
 *     stepSize           api.setStepRelax(r)
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
 *   Class A (the still restarts; cheap) for every param except two:
 *     precision   O — the reference orbit is rebuilt
 *     bla         O, and C when it goes to On: a blocking shader compile (see pitfalls)
 *
 * PITFALLS
 *   - BLA "On" BLOCKS. `api.setBla(true)` compiles the heavier shader synchronously, for seconds.
 *     The sync layer never sends it bare: it follows "BLOCKING COMPILES" in the header of
 *     `deep-zoom/renderer/index.ts` — `setBla('auto')`, wait until `api.compileMs().PB` is defined,
 *     then `setBla(true)`. That is the sync layer's duty, not this param's: do NOT mark the param
 *     `onUpdate: 'compile'`, which is wired to GMT's compiler panel and does not write the store
 *     (grep `onUpdate === 'compile'` in `components/AutoFeaturePanel.tsx`).
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
 *   - `precision`: playback and export set the renderer to 'deep' and never put it back (grep
 *     `modeOverride = 'deep'`, three sites). The host re-pushes this slice when a play or a render
 *     resolves. The renderer has no getter for the requested mode; `telemetry().mode` is the
 *     EFFECTIVE path ('deep' | 'f32').
 *   - `detail` has a second writer: `api.dz.setView(view)` writes it from `view.surf`. The shell
 *     applies a jump through this feature's setter so the store stays the one owner.
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
 *   `let view1to1`, `let modeOverride`, `let blaMode`, `let stepRelax`, `let capRelax`, and the
 *   matching `CTLS` rows). No guard checks it yet; the stage-2 smoke step "every feature default
 *   equals the module's settings read at ready" is the intended proof. `api.dz.settings()` returns
 *   six of the twelve (frame, detail, reach, normals, land, accum); `api.look.nrmTap` and
 *   `api.blaMode()` give two more; precision, stepSize, resolutionCap and actualPixels have no
 *   read-back at all until module package M1.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';
import { defineEnumParam } from '../../engine/defineEnumParam';

// ── Reach — how far a ray travels. core.js: `const REACH`, default `const march = {` = REACH[1].
export const REACH_OPTIONS = ['short', 'relaxed', 'full'] as const;
/** `api.setReach(k)`, in option order. */
export const REACH_RENDERER_VALUES = [0, 1, 2] as const;
const reachParam = defineEnumParam(REACH_OPTIONS, 'Reach', { defaultIndex: 1 });
export const reachToRenderer = (index: number | undefined) =>
    REACH_RENDERER_VALUES[REACH_OPTIONS.indexOf(reachParam.fromIndex(index))];

// ── Normals — core.js: `let normalMode = 2`.
export const NORMALS_OPTIONS = ['screen', '3-tap', '4-tap', 'depth'] as const;
/** `api.setNormalMode(m)`, in option order. */
export const NORMALS_RENDERER_VALUES = [0, 1, 2, 3] as const;
const normalsParam = defineEnumParam(NORMALS_OPTIONS, 'Normals', {
    defaultIndex: 2,
    optionLabels: { '3-tap': '3-tap', '4-tap': '4-tap' },
});
export const normalsToRenderer = (index: number | undefined) =>
    NORMALS_RENDERER_VALUES[NORMALS_OPTIONS.indexOf(normalsParam.fromIndex(index))];
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

// ── Precision — core.js: `let modeOverride = 'auto'`. The option names ARE the renderer's values.
export const PRECISION_OPTIONS = ['auto', 'deep', 'f32'] as const;
/** `api.setMode(mode)`, in option order. */
export const PRECISION_RENDERER_VALUES = ['auto', 'deep', 'f32'] as const;
const precisionParam = defineEnumParam(PRECISION_OPTIONS, 'Precision', {
    defaultIndex: 0,
    optionLabels: { f32: 'f32' },
});
export const precisionToRenderer = (index: number | undefined) =>
    PRECISION_RENDERER_VALUES[PRECISION_OPTIONS.indexOf(precisionParam.fromIndex(index))];

// ── BLA — core.js: `let blaMode = 'auto'`. `api.blaMode()` reads back 'off' | 'auto' | 'on'.
export const BLA_OPTIONS = ['off', 'auto', 'on'] as const;
/** `api.setBla(v)`, in option order. `true` BLOCKS on a compile: see the header. */
export const BLA_RENDERER_VALUES = [false, 'auto', true] as const;
const blaParam = defineEnumParam(BLA_OPTIONS, 'BLA', { defaultIndex: 1 });
export const blaToRenderer = (index: number | undefined) =>
    BLA_RENDERER_VALUES[BLA_OPTIONS.indexOf(blaParam.fromIndex(index))];

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
            default: false,
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
            description: 'Halves each hit\'s last march step this many times, so the surface lands where it should instead of where the step fell. Removes cuts and terraced slices that show before the still has accumulated. Costs about a third more render time at 3 or 4. Where slices remain, lower Step size to 0.5 as well. Replaces Hit landing while it is on.',
        },
        stepSize: {
            type: 'float',
            // NOT advanced (the owner, 2026-10-08: "step size shouldn't be in advanced"). It sits
            // beside Hit refine because the two are used together.
            // The page's own control stopped at 0.85 (it was a speed lever). The range goes down to
            // 0.1 here because the distance estimate over-reads in places. Measured 2026-10-08 on
            // the owner's 2.76e-39 view, one sample, against a slow march: at 0.85, 57 % of the
            // pixels show a surface behind the right one (dark cuts); 0.5 leaves 15 %, 0.3 7 %,
            // and 0.5 with Hit refine 3 leaves 2.8 % at 1.4x the render time (0.2 alone: 2.4 % at
            // 2.6x). So the cure is Hit refine first, then this slider to 0.5.
            default: 0.85, min: 0.1, max: 2, step: 0.05,
            label: 'Step size',
            format: (v) => `${v.toFixed(2)}×`,
            description: 'March step as a multiple of the distance estimate. Lower it to 0.5, with Hit refine on, where the surface shows dark cuts and slices: the estimate over-reads there and 0.85 steps through. Above 0.85 a ray takes fewer, longer steps and can pass through thin features.',
        },
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
        precision: {
            ...precisionParam.config,
            type: 'float',
            isAdvanced: true,
            description: 'Auto uses f32 until the surface is closer than 1e-4, then the deep (perturbation) path. Deep and f32 use one path at every depth. Deep draws shallow views too, except with the camera exactly on the bulb\'s vertical axis (the start view), where it shows one flat colour.',
        },
        bla: {
            ...blaParam.config,
            type: 'float',
            isAdvanced: true,
            description: 'Bivariate linear approximation: skips runs of perturbation iterations. Auto uses it below a surface distance of about 1e-13. On uses it at every depth; the first switch to On builds a shader, a pause of a few seconds.',
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
