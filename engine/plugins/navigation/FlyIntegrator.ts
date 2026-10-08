/**
 * engine/plugins/navigation/FlyIntegrator.ts - free-fly movement, as displacements.
 *
 * PURPOSE
 *   One frame of fly navigation: held keys, sticks and a look drag in; a turn applied to an
 *   object's quaternion and a DISPLACEMENT handed to a sink out. The speed follows the distance
 *   to the surface ("auto slow"), so the same hands work at any scale. It was GMT's
 *   `CameraController`; it is here so a second renderer can fly with the same code.
 *
 * THE SEAM (docs/adr/0133-navigation-emits-displacements.md)
 *   Navigation may hand the renderer a displacement and may be told a distance. It never reads an
 *   absolute position back. So the integrator has no position: `settings.translate(dx, dy, dz)`
 *   receives each move in world axes and world units, and whoever owns the position applies it -
 *   a virtual-space offset in one app, a 256-bit fixed-point camera in another.
 *   Who calls it: one `update` per frame from the app's navigation (GMT: grep
 *   `flyController.current.update`). `reset()` on a teleport and on entering fly mode.
 *   What it needs: an object whose quaternion it may turn (`rotateX / Y / Z` about the object's own
 *   axes - a `THREE.Object3D` serves, no canvas is needed), the frame delta in SECONDS, the input
 *   state, and the settings below.
 *
 * PITFALLS
 *   - Every number here is pinned to the last bit by `npm run test:nav-replay`. Reordering is free
 *     only where it is exact (a factor of 2, 4 or +-1): splitting `targetSpeed * safeDelta`,
 *     normalising the quaternion or writing `1 - exp(-x)` as `-expm1(-x)` moves bits and goes red.
 *   - The two floors are ABSOLUTE numbers: `minSpeed` is a speed in world units a second and
 *     `boostMinDistance` a distance. Their defaults are GMT's. At a surface distance of 1e-30 one
 *     frame at the default `minSpeed` throws the camera 22 decades past the surface: an app that
 *     goes deep passes 0 for both.
 *   - `autoSlow: false` is an absolute speed too (`2 x baseSpeed x boost`); a deep app keeps it true.
 *   - A move's boost factor is the literal 4 below. `CAMERA_BOOST_MULT` in `modifiers.ts` scales
 *     ROLL only, and the precise (Alt) modifier never touches a move.
 *   - Roll's easing uses the RAW delta; the move, the distance easing, the turn easing and the
 *     applied turn all use the delta clamped at 0.1 s.
 *   - A frame with a key held and a zero delta still calls the sink, with (0, 0, 0).
 *   - The move stick gives direction only: the vector is normalised, so a barely tilted stick moves
 *     at full speed.
 *   - Turning about the object's own axes tilts the horizon once pitch is not zero, with the roll
 *     keys never pressed. An app that wants a level horizon levels the quaternion after `update`
 *     and writes it back, so the next move uses the basis the picture is drawn with.
 *
 * @invariant For one sequence of `update` / `reset` calls, the returned flag, every displacement
 *   and the object's quaternion are bit-identical to `debug/nav-replay-golden.json` - proven by:
 *   npm run test:nav-replay ("PASS - 17 segments, 834 frames, 611 displacements replay to the last
 *   bit"). Falsified 2026-10-08 on the code before the move (`DIST_INCREASE_LERP_RATE` 1.2 -> 1.3
 *   reds six segments; 69 of 71 further single breaks red) and again after it (see the test's header).
 */
import * as THREE from 'three';
import { getCameraModifier } from './modifiers';

export interface MoveInputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    boost: boolean;
    precise: boolean;
}

export interface JoystickInput {
    x: number;
    y: number;
}

export interface FlyInputs {
    move: MoveInputState;
    look: JoystickInput;
    moveJoy: JoystickInput;
    isDragging: boolean;
    dragDelta: { x: number; y: number };
    invertY: boolean;
}

/** Receives one frame's move, in world axes and world units. */
export type DisplacementSink = (dx: number, dy: number, dz: number) => void;

export interface FlySettings {
    /** Fly speed: with `autoSlow`, distances to the surface per second. */
    baseSpeed: number;
    /** Distance to the surface as the caller measured it this frame. Eased here when it rises. */
    distEstimate: number;
    /** True: speed follows the distance. False: an absolute speed. */
    autoSlow: boolean;
    /** Where each displacement goes. The integrator holds no position of its own. */
    translate: DisplacementSink;
    /** The slowest `autoSlow` speed, world units a second. Default `FLY_DEFAULT_MIN_SPEED`. */
    minSpeed?: number;
    /** With boost held, the distance is taken as at least this. Default `FLY_DEFAULT_BOOST_MIN_DISTANCE`. */
    boostMinDistance?: number;
}

/** GMT's floors, and the defaults: an app that never goes deep needs neither setting. */
export const FLY_DEFAULT_MIN_SPEED = 1e-6;
export const FLY_DEFAULT_BOOST_MIN_DISTANCE = 1e-4;

export class FlyIntegrator {
    // Physics State
    private currentRotVelocity = new THREE.Vector3();
    private rollVelocity = 0;

    // Smoothed distance for speed calculation (lerp when increasing)
    private smoothedDistEstimate = 1.0;

    // Config
    private readonly ROTATION_SMOOTHING = 20.0;
    private readonly ROLL_SMOOTHING = 3.0; // Decay rate
    private readonly SENSITIVITY = 1.0;
    // Lerp rate when DST increases — lower = slower speed ramp-up (prevents sudden 100x jumps when panning to open space)
    // At 1.2: ~2.5s to reach 95% of target distance. Immediate on decrease (safety).
    // A caller's probe may already apply its own smoothing, so this is a second layer of damping.
    private readonly DIST_INCREASE_LERP_RATE = 1.2;

