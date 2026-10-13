/**
 * Guard: the fly integrator replays to the last bit.
 *
 * PURPOSE
 *   `CameraController.update` (grep `class CameraController`) is GMT's whole fly feel: the speed
 *   law, the two floors, the distance easing, the turn and roll smoothing. Stage N of the Deep
 *   Zoom shell build moves it into the engine so a second app can fly on it. This test is the
 *   thing that must stay green across that move: a fixed, scripted flight goes through the real
 *   public surface (`new CameraController()`, `.update(...)`, `.reset()`) and every output is
 *   compared, as float64 bit patterns, with a record made from the code as it stood before the
 *   move (`debug/nav-replay-golden.json`). No tolerance anywhere: one ulp is a FAIL.
 *
 * WHAT IT PINS (one `ok` / `FAIL` line per scripted segment; see SEGMENTS for each one's claim)
 *   Per frame: the value `update` returns, how many displacements left the integrator, the
 *   displacement's x / y / z, and the camera's quaternion after the frame. Through those:
 *   every movement axis and its sign, key normalisation and cancelling, Shift x4, the 1e-4
 *   Shift distance floor, the 1e-6 speed floor, `autoSlow: false`, the eased rise and instant
 *   fall of the distance (`DIST_INCREASE_LERP_RATE`), the 0.1 frame-delta clamp (and that roll
 *   does NOT use the clamped delta), both joysticks, drag look, invert Y, roll with Shift / Alt,
 *   the rest thresholds, `reset()`, and that a move uses the camera as it was BEFORE that
 *   frame's turn. Private state (eased distance, turn and roll velocity) is not read; it is
 *   pinned through its effect on later frames, which the falsification table below proves.
 *   Also asserted, outside the record: `update` never moves or scales the camera object, and
 *   never writes to the input objects it is handed (they are frozen).
 *
 * WHAT IT DOES NOT PIN
 *   - The input hook `useInputController` (key map, wheel speed law, drag to NDC, joystick
 *     events, blur reset). Package N0b extends this file to drive the hook's output shape.
 *   - The call site in `Navigation.tsx` (grep `flyController.current.update`): the
 *     `disableMovement` early return, the `fitScale` scaling of the drag offset, the
 *     `navSettings?.autoSlow ?? true` default, the two `flyController.current.reset()` calls,
 *     and what `usePhysicsProbe` feeds in as the distance. That file cannot be imported in node
 *     (`const engine = getProxy()` at module scope, react-three-fiber hooks). Today NOTHING
 *     guards those lines; N0b's fly smoke is the first thing that will.
 *   - What happens to a displacement after it leaves: `FractalEngine` (`virtualSpace.move`,
 *     `resetAccumulation`) and `GmtRendererTickDriver` (worker `OFFSET_SHIFT`).
 *   - Orbit mode, entirely.
 *
 * HARNESS - nothing is stubbed
 *   The real class, a real `THREE.PerspectiveCamera` (three's maths objects need no DOM), the
 *   real event bus. Displacements are caught where GMT catches them today: a listener on
 *   `FRACTAL_EVENTS.OFFSET_SHIFT`. `stepFrame` below is the ONE place that knows how a frame
 *   goes in and how a displacement comes out. When the integrator gains its displacement sink
 *   (package N2) this file needs two edits and no more: in `stepFrame`, pass a sink that pushes
 *   into `emitted`, pass GMT's values for the two floors and drop the bus listener; and list
 *   the integrator's new files in INTEGRATOR_SOURCES. The golden file must come through that
 *   change untouched - `git diff --stat debug/nav-replay-golden.json` prints nothing - or the
 *   move changed behaviour. Take GMT's floor values from the one place `Navigation.tsx` takes
 *   them (the integrator's defaults, or one exported constant), never from a second copy typed
 *   in here: a copy would keep this test green while GMT flies on a different number.
 *
 * THE GOLDEN, AND WHEN IT MAY CHANGE
 *   A plain run never writes. Three write modes, none reachable by accident:
 *     --add-missing        records segments that have no golden yet (new coverage, e.g. N0b).
 *                          Refuses unless every segment that already has a golden replays, so
 *                          it cannot be used to paper over a change.
 *     --update --adr=NNNN  re-records everything. Legitimate ONLY when the fly behaviour is
 *                          being changed on purpose and `docs/adr/NNNN-*.md` says so; the file
 *                          must exist and mention `nav-replay` (an ADR that changes the flight
 *                          names its guard), and it is written into the golden's history.
 *     --update --first     the first recording; refuses if a golden file already exists.
 *   "The test is red after my refactor" is never a reason to re-record: a refactor has no ADR
 *   for a behaviour change, and the red line is the finding. Every write is refused when the
 *   script has lost one of its required cases (REQUIRED_CASES), when a segment threw, or when
 *   the recording holds too few displacements to be a real flight (MIN_DISPLACEMENTS) - the
 *   last one is what stops a re-record from persisting "nothing was emitted" after the sink
 *   moved and the harness was not updated (grep `--write` in debug/test-compat.mts for the
 *   incident that rule comes from).
 *
 * PITFALLS
 *   - The bit patterns depend on V8's `Math.exp` / `Math.pow` / `Math.sin` / `Math.cos` and on
 *     three's `Quaternion` / `Vector3` maths. A Node or three upgrade can move a last bit with
 *     no code change. The golden records the versions it was made on and a FAIL prints a note
 *     when they differ; confirm by running this test at the commit that recorded the golden.
 *   - The input script uses only + - x / and sqrt (exactly rounded everywhere), never a
 *     transcendental, so the inputs themselves cannot drift between runtimes.
 *   - `.mts` files are outside `tsconfig.json`'s include, so `npm run typecheck` does not read
 *     this file. A changed `update` signature shows up here as a FAIL ("update threw" or "0
 *     displacements"), not as a type error.
 *   - Editing a segment's script changes its `inputs` digest and the segment FAILs with "the
 *     script changed". Add a new segment instead of editing an old one.
 *
 * Run: `npx tsx debug/test-nav-replay.mts`   (exit 0 green, 1 red, 2 bad arguments)
 *
 * -- FALSIFIED 2026-10-08 ---------------------------------------------------------------------
 *   Every break below was made in the integrator's source, the guard run, the break reverted
 *   and the revert proven (`git hash-object` back to HEAD's blob id, then a green run).
 *
 *   The one the build plan names, by hand: `DIST_INCREASE_LERP_RATE` 1.2 -> 1.3. Exit 1, six
 *   segments red (dist-rising, autoslow-off, delta-extremes, idle, reset, mixed-flight), the
 *   eleven that never see a rising distance green. First red line:
 *     FAIL  dist-rising ... first divergence at frame 0 of 53 (0-based), field move.x
 *       expected 0.004644334044405846  (0x3f7305efed519a47)
 *       actual   0.004672432365180405  (0x3f73236683383451)
 *
 *   Then 71 single breaks, one at a time: 69 red, 2 green.
 *     break                                               segments that went red
 *     Shift distance floor 1e-4 -> 2e-4                   floor-boost-distance, mixed-flight
 *     speed floor 1e-6 -> 2e-6                            floor-min-speed, floor-boost-distance
 *     speed floor taken before the Shift multiplier       floor-boost-distance
 *     Shift x4 -> x3 (the literal in `update`)            floor-boost-distance, boost, autoslow-off, joystick-move, mixed-flight
 *     autoSlow-off factor 2.0 -> 2.5                      autoslow-off, mixed-flight
 *     Alt made to slow a move                             floor-boost-distance, boost, mixed-flight
 *     forward sign flipped                                16 of 17 (all but joystick-look); each other axis: 5 to 10
 *     key normalisation removed                           axes-identity, axes-tilted, joystick-move, delta-extremes, mixed-flight
 *     frame-delta clamp 0.1 -> 0.2                        dist-rising, roll, delta-extremes, mixed-flight
 *     roll made to use the clamped delta                  roll, delta-extremes, mixed-flight
 *     a new controller's eased distance 1.0 -> 2.0        dist-rising, delta-extremes, reset
 *     reset() not clearing distance / roll / turn         reset (and mixed-flight for roll and turn)
 *     a falling distance eased instead of instant         13 of 17, dist-falling among them
 *     easing skipped while no move key is held            joystick-move, idle
 *     easing skipped while autoSlow is off                autoslow-off, mixed-flight
 *     stick dead zone 0.01 -> 0.02 (move / look)          joystick-move / joystick-look
 *     drag gain, drag sign, invert Y, drag-beats-stick    drag-look and 1 to 3 others each
 *     `CAMERA_PRECISE_MULT` 0.1 -> 0.2 (modifiers.ts)     roll, mixed-flight
 *     `CAMERA_BOOST_MULT` 4 -> 3 (modifiers.ts)           roll, mixed-flight (roll only: a move has its own 4.0)
 *     the move emitted after the turn                     7 segments, drag-look among them
 *     the displacement emitted twice / on another event   all 17
 *     update always returns true                          9 segments, idle among them
 *     update moves the camera / writes to its inputs      all 17
 *     the eased distance held in module state             9 segments (two controllers stop being independent)
 *     quaternion normalised after the turn                7 segments, first divergence 2 ulp
 *     speed x delta done as two multiplies                4 segments, first divergence 2 ulp
 *     1 - exp(-x) written as -expm1(-x)                   6 segments
 *   Every segment went red for at least 7 of the breaks. The 2 green ones are not misses:
 *   `clampedDist * (baseSpeed * boost)` and `dragDelta.y * yFlip * 2.0` only move a multiply by
 *   a power of two or by +-1, which float64 does exactly, so the bits are the same and the
 *   guard is right to stay quiet.
 *
 *   The write modes: with the emit renamed so the harness hears nothing, `--add-missing`,
 *   `--update --first` and `--update --adr=0001` each printed NOT WRITTEN ("only 0
 *   displacement(s) were heard in 834 frames"), exited 1, and left the golden's bytes alone.
 *
 *   And the other direction - it stays green through the move it guards. A scratch copy of the
 *   integrator in package N2's shape (a `translate` sink in place of the emit, the two floors
 *   as optional settings defaulting to 1e-6 and 1e-4) replayed 17 of 17 against this golden
 *   with only `stepFrame` adapted; the same copy handed both floors as 0 went red on
 *   floor-min-speed, floor-boost-distance and mixed-flight, and nowhere else.
 *
 * @see plans/deep-zoom-shell/BUILD-PLAN.md (Stage N, row N0) and GMT-SYSTEMS.md section 3.3
 */
