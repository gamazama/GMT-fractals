/**
 * deep-zoom/features/formula.ts — the DDFS feature `dzFormula` (dock tab Formula).
 *
 * PURPOSE
 *   The values that decide the SHAPE being drawn: which formula (the Mandelbulb, the Mandelbox or KaliBox),
 *   that formula's own parameters, and the iteration budget. Declaring them as a feature is what
 *   gives each one a panel row, an undo step, a preset field and a keyframe track
 *   (`dzFormula.power`, ...).
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate` — the engine does not draw this picture;
 *   the shell's host sync (`deep-zoom/host/paramMap.ts`, `host/looseParams.ts`) pushes a changed
 *   value through these handles of `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     kind            api.setFormula(kind, params)   'mandelbulb' | 'mandelbox' | 'kalibox' (formulaToRenderer)
 *     juliaMode       api.setFormula(kind, { julia })   in the same call as the kind (see JULIA MODE)
 *     juliaX / Y / Z  api.setFormula(kind, { c })       in that call too, and ONLY when the three differ
 *                     from the constant the renderer holds (see THE CONSTANT'S ROW)
 *     burning, burningMix  api.setFormula(kind, { burning, burnMix })   in that call too (see BURNING)
 *     power           api.setPower(n)            clamps to 2..16 and truncates (`n|0`)
 *     phaseTheta      api.setPhase(theta, phi)   ABSOLUTE, always both arguments, theta first
 *     phasePhi        api.setPhase(theta, phi)   (the page's own panel lists phi first)
 *     boxScale, boxMinRadius, boxFold, boxFixedRadius, boxRotX / Y / Z
 *                     api.setFormula(kind, { scale, minR, fold, fixedR, rot }) - one call carries
 *                     the kind and all seven (grep THE FORMULA SEAM in core.js)
 *     kaliScale, kaliMinRad2, kaliTransX / Y / Z, kaliRot
 *                     api.setFormula(kind, { kaliScale, kaliMinRad2, kaliTrans, kaliRot }) - in that call
 *                     too (see KALIBOX; grep KALIBOX in core.js)
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
 * KALIBOX (2026-10-12)
 *   The third option of `kind` (index 2; 0 and 1 keep their meaning, so everything saved before this
 *   day reads as it did). GMT's KaliBox (`engine-gmt/formulas/KaliBox.ts`): the Mandelbox's step with
 *   abs(z) + Translation in the box fold's place. Its rows carry GMT's own labels - Scale, MinRad2,
 *   Translation (one row over three scalars, as `boxRotation`), Rotation - and are its own values,
 *   kept apart from the Mandelbox's. Three differences from GMT's rows:
 *     defaults    GMT's own (since 2026-10-22, the owner: "lets also fix the kalibox defaults so that
 *                 julia is enabled and it matches the gmt parameters so that we get a proper kalibox";
 *                 it supersedes call 2 of plans/deep-zoom-shell/BURNING-KALIBOX.md, which had Scale 1.8
 *                 with the point added): Scale 2.04348, MinRad2 0.3492, Translation 0.0365, -1.9183,
 *                 0.0365, Rotation 0 - GMT's preset (engine-gmt/formulas/KaliBox.ts, defaultPreset).
 *                 A switch to KaliBox turns Julia mode on (deep-zoom/locations.ts, the formula switch) and,
 *                 with no constant yet, takes GMT's (-0.6691, -1.3028, -0.45775: `KALI_GMT_CONSTANT`).
 *                 These numbers with the point added draw NOTHING (call 2 said so): with Julia mode off at
 *                 Scale 2.04 the picture is empty, and the Scale 1.8 cards are where that solid is.
 *     Scale       held out of the band (-1.02, 1.02), as the Mandelbox's is (`deep-zoom/boxScale.ts`).
 *     MinRad2     runs to 1, not 2: from 1 up GMT's map has no sphere fold left, and the renderer holds
 *                 the value at 1 (grep `MinRad2 IS HELD` in core.js).
 *   With the point added KaliBox has NO WHOLE OBJECT (an octant without end): a switch to it lands on
 *   one fixed view near its tip (`formulaHome` in `deep-zoom/locations.ts`), whatever its numbers. In
 *   Julia mode it has one, and that switch shows it as for the other two. GMT's preset is a card
 *   (`deep-zoom/data/kaliStarters.ts`), in Julia mode, and its blurb says what the study found: it
 *   holds its shapes at Detail 1 only. No row and no rule here is keyed to that.
 *   The first switch builds its renderer in the background (about 2 s; the top bar says so). The
 *   Mandelbox's Step size row (`features/quality.ts`) is this march's too and shows for both.
 *
 * JULIA MODE (2026-10-12)
 *   `juliaMode` is a switch for every formula: on, one constant is added every iteration and the
 *   point looked at starts the orbit (grep JULIA MODE in renderer/core.js). The constant is taken
 *   from the place looked at ("Julia from this place", `juliaFromThisPlace` in
 *   `deep-zoom/locations.ts`) or comes with a pasted or loaded view, lives in the renderer as the
 *   camera does, and travels with the VIEW as three 256-bit decimal strings (`DzView.julia`): a
 *   place, a scene, a link and pasted text carry it there, never as numbers. Switching the mode
 *   on by its row comes back to the LAST constant when there is one (the owner, 2026-10-12; with
 *   none yet it takes the point at the centre of the view, which is what the button always does)
 *   and moves the camera to the whole set, in the same undo step (`deep-zoom/locations.ts`, the
 *   `juliaMode` subscription). Anything saved before this day has no `juliaMode` and is in
 *   Mandelbrot mode.
 *
 * BURNING (2026-10-12)
 *   `burning` is a switch of the Mandelbulb and `burningMix` a row under it, shown while the switch
 *   is on: GMT's Burning Mode and its mix (grep BURNING in renderer/core.js - at the top of every
 *   iteration a negative coordinate is multiplied by 1 - 2 mix; mix 1 is the plain abs). They are
 *   formula values like Power: two of `FORMULA_CHOICE_KEYS`, so a place, Back, Home, a scene, a link,
 *   pasted text and undo carry them, and a place without them - everything saved before this day -
 *   is not burning. The switch does NOT move the camera: the burning bulb lies in the bulb's own
 *   ball, the place stays and the shape under it changes, as with Power. The first switch builds a
 *   variant of the deep renderer in the background (about ten seconds; the top bar and the notice
 *   over the picture say so, as they do at start); dragging the mix builds nothing. Both rows are
 *   kept while the Mandelbox is drawn and apply again on the bulb. With Julia mode it works as it
 *   stands (the direct proof has two lines for it).
 *
 * THE CONSTANT'S ROW (2026-10-12, later the same day; the owner, having flown the mode: "I dont
 *   see how to set the julia constant's coordinate")
 *   `juliaX`, `juliaY`, `juliaZ` are the constant as three doubles, shown as ONE row, "Constant"
 *   (`juliaConstant`, composed as `boxRotation` is), while Julia mode is on. Dragged, typed or
 *   keyframed they change the set; the camera and the iteration floor stay. THE RENDERER'S
 *   STRINGS REMAIN THE CONSTANT. The rows are a second, coarser writing of it, and three rules
 *   keep the two from fighting:
 *     the precision rule  the formula push sends the rows only when they DIFFER from the constant
 *                         the renderer holds, read back as doubles. Rows that merely show a deep
 *                         constant send nothing, and its 77 digits stay
 *                         (`deep-zoom/host/looseParams.ts`, THE CONSTANT).
 *     the rows follow     whoever hands the renderer a view that carries a constant writes these
 *                         three with it, as that constant's doubles (`juliaRowsOf`): a jump and
 *                         the button (`deep-zoom/locations.ts`), a scene, a link and the session
 *                         (`deep-zoom/presetFields.ts`). A place or a scene from before the rows
 *                         existed, and a share link (which rounds numbers to four decimals), would
 *                         otherwise arrive with rows that disagree and overwrite its constant.
 *     undo stays exact    a constant that came with a view is remembered exact (the last 8), so
 *                         rows put back onto its doubles - an undo of a drag - send its strings.
 *   A constant set by the rows is those doubles and no deeper: enough for a whole set, not for a
 *   deep place (grep `the constant must be exact` in renderer/core.js). The track ids are
 *   `dzFormula.juliaX` / `Y` / `Z`.
 *
 * THE ITERATION SCHEDULE (2026-10-18)
 *   `boxSchedule` is the Mandelbox's rules for giving Scale, Min Radius, Folding Limit and Fixed Radius other
 *   values at chosen iterations (deep-zoom/boxSchedule.ts says what a rule is and what it compiles to). It is a
 *   hidden `complex` param: no row of its own. Each of the four rows carries a button after its label that opens
 *   the schedule tool (`dz-schedule-button`, components/ScheduleTool.tsx). It is a formula value: one of
 *   `FORMULA_CHOICE_KEYS`, so a place, Back, Home, a scene, a link and undo carry it, and a place or card
 *   without one has none (`applyFormula` in deep-zoom/locations.ts). Not keyframed: a schedule is rules, not a
 *   number. It reaches the renderer by its own push (`api.setBoxSchedule`, host/looseParams.ts); its slice type
 *   is `DzBoxSchedule` (storeTypes.ts), not the `any` a `complex` param would be.
 *
 * INVALIDATION
 *   Every param here is class O: the renderer rebuilds its reference orbit (grep `orbitDirty` in
 *   core.js), which is heavy at depth — about one BigInt evaluation per iteration — and restarts
 *   the still. The sync layer gathers these for one frame, so a drag is followed. `autoIterations` raises no flag by
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
 *   - THE ITERATION CEILING FOLLOWS THE FORMULA: 400 for the bulb, 500 for the box and KaliBox (the row's
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
 *     `boxRotX` / `Y` / `Z` and `kaliRot`, which are radians. Do not add a non-angle param whose id
 *     contains one of those three strings (KaliBox's translation is `kaliTransX`, not a "rot").
 *   - No key may start with `is`: saved scenes and share links drop such keys (grep
 *     `startsWith('is')`: `sanitizeFeatureState` in `utils/PresetLogic.ts`, `quantize` in
 *     `utils/UrlStateEncoder.ts`).
 *   - `power` and `iterations` are `int` params, but a keyframed or modulated value arrives as a
 *     fraction. `api.setPower` truncates; whatever pushes `iterations` must round it.
 *   - `boxRotation` is a COMPOSED row: it has no state of its own (the slice holds `boxRotX`,
 *     `boxRotY`, `boxRotZ`), no push and no track. A scene load can leave a stale `boxRotation`
 *     key in the slice (the loader writes every declared param's default); nothing reads it.
 *     `juliaConstant` over `juliaX`, `juliaY`, `juliaZ` is the same, and `kaliTranslation` over
 *     `kaliTransX`, `kaliTransY`, `kaliTransZ`.
 *   - THE CONSTANT'S ROWS ARE NOT WHAT A PLACE IS. `FORMULA_CHOICE_KEYS` does not hold them and
 *     `locationKey` (deep-zoom/locationParse.ts) does not read them: the view's strings say which
 *     constant. A saved place's formula does hold the three numbers (it is the whole slice); a
 *     jump does not read them and writes the rows from the view alone (`applyFormula` in
 *     deep-zoom/locations.ts), so a place in Mandelbrot mode leaves the last constant where it is
 *     for the switch to come back to.
 *
 * @invariant No key of the `dzFormula` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` for the numeric keys and `boolean` for `autoIterations` — proven by:
 *   npm run typecheck ("does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the
 *   foot of this file). Falsified 2026-10-08: with `satisfies FeatureDefinition` swapped for a
 *   `: FeatureDefinition` annotation (the fluid-toy idiom), tsc reported "Type 'string' does not
 *   satisfy the constraint 'never'" on that line; the annotation widens `params` to
 *   `Record<string, ParamConfig>` and every slice key becomes `any`.
 * @invariant `juliaRowsOf` gives, for a constant held as strings, the three doubles the renderer
 *   itself reads that constant as - so rows written from it equal `api.formula().cNum` and the
 *   formula push sends no constant - proven by: npm run check:deep-zoom-julia-orbit ("rows: what
 *   the Constant row shows for a deep constant is the three doubles the renderer reads it as").
 *   Falsified 2026-10-12: the function made to answer 0, 0, 0 -> that line red (0 0 0 against
 *   0.3 -1.25 1e-9).
 * @assumption Every hand-over of a view that carries a constant writes the rows with it (THE
 *   CONSTANT'S ROW, "the rows follow"). Two check lines say so and neither is known to go red for
 *   a hand-over that forgets: npm run check:deep-zoom-scene-roundtrip ("scene: the Constant row
 *   follows the loaded view ...", "place: a jump to a Julia place writes the Constant row ...";
 *   that check's header says why). "Julia from this place" and the switch by its row have no
 *   check line: seen once in the real app, 2026-10-12 (the button pressed at a kept place 5e-20
 *   deep: the rows were the constant's doubles, the 77-digit strings were the same eight frames
 *   later, a row dragged and undone brought them back to the character; a keyed `juliaX` under
 *   a route of two keyframes was in the renderer straight after each scrub; 5.5 typed into the X
 *   cell was taken as 5.5).
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
import type { DzBoxSchedule } from '../boxSchedule';

// ── Formula — core.js: `let dzFormula = 'mandelbulb'`. The option's own name is what `api.setFormula` takes.
export const FORMULA_OPTIONS = ['mandelbulb', 'mandelbox', 'kalibox'] as const;
const formulaParam = defineEnumParam(FORMULA_OPTIONS, 'Formula', { defaultIndex: 0, optionLabels: { kalibox: 'KaliBox' } });
/** The slice index of each formula, for conditions and for code that asks "is this the box". */
export const FORMULA_BULB = FORMULA_OPTIONS.indexOf('mandelbulb');
export const FORMULA_BOX = FORMULA_OPTIONS.indexOf('mandelbox');
export const FORMULA_KALI = FORMULA_OPTIONS.indexOf('kalibox');
/** `api.setFormula(kind, ...)`: index -> the renderer's name; a missing or odd index is the Mandelbulb. */
export const formulaToRenderer = (index: number | undefined) => formulaParam.fromIndex(index);

