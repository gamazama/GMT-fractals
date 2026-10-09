/**
 * deep-zoom/DeepZoomNavigation.tsx - the shell flies with GMT's navigation: the engine's input
 * hook and fly integrator, driving the deep renderer through its host; and it orbits as GMT does,
 * about the point under the pointer.
 *
 * PURPOSE
 *   Keys, the wheel and a look drag are read by `engine/plugins/navigation/useNavigationInput.ts`
 *   (the hook GMT's own navigation wraps); the frame's move and turn come from
 *   `engine/plugins/navigation/FlyIntegrator.ts` through `deep-zoom/flyCamera.ts`. This component
 *   is the wiring: it takes the input away from the renderer module (`host.setInputOwner('host')`),
 *   runs one step per frame, and hands the result to the host. Nothing captures the pointer.
 *
 * THE SEAM (docs/adr/0133-navigation-emits-displacements.md, docs/adr/0134-the-deep-zoomer-flies-by-rays.md)
 *   - Mounted once by `DeepZoomApp.tsx`, inside the viewport frame, as a SIBLING of the picture
 *     (it renders the reticle; a child of `#dz-frame` would sit under the canvas).
 *   - The element the hook and the orbit listeners sit on is the host's frame
 *     (`host.canvas().parentElement`), so a remount after a lost context re-attaches by itself.
 *   - One tick, `deepZoom.navigate`, in the ANIMATE phase: before `deepZoom.step` (OVERLAY) draws,
 *     so a move is in the frame it was made in.
 *   - Out: `host.moveAlong([dx, dy, dz], 1)` for a move, `host.setYawPitch(yaw, pitch)` for a
 *     turn. In: `host.yawPitch()`, `host.sense(...)`, `host.freeDistance(...)` and
 *     `host.rawDistance()`. No position is ever read back.
 *   - The mode is the engine store's `cameraMode` ('Fly' or 'Orbit'), the field GMT's own Tab key
 *     flips; this app's Tab is in `deep-zoom/hotkeys.ts`. The fly speed, the speed rule's two
 *     settings, the `flying` flag and the readings the readouts show live in `navigationState.ts`.
 *
 * WHAT THE SPEED FOLLOWS (the rule is `deep-zoom/flyPace.ts`, its reasons are there)
 *   The pace - the distance the speed is multiplied by - is the nearer of WHAT IS LOOKED AT and
 *   WHAT LIES AHEAD OF THE MOVE. Each is a bundle of seven rays the renderer marches on the CPU,
 *   from the camera as it is now to the solid as it is drawn (`host.sense`): about the view axis,
 *   and about the move's own direction when that is another one (S, A, D, up, down, a diagonal).
 *   For W alone the two are one bundle. One frame never moves more than half the nearest ray ahead
 *   of the move. The estimate at the camera (`host.rawDistance()`) stands in only when nothing
 *   lies that way at all, and is the whole rule when Settings > "Speed follows the view" is off.
 *   - While something flies the view's bundle is read every frame; otherwise 8 times a second,
 *     which also feeds the readouts (`setReadings`) and keeps the pace current for the moment a
 *     key goes down. The renderer keeps each bundle: a still camera costs nothing.
 *   - The pace starts afresh on the host's `viewSet` event (a jump) and while the rule is off.
 *
 * WHAT THE HANDS DO
 *   Fly (the mode the app starts in):
 *     W A S D            forward, left, back, right
 *     Space / C, E / Q   up / down along the camera's up (the renderer has no roll)
 *     Shift              four times the speed
 *     drag on the picture   look: the further from where the drag began, the faster the turn
 *     wheel on the picture  the fly speed, a tenth per notch (Shift: four notches, Alt: a tenth),
 *                           0.01 to 8 paces a second
 *   Orbit (Tab; the maths is `deep-zoom/orbitCamera.ts`):
 *     drag               turns the camera about the point under the pointer where the drag began;
 *                        that point stays where it is in the picture (a full picture height of
 *                        drag is a full turn, as in GMT)
 *     wheel              flies along the pointer's ray: a notch covers 14 % of the way to the point
 *                        under the pointer, or backs away by as much (Shift four times, Alt a tenth)
 *     middle drag        the same flight by hand, as in GMT: up is towards the point under the
 *                        pointer where the drag began, down is back from it; about 140 pixels
 *                        halve the distance (Shift four times, Alt a tenth)
 *     right drag         drags the point under the pointer: the camera moves in the picture's plane
 *     the fly keys do nothing, as in GMT's Orbit mode
 *   The pivot is ONE ray of the renderer's through the pointer (`host.freeDistance`); with nothing
 *   under the pointer it is the middle of the picture at the depth the app shows (GMT: the view
 *   axis at the last surface distance). Every orbit move is cut to half the nearest ray ahead of
 *   it, like a fly move, so a turn that would swing the camera into a wall stops short of it.
 *   And a turn or a drag keeps a CLEARANCE (`DZ_ORBIT_CLEARANCE`): the camera is not carried to
 *   where the nearest surface, in any direction, is nearer than a share of the pivot's distance.
 *   A turn that is held tries its yaw alone, then its pitch alone, so the camera slides along
 *   what holds it; while it is held the pivot's mark fills in. The wheel and the middle drag are
 *   not held by it: they fly along one ray to the pivot, and the rays keep them off it.
 *   A flight - from the first key down to the last key up - or an orbit gesture is one undo step
 *   when it moved the camera (`flightBegan` / `flightEnded` in `deep-zoom/locations.ts`).
 *
 * PITFALLS
 *   - Keys are heard on the WINDOW, whatever has focus; only a text field stops them (the hook's
 *     own rule). So no key of the list above may be an engine shortcut in this app: `C` was
 *     "next colouring" and moved to `V` (deep-zoom/hotkeys.ts).
 *   - Space is fly-up only while the store's `cameraMode` is 'Fly': that is the predicate the
 *     timeline's own Space binding tests (grep `toggle-play` in components/TimelineHost.tsx). In
 *     Orbit mode Space plays the timeline, as in GMT. With the pointer over the timeline Space
 *     plays in either mode, and the fly keys are ignored (`isTimelineHovered`).
 *   - A fly letter pressed with Ctrl, Alt or Cmd is refused (`keysSuppressed`): those chords are
 *     shortcuts here. Without that, Alt+S saved the scene AND flew backwards (seen 2026-10-08).
 *     So this shell has no Alt "precise" modifier; it only ever scaled roll, which is not here.
 *   - A zero move is not sent: `moveAlong` marks the reference orbit dirty, and a rebuilt orbit
 *     restarts the still.
 *   - A move from the hands ends a dive in flight. A look drag does not: it steers the dive.
 *   - Locked (a preview playing, a render running): no drag starts, the wheel does nothing and no
 *     step is taken. The hook still tracks held keys, so flying resumes when the lock ends. The
 *     readings go on, so the readouts follow a preview.
 *   - The tick tests that its host is still the mounted one: a host is disposed by the picture's
 *     cleanup, a moment before this component's own effect is torn down.
 *   - A bundle costs milliseconds of this thread when it is marched (measured in node, not in the
 *     app: 0.5 to 5 ms; one of 27 ms at the power-4 place, then kept). Two a frame at most.
 *   - ORBIT MOVES ARE MADE IN THE TICK, NOT IN THE POINTER EVENT. GMT applies a turn inside
 *     `pointermove`; here each move needs a bundle of rays for its limit, and a mouse sends more
 *     events than frames. The events only add up pixels.
 *   - AN ORBIT GESTURE OPENS ITS OWN UNDO BRACKET (`openGesture`): the hook's activity session
 *     covers keys and a fly look-drag only. The hook's own begin is ignored in Orbit mode, where a
 *     held fly key moves nothing - it would otherwise restart a gesture's take-off view under it.
 *   - The orbit wheel listener is NOT passive (it must stop the page from scrolling); the hook's
 *     own wheel listener on the same element is, and does nothing in Orbit mode.
 *   - THE CLEARANCE IS A COMFORT DISTANCE, NOT WHAT KEEPS THE CAMERA OUT. It is read from the
 *     renderer's estimate (`host.estimateAt`), which under-reads on ordinary ground and can
 *     over-read beside the drawn surface. The rays (`allowed`) are what stop a move; the clearance
 *     only decides how near the picture may be brought. "Here" and "there" are both asked of
 *     `estimateAt`, never of `rawDistance()`: the two differ by 0.1 % outside radius 2.
 *
 * @assumption The wiring is what the stage-N5 smoke opens (`npm run smoke:deep-zoom -- --stage N5`:
 *   W / S, a look drag, the wheel, a text field, a dive, a deep view, the wall-behind place, a
 *   flight's undo, and Orbit mode's turn, its clearance, the wheel and Tab). The on-screen sticks, a
 *   touch layout, invert-Y, the right drag, the middle drag (it shares the wheel's `zoomBy`) and
 *   the lock during a preview are not opened by any test.
 */
