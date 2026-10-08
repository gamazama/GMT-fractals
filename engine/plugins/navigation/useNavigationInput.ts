/**
 * engine/plugins/navigation/useNavigationInput.ts - the hands of fly navigation: keys, wheel, a
 * look drag and the two on-screen sticks, turned into the state `FlyIntegrator.update` reads.
 *
 * PURPOSE
 *   It was GMT's `useInputController`, tied to react-three-fiber (it took the canvas from
 *   `useThree` and ran from `useFrame`) and to GMT's store. It is here, renderer-free and
 *   store-free, so a second app flies with the same hands. GMT's hook is now a thin wrapper that
 *   supplies what this one used to read for itself (`engine-gmt/navigation/useInputController.ts`).
 *
 * THE SEAM
 *   What it needs: the ELEMENT the picture is drawn in (mouse down and the wheel are heard there,
 *   and a drag is measured against its box), the mode name, the fly speed and its setter, and the
 *   callbacks below. Keys, blur and the stick events are heard on `window`, as before.
 *   What it gives back: refs (`moveState`, `isDraggingRef`, `dragStart`, `mousePos`, `speedRef`,
 *   `joystickMove`, `joystickLook`, `rollVelocity`), `invertY`, `isInteracting()`, and
 *   `frame(delta)`. THE CALLER RUNS `frame(delta)` ONCE PER FRAME, delta in seconds - from
 *   `useFrame`, from an engine tick, from anything. Nothing here schedules itself.
 *   The mode: `mode === flyMode` switches on the look drag and the wheel's speed law;
 *   `mode === orbitMode` only marks activity (an orbit drag or wheel is some other code's job).
 *
 * PITFALLS
 *   - Keys are heard on the WINDOW, whatever has focus. Only a text field stops them (an input, a
 *     textarea, anything contenteditable, a CodeMirror editor): both the event's target and
 *     `document.activeElement` are tested, because the target can be `document.body` while a
 *     field has focus (portaled dialogs, fast re-renders).
 *   - Space, Alt and Ctrl/Cmd+W have their default prevented BEFORE the `isSuppressed()` test, as
 *     the hook always did: a suppressed key still does not scroll the page.
 *   - A fly letter pressed WITH Ctrl, Alt or Cmd still counts as that fly key here (GMT has always
 *     flown that way: Alt is its precise modifier). An app whose shortcuts use such chords - Alt+S
 *     to save, say - must refuse them in `isSuppressed(e)`, or saving also moves the camera (seen
 *     in the deep-zoom shell, 2026-10-08).
 *   - The wheel is read on the element only, passively. Its modifier (Shift 4x, Alt 0.1x) comes
 *     from the event, not from the tracked key state: a wheel event can arrive before a keydown.
 *   - `onWheel` runs first and returning true ends the event there (GMT: the orthographic scale).
 *   - The three activity callbacks are one balanced session: begin on the first active frame, poke
 *     on each further one, end on the first idle frame and on unmount. "Active" is: not locked,
 *     and a key, a stick or a fly look-drag is held. Do not ref-count them with another path.
 *   - Callbacks and ranges are read through a ref, so passing new closures every render does not
 *     re-attach the listeners. `mode`, `element`, `setSpeed` and `isTouchLayout` do re-attach.
 *   - A look drag does not start on a touch layout in fly mode: there the sticks do the looking.
 *
 * @assumption The behaviour is what GMT's hook had before the move - checked by `npm run smoke:fly`
 *   in app-gmt, green before and after (W / S, A / D, Space / C, Shift, the wheel's speed, a text
 *   field, drag-look; each line seen red against the old hook on 2026-10-08). Roll, Alt, the
 *   sticks, invert-Y, the `onWheel` branch and the activity session are NOT opened by any test, so
 *   this is not an @invariant.
 */
import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';
import { getCameraModifierFromEvent } from './modifiers';
import type { JoystickInput, MoveInputState } from './FlyIntegrator';

