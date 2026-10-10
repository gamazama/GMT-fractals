/**
 * deep-zoom/orbitCamera.ts - the camera's three angles as a three.js object and back, and Orbit
 * mode's three moves (turn about a point, zoom to it, drag it), for a camera that is those angles
 * and a position somebody else holds.
 *
 * PURPOSE
 *   GMT's Orbit mode turns the camera about the point under the cursor and keeps that point under
 *   the cursor; its wheel moves the camera along the cursor's ray (grep `Custom left-drag orbit`
 *   and `cursor-anchored zoom is a TRANSLATION` in engine-gmt/navigation/Navigation.tsx). There it
 *   is written on a three.js camera, a local position and drei's controls, none of which the deep
 *   renderer has: its camera is a yaw, a pitch and a roll in radians and three 256-bit integers
 *   nobody may read as numbers (ADR-0133).
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
 * HOW THE TWO CAMERAS MEET (the renderer's basis: grep `function basis()` in renderer/core.js)
 *     forward = [cos p cos y, sin p, cos p sin y]     right = [-sin y, 0, cos y]     up = right x forward
 *   and a roll r turns right and up about forward: right cos r + up sin r, up cos r - right sin r.
 *   At the renderer's start (yaw -pi/2, pitch 0, roll 0) that is forward -Z, right +X, up +Y:
 *   three.js's identity camera. So the world axes are shared, and the object for any orientation is
 *   `Euler(pitch, -(yaw + pi/2), roll, 'YXZ')`. `toQuaternion` and `toOrientation` are that mapping
 *   and its inverse, for this file and for `deep-zoom/flyCamera.ts`; `viewBasis` is the object's own
 *   axes, so the two files cannot disagree with each other.
 *
 * PITFALLS
 *   - THE BASIS AND THE FIELD OF VIEW ARE THE RENDERER'S: `function basis()` and `uFovScale`
 *     (tan(0.55) across the picture's height) in deep-zoom/renderer/core.js. If either changes
 *     there, a pivot no longer sits under the pointer.
 *   - A TURN IS ABOUT THE CAMERA'S OWN AXES, so the picture follows the hand whatever the roll, and
 *     nothing stops at a pole: carried over the top, the pitch comes back down the other side while
 *     the yaw and the roll each jump by pi (in one frame straight over it, within a few frames
 *     beside it). The three angles are one orientation; none of them is continuous on its own.
 *     Away from the poles the yaw runs on as it always did: it is not wrapped into one turn.
 *   - WITHIN 4.5e-4 RADIANS OF A POLE THE ROLL IS READ BACK AS 0 and folded into the yaw (three.js's
 *     rule for a 'YXZ' Euler). A camera that lands there with a roll snaps by up to 9e-4 radians
 *     (measured at the edge of that band, upside down: a twentieth of a degree), once; the move is
 *     worked out for the angles really returned, so the pivot stays put all the same.
 *   - A turn's move is the difference of two unit vectors: for a step of 1e-3 radians it keeps
 *     thirteen digits, and nothing is carried from step to step but the angles, so a long drag
 *     does not drift off its pivot.
 *   - A zoom factor must be above 0. It is the caller's to keep a frame's factor away from 0 (the
 *     navigation never lets one frame cover more than half the distance).
 *
 * @invariant A point of the picture gives the direction of the renderer's own formula, roll
 *   included; after a turn the pivot is at the same point of the picture and the same distance from
 *   the camera, for any pivot and orientation, over a pole too; with no roll and no pitch a turn is
 *   the yaw and the pitch added; with a roll a turn across carries the camera along its own right;
 *   a zoom moves along the pivot's ray by (1 - factor) of its distance and leaves factor x distance;
 *   a drag moves the camera in the picture's plane so that the pivot lands under the dragged point -
 *   proven by: npm run check:deep-zoom-orbit-camera ("ray: ...", "turn: ...", "zoom: ...",
 *   "drag: ..." lines). Falsified 2026-10-09 and 2026-10-10: see the check's header.
 */
import * as THREE from 'three';
import type { DzOrientation } from './host/DeepZoomHost';

export type V3 = [number, number, number];

/** The renderer's field of view: the picture's height spans this, times 1, at distance 1. */
export const DZ_FOV_SCALE = Math.tan(0.5 * 1.1);

/** A point of the picture and how far away the surface under it is. `u` to the right and `v` up,
 *  in picture heights from the picture's centre (v runs -0.5 .. 0.5). */
