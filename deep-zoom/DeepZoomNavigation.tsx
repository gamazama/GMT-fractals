/**
 * deep-zoom/DeepZoomNavigation.tsx - the shell flies with GMT's navigation: the engine's input
 * hook and fly integrator, driving the deep renderer through its host.
 *
 * PURPOSE
 *   Keys, the wheel and a look drag are read by `engine/plugins/navigation/useNavigationInput.ts`
 *   (the hook GMT's own navigation wraps); the frame's move and turn come from
 *   `engine/plugins/navigation/FlyIntegrator.ts` through `deep-zoom/flyCamera.ts`. This component
 *   is the wiring: it takes the input away from the renderer module (`host.setInputOwner('host')`),
 *   runs one fly step per frame, and hands the result to the host. Nothing captures the pointer.
 *
 * THE SEAM (docs/adr/0133-navigation-emits-displacements.md)
 *   - Mounted once by `DeepZoomApp.tsx`, inside the viewport frame, as a SIBLING of the picture
 *     (it renders the look-drag reticle; a child of `#dz-frame` would sit under the canvas).
 *   - The element the hook listens on is the host's frame (`host.canvas().parentElement`), so a
 *     remount after a lost context re-attaches by itself.
 *   - One tick, `deepZoom.navigate`, in the ANIMATE phase: before `deepZoom.step` (OVERLAY) draws,
 *     so a move is in the frame it was made in. The distance it flies by is the renderer's probe
 *     of the frame before, taken at the position the camera still has - it is not a frame late.
 *   - Out: `host.moveAlong([dx, dy, dz], 1)` for a move, `host.setYawPitch(yaw, pitch)` for a
 *     turn. In: `host.yawPitch()` and `host.rawDistance()`. No position is ever read back.
 *   - The fly speed and the `flying` flag live in `navigationState.ts`.
 *
 * WHAT THE HANDS DO
 *     W A S D            forward, left, back, right
 *     Space / C, E / Q   up / down along the camera's up (the renderer has no roll)
 *     Shift              four times the speed
 *     drag on the picture   look: the further from where the drag began, the faster the turn
 *     wheel on the picture  the fly speed, a tenth per notch (Shift: four notches, Alt: a tenth),
 *                           0.01 to 8 distances a second
 *
 * PITFALLS
 *   - Keys are heard on the WINDOW, whatever has focus; only a text field stops them (the hook's
 *     own rule). So no key of the list above may be an engine shortcut in this app: `C` was
 *     "next colouring" and moved to `V` (deep-zoom/hotkeys.ts).
 *   - Space stays fly-up because `setup.ts` puts the store's `cameraMode` on 'Fly': that is the
 *     predicate the timeline's own Space binding tests (grep `toggle-play` in
 *     components/TimelineHost.tsx). With the pointer over the timeline Space plays, and the fly
 *     keys are ignored (`isTimelineHovered`), as in GMT.
 *   - A fly letter pressed with Ctrl, Alt or Cmd is refused (`keysSuppressed`): those chords are
 *     shortcuts here. Without that, Alt+S saved the scene AND flew backwards (seen 2026-10-08).
 *     So this shell has no Alt "precise" modifier; it only ever scaled roll, which is not here.
 *   - A zero move is not sent: `moveAlong` marks the reference orbit dirty, and a rebuilt orbit
 *     restarts the still. The integrator calls its sink with (0, 0, 0) on a frame with no time.
 *   - A move from the hands ends a dive in flight. A look drag does not: it steers the dive.
 *   - Locked (a preview playing, a render running): no drag starts, the wheel does nothing and no
 *     step is taken. The hook still tracks held keys, so flying resumes when the lock ends.
 *   - The tick tests that its host is still the mounted one: a host is disposed by the picture's
 *     cleanup, a moment before this component's own effect is torn down.
 *
 * @assumption The wiring is what the stage-N5 smoke opens (`npm run smoke:deep-zoom -- --stage N5`:
 *   W / S, a look drag, the wheel, a text field, a dive, a deep view). The on-screen sticks, a
 *   touch layout, invert-Y and the lock during a preview are not opened by any test.
 */
import React, { useEffect, useRef } from 'react';
import { registerTick, TICK_PHASE } from '../engine/TickRegistry';
import { useNavigationInput } from '../engine/plugins/navigation/useNavigationInput';
import type { NavigationInput } from '../engine/plugins/navigation/useNavigationInput';
import { useEngineStore } from '../store/engineStore';
import { getHost, useHost } from './host/current';
import { getTelemetry } from './host/telemetry';
import { createFlyCamera } from './flyCamera';
import { stopDive, useDive } from './diveControl';
import { DZ_FLY_SPEED_RANGE, setFlySpeed, setFlying, useDzNavigation } from './navigationState';

/** The tick that flies the camera. A throwing tick raises no page error: the smoke watches the
 *  console for `[TickRegistry] tick "deepZoom.navigate" threw`. */
const DZ_NAV_TICK_NAME = 'deepZoom.navigate';

/** The hook's fly mode. This app has no other. */
const FLY = 'Fly';

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
const onFlyBegin = (): void => setFlying(true);
const onFlyEnd = (): void => setFlying(false);

export const DeepZoomNavigation: React.FC = () => {
    const host = useHost();
    const element = host ? host.canvas().parentElement : null;
    const invertY = useEngineStore((s) => s.invertY);
    const speed = useDzNavigation((s) => s.flySpeed);
    const reticle = useRef<HTMLDivElement>(null);

    const input = useNavigationInput({
        element,
        mode: FLY,
        flyMode: FLY,
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
        host.setInputOwner('host');
        const camera = createFlyCamera();

        const translate = (dx: number, dy: number, dz: number): void => {
            if (dx === 0 && dy === 0 && dz === 0) return;
            if (useDive.getState().dive) stopDive();
            host.moveAlong([dx, dy, dz], 1);
        };

        return registerTick(DZ_NAV_TICK_NAME, TICK_PHASE.ANIMATE, (delta) => {
            if (getHost() !== host) return;
            const inp = inputRef.current;
            inp.frame(delta);

            const dragging = inp.isDraggingRef.current;
            const dragX = dragging ? inp.mousePos.current.x - inp.dragStart.current.x : 0;
            const dragY = dragging ? inp.mousePos.current.y - inp.dragStart.current.y : 0;

            // The reticle sits where the drag has got to, measured from the picture's centre.
            const mark = reticle.current;
            if (mark) {
                const frame = host.canvas().parentElement;
                if (dragging && frame && (Math.abs(dragX) > 0.001 || Math.abs(dragY) > 0.001)) {
                    mark.style.opacity = '1';
                    mark.style.transform = `translate(calc(-50% + ${dragX * frame.clientWidth * 0.5}px), calc(-50% + ${-dragY * frame.clientHeight * 0.5}px))`;
                } else {
                    mark.style.opacity = '0';
                }
            }

            if (navigationLocked()) return;
            const look = host.yawPitch();
            const turned = camera.step({
                delta,
                yaw: look.yaw,
                pitch: look.pitch,
                inputs: {
                    move: inp.moveState.current,
                    look: inp.joystickLook.current,
                    moveJoy: inp.joystickMove.current,
                    isDragging: dragging,
                    dragDelta: { x: dragX, y: dragY },
                    invertY: inp.invertY,
                },
                speed: inp.speedRef.current,
                distance: host.rawDistance(),
                translate,
            });
            if (turned) host.setYawPitch(turned.yaw, turned.pitch);
        });
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
