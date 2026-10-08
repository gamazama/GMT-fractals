/**
 * deep-zoom/flyCamera.ts - one frame of GMT's fly navigation, for a camera that is a yaw, a pitch
 * and a position somebody else holds.
 *
 * PURPOSE
 *   The engine's `FlyIntegrator` (engine/plugins/navigation/FlyIntegrator.ts, ADR-0133) turns a
 *   three.js object and hands displacements to a sink. The deep renderer's camera is a yaw and a
 *   pitch in radians (no roll) and three 256-bit integers. This file is the adapter between the
 *   two, and nothing else: no DOM, no host, no store, so it runs in a node check.
 *
 * THE SEAM
 *   `createFlyCamera().step(frame)` once per frame, from `deep-zoom/DeepZoomNavigation.tsx`:
 *     in   the frame delta in seconds, the renderer's current yaw and pitch, the input state of
 *          `useNavigationInput`, the fly speed, the distance to the surface, and the sink.
 *     out  the sink is called with the move in the RENDERER'S world axes and units; the return
 *          value is the new `{ yaw, pitch }` when the frame turned the camera, else null.
 *   The object is rebuilt from yaw and pitch every frame, so a jump, a recalled place or a preview
 *   that turned the camera needs no resync here. Only the integrator's own velocities persist.
 *
 * HOW THE TWO CAMERAS MEET (the renderer's basis: grep `function basis()` in renderer/core.js)
 *     forward = [cos p cos y, sin p, cos p sin y]     right = [-sin y, 0, cos y]
 *   At the renderer's start (yaw -pi/2, pitch 0) that is forward -Z, right +X, up +Y: three.js's
 *   identity camera. So the world axes are shared, and the object for any yaw and pitch is
 *   `Euler(pitch, -(yaw + pi/2), 0, 'YXZ')`.
 *
 * PITFALLS
 *   - THE TURN IS READ BACK AS A TURNTABLE. The integrator turns about the object's own axes,
 *     which rolls the horizon once pitch is not zero, and the renderer has no roll. So the turn it
 *     applied this frame is taken apart (`Rx(a) Ry(b) Rz(c)`, an 'XYZ' Euler of
 *     `before^-1 * after`) and applied as `pitch += a`, `yaw -= b`. `c` is dropped. Reading yaw
 *     and pitch off the turned object's forward vector instead flips the yaw by pi when a frame
 *     carries the pitch over the pole, and spins the yaw by 1 / cos(pitch) near it.
 *   - Q AND E ARE DOWN AND UP HERE, not roll: the renderer cannot roll, and the standalone page
 *     flew with E up and Q down. Space and C (GMT's up and down) work as well.
 *   - Up and down follow GMT: along the CAMERA's up, not the world's. The standalone page moved
 *     along world Y.
 *   - BOTH FLOORS ARE ZERO (`minSpeed`, `boostMinDistance`). The engine's defaults are absolute
 *     numbers (1e-6 a second, 1e-4): at a surface distance of 1e-30 one frame at 1e-6 throws the
 *     camera 22 decades past the surface. The price: with the distance at 0 (inside the solid)
 *     nothing moves, Shift or not. The way out is Backspace or Home.
 *   - THE DELTA IS CLAMPED AT `DZ_NAV_MAX_DELTA` (0.05 s, the standalone page's own clamp), tighter
 *     than the integrator's 0.1 s, AND ONE FRAME'S MOVE IS CUT TO `DZ_NAV_MAX_STRIDE` (0.8) OF THE
 *     DISTANCE TO THE SURFACE. The fly speed goes to 8 distances a second (the owner's range):
 *     with Shift, at 20 frames a second, that is 1.6 times the distance in one frame - through
 *     the surface. The direction is kept; only the length is cut. At the default speed the limit
 *     never bites (3.6 x 4 x 0.05 = 0.72).
 *   - The pitch is not clamped here. The renderer clamps it at +-1.55 in `setYawPitch`.
 *
 * @invariant W, D and Space move along the renderer's own forward, right and up for any yaw and
 *   pitch; a drag to the right raises the yaw and a drag up raises the pitch, each leaving the
 *   other angle alone; Q / E move down / up and turn nothing; with the surface at 1e-40 one frame
 *   moves a share of 1e-40; no frame moves more than 0.8 of the distance - proven by: npm run
 *   check:deep-zoom-fly-camera ("basis: ...", "turn: ...", "deep: ...", "stride: ..." lines).
 *   Falsified 2026-10-08: see the check's header.
 */
