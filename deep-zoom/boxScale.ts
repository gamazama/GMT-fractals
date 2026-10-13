/**
 * deep-zoom/boxScale.ts - the store never holds a Mandelbox scale the renderer cannot draw.
 *
 * PURPOSE
 *   The Mandelbox's Scale row runs from -4 to 4, and the renderer draws no |scale| under 1.02 (at 1
 *   nothing escapes: grep `applyFormula` in deep-zoom/renderer/core.js). A row that showed 0.4
 *   while the renderer drew 1.02 would be a control that lies. So a value inside the band is moved,
 *   in the STORE, onto the nearer of -1.02 and 1.02 (`validBoxScale` in features/formula.ts) - for
 *   every writer alike: the slider, a typed number, a pasted place, a loaded scene, a keyframe.
 *
 * WHY HERE AND NOT IN THE PARAM. A DDFS param has no hook that can replace its own incoming value
 *   (`onSet` adds OTHER keys and never overwrites one that was written), and the engine's setter is
 *   not this app's to change. This is one store subscription, installed once from main.tsx.
 *
 * WHAT A DRAG DOES. The slider and the number beside it compute from where the drag STARTED, so a
 *   drag through the band keeps moving: the row sits on 1.02, then on -1.02 from the moment the
 *   pointer passes 0, then follows again below -1.02. The corrected write lands inside the drag's
 *   own undo bracket, so the drag is still one undo step.
 *
 * PITFALL: a keyframed scale that passes through the band is corrected on every frame it is in it
 *   (one extra store write a frame). The picture holds at 1.02 or -1.02 meanwhile.
 *
 * KALIBOX'S SCALE (`kaliScale`, 2026-10-12) is held to the same band by the same rule: the renderer
 *   keeps its |scale| at or above 1.02 as it keeps the Mandelbox's.
 */
import { useEngineStore } from '../store/engineStore';
import { validBoxScale } from './features/formula';

let installed = false;

/** Call once, after the store exists. */
export function installBoxScaleRule(): void {
    if (installed) return;
    installed = true;
    for (const key of ['boxScale', 'kaliScale'] as const) {
        useEngineStore.subscribe(
            (s) => s.dzFormula?.[key],
            (scale) => {
                if (typeof scale !== 'number' || !Number.isFinite(scale)) return;
                const valid = validBoxScale(scale);
                if (valid !== scale) useEngineStore.getState().setDzFormula({ [key]: valid });
            },
        );
    }
}
