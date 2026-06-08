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

import React, { useEffect, useReducer, useState, useSyncExternalStore } from 'react';
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
    /** Whether an in-flight HTML5 drag carries a payload this layer should resolve. */
    dragAccepts?: (types: string[]) => boolean;
    /** Parse a drop's DataTransfer into a payload (host-injected; keeps engine-core agnostic). */
    readDragPayload?: (dt: DataTransfer) => unknown;
    /** Called after a final target receives the payload (host clears the selection). */
    onSent?: () => void;
    z?: number;
}

export const DropTargetLayer: React.FC<DropTargetLayerProps> = ({
    selectedPayload,
    dragAccepts,
    readDragPayload,
    onSent,
    z = Z.overlay,
}) => {
    const allTargets = useSyncExternalStore(subscribeSendTargets, getSendTargets, getSendTargets);
    const { inFlight, types } = useDragInFlight(allTargets.length > 0);
    const [hoverId, setHoverId] = useState<string | null>(null);

    const dragActive = inFlight && (dragAccepts ? dragAccepts(types) : true);
    const selecting = !inFlight && selectedPayload != null;
    const active = dragActive || selecting;

    // While active, re-read every target's live rect each frame so anchored dropboxes
    // follow tab switches / scroll / resize. Cheap (small tree, only during an interaction).
    const [, tick] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (!active) return;
        let raf = 0;
        const loop = (): void => {
            tick();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [active]);

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
            onSent?.();
        }
    };

    // Select-mode lists only targets that accept the payload; drag-mode can't read the
    // payload mid-flight (getData is blocked), so it offers all and resolves on drop.
    // Select-mode lists targets that accept the payload; drag-mode can't read the payload
    // mid-flight (getData is blocked) so it offers all that accept the MIME types.
    // (`targetsForPayload` narrows P to the payload type; we route opaquely, so widen back.)
    const candidates: SendTarget[] = selecting
        ? (targetsForPayload(selectedPayload) as SendTarget[])
        : allTargets.filter((t) => !t.acceptsTypes || t.acceptsTypes(types));
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
            {/* Anchored dropboxes — fixed over each in-mode destination's live rect. */}
            {anchored.map(({ target, rect }) => (
                <div
                    key={target.id}
                    className="fixed"
                    style={{
                        left: rect.left - 3,
                        top: rect.top - 3,
                        width: rect.width + 6,
                        height: rect.height + 6,
                        zIndex: z,
                    }}
                >
                    <DropTargetTile label={target.label} fill {...tileHandlers(target)} />
                </div>
            ))}
            {/* Bottom-row wells — targets with no on-screen anchor. */}
            {bottom.length > 0 && (
                <div
                    className="fixed inset-x-0 bottom-8 flex items-end justify-center gap-4 pointer-events-none"
                    style={{ zIndex: z }}
                    data-testid="drop-target-bottom"
                >
                    {bottom.map((target) => (
                        <DropTargetTile key={target.id} label={target.label} {...tileHandlers(target)} />
                    ))}
                </div>
            )}
        </>,
        document.body,
    );
};

export default DropTargetLayer;
