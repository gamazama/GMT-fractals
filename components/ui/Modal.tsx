import React, { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../../hooks/useDismiss';
import { Z } from './zIndex';
import { getLayerHost } from './layerHost';

/**
 * Blocking modal primitive: full-screen backdrop, centred content, portal to
 * document.body. The caller supplies the card (width, chrome, body) as
 * `children` — Modal only owns the backdrop, centring, stacking and dismissal.
 *
 * Dismissal mirrors the hand-rolled modals it replaces: Escape closes (via the
 * scope-aware registry, so the topmost modal wins), and a click on the backdrop
 * itself closes — a click inside the card never does, because the target check
 * is against the backdrop element.
 */
export interface ModalProps {
    onClose: () => void;
    children: ReactNode;
    /** Render nothing when false. Default true (caller usually gates mounting). */
    open?: boolean;
    /** Stacking tier. Default Z.modal; pass Z.overlayNested for modal-over-overlay. */
    z?: number;
    /** Close when the backdrop (not the card) is pressed. Default true. */
    dismissOnBackdrop?: boolean;
    /** Close on Escape. Default true. */
    dismissOnEscape?: boolean;
    /** Backdrop appearance. Default 'bg-black/70'. */
    backdropClassName?: string;
    /** Extra classes on the centring wrapper (e.g. padding). Default 'p-6'. */
    className?: string;
    /** id of the element labelling the dialog, for aria-labelledby. */
    labelledBy?: string;
}

export const Modal: React.FC<ModalProps> = ({
    onClose,
    children,
    open = true,
    z = Z.modal,
    dismissOnBackdrop = true,
    dismissOnEscape = true,
    backdropClassName = 'bg-black/70',
    className = 'p-6',
    labelledBy,
}) => {
    const backdropRef = useRef<HTMLDivElement>(null);

    // Escape only — outside-click is handled by the backdrop target check
    // below so clicks inside the card are never treated as "outside".
    useDismiss(backdropRef, {
        onClose,
        enabled: open && dismissOnEscape,
        outside: false,
        escape: true,
    });

    if (!open) return null;

    return createPortal(
        <div
            ref={backdropRef}
            className={`fixed inset-0 flex items-center justify-center ${backdropClassName} ${className}`}
            style={{ zIndex: z }}
            onClick={(e) => {
                if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
        >
            {children}
        </div>,
        getLayerHost(),
    );
};

export default Modal;
