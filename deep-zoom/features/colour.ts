/**
 * deep-zoom/features/colour.ts — the DDFS feature `dzColour` (dock tab Colour).
 *
 * PURPOSE
 *   What colour the surface is: one plain colour, or a palette looked up by a value of the orbit
 *   (the mapping) at a frequency (the scale). Three params today: `plain`, `mode`, `scale`. The
 *   gradient arrives in stage 5 (see STAGE 5 below).
 *
 * THE NUMBERS AND NAMES ARE GMT'S (DECISIONS K8)
 *   `mode` stores GMT's own mapping-mode NUMBER, exactly as GMT's colouring feature stores it
 *   (grep `MAPPING_MODES` in `engine-gmt/features/coloring/MappingModes.ts`; `mode:` in
 *   `engine-gmt/features/coloring/index.ts` is a float whose options carry explicit `value`s), and
 *   the frequency is named `scale` as there. A GMT colouring block (`mode`, `scale`, later `offset`,
 *   `bias`) is meant to read across into this slice with no migration. Therefore:
 *   - `mode` is NOT built with `defineEnumParam`: that helper stores the option's index.
 *   - Only the GMT numbers the renderer can draw today are offered: 0 (Orbit Trap) and
 *     1 (Iterations). Never give a number here a meaning GMT does not give it, and never invent
 *     a number GMT does not have.
 *   - RESERVED, not offered until the renderer computes them: 5 (Normal), 7 (Raw Iterations),
 *     8 (Potential), 13 (Orbit W). 13 is the log of the SQUARED minimum, twice mode 0's value;
 *     today it would draw mode 0's picture, so it is not a second option.
 *   - RESERVED NAMES: `offset` and `bias` (GMT: `offset` default 0; `bias`, labelled Gamma, default
 *     1, 0.1..10). The renderer has no input for either — its lookup is `palette(s * uColorScale)`
 *     — so what it draws is GMT's offset 0, bias 1. Add them when the renderer honours them, under
 *     exactly those names, and use the names for nothing else.
 *
 * WHAT THE RENDERER DRAWS TODAY, AGAINST GMT — the known gaps
 *   The renderer has three colour modes of its own (core.js: `let colorMode`, `float
 *   paletteParam(`, `vec3 albedoNew(`). GMT's value for a mode is `getMappingValue` in
 *   MappingModes.ts, looked up as `pow(abs(fract(mod(v * scale + offset, 1.0))), bias)` (grep
 *   `t1Raw` in `engine-gmt/shaders/chunks/material_eval.ts`).
 *     renderer 0, plain — NO GMT NUMBER. Not a mapping: one constant colour, (0.9, 0.9, 0.9) under
 *       the New shading and (0.62, 0.55, 0.78) under Classic; no value, no palette, `scale`
 *       unread. GMT has no such mode — it gets that picture from a one-stop gradient under any
 *       mode. So it is stored as the boolean `plain`, never as a mode number.
 *     renderer 2, orbit trap = GMT 0. The same quantity, the minimum |z_k| over the orbit after
 *       each step (the kernel keeps the square and hands back `sqrt(trap)`, grep `hpDirectTrap`;
 *       GMT's Mandelbulb: grep `trap = min(trap, length(z3))` in `engine-gmt/formulas/`), and
 *       the same natural log. The constant differs: renderer `1.5 * log(max(t, 1e-30))`, GMT
 *       `-0.2 * log(max(1e-5, t))` (`logTrap`). The renderer's value is -7.5 times GMT's
 *       (`ORBIT_TRAP_GMT_SCALE_RATIO`): `scale` S here draws what GMT draws at scale -7.5 * S —
 *       bands 7.5 times as dense, the ramp run the other way. The floors differ below t = 1e-5,
 *       and with BLA on the renderer samples the trap only where a BLA run ends.
 *     renderer 1, iteration = GMT 1. The same idea, a smooth escape count; not the same number.
 *       Renderer: `0.18 * (n + 1 - log(log|z|) / log(power))`, |z| at the first step past radius
 *       2. GMT: `(n + 1 - log2(log2(|z|^2) / log2(escape))) / iterations`, |z| at the DE bailout
 *       (grep `smoothIter = iter + 1.0` in `engine-gmt/engine/estimators.ts`, `colorIterNorm` in
 *       `engine-gmt/shaders/chunks/de.ts`), plus a branch above 0.99 that swaps in a value made
 *       from the trap. GMT divides by the iteration count and the renderer does not: `scale` S
 *       here is near GMT's `0.18 * iterations * S`, and that factor moves whenever auto
 *       iterations raise the count.
 *     THE PALETTE is the renderer's built-in cosine ramp (grep `vec3 palette(float s)`); GMT always
 *       samples a gradient. Stage 5 brings the gradient.
 *   WHO CLOSES THEM: the stage-5 module adapter (GMT-SYSTEMS 2.3, "Module computes GMT's values" /
 *   "Module's shading pass uses the same expression and GMT's param names"). Until it lands,
 *   `scale` is GMT's NAME over the RENDERER'S number: its range, step and default are the
 *   renderer's own (`CTLS` row 'palette': 0.1..16, 0.1; `colorScale = 1.0`) — GMT's `scale` has no
 *   range at all (it is hidden there and driven by a histogram widget). When the adapter lands, a
 *   scene saved before it with Orbit trap keeps its picture only if its `scale` is multiplied by
 *   `ORBIT_TRAP_GMT_SCALE_RATIO`; Iterations has no exact factor.
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate`; the shell's host sync (BUILD-PLAN
 *   package S2-3, `deep-zoom/host/paramMap.ts`) pushes all three through ONE handle of
 *   `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     plain, mode, scale    api.setColor(m, scale)    m = colourToRenderer(plain, mode): 0, 1, 2
 *   Exports for the map: `COLOUR_MODE_OPTIONS` / `COLOUR_MODE_GMT_VALUES` /
 *   `COLOUR_MODE_RENDERER_VALUES` (option names, the number stored, the renderer's mode — same
 *   order), the two lookup tables `GMT_MODE_TO_RENDERER` and `RENDERER_TO_GMT_MODE`,
 *   `colourModeToRenderer(mode)`, `colourToRenderer(plain, mode)` and, for applying a renderer
 *   value (a view's `color`) through this feature's setter, `colourFromRenderer(m)`.
 *   Read-back: `api.dz.settings()` gives `color` (the renderer's mode) and `cscale`.
 *   This file only declares. The integrator registers the feature (`registerFeatures.ts`), derives
 *   the slice type (`storeTypes.ts`: `SliceFromParams<typeof DzColourFeature['params']>`) and
 *   places the rows (`panels.ts`).
 *
 * STAGE 5 (BUILD-PLAN package S5-1) edits this file: it adds `useGradient` and `gradient` at the
 *   marked place in `params`. The renderer's own gradient loader flips its mode from plain to
 *   orbit trap behind the caller's back (grep `give the gradient something to colour`); the shell
 *   is to do that openly, in the same store write as the gradient: `plain: false`. `mode` then
 *   already holds a mapping — 0, Orbit trap, by default — so "a gradient set while Plain also sets
 *   Orbit trap" (BLUEPRINT section 3) holds without touching `mode`.
 *
 * INVALIDATION
 *   Class A, all three: `api.setColor` restarts the still. No orbit rebuild, no shader compile.
 *
 * PITFALLS
 *   - DEEP PATH ONLY. The f32 baseline (the picture only while the deep shader is still
 *     compiling, since 2026-10-08; grep `deepActive = deepProg`)
 *     draws with its own small shader (grep `const FRAG =` in core.js): one fixed colour, none of
 *     these inputs. Until `api.dz.telemetry().mode === 'deep'` no row of this tab changes a pixel.
 *   - `api.setColor(m, s)` is `colorMode = m|0; if (s) colorScale = s`. Called with the scale alone
 *     it sets the mode to plain; a scale of 0 is ignored; nothing is clamped. Always pass both.
 *   - SECOND WRITERS. `api.dz.setView(view)` writes the mode and the scale from `view.color` /
 *     `view.cscale`; the shell applies a jump through this feature's setter
 *     (`colourFromRenderer`) so the store stays the one owner. `api.loadGradient` and a file
 *     dropped on the module flip plain to orbit trap (see STAGE 5). The module's own keys C, 9 and
 *     0 write both; the shell creates the module with `shortcuts: false`, which switches them off.
 *   - A STORED NUMBER OUTSIDE THE OFFERED SET (say a GMT block's 5) is kept in the store, shows no
 *     selection in the dropdown, and is drawn as the default mapping until the renderer computes
 *     it. `colourModeToRenderer` does that; it also takes a keyframed fraction the way GMT's
 *     shader does (`int(mode + 0.1)`).
 *   - `plain` hides the two rows below it; their values are kept, and pushed, whatever it is.
 *   - `scale` here is the PARAM KEY. `ParamConfig.scale` (the slider curve) is a different thing
 *     and is not set: the slider is linear, as the renderer's own.
 *   - GMT's histogram controls `repeats` and `phase` are not reserved here. An id containing `rot`,
 *     `phase` or `twist` is interpolated as an angle that wraps at 2 pi (grep `isRotationTrack` in
 *     `utils/timelineUtils.ts`), and no key may start with `is` (saved scenes and share links drop
 *     such keys).
 *
 * @invariant No key of the `dzColour` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `boolean` for `plain` and `number` for `mode` and `scale` — proven by: npm run
 *   typecheck ("does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the foot of
 *   this file). Falsified 2026-10-08: with `satisfies FeatureDefinition` swapped for a
 *   `: FeatureDefinition` annotation, tsc reported "Type 'string' does not satisfy the constraint
 *   'never'" on that line; the annotation widens `params` and every slice key becomes `any`.
 * @assumption The two numbers offered equal GMT's: 0 is Orbit Trap and 1 is Iterations in
 *   `MAPPING_MODES`. They are restated here, not imported — nothing under `deep-zoom/` imports
 *   `engine-gmt/` — so no compiler or check ties them together. GMT cannot renumber without
 *   breaking its own saved scenes.
 * @assumption The defaults equal the renderer's own (read 2026-10-08 in core.js: `let colorMode =
 *   0, colorScale = 1.0`, and the `CTLS` rows 'colour' and 'palette'). No guard checks it yet; the
 *   stage-2 smoke step "every feature default equals the module's settings read at ready" is the
 *   intended proof, read as `colourToRenderer(plain, mode) === settings().color`.
 * @assumption The gap table above was read from the two shaders, not measured: no check renders
 *   one view in both and compares the lookup positions.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';

// ── Mapping — the slice stores GMT's mode number (`MAPPING_MODES`), not an index.
export const COLOUR_MODE_OPTIONS = ['orbit-trap', 'iterations'] as const;
/** GMT's mapping-mode number for each option: what the slice stores. Same order. */
export const COLOUR_MODE_GMT_VALUES = [0, 1] as const;
/** The renderer's own colour mode for each option (`api.setColor(m, scale)`). Same order. */
export const COLOUR_MODE_RENDERER_VALUES = [2, 1] as const;
const COLOUR_MODE_LABELS = ['Orbit trap', 'Iterations'] as const;
/** The renderer's colour mode for `plain`. It has no GMT number: see the header. */
export const RENDERER_COLOUR_PLAIN = 0;
const DEFAULT_MODE_INDEX = 0;