export interface OrbitPivot {
    u: number;
    v: number;
    distance: number;
}

// Scratch: each is written and read inside one call.
const euler = new THREE.Euler(), body = new THREE.Quaternion(), turn = new THREE.Quaternion(), axis = new THREE.Vector3();

/** `o` as the quaternion of a three.js camera, written into `q` (see HOW THE TWO CAMERAS MEET). */
export function toQuaternion(o: DzOrientation, q: THREE.Quaternion): THREE.Quaternion {
    return q.setFromEuler(euler.set(o.pitch, -(o.yaw + Math.PI / 2), o.roll, 'YXZ'));
}

/** The orientation of a three.js camera's quaternion: the pitch within +-pi/2, the roll within
 *  half a turn, and of the yaws a whole turn apart the one nearest `nearYaw` (the yaw it had). */
export function toOrientation(q: THREE.Quaternion, nearYaw: number): DzOrientation {
    euler.setFromQuaternion(q, 'YXZ');
    const yaw = -euler.y - Math.PI / 2;
    return { yaw: yaw + 2 * Math.PI * Math.round((nearYaw - yaw) / (2 * Math.PI)), pitch: euler.x, roll: euler.z };
}

/** The renderer's basis for an orientation: the object's own axes. */
export function viewBasis(o: DzOrientation): { fwd: V3; right: V3; up: V3 } {
    const q = toQuaternion(o, body);
    const along = (x: number, y: number, z: number): V3 => { axis.set(x, y, z).applyQuaternion(q); return [axis.x, axis.y, axis.z]; };
    return { fwd: along(0, 0, -1), right: along(1, 0, 0), up: along(0, 1, 0) };
}

/** The unit direction, in world axes, of the ray through the point (u, v) of the picture. */
export function viewRay(o: DzOrientation, u: number, v: number): V3 {
    const { fwd, right, up } = viewBasis(o);
    const x = fwd[0] + DZ_FOV_SCALE * (u * right[0] + v * up[0]);
    const y = fwd[1] + DZ_FOV_SCALE * (u * right[1] + v * up[1]);
    const z = fwd[2] + DZ_FOV_SCALE * (u * right[2] + v * up[2]);
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
}

/**
 * Turn the camera about the pivot: by `across` about its own up axis (positive: the view turns to
 * its right) and then by `up` about its own right axis (positive: the view turns up). Returns the
 * orientation to set and the move that keeps the pivot where it is in the picture.
 */
export function orbitTurn(o: DzOrientation, pivot: OrbitPivot, across: number, up: number): DzOrientation & { move: V3 } {
    if (across === 0 && up === 0) return { ...o, move: [0, 0, 0] };
    const next = toOrientation(toQuaternion(o, body).multiply(turn.setFromEuler(euler.set(up, -across, 0, 'YXZ'))), o.yaw);
    const before = viewRay(o, pivot.u, pivot.v), after = viewRay(next, pivot.u, pivot.v);
    const d = pivot.distance;
    return { ...next, move: [d * (before[0] - after[0]), d * (before[1] - after[1]), d * (before[2] - after[2])] };
}

/**
 * Zoom to the pivot: `factor` under 1 goes closer, over 1 backs away. Returns the move and the
 * distance left to the pivot.
 */
export function orbitZoom(o: DzOrientation, pivot: OrbitPivot, factor: number): { move: V3; distance: number } {
    const ray = viewRay(o, pivot.u, pivot.v), go = (1 - factor) * pivot.distance;
    return { move: [ray[0] * go, ray[1] * go, ray[2] * go], distance: pivot.distance * factor };
}

/**
 * Drag the pivot by (`du`, `dv`) picture heights: the camera moves the other way, in the picture's
 * plane, by as much as carries the pivot to the dragged point.
 */
export function orbitDrag(o: DzOrientation, pivot: OrbitPivot, du: number, dv: number): V3 {
    const { right, up } = viewBasis(o);
    // The pivot's depth along the view axis: its distance, over the length of its un-normalised ray.
    const depth = pivot.distance / Math.hypot(1, DZ_FOV_SCALE * pivot.u, DZ_FOV_SCALE * pivot.v);
    const k = -depth * DZ_FOV_SCALE;
    return [k * (du * right[0] + dv * up[0]), k * (du * right[1] + dv * up[1]), k * (du * right[2] + dv * up[2])];
}
