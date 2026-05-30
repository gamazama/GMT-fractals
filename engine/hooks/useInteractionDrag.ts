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
 * P2: dispatch-only + inert — no producer mounts this yet (that is P3a/P3b).
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

export function useInteractionDrag(source: InteractionSource): InteractionDragHandlers {
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

    return {
        onPointerDown: begin,
        onPointerUp: end,
        onLostPointerCapture: end,
        onPointerCancel: end,
    };
}
