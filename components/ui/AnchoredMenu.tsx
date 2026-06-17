import React, { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../../hooks/useDismiss';
import { clampToViewport } from './viewportClamp';
import { Z } from './zIndex';

/**
 * Trigger-anchored surface (context menu, dropdown, picker popup) placed at a
 * point and kept on-screen. After mount it measures itself and flip-clamps to
 * the viewport via `clampToViewport`, staying invisible for the first paint so
 * there's no visible jump from the raw anchor to the corrected position.
 *
 * Dismissal defaults to capture-phase outside pointer-down + Escape — what the
 * context menus needed to beat descendants that call stopPropagation.
 */
export interface AnchoredMenuProps {
    /** Desired top-left in viewport coords (cursor point or a trigger edge). */
    anchor: { x: number; y: number };
    children: ReactNode;
    onClose: () => void;
    open?: boolean;
    z?: number;
    /** Viewport-edge gutter. Default 8. */
    padding?: number;
    /** Flip across the anchor on overflow before clamping. Default true. */
    flip?: boolean;
    dismissOnOutside?: boolean;
    dismissOnEscape?: boolean;
    /** Capture-phase listeners. Default true. */
    capture?: boolean;
    className?: string;
}

export const AnchoredMenu: React.FC<AnchoredMenuProps> = ({
    anchor,
    children,
    onClose,
    open = true,
    z = Z.contextMenu,
    padding = 8,
    flip = true,
    dismissOnOutside = true,
    dismissOnEscape = true,
    capture = true,
    className = '',
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    // Re-clamps on anchor/option change only — content that resizes after mount
    // (async-loaded items, expanding submenus) won't re-measure on its own.
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        setPos(
            clampToViewport(
                anchor,
                { width: rect.width, height: rect.height },
                { width: window.innerWidth, height: window.innerHeight },
                { padding, flip },
            ),
        );
    }, [anchor.x, anchor.y, padding, flip]);

    useDismiss(menuRef, {
        onClose,
        enabled: open,
        outside: dismissOnOutside,
        escape: dismissOnEscape,
        capture,
    });

    if (!open) return null;

    return createPortal(
        <div
            ref={menuRef}
            className={`fixed ${className}`}
            style={{
                left: pos ? pos.x : anchor.x,
                top: pos ? pos.y : anchor.y,
                zIndex: z,
                opacity: pos ? 1 : 0,
                pointerEvents: pos ? 'auto' : 'none',
            }}
        >
            {children}
        </div>,
        document.body,
    );
};

export default AnchoredMenu;
