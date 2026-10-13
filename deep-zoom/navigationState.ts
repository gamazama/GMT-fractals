/**
 * deep-zoom/navigationState.ts - what the shell's navigation keeps besides the camera: the fly
 * speed and the speed rule's rise limit (preferences), whether the hands are flying right now,
 * and the two distances the readouts show.
 *
 * PURPOSE
 *   The fly speed is how many paces the camera covers in a second, so it means the same at 1e-3
 *   and at 1e-70. That makes it a preference of the person, not a property of a place: it is NOT
 *   a feature param (a saved location or a scene file must not change how fast you fly), it is
 *   kept in localStorage like the engine's own `invertY`. The same holds for how fast the speed
 *   may grow (`paceRise`). WHICH distance the speed follows is not a setting: it follows the view,
 *   always (`deep-zoom/flyPace.ts`). Until 2026-10-11 a switch, `followView`, put the rule before
 *   it back; the owner let it go, and a `gmt.deepZoom.followView` left in a browser's storage from
 *   then is simply never read.
 *   `flying` is true from the first frame a fly key, a stick or a look drag is held to the first
 *   frame none is: the balanced session of `engine/plugins/navigation/useNavigationInput.ts`.
 *   `depth` is THE DEPTH THE APP SHOWS: the distance to what is in the middle of the picture (the
 *   owner, 2026-10-09: "we lead with the looked at readout"), and the nearest surface when nothing
 *   is there to look at. `pace` is the distance the speed is multiplied by at the moment.
 *
 * THE SEAM
 *   Written by `deep-zoom/DeepZoomNavigation.tsx` only: `setFlySpeed` from the wheel, `setFlying`
 *   from the session, `setReadings` from its tick, at most 8 times a second. The rise limit is
 *   written by the Settings panel (`deep-zoom/settings.ts`).
 *   Read by the depth readout, the depth scale, the status chip, the milestones, `locations.ts`
 *   (a slot digit does nothing while flying) and anything that needs `isFlying()`. `depth` is also
 *   the depth of every sample of the trail (`deep-zoom/trail.ts`) and the scale of the route's
 *   heading (`deep-zoom/route.ts`): neither marches a ray of its own.
 *
 * PITFALLS
 *   - The range and the default of the speed are the owner's decision of 2026-10-08 (0.01 to 8,
 *     default 3.6: the standalone page's `baseSpeed 0.06` a frame at 60 frames a second). A
 *     pace is a third of the distance read (`DZ_PACE_SHARE` in flyPace.ts), which
 *     is what keeps this number meaning what it meant: he flew the rule at the whole distance and
 *     found it "3x too fast overall".
 *   - The top of the range is NOT what keeps the camera out of the surface. The one-frame limit
 *     in `flyCamera.ts` does that, whatever the speed.
 *   - `depth` here lags the camera by up to 125 ms and is 0 before the first reading. Code that
 *     needs the depth NOW (a save, the dive's toast) calls `depthNow()` in
 *     `deep-zoom/depthNow.ts`.
 *   - Select ONE primitive per `useDzNavigation` call, formatted for display where it is shown:
 *     `depth` changes on every sample while the camera moves.
 */
import { create } from 'zustand';
import { DZ_PACE_RISE_DEFAULT, DZ_PACE_RISE_RANGE } from './flyPace';

/** The two camera modes: the engine store's `cameraMode` values, GMT's names. The app starts in Fly
 *  (`deep-zoom/setup.ts`); Tab switches (`deep-zoom/hotkeys.ts`). */
export const DZ_MODE_FLY = 'Fly';
export const DZ_MODE_ORBIT = 'Orbit';
/** The camera mode of an engine-store state. The engine's store type does not declare the field
 *  (GMT grafts it the same way: grep `gmt.toggleCameraMode` in app-gmt/main.tsx), so it is read
 *  through this, and anything but 'Orbit' is Fly. */
export const cameraModeOf = (s: unknown): string => ((s as { cameraMode?: string }).cameraMode === DZ_MODE_ORBIT ? DZ_MODE_ORBIT : DZ_MODE_FLY);

export const DZ_FLY_SPEED_DEFAULT = 3.6;
export const DZ_FLY_SPEED_RANGE: readonly [number, number] = [0.01, 8];

const STORAGE_KEY = 'gmt.deepZoom.flySpeed';
const PACE_RISE_KEY = 'gmt.deepZoom.paceRise';

const clampSpeed = (v: number): number => Math.min(DZ_FLY_SPEED_RANGE[1], Math.max(DZ_FLY_SPEED_RANGE[0], v));
const clampRise = (v: number): number => Math.min(DZ_PACE_RISE_RANGE[1], Math.max(DZ_PACE_RISE_RANGE[0], v));

/** A stored value, or null when storage refuses (private mode, a node check) or holds nothing. */
function stored(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function remember(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* not remembered; still set */ }
}

function storedSpeed(): number {
    const v = Number(stored(STORAGE_KEY));
    return Number.isFinite(v) && v > 0 ? clampSpeed(v) : DZ_FLY_SPEED_DEFAULT;
}
function storedRise(): number {
    const v = Number(stored(PACE_RISE_KEY));
    return Number.isFinite(v) && v > 0 ? clampRise(v) : DZ_PACE_RISE_DEFAULT;
}

interface DzNavigationState {
    /** Paces per second, before Shift. */
    flySpeed: number;
    /** A fly key, a stick or a look drag is held. */
    flying: boolean;
    /** Decades a second the pace may rise by, before Shift. */
    paceRise: number;
    /** The depth the app shows: what is looked at, else the nearest surface. 0: no reading yet. */
    depth: number;
    /** True when `depth` is what is looked at; false when it is the nearest surface standing in. */
    depthIsLook: boolean;
    /** The distance the speed is multiplied by right now. 0: no reading yet. */
    pace: number;
}

export const useDzNavigation = create<DzNavigationState>()(() => ({
    flySpeed: storedSpeed(),
    flying: false,
    paceRise: storedRise(),
    depth: 0,
    depthIsLook: false,
    pace: 0,
}));

export const isFlying = (): boolean => useDzNavigation.getState().flying;

/** Set the fly speed (clamped to the range) and remember it. */
export function setFlySpeed(v: number): void {
    const next = clampSpeed(v);
    if (next === useDzNavigation.getState().flySpeed) return;
    useDzNavigation.setState({ flySpeed: next });
    remember(STORAGE_KEY, String(next));
}

export function setFlying(flying: boolean): void {
    if (useDzNavigation.getState().flying !== flying) useDzNavigation.setState({ flying });
}

/** How fast the pace may rise, in decades a second (clamped to its range), remembered. */
export function setPaceRise(v: number): void {
    const next = clampRise(v);
    if (!Number.isFinite(next) || next === useDzNavigation.getState().paceRise) return;
    useDzNavigation.setState({ paceRise: next });
    remember(PACE_RISE_KEY, String(next));
}

/** The navigation tick's readings. Nothing is notified when none of them changed. */
export function setReadings(depth: number, depthIsLook: boolean, pace: number): void {
    const s = useDzNavigation.getState();
    if (s.depth === depth && s.depthIsLook === depthIsLook && s.pace === pace) return;
    useDzNavigation.setState({ depth, depthIsLook, pace });
}
