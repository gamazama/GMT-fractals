/**
 * deep-zoom/features/formula.ts — the DDFS feature `dzFormula` (dock tab Formula).
 *
 * PURPOSE
 *   The values that decide the SHAPE being drawn: which formula (the Mandelbulb or the Mandelbox),
 *   that formula's own parameters, and the iteration budget. Declaring them as a feature is what
 *   gives each one a panel row, an undo step, a preset field and a keyframe track
 *   (`dzFormula.power`, ...).
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate` — the engine does not draw this picture;
 *   the shell's host sync (`deep-zoom/host/paramMap.ts`, `host/looseParams.ts`) pushes a changed
 *   value through these handles of `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     kind            api.setFormula(kind, params)   'mandelbulb' | 'mandelbox' (formulaToRenderer)
 *     juliaMode       api.setFormula(kind, { julia })   in the same call as the kind (see JULIA MODE)
 *     power           api.setPower(n)            clamps to 2..16 and truncates (`n|0`)
 *     phaseTheta      api.setPhase(theta, phi)   ABSOLUTE, always both arguments, theta first
 *     phasePhi        api.setPhase(theta, phi)   (the page's own panel lists phi first)
 *     boxScale, boxMinRadius, boxFold, boxFixedRadius, boxRotX / Y / Z
 *                     api.setFormula(kind, { scale, minR, fold, fixedR, rot }) - one call carries
 *                     the kind and all seven (grep THE FORMULA SEAM in core.js)
 *     iterations      api.setIters(n)            clamps to 4..400, or 4..500 while the box is drawn
 *     autoIterations  api.setAutoIters(on)
 *   This file only declares. The integrator registers the feature (`registerFeatures.ts`), derives
 *   the slice type (`storeTypes.ts`: `SliceFromParams<typeof DzFormulaFeature['params']>`) and
 *   places the rows (`panels.ts`).
 *
 * THE TWO FORMULAS (2026-10-09)
 *   `kind` is an enum (0 = Mandelbulb, the default; 1 = Mandelbox). A row that belongs to the other
 *   formula is not shown (`condition` on `kind`); its value is kept, saved and pushed all the same,
 *   so switching back finds it. The box's rows carry GMT's own labels and ranges
 *   (`engine-gmt/formulas/AmazingBox.ts`), with two differences:
 *     Scale       runs from -4 to 4 (GMT's: 1 to 4). The renderer cannot draw |scale| under 1.02
 *                 (at 1 nothing escapes), so the STORE never holds such a value: `deep-zoom/boxScale.ts`
 *                 moves one that arrives onto the nearer of -1.02 and 1.02, whoever wrote it.
 *     Min Radius  starts at 0.001, not 0 (the renderer floors it, as GMT's shader does), and may not
 *                 pass Fixed Radius, nor Fixed Radius go under it (`dynamicConfig`): the renderer's
 *                 three-region sphere fold needs that order and would hold the pair to it silently.
 *   Pre-Rotation is one row over three scalars (`composeFrom`, as GMT's geometry feature does it).
 *   Anything saved before this day has no `kind` and means the Mandelbulb (a scene load fills a
 *   missing key with its default; `deep-zoom/locations.ts` does the same for a place).
 *
 * JULIA MODE (2026-10-12)
 *   `juliaMode` is a switch for either formula: on, one constant is added every iteration and the
 *   point looked at starts the orbit (grep JULIA MODE in renderer/core.js). THE CONSTANT IS NOT A
 *   PARAM (the owner: no number rows for it in this build). It is taken from the place looked at
 *   ("Julia from this place", `juliaFromThisPlace` in `deep-zoom/locations.ts`) or comes with a
 *   pasted or loaded view, lives in the renderer as the camera does, and travels with the VIEW as
 *   three 256-bit decimal strings (`DzView.julia`): a place, a scene, a link and pasted text carry
 *   it there, never as numbers. So this slice says only WHETHER the mode is on. Switching it by
 *   its row takes the point at the centre of the view as the constant and moves the camera to the
 *   whole set, in the same undo step (`deep-zoom/locations.ts`, the `juliaMode` subscription).
 *   Anything saved before this day has no `juliaMode` and is in Mandelbrot mode.
 *
 * INVALIDATION
 *   Every param here is class O: the renderer rebuilds its reference orbit (grep `orbitDirty` in
 *   core.js), which is heavy at depth — about one BigInt evaluation per iteration — and restarts
 *   the still. The sync layer debounces these during a drag. `autoIterations` raises no flag by
 *   itself; it costs an orbit rebuild each time it raises the live count. The first switch to the
 *   Mandelbox also builds its shader variant in the background (about 2 s; the top bar says so).
 *
 * PITFALLS
 *   - AUTO ITERATIONS: `iterations` IS THE USER'S FLOOR, NOT THE LIVE COUNT. With auto on, the
 *     renderer raises its own count every frame as the zoom deepens and never lowers it (grep
 *     `auto iteration budget` and `ITERATIONS AS A MARGIN` in core.js: the bulb 32 + 1.35 per decade
 *     up to 160, and by the ray march's own rule a margin above the camera orbit's escape up to 400; the
 *     box by that margin alone, up to 500). The live number is `api.dz.telemetry().iters` and is
 *     shown beside the slider by a readout widget. It is NEVER written back into this param: a
 *     write-back would turn flying deeper into undo steps and scene-file changes, and a sync that
 *     re-pushed the stored floor on every change would fight the renderer and rebuild the orbit
 *     twice a frame.
 *   - THE ITERATION CEILING FOLLOWS THE FORMULA: 400 for the bulb, 500 for the box (the row's
 *     `dynamicConfig`; `iterationCeiling` below is the one place that says so). Switching to the
 *     bulb brings a higher floor down to 400 in the same store write (`onSet` on `kind`).
 *     The bulb's was 160 until 2026-10-11: the page's own ceiling, which `api.setIters` and
 *     `api.dz.setView` kept applying after the ray march, whose rule reaches 400, had become the
 *     bulb's only march - a keyed or saved count above 160 was cut. The page's DEPTH rule still
 *     stops at 160 (grep `auto iteration budget` in core.js); only the margin rule and a count set
 *     by hand, by a place or by a route go higher.
 *   - A SECOND WRITER. `api.dz.setView(view)` also writes iterations, power and phase, and path
 *     playback writes all three on every frame (grep `function pathApplyCR`). The shell applies a
 *     jump through this feature's setter so the store stays the one owner (BLUEPRINT section 2).
 *     A view does NOT carry the formula: a jump tells the renderer the formula first, then hands it
 *     the view (`deep-zoom/locations.ts`, `pushFormulaNow`).
 *   - NAMING. A track id containing `rot`, `phase` or `twist` is interpolated as an angle that
 *     wraps at 2 pi (grep `isRotation` in `engine/AnimationEngine.ts`, `isRotationTrack` in
 *     `utils/timelineUtils.ts`). That is correct for `phaseTheta` / `phasePhi` and for
 *     `boxRotX` / `Y` / `Z`, which are radians. Do not add a non-angle param whose id contains one
 *     of those three strings.
 *   - No key may start with `is`: saved scenes and share links drop such keys (grep
 *     `startsWith('is')`: `sanitizeFeatureState` in `utils/PresetLogic.ts`, `quantize` in
 *     `utils/UrlStateEncoder.ts`).
 *   - `power` and `iterations` are `int` params, but a keyframed or modulated value arrives as a
 *     fraction. `api.setPower` truncates; whatever pushes `iterations` must round it.
 *   - `boxRotation` is a COMPOSED row: it has no state of its own (the slice holds `boxRotX`,
 *     `boxRotY`, `boxRotZ`), no push and no track. A scene load can leave a stale `boxRotation`
 *     key in the slice (the loader writes every declared param's default); nothing reads it.
 *
 * @invariant No key of the `dzFormula` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` for the numeric keys and `boolean` for `autoIterations` — proven by:
 *   npm run typecheck ("does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the
 *   foot of this file). Falsified 2026-10-08: with `satisfies FeatureDefinition` swapped for a
 *   `: FeatureDefinition` annotation (the fluid-toy idiom), tsc reported "Type 'string' does not
 *   satisfy the constraint 'never'" on that line; the annotation widens `params` to
 *   `Record<string, ParamConfig>` and every slice key becomes `any`.
 * @assumption Every default, range and step here equals the renderer's own (read 2026-10-08 in
 *   core.js: `let nPower`, `let phaseTheta`, `const cam = {` for `iters: 14`, `let autoIters`, and
 *   the `CTLS` rows 'power n', 'phase', 'iters'; 2026-10-09: `const box = {` and `applyFormula`).
 *   The node check `debug/deep-zoom-checks/param-map.mts` compares the defaults with a FAKE api
 *   holding the module's; the stage-2 smoke step "every feature default equals the module's
 *   settings read at ready" is the proof against the real one.
 */

