/**
 * deep-zoom/features/light.ts — the DDFS feature `dzLight` (dock tab Light).
 *
 * PURPOSE
 *   How the surface is lit: which shading runs (Classic / New), which lights are on, where the key
 *   light stands, and five strengths of the New shading (shadows, occlusion, sky, roughness, haze).
 *   Eleven params. Declaring them as a feature gives each a panel row, an undo step, a preset field
 *   and a keyframe track (`dzLight.keyTurn`, ...).
 *
 * THIS IS THE INTERIM FOR THE LIGHT STUDIO
 *   `dzLight` is what lights the picture until stage L lands (BUILD-PLAN package L5). At L5 five
 *   keys leave this feature for the shared light list (feature `lighting`, key `lights`) through
 *   one scene migration: `lightType`, `lampFalloff`, `keyElevation`, `keyTurn`, `lightTint`.
 *   `shading`, `shadows`, `occlusion`, `sky`, `roughness` and `haze` stay. So: ADD NO DEPENDENT ON
 *   THOSE FIVE KEYS — no condition in another feature, no bridge, no shortcut, no saved-location
 *   field that names them. The two light-type indices below are deliberately not exported.
 *
 * THE SEAM
 *   The engine store OWNS these values. The renderer (`deep-zoom/renderer`) is a sink: it is told,
 *   never asked. No param here has `uniform` or `onUpdate` — the engine does not draw this picture;
 *   the shell's host sync (BUILD-PLAN package S2-3, `deep-zoom/host/paramMap.ts`) pushes a changed
 *   value through these handles of `instance.api` (read in `deep-zoom/renderer/core.js`):
 *     shading        api.setLook({ mode })         mode = shadingToRenderer(index): 0 classic, 1 new
 *     lightType      api.setLight(m, falloff)      m = lightTypeToRenderer(index): 0, 1, 2. ALWAYS
 *     lampFalloff    api.setLight(m, falloff)        both arguments: see pitfalls
 *     keyElevation   api.setLook({ keyElev })      degrees
 *     keyTurn        api.setLook({ keyTurn })      degrees
 *     lightTint      api.setLook({ tint })
 *     shadows        api.setLook({ shadow })
 *     occlusion      api.setLook({ ao })
 *     sky            api.setLook({ sky })
 *     roughness      api.setLook({ rough })
 *     haze           api.setLook({ haze })
 *   `api.setLook(o)` is `Object.assign(look, o)`: one call may carry several keys, and a key it
 *   does not know is stored and ignored. Read-back: `api.dz.settings()` gives `lookMode`, `light`
 *   and `falloff`; the other eight are on `api.look` under the names above.
 *   ENUMS. `shading` and `lightType` are floats holding the option's INDEX
 *   (`engine/defineEnumParam.ts`). Each exports `X_OPTIONS` (option names, dropdown order),
 *   `X_RENDERER_VALUES` (the renderer's value for each option, same order — use `indexOf` on it to
 *   go from a renderer value back to an index) and `xToRenderer(index)` (floors; an out-of-range or
 *   missing index gives the DEFAULT option, as `fromIndex` does).
 *   `SHADING_NEW_INDEX` is exported for one known reader: the Inspect feature's `channel` view and
 *   Normals compare act only under the New shading, so `dzInspect` may take the condition
 *   `{ param: '$dzLight.shading', eq: SHADING_NEW_INDEX }`.
 *   This file only declares. The integrator registers the feature (`registerFeatures.ts`), derives
 *   the slice type (`storeTypes.ts`: `SliceFromParams<typeof DzLightFeature['params']>`) and
 *   places the rows (`panels.ts`).
 *
 * WHEN EACH ROW IS SHOWN — a row is shown exactly when the shading pass reads its value
 *   (grep `if (uLook == 1)`, `uLightMode != 1`, `uLightMode != 0` in core.js):
 *     shading, lightType                              always
 *     lampFalloff                                     lightType is Lamp or Both
 *     keyElevation, keyTurn, lightTint, shadows       shading is New AND lightType is not Lamp
 *     occlusion, sky, roughness, haze                 shading is New
 *   This departs from BLUEPRINT section 3, which shows `lightType` and `lampFalloff` under the
 *   Classic shading only. The New shading reads the light type too: Lamp switches the key, the
 *   fill, the kicker and every shadow OFF and lights with the camera lamp and the sky alone; Both
 *   adds the lamp to them. Hidden under New, the light type would be a value that changes the
 *   picture with no row to change it back, and the four key-light rows would move nothing.
 *
 * INVALIDATION
 *   Every param is class A: the setter restarts the still (`accumReset`). No orbit rebuild, no
 *   shader compile.
 *
 * PITFALLS
 *   - DEEP PATH ONLY, ALL ELEVEN. The f32 baseline (the picture only while the deep shader is
 *     still compiling, since 2026-10-08; grep `deepActive = deepProg`) draws with its own small shader (grep `const FRAG =` in core.js):
 *     one camera-fixed light, one fixed colour, none of these inputs. Until the renderer reports
 *     `api.dz.telemetry().mode === 'deep'` no row of this tab changes a pixel. No condition can
 *     say so here: the mode is renderer telemetry, not store state.
 *   - THE NEW SHADING STARTS AS CLASSIC FOR A MOMENT. The renderer draws New only once it has
 *     measured its light rig from a first deep frame (grep `const newLook =`); before that the
 *     classic shader runs whatever `shading` says.
 *   - `api.setLight(m, f)` is `lightMode = m|0; if (f) falloffMul = f`. Called with the falloff
 *     alone it sets the light type to Direct (`undefined|0` is 0). Always pass both, light type
 *     first. It does not clamp the falloff.
 *   - A SECOND WRITER. `api.dz.setView(view)` writes the light type and the lamp falloff from
 *     `view.light` / `view.falloff` (grep `setView: (v) =>`). The shell applies a jump through this
 *     feature's setter so the store stays the one owner (BLUEPRINT section 2). Recorded keyframes
 *     carry both fields too, but path playback does not apply them (grep `function pathApplyCR`).
 *     The module's own keys L, T and Y write them as well; the shell creates the module with
 *     `shortcuts: false`, which switches those off (grep `dzShortcuts`).
 *   - `sky` IS NOT THE UNIFORM. The renderer multiplies it by 0.33 on the way to the shader (grep
 *     `look.sky * 0.33`); the value here is the renderer's `look.sky`, 0.3 by default.
 *   - `keyTurn` turns the key AND the fill (grep `look.fillAz + look.keyTurn`). The kicker is fixed
 *     to the camera.
 *   - NAMING. A track id containing `rot`, `phase` or `twist` is interpolated as an angle that
 *     wraps at 2 pi (grep `isRotationTrack` in `utils/timelineUtils.ts`, `isRotation` in
 *     `engine/AnimationEngine.ts`). `keyTurn` and `keyElevation` are in DEGREES and are named so on
 *     purpose: never `keyRotation`. No id here contains one of the three strings.
 *   - SEVENTEEN MORE LOOK FIELDS ARE NOT HERE. `look` in core.js also holds exposure, saturation,
 *     occlusion radius, shadow softness and length, haze colour, the key, fill and kicker
 *     strengths, the fill and kicker colours, metallic, reflectivity, diffuse, and three more
 *     angles (key azimuth, fill azimuth, fill elevation). They have defaults and no
 *     range anywhere in the renderer; a slider with a guessed range is a control the renderer may
 *     not honour (BLUEPRINT section 3, DECISIONS D13). Add one only with a range read out of the
 *     shading pass.
 *   - WHY BOTH ENUMS RESTATE `type: 'float'`: see the same heading in `quality.ts`. Without it the
 *     slice key is `any`; the guard at the foot of the file goes red, naming the key.
 *   - No key may start with `is`: saved scenes and share links drop such keys.
 *
 * @invariant No key of the `dzLight` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` for all eleven keys — proven by: npm run typecheck ("Type '"shading"'
 *   does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the foot of this file).
 *   Falsified 2026-10-08: with `type: 'float'` removed from the `shading` entry, tsc reported
 *   exactly that line and key.
 * @assumption Every default, range and step here equals the renderer's own (read 2026-10-08 in
 *   core.js: `mode: 1`, `keyElev: 40`, `keyTurn: 0`, `tint: 0.5`, `shadow: 1.0`, `ao: 1.0`,
 *   `sky: 0.3`, `rough: 0.75`, `haze: 0.0` in `const look = {`; `let lightMode = 0, falloffMul =
 *   4.0`; and the `CTLS` rows 'look', 'lighting', 'falloff', 'key height', 'key turn', 'light
 *   colour', 'shadows', 'occlusion', 'sky', 'roughness', 'haze'). No guard checks it yet; the
 *   stage-2 smoke step "every feature default equals the module's settings read at ready" is the
 *   intended proof.
 * @assumption The "when each row is shown" table matches the shading pass. It was read from the
 *   GLSL, not measured: no check moves a hidden row's value and compares pixels.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { SliceFromParams } from '../../engine/typedSlices';
import { defineEnumParam } from '../../engine/defineEnumParam';

// ── Shading — core.js: `mode: 1` in `const look = {`; the shader's `uLook`.
export const SHADING_OPTIONS = ['classic', 'new'] as const;
/** `api.setLook({ mode })`, in option order. */
export const SHADING_RENDERER_VALUES = [0, 1] as const;
const shadingParam = defineEnumParam(SHADING_OPTIONS, 'Shading', { defaultIndex: 1 });
export const shadingToRenderer = (index: number | undefined) =>
    SHADING_RENDERER_VALUES[SHADING_OPTIONS.indexOf(shadingParam.fromIndex(index))];
