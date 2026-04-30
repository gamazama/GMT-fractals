/**
 * ViewportFrame — the plugin's viewport-host component.
 *
 * Wraps whatever render surfaces + overlays an app wants to put in the
 * viewport area. Handles:
 *
 *   1. Authoritative ResizeObserver on the frame's flex-filled outer
 *      region. Writes canvasPixelSize (physical pixels, DPR-aware)
 *      to the viewport slice on every layout change. This is the ONE
 *      authoritative writer — apps should not observe their canvas
 *      separately (docs/20_Fragility_Audit.md notes the multiple-
 *      observer race that lived in GMT's pre-extraction code).
 *
 *   2. Fixed vs Full layout. In Fixed mode, children are wrapped in
 *      a fixed-pixel container that's scaled to fit the available
 *      area (aspect-preserving), letter-boxed on a dim background.
 *      In Full mode, children fill the frame edge to edge.
 *
 *   3. Mode controls overlay — FixedResolutionControls when Fixed,
 *      a compact "Fixed" toggle when Full. Opt-out via showModeControls.
 *
 * GMT's full viewport (worker display + R3F Canvas + DOM overlays +
 * composition + histogram + region select) slots in as children.
 * Fractal-toy's single canvas slots in as children. Toy-fluid's canvas
 * plus brush-cursor overlay slots in as children. The frame doesn't
 * know what it's wrapping — apps compose.
 *
 *   <ViewportFrame>
 *     <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
 *     // <AppBrushCursor /> etc. — siblings
 *   </ViewportFrame>
 *
 * For GMT's bucket-rendering guard (don't resize while exporting):
 *
 *   <ViewportFrame shouldResize={() => !useEngineStore.getState().isBucketRendering}>
 *     ...
 *   </ViewportFrame>
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useEngineStore } from '../../../store/engineStore';
import { ViewportModeControls } from './ViewportModeControls';
import { CompositionOverlay } from '../../../components/viewport/CompositionOverlay';
import { setMouseOverCanvas } from '../../worker/ViewportRefs';

export interface ViewportFrameProps {
    /** Children render inside the sized canvas container. Position
     *  them with absolute/inset-0 for full-fill or with their own
     *  placement. All children share the same layout box. */
    children?: React.ReactNode;

    /** Show the mode-controls overlay (Fixed/Full toggle + fixed-res
     *  controls). Default: true. Apps with their own chrome disable
     *  this and render ViewportModeControls themselves (or not). */
    showModeControls?: boolean;

    /** Predicate gating ResizeObserver canvasPixelSize writes. Return
     *  false to skip — useful during export flows where the viewport
     *  size should not drive render-target reallocation. Default:
     *  always write. */
    shouldResize?: () => boolean;

    /** Extra Tailwind classes on the outer (flex-filled) container. */
    className?: string;

    /** Extra Tailwind classes on the inner (sized) canvas container. */
    innerClassName?: string;

    /** Padding (px) around the Fixed-mode canvas when fit-scaling.
     *  Default: 40. Controls breathing room between the canvas and
     *  the viewport edge in Fixed mode. */
    fixedPadding?: number;

    /** Optional overlay rendered as a sibling of the inner sized
     *  container, NOT inside it — so it stays full viewport-area sized
     *  in Fixed mode instead of shrinking with the scaled canvas. Use
     *  for HUD elements that should anchor to the viewport edges
     *  (navigation pills, hint pop-ups, region-selection banners)
     *  rather than the canvas. ViewportModeControls already uses this
     *  level for the mode-switch button. */
    outerOverlay?: React.ReactNode;
}

const CONTROLS_OFFSET_Y = 40;
const LAYOUT_PADDING = 12;