import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CameraController } from '../engine-gmt/engine/controllers/CameraController';
import type { JoystickInput, MoveInputState } from '../engine-gmt/engine/controllers/CameraController';

// ---------------------------------------------------------------- the frame a real caller sends

/** One call of `update`, in the shape `Navigation.tsx` builds it each frame. */
interface Frame {
    /** Seconds since the previous frame, straight from the frame loop (not clamped by the caller). */
    delta: number;
    move: MoveInputState;
    look: JoystickInput;
    moveJoy: JoystickInput;
    isDragging: boolean;
    /** Offset of the pointer from where the drag began; zero when not dragging. */
    dragDelta: { x: number; y: number };
    invertY: boolean;
    /** The fly speed setting (GMT: 0.001 to 1.0, default 0.5). */
    baseSpeed: number;
    /** Distance to the surface as the caller measured it this frame. */
    distEstimate: number;
    autoSlow: boolean;
    /** Call `reset()` before this frame's `update` (GMT does on teleport and on switching to Fly). */
    reset: boolean;
}

interface Displacement { x: number; y: number; z: number }

/** Displacements that left the integrator during the current `stepFrame` call. */
const emitted: Displacement[] = [];
/** The test's sink (package N2, 2026-10-08: the integrator hands displacements to a sink; before
 *  that it emitted `offset_shift` on the engine bus and this file listened there). */
const sink = (x: number, y: number, z: number): void => { emitted.push({ x, y, z }); };

/**
 * THE SEAM. Everything else in this file is script, recording and comparison; this is the one
 * function that touches the integrator's `update` signature. See HARNESS in the file header for
 * what package N2 changes here.
 */
function stepFrame(controller: CameraController, camera: THREE.Camera, f: Frame): boolean {
    return controller.update(
        camera,
        f.delta,
        { move: f.move, look: f.look, moveJoy: f.moveJoy, isDragging: f.isDragging, dragDelta: f.dragDelta, invertY: f.invertY },
        // No floors are passed: GMT passes none either, so both run on the integrator's defaults
        // (grep FLY_DEFAULT_MIN_SPEED). A second copy of the numbers typed here would stay green
        // while GMT flew on a different one.
        { baseSpeed: f.baseSpeed, distEstimate: f.distEstimate, autoSlow: f.autoSlow, translate: sink },
    );
}

// ---------------------------------------------------------------- script vocabulary

type Pair = readonly [number, number];
type Quat = readonly [number, number, number, number];

/** A frame written short. Anything left out is the resting value: no key, sticks centred, not
 *  dragging, fly speed 0.5, distance 1, autoSlow on, and a frame delta from FRAME_DELTAS. */
