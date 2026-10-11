/**
 * deep-zoom/flyCamera.ts - one frame of GMT's fly navigation, for a camera that is three angles and
 * a position somebody else holds.
 *
 * PURPOSE
 *   The engine's `FlyIntegrator` (engine/plugins/navigation/FlyIntegrator.ts, ADR-0133) turns a
 *   three.js object about the object's own axes and hands displacements to a sink. The deep
 *   renderer's camera is a yaw, a pitch and a roll in radians and three 256-bit integers. This file
 *   is the adapter between the two, and nothing else: no DOM, no host, no store, so it runs in a
 *   node check.
 *
 * THE SEAM
 *   `createFlyCamera().step(frame)` once per frame, from `deep-zoom/DeepZoomNavigation.tsx`:
 *     in   the frame delta in seconds, the renderer's current orientation, the input state of
 *          `useNavigationInput`, the fly speed, the distance to the surface, and the sink.
 *     out  the sink is called with the move in the RENDERER'S world axes and units; the return
 *          value is the new orientation when the frame turned the camera, else null.
 *   TWO SPEED RULES, chosen by the caller per frame. THE APP ALWAYS GIVES `sense`:
 *     `frame.sense` given (the rule since 2026-10-09, the only one the app flies by since the
 *          switch between the two went, 2026-10-11)  the integrator is run for a distance of 1,
 *          which gives the move's DIRECTION and its length per unit of pace; `sense(direction)` is
 *          then asked once and answers the pace (eased by its owner, `deep-zoom/flyPace.ts`) and the
 *          most this frame may move (a share of the nearest ray ahead of the move).
 *     `frame.sense` absent (the rule before it)  the speed follows `frame.distance`, the estimate
 *          at the camera, eased by the integrator; one frame is cut to `DZ_NAV_MAX_STRIDE` of it.
 *          NOTHING IN THE APP CALLS IT THIS WAY ANY MORE. It is kept because the node check flies
 *          the adapter through it: its "basis:", "size:", "deep:", "delta:", "stride:", "keys:" and
 *          "turn:" lines hand no `sense`, and two "sense:" lines compare the two rules. Taking it
 *          out means rewriting those lines for the rule that is left.
 *   The object is rebuilt from the three angles every frame (`toQuaternion` in
 *   deep-zoom/orbitCamera.ts, where the mapping is written out), so a jump, a recalled place or a
 *   preview that turned the camera needs no resync here. Only the integrators' own velocities persist.
 *
 * PITFALLS
 *   - A TURN IS ABOUT THE CAMERA'S OWN AXES, as in GMT: a look drag with the pitch off zero tilts
 *     the horizon, and Q / E are there to level it. The whole orientation is read back from the
 *     turned object, so over a pole the pitch comes back down the other side while the yaw and the
 *     roll each jump by pi: the three angles are one orientation, none is continuous on its own.
 *     (Away from the poles the yaw runs on unwrapped.) Within 4.5e-4 radians of a pole the roll is read
 *     back as 0 and folded into the yaw (three.js's rule): a camera that lands there with a roll
 *     snaps by up to 9e-4 radians, once (grep the same in deep-zoom/orbitCamera.ts).
 *   - Q AND E ROLL (the hook's `rollLeft` / `rollRight`), and move nothing. The engine's roll follows
 *     the fly speed it is told, and GMT's speed runs from 0.001 to 1 where this app's runs from 0.01
 *     to 8: told this app's 3.6, a tap of a tenth of a second rolls 9 degrees and a second of Q 148.
 *     So the roll keys go to an integrator of their own, told the speed over `DZ_NAV_ROLL_GEAR`;
 *     the two that move are never shown them. Shift rolls four times as fast, as in GMT.
 *   - Up and down (Space, C) follow GMT: along the CAMERA's up, not the world's. The standalone
 *     page moved along world Y.
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
 *   - The pitch is not clamped anywhere: the read-back keeps it within +-pi/2 by itself.
 *   - UNDER THE NEW RULE NOTHING IS SENT FOR A PACE OR A LIMIT THAT IS NOT A POSITIVE NUMBER: no
 *     reading yet, the camera inside the solid (the nearest ray is 0), or a frame with no time.
 *     `sense` is not asked on a frame without a move.
 *   - EACH RULE HAS AN INTEGRATOR OF ITS OWN. The integrator eases the distance it is handed when
 *     it rises (1.2 a second, on the distance itself). The new rule always hands it 1, so that
 *     ease never acts - but only in an integrator the old rule has not left standing at 1e-30:
 *     with one shared, the first frames after switching rules would crawl up from there. (The app
 *     no longer switches; a caller that hands `sense` on some frames and not on others still may.)
 *
 * @invariant W, D and Space move along the renderer's own forward, right and up for any yaw, pitch
 *   and roll; Q / E turn the camera about its view axis (Q raises the roll) and move nothing; a
 *   turn is read back as the orientation a camera that was never taken apart into angles has, over
 *   a pole too; with the surface at 1e-40 one frame moves a share of 1e-40; no frame moves more
 *   than 0.8 of the distance - proven by: npm run check:deep-zoom-fly-camera ("basis: ...",
 *   "keys: ...", "turn: ...", "deep: ...", "stride: ..." lines). Falsified 2026-10-08, and with
 *   the roll 2026-10-10 and 11: see the check's header.
 * @invariant With `sense` given, a frame moves `pace x speed x delta` (four times with Shift) along
 *   the same direction the old rule moves in, never more than the limit `sense` answers, `sense` is
 *   asked exactly once and only on a frame that moves, and a pace or a limit of 0 or NaN moves
 *   nothing - proven by: npm run check:deep-zoom-fly-camera ("sense: ..." lines). Falsified
 *   2026-10-09: see the check's header.
 */