/** GMT's KaliBox constant (engine-gmt/formulas/KaliBox.ts, defaultPreset): the one a switch to KaliBox takes when
 *  there is none yet (see KALIBOX: defaults). */
export const KALI_GMT_CONSTANT = { juliaX: -0.6691, juliaY: -1.3028, juliaZ: -0.45775 } as const;

/** The least |scale| the renderer draws (grep `applyFormula` in core.js). */
export const BOX_SCALE_MIN = 1.02;
/** A scale the renderer can draw: one inside (-1.02, 1.02) goes to the nearer end, 0 to the positive one. */
export const validBoxScale = (v: number): number =>
    (Math.abs(v) >= BOX_SCALE_MIN ? v : v < 0 ? -BOX_SCALE_MIN : BOX_SCALE_MIN);

/** The highest iteration count the renderer takes for a formula: its own `BOX_ITER_MAX` and `RAY_ITER_MAX`
 *  (grep both, and `const itersMax`, in core.js; `api.setIters` and `api.dz.setView` hold a count under them). */
export const iterationCeiling = (kind: number | undefined): number => (kind === FORMULA_BOX || kind === FORMULA_KALI ? 500 : 400);

const onBulb = { param: 'kind', eq: FORMULA_BULB };
const onBox = { param: 'kind', eq: FORMULA_BOX };
const onKali = { param: 'kind', eq: FORMULA_KALI };
/** One coordinate of KaliBox's translation: GMT's range. */
const KALI_TRANS = { type: 'float', min: -5, max: 5, step: 0.001, hidden: true, condition: onKali } as const;
/** Radians as a share of pi: the box's rotation row reads like GMT's. */
const BOX_ROT = { type: 'float', default: 0, min: -6.28, max: 6.28, step: 0.001, scale: 'pi', hidden: true, condition: onBox } as const;