/** The slice index of Shading = New. For conditions here, and for `dzInspect` (see the header). */
export const SHADING_NEW_INDEX = SHADING_OPTIONS.indexOf('new');

// ── Light type — core.js: `let lightMode = 0`; the shader's `uLightMode`.
export const LIGHT_TYPE_OPTIONS = ['direct', 'lamp', 'both'] as const;
/** `api.setLight(m, falloff)`, in option order. */
export const LIGHT_TYPE_RENDERER_VALUES = [0, 1, 2] as const;
const lightTypeParam = defineEnumParam(LIGHT_TYPE_OPTIONS, 'Light type', { defaultIndex: 0 });
export const lightTypeToRenderer = (index: number | undefined) =>
    LIGHT_TYPE_RENDERER_VALUES[LIGHT_TYPE_OPTIONS.indexOf(lightTypeParam.fromIndex(index))];
// Not exported: `lightType` leaves this feature at L5 (see the header).
const LIGHT_TYPE_DIRECT_INDEX = LIGHT_TYPE_OPTIONS.indexOf('direct');
const LIGHT_TYPE_LAMP_INDEX = LIGHT_TYPE_OPTIONS.indexOf('lamp');

/** Shown under the New shading. */
const NEW_SHADING = { param: 'shading', eq: SHADING_NEW_INDEX };
/** Shown while the key, fill and kicker are lit: New shading, and the light type is not Lamp. */
const NEW_SHADING_KEY_LIT = [NEW_SHADING, { param: 'lightType', neq: LIGHT_TYPE_LAMP_INDEX }];