import * as THREE from 'three';
import { FlyIntegrator } from '../engine/plugins/navigation/FlyIntegrator';
import type { DisplacementSink, FlyInputs, MoveInputState } from '../engine/plugins/navigation/FlyIntegrator';
import type { DzOrientation } from './host/DeepZoomHost';
import { toOrientation, toQuaternion } from './orbitCamera';

/** The longest frame the fly step integrates over, in seconds. */
export const DZ_NAV_MAX_DELTA = 0.05;
/** The most one frame may move, as a share of the distance to the surface. */
export const DZ_NAV_MAX_STRIDE = 0.8;
/** The roll is told the fly speed over this (see PITFALLS): this app's default speed over GMT's,
 *  3.6 / 0.5, so the default rolls as GMT's default does - a second of Q is 20 degrees. A feel
 *  number: the owner's to set. */
export const DZ_NAV_ROLL_GEAR = 7.2;

/** One frame's input. Its `yaw`, `pitch` and `roll` are the renderer's orientation now. */
export interface FlyCameraFrame extends DzOrientation {
    /** Seconds since the last frame. */
    delta: number;
    inputs: FlyInputs;
    /** Surface-distances per second. */
    speed: number;
    /** The distance to the surface this frame, unsmoothed (the integrator eases it itself). The
     *  speed follows it only when `sense` is absent, which in the app is never. */
    distance: number;
    /**
     * The speed rule since 2026-10-09 (see THE SEAM). Asked once, in a frame that moves, with the
     * move's unit direction in the renderer's world axes. `pace`: the distance the speed is
     * multiplied by. `limit`: the most this frame may move, in world units.
     */
    sense?: (direction: [number, number, number]) => { pace: number; limit: number };
    /** Receives the move, in the renderer's world axes and units. */
    translate: DisplacementSink;
}

export interface FlyCamera {
    /** One frame. The new orientation when the camera turned, else null. */
    step(frame: FlyCameraFrame): DzOrientation | null;
    /** Drop the turn velocity (a teleport does not need it: nothing here holds a position). */
    reset(): void;
}

const noKeys = (): MoveInputState => ({
    forward: false, backward: false, left: false, right: false, up: false, down: false,
    rollLeft: false, rollRight: false, boost: false, precise: false,
});
const nowhere: DisplacementSink = () => undefined;

export function createFlyCamera(): FlyCamera {
    const integrator = new FlyIntegrator();
    const paced = new FlyIntegrator();                 // the new rule's own (see PITFALLS)
    const roller = new FlyIntegrator();                // the roll keys' own (see PITFALLS)
    const body = new THREE.Object3D();
    const before = new THREE.Quaternion();
    const move = noKeys();
    const rolling: FlyInputs = { move: noKeys(), look: { x: 0, y: 0 }, moveJoy: { x: 0, y: 0 }, isDragging: false, dragDelta: { x: 0, y: 0 }, invertY: false };

    return {
        step(frame) {
            toQuaternion(frame, body.quaternion);
            before.copy(body.quaternion);

            // The moves and the look go to the rule's integrator, the roll keys to `roller`.
            const held = frame.inputs.move;
            Object.assign(move, held, { rollLeft: false, rollRight: false });
            Object.assign(rolling.move, { rollLeft: held.rollLeft, rollRight: held.rollRight, boost: held.boost, precise: held.precise });

            const delta = Math.min(frame.delta, DZ_NAV_MAX_DELTA);
            const flying = { ...frame.inputs, move };
            if (frame.sense) {
                // The integrator for a distance of 1: the move's direction, and its length per unit of pace.
                let perPace: [number, number, number] | null = null;
                paced.update(body, delta, flying, {
                    baseSpeed: frame.speed, distEstimate: 1, autoSlow: true, minSpeed: 0, boostMinDistance: 0,
                    translate: (dx, dy, dz) => { perPace = [dx, dy, dz]; },
                });
                const per = perPace as [number, number, number] | null;   // assigned in the sink: the compiler cannot see through the closure
                const unit = per ? Math.hypot(per[0], per[1], per[2]) : 0;
                if (per && unit > 0) {
                    const direction: [number, number, number] = [per[0] / unit, per[1] / unit, per[2] / unit];
                    const { pace, limit } = frame.sense(direction);
                    const length = Math.min(unit * pace, limit);          // NaN (no reading yet) fails the test below
                    if (length > 0) frame.translate(direction[0] * length, direction[1] * length, direction[2] * length);
                }
            } else {
                // The stride limit (see PITFALLS): the same direction, no longer than 0.8 of the distance.
                const limit = DZ_NAV_MAX_STRIDE * frame.distance;
                integrator.update(body, delta, flying, {
                    baseSpeed: frame.speed, distEstimate: frame.distance, autoSlow: true, minSpeed: 0, boostMinDistance: 0,
                    translate: (dx, dy, dz) => {
                        const length = Math.hypot(dx, dy, dz);
                        const k = length > limit && length > 0 ? limit / length : 1;
                        frame.translate(dx * k, dy * k, dz * k);
                    },
                });
            }
            // After the look, as in one integrator (it turns about X, Y, then Z). It moves nothing: no move key reaches it.
            roller.update(body, delta, rolling, { baseSpeed: frame.speed / DZ_NAV_ROLL_GEAR, distEstimate: 1, autoSlow: true, translate: nowhere });

            return body.quaternion.equals(before) ? null : toOrientation(body.quaternion, frame.yaw);
        },
        reset: () => { integrator.reset(); paced.reset(); roller.reset(); },
    };
}