import React, { useEffect, useRef } from 'react';
import { registerTick, TICK_PHASE } from '../engine/TickRegistry';
import { getCameraModifierFromEvent } from '../engine/plugins/navigation/modifiers';
import { useNavigationInput } from '../engine/plugins/navigation/useNavigationInput';
import type { NavigationInput } from '../engine/plugins/navigation/useNavigationInput';
import { useEngineStore } from '../store/engineStore';
import { getHost, useHost } from './host/current';
import { getTelemetry } from './host/telemetry';
import { createFlyCamera } from './flyCamera';
import { DZ_NAV_STRIDE_SHARE, createPace, paceReading } from './flyPace';
import { readDepth } from './depthNow';
import type { DepthReading } from './depthNow';
import { stopDive, useDive } from './diveControl';
import { flightBegan, flightEnded } from './locations';
import { DZ_FLY_SPEED_RANGE, DZ_MODE_FLY, DZ_MODE_ORBIT, cameraModeOf, setFlySpeed, setFlying, setReadings, useDzNavigation } from './navigationState';
import { orbitDrag, orbitTurn, orbitZoom, viewRay } from './orbitCamera';
import type { OrbitPivot, V3 } from './orbitCamera';

/** The tick that flies the camera. A throwing tick raises no page error: the smoke watches the
 *  console for `[TickRegistry] tick "deepZoom.navigate" threw`. */
