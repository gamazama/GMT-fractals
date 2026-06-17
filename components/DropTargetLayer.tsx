/**
 * DropTargetLayer — engine-core view that renders the FINAL send-targets (interface
 * (c)) as drop affordances, the click/drag twin of a target's `apply`. It is the
 * generic half of the P2-A "select → act" model; the host adds the intermediate
 * (reveal-a-surface) affordances on top, derived from the same registry.
 *
 * For every registered `SendTarget`:
 *   - has `getRect` AND it resolves → render an ANCHORED dropbox fixed over that rect
 *     (an in-mode destination: a Generator slot, the Stops strip, the Favients shelf);
 *   - has `getRect` but it returns null → the anchor isn't on screen → render NOTHING
 *     (the surface is hidden; the host offers an intermediate "reveal" step instead);
 *   - has NO `getRect` → render in the BOTTOM-ROW wells (no natural anchor: Fullscreen,
 *     Export).
 *
 * It shows while a payload is SELECTED (click path) or a matching HTML5 drag is in
 * flight, and resolves a target by a click (select payload) or a drop (host-injected
 * `readDragPayload` parses the DataTransfer — engine-core stays payload-agnostic). A
 * lightweight rAF refresh re-reads the live rects while active, so dropboxes track tab
 * switches / scroll / resize without the targets wiring their own observers.
 *
 * @see components/DropTarget.tsx (the shared tile) · store/sendTargetRegistry.ts (c)
 */

import React, { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
    getSendTargets,
    subscribeSendTargets,
    targetsForPayload,
    type SendTarget,
} from '../store/sendTargetRegistry';
import { useDragInFlight } from '../hooks/useDragInFlight';
import { DropTargetTile } from './DropTarget';
import { Z } from './ui/zIndex';

export interface DropTargetLayerProps {
    /** The selected payload (click path); also filters targets by `accepts`. Null ⇒ no selection. */
    selectedPayload?: unknown;
    /** Id of the target the selected gradient IS (e.g. the Stops hero is `stops`) — filtered
     *  out so it doesn't offer a self-drop or cover its own source. */
    selfId?: string;
    /** Whether an in-flight HTML5 drag carries a payload this layer should resolve. */
    dragAccepts?: (types: string[]) => boolean;
    /** Parse a drop's DataTransfer into a payload (host-injected; keeps engine-core agnostic). */
    readDragPayload?: (dt: DataTransfer) => unknown;
    /** Called after a final target receives the payload — with the target's rect (or null for
     *  an unanchored bottom well), so the host can play a landing animation into it. */
    onSent?: (landedRect: DOMRect | null) => void;
    /** A host-supplied SYNCHRONOUS "a drag is in flight" override, OR-ed into the window
     *  dragenter detection. The host (which wires its drag sources) can assert a drag the
     *  instant it starts and for its whole life, so a `dragPassthrough` target never flickers
     *  back to interactive mid-drag when dragenter/dragleave depth bookkeeping is briefly off. */
    dragActiveOverride?: boolean;
    z?: number;
}