export interface NavigationInputOptions {
    /** The element the picture is drawn in. Null: nothing is attached until there is one. */
    element: HTMLElement | null;
    /** The current navigation mode's name. */
    mode: string;
    /** The mode in which a left-drag looks and the wheel changes the fly speed. Default 'Fly'. */
    flyMode?: string;
    /** The mode in which a drag or the wheel only marks activity. Default 'Orbit'. */
    orbitMode?: string;
    /** Movement is locked (an export, a gizmo drag, playback): wheel and mouse down do nothing. */
    isLocked: () => boolean;
    /** This key press is not navigation's: the pointer is over something that owns the keys, or
     *  (the app's choice, it is handed the event) the press is a chord that belongs to a shortcut.
     *  Asked on key DOWN only; a key up always clears its flag. */
    isSuppressed?: (e: KeyboardEvent) => boolean;
    /** A phone-style layout: no look drag in fly mode. */
    isTouchLayout?: boolean;
    /** True for a mouse-down target that is not the picture's (a control drawn over it). */
    excludeTarget?: (target: EventTarget | null) => boolean;
    invertY: boolean;
    /** The fly speed and where a wheel change goes. */
    speed: number;
    setSpeed: (v: number) => void;
    /** The wheel cannot take the speed outside this. Default [0.001, 1.0]. */
    speedRange?: readonly [number, number];
    /** The speed one wheel notch gives, before the range clamp. `dir` is +1 for faster.
     *  Default: three additive steps (0.005 under 0.05, 0.01, 0.02 over 0.1), times the modifier. */
    wheelStep?: (current: number, dir: 1 | -1, modifier: number) => number;
    /** Seen before the speed law. Return true when the event is handled. */
    onWheel?: (e: WheelEvent, modifier: number) => boolean;
    onActivityBegin?: () => void;
    onActivityPoke?: () => void;
    onActivityEnd?: () => void;
}

export interface NavigationInput {
    moveState: React.MutableRefObject<MoveInputState>;
    isDraggingRef: React.MutableRefObject<boolean>;
    /** Where the look drag began and where the pointer is now, in the element's -1..1 box. */
    dragStart: React.MutableRefObject<{ x: number; y: number }>;
    mousePos: React.MutableRefObject<{ x: number; y: number }>;
    speedRef: React.MutableRefObject<number>;
    joystickMove: React.MutableRefObject<JoystickInput>;
    joystickLook: React.MutableRefObject<JoystickInput>;
    invertY: boolean;
    rollVelocity: React.MutableRefObject<number>;
    /** A key, a stick or a drag is held, or something happened in the last 200 ms. */
    isInteracting: () => boolean;
    /** Run once per frame; `delta` in seconds. */
    frame: (delta: number) => void;
}

const emptyMoveState = (): MoveInputState => ({
    forward: false, backward: false, left: false, right: false,
    up: false, down: false, rollLeft: false, rollRight: false,
    boost: false, precise: false,
});

/**
 * True when `el` is (or sits inside) an editable surface where keys
 * — especially Space — must NOT be consumed as Fly-mode navigation.
 * Covers <input>, <textarea>, contenteditable, and CodeMirror gutters.
 */
const isTypingTarget = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    if (typeof el.closest === 'function' && el.closest('.cm-editor')) return true;
    return false;
};

/** The default wheel law: the three additive steps GMT always had. */
export const defaultWheelStep = (current: number, dir: 1 | -1, modifier: number): number => {
    let step = 0.01;
    if (current < 0.05) step = 0.005;
    if (current > 0.1) step = 0.02;
    step *= modifier;
    return current + (dir * step);
};

export const DEFAULT_SPEED_RANGE: readonly [number, number] = [0.001, 1.0];

