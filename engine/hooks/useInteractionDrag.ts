/**
 * useInteractionDrag — producer-ergonomics hook for ADR-0061's
 * InteractionSession. A drag component spreads the returned handlers instead of
 * hand-calling store actions, so a source can't be silently forgotten and every
 * custom drag inherits the BLOCKING stranded-session safety (lostpointercapture
 * + pointercancel release + unmount cleanup) for free.
 *
 * DISPATCH-ONLY (ADR Performance): the hook subscribes to NOTHING — handlers
 * read the store via getState() and call begin/endInteraction. Mounting it in
 * ~90 components therefore costs ZERO renders. Never read reactive store state
 * in here.
 *
 * Touch (E1): `onPointerCancel` is NOT optional — a touch interruption (OS
 * gesture, incoming call, app-switch) fires `pointercancel`, not `pointerup`;
 * without it the session strands. `onLostPointerCapture` covers capture loss.
 * The drei-<OrbitControls>-driven `camera` token is wired separately at its
 * onStart/onEnd (P3a) and is exempt — this hook is for the custom PointerEvent
 * drags (sliders/knobs/vectors, pickers, drawing, light gizmo).
 *
 * Balanced lifecycle: the hook holds ONE outstanding begin per mount (a local
 * ref), so the several release events one gesture can fire (a `pointerup`
 * followed by a trailing `lostpointercapture`) collapse to a single
 * endInteraction. A redundant release is the expected case and is a silent
 * no-op; the authoritative unbalanced-end dev-warn lives in
 * createInteractionSlice (the machine detects a ref-count underflow). Unmount
 * with a drag still active ends it (covers modal-open / Strict-Mode
 * double-unmount mid-drag).
 *
 * P3b: the ~90 slider/knob/vector + drawing + scrub producers wire through
 * this hook (raw-pointer owners) or its useInteractionGesture core (semantic
 * onDragStart/onDragEnd sites). Still INERT — no consumer reads the session.
 *
 * @see store/slices/createInteractionSlice.ts
 * @see docs/adr/0061-interaction-session-single-source-of-truth.md
 */

import { useCallback, useEffect, useRef } from 'react';
import { useEngineStore } from '../../store/engineStore';
import type { InteractionSource } from '../InteractionSessionMachine';

export interface InteractionDragHandlers {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onLostPointerCapture: () => void;
    onPointerCancel: () => void;
}

/** Imperative balanced begin/end for the session, for producers that fire on
 *  SEMANTIC callbacks (`onDragStart`/`onDragEnd`, `setIsScrubbing(true|false)`)
 *  rather than raw PointerEvents. */
export interface InteractionGesture {
    begin: () => void;
    end: () => void;
}

/**
 * useInteractionGesture — the balanced begin/end core shared with
 * useInteractionDrag, exposed for the P3b slider/knob/vector + scrub producers
 * whose drag lifecycle surfaces as SEMANTIC callbacks, not raw PointerEvents.
 *
 * Co-locate `begin`/`end` with the producer's existing balanced boundary —
 * `beginParamTransaction`/`endParamTransaction` (sliders) or
 * `setIsScrubbing(true|false)` (timeline scrub) — so the session inherits a
 * battle-tested end + cleanup instead of a parallel hand-rolled lifecycle
 * (ADR-0061). Each such producer is a SINGLE balanced path, so the ref-counting
 * is safe (the camera multi-path strand class does not apply here).
 *
 * Holds ONE outstanding begin per mount (the `activeRef`), so a redundant
 * release is a silent no-op and an unmount mid-drag still releases. For
 * elements that OWN their PointerEvents, prefer useInteractionDrag — it
 * additionally wires `pointercancel`/`lostpointercapture` onto the element
 * (touch-interruption / capture-loss release, ADR mitigation #1).
 *
 * DISPATCH-ONLY: subscribes to nothing; mounting it costs zero renders.
 */
export function useInteractionGesture(source: InteractionSource): InteractionGesture {
    // True while THIS mount holds an outstanding begin. Keeps begin/end balanced
    // across the multiple release events one gesture can fire, and lets the
    // unmount cleanup release a still-active drag.
    const activeRef = useRef(false);

    const begin = useCallback(() => {
        if (activeRef.current) return; // already holding a begin — don't double-count
        activeRef.current = true;
        useEngineStore.getState().beginInteraction(source);
    }, [source]);

    const end = useCallback(() => {
        if (!activeRef.current) return; // redundant release for the same gesture — expected, no-op
        activeRef.current = false;
        useEngineStore.getState().endInteraction(source);
    }, [source]);

    // Unmount cleanup — release a drag that was active when the component
    // unmounted (modal opened mid-drag, Strict-Mode double-unmount).
    useEffect(() => () => {
        if (activeRef.current) {
            activeRef.current = false;
            useEngineStore.getState().endInteraction(source);
        }
    }, [source]);

    return { begin, end };
}

export function useInteractionDrag(source: InteractionSource): InteractionDragHandlers {
    const { begin, end } = useInteractionGesture(source);

    return {
        onPointerDown: begin,
        onPointerUp: end,
        onLostPointerCapture: end,
        onPointerCancel: end,
    };
}