/** GMT mapping-mode number -> the renderer's colour mode. Only the numbers offered today. */
export const GMT_MODE_TO_RENDERER: Readonly<Record<number, number | undefined>> = Object.fromEntries(
    COLOUR_MODE_GMT_VALUES.map((gmt, i) => [gmt, COLOUR_MODE_RENDERER_VALUES[i]]),
);
/** The renderer's colour mode -> GMT mapping-mode number. Has no entry for plain (0). */
export const RENDERER_TO_GMT_MODE: Readonly<Record<number, number | undefined>> = Object.fromEntries(
    COLOUR_MODE_RENDERER_VALUES.map((renderer, i) => [renderer, COLOUR_MODE_GMT_VALUES[i]]),
);

/** Orbit trap only: GMT's `scale` that draws the same bands = this times the `scale` stored here
 *  (renderer `1.5 * log(t)` against GMT's `-0.2 * log(t)`). For the stage-5 adapter's migration. */
export const ORBIT_TRAP_GMT_SCALE_RATIO = 1.5 / -0.2;

/** The stored `mode` -> the renderer's colour mode (1 or 2). A fraction is truncated as GMT's
 *  shader does; a missing value, or a number not offered today, gives the default mapping. */
export const colourModeToRenderer = (mode: number | undefined): number => {
    const gmt = Math.floor((mode ?? COLOUR_MODE_GMT_VALUES[DEFAULT_MODE_INDEX]) + 0.1);
    return GMT_MODE_TO_RENDERER[gmt] ?? COLOUR_MODE_RENDERER_VALUES[DEFAULT_MODE_INDEX];
};