const DZ_NAV_TICK_NAME = 'deepZoom.navigate';

/** The slot the move's own bundle is kept under in the renderer. */
const DZ_MOVE_SLOT = 'move';
/** How often the view's bundle is read while nothing flies, and how often the readings are
 *  published: the telemetry store's rate. */
const DZ_NAV_READ_MS = 125;

/** A pick under the pointer: one ray, to a 200th of its distance, with steps enough for a surface
 *  many decades away. */
const DZ_PICK = { tol: 0.005, maxSteps: 512 } as const;
/** The orbit wheel: `exp(deltaY x this)` is the share of the distance left after an event. GMT's
 *  own number (grep `e.deltaY * 0.0015` in engine-gmt/navigation/Navigation.tsx): a notch of 100
 *  leaves 86 %. */
const DZ_WHEEL_ZOOM = 0.0015;
/** The orbit's middle drag: `exp(pixels down x this)` is the share of the distance left, so up is
 *  towards. GMT's own number and direction (grep `dy * 0.005` in
 *  engine-gmt/navigation/Navigation.tsx): about 140 pixels up halve the distance. */
const DZ_MIDDLE_ZOOM = 0.005;
/** A wheel burst keeps its pivot until the pointer has moved this far, or the wheel has rested
 *  this long (which also ends the gesture's undo bracket). */
