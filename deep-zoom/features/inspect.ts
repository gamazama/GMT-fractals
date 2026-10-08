/**
 * deep-zoom/features/inspect.ts — the DDFS feature `dzInspect` (a collapsible in the Quality tab).
 *
 * PURPOSE
 *   Three ways of LOOKING at the render that are not part of the picture: one ingredient of the
 *   shading on its own (`channel`), a split comparison at the mouse (`compare`), and how much the
 *   shell draws over the picture (`overlays`).
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate`; the shell's host sync (BUILD-PLAN
 *   package S2-3, `deep-zoom/host/paramMap.ts`) pushes a changed value through `instance.api`:
 *     channel    api.setLook({ view })      view = channelToRenderer(index): 0, 2, 3, 4, 5
 *     compare    api.setLook({ compare })   compareToRenderer(index): 0, 1, 2, 3
 *     overlays   NOT a renderer value. The shell reads it (`overlaysFromIndex(index)`: 'all' |
 *                'depth-only' | 'none') to decide which readouts it draws
 *   ENUMS. All three are enums: a float holding the option's INDEX (`engine/defineEnumParam.ts`).
 *   Each exports `X_OPTIONS` (option names, dropdown order); the two the renderer takes also export
 *   `X_RENDERER_VALUES` (the renderer's value for each option, same order — use `indexOf` on it to
 *   go from a renderer value back to an index) and `xToRenderer(index)` (floors; an out-of-range
 *   or missing index gives the DEFAULT option, as `fromIndex` does).
 *   This file only declares. The integrator registers the feature (`registerFeatures.ts`), derives
 *   the slice type (`storeTypes.ts`: `SliceFromParams<typeof DzInspectFeature['params']>`) and
 *   places the rows (`panels.ts`).
 *
 * INVALIDATION
 *   `channel` and `compare` are class A (`api.setLook` restarts the still; no orbit rebuild, no
 *   compile). `overlays` touches nothing in the renderer.
 *
 * PITFALLS
 *   - `channel` AND `compare` ARE SESSION-ONLY BUT THE ENGINE WILL SAVE THEM. They must not come
 *     back from a scene file — a scene that reopens on a grey depth view looks broken. The engine
 *     has no "do not save" flag (ENGINE-GAPS E13), so nothing in this file can say it. The interim
 *     is the integrator's: a preset field with no `serialize` output whose `deserialize` sets both
 *     back to their defaults (preset fields run after every feature setter — grep
 *     `presetFieldRegistry.applyAll` in `utils/PresetLogic.ts`). Until that field is registered, a
 *     loaded scene DOES restore both.
 *   - They are ordinary params in every other way too: the undo snapshot holds this slice like any
 *     other (grep `getParamSnapshot` in `store/slices/historySlice.ts`), and a preset load that
 *     omits the feature puts them back to default.
 *   - `overlays` is `userScoped: true`: a loaded scene never overwrites it; the live value is kept
 *     (grep `config.userScoped` in `utils/PresetLogic.ts`). That flag does not store it across a
 *     reload — nothing in the engine persists a userScoped param by itself.
 *   - `channel` IS NOT ITS INDEX. The renderer's values are 0, 2, 3, 4, 5 (1 is unused). Push
 *     `channelToRenderer(index)`, never the slice value.
 *   - THE NEW SHADING ONLY. In core.js `uView` and the Normals compare are read inside
 *     `if (uLook == 1)`: with the classic shading (`dzLight.shading`), `channel` and
 *     `compare` = Normals change nothing on screen. No condition says so here, because a
 *     condition on another feature's enum would key this file off that feature's option order.
 *   - `compare` other than Off makes the renderer follow the mouse: the divider (`look.split`,
 *     never stored) tracks the pointer across the canvas's horizontal span — panels over the
 *     canvas included — and restarts the still on every move (see "pointer" in the header of
 *     `deep-zoom/renderer/index.ts`). It is not followed while the pointer is locked.
 *   - `compare` overrides two quality settings while it is on: Normals forces the 4-tap normals
 *     into the G-buffer (grep `const gNormalMode`), Landing draws hit landing off on the left and
 *     on on the right whatever `dzQuality.hitLanding` says, and Refine draws hit refine off on the
 *     left and on on the right (with `dzQuality.hitRefine` halvings, 4 when that is 0).
 *   - WHY EVERY ENUM RESTATES `type: 'float'`: see the same heading in `quality.ts`. Without it
 *     the slice key is `any`.
 *   - No key may start with `is` (saved scenes and share links drop such keys), and no id may
 *     contain `rot`, `phase` or `twist` unless it is an angle (the timeline wraps those at 2 pi).
 *
 * @invariant No key of the `dzInspect` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` for all three keys — proven by: npm run typecheck ("Type '"channel"'
 *   does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the foot of this file).
 *   Falsified 2026-10-08: with `type: 'float'` removed from the `channel` entry, tsc reported
 *   exactly that line and key.
 * @assumption The defaults equal the renderer's own (read 2026-10-08 in core.js: `view: 0` and
 *   `compare: 0` in `const look = {`, and the `CTLS` rows 'view' and 'compare' for the values).
 *   No guard checks it yet; neither value is in `api.dz.settings()` — read `api.look.view` and
 *   `api.look.compare`.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';
import { defineEnumParam } from '../../engine/defineEnumParam';

// ── Channel — core.js: `view: 0` in `const look = {`; the shader's `uView`.
export const CHANNEL_OPTIONS = ['picture', 'normals', 'depth', 'occlusion', 'light'] as const;
/** `api.setLook({ view })`, in option order. NOT contiguous: 1 is unused. */
export const CHANNEL_RENDERER_VALUES = [0, 2, 3, 4, 5] as const;
const channelParam = defineEnumParam(CHANNEL_OPTIONS, 'Channel', { defaultIndex: 0 });
export const channelToRenderer = (index: number | undefined) =>
    CHANNEL_RENDERER_VALUES[CHANNEL_OPTIONS.indexOf(channelParam.fromIndex(index))];