interface FrameSpec {
    dt?: number;
    /** Held keys by GMT's key map, space separated: w s a d space c q e shift alt. */
    keys?: string;
    look?: Pair;
    joy?: Pair;
    /** Present = the left button is down and the pointer is this far from where it went down. */
    drag?: Pair;
    invertY?: boolean;
    speed?: number;
    dist?: number;
    autoSlow?: boolean;
    reset?: boolean;
}

const KEY_NAMES = ['w', 's', 'a', 'd', 'space', 'c', 'q', 'e', 'shift', 'alt'] as const;
const KEY_MAP: Record<string, keyof MoveInputState> = {
    w: 'forward', s: 'backward', a: 'left', d: 'right', space: 'up', c: 'down',
    q: 'rollLeft', e: 'rollRight', shift: 'boost', alt: 'precise',
};

/** Frame deltas a segment cycles through when a frame names none: 60, 144, 30, 90, 50, 120,
 *  45 and 81 frames per second, so no segment runs at one steady rate. */
const FRAME_DELTAS: readonly number[] = [1 / 60, 1 / 144, 1 / 30, 1 / 90, 0.02, 1 / 120, 1 / 45, 0.0123];

const Q_IDENTITY: Quat = [0, 0, 0, 1];
/** A camera looking nowhere special, so no world axis lines up with a camera axis. Unit length. */
const Q_TILTED: Quat = [0.1, -0.3, 0.2, Math.sqrt(0.86)];
/** The camera sits off the origin so "update changed the position" cannot hide behind zeros. */
const CAMERA_POSITION: readonly [number, number, number] = [0.25, -0.5, 0.125];

function buildFrame(spec: FrameSpec, index: number): Frame {
    const move: MoveInputState = {
        forward: false, backward: false, left: false, right: false, up: false, down: false,
        rollLeft: false, rollRight: false, boost: false, precise: false,
    };
    for (const key of (spec.keys ?? '').split(' ').filter(Boolean)) {
        const field = KEY_MAP[key];
        if (!field) throw new Error(`script error: unknown key "${key}"`);
        move[field] = true;
    }
    return {
        delta: spec.dt ?? FRAME_DELTAS[index % FRAME_DELTAS.length],
        move,
        look: { x: spec.look?.[0] ?? 0, y: spec.look?.[1] ?? 0 },
        moveJoy: { x: spec.joy?.[0] ?? 0, y: spec.joy?.[1] ?? 0 },
        isDragging: spec.drag !== undefined,
        dragDelta: { x: spec.drag?.[0] ?? 0, y: spec.drag?.[1] ?? 0 },
        invertY: spec.invertY ?? false,
        baseSpeed: spec.speed ?? 0.5,
        distEstimate: spec.dist ?? 1,
        autoSlow: spec.autoSlow ?? true,
        reset: spec.reset ?? false,
    };
}

interface Segment {
    name: string;
    /** What a red line on this segment means, in one sentence. */
    pins: string;
    start: Quat;
    frames: Frame[];
}

const seg = (name: string, pins: string, start: Quat, specs: FrameSpec[]): Segment =>
    ({ name, pins, start, frames: specs.map(buildFrame) });

const rep = (count: number, spec: FrameSpec): FrameSpec[] => Array.from({ length: count }, () => spec);

/** start, start x factor, start x factor x factor, ... by repeated multiplication (no pow). */
function geometric(start: number, factor: number, count: number): number[] {
    const out = [start];
    while (out.length < count) out.push(out[out.length - 1] * factor);
    return out;
}

/** 0 to 1 in `count` even steps. */
const ramp = (count: number): number[] => Array.from({ length: count }, (_, i) => i / (count - 1));

/**
 * A long flight with everything changing at once, from a 32-bit integer generator (so it is the
 * same flight on every machine). Keys are held and released, the pointer drags, both sticks
 * come and go, the fly speed steps, autoSlow flips, the distance wanders across many decades
 * in both directions, frames stall and hitch, and `reset()` lands a few times mid-flight.
 */
function mixedFlight(frameCount: number, seed: number): FrameSpec[] {
    let state = seed >>> 0;
    const next = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state >>> 8;                                   // the 24 high bits; the low ones cycle fast
    };
    const unit = (): number => next() / 16777216;             // [0, 1), an exact binary fraction
    const oneIn = (n: number): boolean => next() % n === 0;
    const stick = (): Pair => { const x = unit() * 2 - 1; const y = unit() * 2 - 1; return [x, y]; };

    const toggleOdds: Record<string, number> = { w: 9, s: 14, a: 11, d: 11, space: 16, c: 16, q: 22, e: 22, shift: 12, alt: 18 };
    const distFactors = [0.5, 0.8, 1, 1, 1.25, 2, 0.1, 10, 0.3, 3];
    const held = new Set<string>();
    let drag: Pair | undefined;
    let look: Pair | undefined;
    let joy: Pair | undefined;
    let invertY = false;
    let autoSlow = true;
    let speed = 0.5;
    let dist = 1;

    const out: FrameSpec[] = [];
    for (let i = 0; i < frameCount; i++) {
        for (const key of KEY_NAMES) if (oneIn(toggleOdds[key])) { if (held.has(key)) held.delete(key); else held.add(key); }
        if (oneIn(18)) drag = drag ? undefined : stick();
        else if (drag && oneIn(3)) drag = stick();
        if (oneIn(28)) look = look ? undefined : stick();
        if (oneIn(28)) joy = joy ? undefined : stick();
        if (oneIn(45)) invertY = !invertY;
        if (oneIn(35)) autoSlow = !autoSlow;
        if (oneIn(5)) speed = Math.max(0.001, Math.min(1, speed + (oneIn(2) ? 0.02 : -0.02)));
        dist = Math.max(1e-12, Math.min(100, dist * distFactors[next() % distFactors.length]));
        const dt = oneIn(24) ? 0 : oneIn(24) ? 0.25 : FRAME_DELTAS[next() % FRAME_DELTAS.length];
        const reset = oneIn(80);
        out.push({ dt, keys: KEY_NAMES.filter(k => held.has(k)).join(' '), drag, look, joy, invertY, autoSlow, speed, dist, reset });
    }
    return out;
}

// ---------------------------------------------------------------- the script

const RUNAWAY = geometric(0.03, 1.6, 12);