const DZ_WHEEL_PIVOT_PX = 10;
const DZ_WHEEL_REST_MS = 300;
/** One frame of the wheel, or of a middle drag, never covers more than this share of the way to the pivot. */
const DZ_ZOOM_MAX_SHARE = 0.5;
/** A full picture height of drag turns the camera this far: a full turn, GMT's own. */
const DZ_ORBIT_TURN = 2 * Math.PI;
/**
 * ORBIT CLEARANCE. A turn or a drag may not carry the camera to where the nearest surface - in any
 * direction, by the renderer's estimate there - is nearer than this share of the pivot's distance;
 * unless it is no nearer there than where the camera stands, so a camera that is already too close
 * can still back out. The owner, having flown the first Orbit mode (2026-10-09): "if we could
 * prevent it from colliding with the surface, relatively to the orbit's axis point". Without it
 * the rays alone let a turn bring the camera asymptotically onto the pivot's own surface (half the
 * way each frame), which reads as a collision. The estimate under-reads on ordinary ground (0.28 to
 * 0.70 of the true clearance along the recorded flight), so the stand-off is in truth 1.4 to 3.6
 * times this. A feel number: his to set.
 */
const DZ_ORBIT_CLEARANCE = 0.08;

/** One wheel notch: a tenth faster or slower, whatever the speed (`modifier` is 4 with Shift and
 *  0.1 with Alt). The engine's default is three additive steps sized for GMT's 0.001..1 range. */
export const dzWheelStep = (current: number, dir: 1 | -1, modifier: number): number => current * Math.pow(1.1, dir * modifier);

const navigationLocked = (): boolean => {
    const t = getTelemetry();
    return t.exporting || t.playing;
};
/** A key that is not a move: the pointer is over the timeline (GMT's rule), or the key comes with
 *  Ctrl / Alt / Cmd - a shortcut (Alt+S saves the scene, Ctrl+Z undoes), never a fly key. */
const keysSuppressed = (e: KeyboardEvent): boolean =>
    e.ctrlKey || e.altKey || e.metaKey || !!useEngineStore.getState().isTimelineHovered;
const orbiting = (): boolean => cameraModeOf(useEngineStore.getState()) === DZ_MODE_ORBIT;
// The hook's session (a key or a fly look-drag held). In Orbit mode a held key moves nothing, and
// its begin must not restart the take-off view of an orbit gesture in the air (see PITFALLS).
const onFlyBegin = (): void => { if (orbiting()) return; setFlying(true); flightBegan(); };
const onFlyEnd = (): void => { if (orbiting()) return; setFlying(false); flightEnded(); };

/** An orbit drag in the air: its pivot, and the pixels the pointer has moved since the last tick.
 *  `turn` is the left button, `zoom` the middle one, `drag` the right one. */
interface OrbitDragState {
    kind: 'turn' | 'zoom' | 'drag';
    pivot: OrbitPivot;
    pointerId: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    /** A middle drag's zoom not yet applied: a sum of logarithms, like the wheel's. */
    log: number;
    /** The picture's height in CSS pixels when the drag began. */
    height: number;
    /** The clearance held the last move of this drag back (it stays so until a move goes through whole). */
    held: boolean;
}
/** A wheel burst: its pivot, the zoom not yet applied (a sum of logarithms), where and when the
 *  wheel last turned. */
interface OrbitWheelState {
    pivot: OrbitPivot;
    log: number;
    x: number;
    y: number;
    at: number;
    height: number;
}

