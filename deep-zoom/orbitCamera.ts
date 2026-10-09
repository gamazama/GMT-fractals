/**
 * deep-zoom/orbitCamera.ts - Orbit mode's three moves (turn about a point, zoom to it, drag it),
 * for a camera that is a yaw, a pitch and a position somebody else holds.
 *
 * PURPOSE
 *   GMT's Orbit mode turns the camera about the point under the cursor and keeps that point under
 *   the cursor; its wheel moves the camera along the cursor's ray (grep `Custom left-drag orbit`
 *   and `cursor-anchored zoom is a TRANSLATION` in engine-gmt/navigation/Navigation.tsx). There it
 *   is written on a three.js camera, a local position and drei's controls, none of which the deep
 *   renderer has: its camera is a yaw and a pitch in radians (a turntable, no roll) and three
 *   256-bit integers nobody may read as numbers (ADR-0133).
 *   None of that is needed. A pivot is a point of the PICTURE and a distance along its ray; every
 *   one of the three moves is a displacement of the camera worked out from the angles alone:
 *     turn   the pivot stays at the same point of the picture, at the same distance:
 *            move = distance x (ray before - ray after).
 *     zoom   along the pivot's ray, a share of the distance left: move = (1 - factor) x distance x ray.
 *     drag   in the picture's plane, so the pivot follows the pointer.
 *   The moves are doubles relative to the pivot's distance, so they hold at any depth: at 1e-60 a
 *   move is a few times 1e-61, exact to sixteen digits of ITSELF, and the host adds it to the
 *   fixed-point position. No absolute coordinate appears anywhere.
 *   Pure maths: no host, no DOM. `deep-zoom/DeepZoomNavigation.tsx` picks the pivot (one ray of the
 *   renderer's through the pointer), limits each move by what lies ahead of it, and sends it.
 *
 * PITFALLS
 *   - THE BASIS AND THE FIELD OF VIEW ARE THE RENDERER'S, copied: `function basis()` and
 *     `uFovScale` (tan(0.55) across the picture's height) in deep-zoom/renderer/core.js. If either
 *     changes there, a pivot no longer sits under the pointer.
 *   - The pitch is clamped HERE, at the renderer's own limit (`DZ_PITCH_LIMIT`, grep `1.55` in
 *     `setYawPitch`): the move must be worked out for the angle the renderer will really take.
 *   - A turn's move is the difference of two unit vectors: for a step of 1e-3 radians it keeps
 *     thirteen digits, and nothing is carried from step to step but the angles, so a long drag
 *     does not drift off its pivot.
 *   - A zoom factor must be above 0. It is the caller's to keep a frame's factor away from 0 (the
 *     navigation never lets one frame cover more than half the distance).
 *
 * @invariant After a turn the pivot is at the same point of the picture and the same distance from
 *   the camera, for any pivot, angle and pitch short of the limit; a zoom moves along the pivot's
 *   ray by (1 - factor) of its distance and leaves factor x distance; a drag moves the camera in the
 *   picture's plane so that the pivot lands under the dragged point - proven by: npm run
 *   check:deep-zoom-orbit-camera ("turn: ...", "zoom: ...", "drag: ..." lines). Falsified
 *   2026-10-09: see the check's header.
 */

export type V3 = [number, number, number];

/** The renderer's field of view: the picture's height spans this, times 1, at distance 1. */
export const DZ_FOV_SCALE = Math.tan(0.5 * 1.1);
/** The renderer's pitch limit, in radians. */
export const DZ_PITCH_LIMIT = 1.55;

/** A point of the picture and how far away the surface under it is. `u` to the right and `v` up,
 *  in picture heights from the picture's centre (v runs -0.5 .. 0.5). */
export interface OrbitPivot {
    u: number;
    v: number;
    distance: number;
}

/** The renderer's basis for a yaw and a pitch. */
export function viewBasis(yaw: number, pitch: number): { fwd: V3; right: V3; up: V3 } {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const fwd: V3 = [cp * cy, sp, cp * sy];
    const right: V3 = [Math.cos(yaw + Math.PI / 2), 0, Math.sin(yaw + Math.PI / 2)];
    const up: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
    return { fwd, right, up };
}

/** The unit direction, in world axes, of the ray through the point (u, v) of the picture. */
export function viewRay(yaw: number, pitch: number, u: number, v: number): V3 {
    const { fwd, right, up } = viewBasis(yaw, pitch);
    const x = fwd[0] + DZ_FOV_SCALE * (u * right[0] + v * up[0]);
    const y = fwd[1] + DZ_FOV_SCALE * (u * right[1] + v * up[1]);
    const z = fwd[2] + DZ_FOV_SCALE * (u * right[2] + v * up[2]);
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
}

/**
 * Turn the camera by `dYaw`, `dPitch` about the pivot. Returns the angles to set and the move that
 * keeps the pivot where it is in the picture.
 */
export function orbitTurn(yaw: number, pitch: number, pivot: OrbitPivot, dYaw: number, dPitch: number): { yaw: number; pitch: number; move: V3 } {
    const nextYaw = yaw + dYaw;
    const nextPitch = Math.max(-DZ_PITCH_LIMIT, Math.min(DZ_PITCH_LIMIT, pitch + dPitch));
    const before = viewRay(yaw, pitch, pivot.u, pivot.v), after = viewRay(nextYaw, nextPitch, pivot.u, pivot.v);
    const d = pivot.distance;
    return { yaw: nextYaw, pitch: nextPitch, move: [d * (before[0] - after[0]), d * (before[1] - after[1]), d * (before[2] - after[2])] };
}

/**
 * Zoom to the pivot: `factor` under 1 goes closer, over 1 backs away. Returns the move and the
 * distance left to the pivot.
 */
export function orbitZoom(yaw: number, pitch: number, pivot: OrbitPivot, factor: number): { move: V3; distance: number } {
    const ray = viewRay(yaw, pitch, pivot.u, pivot.v), go = (1 - factor) * pivot.distance;
    return { move: [ray[0] * go, ray[1] * go, ray[2] * go], distance: pivot.distance * factor };
}

/**
 * Drag the pivot by (`du`, `dv`) picture heights: the camera moves the other way, in the picture's
 * plane, by as much as carries the pivot to the dragged point.
 */
export function orbitDrag(yaw: number, pitch: number, pivot: OrbitPivot, du: number, dv: number): V3 {
    const { right, up } = viewBasis(yaw, pitch);
    // The pivot's depth along the view axis: its distance, over the length of its un-normalised ray.
    const depth = pivot.distance / Math.hypot(1, DZ_FOV_SCALE * pivot.u, DZ_FOV_SCALE * pivot.v);
    const k = -depth * DZ_FOV_SCALE;
    return [k * (du * right[0] + dv * up[0]), k * (du * right[1] + dv * up[1]), k * (du * right[2] + dv * up[2])];
}
