/**
 * GradientDropLayer — the Gradient Explorer's "select → reveal → place" overlay,
 * composed over the same registry so the whole topology is data-driven:
 *
 *  1. <DropTargetLayer> (engine-core) — the FINAL targets: anchored dropboxes over each
 *     visible destination (Generator slots, ColorBox, Stops strip, Favients shelf) and
 *     bottom-row wells (Fullscreen, Export). Click applies the selection; drop applies
 *     the dragged payload.
 *  2. Intermediate dropboxes — DERIVED from the registry (`deriveIntermediates`): the
 *     first unsatisfied reveal step of every hidden target, anchored over that step's
 *     element (a mode tab, the Generator Mixed/ColorBox sub-mode switch). Click — or
 *     ~400 ms drag-dwell — runs the step (switch tab / sub-mode) and KEEPS the gradient
 *     in hand, so the next step (or the now-revealed final) can take it. Chains to any
 *     depth (ColorBox sits two steps in); nothing here is hardcoded per tab.
 *  3. The drag avatar — a cursor-following ramp (native drag image suppressed at source).
 *
 * Mounted once in GradientExplorerApp. Inert unless a gradient is selected or in flight.
 */

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DropTargetLayer } from '../components/DropTargetLayer';
import { DropTargetTile } from '../components/DropTarget';
import { useDragInFlight } from '../hooks/useDragInFlight';
import { Z } from '../components/ui/zIndex';
import { useActiveHeroSelection, useHeroOptionsOpen, closeHeroOptions } from '../palette/store/heroSelection';
import { FAVIENT_DND_MIME, readFavientDrag } from '../palette/core/favientDnd';
import { renderStopsToBuffer } from '../palette/core/gmtGradient';
import { deriveIntermediates } from './gradientTargets';

/** Dwell over an intermediate for this long (ms) to run its reveal step mid-drag. */
const STEP_DWELL_MS = 400;

const acceptsGradient = (types: string[]): boolean => types.includes(FAVIENT_DND_MIME);

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
    const sel = useActiveHeroSelection();
    const optionsOpen = useHeroOptionsOpen();
    const { inFlight, types } = useDragInFlight(true);
    const dragging = inFlight && acceptsGradient(types);
    // The dock is shown while the options are open (click path) OR a drag is in flight.
    // The PICK itself (sel) is sticky and no longer gates the dock — closing options
    // leaves the pick in hand. (sel-guard so a stray open with no pick can't show empty.)
    const active = (optionsOpen && sel != null) || dragging;

    const pointer = useRef({ x: 0, y: 0 });
    const [, tick] = useReducer((n: number) => n + 1, 0);
    const [dwellStep, setDwellStep] = useState<string | null>(null);
    const dwellStart = useRef(0);

    // Track the cursor during a drag (dragover fires with coords; pointermove does not),
    // and end the session when the drag ends — whether it dropped on a target (the target
    // already applied; this clears the lingering selection) or over nothing.
    useEffect(() => {
        if (!dragging) {
            setDwellStep(null);
            return;
        }
        const onOver = (e: DragEvent): void => {
            pointer.current = { x: e.clientX, y: e.clientY };
        };
        // Close the options on a drop that reaches the WINDOW — a drop on a final (already
        // applied) or on nothing. The PICK stays in hand. An intermediate-step drop
        // stopPropagations, so it does NOT close: it reveals and leaves the dock up over
        // the now-visible final.
        const onEnd = (): void => closeHeroOptions();
        window.addEventListener('dragover', onOver, true);
        window.addEventListener('drop', onEnd, false);
        return () => {
            window.removeEventListener('dragover', onOver, true);
            window.removeEventListener('drop', onEnd, false);
            pointer.current = { x: 0, y: 0 }; // so a later drag doesn't flash at the old spot
        };
    }, [dragging]);

    // During a DRAG: rAF to track the cursor over intermediates (dwell-to-reveal) and to
    // keep anchored rects fresh as tabs switch mid-drag. During SELECT: positions are
    // static except on scroll/resize (tab switches re-render via the store), so just
    // listen for those — no 60fps rAF (which fought the dropbox hover).
    useEffect(() => {
        if (!active) return;
        if (dragging) {
            let raf = 0;
            const loop = (): void => {
                tick();
                const { x, y } = pointer.current;
                const hit = deriveIntermediates().find((it) => {
                    const r = it.getRect();
                    return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
                });
                if (hit) {
                    if (dwellStep !== hit.id) {
                        setDwellStep(hit.id);
                        dwellStart.current = performance.now();
                    } else if (performance.now() - dwellStart.current >= STEP_DWELL_MS) {
                        hit.activate(); // run the step mid-drag → next step / final appears
                        setDwellStep(null);
                        dwellStart.current = 0;
                    }
                } else if (dwellStep) {
                    setDwellStep(null);
                }
                raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(raf);
        }
        const onChange = (): void => tick();
        window.addEventListener('scroll', onChange, true);
        window.addEventListener('resize', onChange);
        return () => {
            window.removeEventListener('scroll', onChange, true);
            window.removeEventListener('resize', onChange);
        };
    }, [active, dragging, dwellStep]);

    // The dragged ramp — recomputed only when the selection changes (not per rAF frame).
    // MUST stay above the early return below so the hook order is stable.
    const avatarRamp = useMemo(
        () =>
            sel
                ? renderStopsToBuffer(
                      sel.payload.config.stops,
                      sel.payload.config.blendSpace,
                      sel.payload.config.colorSpace,
                  )
                : null,
        [sel],
    );

    if (!active) return null;

    const dwellProgress =
        dwellStep && dwellStart.current
            ? Math.min(1, (performance.now() - dwellStart.current) / STEP_DWELL_MS)
            : 0;

    // Once per render for the JSX below (the rAF dwell loop re-queries each frame for
    // live rects as tabs animate in mid-drag, so it keeps its own call).
    const intermediates = deriveIntermediates();

    return (
        <>
            {/* Final targets (anchored + bottom wells) — engine-core, generic. */}
            <DropTargetLayer
                selectedPayload={sel?.payload}
                selfId={sel?.selfTargetId}
                dragAccepts={acceptsGradient}
                readDragPayload={readFavientDrag}
                onSent={closeHeroOptions}
            />

            {/* Intermediate reveal steps — derived from the registry, anchored over each
                step's element (a tab, a sub-mode switch). No label (the element under it
                already reads), so it's a clean highlight + dwell ring. */}
            {intermediates.map((it) => {
                const rect = it.getRect();
                if (!rect) return null;
                return createPortal(
                    <div
                        key={`intermediate:${it.id}`}
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
                            label={it.id}
                            fill
                            hideLabel
                            dwell={dwellStep === it.id ? dwellProgress : 0}
                            onActivate={sel ? it.activate : undefined}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={(e) => {
                                // Reveal the surface and KEEP the gradient in hand —
                                // stopPropagation keeps the drop from reaching the window
                                // session-end clear, so after the drag the user is in
                                // select-mode over the now-revealed final.
                                e.preventDefault();
                                e.stopPropagation();
                                it.activate();
                            }}
                        />
                    </div>,
                    document.body,
                );
            })}

            {/* Avatar only while dragging AND once the pointer is known (dragover has
                fired) — otherwise it flashes at the top-left corner for the first frame. */}
            {dragging && avatarRamp && (pointer.current.x !== 0 || pointer.current.y !== 0) && (
                <DragAvatar ramp={avatarRamp} x={pointer.current.x} y={pointer.current.y} />
            )}
        </>
    );
};

export default GradientDropLayer;