import * as THREE from 'three';
import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';
import { defineEnumParam } from '../../engine/defineEnumParam';

// ── Formula — core.js: `let dzFormula = 'mandelbulb'`. The option's own name is what `api.setFormula` takes.
export const FORMULA_OPTIONS = ['mandelbulb', 'mandelbox'] as const;
const formulaParam = defineEnumParam(FORMULA_OPTIONS, 'Formula', { defaultIndex: 0 });
/** The slice index of each formula, for conditions and for code that asks "is this the box". */
export const FORMULA_BULB = FORMULA_OPTIONS.indexOf('mandelbulb');
export const FORMULA_BOX = FORMULA_OPTIONS.indexOf('mandelbox');
/** `api.setFormula(kind, ...)`: index -> the renderer's name; a missing or odd index is the Mandelbulb. */
export const formulaToRenderer = (index: number | undefined) => formulaParam.fromIndex(index);

/** The least |scale| the renderer draws (grep `applyFormula` in core.js). */
export const BOX_SCALE_MIN = 1.02;
/** A scale the renderer can draw: one inside (-1.02, 1.02) goes to the nearer end, 0 to the positive one. */
export const validBoxScale = (v: number): number =>
    (Math.abs(v) >= BOX_SCALE_MIN ? v : v < 0 ? -BOX_SCALE_MIN : BOX_SCALE_MIN);

