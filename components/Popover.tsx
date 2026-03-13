
import React, { useRef, useEffect } from 'react';

type PopoverAlign = 'center' | 'start' | 'end';

interface PopoverProps {
    children: React.ReactNode;
    align?: PopoverAlign;
    width?: string; // e.g. 'w-52', 'w-72'
    className?: string;
    onClose?: () => void;
    /** Set false to hide the pointer arrow. Default true. */
    arrow?: boolean;
}

const alignClasses: Record<PopoverAlign, { container: string; arrow: string }> = {
    center: {
        container: 'left-1/2 -translate-x-1/2',
        arrow: 'left-1/2 -translate-x-1/2',
    },
    start: {
        container: 'left-0',
        arrow: 'left-4',
    },
    end: {
        container: 'right-0',
        arrow: 'right-4',
    },
};

/**
 * Popover — dropdown panel that appears below its parent (which must be `relative`).
 *
 * Usage:
 * ```tsx
 * <div className="relative">
 *   <button onClick={() => setOpen(!open)}>Settings</button>
 *   {open && (
 *     <Popover width="w-52" onClose={() => setOpen(false)}>
 *       {content}
 *     </Popover>
 *   )}
 * </div>
 * ```
 */
export const Popover: React.FC<PopoverProps> = ({
    children,
    align = 'center',
    width = 'w-52',
    className = '',
    onClose,
    arrow = true,
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!onClose) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Delay listener to avoid catching the opening click
        const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', handler);
        };
    }, [onClose]);

    const a = alignClasses[align];

    return (
        <div
            ref={ref}
            className={`absolute top-full mt-3 ${a.container} ${width} bg-black border border-white/20 rounded-xl p-3 shadow-2xl z-[70] animate-fade-in ${className}`}
            onClick={e => e.stopPropagation()}
        >
            {arrow && (
                <div className={`absolute -top-1.5 ${a.arrow} w-3 h-3 bg-black border-t border-l border-white/20 transform rotate-45`} />
            )}
            {children}
        </div>
    );
};

export default Popover;