export const ViewportFrame: React.FC<ViewportFrameProps> = ({
    children,
    showModeControls = true,
    shouldResize,
    className = '',
    innerClassName = '',
    fixedPadding = 40,
    outerOverlay,
}) => {
    const outerRef = useRef<HTMLDivElement>(null);
    const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

    const mode = useEngineStore((s) => s.resolutionMode);
    const fixedResolution = useEngineStore((s) => s.fixedResolution);
    const setCanvasPixelSize = useEngineStore((s) => s.setCanvasPixelSize);

    useLayoutEffect(() => {
        const el = outerRef.current;
        if (!el) return;

        const pushSize = (w: number, h: number) => {
            setViewportSize({ w, h });
            if (shouldResize && !shouldResize()) return;
            const dpr = window.devicePixelRatio || 1;
            setCanvasPixelSize(
                Math.max(1, Math.floor(w * dpr)),
                Math.max(1, Math.floor(h * dpr)),
            );
        };

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = Math.max(1, entry.contentRect.width);
                const h = Math.max(1, entry.contentRect.height);
                pushSize(w, h);
            }
        });
        observer.observe(el);

        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            pushSize(rect.width, rect.height);
        }

        return () => observer.disconnect();
        // shouldResize predicate ref-reads current state; we don't want
        // a new observer on every render just because the predicate
        // identity changed. Intentionally omitted from deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setCanvasPixelSize]);

    const isFixed = mode === 'Fixed';
    const [fw, fh] = fixedResolution;

    // Fit-scale the Fixed-mode container to the available area.
    const availW = Math.max(1, viewportSize.w - fixedPadding);
    const availH = Math.max(1, viewportSize.h - fixedPadding);
    const fitScale = isFixed ? Math.min(1.0, availW / fw, availH / fh) : 1.0;

    const innerStyle: React.CSSProperties = isFixed
        ? {
              width: fw,
              height: fh,
              transform: `scale(${fitScale})`,
              transformOrigin: 'center center',
              boxShadow: '0 0 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
          }
        : { width: '100%', height: '100%' };

    // Mode-controls top-left aligned with the Fixed canvas corner
    // (offset so the label sits above the canvas in Fixed mode).
    const visibleW = isFixed ? fw * fitScale : viewportSize.w;
    const visibleH = isFixed ? fh * fitScale : viewportSize.h;
    const canvasTop = isFixed ? (viewportSize.h - visibleH) / 2 : 0;
    const canvasLeft = isFixed ? (viewportSize.w - visibleW) / 2 : 0;
    const controlsTop = Math.max(LAYOUT_PADDING, canvasTop - CONTROLS_OFFSET_Y);
    const controlsLeft = Math.max(LAYOUT_PADDING, canvasLeft);

    return (
        <div
            ref={outerRef}
            className={`relative flex-1 flex items-center justify-center overflow-hidden bg-[#050505] touch-none ${className}`}
            style={{ backgroundImage: isFixed ? 'radial-gradient(circle at center, #111 0%, #050505 100%)' : 'none' }}
            // Track mouse-over-canvas for the adaptive-resolution loop's
            // settle-on-idle behaviour. The legacy ViewportArea wired
            // these handlers; the modern ViewportFrame missed them, so
            // _mouseOverCanvas stayed false forever in app-gmt and the
            // !mouseOnCanvas branch in viewportSlice.reportFps kept
            // adaptive engaged indefinitely (no auto-disengage when
            // the user settles on the canvas).
            onMouseEnter={() => setMouseOverCanvas(true)}
            onMouseLeave={() => setMouseOverCanvas(false)}
        >
            {isFixed && (
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />
            )}

            <div style={innerStyle} className={`relative bg-[#111] ${innerClassName}`}>
                {children}
                {/* Composition guides overlay — rendered on top of
                    children, sized to the inner container. Both apps
                    expose the controls via their View Manager panel.
                    Renders nothing when overlay type is 'none'. */}
                <CompositionOverlay
                    width={isFixed ? fw : viewportSize.w}
                    height={isFixed ? fh : viewportSize.h}
                />
            </div>

            {showModeControls && (
                <ViewportModeControls
                    top={controlsTop}
                    left={controlsLeft}
                    availableWidth={viewportSize.w}
                    availableHeight={viewportSize.h}
                />
            )}

            {/* Sibling of the inner sized container — viewport-area
                relative, doesn't shrink in Fixed mode. */}
            {outerOverlay}
        </div>
    );
};