const SEGMENTS: Segment[] = [
    seg('axes-identity',
        'each movement key maps to its camera axis with its sign (W is -Z); at an untilted camera with distance 0.5, speed 0.5 and 1/64 s a step is exactly 0.00390625',
        Q_IDENTITY,
        ['w', 's', 'a', 'd', 'space', 'c', 'w d', 'a c', 'w s'].map(keys => ({ keys, dt: 1 / 64, dist: 0.5 }))),

    seg('axes-tilted',
        'the same keys through a tilted camera; held keys are normalised (W+D is not faster than W); opposite keys cancel to no displacement at all',
        Q_TILTED,
        ['w', 's', 'a', 'd', 'space', 'c', 'w d', 'w a', 's d', 's a', 'w space', 'a c', 'w d space', 'w s', 'a d', 'space c', 'w s d', 'w a s d space c']
            .flatMap(keys => rep(3, { keys, dist: 0.75 }))),

    seg('dist-falling',
        'a falling distance takes effect in the same frame, with no easing',
        Q_TILTED,
        geometric(0.9, 0.7, 24).map(dist => ({ keys: 'w', dist }))),

    seg('dist-rising',
        'a rising distance is eased in (DIST_INCREASE_LERP_RATE): from the 1.0 a new controller starts at, again after a fall, with a zero and an over-the-clamp frame delta, and toward a target that keeps running away',
        Q_TILTED, [
            ...rep(8, { keys: 'w', dist: 5 }),
            ...rep(3, { keys: 'w', dist: 0.001 }),
            ...rep(14, { keys: 'w', dist: 5 }),
            { keys: 'w', dist: 5, dt: 0 },
            { keys: 'w', dist: 5, dt: 0.5 },
            ...rep(8, { keys: 'd', dist: 50 }),
            ...rep(2, { keys: 'd', dist: 0.02 }),
            ...RUNAWAY.map(dist => ({ keys: 'space', dist })),
            ...rep(4, { keys: 'space', dist: RUNAWAY[RUNAWAY.length - 1] }),
        ]),

    seg('floor-min-speed',
        'without Shift at a tiny distance the speed stops at the 1e-6 floor (distance x speed below 1e-6), on every axis, down to distance 0',
        Q_TILTED, [
            ...[1e-3, 4e-6, 2e-6, 1.9e-6, 1e-7, 1e-9, 1e-12, 1e-30, 0]
                .flatMap(dist => [{ keys: 'w', dist }, { keys: 'd', dist }, { keys: 'space', dist }]),
            ...rep(2, { keys: 's', dist: 0, speed: 0.001 }),
            ...rep(2, { keys: 's', dist: 0, speed: 1 }),
        ]),

    seg('floor-boost-distance',
        'held Shift at a tiny distance: the distance is held at the 1e-4 floor so Shift always moves; where both floors apply the 1e-6 speed floor is taken last; Alt does not slow flying',
        Q_TILTED, [
            ...[1e-2, 2e-4, 1e-4, 9e-5, 1e-6, 1e-9, 1e-30, 0]
                .flatMap(dist => [{ keys: 'w shift', dist }, { keys: 'a shift', dist }, { keys: 'c shift', dist }]),
            { keys: 'w', dist: 0 },
            ...rep(2, { keys: 'w shift', dist: 0, speed: 0.0025 }),
            ...rep(2, { keys: 'w shift', dist: 0, speed: 0.001 }),
            ...rep(2, { keys: 'w shift alt', dist: 0 }),
        ]),

    seg('boost',
        'Shift multiplies the speed by 4 at ordinary distances; Alt changes nothing about a move',
        Q_TILTED,
        ['w', 'w shift', 'w alt', 'w shift alt', 'd shift', 'space shift', 'c', 's shift'].flatMap(keys => rep(3, { keys, dist: 0.6 }))),

    seg('autoslow-off',
        'autoSlow off: the speed is 2 x fly speed x Shift whatever the distance says; the distance easing still runs underneath and shows on the first frame autoSlow is back on',
        Q_TILTED, [
            ...[1, 1e-9, 50, 0, 3, 1e-5, 1000, 0.2].flatMap((dist, i) => [
                { keys: 'w', dist, autoSlow: false },
                { keys: 'a shift', dist, autoSlow: false, speed: [0.5, 0.25, 1, 0.001][i % 4] },
            ]),
            ...rep(3, { keys: 'w', dist: 0.001, autoSlow: false }),
            ...rep(6, { keys: 'w', dist: 8, autoSlow: false }),
            ...rep(6, { keys: 'w', dist: 8, autoSlow: true }),
        ]),

    seg('fly-speed-steps',
        'the fly speed setting changes between frames (the wheel owns it; the integrator only reads it), for a move and for a roll, where a speed under 0.1 counts as 0.1',
        Q_TILTED,
        [0.5, 0.52, 0.54, 0.56, 1.0, 0.98, 0.3, 0.12, 0.1, 0.09, 0.05, 0.045, 0.01, 0.005, 0.001]
            .flatMap(speed => [{ keys: 'w', dist: 0.4, speed }, { keys: 'd q', dist: 0.4, speed }])),

    seg('joystick-move',
        'the move stick: squared response, a 0.01 dead zone, direction only (a barely-tilted stick moves at full speed), added to the keys, cancelling them exactly when opposite',
        Q_TILTED, [
            ...([[0, 1], [0, -1], [1, 0], [-1, 0], [0.5, 0.5], [0.3, -0.8], [-0.9, 0.2], [0.011, 0], [0, 0.011], [0.01, 0.01], [0.005, -0.009], [0, 0]] as Pair[])
                .flatMap(joy => rep(2, { joy, dist: 0.8 })),
            ...rep(2, { keys: 'w', joy: [0.7, 0], dist: 0.8 }),
            ...rep(2, { keys: 'd', joy: [-1, 0], dist: 0.8 }),
            ...rep(2, { keys: 'shift', joy: [0.4, 0.9], dist: 0.8 }),
            ...rep(2, { keys: 'space', joy: [0.005, 0.005], dist: 0.8 }),
        ]),

    seg('drag-look',
        'left-drag look: a rate control with gain 2, invert Y, a held drag beats the look stick, the turn eases out and stops dead under the rest threshold; a move in the same frame uses the camera as it was before that frame turned it',
        Q_TILTED, [
            ...ramp(10).map(t => ({ keys: 'w', drag: [0.6 * t, -0.35 * t] as Pair, dist: 0.7 })),
            ...rep(5, { keys: 'w', drag: [0.6, -0.35], dist: 0.7 }),
            ...rep(5, { keys: 'w', drag: [0.6, -0.35], invertY: true, dist: 0.7 }),
            ...rep(4, { keys: 'w', drag: [0, 0], look: [1, 1], dist: 0.7 }),
            ...rep(4, { drag: [-0.8, 0.5], dist: 0.7 }),
            ...rep(40, { dist: 0.7 }),
        ]),

    seg('joystick-look',
        'the look stick: squared response, gain 0.66, a 0.01 dead zone, invert Y, and the same ease-out to rest when let go',
        Q_IDENTITY, [
            ...([[1, 0], [0, 1], [-0.5, 0.5], [0.011, 0], [0.01, -0.01], [0.3, -0.9]] as Pair[]).flatMap(look => rep(3, { look })),
            ...rep(4, { look: [0.3, -0.9], invertY: true }),
            ...rep(3, { look: [1, -1], keys: 'a' }),
            ...rep(36, {}),
        ]),

    seg('roll',
        'Q / E roll: builds at rate 1 and decays at rate 3 on the UNCLAMPED frame delta, Q wins over E, Shift x4 and Alt x0.1 scale it (modifiers.ts), gain 1.24, snaps to rest under 0.001',
        Q_TILTED, [
            ...rep(8, { keys: 'q' }),
            ...rep(5, {}),
            ...rep(8, { keys: 'e' }),
            ...rep(4, { keys: 'q e' }),
            ...rep(4, { keys: 'q shift' }),
            ...rep(4, { keys: 'q alt' }),
            ...rep(4, { keys: 'e shift alt' }),
            ...rep(4, { keys: 'e', speed: 0.02 }),
            ...rep(4, { keys: 'e', speed: 1 }),
            { keys: 'q', dt: 0.5 },
            { keys: 'q', dt: 0 },
            ...rep(4, { keys: 'q w', dist: 0.5 }),
            ...rep(10, { dt: 0.25 }),
            ...rep(12, {}),
        ]),

    seg('delta-extremes',
        'frame deltas of zero, a microsecond, exactly 0.1, just over it, 0.5 and 5 seconds with a move, a drag and a roll all held: the move and the turn clamp at 0.1, the roll does not',
        Q_TILTED,
        [1 / 60, 0, 0, 1 / 60, 0.1, 0.1 + 1e-9, 0.5, 5, 0.001, 1e-6, 0, 1 / 60, 1 / 30, 0.25, 0, 1 / 60]
            .map(dt => ({ dt, keys: 'w d q', drag: [0.4, 0.2] as Pair, dist: 20 }))),

    seg('idle',
        'nothing held: no displacement, update returns false, the camera does not turn - while the distance easing still advances, as the first move afterwards shows; Shift and Alt alone do nothing',
        Q_TILTED, [
            ...rep(4, {}),
            ...rep(10, { dist: 9 }),
            ...rep(4, { keys: 'w', dist: 9 }),
            ...rep(3, { keys: 'shift alt' }),
        ]),

    seg('reset',
        'reset(): the eased distance goes back to 1.0 and the turn and the roll stop dead, mid-flight, with nothing held, and twice in a row',
        Q_TILTED, [
            ...rep(12, { keys: 'w q', drag: [0.5, 0.3], dist: 30 }),
            { keys: 'w', dist: 30, reset: true },
            ...rep(8, { keys: 'w', dist: 30 }),
            ...rep(6, { keys: 'e', drag: [-0.4, 0.1], dist: 0.01 }),
            { dist: 0.01, reset: true },
            ...rep(3, { dist: 0.01 }),
            { keys: 'd', dist: 4, reset: true },
            { keys: 'd', dist: 4, reset: true },
            ...rep(3, { keys: 'd', dist: 4 }),
        ]),

    seg('mixed-flight',
        'everything at once for 240 frames: an order-of-operations change that no single-path segment sees shows up here',
        Q_TILTED,
        mixedFlight(240, 20261008)),
];