    public reset() {
        this.currentRotVelocity.set(0, 0, 0);
        this.rollVelocity = 0;
        this.smoothedDistEstimate = 1.0;
    }

    private applyCurve(v: number): number {
        return Math.sign(v) * Math.pow(Math.abs(v), 2);
    }

    public update(
        camera: THREE.Object3D,
        delta: number,
        inputs: FlyInputs,
        settings: FlySettings,
    ): boolean {
        let didMove = false;

        // --- 0. SMOOTH DISTANCE ESTIMATE ---
        // Lerp when DST increases to prevent sudden speedups
        // Immediate response when DST decreases (getting closer to surface)
        const rawDist = settings.distEstimate;
        const safeDelta = Math.min(delta, 0.1);

        if (rawDist > this.smoothedDistEstimate) {
            // DST increased - lerp smoothly to prevent sudden speedup
            const lerpFactor = 1.0 - Math.exp(-this.DIST_INCREASE_LERP_RATE * safeDelta);
            this.smoothedDistEstimate += (rawDist - this.smoothedDistEstimate) * lerpFactor;
        } else {
            // DST decreased - respond immediately for safety
            this.smoothedDistEstimate = rawDist;
        }

        const effectiveDist = this.smoothedDistEstimate;

        // --- 1. LINEAR MOVEMENT ---
        const boost = inputs.move.boost ? 4.0 : 1.0;
        // Boost guarantees a minimum effective distance so you can always move, even at DST~0
        const minDist = inputs.move.boost ? (settings.boostMinDistance ?? FLY_DEFAULT_BOOST_MIN_DISTANCE) : 0;
        const clampedDist = Math.max(effectiveDist, minDist);
        const targetSpeed = settings.autoSlow
            ? Math.max(clampedDist * settings.baseSpeed * boost, settings.minSpeed ?? FLY_DEFAULT_MIN_SPEED)
            : 2.0 * settings.baseSpeed * boost;

        const tv = new THREE.Vector3(0, 0, 0);

        // Keyboard
        if (inputs.move.forward) tv.z -= 1;
        if (inputs.move.backward) tv.z += 1;
        if (inputs.move.left) tv.x -= 1;
        if (inputs.move.right) tv.x += 1;
        if (inputs.move.up) tv.y += 1;
        if (inputs.move.down) tv.y -= 1;

        // Joystick
        const hasJoystickMove = Math.abs(inputs.moveJoy.x) > 0.01 || Math.abs(inputs.moveJoy.y) > 0.01;
        if (hasJoystickMove) {
            tv.z -= this.applyCurve(inputs.moveJoy.y);
            tv.x += this.applyCurve(inputs.moveJoy.x);
        }

        if (tv.lengthSq() > 0) {
            // Apply Movement
            tv.normalize().multiplyScalar(targetSpeed * safeDelta);

            // Transform local direction to world space
            const mv = tv.clone().applyQuaternion(camera.quaternion);

            // Hand the displacement to whoever owns the position.
            settings.translate(mv.x, mv.y, mv.z);
            didMove = true;
        }

        // --- 2. ROTATIONAL MOVEMENT ---

        // Boost already factors into translational targetSpeed above; this
        // applies the same modifier to roll so Q/E composes with shift/alt.
        const rollMod = getCameraModifier(inputs.move.boost, inputs.move.precise);

        // Update Roll Momentum (affected by speed for consistent feel)
        const targetRoll = inputs.move.rollLeft ? 1 : (inputs.move.rollRight ? -1 : 0);
        const rollAccel = targetRoll !== 0 ? 1.0 : this.ROLL_SMOOTHING;
        const rollFactor = 1.0 - Math.exp(-rollAccel * delta);
        // Scale roll by current speed (minimum 0.1 for usability at low speeds)
        const speedScale = Math.max(0.1, settings.baseSpeed) * rollMod;

        this.rollVelocity += (targetRoll * speedScale - this.rollVelocity) * rollFactor;
        if (targetRoll === 0 && Math.abs(this.rollVelocity) < 0.001) this.rollVelocity = 0;

        // Calculate Target Rotation Velocity
        const tr = new THREE.Vector3(0, 0, 0);
        const yFlip = inputs.invertY ? -1 : 1;
        const hasJoystickLook = Math.abs(inputs.look.x) > 0.01 || Math.abs(inputs.look.y) > 0.01;

        if (inputs.isDragging) {
            // Mouse Drag
            tr.y = -inputs.dragDelta.x * 2.0;
            tr.x = inputs.dragDelta.y * 2.0 * yFlip;
        } else if (hasJoystickLook) {
            // Joystick Look
            tr.y = -this.applyCurve(inputs.look.x) * 0.66;
            tr.x = this.applyCurve(inputs.look.y) * 0.66 * yFlip;
        }

        // Apply Roll
        tr.z = this.rollVelocity * 1.24;

        // Smoothing (Frame-rate independent)
        const rotSmoothFactor = 1.0 - Math.exp(-this.ROTATION_SMOOTHING * safeDelta);

        this.currentRotVelocity.lerp(tr, rotSmoothFactor);

        // Zero out to stop drift
        if (this.currentRotVelocity.lengthSq() < 1e-6) this.currentRotVelocity.set(0, 0, 0);

        // Apply to Camera
        if (this.currentRotVelocity.lengthSq() > 1e-8) {
            const v = this.currentRotVelocity;
            camera.rotateX(v.x * safeDelta * this.SENSITIVITY);
            camera.rotateY(v.y * safeDelta * this.SENSITIVITY);
            camera.rotateZ(v.z * safeDelta * this.SENSITIVITY);
            didMove = true;
        }

        return didMove;
    }
}
