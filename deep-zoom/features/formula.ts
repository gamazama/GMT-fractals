/**
 * deep-zoom/features/formula.ts — the DDFS feature `dzFormula` (dock tab Formula).
 *
 * PURPOSE
 *   The five values that decide the SHAPE being drawn: the Mandelbulb power, its two phase
 *   offsets, and the iteration budget. Declaring them as a feature is what gives each one a panel
 *   row, an undo step, a preset field and a keyframe track (`dzFormula.power`, ...).
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate` — the engine does not draw this picture;
 *   the shell's host sync (BUILD-PLAN package S2-3, `deep-zoom/host/paramMap.ts`) pushes a changed
 *   value through these handles of `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     power           api.setPower(n)            clamps to 2..16 and truncates (`n|0`)
 *     phaseTheta      api.setPhase(theta, phi)   ABSOLUTE, always both arguments, theta first
 *     phasePhi        api.setPhase(theta, phi)   (the page's own panel lists phi first)
 *     iterations      no setter yet. Interim: api.dz.setView({ ...api.dz.getView(), iters }),
 *                     which clamps to 4..160; module package M1 adds a setter
 *     autoIterations  no handle at all (`autoIters` is closure state in core.js) until M1
 *   This file only declares. The integrator registers the feature (`registerFeatures.ts`), derives
 *   the slice type (`storeTypes.ts`: `SliceFromParams<typeof DzFormulaFeature['params']>`) and
 *   places the rows (`panels.ts`). Until M1 the `autoIterations` row stays out of the manifest
 *   (leave it out of the item's `whitelistParams`): a row the renderer cannot honour is not shown.
 *
 * INVALIDATION
 *   Every param here is class O: the renderer rebuilds its reference orbit (grep `orbitDirty` in
 *   core.js), which is heavy at depth — about one BigInt evaluation per iteration — and restarts
 *   the still. The sync layer debounces these during a drag. `autoIterations` raises no flag by
 *   itself; it costs an orbit rebuild each time it raises the live count.
 *
 * PITFALLS
 *   - AUTO ITERATIONS: `iterations` IS THE USER'S FLOOR, NOT THE LIVE COUNT. With auto on, the
 *     renderer raises its own count every frame as the zoom deepens and never lowers it (grep
 *     `auto iteration budget` in core.js: 32 + 1.35 per decade, capped at 160, deep mode only).
 *     The live number is `api.dz.telemetry().iters` and is shown beside the slider by a readout
 *     widget. It is NEVER written back into this param: a write-back would turn flying deeper into
 *     undo steps and scene-file changes, and a sync that re-pushed the stored floor on every
 *     change would fight the renderer and rebuild the orbit twice a frame.
 *   - A SECOND WRITER. `api.dz.setView(view)` also writes iterations, power and phase, and path
 *     playback writes all three on every frame (grep `function pathApplyCR`). The shell applies a
 *     jump through this feature's setter so the store stays the one owner (BLUEPRINT section 2).
 *   - NAMING. A track id containing `rot`, `phase` or `twist` is interpolated as an angle that
 *     wraps at 2 pi (grep `isRotation` in `engine/AnimationEngine.ts`, `isRotationTrack` in
 *     `utils/timelineUtils.ts`). That is correct for `phaseTheta` / `phasePhi`, which are radians
 *     in 0..2 pi. Do not add a non-angle param whose id contains one of those three strings.
 *   - No key may start with `is`: saved scenes and share links drop such keys (grep
 *     `startsWith('is')`: `sanitizeFeatureState` in `utils/PresetLogic.ts`, `quantize` in
 *     `utils/UrlStateEncoder.ts`).
 *   - `power` and `iterations` are `int` params, but a keyframed or modulated value arrives as a
 *     fraction. `api.setPower` truncates; whatever pushes `iterations` must round it.
 *
 * @invariant No key of the `dzFormula` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` for the four numeric keys and `boolean` for `autoIterations` — proven by:
 *   npm run typecheck ("does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the
 *   foot of this file). Falsified 2026-10-08: with `satisfies FeatureDefinition` swapped for a
 *   `: FeatureDefinition` annotation (the fluid-toy idiom), tsc reported "Type 'string' does not
 *   satisfy the constraint 'never'" on that line; the annotation widens `params` to
 *   `Record<string, ParamConfig>` and every slice key becomes `any`.
 * @assumption Every default, range and step here equals the renderer's own (read 2026-10-08 in
 *   core.js: `let nPower`, `let phaseTheta`, `const cam = {` for `iters: 14`, `let autoIters`, and
 *   the `CTLS` rows 'power n', 'phase', 'iters'). No guard checks it yet; the stage-2 smoke step
 *   "every feature default equals the module's settings read at ready" is the intended proof.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';

export const DzFormulaFeature = {
    id: 'dzFormula',
    name: 'Formula',
    category: 'Fractal',

    tabConfig: {
        label: 'Formula',
    },

    params: {
        power: {
            type: 'int',
            default: 8, min: 2, max: 16, step: 1,
            label: 'Power',
        },
        phaseTheta: {
            type: 'float',
            default: 0, min: 0, max: 6.2832, step: 0.02,
            label: 'Phase theta',
        },
        phasePhi: {
            type: 'float',
            default: 0, min: 0, max: 6.2832, step: 0.02,
            label: 'Phase phi',
        },
        iterations: {
            type: 'int',
            default: 14, min: 4, max: 160, step: 1,
            label: 'Iterations',
            description: 'The lowest iteration count. With Auto iterations on, the live count rises with depth and can be higher than this.',
        },
        autoIterations: {
            type: 'boolean',
            default: true,
            label: 'Auto iterations',
            description: 'In deep mode, raises the live iteration count with depth: 32 plus 1.35 for each decade, up to 160. It never lowers it.',
        },
    },
} satisfies FeatureDefinition;

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
type SliceIsTyped = MustBeNever<AnyKeys<SliceFromParams<typeof DzFormulaFeature['params']>>>;