export const DeepZoomNavigation: React.FC = () => {
    const host = useHost();
    const element = host ? host.canvas().parentElement : null;
    const invertY = useEngineStore((s) => s.invertY);
    const mode = useEngineStore(cameraModeOf);
    const speed = useDzNavigation((s) => s.flySpeed);
    const reticle = useRef<HTMLDivElement>(null);

    const input = useNavigationInput({
        element,
        mode,
        flyMode: DZ_MODE_FLY,
        orbitMode: DZ_MODE_ORBIT,
        invertY,
        speed,
        setSpeed: setFlySpeed,
        speedRange: DZ_FLY_SPEED_RANGE,
        wheelStep: dzWheelStep,
        isLocked: navigationLocked,
        isSuppressed: keysSuppressed,
        onActivityBegin: onFlyBegin,
        onActivityEnd: onFlyEnd,
    });
    // The hook's refs are stable, the object it returns is not: the tick reads it through a ref.
    const inputRef = useRef<NavigationInput>(input);
    inputRef.current = input;

    useEffect(() => {
        if (!host) return;
        const frameEl = host.canvas().parentElement;
        host.setInputOwner('host');
        const camera = createFlyCamera();
        const pace = createPace();
        let lastRead = -Infinity;
        let lastPublished = -Infinity;
        // A jump: the pace of the place just left says nothing about this one.
        const offViewSet = host.on('viewSet', () => { pace.reset(); lastRead = -Infinity; });

        const translate = (dx: number, dy: number, dz: number): void => {
            if (dx === 0 && dy === 0 && dz === 0) return;
            if (useDive.getState().dive) stopDive();
            host.moveAlong([dx, dy, dz], 1);
        };

        // ── Orbit mode: the gestures only gather; the tick below moves ──
        const orbit: { drag: OrbitDragState | null; wheel: OrbitWheelState | null; gesture: boolean } = { drag: null, wheel: null, gesture: false };
        /** The point of the picture under a pointer position, and the surface there. */
        const pick = (clientX: number, clientY: number): { pivot: OrbitPivot; height: number } | null => {
            const rect = host.canvas().getBoundingClientRect();
            if (!(rect.height > 0)) return null;
            const u = (clientX - (rect.left + rect.width / 2)) / rect.height;
            const v = ((rect.top + rect.height / 2) - clientY) / rect.height;
            const look = host.yawPitch();
            const hit = host.freeDistance(viewRay(look.yaw, look.pitch, u, v), DZ_PICK);
            if (hit.kind === 'hit' && hit.t > 0) return { pivot: { u, v, distance: hit.t }, height: rect.height };
            // Nothing under the pointer: the middle of the picture, at the depth the app shows.
            return { pivot: { u: 0, v: 0, distance: useDzNavigation.getState().depth }, height: rect.height };
        };
        const openGesture = (): void => {
            if (orbit.gesture) return;
            orbit.gesture = true;
            setFlying(true);
            flightBegan();
        };
        const closeGesture = (): void => {
            if (!orbit.gesture) return;
            orbit.gesture = false;
            setFlying(false);
            flightEnded();
        };
        const onPointerDown = (e: PointerEvent): void => {
            if (!orbiting() || navigationLocked() || orbit.drag || e.pointerType === 'touch' || e.button < 0 || e.button > 2) return;
            const picked = pick(e.clientX, e.clientY);
            if (!picked) return;
            orbit.drag = { kind: e.button === 2 ? 'drag' : e.button === 1 ? 'zoom' : 'turn', pivot: picked.pivot, pointerId: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, log: 0, height: picked.height, held: false };
            // The middle button's own action in a browser is a scroll by dragging.
            if (e.button === 1) e.preventDefault();
            // So the drag goes on outside the picture. A synthetic event has no pointer to capture.
            try { frameEl?.setPointerCapture(e.pointerId); } catch { /* not captured; moves over the picture still arrive */ }
        };
        const onPointerMove = (e: PointerEvent): void => {
            const drag = orbit.drag;
            if (!drag || e.pointerId !== drag.pointerId) return;
            // Read as it comes, so each event carries its own Shift / Alt (GMT's way).
            if (drag.kind === 'zoom') drag.log += (e.clientY - drag.y) * DZ_MIDDLE_ZOOM * getCameraModifierFromEvent(e);
            drag.dx += e.clientX - drag.x;
            drag.dy += e.clientY - drag.y;
            drag.x = e.clientX;
            drag.y = e.clientY;
        };
        const onPointerUp = (e: PointerEvent): void => {
            if (orbit.drag && e.pointerId === orbit.drag.pointerId) orbit.drag = null;
        };
        const onContextMenu = (e: Event): void => { if (orbiting()) e.preventDefault(); };
        const onWheel = (e: WheelEvent): void => {
            if (!orbiting() || navigationLocked()) return;
            e.preventDefault();
            const now = performance.now();
            let wheel = orbit.wheel;
            if (!wheel || now - wheel.at > DZ_WHEEL_REST_MS || Math.hypot(e.clientX - wheel.x, e.clientY - wheel.y) > DZ_WHEEL_PIVOT_PX) {
                const picked = pick(e.clientX, e.clientY);
                if (!picked) return;
                wheel = orbit.wheel = { pivot: picked.pivot, log: 0, x: e.clientX, y: e.clientY, at: now, height: picked.height };
            }
            wheel.at = now;
            wheel.log += e.deltaY * DZ_WHEEL_ZOOM * getCameraModifierFromEvent(e);
        };
        frameEl?.addEventListener('pointerdown', onPointerDown);
        frameEl?.addEventListener('pointermove', onPointerMove);
        frameEl?.addEventListener('pointerup', onPointerUp);
        frameEl?.addEventListener('pointercancel', onPointerUp);
        frameEl?.addEventListener('contextmenu', onContextMenu);
        frameEl?.addEventListener('wheel', onWheel, { passive: false });

        /** The share of a move that may be made this frame: all of it, or as much as half the
         *  nearest ray ahead of it allows. */
        const allowed = (move: V3): number => {
            const length = Math.hypot(move[0], move[1], move[2]);
            if (!(length > 0)) return 0;
            const near = host.sense([move[0] / length, move[1] / length, move[2] / length], { slot: DZ_MOVE_SLOT }).near;
            return Math.min(1, (DZ_NAV_STRIDE_SHARE * near) / length);
        };
        /** A flight along a pivot's ray - the wheel's and the middle drag's. `log` is the logarithm of
         *  the share of the pivot's distance to leave. One frame covers at most DZ_ZOOM_MAX_SHARE of
         *  the way, and no more than the rays allow. */
        const zoomBy = (look: { yaw: number; pitch: number }, pivot: OrbitPivot, log: number): void => {
            let factor = Math.max(Math.exp(log), 1 - DZ_ZOOM_MAX_SHARE);
            let zoom = orbitZoom(look.yaw, look.pitch, pivot, factor);
            const share = allowed(zoom.move);
            if (share < 1) {
                factor = 1 - (1 - factor) * share;
                zoom = orbitZoom(look.yaw, look.pitch, pivot, factor);
            }
            if (zoom.move[0] !== 0 || zoom.move[1] !== 0 || zoom.move[2] !== 0) {
                openGesture();
                translate(zoom.move[0], zoom.move[1], zoom.move[2]);
                pivot.distance = zoom.distance;
            }
        };
        /** One frame of Orbit mode. Returns the pivot to mark in the picture (and whether the
         *  clearance held a move back this frame), or null. */
        const orbitFrame = (now: number): { pivot: OrbitPivot; height: number; held: boolean } | null => {
            const look = host.yawPitch();
            const drag = orbit.drag;
            let held = false;
            if (drag && drag.kind === 'zoom') {
                if (drag.log !== 0) {
                    const log = drag.log;
                    drag.log = 0;
                    zoomBy(look, drag.pivot, log);
                }
            } else if (drag && (drag.dx !== 0 || drag.dy !== 0)) {
                const du = drag.dx / drag.height, dv = -drag.dy / drag.height;
                drag.dx = 0;
                drag.dy = 0;
                const pivot = drag.pivot;
                // The clearance (see DZ_ORBIT_CLEARANCE): may the camera stand at `move` from here?
                const here = host.estimateAt([0, 0, 0]);
                const clear = (move: V3): boolean => {
                    const there = host.estimateAt(move);
                    return there >= DZ_ORBIT_CLEARANCE * pivot.distance || there >= here;
                };
                if (drag.kind === 'turn') {
                    // Right raises the yaw and down lowers the pitch: the picture turns with the hand.
                    const dYaw = DZ_ORBIT_TURN * du, dPitch = DZ_ORBIT_TURN * dv;
                    // The whole turn; where the clearance holds that, the yaw alone, then the pitch
                    // alone: the camera slides along what holds it instead of sticking to it.
                    const tries: Array<[number, number]> = dYaw !== 0 && dPitch !== 0 ? [[dYaw, dPitch], [dYaw, 0], [0, dPitch]] : [[dYaw, dPitch]];
                    for (const [a, b] of tries) {
                        let turn = orbitTurn(look.yaw, look.pitch, pivot, a, b);
                        if (turn.move[0] !== 0 || turn.move[1] !== 0 || turn.move[2] !== 0) {
                            // The clearance first: it is one orbit, where the limit by rays is a bundle of them.
                            if (!clear(turn.move)) { held = true; continue; }
                            const share = allowed(turn.move);
                            if (share < 1) {
                                turn = orbitTurn(look.yaw, look.pitch, pivot, a * share, b * share);
                                if (!clear(turn.move)) { held = true; continue; }
                            }
                        }
                        openGesture();
                        translate(turn.move[0], turn.move[1], turn.move[2]);
                        host.setYawPitch(turn.yaw, turn.pitch);
                        break;
                    }
                } else {
                    const move = orbitDrag(look.yaw, look.pitch, pivot, du, dv);
                    const share = clear(move) ? allowed(move) : 0;
                    const cut: V3 = [move[0] * share, move[1] * share, move[2] * share];
                    if (share > 0 && clear(cut)) {
                        openGesture();
                        translate(cut[0], cut[1], cut[2]);
                        pivot.u += du * share;            // the pivot follows the pointer across the picture
                        pivot.v += dv * share;
                    } else {
                        held = true;
                    }
                }
                drag.held = held;
            }
            const wheel = orbit.wheel;
            if (wheel && wheel.log !== 0) {
                const log = wheel.log;
                wheel.log = 0;
                zoomBy(look, wheel.pivot, log);
            }
            const wheeling = !!wheel && now - wheel.at <= DZ_WHEEL_REST_MS;
            if (!drag && !wheeling) closeGesture();
            return drag ? { pivot: drag.pivot, height: drag.height, held: drag.held } : wheeling && wheel ? { pivot: wheel.pivot, height: wheel.height, held: false } : null;
        };

        const offTick = registerTick(DZ_NAV_TICK_NAME, TICK_PHASE.ANIMATE, (delta) => {
            if (getHost() !== host) return;
            const inp = inputRef.current;
            inp.frame(delta);

            const dragging = inp.isDraggingRef.current;
            const dragX = dragging ? inp.mousePos.current.x - inp.dragStart.current.x : 0;
            const dragY = dragging ? inp.mousePos.current.y - inp.dragStart.current.y : 0;

            const nav = useDzNavigation.getState();
            const now = performance.now();
            const inOrbit = orbiting();
            const locked = navigationLocked();
            if (!nav.followView) pace.reset();
            // The view's bundle, at most once a frame, only when something asks for it. (Held in
            // an object: the compiler does not follow an assignment made inside a closure.)
            const got: { read: DepthReading | null; moved: boolean } = { read: null, moved: false };
            const view = (): DepthReading => (got.read ??= readDepth(host));

            let pivotMark: { pivot: OrbitPivot; height: number; held: boolean } | null = null;
            if (inOrbit) {
                if (locked) { orbit.drag = null; orbit.wheel = null; closeGesture(); } else pivotMark = orbitFrame(now);
            } else {
                // Left Orbit mode with a gesture in the air: it ends here.
                if (orbit.drag || orbit.wheel || orbit.gesture) { orbit.drag = null; orbit.wheel = null; closeGesture(); }
                if (!locked) {
                    const look = host.yawPitch();
                    const cp = Math.cos(look.pitch);
                    const fwd: V3 = [cp * Math.cos(look.yaw), Math.sin(look.pitch), cp * Math.sin(look.yaw)];
                    const held = inp.moveState.current;
                    const turned = camera.step({
                        delta,
                        yaw: look.yaw,
                        pitch: look.pitch,
                        inputs: {
                            move: held,
                            look: inp.joystickLook.current,
                            moveJoy: inp.joystickMove.current,
                            isDragging: dragging,
                            dragDelta: { x: dragX, y: dragY },
                            invertY: inp.invertY,
                        },
                        speed: inp.speedRef.current,
                        distance: host.rawDistance(),
                        sense: nav.followView ? (direction) => {
                            got.moved = true;
                            const nearest = host.rawDistance();
                            const looked = view().sense;
                            const alongView = direction[0] * fwd[0] + direction[1] * fwd[1] + direction[2] * fwd[2] > 1 - 1e-9;
                            const ahead = alongView ? looked : host.sense(direction, { slot: DZ_MOVE_SLOT });
                            const value = pace.step({
                                delta,
                                look: paceReading(looked, nearest),
                                ahead: paceReading(ahead, nearest),
                                rise: nav.paceRise,
                                boost: held.boost,
                            });
                            return { pace: value, limit: DZ_NAV_STRIDE_SHARE * ahead.near };
                        } : undefined,
                        translate,
                    });
                    if (turned) host.setYawPitch(turned.yaw, turned.pitch);
                }
            }

            // The reticle: where a fly look-drag has got to (measured from the picture's centre),
            // or the pivot an orbit gesture turns about.
            const mark = reticle.current;
            if (mark) {
                const frame = host.canvas().parentElement;
                // Filled in while the clearance holds a turn back: the hand is told why nothing moves.
                mark.classList.toggle('bg-warn/70', !!pivotMark && pivotMark.held);
                if (pivotMark) {
                    mark.style.opacity = '1';
                    mark.style.transform = `translate(calc(-50% + ${pivotMark.pivot.u * pivotMark.height}px), calc(-50% + ${-pivotMark.pivot.v * pivotMark.height}px))`;
                } else if (!inOrbit && dragging && frame && (Math.abs(dragX) > 0.001 || Math.abs(dragY) > 0.001)) {
                    mark.style.opacity = '1';
                    mark.style.transform = `translate(calc(-50% + ${dragX * frame.clientWidth * 0.5}px), calc(-50% + ${-dragY * frame.clientHeight * 0.5}px))`;
                } else {
                    mark.style.opacity = '0';
                }
            }

            // Nothing flew this frame: the view is still read 8 times a second, for the readouts
            // and so the pace is right the moment a key goes down.
            if (!got.moved && now - lastRead >= DZ_NAV_READ_MS) {
                const seconds = Number.isFinite(lastRead) ? (now - lastRead) / 1000 : 0;
                lastRead = now;
                if (nav.followView) pace.step({ delta: seconds, look: paceReading(view().sense, host.rawDistance()), ahead: NaN, rise: nav.paceRise, boost: false });
                else view();
            }
            if (got.read && now - lastPublished >= DZ_NAV_READ_MS) {
                lastPublished = now;
                const shown = nav.followView ? pace.value() : host.rawDistance();
                setReadings(got.read.depth, got.read.isLook, shown > 0 && Number.isFinite(shown) ? shown : 0);
            }
        });
        return () => {
            offTick();
            offViewSet();
            frameEl?.removeEventListener('pointerdown', onPointerDown);
            frameEl?.removeEventListener('pointermove', onPointerMove);
            frameEl?.removeEventListener('pointerup', onPointerUp);
            frameEl?.removeEventListener('pointercancel', onPointerUp);
            frameEl?.removeEventListener('contextmenu', onContextMenu);
            frameEl?.removeEventListener('wheel', onWheel);
            closeGesture();
            setReadings(0, false, 0);
        };
    }, [host]);

    return (
        <div
            ref={reticle}
            aria-hidden
            data-dz-reticle
            className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 rounded-full border border-fg/70 opacity-0"
            style={{ transform: 'translate(-50%, -50%)' }}
        />
    );
};