const onJulia = { param: 'juliaMode', bool: true };
/** One coordinate of the Julia constant. -4 to 4 is the slider's range, not a limit: neither the store nor the
 *  renderer holds a value to it, and a constant that came with a view can lie outside it. */
const JULIA_AXIS = { type: 'float', default: 0, min: -4, max: 4, step: 0.001, hidden: true, condition: onJulia } as const;

/** The three values of the Constant row for a constant held as strings: each coordinate as the renderer itself
 *  reads it as a double (grep `const toNum` in renderer/core.js: the nearest double of the 256-bit number).
 *  Written wherever a view that carries a constant is handed over (see THE CONSTANT'S ROW in the header). */
export function juliaRowsOf(c: readonly [string, string, string]): { juliaX: number; juliaY: number; juliaZ: number } {
    const double = (text: string): number => Number(BigInt(text)) / 2 ** 256;
    return { juliaX: double(c[0]), juliaY: double(c[1]), juliaZ: double(c[2]) };
}

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
            description: 'Which fractal is drawn. The Mandelbox is GMT\'s Amazing Box, KaliBox its Kali Box. Switching shows the whole of the new one from outside (KaliBox has no whole: a place near its tip); Undo brings back the place you were at. The first switch to the Mandelbox or to KaliBox builds its renderer, a few seconds.',
            // The bulb's ceiling is 400: a higher floor comes down with the switch, in the same write.
            onSet: (next: number, slice: { iterations?: number }) =>
                ((slice.iterations ?? 0) > iterationCeiling(next) ? { iterations: iterationCeiling(next) } : {}),
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
        // ── Burning, the bulb's (see BURNING in the header) ──
        burning: {
            type: 'boolean',
            default: false,
            label: 'Burning',
            condition: onBulb,
            description: 'GMT\'s Burning Mode: at the top of every iteration each negative coordinate is mirrored to the positive side. It is another shape than the Mandelbulb, at the same place. The first switch builds its renderer, about ten seconds.',
        },
        burningMix: {
            type: 'float',
            default: 1, min: 0, max: 1, step: 0.01,
            label: 'Burning mix',
            condition: [onBulb, { param: 'burning', bool: true }],
            description: 'How far a negative coordinate is mirrored: 1 is the whole mirror, 0 none. In between the shape is another one again; around 0.5 much of it is flat ground that shows nothing more with depth.',
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
        // ── the box's iteration schedule: no row; the four rows above open it (see THE ITERATION SCHEDULE) ──
        boxSchedule: {
            type: 'complex',
            default: {} as DzBoxSchedule,
            label: 'Iteration schedule',
            hidden: true,
            condition: onBox,
            description: 'Rules that give Scale, Min Radius, Folding Limit or Fixed Radius other values at chosen iterations. Later iterations shape deeper detail, so a schedule makes a dive change as it goes.',
        },
        // ── KaliBox: GMT's rows (engine-gmt/formulas/KaliBox.ts), see KALIBOX in the header ──
        kaliScale: {
            type: 'float',
            default: 2.04348, min: -3, max: 3, step: 0.001,   // GMT's (see KALIBOX: defaults)
            label: 'Scale',
            condition: onKali,
            description: 'How much each fold scales space. At 1.8 there is a solid that holds its shapes; from about 2 up, with Julia mode off, there is nothing to draw. Negative values put the shape on the other side. Between -1.02 and 1.02 there is nothing to draw: the slider passes over that band.',
        },
        kaliMinRad2: {
            type: 'float',
            default: 0.3492, min: 0.001, max: 1, step: 0.001,
            label: 'MinRad2',
            condition: onKali,
            description: 'Inside this radius, squared, the sphere fold scales by a fixed amount. At 1 there is no sphere fold left.',
        },
        kaliTransX: { ...KALI_TRANS, default: 0.0365, label: 'Translation X' },
        kaliTransY: { ...KALI_TRANS, default: -1.9183, label: 'Translation Y' },
        kaliTransZ: { ...KALI_TRANS, default: 0.0365, label: 'Translation Z' },
        kaliTranslation: {
            type: 'vec3', default: new THREE.Vector3(0.0365, -1.9183, 0.0365), label: 'Translation',
            composeFrom: ['kaliTransX', 'kaliTransY', 'kaliTransZ'],
            min: -5, max: 5, step: 0.001,
            condition: onKali,
            description: 'Added to every point after its coordinates are mirrored to the positive side, in every iteration.',
        },
        kaliRot: {
            type: 'float',
            default: 0, min: -3.14, max: 3.14, step: 0.01, scale: 'pi',
            label: 'Rotation',
            condition: onKali,
            description: 'Turns space about the diagonal (1, 1, 0) before every fold.',
        },
        // ── Julia mode, every formula (see JULIA MODE in the header) ──
        juliaMode: {
            type: 'boolean',
            default: false,
            label: 'Julia mode',
            // Switched ON by itself (its row, "Julia from this place"), the floor goes back to the whole-object
            // count: the camera is about to stand outside a whole set, and a deep place's count (98 at the kept
            // place "Slicing") draws that set as a ball of grain - seen 2026-10-12. A write that carries its own
            // `iterations` (a place, a scene, a link) keeps it: `onSet` never overrides a value given with it.
            onSet: (next: boolean, slice: { juliaMode?: boolean }) => (next && !slice.juliaMode ? { iterations: 14 } : {}),
            description: 'On: one constant is added every iteration and the point you look at starts the orbit - the Julia set of that constant. Switching it on brings back the last constant and shows the whole of its set from outside; with no constant yet, the point at the centre of the view is taken. Undo, or Back, brings back the place you were at. The Constant row under this switch shows the constant; drag or type its numbers to change the set.',
        },
        // ── the Julia constant as numbers: one composed row (see THE CONSTANT'S ROW in the header) ──
        juliaX: { ...JULIA_AXIS, label: 'Constant X' },
        juliaY: { ...JULIA_AXIS, label: 'Constant Y' },
        juliaZ: { ...JULIA_AXIS, label: 'Constant Z' },
        juliaConstant: {
            type: 'vec3', default: new THREE.Vector3(0, 0, 0), label: 'Constant',
            composeFrom: ['juliaX', 'juliaY', 'juliaZ'],
            min: -4, max: 4, step: 0.001,
            condition: onJulia,
            description: 'The point whose Julia set is drawn. Drag or type a coordinate and the set changes as you go; the camera stays where it is. Each coordinate can be keyframed. A constant taken from a deep place is kept exact until one of these numbers is changed.',
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
            description: 'Raises the live iteration count as the zoom deepens, and never lowers it. Mandelbulb: 32 plus 1.35 for each decade, up to 160, and never less than a margin above where the camera\'s own orbit escapes, up to 400, which is what low powers need. Mandelbox and KaliBox: that margin alone, up to 500.',
        },
    },
} satisfies FeatureDefinition;