export const DropTargetLayer: React.FC<DropTargetLayerProps> = ({
    selectedPayload,
    selfId,
    dragAccepts,
    readDragPayload,
    onSent,
    dragActiveOverride = false,
    z = Z.overlay,
}) => {
    const allTargets = useSyncExternalStore(subscribeSendTargets, getSendTargets, getSendTargets);
    const { inFlight, types } = useDragInFlight(allTargets.length > 0);
    const [hoverId, setHoverId] = useState<string | null>(null);

    // dragActive: the host's synchronous override (robust) OR window dragenter detection.
    // selecting is derived from !dragActive (not !inFlight) so a drag the override is asserting
    // never also counts as the click/select path — which would make a passthrough tile
    // interactive and swallow the drop.
    const dragActive = dragActiveOverride || (inFlight && (dragAccepts ? dragAccepts(types) : true));
    const selecting = !dragActive && selectedPayload != null;
    const active = dragActive || selecting;

    // Keep anchored dropboxes over their live rects. During a DRAG, refresh each frame
    // (positions can move as tabs switch mid-drag). During SELECT, positions are static
    // except on scroll/resize (tab switches re-render via the store), so only listen for
    // those — a 60fps rAF in select-mode was fighting the bottom-well hover.
    const [, tick] = useReducer((n: number) => n + 1, 0);
    // The drag cursor (dragover fires with coords; pointermove does not during a drag) —
    // used to make a drag-passthrough dropbox fall away once the cursor is over its region,
    // handing off to the component's own drag mechanics.
    const dragPointer = useRef({ x: -1, y: -1 });
    useEffect(() => {
        if (!active) return;
        // Use dragActive (override OR window detection) — not raw inFlight — so the cursor /
        // rect tracking runs for the whole drag even when the override is carrying it.
        if (dragActive) {
            let raf = 0;
            const onMove = (e: DragEvent): void => {
                dragPointer.current = { x: e.clientX, y: e.clientY };
            };
            window.addEventListener('dragover', onMove, true);
            const loop = (): void => {
                tick();
                raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
            return () => {
                window.removeEventListener('dragover', onMove, true);
                cancelAnimationFrame(raf);
                dragPointer.current = { x: -1, y: -1 }; // reset so stale coords don't drive fall-away
            };
        }
        const onChange = (): void => tick();
        window.addEventListener('scroll', onChange, true);
        window.addEventListener('resize', onChange);
        return () => {
            window.removeEventListener('scroll', onChange, true);
            window.removeEventListener('resize', onChange);
        };
    }, [active, dragActive]);

    if (!active) return null;

    // Click resolves the SELECTED payload; a drop resolves the DRAGGED payload. Both end
    // by clearing the selection (`onSent`) so the dock closes once a final receives it.
    const send = (target: SendTarget, payload: unknown): void => {
        try {
            target.apply(payload);
        } catch (err) {
            console.warn(`[sendTarget] "${target.id}" apply threw`, err);
        } finally {
            setHoverId(null);
            onSent?.(target.getRect?.() ?? null);
        }
    };

    // Select-mode lists only targets that accept the payload; drag-mode can't read the
    // payload mid-flight (getData is blocked), so it offers all and resolves on drop.
    // Select-mode lists targets that accept the payload; drag-mode can't read the payload
    // mid-flight (getData is blocked) so it offers all that accept the MIME types.
    // (`targetsForPayload` narrows P to the payload type; we route opaquely, so widen back.)
    const candidates: SendTarget[] = (
        selecting
            ? (targetsForPayload(selectedPayload) as SendTarget[])
            : allTargets.filter((t) => !t.acceptsTypes || t.acceptsTypes(types))
    ).filter((t) => t.id !== selfId);
    const anchored: { target: SendTarget; rect: DOMRect }[] = [];
    const bottom: SendTarget[] = [];
    for (const t of candidates) {
        if (t.getRect) {
            const rect = t.getRect();
            if (rect) anchored.push({ target: t, rect });
            // getRect present but null ⇒ anchor hidden ⇒ host shows an intermediate; skip.
        } else {
            bottom.push(t);
        }
    }

    const tileHandlers = (target: SendTarget) => ({
        armed: hoverId === target.id,
        hint: 'drop here',
        onActivate: selecting ? () => send(target, selectedPayload) : undefined,
        onMouseEnter: selecting ? () => setHoverId(target.id) : undefined,
        onMouseLeave: selecting
            ? () => setHoverId((id) => (id === target.id ? null : id))
            : undefined,
        onDragEnter: () => setHoverId(target.id),
        onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        },
        onDragLeave: () => setHoverId((id) => (id === target.id ? null : id)),
        onDrop: (e: React.DragEvent) => {
            // preventDefault so the browser accepts the drop; do NOT stopPropagation —
            // the drop must bubble to the window so `useDragInFlight` resets (else the
            // session would stay "in flight" and the dropboxes never hide).
            e.preventDefault();
            const payload = readDragPayload?.(e.dataTransfer);
            if (payload != null) send(target, payload);
            else setHoverId(null);
        },
    });

    return createPortal(
        <>
            {/* Anchored dropboxes — fixed over each in-mode destination's live rect. A
                drag-passthrough target (e.g. the Favients shelf) shows a VISUAL-only box
                during a drag so the element underneath handles the drop itself. */}
            {anchored.map(({ target, rect }) => {
                // A drag-passthrough target (e.g. the Favients shelf): during a DRAG the box is
                // visual-only and FALLS AWAY once the cursor is over its rect — handing the drop
                // to the component's OWN DnD (insert/reorder), so the drag path is untouched. On
                // the CLICK-THROUGH path (select) it's a normal CLICKABLE tile whose click
                // applies — a flat add to favourites.
                const passive = dragActive && target.dragPassthrough;
                // Fall away once the cursor is over a passthrough region, so the component's
                // OWN drag mechanics (e.g. the Favients panel's insert/reorder) are unobstructed.
                if (passive) {
                    const p = dragPointer.current;
                    if (p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom)
                        return null;
                }
                return (
                    // Wrapper is pointer-events-none so only the TILE is interactive (and a
                    // visualOnly tile is none too → the drag falls THROUGH to the element below).
                    <div
                        key={target.id}
                        className="fixed pointer-events-none"
                        style={{
                            left: rect.left - 3,
                            top: rect.top - 3,
                            width: rect.width + 6,
                            height: rect.height + 6,
                            zIndex: z,
                        }}
                    >
                        {passive ? (
                            <DropTargetTile label={target.label} fill hideLabel visualOnly />
                        ) : (
                            <DropTargetTile label={target.label} fill hideLabel {...tileHandlers(target)} />
                        )}
                    </div>
                );
            })}
            {/* Bottom-row wells — targets with no on-screen anchor. */}
            {bottom.length > 0 && (
                <div
                    className="fixed inset-x-0 bottom-8 flex items-end justify-center gap-4 pointer-events-none"
                    style={{ zIndex: z }}
                    data-testid="drop-target-bottom"
                >
                    {bottom.map((target) => (
                        <DropTargetTile key={target.id} label={target.label} opaque {...tileHandlers(target)} />
                    ))}
                </div>
            )}
        </>,
        document.body,
    );
};

export default DropTargetLayer;
