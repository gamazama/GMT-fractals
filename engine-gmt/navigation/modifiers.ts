// Camera input sensitivity modifiers driven by Shift / Alt.
//
// Shift = 4× ("boost"), Alt = 0.1× ("precise"). Compose multiplicatively:
// Shift+Alt = 0.4×. Matches the camera-control convention used across
// wheel, drag, and key inputs; UI sliders use a separate 10×/0.1× scale
// in components/inputs/hooks/useDragValue.ts.

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