/** The slice -> the first argument of `api.setColor`: 0 while `plain`, else the mapping's mode. */
export const colourToRenderer = (plain: boolean | undefined, mode: number | undefined): number =>
    (plain ?? true) ? RENDERER_COLOUR_PLAIN : colourModeToRenderer(mode);

/** A renderer colour mode (a view's `color`, `settings().color`) -> the patch for this feature's
 *  setter. Plain leaves `mode` as it is. A value the renderer has no mode for reads as plain. */
export const colourFromRenderer = (rendererMode: number): { plain: true } | { plain: false; mode: number } => {
    const gmt = RENDERER_TO_GMT_MODE[rendererMode];
    return gmt === undefined ? { plain: true } : { plain: false, mode: gmt };
};

/** Shown while a palette is in use. */
const NOT_PLAIN = { param: 'plain', bool: false };

export const DzColourFeature = {
    id: 'dzColour',
    name: 'Colour',
    category: 'Look',

    tabConfig: {
        label: 'Colour',
    },

    params: {
        plain: {
            type: 'boolean',
            default: true,
            label: 'Colour',
            options: [
                { label: 'Plain', value: true },
                { label: 'Palette', value: false },
            ],
            description: 'Plain: one colour over the whole surface. Palette: a colour from the palette for each point, picked by the mapping below.',
        },
        mode: {
            type: 'float',
            default: COLOUR_MODE_GMT_VALUES[DEFAULT_MODE_INDEX],
            label: 'Mapping',
            options: COLOUR_MODE_GMT_VALUES.map((value, i) => ({ label: COLOUR_MODE_LABELS[i], value })),
            condition: NOT_PLAIN,
            description: 'Which value of the orbit picks the colour. Orbit trap: how close the orbit came to the origin. Iterations: how many steps it took to escape.',
        },
        scale: {
            type: 'float',
            default: 1, min: 0.1, max: 16, step: 0.1,
            label: 'Scale',
            condition: NOT_PLAIN,
            description: 'How often the palette repeats over the mapped value. Higher values give more, narrower bands.',
        },

        // ── STAGE 5 (BUILD-PLAN package S5-1): `useGradient` and `gradient` go HERE. See the header.
    },
} satisfies FeatureDefinition;

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
type SliceIsTyped = MustBeNever<AnyKeys<SliceFromParams<typeof DzColourFeature['params']>>>;