/** The highest iteration count the renderer takes for a formula: its own `BOX_ITER_MAX` and `RAY_ITER_MAX`
 *  (grep both, and `const itersMax`, in core.js; `api.setIters` and `api.dz.setView` hold a count under them). */
export const iterationCeiling = (kind: number | undefined): number => (kind === FORMULA_BOX ? 500 : 400);

const onBulb = { param: 'kind', eq: FORMULA_BULB };
const onBox = { param: 'kind', eq: FORMULA_BOX };
/** Radians as a share of pi: the box's rotation row reads like GMT's. */
const BOX_ROT = { type: 'float', default: 0, min: -6.28, max: 6.28, step: 0.001, scale: 'pi', hidden: true, condition: onBox } as const;

export const DzFormulaFeature = {
    id: 'dzFormula',
    name: 'Formula',
    category: 'Fractal',

    tabConfig: {
        label: 'Formula',
    },

    params: {
        kind: {
            ...formulaParam.config,
            type: 'float',
            description: 'Which fractal is drawn. The Mandelbox is GMT\'s Amazing Box. Switching shows the whole of the new one from outside; Undo brings back the place you were at. The first switch to the Mandelbox builds its renderer, a few seconds.',
            // The bulb's ceiling is 400: a higher floor comes down with the switch, in the same write.
            onSet: (next: number, slice: { iterations?: number }) =>
                (next !== FORMULA_BOX && (slice.iterations ?? 0) > iterationCeiling(next) ? { iterations: iterationCeiling(next) } : {}),
        },
        power: {
            type: 'int',
            default: 8, min: 2, max: 16, step: 1,
            label: 'Power',
            condition: onBulb,
        },
        phaseTheta: {
            type: 'float',
            default: 0, min: 0, max: 6.2832, step: 0.02,
            label: 'Phase theta',
            condition: onBulb,
        },
        phasePhi: {
            type: 'float',
            default: 0, min: 0, max: 6.2832, step: 0.02,
            label: 'Phase phi',
            condition: onBulb,
        },
        // ── the Mandelbox: GMT's rows (engine-gmt/formulas/AmazingBox.ts), see THE TWO FORMULAS ──
        boxScale: {
            type: 'float',
            default: 2, min: -4, max: 4, step: 0.001,
            label: 'Scale',
            condition: onBox,
            description: 'How much each fold scales space. Negative values give a different family of shapes. Between -1.02 and 1.02 there is nothing to draw: the slider passes over that band.',
        },
        boxMinRadius: {
            type: 'float',
            // The least the renderer takes (grep `3.1623e-5` in renderer/core.js: GMT floors the square at 1e-9).
            // 0.001 until 2026-10-12; the Kleinian card (data/boxStarters.ts) is the box with no inner radius.
            default: 0.5, min: 3.1623e-5, max: 1.5, step: 0.001,
            label: 'Min Radius',
            condition: onBox,
            dynamicConfig: (slice: { boxFixedRadius?: number }) => ({ max: Math.min(1.5, slice.boxFixedRadius ?? 1.5) }),
            description: 'Inside this radius the sphere fold scales by a fixed amount. It cannot pass Fixed Radius.',
        },
        boxFold: {
            type: 'float',
            default: 1, min: 0.1, max: 2, step: 0.001,
            label: 'Folding Limit',
            condition: onBox,
            description: 'Where the box fold mirrors each axis.',
        },
        boxFixedRadius: {
            type: 'float',
            default: 1, min: 0.1, max: 3, step: 0.001,
            label: 'Fixed Radius',
            condition: onBox,
            dynamicConfig: (slice: { boxMinRadius?: number }) => ({ min: Math.max(0.1, slice.boxMinRadius ?? 0.1) }),
            description: 'Between Min Radius and this radius the sphere fold turns space inside out. It cannot go under Min Radius.',
        },
        boxRotX: { ...BOX_ROT, label: 'Pre-Rotation X' },
        boxRotY: { ...BOX_ROT, label: 'Pre-Rotation Y' },
        boxRotZ: { ...BOX_ROT, label: 'Pre-Rotation Z' },
        boxRotation: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Pre-Rotation',
            composeFrom: ['boxRotX', 'boxRotY', 'boxRotZ'],
            min: -6.28, max: 6.28, step: 0.001, scale: 'pi', mode: 'axes',
            condition: onBox,
            description: 'Turns space about x, then y, then z before every fold.',
        },
        // ── Julia mode, either formula (see JULIA MODE in the header) ──
        juliaMode: {
            type: 'boolean',
            default: false,
            label: 'Julia mode',
            // Switched ON by itself (its row, "Julia from this place"), the floor goes back to the whole-object
            // count: the camera is about to stand outside a whole set, and a deep place's count (98 at the kept
            // place "Slicing") draws that set as a ball of grain - seen 2026-10-12. A write that carries its own
            // `iterations` (a place, a scene, a link) keeps it: `onSet` never overrides a value given with it.
            onSet: (next: boolean, slice: { juliaMode?: boolean }) => (next && !slice.juliaMode ? { iterations: 14 } : {}),
            description: 'On: one constant is added every iteration and the point you look at starts the orbit - the Julia set of that constant. Switching it on takes the point at the centre of the view as the constant and shows the whole set from outside. Undo, or Back, brings back the place you were at.',
        },
        iterations: {
            type: 'int',
            default: 14, min: 4, max: 500, step: 1,
            label: 'Iterations',
            dynamicConfig: (slice: { kind?: number }) => ({ max: iterationCeiling(slice.kind) }),
            description: 'The lowest iteration count. With Auto iterations on, the live count rises with depth and can be higher than this.',
        },
        autoIterations: {
            type: 'boolean',
            default: true,
            label: 'Auto iterations',
            description: 'Raises the live iteration count as the zoom deepens, and never lowers it. Mandelbulb: 32 plus 1.35 for each decade, up to 160, and never less than a margin above where the camera\'s own orbit escapes, up to 400, which is what low powers need. Mandelbox: that margin alone, up to 500.',
        },
    },
} satisfies FeatureDefinition;

/** The keys that say WHICH formula a place is of, the box's parameters, and whether it is a Julia set.
 *  A place, a jump and the renderer's `setFormula` all carry exactly these. (The Julia CONSTANT is not
 *  among them: it is part of the view. See JULIA MODE in the header.) */
export const FORMULA_CHOICE_KEYS = ['kind', 'boxScale', 'boxMinRadius', 'boxFold', 'boxFixedRadius', 'boxRotX', 'boxRotY', 'boxRotZ', 'juliaMode'] as const;
type DzFormulaChoiceKey = (typeof FORMULA_CHOICE_KEYS)[number];
/** `juliaMode` may be left out (every choice written before 2026-10-12): it then means off. */
export type DzFormulaChoice =
    Pick<SliceFromParams<typeof DzFormulaFeature['params']>, Exclude<DzFormulaChoiceKey, 'juliaMode'>>
    & Partial<Pick<SliceFromParams<typeof DzFormulaFeature['params']>, 'juliaMode'>>;

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
type SliceIsTyped = MustBeNever<AnyKeys<SliceFromParams<typeof DzFormulaFeature['params']>>>;
