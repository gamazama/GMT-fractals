/**
 * deep-zoom/features/light.ts — the DDFS feature `dzLight` (dock tab Light).
 *
 * PURPOSE
 *   How the surface is lit: which shading runs (Classic / New), which lights are on, where the key
 *   light stands, five strengths of the New shading (shadows, occlusion, sky, roughness, haze), and
 *   how the occlusion is sampled (its radius and its sample count, 2026-10-12).
 *   Thirteen params. Declaring them as a feature gives each a panel row, an undo step, a preset field
 *   and a keyframe track (`dzLight.keyTurn`, ...).
 *
 * THIS IS THE INTERIM FOR THE LIGHT STUDIO
 *   `dzLight` is what lights the picture until stage L lands (BUILD-PLAN package L5). At L5 five
 *   keys leave this feature for the shared light list (feature `lighting`, key `lights`) through
 *   one scene migration: `lightType`, `lampFalloff`, `keyElevation`, `keyTurn`, `lightTint`. (The lamp's
 *   shadows and offset, and the fill's and kicker's strengths, added since, are lights too: they go with them.)
 *   `shading`, `shadows`, `occlusion`, `occlusionRadius`, `occlusionSamples`, `bounce`, `sky`,
 *   `roughness` and `haze` stay. So: ADD NO DEPENDENT ON
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
 *     lampShadows    api.setLook({ lampShadow })   0 = none; default 1 since 2026-10-16 (grep THE
 *     lampOffset     api.setLook({ lampOffset })     LAMP'S SHADOWS in core.js); 1 = where it was
 *     keyElevation   api.setLook({ keyElev })      degrees
 *     keyTurn        api.setLook({ keyTurn })      degrees
 *     lightTint      api.setLook({ tint })
 *     fill           api.setLook({ fill })         0 to 3, the key's strength (2026-10-17)
 *     kicker         api.setLook({ kick })         0 to 3
 *     shadows        api.setLook({ shadow })
 *     occlusion      api.setLook({ ao })
 *     occlusionRadius   api.setLook({ aoRadius })  a share of the picture's height
 *     occlusionSamples  api.setLook({ aoTaps })    taps a pixel; the shader takes 1 to 32
 *     bounce         api.setLook({ bounce })       0 = none (an experiment of 2026-10-13: grep BOUNCE
 *                                                  FROM DEPTH in core.js; its radius, look.bounceRadius,
 *                                                  has no row)
 *     sky            api.setLook({ sky })
 *     roughness      api.setLook({ rough })
 *     haze           api.setLook({ haze })
 *   `api.setLook(o)` is `Object.assign(look, o)`: one call may carry several keys, and a key it
 *   does not know is stored and ignored. Read-back: `api.dz.settings()` gives `lookMode`, `light`
 *   and `falloff`; the other fifteen are on `api.look` under the names above.
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
 *     lampShadows, lampOffset                         shading is New AND lightType is Lamp or Both
 *     keyElevation, keyTurn, lightTint, fill, kicker,
 *     shadows                                         shading is New AND lightType is not Lamp
 *     occlusion, occlusionRadius, occlusionSamples,
 *     bounce, sky, roughness, haze                    shading is New
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
 *   - DEEP PATH ONLY, ALL THIRTEEN. The f32 baseline (the picture only while the deep shader is
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
 *     `view.light` / `view.falloff` (grep `setView: (v) =>`). A jump does not change the light: the
 *     shell hands the renderer a view that carries the store's own two values (`viewForHost` in
 *     deep-zoom/locations.ts), so the store stays the one owner (BLUEPRINT section 2). Recorded keyframes
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
 *   - THE TWO OCCLUSION ROWS ARE RUNTIME VALUES (2026-10-12; the owner's rule: a control he might
 *     drag never compiles a shader). The radius is a uniform (`uLookA.y`); the sample count is a
 *     uniform too (`uAoTaps`), read under a fixed loop bound of 32 (grep `MAX_TAPS` in core.js),
 *     which is where the row's maximum comes from. The radius's range is the owner's; the shading
 *     pass never lets it under 4 pixels (grep `max(uLookA.y * uRes.y, 4.0)`). At 10 samples the
 *     picture is what it was while the count was a constant of the shader, but for the last bit
 *     of two divisions: a level in 3 pixels of a million (measured; grep `MEASURED 2026-10-12`
 *     under OCCLUSION FROM DEPTH in core.js). 32 samples cost 0.3 to 0.5 ms a frame more than
 *     10 at 1024 x 1024 (same place).
 *   - FOURTEEN MORE LOOK FIELDS ARE NOT HERE. `look` in core.js also holds exposure, saturation,
 *     shadow softness and length, haze colour, the key's strength, the fill and kicker colours, metallic, reflectivity, diffuse, and three more
 *     angles (key azimuth, fill azimuth, fill elevation). They have defaults and no
 *     range anywhere in the renderer; a slider with a guessed range is a control the renderer may
 *     not honour (BLUEPRINT section 3, DECISIONS D13). Add one only with a range read out of the
 *     shading pass.
 *   - WHY BOTH ENUMS RESTATE `type: 'float'`: see the same heading in `quality.ts`. Without it the
 *     slice key is `any`; the guard at the foot of the file goes red, naming the key.
 *   - No key may start with `is`: saved scenes and share links drop such keys.
 *
 * @invariant No key of the `dzLight` slice is typed `any`: `SliceFromParams` over this feature's
 *   params gives `number` for all thirteen keys — proven by: npm run typecheck ("Type '"shading"'
 *   does not satisfy the constraint 'never'" on the `SliceIsTyped` line at the foot of this file).
 *   Falsified 2026-10-08: with `type: 'float'` removed from the `shading` entry, tsc reported
 *   exactly that line and key.
 * @assumption Every default, range and step here equals the renderer's own (read 2026-10-08 in
 *   core.js: `mode: 1`, `keyElev: 40`, `keyTurn: 0`, `tint: 0.5`, `shadow: 1.0`, `ao: 1.0`,
 *   `sky: 0.3`, `rough: 0.75`, `haze: 0.0` in `const look = {`; `let lightMode = 0, falloffMul =
 *   4.0`; and the `CTLS` rows 'look', 'lighting', 'falloff', 'key height', 'key turn', 'light
 *   colour', 'shadows', 'occlusion', 'sky', 'roughness', 'haze'; and, read 2026-10-12, `aoRadius:
 *   0.12`, `aoTaps: 10` and the rows 'occl. radius', 'occl. samples'). No guard checks it yet; the
 *   stage-2 smoke step "every feature default equals the module's settings read at ready" is the
 *   intended proof.
 * @assumption The "when each row is shown" table matches the shading pass. It was read from the
 *   GLSL, not measured: no check moves a hidden row's value and compares pixels.
 * @invariant `occlusionRadius` and `occlusionSamples` reach the renderer as the look fields
 *   `aoRadius` and `aoTaps`, in one `setLook` and no other call — proven by: npm run
 *   check:deep-zoom-param-map ("push: the occlusion's radius and sample count go as the look
 *   fields aoRadius and aoTaps, one setLook and nothing else, and read back"). Falsified
 *   2026-10-12: the samples row's field misspelt `aoTap` in host/paramMap.ts -> that line red.
 * @assumption The shading pass reads both as uniforms and nothing compiles when either moves. No
 *   standing check opens it: driven in the app on 2026-10-12 (debug/scratch/ao-rows/app-rows.mts,
 *   git-ignored): the two rows under Occlusion, the renderer at 0.3 and 32 after eight store
 *   writes, `host.building()` null throughout, the built programs' list unchanged, 66 % of a
 *   gathered still's pixels moved by the radius; hidden under Classic. A scene saved before the
 *   two rows existed loads them at 0.12 and 10 (same folder, old-scene.mts).
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
const NEW_SHADING_LAMP_LIT = [NEW_SHADING, { param: 'lightType', neq: LIGHT_TYPE_DIRECT_INDEX }];

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
            description: 'Direct: light from a set direction. Under the New shading that is the key, the fill and the kicker. Lamp: one light at the camera that fades with distance (its shadows are a row of its own, off at 0). Both: the two together.',
        },
        lampFalloff: {
            type: 'float',
            default: 4, min: 0.5, max: 32, step: 0.5,
            label: 'Lamp falloff',
            condition: { param: 'lightType', neq: LIGHT_TYPE_DIRECT_INDEX },
            description: 'How far the lamp reaches, as a multiple of the distance to the surface. At that distance the lamp is at half strength.',
        },
        // ── The lamp's shadows and its offset: experiments of 2026-10-13 (grep THE LAMP'S SHADOWS in core.js). They are
        //    the lamp's, so at L5 they go where `lampFalloff` goes.
        lampShadows: {
            type: 'float',
            default: 1, min: 0, max: 1, step: 0.05,
            label: 'Lamp shadows',
            condition: NEW_SHADING_LAMP_LIT,
            description: 'Strength of the shadows the lamp casts. The lamp stands beside the eye, so nearly everything that could shadow a point is in the picture. 0: none, as the lamp was before 2026-10-16.',
        },
        lampOffset: {
            type: 'float',
            default: 1, min: 0, max: 6, step: 0.1,
            label: 'Lamp offset',
            condition: NEW_SHADING_LAMP_LIT,
            description: 'How far off the eye the lamp is held, up and to the right. 1: where it always was. Larger: longer shadows and stronger modelling. 0: at the eye, where its shadows hide behind what casts them.',
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
        // ── The fill's and the kicker's strengths (the owner, 2026-10-17: "yes please", so shadows can go black).
        //    Lights, so at L5 they go where `lightTint` goes. The shading pass adds each on top of the key with
        //    no clamp (grep `uFillCol * nf`, `uKickCol * nk`); the range stops at the key's own strength (`key: 3.0`
        //    in `const look = {`): past it the fill is the key.
        fill: {
            type: 'float',
            default: 0.5, min: 0, max: 3, step: 0.05,
            label: 'Fill',
            condition: NEW_SHADING_KEY_LIT,
            description: 'Strength of the fill, the softer light from the other side that lifts the shadows the key leaves. 0: none, so shadows fall to what the sky gives them.',
        },
        kicker: {
            type: 'float',
            default: 0.25, min: 0, max: 3, step: 0.05,
            label: 'Kicker',
            condition: NEW_SHADING_KEY_LIT,
            description: 'Strength of the kicker, the light from below and behind the camera. 0: none.',
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
        occlusionRadius: {
            type: 'float',
            default: 0.12, min: 0.02, max: 0.5, step: 0.01,
            label: 'Occlusion radius',
            condition: NEW_SHADING,
            description: 'How far round each point the occlusion looks, as a share of the picture\'s height. Small: crevices only. Large: whole cavities.',
        },
        occlusionSamples: {
            type: 'int',
            default: 10, min: 4, max: 32, step: 1,
            label: 'Occlusion samples',
            condition: NEW_SHADING,
            description: 'More samples: less grain in a moving frame, and more time. A gathered still looks the same.',
        },
        bounce: {
            type: 'float',
            default: 0, min: 0, max: 30, step: 0.05,   // 30: the owner rendered at 20 (2026-10-14) and asked for the row to reach it
            label: 'Bounce',
            condition: NEW_SHADING,
            description: 'Light that surfaces in the picture send on to their neighbours: a lit wall colours the shadow beside it. 0: none. 1: what those surfaces would send. Only what is in the picture sends any. Grainy in a moving frame; Occlusion samples sets its sample count too.',
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
