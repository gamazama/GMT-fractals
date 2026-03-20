import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { GradientStop } from '../../types';
import { getGradientCssString } from '../../utils/colorUtils';

interface ContextMenuProps {
    x: number;
    y: number;
    options: {
        label: string;
        action: () => void;
        disabled?: boolean;
        isHeader?: boolean;
        stops?: GradientStop[]; // Optional stops for preview
    }[];
    onClose: () => void;
}

const LazyGradientPreview: React.FC<{ stops: GradientStop[] }> = ({ stops }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '50px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className="w-16 h-3 rounded border border-white/20 shadow-sm shrink-0"
            style={visible ? { background: getGradientCssString(stops) } : { background: '#222' }}
        />
    );
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: y, left: x, visible: false });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        // Use pointerdown with capture - fires before React's synthetic events
        // This ensures we catch clicks even if stopPropagation is called
        document.addEventListener('pointerdown', handleClickOutside, true);
        return () => document.removeEventListener('pointerdown', handleClickOutside, true);
    }, [onClose]);

    // Use LayoutEffect to measure and reposition BEFORE the browser paints
    useLayoutEffect(() => {
        if (!menuRef.current) return;

        const updatePosition = () => {
            if (!menuRef.current) return;

            const rect = menuRef.current.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            const padding = 12;

            if (rect.width === 0 || rect.height === 0) {
                requestAnimationFrame(updatePosition);
                return;
            }

            let finalTop = y;
            let finalLeft = x;

            // Horizontal flip/clamp
            if (finalLeft + rect.width > winW - padding) {
                finalLeft = x - rect.width;
            }
            if (finalLeft < padding) finalLeft = padding;

            // Vertical flip/clamp
            if (finalTop + rect.height > winH - padding) {
                finalTop = y - rect.height;
            }

            if (finalTop < padding) {
                finalTop = padding;
            }

            setCoords({ top: finalTop, left: finalLeft, visible: true });
        };

        updatePosition();

        const timer = setTimeout(updatePosition, 16);
        return () => clearTimeout(timer);
    }, [x, y, options]);

    return createPortal(
        <div
            ref={menuRef}
            className="fixed bg-[#1a1f3a] border border-white/20 rounded-md shadow-2xl py-1 z-[9999] w-[220px] max-h-[400px] overflow-y-auto custom-scroll transition-opacity duration-150"
            style={{
                top: coords.top,
                left: coords.left,
                opacity: coords.visible ? 1 : 0,
                visibility: coords.visible ? 'visible' : 'hidden',
                pointerEvents: coords.visible ? 'auto' : 'none'
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {options.map((opt, i) => (
                opt.isHeader ? (
                    <div key={i} className="px-4 py-1 text-[10px] font-bold text-gray-500 border-b border-white/5 mt-1 mb-1 bg-black/20">
                        {opt.label}
                    </div>
                ) : (
                    <button
                        key={i}
                        onClick={() => { onClose(); requestAnimationFrame(() => opt.action()); }}
                        disabled={opt.disabled}
                        className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group transition-colors"
                    >
                        <span className="truncate mr-2">{opt.label}</span>
                        {opt.stops && <LazyGradientPreview stops={opt.stops} />}
                    </button>
                )
            ))}
        </div>,
        document.body
    );
};

export default ContextMenu;