// ── Compare — core.js: `compare: 0` in `const look = {`; the shader's `uCompare`.
export const COMPARE_OPTIONS = ['off', 'normals', 'landing', 'refine'] as const;
/** `api.setLook({ compare })`, in option order. */
export const COMPARE_RENDERER_VALUES = [0, 1, 2, 3] as const;
const compareParam = defineEnumParam(COMPARE_OPTIONS, 'Compare', { defaultIndex: 0 });
export const compareToRenderer = (index: number | undefined) =>
    COMPARE_RENDERER_VALUES[COMPARE_OPTIONS.indexOf(compareParam.fromIndex(index))];

// ── Overlays — the shell's own; the renderer never sees it.
export const OVERLAYS_OPTIONS = ['all', 'depth-only', 'none'] as const;
const overlaysParam = defineEnumParam(OVERLAYS_OPTIONS, 'Overlays', { defaultIndex: 0 });
/** Slice index -> 'all' | 'depth-only' | 'none'. */
export const overlaysFromIndex = overlaysParam.fromIndex;

export const DzInspectFeature = {
    id: 'dzInspect',
    name: 'Inspect',
    category: 'Render',

    tabConfig: {
        label: 'Inspect',
    },

    params: {
        channel: {
            ...channelParam.config,
            type: 'float',
            description: 'One ingredient of the picture on its own: the surface normals, the depth, the occlusion, or the key light that reaches the surface. New shading only.',
        },
        compare: {
            ...compareParam.config,
            type: 'float',
            description: 'Splits the picture at the mouse. Normals: 4-tap on the left, from depth on the right. Landing: hit landing off on the left, on on the right. Refine: hit refine off on the left, on on the right (4 halvings, or what Hit refine is set to).',
        },
        overlays: {
            ...overlaysParam.config,
            type: 'float',
            userScoped: true,
            description: 'What is drawn over the picture: every readout, the depth readout alone, or nothing.',
        },
    },
} satisfies FeatureDefinition;

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
type SliceIsTyped = MustBeNever<AnyKeys<SliceFromParams<typeof DzInspectFeature['params']>>>;