/** The keys that say WHICH formula a place is of, the box's parameters, KaliBox's, whether it is a Julia set, and
 *  the bulb's Burning with its mix. A place, a jump and the renderer's `setFormula` all carry exactly these. (The
 *  Julia CONSTANT is not among them: it is part of the view, and its three number rows follow the view. See
 *  JULIA MODE and THE CONSTANT'S ROW in the header.) */
export const FORMULA_CHOICE_KEYS = ['kind', 'boxScale', 'boxMinRadius', 'boxFold', 'boxFixedRadius', 'boxRotX', 'boxRotY', 'boxRotZ', 'juliaMode', 'burning', 'burningMix',
    'kaliScale', 'kaliMinRad2', 'kaliTransX', 'kaliTransY', 'kaliTransZ', 'kaliRot', 'boxSchedule'] as const;
type DzFormulaChoiceKey = (typeof FORMULA_CHOICE_KEYS)[number];
/** A choice always says its `kind`. Every other key may be absent, and an absent key leaves its row as it is:
 *  a choice written before a key existed does not have it (`juliaMode` and `burning`: off; `burningMix`;
 *  KaliBox's six - all 2026-10-12), and a card of one formula does not carry the other formula's numbers
 *  (a KaliBox card leaves the Mandelbox's rows alone, as a Mandelbox card leaves KaliBox's). */
export type DzFormulaChoice =
    Pick<SliceFromParams<typeof DzFormulaFeature['params']>, 'kind'>
    & Partial<Pick<SliceFromParams<typeof DzFormulaFeature['params']>, Exclude<DzFormulaChoiceKey, 'kind' | 'boxSchedule'>>>
    & { boxSchedule?: DzBoxSchedule };

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
// `boxSchedule` is the one `complex` param, typed `any` by SliceFromParams; storeTypes.ts gives it DzBoxSchedule.
type SliceIsTyped = MustBeNever<Exclude<AnyKeys<SliceFromParams<typeof DzFormulaFeature['params']>>, 'boxSchedule'>>;
