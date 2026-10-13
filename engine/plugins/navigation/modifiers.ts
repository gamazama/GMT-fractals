// Navigation input sensitivity modifiers driven by Shift / Alt.
//
// Shift = 4× ("boost"), Alt = 0.1× ("precise"). Compose multiplicatively:
// Shift+Alt = 0.4×. Matches the camera-control convention used across
// wheel, drag, and key inputs; UI sliders use a separate 10×/0.1× scale
// in components/inputs/hooks/useDragValue.ts.
//
// Moved here from engine-gmt/navigation/modifiers.ts on 2026-10-08 together with the fly
// integrator that reads it (engine/plugins/navigation/FlyIntegrator.ts, roll only).
// engine-gmt re-exports this file, so GMT's importers are unchanged.
// Pinned by `npm run test:nav-replay` (CAMERA_PRECISE_MULT 0.1 -> 0.2 reds the roll segment).

export const CAMERA_BOOST_MULT = 4.0;
export const CAMERA_PRECISE_MULT = 0.1;

export const getCameraModifier = (boost: boolean, precise: boolean): number => {
    let m = 1.0;
    if (boost)   m *= CAMERA_BOOST_MULT;
    if (precise) m *= CAMERA_PRECISE_MULT;
    return m;
};

export const getCameraModifierFromEvent = (e: { shiftKey: boolean; altKey: boolean }): number =>
    getCameraModifier(e.shiftKey, e.altKey);