// ---------------------------------------------------------------- required cases

const moveKeys = (f: Frame): string =>
    (['forward', 'backward', 'left', 'right', 'up', 'down'] as const).filter(k => f.move[k]).join('+');
const onlyKey = (key: string) => (f: Frame): boolean => moveKeys(f) === key && f.autoSlow;

/**
 * Cases the script must keep. Each needs at least one frame somewhere in SEGMENTS; `prev` is the
 * frame before it in the same segment. This is a check on the SCRIPT, not on the integrator: it
 * stops a later edit from quietly dropping the case a floor or a branch depends on. The first
 * three are the ones the build plan names.
 */
const REQUIRED_CASES: Array<[string, (f: Frame, prev: Frame | undefined) => boolean]> = [
    ['held Shift at a distance under 1e-4 (the Shift floor)', f => f.move.boost && f.autoSlow && f.distEstimate < 1e-4 && moveKeys(f) !== ''],
    ['autoSlow off', f => !f.autoSlow && moveKeys(f) !== ''],
    ['no Shift with distance x speed under 1e-6 (the speed floor)', f => !f.move.boost && f.autoSlow && f.distEstimate * f.baseSpeed < 1e-6 && moveKeys(f) !== ''],
    ['forward alone', onlyKey('forward')],
    ['backward alone', onlyKey('backward')],
    ['left alone', onlyKey('left')],
    ['right alone', onlyKey('right')],
    ['up alone', onlyKey('up')],
    ['down alone', onlyKey('down')],
    ['a zero frame delta while moving', f => f.delta === 0 && moveKeys(f) !== ''],
    ['a frame delta over 0.1 while moving', f => f.delta > 0.1 && moveKeys(f) !== ''],
    ['a varying frame delta', (f, prev) => !!prev && f.delta !== prev.delta],
    ['distance rising while moving', (f, prev) => !!prev && f.autoSlow && f.distEstimate > prev.distEstimate && moveKeys(f) !== ''],
    ['distance falling while moving', (f, prev) => !!prev && f.autoSlow && f.distEstimate < prev.distEstimate && moveKeys(f) !== ''],
    ['fly speed changing while moving', (f, prev) => !!prev && f.baseSpeed !== prev.baseSpeed && moveKeys(f) !== ''],
    ['drag look', f => f.isDragging && (f.dragDelta.x !== 0 || f.dragDelta.y !== 0)],
    ['drag look with invert Y', f => f.isDragging && f.invertY && f.dragDelta.y !== 0],
    ['look stick', f => !f.isDragging && (f.look.x !== 0 || f.look.y !== 0)],
    ['move stick', f => f.moveJoy.x !== 0 || f.moveJoy.y !== 0],
    ['roll left', f => f.move.rollLeft && !f.move.rollRight],
    ['roll right', f => f.move.rollRight && !f.move.rollLeft],
    ['Alt held while rolling', f => f.move.precise && (f.move.rollLeft || f.move.rollRight)],
    ['reset() mid-segment', (f, prev) => !!prev && f.reset],
];

