/**
 * GradientDropLayer — the Gradient Explorer's "select → reveal → place" overlay. It
 * composes three pieces over the same registry, so the whole topology is data-driven:
 *
 *  1. <DropTargetLayer> (engine-core) — renders the FINAL targets: anchored dropboxes
 *     over each visible destination (Generator slots, Stops strip, Favients shelf) and
 *     bottom-row wells (Fullscreen, Export). Click applies the selection; drop applies
 *     the dragged payload (parsed via readFavientDrag).
 *  2. Intermediate tab dropboxes — DERIVED from the registry (`deriveIntermediateZones`):
 *     for any zone whose finals are currently hidden, one "reveal" dropbox is anchored
 *     over that mode tab. Click (or ~400 ms drag-dwell) switches to the mode and KEEPS
 *     the gradient in hand, so the now-revealed finals can receive it. Adding a target
 *     in any tab auto-creates its intermediate path — nothing here is hardcoded per tab.
 *  3. The drag avatar — a cursor-following ramp painted while a gradient drag is in
 *     flight (the native drag image is suppressed at the source). Purely visual.
 *
 * Mounted once in GradientExplorerApp. Inert unless a gradient is selected or a gradient
 * drag is in flight.
 */

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEngineStore } from '../store/engineStore';
import { DropTargetLayer } from '../components/DropTargetLayer';
import { DropTargetTile } from '../components/DropTarget';
import { useDragInFlight } from '../hooks/useDragInFlight';
import { Z } from '../components/ui/zIndex';
import { useHeroSelection, clearHeroSelection } from '../palette/store/heroSelection';
import { FAVIENT_DND_MIME, readFavientDrag } from '../palette/core/favientDnd';
import { renderStopsToBuffer } from '../palette/core/gmtGradient';
import { deriveIntermediateZones, modeTabRect } from './gradientTargets';
import type { PanelId } from '../types';

/** Dwell over an intermediate tab for this long (ms) to switch to it mid-drag. */
const TAB_DWELL_MS = 400;

const acceptsGradient = (types: string[]): boolean => types.includes(FAVIENT_DND_MIME);

/** Reveal a zone's surface (switch tab; un-collapse its dock if it's side-docked), keeping
 *  the selection alive so the now-visible finals can receive it. Generic over zones. */
const revealZone = (zone: string): void => {
    const s = useEngineStore.getState();
    const panel = (s.panels as Record<string, { location?: string }>)[zone];
    if (panel?.location === 'left') s.setDockCollapsed('left', false);
    if (panel?.location === 'right') s.setDockCollapsed('right', false);
    s.togglePanel(zone as PanelId, true);
};