const degrees = (v: number) => `${Math.round(v)}°`;

export const DzLightFeature = {
    id: 'dzLight',
    name: 'Light',
    category: 'Look',

    tabConfig: {
        label: 'Light',
    },

    params: {
        shading: {
            ...shadingParam.config,
            type: 'float',
            description: 'Classic: one light fixed to the camera, no shadows. New: lights that follow the surface in view, with shadows and occlusion read from the depth buffer.',
        },

        // ── These five move to the shared light list at L5: see the header.
        lightType: {
            ...lightTypeParam.config,
            type: 'float',
            description: 'Direct: light from a set direction. Under the New shading that is the key, the fill and the kicker. Lamp: one light at the camera that fades with distance, and no shadows. Both: the two together.',
        },
        lampFalloff: {
            type: 'float',
            default: 4, min: 0.5, max: 32, step: 0.5,
            label: 'Lamp falloff',
            condition: { param: 'lightType', neq: LIGHT_TYPE_DIRECT_INDEX },
            description: 'How far the lamp reaches, as a multiple of the distance to the surface. At that distance the lamp is at half strength.',
        },
        keyElevation: {
            type: 'float',
            default: 40, min: 5, max: 85, step: 1,
            label: 'Key elevation',
            format: degrees,
            condition: NEW_SHADING_KEY_LIT,
            description: 'How high the key light stands above the surface in view, in degrees. Low values give long shadows.',
        },
        keyTurn: {
            type: 'float',
            default: 0, min: -180, max: 180, step: 5,
            label: 'Key turn',
            format: degrees,
            condition: NEW_SHADING_KEY_LIT,
            description: 'Turns the key and the fill around the surface in view, in degrees. At 0 the key comes from the left of the picture, a little above.',
        },
        lightTint: {
            type: 'float',
            default: 0.5, min: 0, max: 1, step: 0.05,
            label: 'Light tint',
            condition: NEW_SHADING_KEY_LIT,
            description: 'How coloured the fill and the kicker are. 0: white. 1: orange and blue.',
        },

        // ── These stay in `dzLight` after L5.
        shadows: {
            type: 'float',
            default: 1, min: 0, max: 1, step: 0.05,
            label: 'Shadows',
            condition: NEW_SHADING_KEY_LIT,
            description: 'Strength of the shadows of the key and the fill. They are found in the depth buffer: only what is in the picture casts one.',
        },
        occlusion: {
            type: 'float',
            default: 1, min: 0, max: 2, step: 0.05,
            label: 'Occlusion',
            condition: NEW_SHADING,
            description: 'Darkens crevices and pits: how much of the open sky the surroundings of each point hide.',
        },
        sky: {
            type: 'float',
            default: 0.3, min: 0, max: 2, step: 0.05,
            label: 'Sky',
            condition: NEW_SHADING,
            description: 'Strength of the sky dome that lights what the key does not reach.',
        },
        roughness: {
            type: 'float',
            default: 0.75, min: 0.1, max: 1, step: 0.05,
            label: 'Roughness',
            condition: NEW_SHADING,
            description: 'Low: a tight, bright highlight. High: a broad, soft sheen.',
        },
        haze: {
            type: 'float',
            default: 0, min: 0, max: 1, step: 0.05,
            label: 'Haze',
            condition: NEW_SHADING,
            description: 'Fades the far part of the view toward a dark blue. Scaled to the depth in view.',
        },
    },
} satisfies FeatureDefinition;

/* Compile-time guard for the @invariant in the header. `AnyKeys` is the union of the slice keys
   typed `any` (never when there are none); `MustBeNever` refuses anything else, so tsc names the
   offending key. Type-only: nothing of this reaches the bundle. */
type AnyKeys<S> = { [K in keyof S]: 0 extends 1 & S[K] ? K : never }[keyof S];
type MustBeNever<T extends never> = T;
type SliceIsTyped = MustBeNever<AnyKeys<SliceFromParams<typeof DzLightFeature['params']>>>;
