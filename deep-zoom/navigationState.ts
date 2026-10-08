/**
 * deep-zoom/navigationState.ts - what the shell's navigation keeps besides the camera: the fly
 * speed (a preference) and whether the hands are flying right now.
 *
 * PURPOSE
 *   The fly speed is how many surface-distances the camera covers in a second, so it means the
 *   same at 1e-3 and at 1e-70. That makes it a preference of the person, not a property of a
 *   place: it is NOT a feature param (a saved location or a scene file must not change how fast
 *   you fly), it is kept in localStorage like the engine's own `invertY`.
 *   `flying` is true from the first frame a fly key, a stick or a look drag is held to the first
 *   frame none is: the balanced session of `engine/plugins/navigation/useNavigationInput.ts`.
 *
 * THE SEAM
 *   Written by `deep-zoom/DeepZoomNavigation.tsx` only (`setFlySpeed` from the wheel, `setFlying`
 *   from the session). Read by the depth readout (the speed line), by `locations.ts` (a slot
 *   digit does nothing while flying) and by anything that needs `isFlying()`.
 *
 * PITFALLS
 *   - The range and the default are the owner's decision of 2026-10-08 (0.01 to 8, default 3.6:
 *     the standalone page's `baseSpeed 0.06` a frame at 60 frames a second).
 *   - The top of the range is NOT what keeps the camera out of the surface: at 8, with Shift, a
 *     slow frame would cover 1.6 times the distance to it. The stride limit in `flyCamera.ts`
 *     (`DZ_NAV_MAX_STRIDE`) does that, whatever the speed.
 */
import { create } from 'zustand';

export const DZ_FLY_SPEED_DEFAULT = 3.6;
export const DZ_FLY_SPEED_RANGE: readonly [number, number] = [0.01, 8];

const STORAGE_KEY = 'gmt.deepZoom.flySpeed';

const clampSpeed = (v: number): number => Math.min(DZ_FLY_SPEED_RANGE[1], Math.max(DZ_FLY_SPEED_RANGE[0], v));

function storedSpeed(): number {
    try {
        const v = Number(localStorage.getItem(STORAGE_KEY));
        return Number.isFinite(v) && v > 0 ? clampSpeed(v) : DZ_FLY_SPEED_DEFAULT;
    } catch {
        return DZ_FLY_SPEED_DEFAULT;   // storage refused (private mode, a node check)
    }
}

interface DzNavigationState {
    /** Surface-distances per second, before Shift. */
    flySpeed: number;
    /** A fly key, a stick or a look drag is held. */
    flying: boolean;
}

export const useDzNavigation = create<DzNavigationState>()(() => ({ flySpeed: storedSpeed(), flying: false }));

export const isFlying = (): boolean => useDzNavigation.getState().flying;

/** Set the fly speed (clamped to the range) and remember it. */
export function setFlySpeed(v: number): void {
    const next = clampSpeed(v);
    if (next === useDzNavigation.getState().flySpeed) return;
    useDzNavigation.setState({ flySpeed: next });
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* not remembered; still set */ }
}

export function setFlying(flying: boolean): void {
    if (useDzNavigation.getState().flying !== flying) useDzNavigation.setState({ flying });
}