/** The cursor-following avatar of the dragged gradient (visual only; pointer-events-none). */
const DragAvatar: React.FC<{ ramp: Uint8Array; x: number; y: number }> = ({ ramp, x, y }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    const pos = useRef({ x, y });
    const target = useRef({ x, y });
    target.current = { x, y };
    const [, force] = useReducer((n: number) => n + 1, 0);

    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        cv.width = 256;
        cv.height = 1;
        cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(ramp), 256, 1), 0, 0);
    }, [ramp]);

    // Spring-follow so the avatar trails and settles near the cursor rather than tracking rigidly.
    useEffect(() => {
        let raf = 0;
        const loop = (): void => {
            const p = pos.current;
            p.x += (target.current.x - p.x) * 0.3;
            p.y += (target.current.y - p.y) * 0.3;
            force();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    const p = pos.current;
    return createPortal(
        <div
            className="fixed pointer-events-none overflow-hidden rounded-lg border border-white/25"
            style={{
                left: p.x + 14,
                top: p.y - 14,
                width: 148,
                height: 30,
                zIndex: Z.overlay + 50,
                transform: 'scale(1.06) rotate(-2deg)',
                transformOrigin: 'top left',
                boxShadow: '0 10px 24px -6px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,211,238,0.35)',
                background: '#0a0a0b',
            }}
        >
            <canvas ref={ref} className="block h-full w-full" />
        </div>,
        document.body,
    );
};

export const GradientDropLayer: React.FC = () => {
    const sel = useHeroSelection();
    const { inFlight, types } = useDragInFlight(true);
    const dragging = inFlight && acceptsGradient(types);
    const active = sel != null || dragging;

    // Pointer during a drag (for the avatar + dwell hit-test). dragover fires continuously
    // with coords during an HTML5 drag (pointermove does not), so we track it there.
    const pointer = useRef({ x: 0, y: 0 });
    const [, tick] = useReducer((n: number) => n + 1, 0);
    const [dwellZone, setDwellZone] = useState<string | null>(null);
    const dwellStart = useRef(0);

    useEffect(() => {
        if (!dragging) {
            setDwellZone(null);
            return;
        }
        const onOver = (e: DragEvent): void => {
            pointer.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('dragover', onOver, true);
        return () => window.removeEventListener('dragover', onOver, true);
    }, [dragging]);

    // Refresh tab rects + run the dwell-to-reveal loop while active.
    useEffect(() => {
        if (!active) return;
        let raf = 0;
        const loop = (): void => {
            tick(); // re-read intermediate tab rects (tab switches / scroll / resize)
            if (dragging) {
                const { x, y } = pointer.current;
                const zone = deriveIntermediateZones().find((z) => {
                    const r = modeTabRect(z);
                    return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
                });
                if (zone) {
                    if (dwellZone !== zone) {
                        setDwellZone(zone);
                        dwellStart.current = performance.now();
                    } else if (performance.now() - dwellStart.current >= TAB_DWELL_MS) {
                        revealZone(zone); // switch mid-drag → its finals appear; drag continues
                        setDwellZone(null);
                        dwellStart.current = 0;
                    }
                } else if (dwellZone) {
                    setDwellZone(null);
                }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [active, dragging, dwellZone]);

    if (!active) return null;

    const intermediates = deriveIntermediateZones();
    const dwellProgress =
        dwellZone && dwellStart.current
            ? Math.min(1, (performance.now() - dwellStart.current) / TAB_DWELL_MS)
            : 0;

    const avatarRamp =
        dragging && sel
            ? renderStopsToBuffer(
                  sel.payload.config.stops,
                  sel.payload.config.blendSpace,
                  sel.payload.config.colorSpace,
              )
            : null;

    return (
        <>
            {/* Final targets (anchored + bottom wells) — engine-core, generic. */}
            <DropTargetLayer
                selectedPayload={sel?.payload}
                dragAccepts={acceptsGradient}
                readDragPayload={readFavientDrag}
                onSent={clearHeroSelection}
            />

            {/* Intermediate "reveal a mode" dropboxes — derived from the registry by zone. */}
            {intermediates.map((zone) => {
                const rect = modeTabRect(zone);
                if (!rect) return null;
                return createPortal(
                    <div
                        key={`intermediate:${zone}`}
                        className="fixed"
                        style={{
                            left: rect.left - 3,
                            top: rect.top - 3,
                            width: rect.width + 6,
                            height: rect.height + 6,
                            zIndex: Z.overlay,
                        }}
                    >
                        <DropTargetTile
                            label={zone}
                            hint="open"
                            fill
                            dwell={dwellZone === zone ? dwellProgress : 0}
                            // Click (select path): reveal the mode, keep the gradient in hand.
                            onActivate={sel ? () => revealZone(zone) : undefined}
                            // Drag path: dwell (handled in the rAF loop) switches; a drop on the
                            // tab itself just reveals (the real drop lands on a final inside).
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                revealZone(zone);
                            }}
                        />
                    </div>,
                    document.body,
                );
            })}

            {avatarRamp && <DragAvatar ramp={avatarRamp} x={pointer.current.x} y={pointer.current.y} />}
        </>
    );
};

export default GradientDropLayer;