import * as THREE from 'three';
import { FlyIntegrator } from '../engine/plugins/navigation/FlyIntegrator';
import type { DisplacementSink, FlyInputs, MoveInputState } from '../engine/plugins/navigation/FlyIntegrator';

/** The longest frame the fly step integrates over, in seconds. */
export const DZ_NAV_MAX_DELTA = 0.05;
/** The most one frame may move, as a share of the distance to the surface. */
export const DZ_NAV_MAX_STRIDE = 0.8;

export interface FlyCameraFrame {
    /** Seconds since the last frame. */
    delta: number;
    /** The renderer's look angles now, in radians. */
    yaw: number;
    pitch: number;
    inputs: FlyInputs;
    /** Surface-distances per second. */
    speed: number;
    /** The distance to the surface this frame, unsmoothed (the integrator eases it itself). */
    distance: number;
    /** Receives the move, in the renderer's world axes and units. */
    translate: DisplacementSink;
}

export interface FlyCamera {
    /** One frame. The new angles when the camera turned, else null. */
    step(frame: FlyCameraFrame): { yaw: number; pitch: number } | null;
    /** Drop the turn velocity (a teleport does not need it: nothing here holds a position). */
    reset(): void;
}

export function createFlyCamera(): FlyCamera {
    const integrator = new FlyIntegrator();
    const body = new THREE.Object3D();
    const euler = new THREE.Euler();
    const before = new THREE.Quaternion();
    const turn = new THREE.Quaternion();
    const move: MoveInputState = {
        forward: false, backward: false, left: false, right: false, up: false, down: false,
        rollLeft: false, rollRight: false, boost: false, precise: false,
    };

    return {
        step(frame) {
            body.quaternion.setFromEuler(euler.set(frame.pitch, -(frame.yaw + Math.PI / 2), 0, 'YXZ'));
            before.copy(body.quaternion);

            // Q / E: down / up (see PITFALLS). The roll flags never reach the integrator.
            const held = frame.inputs.move;
            move.forward = held.forward; move.backward = held.backward;
            move.left = held.left; move.right = held.right;
            move.up = held.up || held.rollRight;
            move.down = held.down || held.rollLeft;
            move.boost = held.boost; move.precise = held.precise;

            // The stride limit (see PITFALLS): the same direction, no longer than 0.8 of the distance.
            const limit = DZ_NAV_MAX_STRIDE * frame.distance;
            const translate: DisplacementSink = (dx, dy, dz) => {
                const length = Math.hypot(dx, dy, dz);
                const k = length > limit && length > 0 ? limit / length : 1;
                frame.translate(dx * k, dy * k, dz * k);
            };

            integrator.update(
                body,
                Math.min(frame.delta, DZ_NAV_MAX_DELTA),
                { ...frame.inputs, move },
                {
                    baseSpeed: frame.speed,
                    distEstimate: frame.distance,
                    autoSlow: true,
                    translate,
                    minSpeed: 0,
                    boostMinDistance: 0,
                },
            );

            if (body.quaternion.equals(before)) return null;
            turn.copy(before).invert().multiply(body.quaternion);
            euler.setFromQuaternion(turn, 'XYZ');
            return { yaw: frame.yaw - euler.y, pitch: frame.pitch + euler.x };
        },
        reset: () => integrator.reset(),
    };
}