export const useNavigationInput = (options: NavigationInputOptions): NavigationInput => {
    const { element, mode, speed, setSpeed, invertY } = options;
    const flyMode = options.flyMode ?? 'Fly';
    const orbitMode = options.orbitMode ?? 'Orbit';
    const isTouchLayout = options.isTouchLayout ?? false;

    // Callbacks and ranges through a ref: a new closure each render must not re-attach listeners.
    const opts = useRef(options);
    opts.current = options;

    const moveState = useRef(emptyMoveState());
    const isDraggingRef = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const mousePos = useRef({ x: 0, y: 0 });
    const lastActivityTime = useRef(0);

    // Smooth Roll Logic
    const rollVelocity = useRef(0);

    // Mobile Joysticks
    const joystickMove = useRef<JoystickInput>({ x: 0, y: 0 });
    const joystickLook = useRef<JoystickInput>({ x: 0, y: 0 });

    const speedRef = useRef(speed);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    const markActivity = () => {
        lastActivityTime.current = performance.now();
    };

    useEffect(() => {
        joystickMove.current = { x: 0, y: 0 };
        joystickLook.current = { x: 0, y: 0 };
        rollVelocity.current = 0;
        markActivity();
    }, [mode]);

    // The movement session: begin / poke / end, balanced on its own (see PITFALLS).
    const moveSessionOpen = useRef(false);
    const modeRef = useRef(mode);
    modeRef.current = mode;

    const frame = useCallback((delta: number) => {
        // Update roll momentum (affected by speed)
        const targetRoll = moveState.current.rollLeft ? 1 : (moveState.current.rollRight ? -1 : 0);
        const accelRate = targetRoll !== 0 ? 1.0 : 3.0;
        const f = 1.0 - Math.exp(-accelRate * delta);
        // Scale roll by current speed (minimum 0.1 for usability at low speeds)
        const speedScale = Math.max(0.1, speedRef.current);
        rollVelocity.current += (targetRoll * speedScale - rollVelocity.current) * f;

        if (targetRoll === 0 && Math.abs(rollVelocity.current) < 0.001) {
            rollVelocity.current = 0;
        }

        // The session edge
        const ms = moveState.current;
        const hasKeys = ms.forward || ms.backward || ms.left || ms.right || ms.up || ms.down || ms.rollLeft || ms.rollRight;
        const jm = joystickMove.current, jl = joystickLook.current;
        const hasJoy = Math.abs(jm.x) > 0.01 || Math.abs(jm.y) > 0.01 || Math.abs(jl.x) > 0.01 || Math.abs(jl.y) > 0.01;
        const flyLook = modeRef.current === (opts.current.flyMode ?? 'Fly') && isDraggingRef.current;
        const locked = opts.current.isLocked();
        const active = !locked && (flyLook || hasKeys || hasJoy);

        if (active) {
            if (!moveSessionOpen.current) {
                moveSessionOpen.current = true;
                opts.current.onActivityBegin?.();
            } else {
                // Keep a watchdog alive on long continuous flights.
                opts.current.onActivityPoke?.();
            }
        } else if (moveSessionOpen.current) {
            moveSessionOpen.current = false;
            opts.current.onActivityEnd?.();
        }
    }, []);

    // Unmount cleanup — end an open movement session if the hook unmounts
    // mid-flight (mode/route change). Balances any outstanding begin.
    useEffect(() => () => {
        if (moveSessionOpen.current) {
            moveSessionOpen.current = false;
            opts.current.onActivityEnd?.();
        }
    }, []);

    useEffect(() => {
        if (!element) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Check BOTH the event target and document.activeElement.
            // e.target can be document.body in some edge cases (portaled
            // modals, fast re-renders) even when an input has focus — without
            // the activeElement check, Space gets consumed as Fly-mode "up"
            // thrust instead of landing in the input.
            if (isTypingTarget(e.target as HTMLElement) || isTypingTarget(document.activeElement as HTMLElement | null)) return;
            if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.code === 'KeyW')) e.preventDefault();

            // Prevent Spacebar scrolling (only when not in a text editor)
            if (e.code === 'Space') e.preventDefault();

            // Prevent Alt menu
            if (e.key === 'Alt') e.preventDefault();

            if (opts.current.isSuppressed?.(e)) return;

            let handled = true;
            switch (e.code) {
                case 'KeyW': moveState.current.forward = true; break;
                case 'KeyS': moveState.current.backward = true; break;
                case 'KeyA': moveState.current.left = true; break;
                case 'KeyD': moveState.current.right = true; break;
                case 'KeyQ': moveState.current.rollLeft = true; break;
                case 'KeyE': moveState.current.rollRight = true; break;
                case 'Space': moveState.current.up = true; break;
                case 'KeyC': moveState.current.down = true; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    moveState.current.boost = true; break;
                case 'AltLeft':
                case 'AltRight':
                    moveState.current.precise = true; break;
                default:
                    handled = false;
            }
            if (handled) markActivity();
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') e.preventDefault();
            // Check BOTH the event target and document.activeElement (see handleKeyDown).
            if (isTypingTarget(e.target as HTMLElement) || isTypingTarget(document.activeElement as HTMLElement | null)) return;
            switch (e.code) {
                case 'KeyW': moveState.current.forward = false; break;
                case 'KeyS': moveState.current.backward = false; break;
                case 'KeyA': moveState.current.left = false; break;
                case 'KeyD': moveState.current.right = false; break;
                case 'KeyQ': moveState.current.rollLeft = false; break;
                case 'KeyE': moveState.current.rollRight = false; break;
                case 'Space': moveState.current.up = false; break;
                case 'KeyC': moveState.current.down = false; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    moveState.current.boost = false; break;
                case 'AltLeft':
                case 'AltRight':
                    moveState.current.precise = false; break;
            }
        };

        const handleWheel = (e: WheelEvent) => {
            if (opts.current.isLocked()) return;

            // Read from event rather than tracked keystate — wheel can fire
            // before keydown is processed.
            const mod = getCameraModifierFromEvent(e);

            // The app's own wheel meaning first (GMT: the orthographic scale).
            if (opts.current.onWheel?.(e, mod)) {
                markActivity();
                return;
            }

            // FLY SPEED: Standard perspective flight speed adjustment
            if (mode === flyMode) {
                const dir = e.deltaY > 0 ? -1 : 1;
                const current = speedRef.current;
                const [lo, hi] = opts.current.speedRange ?? DEFAULT_SPEED_RANGE;
                const next = Math.max(lo, Math.min(hi, (opts.current.wheelStep ?? defaultWheelStep)(current, dir, mod)));
                speedRef.current = next;
                setSpeed(next);
                markActivity();
            }
            // ORBIT ZOOM: Just wake UI
            else if (mode === orbitMode) {
                markActivity();
            }
        };

        const handleBlur = () => {
            moveState.current = emptyMoveState();
        };

        const handleJoyMove = (e: Event) => { joystickMove.current = (e as CustomEvent).detail; markActivity(); };
        const handleJoyLook = (e: Event) => { joystickLook.current = (e as CustomEvent).detail; markActivity(); };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('joyMove', handleJoyMove);
        window.addEventListener('joyLook', handleJoyLook);
        element.addEventListener('wheel', handleWheel, { passive: true });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('joyMove', handleJoyMove);
            window.removeEventListener('joyLook', handleJoyLook);
            element.removeEventListener('wheel', handleWheel);
        };
    }, [mode, flyMode, orbitMode, element, setSpeed]);

    useEffect(() => {
        if (!element) return;
        const domElement = element;

        const getNDC = (clientX: number, clientY: number) => {
            const rect = domElement.getBoundingClientRect();
            return {
                x: ((clientX - rect.left) / rect.width) * 2 - 1,
                y: -((clientY - rect.top) / rect.height) * 2 + 1
            };
        };

        const onMouseDown = (e: MouseEvent) => {
            if (opts.current.isLocked()) return;

            // A control drawn over the picture is not the picture.
            if (opts.current.excludeTarget?.(e.target)) return;

            const isMobile = isTouchLayout || (e as MouseEvent & { pointerType?: string }).pointerType === 'touch';
            if (isMobile && mode === flyMode) return;

            markActivity();

            if (e.button === 0 && mode === flyMode) {
                isDraggingRef.current = true;
                const { x, y } = getNDC(e.clientX, e.clientY);
                dragStart.current = { x, y };
                mousePos.current = { x, y };
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isDraggingRef.current) {
                // Fly Mode Drag
                const { x, y } = getNDC(e.clientX, e.clientY);
                mousePos.current = { x, y };
                markActivity();
            } else if (mode === orbitMode && e.buttons > 0) {
                // Orbit Mode Drag — only mark activity if the drag originated on the picture,
                // not on UI elements (buttons, sliders, menus). Without this guard,
                // clicking any UI button while in Orbit mode marks activity.
                if (e.target === domElement || domElement.contains(e.target as Node)) {
                    markActivity();
                }
            }
        };

        const onMouseUp = () => isDraggingRef.current = false;

        domElement.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            domElement.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [mode, flyMode, orbitMode, element, isTouchLayout]);

    const isInteracting = () => {
        const ms = moveState.current;
        const hasKeys = ms.forward || ms.backward || ms.left || ms.right || ms.up || ms.down || ms.rollLeft || ms.rollRight;
        const hasJoy = Math.abs(joystickMove.current.x) > 0.01 || Math.abs(joystickMove.current.y) > 0.01 || Math.abs(joystickLook.current.x) > 0.01 || Math.abs(joystickLook.current.y) > 0.01;
        const recentActivity = (performance.now() - lastActivityTime.current) < 200; // 200ms buffer for discrete events (Scroll, Key tap)
        return isDraggingRef.current || hasKeys || hasJoy || recentActivity;
    };

    return { moveState, isDraggingRef, dragStart, mousePos, speedRef, joystickMove, joystickLook, invertY, rollVelocity, isInteracting, frame };
};