function missingCases(): string[] {
    return REQUIRED_CASES
        .filter(([, test]) => !SEGMENTS.some(s => s.frames.some((f, i) => test(f, i > 0 ? s.frames[i - 1] : undefined))))
        .map(([label]) => label);
}

/** Fewer displacements / turned frames than this in the whole recording is not a flight; it is a
 *  harness that has stopped hearing the integrator. Fails in every mode, write modes included. */
const MIN_DISPLACEMENTS = 300;
const MIN_TURNED_FRAMES = 200;

// ---------------------------------------------------------------- bit patterns

const bits = new DataView(new ArrayBuffer(8));
/** A float64 as 16 hex digits, most significant byte first. -0 and 0 differ; so does 1 ulp. */
function hex(value: number): string {
    bits.setFloat64(0, value, false);
    return bits.getBigUint64(0, false).toString(16).padStart(16, '0');
}
function unhex(digits: string): number {
    bits.setBigUint64(0, BigInt('0x' + digits), false);
    return bits.getFloat64(0, false);
}
const isHex = (s: string): boolean => /^[0-9a-f]{16}$/.test(s);

/** How far apart two float64s are, counted in representable values. */
function ulpDistance(a: string, b: string): string {
    const x = BigInt('0x' + a);
    const y = BigInt('0x' + b);
    const sign = BigInt(1) << BigInt(63);
    if ((x & sign) !== (y & sign)) return 'opposite signs';
    const d = x > y ? x - y : y - x;
    return `${d.toString()} ulp apart`;
}

// ---------------------------------------------------------------- recording

const FRAME_LAYOUT = 'didMove displacements move.x move.y move.z quat.x quat.y quat.z quat.w';

interface Recording {
    /** One line per frame, fields in FRAME_LAYOUT order. */
    lines: string[];
    /** Set when the segment could not be replayed at all, or `update` had a side effect. */
    error: string | null;
    moved: number;
    turned: number;
    atRest: number;
}

function runSegment(segment: Segment): Recording {
    const controller = new CameraController();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(CAMERA_POSITION[0], CAMERA_POSITION[1], CAMERA_POSITION[2]);
    camera.quaternion.set(segment.start[0], segment.start[1], segment.start[2], segment.start[3]);

    const rec: Recording = { lines: [], error: null, moved: 0, turned: 0, atRest: 0 };
    const quatHex = (): string => [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w].map(hex).join(' ');
    let before = quatHex();

    for (let i = 0; i < segment.frames.length; i++) {
        const f = segment.frames[i];
        // Frozen: an integrator that writes to what it is handed throws here (modules are strict).
        Object.freeze(f.move); Object.freeze(f.look); Object.freeze(f.moveJoy); Object.freeze(f.dragDelta);
        emitted.length = 0;
        let didMove: unknown;
        try {
            if (f.reset) controller.reset();
            didMove = stepFrame(controller, camera, f);
        } catch (e) {
            rec.error = `frame ${i}: update threw "${e instanceof Error ? e.message : String(e)}"`;
            break;
        }
        if (typeof didMove !== 'boolean') { rec.error = `frame ${i}: update returned ${String(didMove)}, not true / false`; break; }
        const p = camera.position;
        const s = camera.scale;
        const untouched = Object.is(p.x, CAMERA_POSITION[0]) && Object.is(p.y, CAMERA_POSITION[1]) && Object.is(p.z, CAMERA_POSITION[2])
            && s.x === 1 && s.y === 1 && s.z === 1;
        if (!untouched) {
            rec.error = `frame ${i}: update moved or scaled the camera object (position ${p.x}, ${p.y}, ${p.z}; scale ${s.x}, ${s.y}, ${s.z}). It may only turn it; a move leaves as a displacement`;
            break;
        }
        const after = quatHex();
        const move = emitted.length ? emitted.map(d => `${hex(d.x)} ${hex(d.y)} ${hex(d.z)}`).join(' ') : '- - -';
        rec.lines.push(`${didMove ? 1 : 0} ${emitted.length} ${move} ${after}`);
        if (emitted.length) rec.moved++;
        if (after !== before) rec.turned++;
        if (!didMove) rec.atRest++;
        before = after;
    }
    return rec;
}

/** A digest of everything a segment feeds in, so "the script changed" is told apart from "the
 *  integrator changed". */
function inputsDigest(segment: Segment): string {
    const h = createHash('sha256');
    h.update(segment.start.map(hex).join(' '));
    for (const f of segment.frames) {
        h.update('|' + [
            hex(f.delta), KEY_NAMES.map(k => (f.move[KEY_MAP[k]] ? 1 : 0)).join(''),
            hex(f.look.x), hex(f.look.y), hex(f.moveJoy.x), hex(f.moveJoy.y),
            f.isDragging ? 1 : 0, hex(f.dragDelta.x), hex(f.dragDelta.y), f.invertY ? 1 : 0,
            hex(f.baseSpeed), hex(f.distEstimate), f.autoSlow ? 1 : 0, f.reset ? 1 : 0,
        ].join(' '));
    }
    return h.digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------- the golden file

/**
 * The files the integrator lives in. Read only when a golden is written, to stamp the record
 * with their git blob ids - content addresses, so "recorded from exactly this source" can be
 * checked later (`git cat-file -p <id>`) and survives a rebase, which a commit id does not.
 * When the integrator moves (package N2), list its new files here in the same change.
 */
const INTEGRATOR_SOURCES = [
    'engine/plugins/navigation/FlyIntegrator.ts',
    'engine/plugins/navigation/modifiers.ts',
];

interface GoldenSegment { inputs: string; frames: string[] }
interface GoldenHistory { how: string; adr: string | null; date: string; sources: Record<string, string>; node: string; v8: string; three: string; segments: number }
interface Golden {
    what: string;
    frameLayout: string;
    history: GoldenHistory[];
    segments: Record<string, GoldenSegment>;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN_PATH = join(ROOT, 'debug', 'nav-replay-golden.json');
const GOLDEN_REL = 'debug/nav-replay-golden.json';
/** `--update --adr=NNNN` only accepts an ADR whose text names this guard, so the number of some
 *  unrelated ADR does not open the door. */
const ADR_MUST_MENTION = 'nav-replay';

const readGolden = (): Golden | null =>
    (existsSync(GOLDEN_PATH) ? JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Golden : null);

function historyEntry(how: string, adr: string | null, segments: number): GoldenHistory {
    const sources: Record<string, string> = {};
    for (const file of INTEGRATOR_SOURCES) {
        try { sources[file] = execSync(`git hash-object -- "${file}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
        catch { sources[file] = 'unreadable'; }
    }
    return { how, adr, date: new Date().toISOString().slice(0, 10), sources, node: process.version, v8: process.versions.v8, three: THREE.REVISION, segments };
}

function writeGolden(golden: Golden): void {
    writeFileSync(GOLDEN_PATH, JSON.stringify(golden, null, 1) + '\n', 'utf8');
}

// ---------------------------------------------------------------- comparison

function describeFrame(f: Frame): string {
    const keys = KEY_NAMES.filter(k => f.move[KEY_MAP[k]]).join(' ');
    const parts = [`dt=${f.delta}`, `keys=[${keys}]`, `dist=${f.distEstimate}`, `speed=${f.baseSpeed}`, `autoSlow=${f.autoSlow ? 'on' : 'off'}`];
    if (f.isDragging) parts.push(`drag=(${f.dragDelta.x}, ${f.dragDelta.y})`);
    if (f.look.x !== 0 || f.look.y !== 0) parts.push(`look=(${f.look.x}, ${f.look.y})`);
    if (f.moveJoy.x !== 0 || f.moveJoy.y !== 0) parts.push(`joy=(${f.moveJoy.x}, ${f.moveJoy.y})`);
    if (f.invertY) parts.push('invertY');
    if (f.reset) parts.push('reset() first');
    return parts.join(' ');
}

function fieldNames(line: string): string[] {
    const count = Number(line.split(' ')[1]);
    const names = ['didMove', 'displacements'];
    if (!(count > 1)) names.push('move.x', 'move.y', 'move.z');
    else for (let k = 0; k < count; k++) names.push(`move[${k}].x`, `move[${k}].y`, `move[${k}].z`);
    names.push('quat.x', 'quat.y', 'quat.z', 'quat.w');
    return names;
}

const showField = (v: string | undefined): string =>
    (v === undefined ? '(missing)' : isHex(v) ? `${String(unhex(v))}  (0x${v})` : v === '-' ? '- (no displacement)' : v);

/** null when the segment replays; otherwise the lines that explain the first divergence. */
function compare(segment: Segment, rec: Recording, gold: GoldenSegment | undefined, haveFile = true): string[] | null {
    if (rec.error) return [rec.error];
    if (!haveFile) return ['nothing to compare with: the golden file is missing'];
    if (!gold) return ['no golden record for this segment. New segment? Record it with --add-missing'];
    if (gold.inputs !== inputsDigest(segment)) {
        return ['the SCRIPT of this segment changed (its inputs digest differs from the golden), so the record no longer applies.',
            'Put the script back, or add the new frames as a new segment and record that with --add-missing'];
    }
    if (gold.frames.length !== rec.lines.length) return [`golden holds ${gold.frames.length} frames, this run produced ${rec.lines.length}`];
    const first = rec.lines.findIndex((line, i) => line !== gold.frames[i]);
    if (first < 0) return null;
    const differing = rec.lines.filter((line, i) => line !== gold.frames[i]).length;
    const want = gold.frames[first].split(' ');
    const got = rec.lines[first].split(' ');
    const names = fieldNames(gold.frames[first]);
    let k = 0;
    while (k < want.length && k < got.length && want[k] === got[k]) k++;
    const out = [
        `first divergence at frame ${first} of ${rec.lines.length} (0-based), field ${names[k] ?? `#${k}`}; ${differing} frame(s) differ in all`,
        `  input    ${describeFrame(segment.frames[first])}`,
        `  expected ${showField(want[k])}`,
        `  actual   ${showField(got[k])}`,
    ];
    if (want[k] !== undefined && got[k] !== undefined && isHex(want[k]) && isHex(got[k])) out.push(`  ${ulpDistance(want[k], got[k])}`);
    out.push(`  pins     ${segment.pins}`);
    return out;
}

// ---------------------------------------------------------------- run

function usage(problem: string): never {
    console.log(`test-nav-replay: ${problem}`);
    console.log('  (no arguments)        compare with the golden; writes nothing');
    console.log('  --add-missing         record segments that have no golden yet; refuses if an existing one does not replay');
    console.log('  --update --adr=NNNN   re-record everything; docs/adr/NNNN-*.md must exist, mention nav-replay and justify the behaviour change');
    console.log('  --update --first      the first recording; refuses if the golden file exists');
    process.exit(2);
}

const args = process.argv.slice(2);
const adrArg = args.find(a => a.startsWith('--adr='));
const known = new Set(['--add-missing', '--update', '--first']);
for (const a of args) if (!known.has(a) && a !== adrArg) usage(`unknown argument ${a}`);
const wantAdd = args.includes('--add-missing');
const wantUpdate = args.includes('--update');
const wantFirst = args.includes('--first');
if (wantAdd && wantUpdate) usage('--add-missing and --update do not combine');
if ((wantFirst || adrArg) && !wantUpdate) usage('--first and --adr= only mean something with --update');
if (wantUpdate && !wantFirst && !adrArg) usage('--update re-records the pinned behaviour and needs the ADR that changes it: --update --adr=NNNN');
if (wantFirst && adrArg) usage('--first and --adr= do not combine');

const names = SEGMENTS.map(s => s.name);
const duplicate = names.find((n, i) => names.indexOf(n) !== i);
if (duplicate) { console.log(`script error: two segments are named ${duplicate}`); process.exit(2); }

const recordings = new Map<string, Recording>(SEGMENTS.map(s => [s.name, runSegment(s)]));
const totalFrames = SEGMENTS.reduce((n, s) => n + s.frames.length, 0);
const totalMoved = [...recordings.values()].reduce((n, r) => n + r.moved, 0);
const totalTurned = [...recordings.values()].reduce((n, r) => n + r.turned, 0);

/** Problems with the script or the harness as a whole. Any one of them fails every mode. */
const blockers: string[] = [];
for (const label of missingCases()) blockers.push(`the script no longer contains a frame for: ${label}`);
if (totalMoved < MIN_DISPLACEMENTS) blockers.push(`only ${totalMoved} displacement(s) were heard in ${totalFrames} frames (floor ${MIN_DISPLACEMENTS}). The harness is not connected to where the integrator sends its moves - see stepFrame`);
if (totalTurned < MIN_TURNED_FRAMES) blockers.push(`the camera turned in only ${totalTurned} frame(s) (floor ${MIN_TURNED_FRAMES})`);
for (const s of SEGMENTS) if (s.frames.length === 0) blockers.push(`segment ${s.name} has no frames`);

console.log(`nav replay - ${SEGMENTS.length} segments, ${totalFrames} frames through CameraController.update\n`);

// --- write modes: decide, write, then fall through to the same comparison a plain run does
let writeRefused = false;
if (wantAdd || wantUpdate) {
    const existing = readGolden();
    const threw = SEGMENTS.filter(s => recordings.get(s.name)!.error);
    const fresh = (s: Segment): GoldenSegment => ({ inputs: inputsDigest(s), frames: recordings.get(s.name)!.lines });
    let refusal: string | null = null;
    if (blockers.length) refusal = blockers[0];
    else if (threw.length) refusal = `segment ${threw[0].name} could not be replayed (${recordings.get(threw[0].name)!.error})`;
    else if (wantAdd) {
        const broken = existing ? SEGMENTS.filter(s => existing.segments[s.name] && compare(s, recordings.get(s.name)!, existing.segments[s.name])) : [];
        const toAdd = existing ? SEGMENTS.filter(s => !existing.segments[s.name]) : [];
        if (!existing) refusal = `${GOLDEN_REL} is missing. Restore it from git; --add-missing only adds to an existing golden`;
        else if (broken.length) refusal = `${broken.length} segment(s) that already have a golden do not replay (first: ${broken[0].name}). Fix that first; nothing is added on top of a red run`;
        else if (toAdd.length === 0) console.log('--add-missing: every segment already has a golden; nothing written\n');
        else {
            for (const s of toAdd) existing.segments[s.name] = fresh(s);
            existing.history.push(historyEntry(`add-missing: ${toAdd.map(s => s.name).join(', ')}`, null, toAdd.length));
            writeGolden(existing);
            console.log(`--add-missing: recorded ${toAdd.map(s => s.name).join(', ')} into ${GOLDEN_REL}\n`);
        }
    } else if (wantFirst) {
        if (existing) refusal = `${GOLDEN_REL} already exists. --first is for the first recording only; an intended behaviour change is --update --adr=NNNN`;
        else {
            writeGolden({
                what: 'Golden record for debug/test-nav-replay.mts: the fly integrator outputs, frame by frame, as float64 bit patterns. Never edit by hand; the test header says when it may be re-recorded.',
                frameLayout: `${FRAME_LAYOUT} - float64 as 16 hex digits, most significant byte first; "- - -" = no displacement that frame`,
                history: [historyEntry('first recording', null, SEGMENTS.length)],
                segments: Object.fromEntries(SEGMENTS.map(s => [s.name, fresh(s)])),
            });
            console.log(`--update --first: recorded ${SEGMENTS.length} segments into ${GOLDEN_REL}\n`);
        }
    } else {
        const adr = adrArg!.slice('--adr='.length);
        const adrDir = join(ROOT, 'docs', 'adr');
        const adrFile = /^\d{4}$/.test(adr) && existsSync(adrDir) ? readdirSync(adrDir).find(f => f.startsWith(`${adr}-`) && f.endsWith('.md')) : undefined;
        if (!adrFile) refusal = `no docs/adr/${adr}-*.md. Re-recording changes what GMT's flight is pinned to; write the ADR that says why first`;
        else if (!readFileSync(join(adrDir, adrFile), 'utf8').includes(ADR_MUST_MENTION)) refusal = `docs/adr/${adrFile} does not mention "${ADR_MUST_MENTION}". The ADR that changes the fly behaviour names the guard it re-records; this one is about something else`;
        else if (!existing) refusal = `${GOLDEN_REL} is missing. Restore it from git before re-recording, so the change shows as a diff`;
        else {
            const changed = SEGMENTS.filter(s => compare(s, recordings.get(s.name)!, existing.segments[s.name])).map(s => s.name);
            existing.segments = Object.fromEntries(SEGMENTS.map(s => [s.name, fresh(s)]));
            existing.history.push(historyEntry(`re-recorded under ${adrFile}; changed: ${changed.join(', ') || 'nothing'}`, adr, SEGMENTS.length));
            writeGolden(existing);
            console.log(`--update --adr=${adr}: re-recorded ${SEGMENTS.length} segments (${changed.length} changed: ${changed.join(', ') || 'none'}) into ${GOLDEN_REL}\n`);
        }
    }
    if (refusal) { writeRefused = true; console.log(`NOT WRITTEN - ${refusal}\n`); }
}

// --- the comparison (always against the file on disk)
const golden = readGolden();
let failures = 0;
const pad = Math.max(...names.map(n => n.length));
for (const s of SEGMENTS) {
    const rec = recordings.get(s.name)!;
    const problem = compare(s, rec, golden?.segments[s.name], golden !== null);
    const counts = `${String(s.frames.length).padStart(3)} frames  ${String(rec.moved).padStart(3)} moved  ${String(rec.turned).padStart(3)} turned  ${String(rec.atRest).padStart(3)} at rest`;
    if (!problem) { console.log(`  ok    ${s.name.padEnd(pad)}  ${counts}`); continue; }
    failures++;
    console.log(`  FAIL  ${s.name.padEnd(pad)}  ${counts}`);
    for (const line of problem) console.log(`        ${line}`);
}
for (const stale of Object.keys(golden?.segments ?? {}).filter(n => !names.includes(n))) {
    failures++;
    console.log(`  FAIL  ${stale.padEnd(pad)}  the golden holds this segment but the script no longer has it (renamed or deleted?)`);
}
for (const b of blockers) { failures++; console.log(`  FAIL  ${b}`); }
if (!golden) { failures++; console.log(`  FAIL  ${GOLDEN_REL} is missing. Restore it from git`); }

if (failures === 0) {
    console.log(`\nPASS - ${SEGMENTS.length} segments, ${totalFrames} frames, ${totalMoved} displacements replay to the last bit`);
    if (writeRefused) console.log('      ... but the write this run was asked for was refused (see NOT WRITTEN above): exit 1');
    process.exit(writeRefused ? 1 : 0);
}
const made = golden?.history[golden.history.length - 1];
if (made && (made.v8 !== process.versions.v8 || made.three !== THREE.REVISION)) {
    console.log(`\nnote: the golden was recorded on node ${made.node} (V8 ${made.v8}), three r${made.three}; this run is node ${process.version} (V8 ${process.versions.v8}), three r${THREE.REVISION}.`);
    console.log('      A different runtime can move a last bit with no code change. Run this test at the commit that recorded the golden to tell the two apart.');
}
console.log(`\nFAIL - ${failures} line(s) red. A refactor must leave these numbers alone; see "THE GOLDEN, AND WHEN IT MAY CHANGE" in this file's header before reaching for --update`);
process.exit(1);
